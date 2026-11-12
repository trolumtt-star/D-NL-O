'use client';
// Ayarlar → Asistan: kimlik, görüşme ayarları, kapalı mod, kara liste, teslimat bölgesi, acil durum, kampanya, bilgi bankası,
// yetkiliye aktarma ve bağlantılar (SMS, e-posta, hatırlatma, Google Takvim, kendi sisteminiz, özel ses). Paket kapıları sunucuda da kontrol edilir.
import {useEffect,useState} from 'react';import {waLink} from '@/lib/destek';
export default function AsistanAyar({tok,siparis}){
 const [d,setD]=useState(null),[f,setF]=useState({}),[msg,setMsg]=useState({}),[busy,setBusy]=useState(''),[gt,setGt]=useState(null),[os,setOs]=useState(null);
 const req=async(u,m,body)=>{const r=await fetch(u,{method:m,headers:{...(body instanceof FormData?{}:{'content-type':'application/json'}),authorization:'Bearer '+await tok()},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 const api=(m,b)=>req('/api/isletme-ayar',m,b);
 const doldur=j=>{setD(j);setF({tatil:j.tatil.aktif,tmesaj:j.tatil.mesaj||'',kara:(j.kara_liste||[]).map(n=>'0'+n).join('\n'),kamp:j.kampanya.aktif,kmetin:j.kampanya.metin||'',bilgi:j.bilgi||'',
  ad:j.asistan.ad||'',kisilik:j.asistan.kisilik||'',maxdk:j.gorusme.max_dk||0,yavas:!!j.gorusme.yavas,kkapali:!!j.gorusme.kayit_kapali,km:j.teslimat_km||0,acil:j.acil_tanim||'',
  aktarma:j.aktarma_no?'0'+String(j.aktarma_no).slice(-10):'',hat:j.hatirlatma||'yok',smsOnay:!!j.sms_onay,ep:!!j.eposta_ozet.aktif,epAdres:j.eposta_ozet.adres||'',cikis:j.cikis?.url||''});};
 const gYukle=()=>req('/api/google/baglan','GET').then(setGt).catch(()=>{});const sYukle=()=>req('/api/ses-kopya','GET').then(setOs).catch(()=>{});
 useEffect(()=>{api('GET').then(doldur).catch(e=>setMsg({genel:e.message}));gYukle();sYukle();
  try{const q=new URLSearchParams(location.search).get('takvim');if(q)setMsg({takvim:q==='ok'?'Google Takvim bağlandı.':'Google Takvim bağlanamadı, tekrar deneyin.'});}catch{}},[]);
 const kaydet=async(islem,body,ok)=>{setBusy(islem);setMsg({});try{const j=await api('POST',{islem,...body});if(j.tatil)doldur(j);setMsg({[islem]:j.mesaj||ok});}catch(e){setMsg({[islem]:e.message});}setBusy('');};
 if(!d)return <div className="card sec2"><h2>Asistan ayarları</h2><p className="mut">{msg.genel||'Yükleniyor…'}</p></div>;
 const P=d.paket,kilit=k=><p style={{marginTop:6}}>🔒 <b>{d.enAz[k]||'Üst'}</b> paketten itibaren açılır. <a className="lnk" href={waLink('Merhaba, paketimi yükseltmek istiyorum.')} target="_blank" rel="noopener">Paketi yükselt</a></p>;
 const M=k=>msg[k]?<p className="mut" style={{marginTop:6}}>{msg[k]}</p>:null,ck=(k,l)=><label className="ck" style={{marginTop:6}}><input type="checkbox" style={{width:'auto'}} checked={!!f[k]} onChange={e=>setF({...f,[k]:e.target.checked})}/> {l}</label>;
 const btn=(islem,body,ok,t='Kaydet')=><button disabled={busy===islem} onClick={()=>kaydet(islem,body,ok)}>{busy===islem?'…':t}</button>;
 const yakinda=(ad,neden)=><span className="tag" title={neden}>Bağlantı bekleniyor</span>;
 return <>
  <div className="card sec2"><h2>Asistanın kimliği</h2><p className="mut">Asistana bir isim ve konuşma tarzı verin. Açılışta "Ben yapay zeka asistanı Ayşe" der; yapay zeka olduğunu gizlemez.</p>
   <div className="frm"><label>Adı<input value={f.ad} maxLength={30} onChange={e=>setF({...f,ad:e.target.value})} placeholder="ör. Ayşe"/></label>
   <label>Konuşma tarzı<input value={f.kisilik} maxLength={300} onChange={e=>setF({...f,kisilik:e.target.value})} placeholder="ör. Samimi, esprili, kısa cümleler"/></label>{btn('asistan',{ad:f.ad,kisilik:f.kisilik},'Kaydedildi.')}</div>{M('asistan')}</div>
  <div className="card sec2"><h2>Görüşme ayarları</h2>
   <div className="frm"><label>Görüşme süresi sınırı<select value={f.maxdk} onChange={e=>setF({...f,maxdk:+e.target.value})}>{[0,3,5,8,10,15,20].map(n=><option key={n} value={n}>{n?n+' dakika':'Sınır yok'}</option>)}</select></label></div>
   {ck('yavas','Yavaş ve net konuş (yaşlı müşteriler için)')}{ck('kkapali','Ses kaydı tutma (sadece yazılı not kalır)')}
   <p className="mut" style={{fontSize:'.8rem'}}>Müşteri "kaydedilmek istemiyorum" derse o görüşmenin kaydı ve metni otomatik silinir.</p>
   {btn('gorusme',{max_dk:f.maxdk,yavas:f.yavas,kayit_kapali:f.kkapali},'Kaydedildi.')}{M('gorusme')}</div>
  <div className="card sec2"><h2>Kapalı / tatil modu</h2>
   <p className="mut">Açıkken asistan "şu an kapalıyız" diye karşılar, talebi not alır. Randevulu işletmelerde çalışma saatleri dışında da otomatik böyle açar ama randevu vermeye devam eder.</p>
   {ck('tatil','Bugün / şu an kapalıyız')}<input value={f.tmesaj} maxLength={200} onChange={e=>setF({...f,tmesaj:e.target.value})} placeholder="İsteğe bağlı not, ör. Pazartesi 09:00'da açılıyoruz."/>
   {btn('tatil',{aktif:f.tatil,mesaj:f.tmesaj},'Kaydedildi.')}{M('tatil')}</div>
  {siparis&&<div className="card sec2"><h2>Teslimat bölgesi</h2><p className="mut">Asistan adresi haritada bulunca dükkânınıza uzaklığına bakar; sınırın dışındaysa kibarca teslimat yapamadığınızı söyler, gel-al önerir.</p>
   {!d.konumVar&&<p className="mut">Önce aşağıdaki "Dükkân konumu" kartından adresinizi kaydedin.</p>}
   <div className="frm"><label>Teslimat yarıçapı<select value={f.km} onChange={e=>setF({...f,km:+e.target.value})}>{[0,1,2,3,4,5,7,10,15,20].map(n=><option key={n} value={n}>{n?n+' km':'Kontrol etme'}</option>)}</select></label>{btn('teslimat',{km:f.km},'Kaydedildi.')}</div>{M('teslimat')}</div>}
  <div className="card sec2"><h2>Acil durumlar</h2><p className="mut">Hangi durumların acil sayılacağını yazın; asistan böyle bir talebi 🚨 ile işaretler ve öncelikli bildirim gönderir.</p>
   <input value={f.acil} maxLength={300} onChange={e=>setF({...f,acil:e.target.value})} placeholder={siparis?'ör. Yanlış/eksik sipariş şikâyeti, alerji sorusu':'ör. Şiddetli diş ağrısı, kırık diş, kanama'}/>{btn('acil',{metin:f.acil},'Kaydedildi.')}{M('acil')}</div>
  <div className="card sec2"><h2>Kara liste</h2><p className="mut">Bu numaralar aradığında asistan açmaz, dakikanız da harcanmaz. Her satıra bir numara.</p>
   <textarea rows="3" value={f.kara} onChange={e=>setF({...f,kara:e.target.value})} placeholder={'05xx xxx xx xx\n05xx xxx xx xx'}/>{btn('kara_liste',{numaralar:f.kara.split(/[\n,;]+/)},'Kara liste kaydedildi.')}{M('kara_liste')}</div>
  <div className="card sec2"><h2>Yetkiliye aktarma</h2>{P.aktarma?<><p className="mut">Müşteri yetkiliyle görüşmek isterse veya şikâyet büyürse asistan kısaca özetleyip aramayı bu numaraya aktarır. Kapalı saatte aktarmaz. Kaydettikten sonra "Vapi araçlarını kur" ile asistana eklenir.</p>
   <div className="frm"><label>Aktarılacak numara<input value={f.aktarma} onChange={e=>setF({...f,aktarma:e.target.value})} placeholder="05xx xxx xx xx (boş = kapalı)"/></label>{btn('aktarma',{numara:f.aktarma},'Kaydedildi.')}</div></>:kilit('aktarma')}{M('aktarma')}</div>
  <div className="card sec2"><h2>Kampanya duyurusu</h2>{P.kampanya?<><p className="mut">Asistan sipariş veya randevu kesinleşince bunu bir kez, kısaca söyler.</p>
   {ck('kamp','Kampanya açık')}<input value={f.kmetin} maxLength={300} onChange={e=>setF({...f,kmetin:e.target.value})} placeholder="ör. Bu hafta 2 lahmacun + ayran 150 TL."/>
   {btn('kampanya',{aktif:f.kamp,metin:f.kmetin},'Kampanya kaydedildi.')}</>:kilit('kampanya')}{M('kampanya')}</div>
  <div className="card sec2"><h2>Bilgi bankası</h2>{P.bilgi?<><p className="mut">Müşterilerin sık sorduğu şeyleri yazın; asistan buradan cevap verir, burada olmayanı uydurmaz.</p>
   <textarea rows="6" maxLength={4000} value={f.bilgi} onChange={e=>setF({...f,bilgi:e.target.value})} placeholder={'Otopark var mı? Evet, binanın arkasında ücretsiz.\nKartla ödeme var mı? Evet.'}/>
   <p className="mut" style={{fontSize:'.8rem'}}>{f.bilgi.length} / 4000 karakter</p>{btn('bilgi',{metin:f.bilgi},'Bilgi bankası kaydedildi.')}</>:kilit('bilgi')}{M('bilgi')}</div>
  <div className="card sec2"><h2>Müşteriye mesajlar (SMS)</h2>
   {P.sms?<>{!d.baglanti.netgsm&&<p>{yakinda()} <span className="mut">SMS hattı bağlanınca otomatik çalışır.</span></p>}
    {ck('smsOnay','Sipariş ve randevu alınınca müşteriye onay SMS\'i gönder')}{btn('sms_onay',{aktif:f.smsOnay},'Kaydedildi.')}</>:kilit('sms')}{M('sms_onay')}
   <h3 style={{marginTop:12}}>Randevu hatırlatma</h3>{P.hatirlatma?<><p className="mut">Yarınki randevular için akşam hatırlatma gönderilir.</p>
    <div className="frm"><label>Hatırlatma<select value={f.hat} onChange={e=>setF({...f,hat:e.target.value})}><option value="yok">Gönderme</option><option value="sms">SMS ile</option><option value="arama">Asistan arasın</option></select></label>{btn('hatirlatma',{tur:f.hat},'Kaydedildi.')}</div></>:kilit('hatirlatma')}{M('hatirlatma')}</div>
  <div className="card sec2"><h2>Her aramadan sonra e-posta</h2>{P.eposta?<>{!d.baglanti.eposta&&<p>{yakinda()} <span className="mut">E-posta servisi bağlanınca çalışır.</span></p>}
   {ck('ep','Her arama/sipariş özetini e-postayla gönder')}<input value={f.epAdres} onChange={e=>setF({...f,epAdres:e.target.value})} placeholder="ornek@isletme.com"/>{btn('eposta',{aktif:f.ep,adres:f.epAdres},'Kaydedildi.')}</>:kilit('eposta')}{M('eposta')}</div>
  {gt&&<div className="card sec2"><h2>Google Takvim</h2>{!gt.izin?kilit('takvim'):!gt.hazir?<p>{yakinda()} <span className="mut">Google bağlantısı açılınca buradan tek tıkla bağlarsınız.</span></p>:gt.bagli?
   <><p>✅ Bağlı{gt.eposta?' ('+gt.eposta+')':''}. Asistanın verdiği randevular takviminize yazılır.</p><button className="g" onClick={async()=>{await req('/api/google/baglan','POST',{islem:'kaldir'});gYukle();}}>Bağlantıyı kaldır</button></>
   :<button onClick={async()=>{try{const j=await req('/api/google/baglan','POST',{});location.href=j.link;}catch(e){setMsg({takvim:e.message});}}}>Google Takvimi bağla</button>}{M('takvim')}</div>}
  <div className="card sec2"><h2>Kendi sisteminize bağlantı</h2>{P.cikis?<><p className="mut">Her çağrı bitince bilgiler (ad, telefon, sipariş, talep, duygu) bu adrese JSON olarak gönderilir. CRM, sipariş programı, Zapier veya Make ile kullanabilirsiniz.</p>
   <input value={f.cikis} onChange={e=>setF({...f,cikis:e.target.value})} placeholder="https://sisteminiz.com/dinlio-webhook (boş = kapalı)"/>
   <div className="row" style={{justifyContent:'flex-start',gap:8}}>{btn('cikis',{url:f.cikis},'Kaydedildi.')}{d.cikis&&btn('cikis_test',{},'','Test gönder')}</div>
   {d.cikis&&<p className="mut" style={{fontSize:'.8rem',marginTop:6}}>İmza: <code>X-Dinlio-Imza</code> = HMAC-SHA256(gövde, <code>{d.cikis.gizli}</code>)</p>}</>:kilit('cikis')}{M('cikis')}{M('cikis_test')}</div>
  {os&&<div className="card sec2"><h2>Özel ses</h2>{!os.izin?<p style={{marginTop:6}}>🔒 <b>{os.enAz}</b> pakette açılır.</p>:!os.hazir?<p>{yakinda()} <span className="mut">Ses kopyalama açılınca buradan kendi sesinizi yükleyebilirsiniz.</span></p>:os.ses?
   <><p>🎙 {os.ses.ad} · {os.ses.aktif?'kullanılıyor':'kapalı'}</p><div className="row" style={{justifyContent:'flex-start',gap:8}}><button className="g" onClick={async()=>{await req('/api/ses-kopya','POST',{islem:os.ses.aktif?'kapat':'ac'});sYukle();}}>{os.ses.aktif?'Varsayılan sese dön':'Özel sesi kullan'}</button><button className="g" onClick={async()=>{if(confirm('Ses silinsin mi?')){await req('/api/ses-kopya','POST',{islem:'sil'});sYukle();}}}>Sil</button></div></>
   :<form onSubmit={async e=>{e.preventDefault();setBusy('ses');setMsg({});try{await req('/api/ses-kopya','POST',new FormData(e.target));setMsg({ses:'Ses hazır, asistan artık bu sesle konuşuyor.'});sYukle();}catch(er){setMsg({ses:er.message});}setBusy('');}}>
    <p className="mut">En az 1 dakikalık, sessiz bir ortamda, doğal konuştuğunuz bir kayıt yükleyin (mp3/m4a, en fazla 4 MB).</p>
    <input name="ad" placeholder="Sesin adı, ör. Ferhat Usta" maxLength={40}/><input name="dosya" type="file" accept="audio/*" required/>
    <label className="ck"><input type="checkbox" name="onay" value="evet" required style={{width:'auto'}}/> Bu ses bana ait veya sahibinin açık izni var.</label>
    <button disabled={busy==='ses'}>{busy==='ses'?'Hazırlanıyor…':'Sesi oluştur'}</button></form>}{M('ses')}</div>}</>;}
