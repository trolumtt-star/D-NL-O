import {createClient} from '@supabase/supabase-js';
let c;const get=()=>c||(c=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}));
export const adminSb=new Proxy({},{get:(_,k)=>{const x=get(),v=x[k];return typeof v==='function'?v.bind(x):v;}});
export async function requireAdmin(req){const u=await adminKontrol(req);try{await (await import('./adminGiris')).adminGirisKaydet(req);}catch{}return u;}
// Admin e-postası doğru ama Google/2 adımlı kontrolü geçemeyen istek şüphelidir: admin'e haber verilir
async function adminKontrol(req){const t=(req.headers.get('authorization')||'').replace('Bearer ','');const {data,error}=await adminSb.auth.getUser(t);if(error||data.user?.email?.toLowerCase()!==process.env.ADMIN_EMAIL.toLowerCase())throw new Error('Yetkisiz');
 try{return await adminIkinci(t,data);}catch(e){
  // Sadece Google'sız (şifreyle) giriş denemesi uyarılır; 2 adımlı kod girilmeden önceki istekler normal giriş akışının parçası
  if(/Google/.test(e.message))try{await (await import('./adminGiris')).adminSupheli(req,'Admin e-postasıyla şifreyle (Google olmadan) giriş yapıldı ve engellendi.');}catch{}
  throw e;}}
async function adminIkinci(t,data){
 // Admin hesabında 2 adımlı doğrulama açıksa API de kodla girilmiş oturum (aal2) ister; sadece şifreyle alınan oturum reddedilir.
 // Admin sadece Google ile girilmiş oturumla çalışır (şifreyle açılan oturum reddedilir)
 {let pl={};try{pl=JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString());}catch{}
  if(!(Array.isArray(pl.amr)&&pl.amr.some(x=>x?.method==='oauth')))throw new Error('Yetkisiz: Admin girişi sadece Google ile yapılabilir');}
 {let aal='aal1';try{aal=JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).aal||'aal1';}catch{}
  if(aal!=='aal2'){const {data:mf}=await get().auth.admin.mfa.listFactors({userId:data.user.id});if((mf?.factors||[]).some(f=>f.status==='verified'))throw new Error('Yetkisiz: 2 adımlı doğrulama kodu gerekli');}}
 // iki adımlı doğrulama açıksa kodla girilmiş (aal2) oturum şart
 let aal='aal1';try{aal=JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).aal||'aal1';}catch{}
 if(aal!=='aal2'){const {data:mf}=await adminSb.auth.admin.mfa.listFactors({userId:data.user.id});if((mf?.factors||[]).some(f=>f.status==='verified'))throw new Error('Yetkisiz');}
 return data.user;}
