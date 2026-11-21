'use client';
// MASADAN QR SİPARİŞ: müşteri masadaki QR'ı okutunca açılır. Menü herkese açıktır; sipariş ve garson çağrısı için
// masadaki QR'ın imzası gerekir. İmza adres çubuğundan silinir: link başkasına gönderilirse orada sipariş verilemez,
// masadaki QR'ın canlı kamerayla tekrar okutulması istenir.
import {useEffect,useMemo,useRef,useState} from 'react';
const TL=n=>(Math.round(n*100)/100).toLocaleString('tr-TR')+' ₺';
const rasgele=()=>{const a=new Uint8Array(16);crypto.getRandomValues(a);return Array.from(a,x=>'abcdefghijklmnopqrstuvwxyz0123456789'[x%36]).join('');};
const oku=(k,v)=>{try{const x=JSON.parse(sessionStorage.getItem(k)||'null');return x&&(!x.son||x.son>Date.now())?x:v;}catch{return v;}};
const yaz=(k,v)=>{try{sessionStorage.setItem(k,JSON.stringify(v));}catch{}};
function QROkut({kod,kapat,bulundu}){
 const vid=useRef(null),[h,setH]=useState('');
 useEffect(()=>{let akis=null,dur=false,tespit=null,jsqr=null;const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
  const coz=s=>{try{const u=new URL(s);const p=u.pathname.split('/').filter(Boolean);if(p[0]==='masa'&&p[1]===kod&&u.searchParams.get('m')&&u.searchParams.get('t'))return {m:u.searchParams.get('m'),t:u.searchParams.get('t')};}catch{}return null;};
  const dongu=async()=>{if(dur)return;const v=vid.current;if(v&&v.readyState>=2){let metin=null;
    try{if(tespit){const r=await tespit.detect(v);metin=r?.[0]?.rawValue||null;}
     else if(jsqr){const w=Math.min(640,v.videoWidth),hh=Math.round(v.videoHeight*w/v.videoWidth);cv.width=w;cv.height=hh;cx.drawImage(v,0,0,w,hh);const d=cx.getImageData(0,0,w,hh);metin=jsqr(d.data,w,hh)?.data||null;}}catch{}
    if(metin){const r=coz(metin);if(r){dur=true;bulundu(r);return;}setH('Bu QR bu işletmenin masa QR\'ı değil.');}}
   setTimeout(dongu,250);};
  (async()=>{try{if('BarcodeDetector' in window){try{tespit=new window.BarcodeDetector({formats:['qr_code']});}catch{tespit=null;}}
    if(!tespit){try{jsqr=(await import('jsqr')).default;}catch{}}
    if(!tespit&&!jsqr){setH('Bu tarayıcı QR okuyamıyor. Lütfen telefonunuzun kamerasıyla masadaki QR\'ı tekrar okutun.');return;}
    akis=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});if(dur){akis.getTracks().forEach(t=>t.stop());return;}
    vid.current.srcObject=akis;await vid.current.play();dongu();}catch(e){setH('Kamera açılamadı. İzin verin ya da telefonunuzun kamerasıyla masadaki QR\'ı tekrar okutun.');}})();
  return()=>{dur=true;akis?.getTracks().forEach(t=>t.stop());};},[]);
 return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.92)',zIndex:50,display:'grid',placeItems:'center',padding:16}}>
  <div style={{width:'100%',maxWidth:420,textAlign:'center',color:'#fff'}}><h2 style={{margin:'0 0 6px'}}>Masadaki QR'ı okutun</h2>
   <p style={{color:'#bbb',margin:'0 0 12px'}}>Siparişin gerçekten masanızdan geldiğini doğrulamak için, bir kereye mahsus.</p>
   <video ref={vid} playsInline muted style={{width:'100%',borderRadius:16,background:'#111',aspectRatio:'1/1',objectFit:'cover'}}/>
   {h&&<p style={{color:'#ffcf5a'}}>{h}</p>}
   <button className="ni" onClick={kapat} style={{marginTop:12,padding:'12px 24px',borderRadius:10,border:'1px solid #444',background:'transparent',color:'#fff'}}>Vazgeç</button></div></div>;}
export default function Masa({params}){
 const kod=params.kod,[d,setD]=useState(null),[hata,setHata]=useState(''),[sepet,setSepet]=useState({}),[not,setNot]=useState(''),[gonder,setGonder]=useState(false),[mesaj,setMesaj]=useState(''),[okut,setOkut]=useState(null),[gecmis,setGecmis]=useState([]),[kat,setKat]=useState('');
 const imzaK='masa_imza_'+kod,ortK='masa_oturum_'+kod;
 const imza=()=>oku(imzaK,null);
 const yukle=async(m,t)=>{const r=await fetch(`/api/masa?k=${encodeURIComponent(kod)}${m?'&m='+encodeURIComponent(m):''}${t?'&t='+encodeURIComponent(t):''}`,{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error);return j;};
 useEffect(()=>{(async()=>{try{const u=new URL(location.href),m=u.searchParams.get('m'),t=u.searchParams.get('t');let j;
   if(m&&t){j=await yukle(m,t);if(j.dogru)yaz(imzaK,{m,t,son:Date.now()+3*36e5});history.replaceState(null,'',location.pathname+'?m='+m);}
   else{const s=imza();j=await yukle(s?.m||m,s?.t);}
   setD(j);setGecmis(oku('masa_gecmis_'+kod,{l:[]}).l||[]);}catch(e){setHata(e.message);}})();},[]);
 const oturum=()=>{let o=oku(ortK,null);if(!o){o={id:rasgele(),son:Date.now()+4*36e5};yaz(ortK,o);}return o.id;};
 const kategoriler=useMemo(()=>[...new Set((d?.menu||[]).map(x=>x.kategori))],[d]);
 const kalemler=Object.entries(sepet).filter(([,a])=>a>0).map(([id,adet])=>({...d.menu.find(x=>x.id===id),adet})).filter(x=>x.ad);
 const toplam=kalemler.reduce((t,x)=>t+x.adet*x.fiyat,0);
 const degis=(id,f)=>setSepet(s=>({...s,[id]:Math.max(0,Math.min(20,(s[id]||0)+f))}));
 // İmza yoksa (link paylaşılmış ya da süre dolmuş) önce masadaki QR canlı okutulur, sonra istenen işlem yapılır
 const imzaliYap=async is=>{const s=imza();if(s){await is(s);return;}setOkut(()=>async r=>{setOkut(null);try{const j=await yukle(r.m,r.t);if(!j.dogru)throw new Error('QR doğrulanamadı.');yaz(imzaK,{m:r.m,t:r.t,son:Date.now()+3*36e5});setD(j);await is(r);}catch(e){setMesaj(e.message);}});};
 const siparis=()=>imzaliYap(async s=>{setGonder(true);setMesaj('');
  try{const r=await fetch('/api/masa',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({islem:'siparis',k:kod,m:s.m,t:s.t,oturum:oturum(),not,sepet:kalemler.map(x=>({id:x.id,adet:x.adet}))})});
   const j=await r.json();if(!r.ok){if(r.status===403&&/QR/.test(j.error||''))yaz(imzaK,null);throw new Error(j.error);}
   const g=[{zaman:Date.now(),metin:kalemler.map(x=>x.adet+'× '+x.ad).join(', '),tutar:j.tutar,onay:j.masaOnay},...gecmis].slice(0,10);setGecmis(g);yaz('masa_gecmis_'+kod,{l:g,son:Date.now()+6*36e5});
   setSepet({});setNot('');setMesaj('✅ '+j.mesaj);window.scrollTo({top:0,behavior:'smooth'});}catch(e){setMesaj(e.message);}setGonder(false);});
 const cagir=tur=>imzaliYap(async s=>{try{const r=await fetch('/api/masa',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({islem:'cagri',tur,k:kod,m:s.m,t:s.t})});const j=await r.json();if(!r.ok)throw new Error(j.error);setMesaj('✅ '+j.mesaj);}catch(e){setMesaj(e.message);}});
 const B={border:'none',borderRadius:10,cursor:'pointer',fontWeight:800};
 if(hata)return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#050505',color:'#fff',padding:20,textAlign:'center'}}><p>{hata}</p></div>;
 if(!d)return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#050505',color:'#aaa'}}>Menü yükleniyor…</div>;
 const masa=imza()?.m||d.masa;
 return <div style={{minHeight:'100vh',background:'#050505',color:'#fff',paddingBottom:kalemler.length?150:40}}>
  {okut&&<QROkut kod={kod} kapat={()=>setOkut(null)} bulundu={okut}/>}
  <div style={{padding:'18px 16px 8px',position:'sticky',top:0,background:'#050505',zIndex:5,borderBottom:'1px solid #1d1d20'}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}><div><b style={{fontSize:'1.3rem'}}>{d.isletme}</b><div style={{color:'#aaa',fontSize:'.9rem'}}>{masa?`Masa ${masa}`:'Menü'}</div></div>
    {d.siparisAcik&&<div style={{display:'flex',gap:6}}><button className="ni" style={{...B,padding:'9px 10px',background:'#1f1f23',color:'#fff'}} onClick={()=>cagir('garson')}>🙋 Garson</button>
     <button className="ni" style={{...B,padding:'9px 10px',background:'#1f1f23',color:'#fff'}} onClick={()=>cagir('hesap')}>💳 Hesap</button></div>}</div>
   {kategoriler.length>1&&<div style={{display:'flex',gap:6,overflowX:'auto',marginTop:10,paddingBottom:4}}>{['',...kategoriler].map(k=><button key={k||'tum'} className="ni" onClick={()=>setKat(k)}
    style={{...B,whiteSpace:'nowrap',padding:'7px 12px',fontWeight:700,background:kat===k?'#ff1f3d':'#1f1f23',color:'#fff'}}>{k||'Tümü'}</button>)}</div>}</div>
  {mesaj&&<div style={{margin:'12px 16px',padding:12,borderRadius:12,background:mesaj.startsWith('✅')?'#0f2a1a':'#2a1414',color:mesaj.startsWith('✅')?'#7ee2a8':'#ff9b9b'}}>{mesaj}</div>}
  {!d.siparisAcik&&<p style={{margin:'12px 16px',color:'#aaa'}}>Bu işletmede masadan sipariş şu an kapalı. Siparişiniz için garsona seslenebilirsiniz.</p>}
  {gecmis.length>0&&<details style={{margin:'12px 16px',color:'#bbb'}}><summary>Bu masadaki siparişleriniz ({gecmis.length})</summary>{gecmis.map((g,i)=><div key={i} style={{padding:'6px 0',borderBottom:'1px solid #1d1d20'}}>{new Date(g.zaman).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})} · {g.metin} · {TL(g.tutar||0)}{g.onay==='bekliyor'?' · garson onayı bekleniyor':''}</div>)}</details>}
  <div style={{padding:'4px 16px'}}>{kategoriler.filter(k=>!kat||k===kat).map(k=><div key={k}><h3 style={{margin:'18px 0 8px',color:'#ff5a6e'}}>{k}</h3>
   {d.menu.filter(x=>x.kategori===k).map(x=><div key={x.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,padding:'12px 0',borderBottom:'1px solid #1d1d20'}}>
    <div><div style={{fontWeight:700}}>{x.ad}</div><div style={{color:'#aaa'}}>{x.fiyat?TL(x.fiyat):''}</div></div>
    {d.siparisAcik&&(sepet[x.id]?<div style={{display:'flex',alignItems:'center',gap:10}}><button className="ni" style={{...B,width:36,height:36,background:'#1f1f23',color:'#fff'}} onClick={()=>degis(x.id,-1)}>−</button><b>{sepet[x.id]}</b><button className="ni" style={{...B,width:36,height:36,background:'#ff1f3d',color:'#fff'}} onClick={()=>degis(x.id,1)}>+</button></div>
     :<button className="ni" style={{...B,padding:'9px 16px',background:'#ff1f3d',color:'#fff'}} onClick={()=>degis(x.id,1)}>Ekle</button>)}</div>)}</div>)}</div>
  {d.siparisAcik&&kalemler.length>0&&<div style={{position:'fixed',left:0,right:0,bottom:0,background:'#0c0c0e',borderTop:'1px solid #26262a',padding:'12px 16px calc(12px + env(safe-area-inset-bottom))',zIndex:10}}>
   <input value={not} onChange={e=>setNot(e.target.value)} maxLength={200} placeholder="Not (ör. acısız olsun)" style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #2a2a2e',background:'#141416',color:'#fff',marginBottom:8}}/>
   <button className="ni" disabled={gonder} onClick={siparis} style={{...B,width:'100%',padding:'15px',fontSize:'1.1rem',background:'#ff1f3d',color:'#fff'}}>{gonder?'Gönderiliyor…':`Siparişi gönder · ${kalemler.reduce((t,x)=>t+x.adet,0)} ürün · ${TL(toplam)}`}</button></div>}
 </div>;}
