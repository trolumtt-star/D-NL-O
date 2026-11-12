'use client';
// İşletme sahibi: Dinlio Go kurye sistemi. Paket başı ücret, davet QR'ı, kurye onayı ve kurye başına paket sayıları.
import {useEffect,useState} from 'react';import {waLink} from '@/lib/destek';
export default function Kuryeler({tok}){
 const [d,setD]=useState(null),[f,setF]=useState(null),[msg,setMsg]=useState(''),[qr,setQr]=useState(''),[busy,setBusy]=useState(false);
 const api=async(m,body)=>{const r=await fetch('/api/kurye',{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+await tok()},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 const doldur=j=>{setD(j);setF(j.ayar);};
 useEffect(()=>{api('GET').then(doldur).catch(e=>setMsg(e.message));const i=setInterval(()=>api('GET').then(setD).catch(()=>{}),30000);return()=>clearInterval(i);},[]);
 useEffect(()=>{if(!d?.davet){setQr('');return;}(async()=>{try{const Q=(await import('qrcode')).default;setQr(await Q.toDataURL(d.davet,{width:360,margin:1,errorCorrectionLevel:'M'}));}catch{setQr('');}})();},[d?.davet]);
 const is=async(body,ok)=>{setBusy(true);setMsg('');try{doldur(await api('POST',body));if(ok)setMsg(ok);}catch(e){setMsg(e.message);}setBusy(false);};
 if(!d)return <div className="card sec2"><h2>Dinlio Go kuryeleri</h2><p className="mut">{msg||'Yükleniyor…'}</p></div>;
 if(!d.izin)return <div className="card sec2"><h2>Dinlio Go kuryeleri</h2><p style={{marginTop:6}}>🔒 Kurye uygulaması <b>{d.enAz}</b> paketten itibaren açılır. <a className="lnk" href={waLink('Merhaba, paketimi yükseltmek istiyorum.')} target="_blank" rel="noopener">Paketi yükselt</a></p></div>;
 return <div className="card sec2"><h2>Dinlio Go kuryeleri</h2>
  <p className="mut">Sipariş gelince kuryelerinizin telefonuna "yeni paket" bildirimi gider; ilk kabul eden alır, yol tarifiyle götürür, müşteri canlı takip eder. Kuryeye ödemeyi siz yaparsınız; burada sadece paketler sayılır.</p>
  <label className="ck" style={{marginTop:8}}><input type="checkbox" style={{width:'auto'}} checked={!!f.acik} onChange={e=>setF({...f,acik:e.target.checked})}/> Kurye sistemini kullan</label>
  <div className="frm" style={{marginTop:8}}>
   <label>Paket başı ücret (₺)<input type="number" min="0" max="2000" value={f.taban} onChange={e=>setF({...f,taban:e.target.value})}/></label>
   <label>Şu km'den sonra<input type="number" min="0" max="50" step="0.5" value={f.esik} onChange={e=>setF({...f,esik:e.target.value})}/></label>
   <label>Her km için ek (₺)<input type="number" min="0" max="500" value={f.km_ek} onChange={e=>setF({...f,km_ek:e.target.value})}/></label>
   <label>Kuryeye ne zaman haber gitsin<select value={f.ne_zaman} onChange={e=>setF({...f,ne_zaman:e.target.value})}><option value="onay">Ben siparişi onaylayınca</option><option value="gelince">Sipariş gelir gelmez</option></select></label>
   <button disabled={busy} onClick={()=>is({islem:'ayar',...f},'Kaydedildi.')}>Kaydet</button></div>
  {!d.konumVar&&<p className="mut" style={{fontSize:'.8rem'}}>Km'ye göre ücret ve mesafe için aşağıdaki "Dükkân konumu" kartından adresinizi kaydedin.</p>}
  {d.davet&&<div style={{marginTop:14,display:'flex',gap:16,flexWrap:'wrap',alignItems:'center'}}>
   {qr&&<img src={qr} alt="Dinlio Go davet QR kodu" width="170" height="170" style={{borderRadius:12,background:'#fff',padding:6}}/>}
   <div style={{flex:1,minWidth:220}}><b>Kurye ekle</b><p className="mut" style={{margin:'4px 0 8px'}}>Kuryeniz bu QR'ı telefonunun kamerasıyla okutsun, adını yazsın. Sonra aşağıdan onaylayın.</p>
    <div className="row" style={{justifyContent:'flex-start',gap:8,flexWrap:'wrap'}}><button className="g" onClick={()=>{navigator.clipboard?.writeText(d.davet);setMsg('Davet linki kopyalandı.');}}>Linki kopyala</button>
    <button className="g" onClick={()=>confirm('Eski QR geçersiz olur, yeni kuryeler yeni QR ile katılır. Mevcut kuryeler etkilenmez.')&&is({islem:'davet_yenile'},'Yeni QR oluşturuldu.')}>QR'ı yenile</button></div></div></div>}
  {d.kuryeler.length>0&&<table style={{marginTop:12}}><thead><tr><th>Kurye</th><th>Telefon</th><th>Bugün</th><th>7 gün</th><th></th></tr></thead><tbody>
   {d.kuryeler.map(k=><tr key={k.id}><td>{k.ad}{!k.onayli&&<span className="tag x" style={{marginLeft:6}}>Onay bekliyor</span>}</td><td><a className="lnk" href={'tel:0'+String(k.tel).slice(-10)}>0{String(k.tel).slice(-10)}</a></td>
    <td>{k.bugun} paket · {Math.round(k.bugunTl)} ₺</td><td>{k.hafta} paket · {Math.round(k.haftaTl)} ₺</td>
    <td style={{whiteSpace:'nowrap'}}>{!k.onayli&&<><a className="lnk" onClick={()=>is({islem:'onayla',kurye_id:k.id},k.ad+' onaylandı.')}>Onayla</a> · </>}<a className="lnk" onClick={()=>confirm(k.ad+' çıkarılsın mı?')&&is({islem:'cikar',kurye_id:k.id})}>Çıkar</a></td></tr>)}</tbody></table>}
  {msg&&<p className="mut" style={{marginTop:8}}>{msg}</p>}</div>;}
