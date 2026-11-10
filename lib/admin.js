import {createClient} from '@supabase/supabase-js';
let c;const get=()=>c||(c=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}));
export const adminSb=new Proxy({},{get:(_,k)=>{const x=get(),v=x[k];return typeof v==='function'?v.bind(x):v;}});
export async function requireAdmin(req){const t=(req.headers.get('authorization')||'').replace('Bearer ','');const {data,error}=await adminSb.auth.getUser(t);if(error||data.user?.email?.toLowerCase()!==process.env.ADMIN_EMAIL.toLowerCase())throw new Error('Yetkisiz');
 // iki adımlı doğrulama açıksa kodla girilmiş (aal2) oturum şart
 let aal='aal1';try{aal=JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).aal||'aal1';}catch{}
 if(aal!=='aal2'){const {data:mf}=await adminSb.auth.admin.mfa.listFactors({userId:data.user.id});if((mf?.factors||[]).some(f=>f.status==='verified'))throw new Error('Yetkisiz');}
 return data.user;}
