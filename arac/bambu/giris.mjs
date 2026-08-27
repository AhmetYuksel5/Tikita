/* Bambu bulut girişi — bir kez çalıştırılır, çıkan token saklanır.
     node giris.mjs                     (e-posta ve şifre sorulur)
     node giris.mjs --tazele            (BAMBU_REFRESH ile token yeniler)
   Çıktı: BAMBU_TOKEN ve BAMBU_REFRESH satırları. Bunları GitHub Secrets'a ya da
   .env dosyasına koy; şifre hiçbir yere yazılmaz. */
import readline from "node:readline/promises";
import { girisDene, kodGonder, kodlaGir, tokenTazele, tokenCoz, cihazlar } from "./bulut.mjs";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const sor = (s) => rl.question(s);

function yaz(d) {
  const t = d.accessToken || "";
  const c = tokenCoz(t);
  console.log("\n── Bunları sakla ──");
  console.log("BAMBU_TOKEN=" + t);
  if (d.refreshToken) console.log("BAMBU_REFRESH=" + d.refreshToken);
  if (c.bitis) console.log("# geçerlilik: " + new Date(c.bitis).toLocaleString("tr-TR"));
  console.log("# mqtt kullanıcı: " + c.kullanici);
}

try {
  if (process.argv.includes("--tazele")) {
    const r = process.env.BAMBU_REFRESH;
    if (!r) throw new Error("BAMBU_REFRESH tanımlı değil");
    yaz(await tokenTazele(r));
    rl.close(); process.exit(0);
  }

  const hesap = (await sor("Bambu e-posta: ")).trim();
  const sifre = (await sor("Şifre (boş bırakırsan e-postana kod gelir): ")).trim();

  let d = {};
  if (sifre) {
    d = await girisDene(hesap, sifre);
  } else {
    await kodGonder(hesap);
    console.log("E-postana kod gönderildi.");
    d = { loginType: "verifyCode" };
  }

  if (!d.accessToken) {
    if (d.tfaKey) {
      const k = (await sor("Doğrulama uygulamasındaki 6 haneli kod: ")).trim();
      d = await kodlaGir(hesap, k, d.tfaKey);
    } else {
      if (sifre && d.loginType === "verifyCode") { await kodGonder(hesap); console.log("E-postana kod gönderildi."); }
      const k = (await sor("E-postaya gelen kod: ")).trim();
      d = await kodlaGir(hesap, k, "");
    }
  }
  if (!d.accessToken) throw new Error("Token alınamadı — yanıt: " + JSON.stringify(d).slice(0, 200));

  yaz(d);
  const L = await cihazlar(d.accessToken);
  console.log("\n── Hesaptaki yazıcılar ──");
  L.forEach((x) => console.log("  " + x.seri + "  " + x.ad + "  " + x.model
    + (x.cevrimici ? "  ✓ çevrimiçi" : "  · çevrimdışı")));
  console.log("\nMakine kayıtlarına bambuSeri alanını bu seri numaralarıyla doldur "
    + "(ya da makine adları zaten tutuyorsa gerekmez).");
} catch (e) {
  console.error("\n✗ " + e.message);
  process.exitCode = 1;
} finally { rl.close(); }
