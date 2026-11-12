// Bildirimdeki Onayla / Reddet tuşu. Giriş gerektirmez; imzalı kısa kod sadece o siparişe ve sadece "yeni" durumdayken geçerlidir.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {imzaDogru,smsGonder} from '@/lib/entegrasyon';import {paketOf} from '@/lib/paket';import {kuryeCagir} from '@/lib/kurye';
export const dynamic='force-dynamic';
export async function POST(req){try{const x=await req.json(),c=String(x.c||''),a=x.a==='red'?'red':'onay';
 if(!/^[0-9a-f-]{36}$/.test(c)||!imzaDogru('onay:'+c,x.t))return NextResponse.json({error:'Geçersiz'},{status:403});
 const {data:k}=await adminSb.from('calls').select('id,business_id,order_status,caller_phone,stated_phone').eq('id',c).maybeSingle();
 if(!k)return NextResponse.json({error:'Sipariş bulunamadı'},{status:404});
 if((k.order_status||'new')!=='new')return NextResponse.json({ok:true,mesaj:'Bu sipariş zaten işlenmiş.'});
 await adminSb.from('calls').update({order_status:a==='onay'?'preparing':'cancelled'}).eq('id',c);
 if(a==='onay'){const {data:bk}=await adminSb.from('businesses').select('quota_minutes_total,settings').eq('id',k.business_id).single();if(paketOf(bk).kurye&&bk.settings?.kurye?.acik)try{await kuryeCagir(k.business_id,c);}catch{}}
 if(a==='red'){const {data:b}=await adminSb.from('businesses').select('name,quota_minutes_total,settings').eq('id',k.business_id).single();
  if(paketOf(b).sms&&b.settings?.sms_onay){const no=k.stated_phone||k.caller_phone;if(no)await smsGonder(no,`${b.name||'İşletme'}: Üzgünüz, siparişiniz şu an hazırlanamıyor. Detay için bizi arayabilirsiniz.`);}}
 return NextResponse.json({ok:true,mesaj:a==='onay'?'Sipariş onaylandı, hazırlanıyor.':'Sipariş reddedildi.'});}catch{return NextResponse.json({error:'Hata'},{status:400});}}
