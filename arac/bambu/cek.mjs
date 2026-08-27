/* 🖨 Bambu buluttan makinelerdeki makaraları çekip Tikita'ya yazar.
     BAMBU_TOKEN=... node cek.mjs --kuru     (yalnız göster, yazma)
     BAMBU_TOKEN=... node cek.mjs            (Firestore'a yaz)
   Yazdığı tek alan makineler/<id>.takiliMakara (ve bambu izleri). Tanınmayan
   makara varsa o yuvaya DOKUNULMAZ, makine kaydında bambuEslesmeyen olarak
   bildirilir; panelden bir kez bağlanınca sonraki çekimlerde tanınır. */
import { koleksiyon, guncelle, FS_PROJE } from "./firestore.mjs";
import { makineEsle } from "./esle.mjs";
import { bambuAmsOku, bambuEsle, bambuYuvaCevir, bambuOzet } from "../../public/lib/bambu-ams.js";

const kuru = process.argv.includes("--kuru");
const token = process.env.BAMBU_TOKEN || "";
if (!token) { console.error("✗ BAMBU_TOKEN tanımlı değil — önce: node giris.mjs"); process.exit(1); }

/* bulut katmanı mqtt paketine dayanıyor — kurulmadıysa anlaşılır uyar */
let cihazlar, amsRaporlari, tokenCoz;
try { ({ cihazlar, amsRaporlari, tokenCoz } = await import("./bulut.mjs")); }
catch (e) {
  console.error("✗ Bağımlılık eksik — arac/bambu içinde: npm install");
  console.error("  (" + e.message.split("\n")[0] + ")");
  process.exit(1);
}

const c = tokenCoz(token);
if (c.bitis && c.bitis < Date.now()) {
  console.error("✗ Token süresi dolmuş (" + new Date(c.bitis).toLocaleString("tr-TR")
    + ") — node giris.mjs --tazele"); process.exit(1);
}

const zaman = new Date().toISOString();
console.log("🔗 Bambu bulut · proje " + FS_PROJE + (kuru ? " · KURU ÇALIŞMA (yazmaz)" : ""));

const [cihaz, makineler, filamentler] = await Promise.all([
  cihazlar(token), koleksiyon("makineler"), koleksiyon("filament"),
]);
console.log("   " + cihaz.length + " yazıcı · " + makineler.length + " makine kaydı · "
  + filamentler.length + " filament");

const { cift, bosta, eslesmeyenMakine } = makineEsle(cihaz, makineler);
bosta.forEach((x) => console.log("   ⚠ eşleşmedi: " + x.ad + " (" + x.seri + ")"));
eslesmeyenMakine.forEach((m) => console.log("   · yazıcısı bulunamadı: " + (m.ad || m.id)));
if (!cift.length) { console.error("✗ Eşleşen makine yok — makine kayıtlarına bambuSeri yaz"); process.exit(1); }

const seriler = cift.filter((x) => x.cihaz.cevrimici).map((x) => x.cihaz.seri);
cift.filter((x) => !x.cihaz.cevrimici)
  .forEach((x) => console.log("   · çevrimdışı, atlandı: " + x.cihaz.ad));
if (!seriler.length) { console.error("✗ Çevrimiçi yazıcı yok"); process.exit(1); }

console.log("   " + seriler.length + " yazıcı sorgulanıyor…");
const raporlar = await amsRaporlari(token, seriler, {});

let yazilan = 0;
for (const { cihaz: cz, makine: mk } of cift) {
  const rapor = raporlar[cz.seri];
  if (!rapor) { console.log("   ⏳ yanıt yok: " + cz.ad); continue; }
  const yuvalar = bambuAmsOku(rapor);
  const esli = bambuEsle(yuvalar, filamentler);
  const mevcut = Array.isArray(mk.takiliMakara) ? mk.takiliMakara : [];
  /* mevcut diziyi yuva adresine göre aç — panelin makYuvalar'ı ile aynı kural */
  const M = [null, null, null, null];
  mevcut.forEach((x, i) => {
    if (!x || !x.filamentId) return;
    const y = Number.isInteger(x.yuva) ? x.yuva : i;
    if (y >= 0 && y < 4 && !M[y]) M[y] = x;
  });
  const r = bambuYuvaCevir(esli, M, { zaman });

  const ad = (fid) => { const f = filamentler.find((x) => x.id === fid); return f ? (f.kod || f.ad || fid) : fid; };
  console.log("\n   🖨 " + (mk.ad || mk.id) + "  ←  " + cz.ad);
  r.yuvalar.forEach((y, i) => console.log("      " + (i + 1) + ". " + (y ? ad(y.filamentId)
    + (y.olculdu ? ("  ~" + Math.max(0, y.olcum - y.harcanan) + " g") : "")
    + (y.kaynak === "bambu" ? "" : "  (elde kalan)") : "boş")));
  r.eslesmeyen.forEach((x) => console.log("      ⚠ " + (x.yuva + 1) + ". yuva tanınmadı: "
    + x.tur + " #" + x.renkHex + (x.marka ? (" · " + x.marka) : "")));
  console.log("      " + bambuOzet(r));

  if (kuru) continue;
  const kirp = (() => { const Y = r.yuvalar.slice(0, 4); let s = 3; while (s >= 0 && !Y[s]) s--; return Y.slice(0, s + 1); })();
  await guncelle("makineler", mk.id, {
    takiliMakara: kirp,
    takiliFilament: kirp.filter(Boolean).map((x) => x.filamentId),
    bambuSeri: cz.seri,
    bambuTarih: zaman,
    bambuEslesmeyen: r.eslesmeyen,
  });
  yazilan++;
}

console.log("\n" + (kuru ? "Kuru çalışma bitti — hiçbir şey yazılmadı." : (yazilan + " makine güncellendi.")));
