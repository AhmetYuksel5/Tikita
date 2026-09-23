/* 🏬 KONSİNYE EKRANINDA VERİLİŞ (üreticiden alış) BEDELİ
   Sorun: pazarlamacı rafa mal bırakırken ürünü kaça aldığını göremiyordu.
   Bırakış fiyatını görerek giriyor ama marjını hesaplayamıyordu; veriliş
   yalnız ürün kartında ve satış ekranındaki indirim şeridinde vardı.
   Doğrulanan:
     1 Bırak sekmesinde her satırda veriliş ve marj yazıyor
     2 Bırakış fiyatı elle değişince marj da değişiyor
     3 Alt toplamda toplam marj var
     4 Anlaşmalı fiyatlı üründe anlaşmalı veriliş okunuyor
     5 Konsinye SATIŞ sekmesinde raf fiyatı · veriliş · hakediş var
     6 Hediye sekmesinde verilen malın maliyeti görünüyor
     7 İade sekmesi para göstermiyor (orada satış yok) */
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
/* Penguen : liste 40 · veriliş 25            → marj 15
   Ahtapot : liste 50 · veriliş 30            → marj 20  · rafta 9 adet (bırakış 50, alış 30)
   Çiçek   : liste 60 · veriliş 35 · anlaşmalı satış 55 / veriliş 32 → marj 23 */
const V={
  kullanici:[{id:"e1",ad:"Ahmet",rol:"pazarlamaci",simge:"🎖️",fermanCephane:true}],
  ayar:[{id:"genel"}],
  /* 🤝 anlaşmalı fiyat müşteri kaydında "fiyat" alanında durur */
  musteri:[{id:"m1",ad:"H Kafe",kullaniciId:"e1",bolge:"Üsküdar",
    fiyat:{u3:{satis:55,veris:32}}}],
  pazarlama_hareket:[
    {id:"k1",tip:"konsinye",kullaniciId:"e1",kullaniciAd:"Ahmet",musteriId:"m1",yer:"H Kafe",
     urunId:"u2",urunAd:"Ahtapot",adet:9,kalan:9,satisFiyat:50,alisFiyat:30,konsMod:"konsinye",tarih:T0}],
  stok_urun:[
    {id:"u1",ad:"Penguen",stokta:60,satisFiyat:40,pazFiyat:25,parcalar:[],parcaAdet:{},pazStokK:{e1:20}},
    {id:"u2",ad:"Ahtapot",stokta:60,satisFiyat:50,pazFiyat:30,parcalar:[],parcaAdet:{},pazStokK:{e1:20}},
    {id:"u3",ad:"Çiçek",stokta:60,satisFiyat:60,pazFiyat:35,parcalar:[],parcaAdet:{},pazStokK:{e1:20}}],
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
/* bir ürün satırının TAM metni (ad + alt yazı) */
const satirMetni=ad=>p.evaluate(a=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("div")).filter(x=>x.querySelector("input[data-adet]")&&new RegExp("(^|\\s)"+a+"(\\s|$)").test(d(x)));
  L.sort((x,y)=>d(x).length-d(y).length); return L[0]?d(L[0]):"YOK"; },ad);
const adetYaz=(ad,n)=>p.evaluate(([a,v])=>{
  const sat=Array.from(document.querySelectorAll("input[data-adet]")).map(i=>({i,
    t:(i.closest("div")?i.closest("div").innerText||"":"").replace(/\s+/g," ").trim()}));
  const h=sat.find(s=>new RegExp("^"+a+"\\b").test(s.t));
  if(!h) return "YOK";
  const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
  set.call(h.i,String(v)); h.i.dispatchEvent(new Event("input",{bubbles:true}));
  return "OK"; },[ad,n]);
/* aynı satırın BİRİM ₺ kutusuna yaz (adet kutusundan sonraki number input) */
const fiyatYaz=(ad,n)=>p.evaluate(([a,v])=>{
  const sat=Array.from(document.querySelectorAll("input[data-adet]")).map(i=>({i,
    t:(i.closest("div")?i.closest("div").innerText||"":"").replace(/\s+/g," ").trim()}));
  const h=sat.find(s=>new RegExp("^"+a+"\\b").test(s.t));
  if(!h) return "YOK";
  const kut=h.i.parentElement.querySelectorAll('input[type=number]');
  const fi=Array.from(kut).find(x=>x!==h.i);
  if(!fi) return "FİYAT KUTUSU YOK";
  const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
  set.call(fi,String(v)); fi.dispatchEvent(new Event("input",{bubbles:true}));
  return "OK"; },[ad,n]);

await bas("Kaleler"); await p.waitForTimeout(600);
await bas("H Kafe"); await p.waitForTimeout(700);
ok("konsinye ekranı açıldı",(await bas("adet konsinye"))!=="YOK");
await p.waitForTimeout(800);
/* Penguen ve Çiçek'in bu pazarlamacıda geçmişi yok → "Az kullanılanlar"da başlar */
await bas("Az kullanılanlar"); await p.waitForTimeout(400);

console.log("\n═══ 1) BIRAK — veriliş ve marj satırda ═══");
let s=await satirMetni("Penguen");
ok("Penguen satırında veriliş 25 ₺",/veriliş 25 ·/.test(s),s);
ok("Penguen satırında marj 15 ₺",/marj 15 ₺/.test(s),s);
s=await satirMetni("Ahtapot");
ok("Ahtapot satırında veriliş 30 ₺",/veriliş 30 ·/.test(s),s);
ok("Ahtapot satırında marj 20 ₺",/marj 20 ₺/.test(s),s);

console.log("═══ 2) fiyat değişince marj da değişiyor ═══");
ok("Penguen adeti yazıldı",(await adetYaz("Penguen",4))==="OK");
ok("Penguen birim ₺ 30 yazıldı",(await fiyatYaz("Penguen",30))==="OK");
await p.waitForTimeout(350);
s=await satirMetni("Penguen");
ok("marj 15 → 5 ₺",/marj 5 ₺/.test(s)&&!/marj 15 ₺/.test(s),s);

console.log("═══ 3) alt toplamda marj ═══");
let t=await metin();
ok("toplam 120 ₺ (4 × 30)",/toplam 120 ₺/.test(t),(t.match(/\d+ adet · toplam [\d.]+ ₺[^·]*(· marj [\d.]+ ₺)?/)||[""])[0]);
ok("toplam marj 20 ₺ (4 × 5)",/marj 20 ₺/.test(t),(t.match(/· marj [\d.]+ ₺/)||[""])[0]);

console.log("═══ 4) anlaşmalı üründe anlaşmalı veriliş ═══");
s=await satirMetni("Çiçek");
ok("Çiçek anlaşmalı 55 ₺",/anlaşmalı 55 ·/.test(s),s);
ok("Çiçek verilişi 32 ₺ (anlaşmalı)",/veriliş 32 ·/.test(s),s);
ok("Çiçek marjı 23 ₺",/marj 23 ₺/.test(s),s);

console.log("═══ 5) KONSİNYE SATIŞ sekmesi — raf · veriliş · hakediş ═══");
ok("Satış sekmesine geçildi",(await bas("^💰 Satış$"))!=="YOK");
await p.waitForTimeout(600);
s=await satirMetni("Ahtapot");
ok("rafa 50 ₺ bırakılmıştı",/raf 50 ·/.test(s),s);
ok("veriliş 30 ₺",/veriliş 30 ·/.test(s),s);
ok("hakediş 20 ₺",/hakediş 20 ₺/.test(s),s);
ok("Ahtapot adeti yazıldı",(await adetYaz("Ahtapot",3))==="OK");
await p.waitForTimeout(350);
t=await metin();
ok("alt toplamda hakediş 60 ₺ (3 × 20)",/hakediş 60 ₺/.test(t),(t.match(/\d+ adet · toplam [\d.]+ ₺ · hakediş [\d.]+ ₺/)||[""])[0]);

console.log("═══ 6) HEDİYE sekmesi — maliyet görünür ═══");
ok("Hediye sekmesine geçildi",(await bas("^🎁 Hediye$"))!=="YOK");
await p.waitForTimeout(600);
s=await satirMetni("Penguen");
ok("hediyede veriliş 25 ₺",/veriliş 25 ₺/.test(s),s);
ok("hediyede marj YAZMIYOR",!/marj/.test(s),s);
ok("Penguen adeti yazıldı",(await adetYaz("Penguen",2))==="OK");
await p.waitForTimeout(350);
t=await metin();
ok("alt toplamda maliyet 50 ₺ (2 × 25)",/maliyet 50 ₺/.test(t),(t.match(/\d+ adet · hediye[^\n]{0,30}/)||[""])[0]);

console.log("═══ 7) İADE sekmesinde para yok ═══");
ok("İade sekmesine geçildi",(await bas("^↩️ İade$"))!=="YOK");
await p.waitForTimeout(600);
s=await satirMetni("Ahtapot");
ok("iadede veriliş/hakediş yok",!/veriliş|hakediş|marj/.test(s),s);

ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,200));
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ KONSİNYE VERİLİŞ BİLGİSİ DOĞRULANDI");
await c.close(); await b.close();
process.exit(hata?1:0);
