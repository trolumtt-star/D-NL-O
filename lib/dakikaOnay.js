// Ödeme onaylanınca (Shopier geri dönüşü ya da admin "Onayla"): dakikayı ekler, durduysa asistanı geri açar, işletmeye haber verir.
import {adminSb} from './admin';import {ac} from './vapi';import {bildir} from './bildir';
export async function dakikaOnayla(kod,ref){const {data:r,error}=await adminSb.rpc('ek_dakika_ekle',{p_kod:kod,p_ref:ref||null});if(error)throw error;
 if(!r?.ok)return r;
 if(r.acildi)try{await ac(r.business_id);}catch{}
 if(r.tur==='paket'){try{await bildir(r.business_id,`🎉 ${r.paket?.ad||'Paketiniz'} başladı: ayda ${r.dakika} dakika.`);}catch{}
  // Asistan + numara otomatik (satın alma formundan)
  let ok=null;try{const {otoKurulum}=await import('./otoKurulum');ok=await otoKurulum(r.business_id);}catch(e){ok={tamam:false,eksik:[e.message]};}
  // Admin'e haber: numara bağlanacak
  try{const {data:b}=await adminSb.from('businesses').select('name,vapi_phone_id').eq('id',r.business_id).single();await adminSb.from('webhook_events').insert({type:'yeni_abone',business_id:r.business_id,payload:{ad:b?.name,paket:r.paket,numara_var:!!b?.vapi_phone_id,eksik:ok?.eksik||[]}});
   const {smsGonder}=await import('./entegrasyon');const {DESTEK}=await import('./destek');await smsGonder(DESTEK,`Dinlio: ${b?.name} ${r.paket?.ad||'paket'} satın aldı.${ok?.tamam?' Otomatik kuruldu.':' Eksik: '+(ok?.eksik||[]).join(', ').slice(0,80)}`);}catch{}
  return r;}
 try{await bildir(r.business_id,(r.tur==='asim'?`✅ ${r.dakika} dk aşım ücretiniz ödendi, kilitli konuşmalar açıldı.`:`✅ ${r.dakika} ek dakika hesabınıza eklendi.`)+`${r.acildi?' Asistanınız yeniden telefonlara cevap veriyor.':''}`);}catch{}
 return r;}
