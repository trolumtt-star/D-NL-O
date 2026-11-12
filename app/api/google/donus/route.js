// Google'dan dönüş: kod → yenileme anahtarı, işletmeye kaydedilir. state imzalı ve 15 dk geçerli.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {stateCoz,kodDegistir} from '@/lib/google';
export const dynamic='force-dynamic';
export async function GET(req){const u=new URL(req.url),bid=stateCoz(u.searchParams.get('state')),code=u.searchParams.get('code');
 const git=d=>NextResponse.redirect(new URL('/panel?takvim='+d,u.origin));
 if(!bid||!code)return git('hata');
 try{const j=await kodDegistir(code);if(!j.refresh_token)return git('hata');
  let eposta=null;try{const p=JSON.parse(Buffer.from(String(j.id_token||'').split('.')[1]||'','base64url').toString()||'{}');eposta=p.email||null;}catch{}
  await adminSb.from('google_baglanti').upsert({business_id:bid,refresh_token:j.refresh_token,eposta});return git('ok');}catch{return git('hata');}}
