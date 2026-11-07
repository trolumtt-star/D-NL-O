import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';
export const maxDuration=10; // Vapi bu uca 7.5 saniye içinde cevap bekliyor
// Vapi, assistantId boş bırakılmış bir numaraya çağrı geldiğinde bu adrese
// {message:{type:'assistant-request', call:{phoneNumberId,...}}} gönderir.
// Biz de işletme kota yüzünden durduysa çağrıyı işletmenin gerçek telefonuna
// yönlendiriyoruz (AI devreye girmeden); değilse normal asistanı geri veriyoruz
// (güvenlik ağı - normalde assistantId zaten dolu olduğu için buraya hiç düşmemeli).
const e164=s=>{let d=String(s||'').replace(/\D/g,'');if(!d)return null;
 if(d.length===10&&d[0]==='5')d='90'+d;
 else if(d.length===11&&d[0]==='0')d='90'+d.slice(1);
 else if(!d.startsWith('90')&&d.length>=10)d='90'+d.slice(-10);
 return '+'+d;};
export async function POST(req){
 try{
  const body=await req.json(),m=body.message||body;
  if(m.type&&m.type!=='assistant-request')return NextResponse.json({});
  const pid=m.call?.phoneNumberId||m.phoneNumber?.id||null;
  if(!pid)return NextResponse.json({error:'phoneNumberId gelmedi'});
  const {data:biz}=await adminSb.from('businesses').select('status,vapi_assistant_id,phone_number,name').eq('vapi_phone_id',pid).maybeSingle();
  if(!biz)return NextResponse.json({error:'İşletme bulunamadı (vapi_phone_id eşleşmiyor)'});
  if(biz.status==='suspended'){
   const num=e164(biz.phone_number);
   if(!num)return NextResponse.json({error:'İşletmenin yönlendirilecek telefon numarası (phone_number) tanımlı değil'});
   return NextResponse.json({destination:{type:'number',number:num,message:`Bu işletmenin otomatik asistan süresi bu ay için doldu, sizi ${biz.name||'işletmeye'} doğrudan bağlıyorum.`}});
  }
  if(biz.vapi_assistant_id)return NextResponse.json({assistantId:biz.vapi_assistant_id});
  return NextResponse.json({error:'Asistan tanımlı değil'});
 }catch(e){return NextResponse.json({error:'internal'});}
}
