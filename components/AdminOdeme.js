'use client';
// Admin: ek dakika ödemeleri. Havale gelenleri "Onayla" ile hesaba ekle; Shopier ödemeleri otomatik eklenir.
import {useEffect,useState} from 'react';
const tl=x=>Number(x).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' ₺';
const D={bekliyor:['Bekliyor','x'],bildirildi:['Ödedim dedi','x'],odendi:['Eklendi',''],iptal:['İptal','']};
export default function AdminOdeme({sb,sadeceBekleyen=false}){
 const [l,setL]=useState(null),[msg,setMsg]=useState('');
 const api=async(m,body)=>{const t=(await sb.auth.getSession()).data.session?.access_token;const r=await fetch('/api/admin/odeme',{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+t},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 const yukle=()=>api('GET').then(j=>setL(j.liste||[])).catch(e=>setMsg(e.message));
 useEffect(()=>{yukle();},[]);
 const is=async(kod,islem)=>{if(islem==='onayla'&&!confirm(kod+' kodlu havaleyi bankada gördünüz mü? Onaylarsanız dakikalar hemen eklenir.'))return;try{const r=await api('POST',{kod,islem});setMsg(islem==='onayla'?(r.ok?`${r.dakika} dk eklendi${r.acildi?', asistan yeniden açıldı':''}.`:'Bu ödeme zaten işlenmiş.'):'İptal edildi.');yukle();}catch(e){setMsg(e.message);}};
 if(!l)return null;const g=sadeceBekleyen?l.filter(x=>['bekliyor','bildirildi'].includes(x.durum)&&x.yontem==='iban'):l;
 if(sadeceBekleyen&&!g.length)return null;
 return <div className="card" style={{overflowX:'auto'}}><h2>{sadeceBekleyen?'Onay bekleyen havaleler':'Ek dakika ödemeleri'}</h2>{msg&&<p className="mut">{msg}</p>}
  {!g.length?<p className="mut">Henüz ödeme yok.</p>:<table><thead><tr><th>Tarih</th><th>İşletme</th><th>Kod</th><th>Dakika</th><th>Tutar</th><th>Yöntem</th><th>Durum</th><th></th></tr></thead><tbody>
  {g.map(x=><tr key={x.kod}><td>{new Date(x.created_at).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td><td>{x.businesses?.name||'-'}</td><td style={{fontFamily:'monospace'}}>{x.kod}</td><td>{x.dakika}</td><td>{tl(x.toplam_tl)}</td><td>{x.yontem==='shopier'?'Kart':'Havale'}</td><td><span className={'tag '+D[x.durum][1]}>{D[x.durum][0]}</span></td>
   <td>{['bekliyor','bildirildi'].includes(x.durum)&&<div className="row" style={{gap:6,justifyContent:'flex-start'}}>{x.yontem==='iban'&&<button style={{padding:'6px 10px'}} onClick={()=>is(x.kod,'onayla')}>Onayla</button>}<button className="g" style={{padding:'6px 10px'}} onClick={()=>is(x.kod,'iptal')}>İptal</button></div>}</td></tr>)}</tbody></table>}</div>;}
