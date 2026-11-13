'use client';
// DİNLİO GO: kurye uygulaması (telefon için). İşletmenin QR'ını okutan kurye adını ve telefonunu yazar, işletme onaylayınca paketleri görür.
// Paket bildirimi → Kabul et → Paketi aldım (yol tarifi açılır, müşteri canlı takip eder) → kaydırarak Teslim ettim. Konum yalnızca paket yoldayken paylaşılır.
import {useEffect,useRef,useState} from 'react';import '@/components/go.css';import {Motor,Konfeti} from '@/components/GoIkon';
const ls={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}},del:k=>{try{localStorage.removeItem(k);}catch{}}};
const u8=b=>{const p='='.repeat((4-b.length%4)%4),s=atob((b+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...s].map(c=>c.charCodeAt(0)));};
const tl=n=>Math.round(n).toLocaleString('tr-TR')+' ₺';
const HEDEFLER=[500,750,1000,1500,2000,3000];
// Sayının yumuşakça artarak gelmesi
function useSay(h){const [v,setV]=useState(0),on=useRef(0);useEffect(()=>{const b=on.current,t0=performance.now();let r;
 const ad=t=>{const k=Math.min(1,(t-t0)/900),e=1-Math.pow(1-k,3),x=b+(h-b)*e;setV(x);on.current=x;if(k<1)r=requestAnimationFrame(ad);};r=requestAnimationFrame(ad);return()=>cancelAnimationFrame(r);},[h]);return v;}
// Kaydırarak onay: yanlışlıkla "teslim ettim"e basılmasın
function Kaydir({yazi,onTamam,kapali}){const iz=useRef(null),bas=useRef(null),[x,setX]=useState(0),[s,setS]=useState(false);
 const max=()=>(iz.current?.offsetWidth||300)-62;
 const down=e=>{if(kapali)return;bas.current=e.clientX-x;setS(true);e.currentTarget.setPointerCapture?.(e.pointerId);};
 const move=e=>{if(bas.current==null)return;setX(Math.max(0,Math.min(max(),e.clientX-bas.current)));};
 const up=()=>{if(bas.current==null)return;bas.current=null;setS(false);if(x>max()*0.82){setX(max());navigator.vibrate?.(40);onTamam();setTimeout(()=>setX(0),900);}else setX(0);};
 return <div ref={iz} className={'go-kaydir'+(s?' surukle':'')} style={{opacity:kapali?.6:1}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
  <div className="iz" style={{width:x+58}}/><div className="yz" style={{opacity:1-x/(max()||1)}}>{yazi}</div><div className="top" style={{transform:`translateX(${x}px)`}}>➜</div></div>;}
export default function Go(){
 const [tok,setTok]=useState(undefined),[d,setD]=useState(null),[busy,setBusy]=useState(''),[davet,setDavet]=useState(null),[f,setF]=useState({ad:'',tel:''}),[bildirim,setBildirim]=useState('yok'),[gps,setGps]=useState('');
 const [toast,setToast]=useState(null),[kutla,setKutla]=useState(null),[yeni,setYeni]=useState(new Set()),[hedef,setHedef]=useState(1000);
 const tokR=useRef(null),sonKonum=useRef(0),onceki=useRef(null);
 const bildir=(t,h)=>{setToast({t,h,k:Date.now()});};
 useEffect(()=>{if(!toast)return;const i=setTimeout(()=>setToast(null),3200);return()=>clearTimeout(i);},[toast]);
 const api=async(m,body,qs='')=>{const r=await fetch('/api/go'+qs,{method:m,headers:{'content-type':'application/json',...(tokR.current?{authorization:'Bearer '+tokR.current}:{})},body:body?JSON.stringify(body):undefined});const j=await r.json().catch(()=>({}));
  if(r.status===401&&tokR.current){ls.del('go_tok');tokR.current=null;setTok(null);}if(!r.ok)throw new Error(j.error||'Bağlantı hatası');return j;};
 // Yeni paket gelince kartı parlat ve telefonu titret
 const al=j=>{const ids=new Set((j.acik||[]).map(x=>x.id));
  if(onceki.current){const n=[...ids].filter(i=>!onceki.current.has(i));if(n.length){setYeni(s=>new Set([...s,...n]));navigator.vibrate?.([140,70,140]);setTimeout(()=>setYeni(s=>{const c=new Set(s);n.forEach(i=>c.delete(i));return c;}),7000);}}
  onceki.current=ids;setD(j);};
 const yukle=async()=>{if(!tokR.current)return;try{al(await api('GET'));}catch(e){bildir(e.message,1);}};
 useEffect(()=>{const t=ls.get('go_tok');tokR.current=t;setTok(t||null);const h=+ls.get('go_hedef');if(HEDEFLER.includes(h))setHedef(h);
  const kod=new URLSearchParams(location.search).get('d');
  if(kod)fetch('/api/go?d='+encodeURIComponent(kod)).then(r=>r.json().then(j=>({ok:r.ok,j}))).then(({ok,j})=>setDavet(ok?{kod,isletme:j.isletme}:{hata:j.error})).catch(()=>setDavet({hata:'Bağlantı hatası'}));
  try{if('Notification' in window&&Notification.permission==='granted')navigator.serviceWorker?.getRegistration('/').then(r=>r?.pushManager.getSubscription()).then(s=>s&&setBildirim('acik'));}catch{}},[]);
 useEffect(()=>{if(!tok)return;yukle();const i=setInterval(()=>{if(document.visibilityState==='visible')yukle();},10000);const v=()=>document.visibilityState==='visible'&&yukle();document.addEventListener('visibilitychange',v);return()=>{clearInterval(i);document.removeEventListener('visibilitychange',v);};},[tok]);
 const yolda=!!d?.benim?.some(x=>x.durum==='yolda');
 useEffect(()=>{if(!yolda||!navigator.geolocation)return;let kilit=null;
  const w=navigator.geolocation.watchPosition(p=>{setGps('');if(Date.now()-sonKonum.current<12000)return;sonKonum.current=Date.now();api('POST',{islem:'konum',lat:p.coords.latitude,lng:p.coords.longitude}).catch(()=>{});},
   e=>setGps(e.code===1?'Konum izni kapalı. Müşteri sizi haritada göremiyor; tarayıcı ayarlarından konuma izin verin.':'Konum alınamıyor.'),{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
  navigator.wakeLock?.request('screen').then(k=>{kilit=k;}).catch(()=>{});
  return()=>{navigator.geolocation.clearWatch(w);kilit?.release?.().catch(()=>{});};},[yolda]);
 const is=async(islem,cid)=>{const pk=d?.benim?.find(x=>x.id===cid);setBusy(islem+cid);
  try{al(await api('POST',{islem,cid}));
   if(islem==='teslim'){setKutla({tutar:pk?.ucret||0});navigator.vibrate?.([60,40,60,40,160]);setTimeout(()=>setKutla(null),2600);}
   else if(islem==='kabul')bildir('Paket senin! İşletmeye git ve paketi al 🛵');else if(islem==='aldim')bildir('İyi yolculuklar! Müşteri seni canlı takip ediyor');else if(islem==='birak')bildir('Paket bırakıldı');}
  catch(e){bildir(e.message,1);yukle();}setBusy('');};
 const katil=async()=>{setBusy('katil');try{const j=await api('POST',{islem:'katil',davet:davet.kod,ad:f.ad,tel:f.tel});if(j.token){ls.set('go_tok',j.token);tokR.current=j.token;setTok(j.token);}else yukle();
   setDavet({tamam:j.isletme,onayli:j.onayli});history.replaceState(null,'','/go');}catch(e){bildir(e.message,1);}setBusy('');};
 const bildirimAc=async()=>{setBusy('push');try{
   if(!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error(/iphone|ipad/i.test(navigator.userAgent)?'iPhone\'da bildirim için: Paylaş → Ana Ekrana Ekle, sonra ana ekrandaki Dinlio Go simgesinden açın.':'Bu tarayıcı bildirimi desteklemiyor, Chrome kullanın.');
   if(await Notification.requestPermission()!=='granted')throw new Error('Bildirim izni verilmedi.');
   const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/'});await navigator.serviceWorker.ready;
   let s=await reg.pushManager.getSubscription();if(!s)s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(d.publicKey)});
   await api('POST',{islem:'push',subscription:s.toJSON()});setBildirim('acik');bildir('Bildirimler açık. Paket gelince haber vereceğiz 🔔');}catch(e){bildir(e.message,1);}setBusy('');};
 const harita=(k,adres)=>'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination='+(k?.lat?k.lat+','+k.lng:encodeURIComponent(adres||''));
 const bugunTl=useSay(d?.bugun?.tutar||0),haftaTl=useSay(d?.hafta?.tutar||0);
 const Ust=({sag})=><div className="go-top"><div className="go-logo"><span className="go-mark"><Motor s={26}/></span><span>Dinlio <b>Go</b></span></div>{sag}</div>;
 const Toast=()=>toast&&<div key={toast.k} className={'go-toast'+(toast.h?' h':'')} role="status">{toast.t}</div>;
 if(tok===undefined)return null;
 // KATILMA
 if(davet&&!davet.tamam&&(davet.kod||davet.hata)&&!(tok&&davet.hata))return <div className="go"><Ust/>
  <div className="go-card go-giris">{davet.hata?<><div className="go-radar" style={{width:96,height:96}}><span style={{fontSize:'2rem'}}>⚠</span></div><h1>Davet açılamadı</h1><p className="go-mut">{davet.hata}</p></>:<>
   <div className="go-radar"><Motor s={64}/></div><p className="go-lbl">Kurye daveti</p><h1>{davet.isletme}</h1>
   <p className="go-mut" style={{marginBottom:18}}>Bu işletmenin kuryesi olarak katılıyorsunuz. Onaylandığınızda paketler telefonunuza gelir.</p>
   {!tok&&<><input className="go-inp" placeholder="Adınız soyadınız" value={f.ad} onChange={e=>setF({...f,ad:e.target.value})} autoComplete="name"/>
    <input className="go-inp" placeholder="Cep telefonunuz (05xx…)" inputMode="tel" value={f.tel} onChange={e=>setF({...f,tel:e.target.value})} autoComplete="tel"/></>}
   <button className="go-btn" disabled={busy==='katil'||(!tok&&(f.ad.trim().length<3||f.tel.replace(/\D/g,'').length<10))} onClick={katil}>{busy==='katil'?'Kaydediliyor…':'Katıl ve başla'}</button>
   <div className="go-adimlar">{[['1','İşletme seni onaylar'],['2','Paket gelince bildirim alırsın'],['3','Kabul et, götür, kaydırarak teslim et']].map(([n,t],i)=><div key={n} style={{animationDelay:.1+i*.08+'s'}}><b>{n}</b>{t}</div>)}</div>
   <p className="go-mut" style={{fontSize:'.76rem',marginTop:14}}>Konumunuz yalnızca üstlendiğiniz paket yoldayken paylaşılır; teslimden sonra paylaşım durur.</p></>}</div><Toast/></div>;
 if(!tok)return <div className="go"><Ust/><div className="go-card go-giris"><div className="go-radar"><Motor s={64}/></div><h1>Hoş geldiniz</h1>
  <p className="go-mut">Başlamak için çalıştığınız işletmenin panelindeki <b style={{color:'#fff'}}>Dinlio Go QR kodunu</b> telefonunuzun kamerasıyla okutun.</p></div></div>;
 if(!d)return <div className="go"><Ust/><div className="go-bos"><div className="go-radar"><Motor s={56}/></div><p className="go-mut">Yükleniyor…</p></div><Toast/></div>;
 const bekleyen=d.isletmeler.filter(x=>!x.onayli),onayli=d.isletmeler.filter(x=>x.onayli),oran=Math.min(1,(d.bugun.tutar||0)/hedef),C=2*Math.PI*40;
 return <div className="go">
  <Ust sag={<span className="go-pill"><span className={'go-dot'+(d.benim.length?' k':'')}/>{d.benim.length?'Teslimatta':'Hazır'} · {d.kurye.ad.split(' ')[0]}</span>}/>
  {davet?.tamam&&<div className="go-card" style={{borderColor:'rgba(46,230,107,.5)'}}>✅ <b>{davet.tamam}</b> için kaydınız alındı.{!davet.onayli&&' İşletme onaylayınca paketler burada görünecek.'}</div>}
  <div className="go-hero"><div style={{position:'relative',zIndex:1,minWidth:0}}><p className="go-lbl">Bugünkü kazanç</p><div className="go-big">{tl(bugunTl)}</div><p className="go-sub">{d.bugun.adet} paket teslim edildi</p></div>
   <div className="go-ring"><svg width="96" height="96" viewBox="0 0 96 96"><circle className="b" cx="48" cy="48" r="40" strokeWidth="8" fill="none"/><circle className="v" cx="48" cy="48" r="40" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-oran)}/></svg>
    <div><span><b>%{Math.round(oran*100)}</b><br/><select aria-label="Günlük hedef" value={hedef} onChange={e=>{setHedef(+e.target.value);ls.set('go_hedef',e.target.value);}}>{HEDEFLER.map(h=><option key={h} value={h}>{h.toLocaleString('tr-TR')} ₺ hedef</option>)}</select></span></div></div></div>
  <div className="go-mini"><div><p className="go-lbl">Bugün</p><b>{d.bugun.adet} paket</b></div><div><p className="go-lbl">7 gün</p><b>{tl(haftaTl)}</b></div><div><p className="go-lbl">7 gün</p><b>{d.hafta.adet} paket</b></div></div>
  {bildirim!=='acik'&&<div className="go-card go-cta" style={{marginTop:12}}><span className="go-zil">🔔</span><div style={{flex:1,minWidth:0}}><b>Paket gelince haber verelim</b><p className="go-mut">Uygulama kapalıyken de bildirim gelir.</p></div>
   <button className="go-btn" style={{width:'auto',height:44,padding:'0 16px',fontSize:'.9rem'}} disabled={busy==='push'} onClick={bildirimAc}>Aç</button></div>}
  {gps&&yolda&&<div className="go-card go-err" style={{marginTop:12}}>📍 {gps}</div>}
  {d.benim.length>0&&<div className="go-sec"><span>Teslimatın</span><span className="go-badge">{d.benim.length}</span></div>}
  {d.benim.map((x,i)=>{const p=x.durum==='yolda'?1:0;return <div key={x.id} className="go-card go-aktif" style={{'--i':i}}>
   <div className="go-row"><div style={{minWidth:0}}><div className="go-name">{x.isletme}</div><p className="go-mut">{x.durum==='yolda'?'Müşteriye gidiyorsun':'İşletmeden paketi al'}{x.km!=null?' · '+x.km+' km':''}</p></div><div className="go-price">{tl(x.ucret)}</div></div>
   <div className="go-adim" style={{'--p':p}}><i/><span className="ok">Üstlendin</span><span className={p?'ok su':'su'}>Yolda</span><span>Teslim</span></div>
   <div className="go-adres"><p style={{fontWeight:700}}>🧾 {x.siparis}</p><p>📍 {x.adres||'Adres belirtilmemiş'}</p>{x.not&&<p className="go-mut">🗒 {x.not}</p>}<p className="go-mut">👤 {x.musteri||'Müşteri'}</p></div>
   <div className="go-grid">{x.durum==='kabul'?<>
     {x.isletmeKonum&&<a className="go-btn2" href={harita(x.isletmeKonum)} target="_blank" rel="noreferrer">🧭 İşletmeye yol tarifi</a>}
     <button className="go-btn" disabled={!!busy} onClick={()=>is('aldim',x.id)}>📦 Paketi aldım, yola çıkıyorum</button>
     <button className="go-btn2 s" disabled={!!busy} onClick={()=>confirm('Paketi bırakmak istiyor musunuz? Başka kuryelere açılır.')&&is('birak',x.id)}>Paketi bırak</button></>
    :<><a className="go-btn2 w" href={harita(x.konum,x.adres)} target="_blank" rel="noreferrer">🧭 Müşteriye yol tarifi</a>
     <div className="go-grid2">{x.tel&&<a className="go-btn2" href={'tel:'+x.tel}>📞 Ara</a>}
      {x.takip&&x.tel&&<a className="go-btn2" target="_blank" rel="noreferrer" href={'https://wa.me/'+String(x.tel).replace(/\D/g,'').replace(/^0/,'90')+'?text='+encodeURIComponent(`${x.isletme}: Siparişiniz yolda! Canlı takip: ${x.takip}`)}>💬 Takip linki</a>}</div>
     <Kaydir yazi="Kaydır: teslim ettim" kapali={!!busy} onTamam={()=>is('teslim',x.id)}/></>}</div></div>;})}
  <div className="go-sec"><span>Bekleyen paketler</span>{d.acik.length>0&&<span className="go-badge">{d.acik.length}</span>}</div>
  {d.acik.map((x,i)=><div key={x.id} className={'go-card'+(yeni.has(x.id)?' yeni':'')} style={{'--i':i}}>{yeni.has(x.id)&&<span className="go-new">YENİ</span>}
   <div className="go-row"><div style={{minWidth:0}}><div className="go-name">{x.isletme}</div><p className="go-mut">{new Date(x.saat).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</p></div><div className="go-price">{tl(x.ucret)}</div></div>
   <div className="go-meta">{x.km!=null&&<span className="go-chip">🛣 {x.km} km</span>}<span className="go-chip">📍 {x.adres?String(x.adres).slice(0,48):'Adres işletmede'}</span></div>
   <button className="go-btn" disabled={!!busy} onClick={()=>is('kabul',x.id)}>{busy==='kabul'+x.id?'Alınıyor…':'Kabul et'}</button></div>)}
  {!d.acik.length&&<div className="go-bos"><div className="go-radar"><Motor s={56}/></div><b>{onayli.length?'Paket bekleniyor':'Onay bekleniyor'}</b>
   <p className="go-mut" style={{marginTop:4}}>{onayli.length?'Yeni paket gelince telefonun titreyecek.':'İşletme seni onaylayınca paketler burada görünecek.'}</p></div>}
  {(bekleyen.length>0||onayli.length>0)&&<div className="go-meta" style={{marginTop:16}}>{onayli.map(x=><span key={x.ad} className="go-chip">✓ {x.ad}</span>)}{bekleyen.map(x=><span key={x.ad} className="go-chip" style={{opacity:.6}}>⏳ {x.ad}</span>)}</div>}
  <p className="go-mut" style={{fontSize:'.76rem',marginTop:14,textAlign:'center'}}>Ücretleri işletme belirler ve size doğrudan öder; Dinlio Go yalnızca paketleri sayar. Yeni bir işletmeye katılmak için o işletmenin QR kodunu okutun.</p>
  {kutla&&<div className="go-kutla" onClick={()=>setKutla(null)}><div><Konfeti/><div className="go-tik">✓</div><h2>+{tl(kutla.tutar)}</h2><p>Teslim edildi, eline sağlık!</p></div></div>}
  <Toast/></div>;}
