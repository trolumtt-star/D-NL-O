// İşletmeye bildirim: panelin "Bildirimler" sekmesine düşer, panel açıksa anında
// küçük uyarı (toast) ve sesle görünür; bildirimleri açan telefonlara da anlık bildirim gider.
import {adminSb} from './admin';import {pushGonder} from './push';
export async function bildir(bid,text,kind='bildirim'){
 if(!bid||!text)return false;
 const satir=String(text).trim().split('\n'),title=satir[0].slice(0,140),body=satir.slice(1).join('\n').slice(0,1200)||null;
 const {error}=await adminSb.from('alerts').insert({business_id:bid,kind,title,body});
 try{await Promise.race([pushGonder(bid,{title,body:body||'',tag:kind}),new Promise(r=>setTimeout(r,4000))]);}catch{}
 return !error;
}
// Aşım borcu varken gelen sipariş: içerik gösterilmez, sadece "kilitli sipariş" haberi düşer.
export async function siparisBildir(bid,cid,text){
 try{if(cid){const {data:c}=await adminSb.from('calls').select('asim').eq('id',cid).maybeSingle();
  if(c?.asim){const {data:ok}=await adminSb.rpc('borc_yok',{p_business:bid});if(ok===false)return bildir(bid,'🔒 Yeni sipariş geldi (kilitli). Paket dakikanız bitti; siparişi görmek için panelden aşım ücretini ödeyin.');}}}catch{}
 return bildir(bid,text);
}
