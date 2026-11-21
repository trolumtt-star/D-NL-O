// CANLI DEMO: sitedeki "Asistanla konuş" ve paneldeki "Asistanımı dene" için tarayıcıdan sesli görüşme bilgisi.
// Vapi "public key" zaten tarayıcıya açık bir anahtardır (Vapi panelinde izinli alan adı ve asistan kısıtı konmalı).
// Kötüye kullanım freni: site demosu IP başına günde 5, toplam günde 300 görüşme; demo asistanı en fazla 2 dakika konuşur.
import {NextResponse} from 'next/server';import crypto from 'crypto';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';import {demoAsistan} from '@/lib/demoKur';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function GET(req){const pub=process.env.VAPI_PUBLIC_KEY;if(!pub){try{await adminSb.from('webhook_events').insert({type:'demo_hata',payload:{hata:'VAPI_PUBLIC_KEY Vercel ortam değişkenlerinde yok'}});}catch{}return hata('Canlı demo şu an bakımda, birazdan tekrar deneyin.',503);}
 if(new URL(req.url).searchParams.get('benim')){try{const b=await requireOwner(req);if(!b.vapi_assistant_id)return hata('Önce asistanınızı kurun.');if(b.status==='suspended')return hata('Asistanınız şu an durdurulmuş (deneme bitti veya dakika doldu).');
   return NextResponse.json({publicKey:pub,assistantId:b.vapi_assistant_id,ad:b.name});}catch(e){return hata(e.message,401);}}
 const ip=crypto.createHash('sha256').update('demo:'+(req.headers.get('x-forwarded-for')||'').split(',')[0].trim()).digest('hex').slice(0,24),gun=new Date(Date.now()-864e5).toISOString();
 const [{count:n},{count:t}]=await Promise.all([adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('type','demo').eq('payload->>ip',ip).gte('created_at',gun),
  adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('type','demo').gte('created_at',gun)]);
 if(n>=5)return hata('Bugünlük demo hakkınız doldu. Hemen ücretsiz hesap açıp kendi asistanınızı deneyebilirsiniz.',429);if(t>=300)return hata('Demo şu an çok yoğun, birazdan tekrar deneyin.',429);
 // Seçilen sektörün demo asistanı (yoksa şimdi Vapi'de otomatik kurulur)
 let da;try{da=await demoAsistan(new URL(req.url).searchParams.get('s')||'restoran');}catch(e){await adminSb.from('webhook_events').insert({type:'demo_hata',payload:{hata:String(e.message).slice(0,300)}});return hata('Canlı demo şu an hazırlanıyor, birkaç dakika sonra tekrar deneyin.',503);}
 await adminSb.from('webhook_events').insert({type:'demo',payload:{ip,sektor:da.sk.id}});
 return NextResponse.json({publicKey:pub,assistantId:da.id,ad:da.sk.isletme});}

// Tarayıcıdaki sesli görüşme hatası kaydı (sebebi görebilmek için). IP başına günde 20 kayıt.
export async function POST(req){try{const b=await req.json().catch(()=>({}));const m=String(b.hata||'').slice(0,400);if(!m)return NextResponse.json({ok:true});
 const ip=crypto.createHash('sha256').update('demo:'+(req.headers.get('x-forwarded-for')||'').split(',')[0].trim()).digest('hex').slice(0,24),gun=new Date(Date.now()-864e5).toISOString();
 const {count}=await adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('type','demo_istemci_hata').eq('payload->>ip',ip).gte('created_at',gun);
 const {count:top}=await adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('type','demo_istemci_hata').gte('created_at',gun);
 if((count||0)<20&&(top||0)<2000)await adminSb.from('webhook_events').insert({type:'demo_istemci_hata',payload:{ip,hata:m,tip:String(b.tip||'').slice(0,20),ua:String(req.headers.get('user-agent')||'').slice(0,120)}});
 return NextResponse.json({ok:true});}catch{return NextResponse.json({ok:true});}}
