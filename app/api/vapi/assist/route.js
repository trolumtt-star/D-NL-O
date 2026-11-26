import {vapiGizli,vapiIzin,basliktan} from '@/lib/gizli';import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {e164} from '@/lib/vapi';import {paketOf} from '@/lib/paket';import {testYakala} from '@/lib/yonlendirme';import {alisverisSayisi,sadakatAyar,sadakatMetni,izinliMi,geriAyar,ekSatisAyar,patronMu} from '@/lib/buyume';
// Bu numarada şu an süren (bu arama hariç) kaç arama var? Vapi'ye sorulur; cevap gelmezse sınır uygulanmaz.
const AKTIF=new Set(['queued','ringing','in-progress']);
async function aktifSayisi(pid,buId){const key=process.env.VAPI_API_KEY;if(!key)return 0;
 try{const q=new URLSearchParams({phoneNumberId:pid,limit:'50',createdAtGt:new Date(Date.now()-45*60e3).toISOString()});
  const r=await fetch('https://api.vapi.ai/call?'+q,{headers:{authorization:'Bearer '+key},signal:AbortSignal.timeout(2500)});if(!r.ok)return 0;
  const l=await r.json();return (Array.isArray(l)?l:l.results||[]).filter(c=>c.id!==buId&&AKTIF.has(c.status)).length;}catch{return 0;}}
// Türkiye saatiyle şu an kapalı mı? Tatil modu her işletmede; çalışma saatleri sadece tanımlıysa (randevulu işletmeler).
function kapaliMi(st){if(st.tatil?.aktif)return true;const wh=st.working_hours;if(!wh||!Object.keys(wh).length)return false;
 const n=new Date(),g=String(new Date(n.toLocaleString('en-US',{timeZone:'Europe/Istanbul'})).getDay()||7),
  hm=n.toLocaleTimeString('en-GB',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'}),v=wh[g];
 return !v||hm<v[0]||hm>=v[1];}
// Süre sınırlı bekleme: ek bilgiler (sadık müşteri, hat sayısı, sadakat) geç kalırsa aramayı bekletmeden onlarsız devam edilir
const sinirla=(p,ms,v)=>Promise.race([Promise.resolve(p).catch(()=>v),new Promise(r=>setTimeout(()=>r(v),ms))]);
export const maxDuration=10; // Vapi bu uca 7.5 saniye içinde cevap bekliyor
// Numaralar "istek modunda" (lib/vapi.js): her aramada Vapi bu adrese
// {message:{type:'assistant-request', call:{phoneNumberId,...}}} gönderir. Sırayla:
// 1) işletme durduysa arama işletmenin gerçek telefonuna aktarılır,
// 2) paketin eş zamanlı arama sınırı doluysa yine işletmeye aktarılır,
// 3) değilse asistan verilir; paket izin veriyorsa sadık müşteri adıyla karşılanır.
export async function POST(req){
 let biz=null;
 try{
  if(!(await vapiIzin(basliktan(req))))return NextResponse.json({error:'unauthorized'},{status:401});
  const body=await req.json(),m=body.message||body;
  if(m.type&&m.type!=='assistant-request')return NextResponse.json({});
  const pid=m.call?.phoneNumberId||m.phoneNumber?.id||null;
  if(!pid)return NextResponse.json({error:'phoneNumberId gelmedi'});
  const {data:b0}=await adminSb.from('businesses').select('id,status,vapi_assistant_id,phone_number,name,settings,quota_minutes_total').eq('vapi_phone_id',pid).maybeSingle();
  biz=b0;if(!biz)return NextResponse.json({error:'İşletme bulunamadı (vapi_phone_id eşleşmiyor)'});
  if(biz.status==='suspended'){
   const num=e164(biz.settings?.kota_yonlendirme||biz.phone_number);
   if(!num)return NextResponse.json({error:'İşletmenin yönlendirilecek telefon numarası (phone_number) tanımlı değil'});
   return NextResponse.json({destination:{type:'number',number:num,message:`Bu işletmenin otomatik asistan süresi bu ay için doldu, sizi ${biz.name||'işletmeye'} doğrudan bağlıyorum.`}});
  }
  if(biz.vapi_assistant_id){
   const pk=paketOf(biz),st=biz.settings||{},num=e164(st.kota_yonlendirme||biz.phone_number);
   const arayan=String(m.call?.customer?.number||m.customer?.number||'').replace(/\D/g,'').slice(-10);
   // YÖNLENDİRME TESTİ: arayan bizim test hattımızsa (işletmenin kendi numarasından yönlenmiş) testi başarılı say, kısaca söyle ve kapat
   if(arayan.length===10&&await sinirla(testYakala(biz,arayan),1500,false))return NextResponse.json({assistantId:biz.vapi_assistant_id,assistantOverrides:{firstMessage:'Dinlio bağlantı testi başarılı. Hattınız çalışıyor.',maxDurationSeconds:10,variableValues:{yonlendirmeTest:'evet'}}});
   // PATRON HATTI: işletme sahibi kayıtlı numarasından arıyorsa patron modunda açılır (PIN asistanda sorulur)
   if(pk.patron&&patronMu(st,arayan)){const ad0=String(st.asistan?.ad||'').trim();
    return NextResponse.json({assistantId:biz.vapi_assistant_id,assistantOverrides:{firstMessage:`Merhaba, patron hattına hoş geldiniz${ad0?', ben '+ad0:''}. Güvenlik için dört haneli PIN kodunuzu söyler misiniz?`,variableValues:{patron:'evet',kampanya:'',bilgi:'',kapali:'',musteriAdi:'',sonIslem:'',aramaSayisi:'0',asistanAdi:ad0,kisilik:'',acilTanim:'',maxDk:'',yavas:'',hatirlatma:'',randevuSaati:'',izinli:'evet',geriArama:'',ekSatis:'',cokDil:'',aktarma:''},maxDurationSeconds:300}});}
   // KARA LİSTE: engellenen numara asistana hiç bağlanmaz (dakika da harcanmaz)
   if(arayan.length===10&&(st.kara_liste||[]).includes(arayan)){
    await adminSb.from('webhook_events').insert({type:'kara_liste',business_id:biz.id,vapi_call_id:m.call?.id||null,payload:{numara:'***'+arayan.slice(-4)}});
    return NextResponse.json({error:'Bu numara işletme tarafından engellendi.'});}
   // EŞ ZAMANLI SINIR: paketin hat sayısı doluysa arama işletmenin kendi telefonuna aktarılır.
   // Ek sorgular paralel ve süre sınırlı (toplam en fazla ~3 sn): hat sayısı, sadık müşteri geçmişi, sadakat/izin
   const sa=sadakatAyar(st),gi=geriAyar(st);
   const [n,gec,sad]=await Promise.all([
    num?sinirla(aktifSayisi(pid,m.call?.id),2000,0):0,
    pk.sadik&&arayan.length===10?sinirla(adminSb.from('calls').select('customer_name,orders,extracted,created_at').eq('business_id',biz.id).or(`caller_phone.ilike.%${arayan},stated_phone.ilike.%${arayan}`).not('customer_name','is',null).order('created_at',{ascending:false}).limit(5).then(r=>r.data||[]),2500,[]):[],
    arayan.length===10?sinirla(Promise.all([pk.sadik&&sa.aktif&&sa.odul?alisverisSayisi(biz.id,arayan):-1,pk.geri&&gi.aktif?izinliMi(biz.id,arayan):false]),2500,[-1,null]):[-1,null]]);
   if(num){
    if(n>=pk.eszamanli){await adminSb.from('webhook_events').insert({type:'hat_dolu',business_id:biz.id,vapi_call_id:m.call?.id||null,payload:{aktif:n,sinir:pk.eszamanli,paket:pk.ad}});
     return NextResponse.json({destination:{type:'number',number:num,message:'Şu an tüm hatlarımız dolu, sizi doğrudan işletmeye bağlıyorum.'}});}}
   // Asistanın promptundaki {{kampanya}}, {{bilgi}}, {{kapali}} değişkenleri her aramada buradan dolar.
   // İşletme bilgisi (adres, saatler, servis bölgesi, SSS) her pakette gider; Büyük+ pakette uzun bilgi bankası (4000 karakter).
   const vv={kampanya:pk.kampanya&&st.kampanya?.aktif?String(st.kampanya.metin||''):'',bilgi:String(st.bilgi||'').slice(0,pk.bilgi?4000:1500),kapali:'',musteriAdi:'',sonIslem:'',aramaSayisi:'0'};
   const ov={},go=st.gorusme||{},ad=String(st.asistan?.ad||'').trim();
   const kayitCumle=go.kayit_kapali?'görüşme notlarımız hizmet kalitesi için tutulmaktadır':'görüşmemiz hizmet kalitesi için kaydedilmektedir';
   Object.assign(vv,{asistanAdi:ad,kisilik:String(st.asistan?.kisilik||''),acilTanim:String(st.acil_tanim||''),maxDk:go.max_dk?String(go.max_dk):'',hatirlatma:'',randevuSaati:'',izinli:'',geriArama:'',patron:'',cokDil:pk.cokDil&&st.cok_dil?.aktif?'evet':'',ekSatis:(()=>{const e=ekSatisAyar(st);return pk.ekSatis&&e.aktif?(e.oneri||'siparişe/randevuya uyan, listede olan bir ürün veya hizmet'):'';})(),aktarma:pk.aktarma&&st.aktarma_no?'evet':''});
   // Görüşme ayarları: süre sınırı, ses kaydını kapatma, yavaş konuşma, özel ses
   if(go.max_dk>=2&&go.max_dk<=30)ov.maxDurationSeconds=go.max_dk*60;
   if(go.kayit_kapali)ov.artifactPlan={recordingEnabled:false};
   const oz=pk.ozelSes&&st.ozel_ses?.voiceId&&st.ozel_ses.aktif!==false?{provider:'11labs',voiceId:st.ozel_ses.voiceId,model:'eleven_flash_v2_5'}:null,ses=oz||(go.yavas&&st.vapi_voice?.provider?{...st.vapi_voice}:null);
   // Hız ayarı sadece desteklediğini bildiğimiz ses sağlayıcılarında gönderilir; diğerlerinde yavaşlık prompttaki kuralla sağlanır
   if(ses){if(go.yavas&&['11labs','openai','azure','playht'].includes(ses.provider))ses.speed=0.85;if(oz||ses.speed)ov.voice=ses;}
   vv.yavas=go.yavas?'evet':'';
   if(ad)ov.firstMessage=`Merhaba, ${biz.name||'hoş geldiniz'}, ben yapay zeka asistanı ${ad}. ${kayitCumle[0].toUpperCase()+kayitCumle.slice(1)}. Size nasıl yardımcı olabilirim?`;
   // KAPALI SAAT / TATİL: tatil modu açıksa veya (randevulu işletmede) çalışma saati dışındaysa açılış değişir
   const kap=kapaliMi(st);
   if(kap){vv.kapali='evet';ov.firstMessage=`Merhaba, ${biz.name||'işletmemiz'} şu an kapalı.${st.tatil?.aktif&&st.tatil.mesaj?' '+st.tatil.mesaj:''} Ben yapay zeka asistanı${ad?' '+ad:'yım'}, ${kayitCumle}.${!st.tatil?.aktif&&st.working_hours?' Ama randevunuzu hemen ayarlayabilirim, hangi gün size uygun?':' İsterseniz talebinizi şimdiden not alayım, açılınca size dönüş yapılsın.'}`;}
   // SADIK MÜŞTERİ: aynı numara daha önce aradıysa ve adını biliyorsak açılışı kişiselleştir.
   if(pk.sadik&&arayan.length===10){try{
     const g=(gec||[]).find(x=>x.customer_name);
     if(g){const ex=g.extracted||{};
      // Arayan numara taklit edilebildiği için geçmiş sipariş/şikayet sesli söylenmez; sadece asistanın bağlamına verilir.
      vv.musteriAdi=g.customer_name;vv.sonIslem=String(g.orders||ex.service||ex.interest||ex.reason||'').slice(0,160);vv.aramaSayisi=String((gec||[]).length);
      ov.firstMessage=kap?`Hoş geldiniz ${g.customer_name}! ${biz.name||'İşletmemiz'} şu an kapalı ama ben buradayım; ${kayitCumle}. ${!st.tatil?.aktif&&st.working_hours?'Randevunuzu ayarlayayım mı?':'Talebinizi not alayım mı?'}`
       :g.orders?`Merhaba ${g.customer_name}, tekrar hoş geldiniz! Ben ${biz.name||'işletmenin'} yapay zeka asistanı${ad?' '+ad:'yım'}, ${kayitCumle}. Her zamankinden mi hazırlayalım, yoksa bugün farklı bir şey mi?`
       :`Hoş geldiniz ${g.customer_name}, sizi yeniden duymak çok güzel! Ben ${biz.name||'işletmenin'} yapay zeka asistanı${ad?' '+ad:'yım'}, ${kayitCumle}. Bugün nasıl yardımcı olabilirim?`;}
   }catch{}}
   // SADAKAT ve KAMPANYA İZNİ: kaçıncı alışverişi olduğu kampanya değişkenine eklenir (asistan kesinleşince bir kez söyler)
   if(arayan.length===10){try{const [as,iz]=sad;
     if(as>=0){const sm=sadakatMetni(sa,as,vv.musteriAdi);if(sm)vv.kampanya=[vv.kampanya,sm].filter(Boolean).join(' ');}
     vv.izinli=iz===null?'':iz?'evet':'hayır';}catch{}}
   return NextResponse.json({assistantId:biz.vapi_assistant_id,assistantOverrides:{...ov,variableValues:vv}});
  }
  {const num0=e164(biz.settings?.kota_yonlendirme||biz.phone_number);if(num0)return NextResponse.json({destination:{type:'number',number:num0,message:'Sizi işletmeye bağlıyorum.'}});}
  return NextResponse.json({error:'Asistan tanımlı değil'});
 }catch(e){
  // Beklenmeyen hata: arama düşmesin. İşletme biliniyorsa asistanı ek ayarlar olmadan ver, o da yoksa işletmenin telefonuna aktar.
  try{await adminSb.from('webhook_events').insert({type:'assist_hata',business_id:biz?.id||null,payload:{hata:String(e?.message||e).slice(0,300)}});}catch{}
  if(biz?.vapi_assistant_id&&biz.status!=='suspended')return NextResponse.json({assistantId:biz.vapi_assistant_id});
  const num0=biz&&e164(biz.settings?.kota_yonlendirme||biz.phone_number);if(num0)return NextResponse.json({destination:{type:'number',number:num0,message:'Sizi işletmeye bağlıyorum.'}});
  return NextResponse.json({error:'internal'});}
}
