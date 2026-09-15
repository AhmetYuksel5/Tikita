/* Açılan sayfalar YANA KAYMAMALI — komuta ve pazarlamacı uygulamaları.
   Dar ekranda (320px) yatay taşma en önce orada görünür. */
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

const MAK=(id,ad,tur)=>({id,ad,tur,durum:"bos"});
const FL=(id,ad,kod)=>({id,ad,kod,renk:"#333",kalanGram:900,agirlikGram:1000,durum:"depo"});
const T0="2026-09-10T10:00:00.000Z";
const V={
  kullanici:[{id:"a1",ad:"Komutan",rol:"admin",simge:"👑"},
             {id:"e1",ad:"Ahmet",rol:"pazarlamaci",simge:"🎖️",fermanCephane:true}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"H Yayınları Kitap Kahve ve Uzun Bir Mekan Adı",kullaniciId:"e1",bolge:"Üsküdar"}],
  pazarlama_hareket:[
    {id:"k1",tip:"konsinye",kullaniciId:"e1",kullaniciAd:"Ahmet",musteriId:"m1",
     yer:"H Yayınları Kitap Kahve ve Uzun Bir Mekan Adı",urunId:"u1",
     urunAd:"Halkalı Kalp anahtarlık",adet:14,kalan:14,satisFiyat:35,alisFiyat:25,konsMod:"konsinye",tarih:T0},
    {id:"s1",tip:"satis",kullaniciId:"e1",kullaniciAd:"Ahmet",musteriId:"m1",
     yer:"H Yayınları Kitap Kahve ve Uzun Bir Mekan Adı",urunId:"u1",
     urunAd:"Halkalı Kalp anahtarlık",adet:1,satisFiyat:35,alisFiyat:25,tahsil:0,tarih:T0},
  ],
  stok_urun:[
    {id:"u1",ad:"Halkalı Kalp anahtarlık",stokta:10,satisFiyat:35,pazFiyat:25,
     parcalar:["Gövde","Kapak"],parcaAdet:{"Gövde":1,"Kapak":2},pazStokK:{e1:12},
     baskiBilgi:{tablaAdet:4,tur:{},varsayilan:{sureDk:120,filament:[{filamentId:"f1",gram:35}]}}},
    {id:"u2",ad:"Kaplumbağa",stokta:9,satisFiyat:28,pazFiyat:20,parcalar:[],parcaAdet:{},pazStokK:{e1:9}},
  ],
  makineler:[MAK("m1","A1 Mini","Bambu A1 Mini"),MAK("m2","P1S","Bambu P1S"),MAK("m3","X1C","Bambu X1 Carbon")],
  filament:[FL("f1","Siyah PLA","PLA01"),FL("f2","Beyaz PLA","PLA02"),FL("f3","Kırmızı PETG","PET01"),
            FL("f4","Mavi PLA","PLA03"),FL("f5","Yeşil PLA","PLA04")],
  plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],hedef:[],hakedis_donem:[],
  fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],
};
const b=await chromium.launch({executablePath:KROM});
async function ac(W,uid,sayfa){
  const c=await b.newContext({viewport:{width:W,height:1500},isMobile:true,hasTouch:true,locale:"tr-TR"});
  await c.addInitScript(([v,id])=>{ window.__TIKITA_VERI=v; try{ localStorage.setItem("tk_uid",id); }catch(e){} },[V,uid]);
  await c.route(u=>/^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(u.href),r=>r.abort());
  await c.route(u=>/unpkg\.com\/react@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:REACT}));
  await c.route(u=>/unpkg\.com\/react-dom@18/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:RDOM}));
  await c.route(u=>/gstatic\.com\/firebasejs/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:FB}));
  await c.route(u=>/unpkg\.com\/leaflet/.test(u.href),r=>r.fulfill({contentType:"application/javascript",body:"window.L=new Proxy({},{get:()=>()=>new Proxy({},{get:()=>()=>{}})});"}));
  const p=await c.newPage(); const log=[];
  p.on("pageerror",e=>log.push("[ERR] "+e.message));
  await p.goto(SUNUCU+"/"+sayfa,{waitUntil:"domcontentloaded"});
  await p.waitForFunction(()=>!/Karargâh hazırlanıyor|Yükleniyor|Giriş gerekli/.test(document.body.innerText||""),{timeout:20000}).catch(()=>{});
  return {c,p,log};
}
const bas=(p,re)=>p.evaluate(s=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button,[role=button],div,a")).filter(x=>new RegExp(s).test(d(x)));
  const bt=x=>(x.tagName==="BUTTON"||x.tagName==="A")?0:1;
  L.sort((a,b)=>(d(a).length-d(b).length)||(bt(a)-bt(b)));
  if(L[0]){ L[0].click(); return d(L[0]).slice(0,50);} return "YOK"; },re);
/* Sayfayı kaydırabilecek taşma: overflowX visible olanlar. auto/scroll kendi
   içinde kaydırılması İSTENEN şeritler, hidden ise kasıtlı kırpma. */
const olc=p=>p.evaluate(()=>{
  const k=Array.from(document.querySelectorAll("div")).filter(e=>{
    const st=getComputedStyle(e); return st.position==="fixed"&&e.offsetHeight>200&&e.querySelector("button"); });
  if(!k.length) return null;
  const sh=k[k.length-1].firstElementChild;
  const tas=[]; const gez=el=>Array.from(el.children).forEach(ch=>{
    if(ch.scrollWidth>ch.clientWidth+1&&getComputedStyle(ch).overflowX==="visible")
      tas.push(((ch.innerText||"").replace(/\s+/g," ").trim().slice(0,34))+" ["+ch.scrollWidth+"/"+ch.clientWidth+"]");
    gez(ch); });
  gez(sh);
  return {sw:sh.scrollWidth,cw:sh.clientWidth,ox:getComputedStyle(sh).overflowX,tas};
});
async function denet(p,ad){
  const r=await olc(p);
  if(!r){ ok(ad+" sayfası açıldı",false,"açılmadı"); return; }
  ok(ad+" — yatay kayma yok",r.sw<=r.cw+1,"sw="+r.sw+" cw="+r.cw);
  ok(ad+" — overflow-x kilitli",r.ox==="hidden",r.ox);
  ok(ad+" — taşan öğe yok",r.tas.length===0,JSON.stringify(r.tas).slice(0,150));
}
for(const W of [320,390,430]){
  console.log("\n═══ "+W+"px · KOMUTA ═══");
  let {c,p,log}=await ac(W,"a1","admin.html");
  await bas(p,"^Stok$"); await p.waitForTimeout(700);
  await bas(p,"Halkalı Kalp"); await p.waitForTimeout(700);
  await bas(p,"Baskı bilgisi"); await p.waitForTimeout(900);
  await denet(p,"baskı bilgisi");
  ok("rozet BASKI BİLGİSİ",/BASKI BİLGİSİ/.test(await p.evaluate(()=>document.body.innerText)));
  ok("ürün adı standart",/Halkalı Kalp Anahtarlık/.test(await p.evaluate(()=>document.body.innerText)));
  ok("komuta konsol temiz",!log.length,log.join(" | ").slice(0,140));
  await c.close();

  console.log("═══ "+W+"px · PAZARLAMACI ═══");
  ({c,p,log}=await ac(W,"e1","deneme.html"));
  await bas(p,"Kaleler"); await p.waitForTimeout(500);
  await bas(p,"H Yayınları"); await p.waitForTimeout(700);
  await bas(p,"Konsinye →|🏬 .* adet Konsinye"); await p.waitForTimeout(800);
  await denet(p,"konsinye");
  ok("pazarlamacı konsol temiz",!log.length,log.join(" | ").slice(0,140));
  await c.close();
}
await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ YATAY KAYMA YOK — DOĞRULANDI");
process.exit(hata?1:0);
