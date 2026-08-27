/* 💬 GitHub konu/yorum metnini komuta çevirir. Saf işlev — testi kolay olsun
   diye ağ ve GitHub bilgisi burada yok. */

const HARF = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

export function sade(metin) {
  return String(metin || "").toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (h) => HARF[h] || h)
    .replace(/\s+/g, " ").trim();
}

/* {is, kod} — is boşsa komut tanınmadı */
export function komutCoz(metin) {
  const s = sade(metin);
  const alti = s.match(/(?:^|\D)(\d{6})(?:\D|$)/);

  if (/\bkod\b/.test(s) && alti) return { is: "kod", kod: alti[1] };
  if (/\b(giris|gir|baglan|basla|baglanti)\b/.test(s)) return { is: "giris" };
  if (/\b(cek|cekim|kuru|dene|deneme)\b/.test(s)) return { is: "cek" };
  if (/\b(yaz|kaydet|uygula|isle)\b/.test(s)) return { is: "yaz" };
  if (/\b(esle|eslestir|eslesme)\b/.test(s)) return { is: "esle" };
  if (/\b(durum|yardim|komut|komutlar)\b/.test(s)) return { is: "durum" };
  if (alti) return { is: "kod", kod: alti[1] };
  return { is: "" };
}

/* Konu bu bot'a mı ait? Başlıkta ya da ilk satırda "bambu" geçmeli. */
export const bambuKonusu = (baslik, govde) =>
  /\bbambu\b/.test(sade(baslik)) || /\bbambu\b/.test(sade(String(govde || "").split("\n")[0]));

export const YARDIM = [
  "Yorum olarak şunlardan birini yaz:",
  "",
  "| komut | ne yapar |",
  "| --- | --- |",
  "| `giriş` | Bambu hesabına bağlanır, gerekirse e-postana kod yollar |",
  "| `kod 123456` | E-postana gelen kodu girer, bağlantıyı tamamlar |",
  "| `eşle` | Yazıcıları Tikita makineleriyle eşleştirir |",
  "| `çek` | Makaraları okur, **yalnız gösterir** — hiçbir şey yazmaz |",
  "| `yaz` | Okuduğunu Tikita'ya kaydeder |",
  "| `durum` | Bu listeyi ve bağlantı durumunu gösterir |",
].join("\n");
