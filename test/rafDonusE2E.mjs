/* ↩️ RAF DÖNÜŞÜ — konsinye satışı geri alınınca adet ÇIKTIĞI PARTİYE dönmeli.
   Canlı olay (15 Eylül, Temel Süpermarket · Halkalı Kalp anahtarlık):
     14 bırakıldı → 14 satıldı (parti kapandı) → 5 bırakıldı → 5 satıldı → İPTAL
   Doğru sonuç: 5'lik parti yeniden açılır (kalan 5), 14'lük kapalı kalır (0).
   Eski davranış: dönüş EN ESKİ boş yerden başlıyordu → 14'lük partiye 5 yazıyor,
   5'lik parti satılmış görünüyor ve artık silinemiyordu.

   Doğrulanan:
     1 Konsinye satışı hangi partilerden düştüğünü kayda yazıyor (konsParti)
     2 Tek parti: iptal aynı partiye döner
     3 CANLI SENARYO: kapanmış eski parti değil, YENİ parti yeniden açılır
     4 Parti izi olmayan ESKİ kayıtlarda dönüş en YENİ boş yerden başlar
     5 Toplam açık konsinye her adımda doğru
     6 İki partiden düşen satış iptal edilince her parti kendi payını geri alır */
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
const KONS=(id,adet,kalan,tarih,ek)=>({id,tip:"konsinye",konsMod:"konsinye",
  kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Temel Süpermarket",
  urunId:"u1",urunAd:"Halkalı Kalp anahtarlık",adet,kalan,satisFiyat:30,alisFiyat:25,
  maliyetBirim:12,tarih,...(ek||{})});
const V={
  kullanici:[{id:"e1",ad:"Emir",rol:"pazarlamaci",simge:"🎖️",fermanCephane:true}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"Temel Süpermarket",kullaniciId:"e1",bolge:"Fındıklı"}],
  /* A = 18:01 bırakılan 14, TAMAMI satıldı (kalan 0) · B = 18:26 bırakılan 5, açık */
  pazarlama_hareket:[
    KONS("A",14,0,"2026-09-15T15:01:00.000Z"),
    {id:"SA",tip:"satis",kaynak:"konsinye",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",
     yer:"Temel Süpermarket",urunId:"u1",urunAd:"Halkalı Kalp anahtarlık",adet:14,
     satisFiyat:30,alisFiyat:25,maliyetBirim:12,tahsil:0,
     konsParti:[{id:"A",adet:14}],tarih:"2026-09-15T15:03:00.000Z"},
    KONS("B",5,5,"2026-09-15T15:26:00.000Z"),
  ],
  stok_urun:[{id:"u1",ad:"Halkalı Kalp anahtarlık",stokta:3,satisFiyat:30,pazFiyat:25,
    parcalar:[],parcaAdet:{},pazStokK:{e1:20}}],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],hedef:[],
  hakedis_donem:[],fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],
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
const kay=n=>p.evaluate(n2=>window.__KAYITLAR(n2),n);
const kalan=async id=>{ const H=await kay("pazarlama_hareket"); const r=H.find(x=>x.id===id);
  return r?Number(r.kalan):null; };
const acikTop=async()=>{ const H=await kay("pazarlama_hareket");
  return H.filter(x=>x.tip==="konsinye").reduce((s,x)=>s+Math.max(0,Number(x.kalan)||0),0); };
const adetYaz=(ad,n)=>p.evaluate(([a,v])=>{
  const sat=Array.from(document.querySelectorAll("input[data-adet]")).map(i=>({i,
    t:(i.closest("div")?i.closest("div").innerText||"":"").replace(/\s+/g," ").trim()}));
  const h=sat.find(s=>new RegExp("^"+a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).test(s.t));
  if(!h) return "YOK";
  const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
  set.call(h.i,String(v)); h.i.dispatchEvent(new Event("input",{bubbles:true}));
  return h.t.slice(0,40); },[ad,n]);
const ctaBas=re=>p.evaluate(s=>{ const B=Array.from(document.querySelectorAll("button"))
  .filter(x=>new RegExp(s,"i").test(x.innerText||"")); if(!B.length) return "YOK";
  B[B.length-1].click(); return "TIK"; },re);
/* son işlemler kartındaki ↩️ ile satırı geri al (metne göre eşleştirir) */
const geriAl=re=>p.evaluate(s=>{
  const B=Array.from(document.querySelectorAll("button")).filter(x=>(x.innerText||"").trim()==="↩️");
  for(const bt of B){ let k=bt.parentElement;
    for(let i=0;i<5&&k;i++,k=k.parentElement){
      const t=(k.innerText||"").replace(/\s+/g," ");
      if(new RegExp(s).test(t)){ bt.click(); return t.slice(0,70); } } }
  return "YOK"; },re);

await bas("Kaleler"); await p.waitForTimeout(600);
await bas("Temel Süpermarket"); await p.waitForTimeout(700);

console.log("═══ 0) başlangıç durumu ═══");
ok("A partisi kapalı (0/14)",(await kalan("A"))===0,String(await kalan("A")));
ok("B partisi açık (5/5)",(await kalan("B"))===5,String(await kalan("B")));
ok("açık konsinye 5",(await acikTop())===5,String(await acikTop()));

console.log("═══ 1) B'den 5 adet konsinye satışı ═══");
ok("konsinyeye girildi",(await bas("adet konsinye"))!=="YOK");
await p.waitForTimeout(800);
await bas("💰 Satış"); await p.waitForTimeout(500);
ok("raf satırına adet yazıldı",(await adetYaz("Halkalı Kalp",5))!=="YOK",await adetYaz("Halkalı Kalp",5));
await p.waitForTimeout(300);
ok("satış kaydedildi",(await ctaBas("konsinye satışı"))==="TIK");
await p.waitForTimeout(1300);
let H=await kay("pazarlama_hareket");
const yeni=H.filter(x=>x.tip==="satis"&&x.kaynak==="konsinye"&&x.id!=="SA");
ok("bir satış kaydı oluştu",yeni.length===1,yeni.length+" kayıt");
ok("FIFO B'den düştü (A dolmadı)",(await kalan("A"))===0&&(await kalan("B"))===0,
  "A="+(await kalan("A"))+" B="+(await kalan("B")));
ok("parti izi yazıldı",Array.isArray(yeni[0]&&yeni[0].konsParti)&&yeni[0].konsParti.length===1
  &&yeni[0].konsParti[0].id==="B"&&yeni[0].konsParti[0].adet===5,
  JSON.stringify(yeni[0]&&yeni[0].konsParti));
ok("açık konsinye 0",(await acikTop())===0,String(await acikTop()));

console.log("═══ 2) satışı İPTAL et — adet B'ye dönmeli, A'ya DEĞİL ═══");
await p.keyboard.press("Escape"); await p.waitForTimeout(600);
ok("geri al düğmesine basıldı",(await geriAl("Halkalı Kalp|Konsinye satış"))!=="YOK",
  await p.evaluate(()=>Array.from(document.querySelectorAll("button")).filter(x=>(x.innerText||"").trim()==="↩️").length+" ↩️ düğmesi"));
await p.waitForTimeout(1500);
H=await kay("pazarlama_hareket");
ok("satış kaydı silindi",!H.some(x=>x.tip==="satis"&&x.kaynak==="konsinye"&&x.id!=="SA"),
  H.filter(x=>x.tip==="satis").map(x=>x.id).join(","));
ok("B partisi yeniden AÇILDI (5)",(await kalan("B"))===5,String(await kalan("B")));
ok("A partisi KAPALI kaldı (0)",(await kalan("A"))===0,String(await kalan("A")));
ok("açık konsinye yine 5",(await acikTop())===5,String(await acikTop()));

console.log("═══ 3) parti izi OLMAYAN eski kayıt — en yeni boş yerden dönmeli ═══");
/* 14'lük A kapalı, 5'lik B açık. İz taşımayan 5'lik eski bir satış kaydı ekle,
   B'yi de kapat: iptal edilince adet B'ye dönmeli (en yeni), A'ya değil. */
await p.evaluate(()=>{
  const H=window.__KAYITLAR("pazarlama_hareket").map(x=>x.id==="B"?{...x,kalan:0}:x);
  H.push({id:"ESKI",tip:"satis",kaynak:"konsinye",kullaniciId:"e1",kullaniciAd:"Emir",
    musteriId:"m1",yer:"Temel Süpermarket",urunId:"u1",urunAd:"Halkalı Kalp anahtarlık",
    adet:5,satisFiyat:30,alisFiyat:25,maliyetBirim:12,tahsil:0,
    tarih:new Date(Date.now()-3600e3).toISOString()});   // konsParti YOK
  window.__DEGISTIR("pazarlama_hareket",H); });
await p.waitForTimeout(900);
ok("kurulum: A=0 B=0",(await kalan("A"))===0&&(await kalan("B"))===0,
  "A="+(await kalan("A"))+" B="+(await kalan("B")));
ok("izsiz kayıt geri alındı",(await geriAl("Halkalı Kalp|Konsinye satış"))!=="YOK");
await p.waitForTimeout(1500);
ok("en YENİ parti (B) doldu",(await kalan("B"))===5,String(await kalan("B")));
ok("en eski parti (A) boş kaldı",(await kalan("A"))===0,String(await kalan("A")));

console.log("═══ 4) iki partiden düşen satış — her parti payını geri alır ═══");
await p.evaluate(()=>{
  const H=window.__KAYITLAR("pazarlama_hareket")
    .filter(x=>x.id!=="ESKI")
    .map(x=>x.id==="A"?{...x,kalan:0}:(x.id==="B"?{...x,kalan:0}:x));
  /* C = yeni bırakış 7, açık 3 · A'ya 2 yer aç → satış 2+3 = 5 iki partiden */
  H.push({id:"C",tip:"konsinye",konsMod:"konsinye",kullaniciId:"e1",kullaniciAd:"Emir",
    musteriId:"m1",yer:"Temel Süpermarket",urunId:"u1",urunAd:"Halkalı Kalp anahtarlık",
    adet:7,kalan:3,satisFiyat:30,alisFiyat:25,maliyetBirim:12,
    tarih:"2026-09-15T16:00:00.000Z"});
  H.push({id:"IKI",tip:"satis",kaynak:"konsinye",kullaniciId:"e1",kullaniciAd:"Emir",
    musteriId:"m1",yer:"Temel Süpermarket",urunId:"u1",urunAd:"Halkalı Kalp anahtarlık",
    adet:5,satisFiyat:30,alisFiyat:25,maliyetBirim:12,tahsil:0,
    konsParti:[{id:"B",adet:2},{id:"C",adet:3}],
    tarih:new Date(Date.now()-1800e3).toISOString()});
  window.__DEGISTIR("pazarlama_hareket",H); });
await p.waitForTimeout(900);
ok("iki partili kayıt geri alındı",(await geriAl("Halkalı Kalp|Konsinye satış"))!=="YOK");
await p.waitForTimeout(1600);
ok("B payı 2 döndü",(await kalan("B"))===2,String(await kalan("B")));
ok("C payı 3 döndü (3→6)",(await kalan("C"))===6,String(await kalan("C")));
ok("A'ya hiç yazılmadı",(await kalan("A"))===0,String(await kalan("A")));

ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,220));
await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ RAF DÖNÜŞÜ DOĞRULANDI");
process.exit(hata?1:0);
