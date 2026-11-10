import {NextResponse} from 'next/server';import {requireAdmin} from '@/lib/admin';import {tgSir} from '@/lib/bildir';
export const dynamic='force-dynamic';
// Telegram botunun webhook adresini bu siteye ayarlar (bir kere basmak yeterli).
export async function POST(req){try{await requireAdmin(req);const t=process.env.TELEGRAM_BOT_TOKEN;if(!t)throw new Error('Vercel\'de TELEGRAM_BOT_TOKEN tanımlı değil.');
 const url=new URL(req.url).origin+'/api/telegram';const r=await fetch(`https://api.telegram.org/bot${t}/setWebhook`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url,secret_token:tgSir(),allowed_updates:['message']}),signal:AbortSignal.timeout(8000)});
 const j=await r.json();if(!j.ok)throw new Error('Telegram: '+(j.description||r.status));return NextResponse.json({ok:true,url});}catch(e){return NextResponse.json({error:e.message},{status:e.message==='Yetkisiz'?401:400});}}
