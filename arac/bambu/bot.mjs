/* 🤖 GitHub konusundan yönetilen Bambu bağlantısı — bilgisayara gerek yok.
   Telefondan konu aç ("bambu"), yorum yaz, cevabı yorum olarak al.
   Şifre ve token asla yoruma ya da kayda düşmez; token şifreli saklanır. */
import fs from "node:fs";
import { komutCoz, bambuKonusu, YARDIM } from "./komut.mjs";
import { oturumOku, oturumYaz, tokenAl, kasaSifre } from "./oturum.mjs";
import { cekimYap, eslestir } from "./cekirdek.mjs";

const OLAY = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const DEPO = process.env.GITHUB_REPOSITORY || "";
const GT = process.env.GITHUB_TOKEN || "";
const EPOSTA = (process.env.BAMBU_EPOSTA || "").trim();
const SIFRE = (process.env.BAMBU_SIFRE || "").trim();

const konu = OLAY.issue || {};
const yorumKaydi = OLAY.comment || null;
const sahip = String((OLAY.repository && OLAY.repository.owner && OLAY.repository.owner.login) || "");
const gonderen = String((OLAY.sender && OLAY.sender.login) || "");

const gh = (yol, o) => fetch("https://api.github.com" + yol, {
  ...o, headers: { Authorization: "Bearer " + GT, Accept: "application/vnd.github+json", ...((o && o.headers) || {}) },
});
const yorumla = (metin) => gh("/repos/" + DEPO + "/issues/" + konu.number + "/comments",
  { method: "POST", body: JSON.stringify({ body: metin }) });
const karart = (id, metin) => gh("/repos/" + DEPO + "/issues/comments/" + id,
  { method: "PATCH", body: JSON.stringify({ body: metin }) });
const gizle = (s) => { if (s) console.log("::add-mask::" + s); };

/* ————— giriş yardımcıları ————— */
async function girisBasla() {
  const { girisDene, kodGonder } = await import("./bulut.mjs");
  if (!EPOSTA) return "❌ `BAMBU_EPOSTA` gizli anahtarı tanımlı değil.";
  if (!kasaSifre()) return "❌ `BAMBU_SIFRE` gizli anahtarı tanımlı değil — token'ı şifrelemek için gerekli.";

  let d = {};
  if (SIFRE) { try { d = await girisDene(EPOSTA, SIFRE); } catch (e) { return "❌ Giriş reddedildi: " + e.message; } }
  if (d && d.accessToken) return await girisBitir(d);

  if (d && d.tfaKey) {
    await oturumYaz({ tfa: d.tfaKey });
    return "🔐 Hesapta iki adımlı doğrulama açık.\n\nDoğrulama uygulamandaki 6 haneli kodu yaz:\n\n`kod 123456`";
  }
  try { await kodGonder(EPOSTA); } catch (e) { return "❌ Kod gönderilemedi: " + e.message; }
  return "📧 **" + EPOSTA.replace(/^(.).*(@.*)$/, "$1•••$2") + "** adresine 6 haneli kod yollandı."
    + "\n\nGelen kodu şöyle yaz:\n\n`kod 123456`";
}

async function kodGir(kod) {
  const { kodlaGir } = await import("./bulut.mjs");
  let tfa = ""; try { const o = await oturumOku(); tfa = (o && o.tfa) || ""; } catch (e) { /* kasa boş */ }
  let d = {};
  try { d = await kodlaGir(EPOSTA, kod, tfa); } catch (e) { return "❌ Kod kabul edilmedi: " + e.message; }
  if (!d || !d.accessToken) return "❌ Kod kabul edilmedi — süresi dolmuş olabilir. Yeniden `giriş` yaz.";
  return await girisBitir(d);
}

async function girisBitir(d) {
  gizle(d.accessToken); gizle(d.refreshToken);
  await oturumYaz({ token: d.accessToken, refresh: d.refreshToken || "" });
  const { tokenCoz, cihazlar } = await import("./bulut.mjs");
  const c = tokenCoz(d.accessToken);
  const L = await cihazlar(d.accessToken);
  const S = ["✅ **Bambu hesabına bağlanıldı.** Token şifreli olarak saklandı — bir daha giriş gerekmez."];
  if (c.bitis) S.push("Geçerlilik: " + new Date(c.bitis).toLocaleDateString("tr-TR")
    + " (süresi yaklaşınca kendiliğinden yenilenir)");
  S.push("", "**Hesaptaki yazıcılar**", "");
  L.forEach((x) => S.push("- " + (x.cevrimici ? "🟢" : "⚪") + " **" + x.ad + "** · " + x.model + " · `" + x.seri + "`"));
  S.push("", "Sıradaki adım: `eşle` yaz — yazıcıları Tikita makineleriyle bağlayayım.");
  return S.join("\n");
}

/* ————— akış ————— */
async function calis() {
  if (!konu.number) return null;
  if (konu.pull_request) return null;
  if (gonderen.toLowerCase() !== sahip.toLowerCase()) {
    console.log("Depo sahibi değil, atlandı: " + gonderen); return null;
  }
  const metin = yorumKaydi ? yorumKaydi.body : (konu.title + "\n" + (konu.body || ""));
  if (!yorumKaydi && !bambuKonusu(konu.title, konu.body)) return null;

  const k = komutCoz(metin);
  if (!k.is) return yorumKaydi ? null : ("👋 Bambu bağlantısı buradan yönetilir.\n\n" + YARDIM);

  /* kodu herkese açık depoda bırakma */
  if (k.is === "kod" && yorumKaydi) await karart(yorumKaydi.id, "`kod ••••••` (alındı, gizlendi)");

  if (k.is === "durum") {
    let dur = "❌ bağlantı yok — `giriş` yaz";
    try {
      const o = await oturumOku();
      if (o && o.token) {
        const { tokenCoz } = await import("./bulut.mjs");
        const c = tokenCoz(o.token);
        dur = "✅ bağlı" + (c.bitis ? (" · geçerlilik " + new Date(c.bitis).toLocaleDateString("tr-TR")) : "");
      }
    } catch (e) { dur = "⚠️ " + e.message; }
    return "**Durum:** " + dur + "\n\n" + YARDIM;
  }
  if (k.is === "giris") return await girisBasla();
  if (k.is === "kod") return await kodGir(k.kod);

  let token = "";
  try { token = await tokenAl(); } catch (e) { return "❌ " + e.message; }
  gizle(token);

  if (k.is === "esle") {
    const r = await eslestir(token, { yaz: true });
    return "**🔗 Eşleştirme**\n\n" + r.satirlar.join("\n")
      + (r.cift.length ? "\n\nSıradaki adım: `çek` yaz — makaraları okuyayım (hiçbir şey yazmam)." : "");
  }
  const yaz = k.is === "yaz";
  const r = await cekimYap(token, { yaz });
  const bas = yaz ? "**💾 Çekim — kaydedildi**" : "**👀 Çekim — yalnız gösteriyorum**";
  const alt = r.hata ? ("\n\n❌ " + r.hata)
    : (yaz ? ("\n\n" + r.yazilan + " makine güncellendi.")
      : "\n\nDoğru görünüyorsa `yaz` de, Tikita'ya kaydedeyim.");
  const uyari = r.eslesmeyen.length
    ? "\n\n⚠️ " + r.eslesmeyen.length + " makara tanınmadı. Panelde makinenin makara sayfasını aç, "
      + "turuncu bloktaki makaraya dokun, hangi filament olduğunu seç — bir daha sorulmaz."
    : "";
  return bas + "\n\n" + r.satirlar.join("\n") + alt + uyari;
}

try {
  const cevap = await calis();
  if (cevap) await yorumla(cevap);
} catch (e) {
  console.error(e);
  if (konu.number) await yorumla("❌ Beklenmedik hata: `" + String(e.message).slice(0, 300) + "`");
  process.exitCode = 1;
}
