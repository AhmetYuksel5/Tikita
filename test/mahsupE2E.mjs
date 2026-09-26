/* 💼 HAKEDİŞ MAHSUBU — 38. haftadan (19 Eylül) itibaren pazarlamacı hakedişini
   topladığı nakitten keser: Tahsilatlar − Tikita'ya verilecek = hakedişi.
   Öncesinde nakdin tamamı teslim edilip hakediş komutadan ayrıca ödeniyordu;
   o haftalar ödendiği için GERİYE DÖNÜK mahsup yapılmaz.
   Doğrulanan:
     1 Pazarlamacı nakit kartı: yalnız mahsup haftasının hakedişi düşülür
     2 Eski (kesim öncesi) haftanın hakedişi DÜŞÜLMEZ (komutadan ödendi)
     3 Başka haftanın satışına gelen tahsilat mahsubu büyütmez — hakediş
       satış haftasında doğar
     4 Hakediş nakdi aşarsa kart "Tikita'dan alacağın" der
     5 Komuta saha nakdi aynı rakamı verir; eksi bakiye "Tikita borçlu"
     6 Komuta: mahsup haftasında düğme "Mahsubu onayla" — para ödenmez,
       gider "mahsup" işaretiyle yazılır, dönem ödendi (odenenTutar 0)
     7 Komuta: eski haftada düğme hâlâ "Ödeme yap" */
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
/* sabit tarihler: 12 Eyl (37. hafta, kesim ÖNCESİ) · 20 Eyl (38. hafta, mahsup) ·
   15 Ağu (eski satış). Bugün 26 Eylül ve sonrası için ikisi de KAPANMIŞ hafta. */
const ESKI_H="2026-09-12T12:00:00+03:00", MAHSUP_H="2026-09-20T12:00:00+03:00", AGU="2026-08-15T12:00:00+03:00";
const sat=(id,uid,tarih,adet,f,v,tahsil,ek)=>({id,tip:"satis",kullaniciId:uid,kullaniciAd:uid==="e1"?"Emir":"Kübra",
  musteriId:"m1",yer:"Total Kirazlıtepe",urunId:"u1",urunAd:"Ahtapot",adet,satisFiyat:f,alisFiyat:v,tahsil,tarih,...(ek||{})});
const tah=(id,uid,tarih,tutar,ek)=>({id,tip:"tahsilat",kullaniciId:uid,kullaniciAd:uid==="e1"?"Emir":"Kübra",
  musteriId:"m1",yer:"Total Kirazlıtepe",tutar,tarih,...(ek||{})});
const V={
  kullanici:[{id:"a1",ad:"Komutan",rol:"admin",simge:"👑"},
             {id:"e1",ad:"Emir",rol:"pazarlamaci",simge:"🎖️"},
             {id:"e2",ad:"Kübra",rol:"pazarlamaci",simge:"🎖️"}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"Total Kirazlıtepe",kullaniciId:"e1",bolge:"Üsküdar"}],
  pazarlama_hareket:[
    /* Emir · Ağustos satışı (hakedişi Ağustos'ta ödendi), parası 38. haftada geldi */
    sat("sAg","e1",AGU,5,50,30,250),
    /* Emir · 37. hafta (kesim öncesi): 10×(50−30)=200 hakediş, 500 tahsil, 500 teslim */
    sat("s37","e1",ESKI_H,10,50,30,500), tah("t37","e1",ESKI_H,500),
    {id:"n37",tip:"nakitTeslim",kullaniciId:"e1",kullaniciAd:"Emir",tutar:500,onay:true,tarih:"2026-09-19T10:00:00+03:00"},
    /* Emir · 38. hafta: 6×(50−30)=120 hakediş · 300 tahsil + Ağustos'un 250'si */
    sat("s38","e1",MAHSUP_H,6,50,30,300), tah("t38","e1",MAHSUP_H,300),
    tah("tAg","e1",MAHSUP_H,250,{mahsup:[{id:"sAg",tutar:250}]}),
    /* Kübra · 38. hafta: 10×(50−30)=200 hakediş, parası ALINMADI */
    sat("k38","e2",MAHSUP_H,10,50,30,0)],
  hakedis_donem:[
    {id:"e1_2026-09-12",kullaniciId:"e1",kullaniciAd:"Emir",hafta:"2026-09-12",
     bas:"2026-09-12T00:00:00+03:00",bit:"2026-09-18T23:59:59+03:00",hakedis:200,nakitTeslim:500,
     ciro:500,verisBedel:300,satisAdet:10,durum:"onaylandi",odenenTutar:0},
    {id:"e1_2026-09-19",kullaniciId:"e1",kullaniciAd:"Emir",hafta:"2026-09-19",
     bas:"2026-09-19T00:00:00+03:00",bit:"2026-09-25T23:59:59+03:00",hakedis:120,nakitTeslim:550,
     mahsup:120,tikitaya:430,ciro:300,verisBedel:180,satisAdet:6,durum:"bildirildi",odenenTutar:0}],
  stok_urun:[{id:"u1",ad:"Ahtapot",stokta:50,satisFiyat:50,pazFiyat:30,parcalar:[],parcaAdet:{},pazStokK:{e1:5,e2:5}}],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],hedef:[],
  fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],cephane_talep:[],
};
/* Emir: kapanan haftalardan toplanan 500 + 300 + 250 = 1.050
         mahsup (yalnız 38. hafta) 120 · teslim 500 → 1.050 − 120 − 500 = 430
   Kübra: toplanan 0 · mahsup 200 → −200 (Tikita borçlu) */
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

console.log("═══ 1-3) Emir — mahsup yalnız 38. haftada ═══");
{ const {c,p,log}=await ac("e1","deneme.html");
  await basBtn(p,"Rapor$"); await p.waitForTimeout(1100);
  const K=await kart(p);
  ok("kart 430 ₺ (1.050 − 120 mahsup − 500 teslim)",/430 ₺/.test(K),K);
  ok("eski haftanın 200 hakedişi DÜŞÜLMEDİ (230 değil)",!/230 ₺/.test(K),K);
  ok("Ağustos satışının 100 hakedişi DÜŞÜLMEDİ (330 değil)",!/330 ₺/.test(K),K);
  ok("teslim sheet açıldı",(await basBtn(p,"Teslim edilecek nakit"))!=="YOK");
  await p.waitForTimeout(600);
  const t=await p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());
  ok("sheet: 'Hakedişin (nakitten kesilen) −120 ₺'",/Hakedişin \(nakitten kesilen\) −120 ₺/.test(t),
    (t.match(/Hakedişin \(nakitten[^T]{0,26}/)||[""])[0]);
  ok("sheet: 'Şimdi teslim edilecek 430 ₺'",/Şimdi teslim edilecek 430 ₺/.test(t));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 4) Kübra — hakediş nakdi aştı ═══");
{ const {c,p,log}=await ac("e2","deneme.html");
  await basBtn(p,"Rapor$"); await p.waitForTimeout(1100);
  const K=await kart(p);
  ok("kart 'Tikita'dan alacağın 200 ₺'",/Tikita'dan alacağın/.test(K)&&/200 ₺/.test(K),K);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 5-7) KOMUTA ═══");
{ const {c,p,log}=await ac("a1","admin.html");
  await basBtn(p,"Rapor$"); await p.waitForTimeout(1500);
  await basBtn(p,"Diğer göstergeler"); await p.waitForTimeout(700);
  ok("saha nakdi açıldı",(await basBtn(p,"Saha nakdi"))!=="YOK");
  await p.waitForTimeout(700);
  let t=await p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());
  ok("Emir: hakediş mahsubu −120 ₺ yazıyor",/Emir kapanan haftalar 1\.050 ₺ · hakediş mahsubu −120 ₺/.test(t),
    (t.match(/Emir kapanan[^E]{0,90}/)||[""])[0]);
  ok("Emir: 430 ₺",/Emir kapanan[^K]{0,90}430 ₺/.test(t),(t.match(/Emir kapanan[^K]{0,110}/)||[""])[0]);
  ok("Kübra: 'Tikita borçlu' 200 ₺",/Kübra[^E]{0,80}200 ₺ Tikita borçlu/.test(t),(t.match(/Kübra[^E]{0,90}/)||[""])[0]);
  await basBtn(p,"^Kapat$"); await p.waitForTimeout(500);

  ok("hakediş listesi açıldı",(await basBtn(p,"Pazarlamacı hakedişi"))!=="YOK");
  await p.waitForTimeout(700);
  /* 38. hafta kartını aç */
  await p.evaluate(()=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
    const L=Array.from(document.querySelectorAll("button")).filter(x=>/^Emir 38\. hafta/.test(d(x)));
    L[0]&&L[0].click(); });
  await p.waitForTimeout(500);
  t=await p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());
  ok("38. hafta: 'Tikita'ya verilecek (net) 430 ₺'",/Tikita'ya verilecek \(net\) 430 ₺/.test(t));
  ok("38. hafta: düğme 'Mahsubu onayla'",/✓ Mahsubu onayla/.test(t));
  ok("'Mahsubu onayla' basıldı",(await basBtn(p,"Mahsubu onayla"))!=="YOK");
  await p.waitForTimeout(900);
  const G=await p.evaluate(()=>window.__KAYITLAR("gider"));
  const g=G.find(x=>x.hakedisId==="e1_2026-09-19");
  ok("gider yazıldı · mahsup işaretli · 120 ₺",!!g&&g.mahsup===true&&Number(g.tutar)===120,JSON.stringify(g||{}).slice(0,140));
  const HD=await p.evaluate(()=>window.__KAYITLAR("hakedis_donem"));
  const d38=HD.find(x=>x.id==="e1_2026-09-19");
  ok("dönem ödendi · odenenTutar 0 · mahsupTutar 120",d38&&d38.durum==="odendi"&&Number(d38.odenenTutar)===0&&Number(d38.mahsupTutar)===120,
    JSON.stringify(d38||{}).slice(0,160));

  /* 37. hafta (kesim öncesi) — hâlâ nakit ödeme */
  await p.evaluate(()=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
    const L=Array.from(document.querySelectorAll("button")).filter(x=>/^Emir 37\. hafta/.test(d(x)));
    L[0]&&L[0].click(); });
  await p.waitForTimeout(500);
  t=await p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());
  ok("37. hafta: düğme hâlâ '₺ Ödeme yap'",/₺ Ödeme yap/.test(t));
  ok("37. hafta: 'Teslim edilecek nakit 500 ₺' (net değil)",/Teslim edilecek nakit 500 ₺/.test(t));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ HAKEDİŞ MAHSUBU DOĞRULANDI");
await b.close();
process.exit(hata?1:0);
