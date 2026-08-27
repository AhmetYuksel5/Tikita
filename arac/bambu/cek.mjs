/* 🖨 Bambu buluttan makinelerdeki makaraları çekip Tikita'ya yazar.
     node cek.mjs --kuru     (yalnız göster, yazma)
     node cek.mjs            (Firestore'a yaz)
   Token BAMBU_TOKEN'dan ya da şifreli oturumdan (BAMBU_SIFRE) gelir.
   Yazdığı tek yer makineler/<id> içindeki makara alanları. Tanınmayan makara
   varsa o yuvaya DOKUNULMAZ, bambuEslesmeyen olarak bildirilir. */
import { tokenAl } from "./oturum.mjs";

const kuru = process.argv.includes("--kuru");

let token;
try { token = await tokenAl(); }
catch (e) { console.error("✗ " + e.message); process.exit(1); }

let cekimYap;
try { ({ cekimYap } = await import("./cekirdek.mjs")); }
catch (e) {
  console.error("✗ Bağımlılık eksik — arac/bambu içinde: npm install");
  console.error("  (" + e.message.split("\n")[0] + ")");
  process.exit(1);
}

const r = await cekimYap(token, { yaz: !kuru });
r.satirlar.forEach((s) => console.log(s.replace(/\*\*/g, "").replace(/`/g, "")));
if (r.hata) { console.error("\n✗ " + r.hata); process.exit(1); }
console.log("\n" + (kuru ? "Kuru çalışma bitti — hiçbir şey yazılmadı." : (r.yazilan + " makine güncellendi.")));
