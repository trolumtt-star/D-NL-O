'use client';
// Admin: KDV'yi aç/kapat. Kapalıyken sitede, panelde ve ek dakika ödemelerinde KDV eklenmez.
import {useEffect,useState} from 'react';
export default function KdvAyar({sb}){
 const [k,setK]=useState(null),[msg,setMsg]=useState(''),[kes,setKes]=useState('');
 const H=async()=>({'content-type':'application/json',authorization:'Bearer '+(await sb.auth.getSession()).data.session?.access_token});
 useEffect(()=>{(async()=>{const r=await fetch('/api/admin/sistem',{headers:await H()});const j=await r.json();setK(j.kdv||{acik:true});})();},[]);
 const kaydet=async acik=>{const r=await fetch('/api/admin/sistem',{method:'POST',headers:await H(),body:JSON.stringify({kdv:{acik}})});const j=await r.json();if(!r.ok){setMsg(j.error);return;}setK(j.kdv);setMsg(acik?'KDV açıldı: fiyatlara %20 KDV eklenir.':'KDV kapatıldı: sitede, panelde ve ödemelerde KDV eklenmez.');};
 if(!k)return null;
 return <div className="card sec2"><h2>KDV</h2><p className="mut">Şirket kurulana kadar ya da deneme ödemesi için KDV'yi kapatabilirsiniz. Değişiklik ana sayfa fiyatlarına, işletme paneline ve ek dakika / aşım ödemelerine 1 dakika içinde yansır.</p>
  <div className="row" style={{justifyContent:'flex-start',gap:8,marginTop:10}}><button className={k.acik?'':'g'} onClick={()=>kaydet(true)}>KDV açık (%20)</button><button className={!k.acik?'':'g'} onClick={()=>kaydet(false)}>KDV kapalı</button></div>
  {msg&&<p className="mut" style={{marginTop:8}}>{msg}</p>}
  <h2 style={{marginTop:18}}>Shopier bağlantı testi</h2><p className="mut">Shopier'den sadece okur, hiçbir şey değiştirmez. Çıkan yazıyı kopyalayıp asistana gönderin.</p>
  <button className="g" style={{marginTop:8}} onClick={async()=>{setKes('Bakılıyor…');const r=await fetch('/api/admin/shopier-kesif',{headers:await H()});setKes(JSON.stringify(await r.json(),null,1));}}>Shopier'i test et</button>
<button className="g" style={{marginTop:8,marginLeft:8}} onClick={async()=>{if(!confirm('Shopier\'de gizli bir deneme ürünü açılıp hemen silinecek. Devam?'))return;setKes('Deneniyor…');const r=await fetch('/api/admin/shopier-urun-test',{method:'POST',headers:await H()});setKes(JSON.stringify(await r.json(),null,1));}}>Ürün oluşturma testi</button>
  {kes&&<><pre style={{whiteSpace:'pre-wrap',fontSize:'.75rem',maxHeight:360,overflow:'auto',background:'var(--soft)',padding:10,borderRadius:10,marginTop:8}}>{kes}</pre><button className="g" style={{marginTop:6}} onClick={()=>navigator.clipboard?.writeText(kes)}>Kopyala</button></>}</div>;}
