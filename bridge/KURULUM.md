# Tikita ↔ Bambu köprüsü — Kurulum

Yazıcılardan **gerçek baskı durumunu** (%, kalan süre, dosya) çekip Tikita'ya
aktarır. Admin sayfasındaki makine kartları/Gantt "📡 canlı" rozetiyle gerçek
veriyi gösterir.

## 1. Yazıcıları hazırla (her yazıcıda bir kez)

1. Yazıcı ekranı → **Ayarlar → Ağ → LAN Only Mode** → aç.
2. Aynı menüde **Developer Mode / Geliştirici Modu** → aç.
   - ⚠️ Bu modda yazıcı Bambu bulutuna bağlanmaz → **Handy ile uzaktan izleme
     kapanır** (atölye Wi-Fi'sindeyken her şey çalışır).
3. Şunları not al:
   - **Erişim kodu** (LAN Only Mode ekranında, 8 haneli)
   - **IP adresi** (Ayarlar → Ağ)
   - **Seri numarası** (Ayarlar → Cihaz)

## 2. Köprüyü kur (atölyede 7/24 açık bir PC ya da Raspberry Pi)

```bash
pip install paho-mqtt requests
```

`bambu_kopru.py` dosyasını aç, üstteki **PRINTERS** listesini doldur:

```python
PRINTERS = [
    {"makineAd": "X1C", "ip": "192.168.1.50", "access_code": "12345678", "serial": "01S00A0000000"},
]
```

> **makineAd**, Tikita'daki makine adıyla AYNI olmalı — eşleşme bununla yapılır.

Çalıştır:

```bash
python3 bambu_kopru.py
```

Ekranda `[X1C] bağlandı` ve durum satırları akmaya başlamalı. Admin
sayfasındaki makine kartında **📡** rozeti belirir.

## 3a. Mac'te kurulum (atölye bilgisayarı Mac ise)

> ✅ Script macOS 11 (Big Sur) sistem Python'u **2.7.16** ile de çalışır.
> Aşağıdaki komutlarda `python` = sistemdeki 2.7.16. (`python3` de kuruluysa
> onunla da çalışır; komutlarda `python` yerine `python3` yazman yeter.)

Terminal'i aç (⌘+Boşluk → "Terminal"):

```bash
# 1) Hangi Python?  -> "Python 2.7.16" görmelisin
python --version

# 2) Paketler — Python 2.7 için SÜRÜMLERİ SABİTLE (son sürümler artık py2 desteklemez)
python -m pip install --user "paho-mqtt==1.5.1" "requests==2.27.1"
#  "No module named pip" derse önce pip'i kur:
#     curl https://bootstrap.pypa.io/pip/2.7/get-pip.py -o get-pip.py && python get-pip.py --user

# 3) Script için klasör aç ve dosyayı oraya koy (örn. indirilenlerden)
mkdir -p ~/tikita && cp ~/Downloads/bambu_kopru.py ~/tikita/

# 4) PRINTERS listesini düzenle (TextEdit ile açılır)
open -e ~/tikita/bambu_kopru.py

# 5) Çalıştır
python ~/tikita/bambu_kopru.py
```

Açılışta `Python 2.7.16` ve ardından `[X1C] baglandi` satırlarını görüyorsan
tamam — admin sayfasında 📡 belirir.

### Mac açılınca kendiliğinden başlasın + uyumasın

`com.tikita.bambu.plist` dosyasını indir, içindeki `KULLANICI_ADIN` yazan yeri
kendi kullanıcı adınla değiştir (Terminal'de `whoami` yazınca görürsün).
Big Sur'da sistem Python'u `/usr/bin/python`'dur — plist zaten onu kullanıyor.

```bash
cp ~/Downloads/com.tikita.bambu.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.tikita.bambu.plist
```

- `caffeinate -s` sayesinde Mac **fişe takılıyken uykuya dalmaz** (köprü kesintisiz akar).
- Günlük: `tail -f /tmp/tikita-bambu.log`
- Durdurmak: `launchctl unload ~/Library/LaunchAgents/com.tikita.bambu.plist`
- Ek öneri: Sistem Ayarları → Kilit Ekranı → "Ekran kapalıyken Mac'i uyku moduna geçir: Asla" (fişteyken).

## 3b. Sürekli çalışsın (Raspberry Pi / Linux, isteğe bağlı)

```bash
sudo tee /etc/systemd/system/tikita-bambu.service > /dev/null <<'EOF'
[Unit]
Description=Tikita Bambu koprusu
After=network-online.target
[Service]
ExecStart=/usr/bin/python3 /home/pi/bambu_kopru.py
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now tikita-bambu
```

Windows'ta: `bambu_kopru.py`'yi Başlangıç klasörüne kısayol olarak koymak yeterli.

## Sorun giderme

| Belirti | Sebep / çözüm |
|---|---|
| `bağlantı koptu` döngüsü | Erişim kodu yanlış ya da Developer Mode kapalı |
| Bağlanıyor ama veri yok | Seri numarası yanlış (topic eşleşmiyor) |
| Sayfada 📡 çıkmıyor | `makineAd` Tikita'daki makine adıyla birebir aynı değil; ya da köprü 90 sn'den uzun süredir veri yazmadı |
| P1/A1'de veri seyrek | Normal — köprü 5 sn'de bir tam durum ister (pushall) |
