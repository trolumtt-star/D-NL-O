'use client';
// Admin: Teklif asistanı. İşletmeleri sırayla arar, Dinlio'yu anlatır, demo randevusu alır. "Durdur" deyince durur.
import {useEffect,useState} from 'react';
const DUR={sirada:['Sırada',''],araniyor:['📞 Aranıyor','x'],randevu:['📅 Demo randevusu',''],ilgilendi:['🙂 İlgilendi',''],sonra:['⏳ Sonra aranacak',''],acmadi:['Açmadı, tekrar denenecek',''],istemiyor:['✖ İstemiyor',''],yanlis:['Yanlış numara',''],bitti:['Bitti',''],hata:['Hata','x']};
const GUN=['','Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
export default function TeklifAsistani({tok}){
 const [d,setD]=useState(null),[f,setF]=useState(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(''),[elle,setElle]=useState(''),[filtre,setFiltre]=useState('hepsi'),[lf,setLf]=useState({sehir:'',kategori:'',adet:50,min_puan:''});
 const api=async(m,body)=>{const r=await fetch('/api/admin/teklif',{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+await tok()},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 const al=j=>{setD(j);setF(o=>o||{eszamanli:j.ayar.eszamanli,gunler:j.ayar.gunler,araliklar:j.ayar.araliklar.map(r=>r.join('-')).join(', '),demo_gunler:j.ayar.demo.gunler,demo_saatler:j.ayar.demo.saatler.join(', '),numara_id:j.ayar.numara_id||''});};
 useEffect(()=>{api('GET').then(al).catch(e=>setMsg(e.message));const i=setInterval(()=>api('GET').then(al).catch(()=>{}),15000);return()=>clearInterval(i);},[]);
 const is=async(body,ok)=>{setBusy(body.islem);setMsg('');try{const j=await api('POST',body);al(j);setMsg(j.mesaj||ok||'Tamam.');}catch(e){setMsg(e.message);}setBusy('');};
 if(!d)return <div className="card"><h2>Teklif asistanı</h2><p className="mut">{msg||'Yükleniyor…'}</p></div>;
 const a=d.ayar,S=d.sayac,kur=!!a.asistan_id,liste=d.liste.filter(x=>filtre==='hepsi'||x.durum===filtre),randevular=d.liste.filter(x=>x.durum==='randevu').sort((x,y)=>new Date(x.randevu_at)-new Date(y.randevu_at));
 const gunSec=(k)=><div className="row" style={{gap:4,flexWrap:'wrap',justifyContent:'flex-start'}}>{[1,2,3,4,5,6,7].map(g=><button key={g} className={f[k].includes(g)?'':'g'} style={{padding:'4px 10px',minWidth:0}} onClick={()=>setF({...f,[k]:f[k].includes(g)?f[k].filter(x=>x!==g):[...f[k],g].sort()})}>{GUN[g]}</button>)}</div>;
 return <div className="card"><div className="row" style={{justifyContent:'space-between',flexWrap:'wrap',gap:8}}><h2>Teklif asistanı</h2>
   <div className="row" style={{gap:8}}>{a.aktif?<><span className="tag x">● Çalışıyor{d.saatUygun?'':' (saat dışı, beklemede)'}</span><button disabled={!!busy} onClick={()=>is({islem:'durdur'},'Durduruldu. Süren arama bitince yenisi başlamaz.')}>■ Durdur</button></>
    :<button disabled={!!busy||!kur} onClick={()=>is({islem:'baslat'})}>▶ Başlat</button>}</div></div>
  <p className="mut">İşletmeleri sırayla arar, Dinlio'yu anlatır, 1 hafta ücretsiz denemeyi söyler ve demo randevusu alır. "İstemiyorum" diyeni bir daha asla aramaz. Sadece aşağıdaki gün ve saatlerde arar.</p>
  <div className="row" style={{gap:6,flexWrap:'wrap',justifyContent:'flex-start',margin:'10px 0'}}>{['randevu','ilgilendi','sonra','sirada','acmadi','istemiyor'].map(k=><span key={k} className="tag">{DUR[k][0]}: {S[k]||0}</span>)}<span className="tag">Aranmayacak listesi: {d.aranmayacak}</span></div>
  {randevular.length>0&&<><h3 style={{marginTop:10}}>Demo randevuları</h3><table><tbody>{randevular.map(x=><tr key={x.id}><td><b>{new Date(x.randevu_at).toLocaleString('tr-TR',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</b></td><td>{x.ad}{x.yetkili?' · '+x.yetkili:''}</td><td><a className="lnk" href={'tel:0'+x.tel}>0{x.tel}</a></td><td><a className="lnk" onClick={()=>is({islem:'randevu_bitti',id:x.id})}>Gidildi ✓</a></td></tr>)}</tbody></table></>}
  <details style={{marginTop:12}} open={!kur||!a.numara_id}><summary><b>Kurulum ve saatler</b></summary>
   {!d.vapi&&<p className="mut">Vapi anahtarı yok.</p>}
   <div className="row" style={{gap:8,flexWrap:'wrap',justifyContent:'flex-start',marginTop:8}}><button className={kur?'g':''} disabled={!!busy} onClick={()=>is({islem:'kur'},'Teklif asistanı hazır.')}>{kur?'Asistanı güncelle':'Teklif asistanını kur'}</button>{kur&&<span className="tag">Asistan hazır ✓</span>}</div>
   <div className="frm" style={{marginTop:10}}>
    <label>Arama yapılacak numara<select value={f.numara_id} onChange={e=>setF({...f,numara_id:e.target.value})}><option value="">Seçin (Netgsm numaranız)</option>{d.numaralar.map(n=><option key={n.id} value={n.id}>{n.ad}</option>)}</select></label>
    <label>Aynı anda<select value={f.eszamanli} onChange={e=>setF({...f,eszamanli:+e.target.value})}>{[1,2,3].map(n=><option key={n} value={n}>{n} arama</option>)}</select></label>
    <label>Arama saatleri<input value={f.araliklar} onChange={e=>setF({...f,araliklar:e.target.value})} placeholder="10:00-12:00, 14:30-17:30"/></label></div>
   <p className="mut" style={{margin:'6px 0 4px'}}>Arama günleri</p>{gunSec('gunler')}
   <p className="mut" style={{margin:'10px 0 4px'}}>Demoya gidebileceğin günler</p>{gunSec('demo_gunler')}
   <div className="frm" style={{marginTop:8}}><label>Demo saatleri<input value={f.demo_saatler} onChange={e=>setF({...f,demo_saatler:e.target.value})} placeholder="16:00, 17:00, 18:00"/></label>
    <button disabled={!!busy} onClick={()=>is({islem:'ayar',...f,araliklar:f.araliklar.split(',').map(s=>s.trim().split('-').map(t=>t.trim().padStart(5,'0'))),demo_saatler:f.demo_saatler.split(',').map(s=>s.trim().padStart(5,'0'))},'Kaydedildi.')}>Kaydet</button></div></details>
  <details style={{marginTop:10}}><summary><b>Listeye işletme ekle</b></summary>
   <div className="frm" style={{marginTop:8}}><label>İl<input value={lf.sehir} onChange={e=>setLf({...lf,sehir:e.target.value})} placeholder="ör. Yalova (boş = hepsi)"/></label>
    <label>Sektör<input value={lf.kategori} onChange={e=>setLf({...lf,kategori:e.target.value})} placeholder="ör. restaurant (boş = hepsi)"/></label>
    <label>En az puan<input type="number" value={lf.min_puan} onChange={e=>setLf({...lf,min_puan:e.target.value})}/></label><label>Adet<input type="number" value={lf.adet} onChange={e=>setLf({...lf,adet:e.target.value})}/></label>
    <button className="g" disabled={!!busy} onClick={()=>is({islem:'ekle_lead',...lf},'Müşteri bulma listesinden telefonu olanlar eklendi.')}>Müşteri bulmadan ekle</button></div>
   <textarea rows="3" style={{marginTop:8}} value={elle} onChange={e=>setElle(e.target.value)} placeholder={'Elle: her satıra İşletme adı; telefon; sektör\nBeyzade Kebap; 0226 xxx xx xx; restoran'}/>
   <button className="g" disabled={!!busy||!elle.trim()} onClick={()=>is({islem:'ekle_elle',metin:elle},'Eklendi.').then(()=>setElle(''))}>Elle ekle</button></details>
  <div className="row" style={{gap:6,flexWrap:'wrap',justifyContent:'flex-start',marginTop:14}}>{['hepsi','randevu','ilgilendi','sonra','sirada','araniyor','acmadi','istemiyor','bitti','hata'].map(k=><button key={k} className={filtre===k?'':'g'} style={{padding:'4px 10px',minWidth:0}} onClick={()=>setFiltre(k)}>{k==='hepsi'?'Hepsi':DUR[k][0]}</button>)}</div>
  <table style={{marginTop:8}}><thead><tr><th>İşletme</th><th>Durum</th><th>Not / özet</th><th></th></tr></thead><tbody>
   {liste.slice(0,200).map(x=><tr key={x.id}><td><b>{x.ad}</b><br/><span className="mut" style={{fontSize:'.8rem'}}>0{x.tel}{x.kategori?' · '+x.kategori:''}</span></td>
    <td><span className={'tag '+(DUR[x.durum]?.[1]||'')}>{DUR[x.durum]?.[0]||x.durum}</span>{x.deneme>0&&<span className="mut" style={{fontSize:'.75rem'}}> · {x.deneme}. deneme</span>}</td>
    <td style={{fontSize:'.82rem',maxWidth:360}}>{x.yetkili&&<>👤 {x.yetkili}<br/></>}{x.notlar}{x.ozet&&<details><summary className="mut">Özet</summary>{x.ozet}</details>}</td>
    <td style={{whiteSpace:'nowrap',fontSize:'.82rem'}}>{x.durum!=='araniyor'&&<><a className="lnk" onClick={()=>is({islem:'tekrar',id:x.id})}>Tekrar ara</a> · <a className="lnk" onClick={()=>is({islem:'aranmasin',id:x.id})}>Aranmasın</a> · <a className="lnk" onClick={()=>is({islem:'sil',id:x.id})}>Sil</a></>}</td></tr>)}</tbody></table>
  {msg&&<p className="mut" style={{marginTop:8}}>{msg}</p>}</div>;}
