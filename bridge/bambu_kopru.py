#!/usr/bin/env python3
# ============================================================
#  Tikita ↔ Bambu Lab köprüsü
#  Yazıcıların YEREL MQTT kanalından (Developer/LAN mode) anlık
#  durumu okur ve Firestore'daki "makine_durum" koleksiyonuna yazar.
#  Admin sayfası bu koleksiyonu canlı dinler → Gantt/makine kartları
#  gerçek % / kalan süre / dosya adıyla güncellenir.
#
#  Kurulum: KURULUM.md dosyasına bak.
# ============================================================
import json, ssl, time, threading, sys
try:
    import requests
    import paho.mqtt.client as mqtt
except ImportError:
    print("Eksik paket. Şunu çalıştır:  pip install paho-mqtt requests")
    sys.exit(1)

# ————— AYARLAR — burayı kendi yazıcılarına göre doldur —————
PRINTERS = [
    # makineAd: Tikita'daki makine adıyla AYNI yaz (eşleşme bununla yapılır)
    # ip: yazıcının yerel IP'si (Handy/ekran > Ayarlar > Ağ)
    # access_code: yazıcı ekranı > Ayarlar > LAN Only Mode erişim kodu
    # serial: yazıcı seri numarası (ekran > Ayarlar > Cihaz)
    {"makineAd": "X1C", "ip": "192.168.1.50", "access_code": "12345678", "serial": "01S00A000000000"},
    # {"makineAd": "P1S", "ip": "192.168.1.51", "access_code": "87654321", "serial": "01P00A000000000"},
]

API_KEY = "AIzaSyDLf4LIJikzWGVgN_k_d6SuGlgiBWBxt5k"
PROJECT = "tikita-2026"
# ————————————————————————————————————————————————————————————

DURUM_MAP = {"RUNNING": "basiyor", "PREPARE": "basiyor", "PAUSE": "durakladi",
             "FINISH": "bitti", "FAILED": "hata", "IDLE": "bos"}

def fs_yaz(docid, data):
    url = (f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)"
           f"/documents/makine_durum/{docid}?key={API_KEY}")
    fields = {}
    for k, v in data.items():
        if isinstance(v, bool):            fields[k] = {"booleanValue": v}
        elif isinstance(v, (int, float)):  fields[k] = {"doubleValue": float(v)}
        else:                              fields[k] = {"stringValue": str(v)}
    try:
        r = requests.patch(url, json={"fields": fields}, timeout=10)
        if r.status_code >= 300:
            print(f"[firestore] {docid}: HTTP {r.status_code} {r.text[:120]}")
    except Exception as e:
        print(f"[firestore] {docid}: {e}")

class Yazici:
    def __init__(self, cfg):
        self.cfg = cfg
        self.son_yaz = 0
        self.son_ozet = None
        self.durum = {}
        c = mqtt.Client(protocol=mqtt.MQTTv311)
        c.username_pw_set("bblp", cfg["access_code"])
        c.tls_set(cert_reqs=ssl.CERT_NONE)   # yazıcı sertifikası self-signed
        c.tls_insecure_set(True)
        c.on_connect = self.baglandi
        c.on_message = self.mesaj
        c.on_disconnect = lambda *a: print(f"[{cfg['makineAd']}] bağlantı koptu — tekrar denenecek")
        c.reconnect_delay_set(2, 30)
        self.c = c

    def basla(self):
        threading.Thread(target=self.dongu, daemon=True).start()

    def dongu(self):
        while True:
            try:
                self.c.connect(self.cfg["ip"], 8883, keepalive=30)
                self.c.loop_start()
                # P1/A1 yalnız değişiklik yollar → periyodik tam durum iste (pushall)
                while True:
                    self.pushall()
                    time.sleep(5)
            except Exception as e:
                print(f"[{self.cfg['makineAd']}] {e} — 10 sn sonra tekrar")
                try: self.c.loop_stop()
                except Exception: pass
                time.sleep(10)

    def baglandi(self, c, u, f, rc):
        print(f"[{self.cfg['makineAd']}] bağlandı (rc={rc})")
        c.subscribe(f"device/{self.cfg['serial']}/report")
        self.pushall()

    def pushall(self):
        try:
            self.c.publish(f"device/{self.cfg['serial']}/request",
                json.dumps({"pushing": {"sequence_id": "1", "command": "pushall"}, "user_id": "tikita"}))
        except Exception:
            pass

    def mesaj(self, c, u, msg):
        try:
            j = json.loads(msg.payload)
        except Exception:
            return
        p = j.get("print")
        if not isinstance(p, dict):
            return
        self.durum.update({k: p[k] for k in
            ("gcode_state", "mc_percent", "mc_remaining_time", "subtask_name",
             "gcode_file", "layer_num", "total_layer_num", "nozzle_temper", "bed_temper") if k in p})
        d = self.durum
        ozet = (d.get("gcode_state"), int(d.get("mc_percent") or 0), int(d.get("mc_remaining_time") or 0))
        simdi = time.time()
        # durum değiştiyse hemen, değişmediyse en sık 15 sn'de bir yaz
        if ozet == self.son_ozet and simdi - self.son_yaz < 15:
            return
        self.son_ozet, self.son_yaz = ozet, simdi
        veri = {
            "makineAd": self.cfg["makineAd"],
            "serial": self.cfg["serial"],
            "durum": DURUM_MAP.get(str(d.get("gcode_state") or "").upper(), "bos"),
            "pct": int(d.get("mc_percent") or 0),
            "kalanDk": int(d.get("mc_remaining_time") or 0),
            "dosya": str(d.get("subtask_name") or d.get("gcode_file") or ""),
            "katman": int(d.get("layer_num") or 0),
            "katmanTop": int(d.get("total_layer_num") or 0),
            "nozul": float(d.get("nozzle_temper") or 0),
            "tabla": float(d.get("bed_temper") or 0),
            "guncelleme": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z",
        }
        fs_yaz(self.cfg["serial"], veri)
        print(f"[{self.cfg['makineAd']}] {veri['durum']} %{veri['pct']} kalan {veri['kalanDk']}dk {veri['dosya'][:30]}")

if __name__ == "__main__":
    print("Tikita ↔ Bambu köprüsü başlıyor…  (durdurmak için Ctrl+C)")
    for cfg in PRINTERS:
        Yazici(cfg).basla()
    while True:
        time.sleep(60)
