'use client';
import {useEffect,useRef,useState} from 'react';import {useRouter} from 'next/navigation';import {sb,live} from '@/lib/supabase';import {useUser,usedSec,fmt} from '@/lib/useAuth';
const TZ='Europe/Istanbul',today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:TZ}),nowT=()=>new Date().toLocaleTimeString('sv-SE',{timeZone:TZ,hour:'2-digit',minute:'2-digit'});
const tm=t=>{const[a,b]=String(t||'0:0').split(':');return +a*60+ +b;};
export default function Panel(){const u=useUser(),r=useRouter(),[b,setB]=useState(null),[res,setR]=useState([]),[calls,setC]=useState([]),[tab,setT]=useState('t'),[toast,setToast]=useState([]),[tc,setTc]=useState(''),ready=useRef(false);
 const push=t=>{const id=Math.random();setToast(a=>[...a,{id,t}]);setTimeout(()=>setToast(a=>a.filter(x=>x.id!==id)),8000);};
 const loadB=async()=>{const {data}=await sb.from('businesses').select('*').limit(1);setB(data?.[0]||false);if(data?.[0])setTc(v=>v===''?String(data[0].table_count||0):v);};
 useEffect(()=>{if(u===null)r.replace('/login');if(!u)return;loadB();},[u]);
 useEffect(()=>{if(!b?.id)return;const id=b.id;
  const lr=async()=>{const {data}=await sb.from('reservations').select('*').eq('business_id',id).order('reservation_date',{ascending:false}).order('reservation_time',{ascending:false});setR(data||[]);};
  const lc=async()=>{const {data}=await sb.from('calls').select('*').eq('business_id',id).order('created_at',{ascending:false});setC(data||[]);};
  lr();lc().then(()=>{ready.current=true;});
  const a=live('r','reservations','business_id=eq.'+id,p=>{lr();if(p.eventType==='INSERT'&&ready.current){const x=p.new;push(`Masa ${x.table_number||'-'}, ${x.reservation_time} saatine rezerve edildi${x.customer_name?' ('+x.customer_name+')':''}`);}});
  const c=live('c','calls','business_id=eq.'+id,p=>{lc();if(p.eventType==='INSERT'&&ready.current&&p.new.orders)push(`${p.new.address||'Adres yok'} adresine: ${p.new.orders}`);});
  const d=live('b','businesses','id=eq.'+id,loadB);return()=>{a();c();d();};},[b?.id]);
 if(b===null)return null;if(b===false)return <div className="wrap"><p>Bu hesaba bağlı işletme yok.</p></div>;
 const s=usedSec(b),t=(b.quota_minutes_total||0)*60,p=t?Math.min(100,s/t*100):0,left=Math.max(0,Math.ceil((t-s)/60));
 const nm=tm(nowT()),td=res.filter(x=>x.reservation_date===today()&&['pending','confirmed'].includes(x.status));
 const orders=calls.filter(x=>x.orders);
 const book=async(n,time,name)=>{const {data,error}=await sb.rpc('book_table',{p_business:b.id,p_date:today(),p_time:time,p_name:name,p_phone:null,p_size:null,p_table:n,p_call:null,p_source:'manual'});if(error||!data?.ok)alert('Masa '+n+' o saatte dolu.');};
 const occupy=n=>book(n,nowT(),'Masada oturan');
 const reserve=n=>{const t=prompt('Saat (örn 19:30)');if(!t||!/^\d{1,2}[:.]\d{2}$/.test(t))return;book(n,t.replace('.',':').padStart(5,'0'),prompt('İsim (boş bırakılabilir)')||null);};
 const freeRes=async(id,n)=>{if(confirm('Masa '+n+' boşaltılsın mı?'))await sb.from('reservations').update({status:'completed'}).eq('id',id);};
 const tabs=[['t','Masalar'],['r','Rezervasyonlar'],['o','Siparişler'],['c','Çağrılar']];
 return <div className="wrap"><div className="toast">{toast.map(x=><div key={x.id}>{x.t}</div>)}</div>
 <div className="row"><div><h1>{b.name}</h1><p className="mut">Canlı güncellenir, yenilemenize gerek yok.</p></div><button className="g" onClick={()=>sb.auth.signOut()}>Çıkış</button></div>
 <div className="grid" style={{margin:'24px 0'}}><div className="card row"><div className="ring" style={{'--p':p}}><span>{left}<br/><small className="mut">dk kaldı</small></span></div><div><h2>Dakika kotası</h2><p className="mut">{Math.floor(s/60)} dk {s%60} sn kullanıldı<br/>Toplam {b.quota_minutes_total} dk</p>{b.status!=='active'&&<span className="tag x">Asistan durdu</span>}</div></div>
 <div className="card"><h2>Bugün</h2><h1>{td.length}</h1><p className="mut">rezervasyon · {orders.length} sipariş · {calls.length} çağrı</p></div></div>
 <div className="row" style={{justifyContent:'flex-start',marginBottom:14}}>{tabs.map(([k,l])=><button key={k} className={tab===k?'':'g'} onClick={()=>setT(k)}>{l}</button>)}</div>
 {tab==='t'&&<div className="card"><div className="row" style={{marginBottom:16}}><h2 style={{margin:0}}>Masalar (bugün)</h2><div className="row"><input style={{width:90,margin:0}} type="number" min="0" max="200" value={tc} onChange={e=>setTc(e.target.value)}/><button onClick={async()=>{await sb.rpc('set_table_count',{n:+tc||0});loadB();}}>Masa sayısını kaydet</button></div></div>
 {!b.table_count?<p className="mut">Masa sayınızı girip kaydedin, masalar burada görünür.</p>:<div className="tables">{Array.from({length:b.table_count},(_,i)=>{const n=i+1,rs=td.filter(x=>x.table_number===n&&tm(x.reservation_time)+(x.duration_minutes||120)>nm).sort((x,y)=>x.reservation_time.localeCompare(y.reservation_time));
 return <div key={n} className={'tb '+(rs.length?'busy':'free')}><b>Masa {n}</b>{rs.length?<small>{rs.map(x=><div key={x.id}>{x.reservation_time}{x.customer_name?' · '+x.customer_name:''} <a className="lnk" onClick={()=>freeRes(x.id,n)}>boşalt</a></div>)}</small>:<small>Boş</small>}<div className="mini"><button className="g" onClick={()=>occupy(n)}>Dolu yap</button><button className="g" onClick={()=>reserve(n)}>Rezerve</button></div></div>;})}</div>}</div>}
 {tab==='o'&&<div className="grid">{orders.map(x=><div className="card" key={x.id}><b>{x.customer_name||x.caller_phone}</b><p style={{margin:'8px 0'}}>{x.orders}</p><p className="mut">{x.address||'Adres belirtilmedi'} · {x.caller_phone}</p></div>)}{!orders.length&&<p className="mut">Henüz sipariş yok.</p>}</div>}
 {tab==='r'&&<div className="card" style={{overflowX:'auto'}}><table><thead><tr><th>Tarih</th><th>Saat</th><th>Ad</th><th>Kişi</th><th>Masa</th><th>Telefon</th></tr></thead><tbody>{res.map(x=><tr key={x.id}><td>{x.reservation_date}</td><td>{x.reservation_time}</td><td>{x.customer_name}</td><td>{x.party_size}</td><td>{x.table_number}</td><td>{x.customer_phone}</td></tr>)}</tbody></table>{!res.length&&<p className="mut" style={{padding:16}}>Henüz rezervasyon yok.</p>}</div>}
 {tab==='c'&&<div className="card" style={{overflowX:'auto'}}><table><thead><tr><th>Müşteri</th><th>Telefon</th><th>Süre</th><th>Özet</th></tr></thead><tbody>{calls.map(x=><tr key={x.id}><td>{x.customer_name||'-'}</td><td>{x.caller_phone}</td><td>{fmt(x.duration_seconds)}</td><td>{x.summary||'-'}</td></tr>)}</tbody></table>{!calls.length&&<p className="mut" style={{padding:16}}>Henüz çağrı yok.</p>}</div>}</div>;}
