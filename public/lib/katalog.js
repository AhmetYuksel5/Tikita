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
const KAT_PAD=54, KAT_ARA=20, KAT_BAS=124, KAT_ALT=30;

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
  const bandY=KAT_PAD+34;
  let bx=KAT_PAD;
  const lg=o.logo;
  if(lg&&lg.width>0){
    const lh=68, lw=Math.min(260,Math.round(lg.width*lh/lg.height));
    c.drawImage(lg,bx,bandY-lh/2,lw,lh);
    bx+=lw+22;
  }
  c.fillStyle="#111827"; c.font=fnt("800",38);
  c.fillText(String(o.baslik||"Ürün kataloğu").toLocaleUpperCase("tr"),bx,bandY);
  c.strokeStyle="#111827"; c.lineWidth=3;
  c.beginPath(); c.moveTo(KAT_PAD,KAT_PAD+72); c.lineTo(duzen.W-KAT_PAD,KAT_PAD+72); c.stroke();
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

export {num as katNum,urunFotolari,fotoBul,urunFotoBilgi,fotoKaynakAd,katalogFiyat,katalogKart,katalogDuzen,katalogCanvas,pdfKur,veriBayt,KAT_SAYFA,KAT_PAD,KAT_ARA,KAT_BAS,KAT_ALT};
