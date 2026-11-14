'use client';
// Kurulum sohbeti: işletme sahibi işini anlatır, yapay zekâ sorular sorar; sonunda asistan otomatik oluşturulur ve tarayıcıdan denenir.
import {useEffect,useRef,useState} from 'react';import '@/components/ks.css';import {sb} from '@/lib/supabase';import SesliDeneme from '@/components/SesliDeneme';
const tok=async()=>(await sb.auth.getSession()).data.session?.access_token;
export default function Kurulum(){
 const [d,setD]=useState(null),[m,setM]=useState(''),[busy,setBusy]=useState(''),[err,setErr]=useState(''),[duzenle,setDuzenle]=useState(false);const akis=useRef(null);
 const api=async(meth,body)=>{const t=await tok();if(!t){location.replace('/login');throw new Error('');}const r=await fetch('/api/kurulum',{method:meth,headers:{'content-type':'application/json',authorization:'Bearer '+t},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 useEffect(()=>{(async()=>{try{let j=await api('GET');setD(j);if(!j.mesajlar.length&&!j.tamam){setBusy('soru');j=await api('POST',{});setD(j);setBusy('');}}catch(e){e.message&&setErr(e.message);setBusy('');}})();},[]);
 useEffect(()=>{akis.current&&(akis.current.scrollTop=akis.current.scrollHeight);},[d?.mesajlar?.length,busy]);
 const gonder=async()=>{const x=m.trim();if(!x||busy)return;setM('');setErr('');setD(o=>({...o,mesajlar:[...o.mesajlar,{r:'u',m:x}]}));setBusy('soru');
  try{setD(await api('POST',{mesaj:x}));}catch(e){setErr(e.message);setD(o=>({...o,mesajlar:o.mesajlar.slice(0,-1)}));setM(x);}setBusy('');};
 const olustur=async()=>{setBusy('olustur');setErr('');try{const j=await api('POST',{islem:'olustur'});setD(j);setDuzenle(false);}catch(e){setErr(e.message);}setBusy('');};
 if(!d)return <div className="ks"><div className="ks-w"><p className="ks-alt">{err||'Yükleniyor…'}</p></div></div>;
 // Asistan hazır: dene ve panele geç
 if(d.tamam&&!duzenle)return <div className="ks"><div className="ks-w">
  <div className="ks-top"><span className="ks-logo"><i>🎙</i><span>Dinlio <b>AI</b></span></span><a href="/panel" style={{color:'var(--ink2)',fontSize:'.9rem'}}>Panele git →</a></div>
  <h1>Asistanın <em>hazır!</em> 🎉</h1><p className="ks-alt">{d.isletme} için asistanın kuruldu. Şimdi bir müşteri gibi ara: sipariş ver, fiyat sor, randevu iste.</p>
  <div className="ks-kart"><SesliDeneme benim tok={tok}/></div>
  <a className="ks-btn" style={{display:'grid',placeItems:'center',textDecoration:'none'}} href="/panel">Panele geç</a>
  <button className="ks-btn g" onClick={async()=>{setDuzenle(true);setD(await api('POST',{islem:'sifirla'}));setBusy('soru');try{setD(await api('POST',{}));}catch(e){setErr(e.message);}setBusy('');}}>Bilgileri baştan anlat</button>
  <p style={{color:'var(--mute)',fontSize:'.82rem',marginTop:14,textAlign:'center'}}>Telefon numaranı bağlamak için panelde yönlendirme adımlarını göreceksin. Menü, fiyat ve saatleri panelden de değiştirebilirsin.</p></div></div>;
 return <div className="ks"><div className="ks-w ks-sohbet" style={{paddingBottom:0}}>
  <div className="ks-top" style={{marginBottom:10}}><span className="ks-logo"><i>🎙</i><span>Asistanını <b>kur</b></span></span><a href="/panel" style={{color:'var(--mute)',fontSize:'.85rem'}}>Sonra</a></div>
  <div className="ks-ilerle"><i style={{width:Math.max(4,d.ilerleme||0)+'%'}}/></div>
  <div className="ks-akis" ref={akis}>{d.mesajlar.map((x,i)=><div key={i} className={'ks-m '+x.r}>{x.m}</div>)}{busy==='soru'&&<div className="ks-yaziyor"><i/><i/><i/></div>}
   {d.bitti&&<div className="ks-kart" style={{marginTop:6}}><b>Bilgiler tamam.</b><p className="ks-alt" style={{margin:'6px 0 0'}}>Asistanın bu bilgilerle kurulacak. İstersen yazmaya devam edip bir şey ekleyebilirsin.</p>
    <button className="ks-btn" disabled={busy==='olustur'} onClick={olustur}>{busy==='olustur'?'Asistanın oluşturuluyor… (30 sn kadar)':'✨ Asistanımı oluştur'}</button></div>}
   {!d.bitti&&d.mesajlar.length>=6&&<button className="ks-btn g" style={{marginTop:4}} disabled={!!busy} onClick={olustur}>{busy==='olustur'?'Oluşturuluyor…':'Bu kadarı yeter, asistanımı oluştur'}</button>}
   {err&&<div className="ks-hata">{err}</div>}</div>
  <div className="ks-alt-bar"><textarea rows={1} value={m} onChange={e=>setM(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();gonder();}}} placeholder="Cevabını yaz… (menünü olduğu gibi yapıştırabilirsin)" disabled={busy==='olustur'}/>
   <button className="ni ks-gonder" onClick={gonder} disabled={!!busy} aria-label="Gönder">➤</button></div></div></div>;}
