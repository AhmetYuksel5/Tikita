# Bambu buluttan makara bilgisi çekme

Yazıcılardaki AMS yuvalarında hangi filamentin durduğunu Bambu bulut hesabından
okur, Tikita'daki makine kayıtlarına yazar. Atölyede hiçbir şey çalışmaz —
internet olan her yerden koşar.

## Neden ayrı bir araç?

Panel (admin.html) tarayıcıda çalışıyor. Bambu'nun makara bilgisi yalnız
**MQTT over TLS** ile geliyor; tarayıcı bu bağlantıyı kuramaz, Bambu'nun REST
ucu da CORS'a kapalı. Bu yüzden okuma işini Node.js yapıyor, sonucu Firestore'a
yazıyor, panel her zamanki gibi Firestore'dan okuyor.

## Bir kerelik kurulum

```bash
cd arac/bambu
npm install
node giris.mjs
```

E-posta + şifre sorar. Bambu çoğu hesapta e-posta doğrulama kodu ister; şifreyi
boş bırakırsan doğrudan kod yollar. Çıkan `BAMBU_TOKEN` (ve varsa
`BAMBU_REFRESH`) satırlarını sakla. Şifre hiçbir yere yazılmaz.

`giris.mjs` sonunda hesaptaki yazıcıları seri numaralarıyla listeler.

## Makineleri eşleştirme

Araç, Bambu yazıcısını Tikita makinesiyle şu sırayla eşler:

1. makine kaydındaki `bambuSeri` alanı
2. seri numarası makine adının içinde geçiyorsa
3. makine adı ile yazıcı adı tutuyorsa

Hiçbiri tutmazsa o yazıcı **atlanır** — yanlış makineye yazmaktansa hiç yazmaz.
En sağlamı `bambuSeri` alanını bir kez doldurmak.

## Çekme

```bash
BAMBU_TOKEN=... node cek.mjs --kuru    # yalnız göster, hiçbir şey yazma
BAMBU_TOKEN=... node cek.mjs           # Firestore'a yaz
```

İlk seferde mutlaka `--kuru` ile çalıştır ve çıktıyı oku.

## Ne yazar, ne yazmaz

Yazdığı: `makineler/<id>` içinde `takiliMakara`, `takiliFilament`, `bambuSeri`,
`bambuTarih`, `bambuEslesmeyen`. Başka hiçbir alana dokunmaz.

**Tüketim izi korunur.** Tikita'nın Bambu'da olmayan iki bilgisi var: o
makaradan kaç gram basıldığı (`harcanan`) ve elle tartım (`olcum`). Yuvadaki
makara aynıysa bunlar aynen kalır; makara değiştiyse yeni makara sıfırdan
başlar. Bambu'nun kalan yüzdesi yalnız RFID'li Bambu makaralarında gelir ve
**elle tartım varsa ona dokunmaz** — tartı her zaman daha doğrudur.

**Tanınmayan makara mevcut kaydı bozmaz.** Bambu'nun bildirdiği makara
Tikita'daki filamentlerden birine denk gelmiyorsa o yuvaya dokunulmaz, kayıt
`bambuEslesmeyen` olarak bildirilir.

## Tanınmayan makarayı bağlama

Panelde makinenin makara sayfasını aç. Tanınmayan makaralar üstte turuncu bir
blokta çıkar; dokun, hangi filament olduğunu seç. Filamente `bambuKod`
(`PLA|FF8800`) yazılır, RFID okunduysa makaranın kimliği de eklenir. Bir daha
sorulmaz.

İlk çekimde muhtemelen bütün makaralar tanınmayacak — Tikita'daki filament
kayıtlarında renk kodu yok. Her filamenti bir kez bağladıktan sonra kendiliğinden
tanınır.

## Düzenli çekim

`.github/workflows/bambu.yml` elle tetiklenir (Actions → Bambu makara çekimi →
Run workflow). Düzenli çalışmasını istersen dosyadaki `schedule` satırlarının
başındaki `#` işaretlerini kaldır. Gerekli secret: `BAMBU_TOKEN`.

## Token süresi

Token'ın ömrü var; dolunca `cek.mjs` uyarır.

```bash
BAMBU_REFRESH=... node giris.mjs --tazele
```

## Durum

Ayrıştırma, eşleştirme ve tüketim izi mantığı testlerle doğrulandı. Bambu
buluta bağlanan kısım (giriş, cihaz listesi, MQTT) **gerçek bir hesapla
denenmedi** — ilk çalıştırmada `--kuru` ile başla.
