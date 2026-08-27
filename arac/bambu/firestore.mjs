/* 🔥 Firestore REST — küçük okuma/yazma katmanı. Tikita web anahtarını kullanır,
   panelin yazdığı biçimin aynısını yazar. */
const PROJE = process.env.TIKITA_PROJE || "tikita-2026";
const ANAHTAR = process.env.TIKITA_ANAHTAR || "AIzaSyDLf4LIJikzWGVgN_k_d6SuGlgiBWBxt5k";
const KOK = "https://firestore.googleapis.com/v1/projects/" + PROJE + "/databases/(default)/documents";

/* JS değeri → Firestore REST değeri */
export function fsDeger(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsDeger) } };
  if (typeof v === "object") {
    const fields = {}; Object.keys(v).forEach((k) => { fields[k] = fsDeger(v[k]); });
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}
/* Firestore REST değeri → JS */
export function fsCoz(v) {
  if (!v || typeof v !== "object") return null;
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return !!v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("stringValue" in v) return v.stringValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return ((v.arrayValue && v.arrayValue.values) || []).map(fsCoz);
  if ("mapValue" in v) {
    const f = (v.mapValue && v.mapValue.fields) || {}; const o = {};
    Object.keys(f).forEach((k) => { o[k] = fsCoz(f[k]); }); return o;
  }
  return null;
}
export const fsBelge = (d) => {
  const o = {}; const f = (d && d.fields) || {};
  Object.keys(f).forEach((k) => { o[k] = fsCoz(f[k]); });
  o.id = String((d && d.name) || "").split("/").pop();
  return o;
};

export async function koleksiyon(ad) {
  const out = []; let sayfa = "";
  for (let i = 0; i < 40; i++) {
    const u = KOK + "/" + ad + "?key=" + ANAHTAR + "&pageSize=300" + (sayfa ? ("&pageToken=" + sayfa) : "");
    const r = await fetch(u);
    if (!r.ok) throw new Error("Firestore okuma " + r.status + " — " + (await r.text()).slice(0, 200));
    const d = await r.json();
    (d.documents || []).forEach((x) => out.push(fsBelge(x)));
    sayfa = d.nextPageToken || ""; if (!sayfa) break;
  }
  return out;
}

/* tek belge — yoksa null */
export async function belge(ad, id) {
  const r = await fetch(KOK + "/" + ad + "/" + id + "?key=" + ANAHTAR);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Firestore okuma " + r.status + " — " + (await r.text()).slice(0, 200));
  return fsBelge(await r.json());
}

/* yalnız verilen alanları günceller — belgenin öteki alanlarına dokunmaz */
export async function guncelle(ad, id, alanlar) {
  const yollar = Object.keys(alanlar);
  const q = yollar.map((k) => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&");
  const fields = {}; yollar.forEach((k) => { fields[k] = fsDeger(alanlar[k]); });
  const r = await fetch(KOK + "/" + ad + "/" + id + "?key=" + ANAHTAR + "&" + q, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error("Firestore yazma " + r.status + " — " + (await r.text()).slice(0, 200));
  return true;
}
export { PROJE as FS_PROJE };
