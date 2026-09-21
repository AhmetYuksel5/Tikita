/* 📔 TİKİTA KATALOG — ürün seçkisinden PNG/PDF sayfa üretir.
   Komuta (admin.html) ve pazarlamacı (deneme.html) uygulamalarının ortak motoru.
   Saf hesap + tek bir canvas çizimi; React ya da Firestore bilmez. */
const num=x=>{ const n=parseFloat(String(x==null?"":x).replace(",",".")); return isNaN(n)?0:n; };

/* ————— 🖼 ÜRÜN GÖRSELLERİ —————
   Bir ürünün birden çok fotoğrafı olabilir. Kaynaklar: yüklenenler (urun_foto),
   ürün kaydına gömülü eski base64 alan, uygulamayla gelen hazır görsel.
   Hangisinin nerede görüneceği ürün kaydında yazar:
     anaFoto     → ürün kartı, stok listesi, her yer
     katalogFoto → yalnız katalog (boşsa anaFoto kullanılır)
   Gömülü ve hazır görsellerin silinecek bir kaydı yoktur; seçilebilirler. */
function urunFotolari(u,urunFoto,yerelCoz){
  const L=[];
  (urunFoto||[]).filter(f=>f&&u&&f.urunId===u.id&&f.data)
    .sort((a,b)=>String(a.tarih||"").localeCompare(String(b.tarih||"")))
    .forEach(f=>L.push({id:f.id,data:f.data,kaynak:"yuklenen",silinir:true}));
  const g=String((u&&u.foto)||"");
  if(g.slice(0,11)==="data:image/") L.push({id:"gomulu",data:g,kaynak:"gomulu",silinir:true});
  const y=(u&&u.yerelGizle)?"":(yerelCoz?yerelCoz(u):"");
  if(y) L.push({id:"yerel",data:y,kaynak:"yerel",silinir:true});
  return L;
}
const fotoBul=(L,id)=>{ const A=L||[];
  return (id&&A.find(f=>f&&f.id===id))||A[0]||null; };
function urunFotoBilgi(u,urunFoto,yerelCoz){
  const liste=urunFotolari(u,urunFoto,yerelCoz);
  const ana=fotoBul(liste,u&&u.anaFoto);
  return {liste,ana,katalog:fotoBul(liste,(u&&u.katalogFoto)||(u&&u.anaFoto))};
}
const fotoKaynakAd=k=>k==="gomulu"?"ürün kaydından":(k==="yerel"?"hazır görsel":"");

/* ————— 📔 KATALOG —————
   Seçilen ürünlerden fotoğraflı bir seçki üretir. Yerleşim burada hesaplanır
   (saf), çizim katalogCanvas'ta, dosyaya dökme pdfKur/pngIndir'de. */
const KAT_SAYFA={g:1240,y:1754};          // A4 · 150 dpi
const KAT_PAD=54, KAT_ARA=20, KAT_BAS=146, KAT_ALT=30;
const KAT_LOGO=94;                        // başlıktaki logo yüksekliği

/* bir kartın yazıları — ürün kaydından okunur */
/* katalogda yazılacak fiyat — ürüne özel katalog fiyatı varsa o kazanır */
function katalogFiyat(u,secenek){
  const o=secenek||{};
  if(o.fiyat==="yok") return 0;
  const ozel=num(u&&u.katalogFiyat);
  if(ozel>0) return ozel;
  return o.fiyat==="paz"?num(u&&u.pazFiyat):num(u&&u.satisFiyat);
}
function katalogKart(u,secenek){
  const o=secenek||{};
  const fy=katalogFiyat(u,o);
  const alt=[];
  const kod=String((u&&u.kod)||"").trim();
  if(kod) alt.push("Stok kodu: "+kod);
  return {ad:String((u&&u.ad)||"").trim()||"—",alt,
    fiyat:fy>0?(fy.toLocaleString("tr-TR")+" TL"):"",
    ozelFiyat:num(u&&u.katalogFiyat)>0};
}
/* ürünleri sayfalara ve kutulara böler — hiçbir şey çizmez */
function katalogDuzen(secili,secenek){
  const o=secenek||{};
  const sutun=Math.max(1,Math.min(4,Math.round(num(o.sutun))||3));
  const W=KAT_SAYFA.g,H=KAT_SAYFA.y;
  const kg=Math.floor((W-KAT_PAD*2-KAT_ARA*(sutun-1))/sutun);
  const metinH=o.fiyat==="yok"?66:96;
  const alan=H-KAT_PAD-KAT_BAS-KAT_ALT-KAT_PAD;
  /* 📐 Ürün fotoğraflarının çoğu DİKEY. Görsel kutusu en az kare olsun diye
     satır sayısı kare karta göre bulunur; artan boşluk görsele dağıtılınca
     kutu kareden dikeye doğru uzar. Aşırı uzamasın diye üst sınır var. */
  const enAzKart=Math.round(kg*0.95)+metinH;
  const satir=Math.max(1,Math.floor((alan+KAT_ARA)/(enAzKart+KAT_ARA)));
  const tamKart=Math.floor((alan-(satir-1)*KAT_ARA)/satir);
  const gorselH=Math.min(tamKart-metinH,Math.round(kg*1.45));
  const kartH=gorselH+metinH;
  const sayfaBoyut=sutun*satir;
  const L=(secili||[]).filter(Boolean);
  const sayfalar=[];
  for(let i=0;i<L.length;i+=sayfaBoyut){
    const dilim=L.slice(i,i+sayfaBoyut);
    /* Sayfa yarım kalmışsa altta kocaman beyaz bant durmasın: kirp seçiliyken
       sayfa boyu içeriğe iner. PDF'te kağıt boyu sabit kalır (basılacak). */
    const satirBu=Math.ceil(dilim.length/sutun);
    const boy=o.kirp
      ?(KAT_PAD+KAT_BAS+satirBu*(kartH+KAT_ARA)-KAT_ARA+KAT_ALT+KAT_PAD)
      :H;
    sayfalar.push({no:sayfalar.length+1,H:boy,kutular:dilim.map((u,j)=>({
      urun:u,no:i+j+1,
      x:KAT_PAD+(j%sutun)*(kg+KAT_ARA),
      y:KAT_PAD+KAT_BAS+Math.floor(j/sutun)*(kartH+KAT_ARA),
      g:kg,kartH,gorselH}))});
  }
  return {W,H,sutun,satir,sayfaBoyut,kartG:kg,gorselH,kartH,
    toplam:L.length,sayfa:sayfalar.length,sayfalar};
}
/* ————— PDF ————— sayfa başına bir JPEG. Kütüphane yok; PDF elle kurulur. */
function pdfKur(jpegler,W,H){
  const par=[]; let boy=0;
  const yazi=s=>{ const b=new Uint8Array(s.length);
    for(let i=0;i<s.length;i++) b[i]=s.charCodeAt(i)&0xff;
    par.push(b); boy+=b.length; };
  const ham=b=>{ par.push(b); boy+=b.length; };
  const N=(jpegler||[]).length;
  const nesne=[];                            // 1 tabanlı bayt konumları
  const bas=()=>{ nesne.push(boy); };
  yazi("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  bas(); yazi("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  const sayfaNo=i=>3+i*3;                    // sayfa, içerik, görsel üçlüsü
  bas(); yazi("2 0 obj\n<< /Type /Pages /Count "+N+" /Kids [ "
    +Array.from({length:N},(_,i)=>sayfaNo(i)+" 0 R").join(" ")+" ] >>\nendobj\n");
  for(let i=0;i<N;i++){
    const s=sayfaNo(i),ic=s+1,gr=s+2;
    bas(); yazi(s+" 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+W+" "+H+"] "
      +"/Resources << /XObject << /Im0 "+gr+" 0 R >> >> /Contents "+ic+" 0 R >>\nendobj\n");
    const akis="q "+W+" 0 0 "+H+" 0 0 cm /Im0 Do Q\n";
    bas(); yazi(ic+" 0 obj\n<< /Length "+akis.length+" >>\nstream\n"+akis+"endstream\nendobj\n");
    const j=jpegler[i];
    bas(); yazi(gr+" 0 obj\n<< /Type /XObject /Subtype /Image /Width "+W+" /Height "+H
      +" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+j.length+" >>\nstream\n");
    ham(j); yazi("\nendstream\nendobj\n");
  }
  const xref=boy;
  const say=nesne.length+1;
  let x="xref\n0 "+say+"\n0000000000 65535 f \n";
  nesne.forEach(k=>{ x+=String(k).padStart(10,"0")+" 00000 n \n"; });
  yazi(x);
  yazi("trailer\n<< /Size "+say+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF\n");
  const out=new Uint8Array(boy); let p=0;
  par.forEach(b=>{ out.set(b,p); p+=b.length; });
  return out;
}
/* dataURL → ham bayt (base64 çözümü) */
function veriBayt(dataUrl){
  const s=String(dataUrl||""); const i=s.indexOf(",");
  const b64=i>=0?s.slice(i+1):s;
  const bin=typeof atob==="function"?atob(b64):Buffer.from(b64,"base64").toString("binary");
  const out=new Uint8Array(bin.length);
  for(let k=0;k<bin.length;k++) out[k]=bin.charCodeAt(k)&0xff;
  return out;
}
/* 📔 katalogun tek sayfasını çizer. gorsel: urunId → yüklenmiş Image (yoksa boş kutu) */
function katalogCanvas(duzen,sayfa,gorsel,secenek,belge){
  const D=belge||document, o=secenek||{};
  const YAZI='system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
  const fnt=(w,s)=>w+" "+s+"px "+YAZI;
  const H=num(sayfa&&sayfa.H)||duzen.H;
  const cv=D.createElement("canvas");
  cv.width=duzen.W; cv.height=H;
  const c=cv.getContext("2d");
  c.fillStyle="#ffffff"; c.fillRect(0,0,duzen.W,H);
  c.textBaseline="middle"; c.textAlign="left";
  /* 🏷 başlık — logo varsa solda, başlık onun yanında */
  const bandY=KAT_PAD+KAT_LOGO/2;
  let bx=KAT_PAD;
  const lg=o.logo;
  if(lg&&lg.width>0){
    const lw=Math.min(360,Math.round(lg.width*KAT_LOGO/lg.height));
    c.drawImage(lg,bx,bandY-KAT_LOGO/2,lw,KAT_LOGO);
    bx+=lw+24;
  }
  c.fillStyle="#111827"; c.font=fnt("800",42);
  c.fillText(String(o.baslik||"Ürün kataloğu").toLocaleUpperCase("tr"),bx,bandY);
  const cizgiY=KAT_PAD+KAT_LOGO+20;
  c.strokeStyle="#111827"; c.lineWidth=3;
  c.beginPath(); c.moveTo(KAT_PAD,cizgiY); c.lineTo(duzen.W-KAT_PAD,cizgiY); c.stroke();
  /* kartlar */
  const kisalt=(t,g,w,s)=>{ c.font=fnt(w,s); let x=String(t==null?"":t);
    if(c.measureText(x).width<=g) return x;
    while(x.length>1&&c.measureText(x+"…").width>g) x=x.slice(0,-1);
    return x+"…"; };
  (sayfa.kutular||[]).forEach(k=>{
    c.fillStyle="#ffffff"; c.strokeStyle="#e5e7eb"; c.lineWidth=1.5;
    if(c.roundRect){ c.beginPath(); c.roundRect(k.x,k.y,k.g,k.kartH,14); c.fill(); c.stroke(); }
    else { c.fillRect(k.x,k.y,k.g,k.kartH); c.strokeRect(k.x,k.y,k.g,k.kartH); }
    /* görsel — kutuyu tümüyle kaplar, taşan kısım kırpılır */
    const gx=k.x+10,gy=k.y+10,gg=k.g-20,gh=k.gorselH-20;
    c.save();
    if(c.roundRect){ c.beginPath(); c.roundRect(gx,gy,gg,gh,10); c.clip(); }
    else { c.beginPath(); c.rect(gx,gy,gg,gh); c.clip(); }
    c.fillStyle="#f3f4f6"; c.fillRect(gx,gy,gg,gh);
    const im=gorsel&&gorsel[k.urun&&k.urun.id];
    if(im&&im.width>0){
      const oran=Math.max(gg/im.width,gh/im.height);
      const w=im.width*oran,hh=im.height*oran;
      c.drawImage(im,gx+(gg-w)/2,gy+(gh-hh)/2,w,hh);
    } else {
      c.fillStyle="#c3c8d0"; c.font=fnt("700",15); c.textAlign="center";
      c.fillText("fotoğraf yok",gx+gg/2,gy+gh/2); c.textAlign="left";
    }
    c.restore();
    /* numara rozeti */
    c.fillStyle="rgba(17,24,39,.86)";
    if(c.roundRect){ c.beginPath(); c.roundRect(gx+8,gy+8,38,26,8); c.fill(); }
    else c.fillRect(gx+8,gy+8,38,26);
    c.fillStyle="#ffffff"; c.font=fnt("800",15); c.textAlign="center";
    c.fillText(String(k.no),gx+27,gy+21); c.textAlign="left";
    /* yazılar */
    const kart=katalogKart(k.urun,o);
    let ty=k.y+k.gorselH+6;
    c.fillStyle="#111827";
    c.fillText(kisalt(kart.ad,k.g-24,"800",21),k.x+12,ty+14); ty+=30;
    c.fillStyle="#6b7280";
    kart.alt.slice(0,2).forEach(s=>{
      c.fillText(kisalt(s,k.g-24,"600",14),k.x+12,ty+9); ty+=21; });
    if(kart.fiyat){ c.fillStyle="#111827";
      c.fillText(kisalt(kart.fiyat,k.g-24,"800",22),k.x+12,ty+16); }
  });
  /* altta yalnız sayfa numarası — tek sayfalık katalogda o da yok */
  if(duzen.sayfa>1){ c.fillStyle="#9ca3af"; c.font=fnt("700",14); c.textAlign="right";
    c.fillText(sayfa.no+" / "+duzen.sayfa,duzen.W-KAT_PAD,H-KAT_PAD-4); }
  return cv;
}

/* canvas'ı PNG dosyası olarak indirir */
function pngIndir(cv,ad,belge){
  const D=belge||document;
  return new Promise(function(coz,red){
    try{
      const bit=u=>{ const a=D.createElement("a"); a.href=u; a.download=ad||"tablo.png";
        D.body.appendChild(a); a.click();
        setTimeout(()=>{ try{ D.body.removeChild(a); if(u.indexOf("blob:")===0) URL.revokeObjectURL(u); }catch(_){} },3000);
        coz(true); };
      if(cv.toBlob) cv.toBlob(b=>{ if(b) bit(URL.createObjectURL(b)); else bit(cv.toDataURL("image/png")); },"image/png");
      else bit(cv.toDataURL("image/png"));
    }catch(e){ red(e); }
  });
}

/* 📔 KATALOG SAYFASI — iki uygulamanın ortak arayüzü.
   React ve o uygulamanın Sheet/inp parçaları dışarıdan verilir; böylece
   komuta ve pazarlamacı aynı ekranı kullanır, kopyası çıkmaz.
   İşleyici verilmeyen yetenek ekranda hiç görünmez. */
export function kurKatalogSheet({h,useState,useMemo,Sheet,inp}){
 return function KatalogSheet({urunler,fotoBilgi,onFotoSec,onFotoSil,onFiyat,logo,onLogo,onClose,say,
     kapak,onKapak,bolumTanim,onBolumTanim}){
  const fotoMap={}; Object.keys(fotoBilgi||{}).forEach(id=>{
    const k=fotoBilgi[id]&&fotoBilgi[id].katalog; if(k) fotoMap[id]=k; });
  const [q,setQ]=useState("");
  const [sec,setSec]=useState(()=>{ const m={};
    (urunler||[]).forEach(u=>{ if(u&&u.id&&(fotoMap||{})[u.id]) m[u.id]=true; }); return m; });
  const [baslik,setBaslik]=useState(()=>String((kapak&&kapak.baslik)||"Anahtarlık"));
  const [sutun,setSutun]=useState(3);
  const [fiyat,setFiyat]=useState("satis");
  /* 📔 tasarım: premium (kapaklı, bölümlü) · sade (eski düz liste) */
  const [tasarim,setTasarim]=useState("premium");
  const [kpk,setKpk]=useState(()=>({ust:"KOLEKSİYON "+new Date().getFullYear(),
    baslik2:"Serisi",aciklama:"",kapanis:"Her tasarım tek tek üretildi.",iletisim:"",
    ...(kapak||{})}));
  const [kpkAcik,setKpkAcik]=useState(false);
  const [bolAcik,setBolAcik]=useState(false);
  const [bolTasla,setBolTasla]=useState(null);   // düzenlenirken tutulan kopya
  const [bek,setBek]=useState("");
  const [onizle,setOnizle]=useState("");
  const [fotoAc,setFotoAc]=useState("");     // katalog görseli seçilen ürün
  const L=useMemo(()=>{ const a=q.trim().toLocaleLowerCase("tr");
    return (urunler||[]).filter(u=>u&&u.id&&!u.arsiv&&(!a||String(u.ad||"").toLocaleLowerCase("tr").indexOf(a)>=0));
  },[urunler,q]);
  const secili=useMemo(()=>(urunler||[]).filter(u=>u&&sec[u.id]),[urunler,sec]);
  const PRM=tasarim==="premium";
  /* bölüm tanımı: [{seri,baslik,aciklama}] — sıra ayardan gelir, yoksa ürün
     sayısına göre kendiliğinden kurulur (kullanıcı sonra düzenler). */
  const bolumler=useMemo(()=>{
    const el=(bolumTanim||[]).filter(b=>b&&String(b.seri||"").trim());
    if(el.length) return el;
    const say={}; (urunler||[]).filter(u=>u&&!u.arsiv).forEach(u=>
      katSeriler(u).forEach(x=>{ say[x]=(say[x]||0)+1; }));
    return Object.keys(say).sort((a,b)=>say[b]-say[a]||a.localeCompare(b,"tr"))
      .map(x=>({seri:x,baslik:x,aciklama:""}));
  },[bolumTanim,urunler]);
  const secenek={baslik,sutun,fiyat,...(PRM?{...kpk,baslik,bolumler,
    aciklamaVar:secili.some(u=>String(u.tanitim||"").trim()),
    istatistik:[{v:String(secili.length),l:"tasarım"},
      {v:String(katBolumle(secili,{bolumler}).length),l:"koleksiyon"},
      {v:"3D",l:"baskı üretim"}]}:{})};
  /* PNG paylaşmak için: sayfa içeriğe kırpılır. PDF basılacak: A4 sabit. */
  const duzen=useMemo(()=>PRM?katPremiumDuzen(secili,secenek)
    :katalogDuzen(secili,{...secenek,kirp:true}),
    [secili,sutun,fiyat,baslik,tasarim,kpk,bolumler]);
  const fotosuz=secili.filter(u=>!(fotoMap||{})[u.id]).length;

  /* seçilen ürünlerin görsellerini çöz — çizimden önce hepsi yüklenmeli */
  const resimCoz=src=>new Promise(coz=>{ if(!src) return coz(null);
    const im=new Image(); im.onload=()=>coz(im); im.onerror=()=>coz(null); im.src=src; });
  const gorselYukle=()=>Promise.all(secili.map(u=>{
    const f=(fotoMap||{})[u.id];
    return resimCoz(f&&f.data).then(im=>[u.id,im]);
  })).then(P=>{ const m={}; P.forEach(([id,im])=>{ if(im) m[id]=im; }); return m; });

  const uret=async(tip)=>{
    if(!secili.length||bek) return;
    setBek(tip);
    try{
      const [g,lg]=await Promise.all([gorselYukle(),resimCoz(logo)]);
      const moz=secili.map(u=>g[u.id]).filter(Boolean).slice(0,9);
      const sec2={...secenek,logo:lg,mozaik:moz};
      const dz=PRM?katPremiumDuzen(secili,sec2)
        :(tip==="pdf"?katalogDuzen(secili,sec2):duzen);
      const ciz=PRM?katPremiumCanvas:katalogCanvas;
      const cvs=dz.sayfalar.map(s=>ciz(dz,s,g,sec2,document));
      const ad=(baslik||"katalog").replace(/[^\wçğıöşüÇĞİÖŞÜ -]/g,"").trim().replace(/\s+/g,"-").toLocaleLowerCase("tr");
      if(tip==="png"){
        for(let i=0;i<cvs.length;i++)
          await pngIndir(cvs[i],ad+(cvs.length>1?("-"+(i+1)):"")+".png",document);
        say("🖼 "+cvs.length+" sayfa PNG indirildi");
      } else {
        const jp=cvs.map(cv=>veriBayt(cv.toDataURL("image/jpeg",0.86)));
        const pdf=pdfKur(jp,dz.W,dz.H);
        const url=URL.createObjectURL(new Blob([pdf],{type:"application/pdf"}));
        const a=document.createElement("a"); a.href=url; a.download=ad+".pdf";
        document.body.appendChild(a); a.click();
        setTimeout(()=>{ try{ document.body.removeChild(a); URL.revokeObjectURL(url); }catch(_){} },3000);
        say("📄 PDF indirildi · "+cvs.length+" sayfa");
      }
    }catch(e){ console.error(e); say("Üretilemedi"); }
    finally{ setBek(""); }
  };
  const bakBir=async()=>{ if(!secili.length||bek) return; setBek("bak");
    try{ const [g,lg]=await Promise.all([gorselYukle(),resimCoz(logo)]);
      const moz=secili.map(u=>g[u.id]).filter(Boolean).slice(0,9);
      const sec2={...secenek,logo:lg,mozaik:moz};
      const dz=PRM?katPremiumDuzen(secili,sec2):duzen;
      const ciz=PRM?katPremiumCanvas:katalogCanvas;
      setOnizle(ciz(dz,dz.sayfalar[0],g,sec2,document).toDataURL("image/jpeg",0.8)); }
    catch(e){ console.error(e); say("Önizlenemedi"); } finally{ setBek(""); } };

  const secTog=id=>setSec(m=>{ const n={...m}; if(n[id]) delete n[id]; else n[id]=true; return n; });
  /* katalogda yazacak fiyat — boş bırakılırsa ürünün kendi fiyatına döner */
  const fiyatSor=u=>{ const v=prompt((u.ad||"")+" — katalogda yazacak fiyat\n"
      +"(boş bırakırsan ürünün kendi fiyatı yazılır)",
      num(u.katalogFiyat)>0?String(num(u.katalogFiyat)):"");
    if(v===null) return;
    onFiyat&&onFiyat(u.id,v.trim()===""?0:num(v)); };
  const hepsiFiyat=()=>{ if(!secili.length) return;
    const v=prompt("Seçili "+secili.length+" ürünün hepsi katalogda hangi fiyatla yazılsın?\n"
      +"(boş bırakırsan hepsi kendi fiyatına döner)","");
    if(v===null) return;
    onFiyat&&onFiyat(secili.map(u=>u.id),v.trim()===""?0:num(v)); };
  const kucukBtn=(etk,secili2,tik)=>h("button",{key:etk,onClick:tik,
    style:{flex:1,padding:"9px 6px",borderRadius:11,fontSize:12.5,fontWeight:800,
      background:secili2?"#1b1e25":"var(--surf2)",color:secili2?"#fff":"var(--mut)",
      border:"1px solid "+(secili2?"#1b1e25":"var(--line)")}},etk);

  if(fotoAc){ const u=(urunler||[]).find(x=>x&&x.id===fotoAc)||{};
    const B=(fotoBilgi||{})[fotoAc]||{liste:[]};
    const secId=B.katalog&&B.katalog.id;
    const L=B.liste||[];
    /* Görsele dokunmak katalog fotoğrafını SEÇER; sağ üstteki 🗑 SİLER.
       Üç kaynağın (yüklenen · gömülü · hazır) hepsi silinebilir — eskiden bu
       ekranda hiç silme düğmesi yoktu, görsel yalnız ürün kartından silinebiliyordu. */
    return h(Sheet,{ik:"📔",hex:"#0e8fce",baslik:"Katalog fotoğrafı",alt:u.ad||"",
        onClose:()=>setFotoAc("")},
      L.length?h("div",{style:{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:10}},
        L.map(f=>h("div",{key:f.id,style:{position:"relative",minWidth:0}},
          h("button",{
            onClick:()=>{ onFotoSec&&onFotoSec(fotoAc,f.id,"katalog"); setFotoAc(""); },
            style:{display:"block",width:"100%",padding:0,borderRadius:14,lineHeight:0,background:"none",
              border:"3px solid "+(f.id===secId?"#0e8fce":"var(--line)")}},
            h("img",{src:f.data,alt:"",style:{width:"100%",height:130,objectFit:"cover",
              borderRadius:11,display:"block",background:"var(--surf2)"}})),
          f.id===secId?h("span",{style:{position:"absolute",left:8,bottom:8,fontSize:9.5,
            fontWeight:800,color:"#fff",background:"rgba(14,143,206,.92)",borderRadius:5,
            padding:"2px 6px"}},"katalog"):null,
          fotoKaynakAd(f.kaynak)?h("span",{style:{position:"absolute",left:8,top:8,fontSize:9,
            fontWeight:800,color:"#fff",background:"rgba(27,30,37,.8)",borderRadius:5,
            padding:"2px 6px"}},fotoKaynakAd(f.kaynak)):null,
          (onFotoSil&&f.silinir!==false)?h("button",{
            onClick:e=>{ e.stopPropagation(); onFotoSil(fotoAc,f.id); },
            style:{position:"absolute",right:6,top:6,width:30,height:30,borderRadius:9,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,
              background:"rgba(224,72,60,.94)",color:"#fff",border:"none",lineHeight:1}},"🗑"):null)))
        :h("div",{style:{padding:"22px 0",textAlign:"center",color:"var(--mut)",fontSize:13,
          fontWeight:700}},"Bu üründe görsel yok."));
  }
  if(onizle) return h(Sheet,{ik:"📔",hex:"#0e8fce",baslik:"Önizleme",
      alt:"1. sayfa · "+duzen.sayfa+" sayfa",onClose:()=>setOnizle("")},
    h("img",{src:onizle,alt:"önizleme",style:{width:"100%",borderRadius:12,border:"1px solid var(--line)"}}));

  return h(Sheet,{ik:"📔",hex:"#0e8fce",baslik:"Katalog",
      alt:secili.length+" ürün · "+duzen.sayfa+" sayfa",onClose},
    h("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:10}},
      h("label",{style:{flexShrink:0,width:78,height:58,borderRadius:12,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",
          background:"var(--surf2)",border:"1px dashed "+(logo?"var(--line)":"var(--cyan)")}},
        logo?h("img",{src:logo,alt:"",style:{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",display:"block"}})
          :h("span",{style:{fontSize:11,fontWeight:800,color:"var(--cyan)"}},"logo"),
        h("input",{type:"file",accept:"image/*",style:{display:"none"},
          onChange:e=>{ const f=e.target.files&&e.target.files[0]; if(f) onLogo&&onLogo(f); e.target.value=""; }})),
      h("input",{value:baslik,onChange:e=>setBaslik(e.target.value),placeholder:"Katalog başlığı",
        style:{...inp,flex:1,minWidth:0,fontSize:15}}),
      logo?h("button",{onClick:()=>onLogo&&onLogo(""),style:{flexShrink:0,padding:"12px 11px",
        borderRadius:12,background:"var(--surf2)",border:"1px solid var(--line)",
        fontSize:12,fontWeight:800,color:"var(--red)"}},"Logo\u00a0sil"):null),
    /* 📔 TASARIM — premium: kapak + bölümler · sade: eski düz liste */
    h("div",{style:{display:"flex",gap:7,marginBottom:8}},
      kucukBtn("✦ Premium",PRM,()=>setTasarim("premium")),
      kucukBtn("Sade liste",!PRM,()=>setTasarim("sade"))),
    /* 📚 BÖLÜMLER — sıra, başlık ve açıklama. Sıra kataloğun bölüm sırasıdır. */
    PRM?(()=>{ const BL=bolTasla||bolumler;
      const yaz=L=>{ setBolTasla(L); };
      const tasi=(i,d)=>{ const L=BL.slice(); const j=i+d;
        if(j<0||j>=L.length) return; const t=L[i]; L[i]=L[j]; L[j]=t; yaz(L); };
      const alanYaz=(i,k,v)=>{ const L=BL.slice(); L[i]={...L[i],[k]:v}; yaz(L); };
      const say={}; katBolumle(secili,{bolumler:BL}).forEach(b=>{ say[b.seri]=b.list.length; });
      return h("div",{style:{marginBottom:8}},
        h("button",{onClick:()=>setBolAcik(v=>!v),
          style:{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"10px 12px",
            borderRadius:11,background:"var(--surf2)",border:"1px solid var(--line)",
            fontSize:12.5,fontWeight:800,color:"var(--mut)",textAlign:"left"}},
          h("span",{style:{flex:1,minWidth:0}},"Bölümler · "+BL.length),
          h("span",null,bolAcik?"▴":"▾")),
        bolAcik?h("div",{style:{marginTop:8}},
          BL.map((b,i)=>h("div",{key:b.seri+i,style:{padding:"10px 11px",borderRadius:12,
            background:"var(--surf)",border:"1px solid var(--line)",marginBottom:7}},
            h("div",{style:{display:"flex",alignItems:"center",gap:7,marginBottom:7}},
              h("span",{style:{fontSize:11.5,fontWeight:900,color:"#e0483c",flexShrink:0}},
                String(i+1).padStart(2,"0")),
              h("span",{style:{flex:1,minWidth:0,fontSize:11.5,fontWeight:700,color:"var(--mut2)",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},
                b.seri+" · "+(say[b.seri]||0)+" ürün"),
              h("button",{onClick:()=>tasi(i,-1),disabled:i===0,
                style:{flexShrink:0,width:28,height:28,borderRadius:8,background:"var(--surf2)",
                  border:"1px solid var(--line)",fontSize:12,color:i===0?"var(--mut2)":"var(--txt)"}},"↑"),
              h("button",{onClick:()=>tasi(i,1),disabled:i===BL.length-1,
                style:{flexShrink:0,width:28,height:28,borderRadius:8,background:"var(--surf2)",
                  border:"1px solid var(--line)",fontSize:12,
                  color:i===BL.length-1?"var(--mut2)":"var(--txt)"}},"↓")),
            h("input",{value:b.baslik||"",placeholder:"bölüm başlığı",
              onChange:e2=>alanYaz(i,"baslik",e2.target.value),
              style:{...inp,fontSize:13.5,padding:"8px 10px",marginBottom:6}}),
            h("input",{value:b.aciklama||"",placeholder:"bir cümlelik açıklama",
              onChange:e2=>alanYaz(i,"aciklama",e2.target.value),
              style:{...inp,fontSize:12.5,padding:"8px 10px",fontWeight:600}}))),
          bolTasla?h("button",{onClick:()=>{ onBolumTanim&&onBolumTanim(bolTasla); setBolTasla(null); },
            style:{width:"100%",padding:11,borderRadius:12,border:"none",background:"var(--cyan)",
              color:"#fff",fontSize:13.5,fontWeight:900}},"Bölümleri kaydet"):null):null); })():null,
    PRM?h("div",{style:{marginBottom:8}},
      h("button",{onClick:()=>setKpkAcik(v=>!v),
        style:{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"10px 12px",
          borderRadius:11,background:"var(--surf2)",border:"1px solid var(--line)",
          fontSize:12.5,fontWeight:800,color:"var(--mut)",textAlign:"left"}},
        h("span",{style:{flex:1,minWidth:0}},"Kapak yazıları"),
        h("span",null,kpkAcik?"▴":"▾")),
      kpkAcik?h("div",{style:{marginTop:8,display:"grid",gridTemplateColumns:"minmax(0,1fr)",gap:8}},
        [["ust","Üst etiket"],["baslik2","İkinci satır"],["aciklama","Kapak yazısı"],
         ["kapanis","Arka kapak sözü"],["iletisim","İletişim satırı"]]
          .map(([k,lbl])=>h("div",{key:k},
            h("div",{style:{fontSize:10.5,fontWeight:800,letterSpacing:.5,color:"var(--mut2)",
              marginBottom:4}},lbl.toLocaleUpperCase("tr")),
            h("input",{value:kpk[k]||"",placeholder:lbl,
              onChange:e2=>{ const v=e2.target.value;
                setKpk(o2=>{ const n={...o2,[k]:v}; onKapak&&onKapak(n); return n; }); },
              style:{...inp,fontSize:13.5,padding:"9px 11px"}})))):null):null,
    PRM?null:h("div",{style:{display:"flex",gap:7,marginBottom:8}},
      [2,3,4].map(n=>kucukBtn(n+" sütun",sutun===n,()=>setSutun(n)))),
    h("div",{style:{display:"flex",gap:7,marginBottom:fiyat==="yok"?12:8}},
      kucukBtn("Satış fiyatı",fiyat==="satis",()=>setFiyat("satis")),
      kucukBtn("Pazarlamacı",fiyat==="paz",()=>setFiyat("paz")),
      kucukBtn("Fiyatsız",fiyat==="yok",()=>setFiyat("yok"))),
    fiyat!=="yok"?h("button",{onClick:hepsiFiyat,disabled:!secili.length,
      style:{width:"100%",padding:"9px 6px",borderRadius:11,marginBottom:12,fontSize:12.5,
        fontWeight:800,background:"var(--surf2)",border:"1px dashed var(--line)",
        color:secili.length?"var(--cyan)":"var(--mut2)"}},
      "Seçilenlerin hepsine tek fiyat yaz"):null,
    h("input",{value:q,onChange:e=>setQ(e.target.value),placeholder:"ara",
      style:{...inp,fontSize:14,marginBottom:8}}),
    h("div",{style:{display:"flex",gap:7,marginBottom:10}},
      kucukBtn("Fotoğraflılar",false,()=>{ const m={};
        (urunler||[]).forEach(u=>{ if((fotoMap||{})[u.id]) m[u.id]=true; }); setSec(m); }),
      kucukBtn("Hepsi",false,()=>{ const m={};
        (urunler||[]).forEach(u=>{ if(u&&u.id) m[u.id]=true; }); setSec(m); }),
      kucukBtn("Temizle",false,()=>setSec({}))),
    h("div",{style:{maxHeight:300,overflowY:"auto",marginBottom:12,
      border:"1px solid var(--line)",borderRadius:12,padding:6}},
      L.map(u=>{ const f=(fotoMap||{})[u.id]; const s=!!sec[u.id];
        return h("button",{key:u.id,onClick:()=>secTog(u.id),
          style:{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"7px 8px",
            borderRadius:10,marginBottom:3,textAlign:"left",
            background:s?"#eff6ff":"transparent",border:"1px solid "+(s?"#bfdbfe":"transparent")}},
          h("div",{style:{width:19,height:19,borderRadius:6,flexShrink:0,display:"flex",
            alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",
            background:s?"#3b82f6":"transparent",border:"2px solid "+(s?"#3b82f6":"var(--mut2)")}},s?"✓":""),
          /* küçük görselin kendisi de görsel ekranını açar — tek fotoğrafı olan
             ürüne oradan ulaşılamıyordu, dolayısıyla o görsel hiç silinemiyordu */
          f?h("span",{onClick:e=>{ e.stopPropagation(); setFotoAc(u.id); },
            style:{flexShrink:0,lineHeight:0,display:"block"}},
            h("img",{src:f.data,alt:"",style:{width:30,height:30,borderRadius:7,objectFit:"cover",display:"block",background:"var(--surf2)"}}))
          :h("div",{style:{width:30,height:30,borderRadius:7,
            flexShrink:0,background:"var(--surf2)",display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:13,color:"var(--mut2)"}},"—"),
          /* görsel ekranı: hangisi kataloga girecek · silme de orada */
          (((fotoBilgi||{})[u.id]||{}).liste||[]).length>0
            ?h("span",{onClick:e=>{ e.stopPropagation(); setFotoAc(u.id); },
              style:{flexShrink:0,fontSize:11,fontWeight:800,color:"var(--cyan)",
                padding:"4px 7px",borderRadius:8,background:"var(--surf2)",
                border:"1px solid var(--line)"}},
              (((fotoBilgi||{})[u.id]||{}).liste||[]).length>1?"değiştir":"görsel")
            :null,
          h("div",{style:{flex:1,minWidth:0,fontSize:13.5,fontWeight:700,overflow:"hidden",
            textOverflow:"ellipsis",whiteSpace:"nowrap"}},u.ad||"—"),
          /* fiyat çipi — dokun, katalogda yazacak fiyatı değiştir */
          fiyat!=="yok"?(()=>{ const fy=katalogFiyat(u,secenek), ozel=num(u.katalogFiyat)>0;
            return h("span",{onClick:e=>{ e.stopPropagation(); fiyatSor(u); },
              style:{flexShrink:0,fontSize:11.5,fontWeight:800,padding:"4px 8px",borderRadius:8,
                background:ozel?"#fef3c7":"var(--surf2)",border:"1px solid "+(ozel?"#fcd34d":"var(--line)"),
                color:ozel?"#92400e":"var(--mut)"}},
              fy>0?(fy.toLocaleString("tr-TR")+" ₺"):"fiyat yok"); })():null); })),
    fotosuz>0?h("div",{style:{fontSize:12,fontWeight:700,color:"#9a3412",background:"#fff7ed",
      border:"1px solid #fdba74",borderRadius:11,padding:"9px 12px",marginBottom:12}},
      "⚠️ Seçilenlerin "+fotosuz+" tanesinde fotoğraf yok — kutuları boş çıkar."):null,
    h("div",{style:{display:"flex",gap:8}},
      h("button",{onClick:bakBir,disabled:!secili.length||!!bek,
        style:{flex:1,padding:14,borderRadius:14,background:"var(--surf2)",
          border:"1px solid var(--line)",fontSize:14,fontWeight:800,
          color:secili.length?"var(--txt)":"var(--mut2)"}},bek==="bak"?"…":"Önizle"),
      h("button",{onClick:()=>uret("png"),disabled:!secili.length||!!bek,
        style:{flex:1,padding:14,borderRadius:14,background:secili.length?"#0e8fce":"var(--line)",
          color:secili.length?"#fff":"var(--mut2)",fontSize:14,fontWeight:800}},
        bek==="png"?"…":"PNG"),
      h("button",{onClick:()=>uret("pdf"),disabled:!secili.length||!!bek,
        style:{flex:1,padding:14,borderRadius:14,background:secili.length?"#b91c1c":"var(--line)",
          color:secili.length?"#fff":"var(--mut2)",fontSize:14,fontWeight:800}},
        bek==="pdf"?"…":"PDF")));
 };
}



/* ═══════════════════ 📔 PREMIUM KATALOG ═══════════════════
   Kapak (foto mozaiği + koleksiyon künyesi) → bölüm sayfaları → arka kapak.
   katalogDuzen/katalogCanvas ile AYNI sözleşme: düzen saf hesap, çizim ayrı,
   dosyaya dökme yine pdfKur/pngIndir. Sade liste tasarımı yerinde duruyor;
   hangisinin çizileceğini secenek.tasarim seçer. */
const KP={ kagit:"#ffffff", koyu:"#1b1e25", koyu2:"#272b34",
  mercan:"#e0483c", altin:"#d9a13a", mavi:"#2f6fd0", yesil:"#2e9e5b",
  metin:"#14171d", mut:"#6b7280", mut2:"#9aa1ad", cizgi:"#e7e9ee", kart:"#f7f8fa",
  pad:64, ara:22, sut:3 };
/* Sistem serifi — çevrimdışı da çalışsın diye webfont YOK. iOS/masaüstünde
   Georgia, Android'de Noto/Droid Serif düşer; hiçbiri yoksa genel serif. */
const KP_SERIF='Georgia,"Noto Serif","Droid Serif","Times New Roman",serif';
const KP_SANS='system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';

/* bir ürünün serileri — seriler[] ve tekil seri birlikte, yinelenmeden */
function katSeriler(u){
  return [].concat((u&&u.seriler)||[],(u&&u.seri)?[u.seri]:[])
    .map(x=>String(x||"").trim()).filter((x,i,a)=>x&&a.indexOf(x)===i);
}
/* ürün hangi katalog bölümüne girer: elle seçilen kazanır, yoksa tanımlı
   bölümlerden ilk eşleşen seri, o da yoksa ilk serisi. */
function katBolumOf(u,tanim){
  const el=String((u&&u.katBolum)||"").trim();
  if(el) return el;
  const S=katSeriler(u); if(!S.length) return "";
  const kn=s=>String(s||"").toLocaleLowerCase("tr");
  const T=(tanim||[]).map(b=>kn(b.seri));
  const bul=S.find(s=>T.indexOf(kn(s))>=0);
  return bul||S[0];
}
/* ürünleri bölümlere ayır — sıra ayardaki tanıma göre, tanımsızlar sona */
function katBolumle(urunler,secenek){
  const o=secenek||{}, tanim=o.bolumler||[];
  const kn=s=>String(s||"").toLocaleLowerCase("tr");
  const sira={}; tanim.forEach((b,i)=>{ sira[kn(b.seri)]=i; });
  const bilgi={}; tanim.forEach(b=>{ bilgi[kn(b.seri)]=b; });
  const M={};
  (urunler||[]).filter(Boolean).forEach(u=>{
    const s=katBolumOf(u,tanim), k=kn(s);
    (M[k]||(M[k]={seri:s,list:[]})).list.push(u); });
  return Object.keys(M).map(k=>{ const b=bilgi[k]||{};
      return {seri:M[k].seri,baslik:String(b.baslik||M[k].seri||"Diğer").trim(),
        aciklama:String(b.aciklama||"").trim(),list:M[k].list,
        s:(sira[k]==null?9e3:sira[k])}; })
    .sort((a,b)=>(a.s-b.s)||a.baslik.localeCompare(b.baslik,"tr"));
}
/* ——— metin sarma · ölçüm bağlamı dışarıdan gelir (saf kalsın diye) ——— */
function katSar(olc,metin,genislik,satirSiniri){
  const kel=String(metin==null?"":metin).replace(/\s+/g," ").trim().split(" ").filter(Boolean);
  const L=[]; let s="";
  kel.forEach(w=>{ const d=s?(s+" "+w):w;
    if(olc(d)<=genislik||!s) s=d; else { L.push(s); s=w; } });
  if(s) L.push(s);
  if(satirSiniri&&L.length>satirSiniri){ const kes=L.slice(0,satirSiniri);
    let son=kes[satirSiniri-1];
    while(son.length>1&&olc(son+"…")>genislik) son=son.slice(0,-1);
    kes[satirSiniri-1]=son+"…"; return kes; }
  return L;
}

/* ——— DÜZEN: kapak → akan bölümler → arka kapak (saf hesap, çizim yok) ———
   Bölümler sayfayı TEK BAŞINA kaplamaz: bir bölüm bitince yer kaldıysa sonraki
   bölüm aynı sayfada başlar. Tek ürünlü bölüm koca bir boşluk bırakmasın diye.
   Blok akışı: [bölüm başlığı] [kart satırı] [kart satırı] [bölüm başlığı] … */
function katPremiumDuzen(secili,secenek){
  const o=secenek||{}, W=KAT_SAYFA.g, H=KAT_SAYFA.y, P=KP.pad, A=KP.ara, S=KP.sut;
  const kg=Math.floor((W-P*2-A*(S-1))/S);
  const gorselH=Math.round(kg*1.02);
  const kartH=gorselH+katKartMetinH(o);
  const BOL_BAS=168;                            // bölüm başlığı bloğunun yüksekliği
  const tavan=H-P;                              // içeriğin bitebileceği en alt nokta
  const bolumler=katBolumle(secili,o);
  const sayfalar=[{tip:"kapak",no:1,H}];
  let sf=null, y=0;
  const yeniSayfa=()=>{ sf={tip:"bolum",no:sayfalar.length+1,H,basliklar:[],kutular:[]};
    sayfalar.push(sf); y=P; };
  const yerAc=h=>{ if(!sf||y+h>tavan) yeniSayfa(); };
  bolumler.forEach((b,bi)=>{
    /* başlık tek başına dipte kalmasın: altına en az bir kart satırı sığmalı */
    yerAc(BOL_BAS+kartH);
    sf.basliklar.push({sira:bi+1,baslik:b.baslik,aciklama:b.aciklama,seri:b.seri,y});
    y+=BOL_BAS;
    for(let i=0;i<b.list.length;i+=S){
      yerAc(kartH);
      const dilim=b.list.slice(i,i+S);
      dilim.forEach((u,j)=>sf.kutular.push({urun:u,no:i+j+1,bolumSeri:b.seri,
        x:P+j*(kg+A), y, g:kg,kartH,gorselH}));
      y+=kartH+A;
    }
    y+=18;                                      // bölümler arası nefes
  });
  if(o.arkaKapak!==false) sayfalar.push({tip:"arka",no:sayfalar.length+1,H});
  sayfalar.forEach((s,i)=>{ s.no=i+1; });
  return {W,H,premium:true,sutun:S,kartG:kg,gorselH,kartH,bolumSay:bolumler.length,
    toplam:(secili||[]).filter(Boolean).length,sayfa:sayfalar.length,sayfalar,bolumler};
}
/* kart yazı payı — hizalar SABİT olsun diye tek yerden hesaplanır */
function katKartMetinH(o){
  return 30                                     // ad
    +((o&&o.aciklamaVar)?72:0)                  // açıklama 3 satır
    +34                                         // rozet şeridi
    +((o&&o.fiyat!=="yok")?32:0)                // fiyat
    +26;                                        // alt boşluk
}

/* ——— ÇİZİM ——— */
function katPremiumCanvas(duzen,sayfa,gorsel,secenek,belge){
  const D=belge||document, o=secenek||{};
  const W=duzen.W, H=num(sayfa&&sayfa.H)||duzen.H, P=KP.pad;
  const cv=D.createElement("canvas"); cv.width=W; cv.height=H;
  const c=cv.getContext("2d");
  c.textBaseline="middle"; c.textAlign="left";
  const sf=(w,s)=>{ c.font=w+" "+s+"px "+KP_SERIF; };
  const sn=(w,s)=>{ c.font=w+" "+s+"px "+KP_SANS; };
  const olc=t=>c.measureText(t).width;
  const yuvarla=(x,y,g,h,r)=>{ if(c.roundRect){ c.beginPath(); c.roundRect(x,y,g,h,r); }
    else { c.beginPath(); c.rect(x,y,g,h); } };
  /* görseli kutuya KAPLAYARAK yerleştir (taşanı kırp) */
  const kapla=(im,x,y,g,h)=>{ if(!im||!(im.width>0)) return false;
    const k=Math.max(g/im.width,h/im.height), w=im.width*k, hh=im.height*k;
    c.drawImage(im,x+(g-w)/2,y+(h-hh)/2,w,hh); return true; };
  const bosKutu=(x,y,g,h)=>{ c.fillStyle="#eceef2"; c.fillRect(x,y,g,h);
    c.fillStyle="#b9bfc9"; sn("700",16); c.textAlign="center";
    c.fillText("görsel yok",x+g/2,y+h/2); c.textAlign="left"; };
  /* harf aralıklı yazı (canvas letterSpacing her yerde yok — elle) */
  const aralikli=(t,x,y,ar)=>{ let cx=x;
    String(t).split("").forEach(ch=>{ c.fillText(ch,cx,y); cx+=olc(ch)+ar; });
    return cx-x-ar; };

  if(sayfa.tip==="kapak"){
    c.fillStyle=KP.koyu; c.fillRect(0,0,W,H);
    /* 🖼 üstte 3×3 foto mozaiği */
    const mz=(o.mozaik||[]).filter(Boolean).slice(0,9);
    const mH=Math.round(H*0.505), hg=Math.floor(W/3), hh=Math.floor(mH/3);
    for(let i=0;i<9;i++){
      const x=(i%3)*hg, y=Math.floor(i/3)*hh;
      const g2=(i%3===2)?(W-x):hg, h2=(i>5)?(mH-y):hh;
      c.save(); c.beginPath(); c.rect(x,y,g2,h2); c.clip();
      if(!kapla(mz[i],x,y,g2,h2)){ c.fillStyle=i%2?"#22262e":"#1f232b"; c.fillRect(x,y,g2,h2); }
      c.restore();
      c.strokeStyle="rgba(27,30,37,.85)"; c.lineWidth=3; c.strokeRect(x,y,g2,h2);
    }
    /* logo fişi — mozaiğin ilk karesinin ortasında */
    const lg=o.logo;
    if(lg&&lg.width>0){
      const lh=74, lw=Math.min(280,Math.round(lg.width*lh/lg.height));
      const bw=lw+56, bh=lh+34, bx=Math.round(hg/2-bw/2), by=Math.round(hh/2-bh/2);
      c.fillStyle="#ffffff"; yuvarla(bx,by,bw,bh,22); c.fill();
      c.drawImage(lg,bx+(bw-lw)/2,by+(bh-lh)/2,lw,lh);
    }
    /* künye */
    let y=mH+78;
    c.fillStyle=KP.altin; sn("800",21);
    aralikli(String(o.ust||("KOLEKSİYON "+new Date().getFullYear())).toLocaleUpperCase("tr"),P,y,7);
    y+=68;
    const b1=String(o.baslik||"Ürün").trim(), b2=String(o.baslik2||"").trim();
    c.fillStyle="#ffffff"; sf("700",92); c.fillText(b1,P,y);
    if(b2){ y+=96; c.fillStyle=KP.mercan; c.font='italic 700 92px '+KP_SERIF; c.fillText(b2,P,y); }
    y+=84;
    c.fillStyle="#a9b1bf"; sn("500",26);
    katSar(olc,o.aciklama||"",W-P*2-40,3).forEach(l=>{ c.fillText(l,P,y); y+=38; });
    y+=18;
    [KP.mercan,KP.mavi,KP.altin,KP.yesil].forEach((r,i)=>{
      c.fillStyle=r; yuvarla(P+i*72,y,52,9,5); c.fill(); });
    y+=58;
    c.strokeStyle="rgba(255,255,255,.16)"; c.lineWidth=2;
    c.beginPath(); c.moveTo(P,y); c.lineTo(W-P,y); c.stroke();
    y+=62;
    const ist=o.istatistik||[];
    ist.slice(0,3).forEach((s,i)=>{ const x=P+i*Math.round((W-P*2)/3);
      c.fillStyle="#ffffff"; sn("800",44); c.fillText(String(s.v),x,y);
      c.fillStyle="#8b93a2"; sn("700",17);
      aralikli(String(s.l).toLocaleUpperCase("tr"),x,y+42,3); });
    return cv;
  }

  if(sayfa.tip==="arka"){
    c.fillStyle=KP.koyu; c.fillRect(0,0,W,H);
    const lg=o.logo;
    let y=Math.round(H*0.36);
    if(lg&&lg.width>0){
      const lh=104, lw=Math.min(380,Math.round(lg.width*lh/lg.height));
      const bw=lw+72, bh=lh+44;
      c.fillStyle="#ffffff"; yuvarla(Math.round(W/2-bw/2),y-bh/2,bw,bh,26); c.fill();
      c.drawImage(lg,Math.round(W/2-lw/2),y-lh/2,lw,lh);
      y+=bh/2+86;
    }
    c.textAlign="center";
    c.fillStyle="#ffffff"; sf("700",46);
    c.fillText(String(o.kapanis||"Her tasarım tek tek üretildi."),W/2,y); y+=74;
    [KP.mercan,KP.mavi,KP.altin,KP.yesil].forEach((r,i)=>{
      c.fillStyle=r; yuvarla(W/2-110+i*58,y,40,8,4); c.fill(); });
    y+=68;
    c.fillStyle="#8b93a2"; sn("600",23);
    katSar(olc,o.iletisim||"",W-P*2-120,3).forEach(l=>{ c.fillText(l,W/2,y); y+=36; });
    c.textAlign="left";
    return cv;
  }

  /* ——— bölüm sayfası ——— */
  c.fillStyle=KP.kagit; c.fillRect(0,0,W,H);
  /* bölüm başlıkları — sayfada birden çok bölüm başlayabilir */
  (sayfa.basliklar||[]).forEach(B=>{
    let y=B.y+34;
    c.fillStyle=KP.mercan; sf("700",58);
    const nStr=String(B.sira).padStart(2,"0");
    c.fillText(nStr,P,y);
    const nw=olc(nStr);
    c.fillStyle=KP.metin; sf("700",42);
    c.fillText(B.baslik,P+nw+26,y);
    let ay=y+42;
    if(B.aciklama){ c.fillStyle=KP.mut; sn("500",20);
      katSar(olc,B.aciklama,W-P*2-nw-26,2).forEach(l=>{ c.fillText(l,P+nw+26,ay); ay+=28; }); }
    const cy=B.y+134;
    c.fillStyle=KP.mercan; yuvarla(P,cy,104,6,3); c.fill();
    c.fillStyle=KP.cizgi; yuvarla(P+114,cy+2,W-P*2-114,2,1); c.fill();
  });
  /* kartlar — iç hizalar SABİT: ad, açıklama, rozet ve fiyat her kartta aynı y'de */
  (sayfa.kutular||[]).forEach(k=>{
    const u=k.urun||{};
    c.fillStyle=KP.kart; yuvarla(k.x,k.y,k.g,k.kartH,20); c.fill();
    c.save();
    if(c.roundRect){ c.beginPath(); c.roundRect(k.x,k.y,k.g,k.gorselH,[20,20,0,0]); c.clip(); }
    else { c.beginPath(); c.rect(k.x,k.y,k.g,k.gorselH); c.clip(); }
    if(!kapla(gorsel&&gorsel[u.id],k.x,k.y,k.g,k.gorselH)) bosKutu(k.x,k.y,k.g,k.gorselH);
    c.restore();
    c.fillStyle=KP.mercan; c.beginPath(); c.arc(k.x+34,k.y+34,21,0,Math.PI*2); c.fill();
    c.fillStyle="#ffffff"; sn("800",17); c.textAlign="center";
    c.fillText(String(k.no).padStart(2,"0"),k.x+34,k.y+35); c.textAlign="left";
    const ix=k.x+20, iw=k.g-40;
    let y=k.y+k.gorselH+26;                      // ad
    c.fillStyle=KP.metin; sn("800",23);
    katSar(olc,u.ad||"—",iw,1).forEach(l=>c.fillText(l,ix,y));
    y+=30;
    if(o.aciklamaVar){                            // açıklama — 3 satırlık SABİT blok
      c.fillStyle=KP.mut; sn("500",16);
      katSar(olc,u.tanitim||"",iw,3).forEach((l,i)=>c.fillText(l,ix,y+i*23));
      y+=72;
    }
    /* rozetler — yalnız TANIMLI bölümlerden olanlar (mevsim etiketi kirletmesin) */
    const kn=x=>String(x||"").toLocaleLowerCase("tr");
    const tanimli=(o.bolumler||[]).map(b=>kn(b.seri));
    const rz=katSeriler(u).filter(x=>kn(x)!==kn(k.bolumSeri)&&tanimli.indexOf(kn(x))>=0).slice(0,2);
    let rx=ix; sn("700",14);
    rz.forEach(x=>{ const tw=olc(x)+26; if(rx+tw>ix+iw) return;
      c.strokeStyle="#dcdfe6"; c.lineWidth=1.5;
      c.fillStyle="#ffffff"; yuvarla(rx,y,tw,28,14); c.fill(); c.stroke();
      c.fillStyle=KP.mut; c.fillText(x,rx+13,y+14); rx+=tw+8; });
    y+=34;
    if(o.fiyat!=="yok"){ const fy=katalogFiyat(u,o);
      if(fy>0){ c.fillStyle=KP.metin; sn("800",21);
        c.fillText(fy.toLocaleString("tr-TR")+" \u20ba",ix,y+12); } }
  });
  /* sayfa altı künyesi */
  c.fillStyle=KP.mut2; sn("700",15);
  c.fillText(String(o.baslik||"Tikita"),P,H-38);
  c.textAlign="right"; c.fillText(String(sayfa.no),W-P,H-38); c.textAlign="left";
  return cv;
}

export {num as katNum,urunFotolari,fotoBul,urunFotoBilgi,fotoKaynakAd,katalogFiyat,katalogKart,katalogDuzen,katalogCanvas,pdfKur,veriBayt,KAT_SAYFA,KAT_PAD,KAT_ARA,KAT_BAS,KAT_ALT,KAT_LOGO,pngIndir,
  katPremiumDuzen,katPremiumCanvas,katBolumle,katBolumOf,katSeriler,KP};
