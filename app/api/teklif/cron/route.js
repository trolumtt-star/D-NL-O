// Hafta içi sabah ve öğleden sonra arama zincirini yeniden başlatır (gece durduysa). Kapalıysa veya saat dışıysa hiçbir şey yapmaz.
import {NextResponse} from 'next/server';import {sonrakiniAra} from '@/lib/teklif';
export const dynamic='force-dynamic';export const maxDuration=30;
export async function GET(req){const sir=process.env.CRON_SECRET;if(sir&&req.headers.get('authorization')!=='Bearer '+sir)return NextResponse.json({error:'unauthorized'},{status:401});
 try{return NextResponse.json({ok:true,...(await sonrakiniAra())});}catch(e){return NextResponse.json({ok:false,hata:String(e.message||e).slice(0,120)});}}
