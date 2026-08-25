/* Tikita — ASGARİ service worker.
   Tek amacı uygulamanın "kurulabilir" sayılmasıdır (Android'de Ana Ekrana Ekle,
   iPhone'da PWA). İÇERİK ÖNBELLEKLEMEZ — fetch dinleyicisi bilerek BOŞTUR:
   respondWith çağrılmadığı için her istek tarayıcının normal yoluna gider.

   Bu kural bilerek konmuştur, ÖNBELLEK EKLEME: sayfalar Firebase Hosting'den
   no-cache başlığıyla gelir ve uygulama sık güncellenir; buraya bir önbellek
   konursa telefonlar günlerce eski sürümde kalır (Yeşil Temizlik'te yaşandı). */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function () { /* bilerek boş */ });
