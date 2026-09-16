/* 📋 SAYIM — TEK İŞ: kalede daha önce satılan üründen NE KALDIĞINI güncellemek.
   Konsinyede raf para hareketlerinden türetilebiliyor (mal bizim). Doğrudan
   satışta mal müşterinin olduğu için onun uç tüketiciye satışı bizde kayıt
   üretmiyor → bilgi GÖZLEMLE girilmek zorunda.

   Doğrulanan:
     1 Kale ekranında 📋 Sayım aksiyonu var (2×2 ızgara)
     2 Ekran SADE: yalnız sayım kutusu — bırakış/konsinye/sipariş YOK
     3 Kutular "bizce şu kadar var" değeriyle DOLU gelir (yarım sayım olmaz)
     4 Aynı ürün farklı fiyattan verilmişse her fiyat KENDİ satırında sayılır
     5 Sayım para doğurmaz: borç · ciro · stok DEĞİŞMEZ
     6 Havuz sayılan değere çekilir · müşterinin sattığı = önceki − sayılan
     7 Sayım geri alınınca havuz eski hâline döner */
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
    {id:"s2",tip:"satis",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Nazar Büfe",
     urunId:"u1",urunAd:"Penguen",adet:5,satisFiyat:50,alisFiyat:25,maliyetBirim:12,
     tahsil:50,tarih:T0},
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
ok("5 Penguen · 50 ₺ AYRI satır",/🛍 Penguen 5 50 ₺/.test(t));
ok("konsinye Ahtapot satırı",/🏬 Ahtapot 6 30 ₺/.test(t),(t.match(/🏬 \S+ [\d.]+ [\d.]+ ₺/)||[""])[0]);
ok("borç 200 ₺ (5×50 − 50)",/200 ₺ Tahsil et/.test(t),(t.match(/[\d.]+ ₺ Tahsil et/)||[""])[0]);

console.log("═══ 2) sayım ekranı SADE ═══");
ok("sayıma girildi",(await bas("^📋 ?Sayım$"))!=="YOK");
await p.waitForTimeout(800);
t=await metin();
ok("rozet SAYIM",/SAYIM/.test(t));
ok("ilk sayım yazıyor",/ilk sayım/.test(t));
ok("başlık: Kalende kalan",/KALENDE KALAN/.test(t));
ok("bizce → sayılan sütun başlığı",/BİZCE → SAYILAN/.test(t));
/* ⛔ bu sekmede OLMAMASI gerekenler */
ok("bırakış/sipariş kutusu YOK",!/Yeni ürün bırak/.test(t)&&!/bırak/i.test(t.split("KALENDE KALAN")[1]||""),
  (t.match(/Yeni ürün bırak|Bırakılan/)||[""])[0]);
ok("konsinye sayım bölümü YOK",!/Konsinye rafını da say/.test(t));
ok("sıralama toggle YOK",!/🔥/.test(t.split("KALENDE KALAN")[1]||""));
ok("satır başına TEK kutu",(await p.evaluate(()=>{
  const rows=Array.from(document.querySelectorAll("input[data-adet]"));
  return rows.length; }))===2,String(await p.evaluate(()=>document.querySelectorAll("input[data-adet]").length)));
const kay1=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
ok("yatay kayma yok",kay1.sw<=kay1.cw+1,"sw="+kay1.sw+" cw="+kay1.cw);

console.log("═══ 3) fiyat bazında ayrı satır · kutular dolu ═══");
/* 20 × 40 ₺ ve 5 × 50 ₺ AYRI satırlarda, her biri kendi adediyle dolu */
ok("40 ₺ satırı 20 dolu",(await kutuDeger("Penguen 40",0))==="20",await kutuDeger("Penguen 40",0));
ok("50 ₺ satırı 5 dolu",(await kutuDeger("Penguen 50",0))==="5",await kutuDeger("Penguen 50",0));
ok("CTA 'değişiklik yok' diyor",/Değişiklik yok/.test(t),(t.match(/📋 [^\n]{0,24}/)||[""])[0]);

console.log("═══ 4) 40 ₺ satırından 7 say (13 eridi) ═══");
await kutuYaz("Penguen 40",0,7); await p.waitForTimeout(300);
t=await metin();
ok("müşterinin sattığı 13",/Müşterinin sattığı 13 adet/.test(t),(t.match(/Müşterinin sattığı \d+ adet/)||[""])[0]);
ok("CTA kaydet oldu",/Sayımı kaydet/.test(t));

console.log("═══ 5) kaydet — para ve stok DEĞİŞMEZ ═══");
const stokOnce=await p.evaluate(()=>{ const U=window.__KAYITLAR("stok_urun");
  return {u1:(U.find(x=>x.id==="u1")||{}).pazStokK.e1,u2:(U.find(x=>x.id==="u2")||{}).pazStokK.e1}; });
ok("kaydedildi",(await ctaBas("Sayımı kaydet"))==="TIK");
await p.waitForTimeout(1500);
let H=await kay("pazarlama_hareket");
const sm=H.filter(x=>x.tip==="sayim");
ok("TEK sayım kaydı",sm.length===1,sm.length+" kayıt · kapsam "+sm.map(x=>x.kapsam).join(","));
ok("kapsam mulk",sm[0]&&(sm[0].kapsam||"mulk")==="mulk");
ok("iki fiyat da kalemlerde",sm[0]&&(sm[0].kalemler||[]).length===2,
  JSON.stringify(sm[0]&&(sm[0].kalemler||[]).map(c=>c.adet+"@"+c.birim)));
ok("40 ₺ kalemi 7 (beklenen 20)",sm[0]&&(sm[0].kalemler||[]).some(c=>c.birim===40&&c.adet===7&&c.beklenen===20),
  JSON.stringify(sm[0]&&sm[0].kalemler));
ok("50 ₺ kalemi dokunulmadı (5)",sm[0]&&(sm[0].kalemler||[]).some(c=>c.birim===50&&c.adet===5&&c.beklenen===5));
ok("satilan 13",sm[0]&&Number(sm[0].satilan)===13,String(sm[0]&&sm[0].satilan));
ok("PARA alanı yok",sm[0]&&sm[0].tutar===undefined&&sm[0].satisFiyat===undefined&&sm[0].tahsil===undefined,
  JSON.stringify(Object.keys(sm[0]||{})));
ok("yeni SATIŞ kaydı oluşmadı",H.filter(x=>x.tip==="satis").length===2,
  String(H.filter(x=>x.tip==="satis").length));
ok("konsinye rafı değişmedi (6)",Number((H.find(x=>x.id==="kx")||{}).kalan)===6,
  String((H.find(x=>x.id==="kx")||{}).kalan));
const stokSon=await p.evaluate(()=>{ const U=window.__KAYITLAR("stok_urun");
  return {u1:(U.find(x=>x.id==="u1")||{}).pazStokK.e1,u2:(U.find(x=>x.id==="u2")||{}).pazStokK.e1}; });
ok("stok HİÇ oynamadı",stokSon.u1===stokOnce.u1&&stokSon.u2===stokOnce.u2,
  JSON.stringify(stokOnce)+" → "+JSON.stringify(stokSon));

console.log("═══ 6) kale ekranı ═══");
await p.waitForTimeout(800); t=await metin();
ok("sayım rozeti var",/bugün sayıldı/.test(t),(t.match(/(bugün|\d+ gün önce) sayıldı/)||[""])[0]);
ok("40 ₺ havuzu 7'ye çekildi",/🛍 Penguen 7 40 ₺/.test(t),(t.match(/🛍 Penguen [\d.]+ [\d.]+ ₺/g)||[]).join(" | "));
ok("50 ₺ havuzu 5 kaldı",/🛍 Penguen 5 50 ₺/.test(t));
ok("borç değişmedi (200 ₺)",/200 ₺ Tahsil et/.test(t),(t.match(/[\d.]+ ₺ Tahsil et/)||[""])[0]);

console.log("═══ 7) sayım geri alınınca havuz eski hâline döner ═══");
ok("sayım geri alındı",(await geriAl("Sayım"))!=="YOK");
await p.waitForTimeout(1500);
H=await kay("pazarlama_hareket");
ok("sayım kaydı silindi",!H.some(x=>x.tip==="sayim"),
  H.filter(x=>x.tip==="sayim").map(x=>x.kapsam).join(","));
t=await metin();
/* sayım yok → havuz alım toplamına döner: 20 @ 40 ₺ */
ok("havuz 20'ye döndü",/🛍 Penguen 20 40 ₺/.test(t),(t.match(/🛍 Penguen [\d.]+ [\d.]+ ₺/g)||[]).join(" | "));
ok("borç yine 200 ₺",/200 ₺ Tahsil et/.test(t),(t.match(/[\d.]+ ₺ Tahsil et/)||[""])[0]);

ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,220));
await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ SAYIM DOĞRULANDI");
process.exit(hata?1:0);
