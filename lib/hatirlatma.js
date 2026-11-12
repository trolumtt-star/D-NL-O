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
