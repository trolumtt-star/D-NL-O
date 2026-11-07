import {extract} from '@/lib/gemini';import {requireAdmin} from '@/lib/admin';
export const dynamic='force-dynamic';
export async function GET(req){try{await requireAdmin(req);}catch{return Response.json({error:'unauthorized'},{status:401});}
 const e=process.env;
 if(new URL(req.url).searchParams.get('gemini')){const r=await extract('Müşteri: İki dürüm ve bir ayran alacağım. Adresim Adnan Menderes Caddesi. Adım Tuna.','2026-10-27');return Response.json({ok:!r.error,sonuc:r.data,hata:r.error});}
 return Response.json({NEXT_PUBLIC_SUPABASE_URL:!!e.NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_KEY:!!e.NEXT_PUBLIC_SUPABASE_KEY,ADMIN_EMAIL:!!e.ADMIN_EMAIL,SUPABASE_SERVICE_ROLE_KEY:!!e.SUPABASE_SERVICE_ROLE_KEY,VAPI_SECRET:!!e.VAPI_SECRET,VAPI_API_KEY:!!e.VAPI_API_KEY,GEMINI_API_KEY:!!e.GEMINI_API_KEY});}
