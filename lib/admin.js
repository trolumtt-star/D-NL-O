import {createClient} from '@supabase/supabase-js';
export const adminSb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
export async function requireAdmin(req){const t=(req.headers.get('authorization')||'').replace('Bearer ','');const {data,error}=await adminSb.auth.getUser(t);if(error||data.user?.email?.toLowerCase()!==process.env.ADMIN_EMAIL.toLowerCase())throw new Error('Yetkisiz');return data.user;}
