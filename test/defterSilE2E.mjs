/* 🧾 KOMUTA DEFTERİNDEN SİLME — kaydın PARA İZİ de geri sarılmalı.
   Tahsilat ve değişim iadesi, kapattıkları satışların `tahsil` alanına
   mahsup:[{id,tutar}] izi yazar. Defterden silme eskiden yalnız kaydı
   siliyordu: iz duruyor, o satışların borcu KALICI kapanmış görünüyordu.
   Değişim de tek işlemdir — iade + yerine verilen satış birlikte gider.
   Doğrulanan:
     1 Değişim iadesi satırı defterde görünüyor ve açılıyor
     2 Silme onayı kaç satışın açılacağını söylüyor
     3 Çift (aynı degisimId) BİRLİKTE siliniyor
     4 Mahsup izi geri sarılıyor — satışın tahsili eski değerine dönüyor
     5 Tahsilat silindiğinde de izi geri sarılıyor
     6 İzi OLMAYAN kayıt silinince hiçbir satışa dokunulmuyor */
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
const T1="2026-09-11T10:00:00.000Z";
const T2="2026-09-12T10:00:00.000Z";
const KALE={musteriId:"m1",yer:"H Kafe",bolge:"Üsküdar",kullaniciId:"e1",kullaniciAd:"Ahmet"};
/* sA 6×40=240 · değişim 4 Penguen (160) iadesi sA'ya mahsup → tahsil 160
   sB 5×30=150 · tahsilat 150 sB'ye mahsup → tahsil 150
   sC 2×50=100 · dokunulmamış, izsiz masraf silinince değişmemeli */
const V={
  kullanici:[{id:"a1",ad:"Komutan",rol:"admin",simge:"👑"},
             {id:"e1",ad:"Ahmet",rol:"pazarlamaci",simge:"🎖️"}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"H Kafe",kullaniciId:"e1",bolge:"Üsküdar"}],
  pazarlama_hareket:[
    {id:"sA",...KALE,tip:"satis",urunId:"u1",urunAd:"Penguen",adet:6,satisFiyat:40,alisFiyat:25,tahsil:160,tarih:T0},
    {id:"sB",...KALE,tip:"satis",urunId:"u2",urunAd:"Kaplumbağa",adet:5,satisFiyat:30,alisFiyat:20,tahsil:150,tarih:T0},
    {id:"sC",...KALE,tip:"satis",urunId:"u2",urunAd:"Kaplumbağa",adet:2,satisFiyat:50,alisFiyat:30,tahsil:0,tarih:T0},
    /* ♻️ değişim çifti — tek degisimId */
    {id:"iX",...KALE,tip:"iade",kaynak:"degisim",degisimId:"dg1",urunId:"u1",urunAd:"Penguen",
     adet:4,satisFiyat:40,alisFiyat:25,mahsup:[{id:"sA",tutar:160}],acikAlacak:0,tarih:T1},
    {id:"sX",...KALE,tip:"satis",kaynak:"degisim",degisimId:"dg1",urunId:"u2",urunAd:"Kaplumbağa",
     adet:4,satisFiyat:55,alisFiyat:30,tahsil:0,tarih:T1},
    /* 🧾 tahsilat — izi sB'ye */
    {id:"tB",...KALE,tip:"tahsilat",tutar:150,mahsup:[{id:"sB",tutar:150}],tarih:T2},
  ],
  stok_urun:[
    {id:"u1",ad:"Penguen",stokta:40,satisFiyat:40,pazFiyat:25,parcalar:[],parcaAdet:{},pazStokK:{e1:10}},
    {id:"u2",ad:"Kaplumbağa",stokta:30,satisFiyat:55,pazFiyat:30,parcalar:[],parcaAdet:{},pazStokK:{e1:12}},
  ],
  gider:[{id:"g1",tur:"Kargo",aciklama:"kargo",tutar:75,tarih:T2}],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],hedef:[],
  hakedis_donem:[],fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  sabit_gider:[],sarf:[],baski:[],
};
const b=await chromium.launch({executablePath:KROM});
const c=await b.newContext({viewport:{width:430,height:1600},isMobile:true,hasTouch:true,locale:"tr-TR"});
await c.addInitScript(v=>{ window.__TIKITA_VERI=v; try{ localStorage.setItem("tk_uid","a1"); }catch(e){} },V);
await c.route(u=>/^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(u.href),r=>r.abort());
await c.route(u=>/unpkg\.com\/react@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:REACT}));
await c.route(u=>/unpkg\.com\/react-dom@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:RDOM}));
await c.route(u=>/gstatic\.com\/firebasejs/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:FB}));
await c.route(u=>/unpkg\.com\/leaflet/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:"window.L=new Proxy({},{get:()=>()=>new Proxy({},{get:()=>()=>{}})});"}));
const p=await c.newPage(); const log=[]; const sorular=[];
p.on("pageerror",e=>log.push("[ERR] "+e.message));
p.on("dialog",d=>{ sorular.push((d.message()||"").replace(/\s+/g," ").trim()); d.accept(); });
await p.goto(SUNUCU+"/admin.html",{waitUntil:"domcontentloaded"});
await p.waitForFunction(()=>!/Karargâh hazırlanıyor|Giriş gerekli/.test(document.body.innerText||""),{timeout:20000}).catch(()=>{});
const bas=re=>p.evaluate(s=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button,[role=button],a")).filter(x=>new RegExp(s).test(d(x)));
  L.sort((a,b)=>d(a).length-d(b).length);
  if(L[0]){ L[0].click(); return d(L[0]).slice(0,50);} return "YOK"; },re);
const kay=n=>p.evaluate(n2=>window.__KAYITLAR(n2),n);
const tahsilOf=async id=>{ const H=await kay("pazarlama_hareket");
  const x=H.find(y=>y.id===id); return x?Number(x.tahsil):null; };
/* defterde metni geçen satırı aç */
const satirAc=re=>p.evaluate(s=>{ const rx=new RegExp(s);
  const T=Array.from(document.querySelectorAll("tr")).filter(x=>rx.test((x.innerText||"").replace(/\s+/g," ")));
  if(!T.length) return "YOK"; T[0].click(); return (T[0].innerText||"").replace(/\s+/g," ").trim().slice(0,70); },re);
const silBas=()=>p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
  .filter(x=>(x.innerText||"").trim()==="Sil"); if(!B.length) return "YOK"; B[0].click(); return "TIK"; });

console.log("═══ 0) deftere gir ═══");
ok("Muhasebe sekmesi",(await bas("^Muhasebe$"))!=="YOK",await p.evaluate(()=>
  (document.body.innerText||"").replace(/\s+/g," ").slice(0,90)));
await p.waitForTimeout(1200);
ok("Hareket sekmesi",(await bas("^Hareket$"))!=="YOK");
await p.waitForTimeout(1200);
let t=await p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());
ok("defter tablosu açıldı",/tür/.test(t)&&/borç/.test(t),(t.match(/tarih[\s\S]{0,60}/)||[""])[0]);

console.log("═══ 1) değişim iadesi satırı ═══");
const s1=await satirAc("Değişim iadesi");
ok("iade satırı açıldı",s1!=="YOK",s1);
await p.waitForTimeout(400);
ok("düzenleme penceresi geldi",/Hareketi düzenle/.test(
  await p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," "))));

console.log("═══ 2+3+4) sil → çift gider, iz geri sarılır ═══");
ok("sA tahsil başlangıçta 160",(await tahsilOf("sA"))===160,String(await tahsilOf("sA")));
ok("Sil'e basıldı",(await silBas())==="TIK");
await p.waitForTimeout(1500);
const soru=sorular.join(" | ");
ok("onayda çift uyarısı var",/2 kayıt birlikte silinir/.test(soru),soru.slice(0,170));
ok("onayda kaç satışın açılacağı yazıyor",/1 satışın borcu yeniden açılacak/.test(soru));
const H2=await kay("pazarlama_hareket");
ok("iade kaydı silindi",!H2.some(x=>x.id==="iX"));
ok("yerine verilen satış da silindi",!H2.some(x=>x.id==="sX"),
  H2.filter(x=>x.degisimId==="dg1").map(x=>x.id).join(","));
ok("sA tahsil 160 → 0 (borç yeniden açıldı)",Number((H2.find(x=>x.id==="sA")||{}).tahsil)===0,
  String((H2.find(x=>x.id==="sA")||{}).tahsil));
ok("sB'ye dokunulmadı",Number((H2.find(x=>x.id==="sB")||{}).tahsil)===150,
  String((H2.find(x=>x.id==="sB")||{}).tahsil));
ok("sC'ye dokunulmadı",Number((H2.find(x=>x.id==="sC")||{}).tahsil)===0);

console.log("═══ 5) tahsilat silinince de iz geri sarılır ═══");
await p.waitForTimeout(600);
const s2=await satirAc("Tahsilat|TAHSİLAT");
ok("tahsilat satırı açıldı",s2!=="YOK",s2);
await p.waitForTimeout(400);
ok("Sil'e basıldı",(await silBas())==="TIK");
await p.waitForTimeout(1500);
const H3=await kay("pazarlama_hareket");
ok("tahsilat kaydı silindi",!H3.some(x=>x.id==="tB"));
ok("sB tahsil 150 → 0",Number((H3.find(x=>x.id==="sB")||{}).tahsil)===0,
  String((H3.find(x=>x.id==="sB")||{}).tahsil));
ok("sA bir daha düşmedi (0 kaldı)",Number((H3.find(x=>x.id==="sA")||{}).tahsil)===0,
  String((H3.find(x=>x.id==="sA")||{}).tahsil));

console.log("═══ 6) izsiz kayıt — hiçbir satışa dokunulmaz ═══");
await p.waitForTimeout(600);
const s3=await satirAc("kargo|Kargo");
ok("gider satırı açıldı",s3!=="YOK",s3);
await p.waitForTimeout(400);
ok("Sil'e basıldı",(await silBas())==="TIK");
await p.waitForTimeout(1400);
const G=await kay("gider");
ok("gider silindi",!G.some(x=>x.id==="g1"),G.map(x=>x.id).join(","));
const H4=await kay("pazarlama_hareket");
ok("satışların tahsili değişmedi",
  Number((H4.find(x=>x.id==="sA")||{}).tahsil)===0
  &&Number((H4.find(x=>x.id==="sB")||{}).tahsil)===0
  &&Number((H4.find(x=>x.id==="sC")||{}).tahsil)===0,
  ["sA","sB","sC"].map(i=>i+"="+(H4.find(x=>x.id===i)||{}).tahsil).join(" "));

ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,220));
await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ DEFTERDEN SİLME DOĞRULANDI");
process.exit(hata?1:0);
