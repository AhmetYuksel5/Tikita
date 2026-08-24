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
const sabitler = kes("const HD_COLS=[", "function HareketDefteri");
const defter = kes("function HareketDefteri(", "\nfunction HareketRaporu(");

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

const ctx = vm.createContext({ console, React, useState, useMemo, useRef, useEffect,
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
  ${sabitler.replace(/const hdFd=[\s\S]*?};\n/, "").replace(/const hdFmk=[\s\S]*?};\n/, "").replace(/function hdCsvIndir[\s\S]*?\n}\n/, "")}
  ${defter}
  __out={HareketDefteri,olayUret};
`, ctx);
const M = ctx.__out;

/* ağaç gezici */
function tum(n, ad, bulunan) { bulunan = bulunan || [];
  if (!n || typeof n !== "object") return bulunan;
  if (Array.isArray(n)) { n.forEach(x => tum(x, ad, bulunan)); return bulunan; }
  if (n.tip === ad) bulunan.push(n);
  (n.cocuk || []).forEach(c => tum(c, ad, bulunan));
  return bulunan;
}
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
t("varsayılan sütunlar: TARİH/TÜR/TARAF/AÇIKLAMA/ADET/BORÇ/ALACAK",
  ["TARİH","TÜR","TARAF","AÇIKLAMA","ADET","BORÇ","ALACAK"].every(b => basliklar.includes(b)));
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
t("araç çubuğu: ay seçici + tür çipleri + sütun + CSV",
  govdeMetin.indexOf("Tüm aylar") >= 0 && govdeMetin.indexOf("TÜMÜ") >= 0 &&
  govdeMetin.indexOf("⚙ Sütun") >= 0 && govdeMetin.indexOf("⤓ CSV") >= 0);
t("arama kutusu var", tum(agac, "input").some(x => String(x.props.placeholder || "").indexOf("Ara") === 0));

// tür süzgeci: yalnız SATIŞ
stateSira = []; stateIdx = 0;
const a2 = M.HareketDefteri({ rows, say: () => {} });   // state'i kur
stateSira[1] = "SATIS";                                  // [0]=q, [1]=tur
stateIdx = 0;
const agac2 = M.HareketDefteri({ rows, say: () => {} });
const satis = rows.filter(r => r.tur === "SATIS").length;
t("tür süzgeci satırları daraltıyor", tum(agac2, "tr").length === satis + 1);

// ay süzgeci: 2026-07
stateSira = []; stateIdx = 0;
M.HareketDefteri({ rows, say: () => {} });
stateSira[2] = "2026-07";                                // [2]=ay
stateIdx = 0;
const agac3 = M.HareketDefteri({ rows, say: () => {} });
const tem = rows.filter(r => (r.tarih || "").slice(0, 7) === "2026-07").length;
t("ay süzgeci çalışıyor", tum(agac3, "tr").length === tem + 1);

// boş veri
stateSira = []; stateIdx = 0;
const bos = M.HareketDefteri({ rows: [], say: () => {} });
t("boş defterde çökme yok, mesaj var", metin(bos).join(" ").indexOf("Henüz hareket yok") >= 0);

console.log((fail ? "✗ " : "✓ ") + ok + "/" + (ok + fail) + " sınama geçti" + (fail ? " — " + fail + " HATA" : ""));
process.exit(fail ? 1 : 0);
