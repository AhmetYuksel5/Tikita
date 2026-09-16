/* 💰 SATIŞ SEKMESİ · ÇOKLU LİSTE (konsinye "Bırak" ile aynı tasarım)
   Doğrulanan:
     1 Ürünler alt alta liste — çip seçimi yok, tek tek giriş yok
     2 "Alınan ₺" kutusu YOK (tahsilat kale ekranındaki 🧾 ile yapılıyor)
     3 Enter alt satırın adet kutusuna geçer
     4 Tek kaydetmede BİRDEN ÇOK satış kaydı yazılır, borç toplamı doğru
     5 🏷 İndirim şeridi YALNIZ seçili + indirimli satırda çıkar
     6 Tikita payı verilişten düşer, marj düzelir · ½ ve tümü düğmeleri çalışır
     7 🤝 anlaşmalı fiyat satır bazında müşteri kartına yazılır
     8 Sembolik fiyat (≤1 ₺) hediye olur, borç yazmaz
     9 Yatay kayma yok */
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
const T0="2026-09-10T09:00:00.000Z";
const V={
  kullanici:[{id:"e1",ad:"Emir",rol:"pazarlamaci",simge:"🎖️",fermanCephane:true}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"H Kafe",kullaniciId:"e1",bolge:"Üsküdar"}],
  /* geçmişte bir satış olsun ki kale listede çıksın */
  pazarlama_hareket:[{id:"s0",tip:"satis",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",
    yer:"H Kafe",urunId:"u1",urunAd:"Penguen",adet:2,satisFiyat:40,alisFiyat:25,
    maliyetBirim:12,tahsil:80,tarih:T0}],
  stok_urun:[
    {id:"u1",ad:"Penguen",stokta:80,satisFiyat:40,pazFiyat:25,parcalar:[],parcaAdet:{},pazStokK:{e1:30}},
    {id:"u2",ad:"Kaplumbağa",stokta:70,satisFiyat:60,pazFiyat:30,parcalar:[],parcaAdet:{},pazStokK:{e1:25}},
    {id:"u3",ad:"Ahtapot",stokta:60,satisFiyat:30,pazFiyat:22,parcalar:[],parcaAdet:{},pazStokK:{e1:20}},
  ],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],hedef:[],
  hakedis_donem:[],fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],
};
const b=await chromium.launch({executablePath:KROM});
const c=await b.newContext({viewport:{width:390,height:2000},isMobile:true,hasTouch:true,locale:"tr-TR"});
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
const sheet=()=>p.evaluate(()=>{ const d=document.querySelector("div[style*='z-index: 70']");
  return d?(d.innerText||"").replace(/\s+/g," ").trim():""; });
const kay=n=>p.evaluate(n2=>window.__KAYITLAR(n2),n);
/* satır: ürün adıyla bul, içindeki N. input'a yaz (0=adet, 1=birim ₺, 2=Tikita payı) */
const yaz=(ad,idx,v)=>p.evaluate(([a,i,val])=>{
  const kok=Array.from(document.querySelectorAll("div")).filter(d=>{
    const t=(d.innerText||"").replace(/\s+/g," ").trim();
    return d.querySelector("input")&&new RegExp("^(🎁 |🤝 )?"+a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).test(t); })
    .sort((x,y)=>(x.innerText||"").length-(y.innerText||"").length)[0];
  if(!kok) return "SATIR YOK";
  const ins=Array.from(kok.querySelectorAll("input")); if(!ins[i]) return "KUTU YOK ("+ins.length+")";
  const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
  set.call(ins[i],String(val)); ins[i].dispatchEvent(new Event("input",{bubbles:true}));
  return ins.length+" kutu"; },[ad,idx,v]);
const kutuSay=ad=>p.evaluate(a=>{
  const kok=Array.from(document.querySelectorAll("div")).filter(d=>{
    const t=(d.innerText||"").replace(/\s+/g," ").trim();
    return d.querySelector("input")&&new RegExp("^(🎁 |🤝 )?"+a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).test(t); })
    .sort((x,y)=>(x.innerText||"").length-(y.innerText||"").length)[0];
  return kok?kok.querySelectorAll("input").length:-1; },ad);
const ctaBas=()=>p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
  .filter(x=>/satış işle/i.test(x.innerText||"")); if(!B.length) return "YOK";
  B[B.length-1].click(); return "TIK"; });

await bas("Kaleler"); await p.waitForTimeout(600);
await bas("H Kafe"); await p.waitForTimeout(800);
ok("satışa girildi",(await bas("^💰 ?Satış yap$"))!=="YOK");
await p.waitForTimeout(800);
let sh=await sheet();

console.log("═══ 1) çoklu liste ═══");
ok("rozet SATIŞ",/SATIŞ/.test(sh));
/* Kaplumbağa/Ahtapot'un bu pazarlamacıda geçmişi yok → konsinye ekranındaki
   kuralla "az kullanılanlar" akordiyonunda başlar; açılınca listeye gelir. */
ok("az kullanılanlar akordiyonu var",/Az kullanılanlar/i.test(sh),(sh.match(/Az kullanılanlar \d+/i)||[""])[0]);
await bas("Az kullanılanlar"); await p.waitForTimeout(500);
sh=await sheet();
ok("ürün listesi başlığı",/ÜRÜNLER · ÇANTANDAKİ ADET/.test(sh)||/ÜRÜNLER · ATÖLYEDEKİ ADET/.test(sh),
  (sh.match(/ÜRÜNLER[^A-Z]{0,24}/)||[""])[0]);
ok("üç ürün de alt alta",/Penguen/.test(sh)&&/Kaplumbağa/.test(sh)&&/Ahtapot/.test(sh));
ok("her satırda 2 kutu (adet + birim ₺)",(await kutuSay("Penguen"))===2,String(await kutuSay("Penguen")));
ok("sıralama toggle var",/🔥/.test(sh));

console.log("═══ 2) 'Alınan ₺' kutusu YOK ═══");
ok("alınan kutusu yok",!/Alınan/i.test(sh),(sh.match(/Alınan[^·]{0,30}/)||[""])[0]);
ok("tümü/yarısı tahsilat çipleri yok",!/Tümü ·/.test(sh));
const kay1=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
ok("yatay kayma yok",kay1.sw<=kay1.cw+1,"sw="+kay1.sw+" cw="+kay1.cw);

console.log("═══ 3) Enter alt satıra geçer ═══");
ok("Penguen adeti yazıldı",(await yaz("Penguen",0,3))!=="SATIR YOK",await yaz("Penguen",0,3));
const odakOnce=await p.evaluate(()=>{ const i=document.querySelector("input[data-adet]"); i.focus(); i.select&&i.select();
  return i.getAttribute("data-adet"); });
await p.keyboard.press("Enter"); await p.waitForTimeout(200);
const odakSonra=await p.evaluate(()=>document.activeElement&&document.activeElement.getAttribute("data-adet"));
ok("Enter sonraki adet kutusuna geçti",odakSonra&&odakSonra!==odakOnce,odakOnce+" → "+odakSonra);

console.log("═══ 4) indirim şeridi yalnız gerektiğinde ═══");
sh=await sheet();
ok("indirimsiz satırda şerit YOK",!/🏷/.test(sh),(sh.match(/🏷[^·]{0,30}/)||[""])[0]);
/* Kaplumbağa liste 60 → 50 ₺ gir: 10 ₺ indirim */
await yaz("Kaplumbağa",0,2); await p.waitForTimeout(200);
await yaz("Kaplumbağa",1,50); await p.waitForTimeout(350);
sh=await sheet();
ok("indirimli satırda şerit ÇIKTI",/🏷 10 ₺ indirim/.test(sh),(sh.match(/🏷 [^·]{0,26}/)||[""])[0]);
ok("veriliş 30 ₺ · marj 20 ₺",/veriliş 30 ₺ · marj 20 ₺/.test(sh),(sh.match(/veriliş [^·]+· marj [^\s]+ ₺[^)]*\)?/)||[""])[0]);
ok("Penguen satırında şerit yok",(await kutuSay("Penguen"))===2,String(await kutuSay("Penguen")));

console.log("═══ 5) Tikita payı verilişten düşer ═══");
/* indirim şeridinin kutusu satırın DIŞ bloğunda (iç flex satırının kardeşi),
   o yüzden ad/adet/fiyat kutularıyla birlikte sayfadaki toplamdan doğrulanıyor:
   Penguen 2 + Kaplumbağa 2+1 + Ahtapot 2 = 7 */
const topKutu=await p.evaluate(()=>{ const d=document.querySelector("div[style*=\'z-index: 70\']");
  return d?d.querySelectorAll("input").length:-1; });
ok("indirim kutusu eklendi (toplam 7 kutu)",topKutu===7,String(topKutu));
await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button")).filter(x=>(x.innerText||"").trim()==="tümü");
  if(B.length) B[0].click(); });
await p.waitForTimeout(350); sh=await sheet();
ok("'tümü' → veriliş 20 ₺, marj 30 ₺",/veriliş 20 ₺ · marj 30 ₺/.test(sh),
  (sh.match(/veriliş [\d.]+ ₺ · marj [\d.]+ ₺/)||[""])[0]);
await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button")).filter(x=>(x.innerText||"").trim()==="½");
  if(B.length) B[0].click(); });
await p.waitForTimeout(350); sh=await sheet();
ok("'½' → veriliş 25 ₺, marj 25 ₺",/veriliş 25 ₺ · marj 25 ₺/.test(sh),
  (sh.match(/veriliş [\d.]+ ₺ · marj [\d.]+ ₺/)||[""])[0]);
ok("🤝 düğmesi şeritte",/🤝/.test(sh));
await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button")).filter(x=>(x.innerText||"").trim()==="🤝");
  if(B.length) B[0].click(); });
await p.waitForTimeout(250);

console.log("═══ 6) hediye satırı ═══");
await yaz("Ahtapot",0,4); await p.waitForTimeout(200);
await yaz("Ahtapot",1,1); await p.waitForTimeout(350);
sh=await sheet();
ok("≤1 ₺ satır hediye işaretli",/🎁 Ahtapot/.test(sh),(sh.match(/🎁 \S+/)||[""])[0]);
ok("başlıkta hediye uyarısı",/hediye yazılacak/.test(sh),(sh.match(/\d+ adet[^—]*— hediye yazılacak/)||[""])[0]);

console.log("═══ 7) tek kaydetmede çoklu kayıt ═══");
sh=await sheet();
ok("toplam satırı: 9 adet",/9 adet · toplam/.test(sh),(sh.match(/\d+ adet · toplam [\d.]+ ₺/)||[""])[0]);
/* 3×40 + 2×50 + 4×1(hediye) = 220 ₺ satış */
ok("CTA 224 ₺",/224 ₺ satış işle/.test(sh),(sh.match(/[\d.]+ ₺ satış işle/)||[""])[0]);
ok("kaydedildi",(await ctaBas())==="TIK");
await p.waitForTimeout(1600);
const H=await kay("pazarlama_hareket");
const yeniSat=H.filter(x=>x.tip==="satis"&&x.id!=="s0");
const yeniHed=H.filter(x=>x.tip==="hediye");
ok("iki satış kaydı",yeniSat.length===2,yeniSat.map(x=>x.urunAd+":"+x.adet).join(", "));
ok("bir hediye kaydı",yeniHed.length===1,yeniHed.map(x=>x.urunAd+":"+x.adet).join(", "));
const pg=yeniSat.find(x=>x.urunAd==="Penguen"), kp=yeniSat.find(x=>x.urunAd==="Kaplumbağa");
ok("Penguen 3 × 40 · veriliş 25",pg&&pg.adet===3&&Number(pg.satisFiyat)===40&&Number(pg.alisFiyat)===25,
  pg?JSON.stringify({n:pg.adet,f:pg.satisFiyat,v:pg.alisFiyat,t:pg.tahsil}):"YOK");
ok("Kaplumbağa 2 × 50 · veriliş 25 (½ Tikita)",kp&&kp.adet===2&&Number(kp.satisFiyat)===50&&Number(kp.alisFiyat)===25,
  kp?JSON.stringify({n:kp.adet,f:kp.satisFiyat,v:kp.alisFiyat}):"YOK");
ok("tahsil 0 — borç yazdı",pg&&Number(pg.tahsil)===0&&kp&&Number(kp.tahsil)===0);
ok("hediyenin satış fiyatı 0",yeniHed[0]&&Number(yeniHed[0].satisFiyat)===0);
const M=await kay("musteri");
const anl=((M.find(x=>x.id==="m1")||{}).fiyat||{})["u2"];
ok("🤝 anlaşmalı fiyat müşteriye yazıldı",anl&&Number(anl.satis)===50&&Number(anl.veris)===25,
  JSON.stringify(anl));
const U=await kay("stok_urun");
const pz=id=>((U.find(x=>x.id===id)||{}).pazStokK||{}).e1;
ok("çanta düştü: Penguen 30→27",pz("u1")===27,String(pz("u1")));
ok("çanta düştü: Kaplumbağa 25→23",pz("u2")===23,String(pz("u2")));
ok("çanta düştü: Ahtapot 20→16",pz("u3")===16,String(pz("u3")));

console.log("═══ 8) kale ekranı ═══");
await p.keyboard.press("Escape"); await p.waitForTimeout(900);
const t=await metin();
/* borç: eski 0 + 3×40 + 2×50 = 220 */
ok("borç 220 ₺",/220 ₺ Tahsil et/.test(t),(t.match(/[\d.]+ ₺ Tahsil et/)||[""])[0]);

ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,220));
await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ ÇOKLU SATIŞ DOĞRULANDI");
process.exit(hata?1:0);
