/* 🧾 TAHSİLAT GERİ ALMA — idempotent olmalı.
   CANLI ŞİKÂYET (Temel Süpermarket): "tahsilatı geri al diyorum, kayıt silinmediği
   gibi yukarıdaki tahsil edilecek tutar her basışta artıyor."
   Sebep: satışların tahsil'i SİLMEDEN ÖNCE geri düşülüyordu ve işlem idempotent
   değildi — ekran onSnapshot ile gecikmeli tazelendiği için silinmiş satır bir süre
   daha görünüp tekrar tıklanabiliyor, her tık borcu bir tahsilat tutarı kadar
   büyütüyordu. İkinci hata: tavan olarak tutarın TAMAMI alınıyordu, KDV'li
   tahsilatta borç vergi kadar fazla açılıyordu.

   Doğrulanan:
     1 Tahsilat geri alınınca kayıt silinir ve borç tam tahsilat kadar geri gelir
     2 BAYAT EKRANDAN ikinci basış hiçbir şeyi değiştirmez (idempotent)
     3 Hızlı çift dokunuş tek işlem sayılır (kilit)
     4 Mahsup izi varsa yalnız o satışlar geri açılır — başka tahsilatın
       kapattığı borç ellenmez
     5 KDV'li tahsilatta yalnız MATRAH geri açılır
     6 İz taşımayan eski kayıtta dönüş en yeniden başlar ve satırın tahsil'ini aşmaz
     7 Yeni tahsilat kaydı mahsup izi yazıyor */
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
const DUN=new Date(Date.now()-20*36e5).toISOString();     // son 48 saat → ↩️ çıkar
const ONCE=new Date(Date.now()-30*36e5).toISOString();
const SAT=(id,n,f,tahsil,tarih)=>({id,tip:"satis",kullaniciId:"e1",kullaniciAd:"Emir",
  musteriId:"m1",yer:"Temel Süpermarket",urunId:"u1",urunAd:"Penguen",adet:n,
  satisFiyat:f,alisFiyat:25,maliyetBirim:12,tahsil,tarih});
const V={
  kullanici:[{id:"e1",ad:"Emir",rol:"pazarlamaci",simge:"🎖️",fermanCephane:true}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"Temel Süpermarket",kullaniciId:"e1",bolge:"Fındıklı"}],
  /* sA: 6×40=240, tahsilat A ile kapandı · sB: 5×40=200, tahsilat B ile kapandı */
  pazarlama_hareket:[
    SAT("sA",6,40,240,ONCE),
    SAT("sB",5,40,200,ONCE),
    {id:"tA",tip:"tahsilat",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",
     yer:"Temel Süpermarket",tutar:240,mahsup:[{id:"sA",tutar:240}],
     ureticiPay:150,pazPay:90,tarih:DUN},
    {id:"tB",tip:"tahsilat",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",
     yer:"Temel Süpermarket",tutar:200,mahsup:[{id:"sB",tutar:200}],
     ureticiPay:125,pazPay:75,tarih:ONCE},
  ],
  stok_urun:[{id:"u1",ad:"Penguen",stokta:50,satisFiyat:40,pazFiyat:25,
    parcalar:[],parcaAdet:{},pazStokK:{e1:20}}],
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
const tahsilOf=async id=>{ const H=await kay("pazarlama_hareket");
  const r=H.find(x=>x.id===id); return r?Number(r.tahsil):null; };
const varMi=async id=>(await kay("pazarlama_hareket")).some(x=>x.id===id);
const borcEkran=async()=>{ const t=await metin();
  const m=t.match(/([\d.]+) ₺ tahsil edilecek/); return m?Number(m[1].replace(/\./g,"")):0; };
/* ⚠ Kapsayıcı TAM BİR ↩️ içermeli — üst seviyede tüm kart eşleşir, yanlış satır silinir */
const geriAlBtn=re=>p.evaluate(s=>{
  const B=Array.from(document.querySelectorAll("button")).filter(x=>(x.innerText||"").trim()==="↩️");
  for(const bt of B){ let k=bt.parentElement;
    for(let i=0;i<5&&k;i++,k=k.parentElement){
      if(Array.from(k.querySelectorAll("button")).filter(z=>(z.innerText||"").trim()==="↩️").length!==1) break;
      if(new RegExp(s).test((k.innerText||"").replace(/\s+/g," "))){ bt.setAttribute("data-hedef","1"); return "BULUNDU"; } } }
  return "YOK"; },re);
const hedefTikla=(kez=1)=>p.evaluate(n=>{ const bt=document.querySelector("button[data-hedef]");
  if(!bt) return "YOK"; for(let i=0;i<n;i++) bt.click(); return "TIK"; },kez);

await bas("Kaleler"); await p.waitForTimeout(600);
await bas("Temel Süpermarket"); await p.waitForTimeout(800);

console.log("═══ 0) başlangıç ═══");
ok("borç 0 (iki satış da tahsil edilmiş)",(await borcEkran())===0,String(await borcEkran()));
ok("sA tahsil 240",(await tahsilOf("sA"))===240,String(await tahsilOf("sA")));
ok("sB tahsil 200",(await tahsilOf("sB"))===200,String(await tahsilOf("sB")));

console.log("═══ 1) tahsilat A geri alınıyor ═══");
ok("↩️ düğmesi bulundu",(await geriAlBtn("Tahsilat"))==="BULUNDU");
ok("tıklandı",(await hedefTikla(1))==="TIK");
await p.waitForTimeout(1500);
ok("tahsilat kaydı SİLİNDİ",!(await varMi("tA")),String(await varMi("tA")));
ok("sA tahsil 240 → 0",(await tahsilOf("sA"))===0,String(await tahsilOf("sA")));
ok("sB ELLENMEDİ (başka tahsilatın mahsubu)",(await tahsilOf("sB"))===200,String(await tahsilOf("sB")));
ok("borç 240 oldu",(await borcEkran())===240,String(await borcEkran()));

console.log("═══ 2) BAYAT EKRANDAN ikinci basış — hiçbir şey değişmemeli ═══");
/* Ekranı bilerek bayat bırak: kaydı geri koy ama abonelere haber verme. Böylece
   satır yine görünür ve tıklanabilir olur — canlıda onSnapshot gecikmesinde
   yaşanan durum. Sunucuda kayıt YOK, o yüzden geri alma hiçbir şey yapmamalı. */
await p.evaluate(()=>{
  const H=window.__KAYITLAR("pazarlama_hareket");
  H.push({id:"tA",tip:"tahsilat",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",
    yer:"Temel Süpermarket",tutar:240,mahsup:[{id:"sA",tutar:240}],
    tarih:new Date(Date.now()-20*36e5).toISOString()});
  window.__DEGISTIR("pazarlama_hareket",H);          // ekranda görünsün
  window.__SESSIZ("pazarlama_hareket",H.filter(x=>x.id!=="tA"));  // sunucuda YOK
});
await p.waitForTimeout(800);
ok("bayat satır ekranda duruyor",(await geriAlBtn("Tahsilat"))==="BULUNDU");
ok("tekrar tıklandı",(await hedefTikla(1))==="TIK");
await p.waitForTimeout(1500);
ok("sA tahsil YİNE 0 (artmadı/eksilmedi)",(await tahsilOf("sA"))===0,String(await tahsilOf("sA")));
ok("sB yine 200",(await tahsilOf("sB"))===200,String(await tahsilOf("sB")));
let t=await metin();
ok("kullanıcıya 'zaten geri alınmış' denildi",/zaten geri alınmış/.test(t),
  (t.match(/zaten geri alınmış/)||[""])[0]);

console.log("═══ 3) hızlı ÇİFT dokunuş tek işlem sayılır ═══");
await p.evaluate(()=>{
  const H=[
    {id:"sC",tip:"satis",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Temel Süpermarket",
     urunId:"u1",urunAd:"Penguen",adet:4,satisFiyat:50,alisFiyat:25,maliyetBirim:12,tahsil:200,
     tarih:new Date(Date.now()-30*36e5).toISOString()},
    {id:"tC",tip:"tahsilat",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Temel Süpermarket",
     tutar:200,mahsup:[{id:"sC",tutar:200}],tarih:new Date(Date.now()-20*36e5).toISOString()},
  ];
  window.__DEGISTIR("pazarlama_hareket",H); });
await p.waitForTimeout(900);
ok("düğme bulundu",(await geriAlBtn("Tahsilat"))==="BULUNDU");
ok("üst üste 3 kez tıklandı",(await hedefTikla(3))==="TIK");
await p.waitForTimeout(1800);
ok("sC tahsil 200 → 0 (tam bir kez)",(await tahsilOf("sC"))===0,String(await tahsilOf("sC")));
ok("tahsilat silindi",!(await varMi("tC")),String(await varMi("tC")));

console.log("═══ 4) KDV'li tahsilat — yalnız MATRAH geri açılır ═══");
/* sD: 100 ₺ tahsil edilmiş · tD: 120 ₺ alınmış (100 matrah + 20 KDV).
   sX: BAŞKA tahsilatla kapanmış 300 ₺. Eski kodda tavan 120 olduğu için fazla
   20 ₺ sX'ten yeniyordu — bu yüzden ikinci bir ödenmiş satış şart. */
await p.evaluate(()=>{
  const H=[
    {id:"sD",tip:"satis",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Temel Süpermarket",
     urunId:"u1",urunAd:"Penguen",adet:5,satisFiyat:40,alisFiyat:25,maliyetBirim:12,tahsil:100,
     tarih:new Date(Date.now()-30*36e5).toISOString()},
    {id:"sX",tip:"satis",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Temel Süpermarket",
     urunId:"u1",urunAd:"Penguen",adet:6,satisFiyat:50,alisFiyat:25,maliyetBirim:12,tahsil:300,
     tarih:new Date(Date.now()-45*36e5).toISOString()},
    {id:"tD",tip:"tahsilat",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Temel Süpermarket",
     tutar:120,kdv:20,kdvOran:20,mahsup:[{id:"sD",tutar:100}],
     tarih:new Date(Date.now()-20*36e5).toISOString()},
  ];
  window.__DEGISTIR("pazarlama_hareket",H); });
await p.waitForTimeout(900);
ok("düğme bulundu",(await geriAlBtn("Tahsilat"))==="BULUNDU");
await hedefTikla(1); await p.waitForTimeout(1500);
ok("sD tahsil 100 → 0",(await tahsilOf("sD"))===0,String(await tahsilOf("sD")));
ok("sX ELLENMEDİ — KDV fazlası sızmadı",(await tahsilOf("sX"))===300,String(await tahsilOf("sX")));
ok("borç 200 (5×40) — KDV borç açmadı",(await borcEkran())===200,String(await borcEkran()));

console.log("═══ 5) mahsup izi OLMAYAN eski kayıt ═══");
await p.evaluate(()=>{
  const H=[
    {id:"sE",tip:"satis",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Temel Süpermarket",
     urunId:"u1",urunAd:"Penguen",adet:3,satisFiyat:40,alisFiyat:25,maliyetBirim:12,tahsil:120,
     tarih:new Date(Date.now()-50*36e5).toISOString()},
    {id:"sF",tip:"satis",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Temel Süpermarket",
     urunId:"u1",urunAd:"Penguen",adet:2,satisFiyat:40,alisFiyat:25,maliyetBirim:12,tahsil:80,
     tarih:new Date(Date.now()-40*36e5).toISOString()},
    {id:"tE",tip:"tahsilat",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Temel Süpermarket",
     tutar:80,tarih:new Date(Date.now()-20*36e5).toISOString()},   // iz YOK
  ];
  window.__DEGISTIR("pazarlama_hareket",H); });
await p.waitForTimeout(900);
ok("düğme bulundu",(await geriAlBtn("Tahsilat"))==="BULUNDU");
await hedefTikla(1); await p.waitForTimeout(1500);
/* iz yok → en YENİ satıştan başlar: sF 80 → 0, sE dokunulmaz */
ok("en yeni satış açıldı (sF 80 → 0)",(await tahsilOf("sF"))===0,String(await tahsilOf("sF")));
ok("eski satış ellenmedi (sE 120)",(await tahsilOf("sE"))===120,String(await tahsilOf("sE")));
ok("tavan aşılmadı (toplam 80 açıldı)",(await borcEkran())===80,String(await borcEkran()));

console.log("═══ 6) yeni tahsilat mahsup izi yazıyor ═══");
await p.evaluate(()=>{
  const H=[{id:"sG",tip:"satis",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Temel Süpermarket",
    urunId:"u1",urunAd:"Penguen",adet:5,satisFiyat:40,alisFiyat:25,maliyetBirim:12,tahsil:0,
    tarih:new Date(Date.now()-30*36e5).toISOString()}];
  window.__DEGISTIR("pazarlama_hareket",H); });
await p.waitForTimeout(900);
ok("tahsilata girildi",(await bas("₺ tahsil edilecek"))!=="YOK");
await p.waitForTimeout(800);
await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
  .filter(x=>/tahsil et$/i.test((x.innerText||"").trim())); if(B.length) B[B.length-1].click(); });
await p.waitForTimeout(1500);
const H2=await kay("pazarlama_hareket");
const yeniT=H2.find(x=>x.tip==="tahsilat");
ok("tahsilat yazıldı",!!yeniT,yeniT?("tutar "+yeniT.tutar):"YOK");
ok("mahsup izi var",yeniT&&Array.isArray(yeniT.mahsup)&&yeniT.mahsup.length===1
  &&yeniT.mahsup[0].id==="sG"&&Number(yeniT.mahsup[0].tutar)===200,
  JSON.stringify(yeniT&&yeniT.mahsup));

ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,220));
await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ TAHSİLAT GERİ ALMA DOĞRULANDI");
process.exit(hata?1:0);
