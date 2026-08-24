/* MUHASEBE sekmesi testi — admin.html'deki GERÇEK MuhasebeTab + HareketDefteri
   gövdeleri sahte React ile render edilir; dört alt ekran (HAREKET · BAKİYE ·
   RAPOR · GENEL) ve ikon araç çubuğu doğrulanır.
   Koştur: node scratchpad/muhasebetest.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const admin = fs.readFileSync(path.join(__dirname, "../public/admin.html"), "utf8");
const modelSrc = fs.readFileSync(path.join(__dirname, "../public/lib/hareket-model.js"), "utf8")
  .replace(/^export\s+/gm, "");
function kes(bas, son) {
  const i = admin.indexOf(bas); if (i < 0) throw new Error("bulunamadı: " + bas);
  const j = admin.indexOf(son, i); if (j < 0) throw new Error("son bulunamadı: " + son);
  return admin.slice(i, j);
}
const ikonlar = kes("const MH_ICO={", "/* ── DEFTER (HAREKETLER)");
const sabitler = kes("const HD_COLS=[", "function HareketDefteri");
const defter = kes("function HareketDefteri(", "/* ═══════════ 💼 MUHASEBE");
const ekstre = kes("function ekstrePngCiz(", "function MuhasebeTab(");
const muhasebe = kes("function MuhasebeTab(", "\nfunction RaporA(");

let stateSira = [], stateIdx = 0;
const React = {
  createElement: (tip, props, ...cocuk) => ({ tip, props: props || {}, cocuk: cocuk.flat(Infinity).filter(x => x != null && x !== false) }),
  Fragment: "FRAGMENT"
};
const useState = init => { const i = stateIdx++;
  if (!(i in stateSira)) stateSira[i] = (typeof init === "function") ? init() : init;
  return [stateSira[i], v => { stateSira[i] = (typeof v === "function") ? v(stateSira[i]) : v; }]; };
const useMemo = fn => fn();
const useRef = v => ({ current: v });
const useEffect = () => {};
const stub = { getItem: () => null, setItem: () => {} };
let __yazim = [];
let __acilan = []; // window.open çağrıları
const ctx = vm.createContext({ console, React, useState, useMemo, useRef, useEffect,
  save: async (c, o) => { __yazim.push(["save", c, o]); return "id1"; },
  remove: async (c, i) => { __yazim.push(["remove", c, i]); },
  BEN_ID: "u1", confirm: () => true, localStorage: stub, sessionStorage: stub,
  Blob: class {}, File: class { constructor(parts, ad, opt) { this.name = ad; this.type = (opt || {}).type; } },
  URL: { createObjectURL: () => "blob:x", revokeObjectURL: () => {} },
  navigator: { canShare: undefined, share: undefined },
  window: { open: (u) => { __acilan.push(u); } },
  document: {
    createElement: (tag) => {
      if (tag === "canvas") return { width: 0, height: 0,
        getContext: () => ({ scale(){}, fillRect(){}, fillText(){}, measureText: s => ({ width: String(s||"").length*6 }),
          font: "", fillStyle: "", textAlign: "left", textBaseline: "alphabetic" }),
        toBlob: cb => cb({ size: 123, type: "image/png" }) };
      return { click(){}, remove(){}, style:{}, href:"", download:"" };
    },
    body: { appendChild(){} }
  },
  setTimeout, Date, Math, JSON, String, Number, Object, Array, isFinite, parseFloat, parseInt });
vm.runInContext(modelSrc, ctx);
vm.runInContext(`
  const h=React.createElement;
  const hrTl=n=>Math.round(num(n)).toLocaleString("tr-TR")+" ₺";
  const hrR2=n=>Math.round(num(n)*100)/100;
  const ymdYerel=()=> "2026-08-24";
  const hmOlayUret=olayUret, hmBorcAlacak=borcAlacak, hmSatirAciklama=satirAciklama;
  const hmBakiyeler=kaleBakiyeleri, hmEkstre=kaleEkstre, hmDonemRapor=donemRapor, hmGenel=genelOzet;
  const hdFd=t=>{const d=new Date(t);if(isNaN(+d))return "—";const p=n=>String(n).padStart(2,"0");
    return p(d.getDate())+"."+p(d.getMonth()+1)+"."+d.getFullYear();};
  const hdFmk=n=>{const v=num(n);return v?v.toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2}):"";};
  let __csv=null; function hdCsvIndir(sut,sat,ad){ __csv={sut,sat,ad}; }
  ${ikonlar}
  ${sabitler.replace(/const hdFd=[\s\S]*?};\n/, "").replace(/const hdFmk=[\s\S]*?};\n/, "").replace(/function hdCsvIndir[\s\S]*?\n}\n/, "")}
  ${defter}
  ${ekstre}
  ${muhasebe}
  __out={MuhasebeTab,HareketDefteri,EkstreGorselBtn,ekstrePngCiz,ekstrePaylas,olayUret,kaleEkstre,csv:()=>__csv,genelOzet};
`, ctx);
const M = ctx.__out;

/* Sahte React bileşenleri kendiliğinden çağırmaz — iç bileşenleri (HareketDefteri)
   elle çalıştırıp ağacı düzleştir. Her iç bileşen KENDİ stateSira'sını kullanır
   (WeakMap ile tip fonksiyonuna göre izole) — yoksa HareketDefteri'nin state'i
   MuhasebeTab'ınkiyle aynı diziyi paylaşıp birbirini ezer. */
const __compState = new WeakMap();
function derin(n, derinlik) {
  if (!n || typeof n !== "object" || (derinlik || 0) > 6) return n;
  if (Array.isArray(n)) return n.map(x => derin(x, (derinlik || 0) + 1));
  if (typeof n.tip === "function") {
    const eskiSira = stateSira, eskiIdx = stateIdx;
    if (!__compState.has(n.tip)) __compState.set(n.tip, []);
    stateSira = __compState.get(n.tip); stateIdx = 0;
    let ic; try { ic = n.tip(n.props); } catch (e) { ic = { tip: "HATA", props: {}, cocuk: [String(e.message)] }; }
    stateSira = eskiSira; stateIdx = eskiIdx;
    return derin(ic, (derinlik || 0) + 1);
  }
  return { ...n, cocuk: (n.cocuk || []).map(c => derin(c, (derinlik || 0) + 1)) };
}
function tum(n, ad, b) { b = b || [];
  if (!n || typeof n !== "object") return b;
  if (Array.isArray(n)) { n.forEach(x => tum(x, ad, b)); return b; }
  if (n.tip === ad) b.push(n);
  (n.cocuk || []).forEach(c => tum(c, ad, b));
  return b; }
function metin(n, o) { o = o || [];
  if (n == null) return o;
  if (typeof n === "string" || typeof n === "number") { o.push(String(n)); return o; }
  if (Array.isArray(n)) { n.forEach(x => metin(x, o)); return o; }
  (n.cocuk || []).forEach(c => metin(c, o));
  return o; }
const yaz = n => metin(n).join(" ");

const YENI = "2026-08-15T12:00:00", ONCE = "2026-07-10T10:00:00";
const P = { hareketler: [
  { id:"s1", tip:"satis", tarih:YENI, adet:2, satisFiyat:100, alisFiyat:70, maliyetBirim:40, yer:"DOSTLAR", urunAd:"Kolye", kullaniciAd:"Ece" },
  { id:"s2", tip:"satis", tarih:YENI, adet:1, satisFiyat:500, alisFiyat:350, maliyetBirim:200, yer:"AKYAP", urunAd:"Set", kullaniciAd:"Can" },
  { id:"t1", tip:"tahsilat", tarih:YENI, tutar:120, yer:"DOSTLAR", kullaniciAd:"Ece" },
  { id:"g1", tip:"satis", tarih:ONCE, adet:1, satisFiyat:80, alisFiyat:60, gerilla:true, yer:"sokak", kullaniciAd:"Can" },
  { id:"b1", tip:"tabla", tarih:YENI, tutar:25, kullaniciAd:"Ece" }
], giderler: [
  { id:"gd1", tur:"Kargo", tutar:45, tarih:YENI },
  { id:"gd4", tur:"Pazarlamacı hakedişi", tutar:300, tarih:YENI, kullaniciAd:"Ece" }
], sabitGiderler: [], montajGorevler: [], hakedisDonemler: [] };
/* DOSTLAR adına RASTGELE denk gelen bir masraf (kaleEkstre'nin cariDisi ayrımı için) —
   ayrı P2 nesnesi: paylaşımlı P'ye eklenirse RAPOR/GENEL'in sabit rakam sınamaları bozulur. */
const P2 = { ...P, giderler: [...P.giderler, { id:"gd9", tur:"DOSTLAR", tutar:25, tarih:YENI }] };

(async () => {
let ok = 0, fail = 0;
const t = (ad, k) => { if (k) ok++; else { fail++; console.log("  ✗ " + ad); } };
const render = (altSekme, kur) => renderD(P, altSekme, kur);
const renderD = (data, altSekme, kur) => { stateSira = []; stateIdx = 0;
  M.MuhasebeTab(data);                    // state'leri kur
  stateSira[0] = altSekme;                // [0] = alt
  if (kur) kur(stateSira);
  stateIdx = 0; return M.MuhasebeTab(data); };

/* ── sekme şeridi ── */
const A = derin(render("hareket"));
const seritYazi = yaz(A);
t("dört alt sekme var: HAREKET · BAKİYE · RAPOR · GENEL",
  ["HAREKET","BAKİYE","RAPOR","GENEL"].every(x => seritYazi.indexOf(x) >= 0));
t("varsayılan sekme HAREKET (tablo çiziliyor)", tum(A, "table").length === 1);

/* ── HAREKET: ikon araç çubuğu (metin düğme YOK) ── */
const btnYazi = tum(A, "button").map(b => yaz(b)).join("|");
t("araç çubuğu ikonlarla — '+ Ekle' / '⚙ Sütun' / '⤓ CSV' metinleri KALKTI",
  btnYazi.indexOf("+ Ekle") < 0 && btnYazi.indexOf("⚙ Sütun") < 0 && btnYazi.indexOf("⤓ CSV") < 0);
t("ikon düğmeler SVG içeriyor", tum(A, "svg").length >= 3);
t("ikon düğmelerin başlıkları var (ekle/sütun/excel)", (() => {
  const bas = tum(A, "button").map(b => b.props.title || "").join("|");
  return bas.indexOf("Manuel hareket ekle") >= 0 && bas.indexOf("Sütunlar") >= 0 && bas.indexOf("Excel") >= 0; })());

/* ── BAKİYE ── */
const B = render("bakiye");
const bYazi = yaz(B);
t("BAKİYE: müşteri listesi (bina BAKİYE ekranı gibi)",
  bYazi.indexOf("DOSTLAR") >= 0 && bYazi.indexOf("AKYAP") >= 0);
t("BAKİYE: DOSTLAR 200−120 = 80", bYazi.indexOf("80") >= 0);
t("BAKİYE: arama kutusunda 'Ara'", tum(B, "input").some(x => x.props.placeholder === "Ara"));
t("BAKİYE: toplam satırı", bYazi.indexOf("Toplam") >= 0 && bYazi.indexOf("müşteri") >= 0);
// müşteri seçilince ekstre
const B2 = render("bakiye", s => { s[1] = "DOSTLAR"; });
const b2 = yaz(B2);
t("BAKİYE → ekstre: yürüyen bakiyeli tablo", tum(B2, "table").length === 1 &&
  ["TARİH","AÇIKLAMA","BORÇ","ALACAK","BAKİYE"].every(x => b2.indexOf(x) >= 0));
t("BAKİYE → ekstre: geri dönüş düğmesi", b2.indexOf("‹ Müşteriler") >= 0);

/* ── BAKİYE → ekstre: Görsel/WhatsApp düğmesi (bina EKSTRE'deki "görüntülü indir paylaş"
   sistemiyle aynı) — EkstreGorselBtn nested bir bileşen olduğu için derin() şart. ── */
const B2D = derin(B2);
const b2d = yaz(B2D);
t("BAKİYE → ekstre: 'Görsel' düğmesi var", b2d.indexOf("Görsel") >= 0);
t("BAKİYE → ekstre: ayrı WhatsApp düğmesi var (title)",
  tum(B2D, "button").some(b => (b.props.title || "").indexOf("WhatsApp") >= 0));
t("BAKİYE → ekstre: menü KAPALI başlıyor (Görüntüle/İndir yok)",
  b2d.indexOf("Görüntüle") < 0 && b2d.indexOf("İndir") < 0);
// EkstreGorselBtn kendi 'ac' state'ini __compState'te tutar — açık başlatıp menüyü sına
__compState.set(M.EkstreGorselBtn, [true]);
const b2dAcik = yaz(derin(render("bakiye", s => { s[1] = "DOSTLAR"; })));
t("Görsel menüsü açılınca üç seçenek çıkar: Görüntüle/İndir/Paylaş",
  ["Görüntüle", "İndir", "Paylaş"].every(x => b2dAcik.indexOf(x) >= 0));
__compState.delete(M.EkstreGorselBtn);   // sonraki testleri etkilemesin

/* ── cariDisi: kaleye rastgele denk gelen MASRAF satırı listede SOLUK görünür,
   yürüyen bakiyeyi DEĞİŞTİRMEZ (kullanıcı: "bütün hareketleri görebilmeliyim") ── */
const rowsP2 = M.olayUret(P2, { simdi: Date.parse("2026-08-23T12:00:00") }).rows;
const E_P2 = M.kaleEkstre(rowsP2, "DOSTLAR");
const masrafSatirModel = E_P2.rows.find(r => r.tur === "MASRAF" && r.tarafAd === "DOSTLAR");
const masrafBakiyeYazi = masrafSatirModel.bakiye.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const BC = derin(renderD(P2, "bakiye", s => { s[1] = "DOSTLAR"; }));
const dostlarSatir = tum(BC, "tr").find(r => yaz(r).indexOf("DOSTLAR") >= 0 && yaz(r).indexOf("25,00") >= 0);
t("cariDisi satır (DOSTLAR adına rastgele masraf) tabloda GÖRÜNÜYOR", !!dostlarSatir);
t("cariDisi satır SOLUK render edilir (opacity .5)",
  !!(dostlarSatir && dostlarSatir.props.style && dostlarSatir.props.style.opacity === .5));
t("cariDisi satır kendi civarındaki YÜRÜYEN BAKİYEYİ taşır ama İLERLETMEZ (model ile UI birebir)",
  !!(dostlarSatir && yaz(dostlarSatir).indexOf(masrafBakiyeYazi) >= 0));
t("normal (cariDisi olmayan) satır soluk DEĞİL",
  tum(BC, "tr").filter(r => yaz(r).indexOf("DOSTLAR") < 0 && yaz(r).indexOf("Tahsilat") >= 0)
    .every(r => !r.props.style || r.props.style.opacity !== .5));

/* ── ekstrePngCiz / ekstrePaylas — canvas + DOM mocklu, gerçek fonksiyon gövdesi ── */
const E_D = M.kaleEkstre(M.olayUret(P, { simdi: Date.parse("2026-08-23T12:00:00") }).rows, "DOSTLAR");
const cv = M.ekstrePngCiz("DOSTLAR", E_D);
t("ekstrePngCiz: canvas boyutları pozitif (satır sayısına göre yüksekliği ayarlanmış)",
  cv.width > 0 && cv.height > 0);
let __sayMesaj = null; const say1 = m => { __sayMesaj = m; };
await M.ekstrePaylas("DOSTLAR", E_D, "save", say1);
t("ekstrePaylas save: indirme mesajı verir", !!(__sayMesaj && __sayMesaj.indexOf("indirildi") >= 0));
__acilan.length = 0;
await M.ekstrePaylas("DOSTLAR", E_D, "view", () => {});
t("ekstrePaylas view: yeni sekmede açar (window.open çağrıldı)", __acilan.length === 1);

/* ── RAPOR ── */
const R = render("rapor");
const rYazi = yaz(R);
t("RAPOR: dönem seçici (2026 AĞUSTOS)", rYazi.indexOf("2026 AĞUSTOS") >= 0);
t("RAPOR: Müşteri / Giren / Çıkan başlıkları",
  ["Müşteri","Giren","Çıkan"].every(x => rYazi.indexOf(x) >= 0));
t("RAPOR: TOPLAM ve KALAN satırları", rYazi.indexOf("TOPLAM") >= 0 && rYazi.indexOf("KALAN") >= 0);
t("RAPOR: giren = tahsilat (120), çıkan = masraf+ödeme (345)",
  rYazi.indexOf("120,00") >= 0 && rYazi.indexOf("345,00") >= 0);
t("RAPOR: satış (tahakkuk) nakit raporuna girmiyor", rYazi.indexOf("700,00") < 0);
t("RAPOR: Excel ikonu var", tum(R, "button").some(b => (b.props.title || "").indexOf("Excel") >= 0));
t("RAPOR: 'Satış (tahakkuk)' bilgi satırı — 'giren çıkan az' kafası karışmasın diye",
  rYazi.indexOf("Satış (tahakkuk)") >= 0 && rYazi.indexOf("700 ₺") >= 0);

/* ── GENEL ── */
const G = render("genel");
const gYazi = yaz(G);
t("GENEL: bina GENEL ekranının satırları",
  ["Toplam Satış (gelir)","Gerçek Masraf (gider)","KALAN","Ödemeler (dağıtılan)","KASADA KALMASI GEREKEN"]
    .every(x => gYazi.indexOf(x) >= 0));
t("GENEL: NEREDE? bölümü (alacak · saha · merkez)",
  gYazi.indexOf("NEREDE?") >= 0 && gYazi.indexOf("Müşteri Alacağı") >= 0 &&
  gYazi.indexOf("Sahada") >= 0 && gYazi.indexOf("Merkez kasa") >= 0);
t("GENEL: DENK ✓ rozeti (fark 0)", gYazi.indexOf("DENK ✓") >= 0 && gYazi.indexOf("FARK VAR") < 0);
t("GENEL: tahakkuk ayrı bölümde (tabla 25 — henüz ödenmedi)",
  gYazi.indexOf("HENÜZ PARA ÇIKIŞI OLMAYAN") >= 0 && gYazi.indexOf("Personele borç") >= 0);
t("GENEL rakamları modelle birebir", (() => {
  const rows = M.olayUret(P, { simdi: Date.parse("2026-08-23T12:00:00") }).rows;
  const g = M.genelOzet(rows);
  return Math.abs(g.fark) < 0.01 && gYazi.indexOf(Math.round(g.satis).toLocaleString("tr-TR")) >= 0; })());

console.log((fail ? "✗ " : "✓ ") + ok + "/" + (ok + fail) + " sınama geçti" + (fail ? " — " + fail + " HATA" : ""));
process.exit(fail ? 1 : 0);
})();
