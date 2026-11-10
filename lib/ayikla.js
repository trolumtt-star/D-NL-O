// Konuşma metninden müşteri bilgisini çıkarıp çağrı kaydına yazar.
// Gemini o an cevap veremezse çağrı 'okunamadi' işaretlenir; sonraki çağrıda, günlük görevde
// veya paneldeki "Tekrar oku" butonuyla yeniden denenir. Böylece hiçbir sipariş kaybolmaz.
import {adminSb} from './admin';import {extract,extractGeneric} from './gemini';import {kuralla} from './kural';import {bildir} from './bildir';
const ph=s=>{const d=String(s||'').replace(/\D/g,'');return d.length>=10&&d.length<=13?(d.length===10&&d[0]==='5'?'0'+d:d):null;};
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});
const log=(type,bid,cid,error)=>adminSb.from('webhook_events').insert({type,business_id:bid||null,vapi_call_id:cid||null,payload:{error}});
export async function ayikla({bid,cid,transcript,vertical,v={},callerPhone=null,vapiCallId=null,gun=today()}){
 if(!transcript)return {ok:true,bos:true};
 if(vertical&&vertical!=='restaurant'){
  const {data:vc}=await adminSb.from('verticals').select('config').eq('id',vertical).single();
  const gx=await extractGeneric(transcript,gun,vc?.config?.fields||[]);
  if(gx.error){await log('gemini_error',bid,vapiCallId,gx.error);const k=kuralla(transcript);const u={status:'okunamadi'};const vv={...k,...Object.fromEntries(Object.entries(v||{}).filter(([,x])=>x))};if(vv.customerName)u.customer_name=vv.customerName;if(vv.statedPhone)u.stated_phone=ph(vv.statedPhone);await adminSb.from('calls').update(u).eq('id',cid).is('customer_name',null);return {ok:false,error:gx.error};}
  const d=gx.data||{},ex=Object.fromEntries(Object.entries(d).filter(([k,x])=>x!=null&&x!==''&&k!=='customerName'&&k!=='statedPhone'));
  await adminSb.from('calls').update({status:null,customer_name:d.customerName||null,orders:d.orders||null,address:d.address||d.deliveryAddress||null,stated_phone:ph(d.statedPhone),extracted:Object.keys(ex).length?ex:null}).eq('id',cid);
  if(d.customerName||Object.keys(ex).length)await bildir(bid,`☎ Yeni çağrı${d.customerName?' · '+d.customerName:''}\n${Object.entries(ex).slice(0,5).map(([k,x])=>'• '+x).join('\n')}${callerPhone?'\n📞 '+callerPhone:''}`);
  return {ok:true};}
 const g=await extract(transcript,gun);
 if(g.error){await log('gemini_error',bid,vapiCallId,g.error);
  // 2. yedek: Vapi'nin kendi çıkardığı yapılandırılmış veri; 3. yedek: kurallarla tahmin
  const vv=Object.fromEntries(Object.entries(v||{}).filter(([,x])=>x!=null&&x!==''));
  if(vv.orders||vv.customerName){await adminSb.from('calls').update({status:null,customer_name:vv.customerName||null,orders:vv.orders||null,address:vv.address||null,stated_phone:ph(vv.statedPhone)}).eq('id',cid);return {ok:true,kaynak:'vapi'};}
  const {data:menu}=await adminSb.from('menu_items').select('name').eq('business_id',bid).limit(300);const k=kuralla(transcript,menu||[]);
  const u={status:'okunamadi'};if(k.orders)u.orders=k.orders;if(k.address)u.address=k.address;if(k.customerName)u.customer_name=k.customerName;if(k.statedPhone)u.stated_phone=ph(k.statedPhone);
  await adminSb.from('calls').update(u).eq('id',cid);return {ok:false,error:g.error,tahmin:!!k.orders};}
 const sd={...v,...g.data},sp=ph(sd.statedPhone);
 await adminSb.from('calls').update({status:null,customer_name:sd.customerName||null,orders:sd.orders||null,address:sd.address||null,stated_phone:sp}).eq('id',cid);
 if(sd.orders)await bildir(bid,`🛵 Yeni sipariş\n${sd.orders}${sd.address?'\n📍 '+sd.address:''}${sd.customerName?'\n👤 '+sd.customerName:''}${sp||callerPhone?'\n📞 '+(sp||callerPhone):''}`);
 const tn=parseInt(String(sd.tableNumber||'').replace(/\D/g,''));
 if(tn&&sd.reservationTime)await adminSb.rpc('book_table',{p_business:bid,p_date:sd.reservationDate||gun,p_time:String(sd.reservationTime).padStart(5,'0'),p_name:sd.customerName||null,p_phone:sp||callerPhone,p_size:parseInt(sd.partySize)||null,p_table:tn,p_call:cid,p_source:'vapi'});
 return {ok:true};}
// Okunamayan çağrıları yeniden dener (en fazla 'limit' tane, son 3 gün).
export async function bekleyenleriOku({bid=null,limit=3,butce=25000}={}){
 const bas=Date.now();let q=adminSb.from('calls').select('id,business_id,transcript,caller_phone,vapi_call_id,created_at,businesses(vertical)').eq('status','okunamadi').gte('created_at',new Date(Date.now()-3*864e5).toISOString()).order('created_at',{ascending:true}).limit(limit);
 if(bid)q=q.eq('business_id',bid);const {data}=await q;let ok=0,hata=0;
 for(const c of data||[]){if(Date.now()-bas>butce)break;const gun=new Date(c.created_at).toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});
  const r=await ayikla({bid:c.business_id,cid:c.id,transcript:c.transcript,vertical:c.businesses?.vertical,callerPhone:c.caller_phone,vapiCallId:c.vapi_call_id,gun});r.ok?ok++:hata++;}
 return {ok,hata,bakilan:(data||[]).length};}
