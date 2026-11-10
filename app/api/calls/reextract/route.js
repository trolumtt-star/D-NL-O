import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';import {ayikla} from '@/lib/ayikla';
export const maxDuration=60;export const dynamic='force-dynamic';
// Paneldeki "Tekrar oku" butonu: okunamayan bir çağrının bilgilerini yeniden çıkarır.
export async function POST(req){try{const b=await requireOwner(req);const {call_id}=await req.json();
 const {data:c}=await adminSb.from('calls').select('id,transcript,caller_phone,vapi_call_id,created_at').eq('id',call_id).eq('business_id',b.id).maybeSingle();
 if(!c)return NextResponse.json({error:'Çağrı bulunamadı'},{status:404});if(!c.transcript)return NextResponse.json({error:'Bu çağrıda konuşma metni yok'},{status:400});
 const r=await ayikla({bid:b.id,cid:c.id,transcript:c.transcript,vertical:b.vertical,callerPhone:c.caller_phone,vapiCallId:c.vapi_call_id,gun:new Date(c.created_at).toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'})});
 if(!r.ok)return NextResponse.json({error:'Yapay zeka şu an cevap vermedi, birazdan tekrar deneyin.'},{status:503});return NextResponse.json({ok:true});
}catch(e){return NextResponse.json({error:e.message},{status:e.message==='Giriş gerekli'?401:400});}}
