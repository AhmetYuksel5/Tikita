#!/usr/bin/env python
# -*- coding: utf-8 -*-
# ============================================================
#  Tikita <-> Bambu Lab koprusu — BULUT surumu
#  Yazicilar CLOUD modunda kalir (Handy uzaktan calisir), koprü de
#  ayni Bambu bulutundan durumu okur. Yerel MQTT / LAN Only GEREKMEZ.
#  Python 2.7.16 ve Python 3 ile calisir.
#
#  ILK CALISTIRMA terminalde olmali (e-postana gelen dogrulama kodunu
#  girmen istenir). Kod bir kez girilir, token dosyaya kaydedilir.
# ============================================================
from __future__ import print_function
import json, ssl, time, threading, sys, os, base64

try:
    import requests
    import paho.mqtt.client as mqtt
except ImportError:
    print("Eksik paket. Su komutu calistir:")
    print('  python -m pip install --user "paho-mqtt==1.5.1" "requests==2.27.1"')
    sys.exit(1)

# ————— AYARLAR — doldur —————
BAMBU_EMAIL = "senin@email.com"     # Bambu hesabi e-postasi (Handy ile ayni)
BAMBU_SIFRE = "sifren"              # Bambu hesabi sifresi
PRINTERS = [
    # makineAd: Tikita'daki makine adiyla AYNI. serial: yazici seri no.
    # (Bulut modunda IP / erisim kodu GEREKMEZ)
    {"makineAd": "X1C", "serial": "01S00A000000000"},
    # {"makineAd": "P1S", "serial": "01P00A000000000"},
]

API_KEY = "AIzaSyDLf4LIJikzWGVgN_k_d6SuGlgiBWBxt5k"
PROJECT = "tikita-2026"
SD_KOK = "file:///sdcard/"    # SD karttaki 3MF'lerin kok yolu (gerekirse "file:///sdcard/cache/" yap)
API = "https://api.bambulab.com"
MQTT_HOST = "us.mqtt.bambulab.com"   # global hesap. Cin hesabi ise: cn.mqtt.bambulab.com
TOKEN_FILE = os.path.expanduser("~/.tikita_bambu_token.json")
# ————————————————————————————————————————————————————————————

DURUM_MAP = {"RUNNING": "basiyor", "PREPARE": "basiyor", "PAUSE": "durakladi",
             "FINISH": "bitti", "FAILED": "hata", "IDLE": "bos"}
INP = input if sys.version_info[0] >= 3 else raw_input   # noqa

def sayi(v):
    try: return float(v)
    except (TypeError, ValueError): return 0.0

def metin(v):
    try:
        if isinstance(v, unicode): return v   # noqa (py2)
    except NameError:
        pass
    return v if isinstance(v, str) else ("" if v is None else str(v))

# ————— BULUT GIRISI —————
def jwt_kullanici(tok):
    """Access token (JWT) icinden MQTT kullanici adini (u_XXXX) coz."""
    try:
        p = tok.split(".")[1]; p += "=" * (-len(p) % 4)
        pl = json.loads(base64.urlsafe_b64decode(p.encode()).decode("utf-8", "ignore"))
        u = pl.get("username") or pl.get("preferred_username")
        if u: return u
        uid = pl.get("uid") or pl.get("sub")
        if uid: return "u_" + str(uid)
    except Exception:
        pass
    return None

def giris():
    if os.path.exists(TOKEN_FILE):
        try:
            d = json.load(open(TOKEN_FILE))
            if d.get("token") and d.get("user"): return d
        except Exception: pass
    print("Bambu buluta giris yapiliyor: " + BAMBU_EMAIL)
    r = requests.post(API + "/v1/user-service/user/login",
                      json={"account": BAMBU_EMAIL, "password": BAMBU_SIFRE}, timeout=20)
    j = {}
    try: j = r.json()
    except Exception: pass
    tok = j.get("accessToken")
    if not tok:
        # dogrulama kodu akisi — e-postana kod gonderilir
        try:
            requests.post(API + "/v1/user-service/user/sendemail/code",
                          json={"email": BAMBU_EMAIL, "type": "codeLogin"}, timeout=20)
        except Exception: pass
        print("--- Bambu, e-postana bir DOGRULAMA KODU gonderdi. ---")
        code = INP("E-postandaki kodu buraya yaz ve Enter: ").strip()
        r2 = requests.post(API + "/v1/user-service/user/login",
                           json={"account": BAMBU_EMAIL, "code": code}, timeout=20)
        try: j = r2.json()
        except Exception: j = {}
        tok = j.get("accessToken")
    if not tok:
        print("GIRIS BASARISIZ. Sunucu yaniti:")
        print(json.dumps(j, ensure_ascii=False)[:400])
        sys.exit(1)
    user = jwt_kullanici(tok)
    if not user:
        try:
            pr = requests.get(API + "/v1/design-user-service/my/preference",
                              headers={"Authorization": "Bearer " + tok}, timeout=20).json()
            if pr.get("uid"): user = "u_" + str(pr["uid"])
        except Exception: pass
    if not user:
        print("Kullanici kimligi cozulemedi."); sys.exit(1)
    d = {"token": tok, "user": user}
    try: json.dump(d, open(TOKEN_FILE, "w"))
    except Exception: pass
    print("Giris OK · kullanici " + user)
    return d

def token_sil():
    try: os.remove(TOKEN_FILE)
    except Exception: pass

# ————— FIRESTORE —————
def fs_yaz(docid, data):
    url = ("https://firestore.googleapis.com/v1/projects/{0}/databases/(default)"
           "/documents/makine_durum/{1}?key={2}").format(PROJECT, docid, API_KEY)
    fields = {}
    for k in data:
        v = data[k]
        if isinstance(v, bool): fields[k] = {"booleanValue": v}
        elif isinstance(v, (int, float)): fields[k] = {"doubleValue": float(v)}
        else: fields[k] = {"stringValue": metin(v)}
    try:
        rr = requests.patch(url, json={"fields": fields}, timeout=10)
        if rr.status_code >= 300:
            print("[firestore] {0}: HTTP {1}".format(docid, rr.status_code))
    except Exception as e:
        print("[firestore] {0}: {1}".format(docid, e))

# ————— YAZICI (bulut MQTT) —————
class Yazici(object):
    def __init__(self, cfg, auth):
        self.cfg = cfg; self.auth = auth
        self.son_yaz = 0; self.son_ozet = None; self.durum = {}
        try:
            c = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, protocol=mqtt.MQTTv311)
        except AttributeError:
            c = mqtt.Client(protocol=mqtt.MQTTv311)
        c.username_pw_set(auth["user"], auth["token"])
        c.tls_set(cert_reqs=ssl.CERT_NONE); c.tls_insecure_set(True)
        c.on_connect = self.baglandi; c.on_message = self.mesaj
        c.on_disconnect = self.koptu
        try: c.reconnect_delay_set(2, 30)
        except Exception: pass
        self.c = c; self.yetkiHata = False

    def koptu(self, *a):
        print("[{0}] baglanti koptu".format(self.cfg["makineAd"]))

    def basla(self):
        t = threading.Thread(target=self.dongu); t.daemon = True; t.start()

    def dongu(self):
        while True:
            try:
                self.c.connect(MQTT_HOST, 8883, 30); self.c.loop_start()
                while not self.yetkiHata:
                    self.pushall(); time.sleep(5)
                self.c.loop_stop()
                return  # token yenilenmesi ana dongude ele alinir
            except Exception as e:
                print("[{0}] {1} — 10 sn sonra tekrar".format(self.cfg["makineAd"], e))
                try: self.c.loop_stop()
                except Exception: pass
                time.sleep(10)

    def baglandi(self, c, u, f, rc):
        if rc == 0:
            print("[{0}] baglandi (bulut)".format(self.cfg["makineAd"]))
            c.subscribe("device/{0}/report".format(self.cfg["serial"])); self.pushall()
        else:
            print("[{0}] yetki hatasi (rc={1}) — token gecersiz olabilir".format(self.cfg["makineAd"], rc))
            if rc in (4, 5): self.yetkiHata = True

    def pushall(self):
        try:
            self.c.publish("device/{0}/request".format(self.cfg["serial"]),
                json.dumps({"pushing": {"sequence_id": "1", "command": "pushall"}, "user_id": "tikita"}))
        except Exception: pass

    def yolla(self, obj):
        try:
            self.c.publish("device/{0}/request".format(self.cfg["serial"]), json.dumps(obj))
            return True
        except Exception as e:
            print("[{0}] komut hatasi: {1}".format(self.cfg["makineAd"], e)); return False

    # ——— KOMUTLAR ———
    def bas_yazdir(self, dosya, klasor="", plate=1, use_ams=False, subtask=""):
        url = SD_KOK + (klasor or "") + dosya
        p = {"command": "project_file", "param": "Metadata/plate_{0}.gcode".format(int(plate or 1)),
             "url": url, "subtask_name": subtask or dosya, "plate_idx": int(plate or 1) - 1,
             "timelapse": False, "bed_leveling": True, "flow_cali": False, "vibration_cali": False,
             "layer_inspect": False, "use_ams": bool(use_ams), "sequence_id": str(int(time.time()))}
        if use_ams: p["ams_mapping"] = [0]
        print("[{0}] BASLAT -> {1}".format(self.cfg["makineAd"], url))
        return self.yolla({"print": p})
    def duraklat(self): return self.yolla({"print": {"command": "pause", "sequence_id": str(int(time.time()))}})
    def devam(self):    return self.yolla({"print": {"command": "resume", "sequence_id": str(int(time.time()))}})
    def durdur(self):   return self.yolla({"print": {"command": "stop", "sequence_id": str(int(time.time()))}})
    def isik(self, ac): return self.yolla({"system": {"command": "ledctrl", "led_node": "chamber_light",
        "led_mode": ("on" if ac else "off"), "led_on_time": 500, "led_off_time": 500, "loop_times": 0,
        "interval_time": 0, "sequence_id": str(int(time.time()))}})

    def mesaj(self, c, u, msg):
        try:
            pl = msg.payload.decode("utf-8") if isinstance(msg.payload, bytes) else msg.payload
            j = json.loads(pl)
        except Exception:
            return
        p = j.get("print")
        if not isinstance(p, dict): return
        for k in ("gcode_state", "mc_percent", "mc_remaining_time", "subtask_name",
                  "gcode_file", "layer_num", "total_layer_num", "nozzle_temper", "bed_temper"):
            if k in p: self.durum[k] = p[k]
        d = self.durum
        ozet = (metin(d.get("gcode_state")), int(sayi(d.get("mc_percent"))), int(sayi(d.get("mc_remaining_time"))))
        simdi = time.time()
        if ozet == self.son_ozet and simdi - self.son_yaz < 15: return
        self.son_ozet, self.son_yaz = ozet, simdi
        veri = {
            "makineAd": self.cfg["makineAd"], "serial": self.cfg["serial"],
            "durum": DURUM_MAP.get(metin(d.get("gcode_state")).upper(), "bos"),
            "pct": int(sayi(d.get("mc_percent"))), "kalanDk": int(sayi(d.get("mc_remaining_time"))),
            "dosya": metin(d.get("subtask_name") or d.get("gcode_file")),
            "katman": int(sayi(d.get("layer_num"))), "katmanTop": int(sayi(d.get("total_layer_num"))),
            "nozul": sayi(d.get("nozzle_temper")), "tabla": sayi(d.get("bed_temper")),
            "guncelleme": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z",
        }
        fs_yaz(self.cfg["serial"], veri)
        print("[{0}] {1} %{2} kalan {3}dk {4}".format(
            self.cfg["makineAd"], veri["durum"], veri["pct"], veri["kalanDk"], veri["dosya"][:30]))

# ——— KOMUT DINLEYICI: Tikita 'makine_komut' -> yaziciya ilet ———
def komut_dongu(registry):
    base = ("https://firestore.googleapis.com/v1/projects/{0}/databases/(default)"
            "/documents/makine_komut").format(PROJECT)
    def gk(f, k, d=""):
        v = f.get(k, {})
        for t in ("stringValue", "integerValue", "doubleValue", "booleanValue"):
            if t in v: return v[t]
        return d
    while True:
        try:
            j = json.loads(_get(base + "?key=" + API_KEY + "&pageSize=50"))
            for doc in j.get("documents", []):
                f = doc.get("fields", {}); mid = doc["name"].split("/")[-1]
                mak = metin(gk(f, "makineAd")); y = registry.get(mak)
                if not y:  # bize ait degil
                    continue
                cmd = metin(gk(f, "cmd"))
                ok = False
                if cmd == "basla":
                    ok = y.bas_yazdir(metin(gk(f, "dosya")), metin(gk(f, "klasor")),
                                      int(sayi(gk(f, "plate")) or 1), bool(gk(f, "useAms")),
                                      metin(gk(f, "dosya")))
                elif cmd == "duraklat": ok = y.duraklat()
                elif cmd == "devam":    ok = y.devam()
                elif cmd == "durdur":   ok = y.durdur()
                elif cmd == "isik_ac":  ok = y.isik(True)
                elif cmd == "isik_kapat": ok = y.isik(False)
                else: ok = True  # bilinmeyen -> sil gitsin
                # komutu sil (tekrar islenmesin)
                _delete(base + "/" + mid + "?key=" + API_KEY)
                print("[{0}] komut islendi: {1} ({2})".format(mak, cmd, "OK" if ok else "hata"))
        except Exception as e:
            print("komut dongu: {0}".format(e))
        time.sleep(3)

def _get(url):
    return requests.get(url, timeout=12).text
def _delete(url):
    try: requests.delete(url, timeout=12)
    except Exception: pass

if __name__ == "__main__":
    print("Tikita <-> Bambu BULUT koprusu · Python " + sys.version.split()[0])
    auth = giris()
    yazicilar = [Yazici(cfg, auth) for cfg in PRINTERS]
    registry = {}
    for y in yazicilar: y.basla(); registry[y.cfg["makineAd"]] = y
    kt = threading.Thread(target=komut_dongu, args=(registry,)); kt.daemon = True; kt.start()
    print("Komut dinleyici aktif (makine_komut).")
    while True:
        time.sleep(30)
        # herhangi biri yetki hatasi verdiyse token yenile + yeniden basla
        if any(y.yetkiHata for y in yazicilar):
            print("Token yenileniyor…"); token_sil(); auth = giris()
            for y in yazicilar:
                y.auth = auth; y.yetkiHata = False
                y.c.username_pw_set(auth["user"], auth["token"]); y.basla()
