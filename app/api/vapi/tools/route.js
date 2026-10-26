import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {resolve} from '@/lib/resolve';
const TZ='Europe/Istanbul',today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:TZ}),nowT=()=>new Date().toLocaleTimeString('sv-SE',{timeZone:TZ,hour:'2-digit',minute:'2-digit'});
const nt=t=>{const m=String(t||'').match(/(\d{1,2})\s*[:.]\s*(\d{2})/);return m?m[1].padStart(2,'0')+':'+m[2]:null;};
export async function POST(req){
 if(process.env.VAPI_SECRET&&req.headers.get('x-vapi-secret')!==process.env.VAPI_SECRET)return NextResponse.json({error:'unauthorized'},{status:401});
 const body=await req.json(),m=body.message||body,call=m.call||{},aid=call.assistantId||m.assistant?.id;
 const bid=await resolve(req,'tools',aid);
 const {data:biz}=bid?await adminSb.from('businesses').select('status').eq('id',bid).single():{data:null};
 const results=[];
 for(const tc of m.toolCallList||m.toolCalls||[]){
  const name=tc.name||tc.function?.name;let a=tc.arguments||tc.function?.arguments||{};if(typeof a==='string'){try{a=JSON.parse(a);}catch{a={};}}
  const date=a.date||today(),time=nt(a.time)||nowT();let out;
  if(!biz)out={ok:false,reason:'business_not_found'};
  else if(name==='check_tables'){const {data,error}=await adminSb.rpc('free_tables',{p_business:bid,p_date:date,p_time:time});out=error?{ok:false,reason:error.message}:{ok:true,date,time,free_tables:data,message:data.length?`Müsait masalar: ${data.join(', ')}`:'Bu saatte boş masa yok.'};}
  else if(name==='book_table'){const {data,error}=await adminSb.rpc('book_table',{p_business:bid,p_date:date,p_time:time,p_name:a.name||null,p_phone:a.phone||call.customer?.number||null,p_size:parseInt(a.partySize)||null,p_table:parseInt(a.tableNumber)||null,p_call:null,p_source:'vapi'});out=error?{ok:false,reason:error.message}:data;}
  else out={ok:false,reason:'unknown_tool'};
  results.push({toolCallId:tc.id,result:JSON.stringify(out)});}
 return NextResponse.json({results});}
