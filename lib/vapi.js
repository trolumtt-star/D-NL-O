import {adminSb} from './admin';import {SITE} from './site';
// Kota bitince / admin durdurunca, Vapi'deki telefon numarasının assistantId'sini
// temizleyip server URL'ini /api/vapi/assist'e çeviriyoruz. Vapi, assistantId boş bir
// numaraya çağrı geldiğinde o URL'e "assistant-request" eventi gönderiyor; biz de orada
// işletme durduysa çağrıyı işletmenin GERÇEK telefon numarasına yönlendiriyoruz (AI hiç
// devreye girmiyor, müşteri kaybolmuyor). Kota resetlenince assistantId geri takılıyor.
// Gerekli env değişkeni (Vercel'e eklenmeli, asla koda yazılmaz):
//  VAPI_API_KEY -> Vapi dashboard > Settings > API Keys > Private Key
const patch=async(phoneId,body)=>{
 const key=process.env.VAPI_API_KEY;
 if(!key||!phoneId)return {ok:false,skipped:true,reason:!key?'VAPI_API_KEY yok':'işletmede vapi_phone_id yok'};
 try{
  const r=await fetch(`https://api.vapi.ai/phone-number/${phoneId}`,{method:'PATCH',signal:AbortSignal.timeout(10000),headers:{'content-type':'application/json',authorization:'Bearer '+key},body:JSON.stringify(body)});
  const t=await r.text();
  if(!r.ok)return {ok:false,error:`${r.status} ${t.slice(0,200)}`};
  return {ok:true};
 }catch(e){return {ok:false,error:String(e.message||e).slice(0,160)};}
};
// Kota bittiğinde / admin "Durdur" dediğinde çağrılır: assistantId'i temizler, assistant-request
// geldiğinde cevap verecek olan /api/vapi/assist adresini numaraya tanıtır.
// İSTEK MODU: numaraya sabit asistan takılmaz; her aramada Vapi /api/vapi/assist'e sorar. Orada işletme durmuş mu,
// paketin eş zamanlı arama sınırı dolmuş mu, arayan sadık müşteri mi diye bakılıp cevap verilir.
// Bizim sunucu cevap veremezse Vapi aramayı fallbackDestination'a (işletmenin kendi telefonu) aktarır, arama kaybolmaz.
export const e164=s=>{let d=String(s||'').replace(/\D/g,'');if(!d)return null;
 if(d.length===10&&d[0]==='5')d='90'+d;
 else if(d.length===11&&d[0]==='0')d='90'+d.slice(1);
 else if(!d.startsWith('90')&&d.length>=10)d='90'+d.slice(-10);
 return '+'+d;};
const istekModu=(biz,baseUrl)=>{const num=e164(biz.settings?.kota_yonlendirme||biz.phone_number),sec=process.env.VAPI_SECRET;
 return {assistantId:null,server:{url:`${baseUrl||SITE}/api/vapi/assist`,...(sec?{headers:{'x-vapi-secret':sec}}:{})},...(num?{fallbackDestination:{type:'number',number:num}}:{})};};
export const istekModunaAl=(biz,baseUrl)=>patch(biz.vapi_phone_id,istekModu(biz,baseUrl));
// Durdurma ve açma artık aynı numara ayarını kullanır; farkı assist ucu businesses.status'a bakarak yapar.
export const pauseBusiness=istekModunaAl;
export const resumeBusiness=istekModunaAl;

// ---- Tam durdurma / açma (telefon + web çağrısı) ----
// Telefon numarası varsa: çağrı asistana hiç gitmez, işletmenin numarasına yönlendirilir (yukarıdaki assist akışı).
// Web çağrısında yönlendirme yapılamaz: asistanın kendisi kısa bir bilgi cümlesi söyleyip 10 sn içinde kapatacak şekilde ayarlanır.
// Asistanın eski açılış cümlesi ve süre ayarı settings.vapi_yedek'te saklanır, açılınca geri yüklenir.
const va=async(path,o={})=>{const key=process.env.VAPI_API_KEY;if(!key)return {ok:false,skipped:true};
 try{const r=await fetch('https://api.vapi.ai'+path,{...o,signal:AbortSignal.timeout(10000),headers:{'content-type':'application/json',authorization:'Bearer '+key}});const t=await r.text();let d=null;try{d=JSON.parse(t);}catch{}return {ok:r.ok,d,error:r.ok?null:r.status+' '+t.slice(0,160)};}catch(e){return {ok:false,error:String(e.message||e).slice(0,160)};}};
export async function durdur(id,baseUrl){
 const {data:b}=await adminSb.from('businesses').select('id,name,phone_number,vapi_phone_id,vapi_assistant_id,settings').eq('id',id).single();if(!b)return {ok:false};
 const tel=b.vapi_phone_id?await pauseBusiness(b,baseUrl):{ok:true,skipped:true};let as={ok:true,skipped:true};
 if(b.vapi_assistant_id&&!b.settings?.vapi_yedek){const g=await va('/assistant/'+b.vapi_assistant_id);
  if(g.ok){const yedek={firstMessage:g.d.firstMessage??null,maxDurationSeconds:g.d.maxDurationSeconds??null};
   as=await va('/assistant/'+b.vapi_assistant_id,{method:'PATCH',body:JSON.stringify({firstMessage:`Merhaba, ${b.name||'işletme'} şu an bu hattan sipariş alamıyor. Lütfen işletmeyi doğrudan arayın, iyi günler.`,maxDurationSeconds:10})});
   if(as.ok)await adminSb.from('businesses').update({settings:{...(b.settings||{}),vapi_yedek:yedek}}).eq('id',b.id);}else as=g;}
 const ok=(tel.ok||tel.skipped)&&(as.ok||as.skipped);if(ok)await adminSb.from('businesses').update({vapi_paused:true}).eq('id',b.id);
 return {ok,tel,asistan:as};}
export async function ac(id){
 const {data:b}=await adminSb.from('businesses').select('id,phone_number,vapi_phone_id,vapi_assistant_id,settings').eq('id',id).single();if(!b)return {ok:false};
 const tel=b.vapi_phone_id?await resumeBusiness(b):{ok:true,skipped:true};let as={ok:true,skipped:true};
 const y=b.settings?.vapi_yedek;
 if(y&&b.vapi_assistant_id){const body={maxDurationSeconds:y.maxDurationSeconds||900};if(y.firstMessage)body.firstMessage=y.firstMessage;
  as=await va('/assistant/'+b.vapi_assistant_id,{method:'PATCH',body:JSON.stringify(body)});
  if(as.ok){const s={...(b.settings||{})};delete s.vapi_yedek;await adminSb.from('businesses').update({settings:s}).eq('id',b.id);}}
 const ok=(tel.ok||tel.skipped)&&(as.ok||as.skipped);if(ok)await adminSb.from('businesses').update({vapi_paused:false}).eq('id',b.id);
 return {ok,tel,asistan:as};}

// GİDEN ARAMA (randevu hatırlatma vb.): işletmenin Vapi numarasından müşteriyi arar. Türk numarası (Netgsm SIP) bağlı olmalı.
export async function gidenArama({phoneNumberId,assistantId,numara,firstMessage,variableValues={}}){
 if(!phoneNumberId||!assistantId)return {ok:false,neden:'İşletmenin Vapi numarası veya asistanı yok'};
 const n=e164(numara);if(!n)return {ok:false,neden:'Geçersiz numara'};
 const r=await va('/call',{method:'POST',body:JSON.stringify({phoneNumberId,assistantId,customer:{number:n},assistantOverrides:{firstMessage,variableValues}})});
 return r.ok?{ok:true,id:r.d?.id}:{ok:false,neden:r.error};}
export const vapiIstek=(p,o)=>va(p,o);
