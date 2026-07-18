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

## 3. Sürekli çalışsın (Raspberry Pi / Linux, isteğe bağlı)

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
