#!/usr/bin/env python
# -*- coding: utf-8 -*-
# ============================================================
#  Tikita <-> Bambu Lab koprusu — BULUT surumu (TEK BAGLANTI)
#  Tum yazicilar TEK MQTT oturumu uzerinden dinlenir/kontrol edilir
#  (Bambu bulutu ayni hesapla coklu ayri baglantiyi dusuruyordu).
#  Python 2.7.16 ve Python 3 ile calisir.
# ============================================================
from __future__ import print_function
import json, ssl, time, threading, sys, os, base64, ftplib

try:
    import requests
    import paho.mqtt.client as mqtt
except ImportError:
    print("Eksik paket. Su komutu calistir:")
    print('  python -m pip install --user "paho-mqtt==1.5.1" "requests==2.27.1"')
    sys.exit(1)

# ————— AYARLAR — doldur —————
BAMBU_EMAIL = "senin@email.com"
BAMBU_SIFRE = "sifren"
PRINTERS = [
    # ip + access_code EKLERSEN → admin'de SD karttaki 3mf dosyalari LISTEDEN secilir
    # (elle isim yazmak gerekmez). ip/erisim kodu yazicinin ekraninda: Ayarlar > Ag.
    {"makineAd": "X1C", "serial": "01S00A000000000", "ip": "192.168.1.50", "access_code": "12345678"},
    # {"makineAd": "P1S", "serial": "01P00A000000000"},   # ip/access_code yoksa sadece elle isimle baslatilir
]

API_KEY = "AIzaSyDLf4LIJikzWGVgN_k_d6SuGlgiBWBxt5k"
PROJECT = "tikita-2026"
SD_KOK = "file:///sdcard/"    # gerekirse "file:///sdcard/cache/" yap
API = "https://api.bambulab.com"
MQTT_HOST = "us.mqtt.bambulab.com"
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
    print("Bambu buluta giris: " + BAMBU_EMAIL)
    r = requests.post(API + "/v1/user-service/user/login",
                      json={"account": BAMBU_EMAIL, "password": BAMBU_SIFRE}, timeout=20)
    try: j = r.json()
    except Exception: j = {}
    tok = j.get("accessToken")
    if not tok:
        try:
            requests.post(API + "/v1/user-service/user/sendemail/code",
                          json={"email": BAMBU_EMAIL, "type": "codeLogin"}, timeout=20)
        except Exception: pass
        print("--- Bambu e-postana bir DOGRULAMA KODU gonderdi. ---")
        code = INP("E-postandaki kodu yaz ve Enter: ").strip()
        r2 = requests.post(API + "/v1/user-service/user/login",
                           json={"account": BAMBU_EMAIL, "code": code}, timeout=20)
        try: j = r2.json()
        except Exception: j = {}
        tok = j.get("accessToken")
    if not tok:
        print("GIRIS BASARISIZ:", json.dumps(j, ensure_ascii=False)[:400]); sys.exit(1)
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
    print("Giris OK · " + user)
    return d

def token_sil():
    try: os.remove(TOKEN_FILE)
    except Exception: pass

# ————— FIRESTORE —————
FS = "https://firestore.googleapis.com/v1/projects/{0}/databases/(default)/documents".format(PROJECT)
def fs_yaz(docid, data):
    fields = {}
    for k in data:
        v = data[k]
        if isinstance(v, bool): fields[k] = {"booleanValue": v}
        elif isinstance(v, (int, float)): fields[k] = {"doubleValue": float(v)}
        else: fields[k] = {"stringValue": metin(v)}
    # updateMask: SADECE bu alanlari yaz → sdDosyalar gibi baska alanlar silinmez
    params = [("key", API_KEY)] + [("updateMask.fieldPaths", k) for k in fields]
    try:
        rr = requests.patch(FS + "/makine_durum/" + docid, params=params,
                            json={"fields": fields}, timeout=10)
        if rr.status_code >= 300: print("[firestore] {0}: HTTP {1}".format(docid, rr.status_code))
    except Exception as e:
        print("[firestore] {0}: {1}".format(docid, e))

def fs_sd_yaz(serial, dosyalar):
    """SD karttaki 3mf listesini makine_durum/<serial>.sdDosyalar (dizi) olarak yaz."""
    body = {"fields": {
        "sdDosyalar": {"arrayValue": {"values": [{"stringValue": metin(x)} for x in dosyalar]}},
        "sdGuncelleme": {"stringValue": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"}}}
    params = [("key", API_KEY), ("updateMask.fieldPaths", "sdDosyalar"),
              ("updateMask.fieldPaths", "sdGuncelleme")]
    try:
        requests.patch(FS + "/makine_durum/" + serial, params=params, json=body, timeout=10)
    except Exception as e:
        print("[firestore-sd] {0}: {1}".format(serial, e))

# ————— SD KART OKUMA (yazicinin FTPS'i, port 990 'implicit' TLS) —————
class _ImplicitFTPS(ftplib.FTP_TLS, object):
    """Bambu yazicilari 990 portunda implicit FTPS kullanir (baglanir baglanmaz TLS).
    Py2.7'de FTP_TLS old-style; 'object' ekleyince yeni-stil olur -> property calisir."""
    def __init__(self, *a, **k):
        self._sock = None
        ftplib.FTP_TLS.__init__(self, *a, **k)
    def _get_sock(self): return self._sock
    def _set_sock(self, value):
        if value is not None and not isinstance(value, ssl.SSLSocket):
            value = self.context.wrap_socket(value, server_hostname=None)
        self._sock = value
    sock = property(_get_sock, _set_sock)

def sd_listele(ip, code):
    """SD kartin kokundeki .3mf dosya adlarini dondurur."""
    try: ctx = ssl._create_unverified_context()
    except AttributeError:
        ctx = ssl.SSLContext(ssl.PROTOCOL_SSLv23)
        try: ctx.check_hostname = False
        except Exception: pass
        ctx.verify_mode = ssl.CERT_NONE
    ftp = _ImplicitFTPS(context=ctx)
    ftp.connect(ip, 990, timeout=8)
    ftp.login("bblp", code)
    ftp.prot_p()
    try: names = ftp.nlst("/")
    except Exception: names = ftp.nlst()
    try: ftp.quit()
    except Exception:
        try: ftp.close()
        except Exception: pass
    out = []
    for n in names:
        b = n.split("/")[-1]
        if b.lower().endswith(".3mf"): out.append(b)
    return sorted(set(out))

def sd_ayarli(cfg):
    """ip + access_code gercekten girilmis mi? (bos ya da 'XX' placeholder ise SD atlanir)"""
    ip = (cfg.get("ip") or "").strip(); code = (cfg.get("access_code") or "").strip()
    if not ip or not code: return False
    if "X" in ip.upper() or "X" in code.upper(): return False   # doldurulmamis placeholder
    return True

# ————— TEK BAGLANTILI KOPRU —————
class Kopru(object):
    def __init__(self, auth, printers):
        self.auth = auth; self.yetkiHata = False
        self.byser = {}       # serial -> {cfg, son_ozet, son_yaz, durum}
        self.ad2ser = {}
        for p in printers:
            self.byser[p["serial"]] = {"cfg": p, "son_state": None, "son_isik": None, "son_yaz": 0, "durum": {}}
            self.ad2ser[p["makineAd"]] = p["serial"]
        cid = "tikita_" + str(int(time.time()))   # sabit/benzersiz client-id
        try:
            c = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=cid, protocol=mqtt.MQTTv311)
        except (AttributeError, TypeError):
            try: c = mqtt.Client(client_id=cid, protocol=mqtt.MQTTv311)
            except Exception: c = mqtt.Client(protocol=mqtt.MQTTv311)
        c.username_pw_set(auth["user"], auth["token"])
        c.tls_set(cert_reqs=ssl.CERT_NONE); c.tls_insecure_set(True)
        c.on_connect = self.baglandi; c.on_message = self.mesaj; c.on_disconnect = self.koptu
        try: c.reconnect_delay_set(3, 60)
        except Exception: pass
        self.c = c

    def koptu(self, c, u, a, b=None, d=None):
        # paho 1.x: (c,u,rc) · 2.x: (c,u,flags,reason_code,properties)
        rc = b if b is not None else a
        code = getattr(rc, "value", rc)
        print("baglanti koptu (sebep kodu: {0}) — otomatik yeniden baglanacak".format(code))

    def baglandi(self, c, u, f, rc, properties=None):
        rc = getattr(rc, "value", rc)
        if rc == 0:
            print("BULUTA BAGLANDI · {0} yazici dinleniyor".format(len(self.byser)))
            for s in self.byser: c.subscribe("device/{0}/report".format(s))
            self.pushall_hepsi()
        else:
            print("yetki hatasi (rc={0}) — token gecersiz olabilir".format(rc))
            if rc in (4, 5): self.yetkiHata = True

    def pushall_hepsi(self):
        for s in self.byser:
            try:
                self.c.publish("device/{0}/request".format(s),
                    json.dumps({"pushing": {"sequence_id": "1", "command": "pushall"}, "user_id": "tikita"}))
            except Exception: pass

    def mesaj(self, c, u, msg):
        try: serial = msg.topic.split("/")[1]
        except Exception: return
        st = self.byser.get(serial)
        if not st: return
        try:
            pl = msg.payload.decode("utf-8") if isinstance(msg.payload, bytes) else msg.payload
            j = json.loads(pl)
        except Exception:
            return
        p = j.get("print")
        if not isinstance(p, dict): return
        # yazicinin komuta verdigi CEVABI gorunur yap (sessiz basarisizligi onler)
        rcmd = p.get("command")
        if rcmd in ("project_file", "pause", "resume", "stop") or ("result" in p) or p.get("print_error"):
            if ("result" in p) or ("reason" in p) or p.get("print_error"):
                print("[{0}] YANIT {1}: result={2} reason={3} print_error={4}".format(
                    st["cfg"]["makineAd"], rcmd, p.get("result"), p.get("reason"), p.get("print_error")))
        d = st["durum"]
        for k in ("gcode_state", "mc_percent", "mc_remaining_time", "subtask_name",
                  "gcode_file", "layer_num", "total_layer_num", "nozzle_temper", "bed_temper"):
            if k in p: d[k] = p[k]
        # kabin isigi durumu (lights_report tam mesajlarda gelir)
        lr = p.get("lights_report")
        if isinstance(lr, list):
            for L in lr:
                if isinstance(L, dict) and L.get("node") == "chamber_light":
                    d["isik"] = 1 if L.get("mode") == "on" else 0
        # KOTA DOSTU: durum/isik DEGISINCE aninda; yoksa en fazla 5 DK'da bir (% seyrek yazilir)
        st_state = metin(d.get("gcode_state")); isik = d.get("isik")
        simdi = time.time()
        onemli = (st_state != st.get("son_state")) or (isik != st.get("son_isik"))
        if (not onemli) and (simdi - st["son_yaz"] < 300): return
        st["son_state"], st["son_isik"], st["son_yaz"] = st_state, isik, simdi
        cfg = st["cfg"]
        veri = {
            "makineAd": cfg["makineAd"], "serial": serial,
            "durum": DURUM_MAP.get(metin(d.get("gcode_state")).upper(), "bos"),
            "pct": int(sayi(d.get("mc_percent"))), "kalanDk": int(sayi(d.get("mc_remaining_time"))),
            "dosya": metin(d.get("subtask_name") or d.get("gcode_file")),
            "katman": int(sayi(d.get("layer_num"))), "katmanTop": int(sayi(d.get("total_layer_num"))),
            "nozul": sayi(d.get("nozzle_temper")), "tabla": sayi(d.get("bed_temper")),
            "isik": bool(d.get("isik")),
            "guncelleme": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z",
        }
        fs_yaz(serial, veri)
        print("[{0}] {1} %{2} kalan {3}dk {4}".format(
            cfg["makineAd"], veri["durum"], veri["pct"], veri["kalanDk"], veri["dosya"][:28]))

    # ——— KOMUTLAR (makineAd ile) ———
    def yolla(self, makineAd, obj):
        s = self.ad2ser.get(makineAd)
        if not s: return False
        try:
            self.c.publish("device/{0}/request".format(s), json.dumps(obj)); return True
        except Exception as e:
            print("[{0}] komut hatasi: {1}".format(makineAd, e)); return False

    def bas_yazdir(self, makineAd, dosya, klasor="", plate=1, use_ams=False):
        url = SD_KOK + (klasor or "") + dosya
        p = {"command": "project_file", "param": "Metadata/plate_{0}.gcode".format(int(plate or 1)),
             "url": url, "subtask_name": dosya,
             "project_id": "0", "profile_id": "0", "task_id": "0", "subtask_id": "0",
             "plate_idx": int(plate or 1) - 1,
             "timelapse": False, "bed_type": "auto", "bed_leveling": True, "flow_cali": False,
             "vibration_cali": False, "layer_inspect": False, "use_ams": bool(use_ams),
             "sequence_id": str(int(time.time()))}
        if use_ams: p["ams_mapping"] = [0]
        print("[{0}] BASLAT -> {1}".format(makineAd, url))
        return self.yolla(makineAd, {"print": p})
    def duraklat(self, m): return self.yolla(m, {"print": {"command": "pause", "sequence_id": str(int(time.time()))}})
    def devam(self, m):    return self.yolla(m, {"print": {"command": "resume", "sequence_id": str(int(time.time()))}})
    def durdur(self, m):   return self.yolla(m, {"print": {"command": "stop", "sequence_id": str(int(time.time()))}})
    def isik(self, m, ac): return self.yolla(m, {"system": {"command": "ledctrl", "led_node": "chamber_light",
        "led_mode": ("on" if ac else "off"), "led_on_time": 500, "led_off_time": 500,
        "loop_times": 0, "interval_time": 0, "sequence_id": str(int(time.time()))}})

    def sd_tara(self, makineAd):
        """Bu makinenin SD kartini oku, Firestore'a yaz. ip+access_code gerekir."""
        s = self.ad2ser.get(makineAd)
        if not s: return False
        cfg = self.byser[s]["cfg"]
        if not sd_ayarli(cfg): return False
        files = sd_listele(cfg["ip"], cfg["access_code"])
        fs_sd_yaz(s, files); self.byser[s]["sd_son"] = files
        print("[{0}] SD: {1} dosya".format(makineAd, len(files)))
        return True

    def calis(self):
        while True:
            try:
                self.c.connect(MQTT_HOST, 8883, 30); self.c.loop_start()
                while not self.yetkiHata:
                    time.sleep(5); self.pushall_hepsi()
                self.c.loop_stop(); return
            except Exception as e:
                print("baglanti: {0} — 10 sn sonra tekrar".format(e))
                try: self.c.loop_stop()
                except Exception: pass
                time.sleep(10)

# ————— KOMUT DINLEYICI: Tikita 'makine_komut' -> yazici —————
def komut_dongu(kopru):
    def gk(f, k, d=""):
        v = f.get(k, {})
        for t in ("stringValue", "integerValue", "doubleValue", "booleanValue"):
            if t in v: return v[t]
        return d
    while True:
        try:
            txt = requests.get(FS + "/makine_komut?key=" + API_KEY + "&pageSize=50", timeout=12).text
            j = json.loads(txt)
            for doc in j.get("documents", []):
                f = doc.get("fields", {}); mid = doc["name"].split("/")[-1]
                mak = metin(gk(f, "makineAd"))
                if mak not in kopru.ad2ser:
                    continue
                cmd = metin(gk(f, "cmd")); ok = True
                if cmd == "basla":
                    ok = kopru.bas_yazdir(mak, metin(gk(f, "dosya")), metin(gk(f, "klasor")),
                                          int(sayi(gk(f, "plate")) or 1), bool(gk(f, "useAms")))
                elif cmd == "duraklat": ok = kopru.duraklat(mak)
                elif cmd == "devam":    ok = kopru.devam(mak)
                elif cmd == "durdur":   ok = kopru.durdur(mak)
                elif cmd == "isik_ac":  ok = kopru.isik(mak, True)
                elif cmd == "isik_kapat": ok = kopru.isik(mak, False)
                elif cmd == "sd_tara":
                    try: ok = kopru.sd_tara(mak)
                    except Exception as e: ok = False; print("[{0}] SD tara hatasi: {1}".format(mak, e))
                try: requests.delete(FS + "/makine_komut/" + mid + "?key=" + API_KEY, timeout=12)
                except Exception: pass
                print("[{0}] komut islendi: {1} ({2})".format(mak, cmd, "OK" if ok else "hata"))
        except Exception as e:
            print("komut dongu: {0}".format(e))
        time.sleep(8)

# ————— SD DONGU: her yazicinin SD kartini periyodik oku (ip+access_code varsa) —————
def sd_dongu(kopru):
    ilk = True
    while True:
        for s in list(kopru.byser.keys()):
            cfg = kopru.byser[s]["cfg"]
            if not sd_ayarli(cfg): continue
            try:
                files = sd_listele(cfg["ip"], cfg["access_code"])
            except Exception as e:
                if ilk: print("[{0}] SD okunamadi: {1}".format(cfg["makineAd"], e))
                continue
            if files != kopru.byser[s].get("sd_son"):
                kopru.byser[s]["sd_son"] = files
                fs_sd_yaz(s, files)
                print("[{0}] SD: {1} dosya".format(cfg["makineAd"], len(files)))
        ilk = False
        time.sleep(300)   # 5 dk'da bir; degismezse yazmaz (kota dostu)

if __name__ == "__main__":
    print("Tikita <-> Bambu BULUT koprusu (tek baglanti) · Python " + sys.version.split()[0])
    auth = giris()
    kopru = Kopru(auth, PRINTERS)
    kt = threading.Thread(target=komut_dongu, args=(kopru,)); kt.daemon = True; kt.start()
    sdt = threading.Thread(target=sd_dongu, args=(kopru,)); sdt.daemon = True; sdt.start()
    print("Komut dinleyici + SD tarayici aktif (makine_komut / SD kart).")
    while True:
        kopru.calis()          # yetki hatasinda doner
        print("Token yenileniyor…"); token_sil(); auth = giris()
        kopru.auth = auth; kopru.yetkiHata = False
        kopru.c.username_pw_set(auth["user"], auth["token"])
