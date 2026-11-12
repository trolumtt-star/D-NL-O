// Randevu hatırlatma (Büyük+): yarınki onaylı randevular için sabah SMS veya hatırlatma araması.
// İşletme Ayarlar'dan "SMS" ya da "Arama" seçer. Her randevuya bir kez gider (appointments.hatirlatma_at).
import {adminSb} from './admin';import {paketOf} from './paket';import {smsGonder} from './entegrasyon';import {gidenArama} from './vapi';
const TZ='Europe/Istanbul';
export async function hatirlatmalariGonder({butce=40000}={}){
 const bas=Date.now(),bugun=new Date().toLocaleDateString('sv-SE',{timeZone:TZ}),yarin=new Date(new Date(bugun+'T00:00:00+03:00').getTime()+864e5),ertesi=new Date(yarin.getTime()+864e5);
 const {data:l}=await adminSb.from('businesses').select('id,name,status,quota_minutes_total,settings,vapi_phone_id,vapi_assistant_id').neq('status','suspended');
 let n=0;const hatalar=[];
 for(const b of l||[]){const tur=b.settings?.hatirlatma;if(!['sms','arama'].includes(tur)||!paketOf(b).hatirlatma)continue;
  const {data:ap}=await adminSb.from('appointments').select('id,customer_name,customer_phone,starts_at').eq('business_id',b.id).eq('status','confirmed').is('hatirlatma_at',null).gte('starts_at',yarin.toISOString()).lt('starts_at',ertesi.toISOString()).limit(100);
  for(const a of ap||[]){if(Date.now()-bas>butce)return {n,hatalar,yarim:true};if(!a.customer_phone)continue;
   const saat=new Date(a.starts_at).toLocaleTimeString('tr-TR',{timeZone:TZ,hour:'2-digit',minute:'2-digit'});
   const r=tur==='sms'?await smsGonder(a.customer_phone,`${b.name||'İşletme'}: Yarın saat ${saat} randevunuzu hatırlatırız. Gelemeyecekseniz lütfen bizi arayın.`)
    :await gidenArama({phoneNumberId:b.vapi_phone_id,assistantId:b.vapi_assistant_id,numara:a.customer_phone,firstMessage:`Merhaba${a.customer_name?' '+a.customer_name:''}, ${b.name||'işletmemiz'} adına arıyorum, ben yapay zeka asistanıyım. Yarın saat ${saat} randevunuzu hatırlatmak istedim. Gelebilecek misiniz?`,variableValues:{hatirlatma:'evet',randevuSaati:saat}});
   if(r.ok){await adminSb.from('appointments').update({hatirlatma_at:new Date().toISOString()}).eq('id',a.id);n++;}else{hatalar.push(r.neden);if(r.atlandi)break;}}}
 return {n,hatalar:[...new Set(hatalar)].slice(0,5)};}

// GOOGLE YORUM İSTEME (Standart+, SMS hattı gerekir): bugün teslim edilen sipariş / tamamlanan randevu sahiplerine yorum linki.
// Aynı numaraya 90 günde bir kez, işletme başına günde en fazla 40 SMS.
export async function yorumIste({butce=15000}={}){
 const bas=Date.now(),bugun=new Date().toLocaleDateString('sv-SE',{timeZone:TZ}),gb=new Date(bugun+'T00:00:00+03:00');let n=0;
 const {data:l}=await adminSb.from('businesses').select('id,name,quota_minutes_total,settings').neq('status','suspended');
 for(const b of l||[]){const y=b.settings?.yorum;if(!y?.aktif||!y.link||!paketOf(b).sms)continue;
  const [{data:c},{data:a},{data:eski}]=await Promise.all([
   adminSb.from('calls').select('caller_phone,stated_phone').eq('business_id',b.id).eq('order_status','done').eq('duygu','memnun').gte('created_at',gb.toISOString()).limit(200),
   adminSb.from('appointments').select('customer_phone').eq('business_id',b.id).eq('status','completed').gte('starts_at',gb.toISOString()).limit(200),
   adminSb.from('webhook_events').select('payload').eq('business_id',b.id).eq('type','yorum_sms').gte('created_at',new Date(Date.now()-90*864e5).toISOString()).limit(5000)]);
  const gitmis=new Set((eski||[]).map(x=>x.payload?.tel)),son10=s=>String(s||'').replace(/\D/g,'').slice(-10);
  const hedef=[...new Set([...(c||[]).map(x=>son10(x.stated_phone||x.caller_phone)),...(a||[]).map(x=>son10(x.customer_phone))])].filter(t=>/^5\d{9}$/.test(t)&&!gitmis.has(t)).slice(0,40);
  for(const t of hedef){if(Date.now()-bas>butce)return {n,yarim:true};
   const r=await smsGonder(t,`${b.name||'İşletme'}: Bizi tercih ettiğiniz için teşekkürler! Memnun kaldıysanız yorumunuz bizi çok mutlu eder: ${y.link}`);
   if(r.atlandi)return {n,atlandi:true};if(r.ok){await adminSb.from('webhook_events').insert({type:'yorum_sms',business_id:b.id,payload:{tel:t}});n++;}}}
 return {n};}
