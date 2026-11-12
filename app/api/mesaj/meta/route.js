// MESAJLAŞMA ALTYAPISI (WhatsApp Business Cloud API + Instagram Messaging): Meta'nın webhook ucu.
// Şimdilik gelen mesajları ilgili işletmeye kaydeder; otomatik cevap "Yakında".
// Gerekli env (Vercel, koda yazılmaz): META_VERIFY_TOKEN (webhook doğrulama), META_APP_SECRET (imza kontrolü).
// İşletme eşleşmesi: mesaj_kanallari (tur='whatsapp' → phone_number_id, tur='instagram' → IG hesap id), durum='aktif'.
import {NextResponse} from 'next/server';import crypto from 'crypto';import {adminSb} from '@/lib/admin';
export const dynamic='force-dynamic';
export async function GET(req){
 const u=new URL(req.url).searchParams,tok=process.env.META_VERIFY_TOKEN;
 if(tok&&u.get('hub.mode')==='subscribe'&&u.get('hub.verify_token')===tok)return new Response(u.get('hub.challenge')||'',{status:200});
 return new Response('forbidden',{status:403});}
const imzaDogru=(ham,imza,sir)=>{if(!imza?.startsWith('sha256='))return false;const b=Buffer.from(imza.slice(7),'hex'),h=crypto.createHmac('sha256',sir).update(ham).digest();return b.length===h.length&&crypto.timingSafeEqual(b,h);};
export async function POST(req){
 const sir=process.env.META_APP_SECRET;if(!sir)return NextResponse.json({error:'mesajlaşma henüz açık değil'},{status:503});
 const ham=await req.text();if(ham.length>200000)return NextResponse.json({error:'çok büyük'},{status:413});
 if(!imzaDogru(ham,req.headers.get('x-hub-signature-256'),sir))return NextResponse.json({error:'imza geçersiz'},{status:401});
 let j;try{j=JSON.parse(ham);}catch{return NextResponse.json({ok:true});}
 const kayit=[];
 if(j.object==='whatsapp_business_account')for(const e of j.entry||[])for(const c of e.changes||[]){const v=c.value||{};
  for(const m of v.messages||[])kayit.push({tur:'whatsapp',dis:v.metadata?.phone_number_id,kisi:m.from,metin:m.text?.body||m.button?.text||m.interactive?.button_reply?.title||'['+(m.type||'mesaj')+']',ham:m});}
 if(j.object==='instagram')for(const e of j.entry||[])for(const m of e.messaging||[]){if(m.message?.is_echo)continue;
  kayit.push({tur:'instagram',dis:String(e.id),kisi:m.sender?.id,metin:m.message?.text||'[ek]',ham:m});}
 for(const k of kayit.slice(0,50)){if(!k.dis)continue;
  const {data:kn}=await adminSb.from('mesaj_kanallari').select('id,business_id').eq('tur',k.tur).eq('dis_id',String(k.dis)).eq('durum','aktif').maybeSingle();
  if(!kn)continue;
  await adminSb.from('mesajlar').insert({business_id:kn.business_id,kanal_id:kn.id,yon:'gelen',kisi:String(k.kisi||'').slice(0,64),metin:String(k.metin).slice(0,4000),ham:k.ham});}
 // Meta 200 bekler; aksi halde tekrar tekrar gönderir
 return NextResponse.json({ok:true});}
