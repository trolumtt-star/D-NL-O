import {extract} from '@/lib/gemini';
export const dynamic='force-dynamic';
export async function GET(req){const e=process.env;
 if(new URL(req.url).searchParams.get('gemini')){const r=await extract('Müşteri: İki dürüm ve bir ayran alacağım. Adresim Adnan Menderes Caddesi. Adım Tuna.','2026-10-27');return Response.json({ok:!r.error,sonuc:r.data,hata:r.error});}
 return Response.json({NEXT_PUBLIC_SUPABASE_URL:!!e.NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_KEY:!!e.NEXT_PUBLIC_SUPABASE_KEY,NEXT_PUBLIC_ADMIN_EMAIL:!!e.NEXT_PUBLIC_ADMIN_EMAIL,ADMIN_EMAIL:!!e.ADMIN_EMAIL,SUPABASE_SERVICE_ROLE_KEY:!!e.SUPABASE_SERVICE_ROLE_KEY,VAPI_SECRET:!!e.VAPI_SECRET,GEMINI_API_KEY:!!e.GEMINI_API_KEY});}
