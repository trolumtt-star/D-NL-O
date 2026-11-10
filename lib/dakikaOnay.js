// Ödeme onaylanınca (Shopier geri dönüşü ya da admin "Onayla"): dakikayı ekler, durduysa asistanı geri açar, işletmeye haber verir.
import {adminSb} from './admin';import {resumeBusiness} from './vapi';import {bildir} from './bildir';
export async function dakikaOnayla(kod,ref){const {data:r,error}=await adminSb.rpc('ek_dakika_ekle',{p_kod:kod,p_ref:ref||null});if(error)throw error;
 if(!r?.ok)return r;
 if(r.acildi){const {data:bz}=await adminSb.from('businesses').select('vapi_phone_id,vapi_assistant_id').eq('id',r.business_id).single();
  if(bz?.vapi_phone_id){const x=await resumeBusiness(bz);if(x.ok)await adminSb.from('businesses').update({vapi_paused:false}).eq('id',r.business_id);}}
 try{await bildir(r.business_id,`✅ ${r.dakika} ek dakika hesabınıza eklendi.${r.acildi?' Asistanınız yeniden telefonlara cevap veriyor.':''}`);}catch{}
 return r;}
