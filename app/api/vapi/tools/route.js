import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {resolve} from '@/lib/resolve';
const TZ='Europe/Istanbul',today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:TZ}),nowT=()=>new Date().toLocaleTimeString('sv-SE',{timeZone:TZ,hour:'2-digit',minute:'2-digit'});
const nt=t=>{const m=String(t||'').match(/(\d{1,2})\s*[:.]\s*(\d{2})/);return m?m[1].padStart(2,'0')+':'+m[2]:null;};
export async function POST(req){
 if(process.env.VAPI_SECRET&&req.headers.get('x-vapi-secret')!==process.env.VAPI_SECRET)return NextResponse.json({error:'unauthorized'},{status:401});
 const body=await req.json(),m=body.message||body,call=m.call||{},aid=call.assistantId||m.assistant?.id;
 const bid=await resolve(req,'tools',aid);
 const {data:biz}=bid?await adminSb.from('businesses').select('status,plan,vertical').eq('id',bid).single():{data:null};
 const results=[];
 for(const tc of m.toolCallList||m.toolCalls||[]){
  const name=tc.name||tc.function?.name;let a=tc.arguments||tc.function?.arguments||{};if(typeof a==='string'){try{a=JSON.parse(a);}catch{a={};}}
  const date=a.date||today(),time=nt(a.time)||nowT();let out;
  if(!biz)out={ok:false,reason:'business_not_found'};
  else if(name==='check_tables'){const {data,error}=await adminSb.rpc('free_tables',{p_business:bid,p_date:date,p_time:time});out=error?{ok:false,reason:error.message}:{ok:true,date,time,free_tables:data,message:data.length?`Müsait masalar: ${data.join(', ')}`:'Bu saatte boş masa yok.'};}
  else if(name==='book_table'){const {data,error}=await adminSb.rpc('book_table',{p_business:bid,p_date:date,p_time:time,p_name:a.name||null,p_phone:a.phone||call.customer?.number||null,p_size:parseInt(a.partySize)||null,p_table:parseInt(a.tableNumber)||null,p_call:null,p_source:'vapi'});out=error?{ok:false,reason:error.message}:data;}
  else if(name==='check_availability'||name==='book_appointment'){
   const sq=String(a.service||'').replace(/[%_,()]/g,' ').trim();let sid=null,resId=null;
   if(sq){const {data:s1}=await adminSb.from('services').select('id').eq('business_id',bid).eq('active',true).ilike('name','%'+sq+'%').limit(1);sid=s1?.[0]?.id||null;}
   if(name==='check_availability'){const {data,error}=await adminSb.rpc('free_slots',{p_business:bid,p_date:date,p_service:sid});out=error?{ok:false,reason:error.message}:{ok:true,date,free_slots:data,message:data.length?`Müsait saatler: ${data.join(', ')}`:'Bu gün müsait saat yok veya kapalıyız.'};}
   else{const rq=String(a.doctor||a.staff||'').replace(/[%_,()]/g,' ').trim();if(rq){const {data:r1}=await adminSb.from('resources').select('id').eq('business_id',bid).eq('active',true).ilike('name','%'+rq+'%').limit(1);resId=r1?.[0]?.id||null;}
    const {data,error}=await adminSb.rpc('book_appointment',{p_business:bid,p_date:date,p_time:time,p_service:sid,p_resource:resId,p_name:a.name||null,p_phone:a.phone||call.customer?.number||null,p_notes:a.notes?String(a.notes).slice(0,300):null,p_call:null,p_source:'vapi'});out=error?{ok:false,reason:error.message}:data;}}
  else if(name==='get_price'&&!['restaurant','wholesale'].includes(biz.vertical)){const q=String(a.item||a.service||'').replace(/[%_,()]/g,' ').trim();let qb=adminSb.from('services').select('name,price,duration_minutes').eq('business_id',bid).eq('active',true).limit(10);if(q)qb=qb.ilike('name','%'+q+'%');const {data}=await qb;
   out={ok:true,items:(data||[]).map(x=>({hizmet:x.name,fiyat_tl:x.price,sure_dk:x.duration_minutes})),message:(data||[]).length?'Fiyatı olmayan hizmette kesin fiyat için görüşme veya muayene gerektiğini söyle, uydurma.':'Böyle bir hizmet listede yok, uydurma.'};}
  else if(name==='get_price'){if(biz.plan!=='all')out={ok:false,reason:'Bu işletmede fiyat listesi özelliği yok.'};else{
   const q=String(a.item||'').replace(/[%_,()]/g,' ').trim();let rows=[];
   if(q){const r1=await adminSb.from('menu_items').select('name,price,available').eq('business_id',bid).ilike('name','%'+q+'%').limit(8);rows=r1.data||[];
    if(!rows.length){const ws=q.split(/\s+/).filter(w=>w.length>2).slice(0,4);if(ws.length){const r2=await adminSb.from('menu_items').select('name,price,available').eq('business_id',bid).or(ws.map(w=>'name.ilike.%'+w+'%').join(',')).limit(8);rows=r2.data||[];}}}
   else{const r3=await adminSb.from('menu_items').select('name,price,available').eq('business_id',bid).eq('available',true).order('name').limit(30);rows=r3.data||[];}
   out={ok:true,items:rows.map(x=>({urun:x.name,fiyat_tl:x.price,durum:x.available?'var':'tükendi'})),message:rows.length?'Fiyatları müşteriye bu listeden söyle, tükendi olanı önerme.':'Menüde böyle bir ürün bulunamadı, uydurma fiyat söyleme.'};}}
  else out={ok:false,reason:'unknown_tool'};
  results.push({toolCallId:tc.id,result:JSON.stringify(out)});}
 return NextResponse.json({results});}
