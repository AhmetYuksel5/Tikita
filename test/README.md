# Tikita testleri

Tarayıcı süitleri gerçek uygulama gövdesini (public/*.html) çevrimdışı koşturur:
CDN'ler kesilir, React/ReactDOM UMD ve `fbstub.mjs.txt` (Firestore taklidi)
route araya girmeyle enjekte edilir.

## Koşturma

    cd test
    npm i --no-audit --no-fund               # playwright + react 18
    (cd ../public && python3 -m http.server 8799 &)
    TZ=Europe/Istanbul node kaymaE2E.mjs

Chromium sistemde kurulu: /opt/pw-browsers/chromium-1194/chrome-linux/chrome
(PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 ile indirme atlanır.)

## fbstub.mjs.txt

`window.__TIKITA_VERI` veriyi besler. Test kancaları:
- `window.__YAZ`        — yazılan kayıtlar [{__coll,__id,...}]
- `window.__SIL`        — silinenler [{coll,id}]
- `window.__KAYITLAR(c)` — koleksiyonun güncel hâli
- `window.__DEGISTIR(c,rows)` — koleksiyonu değiştir + aboneleri uyar
- `window.__SESSIZ(c,rows)` — değiştir ama aboneleri UYARMA (bayat ekran taklidi)
- `window.__KES(coll,veri)` — yazma sırasında hata fırlatmak için

## Neden repoda

Testler daha önce oturuma özel scratchpad'de tutuluyordu ve ortam yenilenince
70 süitin tamamı kayboldu. Regresyon ağı kodun yanında durmalı.

## Süitler

| dosya | ne doğrular |
|---|---|
| `kaymaE2E.mjs` | 320/390/430px — baskı bilgisi · konsinye · değişim ekranlarında yatay kayma yok |
| `gozcuE2E.mjs` | gözcü statüsündeki kaleler en altta kapalı akordiyonda |
| `degisimE2E.mjs` | ♻️ değişim: eşit adet zorunluluğu, iki kayıt tek `degisimId`, stok ayağı, borç yalnız fiyat farkı kadar, **iade kredisi açık satışa işlenir (mahsup izi) → satış başına alacak da kapanır**, birlikte geri alma krediyi geri sarar |
| `degisimDefter.mjs` | ♻️ değişimin muhasebe ayağı (saf model): ters kayıt, borç/alacak yönü, fiş bacakları, cari bakiye |
| `sayimE2E.mjs` | 📋 sayım SADE: yalnız kalan güncellenir (bırakış/konsinye/sipariş yok), kutular dolu gelir, fiyat bazında ayrı satır, para ve stok değişmez |
| `satisCokluE2E.mjs` | 💰 satış çoklu liste: alt alta giriş, alınan kutusu yok, indirim şeridi yalnız gerektiğinde, Tikita payı verilişten düşer, tek kaydetmede çoklu kayıt |
| `tahsilatGeriE2E.mjs` | 🧾 tahsilat geri alma idempotent: bayat ekrandan ikinci basış, hızlı çift dokunuş, mahsup izi, KDV tavanı |
| `ziyaretRaporE2E.mjs` | 🧾 değişim tek satır + geri alma · fiyat bazlı birleşik döküm · ziyaret raporu sırası · tahsil edilecek kalemleri · birleşik reyting |
| `cephaneOnayE2E.mjs` | 🔐 cephane onayı: ayar kapalıyken eski davranış, açıkken izinsizde hareket yerine talep (stok/çanta hiç oynamaz), izinlide doğrudan, boşaltma da onaya tabi; komuta onayında adet düşürülebilir, rette hiç yazım olmaz; izin ve ayar anahtarları |
| `urunGizleE2E.mjs` | 🙈 ürün gizle: kartta Gizle/Göster, en altta kapalı akordiyon, stok/çanta uyarısı · 🗑 katalog görseli silme (üç kaynak: yüklenen·gömülü·hazır), tek görselli ürüne de ulaşılır · pazarlamacıda gizli ürün çantasında kalmışsa görünür, yenisi alınamaz |
| `urunBirlesE2E.mjs` | 🔗 ürün birleştirme: arşivli ürün hiçbir listede çıkmaz (süzgeç map'ten ÖNCE), kapanan kart silinmez (birlesti + birlestiOnce okunur), sayaç toplamı ve hareket geçmişi korunur |
| `defterSilE2E.mjs` | 🧾 komuta defterinden silme: değişim çifti birlikte gider, mahsup izi geri sarılır (satışın borcu yeniden açılır), izsiz kayıtta hiçbir satışa dokunulmaz |
| `rafDonusE2E.mjs` | ↩️ konsinye satışı iptal edilince adet ÇIKTIĞI partiye döner (parti izi + izsiz eski kayıtta LIFO) |
