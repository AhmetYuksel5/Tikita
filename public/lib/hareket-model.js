/* ═══════════════════════════════════════════════════════════════════════════
   TİKİTA HAREKET MODELİ — kanonik 4-tür defter katmanı (SAF MODÜL)

   SATIŞ · TAHSİLAT · MASRAF · ÖDEME — her iş bir harekettir; raporlar bu
   satırlardan CANLI türer. Geçmiş bir kayıt düzeltilince buradan geçen her
   rapor kendiliğinden düzelir (saklanan agregat YOKTUR).

   BU DOSYA FIREBASE IMPORT ETMEZ, DOM KULLANMAZ, Date.now ÇAĞIRMAZ —
   veri dizileri alır, kanonik satırlar döndürür. Node testleri
   (scratchpad/harekettest.js) gerçek gövdeyi sentetik veriyle koşar.

   Kaynak koleksiyonlar YERİNDE KALIR (fiziksel göç YOK — hakem kararı):
   adapterler yalnız YETKİLİ koleksiyondan satır üretir, `ref` uzayı
   finans.html defterUret ile ortaktır ("har:", "gid:", "sab:", "mg:").
   cakismaRapor'un 5 çift-kayıt kararı burada kural olarak gömülüdür:
   stok_hareket HİÇBİR adapterde mali satır üretmez.
   ═══════════════════════════════════════════════════════════════════════════ */

export const HM_SURUM = "1";

/* Hakediş düzeni kesim tarihi — TEK KAYNAK. admin/deneme/finans'taki üç kopya
   geçiş süresince durur; YENİ kod yalnız burayı okur. */
export const HAKEDIS_BAS = "2026-08-08";
export const HAKEDIS_BAS_MS = new Date(HAKEDIS_BAS + "T00:00:00").getTime();

const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
const r2 = v => Math.round(num(v) * 100) / 100;
const ms = t => { const v = new Date(t).getTime(); return isFinite(v) ? v : 0; };

/* ── dönem yardımcıları ─────────────────────────────────────────────────── */
// Hakediş haftası: CUMARTESİ 00:00 → CUMA 23:59 (admin/deneme haftaBasMs birebir)
export function haftaBasMs(t) {
  const d = new Date(t); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7));
  return d.getTime();
}
export function haftaKod(t) {
  const b = new Date(haftaBasMs(t));
  return b.getFullYear() + "-" + String(b.getMonth() + 1).padStart(2, "0") + "-" + String(b.getDate()).padStart(2, "0");
}
export const ayKod = t => { const d = new Date(t);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };

/* ── ödeme/masraf tür ayrımı (gider koleksiyonu) ────────────────────────── */
export const ODEME_GIDER_TUR = { "Pazarlamacı hakedişi": "hakedis", "Montaj işçiliği": "montajIscilik" };
export const STOK_ALIM_TUR = { "Filament alımı": 1, "Sarf malzemesi alımı": 1, "Yedek parça alımı": 1 };

/* ─────────────────────────────────────────────────────────────────────────
   ETKİ TABLOSU — satırın kasa/cari/K-Z etkisi TÜRDEN türetilir; satırda
   borc/alacak SAKLANMAZ (çift-yazım tutarsızlık yüzeyi açar — A kararı).

   kasa:   +1 kasaya girer · -1 çıkar · 0 nakit etkisi yok (tahakkuk)
   kasaYeri(satir): HAKEDIS_BAS sonrası saha tahsilatı pazarlamacının
                    elindedir ("saha"); nakitTeslim sahadan merkeze taşır.
   musteriCari: +1 müşteri borçlanır · -1 borcu düşer
   perCari:     +1 personele borç tahakkuku · -1 personele ödeme
   pivot: dönem K/Z pivotuna girer mi (TAHAKKUK ilkesi: TAHSİLAT ve ÖDEME
          nakit hareketidir, dönem kâr/zararına GİRMEZ — bilinçli karar)
   ───────────────────────────────────────────────────────────────────────── */
export function etki(s) {
  const t = s.tur, a = s.altTur;
  if (t === "SATIS") {
    // NAKİT HER ZAMAN TAHSİLAT SATIRINDAN GİRER — peşin satışta bile kasa etkisi
    // sentetik "pesin" tahsilat satırındadır; SATIŞ satırı kasaya dokunmaz.
    // (İkisi de +1 sayılsaydı peşin para ÇİFT sayılırdı.)
    if (s.pesin) return { kasa: 0, musteriCari: 0, perCari: 0, pivot: true };    // gerilla/stant: borç hiç doğmaz
    return { kasa: 0, musteriCari: +1, perCari: 0, pivot: true };                 // vadeli: kale borçlanır
  }
  if (t === "TAHSILAT") {
    if (a === "icTransfer") return { kasa: 0, musteriCari: 0, perCari: 0, pivot: false };  // saha→merkez, toplam nakit DEĞİŞMEZ
    if (a === "avans")      return { kasa: +1, musteriCari: 0, perCari: 0, pivot: false }; // sayımsız avans cariye mahsup edilmez
    if (a === "pesin")      return { kasa: +1, musteriCari: 0, perCari: 0, pivot: false }; // sentetik peşin — borç hiç doğmadı
    return { kasa: +1, musteriCari: -1, perCari: 0, pivot: false };
  }
  if (t === "MASRAF") {
    if (a === "tabla" || a === "montajIscilik")
      return { kasa: 0, musteriCari: 0, perCari: +1, pivot: true };   // tahakkuk — para sonra ÖDEME ile çıkar
    if (a === "numune")
      return { kasa: 0, musteriCari: 0, perCari: 0, pivot: true };    // maliyetten K/Z'ye
    return { kasa: -1, musteriCari: 0, perCari: 0, pivot: true };     // gider/sabit/stokAlim/vergi: ödeme anı=işlem anı
  }
  if (t === "ODEME") return { kasa: -1, musteriCari: 0, perCari: -1, pivot: false };
  return { kasa: 0, musteriCari: 0, perCari: 0, pivot: false };
}

/* Nakit hangi kasada? — "merkez" | "saha". Kesim (HAKEDIS_BAS) ÖNCESİ düzende
   saha kasası kavramı yok (para bölüşülüp anında teslim ediliyordu). */
export function kasaYeri(s) {
  if (s.tur === "TAHSILAT" || (s.tur === "SATIS" && s.pesin))
    return ms(s.tarih) >= HAKEDIS_BAS_MS ? "saha" : "merkez";
  return "merkez";
}

/* ─────────────────────────────────────────────────────────────────────────
   olayUret(D, opts) — kanonik satır üretimi.
   D: { hareketler, giderler, sabitGiderler, montajGorevler }
   opts.simdi ZORUNLU değil ama testte verilir (modül Date.now çağırmaz;
   verilmezse satır üretiminde "şimdi" gereken tek yer sabit_gider/ay sonu
   penceresi ve o zaman opts.simdi şarttır — tarayıcı tarafı Date.now verir).

   Dönen: { rows, uyari, sayim }
   - rows[].ref BENZERSİZDİR (Map bekçisi) — idempotens ve çift sayım engeli.
   - sentetik satırlar işaretlidir (sentetik:true) — mutabakatta ayrı kalem.
   ───────────────────────────────────────────────────────────────────────── */
export function olayUret(D, opts) {
  const O = opts || {};
  const simdi = O.simdi != null ? O.simdi : 0;
  const rows = [], uyari = [];
  const refMap = new Map();
  let sentetikN = 0, sentetikT = 0;

  const ekle = s => {
    if (refMap.has(s.ref)) { uyari.push("mükerrer ref atlandı: " + s.ref); return; }
    refMap.set(s.ref, 1);
    s.tutar = r2(s.tutar);
    rows.push(s);
  };
  const satir = (ref, tur, altTur, x, ek) => ({
    ref, tur, altTur,
    tarih: x.tarih || "", girildi: x.girildi || null,
    kullaniciId: x.kullaniciId || "", kullaniciAd: x.kullaniciAd || "",
    tarafTip: "", tarafId: "", tarafAd: "",
    urunId: x.urunId || "", urunAd: x.urunAd || "", adet: num(x.adet),
    birim: { satis: num(x.satisFiyat), veris: num(x.alisFiyat), maliyet: num(x.maliyetBirim) },
    tutar: 0, pesin: false, sentetik: false,
    kaynakKol: "", kaynakId: "",
    ...(ek || {})
  });
  const kale = x => ({ tarafTip: "musteri", tarafId: x.musteriId || (x.yer || "").trim(), tarafAd: (x.yer || "").trim() });
  const per = x => ({ tarafTip: "kullanici", tarafId: x.kullaniciId || "", tarafAd: x.kullaniciAd || "" });

  /* ══ pazarlama_hareket ══ */
  (D.hareketler || []).forEach(x => {
    if (!x || !x.id) return;
    const a = num(x.adet);

    if (x.tip === "satis") {
      if (a <= 0) return;
      const pesin = !!(x.gerilla || x.kaynak === "gerilla");
      const tutar = a * num(x.satisFiyat);
      ekle(satir("har:" + x.id, "SATIS", pesin ? "gerilla" : (x.kaynak === "konsinye" ? "konsinye" : "normal"), x,
        { ...kale(x), tutar, pesin, kaynakKol: "pazarlama_hareket", kaynakId: x.id }));
      if (pesin) {
        // ⚡ SENTETİK PEŞİN TAHSİLAT — gerilla satışın parası anında alınır; ayrı
        // tahsilat kaydı YOKTUR. Nakit görünümü tutarlı olsun diye har:<id>:t
        // ref'iyle işaretli satır üretilir (Ç5 koşulları: rozetli + mutabakatta
        // ayrı kalem + yalnız yeni rapor sekmesinde).
        const th = (x.tahsil == null) ? tutar : Math.max(0, Math.min(tutar, num(x.tahsil)));
        if (th > 0) {
          ekle(satir("har:" + x.id + ":t", "TAHSILAT", "pesin", x,
            { ...kale(x), tutar: th, sentetik: true, kaynakKol: "pazarlama_hareket", kaynakId: x.id }));
          sentetikN++; sentetikT += th;
        }
      }
      return;
    }

    if (x.tip === "stant") {
      const f = num(x.fiyat); if (f <= 0) return;
      if (x.mod === "hediye") {
        ekle(satir("har:" + x.id, "MASRAF", "numune", x,
          { ...kale(x), tutar: f, kaynakKol: "pazarlama_hareket", kaynakId: x.id }));
      } else {
        // Stant bedeli GELİRDİR (finans dersi: gider yazmak kârı 2× kaydırıyordu) ve PEŞİNDİR.
        ekle(satir("har:" + x.id, "SATIS", "stant", x,
          { ...kale(x), tutar: f, pesin: true, kaynakKol: "pazarlama_hareket", kaynakId: x.id }));
        ekle(satir("har:" + x.id + ":t", "TAHSILAT", "pesin", x,
          { ...kale(x), tutar: f, sentetik: true, kaynakKol: "pazarlama_hareket", kaynakId: x.id }));
        sentetikN++; sentetikT += f;
      }
      return;
    }

    if (x.tip === "tahsilat") {
      const t = num(x.tutar); if (t <= 0) return;
      ekle(satir("har:" + x.id, "TAHSILAT", x.avans ? "avans" : "normal", x,
        { ...kale(x), tutar: t, kaynakKol: "pazarlama_hareket", kaynakId: x.id }));
      return;
    }

    if (x.tip === "nakitTeslim") {
      const t = num(x.tutar); if (t <= 0) return;
      if (x.onay === false) return;   // teslim alınmadı — para hâlâ sahada, satır YOK (çift sayım engeli)
      ekle(satir("har:" + x.id, "TAHSILAT", "icTransfer", x,
        { ...per(x), tutar: t, kaynakKol: "pazarlama_hareket", kaynakId: x.id }));
      return;
    }

    if (x.tip === "tabla") {
      const t = num(x.tutar); if (t <= 0) return;
      ekle(satir("har:" + x.id, "MASRAF", "tabla", x,
        { ...per(x), tutar: t, kaynakKol: "pazarlama_hareket", kaynakId: x.id }));
      return;
    }

    if (x.tip === "tablaOde") {
      const t = num(x.tutar); if (t <= 0) return;
      ekle(satir("har:" + x.id, "ODEME", "tablaOde", x,
        { ...per(x), tutar: t, kaynakKol: "pazarlama_hareket", kaynakId: x.id }));
      return;
    }

    if (x.tip === "hediye") {
      if (a <= 0) return;
      const mal = num(x.maliyetBirim) * a;
      if (mal <= 0) uyari.push("hediye maliyeti bilinmiyor: " + (x.urunAd || x.id));
      ekle(satir("har:" + x.id, "MASRAF", "numune", x,
        { ...kale(x), tutar: mal, kaynakKol: "pazarlama_hareket", kaynakId: x.id }));
      return;
    }

    // diplomasi · al · konsinye · iade → MALİ HAREKET DEĞİLDİR (stok/ziyaret katmanı).
    // stok_hareket koleksiyonu da hiçbir adapterde okunmaz (5 çakışma kararı).
  });

  /* ══ gider — MASRAF ya da ÖDEME ══ */
  (D.giderler || []).forEach(g => {
    if (!g || !g.id) return;
    const t = num(g.tutar); if (t <= 0) return;
    const ot = ODEME_GIDER_TUR[g.tur];
    if (ot) {
      ekle(satir("gid:" + g.id, "ODEME", ot, g,
        { tarafTip: "kullanici", tarafId: g.kullaniciId || "", tarafAd: g.kullaniciAd || (g.aciklama || ""),
          tutar: t, kaynakKol: "gider", kaynakId: g.id }));
      return;
    }
    const altTur = STOK_ALIM_TUR[g.tur] || g.stok ? "stokAlim" : (g.tur === "Vergi" ? "vergi" : "isletme");
    ekle(satir("gid:" + g.id, "MASRAF", altTur, g,
      { tarafTip: "tedarikci", tarafAd: g.tur || "", tutar: t, kaynakKol: "gider", kaynakId: g.id }));
  });

  /* ══ sabit_gider — AY SONU sanal tahakkuk (finans kuralı: ay bitmeden tahakkuk yok) ══ */
  (D.sabitGiderler || []).forEach(s => {
    if (!s || !s.id) return;
    const t = num(s.tutar); if (t <= 0 || !s.baslangic) return;
    if (!simdi) { uyari.push("sabit_gider için opts.simdi verilmedi — sanal tahakkuk atlandı"); return; }
    let [y, m] = String(s.baslangic).split("-").map(Number); if (!y) return; m = (m || 1) - 1;
    for (let i = 0; i < 120; i++) {
      const ayk = y + "-" + String(m + 1).padStart(2, "0");
      if (s.bitis && ayk > s.bitis) break;
      const son = new Date(y, m + 1, 0, 23, 59, 59).getTime();
      if (son > simdi) break;
      ekle({ ref: "sab:" + s.id + ":" + ayk, tur: "MASRAF", altTur: "sabit",
        tarih: new Date(son).toISOString(), girildi: null,
        kullaniciId: "", kullaniciAd: "", tarafTip: "tedarikci", tarafId: "", tarafAd: s.tur || "Sabit gider",
        urunId: "", urunAd: "", adet: 0, birim: { satis: 0, veris: 0, maliyet: 0 },
        tutar: t, pesin: false, sentetik: false, kaynakKol: "sabit_gider", kaynakId: s.id,
        aciklama: (s.tur || "Sabit gider") + " · " + ayk });
      m++; if (m > 11) { m = 0; y++; }
    }
  });

  /* ══ montaj_gorev — İŞÇİLİK TAHAKKUKU (mg:<id>:h) ══
     Tabla ile simetri: MASRAF=tahakkuk (teslim×birimÜcret, personel carisi +),
     gider tur="Montaj işçiliği" = ÖDEME. Tahakkuk üretilmezse montaj işçiliği
     dönem K/Z'sinde hiç görünmezdi. Devir görevinin ÇIKIŞI zaten yok (fiziksel
     akış stok katmanının işi); teslim hakedişi devirde de gerçektir. */
  (D.montajGorevler || []).forEach(g => {
    if (!g || !g.id) return;
    const teslim = num(g.teslimAdet), bir = num(g.birimUcret);
    if (teslim <= 0 || bir <= 0) return;
    const tarih = g.teslimTarih || g.tarih || "";
    ekle({ ref: "mg:" + g.id + ":h", tur: "MASRAF", altTur: "montajIscilik",
      tarih, girildi: null,
      kullaniciId: g.kullaniciId || "", kullaniciAd: g.kullaniciAd || "",
      tarafTip: "kullanici", tarafId: g.kullaniciId || "", tarafAd: g.kullaniciAd || "",
      urunId: g.urunId || "", urunAd: g.urunAd || "", adet: teslim,
      birim: { satis: 0, veris: 0, maliyet: 0 },
      tutar: teslim * bir, pesin: false, sentetik: false,
      kaynakKol: "montaj_gorev", kaynakId: g.id });
  });

  /* ══ hakediş ⇄ gider köprü denetimi — yetkili kayıt GİDER'dir ══ */
  (D.hakedisDonemler || []).forEach(d => {
    if (!d) return;
    if (num(d.odenenTutar) > 0 && !d.giderId)
      uyari.push("ödenmiş görünen hakediş döneminin gider kaydı yok: " + (d.kullaniciAd || "") + " · " + (d.hafta || d.id || ""));
  });

  rows.sort((a, b) => (ms(a.tarih) - ms(b.tarih)) || String(a.ref).localeCompare(String(b.ref)));
  return { rows, uyari, sayim: { sentetikN, sentetikTutar: r2(sentetikT) } };
}

/* ─────────────────────────────────────────────────────────────────────────
   DÖNEM PİVOTU — tahakkuk raporu. TAHSİLAT/ÖDEME/içTransfer GİRMEZ (nakit
   hareketi ≠ dönem K/Z — bilinçli karar; nakit ayrı görünümde).
   birimAlan: "hafta" | "ay". Dönen: dönem→{satirlar kişi×kale×ürün, toplam}.
   ───────────────────────────────────────────────────────────────────────── */
export function donemPivot(rows, birimAlan) {
  const kodu = birimAlan === "ay" ? ayKod : haftaKod;
  const D = {};
  (rows || []).forEach(s => {
    if (!etki(s).pivot) return;
    const t = ms(s.tarih); if (!t) return;
    const k = kodu(t);
    const d = D[k] || (D[k] = { donem: k, satis: 0, satisAdet: 0, veris: 0, maliyet: 0, masraf: 0, kisi: {}, kale: {} });
    if (s.tur === "SATIS") {
      d.satis += s.tutar; d.satisAdet += num(s.adet);
      d.veris += num(s.adet) * num(s.birim && s.birim.veris);
      d.maliyet += num(s.adet) * num(s.birim && s.birim.maliyet);
      const kk = s.kullaniciAd || "?"; d.kisi[kk] = r2((d.kisi[kk] || 0) + s.tutar);
      const kl = s.tarafAd || "?"; d.kale[kl] = r2((d.kale[kl] || 0) + s.tutar);
    } else if (s.tur === "MASRAF") {
      d.masraf += s.tutar;
    }
  });
  return Object.values(D).map(d => ({ ...d,
    satis: r2(d.satis), veris: r2(d.veris), maliyet: r2(d.maliyet), masraf: r2(d.masraf),
    // Tikita kârı VERİLİŞ bedeli üzerinden (RaporA tkNet tanımıyla mutabık):
    tikitaKar: r2(d.veris - d.maliyet - d.masraf)
  })).sort((a, b) => b.donem.localeCompare(a.donem));
}

/* ─────────────────────────────────────────────────────────────────────────
   KALE (MÜŞTERİ) EKSTRESİ — yürüyen bakiye.
   Borç = peşin OLMAYAN satış tahakkuku · Alacak = normal tahsilat.
   Avans cariye MAHSUP EDİLMEZ (sayımsız — ayrı listelenir).
   KURAL: görünüm süzgeci satır GİZLER ama bakiyeyi YENİDEN HESAPLAMAZ —
   yürüyen bakiye burada, süzgeçten önce yazılır (ekstre sürekliliği).
   ───────────────────────────────────────────────────────────────────────── */
export function kaleAnahtar(s) { return (s.tarafAd || s.tarafId || "—").trim() || "—"; }
export function kaleEkstre(rows, kaleAd) {
  const L = (rows || []).filter(s =>
    kaleAnahtar(s) === kaleAd &&
    ((s.tur === "SATIS" && !s.pesin) || (s.tur === "TAHSILAT" && s.altTur === "normal") || (s.tur === "TAHSILAT" && s.altTur === "avans")));
  L.sort((a, b) => (ms(a.tarih) - ms(b.tarih)) || ((a.tur === "SATIS" ? 0 : 1) - (b.tur === "SATIS" ? 0 : 1)) || String(a.ref).localeCompare(String(b.ref)));
  let run = 0;
  const out = L.map(s => {
    const borc = (s.tur === "SATIS") ? s.tutar : 0;
    const alacak = (s.tur === "TAHSILAT" && s.altTur === "normal") ? s.tutar : 0;
    run = r2(run + borc - alacak);
    return { ...s, borc, alacak, bakiye: run, avansMi: s.altTur === "avans" };
  });
  return { rows: out, bakiye: run,
    avans: r2(L.filter(s => s.altTur === "avans").reduce((z, s) => z + s.tutar, 0)) };
}
export function kaleBakiyeleri(rows) {
  const M = {};
  (rows || []).forEach(s => {
    const e = etki(s); if (!e.musteriCari) return;
    const k = kaleAnahtar(s);
    M[k] = r2((M[k] || 0) + e.musteriCari * s.tutar);
  });
  return Object.entries(M).map(([kale, bakiye]) => ({ kale, bakiye }))
    .filter(x => Math.abs(x.bakiye) > 0.004 || true)
    .sort((a, b) => b.bakiye - a.bakiye);
}

/* ─────────────────────────────────────────────────────────────────────────
   PERSONEL CARİSİ — tabla + montaj işçiliği tahakkukları − ödemeler.
   (Satış-marjı hakedişi BURAYA GİRMEZ: onun yaşam döngüsü hakedis_donem
   belgesindedir — iki yerde iki farklı rakam üretmemek için.)
   ───────────────────────────────────────────────────────────────────────── */
export function personelCari(rows) {
  const M = {};
  (rows || []).forEach(s => {
    const e = etki(s); if (!e.perCari) return;
    const k = s.tarafAd || s.tarafId || "?";
    const o = M[k] || (M[k] = { kisi: k, tahakkuk: 0, odenen: 0 });
    if (e.perCari > 0) o.tahakkuk = r2(o.tahakkuk + s.tutar);
    else o.odenen = r2(o.odenen + s.tutar);
  });
  return Object.values(M).map(o => ({ ...o, kalan: r2(o.tahakkuk - o.odenen) }))
    .sort((a, b) => b.kalan - a.kalan);
}

/* ─────────────────────────────────────────────────────────────────────────
   NAKİT GÖRÜNÜMÜ — kasa hareketi (pivotun bilinçli dışında tuttuğu taraf).
   merkez/saha kırılımı; içTransfer toplamı DEĞİŞTİRMEZ, yalnız taşır.
   ───────────────────────────────────────────────────────────────────────── */
export function nakitOzet(rows) {
  let merkez = 0, saha = 0;
  (rows || []).forEach(s => {
    const e = etki(s);
    if (s.tur === "TAHSILAT" && s.altTur === "icTransfer") { saha = r2(saha - s.tutar); merkez = r2(merkez + s.tutar); return; }
    if (!e.kasa) return;
    const d = e.kasa * s.tutar;
    if (kasaYeri(s) === "saha") saha = r2(saha + d); else merkez = r2(merkez + d);
  });
  return { merkez, saha, toplam: r2(merkez + saha) };
}

/* ─────────────────────────────────────────────────────────────────────────
   MUTABAKAT — eski ekran toplamları ile yeni satır toplamlarının kıyası.
   eski: {ciro, verisBedel, tahsilat, gider, ...} çağıran hesaplar (RaporA/
   hesap fonksiyonlarından); yeni taraf buradan. Satır yapısı {ad, eski,
   yeni, fark, aciklama} — finans.html mutabakatRapor deseni.
   ───────────────────────────────────────────────────────────────────────── */
export function mutabakat(rows, eski, sayim) {
  const S = (f) => r2((rows || []).filter(f).reduce((z, s) => z + s.tutar, 0));
  const satir = (ad, e, y, aciklama) => ({ ad, eski: r2(e), yeni: r2(y), fark: r2(y - num(e)), aciklama: aciklama || "" });
  const L = [];
  const E = eski || {};
  L.push(satir("Satış tahakkuku (uç bedel)", E.ciro, S(s => s.tur === "SATIS")));
  L.push(satir("Veriliş bedeli (Tikita cirosu)", E.verisBedel,
    r2((rows || []).filter(s => s.tur === "SATIS").reduce((z, s) => z + num(s.adet) * num(s.birim && s.birim.veris), 0))));
  L.push(satir("Tahsilat (kayıtlı)", E.tahsilat, S(s => s.tur === "TAHSILAT" && !s.sentetik && s.altTur !== "icTransfer")));
  L.push(satir("Sentetik peşin tahsilat", 0, (sayim && sayim.sentetikTutar) || 0,
    "gerilla/stant peşini — eski ekranda ayrı kayıt yok, bilinçli fark"));
  L.push(satir("Masraf (tahakkuk)", E.masraf, S(s => s.tur === "MASRAF")));
  L.push(satir("Ödeme (hakediş/montaj/tabla)", E.odeme, S(s => s.tur === "ODEME")));
  return L;
}
