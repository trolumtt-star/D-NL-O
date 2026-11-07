import {adminSb} from './admin';
// k = gizli webhook token (önerilen). ?b= (ham işletme id) güvenlik nedeniyle kaldırıldı.
// assistantId ile eşleştirme yalnızca VAPI_SECRET tanımlıysa (çağıran route başlığı doğruladıysa) yapılır.
export async function resolve(req,kind,aid){const k=new URL(req.url).searchParams.get('k');
 if(k){if(!/^[A-Za-z0-9_-]{8,200}$/.test(k))return null;const {data}=await adminSb.from('webhook_endpoints').select('business_id,kind').eq('token',k).maybeSingle();return data&&data.kind===kind?data.business_id:null;}
 if(aid&&process.env.VAPI_SECRET){const {data}=await adminSb.from('businesses').select('id').eq('vapi_assistant_id',aid).limit(1);return data?.[0]?.id||null;}
 return null;}
