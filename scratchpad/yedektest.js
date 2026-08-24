/* F0 testi — lib/tikita-audit.js saf fonksiyonları (parmakIzi, ymdYerel, sonYedek*)
   GERÇEK modül gövdesi okunur, firebase importu ayıklanır, node'da koşulur.
   Koştur: node scratchpad/yedektest.js */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../public/lib/tikita-audit.js"), "utf8");

// import satırlarını ve DOM/Firebase'e dokunan fonksiyonları ayıkla, export'ları sök
let body = src
  .replace(/^import[\s\S]*?firebase-firestore\.js";/m, "")   // firebase importu
  .replace(/^export\s+/gm, "");
// tarayıcı-only global taklitleri
const localStorageStub = (() => { let m = {}; return {
  getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, clear: () => { m = {}; } }; })();
const sandbox = {
  console, Blob: class {}, URL: { createObjectURL: () => "", revokeObjectURL: () => {} },
  document: undefined, localStorage: localStorageStub,
  collection: () => {}, getDocs: () => {}, getDoc: () => {}, doc: () => {}, setDoc: () => {},
  updateDoc: () => {}, deleteDoc: () => {}, deleteField: () => {}, query: () => {}, where: () => {},
  onSnapshot: () => {}, increment: () => {}
};
const vm = require("vm");
const ctx = vm.createContext(sandbox);
vm.runInContext(body + "\n;__out={parmakIzi,ymdYerel,sonYedekIsaretle,sonYedekGun,yedekEskiMi,TK_YEDEK_COLLS,TK_YEDEK_FOTO};", ctx);
const M = ctx.__out;

let ok = 0, fail = 0;
const t = (ad, kosul) => { if (kosul) { ok++; } else { fail++; console.log("  ✗ " + ad); } };

// ── 1-4: yedek listesi tasnifi
t("mali çekirdek listede", ["pazarlama_hareket","hakedis_donem","gider","sabit_gider","stok_hareket","montaj_gorev","plan"].every(x => M.TK_YEDEK_COLLS.includes(x)));
t("kullanici (PIN) yedekte", M.TK_YEDEK_COLLS.includes("kullanici"));
t("urun_foto rutin yedekte DEĞİL, foto yedeğinde", !M.TK_YEDEK_COLLS.includes("urun_foto") && M.TK_YEDEK_FOTO.includes("urun_foto"));
t("kesif_cache yedekte değil (churn)", !M.TK_YEDEK_COLLS.includes("kesif_cache"));

// ── 5-12: parmakIzi — pazarlama_hareket
const har = [
  { tip: "satis", adet: 2, satisFiyat: 100, alisFiyat: 70 },
  { tip: "satis", adet: 1, satisFiyat: 50, alisFiyat: 35 },
  { tip: "tahsilat", tutar: 120.505 },
  { tip: "konsinye", adet: 5, alisFiyat: 70, kalan: 3 },
  { tip: "konsinye", adet: 4, alisFiyat: 70, kalan: 0 },
  { tip: "diplomasi" }
];
const pH = M.parmakIzi("pazarlama_hareket", har);
t("n sayımı", pH.n === 6);
t("tip kırılımı", pH.tip.satis === 2 && pH.tip.konsinye === 2 && pH.tip.diplomasi === 1);
t("toplamAdet", pH.toplamAdet === 12);
t("ciro = Σadet×satisFiyat", pH.ciro === 250);
t("verisBedel = Σadet×alisFiyat", pH.verisBedel === 2*70 + 1*35 + 5*70 + 4*70);
t("konsinyeKalan yalnız konsinye tipinden", pH.konsinyeKalan === 3);
t("toplamTutar yuvarlama (2 hane)", pH.toplamTutar === 120.51 || pH.toplamTutar === 120.5);
t("bozuk satır (null) düşürmüyor", M.parmakIzi("pazarlama_hareket", [null, { tip: "satis", adet: "x" }]).n === 2);

// ── 13-17: parmakIzi — diğer koleksiyonlar
t("gider Σtutar", M.parmakIzi("gider", [{ tutar: 10 }, { tutar: 5.5 }]).toplamTutar === 15.5);
const pD = M.parmakIzi("hakedis_donem", [{ hakedis: 100, durum: "odendi" }, { hakedis: 40, durum: "bildirildi" }, { hakedis: 60, durum: "odendi" }]);
t("hakedis_donem Σ + durum kırılımı", pD.toplamHakedis === 200 && pD.durum.odendi === 2 && pD.durum.bildirildi === 1);
t("stok_urun Σstokta", M.parmakIzi("stok_urun", [{ stokta: 7 }, { stokta: 3 }]).toplamStok === 10);
t("stok_hareket Σdelta (negatif dahil)", M.parmakIzi("stok_hareket", [{ delta: 5 }, { delta: -2 }]).toplamDelta === 3);
t("montaj_gorev alınan/teslim", (() => { const p = M.parmakIzi("montaj_gorev", [{ alinanAdet: 10, teslimAdet: 8 }]); return p.alinan === 10 && p.teslim === 8; })());

// ── 18-21: ymdYerel + son yedek takibi
t("ymdYerel biçimi", /^\d{4}-\d{2}-\d{2}$/.test(M.ymdYerel()));
t("ymdYerel YEREL gün (UTC değil)", (() => { const d = new Date(2026, 7, 23, 0, 30); return M.ymdYerel(d) === "2026-08-23"; })());
localStorageStub.clear();
t("hiç yedek yokken eski sayılır", M.sonYedekGun() === null && M.yedekEskiMi() === true);
M.sonYedekIsaretle();
t("yedek alınınca bugün=0 ve eski değil", M.sonYedekGun() === 0 && M.yedekEskiMi() === false);

// ── 22: aynı satırlar iki kez → parmak izi deterministik
t("parmak izi deterministik", JSON.stringify(M.parmakIzi("pazarlama_hareket", har)) === JSON.stringify(pH));

console.log((fail ? "✗ " : "✓ ") + ok + "/" + (ok + fail) + " sınama geçti" + (fail ? " — " + fail + " HATA" : ""));
process.exit(fail ? 1 : 0);
