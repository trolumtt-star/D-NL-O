'use client';
// DİNLİO GO: kurye uygulaması (telefon için). İşletmenin QR'ını okutan kurye adını ve telefonunu yazar, işletme onaylayınca paketleri görür.
// Paket bildirimi → Kabul et → Paketi aldım (yol tarifi açılır, müşteri canlı takip eder) → Teslim ettim. Konum yalnızca paket yoldayken paylaşılır.
import {useEffect,useRef,useState} from 'react';
const ls={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}},del:k=>{try{localStorage.removeItem(k);}catch{}}};
const u8=b=>{const p='='.repeat((4-b.length%4)%4),s=atob((b+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...s].map(c=>c.charCodeAt(0)));};
const tl=n=>Math.round(n).toLocaleString('tr-TR')+' ₺';
const S={wrap:{maxWidth:520,margin:'0 auto',padding:'16px 16px 90px'},card:{background:'var(--surface)',border:'1px solid var(--rule)',borderRadius:18,padding:16,marginBottom:12},
 btn:{width:'100%',height:54,borderRadius:14,border:0,background:'var(--red)',color:'#fff',fontWeight:800,fontSize:'1.05rem',cursor:'pointer'},
 btn2:{width:'100%',height:48,borderRadius:14,border:'1px solid var(--rule)',background:'transparent',color:'var(--ink)',fontWeight:700,fontSize:'.98rem',cursor:'pointer',display:'grid',placeItems:'center',textDecoration:'none'},
 mut:{color:'var(--mute)',fontSize:'.9rem'},inp:{width:'100%',height:50,borderRadius:12,border:'1px solid var(--rule)',background:'var(--soft)',color:'var(--ink)',padding:'0 14px',fontSize:'1rem',marginBottom:10}};
export default function Go(){
 const [tok,setTok]=useState(undefined),[d,setD]=useState(null),[err,setErr]=useState(''),[busy,setBusy]=useState(''),[davet,setDavet]=useState(null),[f,setF]=useState({ad:'',tel:''}),[bildirim,setBildirim]=useState('yok'),[gps,setGps]=useState('');
 const tokR=useRef(null),sonKonum=useRef(0);
 const api=async(m,body,qs='')=>{const r=await fetch('/api/go'+qs,{method:m,headers:{'content-type':'application/json',...(tokR.current?{authorization:'Bearer '+tokR.current}:{})},body:body?JSON.stringify(body):undefined});const j=await r.json().catch(()=>({}));
  if(r.status===401&&tokR.current){ls.del('go_tok');tokR.current=null;setTok(null);}if(!r.ok)throw new Error(j.error||'Bağlantı hatası');return j;};
 const yukle=async()=>{if(!tokR.current)return;try{setD(await api('GET'));setErr('');}catch(e){setErr(e.message);}};
 // Açılış: kayıtlı anahtar + davet kodu
 useEffect(()=>{const t=ls.get('go_tok');tokR.current=t;setTok(t||null);
  const kod=new URLSearchParams(location.search).get('d');
  if(kod)fetch('/api/go?d='+encodeURIComponent(kod)).then(r=>r.json().then(j=>({ok:r.ok,j}))).then(({ok,j})=>setDavet(ok?{kod,isletme:j.isletme}:{hata:j.error})).catch(()=>setDavet({hata:'Bağlantı hatası'}));
  try{if('Notification' in window&&Notification.permission==='granted')navigator.serviceWorker?.getRegistration('/').then(r=>r?.pushManager.getSubscription()).then(s=>s&&setBildirim('acik'));}catch{}},[]);
 // 10 saniyede bir yenile (uygulama öndeyken)
 useEffect(()=>{if(!tok)return;yukle();const i=setInterval(()=>{if(document.visibilityState==='visible')yukle();},10000);const v=()=>document.visibilityState==='visible'&&yukle();document.addEventListener('visibilitychange',v);return()=>{clearInterval(i);document.removeEventListener('visibilitychange',v);};},[tok]);
 // Canlı konum: sadece yolda paket varken
 const yolda=!!d?.benim?.some(x=>x.durum==='yolda');
 useEffect(()=>{if(!yolda||!navigator.geolocation)return;let kilit=null;
  const w=navigator.geolocation.watchPosition(p=>{setGps('');if(Date.now()-sonKonum.current<12000)return;sonKonum.current=Date.now();api('POST',{islem:'konum',lat:p.coords.latitude,lng:p.coords.longitude}).catch(()=>{});},
   e=>setGps(e.code===1?'Konum izni kapalı. Müşteri sizi haritada göremiyor; tarayıcı ayarlarından konuma izin verin.':'Konum alınamıyor.'),{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
  // Ekran açık kalsın ki konum gitmeye devam etsin
  navigator.wakeLock?.request('screen').then(k=>{kilit=k;}).catch(()=>{});
  return()=>{navigator.geolocation.clearWatch(w);kilit?.release?.().catch(()=>{});};},[yolda]);
 const is=async(islem,cid)=>{setBusy(islem+cid);setErr('');try{setD(await api('POST',{islem,cid}));}catch(e){setErr(e.message);yukle();}setBusy('');};
 const katil=async()=>{setBusy('katil');setErr('');try{const j=await api('POST',{islem:'katil',davet:davet.kod,ad:f.ad,tel:f.tel});if(j.token){ls.set('go_tok',j.token);tokR.current=j.token;setTok(j.token);}else yukle();
   setDavet({tamam:j.isletme,onayli:j.onayli});history.replaceState(null,'','/go');}catch(e){setErr(e.message);}setBusy('');};
 const bildirimAc=async()=>{setBusy('push');setErr('');try{
   if(!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error(/iphone|ipad/i.test(navigator.userAgent)?'iPhone\'da bildirim için: Paylaş → Ana Ekrana Ekle, sonra ana ekrandaki Dinlio Go simgesinden açın.':'Bu tarayıcı bildirimi desteklemiyor, Chrome kullanın.');
   if(await Notification.requestPermission()!=='granted')throw new Error('Bildirim izni verilmedi.');
   const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/'});await navigator.serviceWorker.ready;
   let s=await reg.pushManager.getSubscription();if(!s)s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(d.publicKey)});
   await api('POST',{islem:'push',subscription:s.toJSON()});setBildirim('acik');}catch(e){setErr(e.message);}setBusy('');};
 const harita=(k,adres)=>'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination='+(k?.lat?k.lat+','+k.lng:encodeURIComponent(adres||''));
 const B=({children,...p})=><button style={{...S.btn,opacity:p.disabled?.6:1}} {...p}>{children}</button>;
 const Bas=()=><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}><h1 style={{fontSize:'1.35rem'}}>Dinlio <span style={{color:'var(--red)'}}>Go</span></h1>{d&&<span style={S.mut}>{d.kurye.ad}</span>}</div>;
 if(tok===undefined)return null;
 // KATILMA EKRANI
 if(davet&&!davet.tamam&&(davet.kod||davet.hata)&&!(tok&&davet.hata))return <div style={S.wrap}><Bas/><div style={S.card}>
  {davet.hata?<><h2 style={{fontSize:'1.1rem'}}>Davet açılamadı</h2><p style={{...S.mut,marginTop:8}}>{davet.hata}</p></>:<>
   <h2 style={{fontSize:'1.15rem'}}>{davet.isletme}</h2><p style={{...S.mut,margin:'6px 0 14px'}}>Bu işletmenin kuryesi olarak katılıyorsunuz. İşletme sizi onaylayınca paketler telefonunuza gelir.</p>
   {!tok&&<><input style={S.inp} placeholder="Adınız soyadınız" value={f.ad} onChange={e=>setF({...f,ad:e.target.value})} autoComplete="name"/>
    <input style={S.inp} placeholder="Cep telefonunuz (05xx…)" inputMode="tel" value={f.tel} onChange={e=>setF({...f,tel:e.target.value})} autoComplete="tel"/></>}
   <B disabled={busy==='katil'||(!tok&&(f.ad.trim().length<3||f.tel.replace(/\D/g,'').length<10))} onClick={katil}>{busy==='katil'?'Kaydediliyor…':'Katıl'}</B>
   <p style={{...S.mut,fontSize:'.78rem',marginTop:10}}>Konumunuz yalnızca üstlendiğiniz paket yoldayken müşteriyle ve işletmeyle paylaşılır; teslimden sonra paylaşım durur.</p></>}
  {err&&<p style={{color:'var(--redInk)',marginTop:10}}>{err}</p>}</div></div>;
 if(!tok)return <div style={S.wrap}><Bas/><div style={S.card}><h2 style={{fontSize:'1.1rem'}}>Hoş geldiniz</h2><p style={{...S.mut,marginTop:8}}>Başlamak için çalıştığınız işletmenin panelindeki <b>Dinlio Go QR kodunu</b> telefonunuzun kamerasıyla okutun.</p></div></div>;
 if(!d)return <div style={S.wrap}><Bas/><p style={S.mut}>{err||'Yükleniyor…'}</p></div>;
 const bekleyen=d.isletmeler.filter(x=>!x.onayli),onayli=d.isletmeler.filter(x=>x.onayli);
 return <div style={S.wrap}><Bas/>
  {davet?.tamam&&<div style={{...S.card,borderColor:'var(--red)'}}>✅ <b>{davet.tamam}</b> için kaydınız alındı.{!davet.onayli&&' İşletme onaylayınca paketler burada görünecek.'}</div>}
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
   <div style={{...S.card,marginBottom:0}}><p style={S.mut}>Bugün</p><h2 style={{fontSize:'1.5rem'}}>{tl(d.bugun.tutar)}</h2><p style={S.mut}>{d.bugun.adet} paket</p></div>
   <div style={{...S.card,marginBottom:0}}><p style={S.mut}>Son 7 gün</p><h2 style={{fontSize:'1.5rem'}}>{tl(d.hafta.tutar)}</h2><p style={S.mut}>{d.hafta.adet} paket</p></div></div>
  {bildirim!=='acik'&&<div style={S.card}><b>Paket gelince haber verelim</b><p style={{...S.mut,margin:'4px 0 10px'}}>Uygulama kapalıyken de yeni paket bildirimi gelir.</p><B disabled={busy==='push'} onClick={bildirimAc}>🔔 Bildirimleri aç</B></div>}
  {err&&<div style={{...S.card,borderColor:'var(--red)',color:'var(--redInk)'}}>{err}</div>}
  {gps&&yolda&&<div style={{...S.card,borderColor:'var(--red)',color:'var(--redInk)'}}>{gps}</div>}
  {d.benim.map(x=><div key={x.id} style={{...S.card,borderColor:'var(--red)'}}>
   <div style={{display:'flex',justifyContent:'space-between',gap:8}}><b>{x.isletme}</b><b style={{color:'var(--red)'}}>{tl(x.ucret)}</b></div>
   <p style={{...S.mut,margin:'2px 0 10px'}}>{x.durum==='yolda'?'🔵 Yoldasınız':'🟡 Üstlendiniz, paketi işletmeden alın'}{x.km!=null?' · '+x.km+' km':''}</p>
   <p style={{fontWeight:700}}>{x.siparis}</p>
   <p style={{marginTop:8}}>📍 {x.adres||'Adres belirtilmemiş'}</p>{x.not&&<p style={S.mut}>🗒 {x.not}</p>}
   <p style={{marginTop:4}}>👤 {x.musteri||'Müşteri'}</p>
   <div style={{display:'grid',gap:8,marginTop:12}}>
    {x.durum==='kabul'?<>
     {x.isletmeKonum&&<a style={S.btn2} href={harita(x.isletmeKonum)} target="_blank" rel="noreferrer">🧭 İşletmeye yol tarifi</a>}
     <B disabled={!!busy} onClick={()=>is('aldim',x.id)}>📦 Paketi aldım, yola çıkıyorum</B>
     <button style={{...S.btn2,color:'var(--mute)'}} disabled={!!busy} onClick={()=>confirm('Paketi bırakmak istiyor musunuz? Başka kuryelere açılır.')&&is('birak',x.id)}>Paketi bırak</button></>
    :<><a style={{...S.btn2,background:'#fff',color:'#000',border:0}} href={harita(x.konum,x.adres)} target="_blank" rel="noreferrer">🧭 Müşteriye yol tarifi</a>
     {x.tel&&<a style={S.btn2} href={'tel:'+x.tel}>📞 Müşteriyi ara</a>}
     {x.takip&&x.tel&&<a style={S.btn2} target="_blank" rel="noreferrer" href={'https://wa.me/'+String(x.tel).replace(/\D/g,'').replace(/^0/,'90')+'?text='+encodeURIComponent(`${x.isletme}: Siparişiniz yolda! Canlı takip: ${x.takip}`)}>💬 Takip linkini WhatsApp'tan gönder</a>}
     <B disabled={!!busy} onClick={()=>is('teslim',x.id)}>✅ Teslim ettim</B></>}</div></div>)}
  <h3 style={{fontSize:'1rem',margin:'18px 0 10px'}}>Bekleyen paketler {d.acik.length>0&&<span style={{color:'var(--red)'}}>({d.acik.length})</span>}</h3>
  {d.acik.map(x=><div key={x.id} style={S.card}>
   <div style={{display:'flex',justifyContent:'space-between',gap:8}}><b>{x.isletme}</b><b style={{color:'var(--red)',fontSize:'1.15rem'}}>{tl(x.ucret)}</b></div>
   <p style={{...S.mut,margin:'4px 0 12px'}}>📍 {x.adres||'Adres işletmede'}{x.km!=null?' · '+x.km+' km':''} · {new Date(x.saat).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</p>
   <B disabled={!!busy} onClick={()=>is('kabul',x.id)}>{busy==='kabul'+x.id?'Alınıyor…':'Kabul et'}</B></div>)}
  {!d.acik.length&&<div style={S.card}><p style={S.mut}>{onayli.length?'Şu an bekleyen paket yok. Yeni paket gelince bildirim alırsınız.':'Henüz onaylı bir işletmeniz yok.'}</p></div>}
  {bekleyen.length>0&&<p style={S.mut}>Onay bekleyen: {bekleyen.map(x=>x.ad).join(', ')}</p>}
  {onayli.length>0&&<p style={{...S.mut,marginTop:6}}>İşletmeleriniz: {onayli.map(x=>x.ad).join(', ')}</p>}
  <p style={{...S.mut,fontSize:'.78rem',marginTop:18}}>Ücretleri işletme belirler ve size doğrudan öder; Dinlio Go yalnızca paketleri sayar. Yeni bir işletmeye katılmak için o işletmenin QR kodunu okutun.</p></div>;}
