// Shopier "order.created" bildirimi. İçeriğe güvenmiyoruz: bekleyen ödemeleri Shopier'den siparişleri okuyarak doğruluyoruz.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {odemeleriKontrol} from '@/lib/shopierPat';
export const dynamic='force-dynamic';export const maxDuration=30;
export async function POST(req){let ham='';try{ham=await req.text();}catch{}
 try{await adminSb.from('webhook_events').insert({type:'shopier_webhook',payload:{imza:!!req.headers.get('shopier-signature'),olay:req.headers.get('shopier-event')||null,boyut:ham.length,ornek:ham.slice(0,1500)}});}catch{}
 try{const r=await odemeleriKontrol();return NextResponse.json({ok:true,...r});}catch(e){return NextResponse.json({ok:false},{status:200});}}
export function GET(){return NextResponse.json({ok:true});}
