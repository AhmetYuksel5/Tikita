/* 💼 HAFTALIK HAKEDİŞ EKRANI — sadeleştirme + satış/tahsilat ayrı hareket
   Doğrulanan:
     1 Başlık yalnız "N. hafta"; tarih aralığı ve "gönderilmedi" yazmıyor
     2 Simge nötr (💼) — 🫰 uygulamanın hiçbir yerinde yok
     3 Özet: "Ciro" · "Tikita ödemesi" · hakediş; "Satış N adet" satırı yok
     4 "GÜN · KALE DÖKÜMÜ" / "N satır" yerine sütun başlıkları: açıklama · ciro · hakediş
     5 Satış satırı TEK satır: tarih + kale + ciro + hakediş ("N adet" alt satırı yok)
     6 Tahsilat AYRI satır — her kayıt kendi satırında; satışı olmayan kalenin
       tahsilatı da görünür (ör. yalnız tahsilat yapılan Anadolu Market)
     7 Başka haftanın satışına gelen tahsilat hangi günün satışı olduğunu yazar
     8 Satış satırına dokununca ürün ürün döküm açılır
     9 İki grup: Satışlar (açıklama·ciro·hakediş, toplam) · Tahsilatlar (açıklama·tutar)
    10 Tahsilatların altında: Toplam tahsilat − Tikita'ya verilecek = Benim alacağım
       (hakediş nakitten mahsup edilir — 38. haftadan itibaren); en son satır o
    11 "Geçmiş dönemler" bölümü yok · Rapor nakit kartı da mahsuplu */
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
const haftaBasMs=t=>{const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+1)%7));return d.getTime();};
const NOW=Date.now(), HB=haftaBasMs(NOW);
/* süren haftanın içinde bir başlangıç anı */
const BAS=(NOW-HB>3*36e5)?(NOW-3*36e5):(HB+60000);
const T=dk=>new Date(BAS+dk*60000).toISOString();
const ESKI=new Date(NOW-21*864e5).toISOString();   // 3 hafta önceki satış
const kul={kullaniciId:"e1",kullaniciAd:"Ahmet"};
const V={
  kullanici:[{id:"e1",ad:"Ahmet",rol:"pazarlamaci",simge:"🎖️"}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"Total Kirazlıtepe",kullaniciId:"e1",bolge:"Üsküdar"},
           {id:"m2",ad:"Anadolu Market",kullaniciId:"e1",bolge:"Ümraniye"}],
  pazarlama_hareket:[
    /* 3 hafta önce satılmış, bu hafta tahsil edilen */
    {id:"sE",tip:"satis",...kul,musteriId:"m1",yer:"Total Kirazlıtepe",urunId:"u3",urunAd:"Termos",
     adet:2,satisFiyat:100,alisFiyat:60,tahsil:200,tarih:ESKI},
    {id:"tE",tip:"tahsilat",...kul,musteriId:"m1",yer:"Total Kirazlıtepe",tutar:200,
     mahsup:[{id:"sE",tutar:200}],tarih:T(0)},
    /* bu haftanın satışı + tahsilatı */
    {id:"s1",tip:"satis",kaynak:"konsinye",...kul,musteriId:"m1",yer:"Total Kirazlıtepe",urunId:"u1",urunAd:"Ahtapot",
     adet:6,satisFiyat:50,alisFiyat:30,tahsil:300,tarih:T(2)},
    {id:"s2",tip:"satis",...kul,musteriId:"m1",yer:"Total Kirazlıtepe",urunId:"u2",urunAd:"Penguen",
     adet:3,satisFiyat:40,alisFiyat:25,tahsil:120,tarih:T(3)},
    {id:"t1",tip:"tahsilat",...kul,musteriId:"m1",yer:"Total Kirazlıtepe",tutar:420,
     mahsup:[{id:"s1",tutar:300},{id:"s2",tutar:120}],tarih:T(13)},
    /* yalnız tahsilat — bu hafta satış yok */
    {id:"t2",tip:"tahsilat",...kul,musteriId:"m2",yer:"Anadolu Market",tutar:500,tarih:T(20)},
    /* gerilla */
    {id:"g1",tip:"satis",gerilla:true,kaynak:"gerilla",...kul,yer:"⚡ Seyyar · Fıstıkağacı",urunId:"u2",urunAd:"Penguen",
     adet:1,satisFiyat:200,alisFiyat:35,tahsil:200,tarih:T(30)}],
  stok_urun:[
    {id:"u1",ad:"Ahtapot",stokta:50,satisFiyat:50,pazFiyat:30,parcalar:[],parcaAdet:{},pazStokK:{e1:5}},
    {id:"u2",ad:"Penguen",stokta:50,satisFiyat:40,pazFiyat:25,parcalar:[],parcaAdet:{},pazStokK:{e1:5}},
    {id:"u3",ad:"Termos",stokta:50,satisFiyat:100,pazFiyat:60,parcalar:[],parcaAdet:{},pazStokK:{e1:5}}],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],hedef:[],
  hakedis_donem:[],fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],cephane_talep:[],
};
const b=await chromium.launch({executablePath:KROM});
const c=await b.newContext({viewport:{width:390,height:2200},isMobile:true,hasTouch:true,locale:"tr-TR"});
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
const basBtn=re=>p.evaluate(s=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button")).filter(x=>new RegExp(s).test(d(x)));
  L.sort((a,b)=>d(a).length-d(b).length);
  if(L[0]){ L[0].click(); return d(L[0]).slice(0,60);} return "YOK"; },re);
const metin=()=>p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());
/* açık sheet'in metni — arka plandaki Rapor ekranı karışmasın */
const sheet=()=>p.evaluate(()=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("div")).filter(x=>/Benim alacağım/.test(d(x))&&/açıklama/.test(d(x))&&/\d+\. hafta/.test(d(x)));
  L.sort((a,b)=>d(a).length-d(b).length); return L[0]?d(L[0]):"SHEET YOK"; });

await basBtn("Rapor$"); await p.waitForTimeout(900);
ok("hakediş kartına basıldı",(await basBtn("hakediş · \\d+\\. hafta"))!=="YOK");
await p.waitForTimeout(900);
const S=await sheet();
const tum=await metin();

console.log("\n═══ 1) başlık ═══");
ok("başlık 'N. hafta'",/\d+\. hafta/.test(S),(S.match(/\d+\. hafta/)||[""])[0]);
ok("'Hakediş · N. hafta' YOK",!/Hakediş · \d+\. hafta/.test(S));
ok("'gönderilmedi' YOK",!/gönderilmedi/.test(S));
ok("tarih aralığı (–) YOK",!/\d+ \S+ – \d+ \S+/.test(S),(S.match(/\d+ \S+ – \d+ \S+/)||[""])[0]);

console.log("═══ 2) simge ═══");
ok("💼 simgesi var",/💼/.test(S));
ok("🫰 hiçbir yerde yok",!/🫰/.test(tum));

console.log("═══ 3) özet ═══");
ok("'Ciro' satırı YOK",!/Ciro \d/.test(S)&&!/müşteriden/.test(S),S.slice(0,80));
ok("'Tikita ödemesi' var",/Tikita ödemesi/.test(S));
ok("'Veriliş bedeli' yok",!/Veriliş bedeli/.test(S));

console.log("═══ 4) iki grup: Satışlar · Tahsilatlar ═══");
const iS=S.indexOf("Satışlar"), iT=S.indexOf("Tahsilatlar");
ok("'Satışlar' başlığı var",iS>=0);
ok("'Tahsilatlar' başlığı var",iT>=0);
ok("önce satışlar, sonra tahsilatlar",iS>=0&&iT>iS);
const SAT=S.slice(iS,iT), TAH=S.slice(iT);
ok("satış sütunları: açıklama ciro hakediş",/açıklama ciro hakediş/.test(SAT));
ok("tahsilat sütunları: açıklama tutar",/açıklama tutar/.test(TAH));
ok("'GÜN · KALE DÖKÜMÜ' yok",!/GÜN · KALE/i.test(S));

console.log("═══ 5) Satışlar grubu ═══");
/* 6×(50−30) + 3×(40−25) = 165 · ciro 420 */
ok("Total Kirazlıtepe satış: 420 ₺ · 165 ₺",/Total Kirazlıtepe ⌄ 420 ₺ 165 ₺/.test(SAT),
  (SAT.match(/Total Kirazlıtepe ⌄[^T]{0,24}/)||[""])[0]);
ok("gerilla satış satırı (200 ₺ · 165 ₺)",/Seyyar[^⌄]*⌄ 200 ₺ 165 ₺/.test(SAT));
ok("satışlarda tahsilat YOK",!/Anadolu Market/.test(SAT));
ok("satış toplamı: 620 ₺ · 330 ₺",/Toplam 620 ₺ 330 ₺/.test(SAT),(SAT.match(/Toplam[^T]{0,24}/)||[""])[0]);

console.log("═══ 6) Tahsilatlar grubu ═══");
ok("Anadolu Market 500 ₺ (satışsız kale)",/Anadolu Market 500 ₺/.test(TAH));
ok("Total Kirazlıtepe 420 ₺",/Total Kirazlıtepe 420 ₺/.test(TAH));
const eskiG=new Date(ESKI).toLocaleDateString("tr-TR",{day:"numeric",month:"short"});
ok("200 ₺ tahsilat '"+eskiG+" satışının'",new RegExp("Total Kirazlıtepe 200 ₺ "+eskiG+" satışının").test(TAH),
  (TAH.match(/Total Kirazlıtepe 200 ₺[^T]{0,20}/)||[""])[0]);
ok("gerilla nakdi tahsilatta 'peşin' (200 ₺)",/Seyyar[^·]*· peşin 200 ₺/.test(TAH),(TAH.match(/Seyyar[^₺]{0,40}₺/)||[""])[0]);
ok("satışlar tahsilat grubuna KARIŞMADI",!/⌄/.test(TAH));

console.log("═══ 7) netleşme — en altta benim alacağım ═══");
/* tahsilat 500+420+200+200 = 1.320 · hakediş 330 · Tikita'ya 990 */
ok("Toplam tahsilat 1.320 ₺",/Toplam tahsilat 1\.320 ₺/.test(TAH));
ok("Tikita'ya verilecek −990 ₺",/Tikita'ya verilecek −990 ₺/.test(TAH),(TAH.match(/Tikita'ya verilecek [^B]{0,12}/)||[""])[0]);
ok("Benim alacağım 330 ₺",/Benim alacağım 330 ₺/.test(TAH));
/* sheet'in sonunda yalnız gönder düğmesi var — içerikteki son satır "Benim alacağım" */
ok("'Benim alacağım' en son satır",/Benim alacağım 330 ₺ (Komutaya gönder|Kapat)$/.test(TAH.replace(/\s*$/,"")),TAH.slice(-40));
ok("eski 'Teslim edilecek nakit' kutusu yok",!/Teslim edilecek nakit/.test(S));
ok("'Gerilla satışları' / 'Kale satışları' kutusu yok",!/Kale satışları/.test(S));

console.log("═══ 8) satış satırı açılıyor ═══");
ok("satış satırına dokunuldu",(await basBtn("Total Kirazlıtepe ⌄"))!=="YOK");
await p.waitForTimeout(450);
const S2=await sheet();
ok("ürün dökümü: 6 adet · satış 50 · veriliş 30",/6 adet · satış 50 · veriliş 30/.test(S2));
ok("ürün dökümü: 3 adet · satış 40 · veriliş 25",/3 adet · satış 40 · veriliş 25/.test(S2));

console.log("═══ 9) geçmiş dönemler yok ═══");
ok("'Geçmiş dönemler' yok",!/Geçmiş dönemler/.test(S));

console.log("═══ 10) NAKİT KARTI — hakediş nakitten düşülmüş ═══");
await basBtn("^✕$|^×$"); await p.waitForTimeout(500);
const K=await p.evaluate(()=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button")).filter(x=>/Teslim edilecek nakit|Tikita'dan alacağın/.test(d(x)));
  L.sort((a,b)=>d(a).length-d(b).length); return L[0]?d(L[0]):"KART YOK"; });
/* süren hafta: 1.320 tahsilat − 330 hakediş = 990 (eski satışın hakedişi o haftanın) */
ok("kart 990 ₺ gösteriyor (1.320 − 330)",/990 ₺/.test(K),K);

ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,200));
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ HAFTALIK HAKEDİŞ EKRANI DOĞRULANDI");
await c.close(); await b.close();
process.exit(hata?1:0);
