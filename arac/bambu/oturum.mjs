/* 🎫 Bambu oturumu — token'ı şifreli olarak Firestore'da ayar/bambu içinde tutar.
   Panel yalnız ayar/genel okuduğu için bu belge arayüzü etkilemez. */
import { kilitle, ac } from "./kasa.mjs";
import { belge, guncelle } from "./firestore.mjs";

export const KASA_KOL = "ayar";
export const KASA_ID = "bambu";

export const kasaSifre = () => process.env.BAMBU_SIFRE || process.env.BAMBU_KASA || "";

export async function oturumOku() {
  const d = await belge(KASA_KOL, KASA_ID);
  if (!d || !d.kilit) return null;
  try { return JSON.parse(ac(d.kilit, kasaSifre())); } catch (e) { throw e; }
}

export async function oturumYaz(o) {
  await guncelle(KASA_KOL, KASA_ID, {
    kilit: kilitle(JSON.stringify(o || {}), kasaSifre()),
    tarih: new Date().toISOString(),
  });
  return true;
}

/* Kullanılabilir token — süresi yaklaştıysa kendiliğinden tazeler. */
export async function tokenAl() {
  if (process.env.BAMBU_TOKEN) return process.env.BAMBU_TOKEN;
  const o = await oturumOku();
  if (!o || !o.token) throw new Error("Bambu oturumu yok — GitHub'da 'bambu giriş' konusu aç");

  const { tokenCoz, tokenTazele } = await import("./bulut.mjs");
  const c = tokenCoz(o.token);
  const kalan = c.bitis ? (c.bitis - Date.now()) : Infinity;

  if (kalan < 3 * 86400000 && o.refresh) {
    const d = await tokenTazele(o.refresh);
    if (d && d.accessToken) {
      await oturumYaz({ token: d.accessToken, refresh: d.refreshToken || o.refresh });
      return d.accessToken;
    }
  }
  if (kalan <= 0) throw new Error("Token süresi doldu — 'bambu giriş' ile yenile");
  return o.token;
}
