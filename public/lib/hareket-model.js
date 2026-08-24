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
export const HM_TURLER = ["SATIS", "TAHSILAT", "MASRAF", "ODEME"];

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

/* ── KİŞİ ADI TEK KAYNAK — `kisiAd(x, adMap)` ────────────────────────────
   Hakediş/montaj ÖDEME giderlerinde `kullaniciAd` YAZILMAZ; yalnız bazen
   `kullaniciId`, çoğu zaman sadece `aciklama` = "Emir · 08 Ağu–14 Ağu" vardır.
   Ad doğrudan açıklamadan alınırsa aynı kişi her ödemede AYRI bir cari olur
   ("Emir", "Emir · 08 Ağu–14 Ağu", "Emir · 15 Ağu–21 Ağu") ve ödemeler hak
   edişle netleşmez — canlı veride tam bu oluyordu (24 sahte taraf).
   Sıra: kullanici koleksiyonundaki ad (yetkili) → kaydın kullaniciAd'ı →
   açıklamanın " · "den ÖNCEKİ parçası. */
export function kisiAd(x, adMap) {
  const id = (x && x.kullaniciId) || "";
  if (id && adMap && adMap[id]) return adMap[id];
  const ad = ((x && x.kullaniciAd) || "").trim();
  if (ad) return ad;
  const ac = ((x && x.aciklama) || "").trim();
  if (!ac) return "";
  return ac.split(" · ")[0].trim();
}

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
    // Cari: peşin satış da borç doğurur, sentetik tahsilat aynı anda kapatır →
    // tam tahsilde bakiye 0; KISMİ tahsilde kalan açık GÖRÜNÜR (gerilla satışta
    // 200 verilip 150 alındıysa 50 ₺ alacaktır — eskiden hiçbir yerde yoktu).
    return { kasa: 0, musteriCari: +1, perCari: 0, pivot: true };
  }
  if (t === "TAHSILAT") {
    if (a === "icTransfer") return { kasa: 0, musteriCari: 0, perCari: 0, pivot: false };  // saha→merkez, toplam nakit DEĞİŞMEZ
    if (a === "avans")      return { kasa: +1, musteriCari: 0, perCari: 0, pivot: false }; // sayımsız avans cariye mahsup edilmez
    if (a === "pesin")      return { kasa: +1, musteriCari: -1, perCari: 0, pivot: false }; // peşin satışın borcunu kapatır
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

/* ─────────────────────────────────────────────────────────────────────────
   BORÇ / ALACAK — defter sütunlarının TEK KAYNAĞI.
   Bina hareket defteriyle BİREBİR aynı kural: hizmet satırı BORÇ, diğer üç tür
   ALACAK sütununa yazılır (TEMİZLİK HİZMETİ→borc · TAHSİLAT/MASRAF/ÖDEME→alacak).
   Tikita karşılığı: SATIŞ→borç · TAHSİLAT/MASRAF/ÖDEME→alacak.
   ───────────────────────────────────────────────────────────────────────── */
export function borcAlacak(s) {
  if (!s) return { borc: 0, alacak: 0 };
  return (s.tur === "SATIS") ? { borc: r2(s.tutar), alacak: 0 }
                             : { borc: 0, alacak: r2(s.tutar) };
}

/* Defter satırının kısa açıklaması — tabloda tek sütunda okunur olsun.
   Satışta ürün+adet, ödemede/masrafta kalem adı, tahsilatta kaynak. */
export function satirAciklama(s) {
  if (!s) return "";
  if (s.aciklama) return s.aciklama;
  if (s.tur === "SATIS") {
    if (s.altTur === "stant") return "Stant bedeli";
    return (s.urunAd || "Satış") + (num(s.adet) ? " × " + num(s.adet) : "");
  }
  if (s.tur === "TAHSILAT") {
    if (s.altTur === "icTransfer") return "Nakit teslim (saha → merkez)";
    if (s.altTur === "avans") return "Sayımsız avans";
    if (s.altTur === "pesin") return "Peşin alındı" + (s.urunAd ? " · " + s.urunAd : "");
    return "Tahsilat";
  }
  if (s.tur === "MASRAF") {
    if (s.altTur === "numune") return "Numune/hediye" + (s.urunAd ? " · " + s.urunAd : "");
    if (s.altTur === "tabla") return "Tabla ücreti";
    if (s.altTur === "montajIscilik") return "Montaj işçiliği" + (num(s.adet) ? " × " + num(s.adet) : "");
    if (s.altTur === "sabit") return "Sabit gider";
    if (s.altTur === "stokAlim") return "Stok alımı";
    return s.tarafAd || "Masraf";
  }
  if (s.tur === "ODEME") {
    if (s.altTur === "hakedis") return "Pazarlamacı hakedişi";
    if (s.altTur === "montajIscilik") return "Montaj işçiliği ödemesi";
    if (s.altTur === "tablaOde") return "Tabla ödemesi";
    return "Ödeme";
  }
  return s.altTur || "";
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
  // kullanici koleksiyonu verilmişse id→ad haritası (adın YETKİLİ kaynağı).
  const adMap = {};
  (D.kullanicilar || []).forEach(k => { if (k && k.id && k.ad) adMap[k.id] = String(k.ad).trim(); });

  const kale = x => ({ tarafTip: "musteri", tarafId: x.musteriId || (x.yer || "").trim(), tarafAd: (x.yer || "").trim() });
  const per = x => ({ tarafTip: "kullanici", tarafId: x.kullaniciId || "", tarafAd: kisiAd(x, adMap) });

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
        { tarafTip: "kullanici", tarafId: g.kullaniciId || "", tarafAd: kisiAd(g, adMap),
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
      tarafTip: "kullanici", tarafId: g.kullaniciId || "", tarafAd: kisiAd(g, adMap),
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

/* CARİ YALNIZ MÜŞTERİ DEĞİLDİR (kullanıcı 2026-08-24: "bir ödeme mi yaptım o
   aslında bir caridir, Emir'e tabla ödemesi mi yaptım o da bir cari harekettir").
   İki gerçek cari tipi vardır ve İŞARETLERİ TERSTİR — tek sütunda toplanamazlar:
     musteri   : bakiye = satış − tahsilat  → (+) MÜŞTERİ BİZE BORÇLU
     kullanici : bakiye = tahakkuk − ödeme  → (+) BİZ PERSONELE BORÇLUYUZ
   Bu yüzden `cariler()` tipi de döndürür ve ekran her öbeği kendi diliyle
   etiketler. Tedarikçi CARİ DEĞİLDİR: masraf ödeme anında kapanır (kasa −1),
   yürüyen hesabı yoktur — o RAPOR'un konusudur. */
/* MARJ HAKEDİŞİ CARİYE GİRMEZ — tek yönlü olurdu.
   `personelCari` notundaki kural: satış-marjı hakedişinin TAHAKKUKU bu modelde
   üretilmez (yaşam döngüsü hakedis_donem belgesindedir, iki yerde iki rakam
   çıkmasın diye). Ama ÖDEMESİ gider olarak buraya düşüyor → hesaba katılırsa
   karşılıksız bir eksi doğar: canlı veride Emir'in tabla tahakkuku ₺285 iken
   hakediş ödemeleri ₺4.489 olduğu için bakiye "−4.204" çıkıyordu, sanki adama
   fazla ödeme yapılmış gibi. Bu yüzden hakediş ödemesi cariEtki'de SIFIRDIR;
   `cariler()` onu ayrı `hakedisOde` kaleminde gösterir (para kaybolmaz). */
export function cariEtki(s) {
  const e = etki(s);
  if (s.tarafTip === "kullanici") {
    if (s.tur === "ODEME" && s.altTur === "hakedis") return 0;
    return e.perCari;
  }
  if (e.musteriCari) return e.musteriCari;
  return 0;
}
export function cariAnahtar(s) { return (s.tarafTip || "musteri") + "|" + kaleAnahtar(s); }

/* Bu tarafla ilgili TÜM hareketler — tür kısıtı YOK (kullanıcı isteği: "onunla
   alakalı bütün hareketleri görebilmeliyim"). Yürüyen bakiye yalnız gerçekten
   cari etkisi olan satırlarda ilerler; avans ve tarafın adına rastgele denk
   gelen satır `cariDisi:true` ile işaretlenip listede görünür ama bakiyeye
   dokunmaz (bina "süzgeç bakiyeyi yeniden hesaplamaz" kuralının karşılığı).

   `artis`/`azalis` tipe göre anlam değiştirir — ekran başlıkları da öyle:
     musteri   → BORÇ (satış) / ALACAK (tahsilat)
     kullanici → HAK EDİŞ (tabla·montaj tahakkuku) / ÖDENEN
   Eski `borc`/`alacak` adları GERİYE DÖNÜK korunur (PNG ve testler kullanıyor). */
export function kaleEkstre(rows, kaleAd, tip) {
  const L = (rows || []).filter(s =>
    kaleAnahtar(s) === kaleAd && (!tip || (s.tarafTip || "musteri") === tip));
  L.sort((a, b) => (ms(a.tarih) - ms(b.tarih)) || ((a.tur === "SATIS" ? 0 : 1) - (b.tur === "SATIS" ? 0 : 1)) || String(a.ref).localeCompare(String(b.ref)));
  let run = 0;
  const out = L.map(s => {
    const ce = cariEtki(s);
    const avansMi = s.tur === "TAHSILAT" && s.altTur === "avans";
    const cariMi = !avansMi && ce !== 0;
    // artış = bakiyeyi büyüten yön (+1), azalış = küçülten (−1)
    const artis = (cariMi && ce > 0) ? s.tutar : 0;
    const azalis = (cariMi && ce < 0) ? s.tutar
      : ((!cariMi && !avansMi && (s.tur === "TAHSILAT" || s.tur === "MASRAF" || s.tur === "ODEME")) ? s.tutar : 0);
    if (cariMi) run = r2(run + artis - azalis);
    return { ...s, artis, azalis, borc: artis, alacak: azalis,
      bakiye: run, avansMi, cariDisi: !cariMi && !avansMi };
  });
  return { rows: out, bakiye: run, tip: tip || "musteri",
    avans: r2(L.filter(s => s.altTur === "avans").reduce((z, s) => z + s.tutar, 0)) };
}

/* TÜM cari taraflar (müşteri + personel), bakiyesi sıfır olanlar DÂHİL.
   Sıfır bakiyeliyi elemek "41 müşterinin 4'ü" gibi bir ekran doğuruyordu —
   hesabı kapanmış müşteri de bir caridir, hareketleri görünmelidir. */
export function cariler(rows) {
  const M = {};
  (rows || []).forEach(s => {
    const ad = kaleAnahtar(s); if (!ad || ad === "—") return;
    const tip = s.tarafTip || "musteri";
    if (tip !== "musteri" && tip !== "kullanici") return;   // tedarikçi cari değil
    const k = tip + "|" + ad;
    const o = M[k] || (M[k] = { tip, ad, artis: 0, azalis: 0, bakiye: 0, n: 0, sonTarih: "", hakedisOde: 0, avans: 0 });
    o.n++;
    if (s.tarih > o.sonTarih) o.sonTarih = s.tarih;
    if (s.tur === "TAHSILAT" && s.altTur === "avans") { o.avans = r2(o.avans + s.tutar); return; }
    if (s.tur === "ODEME" && s.altTur === "hakedis") { o.hakedisOde = r2(o.hakedisOde + s.tutar); return; }
    const ce = cariEtki(s);
    if (ce > 0) o.artis = r2(o.artis + s.tutar);
    else if (ce < 0) o.azalis = r2(o.azalis + s.tutar);
  });
  return Object.values(M).map(o => ({ ...o, bakiye: r2(o.artis - o.azalis) }))
    .sort((a, b) => Math.abs(b.bakiye) - Math.abs(a.bakiye) || a.ad.localeCompare(b.ad, "tr"));
}

export function kaleBakiyeleri(rows) {
  const M = {};
  (rows || []).forEach(s => {
    const e = etki(s); if (!e.musteriCari) return;
    const k = kaleAnahtar(s);
    M[k] = r2((M[k] || 0) + e.musteriCari * s.tutar);
  });
  return Object.entries(M).map(([kale, bakiye]) => ({ kale, bakiye }))
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
   ÜRÜN KÂRLILIĞI — satış satırlarından ürün bazında (kullanıcı isteği:
   muhasebe kodlu deftere gerek yok, ürün kârlılığı kalsın).
   ciroUc = uç müşteri bedeli · ciroVeris = Tikita cirosu (veriliş) ·
   tikitaKar = veriliş − maliyet (ürünün Tikita'ya bıraktığı).
   ───────────────────────────────────────────────────────────────────────── */
export function urunKarlilik(rows) {
  const M = {};
  (rows || []).forEach(s => {
    if (s.tur !== "SATIS" || s.altTur === "stant") return;
    const k = s.urunAd || s.urunId || "?";
    const o = M[k] || (M[k] = { urun: k, adet: 0, ciroUc: 0, ciroVeris: 0, maliyet: 0 });
    o.adet += num(s.adet);
    o.ciroUc = r2(o.ciroUc + s.tutar);
    o.ciroVeris = r2(o.ciroVeris + num(s.adet) * num(s.birim && s.birim.veris));
    o.maliyet = r2(o.maliyet + num(s.adet) * num(s.birim && s.birim.maliyet));
  });
  return Object.values(M).map(o => ({ ...o, tikitaKar: r2(o.ciroVeris - o.maliyet) }))
    .sort((a, b) => b.tikitaKar - a.tikitaKar);
}

/* ─────────────────────────────────────────────────────────────────────────
   DÖNEM RAPORU — bina RAPOR ekranının Tikita karşılığı: seçilen dönemde
   TARAF bazında GİREN / ÇIKAN para + TOPLAM + KALAN.
   Giren = o taraftan gelen tahsilat (peşin dâhil) · Çıkan = masraf + ödeme.
   İç transfer (saha→merkez) girmez: para taşınır, işletmeye girmez/çıkmaz.
   ───────────────────────────────────────────────────────────────────────── */
export function donemRapor(rows, donem) {
  const M = {};
  (rows || []).forEach(s => {
    if (donem && ayKod(ms(s.tarih)) !== donem) return;
    if (s.tur === "TAHSILAT" && s.altTur === "icTransfer") return;
    let giren = 0, cikan = 0;
    if (s.tur === "TAHSILAT") giren = s.tutar;
    else if (s.tur === "ODEME") cikan = s.tutar;
    else if (s.tur === "MASRAF") {
      // Yalnız FİİLEN para çıkanlar: tabla/montaj tahakkuku (henüz ödenmedi) ve
      // numune (stok kaybı, nakit değil) nakit raporuna girmez.
      if (s.altTur === "tabla" || s.altTur === "montajIscilik" || s.altTur === "numune") return;
      cikan = s.tutar;
    }
    else return;                                   // SATIŞ tahakkuktur, nakit raporuna girmez
    const k = (s.tarafAd || "").trim() || (s.tur === "MASRAF" ? (s.altTur || "Masraf") : "—");
    const o = M[k] || (M[k] = { ad: k, giren: 0, cikan: 0 });
    o.giren = r2(o.giren + giren); o.cikan = r2(o.cikan + cikan);
  });
  const satirlar = Object.values(M).filter(o => o.giren || o.cikan)
    .sort((a, b) => (b.giren - b.cikan) - (a.giren - a.cikan));
  const giren = r2(satirlar.reduce((z, o) => z + o.giren, 0));
  const cikan = r2(satirlar.reduce((z, o) => z + o.cikan, 0));
  return { satirlar, giren, cikan, kalan: r2(giren - cikan) };
}

/* ─────────────────────────────────────────────────────────────────────────
   GENEL — bina GENEL ekranının karşılığı. "KASADA KALMASI GEREKEN" ile
   paranın FİİLEN bulunduğu yerler (müşteri alacağı + saha + merkez) DENK olmalı.

   Denklik türetimi (testle sabitlenmiştir, bozma):
     alacak = vadeli satış − normal tahsilat
     nakit  = tüm tahsilat (normal+avans+peşin) − nakit masraf − ödeme
     ⇒ alacak + nakit = satış + avans − nakitMasraf − ödeme
   Bu yüzden "kasada olması gereken" hesabına AVANS eklenir, tahakkuk masrafları
   (tabla · montaj işçiliği — henüz ödenmedi) ve numune (nakit değil, stok) GİRMEZ.
   ───────────────────────────────────────────────────────────────────────── */
export function genelOzet(rows) {
  let satis = 0, nakitMasraf = 0, tahakkuk = 0, numune = 0, odeme = 0, avans = 0;
  (rows || []).forEach(s => {
    if (s.tur === "SATIS") { satis = r2(satis + s.tutar); return; }
    if (s.tur === "ODEME") { odeme = r2(odeme + s.tutar); return; }
    if (s.tur === "TAHSILAT") { if (s.altTur === "avans") avans = r2(avans + s.tutar); return; }
    if (s.tur === "MASRAF") {
      if (s.altTur === "tabla" || s.altTur === "montajIscilik") tahakkuk = r2(tahakkuk + s.tutar);
      else if (s.altTur === "numune") numune = r2(numune + s.tutar);
      else nakitMasraf = r2(nakitMasraf + s.tutar);
    }
  });
  const kalan = r2(satis - nakitMasraf);
  const kasadaOlmali = r2(kalan + avans - odeme);
  const n = nakitOzet(rows);
  const alacak = r2(kaleBakiyeleri(rows).reduce((z, x) => z + x.bakiye, 0));
  const nerede = r2(alacak + n.merkez + n.saha);
  return { satis, nakitMasraf, tahakkuk, numune, odeme, avans, kalan, kasadaOlmali,
    alacak, merkez: n.merkez, saha: n.saha, nerede, fark: r2(nerede - kasadaOlmali) };
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
