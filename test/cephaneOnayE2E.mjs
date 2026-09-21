/* 🔐 CEPHANE ONAYI — çantaya ürün almak/bırakmak izne tabi.
   Doğrulanan:
     1 Ayar KAPALI → izinsiz pazarlamacı bile doğrudan işler (eski davranış birebir)
     2 Ayar AÇIK + izin YOK → hareket değil TALEP yazılır; stok ve çanta hiç oynamaz
     3 Ayar AÇIK + izin VAR → doğrudan işler, talep yazılmaz
     4 Boşaltma da onaya tabi (mod:"bosalt")
     5 Cephane ekranında onay şeridi · Nav'da bekleyen sayacı
     6 Komuta onayı: adet düşürülebilir, stok+çanta oynar, 'al' hareketi yazılır
     7 Komuta reddi: durum reddedildi, stok hiç oynamaz */
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
const VERI=(ayarEk,kulEk,talep)=>({
  kullanici:[{id:"a1",ad:"Komutan",rol:"admin",simge:"👑"},
             {id:"e1",ad:"Ahmet",rol:"pazarlamaci",simge:"🎖️",fermanCephane:true,...(kulEk||{})}],
  ayar:[{id:"genel",...(ayarEk||{})}],
  musteri:[{id:"m1",ad:"H Kafe",kullaniciId:"e1",bolge:"Üsküdar"}],
  pazarlama_hareket:[
    {id:"s1",tip:"satis",kullaniciId:"e1",kullaniciAd:"Ahmet",musteriId:"m1",yer:"H Kafe",
     urunId:"u1",urunAd:"Penguen",adet:1,satisFiyat:40,alisFiyat:25,tahsil:40,tarih:T0}],
  stok_urun:[
    {id:"u1",ad:"Penguen",stokta:30,satisFiyat:40,pazFiyat:25,parcalar:[],parcaAdet:{},pazStokK:{e1:4}},
    {id:"u2",ad:"Kaplumbağa",stokta:7,satisFiyat:55,pazFiyat:30,parcalar:[],parcaAdet:{},pazStokK:{e1:2}}],
  cephane_talep:talep||[],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],hedef:[],
  hakedis_donem:[],fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],
});
const b=await chromium.launch({executablePath:KROM});
async function ac(veri,uid,sayfa){
  const c=await b.newContext({viewport:{width:430,height:1700},isMobile:true,hasTouch:true,locale:"tr-TR"});
  await c.addInitScript(([v,id])=>{ window.__TIKITA_VERI=v; try{ localStorage.setItem("tk_uid",id); }catch(e){} },[veri,uid]);
  await c.route(u=>/^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(u.href),r=>r.abort());
  await c.route(u=>/unpkg\.com\/react@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:REACT}));
  await c.route(u=>/unpkg\.com\/react-dom@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:RDOM}));
  await c.route(u=>/gstatic\.com\/firebasejs/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:FB}));
  await c.route(u=>/unpkg\.com\/leaflet/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:"window.L=new Proxy({},{get:()=>()=>new Proxy({},{get:()=>()=>{}})});"}));
  const p=await c.newPage(); const log=[]; const sor=[];
  p.on("pageerror",e=>log.push("[ERR] "+e.message));
  p.on("dialog",d=>{ sor.push((d.message()||"").replace(/\s+/g," ").trim());
    if(d.type()==="prompt") d.accept("stok yok"); else d.accept(); });
  await p.goto(SUNUCU+"/"+sayfa,{waitUntil:"domcontentloaded"});
  await p.waitForFunction(()=>!/Karargâh hazırlanıyor|Giriş gerekli/.test(document.body.innerText||""),{timeout:20000}).catch(()=>{});
  return {c,p,log,sor};
}
const bas=(p,re)=>p.evaluate(s=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button,[role=button],div,a")).filter(x=>new RegExp(s).test(d(x)));
  const bt=x=>(x.tagName==="BUTTON"||x.tagName==="A")?0:1;
  L.sort((a,b)=>(d(a).length-d(b).length)||(bt(a)-bt(b)));
  if(L[0]){ L[0].click(); return d(L[0]).slice(0,50);} return "YOK"; },re);
const metin=p=>p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());
const kay=(p,n)=>p.evaluate(n2=>window.__KAYITLAR(n2),n);
/* ürün adına göre o satırın adet kutusuna yaz (çanta sheet'i) */
const adetYaz=(p,ad,v)=>p.evaluate(([a,val])=>{
  const I=Array.from(document.querySelectorAll("input[type=number]")).map(i=>({i,
    t:(i.closest("div")?i.closest("div").innerText||"":"").replace(/\s+/g," ").trim()}));
  const h2=I.find(s=>new RegExp("^"+a+"\\b").test(s.t));
  if(!h2) return "YOK";
  const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
  set.call(h2.i,String(val)); h2.i.dispatchEvent(new Event("input",{bubbles:true}));
  return h2.t.slice(0,44); },[ad,v]);
const cantaAc=async p=>{ await bas(p,"Cephane$|🎒 Cephane$"); await p.waitForTimeout(500);
  await bas(p,"^Cephane ekle$"); await p.waitForTimeout(600); };
const stokOku=async p=>{ const U=await kay(p,"stok_urun");
  const g=id=>{ const u=U.find(x=>x.id===id)||{}; return {st:Number(u.stokta),cz:Number((u.pazStokK||{}).e1)}; };
  return {u1:g("u1"),u2:g("u2")}; };

console.log("═══ 1) AYAR KAPALI — eski davranış birebir ═══");
{ const {c,p,log}=await ac(VERI({},{}),"e1","deneme.html");
  await cantaAc(p);
  let t=await metin(p);
  ok("onay uyarısı YOK",!/Komuta onayı gerekiyor/.test(t));
  ok("CTA doldurma metni",/ürünü çantaya al/.test(t),(t.match(/🎒 \d+ ürünü çantaya al/)||[""])[0]);
  ok("Penguen satırına 3 yazıldı",(await adetYaz(p,"Penguen",3))!=="YOK");
  await p.waitForTimeout(400);
  await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
    .filter(x=>/ürünü çantaya al/.test(x.innerText||"")); B[B.length-1].click(); });
  await p.waitForTimeout(1200);
  const S=await stokOku(p);
  ok("çanta 4 → 7, atölye 30 → 27",S.u1.cz===7&&S.u1.st===27,JSON.stringify(S.u1));
  ok("talep YAZILMADI",(await kay(p,"cephane_talep")).length===0);
  const H=await kay(p,"pazarlama_hareket");
  ok("'al' hareketi yazıldı",H.some(x=>x.tip==="al"&&x.kaynak==="canta"&&Number(x.adet)===3));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 2) AYAR AÇIK · İZİN YOK — talep yazılır, stok oynamaz ═══");
let talepId=null;
{ const {c,p,log}=await ac(VERI({cephaneOnay:true},{}),"e1","deneme.html");
  await cantaAc(p);
  let t=await metin(p);
  ok("onay uyarısı var",/🔐 Komuta onayı gerekiyor/.test(t));
  ok("CTA onay metnine döndü",/onay iste/.test(t),(t.match(/⏳ \d+ ürün için onay iste/)||[""])[0]);
  await adetYaz(p,"Penguen",5); await adetYaz(p,"Kaplumbağa",2);
  await p.waitForTimeout(400);
  t=await metin(p);
  ok("CTA 7 ürün",/⏳ 7 ürün için onay iste/.test(t),(t.match(/⏳ \d+ ürün için onay iste/)||[""])[0]);
  await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
    .filter(x=>/onay iste/.test(x.innerText||"")); B[B.length-1].click(); });
  await p.waitForTimeout(1300);
  const S=await stokOku(p);
  ok("atölye stoğu HİÇ oynamadı",S.u1.st===30&&S.u2.st===7,JSON.stringify([S.u1.st,S.u2.st]));
  ok("çanta HİÇ oynamadı",S.u1.cz===4&&S.u2.cz===2,JSON.stringify([S.u1.cz,S.u2.cz]));
  const TL=await kay(p,"cephane_talep");
  ok("bir talep yazıldı",TL.length===1,TL.length+" kayıt");
  const T=TL[0]||{}; talepId=T.id;
  ok("durum bekliyor",T.durum==="bekliyor",T.durum);
  ok("mod doldur",T.mod==="doldur",T.mod);
  ok("sahibi e1 · Ahmet",T.kullaniciId==="e1"&&T.kullaniciAd==="Ahmet",T.kullaniciId+"/"+T.kullaniciAd);
  ok("iki kalem · toplam 7",(T.kalemler||[]).length===2&&Number(T.adet)===7,
    JSON.stringify(T.kalemler));
  const H=await kay(p,"pazarlama_hareket");
  ok("'al' hareketi YAZILMADI",!H.some(x=>x.tip==="al"));
  /* 5) ekran geri bildirimi */
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  t=await metin(p);
  ok("Cephane ekranında onay şeridi",/🔐 Cephane onayı/.test(t)&&/onay bekliyor/.test(t),
    (t.match(/🔐 Cephane onayı[^🎒📤]{0,40}/)||[""])[0]);
  ok("şeritte kalemler yazıyor",/5 × Penguen/.test(t)&&/2 × Kaplumbağa/.test(t));
  const rz=await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
    .filter(x=>/Cephane/.test(x.innerText||"")); return B.map(x=>(x.innerText||"").replace(/\s+/g," ").trim()).join(" | "); });
  ok("Nav'da bekleyen sayacı",/1/.test(rz),rz.slice(0,80));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 3) AYAR AÇIK · İZİN VAR — doğrudan işler ═══");
{ const {c,p,log}=await ac(VERI({cephaneOnay:true},{cephaneIzin:true}),"e1","deneme.html");
  await cantaAc(p);
  let t=await metin(p);
  ok("onay uyarısı YOK",!/Komuta onayı gerekiyor/.test(t));
  ok("CTA doldurma metni",/ürünü çantaya al/.test(t),(t.match(/🎒 \d+ ürünü çantaya al/)||[""])[0]);
  await adetYaz(p,"Kaplumbağa",2); await p.waitForTimeout(350);
  await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
    .filter(x=>/ürünü çantaya al/.test(x.innerText||"")); B[B.length-1].click(); });
  await p.waitForTimeout(1200);
  const S=await stokOku(p);
  ok("çanta 2 → 4, atölye 7 → 5",S.u2.cz===4&&S.u2.st===5,JSON.stringify(S.u2));
  ok("talep YAZILMADI",(await kay(p,"cephane_talep")).length===0);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 4) BOŞALTMA da onaya tabi ═══");
{ const {c,p,log}=await ac(VERI({cephaneOnay:true},{}),"e1","deneme.html");
  await cantaAc(p);
  ok("Boşalt sekmesine geçildi",(await bas(p,"^📤 Boşalt$"))!=="YOK");
  await p.waitForTimeout(500);
  await adetYaz(p,"Penguen",2); await p.waitForTimeout(350);
  let t=await metin(p);
  ok("CTA yine onay metni",/onay iste/.test(t),(t.match(/⏳ \d+ ürün için onay iste/)||[""])[0]);
  await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
    .filter(x=>/onay iste/.test(x.innerText||"")); B[B.length-1].click(); });
  await p.waitForTimeout(1300);
  const TL=await kay(p,"cephane_talep");
  ok("boşaltma talebi yazıldı",TL.length===1&&TL[0].mod==="bosalt",(TL[0]||{}).mod);
  const S=await stokOku(p);
  ok("çanta oynamadı (4)",S.u1.cz===4,String(S.u1.cz));
  ok("'iade' hareketi yazılmadı",!(await kay(p,"pazarlama_hareket")).some(x=>x.tip==="iade"));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

/* ——— KOMUTA TARAFI ——— */
const BEKLIYOR=[{id:"ct1",kullaniciId:"e1",kullaniciAd:"Ahmet",mod:"doldur",durum:"bekliyor",
  adet:7,tarih:"2026-09-16T08:00:00.000Z",
  kalemler:[{urunId:"u1",urunAd:"Penguen",adet:5},{urunId:"u2",urunAd:"Kaplumbağa",adet:2}]}];
const admAc=async()=>{ const r=await ac(VERI({cephaneOnay:true},{}),"a1","admin.html");
  r.c && await r.p.waitForTimeout(300);
  ok("Ekip sekmesi",(await bas(r.p,"^Ekip$"))!=="YOK");
  await r.p.waitForTimeout(1000);
  ok("Cephane onayları düğmesi",/1 bekliyor/.test(await metin(r.p)),
    ((await metin(r.p)).match(/Cephane onaylar[^›]{0,24}/)||[""])[0]);
  ok("kuyruk açıldı",(await bas(r.p,"^🔐 Cephane onaylar"))!=="YOK");
  await r.p.waitForTimeout(800);
  return r; };

console.log("\n═══ 6) KOMUTA ONAYI — adet düşürülüp işlenir ═══");
{ const V6=VERI({cephaneOnay:true},{},JSON.parse(JSON.stringify(BEKLIYOR)));
  const {c,p,log,sor}=await ac(V6,"a1","admin.html");
  ok("Ekip sekmesi",(await bas(p,"^Ekip$"))!=="YOK");
  await p.waitForTimeout(1000);
  let t=await metin(p);
  ok("1 bekliyor rozeti",/1 bekliyor/.test(t),(t.match(/Cephane onaylar[^›]{0,22}/)||[""])[0]);
  ok("kuyruk açıldı",(await bas(p,"Cephane onaylar"))!=="YOK");
  await p.waitForTimeout(900);
  t=await metin(p);
  ok("talep sahibi görünüyor",/Ahmet/.test(t));
  ok("istenen adetler görünüyor",/istedi 5/.test(t)&&/istedi 2/.test(t),
    (t.match(/istedi \d+ · atölyede \d+/g)||[]).join(" | "));
  /* Kaplumbağa atölyede 7 → tavan aşılamaz; Penguen 5 → 3'e düşür */
  ok("Penguen 5 → 3",(await adetYaz(p,"Penguen",3))!=="YOK",await adetYaz(p,"Penguen",3));
  await p.waitForTimeout(400);
  t=await metin(p);
  ok("onay CTA 5 adet",/✓ 5 adet onayla/.test(t),(t.match(/✓ \d+ adet onayla/)||[""])[0]);
  await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
    .filter(x=>/adet onayla/.test(x.innerText||"")); B[0].click(); });
  await p.waitForTimeout(1600);
  ok("onay soruldu",sor.some(s=>/Onaylıyor musun/.test(s)),sor.join(" | ").slice(0,150));
  ok("kısmi onay uyarısı",sor.some(s=>/Talep 7 adetti, 5 adet onaylanıyor/.test(s)));
  const U=await kay(p,"stok_urun");
  const g=id=>{ const u=U.find(x=>x.id===id)||{}; return {st:Number(u.stokta),cz:Number((u.pazStokK||{}).e1)}; };
  ok("Penguen çanta 4 → 7, atölye 30 → 27",g("u1").cz===7&&g("u1").st===27,JSON.stringify(g("u1")));
  ok("Kaplumbağa çanta 2 → 4, atölye 7 → 5",g("u2").cz===4&&g("u2").st===5,JSON.stringify(g("u2")));
  const H=await kay(p,"pazarlama_hareket");
  const al=H.filter(x=>x.tip==="al"&&x.kaynak==="canta");
  ok("iki 'al' hareketi yazıldı",al.length===2,al.map(x=>x.urunAd+":"+x.adet).join(", "));
  ok("hareket sahibi pazarlamacı",al.every(x=>x.kullaniciId==="e1"),al.map(x=>x.kullaniciId).join(","));
  const T=(await kay(p,"cephane_talep")).find(x=>x.id==="ct1")||{};
  ok("durum onaylandi",T.durum==="onaylandi",T.durum);
  ok("onayKalem gerçek adetleri taşıyor",
    JSON.stringify((T.onayKalem||[]).map(c=>[c.urunAd,c.adet]))==='[["Penguen",3],["Kaplumbağa",2]]',
    JSON.stringify(T.onayKalem));
  ok("talebin kendisi korundu (5+2)",
    JSON.stringify((T.kalemler||[]).map(c=>c.adet))==="[5,2]",JSON.stringify(T.kalemler));
  ok("karar veren yazıldı",!!T.kararAd&&!!T.kararTarih,T.kararAd);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 7) KOMUTA REDDİ — stok hiç oynamaz ═══");
{ const V7=VERI({cephaneOnay:true},{},JSON.parse(JSON.stringify(BEKLIYOR)));
  const {c,p,log}=await ac(V7,"a1","admin.html");
  await bas(p,"^Ekip$"); await p.waitForTimeout(1000);
  await bas(p,"Cephane onaylar"); await p.waitForTimeout(900);
  ok("Reddet'e basıldı",(await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
    .filter(x=>(x.innerText||"").trim()==="Reddet"); if(!B.length) return "YOK"; B[0].click(); return "TIK"; }))==="TIK");
  await p.waitForTimeout(1500);
  const T=(await kay(p,"cephane_talep")).find(x=>x.id==="ct1")||{};
  ok("durum reddedildi",T.durum==="reddedildi",T.durum);
  ok("ret sebebi yazıldı",T.red==="stok yok",T.red);
  const U=await kay(p,"stok_urun");
  const g=id=>{ const u=U.find(x=>x.id===id)||{}; return {st:Number(u.stokta),cz:Number((u.pazStokK||{}).e1)}; };
  ok("Penguen hiç oynamadı",g("u1").st===30&&g("u1").cz===4,JSON.stringify(g("u1")));
  ok("Kaplumbağa hiç oynamadı",g("u2").st===7&&g("u2").cz===2,JSON.stringify(g("u2")));
  ok("hareket yazılmadı",!(await kay(p,"pazarlama_hareket")).some(x=>x.tip==="al"));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 8) İZİN ANAHTARI komuta ekranında ═══");
{ const {c,p,log}=await ac(VERI({cephaneOnay:true},{}),"a1","admin.html");
  await bas(p,"^Ekip$"); await p.waitForTimeout(1000);
  ok("pazarlamacı kartı açıldı",(await bas(p,"Ahmet"))!=="YOK");
  await p.waitForTimeout(700);
  ok("Düzenle'ye basıldı",(await bas(p,"^Kullanıcıyı düzenle"))!=="YOK");
  await p.waitForTimeout(700);
  let t=await metin(p);
  ok("cephane izni anahtarı var",/Onaysız cephane hareketi/.test(t),
    (t.match(/Cephane izni[\s\S]{0,60}/)||t.match(/Onaysız cephane hareketi[^A-ZÇĞİÖŞÜ]{0,40}/)||[""])[0]);
  ok("kapalı hâlde 'onaya düşer' yazıyor",/her hareketi onaya düşer/.test(t));
  ok("anahtar açıldı",(await bas(p,"Onaysız cephane hareketi"))!=="YOK");
  await p.waitForTimeout(500);
  t=await metin(p);
  ok("açık hâlde metin değişti",/çantasını kendi doldurup boşaltır/.test(t));
  ok("Kaydet'e basıldı",(await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
    .filter(x=>/^Kaydet$/.test((x.innerText||"").trim())); if(!B.length) return "YOK"; B[0].click(); return "TIK"; }))==="TIK");
  await p.waitForTimeout(1300);
  const K=(await kay(p,"kullanici")).find(x=>x.id==="e1")||{};
  ok("cephaneIzin true yazıldı",K.cephaneIzin===true,String(K.cephaneIzin));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 9) AYAR ANAHTARI komuta ekranında ═══");
{ const {c,p,log}=await ac(VERI({},{}),"a1","admin.html");
  await bas(p,"^Ekip$"); await p.waitForTimeout(1000);
  ok("Ayarlar açıldı",(await bas(p,"^Ayarlar$"))!=="YOK");
  await p.waitForTimeout(800);
  let t=await metin(p);
  ok("cephane onay anahtarı var",/Cephane hareketi onaya tabi/.test(t));
  ok("kapalı hâlde 'herkes serbestçe'",/herkes serbestçe çanta hareketi yapar/.test(t));
  ok("anahtar açıldı",(await bas(p,"Cephane hareketi onaya tabi"))!=="YOK");
  await p.waitForTimeout(400);
  ok("açık hâlde metin değişti",/izinsiz pazarlamacı onay bekler/.test(await metin(p)));
  await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
    .filter(x=>/^Kaydet$/.test((x.innerText||"").trim())); B[0]&&B[0].click(); });
  await p.waitForTimeout(1300);
  const A=(await kay(p,"ayar")).find(x=>x.id==="genel")||{};
  ok("cephaneOnay true yazıldı",A.cephaneOnay===true,String(A.cephaneOnay));
  ok("diğer ayarlar bozulmadı",Number(A.kdvOran)===20&&Number(A.tablaUcret)===5,
    JSON.stringify({kdv:A.kdvOran,tabla:A.tablaUcret}));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ CEPHANE ONAYI DOĞRULANDI");
process.exit(hata?1:0);
