// Çalışan hesapları: işletme sahibi açar/siler, şifre yeniler. Çalışan sadece randevu ekranını görür.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
const U=/^[a-z0-9._-]{3,30}$/;
export async function GET(req){try{const b=await requireOwner(req);
 const {data}=await adminSb.from('calisanlar').select('id,ad,username,resource_id,created_at').eq('business_id',b.id).order('created_at');
 return NextResponse.json({liste:data||[]});}catch(e){return hata(e.message,401);}}
export async function POST(req){try{const b=await requireOwner(req);const x=await req.json();
 if(x.islem==='ekle'){
  const ad=String(x.ad||'').trim().slice(0,60),u=String(x.username||'').trim().toLowerCase(),sifre=String(x.sifre||'');
  if(ad.length<2)return hata('Çalışanın adını girin.');
  if(!U.test(u))return hata('Kullanıcı adı 3-30 karakter olmalı; sadece küçük harf, rakam, nokta, tire.');
  if(sifre.length<8)return hata('Şifre en az 8 karakter olmalı.');
  const {count}=await adminSb.from('calisanlar').select('id',{count:'exact',head:true}).eq('business_id',b.id);
  if(count>=20)return hata('En fazla 20 çalışan hesabı açabilirsiniz.');
  const {data:nu,error:e1}=await adminSb.auth.admin.createUser({email:u+'@isletme.panel',password:sifre,email_confirm:true,user_metadata:{rol:'calisan',isletme:b.id}});
  if(e1)return hata(/already/i.test(e1.message)?'Bu kullanıcı adı alınmış, başka bir tane deneyin.':e1.message);
  let rid=x.resource_id&&/^[0-9a-f-]{36}$/.test(x.resource_id)?x.resource_id:null;
  if(rid){const {data:rr}=await adminSb.from('resources').select('id').eq('id',rid).eq('business_id',b.id).maybeSingle();if(!rr)rid=null;}
  const {error:e2}=await adminSb.from('calisanlar').insert({business_id:b.id,user_id:nu.user.id,ad,username:u,resource_id:rid});
  if(e2){await adminSb.auth.admin.deleteUser(nu.user.id);return hata('Kaydedilemedi: '+e2.message);}
  return NextResponse.json({ok:true});}
 const {data:c}=await adminSb.from('calisanlar').select('id,user_id').eq('id',String(x.id||'')).eq('business_id',b.id).maybeSingle();
 if(!c)return hata('Çalışan bulunamadı.');
 if(x.islem==='sil'){const {error}=await adminSb.auth.admin.deleteUser(c.user_id);if(error)return hata(error.message);return NextResponse.json({ok:true});}
 if(x.islem==='sifre'){const sifre=String(x.sifre||'');if(sifre.length<8)return hata('Şifre en az 8 karakter olmalı.');
  const {error}=await adminSb.auth.admin.updateUserById(c.user_id,{password:sifre});if(error)return hata(error.message);return NextResponse.json({ok:true});}
 if(x.islem==='usta'){let rid=x.resource_id&&/^[0-9a-f-]{36}$/.test(x.resource_id)?x.resource_id:null;
  if(rid){const {data:rr}=await adminSb.from('resources').select('id').eq('id',rid).eq('business_id',b.id).maybeSingle();if(!rr)return hata('Bu kişi ekibinizde yok.');}
  await adminSb.from('calisanlar').update({resource_id:rid}).eq('id',c.id);return NextResponse.json({ok:true});}
 return hata('Geçersiz işlem');}catch(e){return hata(e.message,e.message==='Giriş gerekli'?401:400);}}
