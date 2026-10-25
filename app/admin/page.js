'use client';
import {useEffect,useState} from 'react';import {useRouter} from 'next/navigation';import {sb,live} from '@/lib/supabase';import {useUser,usedSec} from '@/lib/useAuth';
const api=async(method,body)=>{const {data}=await sb.auth.getSession();const r=await fetch('/api/admin/business',{method,headers:{'content-type':'application/json',authorization:'Bearer '+data.session.access_token},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.error);return j;};
const F=[['name','İşletme adı'],['username','Kullanıcı adı'],['password','Şifre'],['business_type','Tür (restaurant...)'],['email','İletişim e-postası'],['phone_number','Telefon'],['quota_minutes_total','Dakika kotası'],['table_count','Masa sayısı'],['vapi_assistant_id','Vapi assistant ID'],['vapi_phone_number','Vapi telefon no']];
export default function Admin(){const u=useUser(),r=useRouter(),[list,setL]=useState([]),[ev,setEv]=useState([]),[f,setF]=useState({business_type:'restaurant',quota_minutes_total:100,table_count:5}),[m,setM]=useState('');
 const isA=u&&u.email.toLowerCase()===process.env.NEXT_PUBLIC_ADMIN_EMAIL.toLowerCase();
 useEffect(()=>{if(u===null)r.replace('/login');else if(u&&!isA)r.replace('/panel');},[u]);
 const load=async()=>{const a=await sb.from('businesses').select('*').order('created_at',{ascending:false});setL(a.data||[]);const b=await sb.from('webhook_events').select('type,business_id,vapi_call_id').order('created_at',{ascending:false}).limit(8);setEv(b.data||[]);};
 useEffect(()=>{if(!isA)return;load();const a=live('b','businesses',null,load),b=live('w','webhook_events',null,load);return()=>{a();b();};},[isA]);
 const run=async(fn,ok)=>{setM('');try{await fn();setM(ok);load();}catch(e){setM('Hata: '+e.message);}};
 const origin=typeof window!=='undefined'?location.origin:'';
 if(!isA)return null;
 return <div className="wrap"><div className="row"><h1>Yönetim</h1><button className="g" onClick={()=>sb.auth.signOut()}>Çıkış</button></div>
 <form className="card" style={{margin:'24px 0'}} onSubmit={e=>{e.preventDefault();run(async()=>{await api('POST',f);setF({business_type:'restaurant',quota_minutes_total:100,table_count:5});},'İşletme oluşturuldu.');}}>
 <h2>Yeni işletme</h2><div className="grid">{F.map(([k,l])=><label key={k}>{l}<input value={f[k]||''} onChange={e=>setF({...f,[k]:e.target.value})} required={['name','username','password'].includes(k)}/></label>)}</div>
 <div className="row" style={{marginTop:16}}><span className="mut">{m}</span><button>İşletme oluştur</button></div></form>
 <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))'}}>{list.map(b=>{const s=usedSec(b),t=(b.quota_minutes_total||0)*60,p=t?Math.min(100,s/t*100):0;
  return <div className="card" key={b.id}><div className="row"><h2>{b.name}</h2><span className={'tag '+(b.status==='active'?'':'x')}>{b.status==='active'?'aktif':'durdu'}</span></div>
  <p className="mut">@{b.username} · {b.business_type} · {b.table_count} masa</p><div className="bar"><b style={{width:p+'%'}}/></div><p className="mut">{Math.floor(s/60)} dk {s%60} sn / {b.quota_minutes_total} dk</p>
  <label>Webhook URL<input readOnly value={`${origin}/api/vapi/webhook?b=${b.id}`} onFocus={e=>e.target.select()}/></label>
  <label>Araç (tool) URL<input readOnly value={`${origin}/api/vapi/tools?b=${b.id}`} onFocus={e=>e.target.select()}/></label>
  <div className="row" style={{marginTop:12}}><button className="g" onClick={()=>{const v=prompt('Yeni toplam dakika',b.quota_minutes_total);if(v)run(()=>api('PATCH',{id:b.id,quota_minutes_total:+v}),'Kota güncellendi.');}}>Kota</button>
  <button className="g" onClick={()=>run(()=>api('PATCH',{id:b.id,reset:true}),'Kota sıfırlandı.')}>Sıfırla</button>
  <button className="g" onClick={()=>run(()=>api('PATCH',{id:b.id,status:b.status==='active'?'suspended':'active'}),'Durum değişti.')}>{b.status==='active'?'Durdur':'Aç'}</button>
  <button className="g" onClick={()=>{const v=prompt('Yeni şifre');if(v)run(()=>api('PATCH',{id:b.id,password:v}),'Şifre değişti.');}}>Şifre</button>
  <button className="d" onClick={()=>confirm(b.name+' silinsin mi?')&&run(()=>api('DELETE',{id:b.id}),'Silindi.')}>Sil</button></div></div>;})}</div>
 <div className="card" style={{marginTop:24}}><h2>Son webhook olayları</h2><table><tbody>{ev.map((e,i)=><tr key={i}><td>{e.type}</td><td className="mut">{e.business_id||'eşleşmedi'}</td><td className="mut">{e.vapi_call_id}</td></tr>)}</tbody></table></div></div>;}
