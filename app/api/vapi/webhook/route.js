import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {resolve} from '@/lib/resolve';import {extract} from '@/lib/gemini';
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});
export async function POST(req){
 if(process.env.VAPI_SECRET&&req.headers.get('x-vapi-secret')!==process.env.VAPI_SECRET)return NextResponse.json({error:'unauthorized'},{status:401});
 const body=await req.json(),m=body.message||body,type=m.type||'unknown',call=m.call||{},aid=call.assistantId||m.assistant?.id;
 if(type!=='end-of-call-report'||!call.id)return NextResponse.json({ok:true,ignored:type});
 const bid=await resolve(req,'events',aid);
 await adminSb.from('webhook_events').insert({type,vapi_call_id:call.id,business_id:bid,payload:body});
 if(!bid)return NextResponse.json({ok:true,error:'business_not_found'});
 const sec=Math.round(m.durationSeconds??((new Date(m.endedAt)-new Date(m.startedAt))/1000))||0;
 const transcript=m.transcript||m.artifact?.transcript||(m.artifact?.messages||[]).filter(x=>x.role==='user'||x.role==='bot').map(x=>x.role+': '+x.message).join('\n')||null;
 const g=await extract(transcript,today());
 if(g.error)await adminSb.from('webhook_events').insert({type:'gemini_error',vapi_call_id:call.id,business_id:bid,payload:{error:g.error}});
 const sd={...(m.analysis?.structuredData||{}),...g.data};
 const {data:cid,error}=await adminSb.rpc('record_call',{p_business:bid,p_call:call.id,p_phone:call.customer?.number||null,p_sec:sec,p_name:sd.customerName||null,p_orders:sd.orders||null,p_address:sd.address||null,p_summary:m.summary||m.analysis?.summary||null,p_transcript:transcript});
 if(error)return NextResponse.json({error:error.message},{status:500});
 const tn=parseInt(String(sd.tableNumber||'').replace(/\D/g,''));
 if(cid&&tn&&sd.reservationTime)await adminSb.rpc('book_table',{p_business:bid,p_date:sd.reservationDate||today(),p_time:String(sd.reservationTime).padStart(5,'0'),p_name:sd.customerName||null,p_phone:call.customer?.number||null,p_size:parseInt(sd.partySize)||null,p_table:tn,p_call:cid,p_source:'vapi'});
 return NextResponse.json({ok:true});}
