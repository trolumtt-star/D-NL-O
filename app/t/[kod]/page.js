'use client';
// Müşterinin canlı takip sayfası: "Siparişiniz yolda". Giriş yok, uygulama yok. Kurye konumu sadece paket yoldayken görünür.
import {useEffect,useRef,useState} from 'react';import '@/components/go.css';import {Motor,Konfeti} from '@/components/GoIkon';
const AD={bekliyor:['Siparişiniz hazırlanıyor','Kurye birazdan yola çıkacak.',0],kabul:['Kurye paketinizi almaya gidiyor','Az sonra yola çıkacak.',0],yolda:['Siparişiniz yolda!','Kuryeniz size doğru geliyor.',1],teslim:['Teslim edildi','Afiyet olsun!',2],iptal:['Sipariş iptal edildi','Detay için işletmeyi arayın.',-1]};
const km=(a,b)=>{const R=6371,r=x=>x*Math.PI/180,dl=r(b.lat-a.lat),dg=r(b.lng-a.lng),h=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
export default function Takip({params}){
 const [d,setD]=useState(null),[err,setErr]=useState(''),[harita,setHarita]=useState(null),[ilk,setIlk]=useState(null);const son=useRef(null);
 useEffect(()=>{let dur=false;const cek=async()=>{try{const r=await fetch('/api/takip?k='+encodeURIComponent(params.kod),{cache:'no-store'});const j=await r.json();if(!r.ok){setErr(j.error||'Bulunamadı');dur=true;return;}setD(j);
   // Harita sadece kurye 40 metreden fazla yer değiştirince yenilenir (titremesin)
   if(j.konum&&(!son.current||km(son.current,j.konum)>0.04)){son.current=j.konum;setHarita(j.konum);if(j.hedef)setIlk(v=>v??km(j.konum,j.hedef));}if(!j.konum&&j.durum!=='yolda')setHarita(null);
   if(j.durum==='teslim'||j.durum==='iptal')dur=true;}catch{}};
  cek();const i=setInterval(()=>{if(!dur&&document.visibilityState==='visible')cek();},12000);return()=>clearInterval(i);},[params.kod]);
 if(err)return <div className="go"><div className="tk-hero"><div className="go-radar" style={{width:96,height:96}}><span style={{fontSize:'2rem'}}>🔗</span></div><h1>Takip linki</h1><p className="go-mut" style={{marginTop:8}}>{err}</p></div></div>;
 if(!d)return <div className="go"><div className="tk-hero"><div className="go-radar"><Motor s={56}/></div><p className="go-mut">Yükleniyor…</p></div></div>;
 const a=AD[d.durum]||AD.bekliyor,adim=a[2],uzak=harita&&d.hedef?km(harita,d.hedef):null,dk=uzak!=null?Math.max(1,Math.round(uzak/25*60)+1):null;
 // Motor yolda ilerler: hazırlanırken başta, yoldayken kalan mesafeye göre, teslimde sonda
 const ilerle=adim>=2?100:adim===1?(uzak!=null&&ilk?Math.max(18,Math.min(88,100-uzak/ilk*82)):50):8;
 const bb=harita?[harita.lng-0.008,harita.lat-0.005,harita.lng+0.008,harita.lat+0.005].map(x=>x.toFixed(5)).join(','):null;
 return <div className="go">
  <div className="go-top"><div className="go-logo" style={{fontSize:'1.05rem'}}><span className="go-mark" style={{width:34,height:34}}><Motor s={22}/></span><span>{d.isletme}</span></div>
   {adim===1&&<span className="go-pill"><span className="go-dot k"/>Canlı</span>}</div>
  <div className={'tk-hero'+(adim===1?' yolda':adim===2?' teslim':'')}>
   {adim===2&&<Konfeti n={22}/>}
   {adim===2?<div className="go-tik" style={{width:84,height:84,fontSize:'2.4rem'}}>✓</div>:adim<0?<div style={{fontSize:'2.6rem'}}>✖</div>:<div className="go-radar" style={{width:110,height:110,margin:'0 auto'}}><Motor s={60}/></div>}
   <h1>{a[0]}</h1><p className="go-mut" style={{marginTop:6}}>{a[1]}{d.kurye&&adim>=0&&adim<2?' Kurye: '+d.kurye:''}</p>
   {adim===1&&dk&&<div className="tk-eta"><span className="go-mut">Tahmini varış</span><b>~{dk} dk</b></div>}
   {adim>=0&&<><div className={'tk-yol'+(adim===1?' akar':'')}><div className="serit"/><div className="dolu" style={{width:ilerle+'%'}}/><div className="motor" style={{left:Math.min(ilerle,94)+'%'}}><Motor s={46}/></div><span className="ev">🏠</span></div>
    <div className="tk-et"><span className="ok">Hazırlanıyor</span><span className={adim>=1?'ok':''}>Yolda</span><span className={adim>=2?'ok':''}>Teslim</span></div></>}</div>
  {harita&&adim===1&&<div className="tk-harita"><iframe title="Kurye konumu" loading="lazy" referrerPolicy="no-referrer" src={`https://www.openstreetmap.org/export/embed.html?bbox=${bb}&layer=mapnik&marker=${harita.lat.toFixed(5)},${harita.lng.toFixed(5)}`}/>
   <p>📍 İşaret kuryenizin şu anki konumu. Sayfa kendiliğinden güncellenir.</p></div>}
  {!harita&&adim===1&&<div className="go-card" style={{marginTop:12}}><p className="go-mut">Kuryenin konumu birazdan haritada görünecek.</p></div>}
  <p className="tk-alt">Bu sipariş <b>Dinlio AI</b> ile alındı · uygulama komisyonu yok</p></div>;}
