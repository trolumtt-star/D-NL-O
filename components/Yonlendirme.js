'use client';
// Panel → Hattını bağla: işletme kendi numarasını asistan hattına yönlendirir, sonra "Test et" ile otomatik doğrular.
// Test: sistem işletmenin kendi numarasını arar ("açmayın"), arama asistan hattına düşerse başarılı.
import {useEffect,useRef,useState} from 'react';import {createPortal} from 'react-dom';
const KOD_ACIKLAMA=[['akilli','Önerilen: meşgulken, açmadığında ve kapalıyken','Telefonun yine çalar; açamazsan ya da meşgulsen müşteri asistana düşer.'],['tum','Tüm aramalar','Telefonun hiç çalmaz, bütün aramaları asistan karşılar.']];
export default function Yonlendirme({tok,ilk}){
 const [d,setD]=useState(null),[sek,setSek]=useState('cep'),[kod,setKod]=useState('akilli'),[tel,setTel]=useState(''),[t,setT]=useState(null),[kalan,setKalan]=useState(0),[m,setM]=useState(''),[kop,setKop]=useState('');const iv=useRef();
 const api=async(method,q='',body)=>{const r=await fetch('/api/yonlendirme'+q,{method,headers:{'content-type':'application/json',authorization:'Bearer '+await tok()},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 useEffect(()=>{api('GET').then(j=>{setD(j);setTel(j.kendi||'');}).catch(()=>{});return()=>clearInterval(iv.current);},[]);
 if(!d||!d.bagli||d.kirala)return null;
 if(ilk&&d.ok)return null; // Genel bakışta sadece bağlanmamışsa göster
 const k=d.kodlar||{},c=k[kod]||'';
 const kopyala=async x=>{try{await navigator.clipboard.writeText(x);setKop(x);setTimeout(()=>setKop(''),1800);}catch{}};
 const test=async()=>{setM('');try{const j=await api('POST','',{tel});setT({id:j.id,durum:'bekliyor'});setKalan(75);
  clearInterval(iv.current);iv.current=setInterval(async()=>{setKalan(x=>Math.max(0,x-3));try{const r=await api('GET','?test='+j.id);if(r.durum!=='bekliyor'){clearInterval(iv.current);setT({id:j.id,...r});if(r.durum==='ok')setD(x=>({...x,ok:new Date().toISOString()}));}}catch{}},3000);}catch(e){setM(e.message);}};
 return <div className="card" style={d.ok?undefined:{border:'1px solid rgba(255,31,61,.6)',background:'radial-gradient(120% 140% at 100% 0%,rgba(255,31,61,.16),transparent 60%)'}}>
  <div className="row" style={{flexWrap:'wrap',gap:8}}><h2>{d.ok?'✅ Hattın bağlı':'📞 Son adım: numaranı asistana yönlendir'}</h2>{d.ok&&<span className="tag">Son test: {new Date(d.ok).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})}</span>}</div>
  <p className="mut" style={{marginTop:6}}>Asistan hattın: <b style={{color:'#fff',fontSize:'1.1rem'}}>{d.hat}</b> <button className="g" style={{padding:'3px 10px',marginLeft:6}} onClick={()=>kopyala(d.hat)}>{kop===d.hat?'Kopyalandı':'Kopyala'}</button><br/>Müşterilerin bildiği numaran değişmez; o numaraya gelen aramaları bu hatta yönlendiriyorsun.</p>
  <div className="chips" style={{marginTop:12}}>{[['cep','📱 Cep telefonu'],['iphone','iPhone ayarlardan'],['sabit','☎ Sabit hat / santral']].map(([x,l])=><button key={x} className={'chp'+(sek===x?' on':'')} onClick={()=>setSek(x)}>{l}</button>)}</div>
  {sek==='cep'&&<div style={{marginTop:12}}>{KOD_ACIKLAMA.map(([x,l,a])=><label key={x} className="ck" style={{display:'flex',gap:8,alignItems:'flex-start',margin:'6px 0'}}><input type="radio" style={{width:'auto',marginTop:4}} checked={kod===x} onChange={()=>setKod(x)}/><span><b>{l}</b><br/><span className="mut" style={{fontSize:'.85rem'}}>{a}</span></span></label>)}
   <ol style={{margin:'10px 0 0 18px',lineHeight:1.7}}><li>Yönlendireceğin hattın telefonunda <b>arama tuşlarını</b> aç.</li>
    <li>Şu kodu tuşla: <code style={{fontSize:'1.15rem',padding:'2px 8px',background:'rgba(255,255,255,.08)',borderRadius:6}}>{c}</code> <button className="g" style={{padding:'3px 10px'}} onClick={()=>kopyala(c)}>{kop===c?'Kopyalandı':'Kopyala'}</button> <a className="lb" href={'tel:'+c.replace(/#/g,'%23')}>Tuşla</a></li>
    <li><b>Ara</b> tuşuna bas. Ekranda "yönlendirme etkinleştirildi" yazısı çıkar.</li><li>Aşağıdan <b>Test et</b>'e bas.</li></ol>
   <p className="mut" style={{fontSize:'.82rem',marginTop:6}}>Turkcell, Vodafone ve Türk Telekom'da aynı kodlar geçerli. Yönlendirmeyi kapatmak için: <code>{k.iptal}</code>. "Tuşla" bağlantısı iPhone'da çalışmayabilir, o zaman kodu elle yaz.</p></div>}
  {sek==='iphone'&&<ol style={{margin:'12px 0 0 18px',lineHeight:1.7}}><li><b>Ayarlar → Telefon → Arama Yönlendirme</b>'yi aç.</li><li>Yönlendirmeyi aç, numara olarak <b>{d.hat}</b> yaz.</li><li>Bu yöntem tüm aramaları yönlendirir. Sadece açamadığında yönlendirmek istersen "Cep telefonu" sekmesindeki önerilen kodu kullan.</li></ol>}
  {sek==='sabit'&&<ol style={{margin:'12px 0 0 18px',lineHeight:1.7}}><li>Sabit hatlarda yönlendirme operatöre göre değişir: hattının operatörünü (Türk Telekom, Superonline, TurkNet vb.) arayıp <b>"{d.hat} numarasına çağrı yönlendirme"</b> iste.</li><li>Santralin varsa santral firmasına aynı cümleyi söyle; çoğu santral menüden de yapabilir.</li><li>Yönlendirme açılınca aşağıdan <b>Test et</b>'e bas.</li></ol>}
  <div className="frm" style={{marginTop:14}}><label>Yönlendirdiğin numara<input value={tel} onChange={e=>setTel(e.target.value)} inputMode="tel" placeholder="05xx xxx xx xx ya da 0 alan kodu"/></label></div>
  <button disabled={!d.testHazir||t?.durum==='bekliyor'} onClick={test}>🔁 Test et</button>{!d.testHazir&&<span className="mut" style={{marginLeft:8,fontSize:'.85rem'}}>Otomatik test yakında açılacak; bu arada başka bir telefondan kendi numaranı arayarak deneyebilirsin.</span>}
  {m&&<p className="mut" style={{marginTop:8}}>{m}</p>}
  {t&&createPortal(<div className="yt-ekran" role="dialog" aria-live="polite"><div className="yt-kutu">
   {t.durum==='bekliyor'?<><div className="yt-tel">📞</div><h2>Şimdi aranacaksın</h2><p><b>Telefonunu açma, reddetme.</b> Birkaç kez çalması normal; arama asistanına düşerse test başarılı olur.</p><div className="yt-say">{kalan}</div><p className="mut">saniye içinde sonuç</p></>
   :t.durum==='ok'?<><div className="yt-tel ok">✅</div><h2>Hattın çalışıyor!</h2><p>Numaranı arayan müşterilerine artık asistanın cevap veriyor.</p><button onClick={()=>setT(null)}>Tamam</button></>
   :<><div className="yt-tel">⚠️</div><h2>Arama asistana ulaşmadı</h2><p>{t.hata?'Test araması başlatılamadı. ':''}Kodu doğru tuşladığından ve "yönlendirme etkinleştirildi" yazısını gördüğünden emin ol. Önerilen kodu kullandıysan test sırasında telefonu açmamalısın. Sonra tekrar dene.</p><button onClick={()=>setT(null)}>Tekrar dene</button></>}
  </div></div>,document.body)}</div>;}
