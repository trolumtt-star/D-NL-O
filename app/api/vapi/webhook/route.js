import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {resolve} from '@/lib/resolve';import {extract} from '@/lib/gemini';
export const maxDuration=60;
const ph=s=>{const d=String(s||'').replace(/\D/g,'');return d.length>=10&&d.length<=13?(d.length===10&&d[0]==='5'?'0'+d:d):null;};
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});
const log=(type,bid,cid,error)=>adminSb.from('webhook_events').insert({type,business_id:bid||null,vapi_call_id:cid||null,payload:{error}});
export async function POST(req){
 if(process.env.VAPI_SECRET&&req.headers.get('x-vapi-secret')!==process.env.VAPI_SECRET){await log('reddedildi',null,null,'VAPI_SECRET uyuşmuyor. Vapi secret başlığı: '+(req.headers.get('x-vapi-secret')?'geldi ama farklı':'hiç gelmedi'));return NextResponse.json({error:'unauthorized'},{status:401});}
 const body=await req.json(),m=body.message||body,type=m.type||'unknown',call=m.call||{},aid=call.assistantId||m.assistant?.id;
 if(type!=='end-of-call-report'||!call.id)return NextResponse.json({ok:true,ignored:type});
 const bid=await resolve(req,'events',aid);
 await adminSb.from('webhook_events').insert({type,vapi_call_id:call.id,business_id:bid,payload:body});
 if(!bid){await log('reddedildi',null,call.id,'İşletme bulunamadı. Adres yanlış veya araç adresi kullanılmış, ya da assistant ID eşleşmiyor.');return NextResponse.json({ok:true,error:'business_not_found'});}
 try{
  const sec=Math.round(m.durationSeconds??((new Date(m.endedAt)-new Date(m.startedAt))/1000))||0;
  const transcript=m.transcript||m.artifact?.transcript||(m.artifact?.messages||[]).filter(x=>x.role==='user'||x.role==='bot').map(x=>x.role+': '+x.message).join('\n')||null;
  const v=m.analysis?.structuredData||{};
  // 1) kaydı hemen yaz (kota düşer, çağrı panelde görünür)
  const {data:cid,error}=await adminSb.rpc('record_call',{p_business:bid,p_call:call.id,p_phone:call.customer?.number||null,p_sec:sec,p_name:v.customerName||null,p_orders:v.orders||null,p_address:v.address||null,p_summary:m.summary||m.analysis?.summary||null,p_transcript:transcript});
  if(error){await log('reddedildi',bid,call.id,'Kayıt yazılamadı: '+error.message);return NextResponse.json({error:error.message},{status:500});}
  if(!cid)return NextResponse.json({ok:true,duplicate:true});
  // 2) Gemini ile ayıkla, sonra aynı kaydı doldur
  const g=await extract(transcript,today());
  if(g.error)await log('gemini_error',bid,call.id,g.error);
  const sd={...v,...g.data};
  const sp=ph(sd.statedPhone);
  if(sd.customerName||sd.orders||sd.address||sp)await adminSb.from('calls').update({customer_name:sd.customerName||null,orders:sd.orders||null,address:sd.address||null,stated_phone:sp}).eq('id',cid);
  const tn=parseInt(String(sd.tableNumber||'').replace(/\D/g,''));
  if(tn&&sd.reservationTime)await adminSb.rpc('book_table',{p_business:bid,p_date:sd.reservationDate||today(),p_time:String(sd.reservationTime).padStart(5,'0'),p_name:sd.customerName||null,p_phone:sp||call.customer?.number||null,p_size:parseInt(sd.partySize)||null,p_table:tn,p_call:cid,p_source:'vapi'});
  return NextResponse.json({ok:true});
 }catch(e){await log('reddedildi',bid,call.id,'Beklenmeyen hata: '+String(e.message||e).slice(0,200));return NextResponse.json({error:'internal'},{status:500});}}
