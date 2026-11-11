'use client';
// Çalışan ekranı: sadece randevular. İşletme sahibi panelden hesap açar, çalışan buradan
// günün randevularını görür, "Geldi / Gelmedi / İptal" işaretler. Çağrılar, siparişler,
// müşteri listesi ve ayarlar çalışana görünmez.
import {useEffect,useState} from 'react';
const TZ='Europe/Istanbul';
const ASTAT={confirmed:['Onaylı',''],completed:['Geldi',''],no_show:['Gelmedi','x'],cancelled:['İptal','x']};
export default function CalisanPanel({sb,bilgi}){
 const [l,setL]=useState(null),[af,setAf]=useState('today'),[benim,setBenim]=useState(!!bilgi.resource_id),[msg,setMsg]=useState('');
 const yukle=async()=>{const {data}=await sb.from('appointments').select('id,starts_at,duration_minutes,customer_name,customer_phone,status,notes,resource_id,services(name),resources(name)')
  .eq('business_id',bilgi.business_id).gte('starts_at',new Date(Date.now()-864e5).toISOString()).order('starts_at').limit(400);setL(data||[]);};
 useEffect(()=>{yukle();const ch=sb.channel('cal-appt').on('postgres_changes',{event:'*',schema:'public',table:'appointments',filter:'business_id=eq.'+bilgi.business_id},yukle).subscribe();
  const t=setInterval(yukle,60000);return()=>{sb.removeChannel(ch);clearInterval(t);};},[]);
 const gun=d=>new Date(d).toLocaleDateString('sv-SE',{timeZone:TZ}),bugun=gun(Date.now()),yarin=gun(Date.now()+864e5);
 const liste=(l||[]).filter(x=>(af==='today'?gun(x.starts_at)===bugun:af==='tomorrow'?gun(x.starts_at)===yarin:new Date(x.starts_at)>Date.now()-36e5))
  .filter(x=>!benim||!bilgi.resource_id||x.resource_id===bilgi.resource_id);
 const durum=async(id,st)=>{if(st==='cancelled'&&!confirm('Randevu iptal edilsin mi?'))return;const {error}=await sb.from('appointments').update({status:st}).eq('id',id);setMsg(error?'Kaydedilemedi: '+error.message:'');yukle();};
 return <div className="wrap" style={{maxWidth:860,margin:'0 auto',padding:'20px 14px'}}>
  <div className="row" style={{marginBottom:14}}><div><h1 style={{margin:0,fontSize:'1.3rem'}}>{bilgi.isletme}</h1><p className="mut" style={{margin:'2px 0 0'}}>Merhaba {bilgi.ad} · randevu ekranı{bilgi.resource_name?' · '+bilgi.resource_name:''}</p></div>
   <button className="g" onClick={()=>sb.auth.signOut().then(()=>location.replace('/login'))}>Çıkış</button></div>
  <div className="row" style={{justifyContent:'flex-start',gap:8,flexWrap:'wrap',marginBottom:10}}>
   <div className="chips" style={{margin:0}}>{[['today','Bugün'],['tomorrow','Yarın'],['up','Yaklaşan']].map(([k,x])=><button key={k} className={'chp'+(af===k?' on':'')} onClick={()=>setAf(k)}>{x}</button>)}</div>
   {bilgi.resource_id&&<label style={{display:'flex',gap:6,alignItems:'center',margin:0,fontSize:'.9rem'}}><input type="checkbox" checked={benim} onChange={e=>setBenim(e.target.checked)} style={{width:'auto',margin:0}}/> Sadece benim randevularım</label>}
  </div>
  {msg&&<p className="mut">{msg}</p>}
  {l===null?<p className="mut">Yükleniyor…</p>:!liste.length?<div className="card"><p className="mut">Bu günde randevu yok. Telefonla yeni randevu gelirse burada kendiliğinden belirir.</p></div>:
  <div className="tgrid">{liste.map(x=>{const st=ASTAT[x.status]||[x.status,''];return <div className="card tc" key={x.id} style={{opacity:['cancelled','no_show'].includes(x.status)?.55:1}}>
   <div className="row"><span className="big">{new Date(x.starts_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:TZ})}<span className="mut" style={{fontWeight:400,fontSize:'.85rem'}}> · {new Date(x.starts_at).toLocaleDateString('tr-TR',{day:'numeric',month:'long',timeZone:TZ})}</span></span><span className={'tag '+st[1]}>{st[0]}</span></div>
   <div className="blk"><small>Müşteri</small><b>{x.customer_name||'İsimsiz'}</b></div>
   {x.services?.name&&<div className="blk"><small>Hizmet</small>{x.services.name}{x.duration_minutes?' · '+x.duration_minutes+' dk':''}</div>}
   {x.resources?.name&&<div className="blk"><small>Kişi</small>{x.resources.name}</div>}
   {x.notes&&<div className="blk"><small>Not</small>{x.notes}</div>}
   <div className="acts">{x.customer_phone&&<a className="lb" href={'tel:'+x.customer_phone}>Ara</a>}
    {x.status==='confirmed'&&<><button onClick={()=>durum(x.id,'completed')}>Geldi</button><button className="g" onClick={()=>durum(x.id,'no_show')}>Gelmedi</button><button className="g" onClick={()=>durum(x.id,'cancelled')}>İptal</button></>}</div>
  </div>;})}</div>}
  <p className="mut" style={{fontSize:'.78rem',marginTop:16}}>Bu ekran yalnızca randevuları gösterir. Diğer bilgiler için işletme sahibine başvurun.</p>
 </div>;}
