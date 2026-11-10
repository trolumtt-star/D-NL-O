import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';
export const dynamic='force-dynamic';export const maxDuration=30;
// Vapi'de save_order aracını oluşturur ve asistana bağlar: asistan siparişi görüşme sırasında
// kendisi yapılandırıp panele yazar (Gemini'ye gerek kalmaz, sipariş anında düşer).
export const KURAL='\n\n# CANLI SİPARİŞ KAYDI\n- Sipariş netleşip müşteriye tekrar edip onay aldığın anda save_order aracını çağır: orders = ürünler ve adetler (ör. "2 adana dürüm, 1 ayran"), address = tam teslimat adresi, customerName = müşterinin adı, phone = müşterinin söylediği numara (söylemediyse boş bırak).\n- Müşteri sonradan ekleme veya değişiklik yaparsa save_order\'ı siparişin güncel tam haliyle yeniden çağır.\n- Araç başarılı dönünce müşteriye siparişin alındığını söyle.';
const ARAC=(url,sec)=>({type:'function',async:false,function:{name:'save_order',description:'Müşterinin onayladığı siparişi işletme paneline anında kaydeder.',parameters:{type:'object',properties:{
 customerName:{type:'string',description:'Müşterinin adı'},orders:{type:'string',description:'Ürünler ve adetleri, ör. 2 adana dürüm, 1 ayran'},
 address:{type:'string',description:'Tam teslimat adresi (gel-al ise "gel-al")'},phone:{type:'string',description:'Müşterinin söylediği telefon numarası'},lat:{type:'number',description:'find_location ile onaylanan konumun enlemi'},lng:{type:'number',description:'find_location ile onaylanan konumun boylamı'},kuryeNotu:{type:'string',description:'Müşterinin tarifi: hangi binadan dönülür, ev rengi, kapı vb.'}},required:['orders']}},
 messages:[{type:'request-start',content:'Hemen kaydediyorum.'}],server:sec?{url,headers:{'x-vapi-secret':sec}}:{url}});
const KONUM=(url,sec)=>({type:'function',async:false,function:{name:'find_location',description:'Müşteri tam adres veremeyip tarif ettiğinde (mahalle + yakındaki market, eczane, cami, okul gibi yerler) haritada konumu bulur ve teyit için aday yerler döner.',parameters:{type:'object',properties:{
 mahalle:{type:'string',description:'Mahalle adı, ör. Dere'},ilce:{type:'string',description:'İlçe (biliniyorsa)'},yerler:{type:'array',items:{type:'string'},description:'Tarifte geçen yerler, ör. ["BİM","eczane","spor salonu"]'},tarif:{type:'string',description:'Müşterinin tarifi aynen'}},required:['yerler']}},
 messages:[{type:'request-start',content:'Hemen haritadan bakıyorum.'}],server:sec?{url,headers:{'x-vapi-secret':sec}}:{url}});
export const KURAL2='\n\n# TARİFTEN ADRES BULMA\n- Müşteri tam adres veremez ve tarif ederse (ör. "Dere Mahallesi\'nde BİM\'in yanındaki eczaneden dönünce") find_location aracını çağır: mahalle ve tarifte geçen yerleri gönder.\n- Dönen adayı müşteriye evet/hayır sorusuyla teyit et; hayır derse sıradaki adayı sor, hiçbiri olmazsa başka bilinen bir yer iste.\n- Onaylanınca save_order\'a address olarak mahalle + sokak + yakın yer yaz, lat ve lng değerlerini ekle, müşterinin tarifini (ev rengi, kapı, kat vb.) kuryeNotu olarak yaz.';
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
 let konumId=b.settings?.find_location_tool_id||null;
 if(konumId){const g=await j('/tool/'+konumId);if(g.ok)await j('/tool/'+konumId,{method:'PATCH',body:JSON.stringify({server:KONUM(url,sec).server,function:KONUM(url,sec).function})});else konumId=null;}
 if(!konumId){let c=await j('/tool',{method:'POST',body:JSON.stringify(KONUM(url,sec))});if(!c.ok&&sec){const a=KONUM(url,null);a.server={url,secret:sec};c=await j('/tool',{method:'POST',body:JSON.stringify(a)});}if(c.ok)konumId=c.d.id;}
 const as=await j('/assistant/'+b.vapi_assistant_id);if(!as.ok)throw new Error('Asistan okunamadı: '+as.status);
 const m=as.d.model||{},ids=[...new Set([...(m.toolIds||[]),toolId,konumId].filter(Boolean))],msgs=(m.messages||[]).map(x=>{if(x.role!=='system')return x;let c=String(x.content||'');if(!c.includes('# CANLI SİPARİŞ'))c+=KURAL;if(konumId&&!c.includes('find_location'))c+=KURAL2;return {...x,content:c};});
 const p=await j('/assistant/'+b.vapi_assistant_id,{method:'PATCH',body:JSON.stringify({model:{...m,toolIds:ids,messages:msgs}})});
 if(!p.ok)throw new Error('Asistana bağlanamadı: '+p.status+' '+p.t.slice(0,250));
 // 2. yedek: Vapi çağrı sonunda siparişi kendi de çıkarsın (Gemini olmasa bile end-of-call-report'ta gelir)
 const sema={type:'object',properties:{customerName:{type:'string',description:'Müşterinin adı'},orders:{type:'string',description:'Ürünler ve adetleri, ör. 2 adana dürüm, 1 ayran'},address:{type:'string',description:'Teslimat adresi'},statedPhone:{type:'string',description:'Müşterinin söylediği telefon numarası'},reservationDate:{type:'string',description:'Rezervasyon tarihi YYYY-AA-GG'},reservationTime:{type:'string',description:'Rezervasyon saati SS:DD'},partySize:{type:'string',description:'Kişi sayısı'}}};
 const an=await j('/assistant/'+b.vapi_assistant_id,{method:'PATCH',body:JSON.stringify({analysisPlan:{...(as.d.analysisPlan||{}),structuredDataPlan:{enabled:true,schema:sema}}})});
 await adminSb.from('businesses').update({settings:{...(b.settings||{}),save_order_tool_id:toolId,find_location_tool_id:konumId}}).eq('id',b.id);
 return NextResponse.json({ok:true,toolId,konum:konumId?'açık':'kurulamadı',yedekAnaliz:an.ok?'açık':'açılamadı ('+an.status+')'});}catch(e){return NextResponse.json({error:e.message},{status:e.message==='Yetkisiz'?401:400});}}
