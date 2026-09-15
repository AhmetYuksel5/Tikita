/* 📋 SAYIM — doğrudan satış yapılan mekanda standdaki ürünün takibi.
   Konsinyede raf para hareketlerinden türetilebiliyor (mal bizim, çıkan her adet
   kayda girmek zorunda). Doğrudan satışta mal müşterinin olduğu için onun uç
   tüketiciye satışı bizde kayıt üretmiyor → bilgi GÖZLEMLE girilmek zorunda.

   Doğrulanan:
     1 Kale ekranında 📋 Sayım aksiyonu var (2×2 ızgara)
     2 Kutular "bizce şu kadar var" değeriyle DOLU gelir (yarım sayım olmaz)
     3 Sayım para doğurmaz: borç · ciro · hakediş · stok DEĞİŞMEZ
     4 Havuz sayılan değere çekilir → kart "standında duran" olur
     5 Müşterinin sattığı = önceki havuz − sayılan
     6 Aynı ekrandan bırakılan ürün DOĞRUDAN SATIŞ olur ve borç yazar
     7 Sayım ziyaretin BAŞI sayılır: aynı ziyarette bırakılan üstüne eklenir
     8 Konsinye rafı yalnız SAYILIR — raf değişmez, kayma gösterilir
     9 Sayım geri alınınca havuz eski hâline döner */
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
const T0="2026-09-01T09:00:00.000Z";
/* Doğrudan satış mekanı: 20 Penguen × 40 ₺ satılmış, 800 ₺ tahsil edilmiş (borç 0).
   Ayrıca 6 Ahtapot konsinye bırakılmış (kayma sınaması için). */
const V={
  kullanici:[{id:"e1",ad:"Emir",rol:"pazarlamaci",simge:"🎖️",fermanCephane:true}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"Nazar Büfe",kullaniciId:"e1",bolge:"Üsküdar"}],
  pazarlama_hareket:[
    {id:"s1",tip:"satis",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Nazar Büfe",
     urunId:"u1",urunAd:"Penguen",adet:20,satisFiyat:40,alisFiyat:25,maliyetBirim:12,
     tahsil:800,tarih:T0},
    {id:"kx",tip:"konsinye",konsMod:"konsinye",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",
     yer:"Nazar Büfe",urunId:"u2",urunAd:"Ahtapot",adet:6,kalan:6,satisFiyat:30,alisFiyat:22.5,
     maliyetBirim:10,tarih:T0},
  ],
  stok_urun:[
    {id:"u1",ad:"Penguen",stokta:60,satisFiyat:40,pazFiyat:25,parcalar:[],parcaAdet:{},pazStokK:{e1:30}},
    {id:"u2",ad:"Ahtapot",stokta:40,satisFiyat:30,pazFiyat:22.5,parcalar:[],parcaAdet:{},pazStokK:{e1:25}},
  ],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],hedef:[],
  hakedis_donem:[],fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],
};
const b=await chromium.launch({executablePath:KROM});
const c=await b.newContext({viewport:{width:390,height:1800},isMobile:true,hasTouch:true,locale:"tr-TR"});
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
/* ürün satırındaki N. kutuya yaz (0 = sayım, 1 = bırak) */
const kutuYaz=(ad,idx,v)=>p.evaluate(([a,i,val])=>{
  const rows=Array.from(document.querySelectorAll("input[data-adet]")).map(x=>({x,
    t:(x.closest("div")?x.closest("div").innerText||"":"").replace(/\s+/g," ").trim()}));
  const grup=rows.filter(r=>new RegExp("^"+a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).test(r.t));
  if(!grup[i]) return "YOK";
  const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
  set.call(grup[i].x,String(val)); grup[i].x.dispatchEvent(new Event("input",{bubbles:true}));
  return grup.length+" kutu"; },[ad,idx,v]);
const kutuDeger=(ad,idx)=>p.evaluate(([a,i])=>{
  const rows=Array.from(document.querySelectorAll("input[data-adet]")).map(x=>({x,
    t:(x.closest("div")?x.closest("div").innerText||"":"").replace(/\s+/g," ").trim()}));
  const grup=rows.filter(r=>new RegExp("^"+a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).test(r.t));
  return grup[i]?grup[i].x.value:"YOK"; },[ad,idx]);
const ctaBas=re=>p.evaluate(s=>{ const B=Array.from(document.querySelectorAll("button"))
  .filter(x=>new RegExp(s,"i").test(x.innerText||"")); if(!B.length) return "YOK";
  B[B.length-1].click(); return "TIK"; },re);
/* ⚠ Kapsayıcı TAM BİR ↩️ içermeli. Yoksa üst seviyede tüm kart eşleşiyor ve
   yanlış satır siliniyor — bu tuzağa daha önce de düşüldü. */
const geriAl=re=>p.evaluate(s=>{
  const B=Array.from(document.querySelectorAll("button")).filter(x=>(x.innerText||"").trim()==="↩️");
  for(const bt of B){ let k=bt.parentElement;
    for(let i=0;i<5&&k;i++,k=k.parentElement){
      if(k.querySelectorAll("button").length&&
         Array.from(k.querySelectorAll("button")).filter(z=>(z.innerText||"").trim()==="↩️").length!==1) break;
      const t=(k.innerText||"").replace(/\s+/g," ");
      if(new RegExp(s).test(t)){ bt.click(); return t.slice(0,60); } } }
  return "YOK"; },re);

await bas("Kaleler"); await p.waitForTimeout(600);
await bas("Nazar Büfe"); await p.waitForTimeout(800);
let t=await metin();
console.log("═══ 1) kale ekranı ═══");
ok("📋 Sayım aksiyonu var",/Sayım/.test(t));
ok("dört aksiyon da var",/Satış yap/.test(t)&&/Değişim/.test(t)&&/Sayım/.test(t)&&/Ziyaret/.test(t));
/* 📦 birleşik döküm kartı: konsinye + müşterinin malı, FİYAT BAZINDA */
ok("birleşik döküm kartı var",/KALEDE ŞU AN BULUNANLAR/.test(t));
ok("henüz sayım rozeti yok",!/sayıldı/.test(t),(t.match(/\S+ sayıldı/)||[""])[0]);
ok("uyarı: alım toplamı",/alım toplamı/.test(t));
ok("20 Penguen · 40 ₺ satırı",/🛍 Penguen 20 40 ₺/.test(t),(t.match(/🛍 Penguen [\d.]+ [\d.]+ ₺/g)||[]).join(" | "));
ok("konsinye Ahtapot satırı",/🏬 Ahtapot 6 30 ₺/.test(t),(t.match(/🏬 \S+ [\d.]+ [\d.]+ ₺/)||[""])[0]);
ok("borç 0",!/Tahsil et/.test(t)||/0 ₺ Tahsil|Avans al/.test(t),(t.match(/[\d.]+ ₺ Tahsil et|Avans al/)||[""])[0]);

console.log("═══ 2) sayım ekranı · kutular dolu geliyor ═══");
ok("sayıma girildi",(await bas("^📋 ?Sayım$"))!=="YOK");
await p.waitForTimeout(800);
t=await metin();
ok("rozet SAYIM",/SAYIM/.test(t));
ok("ilk sayım yazıyor",/ilk sayım/.test(t));
ok("Penguen sayım kutusu 20 dolu",(await kutuDeger("Penguen",0))==="20",await kutuDeger("Penguen",0));
ok("Penguen'de iki kutu var (sayım+bırak)",(await kutuYaz("Penguen",1,0))!=="YOK",await kutuYaz("Penguen",1,0));
const kay1=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
ok("yatay kayma yok",kay1.sw<=kay1.cw+1,"sw="+kay1.sw+" cw="+kay1.cw);
ok("konsinye bölümü akordiyonda",/Konsinye rafını da say/.test(t));

console.log("═══ 3) 7 saydık (13 eridi) + 10 bıraktık ═══");
await kutuYaz("Penguen",0,7); await p.waitForTimeout(250);
t=await metin();
ok("müşterinin sattığı 13",/Müşterinin sattığı\s*13 adet/.test(t),(t.match(/Müşterinin sattığı\s*\d+ adet/)||[""])[0]);
await kutuYaz("Penguen",1,10); await p.waitForTimeout(300);
t=await metin();
ok("bırakılan 10 adet · 400 ₺",/Bırakılan\s*10 adet · 400/.test(t),(t.match(/Bırakılan\s*[^A-ZÇĞİÖŞÜ]{0,24}/)||[""])[0]);
ok("CTA hem sayım hem bırakış diyor",/Sayım \+ 10 adet bırak/.test(t),
  (t.match(/📋 Sayım[^\n]{0,34}/)||[""])[0]);

console.log("═══ 4) konsinye rafını da say — 4 (kayma −2) ═══");
await bas("Konsinye rafını da say"); await p.waitForTimeout(500);
ok("Ahtapot kutusu 6 dolu",(await kutuDeger("🏬 Ahtapot",0))==="6",await kutuDeger("🏬 Ahtapot",0));
ok("konsinye satırına 4 yazıldı",(await kutuYaz("🏬 Ahtapot",0,4))!=="YOK",await kutuYaz("🏬 Ahtapot",0,4));
await p.waitForTimeout(300);
t=await metin();
ok("kayma −2 gösteriliyor",/Konsinye kayması\s*-2 adet/.test(t),(t.match(/Konsinye kayması\s*[^A-ZÇĞİÖŞÜ]{0,16}/)||[""])[0]);

console.log("═══ 5) kaydet ═══");
const stokOnce=await p.evaluate(()=>{ const U=window.__KAYITLAR("stok_urun");
  return {u1:(U.find(x=>x.id==="u1")||{}).pazStokK.e1,u2:(U.find(x=>x.id==="u2")||{}).pazStokK.e1}; });
ok("kaydedildi",(await ctaBas("Sayım \\+ 10 adet bırak"))==="TIK");
await p.waitForTimeout(1500);
let H=await kay("pazarlama_hareket");
const sm=H.filter(x=>x.tip==="sayim"&&(x.kapsam||"mulk")==="mulk");
const sk=H.filter(x=>x.tip==="sayim"&&x.kapsam==="konsinye");
const yeniSat=H.filter(x=>x.tip==="satis"&&x.kaynak==="sayim");
ok("mülk sayım kaydı var",sm.length===1,sm.length+" kayıt");
ok("sayılan 7 yazıldı",sm[0]&&(sm[0].kalemler||[]).some(c=>c.urunAd==="Penguen"&&c.adet===7),
  JSON.stringify(sm[0]&&sm[0].kalemler));
ok("beklenen 20 de saklandı",sm[0]&&(sm[0].kalemler||[])[0].beklenen===20,
  String(sm[0]&&(sm[0].kalemler||[])[0].beklenen));
ok("satilan 13 kayıtta",sm[0]&&Number(sm[0].satilan)===13,String(sm[0]&&sm[0].satilan));
ok("sayımda PARA alanı yok",sm[0]&&sm[0].tutar===undefined&&sm[0].satisFiyat===undefined
  &&sm[0].tahsil===undefined,JSON.stringify(Object.keys(sm[0]||{})));
ok("konsinye sayım kaydı ayrı",sk.length===1&&Number(sk[0].kayma)===-2,
  sk.length+" kayıt, kayma "+(sk[0]&&sk[0].kayma));
ok("bırakılan DOĞRUDAN SATIŞ oldu",yeniSat.length===1&&yeniSat[0].adet===10
  &&Number(yeniSat[0].satisFiyat)===40&&Number(yeniSat[0].tahsil)===0,
  JSON.stringify(yeniSat[0]&&{n:yeniSat[0].adet,f:yeniSat[0].satisFiyat,t:yeniSat[0].tahsil}));
ok("konsinye rafı DEĞİŞMEDİ (6)",Number((H.find(x=>x.id==="kx")||{}).kalan)===6,
  String((H.find(x=>x.id==="kx")||{}).kalan));
const stokSon=await p.evaluate(()=>{ const U=window.__KAYITLAR("stok_urun");
  return {u1:(U.find(x=>x.id==="u1")||{}).pazStokK.e1,u2:(U.find(x=>x.id==="u2")||{}).pazStokK.e1}; });
ok("Penguen çantadan 10 düştü",stokSon.u1===stokOnce.u1-10,stokOnce.u1+" → "+stokSon.u1);
ok("Ahtapot çantası hiç oynamadı",stokSon.u2===stokOnce.u2,stokOnce.u2+" → "+stokSon.u2);

console.log("═══ 6) kale ekranı · havuz ve para ═══");
await p.waitForTimeout(800); t=await metin();
ok("sayım tarihi rozeti var",/bugün sayıldı/.test(t),(t.match(/(bugün|\d+ gün önce) sayıldı/)||[""])[0]);
ok("'alım toplamı' uyarısı kalktı",!/alım toplamı/.test(t));
/* 7 sayıldı + 10 bırakıldı = 17, ikisi de 40 ₺ → tek satırda birleşir */
ok("havuz 17 (7 sayım + 10 bırakış)",/🛍 Penguen 17 40 ₺/.test(t),
  (t.match(/🛍 Penguen [\d.]+ [\d.]+ ₺/g)||[]).join(" | "));
/* borç: ilk satış tamamı tahsil edilmişti; yalnız yeni 10×40 = 400 açık */
ok("borç 400 ₺ (yalnız bırakıştan)",/400 ₺ Tahsil et/.test(t),(t.match(/[\d.]+ ₺ Tahsil et/)||[""])[0]);
ok("konsinye yine 6 adet",/6 adet Konsinye/.test(t),(t.match(/\d+ adet Konsinye/)||[""])[0]);

console.log("═══ 7) sayım geri alınınca havuz eski hâline döner ═══");
ok("sayım geri alındı",(await geriAl("Sayım"))!=="YOK");
await p.waitForTimeout(1500);
H=await kay("pazarlama_hareket");
ok("mülk sayım kaydı silindi",!H.some(x=>x.tip==="sayim"&&(x.kapsam||"mulk")==="mulk"),
  H.filter(x=>x.tip==="sayim").map(x=>x.kapsam).join(","));
t=await metin();
/* sayım yok → havuz alım toplamı: 20 + 10 = 30 */
ok("havuz 30'a döndü",/🛍 Penguen 30 40 ₺/.test(t),(t.match(/🛍 Penguen [\d.]+ [\d.]+ ₺/g)||[]).join(" | "));
ok("borç 400 ₺ değişmedi",/400 ₺ Tahsil et/.test(t),(t.match(/[\d.]+ ₺ Tahsil et/)||[""])[0]);

ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,220));
await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ SAYIM DOĞRULANDI");
process.exit(hata?1:0);
