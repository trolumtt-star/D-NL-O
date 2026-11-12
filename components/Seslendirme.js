'use client';
// Admin: reklam seslendirmesi. Satırlar "Konuşmacı: metin" biçiminde yazılır; her konuşmacıya ayrı ses ve
// konuşma tarzı verilir (diyaloglu, mizahi reklamlar için). Satırlar arasına kısa sessizlik konur, tek WAV iner.
import {useMemo,useState} from 'react';
const VARSAYILAN=`Genç: Abi bir dürüm, bol soğanlı. Sen yeni mi başladın? Sesin çok kibar.
Asistan: Ben Ferhat Usta'nın yapay zekâ asistanıyım. Soğanı not aldım. Kibarlık ücretsiz.
Dayı: Sedat'a söyle, geçen seferki gibi olmasın ha!
Asistan: Not aldım: geçen seferki gibi olmasın. Yarın saat ikiye yazdım.
Uykulu: Gecenin üçünde açtınız ya... Siz hiç uyumuyor musunuz?
Asistan: Ben uyumam efendim. Damacananız sabah sekizde kapınızda.
Teyze: Ay ne tatlı konuşuyorsun kızım, oğluma bakıyorum ben!
Asistan: Teşekkürler teyzeciğim, ama ben sadece randevu ayarlıyorum. Salı saat on, tamam mı?
Anlatıcı: Sen yoğunsun. Dinlio dinliyor. Dinlio AI, bir hafta ücretsiz.`;
const SESLER=['Kore','Aoede','Leda','Zephyr','Gacrux','Sulafat','Callirrhoe','Despina','Charon','Puck','Fenrir','Orus','Algenib','Enceladus','Iapetus','Umbriel','Alnilam','Achird','Sadaltager','Rasalgethi'];
const ONERI={Asistan:['Kore','Kibar, sakin, gülümseyerek konuşan profesyonel bir kadın telefon asistanı gibi; doğal Türkçe'],
 Genç:['Puck','Samimi, rahat, biraz şaşkın bir genç erkek gibi, gündelik Türkçe ve komik tonlamayla'],
 Dayı:['Algenib','Kalın sesli, otoriter ama sevimli, biraz sitemkâr bir orta yaşlı Türk dayısı gibi'],
 Uykulu:['Enceladus','Uykulu, esneyerek, yavaş ve şaşkın konuşan biri gibi; gecenin üçü'],
 Teyze:['Gacrux','Neşeli, tatlı, biraz meraklı yaşlı bir Türk teyzesi gibi; abartılı sevecen tonlama'],
 Anlatıcı:['Charon','Sıcak, güven veren, gülümseyen bir reklam spikeri gibi; son cümleyi vurgulayarak']};
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const ayir=s=>s.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>{const m=x.match(/^([^:]{1,24}):\s*(.+)$/);return m?{k:m[1].trim(),m:m[2]}:{k:'Anlatıcı',m:x};});
export default function Seslendirme({sb}){
 const [metin,setMetin]=useState(VARSAYILAN),[ayar,setAyar]=useState({}),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[url,setUrl]=useState(''),[bosluk,setBosluk]=useState(0.45);
 const kisiler=useMemo(()=>[...new Set(ayir(metin).map(x=>x.k))],[metin]);
 const ses=k=>ayar[k]?.ses||ONERI[k]?.[0]||'Kore',stil=k=>ayar[k]?.stil??(ONERI[k]?.[1]||'Doğal, samimi Türkçe ile');
 const uret=async()=>{const satir=ayir(metin);if(!satir.length)return;setBusy(true);setUrl('');
  const t=(await sb.auth.getSession()).data.session?.access_token;const parcalar=[];let hz=24000;
  try{for(let i=0;i<satir.length;i++){const {k,m}=satir[i];setMsg(`Seslendiriliyor: ${i+1} / ${satir.length} (${k})`);
    const r=await fetch('/api/admin/seslendir',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+t},body:JSON.stringify({metin:m,ses:ses(k),stil:stil(k)})});const j=await r.json();if(!r.ok)throw new Error(j.error);
    const w=b64(j.wav),dv=new DataView(w.buffer);hz=dv.getUint32(24,true);parcalar.push(w.slice(44));}
   const sus=new Uint8Array(Math.round(hz*bosluk)*2),toplam=parcalar.reduce((s,p)=>s+p.length,0)+sus.length*parcalar.length;
   const out=new Uint8Array(44+toplam),dv=new DataView(out.buffer),yaz=(o,s)=>{for(let i=0;i<s.length;i++)out[o+i]=s.charCodeAt(i);};
   yaz(0,'RIFF');dv.setUint32(4,36+toplam,true);yaz(8,'WAVE');yaz(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,hz,true);dv.setUint32(28,hz*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);yaz(36,'data');dv.setUint32(40,toplam,true);
   let o=44;for(const p of parcalar){out.set(p,o);o+=p.length;out.set(sus,o);o+=sus.length;}
   setUrl(URL.createObjectURL(new Blob([out],{type:'audio/wav'})));setMsg(`Hazır: ${satir.length} satır. Dinle; beğenirsen indir ve sohbete yükle.`);}
  catch(e){setMsg('Hata: '+e.message);}setBusy(false);};
 return <div className="card sec2"><h2>Reklam seslendirmesi</h2>
  <p className="mut">Her satırı <b>Konuşmacı: metin</b> şeklinde yaz. Her konuşmacıya ayrı ses ve tarz verilir, satırlar sırayla okunup tek dosya olur. İndirip sohbete yükle; videoya ben eklerim.</p>
  <textarea rows="12" value={metin} onChange={e=>setMetin(e.target.value)} style={{marginTop:8,fontSize:'.88rem'}}/>
  <div style={{marginTop:8,display:'grid',gap:6}}>{kisiler.map(k=><div key={k} className="row" style={{gap:8,justifyContent:'flex-start',flexWrap:'wrap'}}>
   <b style={{minWidth:80}}>{k}</b><select value={ses(k)} onChange={e=>setAyar({...ayar,[k]:{...ayar[k],ses:e.target.value}})} style={{width:'auto',margin:0}}>{SESLER.map(s=><option key={s}>{s}</option>)}</select>
   <input value={stil(k)} onChange={e=>setAyar({...ayar,[k]:{...ayar[k],stil:e.target.value}})} style={{flex:1,minWidth:200,margin:0,fontSize:'.82rem'}}/></div>)}</div>
  <div className="row" style={{justifyContent:'flex-start',gap:8,marginTop:10,flexWrap:'wrap'}}>
   <label style={{display:'flex',gap:6,alignItems:'center',margin:0,fontSize:'.85rem'}}>Satır arası<select value={bosluk} onChange={e=>setBosluk(+e.target.value)} style={{width:'auto',margin:0}}>{[.3,.45,.6,.8].map(x=><option key={x} value={x}>{x} sn</option>)}</select></label>
   <button disabled={busy} onClick={uret}>{busy?'Seslendiriliyor…':'Seslendir'}</button></div>
  {msg&&<p className="mut" style={{marginTop:8}}>{msg}</p>}
  {url&&<><audio controls src={url} style={{width:'100%',marginTop:8}}/><a className="lb" href={url} download="dinlio_seslendirme.wav" style={{display:'inline-block',marginTop:8}}>⬇ İndir (dinlio_seslendirme.wav)</a></>}</div>;}
