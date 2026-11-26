'use client';
// Admin → Genel bakış → Yapılacaklar: sistemin kendi başına çözemediği işler + admin telefon bildirimi
import {useEffect,useState} from 'react';import PushAyar from './PushAyar';
const TUR={kurulum:['Kurulum','#b45309'],numara:['Numara','#b45309'],odeme:['Ödeme','#b91c1c'],cagri:['Çağrı','#b91c1c'],satis:['Satış','#1d4ed8']};
export default function AdminYapilacak({tok}){
 const [l,setL]=useState(null),[m,setM]=useState(''),[ac,setAc]=useState(false);
 const H=async()=>({'content-type':'application/json',authorization:'Bearer '+await tok()});
 const yukle=async()=>{try{const r=await fetch('/api/admin/isler',{headers:await H()});const j=await r.json();if(!r.ok)throw new Error(j.error);setL(j.isler);}catch(e){setM(e.message);}};
 useEffect(()=>{yukle();const t=setInterval(yukle,60000);return ()=>clearInterval(t);},[]);
 const coz=async id=>{await fetch('/api/admin/isler',{method:'POST',headers:await H(),body:JSON.stringify({islem:'coz',id})});yukle();};
 return <div className="card sec2" style={{borderLeft:l?.length?'4px solid #dc2626':undefined}}>
  <div className="row" style={{justifyContent:'space-between',alignItems:'center'}}><h2 style={{margin:0}}>🛠 Yapılacaklar {l?.length?<span className="tag" style={{background:'#dc2626',color:'#fff'}}>{l.length}</span>:null}</h2>
   <button className="g" onClick={()=>setAc(!ac)}>{ac?'Bildirim ayarını gizle':'Telefonuma bildirim gelsin'}</button></div>
  {ac&&<div style={{marginTop:10}}><PushAyar tok={tok} api="/api/admin/push" baslik="Admin bildirimleri" aciklama="Buraya yeni iş düşünce (eksik kurulum, numara havuzu azaldı, ödeme işlenemedi, çağrıda hata) bu telefona bildirim gelir."/></div>}
  {m&&<p className="mut">{m}</p>}
  {!l?<p className="mut">Yükleniyor…</p>:!l.length?<p className="mut" style={{marginTop:8}}>Şu an yapılacak bir şey yok ✓</p>:
   <div style={{display:'grid',gap:8,marginTop:10}}>{l.map(x=><div key={x.id} className="row" style={{justifyContent:'space-between',alignItems:'flex-start',gap:10,padding:'8px 0',borderTop:'1px solid var(--line, #e5e7eb)'}}>
    <div style={{minWidth:0}}><span className="tag" style={{background:(TUR[x.tur]||['','#6b7280'])[1],color:'#fff',marginRight:6}}>{(TUR[x.tur]||[x.tur])[0]}</span><b>{x.baslik}</b>
     <div className="mut" style={{fontSize:'.85rem',whiteSpace:'pre-wrap',marginTop:4}}>{x.detay}</div>
     <div className="mut" style={{fontSize:'.75rem',marginTop:2}}>{new Date(x.created_at).toLocaleString('tr-TR')}</div></div>
    <button className="g" onClick={()=>coz(x.id)}>Çözüldü</button></div>)}</div>}</div>;}
