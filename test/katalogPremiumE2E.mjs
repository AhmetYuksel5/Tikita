/* 📔 PREMIUM KATALOG — kapak + akan bölümler + arka kapak.
   Doğrulanan:
     1 Katalog ekranında Premium/Sade anahtarı var, premium varsayılan
     2 Premium düzen: 1. sayfa kapak, son sayfa arka kapak, arası bölüm sayfası
     3 Bölümler AKAR — tek ürünlü bölüm yeni sayfa açmaz, aynı sayfada başlar
     4 Kart içi hizalar SABİT: açıklaması kısa/uzun kartlarda fiyat aynı y'de
     5 Bölüm yoksa/eşleşmezse ürün düşmez — hepsi bir bölüme girer
     6 Rozetler yalnız TANIMLI bölümlerden gelir (mevsim etiketi kirletmez)
     7 Sade tasarım eskisi gibi çalışmaya devam eder (regresyon)
     8 Ürün kartında Katalog bloğu: bölüm seçimi + tanıtım yazısı kaydediliyor */
import {chromium} from "playwright";
import fs from "fs";
import path from "path";
const KOK=path.dirname(new URL(import.meta.url).pathname);
const FB=fs.readFileSync(path.join(KOK,"fbstub.mjs.txt"),"utf8");
const REACT=fs.readFileSync(path.join(KOK,"node_modules/react/umd/react.production.min.js"),"utf8");
const RDOM=fs.readFileSync(path.join(KOK,"node_modules/react-dom/umd/react-dom.production.min.js"),"utf8");
const KROM=process.env.CHROME||"/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SUNUCU=process.env.TIKITA_URL||"http://localhost:8799";
let hata=0; const ok=(k,c,d)=>{ console.log((c?"✓ ":"✗ ")+k+(d!=null?("   → "+d):"")); if(!c) hata++; };
const PIX="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/gFvXFyxAAAAAElFTkSuQmCC";
const ur=(id,ad,seriler,tanitim,katBolum)=>({id,ad,stokta:10,satisFiyat:40,pazFiyat:25,
  parcalar:[],parcaAdet:{},pazStokK:{},seriler,anaFoto:"f_"+id,
  ...(tanitim?{tanitim}:{}),...(katBolum?{katBolum}:{})});
const VERI=()=>({
  kullanici:[{id:"a1",ad:"Komutan",rol:"admin",simge:"👑"}],
  /* Deniz 4 ürün · Kafe 1 ürün (akış sınaması) · mevsim etiketi her yerde */
  ayar:[{id:"genel",katBolumler:[
    {seri:"Deniz",baslik:"Deniz Serisi",aciklama:"Eklem eklem basılan deniz canlıları."},
    {seri:"Kafe",baslik:"Kafe & Tatlı",aciklama:"Günlük keyiflerin minik replikaları."}]}],
  musteri:[],pazarlama_hareket:[],
  stok_urun:[
    ur("u1","Ahtapot",["Deniz","Yaz Sezon"],"Sekiz kolu tek tek kıvrılan sevimli ahtapot."),
    ur("u2","Penguen",["Deniz"],"Kısa."),
    ur("u3","Kalamar",["Deniz","Yaz Sezon"],
      "Külah başlı, kıvrılan kollu kalamar. Pembe, mor ve mavi seçenekleriyle koleksiyonun en eğlenceli üçlüsü olarak öne çıkar."),
    ur("u4","Yunus",["Deniz"],"Akıcı gövdesiyle zıplayan yunus."),
    ur("u5","Çay bardağı",["Kafe"],"İnce belli bardak formunda minik bir selam."),
    /* hiçbir tanımlı bölüme girmiyor — düşmemeli */
    ur("u6","Kalemlik",["Masa"],"Masada duran, işe yarayan tasarım."),
    /* serisi hiç yok — yine düşmemeli */
    ur("u7","Stand",[],"Telefon standı.")],
  urun_foto:["u1","u2","u3","u4","u5","u6","u7"].map(id=>({id:"f_"+id,urunId:id,data:PIX,
    tarih:"2026-09-0"+id.slice(1)+"T10:00:00.000Z"})),
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],sefer:[],talep:[],hedef:[],
  hakedis_donem:[],fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],cephane_talep:[],
});
const b=await chromium.launch({executablePath:KROM});
async function ac(){
  const c=await b.newContext({viewport:{width:430,height:1800},isMobile:true,hasTouch:true,locale:"tr-TR"});
  await c.addInitScript(v=>{ window.__TIKITA_VERI=v;
    try{ localStorage.setItem("tk_uid","a1"); }catch(e){} },VERI());
  await c.route(u=>/^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(u.href),r=>r.abort());
  await c.route(u=>/unpkg\.com\/react@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:REACT}));
  await c.route(u=>/unpkg\.com\/react-dom@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:RDOM}));
  await c.route(u=>/gstatic\.com\/firebasejs/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:FB}));
  await c.route(u=>/unpkg\.com\/leaflet/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:"window.L=new Proxy({},{get:()=>()=>new Proxy({},{get:()=>()=>{}})});"}));
  const p=await c.newPage(); const log=[];
  p.on("pageerror",e=>log.push("[ERR] "+e.message));
  p.on("dialog",d=>d.accept());
  await p.goto(SUNUCU+"/admin.html",{waitUntil:"domcontentloaded"});
  await p.waitForFunction(()=>!/Karargâh hazırlanıyor|Giriş gerekli/.test(document.body.innerText||""),{timeout:20000}).catch(()=>{});
  return {c,p,log};
}
const basBtn=(p,re)=>p.evaluate(s=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button")).filter(x=>new RegExp(s).test(d(x)));
  L.sort((a,b)=>d(a).length-d(b).length);
  if(L[0]){ L[0].click(); return d(L[0]).slice(0,60);} return "YOK"; },re);
const metin=p=>p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());
const kay=(p,n)=>p.evaluate(n2=>window.__KAYITLAR(n2),n);

console.log("═══ 1) Katalog ekranı · tasarım anahtarı ═══");
const {c,p,log}=await ac();
ok("Stok sekmesi",(await basBtn(p,"^Stok$"))!=="YOK");
await p.waitForTimeout(1300);
ok("Katalog açıldı",(await basBtn(p,"^📔 Katalog"))!=="YOK");
await p.waitForTimeout(1200);
let t=await metin(p);
ok("Premium anahtarı var",/✦ Premium/.test(t));
ok("Sade liste anahtarı var",/Sade liste/.test(t));
ok("Bölümler bloğu var",/Bölümler · \d/.test(t),(t.match(/Bölümler · \d+/)||[""])[0]);
ok("Kapak yazıları bloğu var",/Kapak yazıları/.test(t));
ok("premium varsayılan → sütun seçimi gizli",!/2 sütun/.test(t));

console.log("═══ 2-6) DÜZEN — modülü doğrudan koştur ═══");
const R=await p.evaluate(async ()=>{
  const M=await import("./lib/katalog.js");
  const U=window.__KAYITLAR("stok_urun"), F=window.__KAYITLAR("urun_foto");
  const bolumler=[{seri:"Deniz",baslik:"Deniz Serisi",aciklama:"a"},
                  {seri:"Kafe",baslik:"Kafe & Tatlı",aciklama:"b"}];
  const sec={fiyat:"satis",aciklamaVar:true,bolumler,baslik:"Anahtarlık",baslik2:"Serisi"};
  const dz=M.katPremiumDuzen(U,sec);
  const grp=M.katBolumle(U,{bolumler});
  /* kart iç hizası: iki farklı uzunlukta açıklaması olan kart aynı kartH'de mi */
  const kut=[]; dz.sayfalar.forEach(s=>(s.kutular||[]).forEach(k=>kut.push(k)));
  const bolumSayfa=dz.sayfalar.filter(s=>s.tip==="bolum");
  return {sayfa:dz.sayfa, ilk:dz.sayfalar[0].tip, son:dz.sayfalar[dz.sayfa-1].tip,
    bolumSayfaSay:bolumSayfa.length,
    /* akış: HERHANGİ bir sayfada birden çok bölüm başlıyor mu */
    sayfaBaslik:bolumSayfa.map(s2=>(s2.basliklar||[]).length),
    kartSay:kut.length, kartHFarkli:[...new Set(kut.map(k=>k.kartH))].length,
    grup:grp.map(g=>({seri:g.seri,ad:g.baslik,n:g.list.length})),
    urunToplam:grp.reduce((z,g)=>z+g.list.length,0),
    seriler:M.katSeriler(U.find(x=>x.id==="u1")),
    bolumOf:[M.katBolumOf(U.find(x=>x.id==="u1"),bolumler),
             M.katBolumOf(U.find(x=>x.id==="u6"),bolumler),
             M.katBolumOf(U.find(x=>x.id==="u7"),bolumler)]};
});
ok("ilk sayfa KAPAK",R.ilk==="kapak",R.ilk);
ok("son sayfa ARKA KAPAK",R.son==="arka",R.son);
ok("arada bölüm sayfası var",R.bolumSayfaSay>=1,R.bolumSayfaSay+" sayfa");
ok("7 ürünün hepsi yerleşti",R.kartSay===7,R.kartSay+" kart");
ok("hiçbir ürün bölümsüz kalmadı",R.urunToplam===7,R.urunToplam);
ok("kart yüksekliği tek (hizalar sabit)",R.kartHFarkli===1,R.kartHFarkli+" farklı yükseklik");
/* 4 bölüm var; her bölüm kendi sayfasını açsaydı 4 bölüm sayfası olurdu.
   Akış çalışınca bir sayfada birden çok bölüm başlar, sayfa sayısı düşer. */
ok("AKIŞ: bir sayfada birden çok bölüm başlıyor",
  R.sayfaBaslik.some(n=>n>=2),"sayfa başına bölüm: "+JSON.stringify(R.sayfaBaslik));
ok("AKIŞ: bölüm sayısından az sayfa",R.bolumSayfaSay<R.grup.length,
  R.bolumSayfaSay+" sayfa / "+R.grup.length+" bölüm");
ok("tanımlı bölümler sırada önce",R.grup[0].seri==="Deniz"&&R.grup[1].seri==="Kafe",
  R.grup.map(g=>g.seri+":"+g.n).join(" · "));
ok("bölüm başlıkları tanımdan geliyor",R.grup[0].ad==="Deniz Serisi",R.grup[0].ad);
ok("tanımsız seriler sona düştü",
  R.grup.slice(2).every(g=>["Masa",""].indexOf(g.seri)>=0),
  R.grup.map(g=>g.seri||"(serisiz)").join(","));
ok("serisiz ürün de bir bölüme girdi",R.bolumOf[2]==="",JSON.stringify(R.bolumOf));
ok("mevsim etiketi bölüm seçmedi (Deniz kazandı)",R.bolumOf[0]==="Deniz",R.bolumOf[0]);

console.log("═══ 7) SADE tasarım regresyonu ═══");
ok("Sade'ye geçildi",(await basBtn(p,"^Sade liste$"))!=="YOK");
await p.waitForTimeout(700);
t=await metin(p);
ok("sütun seçimi geri geldi",/2 sütun/.test(t));
ok("kapak/bölüm blokları gizlendi",!/Kapak yazıları/.test(t)&&!/Bölümler · /.test(t));
ok("Premium'a dönüldü",(await basBtn(p,"^✦ Premium$"))!=="YOK");
await p.waitForTimeout(600);

console.log("═══ 8) ÜRÜN KARTI · Katalog bloğu ═══");
await p.keyboard.press("Escape"); await p.waitForTimeout(700);
ok("ürün kartı açıldı",(await p.evaluate(()=>{
  const L=Array.from(document.querySelectorAll("button.card"))
    .filter(x=>/(^|\n)Penguen(\n|$)/.test(x.innerText||""));
  if(!L.length) return "YOK"; L[0].click(); return "TIK"; }))==="TIK");
await p.waitForTimeout(900);
ok("Katalog bloğu var",/📔 Katalog/.test(await metin(p)));
ok("Katalog bloğu açıldı",(await basBtn(p,"^📔 Katalog"))!=="YOK");
await p.waitForTimeout(700);
t=await metin(p);
ok("bölüm çipleri geldi",/otomatik/.test(t)&&/Deniz Serisi/.test(t),
  (t.match(/KATALOG BÖLÜMÜ[\s\S]{0,60}/)||[""])[0].replace(/\s+/g," "));
ok("tanıtım yazısı alanı var",/Tanıtım yazısı/.test(t));
ok("Kafe bölümü seçildi",(await basBtn(p,"^Kafe & Tatlı$"))!=="YOK");
await p.waitForTimeout(1200);
const U2=(await kay(p,"stok_urun")).find(x=>x.id==="u2")||{};
ok("katBolum yazıldı",U2.katBolum==="Kafe",String(U2.katBolum));
ok("tanıtım yazısı korundu",U2.tanitim==="Kısa.",String(U2.tanitim));
ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,220));
await c.close();
await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ PREMIUM KATALOG DOĞRULANDI");
process.exit(hata?1:0);
