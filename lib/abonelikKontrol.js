// Günlük: deneme ve abonelik süreleri. Deneme bitince / abonelik 3 gün ek süreden sonra bitince asistan durur (aramalar işletmeye yönlenir).
// Yıllık abonelikte dakika her 30 günde bir yenilenir. Admin'in elle açtığı (deneme/abonelik kaydı olmayan) işletmelere dokunulmaz.
import {adminSb} from './admin';import {durdur} from './vapi';import {bildir} from './bildir';import {SITE} from './site';import {adminIs} from './adminIs';
const GUN=864e5;
export async function abonelikKontrol(){const simdi=Date.now(),sonuc={durdu:0,uyari:0,yenilendi:0};
 const {data:l}=await adminSb.from('businesses').select('id,status,settings,quota_reset_at,quota_minutes_total,quota_seconds_used').limit(3000);
 for(const b of l||[]){const s=b.settings||{},dn=s.deneme,ab=s.abonelik,yaz=async ek=>{const {data:g}=await adminSb.from('businesses').select('settings').eq('id',b.id).single();await adminSb.from('businesses').update({settings:{...(g?.settings||{}),...ek}}).eq('id',b.id);};
  try{
   if(ab){const bit=new Date(ab.bitis).getTime();
    if(simdi>bit+3*GUN&&b.status==='active'){await adminSb.from('businesses').update({status:'suspended'}).eq('id',b.id);await durdur(b.id,SITE).catch(()=>{});await bildir(b.id,'⛔ Paketinin süresi doldu, asistan durduruldu. Aramalar artık doğrudan sana yönleniyor. Panelden paketini yenileyebilirsin.');sonuc.durdu++;
     const {data:bn}=await adminSb.from('businesses').select('name,phone_number').eq('id',b.id).single();await adminIs({tur:'satis',anahtar:'bitti:'+b.id+':'+ab.bitis,business_id:b.id,baslik:'Paketi bitti, asistan durdu: '+(bn?.name||''),detay:'3 günlük ek süre de doldu ve yenilenmedi. Arayıp sorun var mı diye sormak müşteriyi geri kazandırabilir.'+(bn?.phone_number?'\nTelefon: '+bn.phone_number:'')});}
    // Bitiş günü ve ek sürenin son günü için ek hatırlatmalar (her biri bir kez)
    else if(simdi>bit&&simdi>bit+2*GUN&&!ab.uyari_son){await bildir(b.id,'⚠️ Paketin 3 gün önce bitti, ek süren yarın doluyor. Yenilemezsen asistan yarın duracak ve aramalar doğrudan sana yönlenecek. Panelden birkaç dakikada yenileyebilirsin.','acil');await yaz({abonelik:{...ab,uyarildi:true,uyari_bitis:true,uyari_son:true}});sonuc.uyari++;}
    else if(simdi>bit-GUN&&simdi<bit+2*GUN&&!ab.uyari_bitis){await bildir(b.id,simdi<bit?'⏳ Paketin yarın bitiyor. Asistanın kesintisiz çalışsın diye bugün yenileyebilirsin; kalan günlerin yenilemede kaybolmaz.':'⏳ Paketin bugün bitti. 3 gün ek süre tanıdık, asistanın şimdilik çalışıyor. Kesinti olmaması için panelden yenileyebilirsin.','acil');await yaz({abonelik:{...ab,uyarildi:true,uyari_bitis:true}});sonuc.uyari++;}
    else if(bit-simdi<3*GUN&&bit-simdi>GUN&&!ab.uyarildi){await bildir(b.id,`⏳ Paketin ${Math.max(0,Math.ceil((bit-simdi)/GUN))} gün içinde bitiyor. Şimdi yenilersen kalan günlerin kaybolmaz, yeni ay onların üstüne eklenir.`);await yaz({abonelik:{...ab,uyarildi:true}});sonuc.uyari++;}
    else if(ab.yil&&simdi<bit&&b.quota_reset_at&&new Date(b.quota_reset_at).getTime()<simdi){
     // Yıllık pakette aylık yenileme + dakika devri: kullanılmayan paket dakikalarından en fazla paketin yarısı bir ay devreder
     const taban=+ab.dk||Math.max(0,(+b.quota_minutes_total||0)-(+b.settings?.devir?.dk||0)),devir=Math.min(Math.floor(Math.max(0,(+b.quota_minutes_total||0)*60-(+b.quota_seconds_used||0))/60),Math.floor(taban/2));
     const st={...(b.settings||{})};delete st.devir;if(devir>0)st.devir={dk:devir,tarih:new Date(simdi).toISOString()};
     await adminSb.from('businesses').update({quota_minutes_total:taban+devir,quota_seconds_used:0,quota_minutes_used:0,quota_reset_at:new Date(simdi+30*GUN).toISOString(),settings:st,...(b.status==='suspended'?{status:'active'}:{})}).eq('id',b.id);sonuc.yenilendi++;}}
   else if(dn){const bit=new Date(dn.bitis).getTime();
    if(simdi>bit&&b.status==='active'){await adminSb.from('businesses').update({status:'suspended'}).eq('id',b.id);await durdur(b.id,SITE).catch(()=>{});await bildir(b.id,'Ücretsiz denemen bitti. Asistanın durdu; paket seçince kaldığı yerden devam eder. Panelde "Paket seç" tuşuna bas.');sonuc.durdu++;}
    else if(bit-simdi<1.2*GUN&&bit>simdi&&!dn.uyarildi){await bildir(b.id,'⏳ Ücretsiz denemen yarın bitiyor. Asistanın durmasın diye panelden paketini seçebilirsin.');await yaz({deneme:{...dn,uyarildi:true}});sonuc.uyari++;}}
  }catch{}}
 return sonuc;}
