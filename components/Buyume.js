'use client';
// Panel → Büyüme: "Bu ay Dinlio sana ne kazandırdı" kartı, sadakat programı, geri kazanma aramaları, kampanya izinleri, bekleme listesi.
// mini=true: Genel bakışta sadece kazanç kartı.
import {useEffect,useState} from 'react';import {waLink} from '@/lib/destek';
const tl=n=>Math.round(n||0).toLocaleString('tr-TR')+' ₺';
export default function Buyume({tok,mini,git}){
 const [d,setD]=useState(null),[f,setF]=useState(null),[msg,setMsg]=useState({}),[busy,setBusy]=useState('');
 const api=async(m,body)=>{const r=await fetch('/api/buyume',{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+await tok()},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 const doldur=j=>{setD(j);setF({sa:j.sadakat.aktif,her:j.sadakat.her,odul:j.sadakat.odul,kom:j.sadakat.komisyon||'',sepet:j.sadakat.sepet||'',ga:j.geri.aktif,gun:j.geri.gun,teklif:j.geri.teklif,gunluk:j.geri.gunluk});};
 useEffect(()=>{api('GET').then(doldur).catch(e=>setMsg({genel:e.message}));},[]);
 const kaydet=async(islem,body)=>{setBusy(islem);setMsg({});try{const j=await api('POST',{islem,...body});doldur(j);setMsg({[islem]:j.mesaj||'Kaydedildi.'});}catch(e){setMsg({[islem]:e.message});}setBusy('');};
 const csvIndir=async()=>{const r=await fetch('/api/buyume?csv=izin',{headers:{authorization:'Bearer '+await tok()}});const b=await r.blob(),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='kampanya_izinleri.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);};
 if(!d)return mini?null:<div className="card"><p className="mut">{msg.genel||'Yükleniyor…'}</p></div>;
 const k=d.kazanc,P=d.paket,M=x=>msg[x]?<p className="mut" style={{marginTop:6}}>{msg[x]}</p>:null;
 const kilit=x=><p style={{marginTop:6}}>🔒 <b>{d.enAz[x]}</b> paketten itibaren açılır. <a className="lnk" href={waLink('Merhaba, paketimi yükseltmek istiyorum.')} target="_blank" rel="noopener">Paketi yükselt</a></p>;
 const ay=new Date().toLocaleDateString('tr-TR',{month:'long'});
 const kutu=[[k.cagri,'çağrı karşılandı','☎'],[d.randevu?k.randevu:k.siparis,d.randevu?'randevu verildi':'sipariş alındı',d.randevu?'📅':'🛵'],[k.kapaliyken,'çağrı kapalıyken / gece geldi','🌙'],[k.sadik,'müşteri tekrar sipariş verdi','💛']];
 const ekstra=[k.odul&&`🎁 ${k.odul} sadakat ödülü`,k.bekleme&&`⏳ ${k.bekleme} boşalan saat için bekleme listesine haber`,k.teyit&&`✅ ${k.teyit} randevu teyidi`,k.geriArama&&`📞 ${k.geriArama} eski müşteri arandı → ${k.geriDonus} sipariş`,k.hatDolu&&`☎ ${k.hatDolu} arama hat dolu olduğu için size aktarıldı`].filter(Boolean);
 const Kart=<div className="card by-kart"><div className="by-ust"><div><small className="mut">{ay[0].toUpperCase()+ay.slice(1)} ayında</small><h2 style={{margin:'2px 0 0'}}>Dinlio sana ne kazandırdı?</h2></div>
   {k.komisyon>0?<div className="by-buyuk"><small>Uygulama komisyonundan kurtardığın</small><b>{tl(k.komisyon)}</b></div>
    :d.siparis&&!d.randevu?<button className="g ni" onClick={()=>git?git():document.getElementById('by-sadakat')?.scrollIntoView({behavior:'smooth'})}>💰 Kurtardığın komisyonu hesapla</button>:null}</div>
  <div className="by-kpis">{kutu.map(([n,l,i])=><div key={l}><span>{i}</span><b>{n}</b><small>{l}</small></div>)}</div>
  {ekstra.length>0&&<p className="mut" style={{marginTop:10}}>{ekstra.join(' · ')}</p>}</div>;
 if(mini)return Kart;
 return <>{Kart}
  <div className="card sec2" id="by-sadakat"><h2>🎁 Sadakat programı</h2><p className="mut">Asistan arayanı numarasından tanır, kaçıncı {d.randevu?'randevusu':'siparişi'} olduğunu sayar. Ödül sırası gelen müşteriye telefonda müjdeler, size gelen bildirimde de "🎁 SADAKAT ÖDÜLÜ" yazar. Müşteriyi uygulamalardan kendi telefonunuza çeker.</p>
   {!P.sadik?kilit('sadik'):<><label className="ck" style={{marginTop:8}}><input type="checkbox" style={{width:'auto'}} checked={f.sa} onChange={e=>setF({...f,sa:e.target.checked})}/> Sadakat programı açık</label>
    <div className="frm" style={{marginTop:8}}><label>Her kaçıncı {d.randevu?'randevuda':'siparişte'}<input type="number" min={2} max={50} value={f.her} onChange={e=>setF({...f,her:e.target.value})}/></label>
     <label>Ödül<input placeholder={d.randevu?'ör. sakal tıraşı bizden':'ör. künefe ikram'} maxLength={80} value={f.odul} onChange={e=>setF({...f,odul:e.target.value})}/></label>
     {!d.randevu&&<><label>Yemeksepeti/Getir komisyonu (%)<input type="number" min={0} max={50} placeholder="ör. 30" value={f.kom} onChange={e=>setF({...f,kom:e.target.value})}/></label>
     <label>Ortalama sepet (₺)<input type="number" min={0} placeholder="ör. 350" value={f.sepet} onChange={e=>setF({...f,sepet:e.target.value})}/></label></>}</div>
    {!d.randevu&&<p className="mut" style={{fontSize:'.85rem'}}>Komisyon ve sepet tutarı sadece "kurtardığın komisyon" hesabı içindir, müşteriye söylenmez.</p>}
    <button disabled={busy==='sadakat'} onClick={()=>kaydet('sadakat',{aktif:f.sa,her:f.her,odul:f.odul,komisyon:f.kom,sepet:f.sepet})}>{busy==='sadakat'?'…':'Kaydet'}</button>{M('sadakat')}</>}</div>

  <div className="card sec2"><h2>📞 Geri kazanma aramaları</h2><p className="mut">Asistan sipariş/randevu sonunda müşteriye "kampanyalardan telefonla haberdar olmak ister misiniz?" diye sorar. <b>Sadece evet diyenler</b>, belirlediğiniz süre boyunca hiç uğramazsa hafta içi ve cumartesi 14:00'te aranır ve teklifiniz anlatılır. Asistan yapay zekâ olduğunu söyler, istemeyen bir daha aranmaz.</p>
   {!P.geri?kilit('geri'):<><label className="ck" style={{marginTop:8}}><input type="checkbox" style={{width:'auto'}} checked={f.ga} onChange={e=>setF({...f,ga:e.target.checked})}/> Geri kazanma aramaları açık</label>
    <div className="frm" style={{marginTop:8}}><label>Kaç gündür uğramayan aransın<input type="number" min={15} max={365} value={f.gun} onChange={e=>setF({...f,gun:e.target.value})}/></label>
     <label>Günde en fazla kaç kişi<input type="number" min={1} max={30} value={f.gunluk} onChange={e=>setF({...f,gunluk:e.target.value})}/></label></div>
    <label>Teklif (asistan bunu anlatır)<textarea rows={2} maxLength={200} placeholder="ör. Sizi özledik, bu hafta size özel tüm dürümlerde %15 indirim var." value={f.teklif} onChange={e=>setF({...f,teklif:e.target.value})}/></label>
    <button disabled={busy==='geri'} onClick={()=>kaydet('geri',{aktif:f.ga,gun:f.gun,gunluk:f.gunluk,teklif:f.teklif})}>{busy==='geri'?'…':'Kaydet'}</button>{M('geri')}
    <div className="by-izin"><div><b>{d.izinli}</b> müşteri izin verdi{d.ret?<span className="mut"> · {d.ret} istemedi</span>:null}</div><button className="g" onClick={csvIndir}>İzin listesini indir (CSV)</button></div>
    <p className="mut" style={{fontSize:'.82rem'}}>⚖️ Kampanya araması ticari ileti sayılır. İzinler görüşme kaydıyla birlikte saklanır; bu listeyi <b>İYS'ye (İleti Yönetim Sistemi) yüklemek işletmenin yükümlülüğüdür</b>. İYS'de kaydı olmayan numaraları aramayın. Aramalar işletmenizin dakikasından düşer.</p>
    <div className="frm" style={{marginTop:6}}><label>Bir numarayı listeden çıkar<input placeholder="05xx xxx xx xx" value={f.cikar||''} onChange={e=>setF({...f,cikar:e.target.value})}/></label></div>
    <button className="g" disabled={busy==='izin_kaldir'} onClick={()=>kaydet('izin_kaldir',{tel:f.cikar})}>Çıkar</button>{M('izin_kaldir')}</>}</div>

  {d.randevu&&<div className="card sec2"><h2>⏳ Bekleme listesi ve randevu teyidi</h2><p className="mut">Asistan, randevusu olan müşteriyi bir gün önce arayıp teyit alır (Ayarlar → Randevu hatırlatma → "Asistan arasın"). Gelemeyecek olan iptal eder ya da başka güne alır. Dolu bir gün için arayan müşteri bekleme listesine yazılır; o gün bir saat boşalınca {P.sms?'listedeki ilk 3 kişiye SMS gider ve ':''}size bildirim gelir.</p>
   {!P.hatirlatma?kilit('hatirlatma'):!d.bekleme.length?<p className="mut" style={{marginTop:8}}>Şu an bekleyen kimse yok.</p>
    :<div style={{marginTop:8}}>{d.bekleme.map(x=><div key={x.id} className="by-bek"><div><b>{new Date(x.tarih+'T12:00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',weekday:'short'})}</b> · {x.ad||'İsimsiz'} {x.hizmet?<span className="mut">({x.hizmet})</span>:null}{x.durum==='haber_verildi'&&<span className="tag" style={{marginLeft:6}}>SMS gitti</span>}{x.notlar&&<div className="mut" style={{fontSize:'.85rem'}}>{x.notlar}</div>}</div>
     <div className="acts"><a className="lb" href={'tel:0'+x.tel}>Ara</a><button className="g" onClick={()=>kaydet('bekleme',{id:x.id,durum:'tamam'})}>Randevu verildi ✓</button><button className="g" onClick={()=>kaydet('bekleme',{id:x.id,durum:'iptal'})}>Sil</button></div></div>)}</div>}{M('bekleme')}</div>}
  <div className="card sec2"><h2>📈 Haftalık "neyi kaçırıyorsun" raporu</h2><p className="mut">Her pazartesi akşamı bildirimlere gelir: müşterilerin sorduğu ama listenizde olmayan ürünler, kapalıyken gelen çağrılar, sinirli kapanan görüşmeler, kurtarılan komisyon ve geri kazanılan müşteriler. {P.ad==='Büyük'||P.ad==='Pro'?'Paketinizde açık.':`🔒 ${d.enAz.geri} paketten itibaren gelir.`}</p></div></>;}
