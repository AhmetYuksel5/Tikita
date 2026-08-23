/* F1 testi — lib/tikita-audit.js audit çekirdeği: GERÇEK modül gövdesi sahte
   Firestore ile koşulur. Koştur: node scratchpad/audittest.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const src = fs.readFileSync(path.join(__dirname, "../public/lib/tikita-audit.js"), "utf8");
const body = src.replace(/^import[\s\S]*?firebase-firestore\.js";/m, "").replace(/^export\s+/gm, "");

/* ── sahte Firestore ── */
let OPS = [];                      // yazım kaydı (sıra önemli)
const STORE = {};                  // "coll/id" -> doc
const kayit = (t, ref, dd, opts) => OPS.push({ t, coll: ref.coll, id: ref.id, dd, opts });
const fake = {
  doc: (db, coll, id) => ({ coll, id }),
  collection: (db, coll) => ({ coll }),
  setDoc: async (ref, dd, opts) => { kayit("set", ref, dd, opts);
    const k = ref.coll + "/" + ref.id;
    STORE[k] = opts && opts.merge ? { ...(STORE[k] || {}), ...dd } : { ...dd }; },
  deleteDoc: async ref => { kayit("del", ref); delete STORE[ref.coll + "/" + ref.id]; },
  updateDoc: async (ref, dd) => { kayit("upd", ref, dd);
    const k = ref.coll + "/" + ref.id; if (!STORE[k]) throw new Error("not-found");
    Object.keys(dd).forEach(x => { STORE[k][x] = dd[x]; }); },
  getDoc: async ref => { const k = ref.coll + "/" + ref.id;
    OPS.push({ t: "get", coll: ref.coll, id: ref.id });
    return { exists: () => !!STORE[k], data: () => STORE[k] }; },
  getDocs: async () => ({ docs: [] }),
  query: (c, w) => ({ c, w }), where: (a, o, v) => ({ a, o, v }),
  onSnapshot: () => () => {},
  increment: n => ({ _methodName: "FieldValue.increment", _operand: n }),
  deleteField: () => ({ _methodName: "FieldValue.delete" })
};
const localStorageStub = (() => { let m = {}; return {
  getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; })();
const ctx = vm.createContext({ console, localStorage: localStorageStub, window: {},
  Blob: class {}, URL: { createObjectURL: () => "", revokeObjectURL: () => {} }, document: undefined, ...fake });
vm.runInContext(body + "\n;__out={stabJSON,ayniDeger,incMi,incDelta,incCoz,prevAltKume,auditKimlik,etiketYap,kurAudit,YOK,AUDIT_COLLS};", ctx);
const M = ctx.__out;
const inc = fake.increment;

let ok = 0, fail = 0;
const t = (ad, kosul) => { if (kosul) ok++; else { fail++; console.log("  ✗ " + ad); } };
const bekle = ms => new Promise(r => setTimeout(r, ms));
const logSatirlari = () => OPS.filter(o => o.t === "set" && o.coll === "audit_logs" && !(o.dd && o.dd.undone));

(async () => {
  // ── saf yardımcılar
  t("stabJSON anahtar sırası bağımsız", M.stabJSON({ a: 1, b: { c: 2, d: 3 } }) === M.stabJSON({ b: { d: 3, c: 2 }, a: 1 }));
  t("incMi sentineli tanır", M.incMi(inc(3)) && !M.incMi({ x: 1 }) && !M.incMi(5) && !M.incMi(null));
  t("incDelta operandı okur", M.incDelta(inc(-2.5)) === -2.5);
  const c1 = M.incCoz({ tahsil: inc(30), not: "x" }, { tahsil: 70 });
  t("incCoz prev bilinince çözer", c1.data.tahsil === 100 && c1.incAlan.tahsil === 30 && c1.data.not === "x");
  const c2 = M.incCoz({ tahsil: inc(30) }, undefined);
  t("incCoz prev yoksa __INC metni", c2.data.tahsil === "__INC(+30)__" && c2.incAlan.tahsil === 30);
  const c3 = M.incCoz({ pazStokK: { u1: inc(5), u2: 3 } }, { pazStokK: { u1: 10 } });
  t("incCoz iç içe map", c3.data.pazStokK.u1 === 15 && c3.data.pazStokK.u2 === 3 && c3.incAlan["pazStokK.u1"] === 5);
  const p1 = M.prevAltKume({ ad: "x", yeni: 1 }, { id: "a", ad: "eski", baska: 9 });
  t("prevAltKume yalnız yama anahtarları + __YOK__", p1.ad === "eski" && p1.yeni === M.YOK && !("baska" in p1));
  const kml = M.auditKimlik({ ad: "Ali", pin: "1234", tutar: 5, uzun: "y".repeat(100), b: true });
  t("auditKimlik pin/uzun atlar", kml.ad === "Ali" && !("pin" in kml) && !("uzun" in kml) && kml.tutar === 5 && kml.b === true);
  t("etiketYap hareket", M.etiketYap("pazarlama_hareket", "create", { tip: "satis", urunAd: "Kolye", adet: 2, kullaniciAd: "Ece" }).indexOf("satis") === 0);

  // ── kurAudit akışları
  const A = M.kurAudit({ db: {}, kim: () => ({ who: "Test", whoId: "u1" }) });

  // create (id'siz) → create satırı, getDoc YOK
  OPS = [];
  const id1 = await A.save("gider", { tur: "Kargo", tutar: 50 });
  await bekle(5);
  t("create: asıl yazım + create log", OPS[0].t === "set" && OPS[0].coll === "gider" &&
    logSatirlari().length === 1 && logSatirlari()[0].dd.action === "create" && !OPS.some(o => o.t === "get"));
  t("create log'da who ve label", logSatirlari()[0].dd.who === "Test" && logSatirlari()[0].dd.label.indexOf("Kargo") >= 0);

  // update: snap'li — fark var → kısmi kayıt; prev yalnız yama anahtarları
  A.snapPut("gider", [{ id: id1, tur: "Kargo", tutar: 50, aciklama: "ilk" }]);
  OPS = [];
  await A.save("gider", { id: id1, tutar: 75 });
  await bekle(5);
  let L = logSatirlari();
  t("update: kismi + prev alt kümesi", L.length === 1 && L[0].dd.kismi === true &&
    JSON.parse(L[0].dd.prev).tutar === 50 && !("aciklama" in JSON.parse(L[0].dd.prev)));
  t("update: data yama", JSON.parse(L[0].dd.data).tutar === 75);

  // aynı değeri yeniden yazmak → LOG YOK ama yazım VAR
  OPS = [];
  await A.save("gider", { id: id1, tutar: 50 });   // snap hâlâ 50 diyor
  await bekle(5);
  t("fark yoksa log satırı yok, yazım var", OPS.some(o => o.t === "set" && o.coll === "gider") && logSatirlari().length === 0);

  // increment yaması: data=prev+delta, incAlan kayda JSON yazılır
  A.snapPut("pazarlama_hareket", [{ id: "h1", tip: "satis", tahsil: 70 }]);
  OPS = [];
  await A.save("pazarlama_hareket", { id: "h1", tahsil: inc(30) });
  await bekle(5);
  L = logSatirlari();
  t("increment: çözülmüş data + incAlan", L.length === 1 && JSON.parse(L[0].dd.data).tahsil === 100 &&
    JSON.parse(L[0].dd.incAlan).tahsil === 30);
  t("increment: asıl yazım SENTİNEL ile gitti (çözülmüş değil)",
    (() => { const s = OPS.find(o => o.t === "set" && o.coll === "pazarlama_hareket"); return M.incMi(s.dd.tahsil); })());

  // audit dışı koleksiyon → log yok
  OPS = [];
  await A.save("stok_hareket", { urunId: "u", delta: -1 });
  await bekle(5);
  t("stok_hareket loglanmaz", logSatirlari().length === 0);

  // demo öneki → audit atlanır
  const D = M.kurAudit({ db: {}, cn: c => "demo_" + c, kim: () => ({ who: "x", whoId: "y" }) });
  OPS = [];
  await D.save("gider", { tur: "Test", tutar: 1 });
  await bekle(5);
  t("demo yazımı audit'lenmez ve demo_ koleksiyonuna gider",
    OPS[0].coll === "demo_gider" && logSatirlari().length === 0);

  // remove: silinen doküman data+prev'de
  A.snapPut("musteri", [{ id: "m1", ad: "Kale A", tel: "5" }]);
  OPS = [];
  await A.remove("musteri", "m1");
  await bekle(5);
  L = logSatirlari();
  t("delete: old hem data hem prev", L.length === 1 && L[0].dd.action === "delete" &&
    JSON.parse(L[0].dd.data).ad === "Kale A" && JSON.parse(L[0].dd.prev).ad === "Kale A");
  t("delete: doküman gerçekten silindi", OPS.some(o => o.t === "del" && o.coll === "musteri"));

  // op grubu: iki yazım aynı op, ana doğru, telafi etiketi düşer
  A.snapPut("plan", [{ id: "p1", ad: "İş" }]);
  OPS = [];
  await A.op(async () => {
    await A.save("pazarlama_hareket", { tip: "satis", adet: 1 });
    await A.save("plan", { id: "p1", tablaAlindi: true });
  }, "pazarlama_hareket", "Satış işlendi", { telafi: "geriAlKayit" });
  await bekle(5);
  L = logSatirlari();
  t("op: iki satır aynı damga", L.length === 2 && L[0].dd.op && L[0].dd.op === L[1].dd.op);
  t("op: ana satır pazarlama_hareket", L.find(x => x.dd.coll === "pazarlama_hareket").dd.opAna === true &&
    !L.find(x => x.dd.coll === "plan").dd.opAna);
  t("op: telafi + opAd taşındı", L.every(x => x.dd.telafi === "geriAlKayit" && x.dd.opAd === "Satış işlendi"));

  // undo: telafi etiketli kayıt yönlendirilir
  const u1 = await A.undoAudit({ id: "l1", action: "update", coll: "pazarlama_hareket", docId: "h1", telafi: "geriAlKayit", data: "{}", prev: "{}" });
  t("undo: telafi yönlendirmesi", u1.yonlendir === "geriAlKayit");

  // undo: update — incAlan ters increment + diğer alan prev'e + __YOK__ silinir
  STORE["pazarlama_hareket/h2"] = { tip: "satis", tahsil: 100, not: "yeni", ek: "sonradan" };
  OPS = [];
  const u2 = await A.undoAudit({ id: "l2", action: "update", coll: "pazarlama_hareket", docId: "h2",
    data: JSON.stringify({ tahsil: 100, not: "yeni", ek: "sonradan" }),
    prev: JSON.stringify({ tahsil: 70, not: "eski", ek: M.YOK }),
    incAlan: JSON.stringify({ tahsil: 30 }) });
  await bekle(5);
  t("undo: ters increment gitti", (() => { const o = OPS.find(x => x.t === "upd" && x.dd.tahsil);
    return o && M.incMi(o.dd.tahsil) && M.incDelta(o.dd.tahsil) === -30; })());
  t("undo: diğer alan prev'e döndü, __YOK__ deleteField", (() => {
    const o = OPS.find(x => x.t === "upd" && x.dd.not);
    return o && o.dd.not === "eski" && o.dd.ek && o.dd.ek._methodName === "FieldValue.delete" && !("tahsil" in o.dd); })());
  t("undo: undone damgası vuruldu", u2.oldu === true &&
    OPS.some(o => o.t === "set" && o.coll === "audit_logs" && o.id === "l2" && o.dd.undone === true));

  // undo: create → sil
  STORE["gider/g9"] = { tur: "X" };
  OPS = [];
  await A.undoAudit({ id: "l3", action: "create", coll: "gider", docId: "g9", data: "{}", prev: "null" });
  t("undo: create silindi", OPS.some(o => o.t === "del" && o.coll === "gider" && o.id === "g9"));

  // undo: delete → tam geri yükleme
  OPS = [];
  await A.undoAudit({ id: "l4", action: "delete", coll: "musteri", docId: "m1",
    data: JSON.stringify({ id: "m1", ad: "Kale A", tel: "5" }), prev: JSON.stringify({ id: "m1", ad: "Kale A", tel: "5" }) });
  t("undo: delete geri geldi (merge'süz)", (() => { const o = OPS.find(x => x.t === "set" && x.coll === "musteri");
    return o && o.dd.ad === "Kale A" && !o.opts; })());

  // yazım sırası: asıl setDoc audit'ten ÖNCE
  OPS = [];
  await A.save("gider", { tur: "Sıra", tutar: 1 });
  await bekle(5);
  const iSet = OPS.findIndex(o => o.t === "set" && o.coll === "gider");
  const iLog = OPS.findIndex(o => o.t === "set" && o.coll === "audit_logs");
  t("asıl yazım audit'ten önce", iSet >= 0 && iLog > iSet);

  console.log((fail ? "✗ " : "✓ ") + ok + "/" + (ok + fail) + " sınama geçti" + (fail ? " — " + fail + " HATA" : ""));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
