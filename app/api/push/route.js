// Telefon bildirimi aboneliği: işletme sahibi panelden "Bildirimleri aç" der, tarayıcının aboneliği burada saklanır.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';import {vapid,pushGonder} from '@/lib/push';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function GET(req){try{const b=await requireOwner(req);const k=await vapid();
 const {count}=await adminSb.from('push_abonelik').select('id',{count:'exact',head:true}).eq('business_id',b.id);
 return NextResponse.json({publicKey:k.pub,cihaz:count||0});}catch(e){return hata(e.message,401);}}
export async function POST(req){try{const b=await requireOwner(req);const x=await req.json();
 const t=(req.headers.get('authorization')||'').replace('Bearer ','');const {data:u}=await adminSb.auth.getUser(t);
 if(x.islem==='test'){const n=await pushGonder(b.id,{title:'🔔 Dinlio AI',body:'Bildirimler çalışıyor! Yeni sipariş ve randevular böyle gelecek.',tag:'test'});return NextResponse.json({ok:true,gonderilen:n});}
 const s=x.subscription||{},ep=String(s.endpoint||''),k=s.keys||{};
 if(x.islem==='kapat'){if(ep)await adminSb.from('push_abonelik').delete().eq('endpoint',ep).eq('business_id',b.id);return NextResponse.json({ok:true});}
 // Sunucu sadece bilinen bildirim servislerine istek atsın (başka adrese istek attırılamasın)
 let host='';try{host=new URL(ep).hostname;}catch{}
 const izinli=/^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/i.test(host);
 if(!/^https:\/\//.test(ep)||!izinli||ep.length>1000||!k.p256dh||!k.auth)return hata('Geçersiz abonelik.');
 const {count}=await adminSb.from('push_abonelik').select('id',{count:'exact',head:true}).eq('business_id',b.id);
 if(count>=10)return hata('En fazla 10 cihazda bildirim açılabilir. Eski bir cihazda kapatıp tekrar deneyin.');
 const {error}=await adminSb.from('push_abonelik').upsert({business_id:b.id,user_id:u.user.id,endpoint:ep,p256dh:String(k.p256dh).slice(0,200),auth:String(k.auth).slice(0,100),cihaz:String(x.cihaz||'').slice(0,80)},{onConflict:'endpoint'});
 if(error)throw error;return NextResponse.json({ok:true});}catch(e){return hata(e.message,e.message==='Giriş gerekli'?401:400);}}
