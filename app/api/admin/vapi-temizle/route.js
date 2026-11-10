import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';
export const dynamic='force-dynamic';export const maxDuration=20;
// Asistanın "su molası vereyim" gibi saçma ara cümlelerini engeller:
// 1) sistem promptuna kesin yasak kuralı ekler, 2) seslendirmeden önce bu cümleleri siler (formatPlan.replacements),
// 3) sessizlikte söylenen bekleme mesajlarında mola/su geçiyorsa düzgün Türkçe mesajla değiştirir.
const KURAL='\n\n# KESİN YASAK\n- Asla "su molası", "mola vereyim", "ara vereyim", "biraz dinleneyim", "su içeyim" gibi ifadeler kullanma; sen mola vermezsin.\n- Bir şeye bakman gerekiyorsa sadece "Hemen bakıyorum" de ve hemen devam et.';
const YASAK=['Ben bir su molası vereyim','Ben bi su molası vereyim','Bir su molası vereyim','Bi su molası vereyim','Su molası vereyim','su molası vereyim','Kısa bir mola vereyim','kısa bir mola vereyim','Bir mola vereyim','bir mola vereyim','Mola vereyim','mola vereyim','su molası','Su molası'];
export async function POST(req){try{await requireAdmin(req);const {business_id}=await req.json();
 const key=process.env.VAPI_API_KEY;if(!key)return NextResponse.json({error:'Vercel\'de VAPI_API_KEY tanımlı değil.'},{status:400});
 const {data:b}=await adminSb.from('businesses').select('vapi_assistant_id').eq('id',business_id).maybeSingle();
 if(!b?.vapi_assistant_id)return NextResponse.json({error:'Bu işletmede Vapi asistan kimliği yok.'},{status:400});
 const H={'content-type':'application/json',authorization:'Bearer '+key},U='https://api.vapi.ai/assistant/'+b.vapi_assistant_id;
 const g=await fetch(U,{headers:H,signal:AbortSignal.timeout(8000)});if(!g.ok)return NextResponse.json({error:'Asistan okunamadı: '+g.status},{status:400});
 const a=await g.json(),body={},yap=[];
 // 1) prompt
 if(a.model?.messages){const ms=a.model.messages.map(m=>m.role==='system'&&!String(m.content||'').includes('KESİN YASAK')?{...m,content:String(m.content||'')+KURAL}:m);
  if(JSON.stringify(ms)!==JSON.stringify(a.model.messages)){body.model={...a.model,messages:ms};yap.push('prompta yasak kuralı eklendi');}}
 // 2) seslendirme öncesi silme
 if(a.voice){const fp=a.voice.chunkPlan?.formatPlan||{},eski=fp.replacements||[],var_=new Set(eski.map(r=>r.key));
  const yeni=[...eski,...YASAK.filter(k=>!var_.has(k)).map(k=>({type:'exact',key:k,value:''}))];
  if(yeni.length!==eski.length){body.voice={...a.voice,chunkPlan:{...(a.voice.chunkPlan||{}),enabled:a.voice.chunkPlan?.enabled??true,formatPlan:{...fp,enabled:fp.enabled??true,replacements:yeni}}};yap.push('seslendirmede mola cümleleri siliniyor');}}
 // 3) bekleme mesajları
 const im=a.messagePlan?.idleMessages;if(Array.isArray(im)&&im.some(x=>/mola|su iç|break|water/i.test(x))){body.messagePlan={...a.messagePlan,idleMessages:['Hâlâ orada mısınız?','Sizi duyamıyorum, devam edebilir misiniz?']};yap.push('bekleme mesajları düzeltildi');}
 if(!yap.length)return NextResponse.json({ok:true,degisen:['zaten ayarlı, değişiklik gerekmedi']});
 const p=await fetch(U,{method:'PATCH',headers:H,body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});const t=await p.text();
 if(!p.ok)return NextResponse.json({error:'Vapi güncellemedi: '+p.status+' '+t.slice(0,300)},{status:400});
 return NextResponse.json({ok:true,degisen:yap});}catch(e){return NextResponse.json({error:e.message},{status:e.message==='Yetkisiz'?401:400});}}
