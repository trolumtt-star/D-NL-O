// Günlük: deneme ve abonelik süreleri. Deneme bitince / abonelik 3 gün ek süreden sonra bitince asistan durur (aramalar işletmeye yönlenir).
// Yıllık abonelikte dakika her 30 günde bir yenilenir. Admin'in elle açtığı (deneme/abonelik kaydı olmayan) işletmelere dokunulmaz.
import {adminSb} from './admin';import {durdur} from './vapi';import {bildir} from './bildir';import {SITE} from './site';
const GUN=864e5;
export async function abonelikKontrol(){const simdi=Date.now(),sonuc={durdu:0,uyari:0,yenilendi:0};
 const {data:l}=await adminSb.from('businesses').select('id,status,settings,quota_reset_at').limit(3000);
 for(const b of l||[]){const s=b.settings||{},dn=s.deneme,ab=s.abonelik,yaz=async ek=>{const {data:g}=await adminSb.from('businesses').select('settings').eq('id',b.id).single();await adminSb.from('businesses').update({settings:{...(g?.settings||{}),...ek}}).eq('id',b.id);};
  try{
   if(ab){const bit=new Date(ab.bitis).getTime();
    if(simdi>bit+3*GUN&&b.status==='active'){await adminSb.from('businesses').update({status:'suspended'}).eq('id',b.id);await durdur(b.id,SITE).catch(()=>{});await bildir(b.id,'⛔ Paketinin süresi doldu, asistan durduruldu. Aramalar artık doğrudan sana yönleniyor. Panelden paketini yenileyebilirsin.');sonuc.durdu++;}
    else if(bit-simdi<3*GUN&&!ab.uyarildi){await bildir(b.id,`⏳ Paketin ${Math.max(0,Math.ceil((bit-simdi)/GUN))} gün içinde bitiyor. Kesinti olmasın diye panelden yenileyebilirsin.`);await yaz({abonelik:{...ab,uyarildi:true}});sonuc.uyari++;}
    else if(ab.yil&&simdi<bit&&b.quota_reset_at&&new Date(b.quota_reset_at).getTime()<simdi){await adminSb.from('businesses').update({quota_seconds_used:0,quota_minutes_used:0,quota_reset_at:new Date(simdi+30*GUN).toISOString(),...(b.status==='suspended'?{status:'active'}:{})}).eq('id',b.id);sonuc.yenilendi++;}}
   else if(dn){const bit=new Date(dn.bitis).getTime();
    if(simdi>bit&&b.status==='active'){await adminSb.from('businesses').update({status:'suspended'}).eq('id',b.id);await durdur(b.id,SITE).catch(()=>{});await bildir(b.id,'Ücretsiz denemen bitti. Asistanın durdu; paket seçince kaldığı yerden devam eder. Panelde "Paket seç" tuşuna bas.');sonuc.durdu++;}
    else if(bit-simdi<1.2*GUN&&bit>simdi&&!dn.uyarildi){await bildir(b.id,'⏳ Ücretsiz denemen yarın bitiyor. Asistanın durmasın diye panelden paketini seçebilirsin.');await yaz({deneme:{...dn,uyarildi:true}});sonuc.uyari++;}}
  }catch{}}
 return sonuc;}
