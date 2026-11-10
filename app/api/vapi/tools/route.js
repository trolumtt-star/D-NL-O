import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {resolve} from '@/lib/resolve';import {tariftenBul} from '@/lib/harita';import {bildir} from '@/lib/bildir';
const TZ='Europe/Istanbul',today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:TZ}),nowT=()=>new Date().toLocaleTimeString('sv-SE',{timeZone:TZ,hour:'2-digit',minute:'2-digit'});
const log=(type,bid,error,extra)=>adminSb.from('webhook_events').insert({type,business_id:bid||null,payload:{error,...(extra||{})}});
const pad=n=>String(n).padStart(2,'0');
const nd=d=>{const s=String(d||'').trim().toLowerCase();if(!s||s.startsWith('bugün')||s==='today')return today();
 const base=new Date(today()+'T12:00:00');if(s.startsWith('yarın')||s==='tomorrow'){base.setDate(base.getDate()+1);return base.toISOString().slice(0,10);}
 if(s.startsWith('öbür')||s.startsWith('ertesi')){base.setDate(base.getDate()+2);return base.toISOString().slice(0,10);}
 let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return m[1]+'-'+pad(m[2])+'-'+pad(m[3]);
 m=s.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/);if(m){const y=m[3]?(m[3].length===2?'20'+m[3]:m[3]):today().slice(0,4);return y+'-'+pad(m[2])+'-'+pad(m[1]);}
 const ay=['ocak','şubat','mart','nisan','mayıs','haziran','temmuz','ağustos','eylül','ekim','kasım','aralık'];m=s.match(/(\d{1,2})\s+([a-zçğıöşü]+)/);
 if(m){const i=ay.findIndex(a=>m[2].startsWith(a.slice(0,3)));if(i>=0){let y=+today().slice(0,4);const c=y+'-'+pad(i+1)+'-'+pad(m[1]);return c<today()?(y+1)+'-'+pad(i+1)+'-'+pad(m[1]):c;}}
 return today();};
const nt=t=>{const m=String(t||'').match(/(\d{1,2})\s*[:.]\s*(\d{2})/);return m?m[1].padStart(2,'0')+':'+m[2]:null;};
export async function POST(req){
 const sec=process.env.VAPI_SECRET,hs=req.headers.get('x-vapi-secret')||(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(sec&&hs!==sec){await log('tool_reddedildi',null,'Araç isteği reddedildi: VAPI_SECRET '+(hs?'geldi ama farklı':'hiç gelmedi')+'. Vapi > Tools > aracın Server ayarına aynı Secret Token yazılmalı.');return NextResponse.json({error:'unauthorized'},{status:401});}
 const body=await req.json(),m=body.message||body,call=m.call||{},aid=call.assistantId||m.assistant?.id;
 const bid=await resolve(req,'tools',aid);
 const {data:biz}=bid?await adminSb.from('businesses').select('status,plan,vertical,settings').eq('id',bid).single():{data:null};
 const results=[],calls=m.toolCallList||m.toolCalls||[];
 if(!bid)await log('tool_reddedildi',null,'Araç isteği geldi ama işletme bulunamadı. Araçtaki Server URL ?k= kodu yanlış/silinmiş ya da events adresi kullanılmış.');
 for(const tc of calls){
  const name=tc.name||tc.function?.name;let a=tc.arguments||tc.function?.arguments||{};if(typeof a==='string'){try{a=JSON.parse(a);}catch{a={};}}
  const date=(d=>d<today()?today():d)(nd(a.date)),time=nt(a.time)||nowT();let out;
  if(!biz)out={ok:false,reason:'business_not_found'};
  else if(name==='check_tables'){const {data,error}=await adminSb.rpc('free_tables',{p_business:bid,p_date:date,p_time:time});out=error?{ok:false,reason:error.message}:{ok:true,date,time,free_tables:data,message:data.length?`Müsait masalar: ${data.join(', ')}`:'Bu saatte boş masa yok.'};}
  else if(name==='book_table'){const {data,error}=await adminSb.rpc('book_table',{p_business:bid,p_date:date,p_time:time,p_name:a.name||null,p_phone:a.phone||call.customer?.number||null,p_size:parseInt(a.partySize)||null,p_table:parseInt(a.tableNumber)||null,p_call:null,p_source:'vapi'});out=error?{ok:false,reason:error.message}:data;if(data?.ok&&!data.duplicate)await bildir(bid,`🍽 Yeni rezervasyon\n${date} ${time}${a.name?' · '+a.name:''}${a.partySize?' · '+a.partySize+' kişi':''}${data.table_number?' · Masa '+data.table_number:''}`);}
  else if(name==='check_availability'||name==='book_appointment'){
   const sq=String(a.service||'').replace(/[%_,()]/g,' ').trim();let sid=null,resId=null;
   if(sq){const {data:s1}=await adminSb.from('services').select('id').eq('business_id',bid).eq('active',true).ilike('name','%'+sq+'%').limit(1);sid=s1?.[0]?.id||null;}
   if(name==='check_availability'){const {data,error}=await adminSb.rpc('free_slots',{p_business:bid,p_date:date,p_service:sid});out=error?{ok:false,reason:error.message}:{ok:true,date,free_slots:data,message:data.length?`Müsait saatler: ${data.join(', ')}`:'Bu gün müsait saat yok veya kapalıyız.'};}
   else{const rq=String(a.doctor||a.staff||'').replace(/[%_,()]/g,' ').trim();if(rq){const {data:r1}=await adminSb.from('resources').select('id').eq('business_id',bid).eq('active',true).ilike('name','%'+rq+'%').limit(1);resId=r1?.[0]?.id||null;}
    const {data,error}=await adminSb.rpc('book_appointment',{p_business:bid,p_date:date,p_time:time,p_service:sid,p_resource:resId,p_name:a.name||null,p_phone:a.phone||call.customer?.number||null,p_notes:a.notes?String(a.notes).slice(0,300):null,p_call:null,p_source:'vapi'});out=error?{ok:false,reason:error.message}:data;if(data?.ok&&!data.duplicate)await bildir(bid,`📅 Yeni randevu\n${date} ${time}${a.service?' · '+a.service:''}${a.name?'\n👤 '+a.name:''}${a.phone||call.customer?.number?'\n📞 '+(a.phone||call.customer?.number):''}`);}}
  else if(name==='get_price'&&!['restaurant','wholesale'].includes(biz.vertical)){const q=String(a.item||a.service||'').replace(/[%_,()]/g,' ').trim();let qb=adminSb.from('services').select('name,price,duration_minutes').eq('business_id',bid).eq('active',true).limit(10);if(q)qb=qb.ilike('name','%'+q+'%');const {data}=await qb;
   out={ok:true,items:(data||[]).map(x=>({hizmet:x.name,fiyat_tl:x.price,sure_dk:x.duration_minutes})),message:(data||[]).length?'Fiyatı olmayan hizmette kesin fiyat için görüşme veya muayene gerektiğini söyle, uydurma.':'Böyle bir hizmet listede yok, uydurma.'};}
  else if(name==='get_price'){if(biz.plan!=='all')out={ok:false,reason:'Bu işletmede fiyat listesi özelliği yok.'};else{
   const q=String(a.item||'').replace(/[%_,()]/g,' ').trim();let rows=[];
   if(q){const r1=await adminSb.from('menu_items').select('name,price,available').eq('business_id',bid).ilike('name','%'+q+'%').limit(8);rows=r1.data||[];
    if(!rows.length){const ws=q.split(/\s+/).filter(w=>w.length>2).slice(0,4);if(ws.length){const r2=await adminSb.from('menu_items').select('name,price,available').eq('business_id',bid).or(ws.map(w=>'name.ilike.%'+w+'%').join(',')).limit(8);rows=r2.data||[];}}}
   else{const r3=await adminSb.from('menu_items').select('name,price,available').eq('business_id',bid).eq('available',true).order('name').limit(30);rows=r3.data||[];}
   out={ok:true,items:rows.map(x=>({urun:x.name,fiyat_tl:x.price,durum:x.available?'var':'tükendi'})),message:rows.length?'Fiyatları müşteriye bu listeden söyle, tükendi olanı önerme.':'Menüde böyle bir ürün bulunamadı, uydurma fiyat söyleme.'};}}
  else if(name==='save_order'){const or=String(a.orders||'').trim().slice(0,600);
   if(!or)out={ok:false,reason:'Sipariş boş. Ürünleri ve adetleri yazıp tekrar çağır.'};
   else if(!call.id)out={ok:false,reason:'call_id yok'};
   else{const st=String(a.phone||'').replace(/\D/g,''),sp=st.length>=10&&st.length<=13?(st.length===10&&st[0]==='5'?'0'+st:st):null;
    const {data:cid,error}=await adminSb.rpc('save_order_live',{p_business:bid,p_call:call.id,p_phone:call.customer?.number||null,p_name:a.customerName?String(a.customerName).slice(0,80):null,p_orders:or,p_address:a.address?String(a.address).slice(0,300):null,p_stated:sp});
    if(!error&&cid&&(a.lat||a.kuryeNotu)){const {data:cr}=await adminSb.from('calls').select('extracted').eq('id',cid).single();const ek={...(cr?.extracted||{})};
     if(+a.lat&&+a.lng)ek.konum={lat:+a.lat,lng:+a.lng};if(a.kuryeNotu)ek.kuryeNotu=String(a.kuryeNotu).slice(0,300);await adminSb.from('calls').update({extracted:ek}).eq('id',cid);}
    if(!error&&cid)await bildir(bid,`🛵 Yeni sipariş\n${or}${a.address?'\n📍 '+a.address:''}${a.customerName?'\n👤 '+a.customerName:''}${sp||call.customer?.number?'\n📞 '+(sp||call.customer?.number):''}${+a.lat&&+a.lng?`\n🗺 https://maps.google.com/?q=${a.lat},${a.lng}`:''}`);
    out=error?{ok:false,reason:error.message}:{ok:true,kayit:cid,message:'Sipariş panele düştü. Müşteriye siparişin alındığını ve teslim süresini söyle.'};}}
  else if(name==='find_location'){const yer=Array.isArray(a.yerler)?a.yerler:String(a.yerler||a.landmarks||'').split(/,|\bve\b/).map(x=>x.trim()).filter(Boolean);
   try{out=await tariftenBul({mahalle:a.mahalle,ilce:a.ilce,yerler:yer,tarif:a.tarif},biz.settings?.konum);}catch(e){out={ok:false,reason:'Harita şu an cevap vermedi. Müşteriden tarifi kurye notu olarak al, sipariş yine kaydedilsin.'};}}
  else out={ok:false,reason:'unknown_tool'};
  if(out&&typeof out==='object'&&!Array.isArray(out))out.bugun=today();
  await log('tool_call',bid,out?.ok===false?String(out.reason||'hata'):null,{tool:name,args:a,result:out});
  results.push({toolCallId:tc.id,result:JSON.stringify(out)});}
 if(!calls.length)await log('tool_call',bid,'Araç isteği geldi ama içinde araç çağrısı yok (mesaj tipi: '+(m.type||'?')+')');
 return NextResponse.json({results});}
