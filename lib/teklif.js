// TEKLİF ASİSTANI: Dinlio'yu işletmelere telefonla tanıtıp demo randevusu alan giden arama sistemi.
// Akış: admin listeyi doldurur → "Başlat" → sıradaki işletme aranır → arama bitince (webhook) sonuç yazılır ve sıradaki aranır.
// Sadece izinli gün/saatlerde arar, "istemiyorum" diyen numarayı bir daha asla aramaz (aranmayacak tablosu).
import {adminSb} from './admin';import {gidenArama,vapiIstek} from './vapi';import {SITE} from './site';
const TZ='Europe/Istanbul';
export const VARSAYILAN={aktif:false,asistan_id:null,numara_id:null,eszamanli:1,gunler:[1,2,3,4,5],araliklar:[['10:00','12:00'],['14:30','17:30']],
 demo:{gunler:[1,2,3,4,5,6],saatler:['16:00','17:00','18:00'],sure:45},max_deneme:3};
export async function ayar(){const {data}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','teklif').maybeSingle();return {...VARSAYILAN,...(data?.deger||{}),demo:{...VARSAYILAN.demo,...(data?.deger?.demo||{})}};}
export async function ayarYaz(a){await adminSb.from('sistem_ayarlari').upsert({anahtar:'teklif',deger:a});}
const trSimdi=()=>{const n=new Date(),d=new Date(n.toLocaleString('en-US',{timeZone:TZ}));return {gun:d.getDay()||7,hm:n.toLocaleTimeString('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit'}),tarih:n.toLocaleDateString('sv-SE',{timeZone:TZ})};};
export const saatUygun=a=>{const s=trSimdi();return a.gunler.includes(s.gun)&&a.araliklar.some(([b,e])=>s.hm>=b&&s.hm<e);};
export const telNo=s=>{let d=String(s||'').replace(/\D/g,'');if(d.length===11&&d[0]==='0')d=d.slice(1);else if(d.length===12&&d.startsWith('90'))d=d.slice(2);return /^[2-5]\d{9}$/.test(d)?d:null;};
// Önümüzdeki 7 günün boş demo saatleri (dolu randevular düşülür)
export async function demoSaatleri(a){const {data:dolu}=await adminSb.from('teklif_arama').select('randevu_at').eq('durum','randevu').gte('randevu_at',new Date().toISOString());
 const doluSet=new Set((dolu||[]).map(x=>new Date(x.randevu_at).getTime())),s=trSimdi(),bugun=new Date(s.tarih+'T00:00:00+03:00'),out=[];
 for(let i=1;i<=7;i++){const g=new Date(bugun.getTime()+i*864e5),tarih=g.toLocaleDateString('sv-SE',{timeZone:TZ}),gun=new Date(tarih+'T12:00:00+03:00').getUTCDay()||7;
  if(!a.demo.gunler.includes(gun))continue;
  for(const sa of a.demo.saatler){const t=new Date(`${tarih}T${sa}:00+03:00`);if(!doluSet.has(t.getTime()))out.push({tarih,saat:sa,gun:['','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'][gun]});}}
 return out.slice(0,12);}
// DENEME ASİSTANI: aramadan önce işletmeye özel bir asistan gerçekten hazırlanır, böylece satış asistanı
// "sizin için bir deneme asistanı hazırladık" derken doğruyu söyler. Kabul ederlerse numaralarına bağlanır; reddederlerse silinir.
const demoPrompt=(ad,kat)=>`Sen ${ad} adlı ${kat||'işletmenin'} yapay zekâ telefon asistanısın. Müşterileri kibar ve kısa cümlelerle karşıla; sipariş, randevu veya rezervasyon taleplerini not al (ad, telefon, ne istediği, adres veya tarih-saat). Yapay zekâ olduğunu sorarlarsa dürüstçe söyle. Bilmediğin fiyat veya bilgiyi uydurma, işletmenin dönüş yapacağını söyle. Bu bir deneme kurulumudur; işletmenin menüsü ve saatleri eklenince daha ayrıntılı cevap vereceksin.`;
async function demoHazirla(x,a){if(x.demo_asistan_id)return x.demo_asistan_id;if(!a.kaynak_id)return null;
 const src=await vapiIstek('/assistant/'+encodeURIComponent(a.kaynak_id));if(!src.ok)return null;
 const s=src.d,c=await vapiIstek('/assistant',{method:'POST',body:JSON.stringify({name:('Deneme · '+x.ad).slice(0,40),firstMessage:`Merhaba, ${x.ad}, ben yapay zekâ asistanıyım. Görüşmemiz hizmet kalitesi için kaydedilmektedir. Size nasıl yardımcı olabilirim?`,
  model:{...s.model,messages:[{role:'system',content:demoPrompt(x.ad,x.kategori)}],toolIds:undefined,tools:undefined},voice:s.voice,transcriber:s.transcriber,maxDurationSeconds:600})});
 if(!c.ok||!c.d?.id)return null;await adminSb.from('teklif_arama').update({demo_asistan_id:c.d.id}).eq('id',x.id);return c.d.id;}
export async function demoSil(id){if(!id)return;await vapiIstek('/assistant/'+encodeURIComponent(id),{method:'DELETE'});await adminSb.from('teklif_arama').update({demo_asistan_id:null}).eq('demo_asistan_id',id);}
// Sıradaki işletmeleri ara (eş zamanlı sınırına kadar). Webhook, cron ve "Başlat" tuşu çağırır.
export async function sonrakiniAra(){const a=await ayar();if(!a.aktif||!a.asistan_id||!a.numara_id)return {aranan:0,neden:!a.aktif?'kapalı':'kurulum eksik'};
 // 15 dakikadır sonucu gelmeyen arama: takılmış say, açmadı olarak işaretle
 await adminSb.from('teklif_arama').update({durum:'acmadi',sonraki_at:new Date(Date.now()+3*36e5).toISOString()}).eq('durum','araniyor').lt('son_arama_at',new Date(Date.now()-15*60e3).toISOString());
 if(!saatUygun(a))return {aranan:0,neden:'arama saati dışında'};
 const {count:suren}=await adminSb.from('teklif_arama').select('id',{count:'exact',head:true}).eq('durum','araniyor');
 let bos=Math.max(0,Math.min(3,a.eszamanli)-(suren||0)),aranan=0,hata=null;
 while(bos>0){const {data:l}=await adminSb.from('teklif_arama').select('id,ad,tel,kategori,deneme,demo_asistan_id').in('durum',['sirada','sonra','acmadi']).lte('sonraki_at',new Date().toISOString()).order('sonraki_at').limit(1);
  const x=l?.[0];if(!x)break;
  // Aynı satırı iki istek birden almasın: koşullu güncelleme
  const {data:al}=await adminSb.from('teklif_arama').update({durum:'araniyor',son_arama_at:new Date().toISOString(),deneme:x.deneme+1}).eq('id',x.id).in('durum',['sirada','sonra','acmadi']).select('id');
  if(!al?.length)continue;bos--;
  const {data:ret}=await adminSb.from('aranmayacak').select('tel').eq('tel',x.tel).maybeSingle();
  if(ret){await adminSb.from('teklif_arama').update({durum:'istemiyor'}).eq('id',x.id);bos++;continue;}
  let demo=null;try{demo=await demoHazirla(x,a);}catch{}
  const r=await gidenArama({phoneNumberId:a.numara_id,assistantId:a.asistan_id,numara:'0'+x.tel,
   firstMessage:`Merhaba, ${x.ad} mi acaba? Ben Dinlio'dan Ayşe, görüşmemiz kayıt altındadır. İşletmelerin telefonlarını 7/24 açan bir sistem geliştirdik, bir dakikanızı alabilir miyim?`,
   variableValues:{isletme:x.ad,kategori:x.kategori||'işletme',demoHazir:demo?'evet':''}});
  if(r.ok){await adminSb.from('teklif_arama').update({vapi_call_id:r.id}).eq('id',x.id);aranan++;}
  else{hata=r.neden;await adminSb.from('teklif_arama').update({durum:'hata',notlar:String(r.neden||'').slice(0,200)}).eq('id',x.id);break;}}
 return {aranan,hata};}
export const ASISTAN_PROMPT=`Sen Dinlio AI'ın satış asistanı Ayşe'sin. Dinlio AI, Yalova'da 15 yaşında bir girişimcinin kurduğu, işletmelerin telefonlarını 7/24 açan yapay zekâ asistanıdır. Şu an {{isletme}} adlı {{kategori}} işletmesini arıyorsun. Amacın: kısaca anlatmak ve ücretsiz bir demo için yüz yüze görüşme randevusu almak.

KONUŞMA AKIŞI
1. Karşındakinin yetkili olup olmadığını öğren. Yetkili yoksa ne zaman ulaşabileceğini sor, teklif_sonuc aracını sonuc="sonra" ile çağır, teşekkür edip kapat.
2. En fazla 2-3 kısa cümleyle anlat: "Siz meşgulken, kapalıyken veya hat doluyken gelen aramaları asistanımız açıyor; sipariş, randevu veya rezervasyonu alıp telefonunuza bildirim olarak gönderiyor. Adres tarifini haritada buluyor, menünüzden fiyat söylüyor, sizi tanıyan müşteriyi adıyla karşılıyor." İşletmenin türüne uygun örnek ver (restorana sipariş, kuaföre randevu, kliniğe randevu).
2b. BÜYÜK AN (demo randevusunu sormadan ÖNCE mutlaka söyle): "Size küçük bir sır vereyim: şu an konuştuğunuz ben de bir yapay zekâ asistanıyım. İşletmeniz için hazırladığımız asistan da müşterilerinizle tam böyle konuşacak." Kısa bir tepki bekle, sonra devam et.
3. Deneme hazır mı: {{demoHazir}}. "evet" ise şöyle söyle: "Sizin için {{isletme}} adına cevap veren bir deneme asistanı hazırladık. 1 hafta tamamen ücretsiz; müsait olduğunuz bir gün gelip numaranıza bağlayalım ve 15 dakikada gösterelim, ne dersiniz?" Boşsa: "1 hafta tamamen ücretsiz deneyebilirsiniz. Müsait olduğunuz bir gün gelip sizin işletmenize göre kurulmuş halini 15 dakikada gösterelim, ne dersiniz?"
4. Kabul ederse demo_saatleri aracını çağır, en fazla 3 seçenek söyle. Bir saat seçince teklif_sonuc aracını sonuc="randevu", randevu_tarih ve randevu_saat ile çağır; yetkilinin adını öğrendiysen yetkili alanına yaz. Gün ve saati tekrar et, teşekkür et.
5. "Düşüneyim / sonra arayın" derse ne zaman uygun olduğunu sor, sonuc="sonra" ve geri_ara (ör. "yarın öğleden sonra") ile kaydet.
6. "Bilgi gönderin" derse sonuc="ilgilendi" ile kaydet, sitenin dinlio.vercel.app olduğunu söyle.

KURALLAR
- Kısa konuş, karşındakinin sözünü kesme, baskı yapma. Restoranlar yoğunsa özür dile, uygun zamanı sor.
- "İstemiyorum, aramayın, ilgilenmiyorum" derse hemen saygıyla kabul et, "bir daha aramayacağız" de, teklif_sonuc aracını sonuc="istemiyor" ile çağır ve vedalaş. Asla ısrar etme.
- Yanlış numaraysa sonuc="yanlis" ile kaydet, özür dile.
- Açılışta yapay zekâ olduğunu söylemiyorsun ama ASLA insan olduğunu iddia etme. "Robot musun, gerçek misin, yapay zekâ mısın" diye sorulursa o anda dürüstçe "evet, yapay zekâ asistanıyım" de ve yukarıdaki BÜYÜK AN cümlesiyle devam et. Bir karar istemeden (randevu sormadan) önce yapay zekâ olduğunu mutlaka söylemiş ol. Bilmediğin şeyi uydurma; fiyat sorulursa "paketler aylık 45 dolardan başlıyor, demoda size en uygununu gösteririz" de.
- Deneme asistanı numaralarına henüz BAĞLANMADI; "telefonlarınıza şu an bakıyor" deme. Sadece "hazırladık, kabul ederseniz bağlarız" de.
- Her görüşmeyi kapatmadan önce mutlaka teklif_sonuc aracını bir kez çağır. Sonra kibarca vedalaş ve görüşmeyi bitir.`;
