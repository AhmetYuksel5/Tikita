/* 👑 YÖNETİCİ PAZARLAMACI — komutanın kendi saha işlemi.
   Hakediş göndermez, hafta kapatmaz, kendine nakit teslim etmez; işlemi
   doğrudan komutada yapılmış sayılır.
   Doğrulanan:
     1 Yöneticide Rapor ekranında hakediş kartı YOK
     2 Kapatılmamış dönemler listesi ve haftalık arşiv düğmesi YOK
     3 Teslim edilecek nakit kartı YOK
     4 Yazma yolları da kapalı: hakedisGonder / nakitTeslimEt çağrılsa bile
       kayıt oluşmaz (bayat ekran / eski sekme koruması)
     5 NORMAL pazarlamacıda hepsi eskisi gibi duruyor (regresyon)
     6 Paşa rütbesindeki pazarlamacı SINIRSIZ ama yönetici DEĞİL — hakedişini
       almaya devam eder (ölçüt rütbe değil rol)
     7 KOMUTA: yöneticinin satışı şirkete yazılır (hakediş 0), saha nakdinde
       ve kapatılmamış hafta sayımında görünmez */
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
/* Geçen hafta (kapanmış) satış + tahsilat: hem hakediş hem teslim edilecek
   nakit doğsun. HAKEDIS_BAS 2026-08-08 sonrası olmalı. */
const GECEN="2026-09-09T10:00:00.000Z";
const sat=(id,uid,ad,adet,f,v,tahsil)=>({id,tip:"satis",kullaniciId:uid,kullaniciAd:ad,
  musteriId:"m1",yer:"H Kafe",urunId:"u1",urunAd:"Penguen",adet,satisFiyat:f,alisFiyat:v,
  tahsil,tarih:GECEN});
const tah=(id,uid,ad,tutar)=>({id,tip:"tahsilat",kullaniciId:uid,kullaniciAd:ad,
  musteriId:"m1",yer:"H Kafe",tutar,tarih:GECEN});
const VERI=()=>({
  kullanici:[
    {id:"a1",ad:"Komutan",rol:"admin",simge:"👑",fermanCephane:true},
    {id:"e1",ad:"Ahmet",rol:"pazarlamaci",simge:"🎖️",fermanCephane:true},
    {id:"p1",ad:"Paşa Emir",rol:"pazarlamaci",simge:"🏰",fermanCephane:true}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"H Kafe",kullaniciId:"e1",bolge:"Üsküdar"}],
  pazarlama_hareket:[
    sat("sA","a1","Komutan",10,40,25,400), tah("tA","a1","Komutan",400),
    sat("sE","e1","Ahmet",10,40,25,400),   tah("tE","e1","Ahmet",400),
    /* Paşa rütbesi için bol satış — toplamGuc 4500'ü aşsın */
    sat("sP","p1","Paşa Emir",900,60,30,54000), tah("tP","p1","Paşa Emir",54000)],
  stok_urun:[{id:"u1",ad:"Penguen",stokta:3000,satisFiyat:40,pazFiyat:25,
    parcalar:[],parcaAdet:{},pazStokK:{a1:20,e1:20,p1:20}}],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],
  hedef:[],hakedis_donem:[],fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],
  montaj_gorev:[],gider:[],sabit_gider:[],sarf:[],baski:[],cephane_talep:[],
});
const b=await chromium.launch({executablePath:KROM});
/* ⚠ Yönetici deneme.html'e DOĞRUDAN giremez (admin.html'e yönlenir);
   o ekrana ancak komutadan "görüntüle" (?as=) ile ulaşır. */
async function ac(uid,sayfa){
  const c=await b.newContext({viewport:{width:430,height:1800},isMobile:true,hasTouch:true,locale:"tr-TR"});
  await c.addInitScript(([v,id])=>{ window.__TIKITA_VERI=v;
    try{ localStorage.setItem("tk_uid",id); }catch(e){} },[VERI(),uid]);
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
const metin=p=>p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());
const kay=(p,n)=>p.evaluate(n2=>window.__KAYITLAR(n2),n);
const raporAc=async p=>{ await basBtn(p,"^Rapor$|Rapor$"); await p.waitForTimeout(1000); };

console.log("═══ 1-3) YÖNETİCİ — hakediş/hafta/nakit blokları yok ═══");
{ const {c,p,log}=await ac("a1","deneme.html?as=a1");
  await raporAc(p);
  const t=await metin(p);
  ok("Rapor ekranı açıldı",/📊 Rapor/.test(t),t.slice(0,50));
  ok("hakediş kartı YOK",!/hakediş · \d+\. hafta/.test(t),
    (t.match(/hakediş · [^·]{0,22}/)||[""])[0]);
  ok("'Cuma akşamı kapat' ibaresi YOK",!/Cuma akşamı kapat/.test(t));
  ok("kapatılmamış dönemler YOK",!/Kapatılmamış dönemler/.test(t));
  ok("haftalık arşiv düğmesi YOK",!/Haftalık arşiv/.test(t));
  ok("teslim edilecek nakit kartı YOK",!/Teslim edilecek nakit/.test(t),
    (t.match(/Teslim edilecek nakit[^A-ZÇĞİÖŞÜ]{0,20}/)||[""])[0]);
  /* ekranın geri kalanı çalışmaya devam ediyor */
  ok("bu hafta ciro kutusu duruyor",/Bu hafta ciro/.test(t));
  ok("toplam açık alacak duruyor",/Toplam açık alacak/.test(t));
  console.log("═══ 4) yazma yolları kapalı ═══");
  const r1=await p.evaluate(()=>{ try{ const B=Array.from(document.querySelectorAll("button"))
      .filter(x=>/gönder/i.test(x.innerText||"")); return B.length?"DÜĞME VAR":"düğme yok"; }
    catch(e){ return "hata"; } });
  ok("gönder düğmesi hiç yok",r1==="düğme yok",r1);
  ok("hakedis_donem kaydı oluşmadı",(await kay(p,"hakedis_donem")).length===0);
  ok("nakitTeslim kaydı oluşmadı",
    !(await kay(p,"pazarlama_hareket")).some(x=>x.tip==="nakitTeslim"));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,200));
  await c.close(); }

console.log("\n═══ 5) NORMAL PAZARLAMACI — hepsi eskisi gibi ═══");
{ const {c,p,log}=await ac("e1","deneme.html");
  await raporAc(p);
  const t=await metin(p);
  ok("hakediş kartı VAR",/hakediş · \d+\. hafta/.test(t),
    (t.match(/hakediş · \d+\. hafta[^·]{0,14}/)||[""])[0]);
  ok("haftalık arşiv düğmesi VAR",/Haftalık arşiv/.test(t));
  ok("kapatılmamış dönem uyarısı VAR",/Kapatılmamış dönemler/.test(t),
    (t.match(/Kapatılmamış dönemler[\s\S]{0,16}/)||[""])[0]);
  ok("teslim edilecek nakit kartı VAR",/Teslim edilecek nakit/.test(t));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,200));
  await c.close(); }

console.log("\n═══ 6) PAŞA RÜTBESİ — sınırsız ama yönetici DEĞİL ═══");
{ const {c,p,log}=await ac("p1","deneme.html");
  /* Sınırsız yetkinin gerçek işareti Cephane ekranındadır: çanta değil atölye
     sayılır. (Eskiden Üs ekranındaki 🏭 emojisine bakılıyordu; o emoji bir
     bilgi kartının süsüydü, yetkiyle ilgisi yoktu.) */
  await basBtn(p,"Cephane$"); await p.waitForTimeout(900);
  const t0=await metin(p);
  ok("sınırsız yetkide (atölye cephanesi)",/atölyede/.test(t0),t0.slice(0,70));
  await raporAc(p);
  const t=await metin(p);
  ok("hakediş kartı VAR (rütbe hakedişi kaldırmaz)",/hakediş · \d+\. hafta/.test(t),
    (t.match(/hakediş · \d+\. hafta[^·]{0,14}/)||[""])[0]);
  ok("haftalık arşiv düğmesi VAR",/Haftalık arşiv/.test(t));
  ok("teslim edilecek nakit kartı VAR",/Teslim edilecek nakit/.test(t));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,200));
  await c.close(); }

console.log("\n═══ 7) KOMUTA — yönetici saha nakdinde ve hafta sayımında yok ═══");
{ const {c,p,log}=await ac("a1","admin.html");
  ok("Rapor sekmesi",(await basBtn(p,"^Rapor$"))!=="YOK");
  await p.waitForTimeout(1400);
  ok("dönem: Tümü",(await basBtn(p,"^Tümü$"))!=="YOK");
  await p.waitForTimeout(1400);
  /* performans tablosu yöneticiyi zaten hiç görmez (ekip listesi rol!=admin) */
  ok("Pazarlamacı sekmesi",(await basBtn(p,"^Pazarlamacı$"))!=="YOK");
  await p.waitForTimeout(1400);
  let t=await metin(p);
  ok("Ahmet performans tablosunda",/Ahmet/.test(t));
  ok("Komutan performans tablosunda YOK",!/Komutan/.test(t.replace(/Komuta(?!n)/g,"")),
    (t.match(/Komutan[^A-ZÇĞİÖŞÜ]{0,20}/)||[""])[0]);
  /* saha nakdi: yalnız Ahmet'in 400 ₺'si — yöneticinin 400 ₺'si girmemeli */
  ok("Özet sekmesi",(await basBtn(p,"^Özet$"))!=="YOK");
  await p.waitForTimeout(1300);
  ok("diğer göstergeler açıldı",(await basBtn(p,"^Diğer göstergeler"))!=="YOK");
  await p.waitForTimeout(900);
  t=await metin(p);
  /* Saha nakdi = Ahmet 400 + Paşa Emir 54.000 = 54.400 ₺.
     Yönetici de sayılsaydı 54.800 ₺ olurdu — ayırt edici sınama budur. */
  const sn=(t.match(/Saha nakdi[\s\S]{0,60}/)||[""])[0].replace(/\s+/g," ");
  const deger=((sn.match(/([\d.]+) ₺/)||[])[1]||"").trim();
  ok("saha nakdi 54.400 ₺ — yöneticinin 400 ₺'si girmedi",deger==="54.400",
    "okunan: "+(deger||"—")+"   ["+sn.slice(0,58)+"]");
  ok("54.800 ₺ DEĞİL (yönetici dahil edilmemiş)",deger!=="54.800",deger);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,200));
  await c.close(); }

await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ YÖNETİCİ PAZARLAMACI DOĞRULANDI");
process.exit(hata?1:0);
