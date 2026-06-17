# Tikita · Makine & Konsinye Takip

3D baskı markası **Tikita** için makine, baskı işi, konsinye ve cari takip uygulaması.

- **Mimari:** Tek dosya (`public/index.html`) — React 18 (UMD, Babel yok) + Firebase Firestore 10.12, inline stiller, Türkçe arayüz.
- **Firebase projesi:** `tikita-2026`
- **GitHub:** https://github.com/AhmetYuksel5/Tikita
- **Hosting (deploy sonrası):** https://tikita-2026.web.app

## Kurulum (tek seferlik)

### 1. Firebase web config'i gir
`public/index.html` içinde `cfg` nesnesinde **3 alanı** doldur:

```js
apiKey:"...",            // TODO
messagingSenderId:"...", // TODO
appId:"..."              // TODO
```

Nereden alınır: **Firebase Console → `tikita-2026` → ⚙ Proje Ayarları → Genel →
"Uygulamalarınız" → Web (`</>`)**. Web uygulaması yoksa "Uygulama ekle → Web" ile
oluştur; çıkan `firebaseConfig` bloğundaki değerleri kopyala.
(`authDomain / projectId / storageBucket` zaten doğru girili.)

### 2. Firestore'u aç
Firebase Console → **Firestore Database → Veritabanı oluştur** (production/test fark etmez;
kurallar `firestore.rules` ile yönetilir).

### 3. Otomatik deploy (GitHub Actions)
Repo → **Settings → Secrets and variables → Actions → New repository secret**:
- Ad: `FIREBASE_TOKEN`
- Değer: `firebase login:ci` komutuyla alınan token.

`main` branch'ine her push otomatik olarak Firebase Hosting'e deploy eder.

### Yerel test
`public/index.html` dosyasını tarayıcıda aç — Firebase'e canlı bağlanır.

## Veri Modeli (Firestore koleksiyonları)

| Koleksiyon | Amaç | Ana alanlar |
|---|---|---|
| `makineler` | 3D yazıcı envanteri | ad, model, renkli, durum (bos/arizali/bakim), not |
| `urunler` | Ürün kataloğu | ad, renk, gram, sureDk, maliyet, fiyat, filamentId, makerworldUrl, not |
| `isler` | Baskı işleri | makineId, makineAd, urunId, urunAd, adet, baslangic, sureDk, durum (devam/bitti/iptal), gercekBitis, not |
| `yerler` | Ürün verilen yerler | ad, yetkili, telefon, adres, not |
| `teslimatlar` | Konsinye/satış kayıtları | yerId, yerAd, urunId, urunAd, adet, birimFiyat, tur (konsinye/satis), satilan, iade, tarih, not |
| `cari_hareket` | Tahsilat / elle borç | yerId, yerAd, tip (tahsilat/borc), tutar, tarih, aciklama |
| `filamentler` | Filament stoğu | ad, tip, renk, kalanGram, kritikGram, not |
| `meta` | Uygulama bayrakları | `app` dokümanı: makinelerSeed (makineler tek seferlik otomatik eklendi mi) |

> **Bakiye** = (satış teslimatlarının tamamı + konsinyede satılan adetler = mal bedeli)
> + elle borç − tahsilat. Hepsi `teslimatlar` ve `cari_hareket`'ten canlı hesaplanır.
> Filament stoğu sonraki fazda (bkz. `ROADMAP.md`).

## Ana Bileşenler

| Sekme | Fonksiyon | Açıklama |
|---|---|---|
| Pano | `PanoTab` | Canlı makine durumu, çalışan iş, geri sayım, bitiş tahmini |
| Akış | `AkisTab` | Üretimden satışa değer akışı: Baskıda → Depoda → Konsinyede → Satıldı (otomatik türetilir) + bağlı para |
| Makineler | `MakinelerTab` | Tek ekran kompakt hücre tablosu (ad + durum + bitiş); hücreye dokun → düzenle/sil |
| Ürünler | `UrunlerTab` | Ürün kataloğu CRUD + kâr + filament ataması + MakerWorld linki |
| Stok | `StokTab` | Filament stoğu, kritik uyarısı, aktif iş ihtiyacı vs stok, "kaç adet daha basılır" |
| İşler | `IslerTab` | İş geçmişi, filtre, başlat/düzenle/bitir/iptal |
| Yerler & Cari | `YerlerTab` | Verilen yerler, teslimat (konsinye/satış), tahsilat, bakiye |

> **MakerWorld linki:** Sayfa bot korumalı (Cloudflare) olduğu için içerik otomatik
> çekilemez. Link saklanır; "Ad ←" butonu ürün adını link slug'ından üretir
> (`/models/629500-articulated-slug` → "Articulated Slug").

> **Tema:** Üst bardaki düğme ile açık/koyu mod (CSS değişkenleri + localStorage).
> **Makineler:** 6 makine ilk açılışta otomatik eklenir (tek seferlik, `meta/app` bayrağı).

## Fazlar
- **Faz 1 (tamamlandı):** Makine envanteri + ürün kataloğu + canlı baskı panosu.
- **Faz 2 (tamamlandı):** Konsinye & cari — yerler, teslimat (konsinye/satış), tahsilat, bakiye.
- **Faz 3 (tamamlandı):** Filament stoğu + "yeter mi" analizi; Akış (değer akışı) panosu.
- **Faz 4:** Raporlama, bakım hatırlatma, elektrik maliyeti, otomatik filament düşümü.

Detay için `ROADMAP.md`.
