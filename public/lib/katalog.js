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
 return function KatalogSheet({urunler,fotoBilgi,onFotoSec,onFiyat,logo,onLogo,onClose,say}){
  const fotoMap={}; Object.keys(fotoBilgi||{}).forEach(id=>{
    const k=fotoBilgi[id]&&fotoBilgi[id].katalog; if(k) fotoMap[id]=k; });
  const [q,setQ]=useState("");
  const [sec,setSec]=useState(()=>{ const m={};
    (urunler||[]).forEach(u=>{ if(u&&u.id&&(fotoMap||{})[u.id]) m[u.id]=true; }); return m; });
  const [baslik,setBaslik]=useState("3D Baskı Koleksiyonu");
  const [sutun,setSutun]=useState(3);
  const [fiyat,setFiyat]=useState("satis");
  const [bek,setBek]=useState("");
  const [onizle,setOnizle]=useState("");
  const [fotoAc,setFotoAc]=useState("");     // katalog görseli seçilen ürün
  const L=useMemo(()=>{ const a=q.trim().toLocaleLowerCase("tr");
    return (urunler||[]).filter(u=>u&&u.id&&(!a||String(u.ad||"").toLocaleLowerCase("tr").indexOf(a)>=0));
  },[urunler,q]);
  const secili=useMemo(()=>(urunler||[]).filter(u=>u&&sec[u.id]),[urunler,sec]);
  const secenek={baslik,sutun,fiyat};
  /* PNG paylaşmak için: sayfa içeriğe kırpılır. PDF basılacak: A4 sabit. */
  const duzen=useMemo(()=>katalogDuzen(secili,{...secenek,kirp:true}),[secili,sutun,fiyat,baslik]);
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
      const sec2={...secenek,logo:lg};
      const dz=tip==="pdf"?katalogDuzen(secili,sec2):duzen;
      const cvs=dz.sayfalar.map(s=>katalogCanvas(dz,s,g,sec2,document));
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
      setOnizle(katalogCanvas(duzen,duzen.sayfalar[0],g,{...secenek,logo:lg},document)
        .toDataURL("image/jpeg",0.8)); }
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
    return h(Sheet,{ik:"📔",hex:"#0e8fce",baslik:"Katalog fotoğrafı",alt:u.ad||"",
        onClose:()=>setFotoAc("")},
      h("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}},
        (B.liste||[]).map(f=>h("button",{key:f.id,
          onClick:()=>{ onFotoSec&&onFotoSec(fotoAc,f.id,"katalog"); setFotoAc(""); },
          style:{padding:0,borderRadius:14,lineHeight:0,background:"none",
            border:"3px solid "+(f.id===secId?"#0e8fce":"var(--line)")}},
          h("img",{src:f.data,alt:"",style:{width:"100%",height:130,objectFit:"cover",
            borderRadius:11,display:"block",background:"var(--surf2)"}})))));
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
    h("div",{style:{display:"flex",gap:7,marginBottom:8}},
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
          f?h("img",{src:f.data,alt:"",style:{width:30,height:30,borderRadius:7,objectFit:"cover",flexShrink:0,display:"block",background:"var(--surf2)"}}):h("div",{style:{width:30,height:30,borderRadius:7,
            flexShrink:0,background:"var(--surf2)",display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:13,color:"var(--mut2)"}},"—"),
          /* birden çok görseli olan üründe: hangisi kataloga girecek */
          (((fotoBilgi||{})[u.id]||{}).liste||[]).length>1
            ?h("span",{onClick:e=>{ e.stopPropagation(); setFotoAc(u.id); },
              style:{flexShrink:0,fontSize:11,fontWeight:800,color:"var(--cyan)",
                padding:"4px 7px",borderRadius:8,background:"var(--surf2)",
                border:"1px solid var(--line)"}},"değiştir")
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

export {num as katNum,urunFotolari,fotoBul,urunFotoBilgi,fotoKaynakAd,katalogFiyat,katalogKart,katalogDuzen,katalogCanvas,pdfKur,veriBayt,KAT_SAYFA,KAT_PAD,KAT_ARA,KAT_BAS,KAT_ALT,KAT_LOGO,pngIndir};
