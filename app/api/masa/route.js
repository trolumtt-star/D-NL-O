// MASADAN QR SİPARİŞ (herkese açık uç). Masa QR'ındaki imza (t) doğru değilse sipariş ve çağrı kabul edilmez; menü yine görülebilir.
// Fiyatlar müşteriden değil menüden okunur. Sınırlar: masa başına saatte 8, cihaz (IP) başına saatte 10 sipariş; aynı masadan 2 dakikada bir garson/hesap çağrısı.
import {NextResponse} from 'next/server';import crypto from 'crypto';import {adminSb} from '@/lib/admin';import {qrIsletme,qrAcik,imzaDogru,sepetHesapla} from '@/lib/mutfak';import {bildir} from '@/lib/bildir';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
const ipHash=req=>crypto.createHash('sha256').update('masa:'+(req.headers.get('x-forwarded-for')||'').split(',')[0].trim()).digest('hex').slice(0,20);
const masaNo=(b,m)=>{const n=Math.round(+m||0);return n>=1&&n<=Math.max(1,Math.min(100,+b.table_count||0))?n:null;};
export async function GET(req){const u=new URL(req.url).searchParams;const b=await qrIsletme(u.get('k'));if(!b)return hata('Menü bulunamadı.',404);
 const {data:m}=await adminSb.from('menu_items').select('id,name,price,category').eq('business_id',b.id).neq('available',false).order('category').order('name').limit(400);
 const masa=masaNo(b,u.get('m'));
 return NextResponse.json({isletme:b.name,siparisAcik:qrAcik(b),masa,dogru:!!(masa&&imzaDogru(b.settings?.qr?.gizli,masa,u.get('t'))),
  menu:(m||[]).map(x=>({id:x.id,ad:x.name,fiyat:+x.price||0,kategori:x.category||'Diğer'}))});}
export async function POST(req){try{const x=await req.json();const b=await qrIsletme(x.k);if(!b)return hata('Menü bulunamadı.',404);
 if(!qrAcik(b))return hata('Bu işletmede masadan sipariş şu an kapalı. Lütfen garsona söyleyin.',403);
 const masa=masaNo(b,x.m);if(!masa||!imzaDogru(b.settings?.qr?.gizli,masa,x.t))return hata('Masadaki QR kodunu okutun.',403);
 const ip=ipHash(req),saat=new Date(Date.now()-36e5).toISOString();
 if(x.islem==='cagri'){const tur=x.tur==='hesap'?'hesap':'garson';
  const {count}=await adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('business_id',b.id).eq('type','masa_cagri').eq('payload->>masa',String(masa)).eq('payload->>tur',tur).gte('created_at',new Date(Date.now()-2*6e4).toISOString());
  if(!count){await adminSb.from('webhook_events').insert({type:'masa_cagri',business_id:b.id,payload:{masa,tur,ip}});
   try{await bildir(b.id,`${tur==='hesap'?'💳 Masa '+masa+' hesap istiyor':'🙋 Masa '+masa+' garson çağırıyor'}`);}catch{}}
  return NextResponse.json({ok:true,mesaj:tur==='hesap'?'Hesabınız geliyor.':'Garson geliyor.'});}
 // Sipariş
 const oturum=String(x.oturum||'');if(!/^[A-Za-z0-9_-]{12,40}$/.test(oturum))return hata('Oturum geçersiz, sayfayı yenileyin.');
 const s=await sepetHesapla(b.id,x.sepet);if(!s.satirlar.length)return hata('Sepet boş ya da ürünler artık mevcut değil.');
 const [{count:masaSaat},{count:ipSaat}]=await Promise.all([
  adminSb.from('calls').select('id',{count:'exact',head:true}).eq('business_id',b.id).eq('extracted->>kaynak','qr').eq('extracted->>masa',String(masa)).gte('created_at',saat),
  adminSb.from('calls').select('id',{count:'exact',head:true}).eq('extracted->>kaynak','qr').eq('extracted->>ip',ip).gte('created_at',saat)]);
 if((masaSaat||0)>=8||(ipSaat||0)>=10)return hata('Çok fazla sipariş gönderildi. Lütfen garsona söyleyin.',429);
 let masaOnay='onayli';
 if(b.settings?.qr?.garsonOnay){const {count:onayli}=await adminSb.from('calls').select('id',{count:'exact',head:true}).eq('business_id',b.id).eq('extracted->>oturum',oturum).eq('extracted->>masa',String(masa)).eq('extracted->>masaOnay','onayli').gte('created_at',new Date(Date.now()-4*36e5).toISOString());
  if(!onayli)masaOnay='bekliyor';}
 const not=String(x.not||'').replace(/[{}%<>]/g,'').trim().slice(0,200);
 const {data:c,error}=await adminSb.from('calls').insert({business_id:b.id,customer_name:'Masa '+masa,orders:s.metin.slice(0,600),order_status:'new',status:'completed',duration_seconds:0,
  extracted:{kaynak:'qr',masa,not,tutar:s.tutar,oturum,masaOnay,ip,kalemler:s.satirlar}}).select('id').single();
 if(error)return hata('Sipariş kaydedilemedi, lütfen garsona söyleyin.',500);
 try{await bildir(b.id,`🍽 Masa ${masa} sipariş${masaOnay==='bekliyor'?' (garson onayı bekliyor)':''}\n${s.metin}${not?'\n📝 '+not:''}\n≈ ${s.tutar} TL`);}catch{}
 return NextResponse.json({ok:true,id:c.id,masaOnay,tutar:s.tutar,mesaj:masaOnay==='bekliyor'?'Siparişiniz alındı. Garsonumuz masanızı onaylayınca hazırlanmaya başlayacak.':'Siparişiniz mutfağa iletildi. Afiyet olsun!'});
 }catch(e){return hata('İşlem yapılamadı.',500);}}
