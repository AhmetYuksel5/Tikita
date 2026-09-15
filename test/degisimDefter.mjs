/* ♻️ DEĞİŞİM · MUHASEBE DEFTERİ — hareket-model'in saf hesap katmanı.
   Doğrulanan:
     1 Değişim iadesi NEGATİF tutarlı SATIŞ satırı üretir (ters kayıt)
     2 Borç/alacak sütunları yön çevirir · eksili rakam yazılmaz · tek bacak
     3 Fiş bacakları ters döner: 600 borç · 120 alacak
     4 Kale bakiyesi tam FİYAT FARKI kadar oynar
     5 Kale ekstresinde artış değil AZALIŞ sütununa düşer, bakiye doğru yürür
     6 Cari özetinde artış/azalış mutlak değerle birikir
     7 Genel özette satış cirosu netlenir
     8 Değişim YOKSA her rakam KDV öncesiyle birebir aynı (geriye dönük uyum) */
import {olayUret,borcAlacak,fisBacaklari,fisOzet,satirAciklama,
        kaleEkstre,kaleBakiyeleri,cariler,genelOzet,HM_SURUM} from "../public/lib/hareket-model.js";
let hata=0; const ok=(k,c,d)=>{ console.log((c?"✓ ":"✗ ")+k+(d!=null?("   → "+d):"")); if(!c) hata++; };
const T="2026-09-11T10:00:00.000Z", T2="2026-09-14T10:00:00.000Z";
const KUL=[{id:"e1",ad:"Ahmet"}];

/* ——— senaryo: 6 Penguen × 40 satıldı, 4'ü 4 Kaplumbağa × 55 ile değiştirildi ——— */
const SATIS={id:"s1",tip:"satis",kullaniciId:"e1",kullaniciAd:"Ahmet",musteriId:"m1",yer:"H Kafe",
  urunId:"u1",urunAd:"Penguen",adet:6,satisFiyat:40,alisFiyat:25,maliyetBirim:12,tahsil:0,tarih:T};
const IADE={id:"d1",tip:"iade",kaynak:"degisim",degisimId:"g1",kullaniciId:"e1",kullaniciAd:"Ahmet",
  musteriId:"m1",yer:"H Kafe",urunId:"u1",urunAd:"Penguen",adet:4,satisFiyat:40,alisFiyat:25,
  maliyetBirim:12,tarih:T2};
const YENI={id:"d2",tip:"satis",kaynak:"degisim",degisimId:"g1",kullaniciId:"e1",kullaniciAd:"Ahmet",
  musteriId:"m1",yer:"H Kafe",urunId:"u2",urunAd:"Kaplumbağa",adet:4,satisFiyat:55,alisFiyat:30,
  maliyetBirim:15,tahsil:0,tarih:T2};

const uret=H=>olayUret({hareketler:H,kullanicilar:KUL,giderler:[],sabitGiderler:[],
  montajGorev:[],hakedisDonem:[],kasaHareket:[],sarf:[],stokHareket:[]},{simdi:Date.parse(T2)});

console.log("model sürümü: "+HM_SURUM);
const R=uret([SATIS,IADE,YENI]);
const rows=R.rows;
const bul=ref=>rows.find(s=>s.ref===ref);

console.log("═══ 1) ters kayıt satırı ═══");
const ia=bul("har:d1");
ok("iade satırı üretildi",!!ia,ia?ia.tur+"/"+ia.altTur:"YOK");
ok("tür SATIS · altTür degisimIade",ia&&ia.tur==="SATIS"&&ia.altTur==="degisimIade");
ok("tutar NEGATİF (−160)",ia&&ia.tutar===-160,ia&&String(ia.tutar));
ok("taraf kale",ia&&ia.tarafAd==="H Kafe",ia&&ia.tarafAd);
ok("açıklama okunur",/Değişim iadesi · Penguen × 4/.test(satirAciklama(ia)),satirAciklama(ia));

console.log("═══ 2) borç/alacak sütunu ═══");
const ba=borcAlacak(ia);
ok("borç 0",ba.borc===0,String(ba.borc));
ok("alacak 160 (eksili değil)",ba.alacak===160,String(ba.alacak));
ok("tek bacak",(ba.borc>0)!==(ba.alacak>0));
const ba2=borcAlacak(bul("har:s1"));
ok("normal satış hâlâ borç 240",ba2.borc===240&&ba2.alacak===0,JSON.stringify(ba2));

console.log("═══ 3) fiş bacakları ═══");
const bc=fisBacaklari(ia);
ok("iki bacak",bc.length===2,JSON.stringify(bc));
ok("600 borç 160",bc.some(x=>x.h==="600"&&x.borc===160));
ok("120 alacak 160",bc.some(x=>x.h==="120"&&x.alacak===160));
ok("özet 600 → 120",fisOzet(ia)==="600 → 120",fisOzet(ia));
ok("bacaklar dengeli",bc.reduce((s,x)=>s+x.borc-x.alacak,0)===0);
ok("normal satış 120 → 600",fisOzet(bul("har:s1"))==="120 → 600",fisOzet(bul("har:s1")));

console.log("═══ 4) kale bakiyesi = FİYAT FARKI ═══");
/* kaleBakiyeleri dizi döner: [{kale,bakiye}] */
const bk=(L,ad)=>{ const o=(L||[]).find(x=>x.kale===ad); return o?o.bakiye:0; };
const B=bk(kaleBakiyeleri(rows),"H Kafe");
/* 240 (ilk satış) − 160 (iade) + 220 (yeni satış) = 300 */
ok("H Kafe bakiyesi 300 ₺",Math.abs(B-300)<0.01,String(B));
const B0=bk(kaleBakiyeleri(uret([SATIS]).rows),"H Kafe");
ok("değişimsiz bakiye 240 ₺",Math.abs(B0-240)<0.01,String(B0));
ok("net etki 60 ₺ (fiyat farkı)",Math.abs((B-B0)-60)<0.01,String(B-B0));

console.log("═══ 5) kale ekstresi ═══");
const E=kaleEkstre(rows,"H Kafe");
const eia=E.rows.find(s=>s.ref==="har:d1");
ok("iade AZALIŞ sütununda",eia&&eia.azalis===160&&eia.artis===0,
  eia?JSON.stringify({a:eia.artis,z:eia.azalis}):"YOK");
ok("ekstre bakiyesi 300",Math.abs(E.bakiye-300)<0.01,String(E.bakiye));
ok("hiçbir sütun eksili değil",E.rows.every(s=>s.artis>=0&&s.azalis>=0),
  JSON.stringify(E.rows.map(s=>[s.artis,s.azalis])));
ok("bakiye monoton yürüyor",(()=>{ let r=0;
  for(const s of E.rows){ if(!s.cariDisi&&!s.avansMi) r=Math.round((r+s.artis-s.azalis)*100)/100;
    if(Math.abs(r-s.bakiye)>0.01) return false; } return true; })());

console.log("═══ 6) cari özeti ═══");
const C=cariler(rows).find(o=>o.ad==="H Kafe");
ok("cari bulundu",!!C,C&&JSON.stringify({a:C.artis,z:C.azalis,b:C.bakiye}));
ok("artış 460 (240+220)",C&&Math.abs(C.artis-460)<0.01,C&&String(C.artis));
ok("azalış 160 (mutlak)",C&&Math.abs(C.azalis-160)<0.01,C&&String(C.azalis));
ok("bakiye 300",C&&Math.abs(C.bakiye-300)<0.01,C&&String(C.bakiye));

console.log("═══ 7) genel özet ═══");
const G=genelOzet(rows);
ok("satış cirosu netlendi (300)",Math.abs(num(G.satis)-300)<0.01,String(G.satis));

console.log("═══ 8) geriye dönük uyum ═══");
const R0=uret([SATIS]);
ok("değişimsiz satır sayısı değişmedi",R0.rows.length===1,String(R0.rows.length));
ok("değişimsiz uyarı yok",!R0.uyari.filter(u=>/degisim|değişim/i.test(u)).length,R0.uyari.join(" | "));
const E0=kaleEkstre(R0.rows,"H Kafe");
ok("değişimsiz ekstre birebir",E0.rows[0].artis===240&&E0.rows[0].azalis===0&&E0.bakiye===240,
  JSON.stringify({a:E0.rows[0].artis,z:E0.rows[0].azalis,b:E0.bakiye}));
ok("değişimsiz fiş 120 → 600",fisOzet(E0.rows[0])==="120 → 600");

function num(x){ const n=parseFloat(x); return isNaN(n)?0:n; }
console.log(hata?("\n✗ "+hata+" HATA"):"\n✓ DEĞİŞİM DEFTERİ DOĞRULANDI");
process.exit(hata?1:0);
