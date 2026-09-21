# Tikita · Sadeleştirme Yönergesi

**Emphasize by de-emphasizing** — bir şeyi öne çıkarmanın tek yolu, geri kalanını
geri çekmektir. Vurgu mutlak değil görecelidir: her şey kalınsa hiçbir şey kalın
değildir.

Bu yönerge yeni yazılan her ekran için bağlayıcıdır; eski ekranlar dokunuldukça
buna çekilir.

---

## Bugünkü hâl (ölçüm)

| | pazarlamacı | komuta |
|---|---|---|
| `fontWeight:800` kullanımı | **204** | **575** |
| `fontWeight:600` kullanımı | 26 | 35 |
| `fontWeight:400` kullanımı | 2 | 0 |
| farklı punto değeri | **31** | **25** |
| sabit hex renk (farklı) | **79** | **153** |
| farklı köşe yarıçapı | 15 | 17 |
| emoji geçen metin | 262 | 230 |
| farklı emoji | 69 | 60 |
| pastel zeminli kutu | 27 | 70 |
| gölge (`boxShadow`) | 50 | 40 |
| büyük harf etiket (`.lbl`) | 44 | 146 |

Okunuşu: **800 ağırlık varsayılan olmuş.** Vurgu için ayrılmış bir araç, sayfanın
gövde yazısı hâline gelince vurgu diye bir şey kalmıyor. Aynı şey pastel kutu,
emoji ve büyük harf için de geçerli — hepsi "dikkat çek" araçlarıydı, hepsi
sıradanlaştı.

---

## Üç kademe

Her ekranda her öğe üç kademeden birine girer. Kademe, öğenin **önemine** göre
değil, **ekranın cevapladığı soruya** göre belirlenir.

### 1 · KAHRAMAN — ekran başına **en fazla bir**

Kullanıcı bu ekrana neyi öğrenmek için geldiyse o.

| | |
|---|---|
| punto | 28 (kart içinde 24) |
| ağırlık | 800 |
| renk | `--txt`, ya da tek bir anlam rengi |
| zemin · kenarlık · gölge | **yok** — çevresindeki boşluk yeter |

Ekran başına kahraman örnekleri:
Kale → **borç** · Rapor → **hakediş** · Stok → **stok değeri** ·
Cephane → **çantadaki adet** · Tahsilat → **kalan borç**

### 2 · DESTEK — 3 ile 5 arası

Kahramanı okumak için gereken sayılar. Kahramanla yarışmaz, onu açıklar.

| | |
|---|---|
| punto | 16 |
| ağırlık | 700 |
| renk | `--txt` |
| zemin | yok |

### 3 · ARKA PLAN — sınırsız

Etiketler, birimler, tarihler, ikincil sayaçlar, durum notları, yardımcı metin.
Var olduğu bilinsin yeter; okunmak için göz çevirmek gerekir, o normaldir.

| | |
|---|---|
| punto | 13 (en küçük 11) |
| ağırlık | **500** |
| renk | `--mut` (daha da geride: `--mut2`) |
| zemin · kenarlık · emoji | **yok** |

---

## Kurallar

### R1 · Bir ekranda bir kahraman
İki sayı aynı anda 28/800 ise ikisi de kahraman değildir. Hangisi olduğuna karar
ver, diğerini 2. kademeye indir.

### R2 · Varsayılan ağırlık **500**, 800 yalnız 1. kademe
Bugünkü dağılım tersine dönmeli: 500 yüzlerce kez, 800 ekran başına bir-iki kez.
700 yalnız 2. kademe içindir. **900 hiç kullanılmaz** (zaten 30 yerde var, hepsi
800'e inmeli).

### R3 · Punto merdiveni — beş basamak, ara değer yok
```
28   kahraman
20   bölüm başlığı
16   destek · gövde
13   arka plan
11   en küçük (birim, tarih, rozet)
```
`11.5 · 12.5 · 13.5 · 10.5 · 14.5` **yasak.** Bugün 31 farklı punto var; yarım
piksel farklar hiyerarşi kurmuyor, sadece ritmi bozuyor.

### R4 · Renk anlam taşır, süs taşımaz
İzinli palet: `--txt` `--mut` `--mut2` `--line` `--surf` `--surf2`
artı **dört anlam rengi**:

| renk | anlamı | nerede |
|---|---|---|
| kırmızı `--red` | borç · hata · eksi | yalnız gerçekten sorun olan sayı |
| yeşil `--green` | tamam · tahsil edildi | onaylanmış durum |
| altın `--gold` | bekleyen para | hakediş, alacak |
| mavi `--cyan` | eylem · bilgi | tıklanacak şey |

**Bir ekranda en fazla iki anlam rengi.** Üçüncüsü girdiğinde hiçbiri
uyarmıyor demektir. Sabit hex yazmak yasak — iki dosyada **176 farklı sabit
renk, 1.190 kullanım** var; hepsi tokena çekilecek.

`--violet` (72 kullanım) bir anlam taşımıyor, dekorasyon; kaldırılacak.

### R5 · Pastel zeminli kutu — ekran başına **en fazla bir**
Zemin, "burada durup bir şey yapman lazım" demektir. Bugün Stok ekranında dört
tanesi üst üste duruyor (eksi stok · geciken iş · maliyetsiz ürün · fiyatsız
ürün); dördü birden bağırınca hiçbiri duyulmuyor.

Birden çok uyarı varsa: **en acili kutu olur, kalanı tek satır arka plan
metnine iner.**

### R6 · Ayırmak için çizgi değil boşluk
Kartlar arası 1px `--line` yerine 16px boşluk. Çizgi yalnız gerçekten bir tablo
satırını bölüyorsa kalır.

### R7 · Emoji: kimlik evet, süs hayır
**Kalır:** sekme ikonları, ürün/kale/kişi türünü gösteren tek ikon.
**Gider:** düğme metni içindeki, etiketin başındaki, satır içindeki emoji.

```
🧾 240 ₺ Tahsil et      →  240 ₺ Tahsil et
📦 Kalede şu an bulunanlar  →  Kalede bulunanlar
⚠️ 3 üründe stok eksiye düştü  →  3 üründe stok eksiye düştü
```
492 emoji'li metin var; hedef 60 civarı (yalnız kimlik).

### R8 · Büyük harf yalnız bölüm başlığı
`.lbl` bugün üç vurguyu birden yığıyor: BÜYÜK HARF + `letter-spacing` + `800`.
Biri yeter. Yeni tanım:
```css
.lbl{font-size:13px;font-weight:600;color:var(--mut);letter-spacing:0;text-transform:none}
```
190 kullanımın çoğu zaten bölüm başlığı değil, alan etiketi — onlar 3. kademeye
iner.

### R9 · Gölge ve degrade yalnız **yüzen** katmanda
Sheet, fixed CTA, toast. Kartta, satırda, rozette yok. Bugün 90 gölge ve 35
degrade var; kâğıt üstünde duran şeyin gölgesi olmaz.

### R10 · Sayı büyük, etiket küçük
Etiket sayıyı tanıtır, sayının önüne geçmez.
```
Tahsil edilecek tutar: 240 ₺     ✗
240 ₺                             ✓
tahsil edilecek
```

### R11 · Açıklama metni yok
(Zaten yürürlükte.) Arayüz kendini anlatır; anlatamıyorsa arayüz yanlıştır,
çözüm cümle eklemek değil.

---

## Somut örnek — kale kartı

**Bugün** — yedi öğe, altısı 800 ağırlıkta, dört renk, beş emoji, iki pastel kutu:

```
🧾 240 ₺ Tahsil et        (800 · altın · pastel kutu)
🏬 0 adet Konsinye         (800 · mor)
💰 240 ₺ Toplam ciro       (800 · yeşil)
⚔️ 6 satış · İlişki gücü   (800 · txt)
📦 KALEDE ŞU AN BULUNANLAR (800 · büyük harf · mut)
Seviye 1 · 💪 6            (800 · gold)
🕘 son ziyaret: 4 gün önce (700 · mut)
```

**Yönergeye göre** — bir kahraman, üç destek, gerisi geri:

```
240 ₺                      (28 · 800 · txt)        ← KAHRAMAN
tahsil edilecek            (13 · 500 · mut)

6 satış   0 konsinye   240 ₺ ciro                  ← DESTEK (16 · 700 · txt)

Seviye 1 · son ziyaret 4 gün önce                  ← ARKA PLAN (13 · 500 · mut)

Kalede bulunanlar                                  ← bölüm başlığı (20 · 600)
…
```

Aynı bilgi, tek renk, sıfır pastel kutu, bir emoji.

---

## Uygulama sırası

Hepsini bir seferde değiştirmek riskli; ekran ekran gidilir ve her adım
testten geçer.

1. **Token katmanı** — punto merdiveni ve ağırlık sabitleri tek yerde tanımlanır,
   `.lbl` yeniden yazılır. (Görsel etki: her ekranda etiketler geri çekilir.)
2. **Kale ekranı** — en çok bakılan ekran, örneği yukarıda.
3. **Cephane** ve **Rapor**.
4. **Komuta · Stok** — dört pastel uyarının tekleştirilmesi.
5. **Komuta · Panel ve Muhasebe**.
6. Kalan sabit hex renklerin tokena çekilmesi.

---

## Kontrol listesi

Yeni bir ekran ya da değişiklik bitmeden:

- [ ] Ekranda **bir** kahraman var, o da en büyük tek öğe
- [ ] 800 ağırlık yalnız kahramanda; geri kalan 700 / 500
- [ ] Kullanılan puntolar merdivende var (28/20/16/13/11)
- [ ] En fazla **iki** anlam rengi
- [ ] Sabit hex yok, hepsi token
- [ ] En fazla **bir** pastel zeminli kutu
- [ ] Emoji yalnız kimlik için
- [ ] Büyük harf yalnız bölüm başlığında
- [ ] Gölge yalnız yüzen katmanda
- [ ] Açıklama cümlesi yok
- [ ] 320px genişlikte yatay kayma yok (`kaymaE2E` bunu sınar)
