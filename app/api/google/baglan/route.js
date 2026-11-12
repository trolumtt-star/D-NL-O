// İşletme sahibi: Google Takvim bağlantı linki al / bağlantıyı kaldır.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';import {paketOf,enAzPaket} from '@/lib/paket';import {baglantiLinki} from '@/lib/google';
export const dynamic='force-dynamic';
export async function GET(req){try{const b=await requireOwner(req);
 const {data:g}=await adminSb.from('google_baglanti').select('eposta,created_at').eq('business_id',b.id).maybeSingle();
 return NextResponse.json({hazir:!!(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET),izin:paketOf(b).takvim,enAz:enAzPaket('takvim'),bagli:!!g,eposta:g?.eposta||null});}catch(e){return NextResponse.json({error:e.message},{status:401});}}
export async function POST(req){try{const b=await requireOwner(req);const x=await req.json();
 if(x.islem==='kaldir'){await adminSb.from('google_baglanti').delete().eq('business_id',b.id);return NextResponse.json({ok:true});}
 if(!paketOf(b).takvim)return NextResponse.json({error:`Google Takvim ${enAzPaket('takvim')} paketten itibaren açılır.`},{status:400});
 if(!process.env.GOOGLE_CLIENT_ID)return NextResponse.json({error:'Google Takvim bağlantısı henüz açılmadı.'},{status:400});
 return NextResponse.json({link:baglantiLinki(b.id)});}catch(e){return NextResponse.json({error:e.message},{status:401});}}
