// YÖNLENDİRME TESTİ: işletme kendi numarasını asistan hattına yönlendirdikten sonra "Test et"e basar.
// Sistem, Admin'in seçtiği TEST HATTINDAN işletmenin kendi numarasını arar. Yönlendirme doğruysa arama asistan hattına düşer;
// gelen-arama ucu (assist) bunu test hattının numarasından tanır, "hattınız çalışıyor" der ve testi başarılı işaretler.
import {adminSb} from './admin';import {vapiIstek} from './vapi';import {numaraAyar} from './numara';import {bildir} from './bildir';
export const son10=s=>String(s||'').replace(/\D/g,'').slice(-10);
export const sifirli=n=>{const d=son10(n);return d?'0'+d:'';};
// Operatör kodları (Türkiye GSM ortak MMI kodları)
export const KODLAR=h=>({tum:`**21*${h}#`,akilli:`**004*${h}#`,cevapsiz:`**61*${h}#`,mesgul:`**67*${h}#`,iptal:'##002#'});
export async function testBaslat(b,tel){
 const t=son10(tel);if(!/^[2-5]\d{9}$/.test(t))throw new Error('Yönlendirdiğin numarayı 05xx… ya da 0 alan kodu… şeklinde yaz.');
 if(!b.vapi_phone_id)throw new Error('Asistan hattın henüz bağlanmadı.');
 const {testHat}=await numaraAyar();if(!testHat?.id)throw new Error('Test hattı henüz hazır değil, destek ekibine yaz.');
 if(testHat.id===b.vapi_phone_id)throw new Error('Test hattı ile asistan hattı aynı olamaz.');
 const {count}=await adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('business_id',b.id).eq('type','yonlendirme_test').gte('created_at',new Date(Date.now()-36e5).toISOString());
 if(count>=6)throw new Error('Son 1 saatte çok test yapıldı, biraz sonra tekrar dene.');
 const {data:ev}=await adminSb.from('webhook_events').insert({type:'yonlendirme_test',business_id:b.id,payload:{tel:t,durum:'bekliyor',test:son10(testHat.numara)}}).select('id').single();
 const r=await vapiIstek('/call',{method:'POST',body:JSON.stringify({phoneNumberId:testHat.id,customer:{number:'+90'+t},
  assistant:{name:'Dinlio yönlendirme testi',firstMessage:'Bu bir Dinlio bağlantı testidir.',model:{provider:'openai',model:'gpt-4o-mini',messages:[{role:'system',content:'Bu bir bağlantı testi. Hiçbir şey söyleme, bekle.'}]},
   voice:{provider:'azure',voiceId:'tr-TR-EmelNeural'},maxDurationSeconds:40,metadata:{dinlio_test:ev.id}}})});
 if(!r.ok){await adminSb.from('webhook_events').update({payload:{tel:t,durum:'hata',hata:String(r.error).slice(0,200)}}).eq('id',ev.id);throw new Error('Test araması başlatılamadı: '+r.error);}
 return {id:ev.id};}
export async function testDurum(b,id){
 const {data:ev}=await adminSb.from('webhook_events').select('payload,created_at').eq('id',id).eq('business_id',b.id).eq('type','yonlendirme_test').maybeSingle();
 if(!ev)throw new Error('Test bulunamadı');let d=ev.payload?.durum||'bekliyor';
 if(d==='bekliyor'&&Date.now()-new Date(ev.created_at)>75e3){d='basarisiz';await adminSb.from('webhook_events').update({payload:{...ev.payload,durum:d}}).eq('id',id);}
 return {durum:d,hata:ev.payload?.hata||null};}
// Gelen arama ucu: arayan test hattıysa ve bu işletme için bekleyen test varsa başarılı say
export async function testYakala(biz,arayan){
 if(!arayan)return false;
 const {data:l}=await adminSb.from('webhook_events').select('id,payload').eq('business_id',biz.id).eq('type','yonlendirme_test').gte('created_at',new Date(Date.now()-12e4).toISOString()).order('created_at',{ascending:false}).limit(1);
 const ev=l?.[0];if(!ev||ev.payload?.durum!=='bekliyor'||ev.payload?.test!==arayan)return false;
 await adminSb.from('webhook_events').update({payload:{...ev.payload,durum:'ok'}}).eq('id',ev.id);
 const {data:g}=await adminSb.from('businesses').select('settings').eq('id',biz.id).single();
 await adminSb.from('businesses').update({settings:{...(g?.settings||{}),yonlendirme:{ok:new Date().toISOString(),tel:ev.payload.tel}}}).eq('id',biz.id);
 try{await bildir(biz.id,'✅ Yönlendirme testi başarılı! 0'+ev.payload.tel+' numaranı arayan müşterilere artık asistanın cevap veriyor.');}catch{}
 try{await adminSb.from('webhook_events').insert({type:'yonlendirme_ok',business_id:biz.id,payload:{ad:biz.name}});}catch{}
 return true;}
// Günlük: hattı bağlanmış ama 1 gündür yönlendirme testi başarılı olmamış (kendi numaralı) işletmelere bir kez hatırlatma
export async function yonlendirmeHatirlat(){
 const {data:l}=await adminSb.from('businesses').select('id,name,settings,vapi_phone_id').not('vapi_phone_id','is',null).eq('status','active');let n=0;
 for(const b of l||[]){const s=b.settings||{};if(s.yonlendirme?.ok||s.yonlendirme?.hatirlatildi)continue;if(s.numara?.tip==='0850'&&s.satin_al?.numara?.tercih==='kirala')continue;
  const bag=s.numara?.bag;if(!bag||Date.now()-new Date(bag)<864e5)continue;
  await bildir(b.id,'📞 Asistanın hazır ama numaran henüz yönlendirilmemiş görünüyor. Panelde "Hattını bağla" kartındaki kodu tuşla ve "Test et"e bas; 1 dakika sürer.').catch(()=>{});
  await adminSb.from('businesses').update({settings:{...s,yonlendirme:{...(s.yonlendirme||{}),hatirlatildi:new Date().toISOString()}}}).eq('id',b.id);n++;}
 return n;}
