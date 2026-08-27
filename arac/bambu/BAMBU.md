# Bambu buluttan makara bilgisi çekme

Yazıcılardaki AMS yuvalarında hangi filamentin durduğunu Bambu bulut hesabından
okur, Tikita'daki makine kayıtlarına yazar. Atölyede hiçbir şey çalışmaz —
internet olan her yerden koşar. **Telefondan, GitHub uygulaması üzerinden
yönetilir; bilgisayar gerekmez.**

## Neden ayrı bir araç?

Panel (admin.html) tarayıcıda çalışıyor. Bambu'nun makara bilgisi yalnız
**MQTT over TLS** ile geliyor; tarayıcı bu bağlantıyı kuramaz, Bambu'nun REST
ucu da CORS'a kapalı. Bu yüzden okuma işini GitHub Actions üzerinde Node.js
yapıyor, sonucu Firestore'a yazıyor, panel her zamanki gibi Firestore'dan
okuyor.

## Bir kerelik kurulum — iki gizli anahtar

Depo **herkese açık**. Bu yüzden e-posta, şifre ve token hiçbir zaman konuya,
yoruma ya da günlüğe yazılmaz; ikisi de GitHub'ın gizli anahtarlarında durur.

GitHub → depo → **Settings → Secrets and variables → Actions → New repository
secret**, iki tane:

| ad | değer |
| --- | --- |
| `BAMBU_EPOSTA` | Bambu hesabının e-postası |
| `BAMBU_SIFRE` | Bambu hesabının şifresi (aynı zamanda token kasasının anahtarı) |

`BAMBU_SIFRE` iki iş görür: girişi dener ve saklanan token'ı şifreler. Sonradan
değiştirirsen kasa açılmaz — yeniden `giriş` yazman gerekir.

## Kullanım — GitHub konusu

Başlığında **bambu** geçen bir konu (issue) aç. Bot yorumla cevap verir.

| komut | ne yapar |
| --- | --- |
| `giriş` | Bambu hesabına bağlanır, gerekirse e-postana kod yollar |
| `kod 123456` | Gelen kodu girer, bağlantıyı tamamlar (yorum hemen karartılır) |
| `eşle` | Yazıcıları Tikita makineleriyle eşleştirir, `bambuSeri` yazar |
| `çek` | Makaraları okur, **yalnız gösterir** — hiçbir şey yazmaz |
| `yaz` | Okuduğunu Tikita'ya kaydeder |
| `durum` | Bağlantı durumu ve komut listesi |

Yalnız depo sahibinin yorumları işlenir; başkasının yorumu sessizce yok sayılır.

Sıra: `giriş` → `kod ...` → `eşle` → `çek` (kontrol et) → `yaz`.

## Token ne kadar dayanır

Giriş bir kez yapılır. Token şifreli olarak Firestore'da `ayar/bambu` içinde
durur (panel yalnız `ayar/genel` okuduğu için arayüzü etkilemez). Süresi
yaklaşınca `refreshToken` ile kendiliğinden yenilenir. Büsbütün dolarsa bot
"`giriş` ile yenile" der.

## Makineleri eşleştirme

`eşle` şu sırayla bakar:

1. makine kaydındaki `bambuSeri` alanı
2. seri numarası makine adının içinde geçiyorsa
3. makine adı ile yazıcı adı tutuyorsa

Hiçbiri tutmazsa o yazıcı **atlanır** — yanlış makineye yazmaktansa hiç yazmaz.

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
başındaki `#` işaretlerini kaldır. Kayıtlı oturumu kullanır; ek gizli anahtar
istemez.

## Bilgisayardan çalıştırmak (isteğe bağlı)

```bash
cd arac/bambu && npm install
BAMBU_SIFRE=... node cek.mjs --kuru    # yalnız göster
BAMBU_SIFRE=... node cek.mjs           # Firestore'a yaz
BAMBU_TOKEN=... node cek.mjs           # kasayı hiç kullanmadan
```

## Durum

Ayrıştırma, eşleştirme, tüketim izi, kasa ve konu akışının tamamı testlerle
doğrulandı (bulut ve Firestore sahnelenerek uçtan uca). Bambu'ya **gerçekten
bağlanan** kısım (giriş, cihaz listesi, MQTT) hiçbir gerçek hesapla denenmedi —
geliştirme ortamı `api.bambulab.com`'a çıkamıyor. İlk gerçek deneme GitHub
Actions üzerinde olacak; bu yüzden `yaz` demeden önce mutlaka `çek` ile bak.
