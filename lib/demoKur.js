// CANLI DEMO ASİSTANLARI: her sektör için Vapi'de ayrı bir demo asistanı. İlk kez o sektör seçildiğinde sunucu kendisi kurar
// ve kimliğini sistem_ayarlari 'demo' kaydına yazar (sektor → asistan id). Admin "Demo asistanlarını kur" ile hepsini yeniden kurabilir.
// Ziyaretçinin formda değiştirdiği işletme bilgileri görüşme başında değişken olarak gelir ({{isletme}}, {{liste}}...).
import {vapiGizli} from './gizli';import {adminSb} from './admin';import {vapiIstek} from './vapi';import {sablon} from './asistanOlustur';import {SITE} from './site';import {SK} from './demoSektor';
export const DEMO_SURUM=3;
const S=(t,d)=>({type:t,description:d});
function govde(sk,s,sec){
 const p=`Sen "{{isletme}}" adlı ${sk.ad.toLowerCase()} işletmesinin telefon asistanısın. Bu bir Dinlio AI CANLI DEMOSU: karşındaki kişi muhtemelen işletme sahibi ve seni deniyor; ona gerçek bir müşteriymiş gibi davran.
Görevin: ${sk.gorev}.
İşletme bilgileri (sadece bunlardan cevap ver, fiyat uydurma):
- ${sk.tur==='siparis'?'Ürünler ve fiyatlar':sk.tur==='rezervasyon'?'Odalar ve fiyatlar':sk.tur==='talep'?'Portföy':'Hizmetler ve fiyatlar'}: {{liste}}
- Çalışma saatleri: {{saatler}}
- Ek bilgi: {{ek}}
Toplaman gerekenler: ${sk.alanlar}.
KURALLAR: Kısa ve doğal konuş, her seferinde tek soru sor. Müşteri her yeni bilgi verdiğinde (isim, ürün/hizmet, adres, tarih, saat, telefon vb.) HEMEN demo_kaydet aracını o ana kadar bildiğin TÜM bilgilerle çağır ve konuşmaya devam et; bu bilgiler ekrandaki panele canlı düşer.${sk.tur==='siparis'?' Tutarı fiyat listesinden hesapla ve tutar alanına yaz.':''} Sonunda bilgileri tekrar edip onay al, demo_kaydet'i durum="onaylandi" ile çağır ve "kaydınız işletmenin paneline düştü" de.
Sonra tek cümleyle ekle: "Bu arada ben Dinlio AI'ım; sizin işletmenizin telefonunu da böyle açabilirim." Yapay zekâ olduğunu sorarlarsa dürüstçe söyle. Konu dışı uzun sohbetlere girme.
- HİTAP: Müşterinin cinsiyetini sesinden bilemezsin, ASLA tahmin etme. Adı Türkçede açıkça erkek adıysa (Ahmet, Mehmet, Mustafa gibi) "Ahmet Bey", açıkça kadın adıysa (Ayşe, Fatma, Zeynep gibi) "Ayşe Hanım" de. Ad hem kadın hem erkek için kullanılıyorsa (Deniz, Umut, Derya, Evren gibi), alışılmadık bir adsa ya da emin değilsen "Bey/Hanım" KULLANMA; sadece adıyla ya da "efendim" diye hitap et. Adı yanlış duymuş olabilirsin: ad alışılmadıksa veya emin değilsen bir kez "Tuna mı dediniz?" gibi teyit et; müşteri düzeltirse düzeltilmiş adı kullan ve özür dile.`;
 const arac={type:'function',async:false,function:{name:'demo_kaydet',description:'Müşterinin o ana kadar verdiği bilgileri ekrandaki işletme paneline canlı yazar. Her yeni bilgide tüm bilgilerle tekrar çağrılır.',
  parameters:{type:'object',properties:{musteri:S('string','Müşterinin adı'),telefon:S('string','Söylediği telefon'),istek:S('string','Sipariş edilen ürünler ve adetleri ya da istenen hizmet/oda/talep'),adres:S('string','Teslimat adresi veya tarif'),tarih:S('string','Randevu/rezervasyon/görüşme günü'),saat:S('string','Saat'),kisi:S('string','Kişi sayısı, usta, doktor, hayvan, araç, bütçe gibi ek bilgi'),tutar:S('string','Fiyat listesinden hesaplanan toplam tutar ya da bütçe'),not:S('string','Ek not'),durum:{type:'string',enum:['taslak','onaylandi'],description:'Müşteri son onayı verdiyse onaylandi'}},required:[]}},
  server:{url:SITE+'/api/demo/kart',...(sec?{headers:{'x-vapi-secret':sec}}:{})}};
 return {name:('Dinlio demo · '+sk.ad).slice(0,40),firstMessage:'Merhaba, {{isletme}}, ben yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?',
  model:{...s.model,messages:[{role:'system',content:p}],toolIds:undefined,tools:[arac]},voice:s.voice,transcriber:s.transcriber,maxDurationSeconds:150,silenceTimeoutSeconds:20,endCallFunctionEnabled:true,
  metadata:{dinlio_demo:sk.id}};}
async function oku(){const {data}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','demo').maybeSingle();return data?.deger||{};}
async function yaz(sektor,id){const d=await oku(),sk={...(d.surum===DEMO_SURUM?d.sektor||{}:{}),[sektor]:id};
 await adminSb.from('sistem_ayarlari').upsert({anahtar:'demo',deger:{surum:DEMO_SURUM,sektor:sk}},{onConflict:'anahtar'});}
// Tek sektörün demo asistanı: varsa id'yi döner, yoksa Vapi'de kurar
export async function demoAsistan(sektorId){
 const sk=SK.find(x=>x.id===sektorId)||SK[0],d=await oku();
 if(d.surum===DEMO_SURUM&&d.sektor?.[sk.id])return {id:d.sektor[sk.id],sk};
 const c=await vapiIstek('/assistant',{method:'POST',body:JSON.stringify(govde(sk,await sablon(),(await vapiGizli()).aktif))});
 if(!c.ok)throw new Error('Demo asistanı kurulamadı: '+c.error);
 await yaz(sk.id,c.d.id);return {id:c.d.id,sk};}
// Admin: hepsini kur/güncelle (var olanlar güncellenir, olmayanlar oluşturulur)
export async function demoHepsiniKur(){
 const s=await sablon(),sec=(await vapiGizli()).aktif,d=await oku(),eski=d.surum===DEMO_SURUM?d.sektor||{}:{},sonuc={},hatalar=[];
 for(const sk of SK){const g=govde(sk,s,sec);let id=eski[sk.id];
  const r=id?await vapiIstek('/assistant/'+id,{method:'PATCH',body:JSON.stringify(g)}):{ok:false};
  if(!r.ok){const c=await vapiIstek('/assistant',{method:'POST',body:JSON.stringify(g)});if(!c.ok){hatalar.push(sk.ad+': '+c.error);continue;}id=c.d.id;}
  sonuc[sk.id]=id;}
 await adminSb.from('sistem_ayarlari').upsert({anahtar:'demo',deger:{surum:DEMO_SURUM,sektor:{...eski,...sonuc}}},{onConflict:'anahtar'});
 return {kurulan:Object.keys(sonuc).length,hatalar};}
