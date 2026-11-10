// İşletmeye Telegram'dan anlık bildirim (panel kapalıyken de sipariş/randevu haberi gelsin).
// Gerekli: TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME (Vercel ortam değişkenleri).
import {adminSb} from './admin';import crypto from 'crypto';
export const tgSir=()=>crypto.createHash('sha256').update('dinlio:'+(process.env.TELEGRAM_BOT_TOKEN||'')).digest('hex').slice(0,40);
export async function tg(chat,text){const t=process.env.TELEGRAM_BOT_TOKEN;if(!t||!chat)return false;
 try{const r=await fetch(`https://api.telegram.org/bot${t}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chat,text:String(text).slice(0,3900),disable_web_page_preview:true}),signal:AbortSignal.timeout(5000)});return r.ok;}catch{return false;}}
export async function bildir(bid,text){if(!process.env.TELEGRAM_BOT_TOKEN||!bid)return false;
 const {data:b}=await adminSb.from('businesses').select('settings').eq('id',bid).maybeSingle();const c=b?.settings?.telegram_chat_id;return c?tg(c,text):false;}
// Aşım borcu varken gelen sipariş: Telegram'a içerik gitmez, sadece "kilitli sipariş" haberi gider.
export async function siparisBildir(bid,cid,text){
 try{if(cid){const {data:c}=await adminSb.from('calls').select('asim').eq('id',cid).maybeSingle();
  if(c?.asim){const {data:ok}=await adminSb.rpc('borc_yok',{p_business:bid});if(ok===false)return bildir(bid,'🔒 Yeni sipariş geldi (kilitli). Paket dakikanız bitti; siparişi görmek için panelden aşım ücretini ödeyin.');}}}catch{}
 return bildir(bid,text);}
