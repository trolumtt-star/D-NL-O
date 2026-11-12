'use client';
// İşletme sahibi: çalışan hesapları. Çalışan kendi kullanıcı adı ve şifresiyle girer,
// yalnızca randevu ekranını görür (çağrılar, siparişler ve ayarlar görünmez).
import {useEffect,useState} from 'react';import {waLink} from '@/lib/destek';
export default function Calisanlar({tok,rsrc=[]}){
 const [l,setL]=useState(null),[sn,setSn]=useState(null),[f,setF]=useState({ad:'',username:'',sifre:'',resource_id:''}),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const api=async(m,body)=>{const r=await fetch('/api/calisan',{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+await tok()},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 const yukle=()=>api('GET').then(j=>{setL(j.liste);setSn(j);}).catch(e=>setMsg(e.message));
 useEffect(()=>{yukle();},[]);
 const ekle=async()=>{setBusy(true);setMsg('');try{await api('POST',{islem:'ekle',...f});setMsg(`Hesap açıldı. Çalışanınıza iletin: adres dinlio.vercel.app/login · kullanıcı adı ${f.username} · şifresini ilk girişte değiştirmesine gerek yok ama kimseyle paylaşmasın.`);setF({ad:'',username:'',sifre:'',resource_id:''});yukle();}catch(e){setMsg(e.message);}setBusy(false);};
 const sil=async(x)=>{if(!confirm(x.ad+' hesabı silinsin mi? Artık giriş yapamaz.'))return;try{await api('POST',{islem:'sil',id:x.id});yukle();}catch(e){setMsg(e.message);}};
 const sifre=async(x)=>{const s=prompt(x.ad+' için yeni şifre (en az 8 karakter):');if(!s)return;try{await api('POST',{islem:'sifre',id:x.id,sifre:s});setMsg('Şifre güncellendi, yeni şifreyi çalışanınıza iletin.');}catch(e){setMsg(e.message);}};
 const usta=async(x,rid)=>{try{await api('POST',{islem:'usta',id:x.id,resource_id:rid});yukle();}catch(e){setMsg(e.message);}};
 return <div className="card sec2"><h2>Çalışan hesapları</h2>
  <p className="mut">Çalışanlarınız kendi girişleriyle <b>sadece randevu ekranını</b> görür: günün randevuları, müşteri adı ve telefonu. Çağrı kayıtları, siparişler ve ayarlar görünmez. Ekipten biriyle eşleştirirseniz "benim randevularım" süzgecini kullanabilir.</p>
  {sn&&!sn.sinir?<p style={{marginTop:8}}>🔒 Çalışan hesapları <b>{sn.enAz}</b> paketten itibaren açılır. <a className="lnk" href={waLink('Merhaba, paketimi yükseltmek istiyorum.')} target="_blank" rel="noopener">Paketi yükselt</a></p>:
  l===null?<p className="mut">Yükleniyor…</p>:<>
  {sn&&<p className="mut" style={{marginTop:4}}>{sn.paket} paket: {l.length} / {sn.sinir} hesap kullanılıyor.</p>}
  {l.length>0&&<table style={{marginTop:8}}><thead><tr><th>Ad</th><th>Kullanıcı adı</th><th>Ekipte</th><th></th></tr></thead><tbody>
   {l.map(x=><tr key={x.id}><td>{x.ad}</td><td style={{fontFamily:'monospace'}}>{x.username}</td>
    <td><select value={x.resource_id||''} onChange={e=>usta(x,e.target.value)} style={{margin:0,maxWidth:160}}><option value="">—</option>{rsrc.filter(r=>r.active).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></td>
    <td style={{whiteSpace:'nowrap'}}><a className="lnk" onClick={()=>sifre(x)}>Şifre değiştir</a> · <a className="lnk" onClick={()=>sil(x)}>Sil</a></td></tr>)}</tbody></table>}
  <div className="frm" style={{marginTop:12}}>
   <label>Ad soyad<input value={f.ad} onChange={e=>setF({...f,ad:e.target.value})} placeholder="ör. Zeynep Yılmaz"/></label>
   <label>Kullanıcı adı<input value={f.username} onChange={e=>setF({...f,username:e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g,'')})} placeholder="ör. zeynep.k"/></label>
   <label>Şifre<input value={f.sifre} onChange={e=>setF({...f,sifre:e.target.value})} placeholder="en az 8 karakter"/></label>
   {rsrc.filter(r=>r.active).length>0&&<label>Ekipten kim?<select value={f.resource_id} onChange={e=>setF({...f,resource_id:e.target.value})}><option value="">Eşleştirme (isteğe bağlı)</option>{rsrc.filter(r=>r.active).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>}
   <button disabled={busy||!f.ad||!f.username||f.sifre.length<8||(sn&&l.length>=sn.sinir)} onClick={ekle}>Hesap aç</button></div>
  {msg&&<p className="mut" style={{marginTop:8}}>{msg}</p>}</>}</div>;}
