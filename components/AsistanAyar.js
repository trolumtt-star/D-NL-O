'use client';
// Ayarlar → Asistan: tatil/kapalı modu ve kara liste (her paket), kampanya duyurusu (Standart+), bilgi bankası (Büyük+).
import {useEffect,useState} from 'react';import {waLink} from '@/lib/destek';
export default function AsistanAyar({tok}){
 const [d,setD]=useState(null),[f,setF]=useState({}),[msg,setMsg]=useState(''),[busy,setBusy]=useState('');
 const api=async(m,body)=>{const r=await fetch('/api/isletme-ayar',{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+await tok()},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 const doldur=j=>{setD(j);setF({tatil:j.tatil.aktif,tmesaj:j.tatil.mesaj||'',kara:(j.kara_liste||[]).map(n=>'0'+n).join('\n'),kamp:j.kampanya.aktif,kmetin:j.kampanya.metin||'',bilgi:j.bilgi||''});};
 useEffect(()=>{api('GET').then(doldur).catch(e=>setMsg(e.message));},[]);
 const kaydet=async(islem,body,ok)=>{setBusy(islem);setMsg('');try{doldur(await api('POST',{islem,...body}));setMsg(ok);}catch(e){setMsg(e.message);}setBusy('');};
 if(!d)return <div className="card sec2"><h2>Asistan ayarları</h2><p className="mut">{msg||'Yükleniyor…'}</p></div>;
 const kilit=(ad,p)=><p style={{marginTop:6}}>🔒 {ad} <b>{p}</b> paketten itibaren açılır. <a className="lnk" href={waLink('Merhaba, paketimi yükseltmek istiyorum.')} target="_blank" rel="noopener">Paketi yükselt</a></p>;
 return <>
  <div className="card sec2"><h2>Kapalı / tatil modu</h2>
   <p className="mut">Açıkken asistan aramayı "şu an kapalıyız" diye karşılar, talebi not alır. Randevulu işletmelerde çalışma saatleri dışında da otomatik böyle açar ama randevu vermeye devam eder.</p>
   <label className="ck" style={{marginTop:8}}><input type="checkbox" style={{width:'auto'}} checked={!!f.tatil} onChange={e=>setF({...f,tatil:e.target.checked})}/> Bugün / şu an kapalıyız</label>
   <input value={f.tmesaj} maxLength={200} onChange={e=>setF({...f,tmesaj:e.target.value})} placeholder="İsteğe bağlı not, ör. Pazartesi 09:00'da açılıyoruz."/>
   <button disabled={busy==='tatil'} onClick={()=>kaydet('tatil',{aktif:f.tatil,mesaj:f.tmesaj},f.tatil?'Kapalı modu açıldı.':'Kapalı modu kapatıldı.')}>Kaydet</button></div>
  <div className="card sec2"><h2>Kara liste</h2>
   <p className="mut">Bu numaralar aradığında asistan açmaz, dakikanız da harcanmaz. Her satıra bir numara.</p>
   <textarea rows="3" value={f.kara} onChange={e=>setF({...f,kara:e.target.value})} placeholder={'05xx xxx xx xx\n05xx xxx xx xx'}/>
   <button disabled={busy==='kara_liste'} onClick={()=>kaydet('kara_liste',{numaralar:f.kara.split(/[\n,;]+/)},'Kara liste kaydedildi.')}>Kaydet</button></div>
  <div className="card sec2"><h2>Kampanya duyurusu</h2>
   {d.paket.kampanya?<><p className="mut">Asistan sipariş veya randevu kesinleşince bunu bir kez, kısaca söyler.</p>
    <label className="ck" style={{marginTop:8}}><input type="checkbox" style={{width:'auto'}} checked={!!f.kamp} onChange={e=>setF({...f,kamp:e.target.checked})}/> Kampanya açık</label>
    <input value={f.kmetin} maxLength={300} onChange={e=>setF({...f,kmetin:e.target.value})} placeholder="ör. Bu hafta 2 lahmacun + ayran 150 TL."/>
    <button disabled={busy==='kampanya'} onClick={()=>kaydet('kampanya',{aktif:f.kamp,metin:f.kmetin},'Kampanya kaydedildi.')}>Kaydet</button></>:kilit('Kampanya duyurusu',d.enAz.kampanya)}</div>
  <div className="card sec2"><h2>Bilgi bankası</h2>
   {d.paket.bilgi?<><p className="mut">Müşterilerin sık sorduğu şeyleri yazın; asistan buradan cevap verir, burada olmayanı uydurmaz.</p>
    <textarea rows="6" maxLength={4000} value={f.bilgi} onChange={e=>setF({...f,bilgi:e.target.value})} placeholder={'Otopark var mı? Evet, binanın arkasında ücretsiz.\nKartla ödeme var mı? Evet, kapıda da kart geçer.\nÇocuk menüsü var mı? Var, 120 TL.'}/>
    <p className="mut" style={{fontSize:'.8rem'}}>{f.bilgi.length} / 4000 karakter</p>
    <button disabled={busy==='bilgi'} onClick={()=>kaydet('bilgi',{metin:f.bilgi},'Bilgi bankası kaydedildi.')}>Kaydet</button></>:kilit('Bilgi bankası',d.enAz.bilgi)}</div>
  {msg&&<p className="mut" style={{margin:'-6px 0 12px'}}>{msg}</p>}</>;}
