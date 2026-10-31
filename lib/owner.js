import {adminSb} from './admin';
export async function requireOwner(req){const t=(req.headers.get('authorization')||'').replace('Bearer ','');const {data,error}=await adminSb.auth.getUser(t);if(error||!data.user)throw new Error('Giriş gerekli');
 const {data:b}=await adminSb.from('businesses').select('*').eq('owner_id',data.user.id).maybeSingle();if(!b)throw new Error('İşletme bulunamadı');return b;}
