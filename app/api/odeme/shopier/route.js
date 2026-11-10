// Shopier ödeme sonrası buraya POST eder (Shopier panelinde "Geri dönüş URL" olarak bu adres girilir).
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {shopierDogrula} from '@/lib/shopier';import {dakikaOnayla} from '@/lib/dakikaOnay';
export const dynamic='force-dynamic';
const git=(req,q)=>NextResponse.redirect(new URL('/panel?odeme='+q,req.url),303);
export async function POST(req){let p={};try{const ct=req.headers.get('content-type')||'';p=ct.includes('json')?await req.json():Object.fromEntries((await req.formData()).entries());}catch{}
 if(!shopierDogrula(p)){if(process.env.SHOPIER_API_SECRET)await adminSb.from('webhook_events').insert({type:'odeme_reddedildi',payload:{error:'Shopier imzası geçersiz',kod:String(p.platform_order_id||'').slice(0,40)}}).then(()=>{},()=>{});return git(req,'hata');}
 if(String(p.status||'').toLowerCase()!=='success'){await adminSb.from('dakika_siparisleri').update({durum:'iptal',odeme_ref:String(p.payment_id||'').slice(0,60)||null}).eq('kod',p.platform_order_id).eq('durum','bekliyor');return git(req,'iptal');}
 try{await dakikaOnayla(String(p.platform_order_id),String(p.payment_id||'').slice(0,60));return git(req,'ok');}catch{return git(req,'hata');}}
export function GET(req){return git(req,'bekle');}
