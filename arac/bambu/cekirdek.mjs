/* ⚙️ Çekim çekirdeği — hem komut satırı (cek.mjs) hem GitHub bot'u (bot.mjs)
   buradan geçer, ikisi de aynı raporu üretir. Ekrana hiçbir şey basmaz;
   satırları döndürür. */
import { koleksiyon, guncelle, FS_PROJE } from "./firestore.mjs";
import { makineEsle } from "./esle.mjs";
import { bambuAmsOku, bambuEsle, bambuYuvaCevir, bambuOzet } from "../../public/lib/bambu-ams.js";

/* mevcut takiliMakara dizisini yuva adresine aç — panelin makYuvalar kuralı */
function mevcutYuvalar(mk) {
  const M = [null, null, null, null];
  (Array.isArray(mk.takiliMakara) ? mk.takiliMakara : []).forEach((x, i) => {
    if (!x || !x.filamentId) return;
    const y = Number.isInteger(x.yuva) ? x.yuva : i;
    if (y >= 0 && y < 4 && !M[y]) M[y] = x;
  });
  return M;
}
const kirp = (Y4) => { const Y = Y4.slice(0, 4); let s = 3; while (s >= 0 && !Y[s]) s--; return Y.slice(0, s + 1); };

/* Yazıcı ↔ makine eşleşmelerini bulur; seriyi makine kaydına yazabilir. */
export async function eslestir(token, { yaz } = {}) {
  const { cihazlar } = await import("./bulut.mjs");
  const [cihaz, makineler] = await Promise.all([cihazlar(token), koleksiyon("makineler")]);
  const r = makineEsle(cihaz, makineler);
  const S = [];
  S.push(cihaz.length + " yazıcı · " + makineler.length + " makine kaydı");
  for (const { cihaz: cz, makine: mk } of r.cift) {
    const vardi = mk.bambuSeri === cz.seri;
    if (yaz && !vardi) await guncelle("makineler", mk.id, { bambuSeri: cz.seri });
    S.push("✅ **" + (mk.ad || mk.id) + "** ← " + cz.ad + " `" + cz.seri + "`"
      + (cz.cevrimici ? "" : " · çevrimdışı") + (vardi ? "" : (yaz ? " · seri yazıldı" : " · seri yazılacak")));
  }
  r.bosta.forEach((x) => S.push("⚠️ eşleşmedi: " + x.ad + " `" + x.seri + "`"));
  r.eslesmeyenMakine.forEach((m) => S.push("· yazıcısı bulunamadı: " + (m.ad || m.id)));
  return { satirlar: S, cift: r.cift, bosta: r.bosta };
}

/* Makaraları okur; yaz=false ise hiçbir şey yazmaz. */
export async function cekimYap(token, { yaz } = {}) {
  const { cihazlar, amsRaporlari } = await import("./bulut.mjs");
  const zaman = new Date().toISOString();
  const S = [];
  const [cihaz, makineler, filamentler] = await Promise.all([
    cihazlar(token), koleksiyon("makineler"), koleksiyon("filament"),
  ]);
  S.push("proje `" + FS_PROJE + "` · " + cihaz.length + " yazıcı · " + makineler.length
    + " makine · " + filamentler.length + " filament" + (yaz ? "" : " · **kuru çalışma**"));

  const { cift, bosta, eslesmeyenMakine } = makineEsle(cihaz, makineler);
  bosta.forEach((x) => S.push("⚠️ eşleşmedi: " + x.ad + " `" + x.seri + "`"));
  eslesmeyenMakine.forEach((m) => S.push("· yazıcısı bulunamadı: " + (m.ad || m.id)));
  if (!cift.length) return { satirlar: S, hata: "Eşleşen makine yok — önce `eşle` yaz", yazilan: 0, eslesmeyen: [] };

  const acik = cift.filter((x) => x.cihaz.cevrimici);
  cift.filter((x) => !x.cihaz.cevrimici).forEach((x) => S.push("· çevrimdışı, atlandı: " + x.cihaz.ad));
  if (!acik.length) return { satirlar: S, hata: "Çevrimiçi yazıcı yok", yazilan: 0, eslesmeyen: [] };

  const raporlar = await amsRaporlari(token, acik.map((x) => x.cihaz.seri), {});
  const ad = (fid) => { const f = filamentler.find((x) => x.id === fid); return f ? (f.kod || f.ad || fid) : fid; };

  let yazilan = 0; const eslesmeyen = [];
  for (const { cihaz: cz, makine: mk } of acik) {
    const rapor = raporlar[cz.seri];
    if (!rapor) { S.push("⏳ yanıt yok: " + cz.ad); continue; }
    const r = bambuYuvaCevir(bambuEsle(bambuAmsOku(rapor), filamentler), mevcutYuvalar(mk), { zaman });

    S.push("");
    S.push("**🖨 " + (mk.ad || mk.id) + "**  ←  " + cz.ad);
    const bilinmez = {};
    r.eslesmeyen.forEach((x) => { bilinmez[x.yuva] = x; eslesmeyen.push({ makine: mk.ad || mk.id, ...x }); });
    r.yuvalar.forEach((y, i) => {
      const b = bilinmez[i];
      S.push("  " + (i + 1) + ". " + (y
        ? ad(y.filamentId) + (y.olculdu ? ("  ~" + Math.max(0, y.olcum - y.harcanan) + " g") : "")
          + (y.kaynak === "bambu" ? "" : "  (elde kalan)")
        : (b ? "⚠️ tanınmadı — " + b.tur + " #" + b.renkHex + (b.marka ? (" · " + b.marka) : "") : "boş")));
      if (b && y) S.push("     ⚠️ tanınmadı — " + b.tur + " #" + b.renkHex + " · kayda dokunulmadı");
    });
    S.push("  " + bambuOzet(r));

    if (!yaz) continue;
    const K = kirp(r.yuvalar);
    await guncelle("makineler", mk.id, {
      takiliMakara: K,
      takiliFilament: K.filter(Boolean).map((x) => x.filamentId),
      bambuSeri: cz.seri, bambuTarih: zaman, bambuEslesmeyen: r.eslesmeyen,
    });
    yazilan++;
  }
  return { satirlar: S, yazilan, eslesmeyen, hata: "" };
}
