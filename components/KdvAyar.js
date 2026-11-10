'use client';
// Admin: KDV'yi aç/kapat. Kapalıyken sitede, panelde ve ek dakika ödemelerinde KDV eklenmez.
import {useEffect,useState} from 'react';
export default function KdvAyar({sb}){
 const [k,setK]=useState(null),[msg,setMsg]=useState('');
 const H=async()=>({'content-type':'application/json',authorization:'Bearer '+(await sb.auth.getSession()).data.session?.access_token});
 useEffect(()=>{(async()=>{const r=await fetch('/api/admin/sistem',{headers:await H()});const j=await r.json();setK(j.kdv||{acik:true});})();},[]);
 const kaydet=async acik=>{const r=await fetch('/api/admin/sistem',{method:'POST',headers:await H(),body:JSON.stringify({kdv:{acik}})});const j=await r.json();if(!r.ok){setMsg(j.error);return;}setK(j.kdv);setMsg(acik?'KDV açıldı: fiyatlara %20 KDV eklenir.':'KDV kapatıldı: sitede, panelde ve ödemelerde KDV eklenmez.');};
 if(!k)return null;
 return <div className="card sec2"><h2>KDV</h2><p className="mut">Şirket kurulana kadar ya da deneme ödemesi için KDV'yi kapatabilirsiniz. Değişiklik ana sayfa fiyatlarına, işletme paneline ve ek dakika / aşım ödemelerine 1 dakika içinde yansır.</p>
  <div className="row" style={{justifyContent:'flex-start',gap:8,marginTop:10}}><button className={k.acik?'':'g'} onClick={()=>kaydet(true)}>KDV açık (%20)</button><button className={!k.acik?'':'g'} onClick={()=>kaydet(false)}>KDV kapalı</button></div>
  {msg&&<p className="mut" style={{marginTop:8}}>{msg}</p>}</div>;}
