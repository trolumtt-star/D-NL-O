// CANLI DEMO KARTI: demo asistanı konuşurken demo_kaydet aracıyla bilgileri buraya yazar; demo sayfası aynı görüşmenin kartını okur.
// Sadece demo asistanının aramaları kabul edilir; okumak için görüşme kimliği (tahmin edilemez) gerekir, 30 dakika sonra okunmaz.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';
export const dynamic='force-dynamic';
const ALAN=['musteri','telefon','istek','adres','tarih','saat','kisi','tutar','not','durum'];
export async function POST(req){
 const sec=process.env.VAPI_SECRET,hs=req.headers.get('x-vapi-secret')||(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(sec&&hs!==sec)return NextResponse.json({error:'yetkisiz'},{status:401});
 let body;try{body=await req.json();}catch{return NextResponse.json({results:[]});}
 const m=body.message||{},call=m.call||{},liste=m.toolCallList||m.toolCalls||[];
 const {data:a}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','demo').maybeSingle();
 const demo=a?.deger?.id&&(call.assistantId===a.deger.id||m.assistant?.id===a.deger.id);
 const results=[];
 for(const tc of liste){let x=tc.function?.arguments||tc.arguments||{};if(typeof x==='string'){try{x=JSON.parse(x);}catch{x={};}}
  if(!demo||!/^[0-9a-f-]{36}$/.test(String(call.id||''))){results.push({toolCallId:tc.id,result:'Kaydedildi.'});continue;}
  const kart={};for(const k of ALAN)if(x[k]!=null&&String(x[k]).trim())kart[k]=String(x[k]).slice(0,300);
  const {data:e}=await adminSb.from('webhook_events').select('id,payload').eq('type','demo_kart').eq('vapi_call_id',call.id).maybeSingle();
  if(e)await adminSb.from('webhook_events').update({payload:{...e.payload,...kart,n:(e.payload?.n||0)+1}}).eq('id',e.id);
  else await adminSb.from('webhook_events').insert({type:'demo_kart',vapi_call_id:call.id,payload:{...kart,n:1}});
  results.push({toolCallId:tc.id,result:'Kaydedildi, bilgiler işletme paneline düştü. Konuşmaya devam et.'});}
 return NextResponse.json({results});}
export async function GET(req){const c=new URL(req.url).searchParams.get('c')||'';if(!/^[0-9a-f-]{36}$/.test(c))return NextResponse.json({kart:null});
 const {data:e}=await adminSb.from('webhook_events').select('payload,created_at').eq('type','demo_kart').eq('vapi_call_id',c).gte('created_at',new Date(Date.now()-30*60e3).toISOString()).maybeSingle();
 return NextResponse.json({kart:e?.payload||null},{headers:{'cache-control':'no-store'}});}
