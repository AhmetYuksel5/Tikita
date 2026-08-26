/* DEFTER ekranı testi — admin.html'deki GERÇEK HareketDefteri gövdesi sahte React ile
   render edilir; çıktının gerçekten TABLO olduğu (table/thead/th/tr) doğrulanır.
   Koştur: node scratchpad/deftertest.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const admin = fs.readFileSync(path.join(__dirname, "../public/admin.html"), "utf8");
const modelSrc = fs.readFileSync(path.join(__dirname, "../public/lib/hareket-model.js"), "utf8")
  .replace(/^export\s+/gm, "");

/* admin.html'den gerçek parçaları kes */
function kes(bas, son) {
  const i = admin.indexOf(bas); if (i < 0) throw new Error("bulunamadı: " + bas);
  const j = admin.indexOf(son, i); if (j < 0) throw new Error("son bulunamadı: " + son);
  return admin.slice(i, j);
}
const ikonlar = kes("const MH_ICO={", "/* ── DEFTER (HAREKETLER)");
const sabitler = kes("const HD_COLS=[", "function HareketDefteri");
const defter = kes("function HareketDefteri(", "/* ═══════════ 💼 MUHASEBE");

/* sahte React — hook'lar tek geçiş için yeterli */
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
const localStorageStub = { getItem: () => null, setItem: () => {} };

let __yazim = [];
const ctx = vm.createContext({ console, React, useState, useMemo, useRef, useEffect,
  save: async (c, o) => { __yazim.push(["save", c, o]); return "id1"; },
  remove: async (c, i) => { __yazim.push(["remove", c, i]); },
  BEN_ID: "u1", confirm: () => true, alert: () => {},
  localStorage: localStorageStub, Blob: class {}, URL: { createObjectURL: () => "", revokeObjectURL: () => {} },
  document: { createElement: () => ({ click(){}, remove(){}, style:{} }), body: { appendChild(){} } },
  setTimeout, Date, Math, JSON, String, Number, Object, Array, isFinite, parseFloat, parseInt });
vm.runInContext(modelSrc, ctx);
vm.runInContext(`
  const h=React.createElement;
  const hrTl=n=>Math.round(num(n)).toLocaleString("tr-TR")+" ₺";
  const hrR2=n=>Math.round(num(n)*100)/100;
  const ymdYerel=()=> "2026-08-24";
  const hmBorcAlacak=borcAlacak, hmSatirAciklama=satirAciklama;
  const hdFd=t=>{const d=new Date(t);if(isNaN(+d))return "—";const p=n=>String(n).padStart(2,"0");
    return p(d.getDate())+"."+p(d.getMonth()+1)+"."+d.getFullYear();};
  const hdFmk=n=>{const v=num(n);return v?v.toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2}):"";};
  function hdCsvIndir(){ __csv=(__csv||0)+1; }
  ${ikonlar}
  ${sabitler.replace(/const hdFd=[\s\S]*?};\n/, "").replace(/const hdFmk=[\s\S]*?};\n/, "").replace(/function hdCsvIndir[\s\S]*?\n}\n/, "")}
  ${defter}
  __out={HareketDefteri,olayUret,hdDuzenlenir,hdFormDoldur};
`, ctx);
const M = ctx.__out;
/* useState SIRASI KAYNAKTAN TÜRER — elle "stateSira[3]" yazmak, bileşene yeni bir
   state eklendiğinde bütün testleri sessizce yanlış hücreye bakar hâle getiriyordu.
   S.ay / S.colMenu gibi adlarla kullan; sıra değişirse burası kendiliğinden düzelir. */
const S = {};
(defter.match(/const\s*\[\s*(\w+)\s*,\s*set\w+\s*\]\s*=\s*useState/g) || [])
  .forEach((m, i) => { S[/\[\s*(\w+)/.exec(m)[1]] = i; });

const hdDuzenlenirTest = M.hdDuzenlenir, hdFormDoldurTest = M.hdFormDoldur;

/* ağaç gezici */
function tum(n, ad, bulunan) { bulunan = bulunan || [];
  if (!n || typeof n !== "object") return bulunan;
  if (Array.isArray(n)) { n.forEach(x => tum(x, ad, bulunan)); return bulunan; }
  if (n.tip === ad) bulunan.push(n);
  (n.cocuk || []).forEach(c => tum(c, ad, bulunan));
  return bulunan;
}
const yaz = n => metin(n).join(" ");
function metin(n, out) { out = out || [];
  if (n == null) return out;
  if (typeof n === "string" || typeof n === "number") { out.push(String(n)); return out; }
  if (Array.isArray(n)) { n.forEach(x => metin(x, out)); return out; }
  (n.cocuk || []).forEach(c => metin(c, out));
  return out;
}

const YENI = "2026-08-15T12:00:00";
const D = { hareketler: [
  { id: "s1", tip: "satis", tarih: YENI, adet: 2, satisFiyat: 100, alisFiyat: 70, maliyetBirim: 40, yer: "Kale A", urunAd: "Kolye", kullaniciAd: "Ece" },
  { id: "t1", tip: "tahsilat", tarih: YENI, tutar: 120, yer: "Kale A", kullaniciAd: "Ece" },
  { id: "b1", tip: "tabla", tarih: YENI, tutar: 25, kullaniciAd: "Ece" },
  { id: "g1", tip: "satis", tarih: "2026-07-10T10:00:00", adet: 1, satisFiyat: 80, alisFiyat: 60, gerilla: true, yer: "sokak", urunAd: "Bileklik", kullaniciAd: "Can" }
], giderler: [
  { id: "gd1", tur: "Kargo", tutar: 45, tarih: YENI },
  { id: "gd4", tur: "Pazarlamacı hakedişi", tutar: 300, tarih: YENI, kullaniciAd: "Ece" }
], sabitGiderler: [], montajGorevler: [], hakedisDonemler: [] };
const rows = M.olayUret(D, { simdi: new Date("2026-08-23T12:00:00").getTime() }).rows;

let ok = 0, fail = 0;
const t = (ad, kosul) => { if (kosul) ok++; else { fail++; console.log("  ✗ " + ad); } };

stateSira = []; stateIdx = 0;
const agac = M.HareketDefteri({ rows, say: () => {} });

const tablolar = tum(agac, "table");
const thler = tum(agac, "th");
const trler = tum(agac, "tr");
const tdler = tum(agac, "td");
const basliklar = thler.map(x => metin(x).join(""));

t("çıktı gerçek bir TABLO (<table>)", tablolar.length === 1);
t("başlık satırı var (<thead>/<th>)", tum(agac, "thead").length === 1 && thler.length > 0);
// TÜR başlığı süzgeç kapısı olduğu için sonuna " ▾"/" ●" işareti alır.
t("varsayılan sütunlar: TARİH/DÖNEM/TÜR/TARAF/AÇIKLAMA/ADET/BORÇ/ALACAK",
  ["TARİH","DÖNEM","TÜR","TARAF","AÇIKLAMA","ADET","BORÇ","ALACAK"]
    .every(b => basliklar.some(x => x.replace(/\s*[▾●]$/, "") === b)));
t("KİŞİ/KAYNAK/KAYIT NO varsayılanda KAPALI", !basliklar.includes("KİŞİ") && !basliklar.includes("KAYIT NO"));
t("her hareket kendi satırında (gruplama yok)", trler.length === rows.length + 1); // +1 başlık
t("hücre sayısı = satır × sütun", tdler.length === rows.length * basliklar.length);

const govdeMetin = metin(agac).join(" ");
t("satış satırı ürün × adet gösteriyor", govdeMetin.indexOf("Kolye × 2") >= 0);
t("kale adı satırda", govdeMetin.indexOf("Kale A") >= 0);
t("tarih gg.aa.yyyy biçiminde", /15\.08\.2026/.test(govdeMetin));
t("borç sütununda satış tutarı (200,00)", govdeMetin.indexOf("200,00") >= 0);
t("alacak sütununda tahsilat (120,00)", govdeMetin.indexOf("120,00") >= 0);
t("tür rozetleri basılı", ["SATIŞ","TAHSİL","MASRAF","ÖDEME"].every(x => govdeMetin.indexOf(x) >= 0));
t("toplam şeridi: hareket sayısı + borç + alacak",
  govdeMetin.indexOf(rows.length + " hareket") >= 0 && govdeMetin.indexOf("Borç") >= 0 && govdeMetin.indexOf("Alacak") >= 0);
t("araç çubuğu: ay seçici + ikon düğmeler (tür çipleri KALDIRILDI)",
  govdeMetin.indexOf("Tüm aylar") >= 0 && tum(agac, "svg").length >= 3);
t("arama kutusunda yalnız 'Ara' yazıyor", tum(agac, "input").some(x => x.props.placeholder === "Ara"));
t("dönem sütunu 2026 AĞUSTOS biçiminde", govdeMetin.indexOf("2026 AĞUSTOS") >= 0);
t("manuel ekle ikonu var", tum(agac, "button").some(b => (b.props.title||"").indexOf("Manuel hareket ekle") >= 0));

// tür süzgeci: yalnız SATIŞ
stateSira = []; stateIdx = 0;
const a2 = M.HareketDefteri({ rows, say: () => {} });   // state'i kur
stateSira[S.turF] = { SATIS: true, TAHSILAT: false, MASRAF: false, ODEME: false };                                               
stateIdx = 0;
const agac2 = M.HareketDefteri({ rows, say: () => {} });
const satis = rows.filter(r => r.tur === "SATIS").length;
t("tür süzgeci satırları daraltıyor", tum(agac2, "tr").length === satis + 1);

// ay süzgeci: 2026-07
stateSira = []; stateIdx = 0;
M.HareketDefteri({ rows, say: () => {} });
stateSira[S.ay] = "2026-07";
stateIdx = 0;
const agac3 = M.HareketDefteri({ rows, say: () => {} });
const tem = rows.filter(r => (r.tarih || "").slice(0, 7) === "2026-07").length;
t("ay süzgeci çalışıyor", tum(agac3, "tr").length === tem + 1);

// boş veri
stateSira = []; stateIdx = 0;
const bos = M.HareketDefteri({ rows: [], say: () => {} });
t("boş defterde çökme yok, mesaj var", metin(bos).join(" ").indexOf("Henüz hareket yok") >= 0);

/* ── DÜZENLEME · MANUEL EKLE — kaynak koleksiyona doğru yazım ── */
function ac(fn){ return fn().catch(e=>{ console.log("  ! istisna:",e.message); }); }
(async () => {
  // gider satırı düzenle → gider koleksiyonuna yazmalı
  stateSira = []; stateIdx = 0;
  M.HareketDefteri({ rows, say: () => {} });
  const gd = rows.find(r => r.ref === "gid:gd1");
  stateSira[S.duzen] = { yeni:false, r:gd, f:{ tur:"MASRAF", tarih:"2026-08-15", taraf:"Kargo",
    aciklama:"kargo bedeli", tutar:"55", giderTur:"Kargo" } };
  stateIdx = 0;
  const a = M.HareketDefteri({ rows, say: () => {} });
  const kaydetBtn = tum(a, "button").find(b => String(metin(b).join("")).indexOf("Kaydet") >= 0);
  t("düzenleme penceresi açılıyor (Kaydet düğmesi var)", !!kaydetBtn);
  __yazim = [];
  if (kaydetBtn) await ac(async () => kaydetBtn.props.onClick());
  t("gider satırı düzenlemesi gider koleksiyonuna yazdı", (() => {
    const y = __yazim.find(x => x[0] === "save" && x[1] === "gider");
    return y && y[2].id === "gd1" && y[2].tutar === 55 && y[2].aciklama === "kargo bedeli"; })());

  // satış satırı düzenle → pazarlama_hareket'e adet/fiyat yazmalı
  stateSira = []; stateIdx = 0;
  M.HareketDefteri({ rows, say: () => {} });
  const st = rows.find(r => r.ref === "har:s1");
  stateSira[S.duzen] = { yeni:false, r:st, f:{ tur:"SATIS", tarih:"2026-08-16", taraf:"Kale B",
    adet:"3", satisFiyat:"110", alisFiyat:"75", urunAd:"Kolye XL", aciklama:"" } };
  stateIdx = 0;
  const a2b = M.HareketDefteri({ rows, say: () => {} });
  __yazim = [];
  const kb2 = tum(a2b, "button").find(b => String(metin(b).join("")).indexOf("Kaydet") >= 0);
  if (kb2) await ac(async () => kb2.props.onClick());
  t("satış düzenlemesi pazarlama_hareket'e yazdı", (() => {
    const y = __yazim.find(x => x[0] === "save" && x[1] === "pazarlama_hareket");
    return y && y[2].id === "s1" && y[2].adet === 3 && y[2].satisFiyat === 110 && y[2].alisFiyat === 75 && y[2].urunAd === "Kolye XL"; })());

  // silme → remove(kaynakKol, kaynakId)
  stateSira = []; stateIdx = 0;
  M.HareketDefteri({ rows, say: () => {} });
  stateSira[S.duzen] = { yeni:false, r:gd, f:hdFormDoldurTest(gd) };
  stateIdx = 0;
  const a3 = M.HareketDefteri({ rows, say: () => {} });
  __yazim = [];
  const silBtn = tum(a3, "button").find(b => metin(b).join("") === "Sil");
  if (silBtn) await ac(async () => silBtn.props.onClick());
  t("silme kaynak kaydı siliyor", __yazim.some(x => x[0] === "remove" && x[1] === "gider" && x[2] === "gd1"));

  // manuel ekle: MASRAF → gider
  stateSira = []; stateIdx = 0;
  M.HareketDefteri({ rows, say: () => {} });
  stateSira[S.duzen] = { yeni:true, r:null, f:{ tur:"MASRAF", tarih:"2026-08-20", taraf:"", aciklama:"kırtasiye",
    tutar:"250", adet:"1", satisFiyat:"", alisFiyat:"", urunAd:"", giderTur:"Diğer" } };
  stateIdx = 0;
  const a4 = M.HareketDefteri({ rows, say: () => {} });
  __yazim = [];
  const kb4 = tum(a4, "button").find(b => String(metin(b).join("")).indexOf("Kaydet") >= 0);
  if (kb4) await ac(async () => kb4.props.onClick());
  t("manuel MASRAF gider koleksiyonuna yeni kayıt açtı", (() => {
    const y = __yazim.find(x => x[0] === "save" && x[1] === "gider");
    return y && !y[2].id && y[2].tutar === 250 && y[2].aciklama === "kırtasiye" && y[2].elle === true; })());

  // manuel ekle: SATIŞ → pazarlama_hareket tip:satis
  stateSira = []; stateIdx = 0;
  M.HareketDefteri({ rows, say: () => {} });
  stateSira[S.duzen] = { yeni:true, r:null, f:{ tur:"SATIS", tarih:"2026-08-20", taraf:"Kale C", aciklama:"",
    tutar:"", adet:"4", satisFiyat:"90", alisFiyat:"65", urunAd:"Anahtarlık", giderTur:"" } };
  stateIdx = 0;
  const a5 = M.HareketDefteri({ rows, say: () => {} });
  __yazim = [];
  const kb5 = tum(a5, "button").find(b => String(metin(b).join("")).indexOf("Kaydet") >= 0);
  if (kb5) await ac(async () => kb5.props.onClick());
  t("manuel SATIŞ pazarlama_hareket'e tip:satis yazdı", (() => {
    const y = __yazim.find(x => x[0] === "save" && x[1] === "pazarlama_hareket");
    return y && y[2].tip === "satis" && y[2].adet === 4 && y[2].satisFiyat === 90 && y[2].yer === "Kale C" && y[2].girildi; })());

  // sentetik/sanal satır → düzenlenemez, uyarı verir
  let uyari = "";
  stateSira = []; stateIdx = 0;
  const a6 = M.HareketDefteri({ rows, say: m => { uyari = m; } });
  const sentetik = rows.find(r => r.sentetik);
  const trs = tum(a6, "tr").filter(x => x.props && x.props.onClick);
  const hedefTr = trs.find((x, i) => true);
  t("sentetik satır var (test verisinde gerilla peşini)", !!sentetik);
  stateIdx = 0;
  const a7 = M.HareketDefteri({ rows, say: m => { uyari = m; } });
  // doğrudan hdDuzenlenir mantığını sınayalım
  t("sentetik satır düzenlemeye KAPALI", hdDuzenlenirTest(sentetik).olur === false);
  t("montaj/sabit gider kaynağı düzenlemeye KAPALI",
    hdDuzenlenirTest({ kaynakKol:"sabit_gider", kaynakId:"x" }).olur === false &&
    hdDuzenlenirTest({ kaynakKol:"montaj_gorev", kaynakId:"y" }).olur === false);
  t("normal gider/satış satırı düzenlemeye AÇIK",
    hdDuzenlenirTest(gd).olur === true && hdDuzenlenirTest(st).olur === true);


  /* ── TABLA GİZLEME: yalnız GÖRÜNÜM, TOPLAMLAR değişmez ── */
  const D_TAB = { hareketler: [
    { id: "x1", tip: "satis", tarih: YENI, adet: 1, satisFiyat: 100, alisFiyat: 60, yer: "Kale A" },
    { id: "b1", tip: "tabla", tarih: YENI, tutar: 25, kullaniciAd: "Ece" },
    { id: "b2", tip: "tabla", tarih: YENI, tutar: 15, kullaniciAd: "Can" }
  ], giderler: [], sabitGiderler: [], montajGorevler: [], hakedisDonemler: [] };
  const rowsTab = M.olayUret(D_TAB, { simdi: Date.parse("2026-08-23T12:00:00") }).rows;

  stateSira = []; stateIdx = 0;
  const T0 = M.HareketDefteri({ rows: rowsTab, say: () => {} });
  t("varsayılan: tabla satırları GÖRÜNÜR (3 satır+başlık)", tum(T0, "tr").length === 4);
  const top0 = yaz(T0);

  stateSira = []; stateIdx = 0;
  M.HareketDefteri({ rows: rowsTab, say: () => {} });
  stateSira[S.tablaGizli] = true;
  stateIdx = 0;
  const T1 = M.HareketDefteri({ rows: rowsTab, say: () => {} });
  t("tablaGizli açık: tabla satırları LİSTEDE YOK (1 satır+başlık)", tum(T1, "tr").length === 2);
  t("tablaGizli açık: BORÇ/ALACAK toplamı DEĞİŞMEDİ", (() => {
    const y0 = top0.match(/Alacak [\d.,]+ ₺/), y1 = yaz(T1).match(/Alacak [\d.,]+ ₺/);
    return y0 && y1 && y0[0] === y1[0]; })());
  t("tablaGizli açık: hareket SAYISI da tam kalıyor", (() => {
    const s0 = top0.match(/\d+ hareket/), s1 = yaz(T1).match(/\d+ hareket/);
    return s0 && s1 && s0[0] === s1[0]; })());

  /* ── TÜR SÜZGECİ: ARAÇ ÇUBUĞUNDA DEĞİL, TÜR SÜTUN BAŞLIĞINDA
     (kullanıcı 2026-08-24: "tümü satış tahsilat masraf ödeme kısmını tamamen
     kaldır, tür sütununun başlığına tıklayınca ufak bir filtre modalı açılsın") ── */
  stateSira = []; stateIdx = 0;
  const T2a = M.HareketDefteri({ rows: rowsTab, say: () => {} });
  t("araç çubuğunda TÜMÜ/SATIŞ/TAHSİLAT/MASRAF/ÖDEME çipi KALMADI",
    tum(T2a, "button").filter(b => ["TÜMÜ","SATIŞ","TAHSİLAT","MASRAF","ÖDEME"].includes(yaz(b))).length === 0);

  const turBas = n => tum(n, "th").find(x => yaz(x).indexOf("TÜR") >= 0);
  t("TÜR sütun başlığı var ve tıklanabilir", !!(turBas(T2a) && turBas(T2a).props.onClick));
  t("süzgeç kapalıyken başlıkta ▾ işareti", yaz(turBas(T2a)).indexOf("▾") >= 0);
  t("süzgeç penceresi KAPALI başlar", yaz(T2a).indexOf("Tümünü seç") < 0);

  // başlığa dokun → pencere açılır
  turBas(T2a).props.onClick();
  stateIdx = 0;
  const T2b = M.HareketDefteri({ rows: rowsTab, say: () => {} });
  t("başlığa dokununca süzgeç penceresi açılır", yaz(T2b).indexOf("Tümünü seç") >= 0);
  t("pencerede dört tür de listelenir",
    ["SATIŞ","TAHSİLAT","MASRAF","ÖDEME"].every(x => yaz(T2b).indexOf(x) >= 0));
  t("pencerede dört onay kutusu var",
    tum(T2b, "input").filter(x => x.props.type === "checkbox").length === 4);

  // MASRAF'ın tikini kaldır → tabla satırları düşer
  stateSira = []; stateIdx = 0;
  M.HareketDefteri({ rows: rowsTab, say: () => {} });
  stateSira[S.turF] = { SATIS: true, TAHSILAT: true, MASRAF: false, ODEME: true };
  stateIdx = 0;
  const T2c = M.HareketDefteri({ rows: rowsTab, say: () => {} });
  t("MASRAF tiki kalkınca tabla satırları listeden düşer (1 satır + başlık)",
    tum(T2c, "tr").length === 2);
  t("süzgeç açıkken başlıkta ● işareti", yaz(turBas(T2c)).indexOf("●") >= 0);

  /* ── SÜTUN GENİŞLİĞİ ayarlanabilir (kullanıcı 2026-08-24) ── */
  stateSira = []; stateIdx = 0;
  const W0 = M.HareketDefteri({ rows: rowsTab, say: () => {} });
  const kol = n => tum(n, "col");
  t("tabloda colgroup var (genişlikler uygulanıyor)", kol(W0).length > 0);
  t("tablo tableLayout:fixed — yoksa tarayıcı genişliği ezer", (() => {
    const tb = tum(W0, "table")[0];
    return tb && tb.props.style && tb.props.style.tableLayout === "fixed"; })());
  const w0 = kol(W0)[0].props.style.width;
  // sütun penceresini aç, ilk sütunu genişlet
  stateSira[S.colMenu] = true;
  stateIdx = 0;
  const W1 = M.HareketDefteri({ rows: rowsTab, say: () => {} });
  t("sütun penceresinde genişlik başlığı var", yaz(W1).indexOf("Sütun genişliği") >= 0);
  const arti = tum(W1, "button").find(b => (b.props["aria-label"] || "").indexOf("TARİH genişlet") >= 0);
  t("her sütunun −/+ genişlik düğmesi var", !!arti);
  arti.props.onClick();
  stateIdx = 0;
  const W2 = M.HareketDefteri({ rows: rowsTab, say: () => {} });
  t("+ dokunuşu sütunu GERÇEKTEN genişletti", parseInt(kol(W2)[0].props.style.width) > parseInt(w0));
  const sifirla = tum(W1, "button").find(b => yaz(b) === "Sıfırla");
  t("Sıfırla düğmesi var", !!sifirla);
  sifirla.props.onClick();
  stateIdx = 0;
  t("Sıfırla varsayılana döndürdü",
    kol(M.HareketDefteri({ rows: rowsTab, say: () => {} }))[0].props.style.width === w0);

  /* ── TABLA gizleme simgesi: PersonelTakip'teki "topla" (katman) ikonu ── */
  stateSira = []; stateIdx = 0;
  const I0 = M.HareketDefteri({ rows: rowsTab, say: () => {} });
  const tablaBtn = tum(I0, "button").find(b => (b.props.title || "").indexOf("Tabla hareketlerini gizle") >= 0);
  t("tabla gizleme düğmesi araç çubuğunda", !!tablaBtn);
  t("simgesi PersonelTakip'in 'topla' katman ikonu", (() => {
    const yollar = tum(tablaBtn, "path").map(x => x.props.d);
    return yollar.indexOf("m12 3 9 5-9 5-9-5 9-5z") >= 0 && yollar.indexOf("m3 13 9 5 9-5") >= 0; })());

  console.log((fail ? "✗ " : "✓ ") + ok + "/" + (ok + fail) + " sınama geçti" + (fail ? " — " + fail + " HATA" : ""));
  process.exit(fail ? 1 : 0);
})();
