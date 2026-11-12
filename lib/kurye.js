// DİNLİO GO: kurye çağırma ve ücret hesabı. Para bizden geçmez; işletme kuryeye kendisi öder, biz sadece sayarız.
import crypto from 'crypto';import {adminSb} from './admin';import {kuryePush} from './push';
export const tokenHash=t=>crypto.createHash('sha256').update('go:'+String(t||'')).digest('hex');
export const km=(a,b)=>{const R=6371,r=x=>x*Math.PI/180,dl=r(b.lat-a.lat),dg=r(b.lng-a.lng),h=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
// İşletmenin kurye ayarı (settings.kurye): taban ücret + belli km'den sonra km başı ek
export const kuryeAyar=st=>{const k=st?.kurye||{};return {acik:!!k.acik,taban:Math.max(0,+k.taban||60),esik:Math.max(0,+k.esik||3),kmEk:Math.max(0,+k.km_ek||0),ne_zaman:k.ne_zaman==='gelince'?'gelince':'onay',davet:k.davet||null};};
export const ucretHesap=(ay,uzak)=>Math.round(ay.taban+(uzak!=null&&uzak>ay.esik?Math.ceil(uzak-ay.esik)*ay.kmEk:0));
// Siparişi kuryelere duyur. Zaten duyurulmuş / alınmış siparişte bir şey yapmaz.
export async function kuryeCagir(bid,cid){
 const {data:b}=await adminSb.from('businesses').select('name,settings').eq('id',bid).single();const ay=kuryeAyar(b?.settings);if(!ay.acik)return {ok:false,neden:'Kurye sistemi kapalı'};
 const {data:c}=await adminSb.from('calls').select('id,orders,address,extracted,kurye_durum,asim,order_status').eq('id',cid).eq('business_id',bid).maybeSingle();
 if(!c?.orders)return {ok:false,neden:'Sipariş bulunamadı'};if(c.kurye_durum)return {ok:true,zaten:true};
 if(['done','cancelled'].includes(c.order_status))return {ok:false,neden:'Sipariş kapanmış'};
 if(c.asim){const {data:ok}=await adminSb.rpc('borc_yok',{p_business:bid});if(ok===false)return {ok:false,neden:'Kilitli sipariş'};}
 const kn=c.extracted?.konum,mrk=b.settings?.konum,uzak=kn?.lat&&mrk?.lat?+km({lat:+mrk.lat,lng:+mrk.lng},{lat:+kn.lat,lng:+kn.lng}).toFixed(1):null,ucret=ucretHesap(ay,uzak);
 const {data:u}=await adminSb.from('calls').update({kurye_durum:'bekliyor',kurye_ucret:ucret,kurye_km:uzak,takip_kod:crypto.randomBytes(9).toString('base64url')}).eq('id',cid).is('kurye_durum',null).select('id');
 if(!u?.length)return {ok:true,zaten:true};
 const {data:kl}=await adminSb.from('kurye_isletme').select('kurye_id').eq('business_id',bid).eq('onayli',true);
 const n=await kuryePush((kl||[]).map(x=>x.kurye_id),{title:`🛵 ${b.name||'İşletme'}: yeni paket`,body:`Teslim ücreti ${ucret} ₺${uzak!=null?' · '+uzak+' km':''}${c.address?' · '+String(c.address).slice(0,60):''}`,tag:'paket-'+cid});
 return {ok:true,kurye:(kl||[]).length,bildirim:n,ucret};}
