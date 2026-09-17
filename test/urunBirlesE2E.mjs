/* 🔗 ÜRÜN BİRLEŞTİRME — kapanan ürün SİLİNMEZ, arsiv:true + birlesti ile saklanır.
   Doğrulanan:
     1 arsiv:true ürün pazarlamacı Cephane listesinde ÇIKMAZ
     2 arsiv:true ürün komuta Stok listesinde ÇIKMAZ
     3 Süzgeç map'ten ÖNCE çalışır (map'lenen nesnede arsiv alanı yok — eski
       sırayla süzgeç hiç işlemiyordu; bu satır o hatayı yakalar)
     4 Kapanan kartın kaydı DURUYOR: birlesti/birlestiOnce okunabiliyor
     5 Sayaç toplamı korunuyor: birleşik stok = iki kartın toplamı, çanta adetleri
       tek ürün altında toplanıyor
     6 Taşınan hareketler tek ürün adı altında görünüyor (kale konsinye dökümü
       ikiye bölünmüyor)
     7 Arşivli ürün SATIŞ/konsinye geçmişinden düşmüyor — ciro ve borç aynı kalır */
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
/* Birleşme SONRASI hâl: kapanan "Bukalemun" arşivli ve sıfırlanmış,
   sayaçları "Sevimli Bukalemun"a taşınmış, hareketler yeni ada dönmüş. */
const V={
  kullanici:[{id:"a1",ad:"Komutan",rol:"admin",simge:"👑"},
             {id:"e1",ad:"Ahmet",rol:"pazarlamaci",simge:"🎖️",fermanCephane:true}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"H Kafe",kullaniciId:"e1",bolge:"Üsküdar"}],
  pazarlama_hareket:[
    /* ikisi de ARTIK Sevimli Bukalemun — biri eskiden Bukalemun'du */
    {id:"k1",tip:"konsinye",kullaniciId:"e1",kullaniciAd:"Ahmet",musteriId:"m1",yer:"H Kafe",
     urunId:"sb",urunAd:"Sevimli Bukalemun",adet:7,kalan:7,satisFiyat:35,alisFiyat:26,tarih:T0},
    {id:"k2",tip:"konsinye",kullaniciId:"e1",kullaniciAd:"Ahmet",musteriId:"m1",yer:"H Kafe",
     urunId:"sb",urunAd:"Sevimli Bukalemun",adet:26,kalan:26,satisFiyat:35,alisFiyat:25,tarih:T0},
    {id:"s1",tip:"satis",kullaniciId:"e1",kullaniciAd:"Ahmet",musteriId:"m1",yer:"H Kafe",
     urunId:"sb",urunAd:"Sevimli Bukalemun",adet:6,satisFiyat:40,alisFiyat:26,tahsil:0,tarih:T0}],
  stok_urun:[
    /* ✅ yaşayan ürün — iki kartın sayaçları burada toplandı */
    {id:"sb",ad:"Sevimli Bukalemun",stokta:-71,satisFiyat:36,pazFiyat:26,seri:"Eğitim Sezon",
     seriler:["Eğitim Sezon"],parcalar:[],parcaAdet:{},montajBitti:50,maliyetGuncel:14.96,
     pazStokK:{e1:14}},
    /* 🗄 kapanan kart — SİLİNMEDİ, arşivli ve sıfırlanmış, öncesi saklı */
    {id:"bk",ad:"Bukalemun",arsiv:true,birlesti:"sb",birlestiAd:"Sevimli Bukalemun",
     birlestiTarih:"2026-09-17T09:00:00.000Z",stokta:0,pazStokK:{e1:0},
     satisFiyat:35,pazFiyat:25,parcalar:[],parcaAdet:{},
     birlestiOnce:{stokta:-33,pazStokK:{e1:14},satisFiyat:35,pazFiyat:25,maliyetGuncel:144.7}},
    {id:"u2",ad:"Kaplumbağa",stokta:12,satisFiyat:55,pazFiyat:30,parcalar:[],parcaAdet:{},pazStokK:{e1:3}}],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],hedef:[],
  hakedis_donem:[],fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],cephane_talep:[],
};
const b=await chromium.launch({executablePath:KROM});
async function ac(uid,sayfa){
  const c=await b.newContext({viewport:{width:430,height:1700},isMobile:true,hasTouch:true,locale:"tr-TR"});
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
const bas=(p,re)=>p.evaluate(s=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button,[role=button],div,a")).filter(x=>new RegExp(s).test(d(x)));
  const bt=x=>(x.tagName==="BUTTON"||x.tagName==="A")?0:1;
  L.sort((a,b)=>(d(a).length-d(b).length)||(bt(a)-bt(b)));
  if(L[0]){ L[0].click(); return d(L[0]).slice(0,50);} return "YOK"; },re);
const metin=p=>p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());
const kay=(p,n)=>p.evaluate(n2=>window.__KAYITLAR(n2),n);
/* uygulamanın gördüğü cephane listesi — hesap() çıktısı */
const cephaneAd=p=>p.evaluate(()=>{
  const I=Array.from(document.querySelectorAll("input[type=number]"));
  return I.map(i=>{ const w=i.closest("div"); return ((w&&w.innerText)||"").replace(/\s+/g," ").trim(); }).join(" ¦ "); });

console.log("═══ 1) PAZARLAMACI · Cephane listesi ═══");
{ const {c,p,log}=await ac("e1","deneme.html");
  ok("Cephane açıldı",(await bas(p,"Cephane$"))!=="YOK");
  await p.waitForTimeout(800);
  let t=await metin(p);
  ok("Sevimli Bukalemun listede",/Sevimli Bukalemun/.test(t));
  /* «Bukalemun» adı Sevimli Bukalemun'un İÇİNDE de geçiyor — arşivli kartın
     KENDİ satırı çıkmamalı. Ölçüt: "Bukalemun" geçen satır sayısı. */
  const satir=await p.evaluate(()=>Array.from(document.querySelectorAll("div"))
    .map(x=>(x.innerText||"").replace(/\s+/g," ").trim())
    .filter(s=>/Bukalemun/.test(s)&&s.length<40));
  const yalin=satir.filter(s=>!/Sevimli/.test(s));
  ok("arşivli «Bukalemun» kartı listede YOK",yalin.length===0,JSON.stringify(yalin).slice(0,140));
  ok("stok −71 tek satırda",/-71/.test(t),(t.match(/-?\d+ atölye/g)||[]).join(" | ").slice(0,90));
  /* çantayı doldur ekranı: arşivli ürün orada da olmamalı */
  ok("Cephane ekle açıldı",(await bas(p,"^🎒 Cephane ekle$"))!=="YOK");
  await p.waitForTimeout(700);
  const kut=await cephaneAd(p);
  ok("çanta ekranında Sevimli Bukalemun var",/Sevimli Bukalemun/.test(kut));
  ok("çanta ekranında yalın Bukalemun YOK",
    !kut.split(" ¦ ").some(s=>/Bukalemun/.test(s)&&!/Sevimli/.test(s)),kut.slice(0,150));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 2) PAZARLAMACI · kale konsinye dökümü tek satır ═══");
{ const {c,p,log}=await ac("e1","deneme.html");
  await bas(p,"Kaleler"); await p.waitForTimeout(700);
  await bas(p,"H Kafe"); await p.waitForTimeout(800);
  const t=await metin(p);
  /* 7 + 26 = 33 adet konsinye · ADI TEK olduğu için tek satırda toplanır */
  ok("konsinye 33 adet tek satırda",/33/.test(t),(t.match(/🏬 [^·]{0,26}/g)||[]).join(" | ").slice(0,110));
  const iki=(t.match(/Bukalemun/g)||[]).length;
  ok("kale kartında Bukalemun adı tek geçiyor",iki<=2,iki+" kez");
  ok("ciro 240 ₺ (6 × 40)",/240 ₺ Toplam ciro/.test(t),(t.match(/[\d.]+ ₺ Toplam ciro/)||[""])[0]);
  ok("borç 240 ₺",/240 ₺ Tahsil et/.test(t),(t.match(/[\d.]+ ₺ Tahsil et/)||[""])[0]);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 3) KOMUTA · Stok listesi ═══");
{ const {c,p,log}=await ac("a1","admin.html");
  ok("Stok sekmesi",(await bas(p,"^Stok$"))!=="YOK");
  await p.waitForTimeout(1200);
  const t=await metin(p);
  ok("Sevimli Bukalemun listede",/Sevimli Bukalemun/.test(t));
  const satir=await p.evaluate(()=>Array.from(document.querySelectorAll("div,tr"))
    .map(x=>(x.innerText||"").replace(/\s+/g," ").trim())
    .filter(s=>/Bukalemun/.test(s)&&s.length<50));
  const yalin=satir.filter(s=>!/Sevimli/.test(s));
  ok("arşivli «Bukalemun» kartı listede YOK",yalin.length===0,JSON.stringify(yalin).slice(0,140));
  ok("Kaplumbağa hâlâ listede (süzgeç fazla süzmüyor)",/Kaplumbağa/.test(t));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 4) KAPANAN KART DURUYOR — hiçbir şey silinmedi ═══");
{ const {c,p,log}=await ac("a1","admin.html");
  await p.waitForTimeout(600);
  const U=await kay(p,"stok_urun");
  const bk=U.find(x=>x.id==="bk")||{}, sb=U.find(x=>x.id==="sb")||{};
  ok("kapanan kart kaydı var",!!bk.id,bk.id||"YOK");
  ok("arsiv:true",bk.arsiv===true,String(bk.arsiv));
  ok("birlesti hedefi yazılı",bk.birlesti==="sb"&&bk.birlestiAd==="Sevimli Bukalemun",
    bk.birlesti+" / "+bk.birlestiAd);
  ok("birleşme öncesi hâl saklı",
    Number((bk.birlestiOnce||{}).stokta)===-33&&Number(((bk.birlestiOnce||{}).pazStokK||{}).e1)===14,
    JSON.stringify(bk.birlestiOnce));
  ok("kapanan kartın sayaçları sıfır (çift saymaz)",
    Number(bk.stokta)===0&&Number((bk.pazStokK||{}).e1)===0,
    JSON.stringify({stokta:bk.stokta,canta:(bk.pazStokK||{}).e1}));
  /* toplam korunuyor: −38 (eski Sevimli) + −33 (Bukalemun) = −71 */
  ok("birleşik stok = iki kartın toplamı",
    Number(sb.stokta)===Number(bk.birlestiOnce.stokta)+(-38),
    sb.stokta+" = "+bk.birlestiOnce.stokta+" + (-38)");
  ok("çanta adedi tek ürüne taşındı",Number((sb.pazStokK||{}).e1)===14,
    String((sb.pazStokK||{}).e1));
  ok("yaşayan kartın künyesi korundu",
    sb.seri==="Eğitim Sezon"&&Number(sb.montajBitti)===50&&Number(sb.maliyetGuncel)===14.96,
    JSON.stringify({seri:sb.seri,montajBitti:sb.montajBitti,maliyet:sb.maliyetGuncel}));
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

console.log("\n═══ 5) GEÇMİŞ KAYBOLMADI — hareketler yaşayan üründe ═══");
{ const {c,p,log}=await ac("a1","admin.html");
  await p.waitForTimeout(600);
  const H=await kay(p,"pazarlama_hareket");
  const ilg=H.filter(x=>/Bukalemun/.test(x.urunAd||""));
  ok("üç hareket de duruyor",ilg.length===3,ilg.length+" kayıt");
  ok("hepsi yaşayan ürünü gösteriyor",ilg.every(x=>x.urunId==="sb"),
    ilg.map(x=>x.urunId).join(","));
  ok("hepsinin adı Sevimli Bukalemun",ilg.every(x=>x.urunAd==="Sevimli Bukalemun"),
    JSON.stringify([...new Set(ilg.map(x=>x.urunAd))]));
  ok("arşivli ürüne bağlı hareket kalmadı",!H.some(x=>x.urunId==="bk"));
  ok("açık konsinye 33 adet",ilg.filter(x=>x.tip==="konsinye")
    .reduce((z,x)=>z+Number(x.kalan||0),0)===33);
  ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,160));
  await c.close(); }

await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ ÜRÜN BİRLEŞTİRME DOĞRULANDI");
process.exit(hata?1:0);
