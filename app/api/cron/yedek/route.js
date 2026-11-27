// Haftalık veritabanı yedeği (Pazar gecesi). Başarısız olursa admin Yapılacaklar'a düşer.
import {cronYetki} from '@/lib/cronYetki';import {yedekAl} from '@/lib/yedek';import {adminIs,adminIsKapat} from '@/lib/adminIs';
export const maxDuration=60;export const dynamic='force-dynamic';
export async function GET(req){
 if(!await cronYetki(req,'yedek',600))return Response.json({error:'unauthorized'},{status:401});
 try{const r=await yedekAl();await adminIsKapat('yedek_hata');return Response.json({ok:true,...r});}
 catch(e){await adminIs({tur:'odeme',anahtar:'yedek_hata',baslik:'Haftalık yedek alınamadı',detay:String(e?.message||e).slice(0,300)+'\nAdmin → Genel bakış → Yedekler\'den "Şimdi yedek al"ı deneyin.'});return Response.json({ok:false},{status:500});}}
