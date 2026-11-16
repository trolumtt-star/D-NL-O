// ÖDEME SONRASI OTOMATİK KURULUM: satın alma formundaki bilgilerle asistan kurulur, havuzdan numara bağlanır,
// işletmeye ne yapması gerektiği (yönlendirme kodu ya da yeni 0850 numarası) bildirilir. Eksik kalan iş Admin'e düşer.
import {adminSb} from './admin';import {asistanOlustur} from './asistanOlustur';import {numaraBagla,yonlendirmeMetni} from './numara';import {bildir} from './bildir';
export async function otoKurulum(bid){
 const {data:b}=await adminSb.from('businesses').select('id,name,vapi_assistant_id,vapi_phone_id,settings').eq('id',bid).single();const s=b.settings||{},eksik=[],mesaj=[];
 if(!b.vapi_assistant_id){if(s.kurulum?.bilgi&&Object.keys(s.kurulum.bilgi).length){try{await asistanOlustur(bid);mesaj.push('🤖 Asistanınız formdaki bilgilerinizle kuruldu.');}catch(e){eksik.push('asistan: '+e.message);}}
  else eksik.push('asistan: bilgi yok');}
 let n=null;if(!b.vapi_phone_id){try{n=await numaraBagla(bid);}catch(e){n={ok:false,hata:e.message};}
  if(n.ok&&!n.zaten){if(s.satin_al?.numara?.tercih==='kirala')mesaj.push(`📞 Yeni numaranız: ${n.numara}. Bu numarayı arayan müşterilerinize asistanınız cevap veriyor; Google, Instagram ve tabelalarınıza ekleyebilirsiniz.`);
   else mesaj.push(`📞 Asistan hattınız: ${n.numara}. Kendi numaranızı bu hatta yönlendirin: ${yonlendirmeMetni(n.numara)}`);}
  else if(!n.ok)eksik.push('numara: '+(n.hata||'havuzda boş '+(n.tercih==='0850'?'0850':'')+' numara yok'));}
 const tamam=!eksik.length;
 await adminSb.from('businesses').update({settings:{...s,...(await adminSb.from('businesses').select('settings').eq('id',bid).single()).data?.settings,...(tamam?{kurulum_onay:new Date().toISOString()}:{}),oto_kurulum:{tarih:new Date().toISOString(),eksik}}}).eq('id',bid);
 if(mesaj.length)await bildir(bid,mesaj.join('\n\n')).catch(()=>{});
 if(!tamam){await bildir(bid,'⏳ Kurulumunuzun kalan kısmı (numara bağlama) 24 saat içinde ekibimiz tarafından tamamlanacak.').catch(()=>{});
  await adminSb.from('webhook_events').insert({type:'oto_kurulum_eksik',business_id:bid,payload:{ad:b.name,eksik}});}
 return {tamam,eksik};}
