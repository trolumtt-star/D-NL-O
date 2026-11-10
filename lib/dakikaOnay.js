// Ödeme onaylanınca (Shopier geri dönüşü ya da admin "Onayla"): dakikayı ekler, durduysa asistanı geri açar, işletmeye haber verir.
import {adminSb} from './admin';import {ac} from './vapi';import {bildir} from './bildir';
export async function dakikaOnayla(kod,ref){const {data:r,error}=await adminSb.rpc('ek_dakika_ekle',{p_kod:kod,p_ref:ref||null});if(error)throw error;
 if(!r?.ok)return r;
 if(r.acildi)await ac(r.business_id);
 try{await bildir(r.business_id,(r.tur==='asim'?`✅ ${r.dakika} dk aşım ücretiniz ödendi, kilitli konuşmalar açıldı.`:`✅ ${r.dakika} ek dakika hesabınıza eklendi.`)+`${r.acildi?' Asistanınız yeniden telefonlara cevap veriyor.':''}`);}catch{}
 return r;}
