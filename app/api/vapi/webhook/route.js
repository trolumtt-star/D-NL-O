import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {resolve} from '@/lib/resolve';import {extract} from '@/lib/gemini';
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});
export async function POST(req){
 if(process.env.VAPI_SECRET&&req.headers.get('x-vapi-secret')!==process.env.VAPI_SECRET)return NextResponse.json({error:'unauthorized'},{status:401});
 const body=await req.json(),m=body.message||body,type=m.type||'unknown',call=m.call||{},aid=call.assistantId||m.assistant?.id;
 const bid=await resolve(req,'events',aid);
 await adminSb.from('webhook_events').insert({type,vapi_call_id:call.id||null,business_id:bid,payload:body});
 if(type!=='end-of-call-report'||!bid||!call.id)return NextResponse.json({ok:true});
 const sec=Math.round(m.durationSeconds??((new Date(m.endedAt)-new Date(m.startedAt))/1000))||0;
 const transcript=m.transcript||m.artifact?.transcript||null;
 const sd={...(m.analysis?.structuredData||{}),...await extract(transcript,today())};
 const {data:cid,error}=await adminSb.rpc('record_call',{p_business:bid,p_call:call.id,p_phone:call.customer?.number||null,p_sec:sec,p_name:sd.customerName||null,p_orders:sd.orders||null,p_address:sd.address||null,p_summary:m.summary||m.analysis?.summary||null,p_transcript:transcript});
 if(error)return NextResponse.json({error:error.message},{status:500});
 const tn=parseInt(String(sd.tableNumber||'').replace(/\D/g,''));
 if(cid&&tn&&sd.reservationTime)await adminSb.rpc('book_table',{p_business:bid,p_date:sd.reservationDate||today(),p_time:String(sd.reservationTime).padStart(5,'0'),p_name:sd.customerName||null,p_phone:call.customer?.number||null,p_size:parseInt(sd.partySize)||null,p_table:tn,p_call:cid,p_source:'vapi'});
 return NextResponse.json({ok:true});}
