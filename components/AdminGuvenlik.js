'use client';
// Admin → Genel bakış → Güvenlik ve yedek
import {useEffect,useState} from 'react';
const kb=n=>n>1e6?(n/1e6).toFixed(1)+' MB':Math.max(1,Math.round(n/1e3))+' KB';
export default function AdminGuvenlik({tok,cikis}){
 const [y,setY]=useState(null),[g,setG]=useState(null),[m,setM]=useState(''),[bz,setBz]=useState(false);
 const H=async()=>({'content-type':'application/json',authorization:'Bearer '+await tok()});
 const yukle=async()=>{try{const [a,b]=await Promise.all([fetch('/api/admin/yedek',{headers:await H()}),fetch('/api/admin/guvenlik',{headers:await H()})]);
  const ja=await a.json(),jb=await b.json();if(!a.ok)throw new Error(ja.error);if(!b.ok)throw new Error(jb.error);setY(ja);setG(jb);}catch(e){setM(e.message);}};
 useEffect(()=>{yukle();},[]);
 const al=async()=>{setBz(true);setM('');try{const r=await fetch('/api/admin/yedek',{method:'POST',headers:await H(),body:JSON.stringify({islem:'al'})});const j=await r.json();if(!r.ok)throw new Error(j.error);setM('Yedek alındı ✓ '+kb(j.boyut));yukle();}catch(e){setM('Yedek alınamadı: '+e.message);}setBz(false);};
 const indir=async ad=>{try{const r=await fetch('/api/admin/yedek',{method:'POST',headers:await H(),body:JSON.stringify({islem:'indir',ad})});const j=await r.json();if(!r.ok)throw new Error(j.error);location.href=j.url;}catch(e){setM(e.message);}};
 const kapat=async()=>{if(!confirm('Bütün cihazlardaki admin oturumları kapatılacak (bu cihaz dahil). Tekrar Google ile girmen gerekecek. Devam?'))return;
  try{const r=await fetch('/api/admin/guvenlik',{method:'POST',headers:await H(),body:JSON.stringify({islem:'cikis_hepsi'})});const j=await r.json();if(!r.ok)throw new Error(j.error);cikis?.();}catch(e){setM(e.message);}};
 return <div className="card sec2"><h2>🔒 Güvenlik ve yedek</h2>
  {m&&<p className="mut">{m}</p>}
  <h3 style={{marginTop:10}}>Yedekler</h3>
  <p className="mut" style={{fontSize:'.85rem'}}>Her Pazar gecesi işletmeler, siparişler, aramalar, randevular ve menüler otomatik yedeklenir, son 8 yedek saklanır. Gizli anahtarlar yedeğe alınmaz. Arada bir en yenisini indirip bilgisayarında ya da bir USB bellekte sakla; site tamamen kaybolsa bile veri sende kalır. İçinde müşteri telefonları var, kimseyle paylaşma.</p>
  {!y?<p className="mut">Yükleniyor…</p>:<>
   <p style={{margin:'6px 0'}}>{y.son?<>Son yedek: <b>{new Date(y.son.tarih).toLocaleString('tr-TR')}</b> · {kb(y.son.boyut)} · {y.son.sayim?.businesses||0} işletme, {y.son.sayim?.calls||0} arama</>:'Henüz yedek yok.'}</p>
   <div className="row" style={{justifyContent:'flex-start',gap:8,flexWrap:'wrap'}}><button disabled={bz} onClick={al}>{bz?'Yedekleniyor…':'Şimdi yedek al'}</button>
    {y.liste.slice(0,4).map(x=><button key={x.ad} className="g" onClick={()=>indir(x.ad)}>⬇ {x.ad.slice(13,23)}</button>)}</div></>}
  <h3 style={{marginTop:16}}>Son admin girişleri</h3>
  <p className="mut" style={{fontSize:'.85rem'}}>Yeni bir şehirden/ülkeden ya da yeni bir cihazdan girilince telefonuna bildirim gelir. Admin e-postanla şifreyle (Google'sız) girilmeye çalışılırsa da uyarı gelir.</p>
  {!g?<p className="mut">Yükleniyor…</p>:<div style={{display:'grid',gap:4,marginTop:6}}>
   {g.liste.map((x,i)=><div key={i} className="mut" style={{fontSize:'.85rem'}}>{x.cihaz===g.simdi.cihaz&&x.konum===((g.simdi.sehir||'?')+'/'+(g.simdi.ulke||'?'))?'🟢 ':'• '}{x.konum.replace('/',', ')} · {x.cihaz} · IP {x.ip} · son: {new Date(x.son).toLocaleString('tr-TR')}</div>)}
   <div><button className="g" style={{marginTop:8,color:'#b91c1c'}} onClick={kapat}>Tanımadığım giriş var: bütün oturumları kapat</button></div></div>}</div>;}
