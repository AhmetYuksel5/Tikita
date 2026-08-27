/* 🔒 Küçük kasa — Bambu oturumunu şifreleyip saklamak için.
   Depo herkese açık, Firestore de açık; bu yüzden token hiçbir yere düz
   yazılmaz. Anahtar BAMBU_SIFRE'den türetilir (scrypt), veri AES-256-GCM ile
   mühürlenir. Paket biçimi:  1.<tuz>.<iv>.<etiket>.<veri>  (base64url) */
import crypto from "node:crypto";

const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };
const UZUNLUK = 32;

const anahtar = (sifre, tuz) => crypto.scryptSync(String(sifre), tuz, UZUNLUK, SCRYPT);
const b64 = (b) => Buffer.from(b).toString("base64url");
const geri = (s) => Buffer.from(String(s), "base64url");

export function kilitle(metin, sifre) {
  if (!sifre) throw new Error("Kasa şifresi yok (BAMBU_SIFRE)");
  const tuz = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", anahtar(sifre, tuz), iv);
  const veri = Buffer.concat([c.update(String(metin), "utf8"), c.final()]);
  return ["1", b64(tuz), b64(iv), b64(c.getAuthTag()), b64(veri)].join(".");
}

export function ac(paket, sifre) {
  if (!sifre) throw new Error("Kasa şifresi yok (BAMBU_SIFRE)");
  const p = String(paket || "").split(".");
  if (p.length !== 5 || p[0] !== "1") throw new Error("Kasa paketi bozuk");
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", anahtar(sifre, geri(p[1])), geri(p[2]));
    d.setAuthTag(geri(p[3]));
    return Buffer.concat([d.update(geri(p[4])), d.final()]).toString("utf8");
  } catch (e) {
    throw new Error("Kasa açılamadı — BAMBU_SIFRE değişmiş olabilir");
  }
}
