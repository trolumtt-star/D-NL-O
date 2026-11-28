import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {kapasiteOlc,kapasiteAyar,SB_PLAN} from '@/lib/kapasite';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function GET(req){try{await requireAdmin(req);}catch(e){return hata(e.message,401);}
 try{return NextResponse.json(await kapasiteOlc());}catch(e){return hata(e.message);}}
export async function POST(req){try{await requireAdmin(req);}catch(e){return hata(e.message,401);}
 const x=await req.json().catch(()=>({})),a=await kapasiteAyar();
 if(x.supabase&&SB_PLAN[x.supabase])a.supabase=x.supabase;
 if(['hobby','pro'].includes(x.vercel))a.vercel=x.vercel;
 if(x.vapiKanal!==undefined){const n=parseInt(x.vapiKanal,10);if(!(n>=1&&n<=1000))return hata('Kanal sayısı 1-1000 arası olmalı.');a.vapiKanal=n;}
 await adminSb.from('sistem_ayarlari').upsert({anahtar:'kapasite',deger:a},{onConflict:'anahtar'});
 return NextResponse.json({ok:true,...await kapasiteOlc()});}
