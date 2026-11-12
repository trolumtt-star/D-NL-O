import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {e164} from '@/lib/vapi';import {paketOf} from '@/lib/paket';
// Bu numarada şu an süren (bu arama hariç) kaç arama var? Vapi'ye sorulur; cevap gelmezse sınır uygulanmaz.
const AKTIF=new Set(['queued','ringing','in-progress']);
async function aktifSayisi(pid,buId){const key=process.env.VAPI_API_KEY;if(!key)return 0;
 try{const q=new URLSearchParams({phoneNumberId:pid,limit:'50',createdAtGt:new Date(Date.now()-45*60e3).toISOString()});
  const r=await fetch('https://api.vapi.ai/call?'+q,{headers:{authorization:'Bearer '+key},signal:AbortSignal.timeout(2500)});if(!r.ok)return 0;
  const l=await r.json();return (Array.isArray(l)?l:l.results||[]).filter(c=>c.id!==buId&&AKTIF.has(c.status)).length;}catch{return 0;}}
export const maxDuration=10; // Vapi bu uca 7.5 saniye içinde cevap bekliyor
// Numaralar "istek modunda" (lib/vapi.js): her aramada Vapi bu adrese
// {message:{type:'assistant-request', call:{phoneNumberId,...}}} gönderir. Sırayla:
// 1) işletme durduysa arama işletmenin gerçek telefonuna aktarılır,
// 2) paketin eş zamanlı arama sınırı doluysa yine işletmeye aktarılır,
// 3) değilse asistan verilir; paket izin veriyorsa sadık müşteri adıyla karşılanır.
export async function POST(req){
 try{
  const sec=process.env.VAPI_SECRET,hs=req.headers.get('x-vapi-secret')||(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(sec&&hs&&hs!==sec)return NextResponse.json({error:'unauthorized'},{status:401});
  const body=await req.json(),m=body.message||body;
  if(m.type&&m.type!=='assistant-request')return NextResponse.json({});
  const pid=m.call?.phoneNumberId||m.phoneNumber?.id||null;
  if(!pid)return NextResponse.json({error:'phoneNumberId gelmedi'});
  const {data:biz}=await adminSb.from('businesses').select('id,status,vapi_assistant_id,phone_number,name,settings,quota_minutes_total').eq('vapi_phone_id',pid).maybeSingle();
  if(!biz)return NextResponse.json({error:'İşletme bulunamadı (vapi_phone_id eşleşmiyor)'});
  if(biz.status==='suspended'){
   const num=e164(biz.settings?.kota_yonlendirme||biz.phone_number);
   if(!num)return NextResponse.json({error:'İşletmenin yönlendirilecek telefon numarası (phone_number) tanımlı değil'});
   return NextResponse.json({destination:{type:'number',number:num,message:`Bu işletmenin otomatik asistan süresi bu ay için doldu, sizi ${biz.name||'işletmeye'} doğrudan bağlıyorum.`}});
  }
  if(biz.vapi_assistant_id){
   const pk=paketOf(biz),num=e164(biz.settings?.kota_yonlendirme||biz.phone_number);
   // EŞ ZAMANLI SINIR: paketin hat sayısı doluysa arama işletmenin kendi telefonuna aktarılır.
   if(num){const n=await aktifSayisi(pid,m.call?.id);
    if(n>=pk.eszamanli){await adminSb.from('webhook_events').insert({type:'hat_dolu',business_id:biz.id,vapi_call_id:m.call?.id||null,payload:{aktif:n,sinir:pk.eszamanli,paket:pk.ad}});
     return NextResponse.json({destination:{type:'number',number:num,message:'Şu an tüm hatlarımız dolu, sizi doğrudan işletmeye bağlıyorum.'}});}}
   if(!pk.sadik)return NextResponse.json({assistantId:biz.vapi_assistant_id});
   // SADIK MÜŞTERİ: aynı numara daha önce aradıysa ve adını biliyorsak açılışı kişiselleştir.
   try{
    const num=String(m.call?.customer?.number||m.customer?.number||'').replace(/\D/g,'').slice(-10);
    if(num.length===10){
     const {data:gec}=await adminSb.from('calls').select('customer_name,orders,extracted,created_at')
      .eq('business_id',biz.id).or(`caller_phone.ilike.%${num},stated_phone.ilike.%${num}`)
      .not('customer_name','is',null).order('created_at',{ascending:false}).limit(5);
     const g=(gec||[]).find(x=>x.customer_name);
     if(g){
      const ex=g.extracted||{},son=String(g.orders||ex.service||ex.complaint||ex.interest||ex.issue||ex.reason||'').slice(0,60);
      const ilk=`Hoş geldiniz ${g.customer_name}, sizi yeniden duymak çok güzel! Ben ${biz.name||'işletmenin'} yapay zeka asistanıyım, görüşmemiz hizmet kalitesi için kaydedilmektedir. Bugün nasıl yardımcı olabilirim?`;
      // Arayan numara taklit edilebildiği için geçmiş sipariş/şikayet sesli söylenmez; sadece asistanın bağlamına verilir.
      return NextResponse.json({assistantId:biz.vapi_assistant_id,assistantOverrides:{firstMessage:ilk,variableValues:{musteriAdi:g.customer_name,sonIslem:son||'',aramaSayisi:String((gec||[]).length)}}});
     }}
   }catch{}
   return NextResponse.json({assistantId:biz.vapi_assistant_id});
  }
  return NextResponse.json({error:'Asistan tanımlı değil'});
 }catch(e){return NextResponse.json({error:'internal'});}
}
