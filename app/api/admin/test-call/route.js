import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';
const err=e=>NextResponse.json({error:e.message},{status:400});
export async function POST(req){try{await requireAdmin(req);const {business_id,transcript}=await req.json();
 const {data:ep}=await adminSb.from('webhook_endpoints').select('token').eq('business_id',business_id).eq('kind','events').limit(1);
 if(!ep?.[0])throw new Error('Bu işletmede çağrı webhook adresi yok');
 const id='test-'+crypto.randomUUID();
 const r=await fetch(new URL('/api/vapi/webhook?k='+ep[0].token,req.url),{method:'POST',headers:{'content-type':'application/json','x-vapi-secret':process.env.VAPI_SECRET||''},body:JSON.stringify({message:{type:'end-of-call-report',call:{id,customer:{number:'+900000000000'}},durationSeconds:0,transcript,summary:'Test çağrısı'}})});
 const j=await r.json().catch(()=>({}));const {data:row}=await adminSb.from('calls').select('customer_name,orders,address').eq('vapi_call_id',id).maybeSingle();
 const {data:ev}=await adminSb.from('webhook_events').select('payload').eq('vapi_call_id',id).eq('type','gemini_error').limit(1);
 return NextResponse.json({webhook_durumu:r.status,webhook_cevabi:j,kaydedilen:row,gemini_hatasi:ev?.[0]?.payload?.error||null});}catch(e){return err(e);}}
export async function DELETE(req){try{await requireAdmin(req);const {data:c}=await adminSb.from('calls').select('id').like('vapi_call_id','test-%');const ids=(c||[]).map(x=>x.id);
 if(ids.length)await adminSb.from('reservations').delete().in('call_id',ids);await adminSb.from('calls').delete().like('vapi_call_id','test-%');await adminSb.from('webhook_events').delete().like('vapi_call_id','test-%');
 return NextResponse.json({silinen:ids.length});}catch(e){return err(e);}}
