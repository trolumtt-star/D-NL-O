// NUMARA: paket alan işletmeye telefon hattı.
// - "Kendi numaram var": işletme kendi numarasını bizim verdiğimiz hatta yönlendirir (operatör kodu ile).
// - "0850 kirala": havuzdaki boş 0850 numarası işletmeye verilir (aylık ücreti Admin belirler).
// Havuz: Admin'in Vapi'ye bağladığı (Netgsm SIP vb.) numaralar. Ödeme onaylanınca boştaki ilk uygun numara otomatik bağlanır.
import {adminSb} from './admin';import {istekModunaAl} from './vapi';import {SITE} from './site';
export async function numaraAyar(){const {data}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','numara').maybeSingle();const d=data?.deger||{};
 return {ucret:Math.max(0,+d.ucret||0),havuz:Array.isArray(d.havuz)?d.havuz.filter(x=>x?.id):[],testHat:d.testHat?.id?d.testHat:null};}
export async function numaraAyarKaydet({ucret,havuz,testHat}){const v={testHat:testHat?.id?{id:String(testHat.id).slice(0,64),numara:String(testHat.numara||'').slice(0,30)}:null,ucret:Math.min(100000,Math.max(0,Math.round(+ucret||0))),havuz:(havuz||[]).filter(x=>x?.id).map(x=>({id:String(x.id).slice(0,64),numara:String(x.numara||'').slice(0,30),tip:x.tip==='0850'?'0850':'yerel'})).slice(0,200)};
 const {error}=await adminSb.from('sistem_ayarlari').upsert({anahtar:'numara',deger:v},{onConflict:'anahtar'});if(error)throw error;return v;}
// Kullanılmayan havuz numaraları
export async function bosNumaralar(){const {havuz}=await numaraAyar();if(!havuz.length)return [];
 const {data}=await adminSb.from('businesses').select('vapi_phone_id').in('vapi_phone_id',havuz.map(x=>x.id));const dolu=new Set((data||[]).map(x=>x.vapi_phone_id));
 const {testHat}=await numaraAyar();return havuz.filter(x=>!dolu.has(x.id)&&x.id!==testHat?.id);}
// Yönlendirme talimatı (Türkiye operatörleri: her durumda koşulsuz yönlendirme **21*NUMARA#; meşgul/cevapsız için 67/61)
export const yonlendirmeMetni=n=>{const d=String(n||'').replace(/\D/g,''),no=d.startsWith('90')?'0'+d.slice(2):d.startsWith('0')?d:'0'+d;
 return `Cep hattında tüm aramaları yönlendirmek için telefonunuzdan **21*${no}# tuşlayıp arayın (iptal: ##21#). Sadece cevap veremediğinizde yönlendirmek için **61*${no}# ve meşgulken **67*${no}#. Sabit hat / santral için operatörünüzden "${no} numarasına çağrı yönlendirme" isteyin.`;};
// Ödeme sonrası: işletmeye uygun boş numarayı bağla. Bulunamazsa {ok:false}.
// Havuzda bir türden en az 2 boş numara kalsın; azalınca admin'e iş düşer, numara eklenince kendiliğinden kapanır
export async function havuzKontrol(){try{const {adminIs,adminIsKapat}=await import('./adminIs');const bos=await bosNumaralar(),{havuz}=await numaraAyar();
 for(const tip of ['yerel','0850']){if(!havuz.some(x=>x.tip===tip))continue;const n=bos.filter(x=>x.tip===tip).length,ad=tip==='0850'?'0850':'alan kodlu';
  if(n<2)await adminIs({tur:'numara',anahtar:'havuz:'+tip,baslik:'Numara havuzu azaldı ('+ad+'): '+n+' boş',detay:'Yeni satışta numara bağlanamayabilir. Netgsm\'den '+ad+' numara alıp Vapi\'ye ekleyin, sonra Admin → Numaralar\'da havuza ekleyin.'});
  else await adminIsKapat('havuz:'+tip);}}catch{}}
export async function numaraBagla(bid){
 const {data:b}=await adminSb.from('businesses').select('id,phone_number,vapi_phone_id,vapi_assistant_id,settings').eq('id',bid).single();
 if(b.vapi_phone_id)return {ok:true,zaten:true};
 const tercih=b.settings?.satin_al?.numara?.tercih==='kirala'?'0850':'yerel',bos=await bosNumaralar();
 const n=bos.find(x=>x.tip===tercih)||bos[0]; // yeni numara isteyene 0850 yoksa alan kodlu, yönlendirene ikisinden biri
 if(!n){await havuzKontrol();return {ok:false,tercih};}
 const s={...(b.settings||{}),numara:{...(b.settings?.numara||{}),hat:n.numara,tip:n.tip,bag:new Date().toISOString()}};
 const {error}=await adminSb.from('businesses').update({vapi_phone_id:n.id,settings:s}).eq('id',bid).is('vapi_phone_id',null);if(error)return {ok:false,hata:error.message};
 const r=await istekModunaAl({...b,vapi_phone_id:n.id,settings:s},SITE);
 if(!r?.ok){await adminSb.from('businesses').update({vapi_phone_id:null}).eq('id',bid);return {ok:false,hata:'Vapi numarası bağlanamadı: '+(r?.error||'')};}
 await havuzKontrol();
 return {ok:true,numara:n.numara,tip:n.tip,tercih};}
