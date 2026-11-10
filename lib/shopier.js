// SHOPIER ödeme: imzalı form üretir ve geri dönüşü (callback) doğrular.
// Vercel: SHOPIER_API_KEY, SHOPIER_API_SECRET (Shopier panel > Entegrasyonlar > Modül Yönetimi). Asla koda yazılmaz.
import crypto from 'crypto';
export const SHOPIER_URL='https://www.shopier.com/ShowProduct/api_pay4.php';
const imza=(veri)=>crypto.createHmac('sha256',process.env.SHOPIER_API_SECRET).update(veri).digest('base64');
const t=(s,n)=>String(s||'').replace(/[<>"]/g,'').trim().slice(0,n);
export function shopierForm({kod,toplam,urun,b,alici={}}){
 const ad=[t(alici.ad,40)||t(b.name,40),t(alici.soyad,40)||'İşletmesi'],k=b.settings?.konum||{},mail=t(alici.eposta,120);
 const tel=String(alici.tel||b.phone_number||'').replace(/\D/g,'').slice(-10),adres=t(k.adres||k.ad||'Türkiye',200),sehir=t(k.il||'İstanbul',40);
 const f={API_key:process.env.SHOPIER_API_KEY,website_index:'1',platform_order_id:kod,product_name:t(urun,90),product_type:'1',
  buyer_name:ad[0],buyer_surname:ad[1],buyer_email:mail,buyer_account_age:'0',buyer_id_nr:String(b.id).slice(0,8),buyer_phone:'0'+tel,
  billing_address:adres,billing_city:sehir,billing_country:'Türkiye',billing_postcode:'34000',shipping_address:adres,shipping_city:sehir,shipping_country:'Türkiye',shipping_postcode:'34000',
  total_order_value:Number(toplam).toFixed(2),currency:'0',platform:'0',is_in_frame:'0',current_language:'0',modul_version:'1.0.4',random_nr:String(crypto.randomInt(100000,999999))};
 f.signature=imza(f.random_nr+f.platform_order_id+f.total_order_value+f.currency);
 return {action:SHOPIER_URL,fields:f};}
export function shopierDogrula(p){const sec=process.env.SHOPIER_API_SECRET;if(!sec||!p?.signature||!p.random_nr||!p.platform_order_id)return false;
 const a=Buffer.from(String(p.signature),'base64'),b=crypto.createHmac('sha256',sec).update(String(p.random_nr)+String(p.platform_order_id)).digest();
 return a.length===b.length&&crypto.timingSafeEqual(a,b);}
