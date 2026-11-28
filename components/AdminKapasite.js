'use client';
// Admin → Genel bakış: kapasite uyarısı (en üstte kırmızı/sarı şerit) + doluluk çubukları + plan ayarları
import {useEffect,useState} from 'react';
const renk=y=>y>=90?'#dc2626':y>=70?'#d97706':'#16a34a';
export default function AdminKapasite({tok}){
 const [d,setD]=useState(null),[m,setM]=useState(''),[ac,setAc]=useState(false);
 const H=async()=>({'content-type':'application/json',authorization:'Bearer '+await tok()});
 const yukle=async()=>{try{const r=await fetch('/api/admin/kapasite',{headers:await H()});const j=await r.json();if(!r.ok)throw new Error(j.error);setD(j);}catch(e){setM(e.message);}};
 useEffect(()=>{yukle();},[]);
 const kaydet=async x=>{try{const r=await fetch('/api/admin/kapasite',{method:'POST',headers:await H(),body:JSON.stringify(x)});const j=await r.json();if(!r.ok)throw new Error(j.error);setD(j);}catch(e){setM(e.message);}};
 if(!d)return m?<p className="mut">{m}</p>:null;
 const kotu=d.kalemler.filter(x=>x.yuzde>=70).sort((a,b)=>b.yuzde-a.yuzde),en=kotu[0];
 return <>
  {en&&<div style={{background:en.yuzde>=90?'#dc2626':'#d97706',color:'#fff',borderRadius:12,padding:'14px 16px',margin:'0 0 14px',fontWeight:700}}>
   {en.yuzde>=90?'🔴 UYARI: SİSTEM ÇÖKEBİLİR!':'🟡 DİKKAT: KAPASİTE DOLMAK ÜZERE'}
   {kotu.map(x=><div key={x.id} style={{fontWeight:500,marginTop:6}}>{x.ad} <b>%{x.yuzde}</b> doldu — {x.cozum}</div>)}
   <div style={{fontWeight:500,marginTop:6,opacity:.9}}>Tetikte ol ve paketleri yükselt.</div></div>}
  <div className="card sec2"><div className="row" style={{justifyContent:'space-between',alignItems:'center'}}><h2 style={{margin:0}}>📊 Kapasite</h2><button className="g" onClick={()=>setAc(!ac)}>{ac?'Planları gizle':'Planlarım'}</button></div>
   <div style={{display:'grid',gap:10,marginTop:10}}>{d.kalemler.map(x=><div key={x.id}>
    <div className="row" style={{justifyContent:'space-between'}}><span>{x.ad}</span><b style={{color:renk(x.yuzde)}}>%{x.yuzde}</b></div>
    <div style={{height:8,background:'rgba(127,127,127,.2)',borderRadius:6,overflow:'hidden',marginTop:4}}><div style={{width:Math.max(2,x.yuzde)+'%',height:'100%',background:renk(x.yuzde)}}/></div>
    <div className="mut" style={{fontSize:'.8rem',marginTop:3}}>{x.detay}</div></div>)}</div>
   <p className="mut" style={{fontSize:'.8rem',marginTop:10}}>Bu ay: {d.olcum.arama_ay} arama, {d.olcum.dakika_ay} dakika · {d.olcum.aktif_isletme} aktif işletme. Vercel'in istek/kullanım miktarını buradan ölçemiyorum; ayda bir Vercel → Usage sayfasına bak. %80'i geçen her şey telefonuna bildirim olarak da gelir.</p>
   {ac&&<div style={{display:'grid',gap:8,marginTop:10}}>
    <label>Supabase planı <select value={d.ayar.supabase} onChange={e=>kaydet({supabase:e.target.value})}><option value="free">Ücretsiz (500 MB)</option><option value="pro">Pro (8 GB)</option></select></label>
    <label>Vercel planı <select value={d.ayar.vercel} onChange={e=>kaydet({vercel:e.target.value})}><option value="hobby">Ücretsiz (Hobby)</option><option value="pro">Pro</option></select></label>
    <label>Vapi aynı anda çağrı kanalı <input type="number" min="1" max="1000" defaultValue={d.ayar.vapiKanal} onBlur={e=>kaydet({vapiKanal:e.target.value})} style={{width:90}}/></label>
    <span className="mut" style={{fontSize:'.8rem'}}>Planı yükselttikten sonra buradan da değiştir ki yüzdeler doğru hesaplansın. Vapi kanal sayısını Vapi panelinde görebilirsin.</span></div>}</div></>;}
