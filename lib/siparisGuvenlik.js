// SAHTE SİPARİŞ KORUMASI (telefon siparişleri). İşletme Ayarlar'dan değiştirir; varsayılanlar açık.
// - gizli: Numarası gizli arayandan paket servis alınmaz (gel-al alınır).
// - yeniTL: Daha önce hiç sipariş vermemiş numaradan bu tutarın üstündeki paket sipariş "teyit bekliyor" olur (0 = kapalı).
// - saatlik: Aynı numaradan 1 saatte bu kadar ve üstü sipariş gelirse "teyit bekliyor" olur (0 = kapalı).
// Teyit bekleyen sipariş mutfağa "hazırla" diye düşmez; işletme panelden tek tuşla onaylar ya da iptal eder.
import {adminSb} from './admin';
export const SG_VARSAYILAN={gizli:true,yeniTL:600,saatlik:3};
export const sgAyar=st=>({...SG_VARSAYILAN,...(st?.siparis_guvenlik||{})});
export const son10=s=>{const d=String(s||'').replace(/\D/g,'');return d.length>=10?d.slice(-10):'';};
export const gelAlMi=adres=>/gel[\s-]?al|gelip al|dükkandan al|kendim alır|paket değil/i.test(String(adres||''));

// Sipariş metnindeki ürünleri menüyle eşleştirip yaklaşık tutar çıkarır ("2 adana dürüm, bir ayran" → 2×180+30)
const SAYI={bir:1,iki:2,üç:3,uc:3,dört:4,dort:4,beş:5,bes:5,altı:6,alti:6,yedi:7,sekiz:8,dokuz:9,on:10,yarım:0.5,yarim:0.5};
const kucuk=s=>String(s||'').toLocaleLowerCase('tr').replace(/[^\p{L}\p{N} ]/gu,' ').replace(/\s+/g,' ').trim();
export function tutarTahmin(siparis,menu){
 const metin=' '+kucuk(siparis)+' ';let top=0;
 const urunler=(menu||[]).filter(m=>m?.name&&+m.price>0).map(m=>({ad:kucuk(m.name),fiyat:+m.price})).sort((a,b)=>b.ad.length-a.ad.length);
 let kalan=metin;
 for(const u of urunler){if(u.ad.length<2)continue;let i;
  while((i=kalan.indexOf(' '+u.ad+' '))>=0){
   const once=kalan.slice(Math.max(0,i-14),i).trim().split(' ').pop()||'';
   const sonra=kalan.slice(i+u.ad.length+2,i+u.ad.length+14).match(/^(?:[^\d]{0,12}?\s)?x\s?(\d{1,2})\b/);
   const adet=/^\d{1,2}$/.test(once)?+once:SAYI[once]||(sonra?+sonra[1]:1);
   top+=Math.min(adet,50)*u.fiyat;
   kalan=kalan.slice(0,i)+' '+'#'.repeat(u.ad.length)+' '+kalan.slice(i+u.ad.length+2);}}
 return Math.round(top);}

// Kayıttan sonra çağrılır: teyit gerekiyor mu? {sebepler:[], tutar}
export async function teyitKontrol({bid,cid,no,gelAl,siparis,sg}){
 const sebepler=[];let tutar=0;if(!no)return {sebepler,tutar};
 const ara=`caller_phone.ilike.%${no},stated_phone.ilike.%${no}`;
 const saat=new Date(Date.now()-36e5).toISOString();
 const [{count:sonSaat},{count:hic},{data:menu}]=await Promise.all([
  sg.saatlik>0?adminSb.from('calls').select('id',{count:'exact',head:true}).eq('business_id',bid).not('orders','is',null).neq('id',cid).gte('created_at',saat).or(ara):{count:0},
  sg.yeniTL>0&&!gelAl?adminSb.from('calls').select('id',{count:'exact',head:true}).eq('business_id',bid).not('orders','is',null).neq('id',cid).neq('order_status','cancelled').or(ara):{count:1},
  sg.yeniTL>0&&!gelAl?adminSb.from('menu_items').select('name,price').eq('business_id',bid).limit(300):{data:[]}]);
 if(sg.saatlik>0&&(sonSaat||0)+1>=sg.saatlik)sebepler.push(`Bu numaradan son 1 saatte ${(sonSaat||0)+1}. sipariş`);
 if(sg.yeniTL>0&&!gelAl&&!(hic||0)){tutar=tutarTahmin(siparis,menu);if(tutar>=sg.yeniTL)sebepler.push(`İlk kez sipariş veren numaradan yaklaşık ${tutar} TL'lik paket sipariş`);}
 return {sebepler,tutar};}
