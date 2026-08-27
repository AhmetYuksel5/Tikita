/* 🔐 Bambu bulut hesabı — giriş, cihaz listesi ve AMS okuma.
   Ağ katmanı burada; ayrıştırma public/lib/bambu-ams.js'te (o test edilebilir). */
import mqtt from "mqtt";

const API = "https://api.bambulab.com";
const BOLGE = { global: "us.mqtt.bambulab.com", cn: "cn.mqtt.bambulab.com" };

const bas = (u, o) => fetch(API + u, {
  ...o,
  headers: { "Content-Type": "application/json", "User-Agent": "tikita/1.0", ...((o && o.headers) || {}) },
});

async function json(r) {
  const t = await r.text();
  let d = null; try { d = t ? JSON.parse(t) : null; } catch (e) { /* metin döndü */ }
  if (!r.ok) throw new Error("Bambu " + r.status + " — " + (t || "").slice(0, 200));
  return d;
}

/* ————— giriş ————— */
export async function girisDene(hesap, sifre) {
  const d = await json(await bas("/v1/user-service/user/login", {
    method: "POST", body: JSON.stringify({ account: hesap, password: sifre }),
  }));
  return d || {};
}
/* e-postaya doğrulama kodu gönder */
export async function kodGonder(hesap) {
  await json(await bas("/v1/user-service/user/sendemail/code", {
    method: "POST", body: JSON.stringify({ email: hesap, type: "codeLogin" }),
  }));
  return true;
}
/* doğrulama kodu ya da 2FA kodu ile girişi tamamla */
export async function kodlaGir(hesap, kod, tfaKey) {
  if (tfaKey) {
    const r = await fetch("https://bambulab.com/api/sign-in/tfa", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tfaKey, tfaCode: kod }),
    });
    const setC = r.headers.get("set-cookie") || "";
    const m = setC.match(/token=([^;]+)/);
    if (!m) throw new Error("2FA yanıtında token yok");
    return { accessToken: m[1] };
  }
  return await json(await bas("/v1/user-service/user/login", {
    method: "POST", body: JSON.stringify({ account: hesap, code: kod }),
  })) || {};
}
export async function tokenTazele(refreshToken) {
  return await json(await bas("/v1/user-service/user/refreshtoken", {
    method: "POST", body: JSON.stringify({ refreshToken }),
  })) || {};
}

/* JWT içinden mqtt kullanıcı adı (u_xxxx) ve son kullanma */
export function tokenCoz(token) {
  try {
    const p = JSON.parse(Buffer.from(String(token).split(".")[1], "base64").toString("utf8"));
    return { kullanici: p.username || (p.uid ? ("u_" + p.uid) : ""), bitis: p.exp ? p.exp * 1000 : 0 };
  } catch (e) { return { kullanici: "", bitis: 0 }; }
}

/* ————— cihazlar ————— */
export async function cihazlar(token) {
  const d = await json(await bas("/v1/iot-service/api/user/bind", {
    headers: { Authorization: "Bearer " + token },
  }));
  return ((d && d.devices) || []).map((x) => ({
    seri: x.dev_id, ad: x.name || x.dev_id,
    model: x.dev_model_name || x.dev_product_name || "",
    cevrimici: !!x.online,
  }));
}

/* ————— AMS raporu —————
   Tek MQTT oturumunda bütün cihazlara "pushall" yollanır, gelen ilk dolu rapor
   alınır. Çevrimdışı yazıcı yanıt vermez; süre dolunca elde ne varsa döner. */
export async function amsRaporlari(token, seriler, secenek) {
  const o = secenek || {};
  const bolge = BOLGE[o.bolge] || BOLGE.global;
  const kullanici = o.kullanici || tokenCoz(token).kullanici;
  if (!kullanici) throw new Error("Token çözülemedi — yeniden giriş gerekiyor");
  const sure = Math.max(3000, Number(o.sureMs) || 20000);

  return await new Promise((cozum, hata) => {
    const sonuc = {}; let bitti = false;
    const c = mqtt.connect("mqtts://" + bolge + ":8883", {
      username: kullanici, password: token,
      clientId: "tikita_" + Math.random().toString(16).slice(2, 10),
      protocolVersion: 4, reconnectPeriod: 0, connectTimeout: 10000,
      rejectUnauthorized: false,
    });
    const kapat = () => { if (bitti) return; bitti = true; try { c.end(true); } catch (e) {} cozum(sonuc); };
    const zaman = setTimeout(kapat, sure);
    c.on("error", (e) => { clearTimeout(zaman); if (!bitti) { bitti = true; try { c.end(true); } catch (x) {} hata(e); } });
    c.on("connect", () => {
      seriler.forEach((s) => {
        c.subscribe("device/" + s + "/report", { qos: 0 });
        c.publish("device/" + s + "/request",
          JSON.stringify({ pushing: { sequence_id: String(Date.now() % 100000), command: "pushall" } }), { qos: 0 });
      });
    });
    c.on("message", (konu, veri) => {
      const m = String(konu).match(/^device\/([^/]+)\/report$/); if (!m) return;
      let d = null; try { d = JSON.parse(veri.toString()); } catch (e) { return; }
      const p = d && d.print; if (!p) return;
      const dolu = (p.ams && Array.isArray(p.ams.ams) && p.ams.ams.length) || p.vt_tray;
      if (!dolu) return;
      sonuc[m[1]] = d;
      if (seriler.every((s) => sonuc[s])) { clearTimeout(zaman); kapat(); }
    });
  });
}
