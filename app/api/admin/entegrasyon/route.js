import {vapiGizli,vapiGizliUret} from '@/lib/gizli';import {araclariKur} from '@/lib/asistanKur';import {istekModunaAl} from '@/lib/vapi';
// Admin: dış hizmetlerin bağlantı durumu, test gönderimleri ve işletmeye WhatsApp/Instagram kanalı bağlama.
import {demoHepsiniKur} from '@/lib/demoKur';import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {durum,smsGonder,epostaGonder} from '@/lib/entegrasyon';import {SITE} from '@/lib/site';import {vapiIstek} from '@/lib/vapi';import {sablon} from '@/lib/asistanOlustur';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export const maxDuration=60;
export async function GET(req){try{await requireAdmin(req);
 const {data:k}=await adminSb.from('mesaj_kanallari').select('id,business_id,tur,dis_id,durum,created_at,businesses(name)').order('created_at',{ascending:false}).limit(100);
 const {data:sa}=await adminSb.from('sistem_ayarlari').select('anahtar,deger').in('anahtar',['demo','sablon_asistan']);const sm=Object.fromEntries((sa||[]).map(x=>[x.anahtar,x.deger]));
 const gz=await vapiGizli();
 return NextResponse.json({gizli:{ayarli:gz.guclu,kaynak:gz.kaynak,tarih:gz.tarih},durum:{...durum(),vapiSecret:gz.guclu,demo:!!(sm.demo?.sektor&&Object.keys(sm.demo.sektor).length&&process.env.VAPI_PUBLIC_KEY)},site:SITE,kanallar:k||[],sablon:sm.sablon_asistan?.id||null,demoId:sm.demo?.sektor&&Object.keys(sm.demo.sektor).length?Object.keys(sm.demo.sektor).length+' sektör':null,demoHata:null});}catch(e){return hata(e.message,401);}}
export async function POST(req){try{await requireAdmin(req);const x=await req.json();
 if(x.islem==='sms_test'){const r=await smsGonder(x.no,'Dinlio AI test mesajı. SMS bağlantınız çalışıyor.');return r.ok?NextResponse.json({ok:true,mesaj:'SMS gönderildi.'}):hata(r.neden);}
 if(x.islem==='eposta_test'){const r=await epostaGonder(x.adres,'Dinlio AI test e-postası','<p>E-posta bağlantınız çalışıyor.</p>');return r.ok?NextResponse.json({ok:true,mesaj:'E-posta gönderildi.'}):hata(r.neden);}
 if(x.islem==='kanal_ekle'){const tur=['whatsapp','instagram'].includes(x.tur)?x.tur:null,dis=String(x.dis_id||'').replace(/\D/g,'');
  if(!tur||dis.length<5)return hata('Tür ve numara/hesap kimliğini (sadece rakam) girin.');
  const {data:b}=await adminSb.from('businesses').select('id').eq('id',String(x.business_id||'')).maybeSingle();if(!b)return hata('İşletme bulunamadı.');
  const {error}=await adminSb.from('mesaj_kanallari').insert({business_id:b.id,tur,dis_id:dis,durum:'aktif'});if(error)return hata(/duplicate/.test(error.message)?'Bu kimlik zaten bağlı.':error.message);return NextResponse.json({ok:true});}
 if(x.islem==='sablon'){const id=String(x.id||'').trim();if(!/^[0-9a-f-]{36}$/.test(id))return hata('Geçerli bir Vapi asistan kimliği girin.');const r=await vapiIstek('/assistant/'+id);if(!r.ok)return hata('Asistan bulunamadı.');await adminSb.from('sistem_ayarlari').upsert({anahtar:'sablon_asistan',deger:{id}});return NextResponse.json({ok:true,mesaj:'Şablon asistan kaydedildi: yeni işletmelerin sesi ve modeli bundan kopyalanacak.'});}
 // GİZLİ ANAHTAR ÜRET: yeni şifre üretilir (kimseye gösterilmez), ardından bütün asistanlar, hatlar ve demo asistanları yeni şifreyle güncellenir.
 if(x.islem==='gizli_uret'){await vapiGizliUret();const {data:bl}=await adminSb.from('businesses').select('*').not('vapi_assistant_id','is',null);const o=new URL(req.url).origin;let ok=0;const hatalar=[];
  for(const b of bl||[]){try{await araclariKur(b.id,o);if(b.vapi_phone_id){const r=await istekModunaAl(b,o);if(r&&r.ok===false)throw new Error(r.error||'hat');}ok++;}catch(e){hatalar.push((b.name||b.id)+': '+String(e.message).slice(0,80));}}
  let demo='';try{const r=await demoHepsiniKur();demo=` Demo: ${r.kurulan} asistan.`;}catch(e){demo=' Demo güncellenemedi.';}
  return NextResponse.json({ok:!hatalar.length,mesaj:`Yeni gizli anahtar üretildi. ${ok} işletmenin asistanı ve hattı güncellendi.${demo}${hatalar.length?' Güncellenemeyenler: '+hatalar.join(' | ')+' (eski anahtar 2 saat daha geçerli; bu sürede "Vapi araçlarını kur" ile tekrar deneyin).':''}`});}
 if(x.islem==='demo_kur'){const r=await demoHepsiniKur();
  return NextResponse.json({ok:!r.hatalar.length,mesaj:`${r.kurulan} sektörün demo asistanı Vapi'de hazır.`+(r.hatalar.length?' Kurulamayanlar: '+r.hatalar.join(' | '):'')+(process.env.VAPI_PUBLIC_KEY?'':' ⚠ Vercel\'e VAPI_PUBLIC_KEY eklenmemiş, demo bu yüzden açılmaz.')});}
 if(x.islem==='kanal_sil'){await adminSb.from('mesaj_kanallari').delete().eq('id',String(x.id||''));return NextResponse.json({ok:true});}
 return hata('Geçersiz işlem');}catch(e){return hata(e.message,e.message==='Yetkisiz'?401:400);}}
