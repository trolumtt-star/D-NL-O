// Admin: dış hizmetlerin bağlantı durumu, test gönderimleri ve işletmeye WhatsApp/Instagram kanalı bağlama.
import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {durum,smsGonder,epostaGonder} from '@/lib/entegrasyon';import {SITE} from '@/lib/site';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function GET(req){try{await requireAdmin(req);
 const {data:k}=await adminSb.from('mesaj_kanallari').select('id,business_id,tur,dis_id,durum,created_at,businesses(name)').order('created_at',{ascending:false}).limit(100);
 return NextResponse.json({durum:durum(),site:SITE,kanallar:k||[]});}catch(e){return hata(e.message,401);}}
export async function POST(req){try{await requireAdmin(req);const x=await req.json();
 if(x.islem==='sms_test'){const r=await smsGonder(x.no,'Dinlio AI test mesajı. SMS bağlantınız çalışıyor.');return r.ok?NextResponse.json({ok:true,mesaj:'SMS gönderildi.'}):hata(r.neden);}
 if(x.islem==='eposta_test'){const r=await epostaGonder(x.adres,'Dinlio AI test e-postası','<p>E-posta bağlantınız çalışıyor.</p>');return r.ok?NextResponse.json({ok:true,mesaj:'E-posta gönderildi.'}):hata(r.neden);}
 if(x.islem==='kanal_ekle'){const tur=['whatsapp','instagram'].includes(x.tur)?x.tur:null,dis=String(x.dis_id||'').replace(/\D/g,'');
  if(!tur||dis.length<5)return hata('Tür ve numara/hesap kimliğini (sadece rakam) girin.');
  const {data:b}=await adminSb.from('businesses').select('id').eq('id',String(x.business_id||'')).maybeSingle();if(!b)return hata('İşletme bulunamadı.');
  const {error}=await adminSb.from('mesaj_kanallari').insert({business_id:b.id,tur,dis_id:dis,durum:'aktif'});if(error)return hata(/duplicate/.test(error.message)?'Bu kimlik zaten bağlı.':error.message);return NextResponse.json({ok:true});}
 if(x.islem==='kanal_sil'){await adminSb.from('mesaj_kanallari').delete().eq('id',String(x.id||''));return NextResponse.json({ok:true});}
 return hata('Geçersiz işlem');}catch(e){return hata(e.message,e.message==='Yetkisiz'?401:400);}}
