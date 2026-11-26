// ADMIN YAPILACAKLAR: sistemin kendi başına çözemediği işler (eksik kurulum, numara havuzu azaldı, ödeme işlenemedi, araç hataları…)
// Admin panelinde "Yapılacaklar" kutusunda görünür, admin telefonuna bildirim (ve Resend bağlıysa e-posta) gider.
// Aynı anahtarla açık bir iş varsa yenisi açılmaz ve bildirim tekrar gitmez (spam olmaz).
import {adminSb} from './admin';import {epostaGonder,epostaHazir,esc} from './entegrasyon';import {vapid} from './push';
let wp=null;
const lib=async()=>{if(wp)return wp;const m=await import('web-push');wp=m.default||m;const k=await vapid();wp.setVapidDetails('mailto:destek@dinlio.app',k.pub,k.priv);return wp;};
export async function adminPush({title,body,tag}){
 const {data:l}=await adminSb.from('push_abonelik').select('id,endpoint,p256dh,auth').eq('admin',true).limit(10);
 if(!l?.length)return 0;let w;try{w=await lib();}catch{return 0;}
 const veri=JSON.stringify({title:String(title||'Dinlio Admin').slice(0,120),body:String(body||'').slice(0,300),url:'/admin',tag:tag||undefined});let n=0;
 await Promise.all(l.map(async a=>{try{await w.sendNotification({endpoint:a.endpoint,keys:{p256dh:a.p256dh,auth:a.auth}},veri,{TTL:86400,urgency:'high',timeout:5000});n++;}
  catch(e){if([404,410].includes(e?.statusCode))await adminSb.from('push_abonelik').delete().eq('id',a.id);}}));
 return n;}
export async function adminIs({tur,anahtar,baslik,detay='',business_id=null}){
 try{const {data,error}=await adminSb.from('admin_isler').insert({tur,anahtar:String(anahtar).slice(0,200),baslik:String(baslik).slice(0,200),detay:String(detay||'').slice(0,1500),business_id}).select('id').single();
  if(error)return {ok:false,zaten:error.code==='23505'};
  await adminPush({title:'🛠 '+baslik,body:detay||'Admin panelinde yapılacaklara bakın.',tag:'admin-'+tur}).catch(()=>0);
  if(epostaHazir()&&process.env.ADMIN_EMAIL)await epostaGonder(process.env.ADMIN_EMAIL,'Dinlio: '+baslik,`<p><b>${esc(baslik)}</b></p><p>${esc(detay).replace(/\n/g,'<br>')}</p><p>Admin paneli → Genel bakış → Yapılacaklar</p>`).catch(()=>{});
  return {ok:true,id:data.id};}catch{return {ok:false};}}
// İş kendiliğinden çözüldüyse (ör. havuza numara eklendi) kapat
export async function adminIsKapat(anahtar){try{await adminSb.from('admin_isler').update({cozuldu_at:new Date().toISOString()}).eq('anahtar',anahtar).is('cozuldu_at',null);}catch{}}
