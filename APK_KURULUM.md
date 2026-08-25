# Tikita APK — kurulum ve yeniden derleme

Uygulama derlemesiz (statik) olduğu için Android'de **TWA** (Trusted Web Activity)
kullanılır: APK, `https://tikita-2026.web.app` adresini kendi ikonuyla ve **tam
ekran** açan ince bir sarmalayıcıdır.

> **Uygulama içeriği canlıdır.** Siteye yapılan her güncelleme telefona
> kendiliğinden gelir — APK'yı yeniden kurmana gerek YOKTUR. APK'yı yalnız
> **ikon, uygulama adı veya açılış adresi** değişirse yeniden derlersin.

---

## 1) Telefona kurmak (normal kullanım)

1. GitHub'da repoyu aç → sağdaki **Releases** → en üstteki sürüm.
2. `tikita-<sürüm>.apk` dosyasına dokun, insin.
3. İndirilenler'den dosyaya dokun → Android "bilinmeyen kaynaktan kuruluma izin
   ver" diye sorarsa Chrome/Dosyalar uygulamasına izin ver → **Kur**.

Güncelleme çıkarsa yeni APK'yı aynı şekilde kur; eskisinin üstüne yazar
(**aynı imzayla** derlendiği sürece — bkz. bölüm 3).

### iPhone
iPhone'da APK yoktur. Safari'de siteyi aç → **Paylaş → Ana Ekrana Ekle**.
Tam ekran açılır, ikon aynıdır.

---

## 2) İlk kurulum — GitHub secret'ları (BİR KEZ)

Repo **herkese açık** olduğu için imzalama anahtarı repoda tutulamaz; GitHub
secret'ında durur. Ayarlanacak yer:
**Settings → Secrets and variables → Actions → New repository secret**

| Secret adı | İçeriği |
|---|---|
| `ANDROID_KEYSTORE_B64` | Anahtar deposunun base64'ü (tek satır) |
| `ANDROID_KEYSTORE_PASSWORD` | O anahtarın şifresi |

İkisi de tanımlıysa iş akışı imzalı APK üretir. Tanımlı değilse iş **hata
vermez, atlanır** (uyarı + özet notu bırakır): eksik secret bir yapılandırma
durumudur, bozuk derleme değil — main'e her dokunuşta kırmızı ✗ basmak insanı
kırmızıyı yok saymaya alıştırır. İmzasız APK hiç üretilmez; telefona
kurulamayacağı için sessizce bozuk dosya bırakmak yanlış olurdu.

### APK'yı derlemek
**Actions → "APK derle ve yayınla" → Run workflow.**
Sürüm alanı boş bırakılırsa `1.0.<çalışma numarası>` kullanılır.
Bitince APK hem **Releases**'a hem çalışmanın **Artifacts** bölümüne düşer.

---

## 3) Anahtar hakkında bilinmesi gerekenler

- **Anahtar DEĞİŞTİRİLEMEZ.** Android bir uygulamayı imzasıyla tanır; başka bir
  anahtarla derlenmiş APK "farklı uygulama" sayılır ve güncelleme olarak
  kurulmaz (önce eskisini silmek gerekir, veriler telefonda değil Firestore'da
  olduğu için veri kaybı olmaz ama zahmetlidir).
- Anahtarın yedeği **repoda değil**, kendi güvenli yerinde durmalı.
- Anahtarın SHA-256 parmak izi `public/.well-known/assetlinks.json` içinde
  yazılıdır — **tam ekran** bunun eşleşmesine bağlıdır. Anahtar değişirse bu
  dosyadaki parmak izi de değişmeli.

### Parmak izini yeniden öğrenmek
```bash
keytool -list -v -keystore tikita-release.jks -alias tikita | grep SHA256
```

### Anahtarı base64'e çevirmek (secret'a yapıştırmak için)
```bash
base64 -w0 tikita-release.jks
```

---

## 4) Tam ekran (adres çubuğu) çalışmıyorsa

Üstte Chrome adres şeridi kalıyorsa uygulama yine çalışır, ama doğrulama
tutmuyor demektir. Sırayla kontrol et:

1. `https://tikita-2026.web.app/.well-known/assetlinks.json` tarayıcıda **JSON**
   dönüyor mu? (HTML dönüyorsa dosya deploy edilmemiştir — `firebase.json`
   içindeki `ignore` listesinde `**/.*` OLMAMALI, o kalıp `.well-known`
   klasörünü de eler.)
2. Oradaki `sha256_cert_fingerprints` değeri, kurulu APK'nın imzasıyla aynı mı?
   İş akışındaki **"İmzayı doğrula"** adımı APK'nın gerçek parmak izini yazdırır.
3. `package_name` `com.tikita.app` mi?
4. Doğrulama telefonda önbelleklenir: uygulamayı silip yeniden kur.

---

## 5) Dosyalar

| Yol | Ne işe yarar |
|---|---|
| `android/` | TWA Android projesi (Gradle) |
| `android/app/src/main/res/values/strings.xml` | Açılış adresi, uygulama adı, asset_statements |
| `android/app/src/main/res/values/colors.xml` | Durum çubuğu ve açılış ekranı renkleri |
| `.github/workflows/apk.yml` | Derleme + Releases'a yükleme |
| `public/.well-known/assetlinks.json` | Tam ekran doğrulaması (SHA-256) |
| `public/manifest.webmanifest` | PWA bildirimi (ad, ikon, renk) |
| `public/sw.js` | Asgari service worker — **önbellek YOK** (bilerek) |
| `public/icons/`, `public/apple-touch-icon.png` | PWA ikonları |
| `scratchpad/ikonuret.py` | Tüm ikonları `public/tikita-logo.png`'den üretir |

Logo değişirse: `python3 scratchpad/ikonuret.py` → commit → APK'yı yeniden derle.

Derlemeden önce `build.gradle` denetimi (Groovy tuzakları için):
```bash
CP=$(ls /opt/gradle/lib/groovy-*.jar | tr "\n" ":")
java -cp "$CP" groovy.ui.GroovyMain scratchpad/gradlecalis.groovy
```
