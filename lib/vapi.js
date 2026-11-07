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
export const pauseBusiness=async(biz,baseUrl)=>patch(biz.vapi_phone_id,{assistantId:null,server:{url:`${baseUrl}/api/vapi/assist`}});
// Kota resetlenince / admin "Aç" dediğinde çağrılır: numarayı işletmenin kendi asistanına geri döndürür.
export const resumeBusiness=async(biz)=>patch(biz.vapi_phone_id,{assistantId:biz.vapi_assistant_id||null});
