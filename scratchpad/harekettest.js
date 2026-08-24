/* F2 testi — lib/hareket-model.js: GERÇEK modül gövdesi sentetik korpusla koşulur.
   Koştur: node scratchpad/harekettest.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const body = fs.readFileSync(path.join(__dirname, "../public/lib/hareket-model.js"), "utf8")
  .replace(/^export\s+/gm, "");
const ctx = vm.createContext({ console });
vm.runInContext(body + "\n;__out={HAKEDIS_BAS,HAKEDIS_BAS_MS,haftaKod,ayKod,etki,kasaYeri,olayUret,donemPivot,kaleEkstre,kaleBakiyeleri,personelCari,nakitOzet,mutabakat,kaleAnahtar,urunKarlilik,borcAlacak,satirAciklama};", ctx);
const M = ctx.__out;

let ok = 0, fail = 0;
const t = (ad, kosul) => { if (kosul) ok++; else { fail++; console.log("  ✗ " + ad); } };

/* ── KENAR KORPUS ── */
const ESKI = "2026-08-01T12:00:00";   // HAKEDIS_BAS öncesi
const YENI = "2026-08-15T12:00:00";   // sonrası
const D = {
  hareketler: [
    // normal vadeli satış (kale borçlanır)
    { id: "s1", tip: "satis", tarih: YENI, adet: 2, satisFiyat: 100, alisFiyat: 70, maliyetBirim: 40, yer: "Kale A", kullaniciId: "u1", kullaniciAd: "Ece" },
    // konsinyeden satış
    { id: "s2", tip: "satis", tarih: YENI, adet: 1, satisFiyat: 50, alisFiyat: 35, maliyetBirim: 20, yer: "Kale A", kaynak: "konsinye", kullaniciAd: "Ece" },
    // gerilla — tahsil==null → TAMAMI peşin (sentetik tahsilat)
    { id: "g1", tip: "satis", tarih: YENI, adet: 1, satisFiyat: 80, alisFiyat: 60, maliyetBirim: 30, gerilla: true, yer: "sokak", kullaniciAd: "Ece" },
    // gerilla — kısmi tahsil
    { id: "g2", tip: "satis", tarih: ESKI, adet: 2, satisFiyat: 100, alisFiyat: 70, kaynak: "gerilla", tahsil: 150, yer: "pazar", kullaniciAd: "Can" },
    // tahsilatlar
    { id: "t1", tip: "tahsilat", tarih: YENI, tutar: 120, yer: "Kale A", kullaniciAd: "Ece" },
    { id: "t2", tip: "tahsilat", tarih: YENI, tutar: 40, yer: "Kale A", avans: true, kullaniciAd: "Ece" },
    // nakit teslim: onaylı + onaysız
    { id: "n1", tip: "nakitTeslim", tarih: YENI, tutar: 90, kullaniciId: "u1", kullaniciAd: "Ece" },
    { id: "n2", tip: "nakitTeslim", tarih: YENI, tutar: 55, onay: false, kullaniciAd: "Ece" },
    // tabla tahakkuku + ödemesi
    { id: "b1", tip: "tabla", tarih: YENI, tutar: 25, kullaniciId: "u1", kullaniciAd: "Ece" },
    { id: "b2", tip: "tablaOde", tarih: YENI, tutar: 10, kullaniciId: "u1", kullaniciAd: "Ece" },
    // hediye (numune) + maliyetsiz hediye (uyarı)
    { id: "h1", tip: "hediye", tarih: YENI, adet: 2, maliyetBirim: 15, urunAd: "Kolye", yer: "Kale B" },
    { id: "h2", tip: "hediye", tarih: YENI, adet: 1, urunAd: "Bileklik", yer: "Kale B" },
    // stant: satış modu + hediye modu
    { id: "st1", tip: "stant", tarih: YENI, fiyat: 200, mod: "satis", yer: "AVM" },
    { id: "st2", tip: "stant", tarih: YENI, fiyat: 30, mod: "hediye", yer: "AVM" },
    // MALİ DEĞİL: diplomasi/al/konsinye/iade — satır üretmemeli
    { id: "d1", tip: "diplomasi", tarih: YENI, yer: "Kale A" },
    { id: "a1", tip: "al", tarih: YENI, adet: 5, urunAd: "Kolye" },
    { id: "k1", tip: "konsinye", tarih: YENI, adet: 5, kalan: 3, yer: "Kale A" },
    { id: "i1", tip: "iade", tarih: YENI, adet: 1, kaynak: "konsinye" },
    // sıfır adetli satış — üretilmez
    { id: "s0", tip: "satis", tarih: YENI, adet: 0, satisFiyat: 100 }
  ],
  giderler: [
    { id: "gd1", tur: "Kargo", tutar: 45, tarih: YENI },
    { id: "gd2", tur: "Filament alımı", tutar: 600, tarih: YENI, stok: true, miktar: 1 },
    { id: "gd3", tur: "Vergi", tutar: 100, tarih: YENI },
    { id: "gd4", tur: "Pazarlamacı hakedişi", tutar: 300, tarih: YENI, kullaniciId: "u1", kullaniciAd: "Ece", hakedisId: "u1_2026-08-08" },
    { id: "gd5", tur: "Montaj işçiliği", tutar: 120, tarih: YENI, kullaniciAd: "Veli" },
    { id: "gd6", tur: "Elektrik", tutar: 0, tarih: YENI }   // sıfır — üretilmez
  ],
  sabitGiderler: [
    { id: "sb1", tur: "Kira", tutar: 1000, baslangic: "2026-07", bitis: "" },
    { id: "sb2", tur: "Abonelik", tutar: 50, baslangic: "2026-01", bitis: "2026-02" }
  ],
  montajGorevler: [
    { id: "mg1", teslimAdet: 8, birimUcret: 5, teslimTarih: YENI, kullaniciAd: "Veli", urunAd: "Kolye" },
    { id: "mg2", teslimAdet: 4, birimUcret: 5, teslimTarih: YENI, kullaniciAd: "Veli", devirId: "mg1" },  // devir — hakediş yine gerçek
    { id: "mg3", teslimAdet: 0, birimUcret: 5, teslimTarih: YENI }   // teslim yok — üretilmez
  ],
  hakedisDonemler: [
    { id: "u1_2026-08-08", kullaniciAd: "Ece", hafta: "2026-08-08", odenenTutar: 300, giderId: "gd4" },
    { id: "u2_2026-08-08", kullaniciAd: "Can", hafta: "2026-08-08", odenenTutar: 200 }   // gider bağı YOK → uyarı
  ]
};
const SIMDI = new Date("2026-08-23T12:00:00").getTime();
const R = M.olayUret(D, { simdi: SIMDI });
const rows = R.rows;
const bul = ref => rows.find(s => s.ref === ref);
const S = f => Math.round(rows.filter(f).reduce((z, s) => z + s.tutar, 0) * 100) / 100;

/* ── üretim doğruluğu ── */
t("ref benzersiz", new Set(rows.map(s => s.ref)).size === rows.length);
t("vadeli satış: tutar=adet×satis, peşin değil", bul("har:s1").tutar === 200 && !bul("har:s1").pesin && bul("har:s1").tur === "SATIS");
t("konsinye satışı altTur", bul("har:s2").altTur === "konsinye");
t("gerilla tahsil==null → sentetik TAM tahsilat", bul("har:g1").pesin && bul("har:g1:t").tutar === 80 && bul("har:g1:t").sentetik);
t("gerilla kısmi tahsil → sentetik 150", bul("har:g2:t").tutar === 150);
t("stant satış = SATIS+peşin + sentetik tahsilat", bul("har:st1").tur === "SATIS" && bul("har:st1").pesin && bul("har:st1:t").tutar === 200);
t("stant hediye = MASRAF numune", bul("har:st2").tur === "MASRAF" && bul("har:st2").altTur === "numune");
t("onaysız nakitTeslim ÜRETİLMEZ", !bul("har:n2") && bul("har:n1").altTur === "icTransfer");
t("tabla MASRAF-tahakkuk / tablaOde ÖDEME", bul("har:b1").tur === "MASRAF" && bul("har:b2").tur === "ODEME");
t("hediye maliyetten MASRAF", bul("har:h1").tutar === 30);
t("maliyetsiz hediye uyarısı", R.uyari.some(u => u.indexOf("Bileklik") >= 0));
t("diplomasi/al/konsinye/iade satır ÜRETMEZ",
  !bul("har:d1") && !bul("har:a1") && !bul("har:k1") && !bul("har:i1"));
t("sıfır adet/tutar üretilmez", !bul("har:s0") && !bul("gid:gd6") && !rows.some(s => s.ref.indexOf("mg3") >= 0));

/* ── gider/sabit/montaj ── */
t("gider MASRAF/ÖDEME ayrımı", bul("gid:gd1").tur === "MASRAF" && bul("gid:gd4").tur === "ODEME" &&
  bul("gid:gd4").altTur === "hakedis" && bul("gid:gd5").altTur === "montajIscilik");
t("stok alımı altTur", bul("gid:gd2").altTur === "stokAlim" && bul("gid:gd3").altTur === "vergi");
t("sabit gider: Tem+Ağu-yalnız-biten aylar (Tem 2026)", !!bul("sab:sb1:2026-07") && !bul("sab:sb1:2026-08"));
t("sabit gider bitis'e uyar", !!bul("sab:sb2:2026-01") && !!bul("sab:sb2:2026-02") && !bul("sab:sb2:2026-03"));
t("montaj tahakkuku teslim×ücret, devirde de", bul("mg:mg1:h").tutar === 40 && bul("mg:mg2:h").tutar === 20);
t("hakediş-gider köprü uyarısı (Can)", R.uyari.some(u => u.indexOf("Can") >= 0) && !R.uyari.some(u => u.indexOf("Ece") >= 0));

/* ── DEĞİŞMEZLER (invariant): eski toplam == yeni toplam ── */
const eskiCiro = 200 + 50 + 80 + 200 + 200;      // s1+s2+g1+g2+st1 (uç bedel)
t("Σ SATIS == Σ eski satış cirosu", S(s => s.tur === "SATIS") === eskiCiro);
t("Σ TAHSILAT(kayıtlı) == t1+t2", S(s => s.tur === "TAHSILAT" && !s.sentetik && s.altTur !== "icTransfer") === 160);
t("Σ sentetik == gerilla+stant peşini", R.sayim.sentetikTutar === 80 + 150 + 200 && R.sayim.sentetikN === 3);
t("Σ MASRAF == gider+sabit+tabla+montaj+numune",
  // sb1 yalnız 2026-07 tahakkuk eder (Ağustos henüz bitmedi — simdi 23 Ağu)
  S(s => s.tur === "MASRAF") === 45 + 600 + 100 + 1000 + 2 * 50 + 25 + 40 + 20 + 30 + 0 + 30);
t("Σ ODEME == gd4+gd5+tablaOde", S(s => s.tur === "ODEME") === 300 + 120 + 10);

/* ── determinizm + idempotens ── */
const R2 = M.olayUret(D, { simdi: SIMDI });
t("aynı D → birebir aynı çıktı", JSON.stringify(R2.rows) === JSON.stringify(rows));
const DD = { ...D, hareketler: D.hareketler.concat(D.hareketler.slice(0, 3)) };  // mükerrer kaynak satırı
const R3 = M.olayUret(DD, { simdi: SIMDI });
t("mükerrer kaynak → ref bekçisi atlar + uyarı", R3.rows.length === rows.length && R3.uyari.some(u => u.indexOf("mükerrer") >= 0));

/* ── ETKİ tablosu + kasa yeri (HAKEDIS_BAS iki yakası) ── */
t("vadeli satış kasaya dokunmaz, kaleyi borçlandırır", (() => { const e = M.etki(bul("har:s1")); return e.kasa === 0 && e.musteriCari === 1 && e.pivot; })());
t("tahsilat pivota GİRMEZ", !M.etki(bul("har:t1")).pivot && !M.etki(bul("har:b2")).pivot);
t("kesim SONRASI tahsilat SAHA kasasına", M.kasaYeri(bul("har:t1")) === "saha");
t("kesim ÖNCESİ gerilla MERKEZE", M.kasaYeri(bul("har:g2:t")) === "merkez");
t("avans cariye mahsup edilmez", M.etki(bul("har:t2")).musteriCari === 0);

/* ── nakit özeti: peşin para TEK KEZ (sentetik tahsilattan), içTransfer toplamı değiştirmez ── */
const N = M.nakitOzet(rows);
t("peşin SATIŞ kasaya dokunmaz (nakit sentetik tahsilattan)", M.etki(bul("har:g1")).kasa === 0 && M.etki(bul("har:g1:t")).kasa === 1);
t("nakit toplamı: giren−çıkan, çift sayım yok", (() => {
  const giren = 120 + 40 + 80 + 150 + 200;                       // t1+t2(avans) + sentetikler
  const cikan = 45 + 600 + 100 + 1000 + 100 + 300 + 120 + 10;    // kasa−1 MASRAF (tahakkuk hariç) + ÖDEME
  return Math.abs(N.toplam - (giren - cikan)) < 0.01; })());
t("içTransfer yalnız taşır: saha−90 merkez+90", (() => {
  const rowsX = rows.filter(s => s.ref === "har:n1");
  const NX = M.nakitOzet(rowsX);
  return NX.saha === -90 && NX.merkez === 90 && NX.toplam === 0; })());

/* ── DÖNEM PİVOTU — tahakkuk ilkesi ── */
const P = M.donemPivot(rows, "hafta");
const pAgu15 = P.find(d => d.donem === M.haftaKod(new Date("2026-08-15T12:00:00").getTime()));
t("pivot: satış cirosu (uç) — o hafta", pAgu15 && pAgu15.satis === 200 + 50 + 80 + 200);
t("pivot: veriliş bedeli ayrı sütun", pAgu15 && pAgu15.veris === 2 * 70 + 1 * 35 + 1 * 60 + 0);
t("pivot: tahsilat/ödeme pivota HİÇ girmedi", P.every(d => d.tikitaKar === Math.round((d.veris - d.maliyet - d.masraf) * 100) / 100));
t("pivot: kişi ve kale kırılımı", pAgu15 && pAgu15.kisi["Ece"] > 0 && pAgu15.kale["Kale A"] === 250);

/* ── KALE EKSTRESİ — yürüyen bakiye + süzgeç sürekliliği ── */
const E = M.kaleEkstre(rows, "Kale A");
t("ekstre: borç=vadeli satışlar, alacak=normal tahsilat", (() => {
  const borc = E.rows.reduce((z, s) => z + s.borc, 0), alacak = E.rows.reduce((z, s) => z + s.alacak, 0);
  return borc === 250 && alacak === 120; })());
t("ekstre: bakiye = 130, avans ayrı", E.bakiye === 130 && E.avans === 40);
t("ekstre: yürüyen bakiye satırda hazır (süzgeç yeniden HESAPLAMAZ)",
  E.rows[E.rows.length - 1].bakiye === 130 && E.rows.every(s => typeof s.bakiye === "number"));
t("ekstre: aynı gün önce satış sonra tahsilat", (() => {
  const i1 = E.rows.findIndex(s => s.tur === "SATIS"), i2 = E.rows.findIndex(s => s.tur === "TAHSILAT");
  return i1 >= 0 && i2 > i1; })());
t("kale bakiyeleri listesi", (() => { const B = M.kaleBakiyeleri(rows);
  const a = B.find(x => x.kale === "Kale A"); return a && a.bakiye === 130; })());

/* ── PERSONEL CARİSİ — tabla+montaj tahakkuk − ödemeler ── */
const PC = M.personelCari(rows);
const ece = PC.find(x => x.kisi === "Ece"), veli = PC.find(x => x.kisi === "Veli");
t("personel carisi: Ece tabla 25 − (tablaOde 10 + hakediş 300)", ece && ece.tahakkuk === 25 && ece.odenen === 310 && ece.kalan === -285);
t("personel carisi: Veli montaj 60 − ödeme 120", veli && veli.tahakkuk === 60 && veli.odenen === 120 && veli.kalan === -60);

/* ── MUTABAKAT satırları ── */
const MU = M.mutabakat(rows, { ciro: eskiCiro, verisBedel: 375, tahsilat: 160, masraf: 1990, odeme: 430 }, R.sayim);
t("mutabakat: eşleşen kalemlerde fark 0", MU.filter(x => x.ad !== "Sentetik peşin tahsilat").every(x => x.fark === 0));
t("mutabakat: sentetik kalem açıklamalı bilinçli fark", (() => {
  const sx = MU.find(x => x.ad === "Sentetik peşin tahsilat");
  return sx && sx.yeni === 430 && sx.aciklama.length > 0; })());

/* ── ÜRÜN KÂRLILIĞI ── */
const D2 = { hareketler: [
  { id: "x1", tip: "satis", tarih: YENI, adet: 2, satisFiyat: 100, alisFiyat: 70, maliyetBirim: 40, urunAd: "Kolye" },
  { id: "x2", tip: "satis", tarih: YENI, adet: 3, satisFiyat: 100, alisFiyat: 70, maliyetBirim: 40, urunAd: "Kolye" },
  { id: "x3", tip: "satis", tarih: YENI, adet: 1, satisFiyat: 60, alisFiyat: 45, maliyetBirim: 50, urunAd: "Bileklik" },
  { id: "x4", tip: "stant", tarih: YENI, fiyat: 500, mod: "satis" }
] };
const UK = M.urunKarlilik(M.olayUret(D2, { simdi: SIMDI }).rows);
t("ürün kârlılığı: Kolye 5 adet, kâr=veriliş−maliyet", (() => {
  const k = UK.find(x => x.urun === "Kolye");
  return k && k.adet === 5 && k.ciroUc === 500 && k.ciroVeris === 350 && k.maliyet === 200 && k.tikitaKar === 150; })());
t("ürün kârlılığı: zarar eden ürün eksi", (() => { const b = UK.find(x => x.urun === "Bileklik");
  return b && b.tikitaKar === -5; })());
t("ürün kârlılığı: stant ürün DEĞİL, listede yok", !UK.find(x => x.urun === "?" || x.urun === ""));
t("ürün kârlılığı sıralı (kâr çoktan aza)", UK[0].urun === "Kolye");

/* ── DEFTER SÜTUNLARI: borç/alacak (bina kuralı) + satır açıklaması ── */
t("borç/alacak: SATIŞ borç sütununa", (() => { const b = M.borcAlacak(bul("har:s1")); return b.borc === 200 && b.alacak === 0; })());
t("borç/alacak: TAHSİLAT/MASRAF/ÖDEME alacak sütununa", (() => {
  const th = M.borcAlacak(bul("har:t1")), ms = M.borcAlacak(bul("gid:gd1")), od = M.borcAlacak(bul("gid:gd4"));
  return th.alacak === 120 && th.borc === 0 && ms.alacak === 45 && od.alacak === 300; })());
t("borç/alacak: peşin satış da BORÇ sütununda (bina hizmet kuralı)", M.borcAlacak(bul("har:g1")).borc === 80);
t("borç toplamı = Σ satış · alacak toplamı = diğer üçü", (() => {
  let b = 0, a = 0; rows.forEach(r => { const x = M.borcAlacak(r); b += x.borc; a += x.alacak; });
  return Math.round(b * 100) / 100 === eskiCiro &&
         Math.round(a * 100) / 100 === Math.round((S(s => s.tur !== "SATIS")) * 100) / 100; })());
t("satır açıklaması: satışta ürün × adet", M.satirAciklama(bul("har:s1")).indexOf("×") > 0);
t("satır açıklaması: iç transfer okunur", M.satirAciklama(bul("har:n1")).indexOf("Nakit teslim") === 0);
t("satır açıklaması: sabit gider kendi metnini korur", M.satirAciklama(bul("sab:sb1:2026-07")).indexOf("Kira") === 0);
t("satır açıklaması her satırda dolu", rows.every(r => String(M.satirAciklama(r)).length > 0));

console.log((fail ? "✗ " : "✓ ") + ok + "/" + (ok + fail) + " sınama geçti" + (fail ? " — " + fail + " HATA" : ""));
process.exit(fail ? 1 : 0);
