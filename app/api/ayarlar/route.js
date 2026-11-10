import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';import crypto from 'crypto';
export const dynamic='force-dynamic';
// İşletme sahibinin kendi ayarları: kota bitince yönlendirme numarası, Telegram bağlantısı.
const ok=d=>NextResponse.json(d),hata=(e,s=400)=>NextResponse.json({error:e},{status:s});
export async function GET(req){try{const b=await requireOwner(req);return ok({telegram:!!b.settings?.telegram_chat_id,botVar:!!process.env.TELEGRAM_BOT_TOKEN,bot:process.env.TELEGRAM_BOT_USERNAME||null,yonlendirme:b.settings?.kota_yonlendirme||''});}catch(e){return hata(e.message,401);}}
export async function POST(req){try{const b=await requireOwner(req);const x=await req.json(),s={...(b.settings||{})};
 if(x.islem==='yonlendirme'){const d=String(x.numara||'').replace(/\D/g,'');if(d&&(d.length<10||d.length>13))return hata('Geçerli bir telefon numarası girin.');
  if(d&&b.phone_number&&String(b.phone_number).replace(/\D/g,'').slice(-10)===d.slice(-10))return hata('Bu, aramaları asistana yönlendirdiğiniz numaranın aynısı. Döngü olmaması için başka bir numara girin (ör. ikinci cep telefonu).');
  s.kota_yonlendirme=d||null;}
 else if(x.islem==='telegram'){if(!process.env.TELEGRAM_BOT_TOKEN||!process.env.TELEGRAM_BOT_USERNAME)return hata('Telegram bildirimi henüz açılmadı, yöneticinizle görüşün.');
  s.telegram_kod=crypto.randomBytes(12).toString('hex');const {error}=await adminSb.from('businesses').update({settings:s}).eq('id',b.id);if(error)throw error;
  return ok({link:`https://t.me/${process.env.TELEGRAM_BOT_USERNAME.replace('@','')}?start=${s.telegram_kod}`});}
 else if(x.islem==='telegram_kapat'){delete s.telegram_chat_id;delete s.telegram_kod;}
 else return hata('Bilinmeyen işlem');
 const {error}=await adminSb.from('businesses').update({settings:s}).eq('id',b.id);if(error)throw error;return ok({ok:true});}catch(e){return hata(e.message);}}
