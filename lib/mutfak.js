// MUTFAK EKRANI ve MASADAN QR SİPARİŞ ortak yardımcıları.
// Mutfak ekranı şifresizdir; işletmeye özel, tahmin edilemeyen bir linkle açılır (settings.mutfak.kod). Panelden yenilenince eski link çalışmaz.
// Masa QR'larında masa numarasına özel imza (HMAC) bulunur; QR gizli anahtarı yenilenince eski QR'lar geçersiz olur.
import crypto from 'crypto';import {adminSb} from './admin';import {paketOf} from './paket';
export const yeniKod=(n=18)=>crypto.randomBytes(n).toString('base64url');
export const kodGecerli=k=>/^[A-Za-z0-9_-]{16,40}$/.test(String(k||''));
export const masaImza=(gizli,masa)=>crypto.createHmac('sha256',String(gizli)).update('masa:'+masa).digest('base64url').slice(0,16);
export const imzaDogru=(gizli,masa,t)=>{if(!gizli||!t)return false;const a=Buffer.from(masaImza(gizli,masa)),b=Buffer.from(String(t));return a.length===b.length&&crypto.timingSafeEqual(a,b);};
const SEC='id,name,status,vertical,quota_minutes_total,table_count,settings';
export async function mutfakIsletme(kod){if(!kodGecerli(kod))return null;
 const {data}=await adminSb.from('businesses').select(SEC).eq('settings->mutfak->>kod',kod).limit(1);const b=data?.[0];
 return b&&b.status!=='suspended'?b:null;}
// QR menü/sipariş: işletmenin herkese açık QR kodu (settings.qr.kod) ile bulunur
export async function qrIsletme(kod){if(!kodGecerli(kod))return null;
 const {data}=await adminSb.from('businesses').select(SEC).eq('settings->qr->>kod',kod).limit(1);const b=data?.[0];
 return b&&b.status!=='suspended'?b:null;}
export const qrAcik=b=>!!(b?.settings?.qr?.acik&&paketOf(b).qrSiparis);
// Sepetten sipariş metni ve tutarı: fiyatlar müşteriden değil, menüden okunur
export async function sepetHesapla(bid,sepet){
 const liste=Array.isArray(sepet)?sepet.slice(0,40):[];const ids=[...new Set(liste.map(x=>String(x?.id||'')).filter(x=>/^[0-9a-f-]{36}$/.test(x)))].slice(0,40);
 if(!ids.length)return {satirlar:[],metin:'',tutar:0};
 const {data:m}=await adminSb.from('menu_items').select('id,name,price,available').eq('business_id',bid).in('id',ids);
 const satirlar=[];for(const x of liste){const u=(m||[]).find(y=>y.id===x?.id);if(!u||u.available===false)continue;const adet=Math.max(1,Math.min(20,Math.round(+x.adet||1)));
  const not=String(x.not||'').replace(/[{}%<>]/g,'').trim().slice(0,80);satirlar.push({id:u.id,ad:u.name,adet,fiyat:+u.price||0,not});}
 return {satirlar,metin:satirlar.map(s=>`${s.adet}× ${s.ad}${s.not?' ('+s.not+')':''}`).join(', '),tutar:satirlar.reduce((t,s)=>t+s.adet*s.fiyat,0)};}
