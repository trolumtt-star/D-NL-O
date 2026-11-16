// Giriş sonrası: bu oturum admin hesabına mı ait ve Google dışında bir yolla mı açıldı? (Admin e-postası sayfaya yazılmasın diye sunucuda)
import {NextResponse} from 'next/server';import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(req){try{const t=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!t)return NextResponse.json({});
 const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const {data,error}=await sb.auth.getUser(t);if(error||!data?.user)return NextResponse.json({});
 const admin=!!process.env.ADMIN_EMAIL&&data.user.email?.toLowerCase()===process.env.ADMIN_EMAIL.toLowerCase();
 let pl={};try{pl=JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString());}catch{}
 const google=Array.isArray(pl.amr)&&pl.amr.some(x=>x?.method==='oauth');
 return NextResponse.json({sadeceGoogle:admin&&!google},{headers:{'cache-control':'no-store'}});}catch{return NextResponse.json({});}}
