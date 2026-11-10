import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {kdvSifirla} from '@/lib/sistem';
export const dynamic='force-dynamic';
export async function GET(req){try{await requireAdmin(req);const {data}=await adminSb.from('sistem_ayarlari').select('anahtar,deger');return NextResponse.json(Object.fromEntries((data||[]).map(x=>[x.anahtar,x.deger])));}catch(e){return NextResponse.json({error:e.message},{status:401});}}
export async function POST(req){try{await requireAdmin(req);const x=await req.json();
 if(x.kdv){const d={acik:!!x.kdv.acik,oran:0.20};const {error}=await adminSb.from('sistem_ayarlari').upsert({anahtar:'kdv',deger:d,updated_at:new Date().toISOString()});if(error)throw error;kdvSifirla();return NextResponse.json({ok:true,kdv:d});}
 throw new Error('Geçersiz istek');}catch(e){return NextResponse.json({error:e.message},{status:e.message==='Yetkisiz'?401:400});}}
