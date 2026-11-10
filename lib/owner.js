import {adminSb} from './admin';
export async function requireOwner(req){const t=(req.headers.get('authorization')||'').replace('Bearer ','');const {data,error}=await adminSb.auth.getUser(t);if(error||!data.user)throw new Error('Giriş gerekli');
 let aal='aal1';try{aal=JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).aal||'aal1';}catch{}
 if(aal!=='aal2'){const {data:mf}=await adminSb.auth.admin.mfa.listFactors({userId:data.user.id});if((mf?.factors||[]).some(f=>f.status==='verified'))throw new Error('Giriş gerekli');}
 const {data:b}=await adminSb.from('businesses').select('*').eq('owner_id',data.user.id).maybeSingle();if(!b)throw new Error('İşletme bulunamadı');return b;}
