import {adminSb} from './admin';
export async function resolve(req,kind,aid){const u=new URL(req.url),k=u.searchParams.get('k'),b=u.searchParams.get('b');
 if(k){const {data}=await adminSb.from('webhook_endpoints').select('business_id,kind').eq('token',k).maybeSingle();return data&&data.kind===kind?data.business_id:null;}
 if(b)return b;
 if(aid){const {data}=await adminSb.from('businesses').select('id').eq('vapi_assistant_id',aid).limit(1);return data?.[0]?.id||null;}
 return null;}
