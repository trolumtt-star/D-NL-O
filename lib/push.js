// Telefon / tarayıcı bildirimi (Web Push). Panel kapalıyken de "Yeni sipariş" bildirimi gelir.
// VAPID anahtarları ilk kullanımda otomatik üretilir ve veritabanında (sadece sunucunun okuyabildiği) saklanır.
import crypto from 'crypto';import {adminSb} from './admin';
const b64u=b=>Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
let anahtar=null;
export async function vapid(){if(anahtar)return anahtar;
 const {data}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','vapid').maybeSingle();
 if(data?.deger?.pub&&data?.deger?.priv)return (anahtar=data.deger);
 const e=crypto.createECDH('prime256v1');e.generateKeys();const yeni={pub:b64u(e.getPublicKey()),priv:b64u(e.getPrivateKey())};
 const {error}=await adminSb.from('sistem_ayarlari').insert({anahtar:'vapid',deger:yeni});
 if(error){const {data:d2}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','vapid').maybeSingle();return (anahtar=d2?.deger||yeni);}
 return (anahtar=yeni);}
let wp=null;
const lib=async()=>{if(wp)return wp;const m=await import('web-push');wp=m.default||m;const k=await vapid();wp.setVapidDetails('mailto:destek@dinlio.app',k.pub,k.priv);return wp;};
export async function pushGonder(bid,{title,body,url='/panel',tag}){
 if(!bid)return 0;
 const {data:l}=await adminSb.from('push_abonelik').select('id,endpoint,p256dh,auth').eq('business_id',bid).limit(20);
 if(!l?.length)return 0;
 let w;try{w=await lib();}catch{return 0;}
 const veri=JSON.stringify({title:String(title||'Dinlio AI').slice(0,120),body:String(body||'').slice(0,300),url,tag:tag||undefined});
 let n=0;
 await Promise.all(l.map(async a=>{try{await w.sendNotification({endpoint:a.endpoint,keys:{p256dh:a.p256dh,auth:a.auth}},veri,{TTL:3600,urgency:'high',timeout:5000});n++;}
  catch(e){if([404,410].includes(e?.statusCode))await adminSb.from('push_abonelik').delete().eq('id',a.id);}}));
 return n;}
