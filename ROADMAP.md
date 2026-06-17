# Tikita — Yol Haritası

## Temel varlıklar (veri modeli)

| Koleksiyon | Amaç | Ana alanlar |
|---|---|---|
| `makineler` | 3D yazıcı envanteri | ad, model, tip, durum, konum, satınalma, toplam çalışma saati |
| `urunler` | Ürün kataloğu | ad, görsel, filament_tipi, gram, süre, maliyet, fiyat |
| `isler` | Baskı görevleri | makineId, urunId, başlangıç, tahmini/gerçek bitiş, gram, durum, müşteri |
| `is_yerleri` | Konsinye verilen yerler | ad, adres, yetkili, telefon, komisyon |
| `konsinye` | Hangi yere ne kadar mal | isYeriId, urunId, adet, tarih, satılan, iade, kalan |
| `cari_hareket` | Borç/alacak/tahsilat | isYeriId, tarih, tür, tutar |
| `malzeme` | Filament stoğu | renk, tip, kalan, kritik_seviye, tedarikçi |
| `bakim` | Makine bakımı | makineId, tarih, tür, not, maliyet |

## Fazlar

### Faz 1 — Çekirdek (TAMAMLANDI)
- Makine envanteri (6 Bambu makine), durum yönetimi
- Ürün kataloğu (gram, süre, maliyet, fiyat, kâr)
- Canlı baskı panosu: hangi makinede ne basılıyor, geri sayım, bitiş tahmini
- İş geçmişi, başlat/düzenle/bitir/iptal

### Faz 2 — Konsinye & Cari
- İş yerleri kaydı
- Konsinye dağıtım: verilen / satılan / iade / kalan
- Cari: iş yeri bazında aylık borç, tahsilat, bakiye

### Faz 3 — Stok & Maliyet
- Filament stoğu (renk/tip), kritik seviye uyarısı
- Aktif + planlı işlerden filament ihtiyaç tahmini (metre/kg)
- Ürün maliyet/kâr otomatik (filament + elektrik + amortisman + işçilik)

### Faz 4 — Raporlama & Otomasyon
- Dashboard: ciro, en çok satan ürün, en borçlu müşteri, makine verimliliği
- Fire/başarısız baskı takibi
- Bakım hatırlatıcı (çalışma saatine göre)
- Elektrik tüketimi maliyeti
- Sipariş/teklif yönetimi (konsinye dışı özel siparişler)

## 3D firmaları için ek fikirler (ileride)
- QR/barkod ile konsinye sayımı (şimdilik kapsam dışı)
- Mobil saha kullanımı (atölyede iş başlat/bitir)
- Makine doluluk/verimlilik raporu
- Tedarikçi fiyat geçmişi
