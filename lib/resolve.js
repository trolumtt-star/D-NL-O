import {vapiGizli} from './gizli';import {adminSb} from './admin';
// k = gizli webhook token (önerilen). ?b= (ham işletme id) güvenlik nedeniyle kaldırıldı.
// assistantId ile eşleştirme yalnızca VAPI_SECRET tanımlıysa (çağıran route başlığı doğruladıysa) yapılır.
// Telefon aramasında önce numaradan (vapi_phone_id) eşleştirilir: iki işletme aynı asistanı paylaşsa bile arama doğru işletmeye yazılır.
export async function resolve(req,kind,aid,pid){const k=new URL(req.url).searchParams.get('k');
 if(k){if(!/^[A-Za-z0-9_-]{8,200}$/.test(k))return null;const {data}=await adminSb.from('webhook_endpoints').select('business_id,kind').eq('token',k).maybeSingle();return data&&data.kind===kind?data.business_id:null;}
 if((aid||pid)&&(await vapiGizli()).kabul.length){if(pid&&/^[A-Za-z0-9_-]{8,80}$/.test(String(pid))){const {data:p}=await adminSb.from('businesses').select('id').eq('vapi_phone_id',pid).limit(1);if(p?.[0])return p[0].id;}
  if(!aid)return null;const {data}=await adminSb.from('businesses').select('id').eq('vapi_assistant_id',aid).limit(1);return data?.[0]?.id||null;}
 return null;}
