// Admin telefon bildirimi aboneliği: Yapılacaklar'a yeni iş düşünce admin'in telefonuna bildirim gelir.
import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {vapid} from '@/lib/push';import {adminPush} from '@/lib/adminIs';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function GET(req){let u;try{u=await requireAdmin(req);}catch(e){return hata(e.message,401);}
 const k=await vapid();const {count}=await adminSb.from('push_abonelik').select('id',{count:'exact',head:true}).eq('admin',true);
 return NextResponse.json({publicKey:k.pub,cihaz:count||0});}
export async function POST(req){let u;try{u=await requireAdmin(req);}catch(e){return hata(e.message,401);}
 try{const x=await req.json();
  if(x.islem==='test'){const n=await adminPush({title:'🛠 Dinlio Admin',body:'Bildirimler çalışıyor. Yapılacaklar listesine iş düşünce buraya gelecek.',tag:'admin-test'});return NextResponse.json({ok:true,gonderilen:n});}
  const s=x.subscription||{},ep=String(s.endpoint||''),k=s.keys||{};
  if(x.islem==='kapat'){if(ep)await adminSb.from('push_abonelik').delete().eq('endpoint',ep).eq('admin',true);return NextResponse.json({ok:true});}
  let host='';try{host=new URL(ep).hostname;}catch{}
  const izinli=/^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/i.test(host);
  if(!/^https:\/\//.test(ep)||!izinli||ep.length>1000||!k.p256dh||!k.auth)return hata('Geçersiz abonelik.');
  const {count}=await adminSb.from('push_abonelik').select('id',{count:'exact',head:true}).eq('admin',true);
  if(count>=5)return hata('En fazla 5 cihazda admin bildirimi açılabilir.');
  const {error}=await adminSb.from('push_abonelik').upsert({business_id:null,kurye_id:null,admin:true,user_id:u.id,endpoint:ep,p256dh:String(k.p256dh).slice(0,200),auth:String(k.auth).slice(0,100),cihaz:String(x.cihaz||'').slice(0,80)},{onConflict:'endpoint'});
  if(error)throw error;return NextResponse.json({ok:true});}catch(e){return hata(e.message);}}
