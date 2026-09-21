/* 🔭 Gözcüler (hiç satış yapılmamış kayıtlar) "Tümü" listesini kalabalıklaştırmaz:
   en altta KAPALI akordiyonda durur, "🔭 Gözcü" süzgecinde tam liste olarak çıkar. */
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
const T0="2026-09-10T10:00:00.000Z";
const S=(i,mid,yer)=>({id:"s"+i,tip:"satis",kullaniciId:"e1",kullaniciAd:"Ahmet",musteriId:mid,yer,
  urunId:"u1",urunAd:"Ahtapot",adet:2,satisFiyat:35,alisFiyat:25,tahsil:70,tarih:T0});
const V={
  kullanici:[{id:"e1",ad:"Ahmet",rol:"pazarlamaci",simge:"🎖️",fermanCephane:true}],
  ayar:[{id:"genel"}],
  /* 2 gerçek kale (satışı var) + 3 gözcü (satışı yok) */
  musteri:[
    {id:"m1",ad:"Satan Market",kullaniciId:"e1",bolge:"Üsküdar"},
    {id:"m2",ad:"Satan Bakkal",kullaniciId:"e1",bolge:"Üsküdar"},
    {id:"g1",ad:"Gözcü Biri",kullaniciId:"e1",bolge:"Kadıköy"},
    {id:"g2",ad:"Gözcü İki",kullaniciId:"e1",bolge:"Kadıköy"},
    {id:"g3",ad:"Gözcü Üç",kullaniciId:"e1",bolge:"Kadıköy"},
  ],
  pazarlama_hareket:[S(1,"m1","Satan Market"),S(2,"m2","Satan Bakkal")],
  stok_urun:[{id:"u1",ad:"Ahtapot",stokta:40,satisFiyat:35,pazFiyat:25,parcalar:[],parcaAdet:{},pazStokK:{e1:20}}],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],hedef:[],
  hakedis_donem:[],fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],
};
const b=await chromium.launch({executablePath:KROM});
const c=await b.newContext({viewport:{width:390,height:1600},isMobile:true,hasTouch:true,locale:"tr-TR"});
await c.addInitScript(v=>{ window.__TIKITA_VERI=v; try{ localStorage.setItem("tk_uid","e1"); }catch(e){} },V);
await c.route(u=>/^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(u.href),r=>r.abort());
await c.route(u=>/unpkg\.com\/react@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:REACT}));
await c.route(u=>/unpkg\.com\/react-dom@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:RDOM}));
await c.route(u=>/gstatic\.com\/firebasejs/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:FB}));
await c.route(u=>/unpkg\.com\/leaflet/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:"window.L=new Proxy({},{get:()=>()=>new Proxy({},{get:()=>()=>{}})});"}));
const p=await c.newPage(); const log=[];
p.on("pageerror",e=>log.push("[ERR] "+e.message));
await p.goto(SUNUCU+"/deneme.html",{waitUntil:"domcontentloaded"});
await p.waitForFunction(()=>!/Karargâh hazırlanıyor/.test(document.body.innerText||""),{timeout:20000}).catch(()=>{});
const bas=re=>p.evaluate(s=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button,[role=button],div,a")).filter(x=>new RegExp(s).test(d(x)));
  const bt=x=>(x.tagName==="BUTTON"||x.tagName==="A")?0:1;
  L.sort((a,b)=>(d(a).length-d(b).length)||(bt(a)-bt(b)));
  if(L[0]){ L[0].click(); return d(L[0]).slice(0,50);} return "YOK"; },re);
const metin=()=>p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());

await bas("Kaleler"); await p.waitForTimeout(700);
console.log("═══ 1) Tümü — gözcüler yukarıda DEĞİL ═══");
let t=await metin();
ok("satış yapılmış kaleler listede",/Satan Market/.test(t)&&/Satan Bakkal/.test(t));
ok("gözcüler listede GÖRÜNMÜYOR",!/Gözcü Biri/.test(t)&&!/Gözcü İki/.test(t),
  (t.match(/Gözcü \S+/g)||[]).join(","));
ok("akordiyon başlığı en altta",/Gözcüler 3/.test(t),(t.match(/Gözcüler \d+/)||[""])[0]);
/* akordiyon, kale satırlarının ALTINDA olmalı */
const sira=await p.evaluate(()=>{
  const hepsi=Array.from(document.querySelectorAll("button,div"));
  /* en İÇTEKİ eşleşme alınır: dıştaki sarmalayıcı da metni içerdiği için
     "en kısa metinli eşleşme" kuralı olmadan yanlış öğe seçilebiliyor */
  const y=re=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
    const L=hepsi.filter(x=>new RegExp(re).test(d(x))&&d(x).length<80)
      .sort((p,q)=>d(p).length-d(q).length);
    return L[0]?Math.round(L[0].getBoundingClientRect().y):-1; };
  return {kale:y("Satan Bakkal"),akord:y("[⌃⌄] Gözcüler \\d+")}; });
ok("akordiyon kalelerin ALTINDA",sira.akord>sira.kale,"kale y="+sira.kale+" akordiyon y="+sira.akord);

console.log("═══ 2) akordiyonu aç ═══");
ok("akordiyona basıldı",(await bas("[⌃⌄] Gözcüler \\d+"))!=="YOK");
await p.waitForTimeout(500);
t=await metin();
ok("üç gözcü de göründü",/Gözcü Biri/.test(t)&&/Gözcü İki/.test(t)&&/Gözcü Üç/.test(t));
ok("kaleler hâlâ yukarıda",/Satan Market/.test(t));

console.log("═══ 3) kapat ═══");
await bas("[⌃⌄] Gözcüler \\d+"); await p.waitForTimeout(500);
t=await metin();
ok("tekrar kapandı",!/Gözcü Biri/.test(t));

console.log("═══ 4) 🔭 Gözcü süzgeci tam liste veriyor ═══");
await bas("^Gözcü 3$"); await p.waitForTimeout(600);
t=await metin();
ok("süzgeçte üçü de var",/Gözcü Biri/.test(t)&&/Gözcü İki/.test(t)&&/Gözcü Üç/.test(t));
ok("süzgeçte akordiyon yok",!/Gözcüler \d/.test(t));
ok("süzgeçte gerçek kaleler yok",!/Satan Market/.test(t));

console.log("═══ 5) gözcü açılabiliyor ═══");
ok("gözcüye tıklanabildi",(await bas("Gözcü Biri"))!=="YOK");
await p.waitForTimeout(700);
ok("kale ekranı açıldı",/Gözcü Biri/.test(await metin()));
ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ GÖZCÜ AKORDİYONU DOĞRULANDI");
process.exit(hata?1:0);
