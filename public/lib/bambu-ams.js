/* 🖨 BAMBU AMS OKUMA — yazıcının bildirdiği makara bilgisini Tikita yuvalarına çevirir.
 *
 * Bambu raporu (MQTT "device/<seri>/report" ya da pushall yanıtı) şu biçimdedir:
 *   print.ams.ams[0].tray[0..3]  → AMS yuvaları
 *   print.vt_tray                → dış (harici) makara
 * Bir yuva kaydında işimize yarayanlar:
 *   tray_type        "PLA" / "PETG" / ""      (boşsa yuva boş)
 *   tray_color       "RRGGBBAA"               ("00000000" → boş)
 *   tray_sub_brands  "PLA Basic"
 *   tray_uuid        makaranın RFID kimliği (Bambu makarasında dolu, ötekinde sıfır)
 *   remain           0-100 kalan yüzdesi; RFID'siz makarada -1
 *
 * ⚠ Tikita'nın Bambu'da OLMAYAN bilgileri var: o makaradan kaç gram basıldığı
 * (harcanan) ve elle tartım (olcum). Çekim bunları EZMEZ — yuvadaki makara
 * aynıysa iz korunur, makara değiştiyse sıfırlanır.
 */
const YUVA_SAYI = 4;

const sayi = (x) => { const n = parseFloat(String(x == null ? "" : x).replace(",", ".")); return isNaN(n) ? 0 : n; };
const yazi = (x) => String(x == null ? "" : x).trim();

/* "RRGGBBAA" → "RRGGBB"; boş/şeffaf renk "" döner */
export function bambuRenk(x) {
  const h = yazi(x).replace(/^#/, "").toUpperCase();
  if (!/^[0-9A-F]{6,8}$/.test(h)) return "";
  const rgb = h.slice(0, 6);
  if (h.length === 8 && h.slice(6) === "00") return "";   // tamamen şeffaf = boş yuva
  return rgb;
}

/* Bir tray kaydı boş mu — tür yoksa ya da renk yoksa makara yok demektir */
function trayBos(t) {
  if (!t || typeof t !== "object") return true;
  return !yazi(t.tray_type) && !bambuRenk(t.tray_color);
}

/* tek bir tray → normalleşmiş yuva kaydı */
function trayOku(t, yuva) {
  if (trayBos(t)) return { yuva, bos: true, tur: "", renkHex: "", marka: "", ad: "", uuid: "", kalanYuzde: null, ruloGram: 0 };
  const tur = yazi(t.tray_type).toUpperCase();
  const renkHex = bambuRenk(t.tray_color);
  const marka = yazi(t.tray_sub_brands);
  const uuidHam = yazi(t.tray_uuid).toUpperCase();
  /* sıfırlardan oluşan uuid "RFID okunmadı" demektir, kimlik sayılmaz */
  const uuid = /^0*$/.test(uuidHam) ? "" : uuidHam;
  const r = sayi(t.remain);
  return {
    yuva, bos: false, tur, renkHex, marka,
    ad: (marka || tur) + (renkHex ? (" #" + renkHex) : ""),
    uuid,
    kalanYuzde: (r >= 0 && r <= 100 && yazi(t.remain) !== "") ? Math.round(r) : null,
    ruloGram: Math.max(0, Math.round(sayi(t.tray_weight))),
  };
}

/* Rapordan bir makinenin 4 yuvası. AMS yoksa dış makara 1. yuvaya konur. */
export function bambuAmsOku(rapor) {
  const p = (rapor && (rapor.print || rapor)) || {};
  const uniteler = (p.ams && Array.isArray(p.ams.ams)) ? p.ams.ams : [];
  const ilk = uniteler[0];
  const out = [];
  if (ilk && Array.isArray(ilk.tray)) {
    for (let i = 0; i < YUVA_SAYI; i++) {
      const t = ilk.tray.find((x) => x && String(x.id) === String(i));
      out.push(trayOku(t, i));
    }
    return out;
  }
  /* AMS yok — yalnız dış makara */
  for (let i = 0; i < YUVA_SAYI; i++) out.push(trayOku(i === 0 ? p.vt_tray : null, i));
  return out;
}

/* rapor gerçekten AMS/makara bilgisi taşıyor mu — boş "heartbeat" mesajlarını ele */
export function bambuRaporDolu(rapor) {
  const p = (rapor && (rapor.print || rapor)) || {};
  if (p.ams && Array.isArray(p.ams.ams) && p.ams.ams.length) return true;
  return !!p.vt_tray;
}

/* ————— eşleştirme —————
 * Bambu yuvası hangi Tikita filamentine denk geliyor? Sırayla:
 *   1) filamentte kayıtlı bambuUuid  (makaranın RFID kimliği — en kesini)
 *   2) filamentte kayıtlı bambuKod   ("PLA|FF0000" — kullanıcı bir kez bağlar)
 *   3) tür + renk kodu birebir tutuyorsa
 * Hiçbiri tutmazsa eşleşmemiş sayılır; kullanıcı bir kez bağlayınca 2 çalışır.
 */
export const bambuKod = (tur, renkHex) => (yazi(tur).toUpperCase() + "|" + yazi(renkHex).toUpperCase());

const flRenkHex = (f) => yazi(f && (f.renkHex || f.renkKodu)).replace(/^#/, "").toUpperCase();
const flTuru = (f) => yazi(f && f.tur).toUpperCase();

export function bambuEsle(yuvalar, filamentler) {
  const F = (filamentler || []).filter((f) => f && f.id);
  const uuidMap = {}, kodMap = {};
  F.forEach((f) => {
    yazi(f.bambuUuid).toUpperCase().split(/[,\s]+/).filter(Boolean)
      .forEach((u) => { if (!uuidMap[u]) uuidMap[u] = f.id; });
    const k = yazi(f.bambuKod).toUpperCase();
    if (k && !kodMap[k]) kodMap[k] = f.id;
  });
  return (yuvalar || []).map((y) => {
    if (y.bos) return { ...y, filamentId: "", nasil: "" };
    if (y.uuid && uuidMap[y.uuid]) return { ...y, filamentId: uuidMap[y.uuid], nasil: "uuid" };
    const k = bambuKod(y.tur, y.renkHex);
    if (kodMap[k]) return { ...y, filamentId: kodMap[k], nasil: "kod" };
    const t = F.find((f) => flTuru(f) === y.tur && flRenkHex(f) && flRenkHex(f) === y.renkHex);
    if (t) return { ...y, filamentId: t.id, nasil: "renk" };
    return { ...y, filamentId: "", nasil: "" };
  });
}

/* ————— Tikita yuvalarına çevir —————
 * mevcut: makinenin şu anki takiliMakara okuması (makYuvalar çıktısı, 4 uzunluk).
 * Aynı yuvada aynı filament duruyorsa harcanan/ölçüm izi KORUNUR; makara
 * değiştiyse yeni makara sıfır harcamayla başlar. Eşleşmeyen yuva, elde ne varsa
 * ona dokunmadan bırakılır — yanlış veriyle mevcut kaydı bozmayız.
 */
export function bambuYuvaCevir(esli, mevcut, secenek) {
  const o = secenek || {};
  const M = Array.isArray(mevcut) ? mevcut : [];
  const zaman = yazi(o.zaman) || new Date().toISOString();
  const out = [];
  const eslesmeyen = [];
  for (let i = 0; i < YUVA_SAYI; i++) {
    const y = (esli || []).find((x) => x && x.yuva === i) || null;
    const eski = M[i] || null;
    if (!y) { out.push(eski); continue; }
    if (y.bos) { out.push(null); continue; }               // Bambu "yuva boş" diyor
    if (!y.filamentId) {                                    // tanınmayan makara
      eslesmeyen.push({ yuva: i, tur: y.tur, renkHex: y.renkHex, marka: y.marka, uuid: y.uuid });
      out.push(eski);                                       // mevcut kayda dokunma
      continue;
    }
    const ayni = !!eski && eski.filamentId === y.filamentId
      && (!y.uuid || !yazi(eski.bambuUuid) || yazi(eski.bambuUuid).toUpperCase() === y.uuid);
    const kayit = {
      filamentId: y.filamentId, yuva: i,
      tam: ayni ? !!eski.tam : true,
      harcanan: ayni ? Math.max(0, Math.round(sayi(eski.harcanan))) : 0,
      tarih: ayni ? (yazi(eski.tarih) || zaman) : zaman,
      olculdu: ayni ? !!eski.olculdu : false,
      olcum: ayni ? Math.max(0, Math.round(sayi(eski.olcum))) : 0,
      olcumTarih: ayni ? yazi(eski.olcumTarih) : "",
      kaynak: "bambu", bambuTarih: zaman,
      ...(y.uuid ? { bambuUuid: y.uuid } : {}),
    };
    /* 📶 Bambu kalan yüzdesi yalnız RFID'li makarada gelir. Elle tartım varsa ona
       dokunulmaz — tartı her zaman daha doğrudur. Tartım yoksa yüzde ölçüm sayılır. */
    if (y.kalanYuzde != null && !kayit.olculdu) {
      const rulo = y.ruloGram > 0 ? y.ruloGram : sayi(o.ruloGram) || 1000;
      kayit.olculdu = true;
      kayit.olcum = Math.round(rulo * y.kalanYuzde / 100);
      kayit.harcanan = 0;
      kayit.olcumTarih = zaman;
      kayit.bambuYuzde = y.kalanYuzde;
    }
    out.push(kayit);
  }
  return { yuvalar: out, eslesmeyen };
}

/* Çekimin özeti — ekranda ve günlükte tek satır */
export function bambuOzet(sonuc) {
  const Y = (sonuc && sonuc.yuvalar) || [];
  const dolu = Y.filter(Boolean).length;
  const es = ((sonuc && sonuc.eslesmeyen) || []).length;
  return dolu + " yuva okundu" + (es ? (" · " + es + " makara tanınmadı") : "");
}

export { YUVA_SAYI as BAMBU_YUVA_SAYI };
