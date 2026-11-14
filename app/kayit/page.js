'use client';
// Ücretsiz hesap: 7 gün deneme. Kayıttan sonra kurulum sohbetine geçer.
import {useEffect,useState} from 'react';import '@/components/ks.css';import {sb} from '@/lib/supabase';
export default function Kayit(){
 const [s,setS]=useState(null),[f,setF]=useState({ad:'',isletme:'',sektor:'',tel:'',eposta:'',sifre:'',kvkk:false,web:''}),[q,setQ]=useState({}),[busy,setBusy]=useState(false),[err,setErr]=useState('');
 useEffect(()=>{const u=new URLSearchParams(location.search);setQ({paket:u.get('paket'),all:u.get('all')==='1',yil:u.get('yil')==='1'});fetch('/api/kayit').then(r=>r.json()).then(setS).catch(()=>{});},[]);
 const gonder=async e=>{e.preventDefault();setErr('');setBusy(true);
  try{const r=await fetch('/api/kayit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...f,...q})});const j=await r.json();if(!r.ok)throw new Error(j.error);
   const {error}=await sb.auth.signInWithPassword({email:f.eposta.trim().toLowerCase(),password:f.sifre});if(error)throw new Error('Hesap açıldı ama giriş yapılamadı, giriş sayfasından deneyin.');
   location.replace('/kurulum');}catch(e2){setErr(e2.message||'Bir hata oldu.');setBusy(false);}};
 const sec=s?.sektorler||[],pk=s?.paketler?.find(p=>p.id===q.paket);
 return <div className="ks"><div className="ks-w">
  <div className="ks-top"><a className="ks-logo" href="/"><i>🎙</i><span>Dinlio <b>AI</b></span></a><a href="/login" style={{color:'var(--ink2)',fontSize:'.9rem'}}>Giriş yap</a></div>
  <h1>Asistanını <em>3 dakikada</em> kendin kur.</h1>
  <p className="ks-alt">Hesabını aç, işini anlat; yapay zekâ senin için telefon asistanını hazırlasın. {s?.deneme?.gun||7} gün ücretsiz, kart bilgisi istemiyoruz.</p>
  <div className="ks-pills"><span className="ks-pill">✓ <b>{s?.deneme?.gun||7} gün</b> ücretsiz</span><span className="ks-pill">✓ Kurulum ücreti yok</span>{pk&&<span className="ks-pill">Seçilen: <b>{pk.ad}{q.all?' All in one':''}{q.yil?' · yıllık':''}</b></span>}</div>
  <form className="ks-kart" style={{marginTop:14}} onSubmit={gonder}>
   <label>Adın soyadın</label><input value={f.ad} onChange={e=>setF({...f,ad:e.target.value})} autoComplete="name" required/>
   <label>İşletmenin adı</label><input value={f.isletme} onChange={e=>setF({...f,isletme:e.target.value})} placeholder="ör. Beyzade Kebap" required/>
   <label>Sektörün</label><div className="ks-sec">{sec.map(x=><button type="button" key={x.id} className={'ni '+(f.sektor===x.id?'secili':'')} onClick={()=>setF({...f,sektor:x.id})}>{x.name}</button>)}</div>
   <label>Telefon</label><input value={f.tel} onChange={e=>setF({...f,tel:e.target.value})} inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" required/>
   <label>E-posta</label><input type="email" value={f.eposta} onChange={e=>setF({...f,eposta:e.target.value})} autoComplete="email" required/>
   <label>Şifre</label><input type="password" value={f.sifre} onChange={e=>setF({...f,sifre:e.target.value})} autoComplete="new-password" placeholder="En az 8 karakter, harf ve rakam" required/>
   <input tabIndex={-1} autoComplete="off" value={f.web} onChange={e=>setF({...f,web:e.target.value})} style={{position:'absolute',left:'-9999px',width:1,height:1,opacity:0}} aria-hidden="true"/>
   <label className="ks-ok"><input type="checkbox" checked={f.kvkk} onChange={e=>setF({...f,kvkk:e.target.checked})}/><span><a href="/yasal/kvkk" target="_blank">KVKK aydınlatma metnini</a> okudum, <a href="/yasal/sozlesme" target="_blank">hizmet sözleşmesini</a> kabul ediyorum.</span></label>
   {err&&<div className="ks-hata">{err}</div>}
   <button className="ks-btn" disabled={busy||!f.sektor||!f.kvkk}>{busy?'Hesabın açılıyor…':'Ücretsiz hesabımı aç'}</button>
   {!f.sektor&&<p style={{color:'var(--mute)',fontSize:'.8rem',marginTop:8,textAlign:'center'}}>Sektörünü seç</p>}</form></div></div>;}
