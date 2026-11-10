import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {dakikaOnayla} from '@/lib/dakikaOnay';
export const dynamic='force-dynamic';
export async function GET(req){try{await requireAdmin(req);
 const {data,error}=await adminSb.from('dakika_siparisleri').select('kod,dakika,toplam_tl,usd,yontem,durum,created_at,paid_at,odeme_ref,businesses(name)').order('created_at',{ascending:false}).limit(60);if(error)throw error;
 return NextResponse.json({liste:data});}catch(e){return NextResponse.json({error:e.message},{status:e.message==='Yetkisiz'?401:400});}}
export async function POST(req){try{await requireAdmin(req);const {kod,islem}=await req.json();
 if(islem==='onayla'){const r=await dakikaOnayla(String(kod),'havale');return NextResponse.json(r);}
 if(islem==='iptal'){await adminSb.from('dakika_siparisleri').update({durum:'iptal'}).eq('kod',String(kod)).in('durum',['bekliyor','bildirildi']);return NextResponse.json({ok:true});}
 throw new Error('Geçersiz işlem');}catch(e){return NextResponse.json({error:e.message},{status:e.message==='Yetkisiz'?401:400});}}
