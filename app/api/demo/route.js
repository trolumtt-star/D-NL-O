// CANLI DEMO: sitedeki "Asistanla konuş" ve paneldeki "Asistanımı dene" için tarayıcıdan sesli görüşme bilgisi.
// Vapi "public key" zaten tarayıcıya açık bir anahtardır (Vapi panelinde izinli alan adı ve asistan kısıtı konmalı).
// Kötüye kullanım freni: site demosu IP başına günde 5, toplam günde 300 görüşme; demo asistanı en fazla 2 dakika konuşur.
import {NextResponse} from 'next/server';import crypto from 'crypto';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function GET(req){const pub=process.env.VAPI_PUBLIC_KEY;if(!pub)return hata('Canlı demo henüz açılmadı.',503);
 if(new URL(req.url).searchParams.get('benim')){try{const b=await requireOwner(req);if(!b.vapi_assistant_id)return hata('Önce asistanınızı kurun.');if(b.status==='suspended')return hata('Asistanınız şu an durdurulmuş (deneme bitti veya dakika doldu).');
   return NextResponse.json({publicKey:pub,assistantId:b.vapi_assistant_id,ad:b.name});}catch(e){return hata(e.message,401);}}
 const {data:a}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','demo').maybeSingle();if(!a?.deger?.id)return hata('Canlı demo henüz açılmadı.',503);
 const ip=crypto.createHash('sha256').update('demo:'+(req.headers.get('x-forwarded-for')||'').split(',')[0].trim()).digest('hex').slice(0,24),gun=new Date(Date.now()-864e5).toISOString();
 const [{count:n},{count:t}]=await Promise.all([adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('type','demo').eq('payload->>ip',ip).gte('created_at',gun),
  adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('type','demo').gte('created_at',gun)]);
 if(n>=5)return hata('Bugünlük demo hakkınız doldu. Hemen ücretsiz hesap açıp kendi asistanınızı deneyebilirsiniz.',429);if(t>=300)return hata('Demo şu an çok yoğun, birazdan tekrar deneyin.',429);
 await adminSb.from('webhook_events').insert({type:'demo',payload:{ip}});
 return NextResponse.json({publicKey:pub,assistantId:a.deger.id,ad:a.deger.isletme||'Lezzet Durağı'});}
