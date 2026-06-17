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
| `urunler` | Ürün kataloğu | ad, renk, gram, sureDk, maliyet, fiyat, not |
| `isler` | Baskı işleri | makineId, makineAd, urunId, urunAd, adet, baslangic, sureDk, durum (devam/bitti/iptal), gercekBitis, not |

> Konsinye/cari/stok koleksiyonları sonraki fazlarda eklenecek (bkz. `ROADMAP.md`).

## Ana Bileşenler

| Sekme | Fonksiyon | Açıklama |
|---|---|---|
| Pano | `PanoTab` | Canlı makine durumu, çalışan iş, geri sayım, bitiş tahmini |
| Makineler | `MakinelerTab` | Makine CRUD + "Örnekleri Ekle" (6 Bambu) |
| Ürünler | `UrunlerTab` | Ürün kataloğu CRUD + kâr hesabı |
| İşler | `IslerTab` | İş geçmişi, filtre, başlat/düzenle/bitir/iptal |

## Fazlar
- **Faz 1 (tamamlandı):** Makine envanteri + ürün kataloğu + canlı baskı panosu.
- **Faz 2:** Konsinye & cari (iş yerleri, borç/tahsilat).
- **Faz 3:** Filament stoğu + maliyet/ihtiyaç tahmini.
- **Faz 4:** Raporlama, bakım hatırlatma, elektrik maliyeti.

Detay için `ROADMAP.md`.
