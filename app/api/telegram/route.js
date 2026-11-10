import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {tg,tgSir} from '@/lib/bildir';
export const dynamic='force-dynamic';
// Telegram botuna gelen mesajlar. İşletme panelden "Telegram'ı bağla"ya basınca t.me/bot?start=KOD açılır, /start KOD buraya gelir.
export async function POST(req){if(req.headers.get('x-telegram-bot-api-secret-token')!==tgSir())return NextResponse.json({ok:false},{status:401});
 const u=await req.json(),m=u.message||u.edited_message;if(!m?.chat?.id)return NextResponse.json({ok:true});
 const txt=String(m.text||'').trim(),kod=(txt.match(/^\/start\s+([A-Za-z0-9]{8,40})$/)||[])[1];
 if(kod){const {data:b}=await adminSb.from('businesses').select('id,name,settings').eq('settings->>telegram_kod',kod).maybeSingle();
  if(!b){await tg(m.chat.id,'Bu bağlantının süresi dolmuş. Panelde Ayarlar > Telegram bildirimi bölümünden tekrar "Telegram\'ı bağla"ya basın.');return NextResponse.json({ok:true});}
  const s={...(b.settings||{}),telegram_chat_id:m.chat.id};delete s.telegram_kod;await adminSb.from('businesses').update({settings:s}).eq('id',b.id);
  await tg(m.chat.id,`✅ ${b.name} için bildirimler açıldı. Yeni sipariş, rezervasyon ve randevular buraya anında gelecek.`);return NextResponse.json({ok:true});}
 if(txt==='/kapat'){const {data:b}=await adminSb.from('businesses').select('id,settings').eq('settings->>telegram_chat_id',String(m.chat.id)).maybeSingle();
  if(b){const s={...(b.settings||{})};delete s.telegram_chat_id;await adminSb.from('businesses').update({settings:s}).eq('id',b.id);}await tg(m.chat.id,'Bildirimler kapatıldı.');return NextResponse.json({ok:true});}
 await tg(m.chat.id,'Merhaba! Bu bot Dinlio AI bildirimleri içindir. Bağlamak için panelde Ayarlar > Telegram bildirimi bölümündeki butonu kullanın. Kapatmak için /kapat yazın.');
 return NextResponse.json({ok:true});}
