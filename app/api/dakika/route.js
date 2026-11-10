import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';
import {usdKur} from '@/lib/kur';import {birim,fiyat,SECENEK,EN_AZ,EN_COK} from '@/lib/ekdakika';import {shopierForm} from '@/lib/shopier';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
const yeniKod=()=>'DN'+Date.now().toString(36).toUpperCase().slice(-6)+Math.random().toString(36).slice(2,6).toUpperCase();
export async function GET(req){try{const b=await requireOwner(req);const k=await usdKur(),bi=birim(b);
 const {data:sp}=await adminSb.from('dakika_siparisleri').select('kod,dakika,toplam_tl,yontem,durum,created_at,paid_at').eq('business_id',b.id).order('created_at',{ascending:false}).limit(8);
 return NextResponse.json({birim:bi,kur:k,secenekler:k.usd?SECENEK.map(d=>fiyat(d,bi.usd,k.usd)):[],enAz:EN_AZ,enCok:EN_COK,
  shopier:!!(process.env.SHOPIER_API_KEY&&process.env.SHOPIER_API_SECRET),iban:!!process.env.ODEME_IBAN,siparisler:sp||[]});}
 catch(e){return hata(e.message,401);}}
export async function POST(req){try{const b=await requireOwner(req);const x=await req.json();
 if(x.islem==='bildirdim'){const {error}=await adminSb.from('dakika_siparisleri').update({durum:'bildirildi'}).eq('kod',String(x.kod||'')).eq('business_id',b.id).eq('durum','bekliyor');if(error)throw error;return NextResponse.json({ok:true});}
 if(x.islem==='iptal'){await adminSb.from('dakika_siparisleri').update({durum:'iptal'}).eq('kod',String(x.kod||'')).eq('business_id',b.id).in('durum',['bekliyor']);return NextResponse.json({ok:true});}
 const dk=Math.round(+x.dakika);if(!(dk>=EN_AZ&&dk<=EN_COK))return hata(`En az ${EN_AZ}, en çok ${EN_COK} dakika alınabilir.`);
 const yontem=x.yontem==='shopier'?'shopier':'iban';
 if(yontem==='shopier'&&!(process.env.SHOPIER_API_KEY&&process.env.SHOPIER_API_SECRET))return hata('Kartla ödeme henüz açık değil, havale/EFT ile ödeyebilirsiniz.');
 if(yontem==='iban'&&!process.env.ODEME_IBAN)return hata('Havale bilgisi henüz tanımlı değil, lütfen destekten yazın.');
 const {count}=await adminSb.from('dakika_siparisleri').select('id',{count:'exact',head:true}).eq('business_id',b.id).eq('durum','bekliyor').gte('created_at',new Date(Date.now()-36e5).toISOString());
 if(count>=5)return hata('Çok fazla bekleyen ödeme var, biraz sonra tekrar deneyin.',429);
 const k=await usdKur();if(!k.usd)return hata('Döviz kuru şu an alınamadı, birkaç dakika sonra tekrar deneyin.',503);
 const bi=birim(b),f=fiyat(dk,bi.usd,k.usd),kod=yeniKod();
 const {error}=await adminSb.from('dakika_siparisleri').insert({kod,business_id:b.id,dakika:dk,birim_usd:bi.usd,usd:f.usd,kur:k.usd,tl_kdvsiz:f.tl_kdvsiz,kdv:f.kdv,toplam_tl:f.toplam_tl,yontem});if(error)throw error;
 if(yontem==='iban')return NextResponse.json({kod,...f,iban:process.env.ODEME_IBAN,ad:process.env.ODEME_AD||'',banka:process.env.ODEME_BANKA||''});
 return NextResponse.json({kod,...f,form:shopierForm({kod,toplam:f.toplam_tl,urun:`Dinlio AI ${dk} ek dakika`,b,eposta:x.eposta})});}
 catch(e){return hata(e.message,e.message==='Giriş gerekli'?401:400);}}
