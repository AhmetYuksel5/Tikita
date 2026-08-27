/* 🔗 Bambu cihazı ↔ Tikita makinesi eşleştirmesi.
   Sırayla: makine kaydındaki bambuSeri → seri numarası adın içinde → ad benzerliği.
   Hiçbiri tutmazsa eşleşmez ve o cihaz atlanır (yanlış makineye yazmaktansa hiç yazma). */
const sad = (x) => String(x == null ? "" : x)
  .toLocaleLowerCase("tr").replace(/[^0-9a-zçğıöşü]+/g, "");

export function makineEsle(cihazlar, makineler) {
  const M = (makineler || []).filter((m) => m && m.id);
  const kullanilan = {};
  const cift = [];
  const bosta = [];
  (cihazlar || []).forEach((c) => {
    const seri = String((c && c.seri) || "").trim();
    let m = null;
    if (seri) m = M.find((x) => !kullanilan[x.id] && String(x.bambuSeri || "").trim() === seri) || null;
    if (!m && seri) m = M.find((x) => !kullanilan[x.id] && sad(x.ad).indexOf(sad(seri)) >= 0) || null;
    if (!m && c && c.ad) {
      const ca = sad(c.ad);
      m = M.find((x) => !kullanilan[x.id] && sad(x.ad) === ca) || null;
      if (!m) m = M.find((x) => !kullanilan[x.id] && ca && (sad(x.ad).indexOf(ca) >= 0 || ca.indexOf(sad(x.ad)) >= 0)) || null;
    }
    if (m) { kullanilan[m.id] = 1; cift.push({ cihaz: c, makine: m }); }
    else bosta.push(c);
  });
  return { cift, bosta, eslesmeyenMakine: M.filter((x) => !kullanilan[x.id]) };
}
