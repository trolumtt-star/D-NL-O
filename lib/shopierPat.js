// SHOPIER yeni REST API (Kişisel Erişim Anahtarı, Vercel: SHOPIER_PAT).
// Her ödeme için gizli (customListing), tek stoklu dijital bir ürün açılır; müşteri ürünün Shopier sayfasında öder.
// Ödeme doğrulaması gelen bildirime güvenmez: siparişler Shopier'den anahtarla tekrar okunur, ürün kimliği eşleşirse dakika eklenir.
import {adminSb} from './admin';import {dakikaOnayla} from './dakikaOnay';
const BASE=()=>process.env.SHOPIER_API_BASE||'https://api.shopier.com/v1';
export const patVar=()=>!!process.env.SHOPIER_PAT;
export async function sapi(m,p,b){const r=await fetch(BASE()+p,{method:m,headers:{authorization:'Bearer '+process.env.SHOPIER_PAT,accept:'application/json',...(b?{'content-type':'application/json'}:{})},body:b?JSON.stringify(b):undefined,signal:AbortSignal.timeout(9000)});
 const t=await r.text();let d=null;try{d=JSON.parse(t);}catch{}return {ok:r.ok,durum:r.status,d,t};}
export async function urunAc({kod,baslik,toplam}){
 const r=await sapi('POST','/products',{title:String(baslik).slice(0,90),description:`Dinlio AI ödeme kodu: ${kod}. Bu ürün size özel oluşturulmuştur.`,type:'digital',
  media:[{url:'https://dinlio.vercel.app/icon-512.png',type:'image',placement:1}],priceData:{currency:'TRY',price:Number(toplam).toFixed(2)},shippingPayer:'sellerPays',stockQuantity:1,customListing:true});
 if(!r.ok||!r.d?.id||!r.d?.url)throw new Error('Shopier ödeme sayfası açılamadı ('+r.durum+' '+(r.d?.message||'')+')');
 if(r.d.stockQuantity<1){await sapi('PUT','/products/'+r.d.id,{stockQuantity:1}).catch(()=>{});}
 return {id:String(r.d.id),url:r.d.url};}
export const urunSil=id=>id?sapi('DELETE','/products/'+encodeURIComponent(id)).catch(()=>null):null;
// Bekleyen Shopier ödemelerini Shopier siparişleriyle karşılaştırır. (webhook, panel ve cron çağırır)
// Aynı sunucu örneğinde kısa sürede tekrar tekrar Shopier'e sorulmasın (kötüye kullanım / hız sınırı koruması)
const sonKontrol=new Map();
export async function odemeleriKontrol({businessId=null,kod=null}={}){
 if(!patVar())return {kontrol:0};
 const anahtar=businessId||'hepsi',simdi=Date.now();if(simdi-(sonKontrol.get(anahtar)||0)<4000)return {kontrol:0,bekle:true};sonKontrol.set(anahtar,simdi);if(sonKontrol.size>500)sonKontrol.clear();
 let q=adminSb.from('dakika_siparisleri').select('kod,odeme_ref,created_at').eq('yontem','shopier').in('durum',['bekliyor','bildirildi']).not('odeme_ref','is',null);
 if(businessId)q=q.eq('business_id',businessId);if(kod)q=q.eq('kod',kod);
 const {data:bek}=await q.limit(50);if(!bek?.length)return {kontrol:0};
 const r=await sapi('GET','/orders?limit=50');const siparisler=Array.isArray(r.d)?r.d:(r.d?.data||r.d?.orders||[]);
 let eklenen=0;
 for(const o of bek){const urunId=String(o.odeme_ref);
  const sip=siparisler.find(s=>{const j=JSON.stringify(s);return [`"${urunId}"`,`:${urunId},`,`:${urunId}}`].some(x=>j.includes(x))&&!/"(status|paymentStatus)":"(cancel|refund|fail)/i.test(j);});
  if(sip){const r2=await dakikaOnayla(o.kod,'shopier:'+String(sip.id||'').slice(0,40));if(r2?.ok)eklenen++;await urunSil(urunId);continue;}
  // 2 saatte ödenmeyen ödeme sayfasını kapat
  if(Date.now()-new Date(o.created_at).getTime()>2*36e5){await urunSil(urunId);await adminSb.from('dakika_siparisleri').update({durum:'iptal'}).eq('kod',o.kod).in('durum',['bekliyor','bildirildi']);}}
 return {kontrol:bek.length,eklenen};}
