'use client';
// Aşım ayarı: paket dakikası bitince ne olsun?
//  Açık  -> asistan, belirlenen limite kadar çalışmaya devam eder; aşım dakikaları paket fiyatından 2 hafta içinde ödenir (ödenene kadar aşım siparişleri kilitli).
//  Kapalı-> asistan durur: telefon çağrıları işletmenin numarasına yönlendirilir, web çağrıları kısa bir bilgiyle kapanır.
import {useEffect,useState} from 'react';
const tl=x=>Number(x).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' ₺';
export default function AsimAyar({tok,yenile}){
 const [v,setV]=useState(null),[d,setD]=useState(null),[acik,setAcik]=useState(false),[lim,setLim]=useState(100),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 const H=async()=>({'content-type':'application/json',authorization:'Bearer '+await tok()});
 useEffect(()=>{(async()=>{try{const [a,b]=await Promise.all([fetch('/api/ayarlar',{headers:await H()}).then(r=>r.json()),fetch('/api/dakika',{headers:await H()}).then(r=>r.json())]);
  setV(a);setD(b);setAcik(!!a.asim?.acik);setLim(a.asim?.limit_dk||100);}catch{}})();},[]);
 if(!v||!d)return null;
 const bu=d.birim?.usd||0,kur=d.kur?.usd,usd=Math.round(lim*bu*100)/100;
 const kaydet=async(yeni)=>{setBusy(true);setMsg('');try{const r=await fetch('/api/ayarlar',{method:'POST',headers:await H(),body:JSON.stringify({islem:'asim',acik:yeni,limit_dk:+lim})});const j=await r.json();if(!r.ok)throw new Error(j.error);
  setAcik(yeni);setMsg(j.acildi?'Aşım açıldı, asistanınız yeniden telefonlara cevap veriyor.':yeni?'Kaydedildi. Paket dakikanız bitince asistan aşım limitine kadar çalışmaya devam edecek.':'Aşım kapatıldı. Paket dakikanız bitince asistan durur ve çağrılar yönlendirme numaranıza aktarılır.');yenile?.();}catch(e){setMsg(e.message);}setBusy(false);};
 return <div className="card sec2"><h2>Dakika bitince ne olsun?</h2>
  <p className="mut">Paket dakikanız bittiğinde asistanın susmasını istemiyorsanız <b>aşım</b>ı açın. Asistan belirlediğiniz limite kadar çalışmaya devam eder, kullandığınız aşım dakikalarını paketinizdeki fiyattan (dakikası ${bu} + KDV) 2 hafta içinde ödersiniz.</p>
  <div className="row" style={{justifyContent:'flex-start',gap:8,marginTop:10,flexWrap:'wrap'}}>
   <button className={acik?'':'g'} disabled={busy} onClick={()=>kaydet(true)}>Aşım açık</button>
   <button className={!acik?'':'g'} disabled={busy} onClick={()=>kaydet(false)}>Aşım kapalı</button></div>
  <label style={{display:'block',marginTop:12}}>En fazla kaç dakika aşılsın?
   <select value={lim} onChange={e=>setLim(+e.target.value)} style={{maxWidth:220}}>{[30,50,100,200,300,500,1000].map(x=><option key={x} value={x}>{x} dakika</option>)}</select></label>
  <p className="mut" style={{marginTop:6}}>Bu limitle en fazla <b>${usd.toFixed(2)} + KDV</b>{kur?` (≈ ${tl(usd*kur*1.2)} KDV dahil)`:''} aşım ücreti çıkar. Limit dolunca asistan durur.{acik?' Limiti değiştirdiyseniz “Aşım açık”a tekrar basıp kaydedin.':''}</p>
  <ul className="mut" style={{margin:'10px 0 0 18px',fontSize:'.88rem'}}>
   <li><b>Açıkken:</b> asistan çalışmaya devam eder. Aşım ücreti ödenene kadar o dakikalarda gelen siparişler panelde <b>kilitli (bulanık)</b> görünür, ödeyince hemen açılır. 2 hafta içinde ödenmezse asistan durur.</li>
   <li><b>Kapalıyken:</b> dakika bitince asistan hiç açmaz. Telefon çağrıları {v.yonlendirme?<b>{v.yonlendirme}</b>:'işletme numaranıza'} yönlendirilir, web çağrıları kısa bir bilgi cümlesiyle kapanır.</li></ul>
  {msg&&<p style={{marginTop:10}}>{msg}</p>}</div>;}
