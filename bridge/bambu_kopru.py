#!/usr/bin/env python
# -*- coding: utf-8 -*-
# ============================================================
#  Tikita <-> Bambu Lab koprusu
#  Python 2.7.16 (macOS 11 sistem Python'u) VE Python 3 ile calisir.
#
#  Yazicilarin YEREL MQTT kanalindan (Developer/LAN mode) anlik
#  durumu okur ve Firestore'daki "makine_durum" koleksiyonuna yazar.
#  Kurulum: KURULUM.md
# ============================================================
from __future__ import print_function
import json, ssl, time, threading, sys

try:
    import requests
    import paho.mqtt.client as mqtt
except ImportError:
    print("Eksik paket. Su komutlari calistir:")
    print('  python -m pip install --user "paho-mqtt==1.5.1" "requests==2.27.1"')
    sys.exit(1)

# ————— AYARLAR — burayi kendi yazicilarina gore doldur —————
PRINTERS = [
    # makineAd: Tikita'daki makine adiyla AYNI yaz (eslesme bununla yapilir)
    # ip: yazicinin yerel IP'si (ekran > Ayarlar > Ag)
    # access_code: yazici ekrani > Ayarlar > LAN Only Mode erisim kodu
    # serial: yazici seri numarasi (ekran > Ayarlar > Cihaz)
    {"makineAd": "X1C", "ip": "192.168.1.50", "access_code": "12345678", "serial": "01S00A000000000"},
    # {"makineAd": "P1S", "ip": "192.168.1.51", "access_code": "87654321", "serial": "01P00A000000000"},
]

API_KEY = "AIzaSyDLf4LIJikzWGVgN_k_d6SuGlgiBWBxt5k"
PROJECT = "tikita-2026"
# ————————————————————————————————————————————————————————————

DURUM_MAP = {"RUNNING": "basiyor", "PREPARE": "basiyor", "PAUSE": "durakladi",
             "FINISH": "bitti", "FAILED": "hata", "IDLE": "bos"}

try:               # py2/py3 metin uyumu
    text_type = basestring          # noqa (py2)
except NameError:
    text_type = str

def metin(v):
    if v is None:
        return ""
    if isinstance(v, text_type):
        return v
    return str(v)

def sayi(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0

def fs_yaz(docid, data):
    url = ("https://firestore.googleapis.com/v1/projects/{0}/databases/(default)"
           "/documents/makine_durum/{1}?key={2}").format(PROJECT, docid, API_KEY)
    fields = {}
    for k in data:
        v = data[k]
        if isinstance(v, bool):
            fields[k] = {"booleanValue": v}
        elif isinstance(v, (int, float)):
            fields[k] = {"doubleValue": float(v)}
        else:
            fields[k] = {"stringValue": metin(v)}
    try:
        r = requests.patch(url, json={"fields": fields}, timeout=10)
        if r.status_code >= 300:
            print("[firestore] {0}: HTTP {1} {2}".format(docid, r.status_code, r.text[:120]))
    except Exception as e:
        print("[firestore] {0}: {1}".format(docid, e))

class Yazici(object):
    def __init__(self, cfg):
        self.cfg = cfg
        self.son_yaz = 0
        self.son_ozet = None
        self.durum = {}
        # paho-mqtt 1.x (py2 uyumlu 1.5.1 dahil) ve 2.x ile calisir
        try:
            c = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, protocol=mqtt.MQTTv311)
        except AttributeError:
            c = mqtt.Client(protocol=mqtt.MQTTv311)
        c.username_pw_set("bblp", cfg["access_code"])
        c.tls_set(cert_reqs=ssl.CERT_NONE)   # yazici sertifikasi self-signed
        c.tls_insecure_set(True)
        c.on_connect = self.baglandi
        c.on_message = self.mesaj
        c.on_disconnect = self.koptu
        try:
            c.reconnect_delay_set(2, 30)
        except Exception:
            pass
        self.c = c

    def koptu(self, *a):
        print("[{0}] baglanti koptu — tekrar denenecek".format(self.cfg["makineAd"]))

    def basla(self):
        t = threading.Thread(target=self.dongu)
        t.daemon = True
        t.start()

    def dongu(self):
        while True:
            try:
                self.c.connect(self.cfg["ip"], 8883, 30)
                self.c.loop_start()
                # P1/A1 yalniz degisiklik yollar → periyodik tam durum iste (pushall)
                while True:
                    self.pushall()
                    time.sleep(5)
            except Exception as e:
                print("[{0}] {1} — 10 sn sonra tekrar".format(self.cfg["makineAd"], e))
                try:
                    self.c.loop_stop()
                except Exception:
                    pass
                time.sleep(10)

    def baglandi(self, c, u, f, rc):
        print("[{0}] baglandi (rc={1})".format(self.cfg["makineAd"], rc))
        c.subscribe("device/{0}/report".format(self.cfg["serial"]))
        self.pushall()

    def pushall(self):
        try:
            self.c.publish("device/{0}/request".format(self.cfg["serial"]),
                json.dumps({"pushing": {"sequence_id": "1", "command": "pushall"}, "user_id": "tikita"}))
        except Exception:
            pass

    def mesaj(self, c, u, msg):
        try:
            j = json.loads(msg.payload.decode("utf-8") if isinstance(msg.payload, bytes) else msg.payload)
        except Exception:
            return
        p = j.get("print")
        if not isinstance(p, dict):
            return
        for k in ("gcode_state", "mc_percent", "mc_remaining_time", "subtask_name",
                  "gcode_file", "layer_num", "total_layer_num", "nozzle_temper", "bed_temper"):
            if k in p:
                self.durum[k] = p[k]
        d = self.durum
        ozet = (metin(d.get("gcode_state")), int(sayi(d.get("mc_percent"))), int(sayi(d.get("mc_remaining_time"))))
        simdi = time.time()
        # durum degistiyse hemen, degismediyse en sik 15 sn'de bir yaz
        if ozet == self.son_ozet and simdi - self.son_yaz < 15:
            return
        self.son_ozet, self.son_yaz = ozet, simdi
        veri = {
            "makineAd": self.cfg["makineAd"],
            "serial": self.cfg["serial"],
            "durum": DURUM_MAP.get(metin(d.get("gcode_state")).upper(), "bos"),
            "pct": int(sayi(d.get("mc_percent"))),
            "kalanDk": int(sayi(d.get("mc_remaining_time"))),
            "dosya": metin(d.get("subtask_name") or d.get("gcode_file")),
            "katman": int(sayi(d.get("layer_num"))),
            "katmanTop": int(sayi(d.get("total_layer_num"))),
            "nozul": sayi(d.get("nozzle_temper")),
            "tabla": sayi(d.get("bed_temper")),
            "guncelleme": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z",
        }
        fs_yaz(self.cfg["serial"], veri)
        print("[{0}] {1} %{2} kalan {3}dk {4}".format(
            self.cfg["makineAd"], veri["durum"], veri["pct"], veri["kalanDk"], veri["dosya"][:30]))

if __name__ == "__main__":
    print("Tikita <-> Bambu koprusu basliyor…  (durdurmak icin Ctrl+C)")
    print("Python {0}".format(sys.version.split()[0]))
    for cfg in PRINTERS:
        Yazici(cfg).basla()
    while True:
        time.sleep(60)
