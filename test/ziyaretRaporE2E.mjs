/* 🧾 ZİYARET RAPORU · fiyat bazlı döküm · birleşik reyting
   Doğrulanan:
     1 Değişim, hareket listesinde TEK satır ("♻️ X → Y") ve geri alınabilir
     2 Kale sayfasındaki döküm iki havuzu birleşik ve FİYAT BAZINDA gösterir
     3 Ziyaret raporu istenen sırada: sayım → müşterinin sattığı → iade/değişim
       → satılan yeni ürünler (toplam adet) → güncel durum → tahsil edilecek
     4 Değişim fiyat farkı tahsil edilecek tutara KALEM olarak işlenir
     5 Reyting: sayımla ölçülen eriyen, konsinye satışıyla aynı sayaca girer
     6 Sayılmış mekanda doğrudan satışın TESLİM adedi reytinge iki kez girmez */
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
/* ── Nazar Büfe (doğrudan satış) ─────────────────────────────────────────
   ESKİ ziyaret : 20 Penguen × 40 ₺ satıldı (tahsil edildi)
   YENİ ziyaret : sayım 8 (12 erimiş) · 4 Penguen iade → 4 Kaplumbağa × 55
                  · 10 Penguen × 40 satıldı
   ── Zafer Market (konsinye) : 60 Ahtapot bırakıldı, 60 satıldı           */
const ESKI="2026-09-01T09:00:00.000Z";
const Y0="2026-09-14T09:00:00.000Z", Y1="2026-09-14T09:05:00.000Z", Y2="2026-09-14T09:10:00.000Z";
const V={
  kullanici:[{id:"e1",ad:"Emir",rol:"pazarlamaci",simge:"🎖️",fermanCephane:true}],
  ayar:[{id:"genel"}],
  musteri:[{id:"m1",ad:"Nazar Büfe",kullaniciId:"e1",bolge:"Üsküdar"},
           {id:"m2",ad:"Zafer Market",kullaniciId:"e1",bolge:"Üsküdar"}],
  pazarlama_hareket:[
    {id:"s1",tip:"satis",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Nazar Büfe",
     urunId:"u1",urunAd:"Penguen",adet:20,satisFiyat:40,alisFiyat:25,maliyetBirim:12,tahsil:800,tarih:ESKI},
    /* sayım: beklenen 20 → sayılan 8 (12 erimiş) */
    {id:"y1",tip:"sayim",kapsam:"mulk",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Nazar Büfe",
     adet:8,satilan:12,kalemler:[{urunId:"u1",urunAd:"Penguen",adet:8,beklenen:20,birim:40}],tarih:Y0},
    /* değişim: 4 Penguen (40) → 4 Kaplumbağa (55) · fark +60 */
    {id:"d1",tip:"iade",kaynak:"degisim",degisimId:"g1",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",
     yer:"Nazar Büfe",urunId:"u1",urunAd:"Penguen",adet:4,satisFiyat:40,alisFiyat:25,maliyetBirim:12,tarih:Y1},
    {id:"d2",tip:"satis",kaynak:"degisim",degisimId:"g1",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",
     yer:"Nazar Büfe",urunId:"u2",urunAd:"Kaplumbağa",adet:4,satisFiyat:55,alisFiyat:30,maliyetBirim:15,tahsil:0,tarih:Y1},
    /* sayımdan bırakış: 10 Penguen × 40 */
    {id:"y2",tip:"satis",kaynak:"sayim",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m1",yer:"Nazar Büfe",
     urunId:"u1",urunAd:"Penguen",adet:10,satisFiyat:40,alisFiyat:25,maliyetBirim:12,tahsil:0,tarih:Y2},
    /* konsinye mekanı: 60 bırakıldı, 60 satıldı */
    {id:"k1",tip:"konsinye",konsMod:"konsinye",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m2",
     yer:"Zafer Market",urunId:"u3",urunAd:"Dinazor",adet:60,kalan:0,satisFiyat:30,alisFiyat:25,maliyetBirim:10,tarih:ESKI},
    {id:"k2",tip:"satis",kaynak:"konsinye",kullaniciId:"e1",kullaniciAd:"Emir",musteriId:"m2",
     yer:"Zafer Market",urunId:"u3",urunAd:"Dinazor",adet:60,satisFiyat:30,alisFiyat:25,maliyetBirim:10,
     tahsil:0,konsParti:[{id:"k1",adet:60}],tarih:Y0},
  ],
  stok_urun:[
    {id:"u1",ad:"Penguen",stokta:60,satisFiyat:40,pazFiyat:25,parcalar:[],parcaAdet:{},pazStokK:{e1:30}},
    {id:"u2",ad:"Kaplumbağa",stokta:40,satisFiyat:55,pazFiyat:30,parcalar:[],parcaAdet:{},pazStokK:{e1:20}},
    {id:"u3",ad:"Dinazor",stokta:50,satisFiyat:30,pazFiyat:25,parcalar:[],parcaAdet:{},pazStokK:{e1:15}},
  ],
  makineler:[],filament:[],plan:[],kasa:[],kasa_hareket:[],urun_foto:[],sefer:[],talep:[],hedef:[],
  hakedis_donem:[],fiyat_gecmisi:[],kesif_red:[],kampanya:[],stok_hareket:[],montaj_gorev:[],
  gider:[],sabit_gider:[],sarf:[],baski:[],
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
p.on("dialog",d=>d.accept());
await p.goto(SUNUCU+"/deneme.html",{waitUntil:"domcontentloaded"});
await p.waitForFunction(()=>!/Karargâh hazırlanıyor/.test(document.body.innerText||""),{timeout:20000}).catch(()=>{});
const bas=re=>p.evaluate(s=>{ const d=x=>(x.innerText||"").replace(/\s+/g," ").trim();
  const L=Array.from(document.querySelectorAll("button,[role=button],div,a")).filter(x=>new RegExp(s).test(d(x)));
  const bt=x=>(x.tagName==="BUTTON"||x.tagName==="A")?0:1;
  L.sort((a,b)=>(d(a).length-d(b).length)||(bt(a)-bt(b)));
  if(L[0]){ L[0].click(); return d(L[0]).slice(0,60);} return "YOK"; },re);
const metin=()=>p.evaluate(()=>(document.body.innerText||"").replace(/\s+/g," ").trim());
const sheet=()=>p.evaluate(()=>{ const d=document.querySelector("div[style*='z-index: 70']");
  return d?(d.innerText||"").replace(/\s+/g," ").trim():""; });
const kay=n=>p.evaluate(n2=>window.__KAYITLAR(n2),n);

await bas("Kaleler"); await p.waitForTimeout(600);
await bas("Nazar Büfe"); await p.waitForTimeout(900);
let t=await metin();

console.log("═══ 2) kale sayfası · birleşik ve FİYAT BAZINDA döküm ═══");
ok("döküm kartı var",/Kalede bulunanlar/.test(t));
/* 20 satıldı − 12 eridi(sayım 8) − 4 değişim iadesi + 10 yeni = 14 @ 40 ₺ */
ok("Penguen 14 × 40 ₺",/🛍 Penguen 14 40 ₺/.test(t),(t.match(/🛍 \S+ [\d.]+ [\d.]+ ₺/g)||[]).join(" | "));
ok("Kaplumbağa 4 × 55 ₺",/🛍 Kaplumbağa 4 55 ₺/.test(t));
ok("sayım rozeti var",/sayıldı/.test(t),(t.match(/(bugün|\d+ gün önce) sayıldı/)||[""])[0]);

console.log("═══ 1) değişim hareket listesinde TEK satır ═══");
ok("geçmişe girildi",(await bas("₺ ciro"))!=="YOK");
await p.waitForTimeout(900);
let sh=await sheet();
ok("tek satırda ♻️ Değişim",/♻️ Değişim/.test(sh),(sh.match(/♻️ [^↩]{0,40}/)||[""])[0]);
ok("Penguen → Kaplumbağa okunuyor",/4 × Penguen → 4 × Kaplumbağa/.test(sh),
  (sh.match(/4 × \S+ → 4 × \S+/)||[""])[0]);
ok("ayrı 'geri alınan/yerine verilen' satırı YOK",!/geri alınan/.test(sh)&&!/yerine verilen/.test(sh));
const ndeg=await p.evaluate(()=>{ const d=document.querySelector("div[style*='z-index: 70']");
  return (((d||document.body).innerText||"").match(/♻️/g)||[]).length; });
ok("tek ♻️ satırı",ndeg===1,String(ndeg));
/* geri al → iki kayıt birlikte silinir */
const gerial=await p.evaluate(()=>{
  const d=document.querySelector("div[style*='z-index: 70']"); if(!d) return "YOK";
  const B=Array.from(d.querySelectorAll("button")).filter(x=>(x.innerText||"").trim()==="↩️");
  for(const bt of B){ let k=bt.parentElement;
    for(let i=0;i<4&&k;i++,k=k.parentElement){
      if(Array.from(k.querySelectorAll("button")).filter(z=>(z.innerText||"").trim()==="↩️").length!==1) break;
      if(/♻️|Değişim/.test((k.innerText||""))){ bt.click(); return "TIK"; } } }
  return "YOK"; });
ok("değişim satırından geri alındı",gerial==="TIK",gerial);
await p.waitForTimeout(1600);
const H=await kay("pazarlama_hareket");
ok("iki kayıt birlikte silindi",!H.some(x=>x.degisimId==="g1"),
  H.filter(x=>x.degisimId==="g1").map(x=>x.id).join(","));
/* geri kur */
await p.evaluate(v=>window.__DEGISTIR("pazarlama_hareket",v),V.pazarlama_hareket);
await p.waitForTimeout(900);
await p.keyboard.press("Escape"); await p.waitForTimeout(500);

console.log("═══ 3+4) ziyaret raporu sırası ve kalemleri ═══");
ok("ziyaret raporuna girildi",(await bas("Ziyaret raporu"))!=="YOK");
await p.waitForTimeout(900);
sh=await sheet();
if(/Ziyaret raporları/.test(sh)){ await bas("14 Eyl|Eyl"); await p.waitForTimeout(800); sh=await sheet(); }
const sira=["1 · Ziyarete gelindiğinde stantta olan","2 · Müşterinin sattığı",
  "3 · İade alınan ve yerine verilen","4 · Bu ziyarette kaleye satılan",
  "5 · Ziyaret sonunda stantta kalan","6 · Tahsil edilecek tutar"];
const yer=sira.map(x=>sh.indexOf(x));
ok("altı bölüm de var",yer.every(i=>i>=0),sira.map((x,i)=>x+"="+yer[i]).join(" | "));
ok("sıra doğru",yer.every((v,i)=>i===0||v>yer[i-1]),yer.join(" < "));
ok("sayımda 8 adet",/8 × Penguen/.test(sh),(sh.match(/1 · Ziyarete[^0-9]{0,60}[\d]+ × \S+/)||[""])[0]);
ok("'müşterinin malı' ibaresi kalktı",!/[Mm]üşterinin malı/.test(sh),
  (sh.match(/[Mm]üşterinin malı/)||[""])[0]);
ok("'satın aldıkları' ifadesi var",/satın aldıkları/.test(sh));
ok("müşterinin sattığı 12 adet",/12 × Penguen/.test(sh)&&/Toplam · 12 adet/.test(sh));
/* iki kolon: solda iade alınan, sağda yerine verilen */
ok("kolon başlıkları var",/↩ İADE ALINAN/.test(sh)&&/→ YERİNE VERİLEN/.test(sh),
  (sh.match(/↩ İADE ALINAN[\s\S]{0,24}/)||[""])[0]);
ok("çift yan yana okunuyor",/4 × Penguen 40 ₺ · 160 ₺ → 4 × Kaplumbağa/.test(sh),
  (sh.match(/4 × Penguen[^\n]{0,44}/)||[""])[0]);
ok("çiftin fiyat farkı +60",/Fiyat farkı \+ ?60/.test(sh),(sh.match(/Fiyat farkı [^ ]+ ?[\d.]+ ₺/)||[""])[0]);
ok("satılan yeni ürünler toplamı 10 adet",/Toplam · 10 adet/.test(sh),
  (sh.match(/4 · Bu ziyarette kaleye satılan[\s\S]{0,80}Toplam · \d+ adet/)||[""])[0].slice(-22));
ok("stantta kalan 14 + 4",/Toplam · 18 adet/.test(sh),
  (sh.match(/5 · Ziyaret sonunda stantta kalan[\s\S]{0,120}/)||[""])[0].slice(0,110));
/* tahsil edilecek: 400 (yeni satış) + 60 (değişim farkı) = 460 */
ok("değişim farkı KALEM olarak var",/Değişim fiyat farkı/.test(sh));
ok("tahsil edilecek 460 ₺",/Tahsil edilecek 460 ₺/.test(sh),(sh.match(/Tahsil edilecek [\d.]+ ₺/)||[""])[0]);

console.log("═══ 5+6) birleşik reyting ═══");
/* Reyting, ürün listelerinin 🔥 "en çok satanlar" sırasını belirler.
   Dinazor : konsinyeden 60 satıldı            → 60
   Penguen : SAYILMIŞ mekanda 12 adet eridi    → 12  (teslim 30 DEĞİL — çift saymaz)
   Kaplumbağa: sayılmış mekanda verildi, eriyeni ölçülmedi → 0
   Sıra bu yüzden Dinazor > Penguen > Kaplumbağa olmalı. */
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
const sirali=await p.evaluate(()=>{
  const d=window.__D||null; return null; });
/* konsinye "Bırak" sekmesindeki çanta listesi 🔥 sırasıyla çizilir */
ok("konsinye ekranı açıldı",(await bas("adet konsinye"))!=="YOK");
await p.waitForTimeout(900);
await bas("🏬 Bırak"); await p.waitForTimeout(500);
/* az kullanılanlar akordiyonu varsa aç — üçü de listede olsun */
if(/Az kullanılanlar/.test(await sheet())){ await bas("Az kullanılanlar"); await p.waitForTimeout(500); }
const satirlar=await p.evaluate(()=>Array.from(document.querySelectorAll("input[data-adet]"))
  .map(i=>{ const d=i.closest("div"); return d?(d.innerText||"").replace(/\s+/g," ").trim().split(" ")[0]:""; })
  .filter(Boolean));
ok("üç ürün de listede",["Dinazor","Penguen","Kaplumbağa"].every(u=>satirlar.indexOf(u)>=0),
  satirlar.join(" < "));
const iD=satirlar.indexOf("Dinazor"), iP=satirlar.indexOf("Penguen"), iK=satirlar.indexOf("Kaplumbağa");
ok("Dinazor (60) en başta",iD>=0&&iD<iP&&iD<iK,"Dinazor="+iD+" Penguen="+iP+" Kaplumbağa="+iK);
ok("Penguen (12 eriyen) Kaplumbağa'dan (0) önce",iP<iK,"Penguen="+iP+" Kaplumbağa="+iK);

ok("sayfa hatası yok",!log.length,log.join(" | ").slice(0,220));
await b.close();
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ ZİYARET RAPORU + REYTİNG DOĞRULANDI");
process.exit(hata?1:0);
