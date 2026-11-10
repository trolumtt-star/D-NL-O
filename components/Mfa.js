'use client';
// İki adımlı doğrulama kartı. Varsayılan: kendi "Dinlio Kod" sayfamız (telefona bir kez QR ile eşleşir, kodu tek tıkla kopyalatır).
// İsteyen Google / Microsoft Authenticator da kullanabilir; ikisi de aynı standart (TOTP) kodu üretir.
import {useEffect,useState} from 'react';
export default function Mfa({sb,zorunlu=false}){
 const [f,setF]=useState(null),[yeni,setYeni]=useState(null),[kod,setKod]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[tur,setTur]=useState('dinlio'),[qr,setQr]=useState(''),[link,setLink]=useState(''),[mobil,setMobil]=useState(false);
 const yukle=async()=>{const {data}=await sb.auth.mfa.listFactors();setF((data?.totp||[]).find(x=>x.status==='verified')||null);};
 useEffect(()=>{yukle();setMobil(/android|iphone|ipad|ipod/i.test(navigator.userAgent));},[]);
 useEffect(()=>{if(!yeni)return;(async()=>{const {data:{user}}=await sb.auth.getUser();const ad=String(user?.email||'').replace(/@isletme\.panel$/,'');
  const l=location.origin+'/kod#'+new URLSearchParams({s:yeni.totp.secret,a:ad||'Dinlio hesabı'}).toString();setLink(l);
  try{const Q=(await import('qrcode')).default;setQr(await Q.toDataURL(l,{width:360,margin:1,errorCorrectionLevel:'M'}));}catch{setQr('');}})();},[yeni]);
 const baslat=async()=>{setBusy(true);setMsg('');const {data:l}=await sb.auth.mfa.listFactors();for(const x of (l?.all||[]).filter(x=>x.status!=='verified'))await sb.auth.mfa.unenroll({factorId:x.id});
  const {data,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'Dinlio '+Date.now()});setBusy(false);if(error){setMsg('Başlatılamadı: '+error.message);return;}setTur('dinlio');setYeni(data);};
 const onayla=async()=>{setBusy(true);setMsg('');const {error}=await sb.auth.mfa.challengeAndVerify({factorId:yeni.id,code:kod.replace(/\D/g,'')});setBusy(false);
  if(error){setMsg('Kod hatalı ya da süresi doldu. Telefondaki güncel kodu girin.');return;}setYeni(null);setKod('');setQr('');setLink('');setMsg('İki adımlı doğrulama açıldı. Bir sonraki girişte telefondaki kod istenecek.');yukle();};
 const kapat=async()=>{if(!confirm('İki adımlı doğrulama kapatılsın mı? Hesabınız daha az güvenli olur.'))return;const {error}=await sb.auth.mfa.unenroll({factorId:f.id});if(error)setMsg('Kapatılamadı: '+error.message);else{setMsg('Kapatıldı. Telefondaki Dinlio Kod kaydını da "Kaldır" ile silebilirsiniz.');yukle();}};
 const sekme=(k,t)=><button type="button" className={tur===k?'':'g'} onClick={()=>setTur(k)} style={{padding:'6px 12px'}}>{t}</button>;
 const kutu=src=><div style={{background:'#fff',display:'inline-block',padding:10,borderRadius:12,margin:'8px 0'}}>{src?<img src={src} alt="Eşleştirme QR kodu" width="190" height="190"/>:<div style={{width:190,height:190}}/>}</div>;
 return <div className="card sec2"><h2>İki adımlı doğrulama</h2>
  <p className="mut">Şifreniz ele geçirilse bile kimse hesabınıza giremesin: girişte sadece sizin telefonunuzun ürettiği 6 haneli kod istenir.{zorunlu?' Yönetici hesabı için şiddetle önerilir.':''}</p>
  {f?<div className="row" style={{justifyContent:'flex-start',marginTop:8}}><span className="tag">Açık ✓</span><button className="g" onClick={kapat}>Kapat</button></div>
  :yeni?<div style={{marginTop:10}}>
   <div className="row" style={{justifyContent:'flex-start',gap:6,marginBottom:8}}>{sekme('dinlio','Dinlio Kod (önerilen)')}{sekme('app','Google / Microsoft Authenticator')}</div>
   {tur==='dinlio'?<>
    <p>1. Bu QR'ı <b>telefonunuzun kamerasıyla</b> okutun (uygulama indirmeye gerek yok).<br/>2. Telefonda <b>Dinlio Kod</b> açılır; çıkan 6 haneli kodu aşağıya yazın.<br/>3. Telefonda sayfayı <b>ana ekrana ekleyin</b>; her girişte oradan <b>Kopyala</b>'ya basmanız yeter.</p>
    {kutu(qr)}
    {mobil&&link&&<p><a href={link} target="_blank" rel="noopener noreferrer" style={{fontWeight:700,textDecoration:'underline'}}>Bu telefondan giriyorum: Dinlio Kod'u burada aç</a></p>}
    <p className="mut" style={{fontSize:'.8rem'}}>Bu QR sadece size özeldir; ekran görüntüsünü kimseyle paylaşmayın.</p></>
   :<><p>1. Telefonunuza <b>Google Authenticator</b> veya <b>Microsoft Authenticator</b> kurun.<br/>2. Uygulamada “QR kod tara” deyip aşağıdaki kodu okutun.<br/>3. Uygulamada çıkan 6 haneli kodu yazın.</p>
    {kutu(yeni.totp.qr_code)}
    <p className="mut" style={{fontSize:'.8rem',wordBreak:'break-all'}}>QR okutamıyorsanız bu anahtarı elle girin: {yeni.totp.secret}</p></>}
   <div className="row" style={{justifyContent:'flex-start'}}><input style={{maxWidth:160,margin:0,letterSpacing:'.3em',textAlign:'center'}} inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456" value={kod} onChange={e=>setKod(e.target.value)}/><button disabled={busy||kod.replace(/\D/g,'').length!==6} onClick={onayla}>Onayla</button><button className="g" onClick={()=>{setYeni(null);setQr('');setLink('');}}>Vazgeç</button></div></div>
  :<button style={{marginTop:8}} disabled={busy} onClick={baslat}>Doğrulamayı aç</button>}
  {msg&&<p className="mut" style={{marginTop:8}}>{msg}</p>}</div>;}
