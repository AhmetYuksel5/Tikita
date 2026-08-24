/* admin.html içindeki <script type="module"> gövdesini çıkarıp node --check ile
   sınar. Dosyada birden çok </script> olduğu için satır numarasıyla kesmek
   kırılgandı (SW kaydı eklendikten sonra yanlış bloğu kesiyordu).
   Koştur: node scratchpad/sozdizim.js [dosya...] */
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const dosyalar = process.argv.slice(2).length ? process.argv.slice(2)
  : ["public/admin.html", "public/index.html", "public/deneme.html", "public/montaj.html", "public/finans.html"];
let hata = 0;
for (const d of dosyalar) {
  const p = path.join(__dirname, "..", d);
  if (!fs.existsSync(p)) { console.log("  yok:", d); continue; }
  const s = fs.readFileSync(p, "utf8");
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let m, n = 0;
  while ((m = re.exec(s))) {
    if (/\bsrc\s*=/.test(m[1])) continue;              // dış dosya — gövde yok
    const modul = /type\s*=\s*["']module["']/.test(m[1]);
    const gecici = path.join(os.tmpdir(), "sd_" + n + (modul ? ".mjs" : ".cjs"));
    fs.writeFileSync(gecici, m[2]);
    const r = cp.spawnSync(process.execPath, ["--check", gecici], { encoding: "utf8" });
    if (r.status !== 0) { hata = 1; console.log("  ✗ " + d + " betik#" + n + "\n" + r.stderr.split("\n").slice(0, 6).join("\n")); }
    fs.unlinkSync(gecici); n++;
  }
  console.log((hata ? "  " : "  ✓ ") + d + " — " + n + " gömülü betik denetlendi");
}
console.log(hata ? "✗ SÖZDİZİMİ HATASI" : "✓ sözdizimi temiz");
process.exit(hata);
