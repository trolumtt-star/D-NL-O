// Geri kazanma aramaları (her gün 14:00 Türkiye, pazar hariç): sadece kampanya aramasına izin veren ve
// işletmenin belirlediği süredir alışveriş yapmayan müşteriler aranır. İşletme başına günlük sınır var.
import {NextResponse} from 'next/server';import {geriKazan} from '@/lib/buyume';
export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(req){
 const sir=process.env.CRON_SECRET;if(sir&&req.headers.get('authorization')!=='Bearer '+sir)return NextResponse.json({error:'unauthorized'},{status:401});
 // Uygun olmayan saatte tetiklenirse arama yapma (Türkiye saatiyle 11:00-19:00 arası)
 const saat=+new Date().toLocaleString('en-GB',{timeZone:'Europe/Istanbul',hour:'2-digit',hour12:false});if(saat<11||saat>=19)return NextResponse.json({ok:true,saatDisi:true});
 try{return NextResponse.json({ok:true,...await geriKazan({butce:45000})});}catch(e){return NextResponse.json({ok:false,hata:String(e.message||e).slice(0,160)});}}
