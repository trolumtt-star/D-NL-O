import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';
import {usdKur} from '@/lib/kur';import {kdvOrani} from '@/lib/sistem';import {birim,fiyat,SECENEK,EN_AZ,EN_COK} from '@/lib/ekdakika';import {shopierForm} from '@/lib/shopier';import {patVar,urunAc,odemeleriKontrol} from '@/lib/shopierPat';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
const yeniKod=()=>'DN'+Date.now().toString(36).toUpperCase().slice(-6)+Math.random().toString(36).slice(2,6).toUpperCase();
const borc=b=>Math.max(0,Math.ceil(((b.quota_seconds_used||0)-((b.quota_minutes_total||0)+(b.ek_dakika||0))*60)/60));
export async function GET(req){try{let b=await requireOwner(req);
 if(patVar()){const r=await odemeleriKontrol({businessId:b.id}).catch(()=>null);if(r?.eklenen)b=await requireOwner(req);}const [k,kd]=await Promise.all([usdKur(),kdvOrani()]),bi=birim(b),bd=borc(b);
 const {data:sp}=await adminSb.from('dakika_siparisleri').select('kod,dakika,toplam_tl,yontem,durum,tur,created_at,paid_at').eq('business_id',b.id).order('created_at',{ascending:false}).limit(8);
 return NextResponse.json({birim:bi,kur:k,kdv:kd,secenekler:k.usd?SECENEK.map(d=>fiyat(d,bi.usd,k.usd,kd)):[],enAz:EN_AZ,enCok:EN_COK,
  shopier:patVar()||!!(process.env.SHOPIER_API_KEY&&process.env.SHOPIER_API_SECRET),iban:!!process.env.ODEME_IBAN,siparisler:sp||[],asim:{acik:!!b.settings?.asim?.acik,limit_dk:b.settings?.asim?.limit_dk||0,borcDk:bd,borc:bd&&k.usd?fiyat(bd,bi.usd,k.usd,kd):null,son:b.settings?.asim_son||null}});}
 catch(e){return hata(e.message,401);}}
export async function POST(req){try{const b=await requireOwner(req);const x=await req.json();
 if(x.islem==='durum'){if(patVar())await odemeleriKontrol({businessId:b.id,kod:String(x.kod||'')}).catch(()=>null);const {data:o}=await adminSb.from('dakika_siparisleri').select('durum').eq('kod',String(x.kod||'')).eq('business_id',b.id).maybeSingle();return NextResponse.json({durum:o?.durum||null});}
 if(x.islem==='bildirdim'){const {error}=await adminSb.from('dakika_siparisleri').update({durum:'bildirildi'}).eq('kod',String(x.kod||'')).eq('business_id',b.id).eq('durum','bekliyor');if(error)throw error;return NextResponse.json({ok:true});}
 if(x.islem==='iptal'){await adminSb.from('dakika_siparisleri').update({durum:'iptal'}).eq('kod',String(x.kod||'')).eq('business_id',b.id).in('durum',['bekliyor']);return NextResponse.json({ok:true});}
 const tur=x.tur==='asim'?'asim':'ek',dk=tur==='asim'?borc(b):Math.round(+x.dakika);
 if(tur==='asim'&&!dk)return hata('Ödenmemiş aşım ücretiniz yok.');
 if(tur==='ek'&&!(dk>=EN_AZ&&dk<=EN_COK))return hata(`En az ${EN_AZ}, en çok ${EN_COK} dakika alınabilir.`);
 const yontem=x.yontem==='shopier'?'shopier':'iban';
 if(yontem==='shopier'&&!patVar()&&!(process.env.SHOPIER_API_KEY&&process.env.SHOPIER_API_SECRET))return hata('Kartla ödeme henüz açık değil, havale/EFT ile ödeyebilirsiniz.');
 if(yontem==='iban'&&!process.env.ODEME_IBAN)return hata('Havale bilgisi henüz tanımlı değil, lütfen destekten yazın.');
 const {count}=await adminSb.from('dakika_siparisleri').select('id',{count:'exact',head:true}).eq('business_id',b.id).eq('durum','bekliyor').gte('created_at',new Date(Date.now()-36e5).toISOString());
 if(count>=5)return hata('Çok fazla bekleyen ödeme var, biraz sonra tekrar deneyin.',429);
 const al=x.alici||{},alici={ad:String(al.ad||'').trim().slice(0,40),soyad:String(al.soyad||'').trim().slice(0,40),eposta:String(al.eposta||'').trim().slice(0,120),tel:String(al.tel||'').replace(/\D/g,'').slice(-10)};
 if(alici.ad.length<2||alici.soyad.length<2||!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(alici.eposta)||!/^5\d{9}$/.test(alici.tel))return hata('Ad, soyad, e-posta ve cep telefonunu eksiksiz girin.');
 const [k,kd]=await Promise.all([usdKur(),kdvOrani()]);if(!k.usd)return hata('Döviz kuru şu an alınamadı, birkaç dakika sonra tekrar deneyin.',503);
 const bi=birim(b),f=fiyat(dk,bi.usd,k.usd,kd),kod=yeniKod();
 const {error}=await adminSb.from('dakika_siparisleri').insert({kod,business_id:b.id,dakika:dk,birim_usd:bi.usd,usd:f.usd,kur:k.usd,tl_kdvsiz:f.tl_kdvsiz,kdv:f.kdv,toplam_tl:f.toplam_tl,yontem,tur,alici});if(error)throw error;
 if(yontem==='iban')return NextResponse.json({kod,...f,iban:process.env.ODEME_IBAN,ad:process.env.ODEME_AD||'',banka:process.env.ODEME_BANKA||''});
 if(patVar()){const baslik=tur==='asim'?`Dinlio AI ${dk} dk aşım ücreti`:`Dinlio AI ${dk} ek dakika`;
  try{const u=await urunAc({kod,baslik,toplam:f.toplam_tl});await adminSb.from('dakika_siparisleri').update({odeme_ref:u.id}).eq('kod',kod);return NextResponse.json({kod,...f,link:u.url});}
  catch(e){await adminSb.from('dakika_siparisleri').update({durum:'iptal'}).eq('kod',kod);throw e;}}
 return NextResponse.json({kod,...f,form:shopierForm({kod,toplam:f.toplam_tl,urun:tur==='asim'?`Dinlio AI ${dk} dk aşım ücreti`:`Dinlio AI ${dk} ek dakika`,b,alici})});}
 catch(e){return hata(e.message,e.message==='Giriş gerekli'?401:400);}}
