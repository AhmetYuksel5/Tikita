/* 🙈 ÜRÜN GİZLE + 🗑 KATALOG GÖRSELİ SİLME
   Doğrulanan:
     1 Ürün kartında "Gizle" düğmesi var; basınca arsiv:true yazılır
     2 Gizlenen ürün Stok listesinden düşer, EN ALTTA kapalı akordiyona iner
     3 Akordiyon açılıp ürüne girilince düğme "Göster" olur; basınca arsiv:false
     4 Stokta/çantada mal varsa gizlemede UYARI çıkar (sahada mahsur kalmasın)
     5 Katalog görsel ekranında her görselin 🗑 düğmesi var (eskiden hiç yoktu)
     6 Üç kaynağın hepsi silinebilir: yüklenen → kayıt silinir, gömülü → alan
       boşalır, hazır → o üründe gizlenir
     7 Silinen görsel katalog/ana seçimindeyse işaret temizlenir
     8 PAZARLAMACI: gizli ürün listede çıkmaz AMA çantasında kalmışsa çıkar
       (yoksa mal satılamaz hâle gelir) · çantaya YENİ alınamaz, boşaltılabilir */
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
const PIX="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/gFvXFyxAAAAAElFTkSuQmCC";
const VERI=()=>({
  kullanici:[{id:"a1",ad:"Komutan",rol:"admin",simge:"👑"},
             {id:"e1",ad:"Ahmet",rol:"pazarlamaci",simge:"🎖️",fermanCephane:true}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"H Kafe",kullaniciId:"e1",bolge:"Üsküdar"}],
  pazarlama_hareket:[
    {id:"s1",tip:"satis",kullaniciId:"e1",kullaniciAd:"Ahmet",musteriId:"m1",yer:"H Kafe",
     urunId:"u1",urunAd:"Penguen",adet:1,satisFiyat:40,alisFiyat:25,tahsil:40,tarih:T0}],
  stok_urun:[
    /* Penguen: çantada 5 · gizlenmeye aday · gömülü fotoğrafı ve 2 yüklenen fotoğrafı var */
    {id:"u1",ad:"Penguen",stokta:30,satisFiyat:40,pazFiyat:25,parcalar:[],parcaAdet:{},
     pazStokK:{e1:5},foto:PIX,anaFoto:"f1",katalogFoto:"f2"},
    {id:"u2",ad:"Kaplumbağa",stokta:12,satisFiyat:55,pazFiyat:30,parcalar:[],parcaAdet:{},pazStokK:{e1:0}},
    /* baştan gizli · pazarlamacının çantasında 3 adet DURUYOR */
    {id:"u3",ad:"Eski Dinazor",arsiv:true,stokta:0,satisFiyat:30,pazFiyat:20,
     parcalar:[],parcaAdet:{},pazStokK:{e1:3}},
    /* baştan gizli · kimsenin elinde yok */
    {id:"u4",ad:"Bitmiş Kalamar",arsiv:true,stokta:0,satisFiyat:30,pazFiyat:20,
     parcalar:[],parcaAdet:{},pazStokK:{e1:0}}],
  urun_foto:[{id:"f1",urunId:"u1",data:PIX,tarih:"2026-09-01T10:00:00.000Z"},
             {id:"f2",urunId:"u1",data:PIX,tarih:"2026-09-02T10:00:00.000Z"}],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],sefer:[],talep:[],hedef:[],
  hakedis_donem:[],fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],cephane_talep:[],
});
const b=await chromium.launch({executablePath:KROM});
async function ac(uid,sayfa){
  const c=await b.newContext({viewport:{width:430,height:1800},isMobile:true,hasTouch:true,locale:"tr-TR"});
  await c.addInitScript(([v,id])=>{ window.__TIKITA_VERI=v;
    try{ localStorage.setItem("tk_uid",id); }catch(e){} },[VERI(),uid]);
  await c.route(u=>/^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(u.href),r=>r.abort());
  await c.route(u=>/unpkg\.com\/react@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:REACT}));
  await c.route(u=>/unpkg\.com\/react-dom@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:RDOM}));
  await c.route(u=>/gstatic\.com\/firebasejs/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:FB}));
  await c.route(u=>/unpkg\.com\/leaflet/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:"window.L=new Proxy({},{get:()=>()=>new Proxy({},{get:()=>()=>{}})});"}));
  const p=await c.newPage(); const log=[]; const sor=[];
  p.on("pageerror",e=>log.push("[ERR] "+e.message));
  p.on("dialog",d=>{ sor.push((d.message()||"").replace(/\s+/g," ").trim()); d.accept(); });
  await p.goto(SUNUCU+"/"+sayfa,{waitUntil:"domcontentloaded"});
  await p.waitForFunction(()=>!/Karargâh hazırlanıyor|Giriş gerekli/.test(document.body.innerText||""),{timeout:20000}).catch(()=>{});
  return {c,p,log,sor};
}
const bas=(p,re)=>p.evaluate(s=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button,[role=button],div,a")).filter(x=>new RegExp(s).test(d(x)));
  const bt=x=>(x.tagName==="BUTTON"||x.tagName==="A")?0:1;
  L.sort((a,b)=>(d(a).length-d(b).length)||(bt(a)-bt(b)));
  if(L[0]){ L[0].click(); return d(L[0]).slice(0,60);} return "YOK"; },re);
const metin=p=>p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());
/* ⚠ SADECE gerçek <button> — sarmalayıcı div'e tıklamak React onClick'i tetiklemiyor */
const basBtn=(p,re)=>p.evaluate(s=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button")).filter(x=>new RegExp(s).test(d(x)));
  L.sort((a,b)=>d(a).length-d(b).length);
  if(L[0]){ L[0].click(); return d(L[0]).slice(0,60);} return "YOK"; },re);
/* ürün ızgarasındaki kartı adına göre aç */
const kartAc=(p,ad)=>p.evaluate(a=>{ const L=Array.from(document.querySelectorAll("button.card"))
    .filter(x=>new RegExp("(^|\\n)"+a+"(\\n|$)").test((x.innerText||"")));
  if(!L.length) return "YOK"; L[0].click(); return "TIK"; },ad);
const kay=(p,n)=>p.evaluate(n2=>window.__KAYITLAR(n2),n);
const urun=async(p,id)=>((await kay(p,"stok_urun")).find(x=>x.id===id)||{});
/* Stok ızgarasındaki ürün kartlarının adları */
/* Kart metninin tamamı alınır: ilk satır artık ürün adı değil stok sayısı
   (TASARIM.md R10 — sayı büyük, ad altında). */
const kartlar=p=>p.evaluate(()=>Array.from(document.querySelectorAll("button.card"))
  .map(x=>(x.innerText||"").replace(/\s+/g," ").trim()).filter(Boolean));

console.log("═══ 1) GİZLE — ürün kartından ═══");
{ const {c,p,log,sor}=await ac("a1","admin.html");
  ok("Stok sekmesi",(await basBtn(p,"^Stok$"))!=="YOK");
  await p.waitForTimeout(1300);
  let K=await kartlar(p);
  ok("Penguen ve Kaplumbağa listede",K.some(x=>/Penguen/.test(x))&&K.some(x=>/Kaplumbağa/.test(x)),K.join(" | "));
  ok("baştan gizli ikisi listede YOK",
    !K.some(x=>/Eski Dinazor|Bitmiş Kalamar/.test(x)),K.join(" | "));
  ok("Penguen kartı açıldı",(await kartAc(p,"Penguen"))==="TIK");
  await p.waitForTimeout(900);
  let t=await metin(p);
  ok("Gizle düğmesi var",/🙈 Gizle —/.test(t),(t.match(/🙈 Gizle —[^A-ZÇĞİÖŞÜ]{0,26}/)||[""])[0]);
  ok("Gizle'ye basıldı",(await basBtn(p,"^🙈 Gizle —"))!=="YOK");
  await p.waitForTimeout(1400);
  /* 4) stok/çanta uyarısı */
  ok("onay soruldu",sor.some(s=>/gizlensin mi/.test(s)),sor.join(" | ").slice(0,150));
  ok("stok uyarısı var (atölyede 30)",sor.some(s=>/atölyede 30 adet/.test(s)));
  ok("çanta uyarısı var (çantasında 5)",sor.some(s=>/çantasında 5 adet/.test(s)));
  ok("silinmeyeceği söylendi",sor.some(s=>/silinmez/.test(s)));
  ok("arsiv:true yazıldı",(await urun(p,"u1")).arsiv===true,String((await urun(p,"u1")).arsiv));
  ok("stok ve çanta AYNEN duruyor",
    Number((await urun(p,"u1")).stokta)===30&&Number(((await urun(p,"u1")).pazStokK||{}).e1)===5,
    JSON.stringify({stokta:(await urun(p,"u1")).stokta,canta:((await urun(p,"u1")).pazStokK||{}).e1}));
  await p.waitForTimeout(700);
  K=await kartlar(p);
  ok("Penguen listeden düştü",!K.some(x=>/Penguen/.test(x)),K.join(" | "));
  console.log("═══ 2) EN ALTTA AKORDİYON ═══");
  t=await metin(p);
  ok("Gizlenenler başlığı var",/Gizlenenler/.test(t),(t.match(/Gizlenenler \d+ ürün/)||[""])[0]);
  ok("üç ürün gizli",/Gizlenenler 3 ürün/.test(t),(t.match(/Gizlenenler \d+ ürün/)||[""])[0]);
  const yer=await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
      .find(x=>/Gizlenenler/.test(x.innerText||""));
    const K2=Array.from(document.querySelectorAll("button.card"));
    if(!B||!K2.length) return null;
    return {ak:B.getBoundingClientRect().top,
      son:Math.max(...K2.map(x=>x.getBoundingClientRect().top))}; });
  ok("akordiyon ürün ızgarasının ALTINDA",yer&&yer.ak>yer.son,
    yer?("akordiyon y="+Math.round(yer.ak)+" son kart y="+Math.round(yer.son)):"—");
  ok("kapalı başlıyor (ürün adları görünmüyor)",!/Bitmiş Kalamar/.test(t));
  ok("akordiyon açıldı",(await basBtn(p,"^🙈 Gizlenenler"))!=="YOK");
  await p.waitForTimeout(600);
  t=await metin(p);
  ok("üçü de göründü",/Penguen/.test(t)&&/Eski Dinazor/.test(t)&&/Bitmiş Kalamar/.test(t));
  console.log("═══ 3) GÖSTER — listeye geri ═══");
  ok("gizli ürüne girildi",(await basBtn(p,"^Penguen stok 30"))!=="YOK");
  await p.waitForTimeout(900);
  t=await metin(p);
  ok("düğme «Göster» oldu",/👁 Göster/.test(t),(t.match(/👁 Göster[^A-ZÇĞİÖŞÜ]{0,26}/)||[""])[0]);
  ok("Göster'e basıldı",(await basBtn(p,"^👁 Göster"))!=="YOK");
  await p.waitForTimeout(1400);
  ok("arsiv:false yazıldı",(await urun(p,"u1")).arsiv===false,String((await urun(p,"u1")).arsiv));
  await p.waitForTimeout(600);
  K=await kartlar(p);
  ok("Penguen listeye döndü",K.some(x=>/Penguen/.test(x)),K.join(" | "));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,200));
  await c.close(); }

console.log("\n═══ 5+6+7) KATALOG GÖRSELİ SİLME ═══");
{ const {c,p,log,sor}=await ac("a1","admin.html");
  await basBtn(p,"^Stok$"); await p.waitForTimeout(1300);
  ok("Katalog açıldı",(await basBtn(p,"^📔 Katalog"))!=="YOK");
  await p.waitForTimeout(1100);
  /* katalog satırındaki "değiştir" / "görsel" bağlantısı görsel ekranını açar */
  ok("görsel bağlantısı var (değiştir/görsel)",/değiştir|görsel/.test(await metin(p)),
    ((await metin(p)).match(/Penguen[^A-ZÇĞİÖŞÜ]{0,30}/)||[""])[0]);
  ok("Penguen'in görsel ekranı açıldı",(await p.evaluate(()=>{
    const S=Array.from(document.querySelectorAll("span"))
      .filter(x=>/^(değiştir|görsel)$/.test((x.innerText||"").trim()));
    if(!S.length) return "YOK"; S[0].click(); return "TIK"; }))==="TIK");
  await p.waitForTimeout(900);
  let t=await metin(p);
  ok("Katalog fotoğrafı ekranı",/Katalog fotoğrafı/.test(t),t.slice(0,60));
  let cop=await p.evaluate(()=>Array.from(document.querySelectorAll("button"))
    .filter(x=>(x.innerText||"").trim()==="🗑").length);
  /* üç görsel: f1 · f2 (yüklenen) + gömülü */
  ok("her görselde 🗑 düğmesi var",cop===3,cop+" düğme");
  ok("kaynak etiketi görünüyor",/ürün kaydından/.test(t),
    (t.match(/ürün kaydından|hazır görsel/g)||[]).join(" | "));
  /* 6a) yüklenen görseli sil → urun_foto kaydı gider */
  ok("ilk 🗑'a basıldı",(await p.evaluate(()=>{ const B=Array.from(document.querySelectorAll("button"))
    .filter(x=>(x.innerText||"").trim()==="🗑"); if(!B.length) return "YOK"; B[0].click(); return "TIK"; }))==="TIK");
  await p.waitForTimeout(1300);
  ok("silme onayı soruldu",sor.some(s=>/fotoğraf silinsin mi/i.test(s)),sor.join(" | ").slice(0,140));
  const F=await kay(p,"urun_foto");
  ok("urun_foto kaydı silindi",!F.some(x=>x.id==="f1"),F.map(x=>x.id).join(","));
  /* 7) f1 anaFoto idi — işaret temizlendi */
  ok("anaFoto işareti temizlendi",(await urun(p,"u1")).anaFoto==="",
    JSON.stringify((await urun(p,"u1")).anaFoto));
  ok("katalogFoto (f2) korundu",(await urun(p,"u1")).katalogFoto==="f2",
    String((await urun(p,"u1")).katalogFoto));
  await p.waitForTimeout(500);
  cop=await p.evaluate(()=>Array.from(document.querySelectorAll("button"))
    .filter(x=>(x.innerText||"").trim()==="🗑").length);
  ok("bir görsel eksildi (2 kaldı)",cop===2,cop+" düğme");
  /* 6b) gömülü görseli sil → ürün kaydındaki foto alanı boşalır */
  ok("gömülü görselin 🗑'una basıldı",(await p.evaluate(()=>{
    const D=Array.from(document.querySelectorAll("div"))
      .filter(x=>/ürün kaydından/.test(x.innerText||"")&&x.querySelector("button"));
    const hedef=D[D.length-1]; if(!hedef) return "YOK";
    const B=Array.from(hedef.querySelectorAll("button")).filter(x=>(x.innerText||"").trim()==="🗑");
    if(!B.length) return "YOK"; B[0].click(); return "TIK"; }))==="TIK");
  await p.waitForTimeout(1300);
  ok("gömülü foto alanı boşaldı",(await urun(p,"u1")).foto==="",
    JSON.stringify(String((await urun(p,"u1")).foto).slice(0,24)));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,200));
  await c.close(); }

console.log("\n═══ 8) PAZARLAMACI — çantada kalan gizli ürün mahsur kalmaz ═══");
{ const {c,p,log}=await ac("e1","deneme.html");
  ok("Cephane açıldı",(await basBtn(p,"Cephane$"))!=="YOK");
  await p.waitForTimeout(900);
  let t=await metin(p);
  ok("Penguen listede (gizli değil)",/Penguen/.test(t));
  ok("Kaplumbağa listede",/Kaplumbağa/.test(t));
  ok("çantasında kalan gizli ürün GÖRÜNÜYOR",/Eski Dinazor/.test(t),
    (t.match(/Eski Dinazor[^A-ZÇĞİÖŞÜ]{0,34}/)||[""])[0]);
  ok("işaretlenmiş (kaldırıldı · elindeki satılabilir)",/elindeki satılabilir/.test(t));
  ok("elinde olmayan gizli ürün GÖRÜNMÜYOR",!/Bitmiş Kalamar/.test(t));
  /* çantaya YENİ alınamaz */
  ok("Cephane ekle açıldı",(await basBtn(p,"^Cephane ekle$"))!=="YOK");
  await p.waitForTimeout(800);
  const kutu=async()=>p.evaluate(()=>Array.from(document.querySelectorAll("input[type=number]"))
    .map(i=>{ const w=i.closest("div"); return ((w&&w.innerText)||"").replace(/\s+/g," ").trim(); }).join(" ¦ "));
  let kt=await kutu();
  ok("DOLDUR ekranında gizli ürün yok",!/Eski Dinazor/.test(kt),kt.slice(0,160));
  ok("DOLDUR ekranında normal ürünler var",/Penguen/.test(kt)&&/Kaplumbağa/.test(kt));
  ok("Boşalt sekmesine geçildi",(await basBtn(p,"^📤 Boşalt$"))!=="YOK");
  await p.waitForTimeout(700);
  kt=await kutu();
  ok("BOŞALT ekranında gizli ürün VAR (iade edilebilir)",/Eski Dinazor/.test(kt),kt.slice(0,160));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,200));
  await c.close(); }

await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ GİZLE + KATALOG SİLME DOĞRULANDI");
process.exit(hata?1:0);
