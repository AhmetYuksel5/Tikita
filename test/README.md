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
| `katalogPremiumE2E.mjs` | 📔 premium katalog: kapak → akan bölümler → arka kapak, bölümler sayfayı tek başına kaplamaz, kart içi hizalar sabit, hiçbir ürün bölümsüz kalmaz, rozetler yalnız tanımlı bölümlerden; sade tasarım regresyonu; ürün kartındaki katalog bölümü + tanıtım yazısı |
| `yoneticiPazE2E.mjs` | 👑 yönetici pazarlamacı: hakediş kartı · kapatılmamış dönemler · haftalık arşiv · nakit teslim blokları hiç çıkmaz, yazma yolları da kapalı; normal pazarlamacı ve Paşa rütbesi etkilenmez (ölçüt rütbe değil rol); komutada saha nakdine ve hafta sayımına girmez |
| `urunGizleE2E.mjs` | 🙈 ürün gizle: kartta Gizle/Göster, en altta kapalı akordiyon, stok/çanta uyarısı · 🗑 katalog görseli silme (üç kaynak: yüklenen·gömülü·hazır), tek görselli ürüne de ulaşılır · pazarlamacıda gizli ürün çantasında kalmışsa görünür, yenisi alınamaz |
| `urunBirlesE2E.mjs` | 🔗 ürün birleştirme: arşivli ürün hiçbir listede çıkmaz (süzgeç map'ten ÖNCE), kapanan kart silinmez (birlesti + birlestiOnce okunur), sayaç toplamı ve hareket geçmişi korunur |
| `defterSilE2E.mjs` | 🧾 komuta defterinden silme: değişim çifti birlikte gider, mahsup izi geri sarılır (satışın borcu yeniden açılır), izsiz kayıtta hiçbir satışa dokunulmaz |
| `rafDonusE2E.mjs` | ↩️ konsinye satışı iptal edilince adet ÇIKTIĞI partiye döner (parti izi + izsiz eski kayıtta LIFO) |
| `kalemHakedisE2E.mjs` | 🧮 kale hakediş dökümünde KALEM KALEM: her satırda adet · satış · veriliş · birim hakediş; aynı ürün farklı verilişten satıldıysa ayrı satır (veriliş zammı kaybolmaz); kullanılan veriliş satışın kendi kaydından (ürünün güncel fiyatı değil); çanta/konsinye/gerilla ayrımı; zararına satış eksi görünür · GÜNE GÖRE'de tarihe dokununca o günün ürün dökümü açılır, ikinci dokunuş kapatır, başka güne geçince öteki kapanır |
| `hakedisSheetE2E.mjs` | 💼 haftalık hakediş ekranı: başlık yalnız "N. hafta", simge nötr (🫰 hiçbir yerde yok), üstteki özet kutusu yok; ÜÇ KUTU (div.card) — SATIŞLAR (açıklama·ciro·hakediş, toplam; satır dokununca ürün ürün açılır) ve TAHSİLATLAR (açıklama·tutar; satışsız kalenin tahsilatı, gerilla peşin, başka haftanın satışına gelen tahsilat "X satışının"); HAKEDİŞ kutusu: Toplam tahsilat − Tikita'ya verilecek = Benim alacağım (son satır); geçmiş dönemler yok |
| `mahsupE2E.mjs` | 💼 hakediş MAHSUBU (19 Eylül / 38. hafta sonrası): pazarlamacı kartı yalnız mahsup haftasının hakedişini düşer, eski haftanın ve başka haftanın satışının hakedişini düşmez; hakediş nakdi aşarsa "Tikita'dan alacağın"; komuta saha nakdi aynı rakam, eksi bakiye "Tikita borçlu" ve listede kalır; mahsup haftasında "Mahsubu onayla" → gider mahsup işaretli, ödeme 0; eski haftada hâlâ "Ödeme yap" |
| `nakitKartE2E.mjs` | 💵 "Teslim edilecek nakit": kart yalnız süren haftada para toplandıysa da çıkar (eskiden hiç çıkmıyordu), başlıktaki rakam ELDEKİ TOPLAM (şimdi istenebilen + süren hafta), elde para varken "temiz" yazmaz, onay bekleyen düşülür · komutada Saha nakdi kutusu da aynı: para yalnız süren haftadaysa kutu yine çıkar |
| `konsVerisE2E.mjs` | 🏭 konsinye ekranında veriliş (üreticiden alış) bedeli: bırakışta satır başına veriliş + marj ve alt toplamda toplam marj, fiyat değişince marj da değişir, anlaşmalı üründe anlaşmalı veriliş okunur; raftan satışta raf · veriliş · hakediş; hediyede maliyet; iadede para yok |
