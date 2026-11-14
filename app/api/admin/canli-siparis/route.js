import {NextResponse} from 'next/server';import {requireAdmin} from '@/lib/admin';import {araclariKur} from '@/lib/asistanKur';
export const dynamic='force-dynamic';export const maxDuration=45;
// Sektöre göre gereken bütün Vapi araçlarını kurar (asıl iş lib/asistanKur.js içinde).
export async function POST(req){try{await requireAdmin(req);const {business_id}=await req.json();return NextResponse.json(await araclariKur(business_id,new URL(req.url).origin));}
 catch(e){return NextResponse.json({error:e.message},{status:e.message==='Yetkisiz'?401:400});}}
