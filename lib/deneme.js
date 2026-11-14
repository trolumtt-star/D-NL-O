// ÜCRETSİZ DENEME: varsayılan süre/dakika (Admin değiştirebilir), işletme bazında değiştirme ve sistemin tepkisi.
// Dakika ya da süre bitince işletme durur (aramalar işletmenin kendi telefonuna yönlenir), panelde "Paket yükselt" çıkar.
import {adminSb} from './admin';import {DENEME_GUN,DENEME_DK} from './fiyatlar';import {durdur,ac} from './vapi';import {bildir} from './bildir';
export async function denemeVarsayilan(){try{const {data}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','deneme').maybeSingle();const d=data?.deger||{};
 return {gun:Number.isFinite(+d.gun)?Math.min(90,Math.max(0,Math.round(+d.gun))):DENEME_GUN,dk:Number.isFinite(+d.dk)?Math.min(1000,Math.max(0,Math.round(+d.dk))):DENEME_DK};}catch{return {gun:DENEME_GUN,dk:DENEME_DK};}}
export async function denemeVarsayilanKaydet(gun,dk){const v={gun:Math.min(90,Math.max(0,Math.round(+gun||0))),dk:Math.min(1000,Math.max(0,Math.round(+dk||0)))};
 const {error}=await adminSb.from('sistem_ayarlari').upsert({anahtar:'deneme',deger:v},{onConflict:'anahtar'});if(error)throw error;return v;}
// İşletmenin deneme hakkını değiştir: dk = toplam deneme dakikası, gun = kayıttan itibaren toplam gün. Durum hemen yeniden hesaplanır.
export async function denemeDegistir(id,{dk,gun},origin){
 const {data:b}=await adminSb.from('businesses').select('id,status,created_at,quota_seconds_used,ek_dakika,settings').eq('id',id).single();
 if(!b?.settings?.deneme)throw new Error('Bu işletme denemede değil (paket almış ya da elle açılmış).');
 const s={...b.settings},dn={...s.deneme},u={};
 if(dk!==undefined&&dk!==''){const d=Math.min(1000,Math.max(0,Math.round(+dk)));if(!Number.isFinite(d))throw new Error('Dakika geçersiz');u.quota_minutes_total=d;dn.dk=d;}
 if(gun!==undefined&&gun!==''){const g=Math.min(90,Math.max(0,Math.round(+gun)));if(!Number.isFinite(g))throw new Error('Gün geçersiz');dn.bitis=new Date(new Date(b.created_at).getTime()+g*864e5).toISOString();dn.gun=g;delete dn.uyarildi;}
 s.deneme=dn;u.settings=s;
 const toplam=((u.quota_minutes_total??b.settings.deneme.dk??0)+(b.ek_dakika||0))*60;
 const bitti=(b.quota_seconds_used||0)>=toplam||new Date(dn.bitis)<=new Date();
 u.status=bitti?'suspended':'active';
 await adminSb.from('businesses').update(u).eq('id',id);
 if(bitti&&b.status!=='suspended'){await durdur(id,origin).catch(()=>{});await bildir(id,'⛔ Ücretsiz deneme hakkın doldu. Asistanın durdu, aramalar senin telefonuna yönleniyor. Devam etmek için panelden "Paket yükselt"e bas.').catch(()=>{});}
 if(!bitti&&b.status==='suspended'){await ac(id).catch(()=>{});await bildir(id,'✅ Deneme hakkın güncellendi, asistanın yeniden çalışıyor.').catch(()=>{});}
 return {durum:u.status,dk:u.quota_minutes_total,bitis:dn.bitis};}
