/* ♻️ DEĞİŞİM — kaleye satılmış ürünü geri alıp yerine başka ürün vermek.
   Doğrulanan:
     1 Kale ekranında Stant yerine Değişim var
     2 Sheet konsinye tasarım dilinde (rozet başlık, yatay kayma yok)
     3 "Geri alınan" listesi bu kaleye SATILMIŞ ürünlerden geliyor
     4 Adetler eşit olmadıkça kaydedilemiyor
     5 Kaydedilen iki kayıt tek degisimId taşıyor · kaynak "degisim"
     6 Geri alınan mal ÇANTAYA döner, yerine verilen çantadan düşer
     7 Borç tam FİYAT FARKI kadar artar (iki katı değil)
     8 Fiyat farkı tahsilat ekranında kalem olarak görünür
     9 Değişim tek dokunuşta BİRLİKTE geri alınır (yarım kalmaz) */
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
const T0="2026-09-11T10:00:00.000Z";
/* Kale: 6 Penguen × 40 ₺ satılmış, tamamı tahsil EDİLMEMİŞ → borç 240 ₺ */
const V={
  kullanici:[{id:"e1",ad:"Ahmet",rol:"pazarlamaci",simge:"🎖️",fermanCephane:true}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"H Kafe",kullaniciId:"e1",bolge:"Üsküdar"}],
  pazarlama_hareket:[
    {id:"s1",tip:"satis",kullaniciId:"e1",kullaniciAd:"Ahmet",musteriId:"m1",yer:"H Kafe",
     urunId:"u1",urunAd:"Penguen",adet:6,satisFiyat:40,alisFiyat:25,tahsil:0,tarih:T0},
  ],
  stok_urun:[
    {id:"u1",ad:"Penguen",stokta:40,satisFiyat:40,pazFiyat:25,parcalar:[],parcaAdet:{},pazStokK:{e1:10}},
    {id:"u2",ad:"Kaplumbağa",stokta:30,satisFiyat:55,pazFiyat:30,parcalar:[],parcaAdet:{},pazStokK:{e1:12}},
  ],
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
const yaz=()=>p.evaluate(()=>(window.__YAZ||[]).slice());
const kay=n=>p.evaluate(n2=>window.__KAYITLAR(n2),n);
/* ürün adına göre o satırın adet kutusuna yaz */
const adetYaz=(ad,n)=>p.evaluate(([a,v])=>{
  const sat=Array.from(document.querySelectorAll("input[data-adet]")).map(i=>({i,
    t:(i.closest("div")?i.closest("div").innerText||"":"").replace(/\s+/g," ").trim()}));
  const h=sat.find(s=>s.t.indexOf(a)===0||new RegExp("^"+a+"\\b").test(s.t));
  if(!h) return "YOK";
  const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
  set.call(h.i,String(v)); h.i.dispatchEvent(new Event("input",{bubbles:true}));
  return h.t.slice(0,40); },[ad,n]);

await bas("Kaleler"); await p.waitForTimeout(600);
await bas("H Kafe"); await p.waitForTimeout(700);
let t=await metin();
console.log("═══ 1) Stant kalktı, Değişim geldi ═══");
ok("Stant yok",!/Stant/.test(t),(t.match(/Stant/g)||[]).length+" kez");
ok("Değişim düğmesi var",/Değişim/.test(t));
ok("borç 240 ₺ görünüyor",/240/.test(t),(t.match(/\d[\d.]*\s*₺/g)||[]).slice(0,6).join(" "));

console.log("═══ 2) sheet açıldı · tasarım dili ═══");
ok("Değişim'e basıldı",(await bas("^♻️ ?Değişim$"))!=="YOK");
await p.waitForTimeout(700);
t=await metin();
ok("rozet başlığı büyük harfli",/DEĞİŞİM/.test(t));
ok("kale adı başlıkta",/H Kafe/.test(t));
/* ⚠ .lbl sınıfı etiketleri BÜYÜK HARFE çevirir — innerText de öyle görür */
ok("iki bölüm de var",/GERİ ALINAN/.test(t)&&/YERİNE VERİLEN/.test(t),t.slice(0,300));
const kay1=await p.evaluate(()=>{ const s=document.querySelector("div[style*='border-radius: 24px']")
  ||document.querySelector("div[style*='borderRadius: 24px']");
  return {sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}; });
ok("yatay kayma yok",kay1.sw<=kay1.cw+1,"scrollW="+kay1.sw+" clientW="+kay1.cw);

console.log("═══ 3) geri alınan listesi SATILMIŞ üründen ═══");
ok("Penguen geri alınabilir listede",/Penguen/.test(t));
/* Kaplumbağa'nın bu pazarlamacıda geçmiş işlemi yok → konsinye ekranındaki kuralla
   "az kullanılanlar" akordiyonunda başlar; açılınca listeye gelir. */
ok("az kullanılanlar akordiyonu var",/Az kullanılanlar/i.test(t),(t.match(/Az kullanılanlar \d+/i)||[""])[0]);
await bas("Az kullanılanlar"); await p.waitForTimeout(400);
t=await metin();
ok("Kaplumbağa yerine verilebilir listede",/Kaplumbağa/.test(t));

console.log("═══ 4) adetler eşit olmadan kaydedilemiyor ═══");
ok("Penguen adeti yazıldı",(await adetYaz("Penguen",4))!=="YOK",await adetYaz("Penguen",4));
await p.waitForTimeout(300);
t=await metin();
ok("dengesizlik uyarısı",/adetler eşit olmalı/i.test(t)||/4 geri · 0 yeni/.test(t),
  (t.match(/\d+ geri · \d+ yeni/)||[""])[0]);
let ctaKapali=await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
  .filter(x=>/değiştir/i.test(x.innerText||"")); return B.length?!!B[B.length-1].disabled:null; });
ok("CTA kapalı",ctaKapali===true,String(ctaKapali));

console.log("═══ 5) eşit adet · fark hesabı ═══");
await adetYaz("Kaplumbağa",4); await p.waitForTimeout(350);
t=await metin();
ok("4 geri · 4 yeni",/4 geri · 4 yeni/.test(t),(t.match(/\d+ geri · \d+ yeni/)||[""])[0]);
/* 4×55 − 4×40 = 60 ₺ borç */
ok("fiyat farkı +60 ₺ borç",/Fiyat farkı/.test(t)&&/\+\s?60/.test(t)&&/borç/.test(t),
  (t.match(/Fiyat farkı[^A-ZÇĞİÖŞÜ]{0,30}/)||[""])[0]);
ctaKapali=await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
  .filter(x=>/değiştir/i.test(x.innerText||"")); return B.length?!!B[B.length-1].disabled:null; });
ok("CTA açıldı",ctaKapali===false,String(ctaKapali));

console.log("═══ 6) kaydet ═══");
await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
  .filter(x=>/değiştir/i.test(x.innerText||"")); B[B.length-1].click(); });
await p.waitForTimeout(1200);
const W=await yaz();
const har=(await kay("pazarlama_hareket"));
const ia=har.filter(x=>x.tip==="iade"&&x.kaynak==="degisim");
const sa=har.filter(x=>x.tip==="satis"&&x.kaynak==="degisim");
ok("bir iade kaydı",ia.length===1,ia.length+" kayıt");
ok("bir satış kaydı",sa.length===1,sa.length+" kayıt");
ok("iade Penguen 4 × 40 ₺",ia[0]&&ia[0].urunAd==="Penguen"&&ia[0].adet===4&&ia[0].satisFiyat===40,
  ia[0]?JSON.stringify({a:ia[0].urunAd,n:ia[0].adet,f:ia[0].satisFiyat,v:ia[0].alisFiyat}):"—");
ok("iade verilişi ilk satıştan (25)",ia[0]&&ia[0].alisFiyat===25,ia[0]&&String(ia[0].alisFiyat));
ok("satış Kaplumbağa 4 × 55 ₺",sa[0]&&sa[0].urunAd==="Kaplumbağa"&&sa[0].adet===4&&sa[0].satisFiyat===55,
  sa[0]?JSON.stringify({a:sa[0].urunAd,n:sa[0].adet,f:sa[0].satisFiyat}):"—");
ok("satışın tahsili 0 (borç yazar)",sa[0]&&Number(sa[0].tahsil)===0,sa[0]&&String(sa[0].tahsil));
ok("ikisi aynı degisimId",ia[0]&&sa[0]&&ia[0].degisimId&&ia[0].degisimId===sa[0].degisimId,
  (ia[0]||{}).degisimId+" / "+(sa[0]||{}).degisimId);
/* ♻️ İADE KREDİSİ AÇIK SATIŞA İŞLENİR — komuta "Pazarlama Takip · Alacak" ekranı
   alacağı satış başına (beklenen − tahsil) hesaplıyor; kredi yalnız kale
   seviyesinde netlenirse o satırlar sonsuza kadar alacak görünüyordu. */
const s1=()=>har.find(x=>x.id==="s1")||{};
ok("geçmiş satışın adedi bozulmadı",s1().adet===6,String(s1().adet));
ok("kredi açık satışa işlendi (tahsil 0 → 160)",Number(s1().tahsil)===160,String(s1().tahsil));
ok("iade kaydında mahsup izi var",
  Array.isArray(ia[0]&&ia[0].mahsup)&&ia[0].mahsup.length===1
    &&ia[0].mahsup[0].id==="s1"&&Number(ia[0].mahsup[0].tutar)===160,
  JSON.stringify((ia[0]||{}).mahsup));
ok("işlenemeyen artık yok (acikAlacak 0)",Number((ia[0]||{}).acikAlacak)===0,
  String((ia[0]||{}).acikAlacak));
/* komuta ekranının hesabını birebir taklit et: Σ max(0, adet×fiyat − tahsil) */
const alacak=rows=>rows.filter(x=>x.tip==="satis"&&x.yer==="H Kafe")
  .reduce((z,x)=>z+Math.max(0,Number(x.adet)*Number(x.satisFiyat)-(x.tahsil==null?0:Number(x.tahsil))),0);
ok("satış başına alacak toplamı 300 (kale borcuyla aynı)",alacak(har)===300,String(alacak(har)));

console.log("═══ 7) stok ayağı ═══");
const U=await kay("stok_urun");
const pz=id=>((U.find(x=>x.id===id)||{}).pazStokK||{}).e1;
ok("Penguen çantaya döndü 10 → 14",pz("u1")===14,String(pz("u1")));
ok("Kaplumbağa çantadan düştü 12 → 8",pz("u2")===8,String(pz("u2")));

console.log("═══ 8) borç yalnız FARK kadar arttı ═══");
await p.waitForTimeout(600);
t=await metin();
ok("borç 240 → 300 (fark 60)",/300 ₺ Tahsil et/.test(t),(t.match(/[\d.]+ ₺ Tahsil et/)||[""])[0]);
ok("ciro 240 → 300 (iade netlenmiş)",/300 ₺ Toplam ciro/.test(t),(t.match(/[\d.]+ ₺ Toplam ciro/)||[""])[0]);
/* müşterinin malı: 6 Penguen'den 4'ü gitti, yerine 4 Kaplumbağa geldi */
/* hakediş: 6×(40−25)=90 → 2×15 + 4×(55−30) = 130 */
ok("hakediş de netlendi · 130 ₺",/130 ₺/.test(t),(t.match(/BU KALEDEN KAZANDIĞIN [\d.]+ ₺/i)||t.match(/130 ₺/)||[""])[0]);
/* 📦 birleşik döküm FİYAT BAZINDA: 2 Penguen @40 + 4 Kaplumbağa @55 */
ok("mülk havuzu güncellendi",/🛍 Penguen 2 40 ₺/.test(t)&&/🛍 Kaplumbağa 4 55 ₺/.test(t),
  (t.match(/🛍 \S+ [\d.]+ [\d.]+ ₺/g)||[]).join(" | "));

console.log("═══ 9) tahsilat ayrıntısında kalem ═══");
ok("tahsilata girildi",(await bas("Tahsil et"))!=="YOK");
await p.waitForTimeout(700);
t=await metin();
ok("değişim farkı kalemi var",/Değişim farkı/.test(t),(t.match(/Değişim farkı[^A-ZÇĞİÖŞÜ]{0,22}/)||[""])[0]);
ok("satış borcu kalemi var",/Satış borcu/.test(t));
ok("kalan borç kalemi var",/Kalan borç/.test(t));
/* BRÜT satış borcu 6×40 + 4×55 = 460 · değişim kredisi 160 · kalan 300
   (kredi satış satırına işlendiği için brüt rakam geri eklenerek yazılır) */
ok("satış borcu 460 ₺",/Satış borcu 460 ₺/.test(t),(t.match(/Satış borcu [\d.]+ ₺/)||[""])[0]);
ok("değişim kredisi −160 ₺",/Değişim farkı − 160 ₺/.test(t),(t.match(/Değişim farkı − [\d.]+ ₺/)||[""])[0]);
ok("kalan borç 300 ₺",/Kalan borç 300 ₺/.test(t),(t.match(/Kalan borç [\d.]+ ₺/)||[""])[0]);
await p.keyboard.press("Escape"); await p.waitForTimeout(500);

console.log("═══ 10) değişim BİRLİKTE geri alınır ═══");
await bas("^♻️ Geri$|geri al").catch(()=>{});
const gerial=await p.evaluate(()=>{
  /* son işlemler kartındaki ↩️ düğmesini bul */
  const B=Array.from(document.querySelectorAll("button")).filter(x=>(x.innerText||"").trim()==="↩️");
  if(!B.length) return "YOK"; B[0].click(); return "TIK"; });
ok("geri al düğmesi bulundu",gerial==="TIK",gerial);
await p.waitForTimeout(1400);
const har2=await kay("pazarlama_hareket");
ok("iki kayıt birlikte silindi",
  har2.filter(x=>x.kaynak==="degisim").length===0,
  har2.filter(x=>x.kaynak==="degisim").map(x=>x.tip).join(","));
const U2=await kay("stok_urun");
const pz2=id=>((U2.find(x=>x.id===id)||{}).pazStokK||{}).e1;
ok("Penguen çantası eski hâle döndü",pz2("u1")===10,String(pz2("u1")));
ok("Kaplumbağa çantası eski hâle döndü",pz2("u2")===12,String(pz2("u2")));
/* mahsup izi geri sarılır — yoksa borç kalıcı olarak kapanmış görünür */
const s1b=har2.find(x=>x.id==="s1")||{};
ok("kredi geri alındı (tahsil 160 → 0)",Number(s1b.tahsil)===0,String(s1b.tahsil));
ok("satış başına alacak 240'a döndü",alacak(har2)===240,String(alacak(har2)));
t=await metin();
ok("borç 240 ₺'ye döndü",/240 ₺ Tahsil et/.test(t),(t.match(/[\d.]+ ₺ Tahsil et/)||[""])[0]);

ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,220));
await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ DEĞİŞİM DOĞRULANDI");
process.exit(hata?1:0);
