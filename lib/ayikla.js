// Konuşma metninden müşteri bilgisini çıkarıp çağrı kaydına yazar.
// Gemini o an cevap veremezse çağrı 'okunamadi' işaretlenir; sonraki çağrıda, günlük görevde
// veya paneldeki "Tekrar oku" butonuyla yeniden denenir. Böylece hiçbir sipariş kaybolmaz.
import {adminSb} from './admin';import {extract,extractGeneric} from './gemini';
const ph=s=>{const d=String(s||'').replace(/\D/g,'');return d.length>=10&&d.length<=13?(d.length===10&&d[0]==='5'?'0'+d:d):null;};
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});
const log=(type,bid,cid,error)=>adminSb.from('webhook_events').insert({type,business_id:bid||null,vapi_call_id:cid||null,payload:{error}});
export async function ayikla({bid,cid,transcript,vertical,v={},callerPhone=null,vapiCallId=null,gun=today()}){
 if(!transcript)return {ok:true,bos:true};
 if(vertical&&vertical!=='restaurant'){
  const {data:vc}=await adminSb.from('verticals').select('config').eq('id',vertical).single();
  const gx=await extractGeneric(transcript,gun,vc?.config?.fields||[]);
  if(gx.error){await log('gemini_error',bid,vapiCallId,gx.error);await adminSb.from('calls').update({status:'okunamadi'}).eq('id',cid);return {ok:false,error:gx.error};}
  const d=gx.data||{},ex=Object.fromEntries(Object.entries(d).filter(([k,x])=>x!=null&&x!==''&&k!=='customerName'&&k!=='statedPhone'));
  await adminSb.from('calls').update({status:null,customer_name:d.customerName||null,orders:d.orders||null,address:d.address||d.deliveryAddress||null,stated_phone:ph(d.statedPhone),extracted:Object.keys(ex).length?ex:null}).eq('id',cid);
  return {ok:true};}
 const g=await extract(transcript,gun);
 if(g.error){await log('gemini_error',bid,vapiCallId,g.error);await adminSb.from('calls').update({status:'okunamadi'}).eq('id',cid);return {ok:false,error:g.error};}
 const sd={...v,...g.data},sp=ph(sd.statedPhone);
 await adminSb.from('calls').update({status:null,customer_name:sd.customerName||null,orders:sd.orders||null,address:sd.address||null,stated_phone:sp}).eq('id',cid);
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
