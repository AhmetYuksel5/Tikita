/* ％ KAMPANYA · VERİLİŞ İNDİRİMİ — ödül ürün yerine oran: hedef dolunca kampanya
   dönemindeki satışların veriliş bedelinin %X'i komuta onayıyla hakedişe PRİM
   yazılır (tip:"prim"). Satış kayıtlarına dokunulmaz.
   Doğrulanan:
     1 Komuta: yeni kampanyada "％ Veriliş indirimi" seçilince ödül ürün/adet ve
       mekan/pazarlamacı seçimi kalkar, oran kutusu gelir; kayıt odulTip:"indirim",
       indirimOran, kapsam:"pazarlamaci" olur
     2 Hedefi geçen pazarlamacıda "％ İndirimi ver · X ₺": X = dönemdeki (bas–bit)
       satışların verilişi × oran; dönem dışı ve sembolik fiyatlı satış sayılmaz
     3 Hedefi geçmeyen yalnız tutarı görür (düğme yok); şirket pazarlamacısına prim yok
     4 Onay → pazarlama_hareket tip:"prim" + kampanya.verilen[uid].tutar
     5 Pazarlamacı: Üs kartı hedef dolunca "X ₺ prim komutada", verilince "X ₺ prim verildi"
     6 Pazarlamacı: haftalık hakediş ekranında "🎁 kampanya %oran" satırı, toplam hakediş
       ve Rapor "Bu hafta hakediş" primi içerir
     7 Mahsup: prim nakitten kesilen hakedişe eklenir (nakitDurum + komuta saha nakdi) */
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
/* Bugünün haftası içinde bir an — hafta Cumartesi başlar */
const NOW=Date.now();
const hb=(()=>{ const d=new Date(NOW); d.setHours(0,0,0,0); d.setDate(d.getDate()-((d.getDay()+1)%7)); return d.getTime(); })();
const BU_H=new Date(Math.min(NOW-60e3,hb+3600e3)).toISOString();         // süren hafta
const GECEN_H=new Date(hb-3*864e5).toISOString();                         // kapanmış hafta
const DONEM_ONCESI=new Date(hb-30*864e5).toISOString();                   // kampanya başlamadan
const ymd=t=>{ const d=new Date(t); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
const BAS=ymd(hb-10*864e5);
const sat=(id,uid,ad,tarih,adet,f,v,ek)=>({id,tip:"satis",kullaniciId:uid,kullaniciAd:ad,musteriId:"m1",yer:"Total Kirazlıtepe",
  urunId:"u1",urunAd:"Ahtapot",adet,satisFiyat:f,alisFiyat:v,tahsil:adet*f,tarih,...(ek||{})});
const KMP={id:"k1",ad:"Ekim atağı",kapsam:"pazarlamaci",hedefTip:"adet",hedefUrunId:"",hedefMiktar:150,
  odulTip:"indirim",indirimOran:10,odulUrunId:"",odulAdet:0,kime:[],bas:BAS,bit:"",aktif:true,
  tarih:new Date(hb-10*864e5).toISOString(),okuyan:{e1:"x",e2:"x",s1:"x"}};
const temel=()=>({
  kullanici:[{id:"a1",ad:"Komutan",rol:"admin",simge:"👑"},
    {id:"e1",ad:"Emir",rol:"pazarlamaci",simge:"🎖️"},
    {id:"e2",ad:"Kübra",rol:"pazarlamaci",simge:"🎖️"},
    {id:"s1",ad:"Ahmet",rol:"pazarlamaci",simge:"🐉",sirketPaz:true}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"Total Kirazlıtepe",kullaniciId:"e1",bolge:"Üsküdar"}],
  pazarlama_hareket:[
    /* Emir: dönemde 100 + 60 = 160 adet (≥150) · veriliş 160×30 = 4.800 → %10 = 480 */
    sat("e_g","e1","Emir",GECEN_H,100,50,30),
    sat("e_b","e1","Emir",BU_H,60,50,30),
    sat("e_bed","e1","Emir",BU_H,5,1,30),          // sembolik fiyat — sayılmaz
    sat("e_once","e1","Emir",DONEM_ONCESI,20,50,30), // kampanya öncesi — sayılmaz
    /* Kübra: 50 adet — hedef dolmadı · veriliş 1.500 → 150 */
    sat("k_b","e2","Kübra",BU_H,50,50,30),
    /* Ahmet (şirket pazarlamacısı): 200 adet — prim yok */
    sat("s_b","s1","Ahmet",BU_H,200,50,30)],
  hakedis_donem:[],
  stok_urun:[{id:"u1",ad:"Ahtapot",stokta:500,satisFiyat:50,pazFiyat:30,parcalar:[],parcaAdet:{},pazStokK:{e1:5}}],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],hedef:[],
  fiyat_gecmisi:[],kesif_red:[],kampanya:[KMP],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],cephane_talep:[]});
let V=temel();
const b=await chromium.launch({executablePath:KROM});
async function ac(uid,sayfa){
  const c=await b.newContext({viewport:{width:430,height:1900},isMobile:true,hasTouch:true,locale:"tr-TR"});
  await c.addInitScript(([v,id])=>{ window.__TIKITA_VERI=JSON.parse(JSON.stringify(v));
    try{ localStorage.setItem("tk_uid",id); }catch(e){} },[V,uid]);
  await c.route(u=>/^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(u.href),r=>r.abort());
  await c.route(u=>/unpkg\.com\/react@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:REACT}));
  await c.route(u=>/unpkg\.com\/react-dom@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:RDOM}));
  await c.route(u=>/gstatic\.com\/firebasejs/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:FB}));
  await c.route(u=>/unpkg\.com\/leaflet/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:"window.L=new Proxy({},{get:()=>()=>new Proxy({},{get:()=>()=>{}})});"}));
  const p=await c.newPage(); const log=[];
  p.on("pageerror",e=>log.push("[ERR] "+e.message));
  p.on("dialog",d=>d.accept());
  await p.goto(SUNUCU+"/"+sayfa,{waitUntil:"domcontentloaded"});
  await p.waitForFunction(()=>!/Karargâh hazırlanıyor|Giriş gerekli/.test(document.body.innerText||""),{timeout:20000}).catch(()=>{});
  return {c,p,log};
}
const basBtn=(p,re)=>p.evaluate(s=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button")).filter(x=>new RegExp(s).test(d(x)));
  L.sort((a,b)=>d(a).length-d(b).length);
  if(L[0]){ L[0].click(); return d(L[0]).slice(0,60);} return "YOK"; },re);
const kart=p=>p.evaluate(()=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button")).filter(x=>/Teslim edilecek nakit|Tikita'dan alacağın/.test(d(x)));
  L.sort((a,b)=>d(a).length-d(b).length); return L[0]?d(L[0]):"KART YOK"; });

const metin=p=>p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());

console.log("═══ 1) Komuta · indirim kampanyası tanımla ═══");
{ V=temel(); V.kampanya=[];
  const {c,p,log}=await ac("a1","admin.html");
  await basBtn(p,"Ekip$"); await p.waitForTimeout(700);
  ok("kampanya ekranı açıldı",(await basBtn(p,"Kampanya$"))!=="YOK"); await p.waitForTimeout(500);
  await basBtn(p,"^\\+$"); await p.waitForTimeout(500);
  let t=await metin(p);
  ok("ürün ödülü varsayılan: 'Ödül ürün' görünür",/Ödül ürün/.test(t));
  ok("'％ Veriliş indirimi' seçildi",(await basBtn(p,"Veriliş indirimi$"))!=="YOK"); await p.waitForTimeout(300);
  t=await metin(p);
  ok("ödül ürün / ödül adet kalktı",!/Ödül ürün/.test(t)&&!/Ödül adet/.test(t));
  ok("mekan/pazarlamacı seçimi kalktı",!/Her mekan ayrı/.test(t));
  ok("oran kutusu geldi",/Veriliş indirimi %/.test(t));
  await p.fill('input[placeholder="örn. Ağustos atağı"]',"Kasım atağı");
  const N=p.locator('input[type=number]');
  await N.nth(0).fill("150"); await N.nth(1).fill("12");
  ok("Kaydet basıldı",(await basBtn(p,"^Kaydet$"))!=="YOK"); await p.waitForTimeout(800);
  const K=await p.evaluate(()=>window.__KAYITLAR("kampanya"));
  const k=K.find(x=>x.ad==="Kasım atağı")||{};
  ok("kayıt: odulTip indirim · oran 12 · kapsam pazarlamaci · hedef 150",
    k.odulTip==="indirim"&&Number(k.indirimOran)===12&&k.kapsam==="pazarlamaci"&&Number(k.hedefMiktar)===150,JSON.stringify(k).slice(0,200));
  t=await metin(p);
  ok("listede '150 adet satış → veriliş %12 indirimi'",/150 adet satış → veriliş %12 indirimi/.test(t),(t.match(/150 adet[^D]{0,50}/)||[""])[0]);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 2-4) Komuta · indirim tutarı ve onay ═══");
{ V=temel();
  const {c,p,log}=await ac("a1","admin.html");
  await basBtn(p,"Ekip$"); await p.waitForTimeout(700);
  await basBtn(p,"Kampanya$"); await p.waitForTimeout(700);
  let t=await metin(p);
  ok("Emir: '％ İndirimi ver · 480 ₺' (dönem dışı ve sembolik satış hariç)",/％ İndirimi ver · 480 ₺/.test(t),(t.match(/Emir[^K]{0,80}/)||[""])[0]);
  ok("Kübra: düğme yok, 'Veriliş 1.500 ₺ · %10 = 150 ₺'",/Veriliş 1\.500 ₺ · %10 = 150 ₺/.test(t)&&!/İndirimi ver · 150/.test(t));
  ok("Ahmet: 'Şirket pazarlamacısı · prim yok'",/Şirket pazarlamacısı · prim yok/.test(t));
  ok("onay basıldı",(await basBtn(p,"İndirimi ver"))!=="YOK"); await p.waitForTimeout(900);
  const H=await p.evaluate(()=>window.__KAYITLAR("pazarlama_hareket"));
  const pr=H.filter(x=>x.tip==="prim");
  ok("tek prim kaydı · Emir · 480 ₺ · %10 · kampanyaId k1",pr.length===1&&pr[0].kullaniciId==="e1"&&Number(pr[0].tutar)===480
    &&Number(pr[0].oran)===10&&pr[0].kampanyaId==="k1",JSON.stringify(pr).slice(0,200));
  ok("satış kayıtlarına dokunulmadı",H.filter(x=>x.tip==="satis").every(x=>Number(x.alisFiyat)===30));
  const K=(await p.evaluate(()=>window.__KAYITLAR("kampanya"))).find(x=>x.id==="k1")||{};
  ok("kampanya.verilen.e1.tutar 480",K.verilen&&K.verilen.e1&&Number(K.verilen.e1.tutar)===480,JSON.stringify(K.verilen||{}));
  t=await metin(p);
  ok("Emir satırı: '✓ 480 ₺ prim verildi'",/✓ 480 ₺ prim verildi/.test(t));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 5) Pazarlamacı · Üs kartı, prim verilmeden ═══");
{ V=temel();
  const {c,p,log}=await ac("e1","deneme.html");
  await p.waitForTimeout(800);
  const t=await metin(p);
  ok("kart: '✅ 480 ₺ prim komutada'",/✅ 480 ₺ prim komutada/.test(t),(t.match(/Ekim atağı[^K]{0,90}/)||[""])[0]);
  ok("kart: 'Ödül: Veriliş %10 indirimi · şu an 480 ₺'",/Ödül: Veriliş %10 indirimi · şu an 480 ₺/.test(t));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 5-7) Pazarlamacı · prim verildikten sonra ═══");
{ V=temel();
  /* prim az önce verildi: son işlemlerde ve bugünün komuta raporunda görünsün */
  V.pazarlama_hareket.push({id:(NOW-60e3).toString(36)+"prim01",tip:"prim",kaynak:"kampanya",kampanyaId:"k1",kampanyaAd:"Ekim atağı",
    kullaniciId:"e1",kullaniciAd:"Emir",oran:10,verisBedel:4800,adet:160,tutar:480,tarih:new Date(NOW-60e3).toISOString()});
  V.kampanya[0].verilen={e1:{tarih:BU_H,tutar:480}};
  const {c,p,log}=await ac("e1","deneme.html");
  await p.waitForTimeout(800);
  let t=await metin(p);
  ok("Üs kartı: '🎁 480 ₺ prim verildi'",/🎁 480 ₺ prim verildi/.test(t));
  /* süren haftanın hakedişi: 60×20 = 1.200 + 480 prim = 1.680 (sembolik 0) */
  ok("Üs: toplam hakediş primi içerir (kalelerin 3.455 ₺ + 480 ₺ = 3.935 ₺)",/3\.935 ₺ toplam hakediş/.test(t),(t.match(/[\d.]+ ₺ toplam hakediş/)||[""])[0]);
  await basBtn(p,"Rapor$"); await p.waitForTimeout(1000);
  t=await metin(p);
  ok("son işlemler: '🎁 Kampanya primi · Ekim atağı · 480 ₺'",/🎁 Kampanya primi · Ekim atağı · 480 ₺/.test(t));
  const primGeri=await p.evaluate(()=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
    const r=Array.from(document.querySelectorAll("div")).filter(x=>/^🎁 Kampanya primi · Ekim atağı/.test(d(x))).sort((a,b)=>d(a).length-d(b).length)[0];
    return r?!!r.querySelector("button"):null; });
  ok("son işlemler: primde geri alma düğmesi yok",primGeri===false,String(primGeri));
  ok("Detaylı dönem raporu açıldı",(await basBtn(p,"Detaylı dönem raporu"))!=="YOK"); await p.waitForTimeout(600);
  t=await metin(p);
  ok("Detaylı dönem raporu: 'Kampanya primi 🎁 Ekim atağı · %10 480 ₺'",/Kampanya primi 🎁 Ekim atağı · %10 480 ₺/.test(t));
  await basBtn(p,"^✕$"); await p.waitForTimeout(400);
  ok("Komuta'ya rapor açıldı",(await basBtn(p,"Komuta'ya rapor ver"))!=="YOK"); await p.waitForTimeout(700);
  ok("hakediş dökümü açıldı",(await p.evaluate(()=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
    const L=Array.from(document.querySelectorAll("button,div")).filter(x=>/hakedişin \(satış − alış\)/.test(d(x))).sort((a,b)=>d(a).length-d(b).length);
    if(L[0]){ L[0].click(); return true; } return false; })));
  await p.waitForTimeout(600); t=await metin(p);
  ok("Komuta'ya rapor: hakediş dökümünde '🎁 Ekim atağı · %10 … +480 ₺'",/🎁 Ekim atağı · %10 kampanya primi · [^+]{0,30}\+480 ₺/.test(t),(t.match(/🎁 Ekim atağı · %10[^₺]{0,60}₺/)||[""])[0]);
  await p.goto(SUNUCU+"/deneme.html",{waitUntil:"domcontentloaded"}); await p.waitForTimeout(1500);
  await basBtn(p,"Rapor$"); await p.waitForTimeout(1000);
  t=await metin(p);
  ok("Rapor: 'Bu hafta hakediş' 1.680 ₺",/1\.680 ₺ Bu hafta hakediş/.test(t),(t.match(/[\d.]+ ₺ Bu hafta hakediş/)||[""])[0]);
  await p.evaluate(()=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
    const L=Array.from(document.querySelectorAll("div,button")).filter(x=>/^[\d.]+ ₺ › (hakediş|satış) · \d+\. hafta/.test(d(x))||/^[\d.]+ ₺ ›?\s*hakediş · \d+\. hafta/.test(d(x)));
    L.sort((a,b)=>d(a).length-d(b).length); L[0]&&L[0].click(); });
  await p.waitForTimeout(700);
  t=await metin(p);
  ok("hafta ekranı: '🎁 Ekim atağı %10 — 480 ₺' satırı",/🎁 Ekim atağı %10 — 480 ₺/.test(t),(t.match(/🎁 Ekim[^T]{0,40}/)||[""])[0]);
  ok("hafta ekranı: Toplam hakediş 1.680 ₺",/Toplam [\d.]+ ₺ 1\.680 ₺/.test(t),(t.match(/Toplam [\d.]+ ₺ [\d.]+ ₺/)||[""])[0]);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 7) Pazarlamacı · prim nakitten kesilir ═══");
{ V=temel();
  V.pazarlama_hareket=[
    {id:"t1",tip:"tahsilat",kullaniciId:"e2",kullaniciAd:"Kübra",musteriId:"m1",yer:"Total Kirazlıtepe",tutar:1000,tarih:GECEN_H},
    {id:"p2",tip:"prim",kaynak:"kampanya",kampanyaId:"k1",kampanyaAd:"Ekim atağı",kullaniciId:"e2",kullaniciAd:"Kübra",oran:10,tutar:300,tarih:GECEN_H}];
  const {c,p,log}=await ac("e2","deneme.html");
  await basBtn(p,"Rapor$"); await p.waitForTimeout(1000);
  ok("teslim sheet açıldı",(await basBtn(p,"Teslim edilecek nakit"))!=="YOK"); await p.waitForTimeout(600);
  const t=await metin(p);
  ok("'Hakedişin (nakitten kesilen) −300 ₺' · 'Şimdi teslim edilecek 700 ₺'",
    /Hakedişin \(nakitten kesilen\) −300 ₺/.test(t)&&/Şimdi teslim edilecek 700 ₺/.test(t),(t.match(/Kapanan haftalarda[^T]{0,120}/)||[""])[0]);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 7) Komuta · saha nakdi primi düşer ═══");
{ V=temel();
  V.pazarlama_hareket=[
    {id:"t1",tip:"tahsilat",kullaniciId:"e2",kullaniciAd:"Kübra",musteriId:"m1",yer:"Total Kirazlıtepe",tutar:1000,tarih:GECEN_H},
    {id:"p2",tip:"prim",kaynak:"kampanya",kampanyaId:"k1",kampanyaAd:"Ekim atağı",kullaniciId:"e2",kullaniciAd:"Kübra",oran:10,tutar:300,tarih:GECEN_H}];
  const {c,p,log}=await ac("a1","admin.html");
  await basBtn(p,"Rapor$"); await p.waitForTimeout(1500);
  await basBtn(p,"Diğer göstergeler"); await p.waitForTimeout(700);
  ok("saha nakdi açıldı",(await basBtn(p,"Saha nakdi"))!=="YOK"); await p.waitForTimeout(700);
  const t=await metin(p);
  ok("Kübra: hakediş mahsubu −300 ₺ → 700 ₺",/Kübra kapanan haftalar 1\.000 ₺ · hakediş mahsubu −300 ₺/.test(t)&&/Kübra kapanan[^K]{0,90}700 ₺/.test(t),
    (t.match(/Kübra kapanan[^K]{0,110}/)||[""])[0]);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ KAMPANYA VERİLİŞ İNDİRİMİ DOĞRULANDI");
await b.close();
process.exit(hata?1:0);
