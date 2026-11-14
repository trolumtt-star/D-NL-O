'use client';
// Tarayıcıdan sesli görüşme (Vapi Web). demo: sitedeki canlı demo; benim: işletmenin kendi asistanı (panel).
import {useEffect,useRef,useState} from 'react';
export default function SesliDeneme({benim=false,tok=null,kisa=false}){
 const [d,setD]=useState('hazir'),[hata,setHata]=useState(''),[v,setV]=useState(1),[sn,setSn]=useState(0),[yazi,setYazi]=useState([]),[ad,setAd]=useState('');
 const vr=useRef(null),t0=useRef(0),kutu=useRef(null);
 useEffect(()=>{if(d!=='konusuyor')return;const i=setInterval(()=>setSn(Math.floor((Date.now()-t0.current)/1000)),500);return()=>clearInterval(i);},[d]);
 useEffect(()=>()=>{try{vr.current?.stop();}catch{}},[]);
 useEffect(()=>{kutu.current&&(kutu.current.scrollTop=kutu.current.scrollHeight);},[yazi]);
 const basla=async()=>{if(d==='konusuyor'||d==='baglaniyor'){try{vr.current?.stop();}catch{}setD('bitti');return;}
  setHata('');setYazi([]);setD('baglaniyor');
  try{const r=await fetch('/api/demo'+(benim?'?benim=1':''),{headers:tok?{authorization:'Bearer '+await tok()}:{}});const j=await r.json();if(!r.ok)throw new Error(j.error||'Bağlantı hatası');setAd(j.ad||'');
   const {default:Vapi}=await import('@vapi-ai/web');const vapi=new Vapi(j.publicKey);vr.current=vapi;
   vapi.on('call-start',()=>{t0.current=Date.now();setSn(0);setD('konusuyor');});
   vapi.on('call-end',()=>{setD('bitti');setV(1);});
   vapi.on('volume-level',x=>setV(1+Math.min(1,x*2.2)*.35));
   vapi.on('message',m=>{if(m?.type==='transcript'&&m.transcriptType==='final')setYazi(y=>[...y.slice(-11),{r:m.role==='user'?'u':'a',m:m.transcript}]);});
   vapi.on('error',e=>{setHata(String(e?.error?.message||e?.message||'Görüşme kesildi.').slice(0,160));setD('bitti');});
   await vapi.start(j.assistantId);}
  catch(e){setHata(/permission|NotAllowed/i.test(String(e?.name||e?.message))?'Mikrofon izni verilmedi. Tarayıcı ayarlarından mikrofona izin verin.':e.message||'Görüşme başlatılamadı.');setD('hazir');}};
 const metin={hazir:benim?'Asistanını dene':'Asistanla konuş',baglaniyor:'Bağlanıyor…',konusuyor:'Dinliyor… konuşabilirsin',bitti:'Görüşme bitti'}[d];
 return <div className="ks-ses">
  <button className={'ni ks-kure'+(d==='konusuyor'?' on':'')} style={{'--v':v}} onClick={basla} aria-label={d==='konusuyor'?'Görüşmeyi bitir':'Görüşmeyi başlat'}>
   {d==='konusuyor'?<svg width="60" height="60" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>
    :<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" fill="#fff"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>}</button>
  <div className="ks-durum">{metin}</div>
  <div className="ks-sure">{d==='konusuyor'?`${String(Math.floor(sn/60)).padStart(2,'0')}:${String(sn%60).padStart(2,'0')}${!benim?' / 02:00':''}`:d==='hazir'?(benim?'Kendi asistanınla tarayıcıdan konuş':`Bir dönerciyi arıyorsun${kisa?'':': sipariş ver, fiyat sor, adres tarif et'}`):d==='bitti'?'Tekrar denemek için küreye dokun':(ad||' ')}</div>
  {hata&&<div className="ks-hata">{hata}</div>}
  {yazi.length>0&&<div className="ks-yazi" ref={kutu}>{yazi.map((x,i)=><div key={i} className={'ks-m '+x.r}>{x.m}</div>)}</div>}</div>;}
