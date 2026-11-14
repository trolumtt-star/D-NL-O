'use client';
// Admin → Genel bakış: siteden kendi kaydolan işletmeler. Varsayılan deneme hakkı, işletme bazında deneme dakikası/günü
// (0 yaparak "hakkı biten" durumu test edilebilir) ve "kurulum tamamlandı" işareti (panelde 24 saat uyarısını kaldırır).
import {useEffect,useState} from 'react';
const gunK=t=>Math.ceil((new Date(t)-Date.now())/864e5);
export default function AdminKayitlar({list,tok,yenile}){
 const [v,setV]=useState(null),[f,setF]=useState({}),[m,setM]=useState(''),[busy,setBusy]=useState('');
 const api=async(method,body)=>{const r=await fetch('/api/admin/deneme',{method,headers:{'content-type':'application/json',authorization:'Bearer '+await tok()},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 useEffect(()=>{api('GET').then(j=>setV(j.varsayilan)).catch(e=>setM(e.message));},[]);
 const is=async(k,body,ok)=>{setBusy(k);setM('');try{const j=await api('POST',body);setM(typeof ok==='function'?ok(j):ok);yenile&&yenile();}catch(e){setM('Hata: '+e.message);}setBusy('');};
 const yk=list.filter(x=>x.settings?.kayit).sort((a,c)=>new Date(c.created_at)-new Date(a.created_at)).slice(0,50);
 const bekleyen=yk.filter(x=>x.settings?.deneme&&!x.settings?.kurulum_onay).length;
 return <div className="card" style={{marginBottom:16}}>
  <div className="row" style={{flexWrap:'wrap',gap:10,alignItems:'flex-end'}}><div><h2>Kendi kaydolanlar {bekleyen>0&&<span className="tag x">{bekleyen} kurulum bekliyor</span>}</h2>
   <p className="mut" style={{margin:'4px 0 0'}}>Siteden hesap açanlar. Panellerinde "kurulum 24 saat içinde tamamlanacak" yazar; kontrol edip <b>Kurulum tamam</b>'a basın. Paket alanlara numara bağlayın.</p></div>
   {v&&<div className="row" style={{gap:6,alignItems:'flex-end',flexWrap:'wrap'}}><label style={{margin:0}}><small className="mut">Yeni hesaplara gün</small><input type="number" min={0} max={90} style={{width:80,margin:0}} value={f.vg??v.gun} onChange={e=>setF({...f,vg:e.target.value})}/></label>
    <label style={{margin:0}}><small className="mut">dakika</small><input type="number" min={0} max={1000} style={{width:90,margin:0}} value={f.vd??v.dk} onChange={e=>setF({...f,vd:e.target.value})}/></label>
    <button disabled={busy==='v'} onClick={()=>is('v',{islem:'varsayilan',gun:f.vg??v.gun,dk:f.vd??v.dk},j=>{setV(j.varsayilan);setF({...f,vg:undefined,vd:undefined});return `Yeni hesaplar artık ${j.varsayilan.gun} gün / ${j.varsayilan.dk} dk deneme alacak${!j.varsayilan.gun||!j.varsayilan.dk?' (0 olduğu için doğrudan paket seçmeleri istenecek)':''}.`;})}>Kaydet</button></div>}</div>
  {m&&<p className="mut" style={{marginTop:8}}>{m}</p>}
  {!yk.length?<p className="mut" style={{marginTop:10}}>Henüz kendi kaydolan yok.</p>:<div style={{overflowX:'auto',marginTop:10}}><table><thead><tr><th>İşletme</th><th>Durum</th><th>Deneme hakkı</th><th>Kurulum</th><th>Numara</th></tr></thead><tbody>
  {yk.map(x=>{const ab=x.settings?.abonelik,dn=x.settings?.deneme,k=f[x.id]||{},kDk=Math.max(0,(x.quota_minutes_total||0)+(x.ek_dakika||0)-Math.ceil((x.quota_seconds_used||0)/60)),
    gunT=dn?.gun??Math.round((new Date(dn?.bitis||Date.now())-new Date(x.created_at))/864e5);
   return <tr key={x.id}><td><b>{x.name}</b><br/><span className="mut" style={{fontSize:'.78rem'}}>{x.vertical} · {x.phone_number||''} · {x.email}<br/>{new Date(x.created_at).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span></td>
    <td>{ab?<span className="tag">💳 {ab.paket?.toUpperCase()}{ab.all?' AIO':''}{ab.yil?' yıllık':''} · {gunK(ab.bitis)} gün</span>
     :dn?<><span className={'tag'+(x.status==='suspended'?' x':'')}>{x.status==='suspended'?'⛔ Hakkı bitti':'Deneme'}</span><div className="mut" style={{fontSize:'.78rem',marginTop:3}}>{Math.max(0,gunK(dn.bitis))} gün · {kDk}/{x.quota_minutes_total} dk kaldı</div></>:'-'}
     <div className="mut" style={{fontSize:'.78rem'}}>{x.vapi_assistant_id?'✓ asistan kuruldu':'asistan kurulmadı'}</div></td>
    <td>{dn&&!ab?<div className="row" style={{gap:4,flexWrap:'nowrap',alignItems:'center'}}>
      <input type="number" min={0} max={1000} title="Toplam deneme dakikası" style={{width:70,margin:0}} value={k.dk??x.quota_minutes_total} onChange={e=>setF({...f,[x.id]:{...k,dk:e.target.value}})}/><small className="mut">dk</small>
      <input type="number" min={0} max={90} title="Kayıttan itibaren toplam gün" style={{width:60,margin:0}} value={k.gun??gunT} onChange={e=>setF({...f,[x.id]:{...k,gun:e.target.value}})}/><small className="mut">gün</small>
      <button disabled={busy===x.id} onClick={()=>is(x.id,{islem:'degistir',id:x.id,dk:k.dk,gun:k.gun},j=>{setF({...f,[x.id]:undefined});return `${x.name}: ${j.durum==='suspended'?'hakkı bitti, asistan durduruldu, panelde "Paket yükselt" görünüyor':'deneme aktif, asistan çalışıyor'}.`;})}>Kaydet</button>
      <button className="g" title="Hakkı sıfırla (test)" disabled={busy===x.id} onClick={()=>confirm(x.name+' için deneme dakikası 0 yapılsın mı? Asistanı hemen durur.')&&is(x.id,{islem:'degistir',id:x.id,dk:0},`${x.name}: deneme 0 dk yapıldı, asistan durdu.`)}>0</button></div>:<span className="mut">—</span>}</td>
    <td>{x.settings?.kurulum_onay?<><span className="tag">✓ Tamam</span> <a className="lnk" style={{fontSize:'.75rem'}} onClick={()=>is('k'+x.id,{islem:'kurulum',id:x.id,tamam:false},'Kurulum işareti kaldırıldı.')}>geri al</a></>
     :<button disabled={busy==='k'+x.id} onClick={()=>is('k'+x.id,{islem:'kurulum',id:x.id,tamam:true},`${x.name}: kurulum tamamlandı, işletmeye bildirim gitti.`)}>Kurulum tamam</button>}</td>
    <td>{x.vapi_phone_id?<span className="tag">✓</span>:ab?<span className="tag x">Bağlanmalı</span>:'—'}</td></tr>;})}</tbody></table></div>}</div>;}
