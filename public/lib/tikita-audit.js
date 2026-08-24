/* ═══════════════════════════════════════════════════════════════════════════
   TİKİTA AUDIT + YEDEK ÇEKİRDEĞİ — tek ortak modül (/lib/tikita-audit.js)

   Bütün sayfalar (admin · index · deneme · montaj) bu TEK dosyayı kullanır;
   kopya tutulmaz. Firebase importunu modül KENDİSİ yapar — sayfaların import
   listesine bağımlılık yoktur (sayfa başına eksik import tuzağı kapalı).
   Sayfa yalnız `db`'yi verir.

   Kaynak: PersonelTakip audit altyapısının Tikita'ya damıtılmış hâli.
   Oradaki bedeli ödenmiş kurallar burada da geçerlidir:
   - prev, yazımdan ÖNCE yerel aynadan alınır (getDoc yarışı yaşanmış ders).
   - data/prev audit kaydında JSON METNİdir — okuyan JSON.parse etmek zorunda.
   - Gün kıyasında toISOString KULLANILMAZ (UTC gece yarısı gün kaydırır).
   - Audit/yedek yazımı asıl işi ASLA bozmaz (her şey try/catch).
   ═══════════════════════════════════════════════════════════════════════════ */
import {
  collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, deleteField,
  query, where, onSnapshot, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const AUDIT_SURUM = "1";

/* ─────────────────────────────────────────────────────────────────────────
   YEDEK LİSTESİ — TEK KAYNAK.
   KURAL: yeni koleksiyon açan, buraya eklemeden işi bitmiş SAYMAZ.
   (PersonelTakip 2026-08-15 denetim dersi: dokuz koleksiyonun yedeği yoktu.)
   ───────────────────────────────────────────────────────────────────────── */
export const TK_YEDEK_COLLS = [
  // KÜME A — mali çekirdek (kaybı geri getirilemez)
  "pazarlama_hareket", "hakedis_donem", "gider", "sabit_gider",
  "stok_hareket", "montaj_gorev", "plan",
  // KÜME B — durum/sayaç taşıyanlar (kullanici PIN içerir — yedek dosyası hassastır)
  "stok_urun", "filament", "sarf", "makineler", "musteri", "kullanici", "fiyat_gecmisi",
  // KÜME C — yardımcı
  "ayar", "hedef", "talep", "sefer", "bolge", "kesif_red", "kampanya"
];
// Rutin yedeğe GİRMEYENLER: urun_foto (base64 — ayrı foto yedeği aşağıda),
// kesif_cache (yeniden üretilebilir churn), demo_* / y_* (bilinçli kopyalar).
export const TK_YEDEK_FOTO = ["urun_foto"];

const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
const r2  = v => Math.round(num(v) * 100) / 100;

/* ─────────────────────────────────────────────────────────────────────────
   PARMAK İZİ — koleksiyon başına doğrulama özeti. ÜÇ yerde aynı fonksiyon:
   ① yedek manifesti  ② geri yükleme doğrulaması  ③ eski↔yeni rapor mutabakatı.
   Saf fonksiyondur (DOM/Firebase yok) → node ile test edilir.
   ───────────────────────────────────────────────────────────────────────── */
export function parmakIzi(ad, rows) {
  const r = rows || [];
  const S = k => r2(r.reduce((s, x) => s + num(x && x[k]), 0));
  const out = { n: r.length };
  if (ad === "pazarlama_hareket") {
    const tip = {};
    r.forEach(x => { const t = (x && x.tip) || "?"; tip[t] = (tip[t] || 0) + 1; });
    out.tip = tip;
    out.toplamAdet  = S("adet");
    out.toplamTutar = S("tutar");
    out.ciro       = r2(r.reduce((s, x) => s + num(x && x.adet) * num(x && x.satisFiyat), 0));
    out.verisBedel = r2(r.reduce((s, x) => s + num(x && x.adet) * num(x && x.alisFiyat), 0));
    out.konsinyeKalan = r2(r.filter(x => x && x.tip === "konsinye").reduce((s, x) => s + num(x.kalan), 0));
  } else if (ad === "gider" || ad === "sabit_gider") {
    out.toplamTutar = S("tutar");
  } else if (ad === "hakedis_donem") {
    out.toplamHakedis = S("hakedis");
    const durum = {};
    r.forEach(x => { const d = (x && x.durum) || "?"; durum[d] = (durum[d] || 0) + 1; });
    out.durum = durum;
  } else if (ad === "stok_urun") {
    out.toplamStok = S("stokta");
  } else if (ad === "stok_hareket") {
    out.toplamDelta = S("delta");
  } else if (ad === "montaj_gorev") {
    out.alinan = S("alinanAdet");
    out.teslim = S("teslimAdet");
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────────────────
   YEDEK TOPLAMA — koleksiyon başına tek seferlik getDocs.
   Bir koleksiyonun hatası TÜM yedeği düşürmez; hata listede raporlanır.
   ───────────────────────────────────────────────────────────────────────── */
export async function yedekTopla(db, colls) {
  const liste = colls || TK_YEDEK_COLLS;
  const collections = {}, manifest = {}, hatalar = [];
  for (const ad of liste) {
    try {
      const s = await getDocs(collection(db, ad));
      const rows = s.docs.map(d => ({ id: d.id, ...d.data() }));
      collections[ad] = rows;
      manifest[ad] = parmakIzi(ad, rows);
    } catch (e) {
      console.error("yedek: " + ad, e);
      collections[ad] = [];
      manifest[ad] = { n: 0, hata: String((e && e.message) || e) };
      hatalar.push(ad);
    }
  }
  return {
    payload: {
      app: "tikita", v: AUDIT_SURUM,
      exportedAt: new Date().toISOString(),
      manifest, collections
    },
    manifest, hatalar
  };
}

// Yerel gün damgası — toISOString UTC'dir, gece yarısı civarı günü kaydırır.
export function ymdYerel(d) {
  const t = d || new Date();
  return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
}

export function yedekIndir(payload, dosyaAdi) {
  const t = new Date();
  const fn = dosyaAdi || ("tikita-yedek-" + ymdYerel(t) + "-" +
    String(t.getHours()).padStart(2, "0") + String(t.getMinutes()).padStart(2, "0") + ".json");
  /* Başa UTF-8 BOM konur — dosya BOM'suz da geçerli UTF-8'dir ama Windows Not
     Defteri / Android görüntüleyiciler / Excel kodlamayı yanlış tahmin edip
     Türkçe harfleri "Ã§ Ã¶ ÅŸ" gösteriyordu (PersonelTakip CSV dersiyle aynı).
     JSON.parse BOM'u SEVMEZ → geri okuma HER ZAMAN yedekOku'dan geçmeli. */
  const blob = new Blob(["\uFEFF", JSON.stringify(payload)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fn;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return fn;
}

/* Yedek dosyasını geri okuma — BOM'u ayıklar (JSON.parse BOM'lu metni reddeder).
   Yedekten okuyan HER yol buradan geçer; çıplak JSON.parse KULLANMA. */
export function yedekOku(metin) {
  let s = String(metin || "");
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  return JSON.parse(s);
}

/* Son yedek takibi — 7 günü geçince ayar düğmesinde rozet çıkar. */
export function sonYedekIsaretle() { try { localStorage.setItem("tk_sonYedek", ymdYerel()); } catch (e) {} }
export function sonYedekGun() {
  try {
    const v = localStorage.getItem("tk_sonYedek"); if (!v) return null;
    const f = Math.floor((new Date(ymdYerel() + "T00:00:00") - new Date(v + "T00:00:00")) / 864e5);
    return isFinite(f) ? f : null;
  } catch (e) { return null; }
}
export function yedekEskiMi() { const g = sonYedekGun(); return g === null || g > 7; }

/* Tek doküman geri yükleme — merge'süz TAM yazım (index.html restoreDoc ile aynı kural).
   Yedekten dönerken merge kullanmak eski alanları yeni kayda karıştırır. */
export async function geriYukleDoc(db, coll, obj) {
  const { id, ...dd } = obj;
  if (!id) throw new Error("geriYukleDoc: id yok");
  await setDoc(doc(db, coll, id), dd);
  return id;
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUDIT ÇEKİRDEĞİ — merge + increment dünyasına uyarlanmış değişiklik kaydı.

   PersonelTakip'ten FARKLAR (bilerek):
   - Tikita `setDoc({merge:true})` kullanır → her update kaydı DOĞUŞTAN KISMİDİR:
     `data` = yama (increment'ler çözülmüş), `prev` = YALNIZ yamadaki anahtarların
     eski değerleri. Yamada olmayan alan kayda hiç girmez.
   - Yamada olup dokümanda OLMAYAN alanın prev'i `__YOK__` işaretidir — geri alma
     o alanı deleteField ile SİLER (merge dünyasında undo alan silebilmelidir).
   - increment() alanları geri alınırken prev DEĞERİ YAZILMAZ; TERS INCREMENT
     yapılır (mutlak yazım, araya giren eşzamanlı tahsilatı ezer — Tikita'nın
     kendi increment dersi). Kayıttaki `incAlan` haritası bunun için tutulur.
   - İş-olayı kayıtlarına `telafi` etiketi konur: genel geri alma o kayıtları
     REDDEDER ve ekrandaki telafi akışına (geriAlKayit vb.) yönlendirir.
   ═══════════════════════════════════════════════════════════════════════════ */

export const YOK = "__YOK__";   // "bu alan dokümanda yoktu" işareti (undo → deleteField)
export const LOG_GUN = 40;      // log penceresi — TEK KAYNAK, başka yerde -40 gün hesaplama

/* Audit'lenen koleksiyonlar (varsayılan). GİRMEYENLER ve sebepleri:
   stok_hareket (kendisi zaten log defteri) · urun_foto (base64, diff anlamsız) ·
   kesif_cache (yeniden üretilebilir churn) · fiyat_gecmisi (kendisi önceki-değer kaydı) ·
   audit_logs (kendini loglamaz). */
export const AUDIT_COLLS = new Set([
  "kullanici","musteri","bolge","stok_urun","pazarlama_hareket","plan","makineler",
  "filament","sarf","montaj_gorev","gider","sabit_gider","hakedis_donem","talep",
  "kampanya","hedef","ayar","sefer","kesif_red"
]);

const uid8 = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
// 8 karakter rastgele — 4 karakter toplu yazımlarda ÇAKIŞIYORDU (PersonelTakip dersi).

/* Anahtar sırasından bağımsız kararlı JSON — "fark yok"u doğru tespit için. */
export function stabJSON(v) {
  if (v === undefined) return "u";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stabJSON).join(",") + "]";
  return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stabJSON(v[k])).join(",") + "}";
}
export const ayniDeger = (a, b) => stabJSON(a) === stabJSON(b);

/* increment() sentineli tespiti — SDK 10.12.0 pinli olduğu için _methodName donuktur.
   SDK yükseltilirse İLK test edilecek yer burası (tek fonksiyonda izole). */
export function incMi(v) {
  return !!(v && typeof v === "object" && typeof v._methodName === "string" &&
    v._methodName.indexOf("increment") >= 0);
}
export function incDelta(v) {
  const d = Number(v && (v._operand !== undefined ? v._operand : v.Ea));
  return isFinite(d) ? d : 0;
}

const derinKopya = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/* Yamadaki increment'leri LOG için çözer (yazılan yama DEĞİŞMEZ).
   Dönen: { data: log'a yazılacak çözülmüş yama, incAlan: {"alan"|"alan.alt": delta} }.
   prev bilinmiyorsa değer "__INC(+3)__" metnidir — okunur, uydurma rakam yazmaz. */
export function incCoz(dd, prevDoc) {
  const data = {}, incAlan = {};
  const coz = (yol, v, eski) => {
    const d = incDelta(v);
    incAlan[yol] = d;
    return (typeof eski === "number" && isFinite(eski)) ? Math.round((eski + d) * 100) / 100
      : "__INC(" + (d >= 0 ? "+" : "") + d + ")__";
  };
  Object.keys(dd || {}).forEach(k => {
    const v = dd[k];
    if (incMi(v)) { data[k] = coz(k, v, prevDoc && prevDoc[k]); return; }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      // iç içe map yaması (pazStokK:{uid:increment(n)}) — bir seviye derine bakılır
      const m = {}; let varInc = false;
      Object.keys(v).forEach(ak => {
        const av = v[ak];
        if (incMi(av)) { varInc = true; m[ak] = coz(k + "." + ak, av, prevDoc && prevDoc[k] && prevDoc[k][ak]); }
        else m[ak] = derinKopya(av);
      });
      data[k] = m;
      return;
    }
    data[k] = derinKopya(v);
  });
  return { data, incAlan };
}

/* prev alt kümesi — YALNIZ yamadaki üst-düzey anahtarlar.
   İç içe map yamasında prev, üst-düzey anahtarın TAMAMIdır (merge'ün derin
   birleşme semantiğini alan alan modellemek hata kaynağı — üst-düzey tam kopya
   hem gösterim hem undo için yeterli). */
export function prevAltKume(dd, prevDoc) {
  if (!prevDoc) return null;
  const p = {};
  Object.keys(dd || {}).forEach(k => {
    p[k] = (k in prevDoc) ? derinKopya(prevDoc[k]) : YOK;
  });
  return p;
}

/* Kısa kimlik özeti — kısmi kayıt "kim/ne?" sorusunu cevaplayabilsin.
   Şifre alanları ASLA girmez. data/prev'e KARIŞTIRILMAZ (undo yalnız onları okur). */
const KIM_ATLA = { pin: 1, pinHash: 1, pinSalt: 1, token: 1 };
export function auditKimlik(d) {
  const out = {}; let say = 0;
  Object.keys(d || {}).forEach(k => {
    if (say >= 25 || KIM_ATLA[k]) return;
    const v = d[k];
    if (typeof v === "number" || typeof v === "boolean" ||
        (typeof v === "string" && v.length <= 80)) { out[k] = v; say++; }
  });
  return out;
}

/* İnsan-okur tek satır etiket — Tikita koleksiyonlarına göre. */
const parayaz = v => { const n = Number(v); return isFinite(n) && n !== 0 ? " · " + (Math.round(n * 100) / 100) + " ₺" : ""; };
export function etiketYap(coll, action, d, prev) {
  const x = d || prev || {};
  const ek = action === "delete" ? " — SİLİNDİ" : (action === "create" ? "" : " — güncellendi");
  try {
    if (coll === "pazarlama_hareket")
      return [(x.tip || "hareket"), x.urunAd, x.adet ? x.adet + " adet" : "", x.kullaniciAd].filter(Boolean).join(" · ") + parayaz(x.tutar) + ek;
    if (coll === "gider" || coll === "sabit_gider")
      return [(x.tur || "gider"), x.aciklama].filter(Boolean).join(" · ") + parayaz(x.tutar) + ek;
    if (coll === "hakedis_donem")
      return ["hakediş", x.kullaniciAd, x.hafta, x.durum].filter(Boolean).join(" · ") + parayaz(x.hakedis) + ek;
    if (coll === "plan")
      return ["baskı", x.ad || x.urunAd].filter(Boolean).join(" · ") + ek;
    if (coll === "stok_urun")
      return ["ürün", x.ad].filter(Boolean).join(" · ") + ek;
    if (coll === "kullanici" || coll === "musteri")
      return [(coll === "kullanici" ? "kullanıcı" : "kale"), x.ad].filter(Boolean).join(" · ") + ek;
    const kim = auditKimlik(x); const ilk = kim.ad || kim.aciklama || kim.tur || "";
    return (coll + (ilk ? " · " + ilk : "")) + ek;
  } catch (e) { return coll + ek; }
}

/* ─────────────────────────────────────────────────────────────────────────
   kurAudit — sayfa başına tek kurulum.
   opts: { db,                     zorunlu
           cn,                     mantıksal→gerçek koleksiyon adı (demo/OV öneki);
                                   cn(coll)!==coll ise AUDIT ATLANIR (deneme verisi
                                   gerçek defteri kirletmez)
           kim,                    () => ({who, whoId})
           auditColls,             Set — varsayılan AUDIT_COLLS
           onHata }                audit yazım hatası bildirimi (toast köprüsü)
   ───────────────────────────────────────────────────────────────────────── */
export function kurAudit(opts) {
  const db = opts.db;
  const cn = opts.cn || (c => c);
  const kim = opts.kim || (() => ({ who: "", whoId: "" }));
  const COLLS = opts.auditColls || AUDIT_COLLS;
  const onHata = opts.onHata || null;

  /* Yerel ayna — her canlı dinleyici koleksiyonu buraya da yazar (snapPut).
     fss'in "prev"i buradan gelir; unutulan sayfa her şeyi create loglar. */
  const snap = {};   // coll -> {map:{id:doc}}
  function snapPut(coll, rows) {
    const m = {};
    (rows || []).forEach(r => { if (r && r.id) m[r.id] = r; });
    snap[coll] = { map: m };
  }
  function snapGet(coll, id) { const s = snap[coll]; return s ? s.map[id] : undefined; }
  const snapVar = coll => !!snap[coll];

  /* op damgası — tek eylem = tek log satırı. Damga yazım BAŞINDA alınır
     (audit async yazılabilir, sıra kaymasın). */
  let OP = null;
  function opAl(coll, action) {
    if (!OP) return null;
    OP.n++;
    const anaMi = !OP.anaVar && (!OP.ana || OP.ana === coll || OP.ana === coll + ":" + action);
    if (anaMi) OP.anaVar = true;
    return { op: OP.id, opAna: anaMi || undefined, opAd: OP.ad || undefined, telafi: OP.telafi || undefined };
  }
  async function op(fn, ana, ad, ekstra) {
    const onceki = OP;
    OP = { id: uid8(), n: 0, ana: ana || "", anaVar: false, ad: ad || "", telafi: (ekstra && ekstra.telafi) || "" };
    try { return await fn(); }
    finally { OP = onceki; }
  }

  let auditFail = 0;
  function auditWrite(action, coll, docId, dataObj, prevObj, ek) {
    try {
      const lid = uid8();
      const k = kim() || {};
      const rec = {
        id: lid, ts: new Date().toISOString(), date: ymdYerel(),
        v: AUDIT_SURUM, action, coll, docId: String(docId || ""),
        data: JSON.stringify(dataObj === undefined ? null : dataObj),
        prev: JSON.stringify(prevObj === undefined ? null : prevObj),
        label: etiketYap(coll, action, dataObj, prevObj),
        who: k.who || "", whoId: k.whoId || ""
      };
      if (ek) Object.keys(ek).forEach(x => { if (ek[x] !== undefined) rec[x] = ek[x]; });
      if (action === "update") {
        rec.kismi = true;                            // merge dünyasında her update kısmidir
        rec.kim = JSON.stringify(auditKimlik(dataObj || {}));
      }
      const { id: _, ...dd } = rec;
      setDoc(doc(db, "audit_logs", lid), dd).catch(e => {
        auditFail++; try { window.__auditFail = auditFail; } catch (_) {}
        console.error("audit yazılamadı", e);
        if (onHata && auditFail === 1) { try { onHata(e); } catch (_) {} }
      });
    } catch (e) {
      auditFail++; try { window.__auditFail = auditFail; } catch (_) {}
      console.error("audit kurulamadı", e);
    }
  }

  /* ── save: setDoc({merge:true}) + audit. Asıl yazım audit'ten ETKİLENMEZ. ── */
  async function save(coll, obj, ek) {
    const id = obj.id || uid8();
    const { id: _, ...dd } = obj;
    const gercek = cn(coll);
    const auditli = COLLS.has(coll) && gercek === coll;
    if (!auditli) { await setDoc(doc(db, gercek, id), dd, { merge: true }); return id; }

    // prev YAZIMDAN ÖNCE — aynadan senkron. Ayna yoksa ve id dışarıdan geldiyse
    // getDoc'a düşülür (bir ağ turu; create/update ayrımı yanlış olmasın).
    let prevDoc = snapGet(coll, id);
    if (prevDoc === undefined && obj.id && !snapVar(coll)) {
      try { const s = await getDoc(doc(db, gercek, id)); if (s.exists()) prevDoc = { id, ...s.data() }; }
      catch (e) { /* okunamadıysa create varsayılır */ }
    }
    const action = prevDoc ? "update" : "create";
    const damga = opAl(coll, action);

    await setDoc(doc(db, gercek, id), dd, { merge: true });   // ASIL İŞ — önce bu

    try {
      const { data, incAlan } = incCoz(dd, prevDoc);
      if (action === "update") {
        const prevAlt = prevAltKume(dd, prevDoc);
        // fark yoksa log satırı YOK (kararlı JSON, anahtar sırası bağımsız)
        const fark = Object.keys(data).some(k2 =>
          (incAlan[k2] !== undefined) || Object.keys(incAlan).some(y => y.indexOf(k2 + ".") === 0) ||
          !ayniDeger(data[k2], prevAlt[k2] === YOK ? undefined : prevAlt[k2]));
        if (fark) auditWrite("update", coll, id, data, prevAlt,
          { ...(damga || {}), ...(Object.keys(incAlan).length ? { incAlan: JSON.stringify(incAlan) } : {}), ...(ek || {}) });
      } else {
        auditWrite("create", coll, id, data, null, { ...(damga || {}), ...(ek || {}) });
      }
    } catch (e) { console.error("audit diff", e); }
    return id;
  }

  /* ── remove: silinen dokümanın tamamı hem data hem prev'de saklanır. ── */
  async function remove(coll, id, ek) {
    const gercek = cn(coll);
    const auditli = COLLS.has(coll) && gercek === coll;
    if (!auditli) { await deleteDoc(doc(db, gercek, id)); return; }
    let old = snapGet(coll, id);
    if (old === undefined) {
      try { const s = await getDoc(doc(db, gercek, id)); if (s.exists()) old = { id, ...s.data() }; } catch (e) {}
    }
    const damga = opAl(coll, "delete");
    await deleteDoc(doc(db, gercek, id));
    auditWrite("delete", coll, id, old || null, old || null, { ...(damga || {}), ...(ek || {}) });
  }

  /* ── restoreDoc: merge'süz TAM yazım (plan geri alma / yedekten dönüş). ── */
  async function restoreDoc(coll, obj, ek) {
    const id = obj.id; if (!id) throw new Error("restoreDoc: id yok");
    const { id: _, ...dd } = obj;
    const gercek = cn(coll);
    const auditli = COLLS.has(coll) && gercek === coll;
    const prevDoc = auditli ? snapGet(coll, id) : undefined;
    const damga = auditli ? opAl(coll, "restore") : null;
    await setDoc(doc(db, gercek, id), dd);
    if (auditli) auditWrite("restore", coll, id, derinKopya(dd), prevDoc ? derinKopya(prevDoc) : null, { ...(damga || {}), ...(ek || {}) });
    return id;
  }

  /* ── GERİ ALMA ───────────────────────────────────────────────────────────
     Kurallar:
     - `telafi` etiketli kayıt REDDEDİLİR → {yonlendir} döner; o iş ekrandaki
       telafi akışıyla (geriAlKayit / montajGeriAl / …) geri alınır.
     - incAlan alanları TERS INCREMENT ile döner (asla mutlak eski değer).
     - __YOK__ alanları deleteField ile SİLİNİR.
     - create → sil · delete → tam geri yükle · restore → prev'e tam dön.
     - Undo'nun kendisi audit'LENMEZ (sonsuz döngü); kayda undone damgası vurulur. */
  async function undoAudit(log) {
    if (!log || log.undone) return { olmadi: "zaten" };
    if (log.telafi) return { yonlendir: log.telafi };
    const gercek = cn(log.coll);
    if (gercek !== log.coll) return { olmadi: "demo" };
    const ref = doc(db, gercek, log.docId);
    const oku = s => { try { return s == null ? null : JSON.parse(s); } catch (e) { return null; } };
    // data/prev JSON METNİdir — parse edilmeden okunamaz (bilinen tuzak).
    const dataO = oku(log.data), prevO = oku(log.prev);

    if (log.action === "create") {
      await deleteDoc(ref);
    } else if (log.action === "delete") {
      const geri = prevO || dataO; if (!geri) return { olmadi: "veri yok" };
      const { id: _i, ...dd } = geri; await setDoc(ref, dd);
    } else if (log.action === "restore") {
      if (!prevO) return { olmadi: "önceki hâl kayıtlı değil" };
      const { id: _i, ...dd } = prevO; await setDoc(ref, dd);
    } else { // update (kısmi)
      if (!prevO) return { olmadi: "veri yok" };
      const incAlan = oku(log.incAlan) || {};
      // ① increment alanları: ters increment (üst düzey ve "a.b" noktalı yollar)
      const incUp = {};
      Object.keys(incAlan).forEach(y => { const d = Number(incAlan[y]) || 0; if (d) incUp[y] = increment(-d); });
      if (Object.keys(incUp).length) {
        try { await updateDoc(ref, incUp); }
        catch (e) { console.error("ters increment", e); return { olmadi: "increment geri alınamadı" }; }
      }
      // ② diğer alanlar: prev'e dön; __YOK__ → alanı sil. increment'li ÜST düzey
      //    alanlara ve incli iç içe map'in üst anahtarına DOKUNULMAZ.
      const incUst = {}; Object.keys(incAlan).forEach(y => { incUst[y.split(".")[0]] = 1; });
      const geriYaz = {};
      Object.keys(prevO).forEach(k => {
        if (incUst[k]) return;
        geriYaz[k] = (prevO[k] === YOK) ? deleteField() : prevO[k];
      });
      if (Object.keys(geriYaz).length) {
        try { await updateDoc(ref, geriYaz); }
        catch (e) { // doküman silinmişse merge ile diriltme DOĞRU değil — bildir
          console.error("undo yazımı", e); return { olmadi: "doküman bulunamadı" };
        }
      }
    }
    const k = kim() || {};
    setDoc(doc(db, "audit_logs", log.id),
      { undone: true, undoneTs: new Date().toISOString(), undoneBy: k.who || "" }, { merge: true })
      .catch(e => console.error("undone damgası", e));
    return { oldu: true };
  }

  /* ── 40 günlük pencereli log aboneliği ───────────────────────────────────
     Ölçüt alan "ts" — sonradan eklenen bir alan pencere ölçütü YAPILMAZ
     (alan olmayan doküman eşitsizlik sorgusundan düşer; PersonelTakip'te
     "date" alanı 40 günlük geçmişi görünmez yapmıştı). Sorgu kurulamazsa
     TÜM koleksiyona abone OLUNMAZ — boş liste döner (bosDus). */
  function logDinle(cb) {
    const win = new Date(Date.now() - LOG_GUN * 864e5).toISOString();
    try {
      const q = query(collection(db, "audit_logs"), where("ts", ">=", win));
      return onSnapshot(q,
        s => { const L = s.docs.map(d => ({ id: d.id, ...d.data() }));
               L.sort((a, b) => (b.ts || "").localeCompare(a.ts || "") || (b.id || "").localeCompare(a.id || ""));
               cb(L); },
        e => { console.error("audit_logs", e); cb([]); });
    } catch (e) { console.error("audit_logs sorgu", e); cb([]); return () => {}; }
  }

  return { save, remove, restoreDoc, snapPut, snapGet, op, undoAudit, logDinle,
           auditWrite, auditFailSay: () => auditFail };
}
