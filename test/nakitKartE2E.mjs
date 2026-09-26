/* 💵 RAPOR · "Teslim edilecek nakit" KARTI
   Sorun: kart yalnız KAPANAN haftaların parası varken çıkıyordu ve başlıktaki
   rakam da yalnız "şimdi teslim edilecek" tutardı. Sonuç:
     • ilk haftasında 3.000 ₺ toplayan pazarlamacı kartı HİÇ görmüyordu
     • geçen haftanın parasını teslim etmiş ama bu hafta 1.500 ₺ toplamış
       pazarlamacıya "0 ₺ · temiz" yazıyordu — oysa para elinde
   Doğrulanan:
     1 Yalnız süren haftada para toplandıysa kart yine çıkar
     2 Başlıktaki rakam ELDEKİ TOPLAM (şimdi teslim + süren hafta)
     3 Alt satır ikiye ayırır: ne kadarı şimdi, ne kadarı kesimden sonra
     4 Elde para varken "temiz" YAZMAZ
     5 Gerçekten sıfırsa "temiz" yazar
     6 Onay bekleyen teslim ayrı görünür ve eldekinden düşülür */
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
/* hafta: Cumartesi 00:00 → Cuma 23:59 (uygulamayla birebir) */
const haftaBasMs=t=>{const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+1)%7));return d.getTime();};
const NOW=Date.now();
/* süren hafta içinde kesin bir an — hafta yeni başladıysa "az önce"yi kullan */
const ACIK=new Date(Math.min(NOW-60000,haftaBasMs(NOW)+3600000)).toISOString();
/* 10 gün önce → her zaman KAPANMIŞ bir haftada (hafta en fazla 7 gün) */
const KAPALI=new Date(NOW-10*864e5).toISOString();
const KAPALI2=new Date(NOW-9*864e5).toISOString();
const tah=(id,uid,ad,tutar,tarih)=>({id,tip:"tahsilat",kullaniciId:uid,kullaniciAd:ad,
  musteriId:"m1",yer:"H Kafe",tutar,tarih});
const tes=(id,uid,ad,tutar,tarih,onay)=>({id,tip:"nakitTeslim",kullaniciId:uid,kullaniciAd:ad,
  tutar,onay,tarih});
const V={
  kullanici:[
    {id:"e1",ad:"Yeni",rol:"pazarlamaci",simge:"🎖️"},     // yalnız süren hafta · 3.000
    {id:"e2",ad:"Temiz",rol:"pazarlamaci",simge:"🎖️"},    // geçmiş kapandı+teslim · bu hafta 1.500
    {id:"e3",ad:"Karisik",rol:"pazarlamaci",simge:"🎖️"},  // 2.000 şimdi + 800 bu hafta
    {id:"e4",ad:"Sifir",rol:"pazarlamaci",simge:"🎖️"},    // hepsi teslim, bu hafta yok
    {id:"e5",ad:"Bekleyen",rol:"pazarlamaci",simge:"🎖️"}],// 2.000 toplandı, 2.000 onay bekliyor
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"H Kafe",kullaniciId:"e1",bolge:"Üsküdar"}],
  pazarlama_hareket:[
    tah("a1","e1","Yeni",3000,ACIK),
    tah("b1","e2","Temiz",4000,KAPALI), tes("b2","e2","Temiz",4000,KAPALI2,true),
    tah("b3","e2","Temiz",1500,ACIK),
    tah("c1","e3","Karisik",2000,KAPALI), tah("c2","e3","Karisik",800,ACIK),
    tah("d1","e4","Sifir",1000,KAPALI), tes("d2","e4","Sifir",1000,KAPALI2,true),
    tah("f1","e5","Bekleyen",2000,KAPALI), tes("f2","e5","Bekleyen",2000,KAPALI2,false)],
  stok_urun:[{id:"u1",ad:"Penguen",stokta:50,satisFiyat:40,pazFiyat:25,parcalar:[],parcaAdet:{},
    pazStokK:{e1:5,e2:5,e3:5,e4:5,e5:5}}],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],hedef:[],
  hakedis_donem:[],fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],cephane_talep:[],
};
const b=await chromium.launch({executablePath:KROM});
async function ac(uid){
  const c=await b.newContext({viewport:{width:430,height:1800},isMobile:true,hasTouch:true,locale:"tr-TR"});
  await c.addInitScript(([v,id])=>{ window.__TIKITA_VERI=JSON.parse(JSON.stringify(v));
    try{ localStorage.setItem("tk_uid",id); }catch(e){} },[V,uid]);
  await c.route(u=>/^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(u.href),r=>r.abort());
  await c.route(u=>/unpkg\.com\/react@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:REACT}));
  await c.route(u=>/unpkg\.com\/react-dom@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:RDOM}));
  await c.route(u=>/gstatic\.com\/firebasejs/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:FB}));
  await c.route(u=>/unpkg\.com\/leaflet/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:"window.L=new Proxy({},{get:()=>()=>new Proxy({},{get:()=>()=>{}})});"}));
  const p=await c.newPage(); const log=[];
  p.on("pageerror",e=>log.push("[ERR] "+e.message));
  await p.goto(SUNUCU+"/deneme.html",{waitUntil:"domcontentloaded"});
  await p.waitForFunction(()=>!/Karargâh hazırlanıyor/.test(document.body.innerText||""),{timeout:20000}).catch(()=>{});
  await p.evaluate(()=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
    const L=Array.from(document.querySelectorAll("button")).filter(x=>/Rapor$/.test(d(x)));
    L.sort((a,b)=>d(a).length-d(b).length); L[0]&&L[0].click(); });
  await p.waitForTimeout(1100);
  return {c,p,log};
}
/* nakit kartının TAM metni */
const kart=p=>p.evaluate(()=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button")).filter(x=>/Teslim edilecek nakit/.test(d(x)));
  L.sort((a,b)=>d(a).length-d(b).length); return L[0]?d(L[0]):"KART YOK"; });

console.log("═══ 1) yalnız SÜREN HAFTA parası — kart yine çıkmalı ═══");
{ const {c,p,log}=await ac("e1");
  const K=await kart(p);
  ok("kart var",K!=="KART YOK",K);
  ok("eldeki 3.000 ₺ görünüyor",/3\.000 ₺/.test(K),K);
  ok("'temiz' YAZMIYOR",!/temiz/.test(K),K);
  ok("kesim notu var",/kesim/i.test(K),K);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 2) geçmiş teslim edilmiş · bu hafta 1.500 elde ═══");
{ const {c,p,log}=await ac("e2");
  const K=await kart(p);
  ok("kart var",K!=="KART YOK",K);
  ok("başlık rakamı 1.500 ₺",/1\.500 ₺/.test(K),K);
  ok("'temiz' YAZMIYOR (para elde)",!/temiz/.test(K),K);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 3) 2.000 şimdi + 800 bu hafta = 2.800 elde ═══");
{ const {c,p,log}=await ac("e3");
  const K=await kart(p);
  ok("başlık rakamı 2.800 ₺",/2\.800 ₺/.test(K),K);
  ok("2.000 şimdi teslim yazıyor",/2\.000 ₺ şimdi/.test(K),K);
  ok("800 kesimden sonra yazıyor",/800 ₺/.test(K)&&/kesim/i.test(K),K);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 4) gerçekten sıfır — 'temiz' ═══");
{ const {c,p,log}=await ac("e4");
  const K=await kart(p);
  ok("kart var (geçmiş teslim var)",K!=="KART YOK",K);
  ok("'temiz' yazıyor",/temiz/.test(K),K);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 5) onay bekleyen teslim eldekinden düşer ═══");
{ const {c,p,log}=await ac("e5");
  const K=await kart(p);
  ok("onay bekleyen görünüyor",/onay bekl/i.test(K),K);
  ok("elde 0 — 'temiz'",/temiz/.test(K),K);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 6) KOMUTA · Saha nakdi kutusu ═══");
{ const c=await b.newContext({viewport:{width:430,height:1800},isMobile:true,hasTouch:true,locale:"tr-TR"});
  await c.addInitScript(v=>{ const V2=JSON.parse(JSON.stringify(v));
    V2.kullanici.push({id:"a1",ad:"Komutan",rol:"admin",simge:"👑"});
    /* sahadaki paranın TAMAMI süren haftada: kalanTop 0, acikTop 3.000 */
    V2.pazarlama_hareket=V2.pazarlama_hareket.filter(x=>x.kullaniciId==="e1");
    window.__TIKITA_VERI=V2; try{ localStorage.setItem("tk_uid","a1"); }catch(e){} },V);
  await c.route(u=>/^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(u.href),r=>r.abort());
  await c.route(u=>/unpkg\.com\/react@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:REACT}));
  await c.route(u=>/unpkg\.com\/react-dom@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:RDOM}));
  await c.route(u=>/gstatic\.com\/firebasejs/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:FB}));
  await c.route(u=>/unpkg\.com\/leaflet/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:"window.L=new Proxy({},{get:()=>()=>new Proxy({},{get:()=>()=>{}})});"}));
  const p=await c.newPage(); const log=[];
  p.on("pageerror",e=>log.push("[ERR] "+e.message));
  await p.goto(SUNUCU+"/admin.html",{waitUntil:"domcontentloaded"});
  await p.waitForFunction(()=>!/Karargâh hazırlanıyor|Giriş gerekli/.test(document.body.innerText||""),{timeout:20000}).catch(()=>{});
  await p.evaluate(()=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
    const L=Array.from(document.querySelectorAll("button")).filter(x=>/Rapor$/.test(d(x)));
    L.sort((a,b)=>d(a).length-d(b).length); L[0]&&L[0].click(); });
  await p.waitForTimeout(1600);
  /* saha nakdi "Diğer göstergeler" akordiyonunda duruyor */
  await p.evaluate(()=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
    const L=Array.from(document.querySelectorAll("button")).filter(x=>/Diğer göstergeler/.test(d(x)));
    L.sort((a,b)=>d(a).length-d(b).length); L[0]&&L[0].click(); });
  await p.waitForTimeout(800);
  const K=await p.evaluate(()=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
    /* etiketin kendisi ayrı bir div — rakamı da taşıyan SARMALAYICIYI al */
    const L=Array.from(document.querySelectorAll("button,div"))
      .filter(x=>/Saha nakdi/.test(d(x))&&/₺/.test(d(x))&&d(x).length<120);
    L.sort((a,b)=>d(a).length-d(b).length); return L[0]?d(L[0]):"KUTU YOK"; });
  ok("saha nakdi kutusu var (para yalnız süren haftada)",K!=="KUTU YOK",K);
  ok("sahadaki 3.000 ₺ görünüyor",/3\.000 ₺/.test(K),K);
  ok("bu hafta olduğu yazıyor",/bu hafta/.test(K),K);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ NAKİT KARTI DOĞRULANDI");
await b.close();
process.exit(hata?1:0);
