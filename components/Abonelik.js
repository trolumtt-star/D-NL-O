'use client';
// Panel: deneme süresi / abonelik durumu, kurulum çağrısı, asistanı tarayıcıdan deneme ve paket satın alma penceresi.
import {useEffect,useState} from 'react';import {createPortal} from 'react-dom';import {PK,paketFiyat} from '@/lib/fiyatlar';import SesliDeneme from '@/components/SesliDeneme';
const tl=n=>n.toLocaleString('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2});
const kalanGun=t=>Math.max(0,Math.ceil((new Date(t)-Date.now())/864e5));
function PaketAl({tok,b,kapat,ilk}){
 const [s,setS]=useState({id:ilk?.paket||'m',all:!!ilk?.all,yil:!!ilk?.yil}),[kur,setKur]=useState(null),[bi,setBi]=useState({ad:'',soyad:'',eposta:b.email||'',tel:String(b.phone_number||'').replace(/\D/g,'').slice(-10)}),
  [adim,setAdim]=useState(1),[busy,setBusy]=useState(false),[hata,setHata]=useState(''),[kod,setKod]=useState(null),[link,setLink]=useState(null),[iban,setIban]=useState(null),[bitti,setBitti]=useState(false);
 useEffect(()=>{fetch('/api/kur').then(r=>r.json()).then(setKur).catch(()=>{});try{const x=JSON.parse(localStorage.getItem('dinlio_odeme_bilgi')||'null');if(x)setBi(o=>({...o,...x}));}catch{}},[]);
 const api=async body=>{const r=await fetch('/api/dakika',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+await tok()},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 useEffect(()=>{if(!kod||bitti)return;const t=setInterval(async()=>{try{const r=await api({islem:'durum',kod});if(r.durum==='odendi'){setBitti(true);clearInterval(t);}}catch{}},5000);return()=>clearInterval(t);},[kod,bitti]);
 const p=paketFiyat({id:s.id,all:s.all,yil:s.yil,ilkAy:!b.settings?.abonelik}),kdv=kur?.kdv??.2,top=kur?.usd?p.usd*kur.usd*(1+kdv):null;
 const ok=bi.ad.trim().length>=2&&bi.soyad.trim().length>=2&&/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(bi.eposta)&&/^5\d{9}$/.test(bi.tel.replace(/\D/g,'').slice(-10));
 const ode=async yontem=>{setBusy(true);setHata('');try{localStorage.setItem('dinlio_odeme_bilgi',JSON.stringify(bi));}catch{}const pen=yontem==='shopier'?window.open('about:blank','_blank'):null;
  try{const j=await api({tur:'paket',paket:s.id,all:s.all,yil:s.yil,yontem,alici:{...bi,tel:bi.tel.replace(/\D/g,'').slice(-10)}});
   if(j.link){setLink(j.link);setKod(j.kod);setAdim(3);if(pen&&!pen.closed)pen.location.href=j.link;}else{pen?.close();if(j.iban){setIban(j);setAdim(4);}else throw new Error('Ödeme sayfası açılamadı.');}}
  catch(e){pen?.close();setHata(e.message);}setBusy(false);};
 return createPortal(<div role="dialog" aria-modal="true" onClick={e=>e.target===e.currentTarget&&!busy&&kapat()} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.78)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
  <div style={{width:'min(600px,100%)',maxHeight:'calc(100dvh - 32px)',overflowY:'auto',position:'relative',background:'#0e0e10',border:'1px solid rgba(255,255,255,.14)',borderRadius:22,padding:'24px 20px',boxShadow:'0 30px 90px -20px #000,0 0 0 1px rgba(255,31,61,.15)'}}>
   <button className="g" onClick={kapat} aria-label="Kapat" style={{position:'absolute',right:12,top:12,padding:'4px 10px'}}>✕</button>
   <h2 style={{marginRight:40}}>{bitti?'Paketin başladı 🎉':'Paketini seç'}</h2>
   {bitti?<><p style={{marginTop:10}}>Ödemen alındı, <b>{p.ad}</b> paketin aktif. Telefon numaranı bağlamak için seninle iletişime geçeceğiz.</p><button style={{marginTop:14}} onClick={()=>location.reload()}>Tamam</button></>
   :adim===1?<>
    <div className="row" style={{gap:8,justifyContent:'flex-start',flexWrap:'wrap',margin:'12px 0'}}>
     <button className={s.all?'g':''} onClick={()=>setS({...s,all:false})}>Çağrı</button><button className={s.all?'':'g'} onClick={()=>setS({...s,all:true})}>All in one</button>
     <span style={{width:12}}/><button className={s.yil?'g':''} onClick={()=>setS({...s,yil:false})}>Aylık</button><button className={s.yil?'':'g'} onClick={()=>setS({...s,yil:true})}>Yıllık · 2 ay bedava</button></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8}}>{PK.map(x=>{const f=paketFiyat({id:x.id,all:s.all,yil:s.yil,ilkAy:!b.settings?.abonelik});return <button key={x.id} className={s.id===x.id?'':'g'} onClick={()=>setS({...s,id:x.id})} style={{display:'block',textAlign:'left',padding:'12px 14px',height:'auto'}}>
     <b style={{display:'block'}}>{x.ad}</b><span style={{fontSize:'.8rem',opacity:.8}}>{x.dk} dk / ay</span><b style={{display:'block',fontSize:'1.15rem',marginTop:4}}>${f.usd}{s.yil?' / yıl':' / ay'}</b>{f.aciklama.includes('ilk ay')&&<span style={{fontSize:'.72rem'}}>ilk ay fiyatı</span>}</button>;})}</div>
    <div style={{padding:12,borderRadius:12,background:'var(--soft)',border:'1px solid var(--line)',marginTop:12}}>
     <div className="row"><span className="mut">{p.aciklama}</span><span>${p.usd}</span></div>
     {top&&<><div className="row"><span className="mut">TL karşılığı (kur {kur.usd.toLocaleString('tr-TR')}){kdv?` + KDV %${Math.round(kdv*100)}`:''}</span><b style={{fontSize:'1.2rem'}}>{tl(top)}</b></div></>}</div>
    <button style={{marginTop:14,width:'100%'}} onClick={()=>setAdim(2)}>Devam</button></>
   :adim===2?<><p className="mut" style={{margin:'8px 0'}}>Fatura ve ödeme sayfası için bilgilerin:</p>
    <div className="frm">{[['ad','Ad'],['soyad','Soyad'],['eposta','E-posta'],['tel','Cep telefonu']].map(([k,l])=><label key={k}>{l}<input value={bi[k]} onChange={e=>setBi({...bi,[k]:e.target.value})} inputMode={k==='tel'?'tel':undefined}/></label>)}</div>
    <div className="row" style={{gap:8,marginTop:14}}><button className="g" onClick={()=>setAdim(1)}>Geri</button><button style={{flex:1}} disabled={!ok||busy} onClick={()=>ode('shopier')}>{busy?'Hazırlanıyor…':`Kartla öde${top?' · '+tl(top):''}`}</button></div>
    <p style={{textAlign:'center',marginTop:8}}><a className="lnk" onClick={()=>ok&&!busy&&ode('iban')}>Havale / EFT ile ödemek istiyorum</a></p></>
   :adim===3?<div style={{textAlign:'center',padding:'10px 0'}}><p>Ödeme sayfası <b>yeni sekmede</b> açıldı. Ödemeyi tamamlayınca bu pencere kendiliğinden algılar.</p>
    {link&&<a className="lb" href={link} target="_blank" rel="noopener" style={{display:'inline-block',marginTop:12}}>Ödeme sayfasını aç</a>}<p className="mut" style={{marginTop:12}}>⏳ Ödeme bekleniyor…</p></div>
   :iban&&<div><p style={{marginTop:8}}>Aşağıdaki hesaba <b>{tl(iban.toplam_tl)}</b> gönderin, açıklamaya <b style={{fontFamily:'monospace'}}>{iban.kod}</b> yazın.</p>
    <p style={{marginTop:8,fontFamily:'monospace'}}>{iban.ad}<br/>{iban.banka}<br/>{iban.iban}</p>
    <button style={{marginTop:12}} onClick={async()=>{await api({islem:'bildirdim',kod:iban.kod});kapat();}}>Gönderdim</button></div>}
   {hata&&<p style={{color:'var(--redInk,#ff8a9a)',marginTop:10}}>{hata}</p>}</div></div>,document.body);}
export default function Abonelik({b,tok}){
 const [ac,setAc]=useState(false),[dene,setDene]=useState(false);const s=b.settings||{},dn=s.deneme,ab=s.abonelik;
 useEffect(()=>{const f=()=>setAc(true);window.addEventListener('paketal',f);return()=>window.removeEventListener('paketal',f);},[]);
 const kartS={border:'1px solid rgba(255,31,61,.45)',background:'radial-gradient(120% 140% at 100% 0%,rgba(255,31,61,.18),transparent 60%)'};
 return <>
  {!b.vapi_assistant_id&&<div className="card" style={kartS}><h2>Asistanını kur ✨</h2><p className="mut" style={{margin:'6px 0 12px'}}>İşini birkaç cümleyle anlat, yapay zekâ sorular sorarak asistanını hazırlasın. 3 dakika sürer.</p><a className="lb" href="/kurulum">Kuruluma başla</a></div>}
  {dn&&!ab&&<div className="card" style={kartS}><div className="row" style={{flexWrap:'wrap',gap:10}}><div><h2>{kalanGun(dn.bitis)>0?`Ücretsiz deneme: ${kalanGun(dn.bitis)} gün kaldı`:'Ücretsiz deneme bitti'}</h2>
   <p className="mut">Deneme dakikası: {Math.max(0,b.quota_minutes_total-Math.ceil((b.quota_seconds_used||0)/60))} / {b.quota_minutes_total} dk. Deneme bitince paket seçerek kesintisiz devam edebilirsin.</p></div><button onClick={()=>setAc(true)}>Paket seç</button></div></div>}
  {ab&&kalanGun(ab.bitis)<=5&&<div className="card" style={kartS}><div className="row" style={{flexWrap:'wrap',gap:10}}><div><h2>{kalanGun(ab.bitis)>0?`Paketin ${kalanGun(ab.bitis)} gün sonra bitiyor`:'Paketinin süresi doldu'}</h2><p className="mut">Asistanın kesintisiz çalışsın diye paketini yenile.</p></div><button onClick={()=>setAc(true)}>Yenile</button></div></div>}
  {b.vapi_assistant_id&&<div className="card"><div className="row" style={{flexWrap:'wrap',gap:10}}><div><h2>Asistanını dene</h2><p className="mut">Telefonu beklemeden tarayıcıdan konuş{!b.vapi_phone_id?'. Telefon numaran paket alındıktan sonra bağlanır':''}.</p></div>
   <div className="row" style={{gap:8}}><a className="lb g" href="/kurulum">Bilgileri güncelle</a><button onClick={()=>setDene(!dene)}>{dene?'Kapat':'🎙 Konuş'}</button></div></div>{dene&&<div style={{marginTop:6}}><SesliDeneme benim tok={tok} kisa/></div>}</div>}
  {ac&&<PaketAl tok={tok} b={b} ilk={dn} kapat={()=>setAc(false)}/>}</>;}
