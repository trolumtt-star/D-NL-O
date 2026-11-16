// Konumdan adres (herkese açık, satın alma formu için; kaydetmez). IP başına günde 30 istek.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {tersAdres} from '@/lib/harita';import crypto from 'crypto';
export const dynamic='force-dynamic';
export async function GET(req){const u=new URL(req.url),ip=(req.headers.get('x-forwarded-for')||'').split(',')[0].trim()||'?',h=crypto.createHash('sha256').update('adres'+ip).digest('hex').slice(0,24);
 const {count}=await adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('type','adres_bul').eq('payload->>ip',h).gte('created_at',new Date(Date.now()-864e5).toISOString());
 if(count>=30)return NextResponse.json({error:'Çok fazla istek, adresi elle yazın.'},{status:429});
 {const {count:top}=await adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('type','adres_bul').gte('created_at',new Date(Date.now()-864e5).toISOString());if(top>=3000)return NextResponse.json({error:'Şu an adres bulunamıyor, elle yazın.'},{status:429});}
 await adminSb.from('webhook_events').insert({type:'adres_bul',payload:{ip:h}});
 const r=await tersAdres(u.searchParams.get('lat'),u.searchParams.get('lng'));if(!r)return NextResponse.json({error:'Adres bulunamadı, elle yazın.'},{status:404});
 return NextResponse.json(r,{headers:{'cache-control':'no-store'}});}
