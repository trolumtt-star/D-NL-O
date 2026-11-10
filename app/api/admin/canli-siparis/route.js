import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';
export const dynamic='force-dynamic';export const maxDuration=30;
// Vapi'de save_order aracını oluşturur ve asistana bağlar: asistan siparişi görüşme sırasında
// kendisi yapılandırıp panele yazar (Gemini'ye gerek kalmaz, sipariş anında düşer).
export const KURAL='\n\n# CANLI SİPARİŞ KAYDI\n- Sipariş netleşip müşteriye tekrar edip onay aldığın anda save_order aracını çağır: orders = ürünler ve adetler (ör. "2 adana dürüm, 1 ayran"), address = tam teslimat adresi, customerName = müşterinin adı, phone = müşterinin söylediği numara (söylemediyse boş bırak).\n- Müşteri sonradan ekleme veya değişiklik yaparsa save_order\'ı siparişin güncel tam haliyle yeniden çağır.\n- Araç başarılı dönünce müşteriye siparişin alındığını söyle.';
const ARAC=(url,sec)=>({type:'function',async:false,function:{name:'save_order',description:'Müşterinin onayladığı siparişi işletme paneline anında kaydeder.',parameters:{type:'object',properties:{
 customerName:{type:'string',description:'Müşterinin adı'},orders:{type:'string',description:'Ürünler ve adetleri, ör. 2 adana dürüm, 1 ayran'},
 address:{type:'string',description:'Tam teslimat adresi (gel-al ise "gel-al")'},phone:{type:'string',description:'Müşterinin söylediği telefon numarası'}},required:['orders']}},
 messages:[{type:'request-start',content:'Hemen kaydediyorum.'}],server:sec?{url,headers:{'x-vapi-secret':sec}}:{url}});
export async function POST(req){try{await requireAdmin(req);const {business_id}=await req.json();
 const key=process.env.VAPI_API_KEY,sec=process.env.VAPI_SECRET;if(!key)throw new Error('Vercel\'de VAPI_API_KEY tanımlı değil.');
 const {data:b}=await adminSb.from('businesses').select('id,vapi_assistant_id,settings').eq('id',business_id).single();
 if(!b?.vapi_assistant_id)throw new Error('Bu işletmede Vapi asistan kimliği yok.');
 let {data:ep}=await adminSb.from('webhook_endpoints').select('token').eq('business_id',b.id).eq('kind','tools').limit(1).maybeSingle();
 if(!ep){const r=await adminSb.from('webhook_endpoints').insert({business_id:b.id,kind:'tools',label:'canlı sipariş'}).select('token').single();if(r.error)throw r.error;ep=r.data;}
 const url=new URL(req.url).origin+'/api/vapi/tools?k='+ep.token,H={'content-type':'application/json',authorization:'Bearer '+key},V='https://api.vapi.ai';
 const j=async(path,o={})=>{const r=await fetch(V+path,{...o,headers:H,signal:AbortSignal.timeout(10000)});const t=await r.text();let d=null;try{d=JSON.parse(t);}catch{}return {ok:r.ok,status:r.status,d,t};};
 let toolId=b.settings?.save_order_tool_id||null;
 if(toolId){const g=await j('/tool/'+toolId);if(g.ok)await j('/tool/'+toolId,{method:'PATCH',body:JSON.stringify({server:ARAC(url,sec).server,function:ARAC(url,sec).function})});else toolId=null;}
 if(!toolId){let c=await j('/tool',{method:'POST',body:JSON.stringify(ARAC(url,sec))});
  if(!c.ok&&sec){const a=ARAC(url,null);a.server={url,secret:sec};c=await j('/tool',{method:'POST',body:JSON.stringify(a)});}
  if(!c.ok)throw new Error('Vapi aracı oluşturamadı: '+c.status+' '+c.t.slice(0,250));toolId=c.d.id;}
 const as=await j('/assistant/'+b.vapi_assistant_id);if(!as.ok)throw new Error('Asistan okunamadı: '+as.status);
 const m=as.d.model||{},ids=[...new Set([...(m.toolIds||[]),toolId])],msgs=(m.messages||[]).map(x=>x.role==='system'&&!String(x.content||'').includes('save_order')?{...x,content:String(x.content||'')+KURAL}:x);
 const p=await j('/assistant/'+b.vapi_assistant_id,{method:'PATCH',body:JSON.stringify({model:{...m,toolIds:ids,messages:msgs}})});
 if(!p.ok)throw new Error('Asistana bağlanamadı: '+p.status+' '+p.t.slice(0,250));
 // 2. yedek: Vapi çağrı sonunda siparişi kendi de çıkarsın (Gemini olmasa bile end-of-call-report'ta gelir)
 const sema={type:'object',properties:{customerName:{type:'string',description:'Müşterinin adı'},orders:{type:'string',description:'Ürünler ve adetleri, ör. 2 adana dürüm, 1 ayran'},address:{type:'string',description:'Teslimat adresi'},statedPhone:{type:'string',description:'Müşterinin söylediği telefon numarası'},reservationDate:{type:'string',description:'Rezervasyon tarihi YYYY-AA-GG'},reservationTime:{type:'string',description:'Rezervasyon saati SS:DD'},partySize:{type:'string',description:'Kişi sayısı'}}};
 const an=await j('/assistant/'+b.vapi_assistant_id,{method:'PATCH',body:JSON.stringify({analysisPlan:{...(as.d.analysisPlan||{}),structuredDataPlan:{enabled:true,schema:sema}}})});
 await adminSb.from('businesses').update({settings:{...(b.settings||{}),save_order_tool_id:toolId}}).eq('id',b.id);
 return NextResponse.json({ok:true,toolId,yedekAnaliz:an.ok?'açık':'açılamadı ('+an.status+')'});}catch(e){return NextResponse.json({error:e.message},{status:e.message==='Yetkisiz'?401:400});}}
