// Admin: dış hizmetlerin bağlantı durumu, test gönderimleri ve işletmeye WhatsApp/Instagram kanalı bağlama.
import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {durum,smsGonder,epostaGonder} from '@/lib/entegrasyon';import {SITE} from '@/lib/site';import {vapiIstek} from '@/lib/vapi';import {sablon} from '@/lib/asistanOlustur';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function GET(req){try{await requireAdmin(req);
 const {data:k}=await adminSb.from('mesaj_kanallari').select('id,business_id,tur,dis_id,durum,created_at,businesses(name)').order('created_at',{ascending:false}).limit(100);
 const {data:sa}=await adminSb.from('sistem_ayarlari').select('anahtar,deger').in('anahtar',['demo','sablon_asistan']);const sm=Object.fromEntries((sa||[]).map(x=>[x.anahtar,x.deger]));
 return NextResponse.json({durum:{...durum(),demo:!!(sm.demo?.id&&process.env.VAPI_PUBLIC_KEY)},site:SITE,kanallar:k||[],sablon:sm.sablon_asistan?.id||null,demoId:sm.demo?.id||null});}catch(e){return hata(e.message,401);}}
export async function POST(req){try{await requireAdmin(req);const x=await req.json();
 if(x.islem==='sms_test'){const r=await smsGonder(x.no,'Dinlio AI test mesajı. SMS bağlantınız çalışıyor.');return r.ok?NextResponse.json({ok:true,mesaj:'SMS gönderildi.'}):hata(r.neden);}
 if(x.islem==='eposta_test'){const r=await epostaGonder(x.adres,'Dinlio AI test e-postası','<p>E-posta bağlantınız çalışıyor.</p>');return r.ok?NextResponse.json({ok:true,mesaj:'E-posta gönderildi.'}):hata(r.neden);}
 if(x.islem==='kanal_ekle'){const tur=['whatsapp','instagram'].includes(x.tur)?x.tur:null,dis=String(x.dis_id||'').replace(/\D/g,'');
  if(!tur||dis.length<5)return hata('Tür ve numara/hesap kimliğini (sadece rakam) girin.');
  const {data:b}=await adminSb.from('businesses').select('id').eq('id',String(x.business_id||'')).maybeSingle();if(!b)return hata('İşletme bulunamadı.');
  const {error}=await adminSb.from('mesaj_kanallari').insert({business_id:b.id,tur,dis_id:dis,durum:'aktif'});if(error)return hata(/duplicate/.test(error.message)?'Bu kimlik zaten bağlı.':error.message);return NextResponse.json({ok:true});}
 if(x.islem==='sablon'){const id=String(x.id||'').trim();if(!/^[0-9a-f-]{36}$/.test(id))return hata('Geçerli bir Vapi asistan kimliği girin.');const r=await vapiIstek('/assistant/'+id);if(!r.ok)return hata('Asistan bulunamadı.');await adminSb.from('sistem_ayarlari').upsert({anahtar:'sablon_asistan',deger:{id}});return NextResponse.json({ok:true,mesaj:'Şablon asistan kaydedildi: yeni işletmelerin sesi ve modeli bundan kopyalanacak.'});}
 if(x.islem==='demo_kur'){const s=await sablon(),isl='Lezzet Durağı',
   p=`Sen "${isl}" adlı bir dönerci ve kebapçının telefon asistanısın. Bu bir Dinlio AI CANLI DEMOSU: karşındaki kişi işletme sahibi olabilir ve seni deniyor. Gerçek bir müşteri gibi davran: sipariş al (ürün, adet, adres, isim), fiyat söyle, adres tarif edilirse anlayıp teyit et.
Menü: Adana dürüm 180 TL, Tavuk dürüm 140 TL, Et döner porsiyon 260 TL, Tavuk döner porsiyon 190 TL, Lahmacun 90 TL, Ayran 30 TL, Kola 45 TL, Künefe 150 TL. Paket servis 3 km içine ücretsiz, en az sipariş 200 TL. Her gün 11:00-23:00 açık.
Kısa ve doğal konuş, her seferinde tek soru sor. Siparişi sonunda tekrar edip onayla ve "siparişiniz işletmenin paneline düştü, 30-35 dakikada kapınızda" de.
Sonra tek cümleyle şunu ekle: "Bu arada ben Dinlio AI'ım; sizin işletmenizin telefonunu da böyle açabilirim, sitede 7 gün ücretsiz deneyebilirsiniz." Yapay zekâ olduğunu sorarlarsa dürüstçe söyle. Konu dışı uzun sohbetlere girme.`;
  const govde={name:'Dinlio · Canlı demo',firstMessage:`Merhaba, ${isl}, ben yapay zeka asistanıyım. Bu bir canlı demo görüşmesidir. Ne sipariş etmek istersiniz?`,model:{...s.model,messages:[{role:'system',content:p}],toolIds:undefined,tools:undefined},voice:s.voice,transcriber:s.transcriber,maxDurationSeconds:120,silenceTimeoutSeconds:20,endCallFunctionEnabled:true};
  const {data:a}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','demo').maybeSingle();
  let id=a?.deger?.id;const r=id?await vapiIstek('/assistant/'+id,{method:'PATCH',body:JSON.stringify(govde)}):{ok:false};
  if(!r.ok){const c=await vapiIstek('/assistant',{method:'POST',body:JSON.stringify(govde)});if(!c.ok)return hata('Demo asistanı oluşturulamadı: '+c.error);id=c.d.id;}
  await adminSb.from('sistem_ayarlari').upsert({anahtar:'demo',deger:{id,isletme:isl}});return NextResponse.json({ok:true,mesaj:'Canlı demo asistanı hazır.'+(process.env.VAPI_PUBLIC_KEY?'':' Vercel\'e VAPI_PUBLIC_KEY eklemeyi unutmayın.')});}
 if(x.islem==='kanal_sil'){await adminSb.from('mesaj_kanallari').delete().eq('id',String(x.id||''));return NextResponse.json({ok:true});}
 return hata('Geçersiz işlem');}catch(e){return hata(e.message,e.message==='Yetkisiz'?401:400);}}
