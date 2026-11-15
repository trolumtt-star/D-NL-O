'use client';
// CANLI DEMO: ziyaretçi sektörünü seçer, işletme bilgilerini (hazır örnek ya da kendi bilgileri) girer, asistanla konuşur.
// Konuşurken asistanın aldığı bilgiler aşağıdaki "panel" kartına canlı düşer (demo_kaydet aracı → /api/demo/kart).
import {useEffect,useRef,useState} from 'react';import '@/components/ks.css';import SesliDeneme from '@/components/SesliDeneme';import {SK} from '@/lib/demoSektor';
const BASLIK={siparis:'🛵 Yeni sipariş',randevu:'📅 Yeni randevu',rezervasyon:'🏨 Yeni rezervasyon',talep:'📋 Yeni talep'};
const ALANLAR=s=>s.tur==='siparis'?[['musteri','Müşteri'],['istek','Sipariş'],['adres','Adres'],['tutar','Tutar'],['telefon','Telefon'],['not','Not']]
 :s.tur==='rezervasyon'?[['musteri','Misafir'],['istek','Oda'],['tarih','Tarih'],['kisi','Kişi'],['tutar','Tutar'],['telefon','Telefon']]
 :s.tur==='talep'?[['musteri','Müşteri'],['istek','Talep'],['tutar','Bütçe'],['tarih','Görüşme'],['saat','Saat'],['telefon','Telefon']]
 :[['musteri','Müşteri'],['istek','Hizmet'],['tarih','Gün'],['saat','Saat'],['kisi',s.kisi||'Ek'],['telefon','Telefon']];
export default function Demo(){
 const [g,setG]=useState(false),[sec,setSec]=useState(null),[f,setF]=useState(null),[cid,setCid]=useState(null),[d,setD]=useState('hazir'),[kart,setKart]=useState(null),[yeni,setYeni]=useState({});const onceki=useRef({});
 useEffect(()=>{setG(new URLSearchParams(location.search).has('gomulu'));},[]);
 const sec_=s=>{setSec(s);setF({isletme:s.isletme,liste:s.liste,saatler:s.saatler,ek:s.ek});setKart(null);setCid(null);};
 // Konuşma sürerken ve bittikten sonraki 12 sn boyunca kartı oku
 useEffect(()=>{if(!cid)return;let dur=false,bitis=null;const oku=async()=>{if(dur)return;try{const r=await fetch('/api/demo/kart?c='+cid,{cache:'no-store'});const j=await r.json();
   if(j.kart){const deg={};for(const [k,v] of Object.entries(j.kart))if(onceki.current[k]!==v)deg[k]=Date.now();onceki.current=j.kart;if(Object.keys(deg).length)setYeni(y=>({...y,...deg}));setKart(j.kart);}}catch{}};
  const i=setInterval(()=>{if(d==='bitti'){bitis=bitis||Date.now();if(Date.now()-bitis>12000){clearInterval(i);return;}}oku();},1500);return()=>{dur=true;clearInterval(i);};},[cid,d]);
 const kisalt=x=>String(x||'').replace(/[{}]/g,'').slice(0,300);
 const ayar=sec&&f?{variableValues:{isletme:kisalt(f.isletme)||sec.isletme,sektor:sec.ad.toLowerCase(),gorev:sec.gorev,liste:kisalt(f.liste),saatler:kisalt(f.saatler),ek:kisalt(f.ek),alanlar:sec.alanlar}}:null;
 const W={...(g?{padding:'8px 4px'}:{})};
 return <div className="ks" style={g?{background:'transparent',minHeight:0}:{}}><div className="ks-w" style={W}>
  {!g&&<div className="ks-top"><a className="ks-logo" href="/"><i>🎙</i><span>Dinlio <b>AI</b></span></a><a href="/kayit" style={{color:'var(--ink2)',fontSize:'.9rem'}}>Ücretsiz dene</a></div>}
  {!sec?<>
   <h1 style={{textAlign:'center'}}>Telefonun öbür ucunda <em>Dinlio</em> var.</h1>
   <p className="ks-alt" style={{textAlign:'center'}}>Sektörünü seç, asistanla müşterin gibi konuş. Aldığı bilgiler aynı anda işletme panelinde nasıl göründüğünü göreceksin.</p>
   <div className="dm-sek">{SK.map((s,i)=><button key={s.id} className="ni" style={{animationDelay:i*40+'ms'}} onClick={()=>sec_(s)}><span>{s.i}</span>{s.ad}</button>)}</div></>
  :<>
   <div className="ks-top" style={{marginBottom:8}}><button className="ni dm-geri" onClick={()=>d!=='konusuyor'&&d!=='baglaniyor'&&setSec(null)}>← Sektörler</button><span className="ks-pill"><b>{sec.i} {sec.ad}</b></span></div>
   {(d==='hazir'||d==='bitti')&&!kart&&<details className="ks-kart dm-bilgi" open={!g}><summary><b>İşletme bilgileri</b> <span style={{color:'var(--mute)',fontSize:'.8rem'}}>· örnek dolu, istersen kendi bilgilerini yaz</span></summary>
    <label>İşletme adı</label><input value={f.isletme} maxLength={80} onChange={e=>setF({...f,isletme:e.target.value})}/>
    <label>{sec.tur==='siparis'?'Ürünler ve fiyatlar':sec.tur==='rezervasyon'?'Odalar ve fiyatlar':sec.tur==='talep'?'Portföy':'Hizmetler ve fiyatlar'}</label><textarea rows={3} maxLength={300} value={f.liste} onChange={e=>setF({...f,liste:e.target.value})}/>
    <label>Çalışma saatleri</label><input value={f.saatler} maxLength={120} onChange={e=>setF({...f,saatler:e.target.value})}/>
    <label>Ek bilgi</label><input value={f.ek} maxLength={200} onChange={e=>setF({...f,ek:e.target.value})}/></details>}
   <SesliDeneme key={sec.id} sektor={sec.id} ayar={ayar} onCagri={id=>{onceki.current={};setYeni({});setKart(null);setCid(id);}} onDurum={setD} yaziGizle={!!kart} altMetin={<>Şöyle başlayabilirsin: <b style={{color:'#fff'}}>{sec.ornek}</b></>}/>
   {(cid&&(d==='konusuyor'||kart))&&<div className="dm-panel">
    <div className="dm-bar"><i/><i/><i/><span>Dinlio Panel · {f.isletme}</span></div>
    <div className={'dm-kart'+(kart?.durum==='onaylandi'?' ok':'')}>
     <div className="dm-ust"><b>{BASLIK[sec.tur]}</b>{kart?.durum==='onaylandi'?<span className="dm-rozet ok">✓ Onaylandı</span>:<span className="dm-rozet"><i/>Canlı</span>}</div>
     {!kart?<p className="dm-bek">Konuştukça bilgiler buraya düşecek…</p>
      :ALANLAR(sec).filter(([k])=>kart[k]).map(([k,l])=><div key={k} className={'dm-satir'+(Date.now()-(yeni[k]||0)<2500?' yeni':'')}><span>{l}</span><b>{kart[k]}</b></div>)}
     <div className="dm-alt">şimdi · Telefon · Dinlio AI</div></div>
    {kart?.durum==='onaylandi'&&<a className="ks-btn" style={{display:'grid',placeItems:'center',textDecoration:'none'}} href="/kayit" target={g?'_top':undefined}>Bunu kendi işletmem için istiyorum →</a>}</div>}
  </>}
  {!sec&&<a className="ks-btn g" style={{display:'grid',placeItems:'center',textDecoration:'none'}} href="/kayit" target={g?'_top':undefined}>Kendi işletmen için 7 gün ücretsiz dene</a>}
  {sec&&!(kart?.durum==='onaylandi')&&<a href="/kayit" target={g?'_top':undefined} style={{display:'block',textAlign:'center',marginTop:18,color:'var(--ink2)',fontSize:'.9rem'}}>Kendi işletmen için 7 gün ücretsiz dene →</a>}
 </div></div>;}
