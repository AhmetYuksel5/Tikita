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
| `makineler` | 3D yazıcı envanteri | ad, model, renkli, durum, bakimEsigiSaat, sonBakim, not |
| `urunler` | Ürün kataloğu | ad, renk, gram, sureDk, maliyet, fiyat, filamentId, makerworldUrl, not |
| `isler` | Baskı işleri | makineId, makineAd, urunId, urunAd, adet, baslangic, sureDk, durum (devam/bitti/iptal), gercekBitis, filamentDusuldu, not |
| `yerler` | Ürün verilen yerler | ad, yetkili, telefon, bolge, adres, lat, lng, not |
| `teslimatlar` | Konsinye/satış kayıtları | yerId, yerAd, urunId, urunAd, adet, birimFiyat, tur, satilan, iade, pazarlamaciId, pazarlamaciFiyat, tarih, not |
| `pazarlamacilar` | Pazarlamacılar | ad, telefon, bolge, not |
| `cari_hareket` | Tahsilat / elle borç | yerId, yerAd, tip (tahsilat/borc), tutar, tarih, aciklama |
| `filamentler` | Filament stoğu | kod (1'den otomatik), ad, tip, renk, kalanGram, kritikGram, kgFiyat, not |
| `siparisler` | Müşteri siparişleri | musteri, telefon, urunId, urunAd, adet, birimFiyat, teslimTarihi, durum (beklemede/uretimde/hazir/teslim/iptal), tarih, not |
| `meta` | Ayarlar + bayraklar | `app` dokümanı: makinelerSeed, kwhFiyat, varsayilanWatt (elektrik) |

> **Bakiye** = (satış teslimatlarının tamamı + konsinyede satılan adetler = mal bedeli)
> + elle borç − tahsilat. Hepsi `teslimatlar` ve `cari_hareket`'ten canlı hesaplanır.
> Filament stoğu sonraki fazda (bkz. `ROADMAP.md`).

## Ana Bileşenler

| Sekme | Fonksiyon | Açıklama |
|---|---|---|
| Pano | `PanoTab` | Canlı makine durumu, çalışan iş, geri sayım, bitiş tahmini |
| Rapor | `RaporTab` | Dönem (ay/yıl/tüm): ciro, satılan adet, açık alacak, biten/iptal, en çok satan, en borçlu, makine verimi |
| Akış | `AkisTab` | Üretimden satışa değer akışı: Baskıda → Depoda → Konsinyede → Satıldı (otomatik türetilir) + bağlı para |
| Makineler | `MakinelerTab` | Tek ekran kompakt hücre tablosu (ad + durum + bitiş); hücreye dokun → düzenle/sil |
| Ürünler | `UrunlerTab` | Ürün kataloğu CRUD + kâr + filament ataması + MakerWorld linki |
| Stok | `StokTab` | Filament stoğu, kritik uyarısı, aktif iş ihtiyacı vs stok, "kaç adet daha basılır" |
| Siparişler | `SiparisTab` | Müşteri siparişleri, durum akışı (beklemede→teslim), gecikme uyarısı, siparişten iş başlatma |
| İşler | `IslerTab` | İş geçmişi, filtre, başlat/düzenle/bitir/iptal |
| Yerler & Cari | `YerlerTab` | Verilen yerler, teslimat (konsinye/satış + pazarlamacı/fiyat), tahsilat, bakiye |
| Pazarlamacı | `PazarlamaciTab` | Pazarlamacı satış istatistikleri (adet/ciro/yer), bölge dağılımı, yer haritası (Leaflet) |

> **Elektrik & maliyet:** ⚙ Ayarlar'dan kWh fiyatı + varsayılan makine gücü (Watt). Ürün maliyeti =
> filament (gram × kg fiyatı) + elektrik (süre × güç × kWh) + ek maliyet; kâr buna göre hesaplanır.
> **Slicer okuma:** Ürün penceresinde `.gcode` / `.3mf` yükle → süre + gram otomatik dolar
> (G-code başlığı / 3mf içindeki slice verisi okunur; JSZip ile zip açılır).

> **MakerWorld linki:** Sayfa bot korumalı (Cloudflare) olduğu için içerik otomatik
> çekilemez. Link saklanır; "Ad ←" butonu ürün adını link slug'ından üretir
> (`/models/629500-articulated-slug` → "Articulated Slug").

> **Tema:** Üst bardaki düğme ile açık/koyu mod (CSS değişkenleri + localStorage).
> **Makineler:** 6 makine ilk açılışta otomatik eklenir (tek seferlik, `meta/app` bayrağı).

## Fazlar
- **Faz 1 (tamamlandı):** Makine envanteri + ürün kataloğu + canlı baskı panosu.
- **Faz 2 (tamamlandı):** Konsinye & cari — yerler, teslimat (konsinye/satış), tahsilat, bakiye.
- **Faz 3 (tamamlandı):** Filament stoğu + "yeter mi" analizi; Akış (değer akışı) panosu.
- **Faz 4 (tamamlandı):** Rapor/dashboard, bakım hatırlatıcı, otomatik filament düşümü,
  elektrik maliyeti (ürün maliyetine yansır), sipariş yönetimi, slicer (.gcode/.3mf) ile otomatik ürün doldurma.
- **Faz 5 (tamamlandı):** İşe opsiyonel filament; filament kod no; Akış detay (tıkla→liste);
  teslimatta pazarlamacı + satış fiyatı; Pazarlamacı sekmesi (istatistik + bölge + Leaflet harita).
- **Faz 6 (tamamlandı):** Gruplu kompakt menü; Pano uyarı şeridi; PIN şifre kapısı;
  tek tık JSON yedek/geri yükleme (⚙ Ayarlar); ürün/yer/sipariş arama.

> **Güvenlik notu:** PIN yalnızca arayüzü kilitler (casual koruma). `firestore.rules` hâlâ açık —
> gerçek koruma için Firebase Auth + auth gerektiren kurallar eklenmeli.

- **Faz 7 (tamamlandı):** Menü sadeleşti → sıra: **Makineler · Stok(Filament) · Ürünler · Satış · Rapor**.
  Pano/İşler/Siparişler kaldırıldı.
  - **Makineler:** kutucukta canlı baskı durumu + bitiş saati + kalan süre + filament; kutucuğa
    dokun → **Baskı başlat / bitti / iptal / geçmiş baskılar**. Baskı bitince ürün başı maliyet
    ve toplam üretilen adet otomatik Ürünler'e işlenir.
  - **Ürünler:** karta dokun → stok, maliyet kırılımı, stoktan üretilebilir adet, **hangi
    mekanlarda kaç adet**, karlılık.
  - **Yerler & Cari:** her teslimatta **biz kaça verdik / pazarlamacı kaça sattı / hangi
    pazarlamacı** + yere özel pazarlamacı istatistiği.

Detay için `ROADMAP.md`.

---

## 📒 Hareket Defteri + 📜 Audit + 💾 Yedek (2026-08-23)

**Ortak modüller (`public/lib/` — kopyalanmaz, tek kaynak; `/lib/**` no-cache):**

- **`lib/tikita-audit.js`** — değişiklik kaydı + yedek çekirdeği. Tüm sayfaların
  `save()/remove()` gövdesi buradan geçer; `audit_logs`'a kim/ne/ne-zaman düşer
  (merge+increment modeli: her update kısmi; increment geri alma TERS increment ile).
  `telafi` etiketli iş-olayı kayıtları genel geri almaya KAPALIDIR — ekranlardaki
  ↩️ telafi akışlarına (geriAlKayit / montajGeriAl / hakedisGeriAl) yönlendirilir.
  `firestore.rules`: audit_logs silinemez, yalnız `undone` damgası güncellenir.
- **`lib/hareket-model.js`** — SAF 4-tür defter katmanı (SATIŞ · TAHSİLAT · MASRAF ·
  ÖDEME). Firebase/DOM/Date.now KULLANMAZ; koleksiyon dizileri alır, kanonik satır
  döndürür. Raporlar (dönem pivotu, ürün kârlılığı, kale ekstresi, personel carisi,
  nakit, mutabakat) bu satırlardan CANLI türer — geçmiş kayıt düzeltilince raporlar
  kendiliğinden düzelir. Fiziksel göç YOK: kaynak koleksiyonlar yerinde durur.
  Muhasebe kodu/yevmiye bilinçli olarak YOK (2026-08-23 kararı — sade işletme dili).
  `stok_hareket` hiçbir adapterde MALİ satır üretmez (çift sayım kararları gömülü).

**Ekranlar (admin):** Rapor sekmesi → `ESKİ RAPOR | 📒 HAREKET DEFTERİ` (bayrak:
`ayar/genel.raporKaynak` = eski|yanyana|yeni — davranışı push değil bayrak değiştirir).
Ayarlar → 💾 Yedek indir (manifest + parmak izi; kullanıcı PIN'i içerir — güvenli sakla),
🖼 Foto yedeği, 📜 Değişiklik kaydı (son 40 gün; op katlama; ↶ geri al).

**KURALLAR:**
1. **Yeni koleksiyon açan, `TK_YEDEK_COLLS`'a (tikita-audit.js) eklemeden işi bitmiş saymaz.**
2. Audit'lenecekse `AUDIT_COLLS`'a da eklenir; yazım her zaman `save()/remove()`'dan geçer,
   çıplak `setDoc/deleteDoc` çağrılmaz.
3. Çok dokümanlı iş akışları `AUD.op(fn, ana, ad, {telafi})` ile sarılır (tek log satırı).
4. `useColl`'a yeni abonelik eklerken `AUD.snapPut(name, rows)` satırı unutulmaz —
   unutulursa her yazım "create" loglanır.
5. Rapor fonksiyonları SAFTIR: içlerinde yazım yoktur, rapor değeri Firestore'a yazılmaz.
   (İstisnalar: hakedis_donem = donuk mutabakat belgesi → "eskidi" rozeti ile denetlenir;
   satırlara dondurulmuş fiyatlar = tarihsel gerçek.)
6. Model/audit koduna dokununca testler koşulur:
   `node scratchpad/yedektest.js && node scratchpad/audittest.js && node scratchpad/harekettest.js`
