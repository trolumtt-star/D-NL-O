'use client';
// İki adımlı doğrulama kartı: Google Authenticator / Microsoft Authenticator gibi uygulamalarla 6 haneli kod.
import {useEffect,useState} from 'react';
export default function Mfa({sb,zorunlu=false}){
 const [f,setF]=useState(null),[yeni,setYeni]=useState(null),[kod,setKod]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 const yukle=async()=>{const {data}=await sb.auth.mfa.listFactors();setF((data?.totp||[]).find(x=>x.status==='verified')||null);};
 useEffect(()=>{yukle();},[]);
 const baslat=async()=>{setBusy(true);setMsg('');const {data:l}=await sb.auth.mfa.listFactors();for(const x of (l?.all||[]).filter(x=>x.status!=='verified'))await sb.auth.mfa.unenroll({factorId:x.id});
  const {data,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'Dinlio '+Date.now()});setBusy(false);if(error){setMsg('Başlatılamadı: '+error.message);return;}setYeni(data);};
 const onayla=async()=>{setBusy(true);setMsg('');const {error}=await sb.auth.mfa.challengeAndVerify({factorId:yeni.id,code:kod.replace(/\D/g,'')});setBusy(false);
  if(error){setMsg('Kod hatalı, uygulamadaki güncel kodu girin.');return;}setYeni(null);setKod('');setMsg('İki adımlı doğrulama açıldı. Bir sonraki girişte kod istenecek.');yukle();};
 const kapat=async()=>{if(!confirm('İki adımlı doğrulama kapatılsın mı? Hesabınız daha az güvenli olur.'))return;const {error}=await sb.auth.mfa.unenroll({factorId:f.id});if(error)setMsg('Kapatılamadı: '+error.message);else{setMsg('Kapatıldı.');yukle();}};
 return <div className="card sec2"><h2>İki adımlı doğrulama</h2>
  <p className="mut">Şifreniz ele geçirilse bile kimse hesabınıza giremesin: girişte telefonunuzdaki doğrulama uygulamasından 6 haneli kod istenir.{zorunlu?' Yönetici hesabı için şiddetle önerilir.':''}</p>
  {f?<div className="row" style={{justifyContent:'flex-start',marginTop:8}}><span className="tag">Açık ✓</span><button className="g" onClick={kapat}>Kapat</button></div>
  :yeni?<div style={{marginTop:10}}><p>1. Telefonunuza <b>Google Authenticator</b> veya <b>Microsoft Authenticator</b> kurun.<br/>2. Uygulamada “QR kod tara” deyip aşağıdaki kodu okutun.<br/>3. Uygulamada çıkan 6 haneli kodu yazın.</p>
   <div style={{background:'#fff',display:'inline-block',padding:10,borderRadius:12,margin:'8px 0'}}><img src={yeni.totp.qr_code} alt="Doğrulama QR kodu" width="180" height="180"/></div>
   <p className="mut" style={{fontSize:'.8rem',wordBreak:'break-all'}}>QR okutamıyorsanız bu anahtarı elle girin: {yeni.totp.secret}</p>
   <div className="row" style={{justifyContent:'flex-start'}}><input style={{maxWidth:160,margin:0,letterSpacing:'.3em',textAlign:'center'}} inputMode="numeric" maxLength={6} placeholder="123456" value={kod} onChange={e=>setKod(e.target.value)}/><button disabled={busy||kod.replace(/\D/g,'').length!==6} onClick={onayla}>Onayla</button><button className="g" onClick={()=>setYeni(null)}>Vazgeç</button></div></div>
  :<button style={{marginTop:8}} disabled={busy} onClick={baslat}>Doğrulamayı aç</button>}
  {msg&&<p className="mut" style={{marginTop:8}}>{msg}</p>}</div>;}
