'use client';
// Admin → Numaralar: 0850 aylık kira ücreti ve havuz. Havuzdaki boş numara, paket ödemesi onaylanınca işletmeye otomatik bağlanır.
import {useEffect,useState} from 'react';
export default function AdminNumara({tok}){
 const [d,setD]=useState(null),[th,setTh]=useState(''),[ucret,setU]=useState(''),[hv,setHv]=useState({}),[m,setM]=useState(''),[busy,setBusy]=useState(false);
 const api=async(method,body)=>{const r=await fetch('/api/admin/numara',{method,headers:{'content-type':'application/json',authorization:'Bearer '+await tok()},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 const yukle=()=>api('GET').then(j=>{setD(j);setU(String(j.ucret||''));setTh(j.testHat?.id||'');setHv(Object.fromEntries(j.havuz.map(x=>[x.id,x.tip])));}).catch(e=>setM(e.message));
 useEffect(()=>{yukle();},[]);
 const kaydet=async()=>{setBusy(true);setM('');try{const havuz=Object.entries(hv).filter(([,t])=>t).map(([id,tip])=>({id,tip,numara:d.vapi.find(v=>v.id===id)?.numara||d.havuz.find(v=>v.id===id)?.numara||''}));
  const tv=d.vapi.find(v=>v.id===th);await api('POST',{islem:'kaydet',ucret,havuz:havuz.filter(x=>x.id!==th),testHat:tv?{id:tv.id,numara:tv.numara}:null});setM('Kaydedildi.');await yukle();}catch(e){setM('Hata: '+e.message);}setBusy(false);};
 if(!d)return <div className="card"><h2>📞 Numaralar</h2><p className="mut">{m||'Yükleniyor…'}</p></div>;
 const bos=d.vapi.filter(v=>hv[v.id]&&!v.kullanan);
 return <div className="card" style={{marginBottom:16}}><h2>📞 Numaralar ve 0850 kira ücreti</h2>
  <p className="mut" style={{margin:'4px 0 10px'}}>Paket ödemesi onaylanınca havuzdaki <b>boş</b> numara işletmeye otomatik bağlanır: "0850 kirala" diyene 0850, "kendi numaram var" diyene yönlendireceği hat (yerel). Havuz boşsa iş size düşer. Şu an boş: <b>{bos.filter(x=>hv[x.id]==='0850').length}</b> adet 0850, <b>{bos.filter(x=>hv[x.id]==='yerel').length}</b> adet yönlendirme hattı.</p>
  <div className="row" style={{gap:8,justifyContent:'flex-start',alignItems:'flex-end',flexWrap:'wrap'}}><label style={{margin:0}}><small className="mut">Numara aylık ücreti (TL)</small><input type="number" min={0} style={{width:140,margin:0}} value={ucret} onChange={e=>setU(e.target.value)} placeholder="ör. 250"/></label>
   <span className="mut" style={{fontSize:'.82rem'}}>Müşteriye paketle birlikte tahsil edilir (yıllıkta ×12). 0 = ücretsiz.</span></div>
  <div className="row" style={{gap:8,justifyContent:'flex-start',alignItems:'flex-end',flexWrap:'wrap',marginTop:10}}><label style={{margin:0}}><small className="mut">Yönlendirme test hattı</small><select style={{margin:0,minWidth:220}} value={th} onChange={e=>setTh(e.target.value)}><option value="">Seçilmedi (otomatik test kapalı)</option>{d.vapi.filter(v=>!v.kullanan).map(v=><option key={v.id} value={v.id}>{v.numara}</option>)}</select></label>
   <span className="mut" style={{fontSize:'.82rem',maxWidth:420}}>İşletme "Test et"e basınca sistem bu hattan işletmenin kendi numarasını arar; arama asistana düşerse yönlendirme doğrudur. Bu hat hiçbir işletmeye verilmez.</span></div>
  {d.vapiHata&&<p className="mut" style={{marginTop:8}}>Vapi numaraları okunamadı: {d.vapiHata}</p>}
  <div style={{overflowX:'auto',marginTop:10}}><table><thead><tr><th>Vapi numarası</th><th>Kullanan</th><th>Havuzda</th></tr></thead><tbody>
   {d.vapi.map(v=><tr key={v.id}><td><b>{v.numara}</b>{v.ad&&<span className="mut"> · {v.ad}</span>}</td><td>{v.kullanan||<span className="mut">boş</span>}</td>
    <td><select value={hv[v.id]||''} onChange={e=>setHv({...hv,[v.id]:e.target.value})} style={{margin:0}}><option value="">Havuzda değil</option><option value="0850">0850 (kiralık)</option><option value="yerel">Yönlendirme hattı</option></select></td></tr>)}
   {!d.vapi.length&&<tr><td colSpan={3} className="mut">Vapi'de numara yok. Netgsm'den aldığınız hatları Vapi'ye (SIP) ekleyin, burada görünür.</td></tr>}</tbody></table></div>
  <button style={{marginTop:10}} disabled={busy} onClick={kaydet}>{busy?'…':'Kaydet'}</button>{m&&<p className="mut" style={{marginTop:8}}>{m}</p>}</div>;}
