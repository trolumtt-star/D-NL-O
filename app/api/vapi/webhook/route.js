import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {resolve} from '@/lib/resolve';import {ayikla,bekleyenleriOku} from '@/lib/ayikla';import {durdur} from '@/lib/vapi';import {paketOf} from '@/lib/paket';
export const maxDuration=60;
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
  // Vapi'nin end-of-call-report olayında transcript iki yerde gelir, sırayla kontrol ediyoruz:
  const t1=body?.message?.transcript||null;           // body.message.transcript
  const t2=body?.message?.artifact?.transcript||null; // body.message.artifact.transcript
  const msgJoin=(arr)=>(arr||[]).filter(x=>x?.role==='user'||x?.role==='bot'||x?.role==='assistant').map(x=>x.role+': '+(x.message||x.content||'')).join('\n').trim()||null;
  const transcript=t1||t2||msgJoin(m.artifact?.messages)||msgJoin(m.artifact?.messagesOpenAIFormatted)||null;
  if(!t1&&!t2&&sec>8)await log('transcript_missing',bid,call.id,`body.message.transcript ve body.message.artifact.transcript ikisi de boş geldi. Gelen alanlar: ${Object.keys(m).join(', ')}${m.artifact?' | artifact alanları: '+Object.keys(m.artifact).join(', '):''}`);
  const v=m.analysis?.structuredData||{};
  // 1) kaydı hemen yaz (kota düşer, çağrı panelde görünür)
  const {data:cid,error}=await adminSb.rpc('record_call',{p_business:bid,p_call:call.id,p_phone:call.customer?.number||null,p_sec:sec,p_name:v.customerName||null,p_orders:v.orders||null,p_address:v.address||null,p_summary:m.summary||m.analysis?.summary||null,p_transcript:transcript});
  if(error){await log('reddedildi',bid,call.id,'Kayıt yazılamadı: '+error.message);return NextResponse.json({error:error.message},{status:500});}
  if(!cid)return NextResponse.json({ok:true,duplicate:true});
  const rec=m.recordingUrl||m.artifact?.recordingUrl||m.artifact?.recording?.mono?.combinedUrl||null;if(rec){const {data:bb}=await adminSb.from('businesses').select('quota_minutes_total,settings').eq('id',bid).maybeSingle();if(paketOf(bb).kayit)await adminSb.from('calls').update({audio_url:String(rec).slice(0,600)}).eq('id',cid);}
  // 2) Kota bu çağrıyla bittiyse, Vapi'deki numarayı gerçekten kapat (kota bitti asistanına çevir)
  const {data:bz}=await adminSb.from('businesses').select('vertical,status,vapi_paused,vapi_phone_id,vapi_assistant_id').eq('id',bid).single();
  if(bz?.status==='suspended'&&!bz.vapi_paused){
   const pr=await durdur(bid,new URL(req.url).origin);
   if(!pr.ok)await log('vapi_pause_hata',bid,call.id,'Kota bitti ama asistan durdurulamadı: '+JSON.stringify({tel:pr.tel?.error,asistan:pr.asistan?.error}));
  }
  // 3) Gemini ile ayıkla, sonra aynı kaydı doldur (başarısız olursa 'okunamadi' işaretlenir ve sonra tekrar denenir)
  // Asistan görüşme sırasında save_order aracıyla siparişi zaten yazdıysa Gemini'ye hiç gerek yok
  const {data:mevcut}=await adminSb.from('calls').select('orders,customer_name,extracted').eq('id',cid).single();
  if(mevcut?.orders&&(!bz?.vertical||bz.vertical==='restaurant'||bz.vertical==='wholesale'))return NextResponse.json({ok:true,canli:true});
  // Asistan save_request aracıyla bilgileri zaten yazdıysa (ad + en az 2 alan) Gemini'ye gerek yok
  if(mevcut?.customer_name&&mevcut?.extracted&&Object.keys(mevcut.extracted).length>=2)return NextResponse.json({ok:true,canli:true});
  const t0=Date.now();
  const r=await ayikla({bid,cid,transcript,vertical:bz?.vertical,v,callerPhone:call.customer?.number||null,vapiCallId:call.id,gun:today()});
  // 4) Gemini şu an çalışıyorsa, bu işletmenin daha önce okunamamış çağrılarından birini de toparla
  if(r.ok&&!r.bos&&Date.now()-t0<12000)await bekleyenleriOku({bid,limit:1,butce:20000});
  return NextResponse.json({ok:true,okundu:r.ok});
 }catch(e){await log('reddedildi',bid,call.id,'Beklenmeyen hata: '+String(e.message||e).slice(0,200));return NextResponse.json({error:'internal'},{status:500});}}
