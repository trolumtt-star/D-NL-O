'use client';
// MUTFAK EKRANI: mutfaktaki tablet/TV'de açık durur. Yeni siparişte zil çalar, ekran kapanmaz.
import {useEffect,useRef,useState} from 'react';
const dk=t=>Math.max(0,Math.floor((Date.now()-new Date(t).getTime())/6e4));
const renk=m=>m>=20?'#ff3b3b':m>=10?'#ffb020':'#3ddc84';
function zil(ctx){if(!ctx)return;try{const t=ctx.currentTime;[0,0.22,0.44].forEach((d,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=[880,1175,1568][i];
 g.gain.setValueAtTime(0.0001,t+d);g.gain.exponentialRampToValueAtTime(0.5,t+d+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+d+0.2);o.connect(g).connect(ctx.destination);o.start(t+d);o.stop(t+d+0.22);});}catch{}}
export default function Mutfak({params}){
 const kod=params.kod,[d,setD]=useState(null),[hata,setHata]=useState(''),[bas,setBas]=useState(false),[,tik]=useState(0),[mesgul,setMesgul]=useState('');
 const ctx=useRef(null),gorulen=useRef(null),kilit=useRef(null);
 const isle=j=>{const ids=new Set([...j.yeni,...j.masaOnay,...j.cagrilar].map(x=>x.id));
  if(gorulen.current){const yeni=[...ids].some(i=>!gorulen.current.has(i));if(yeni)zil(ctx.current);}gorulen.current=ids;setD(j);setHata('');};
 const yukle=async()=>{try{const r=await fetch('/api/mutfak?k='+encodeURIComponent(kod),{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error);isle(j);}catch(e){setHata(e.message||'Bağlantı yok, tekrar deneniyor…');}};
 useEffect(()=>{yukle();const a=setInterval(yukle,4000),b=setInterval(()=>tik(x=>x+1),20000);
  const g=()=>{if(document.visibilityState==='visible'){yukle();if(kilit.current===null&&bas)ekranAcik();}};document.addEventListener('visibilitychange',g);
  return()=>{clearInterval(a);clearInterval(b);document.removeEventListener('visibilitychange',g);};},[]);
 const ekranAcik=async()=>{try{kilit.current=await navigator.wakeLock?.request('screen');kilit.current?.addEventListener?.('release',()=>{kilit.current=null;});}catch{}};
 const basla=async()=>{try{ctx.current=new (window.AudioContext||window.webkitAudioContext)();zil(ctx.current);}catch{}ekranAcik();try{await document.documentElement.requestFullscreen?.();}catch{}setBas(true);};
 const islem=async(id,islem)=>{setMesgul(id+islem);try{const r=await fetch('/api/mutfak',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({k:kod,id,islem})});const j=await r.json();if(!r.ok)throw new Error(j.error);isle(j);}catch(e){alertYok(e.message);}setMesgul('');};
 const alertYok=m=>setHata(m);
 const etiket=x=>x.kaynak==='masa'?`🍽 Masa ${x.masa}`:x.kaynak==='gelal'?'🛍 Gel-al':'🛵 Paket';
 const Kart=({x,butonlar})=>{const m=dk(x.durum==='ready'&&x.hazirAt?x.hazirAt:x.zaman);
  return <div style={{background:'#141416',border:'1px solid #2a2a2e',borderLeft:`6px solid ${x.acil?'#ff3b3b':renk(x.durum==='ready'?0:m)}`,borderRadius:14,padding:'14px 16px',marginBottom:12}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}><b style={{fontSize:'1.25rem'}}>{etiket(x)}{x.acil?' 🚨':''}</b>
    <span style={{fontWeight:800,color:x.durum==='ready'?'#9aa':renk(m),fontSize:'1.1rem'}}>{x.durum==='ready'?'hazır · ':''}{m} dk</span></div>
   <div style={{fontSize:'1.35rem',lineHeight:1.35,margin:'8px 0',fontWeight:600}}>{x.siparis}</div>
   {x.not&&<div style={{color:'#ffcf5a',fontSize:'1.05rem'}}>📝 {x.not}</div>}
   <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>{butonlar.map(([ad,is,ana])=><button key={is} className="ni" disabled={!!mesgul} onClick={()=>islem(x.id,is)}
    style={{flex:ana?2:1,padding:'14px 10px',fontSize:'1.05rem',fontWeight:800,borderRadius:10,border:'none',cursor:'pointer',background:ana?'#ff1f3d':'#2a2a2e',color:'#fff'}}>{mesgul===x.id+is?'…':ad}</button>)}</div></div>;};
 const Sutun=({b,l,bos,but})=><div style={{flex:1,minWidth:280}}><h2 style={{margin:'0 0 12px',fontSize:'1.2rem',color:'#bbb'}}>{b} <span style={{color:'#fff'}}>({l.length})</span></h2>
  {l.length?l.map(x=><Kart key={x.id} x={x} butonlar={but(x)}/>):<p style={{color:'#666'}}>{bos}</p>}</div>;
 if(!bas)return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#050505',color:'#fff',padding:20,textAlign:'center'}}><div>
  <div style={{fontSize:'3rem'}}>👨‍🍳</div><h1 style={{margin:'8px 0'}}>{d?.isletme||'Mutfak ekranı'}</h1>
  {hata?<p style={{color:'#ff6b6b'}}>{hata}</p>:<p style={{color:'#aaa',maxWidth:420}}>Yeni siparişler burada anında görünür ve zil çalar. Ekran açık kalır.</p>}
  {!hata||d?<button className="ni" onClick={basla} style={{marginTop:16,padding:'16px 32px',fontSize:'1.2rem',fontWeight:800,border:'none',borderRadius:12,background:'#ff1f3d',color:'#fff',cursor:'pointer'}}>▶ Başlat (sesi aç)</button>:null}</div></div>;
 return <div style={{minHeight:'100vh',background:'#050505',color:'#fff',padding:'16px 18px',fontFamily:'inherit'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><b style={{fontSize:'1.3rem'}}>👨‍🍳 {d?.isletme}</b>
   <span style={{color:hata?'#ff6b6b':'#3ddc84',fontSize:'.9rem'}}>{hata||'● Canlı'}</span></div>
  {d?.cagrilar?.length>0&&<div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:12}}>{d.cagrilar.map(c=><button key={c.id} className="ni" onClick={()=>islem(c.id,'cagri_kapat')}
   style={{background:c.tur==='hesap'?'#2563eb':'#f59e0b',color:'#fff',border:'none',borderRadius:12,padding:'12px 16px',fontSize:'1.1rem',fontWeight:800,cursor:'pointer'}}>{c.tur==='hesap'?'💳 Hesap':'🙋 Garson'} · Masa {c.masa} · {dk(c.zaman)} dk ✓</button>)}</div>}
  {d?.masaOnay?.length>0&&<div style={{background:'#1d1406',border:'1px solid #f59e0b',borderRadius:14,padding:12,marginBottom:12}}><b style={{color:'#ffcf5a'}}>Garson onayı bekleyen masa siparişleri</b>
   <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:10}}>{d.masaOnay.map(x=><div key={x.id} style={{minWidth:260,flex:1}}><Kart x={x} butonlar={[['Reddet','masa_red'],['Masa doğru, onayla','masa_onay',true]]}/></div>)}</div></div>}
  <div style={{display:'flex',gap:16,flexWrap:'wrap',alignItems:'flex-start'}}>
   <Sutun b="Yeni" l={d?.yeni||[]} bos="Yeni sipariş yok." but={()=>[['Hazır','hazir'],['Hazırlamaya başla','hazirla',true]]}/>
   <Sutun b="Hazırlanıyor" l={d?.hazirlaniyor||[]} bos="—" but={()=>[['↩','geri'],['Hazır','hazir',true]]}/>
   <Sutun b="Hazır" l={d?.hazir||[]} bos="—" but={x=>x.kaynak==='masa'?[['↩','geri'],['Servis edildi','servis',true]]:[['↩','geri']]}/></div>
  {d?.teyit?.length>0&&<div style={{marginTop:8,color:'#999'}}><b>Patron teyidi bekleyen ({d.teyit.length}):</b> {d.teyit.map(x=><span key={x.id} style={{marginRight:12}}>⚠ {etiket(x)}: {String(x.siparis).slice(0,40)}</span>)}
   <div style={{fontSize:'.85rem'}}>Bunları hazırlamayın; işletme sahibi müşteriyi arayıp onaylayınca "Yeni" sütununa geçer.</div></div>}
 </div>;}
