'use client';
// Admin: reklam videosu için doğal Türkçe seslendirme. Her satır ayrı okunur, aralarına kısa sessizlik konur,
// tek bir WAV dosyası olarak indirilir. Bu dosya videonun ses kaydı olarak kullanılır.
import {useState} from 'react';
const VARSAYILAN=`Telefonunuz çalıyor... ama elleriniz dolu.
Ve her cevapsız arama, kaçan bir müşteri demek.
Tanışın: Dinlio AI. İşletmenizin yapay zekâ telefon asistanı.
Telefonu siz yerine açar, müşterinizle doğal Türkçe konuşur.
Siparişi, adresi, randevuyu alır; görüşme bitmeden paneline düşer.
Restoran, kuaför, diş kliniği, veteriner... Her sektöre özel kurulur.
Sadık müşterini adıyla karşılar, tarif edilen adresi haritada bulur.
Çalışanların randevularını kendi ekranından görür, sen her akşam günün özetini alırsın.
Yedi gün, yirmi dört saat. Mola yok, tatil yok, kaçan müşteri yok.
Dinlio AI. Bir hafta ücretsiz deneyin.`;
const SESLER=[['Charon','Erkek · tok, güven veren'],['Fenrir','Erkek · enerjik'],['Orus','Erkek · sakin'],['Kore','Kadın · net, profesyonel'],['Aoede','Kadın · sıcak'],['Leda','Kadın · genç, canlı']];
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export default function Seslendirme({sb}){
 const [metin,setMetin]=useState(VARSAYILAN),[ses,setSes]=useState('Charon'),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[url,setUrl]=useState('');
 const uret=async()=>{const satir=metin.split('\n').map(s=>s.trim()).filter(Boolean);if(!satir.length)return;setBusy(true);setUrl('');
  const t=(await sb.auth.getSession()).data.session?.access_token;const parcalar=[];let hz=24000;
  try{for(let i=0;i<satir.length;i++){setMsg(`Seslendiriliyor: ${i+1} / ${satir.length}`);
    const r=await fetch('/api/admin/seslendir',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+t},body:JSON.stringify({metin:satir[i],ses})});const j=await r.json();if(!r.ok)throw new Error(j.error);
    const w=b64(j.wav),dv=new DataView(w.buffer);hz=dv.getUint32(24,true);parcalar.push(w.slice(44));}
   // satırlar arasına 0,8 sn sessizlik
   const sus=new Uint8Array(Math.round(hz*0.8)*2),toplam=parcalar.reduce((t,p)=>t+p.length,0)+sus.length*parcalar.length;
   const out=new Uint8Array(44+toplam),dv=new DataView(out.buffer),yaz=(o,s)=>{for(let i=0;i<s.length;i++)out[o+i]=s.charCodeAt(i);};
   yaz(0,'RIFF');dv.setUint32(4,36+toplam,true);yaz(8,'WAVE');yaz(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,hz,true);dv.setUint32(28,hz*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);yaz(36,'data');dv.setUint32(40,toplam,true);
   let o=44;for(const p of parcalar){out.set(p,o);o+=p.length;out.set(sus,o);o+=sus.length;}
   setUrl(URL.createObjectURL(new Blob([out],{type:'audio/wav'})));setMsg(`Hazır: ${satir.length} satır. Dinle, beğenirsen indir ve sohbete yükle.`);}
  catch(e){setMsg('Hata: '+e.message);}setBusy(false);};
 return <div className="card sec2"><h2>Reklam seslendirmesi</h2><p className="mut">Her satır ayrı cümle olarak doğal Türkçe sesle okunur. Bitince tek dosya olarak indir ve sohbete yükle; videoya ben eklerim.</p>
  <textarea rows="11" value={metin} onChange={e=>setMetin(e.target.value)} style={{marginTop:8,fontSize:'.9rem'}}/>
  <div className="row" style={{justifyContent:'flex-start',gap:8,marginTop:8,flexWrap:'wrap'}}>
   <select value={ses} onChange={e=>setSes(e.target.value)} style={{width:'auto',margin:0}}>{SESLER.map(([k,l])=><option key={k} value={k}>{k} · {l}</option>)}</select>
   <button disabled={busy} onClick={uret}>{busy?'Seslendiriliyor…':'Seslendir'}</button></div>
  {msg&&<p className="mut" style={{marginTop:8}}>{msg}</p>}
  {url&&<><audio controls src={url} style={{width:'100%',marginTop:8}}/><a className="lb" href={url} download="dinlio_seslendirme.wav" style={{display:'inline-block',marginTop:8}}>⬇ İndir (dinlio_seslendirme.wav)</a></>}</div>;}
