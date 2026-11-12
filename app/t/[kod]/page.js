'use client';
// Müşterinin canlı takip sayfası: "Siparişiniz yolda". Giriş yok, uygulama yok. Kurye konumu sadece paket yoldayken görünür.
import {useEffect,useRef,useState} from 'react';
const AD={bekliyor:['🟡','Siparişiniz hazırlanıyor','Kurye bekleniyor.'],kabul:['🟡','Kurye yolda, paketinizi almaya gidiyor','Birazdan yola çıkacak.'],yolda:['🛵','Siparişiniz yolda!','Kuryeniz size doğru geliyor.'],teslim:['✅','Teslim edildi','Afiyet olsun!'],iptal:['✖','Sipariş iptal edildi','Detay için işletmeyi arayın.']};
const km=(a,b)=>{const R=6371,r=x=>x*Math.PI/180,dl=r(b.lat-a.lat),dg=r(b.lng-a.lng),h=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
export default function Takip({params}){
 const [d,setD]=useState(null),[err,setErr]=useState(''),[harita,setHarita]=useState(null);const son=useRef(null);
 useEffect(()=>{let dur=false;const cek=async()=>{try{const r=await fetch('/api/takip?k='+encodeURIComponent(params.kod),{cache:'no-store'});const j=await r.json();if(!r.ok){setErr(j.error||'Bulunamadı');dur=true;return;}setD(j);
   // Harita sadece kurye 40 metreden fazla yer değiştirince yenilenir (titremesin)
   if(j.konum&&(!son.current||km(son.current,j.konum)>0.04)){son.current=j.konum;setHarita(j.konum);}if(!j.konum&&j.durum!=='yolda')setHarita(null);
   if(j.durum==='teslim'||j.durum==='iptal')dur=true;}catch{}};
  cek();const i=setInterval(()=>{if(!dur&&document.visibilityState==='visible')cek();},12000);return()=>clearInterval(i);},[params.kod]);
 const W={maxWidth:520,margin:'0 auto',padding:'22px 16px'},C={background:'var(--surface)',border:'1px solid var(--rule)',borderRadius:18,padding:18,marginBottom:12};
 if(err)return <div style={W}><div style={C}><h2 style={{fontSize:'1.1rem'}}>Takip linki</h2><p style={{color:'var(--mute)',marginTop:8}}>{err}</p></div></div>;
 if(!d)return <div style={W}><p style={{color:'var(--mute)'}}>Yükleniyor…</p></div>;
 const a=AD[d.durum]||AD.bekliyor,uzak=harita&&d.hedef?km(harita,d.hedef):null,dk=uzak!=null?Math.max(1,Math.round(uzak/25*60)+1):null;
 const bb=harita?[harita.lng-0.008,harita.lat-0.005,harita.lng+0.008,harita.lat+0.005].map(x=>x.toFixed(5)).join(','):null;
 return <div style={W}>
  <p style={{color:'var(--mute)',fontSize:'.9rem'}}>{d.isletme}</p>
  <div style={{...C,borderColor:d.durum==='yolda'?'var(--red)':'var(--rule)',marginTop:8}}>
   <div style={{fontSize:'2.2rem'}}>{a[0]}</div><h1 style={{fontSize:'1.35rem',marginTop:6}}>{a[1]}</h1>
   <p style={{color:'var(--mute)',marginTop:6}}>{d.durum==='yolda'&&dk?`Tahmini varış: yaklaşık ${dk} dakika${d.kurye?' · Kurye: '+d.kurye:''}`:a[2]+(d.kurye&&d.durum!=='teslim'&&d.durum!=='iptal'?' Kurye: '+d.kurye:'')}</p></div>
  {harita?<div style={{...C,padding:0,overflow:'hidden'}}><iframe title="Kurye konumu" style={{width:'100%',height:340,border:0,display:'block'}} loading="lazy" referrerPolicy="no-referrer"
    src={`https://www.openstreetmap.org/export/embed.html?bbox=${bb}&layer=mapnik&marker=${harita.lat.toFixed(5)},${harita.lng.toFixed(5)}`}/>
   <p style={{padding:'10px 14px',color:'var(--mute)',fontSize:'.82rem'}}>İşaret kuryenizin şu anki konumu. Sayfa kendiliğinden güncellenir.</p></div>
  :d.durum==='yolda'&&<div style={C}><p style={{color:'var(--mute)'}}>Kuryenin konumu şu an alınamıyor; siparişiniz yolda, birazdan güncellenecek.</p></div>}
  <p style={{color:'var(--mute)',fontSize:'.8rem',textAlign:'center',marginTop:16}}>Bu sipariş <b style={{color:'var(--ink)'}}>Dinlio AI</b> ile alındı · uygulama komisyonu yok</p></div>;}
