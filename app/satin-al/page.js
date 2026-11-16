'use client';
// PAKET SATIN ALMA: 1) paket + numara tercihi  2) işletme bilgileri (asistan bunlarla otomatik kurulur)  3) hesap.
// Hesap açılınca panele geçilir, ödeme penceresi kendiliğinden açılır; ödeme onaylanınca asistan kurulur ve hat bağlanır.
import {useEffect,useState} from 'react';import '@/components/ks.css';import {sb} from '@/lib/supabase';import {PK,paketFiyat} from '@/lib/fiyatlar';
const GUN=['','Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
export default function SatinAl(){
 const [s,setS]=useState(null),[ad,setAd]=useState(1),[p,setP]=useState({id:'m',all:false,yil:false}),[n,setN]=useState({tercih:'kendi',mevcut:''}),
  [b,setB]=useState({isletme:'',sektor:'',liste:'',acilis:'09:00',kapanis:'22:00',kapali:[],adres:'',lat:null,lng:null,teslimat:true,km:'3',teslimat_ucret:'',min_siparis:'',personel:'',sure_dk:'30',asistan_adi:'',notlar:''}),
  [h,setH]=useState({ad:'',tel:'',eposta:'',sifre:'',kvkk:false,web:''}),[busy,setBusy]=useState(false),[err,setErr]=useState('');
 useEffect(()=>{const u=new URLSearchParams(location.search);setP({id:PK.some(x=>x.id===u.get('paket'))?u.get('paket'):'m',all:u.get('all')==='1',yil:u.get('yil')==='1'});
  fetch('/api/kayit').then(r=>r.json()).then(setS).catch(()=>{});},[]);
 const sek=(s?.sektorler||[]).find(x=>x.id===b.sektor),siparis=sek?.kind==='order',f=paketFiyat({id:p.id,all:p.all,yil:p.yil,ilkAy:true}),nu=s?.numara?.ucret||0;
 const ok1=n.tercih==='kirala'||!n.mevcut||/^0?[2-5]\d{9}$/.test(n.mevcut.replace(/\D/g,''));
 const ok2=b.isletme.trim().length>=2&&b.sektor;
 const [kb,setKb]=useState('');
 const konumBul=()=>{if(!navigator.geolocation){setKb('Tarayıcın konumu desteklemiyor.');return;}setKb('Konum alınıyor…');navigator.geolocation.getCurrentPosition(async p=>{try{const r=await fetch(`/api/adres-bul?lat=${p.coords.latitude}&lng=${p.coords.longitude}`);const j=await r.json();if(!r.ok)throw new Error(j.error);setB(x=>({...x,adres:[j.adres,j.ilce,j.il].filter(Boolean).join(', '),lat:j.lat,lng:j.lng}));setKb('✓ Konumundan bulundu, yanlışsa düzelt.');}catch(e){setKb(e.message);}},()=>setKb('Konum izni verilmedi, adresi elle yaz.'),{enableHighAccuracy:true,timeout:15000});};
 const gonder=async e=>{e.preventDefault();setErr('');setBusy(true);
  try{const bilgi={...b,...(siparis?{personel:'',sure_dk:''}:{teslimat:undefined})};
   const r=await fetch('/api/kayit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...h,isletme:b.isletme,sektor:b.sektor,satin:true,paket:p.id,all:p.all,yil:p.yil,numara:n,bilgi})});
   const j=await r.json();if(!r.ok)throw new Error(j.error);
   const {error}=await sb.auth.signInWithPassword({email:h.eposta.trim().toLowerCase(),password:h.sifre});if(error)throw new Error('Hesap açıldı ama giriş yapılamadı, giriş sayfasından deneyin.');
   location.replace('/panel?ode=1');}catch(e2){setErr(e2.message||'Bir hata oldu.');setBusy(false);}};
 const Adim=()=><div className="ks-pills" style={{marginBottom:6}}>{['Paket','İşletme bilgileri','Hesap ve ödeme'].map((t,i)=><span key={t} className="ks-pill" style={ad===i+1?{borderColor:'var(--red)',color:'#fff'}:{opacity:.6}}>{i+1}. <b>{t}</b></span>)}</div>;
 return <div className="ks"><div className="ks-w" style={{maxWidth:620}}>
  <div className="ks-top"><a className="ks-logo" href="/"><i>🎙</i><span>Dinlio <b>AI</b></span></a><a href="/kayit" style={{color:'var(--ink2)',fontSize:'.9rem'}}>Önce ücretsiz dene</a></div>
  <h1>Paketini seç, <em>asistanın kendiliğinden kurulsun.</em></h1>
  <p className="ks-alt">Formu doldur, kartla öde. Ödeme onaylanınca asistanın verdiğin bilgilerle kurulur ve hattın bağlanır.</p><Adim/>
  {ad===1&&<div className="ks-kart">
   <div className="ks-sec"><button type="button" className={'ni '+(!p.all?'secili':'')} onClick={()=>setP({...p,all:false})}>📞 Çağrı</button><button type="button" className={'ni '+(p.all?'secili':'')} onClick={()=>setP({...p,all:true})}>✦ All in one</button>
    <button type="button" className={'ni '+(!p.yil?'secili':'')} onClick={()=>setP({...p,yil:false})}>Aylık</button><button type="button" className={'ni '+(p.yil?'secili':'')} onClick={()=>setP({...p,yil:true})}>Yıllık · 2 ay bedava</button></div>
   <div className="sa-pk">{PK.map(x=>{const g=paketFiyat({id:x.id,all:p.all,yil:p.yil,ilkAy:true});return <button type="button" key={x.id} className={'ni'+(p.id===x.id?' secili':'')} onClick={()=>setP({...p,id:x.id})}>
    <b>{x.ad}</b><small>{x.dk} dk / ay</small><strong>${g.usd}<i>{p.yil?'/yıl':'/ay'}</i></strong>{g.aciklama.includes('ilk ay')&&<small>ilk ay fiyatı</small>}</button>;})}</div>
   <label style={{marginTop:16}}>Telefon numaran</label>
   <div className="sa-num"><button type="button" className={'ni'+(n.tercih==='kendi'?' secili':'')} onClick={()=>setN({...n,tercih:'kendi'})}><b>📱 Kendi numaramı yönlendireceğim</b><small>Müşterilerin bildiği numara değişmez; numaranı tek bir kodla asistan hattına yönlendirirsin. ⚠ Operatörün yönlendirilen çağrı başına ücret alabilir (ör. Turkcell'de paketsiz yönlendirme ücretli, aylık yönlendirme paketi önerilir).</small></button>
    <button type="button" className={'ni'+(n.tercih==='kirala'?' secili':'')} onClick={()=>setN({...n,tercih:'kirala'})}><b>☎ Yeni numara al (alan kodlu ya da 0850)</b><small>Asistan doğrudan bu numaradan cevap verir; yönlendirme ve yönlendirme ücreti yok. Tabelana, Google ve Instagram'a bu numarayı yazarsın.{nu?` +${nu.toLocaleString('tr-TR')} ₺/ay + KDV`:''}</small></button></div>
   {n.tercih==='kendi'&&<><label>Yönlendireceğin numara (isteğe bağlı)</label><input value={n.mevcut} onChange={e=>setN({...n,mevcut:e.target.value})} inputMode="tel" placeholder="ör. 0226 xxx xx xx ya da 05xx…"/></>}
   <div className="sa-ozet"><span>{f.aciklama}{n.tercih==='kirala'&&nu?' + yeni numara':''}</span><b>${f.usd}{n.tercih==='kirala'&&nu?` + ${(nu*(p.yil?12:1)).toLocaleString('tr-TR')} ₺`:''} <small>+ KDV</small></b></div>
   <button className="ks-btn" disabled={!ok1} onClick={()=>setAd(2)}>Devam</button></div>}
  {ad===2&&<div className="ks-kart">
   <label>İşletmenin adı</label><input value={b.isletme} onChange={e=>setB({...b,isletme:e.target.value})} placeholder="ör. Beyzade Kebap"/>
   <label>Sektörün</label><div className="ks-sec">{(s?.sektorler||[]).map(x=><button type="button" key={x.id} className={'ni '+(b.sektor===x.id?'secili':'')} onClick={()=>setB({...b,sektor:x.id})}>{x.name}</button>)}</div>
   <label>{siparis?'Menü ve fiyatlar':'Hizmetler ve fiyatlar'} <span style={{color:'var(--mute)',fontWeight:400}}>(isteğe bağlı, her satıra bir tane; sonra panelden ya da menü fotoğrafıyla da eklenir)</span></label>
   <textarea rows={6} value={b.liste} onChange={e=>setB({...b,liste:e.target.value})} placeholder={siparis?'Adana dürüm - 180\nTavuk dürüm - 140\nAyran - 30':'Saç kesimi - 300\nSakal - 150\nBoya - 1200'}/>
   <div className="sa-iki"><div><label>Açılış</label><input type="time" value={b.acilis} onChange={e=>setB({...b,acilis:e.target.value})}/></div><div><label>Kapanış</label><input type="time" value={b.kapanis} onChange={e=>setB({...b,kapanis:e.target.value})}/></div></div>
   <label>Kapalı günler</label><div className="ks-sec">{[1,2,3,4,5,6,7].map(g=><button type="button" key={g} className={'ni '+(b.kapali.includes(g)?'secili':'')} onClick={()=>setB({...b,kapali:b.kapali.includes(g)?b.kapali.filter(x=>x!==g):[...b.kapali,g]})}>{GUN[g]}</button>)}</div>
   <label>Adres <span style={{color:'var(--mute)',fontWeight:400}}>(isteğe bağlı)</span></label><div style={{display:'flex',gap:8}}><input style={{flex:1}} value={b.adres} onChange={e=>setB({...b,adres:e.target.value,lat:null,lng:null})} placeholder="Mahalle, cadde, ilçe"/><button type="button" className="ks-btn g ni" style={{width:'auto',padding:'0 14px',marginTop:0}} onClick={konumBul}>📍 Konumum</button></div>{kb&&<p style={{color:'var(--mute)',fontSize:'.8rem',marginTop:4}}>{kb}</p>}
   {siparis?<><label>Paket servis</label><div className="ks-sec"><button type="button" className={'ni '+(b.teslimat?'secili':'')} onClick={()=>setB({...b,teslimat:true})}>Var</button><button type="button" className={'ni '+(!b.teslimat?'secili':'')} onClick={()=>setB({...b,teslimat:false})}>Yok, sadece gel-al</button></div>
    {b.teslimat&&<div className="sa-iki"><div><label>Kaç km'ye</label><input inputMode="decimal" value={b.km} onChange={e=>setB({...b,km:e.target.value})}/></div><div><label>En az sipariş</label><input value={b.min_siparis} onChange={e=>setB({...b,min_siparis:e.target.value})} placeholder="ör. 200 TL"/></div></div>}</>
   :<div className="sa-iki"><div><label>Çalışanlar</label><input value={b.personel} onChange={e=>setB({...b,personel:e.target.value})} placeholder="ör. Mehmet, Can"/></div><div><label>Randevu süresi (dk)</label><input inputMode="numeric" value={b.sure_dk} onChange={e=>setB({...b,sure_dk:e.target.value})}/></div></div>}
   <label>Asistanın adı <span style={{color:'var(--mute)',fontWeight:400}}>(isteğe bağlı)</span></label><input value={b.asistan_adi} maxLength={30} onChange={e=>setB({...b,asistan_adi:e.target.value})} placeholder="ör. Ayşe"/>
   <label>Asistanın bilmesi gerekenler <span style={{color:'var(--mute)',fontWeight:400}}>(isteğe bağlı)</span></label><textarea rows={3} value={b.notlar} onChange={e=>setB({...b,notlar:e.target.value})} placeholder="ör. Otopark var. Kredi kartı geçer. Cuma 13:00-14:00 arası kapalıyız."/>
   <p style={{color:'var(--mute)',fontSize:'.82rem',marginTop:8}}>Bunları sonra panelden ya da sohbetle istediğin zaman değiştirebilirsin.</p>
   <div className="sa-iki" style={{marginTop:12}}><button type="button" className="ks-btn g ni" onClick={()=>setAd(1)}>Geri</button><button type="button" className="ks-btn ni" disabled={!ok2} onClick={()=>setAd(3)}>Devam</button></div>
   {!ok2&&<p style={{color:'var(--mute)',fontSize:'.8rem',marginTop:8,textAlign:'center'}}>İşletme adı ve sektör gerekli; gerisini sonra da ekleyebilirsin</p>}</div>}
  {ad===3&&<form className="ks-kart" onSubmit={gonder}>
   <label>Adın soyadın</label><input value={h.ad} onChange={e=>setH({...h,ad:e.target.value})} autoComplete="name" required/>
   <label>Cep telefonun</label><input value={h.tel} onChange={e=>setH({...h,tel:e.target.value})} inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" required/>
   <label>E-posta</label><input type="email" value={h.eposta} onChange={e=>setH({...h,eposta:e.target.value})} autoComplete="email" required/>
   <label>Şifre</label><input type="password" value={h.sifre} onChange={e=>setH({...h,sifre:e.target.value})} autoComplete="new-password" placeholder="En az 8 karakter, harf ve rakam" required/>
   <input tabIndex={-1} autoComplete="off" value={h.web} onChange={e=>setH({...h,web:e.target.value})} style={{position:'absolute',left:'-9999px',width:1,height:1,opacity:0}} aria-hidden="true"/>
   <label className="ks-ok"><input type="checkbox" checked={h.kvkk} onChange={e=>setH({...h,kvkk:e.target.checked})}/><span><a href="/yasal/kvkk" target="_blank">KVKK aydınlatma metnini</a> okudum, <a href="/yasal/sozlesme" target="_blank">hizmet sözleşmesini</a> kabul ediyorum.</span></label>
   {err&&<div className="ks-hata">{err}</div>}
   <div className="sa-ozet"><span>{f.aciklama}{n.tercih==='kirala'?' + yeni numara':' + kendi numaram'}</span><b>${f.usd} <small>+ KDV</small></b></div>
   <div className="sa-iki"><button type="button" className="ks-btn g ni" onClick={()=>setAd(2)}>Geri</button><button className="ks-btn ni" disabled={busy||!h.kvkk}>{busy?'Hesabın açılıyor…':'Hesabı aç ve kartla öde'}</button></div>
   <p style={{color:'var(--mute)',fontSize:'.8rem',marginTop:8,textAlign:'center'}}>🔒 Sonraki adımda güvenli ödeme sayfası açılır. Ödeme onaylanınca asistanın otomatik kurulur.</p></form>}
 </div></div>;}
