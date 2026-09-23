/* 🧮 KALEM BAŞI HAKEDİŞ — kale ekranındaki hakediş dökümü
   Sorun: pazarlamacı bir kaledeki satışlarından kalem başına ne kazandığını
   göremiyordu. Döküm yalnız ürün ve gün toplamı veriyordu; aynı ürün farklı
   verilişlerden satıldıysa tek satırda birleşip fark kayboluyordu.
   Veriliş fiyatı zamanla değişiyor: konsinyede geçerli olan, malın RAFA
   BIRAKILDIĞI gündeki veriliştir (satış kaydında donmuş alisFiyat), ürünün
   bugünkü fiyatı değil.
   Doğrulanan:
     1 "Kalem kalem" dökümü var ve varsayılan sekme o
     2 Her satırda adet · satış · veriliş · birim hakediş var
     3 Aynı ürün farklı verilişten satıldıysa AYRI satır olur
     4 Kullanılan veriliş satışın kendi kaydından gelir — ürünün GÜNCEL
       veriliş fiyatı hiçbir satırda geçmez
     5 Çantadan satış, konsinye satışı ve gerilla ayrı işaretlenir
     6 Satırların toplamı kartın hakediş rakamına eşit
     7 Zararına satış (satış < veriliş) eksi görünür, gizlenmez */
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
const T=(g)=>"2026-09-"+String(g).padStart(2,"0")+"T10:00:00.000Z";
/* Ahtapot iki partiden satıldı — aradan veriliş zammı geçti:
     parti A · 3 Eylül bırakıldı, veriliş 30 → 6 adet × 50 sattı  → 20 ₺/adet · 120 ₺
     parti B · 12 Eylül bırakıldı, veriliş 38 → 4 adet × 50 sattı → 12 ₺/adet ·  48 ₺
   Çantadan Penguen · 3 × 40, veriliş 25                          → 15 ₺/adet ·  45 ₺
   Zararına: Çay bardağı · 2 × 30, veriliş 34                     → −4 ₺/adet · −8 ₺
   ÜRÜNÜN BUGÜNKÜ verilişi 41 ₺ — hiçbir satırda görünmemeli.
   Toplam hakediş: 120 + 48 + 45 − 8 = 205 ₺ */
const kons=(id,gun,alis,adet,kalan)=>({id,tip:"konsinye",kullaniciId:"e1",kullaniciAd:"Ahmet",
  musteriId:"m1",yer:"H Kafe",urunId:"u1",urunAd:"Ahtapot",adet,kalan,konsMod:"konsinye",
  satisFiyat:50,alisFiyat:alis,tarih:T(gun)});
const konsSat=(id,gun,alis,adet)=>({id,tip:"satis",kaynak:"konsinye",kullaniciId:"e1",kullaniciAd:"Ahmet",
  musteriId:"m1",yer:"H Kafe",urunId:"u1",urunAd:"Ahtapot",adet,satisFiyat:50,alisFiyat:alis,
  tahsil:adet*50,tarih:T(gun)});
const V={
  kullanici:[{id:"e1",ad:"Ahmet",rol:"pazarlamaci",simge:"🎖️",fermanCephane:true}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"H Kafe",kullaniciId:"e1",bolge:"Üsküdar"}],
  pazarlama_hareket:[
    kons("kA",3,30,6,0), konsSat("sA",5,30,6),
    kons("kB",12,38,4,0), konsSat("sB",14,38,4),
    {id:"sC",tip:"satis",kullaniciId:"e1",kullaniciAd:"Ahmet",musteriId:"m1",yer:"H Kafe",
     urunId:"u2",urunAd:"Penguen",adet:3,satisFiyat:40,alisFiyat:25,tahsil:120,tarih:T(15)},
    {id:"sD",tip:"satis",kullaniciId:"e1",kullaniciAd:"Ahmet",musteriId:"m1",yer:"H Kafe",
     urunId:"u3",urunAd:"Çay bardağı",adet:2,satisFiyat:30,alisFiyat:34,tahsil:60,tarih:T(16)}],
  stok_urun:[
    /* ürünün BUGÜNKÜ verilişi 41 — geçmiş satışların hakedişini değiştirmemeli */
    {id:"u1",ad:"Ahtapot",stokta:60,satisFiyat:55,pazFiyat:41,parcalar:[],parcaAdet:{},pazStokK:{e1:20}},
    {id:"u2",ad:"Penguen",stokta:60,satisFiyat:40,pazFiyat:25,parcalar:[],parcaAdet:{},pazStokK:{e1:20}},
    {id:"u3",ad:"Çay bardağı",stokta:60,satisFiyat:30,pazFiyat:34,parcalar:[],parcaAdet:{},pazStokK:{e1:20}}],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],hedef:[],
  hakedis_donem:[],fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],cephane_talep:[],
};
const b=await chromium.launch({executablePath:KROM});
const c=await b.newContext({viewport:{width:390,height:1700},isMobile:true,hasTouch:true,locale:"tr-TR"});
await c.addInitScript(v=>{ window.__TIKITA_VERI=v; try{ localStorage.setItem("tk_uid","e1"); }catch(e){} },V);
await c.route(u=>/^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(u.href),r=>r.abort());
await c.route(u=>/unpkg\.com\/react@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:REACT}));
await c.route(u=>/unpkg\.com\/react-dom@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:RDOM}));
await c.route(u=>/gstatic\.com\/firebasejs/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:FB}));
await c.route(u=>/unpkg\.com\/leaflet/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:"window.L=new Proxy({},{get:()=>()=>new Proxy({},{get:()=>()=>{}})});"}));
const p=await c.newPage(); const log=[];
p.on("pageerror",e=>log.push("[ERR] "+e.message));
p.on("dialog",d=>d.accept());
await p.goto(SUNUCU+"/deneme.html",{waitUntil:"domcontentloaded"});
await p.waitForFunction(()=>!/Karargâh hazırlanıyor/.test(document.body.innerText||""),{timeout:20000}).catch(()=>{});
const bas=re=>p.evaluate(s=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button,[role=button],div,a")).filter(x=>new RegExp(s).test(d(x)));
  const bt=x=>(x.tagName==="BUTTON"||x.tagName==="A")?0:1;
  L.sort((a,b)=>(d(a).length-d(b).length)||(bt(a)-bt(b)));
  if(L[0]){ L[0].click(); return d(L[0]).slice(0,60);} return "YOK"; },re);
const metin=()=>p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());

await bas("Kaleler"); await p.waitForTimeout(600);
await bas("H Kafe"); await p.waitForTimeout(700);
let t=await metin();
ok("kalede hakediş 205 ₺",/205 ₺/.test(t),(t.match(/bu kaleden kazandığın[\s\S]{0,18}/)||[""])[0]);
ok("hakediş dökümü açıldı",(await bas("bu kaleden kazandığın"))!=="YOK");
await p.waitForTimeout(800);
t=await metin();

console.log("\n═══ 1) Kalem kalem dökümü ═══");
ok("'Kalem kalem' sekmesi var",/Kalem kalem/.test(t));
ok("varsayılan sekme kalem kalem (satırlar açık)",/\/adet/.test(t),(t.match(/-?[\d.]+ ₺\/adet/g)||[]).join(" · "));

console.log("═══ 2-3) aynı ürün farklı verilişten AYRI satır ═══");
ok("6 adet · satış 50 · veriliş 30",/6 adet · satış 50 · veriliş 30/.test(t),
  (t.match(/\d+ adet · satış \d+ · veriliş \d+/g)||[]).join(" | "));
ok("4 adet · satış 50 · veriliş 38",/4 adet · satış 50 · veriliş 38/.test(t));
ok("20 ₺/adet satırı",/20 ₺\/adet/.test(t));
ok("12 ₺/adet satırı",/12 ₺\/adet/.test(t));
ok("iki Ahtapot satırı ayrı duruyor",(t.match(/Ahtapot/g)||[]).length>=2,
  (t.match(/Ahtapot/g)||[]).length+" kez");

console.log("═══ 4) GÜNCEL veriliş kullanılmıyor ═══");
ok("hiçbir satırda 'veriliş 41' yok",!/veriliş 41/.test(t));
ok("Ahtapot hakedişi 120 + 48",/120 ₺/.test(t)&&/48 ₺/.test(t));

console.log("═══ 5) kaynak ayrımı ═══");
ok("konsinye satışı 🏬 ile işaretli",/🏬 Ahtapot/.test(t));
ok("çantadan satış 🎒 ile işaretli",/🎒 Penguen/.test(t));

console.log("═══ 6) toplam tutuyor ═══");
const kalemler=(t.match(/(\d+) adet · satış (\d+) · veriliş (\d+)/g)||[]);
ok("dört kalem satırı var",kalemler.length===4,kalemler.join(" | "));
const top=kalemler.reduce((s,x)=>{ const m=x.match(/(\d+) adet · satış (\d+) · veriliş (\d+)/);
  return s+(+m[2]-+m[3])*(+m[1]); },0);
ok("satırların toplamı 205 ₺",top===205,String(top));

console.log("═══ 7) zararına satış gizlenmiyor ═══");
ok("Çay bardağı -4 ₺/adet",/-4 ₺\/adet/.test(t),(t.match(/Çay bardağı[\s\S]{0,60}/)||[""])[0]);
ok("2 adet · satış 30 · veriliş 34",/2 adet · satış 30 · veriliş 34/.test(t));

console.log("═══ 8) diğer sekmeler duruyor ═══");
ok("Ürüne göre sekmesi",(await bas("^Ürüne göre$"))!=="YOK");
await p.waitForTimeout(400); t=await metin();
ok("ürün toplamı Ahtapot 168 ₺ (120+48)",/168 ₺/.test(t),(t.match(/Ahtapot[\s\S]{0,30}/)||[""])[0]);
ok("Güne göre sekmesi",(await bas("^Güne göre$"))!=="YOK");

ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,200));
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ KALEM BAŞI HAKEDİŞ DOĞRULANDI");
await c.close(); await b.close();
process.exit(hata?1:0);
