'use client';
// SAHA MODU (telefon için): "İşletme öner"e bas, sana en yakın ve Dinlio'yu alma ihtimali en yüksek işletmeyi göstersin,
// yol tarifi versin, ne söyleyeceğini hatırlatsın. Ziyaretten sonra sonucu işaretle, sıradakine geç.
import {useEffect,useState} from 'react';import {useRouter} from 'next/navigation';import {sb} from '@/lib/supabase';import {useUser} from '@/lib/useAuth';import {yakindakiler} from '@/lib/saha';
const api=async(method,body)=>{const {data}=await sb.auth.getSession();const r=await fetch('/api/admin/saha',{method,headers:{'content-type':'application/json',authorization:'Bearer '+(data.session?.access_token||'')},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
const ls={get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch{return d;}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
const SON=[['demo','Demo yaptım, ilgilendi','✅'],['ilgilendi','İlgilendi, tekrar gel','🙂'],['sonra','Yetkili yoktu, sonra gel','⏳'],['ilgilenmedi','İlgilenmedi','✖'],['kapali','Kapalı / bulunamadı','🚪'],['musteri','Müşteri oldu!','🎉']];
const km=m=>m<1000?m+' m':(m/1000).toFixed(1).replace('.',',')+' km';
const konumAl=()=>new Promise((ok,no)=>{if(!navigator.geolocation)return no(new Error('Bu cihaz konum vermiyor.'));
 navigator.geolocation.getCurrentPosition(p=>ok({lat:p.coords.latitude,lon:p.coords.longitude}),e=>no(new Error(e.code===1?'Konum izni verilmedi. Tarayıcı ayarlarından bu siteye konum izni verin.':'Konum alınamadı, açık alanda tekrar deneyin.')),{enableHighAccuracy:true,timeout:15000,maximumAge:30000});});
export default function Saha(){
 const u=useUser(),r=useRouter(),[isA,setIsA]=useState(false),[o,setO]=useState(null),[alt,setAlt]=useState([]),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[gun,setGun]=useState(null),[hedef,setHedef]=useState(10),[atla,setAtla]=useState([]),[not,setNot]=useState(''),[sonucAc,setSonucAc]=useState(false),[toplam,setToplam]=useState(0);
 useEffect(()=>{if(u===null)location.replace('/login');else if(u)sb.rpc('is_admin').then(({data})=>{if(data===true)setIsA(true);else r.replace('/panel');});},[u]);
 const durum=()=>api('GET').then(setGun).catch(()=>{});
 useEffect(()=>{if(!isA)return;setHedef(ls.get('saha_hedef',10));const s=ls.get('saha_atla',{g:'',l:[]});if(s.g===new Date().toDateString())setAtla(s.l);durum();},[isA]);
 const oner=async(ek=[])=>{setBusy(true);setMsg('Konumun alınıyor…');setSonucAc(false);setNot('');try{const k=await konumAl();setMsg('Yakındaki işletmeler taranıyor…');
  // Haritayı telefonun kendisi tarar (Türkiye'den, en hızlı); olmazsa sunucu dener
  let liste=[];try{liste=await yakindakiler(k.lat,k.lon,1500);if(liste.length<8)liste=liste.concat(await yakindakiler(k.lat,k.lon,3000).catch(()=>[]));}catch{}
  const j=await api('POST',{islem:'oner',...k,atla:[...atla,...ek],liste:liste.slice(0,500)});setO(j.oneri);setAlt(j.alternatif||[]);setToplam(j.toplam||0);setMsg(j.oneri?(j.uyari||''):'Yakında önerilecek uygun işletme kalmadı. Biraz yürüyüp tekrar dene ya da başka bir mahalleye geç.');}
  catch(e){setMsg(e.message);}setBusy(false);};
 const gec=()=>{if(!o)return;const l=[...atla,o.id];setAtla(l);ls.set('saha_atla',{g:new Date().toDateString(),l});if(alt.length){setO(alt[0]);setAlt(alt.slice(1));setSonucAc(false);}else oner([o.id]);};
 const kaydet=async(s)=>{if(!o)return;setBusy(true);try{await api('POST',{islem:'sonuc',id:o.id,sonuc:s,not});setMsg(s==='musteri'?'Tebrikler! 🎉 Admin panelden işletmeyi oluşturmayı unutma.':'Kaydedildi. Sıradaki işletme geliyor…');await durum();
  const l=[...atla,o.id];setAtla(l);ls.set('saha_atla',{g:new Date().toDateString(),l});setO(null);setSonucAc(false);setTimeout(()=>oner([o.id]),400);}catch(e){setMsg(e.message);setBusy(false);}};
 if(!isA)return null;
 const yapilan=gun?.bugun?.length||0,y=Math.min(100,Math.round(yapilan/Math.max(1,hedef)*100));
 const sayi=k=>(gun?.bugun||[]).filter(x=>x.ziyaret_sonuc===k).length;
 return <div style={{maxWidth:520,margin:'0 auto',padding:'16px 14px 90px',minHeight:'100dvh'}}>
  <div className="row" style={{marginBottom:12}}><div><h1 style={{margin:0,fontSize:'1.35rem'}}>Saha modu</h1><p className="mut" style={{margin:'2px 0 0',fontSize:'.85rem'}}>Yakınındaki en umutlu işletmeye git</p></div><a className="lb" href="/admin">Panel</a></div>
  <div className="card" style={{padding:14}}>
   <div className="row"><b>Bugünkü hedef: {yapilan} / {hedef} ziyaret</b><select value={hedef} onChange={e=>{setHedef(+e.target.value);ls.set('saha_hedef',+e.target.value);}} style={{width:'auto',margin:0,padding:'4px 8px'}}>{[5,8,10,15,20].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
   <div className="bar" style={{marginTop:8}}><b style={{width:y+'%'}}/></div>
   <p className="mut" style={{fontSize:'.82rem',marginTop:6}}>{yapilan?`✅ ${sayi('demo')} demo · 🙂 ${sayi('ilgilendi')} ilgilendi · ⏳ ${sayi('sonra')} sonra · ✖ ${sayi('ilgilenmedi')} hayır${sayi('musteri')?` · 🎉 ${sayi('musteri')} müşteri`:''}`:'Henüz ziyaret yok. Hadi başlayalım 💪'}</p></div>

  {!o&&<button disabled={busy} onClick={()=>oner()} style={{width:'100%',padding:'22px 16px',fontSize:'1.2rem',fontWeight:800,borderRadius:18,marginTop:6}}>{busy?'Aranıyor…':'📍 İşletme öner'}</button>}
  {msg&&<p className="mut" style={{textAlign:'center',marginTop:10}}>{msg}</p>}

  {o&&<div className="card" style={{marginTop:10,padding:16}}>
   <div className="row" style={{alignItems:'flex-start'}}><div><span className="tag">{o.sektor}</span><h2 style={{margin:'8px 0 2px',fontSize:'1.35rem'}}>{o.ad}</h2>
    <p className="mut" style={{margin:0}}>{km(o.mesafe)} · yürüyerek ~{o.yuruyus} dk{o.adres?' · '+o.adres:''}</p></div>
    <div style={{textAlign:'center',minWidth:58}}><div style={{fontSize:'1.6rem',fontWeight:900}}>{Math.max(1,Math.min(99,o.puan))}</div><small className="mut">potansiyel</small></div></div>
   <ul style={{margin:'12px 0 0 18px',padding:0,fontSize:'.92rem'}}>{o.neden.map(n=><li key={n}>{n}</li>)}</ul>
   {o.acik&&<p className="mut" style={{fontSize:'.82rem',marginTop:6}}>Çalışma saati: {o.acik}</p>}
   <div style={{marginTop:12,padding:12,borderRadius:12,background:'var(--soft)',border:'1px solid var(--line)'}}>
    <small className="mut">Derdi muhtemelen</small><p style={{margin:'2px 0 8px'}}>{o.aci}</p>
    <small className="mut">Sen de şunu söyle</small><p style={{margin:'2px 0 0',fontWeight:600}}>“{o.soz}”</p>
    <p className="mut" style={{fontSize:'.78rem',margin:'8px 0 0'}}>İpucu: konuşmayı demoyla aç. Telefonundan asistanı arat, siparişin/randevunun ekrana düştüğünü göster. Sonra “1 hafta ücretsiz deneyin” de.</p></div>
   <div className="row" style={{gap:8,marginTop:12,flexWrap:'wrap'}}>
    <a className="lb" href={o.yol} target="_blank" rel="noopener noreferrer" style={{flex:1,textAlign:'center',padding:'12px 10px',fontWeight:700}}>🧭 Yol tarifi</a>
    {o.telefon&&<a className="lb" href={'tel:'+o.telefon} style={{padding:'12px 14px'}}>📞</a>}
    <a className="lb" href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(o.ad+(o.adres?' '+o.adres:''))} target="_blank" rel="noopener noreferrer" style={{padding:'12px 14px'}} title="Google Haritalar'da yorumlarına bak">⭐</a>
    <button className="g" disabled={busy} onClick={gec} style={{padding:'12px 14px'}}>Geç ›</button></div>
   {!sonucAc?<button style={{width:'100%',marginTop:10,padding:'14px 10px',fontWeight:700}} onClick={()=>setSonucAc(true)}>Vardım, sonucu gir</button>
   :<div style={{marginTop:12}}>
    <textarea rows="2" placeholder="Not (isteğe bağlı): yetkilinin adı, ne dedi, ne zaman tekrar gel…" value={not} onChange={e=>setNot(e.target.value)} style={{marginBottom:8}}/>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{SON.map(([k,l,i])=><button key={k} disabled={busy} className={k==='musteri'||k==='demo'?'':'g'} onClick={()=>kaydet(k)} style={{padding:'12px 8px',fontSize:'.9rem'}}>{i} {l}</button>)}</div></div>}
   {alt.length>0&&<details style={{marginTop:12}}><summary className="mut" style={{cursor:'pointer'}}>Yakındaki diğer seçenekler ({toplam} aday)</summary>
    {alt.map(a=><div key={a.id} className="row" style={{padding:'8px 0',borderTop:'1px solid var(--line)'}}><div><b>{a.ad}</b><br/><small className="mut">{a.sektor} · {km(a.mesafe)}</small></div><button className="g" onClick={()=>{setAlt([o,...alt.filter(x=>x.id!==a.id)]);setO(a);setSonucAc(false);}} style={{padding:'6px 10px'}}>Buna git</button></div>)}</details>}
  </div>}

  {gun?.takip?.length>0&&<div className="card" style={{marginTop:14,padding:14}}><h2 style={{fontSize:'1rem'}}>Tekrar gidilecekler</h2>
   {gun.takip.map(t=><div key={t.id} className="row" style={{padding:'8px 0',borderTop:'1px solid var(--line)',alignItems:'flex-start'}}><div><b>{t.name}</b><br/><small className="mut">{SON.find(s=>s[0]===t.ziyaret_sonuc)?.[1]} · {new Date(t.ziyaret_at).toLocaleDateString('tr-TR',{day:'numeric',month:'short'})}</small>{t.notes&&<><br/><small>{t.notes}</small></>}</div>
    {t.lat&&<a className="lb" href={`https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lon}&travelmode=walking`} target="_blank" rel="noopener noreferrer" style={{padding:'6px 10px'}}>🧭</a>}</div>)}</div>}
  <p className="mut" style={{fontSize:'.75rem',textAlign:'center',marginTop:16}}>Öneriler haritadaki işletme bilgilerine göre tahmindir. Konumun sadece öneri için kullanılır, kaydedilmez.</p>
 </div>;}
