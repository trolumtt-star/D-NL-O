'use client';
// Panel → Genel bakış: yeni işletmeye kurulum rehberi. Sistemin otomatik yaptıkları ✓ olarak görünür,
// işletmenin yapması gerekenler tek tek, ilgili sekmeye giden butonla listelenir. Hepsi bitince kendiliğinden kaybolur.
import {useEffect,useState} from 'react';
export default function KurulumRehberi({b,hasA,urunSay,git}){
 const [gizli,setGizli]=useState(true),[bil,setBil]=useState('default');
 useEffect(()=>{try{setGizli(localStorage.getItem('rehber_gizle_'+b.id)==='1');}catch{setGizli(false);}try{setBil(typeof Notification!=='undefined'?Notification.permission:'denied');}catch{}},[b.id]);
 const s=b.settings||{},kirala=s.satin_al?.numara?.tercih==='kirala';
 const adim=[
  {ok:!!b.vapi_assistant_id,oto:true,t:'Asistanın kuruldu',a:'Verdiğin bilgilerle Vapi\'de sana özel asistan oluşturuldu.'},
  {ok:urunSay>0,t:hasA?'Hizmetlerini ve fiyatlarını kontrol et':'Menünü ve fiyatlarını kontrol et',a:urunSay>0?`${urunSay} kayıt var; eksik ya da yanlış fiyat varsa düzelt.`:'Asistan fiyat sorulunca buradan okur. Elle ekleyebilir ya da menü fotoğrafını yükleyebilirsin.',btn:hasA?'svc':'menu'},
  {ok:!!s.konum?.adres||!!s.kurulum?.bilgi?.adres,t:'Adresini ekle',a:'İşletmedeyken "📍 Konumumu kullan"a basman yeterli.',btn:'set',hedef:'dukkan-konum'},
  {ok:!!(s.working_hours&&Object.keys(s.working_hours).length),t:'Çalışma saatlerini ayarla',a:'Asistan kapalı saatte arayana kapalı olduğunuzu söyler.',btn:hasA?'svc':'set'},
  {ok:!!b.vapi_phone_id,oto:true,t:'Asistan hattın bağlandı',a:b.vapi_phone_id?'Hattın hazır.':'Ödeme onaylanınca hat otomatik bağlanır; birkaç dakika içinde burada görünür.'},
  ...(kirala?[]:[{ok:!!s.yonlendirme?.ok,t:'Numaranı asistana yönlendir ve test et',a:'Tek bir kod tuşluyorsun, sonra "Test et". 1 dakika sürer.',btn:'set',kosul:!!b.vapi_phone_id}]),
  {ok:bil==='granted',t:'Bildirimlere izin ver',a:'Yeni sipariş/randevu gelince telefonuna anında bildirim düşsün. Ayarlar\'daki "Telefon bildirimleri" kartından aç.',btn:'set'}];
 const bitti=adim.filter(x=>x.ok).length,tamam=bitti===adim.length;
 if(gizli||tamam)return null;
 const yuzde=Math.round(bitti/adim.length*100);
 return <div className="card" style={{border:'1px solid rgba(255,31,61,.45)'}}>
  <div className="row" style={{flexWrap:'wrap',gap:8}}><div><h2>🚀 Kurulum rehberi</h2><p className="mut" style={{marginTop:4}}>Çoğunu sistem kendisi yaptı; birkaç adım sana kaldı. {bitti}/{adim.length} tamam.</p></div>
   <button className="g" style={{padding:'4px 10px'}} onClick={()=>{try{localStorage.setItem('rehber_gizle_'+b.id,'1');}catch{}setGizli(true);}}>Gizle</button></div>
  <div style={{height:8,borderRadius:99,background:'rgba(255,255,255,.08)',margin:'10px 0 6px',overflow:'hidden'}}><div style={{width:yuzde+'%',height:'100%',background:'linear-gradient(90deg,#ff1f3d,#ff6b7d)',transition:'width .6s'}}/></div>
  <div style={{display:'grid',gap:2,marginTop:6}}>{adim.map((x,i)=><div key={i} className="row" style={{gap:10,alignItems:'flex-start',justifyContent:'flex-start',padding:'10px 0',borderTop:i?'1px solid rgba(255,255,255,.06)':0,opacity:x.ok?.65:1}}>
   <span style={{fontSize:'1.15rem',lineHeight:1.3}}>{x.ok?'✅':x.oto?'⏳':'⬜'}</span>
   <div style={{flex:1}}><b>{x.t}</b> {x.oto&&<span className="tag" style={{marginLeft:4}}>otomatik</span>}<div className="mut" style={{fontSize:'.86rem',marginTop:2}}>{x.a}</div></div>
   {!x.ok&&x.btn&&x.kosul!==false&&<button style={{padding:'6px 12px'}} onClick={()=>{git(x.btn);if(x.hedef)setTimeout(()=>document.getElementById(x.hedef)?.scrollIntoView({behavior:'smooth',block:'center'}),350);}}>Yap →</button>}
</div>)}</div></div>;}
