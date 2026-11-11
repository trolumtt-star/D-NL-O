'use client';
// Telefon bildirimleri: panel kapalıyken de yeni sipariş / randevu bildirimi gelsin.
import {useEffect,useState} from 'react';
const u8=b=>{const p='='.repeat((4-b.length%4)%4),s=atob((b+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...s].map(c=>c.charCodeAt(0)));};
export default function PushAyar({tok}){
 const [d,setD]=useState(null),[acik,setAcik]=useState(false),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[destek,setDestek]=useState(true),[ios,setIos]=useState(false),[pwa,setPwa]=useState(false);
 const H=async()=>({'content-type':'application/json',authorization:'Bearer '+await tok()});
 useEffect(()=>{(async()=>{
  const var_='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;setDestek(var_);
  setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));setPwa(matchMedia('(display-mode: standalone)').matches||!!navigator.standalone);
  try{const r=await fetch('/api/push',{headers:await H()});setD(await r.json());}catch{}
  if(var_){try{const reg=await navigator.serviceWorker.getRegistration('/');const s=await reg?.pushManager.getSubscription();setAcik(!!s&&Notification.permission==='granted');}catch{}}})();},[]);
 const ac=async()=>{setBusy(true);setMsg('');try{
  const izin=await Notification.requestPermission();if(izin!=='granted')throw new Error('Bildirim izni verilmedi. Tarayıcı ayarlarından bu site için bildirimlere izin verin.');
  const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/'});await navigator.serviceWorker.ready;
  let s=await reg.pushManager.getSubscription();if(!s)s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(d.publicKey)});
  const r=await fetch('/api/push',{method:'POST',headers:await H(),body:JSON.stringify({subscription:s.toJSON(),cihaz:navigator.userAgent.slice(0,80)})});const j=await r.json();if(!r.ok)throw new Error(j.error);
  setAcik(true);setMsg('Bildirimler açıldı. Deneme bildirimi gönderiliyor…');
  await fetch('/api/push',{method:'POST',headers:await H(),body:JSON.stringify({islem:'test'})});setMsg('Bildirimler açık ✓ Telefonunuza deneme bildirimi gitti.');
 }catch(e){setMsg(e.message);}setBusy(false);};
 const kapat=async()=>{setBusy(true);try{const reg=await navigator.serviceWorker.getRegistration('/');const s=await reg?.pushManager.getSubscription();
  if(s){await fetch('/api/push',{method:'POST',headers:await H(),body:JSON.stringify({islem:'kapat',subscription:s.toJSON()})});await s.unsubscribe();}
  setAcik(false);setMsg('Bu cihazda bildirimler kapatıldı.');}catch(e){setMsg(e.message);}setBusy(false);};
 return <div className="card sec2"><h2>Telefon bildirimleri</h2>
  <p className="mut">Panel kapalıyken bile yeni sipariş, randevu ve talepler telefonunuza bildirim olarak gelsin. Her akşam günün özeti de gelir.</p>
  {ios&&!pwa?<div className="warn" style={{marginTop:8}}>iPhone'da bildirim için önce paneli ana ekrana ekleyin: Safari'de alttaki <b>Paylaş</b> düğmesi → <b>Ana Ekrana Ekle</b>. Sonra ana ekrandaki Dinlio simgesinden açıp bu butona basın.</div>
  :!destek?<p className="mut" style={{marginTop:8}}>Bu tarayıcı bildirimleri desteklemiyor. Android'de Chrome, iPhone'da ana ekrana eklenmiş paneli kullanın.</p>
  :!d?<p className="mut">Yükleniyor…</p>
  :<div className="row" style={{justifyContent:'flex-start',gap:8,marginTop:10,flexWrap:'wrap'}}>
   {acik?<><span className="tag">Bu cihazda açık ✓</span><button className="g" disabled={busy} onClick={async()=>{await fetch('/api/push',{method:'POST',headers:await H(),body:JSON.stringify({islem:'test'})});setMsg('Deneme bildirimi gönderildi.');}}>Deneme bildirimi</button><button className="g" disabled={busy} onClick={kapat}>Kapat</button></>
   :<button disabled={busy} onClick={ac}>{busy?'Açılıyor…':'Bu telefonda bildirimleri aç'}</button>}
   {d.cihaz>0&&<span className="mut" style={{fontSize:'.85rem'}}>{d.cihaz} cihazda açık</span>}</div>}
  {msg&&<p className="mut" style={{marginTop:8}}>{msg}</p>}</div>;}
