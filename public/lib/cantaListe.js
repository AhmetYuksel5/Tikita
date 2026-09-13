/* 📋 TİKİTA ÇANTA LİSTESİ — yapıştırılan "ürün adı + adet" metnini çantaya çevirir.
   Saf hesap; React ya da Firestore bilmez. Ayrıştırma + ürün eşleştirme burada,
   yazma işi çağıran uygulamada. */

const num=x=>{ const n=parseFloat(String(x==null?"":x).replace(",",".")); return isNaN(n)?0:n; };
const nrm=s=>String(s==null?"":s).toLocaleLowerCase("tr").replace(/\s+/g," ").trim();

/* başlık / toplam satırları — ad kısmı bunlardan biriyse satır atlanır */
const ATLA=["ürün","urun","ürünler","adet","toplam adet","toplam","genel toplam","genel toplam adet",
  "miktar","çeşit","cesit","ad","isim","sıra","sira","no","tutar","ürün adı","urun adi"];

/* "1.234" binlik ayracı sayılır (noktadan sonra tam 3 hane); "12,5" ondalık.
   Adetler tam sayı olduğu için sonuç yuvarlanır. */
function sayiCoz(t){
  let s=String(t==null?"":t).trim();
  if(!s) return NaN;
  s=s.replace(/\.(?=\d{3}(\D|$))/g,"");   // binlik nokta
  s=s.replace(",",".");
  const n=parseFloat(s);
  return isNaN(n)?NaN:Math.round(n);
}

/* ————— 📋 AYIKLA —————
   Her satırın SONUNDAKİ sayı adet, kalanı ürün adıdır. Sekme, çoklu boşluk,
   iki nokta, tire ve "×/x adet" gibi ayraçlar temizlenir. Sayı bulunmayan ya da
   başlık/toplam olan satırlar sessizce atlanır — kullanıcı tabloyu olduğu gibi
   yapıştırabilsin. Aynı ad birden çok satırda geçerse adetler TOPLANIR. */
function listeAyikla(metin){
  const cikti=[], atlanan=[];
  const gorulen={};
  String(metin==null?"":metin).split(/[\r\n]+/).forEach(satir=>{
    const ham=String(satir||"").trim();
    if(!ham) return;
    /* sondaki sayıyı ve önündeki ayracı yakala — ayraç "x"/"×"/"*" de olabilir
       ("Sudoku x 5"), sayıdan sonra "adet/ad/pcs" son eki yutulur */
    const m=ham.match(/^(.*?)(?:[\s:\-–—\t]+[x×*][\s]*|[\s:\-–—\t]*)(\d[\d.,]*)\s*(?:ad|adet|adt|pcs)?\.?$/i);
    if(!m){ atlanan.push(ham); return; }
    let ad=String(m[1]||"").replace(/[\s:\-–—]+$/,"").replace(/^[\s:\-–—•*·]+/,"").trim();
    const adet=sayiCoz(m[2]);
    if(!ad||!isFinite(adet)){ atlanan.push(ham); return; }
    if(ATLA.includes(nrm(ad))){ atlanan.push(ham); return; }
    const k=nrm(ad);
    if(gorulen[k]!=null){ cikti[gorulen[k]].adet+=adet; return; }
    gorulen[k]=cikti.length;
    cikti.push({ad,adet});
  });
  return {kalemler:cikti,atlanan};
}

/* düzenleme uzaklığı — eşik aşılırsa erken çıkar (uzun adlarda boşa hesap yapmasın) */
function uzaklik(a,b,esik){
  if(a===b) return 0;
  if(Math.abs(a.length-b.length)>esik) return esik+1;
  let onc=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const sim=[i]; let enAz=i;
    for(let j=1;j<=b.length;j++){
      const d=Math.min(sim[j-1]+1,onc[j]+1,onc[j-1]+(a[i-1]===b[j-1]?0:1));
      sim[j]=d; if(d<enAz) enAz=d; }
    if(enAz>esik) return esik+1;
    onc=sim; }
  return onc[b.length];
}
const kelimeler=s=>String(s||"").split(/[^0-9a-zçğıöşü]+/i).filter(Boolean);
/* bir ad kümesi diğerini kapsıyor mu — kelime sırası önemsiz
   ("TNT Minecraft" = "Minecraft TNT", "Minecraft halkalı kalp" ⊇ "Minecraft kalp") */
const kapsar=(A,B)=>B.length>0&&B.every(w=>A.indexOf(w)>=0);

/* ————— 🔗 EŞLEŞTİR —————
   Katman katman denenir, ilk dolu katman aday listesidir:
     1 birebir ad
     2 önek (biri diğeriyle başlıyor)          Halkalı kalp → Halkalı Kalp anahtarlık
     3 yazım hatası (düzenleme uzaklığı ≤1/2)  İskelet oynar bas → İskelet Oynar Baş
                                               Dinozor → Dinazor
     4 kelime kapsaması (sıra önemsiz)         TNT Minecraft → Minecraft TNT
     5 alt dize içerme                         Sudoku → SUDOKU KEY
   Yazım hatası katmanı içermeden ÖNCE gelir: yoksa "Dinozor" yazımı bozuk olan
   "Dinazor" yerine alt dize olarak eşleşen "Mini Dinozor"a giderdi.
   Tek aday varsa eşleşmiş sayılır; birden çok ya da hiç aday varsa kullanıcı seçer.
   Arşivli ürünler aday değildir. Ad yazımı (büyük/küçük, İ/ı) hesaba katılmaz. */
function urunEsle(kalemler,urunler){
  const havuz=(urunler||[]).filter(u=>u&&u.ad&&!u.arsiv)
    .map(u=>({u,a:nrm(u.ad),k:kelimeler(nrm(u.ad))}));
  return (kalemler||[]).map(it=>{
    const q=nrm(it.ad), qk=kelimeler(q);
    const esik=q.length<=5?1:2;
    const katman=[
      havuz.filter(x=>x.a===q),
      havuz.filter(x=>x.a.indexOf(q)===0||q.indexOf(x.a)===0),
      havuz.filter(x=>uzaklik(x.a,q,esik)<=esik),
      havuz.filter(x=>kapsar(qk,x.k)||kapsar(x.k,qk)),
      havuz.filter(x=>x.a.indexOf(q)>=0||q.indexOf(x.a)>=0),
    ];
    const vuran=katman.find(L=>L.length>0)||[];
    const adaylar=vuran.map(x=>x.u);
    return {...it,urun:adaylar.length===1?adaylar[0]:null,adaylar,
      kesin:adaylar.length===1&&nrm(adaylar[0].ad)===q};
  });
}

/* ————— 🎒 PLAN —————
   mod "ekle"   → çantaya EKLENIR   (delta = adet)
   mod "esitle" → çanta bu sayıya EŞİTLENİR (delta = adet − mevcut)
   Her kalem için delta, sonuç çanta ve sonuç stok hesaplanır. Delta 0 olan kalem
   planda kalır ama yazılmaz — kullanıcı "değişmiyor" bilgisini de görsün. */
function cantaPlan(esli,kulId,mod){
  const esitle=mod==="esitle";
  return (esli||[]).filter(x=>x&&x.urun).map(x=>{
    const u=x.urun;
    const once=num((u.pazStokK||{})[kulId]);
    const hedef=esitle?Math.max(0,num(x.adet)):once+num(x.adet);
    const delta=Math.round(hedef-once);
    const stokOnce=num(u.stokta);
    return {id:u.id,ad:u.ad,istek:x.ad,adet:num(x.adet),
      cantaOnce:once,cantaSonra:once+delta,delta,
      stokOnce,stokSonra:stokOnce-delta};
  });
}

const planOzet=plan=>{
  const y=(plan||[]).filter(p=>p.delta!==0);
  return {yazilacak:y.length,degismeyen:(plan||[]).length-y.length,
    cantaDelta:y.reduce((s,p)=>s+p.delta,0),
    cantaSonToplam:(plan||[]).reduce((s,p)=>s+p.cantaSonra,0),
    eksiyeDusen:y.filter(p=>p.stokSonra<0).length};
};

export {listeAyikla,urunEsle,cantaPlan,planOzet,sayiCoz,num as clNum,nrm as clNrm};
