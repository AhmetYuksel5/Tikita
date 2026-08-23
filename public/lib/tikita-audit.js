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
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fn;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return fn;
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
