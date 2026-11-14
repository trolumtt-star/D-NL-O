// BÜYÜME ÖZELLİKLERİ: rakiplerde olmayan, işletmeye doğrudan para kazandıran / kaçan parayı geri getiren araçlar.
// 1) Sadakat: arayanı numarasından tanır, kaçıncı siparişi/randevusu olduğunu sayar, ödül sırası gelince asistan müjdeler.
// 2) Randevu teyidi + bekleme listesi: iptal edilen saat bekleme listesindekilere haber verilerek doldurulur.
// 3) İzinli geri kazanma araması: sadece kampanya aramasına AÇIK İZİN veren ve uzun süredir gelmeyen müşteriler aranır.
// 4) Kazanç özeti ve "neyi kaçırıyorsun" raporu.
import {adminSb} from './admin';import {paketOf} from './paket';import {gidenArama} from './vapi';import {bildir} from './bildir';import {smsGonder} from './entegrasyon';
const TZ='Europe/Istanbul';
export const son10=s=>{const d=String(s||'').replace(/\D/g,'');return d.length>=10?d.slice(-10):'';};
// Asistanın şablon motoru {{ }} ve {% %} kullanır; işletmenin yazdığı metin şablon gibi çalışmasın
export const temiz=(s,n)=>String(s||'').replace(/[{}%]/g,'').replace(/\r/g,'').trim().slice(0,n);
const saatTR=d=>new Date(d).toLocaleTimeString('tr-TR',{timeZone:TZ,hour:'2-digit',minute:'2-digit'});
const tarihTR=d=>new Date(d).toLocaleDateString('tr-TR',{timeZone:TZ,day:'numeric',month:'long'});

// ---------- 1) SADAKAT ----------
// Bu numaranın iptal edilmemiş sipariş + randevu sayısı (şu anki dahil)
export async function alisverisSayisi(bid,tel){
 if(tel.length!==10)return 0;
 const [{data:c},{data:a}]=await Promise.all([
  adminSb.from('calls').select('order_status').eq('business_id',bid).not('orders','is',null).or(`caller_phone.ilike.%${tel},stated_phone.ilike.%${tel}`).limit(1000),
  adminSb.from('appointments').select('status').eq('business_id',bid).ilike('customer_phone','%'+tel).in('status',['confirmed','completed']).limit(1000)]);
 return (c||[]).filter(x=>x.order_status!=='cancelled').length+(a||[]).length;}
export const sadakatAyar=st=>{const s=st?.sadakat||{};return {aktif:!!s.aktif,her:Math.min(50,Math.max(2,+s.her||5)),odul:temiz(s.odul,80)||'',komisyon:Math.min(50,Math.max(0,+s.komisyon||0)),sepet:Math.min(100000,Math.max(0,+s.sepet||0))};};
// Arama başında asistana verilen bağlam (henüz bu sipariş yok: sıradaki = önceki+1)
export function sadakatMetni(ay,onceki,ad){
 if(!ay.aktif||!ay.odul)return '';const sira=onceki+1,kalan=ay.her-(sira%ay.her||ay.her);
 if(sira%ay.her===0)return `SADAKAT: Bu müşteri${ad?' ('+ad+')':''} bu siparişle ${sira}. alışverişini yapacak ve ödül kazandı: ${ay.odul}. Sipariş/randevu kesinleşince bunu sevinçle müjdele ve kayda "ÖDÜL: ${ay.odul}" notunu ekle.`;
 if(onceki>0)return `SADAKAT: Her ${ay.her}. alışverişte ${ay.odul}. Bu müşterinin bu alışverişten sonra ödüle ${kalan} alışverişi kalacak; kesinleşince bir cümleyle söyle.`;
 return `SADAKAT: İşletmede sadakat programı var: her ${ay.her}. alışverişte ${ay.odul}. Kesinleşince bir cümleyle söyle.`;}
// Kayıt anında (bu sipariş dahil) ödül sırası geldi mi? Geldiyse işletmeye bildirimde gösterilir ve bir kez sayılır.
export async function sadakatKontrol(bid,st,tel,callId){
 const ay=sadakatAyar(st);if(!ay.aktif||!ay.odul||tel.length!==10)return null;
 const n=await alisverisSayisi(bid,tel);if(!n||n%ay.her!==0)return {n,odul:null};
 if(callId){const {count}=await adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('type','sadakat_odul').eq('vapi_call_id',callId);
  if(!count)await adminSb.from('webhook_events').insert({type:'sadakat_odul',business_id:bid,vapi_call_id:callId,payload:{n,odul:ay.odul,tel:'***'+tel.slice(-4)}});}
 return {n,odul:ay.odul};}

// ---------- 2) RANDEVU TEYİDİ + BEKLEME LİSTESİ ----------
export async function randevuTeyit({bid,biz,pk,a,call}){
 const tel=son10(a.phone)||son10(call.customer?.number);
 if(tel.length!==10)return {ok:false,reason:'Telefon numarası görünmüyor. Müşteriden randevuyu aldığı numarayı iste ve phone alanına yazıp tekrar çağır.'};
 const {data:l}=await adminSb.from('appointments').select('id,customer_name,starts_at,notes').eq('business_id',bid).eq('status','confirmed').ilike('customer_phone','%'+tel)
  .gte('starts_at',new Date(Date.now()-36e5).toISOString()).lte('starts_at',new Date(Date.now()+14*864e5).toISOString()).order('starts_at').limit(1);
 const r=l?.[0];if(!r)return {ok:false,reason:'Bu numarayla yaklaşan onaylı randevu bulunamadı. Müşteriye hangi numarayla aldığını sor.'};
 const durum=['geliyor','iptal','ertele'].includes(a.durum)?a.durum:'geliyor',zaman=`${tarihTR(r.starts_at)} ${saatTR(r.starts_at)}`;
 await adminSb.from('webhook_events').insert({type:'teyit',business_id:bid,vapi_call_id:call.id||null,payload:{durum,randevu:r.id}});
 if(durum==='geliyor')return {ok:true,message:`Randevu (${zaman}) teyit edildi. Müşteriye teşekkür et ve vedalaş.`};
 const not=temiz(a.not,200);
 await adminSb.from('appointments').update({status:'cancelled',notes:[r.notes,`Telefonla ${durum==='ertele'?'ertelendi':'iptal edildi'}${not?': '+not:''}`].filter(Boolean).join(' · ').slice(0,500)}).eq('id',r.id);
 const gun=new Date(r.starts_at).toLocaleDateString('sv-SE',{timeZone:TZ});
 const {data:bk}=await adminSb.from('bekleme_listesi').select('id,ad,tel,hizmet').eq('business_id',bid).eq('tarih',gun).eq('durum','bekliyor').order('created_at').limit(5);
 let ek='';
 if(bk?.length){ek='\n⏳ Bekleme listesinde bu gün için:\n'+bk.map(x=>`• ${x.ad||'İsimsiz'} 0${x.tel}${x.hizmet?' ('+x.hizmet+')':''}`).join('\n');
  if(pk.sms){let n=0;for(const x of bk.slice(0,3)){const s=await smsGonder(x.tel,`${biz.name||'İşletme'}: ${zaman} için yer açıldı. Almak isterseniz hemen bizi arayın, ilk arayan alır.`);if(s.ok)n++;}
   if(n){ek+=`\n📩 İlk ${n} kişiye SMS ile haber verildi.`;await adminSb.from('bekleme_listesi').update({durum:'haber_verildi'}).in('id',bk.slice(0,3).map(x=>x.id));}}
  await adminSb.from('webhook_events').insert({type:'bekleme_haber',business_id:bid,payload:{gun,kisi:bk.length}});}
 await bildir(bid,`❌ Randevu ${durum==='ertele'?'ertelendi':'iptal edildi'}\n${zaman}${r.customer_name?' · '+r.customer_name:''}${not?'\nNot: '+not:''}\nSaat boşaldı.${ek}`);
 return {ok:true,message:durum==='ertele'?'Eski randevu iptal edildi. Şimdi check_availability ile müşteriye yeni gün/saat bul ve book_appointment ile kaydet.':'Randevu iptal edildi. Müşteriye anlayışla teşekkür et, istersen başka bir gün için randevu öner.'};}
export async function beklemeEkle({bid,a,call,tarih}){
 const tel=son10(a.phone)||son10(call.customer?.number);if(tel.length!==10)return {ok:false,reason:'Haber verebilmek için müşterinin cep numarasını iste ve phone alanına yazıp tekrar çağır.'};
 const {count}=await adminSb.from('bekleme_listesi').select('id',{count:'exact',head:true}).eq('business_id',bid).eq('tel',tel).eq('tarih',tarih).eq('durum','bekliyor');
 if(!count){const {error}=await adminSb.from('bekleme_listesi').insert({business_id:bid,ad:temiz(a.name,80)||null,tel,tarih,hizmet:temiz(a.service,80)||null,notlar:temiz(a.notes,200)||null,call_id:call.id||null});if(error)return {ok:false,reason:error.message};
  await bildir(bid,`⏳ Bekleme listesine eklendi\n${tarihTR(tarih+'T12:00:00+03:00')}${a.service?' · '+temiz(a.service,80):''}${a.name?'\n👤 '+temiz(a.name,80):''}\n📞 0${tel}`);}
 return {ok:true,message:'Bekleme listesine eklendi. Müşteriye o gün yer açılırsa haber verileceğini söyle.'};}

// ---------- 3) KAMPANYA İZNİ + GERİ KAZANMA ARAMASI ----------
export const geriAyar=st=>{const g=st?.geri_cagirma||{};return {aktif:!!g.aktif,gun:Math.min(365,Math.max(15,+g.gun||45)),teklif:temiz(g.teklif,200),gunluk:Math.min(30,Math.max(1,+g.gunluk||10))};};
export async function izinKaydet({bid,a,call}){
 const tel=son10(call.customer?.number)||son10(a.phone);if(tel.length!==10)return {ok:false,reason:'Numara görünmüyor, izin kaydedilemedi. Müşteriye teşekkür et ve devam et.'};
 const izin=a.izin===true||a.izin==='true';
 const {error}=await adminSb.from('musteri_izin').upsert({business_id:bid,tel,izin,ad:temiz(a.name,80)||null,kaynak:'telefon',call_id:call.id||null,guncel:new Date().toISOString()},{onConflict:'business_id,tel'});
 if(error)return {ok:false,reason:error.message};
 return {ok:true,message:izin?'İzin kaydedildi. Teşekkür et, istediği zaman "aramayın" diyerek vazgeçebileceğini söyle.':'Kaydedildi, bu numara bir daha kampanya için aranmayacak. Kibarca teşekkür et.'};}
export async function izinliMi(bid,tel){if(tel.length!==10)return false;const {data}=await adminSb.from('musteri_izin').select('izin').eq('business_id',bid).eq('tel',tel).maybeSingle();return !!data?.izin;}
// Her gün öğleden sonra (Pzt-Cmt): izinli + uzun süredir alışveriş yapmayan müşterileri arar. İşletme başına günlük sınır.
export async function geriKazan({butce=45000}={}){
 const bas=Date.now(),gunNo=new Date(new Date().toLocaleString('en-US',{timeZone:TZ})).getDay();if(gunNo===0)return {pazar:true};
 const {data:l}=await adminSb.from('businesses').select('id,name,status,quota_minutes_total,settings,vapi_phone_id,vapi_assistant_id').eq('status','active');
 let n=0;const hatalar=[];
 for(const b of l||[]){const st=b.settings||{},g=geriAyar(st);if(!paketOf(b).geri||!g.aktif||!g.teklif||!b.vapi_phone_id||!b.vapi_assistant_id)continue;
  const esik=new Date(Date.now()-g.gun*864e5).toISOString(),tekrar=new Date(Date.now()-60*864e5).toISOString();
  const {data:iz}=await adminSb.from('musteri_izin').select('tel,ad,son_arama').eq('business_id',b.id).eq('izin',true).or(`son_arama.is.null,son_arama.lt.${tekrar}`).lt('guncel',esik).limit(200);
  let say=0;
  for(const m of iz||[]){if(say>=g.gunluk)break;if(Date.now()-bas>butce)return {n,hatalar,yarim:true};if((st.kara_liste||[]).includes(m.tel))continue;
   // Son temas (çağrı) eşikten yeniyse arama; müşteri zaten geliyor demektir
   const {data:son}=await adminSb.from('calls').select('created_at').eq('business_id',b.id).ilike('caller_phone','%'+m.tel).gte('created_at',esik).limit(1);if(son?.length)continue;
   const r=await gidenArama({phoneNumberId:b.vapi_phone_id,assistantId:b.vapi_assistant_id,numara:m.tel,
    firstMessage:`Merhaba${m.ad?' '+m.ad:''}, ben ${b.name||'işletmemizin'} yapay zeka asistanıyım. Kampanyalardan haberdar olmaya izin verdiğiniz için arıyorum, bir dakikanızı alabilir miyim?`,
    variableValues:{geriArama:g.teklif,musteriAdi:m.ad||'',izinli:'evet'}});
   await adminSb.from('musteri_izin').update({son_arama:new Date().toISOString()}).eq('business_id',b.id).eq('tel',m.tel);
   if(r.ok){n++;say++;await adminSb.from('webhook_events').insert({type:'geri_arama',business_id:b.id,vapi_call_id:r.id||null,payload:{tel:'***'+m.tel.slice(-4)}});}
   else{hatalar.push(r.neden);break;}}}
 return {n,hatalar:[...new Set(hatalar)].slice(0,5)};}

// ---------- 4) KAZANÇ ÖZETİ ve KAÇIRILANLAR ----------
// Çalışma saati dışında mı (tanımlı değilse 22:00-09:00 arası "gece" sayılır)
const disarida=(d,wh)=>{const t=new Date(new Date(d).toLocaleString('en-US',{timeZone:TZ})),hm=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
 if(wh&&Object.keys(wh).length){const v=wh[String(t.getDay()||7)];return !v||hm<v[0]||hm>=v[1];}return hm>='22:00'||hm<'09:00';};
export async function kazanc(b,bas){
 const st=b.settings||{},ay=sadakatAyar(st),iso=bas.toISOString();
 const [{data:c},{data:ap},{data:ev}]=await Promise.all([
  adminSb.from('calls').select('created_at,orders,order_status,caller_phone,stated_phone,vapi_call_id').eq('business_id',b.id).gte('created_at',iso).limit(5000),
  adminSb.from('appointments').select('id').eq('business_id',b.id).eq('source','vapi').gte('created_at',iso).limit(5000),
  adminSb.from('webhook_events').select('type,vapi_call_id,payload').eq('business_id',b.id).in('type',['sadakat_odul','bekleme_haber','geri_arama','hat_dolu','teyit','ek_satis','patron_islem']).gte('created_at',iso).limit(5000)]);
 const L=c||[],sip=L.filter(x=>x.orders&&x.order_status!=='cancelled'),E=ev||[],say=t=>E.filter(x=>x.type===t).length;
 const kisi={};for(const x of sip){const t=son10(x.stated_phone||x.caller_phone);if(t)kisi[t]=(kisi[t]||0)+1;}
 const geriIds=new Set(E.filter(x=>x.type==='geri_arama'&&x.vapi_call_id).map(x=>x.vapi_call_id));
 return {cagri:L.length,siparis:sip.length,randevu:(ap||[]).length,kapaliyken:L.filter(x=>disarida(x.created_at,st.working_hours)).length,
  sadik:Object.values(kisi).filter(v=>v>=2).length,odul:say('sadakat_odul'),bekleme:say('bekleme_haber'),teyit:say('teyit'),geriArama:geriIds.size,
  geriDonus:L.filter(x=>geriIds.has(x.vapi_call_id)&&x.orders).length,hatDolu:say('hat_dolu'),
  ekSatis:E.filter(x=>x.type==='ek_satis').length,ekSatisTl:E.filter(x=>x.type==='ek_satis').reduce((t,x)=>t+(+x.payload?.tl||0),0),patron:say('patron_islem'),
  komisyon:ay.komisyon&&ay.sepet?Math.round(sip.length*ay.sepet*ay.komisyon/100):0,ciro:ay.sepet?Math.round(sip.length*ay.sepet):0};}
// Haftalık rapora eklenen "neyi kaçırıyorsun" satırları
export async function kacanlar(b,bas,son){
 const st=b.settings||{},a=bas.toISOString(),z=son.toISOString();
 const [{data:c},{data:t}]=await Promise.all([
  adminSb.from('calls').select('created_at,duygu,orders,customer_name,extracted').eq('business_id',b.id).gte('created_at',a).lt('created_at',z).limit(5000),
  adminSb.from('webhook_events').select('payload').eq('business_id',b.id).eq('type','tool_call').gte('created_at',a).lt('created_at',z).limit(3000)]);
 const L=c||[],sat=[];
 const yok={};for(const e of t||[]){const p=e.payload||{};if(p.tool!=='get_price')continue;const q=String(p.args?.item||p.args?.service||'').trim().toLowerCase();if(!q)continue;
  let it=[];try{it=(typeof p.result==='string'?JSON.parse(p.result):p.result)?.items||[];}catch{}if(!it.length)yok[q]=(yok[q]||0)+1;}
 const enCok=Object.entries(yok).sort((x,y)=>y[1]-x[1]).slice(0,3);
 if(enCok.length)sat.push('🔎 Sorulan ama listende olmayanlar: '+enCok.map(([k,v])=>`${k} (${v})`).join(', '));
 const kap=L.filter(x=>disarida(x.created_at,st.working_hours)).length;if(kap)sat.push(`🌙 ${kap} çağrı ${st.working_hours?'kapalı saatlerde':'gece 22:00-09:00 arasında'} geldi, asistan karşıladı`);
 const sin=L.filter(x=>x.duygu==='sinirli').length;if(sin)sat.push(`😠 ${sin} müşteri görüşmeyi sinirli bitirdi, Çağrılar'dan bakmanızı öneririz`);
 const bos=L.filter(x=>!x.orders&&!x.customer_name&&!(x.extracted&&Object.keys(x.extracted).length)).length;if(bos>=3)sat.push(`☎ ${bos} çağrıda müşteri bilgi vermeden kapattı`);
 return sat;}

// ---------- 5) AKILLI EK SATIŞ ----------
// Asistan siparişe/randevuya uygun bir ürünü bir kez önerir; kabul edilen ürün ve fiyatı aramaya bir kez yazılır (kazanç kartında toplanır).
export const ekSatisAyar=st=>{const e=st?.ek_satis||{};return {aktif:!!e.aktif,oneri:temiz(e.oneri,300)};};
export async function ekSatisKaydet(bid,callId,urun,tablo='menu_items'){
 const u=temiz(urun,80);if(!u||!callId)return;
 const kel=u.replace(/[%_,()]/g,' ').split(/\s+/).filter(w=>w.length>2).slice(0,3);let fiyat=0;
 for(const t of [tablo,tablo==='menu_items'?'services':'menu_items']){if(fiyat)break;
  const {data}=await adminSb.from(t).select('name,price').eq('business_id',bid).or(kel.length?kel.map(w=>'name.ilike.%'+w+'%').join(','):'name.ilike.%'+u+'%').limit(5);
  const x=(data||[]).find(r=>+r.price>0);if(x){const adet=+(u.match(/^(\d+)\s/)||[])[1]||1;fiyat=Math.round(+x.price*Math.min(adet,10));}}
 const {data:v}=await adminSb.from('webhook_events').select('id').eq('type','ek_satis').eq('vapi_call_id',callId).limit(1);
 if(v?.length)await adminSb.from('webhook_events').update({payload:{urun:u,tl:fiyat}}).eq('id',v[0].id);
 else await adminSb.from('webhook_events').insert({type:'ek_satis',business_id:bid,vapi_call_id:callId,payload:{urun:u,tl:fiyat}});}

// ---------- 6) PATRON HATTI ----------
// İşletme sahibi kayıtlı numarasından kendi asistanını arar, PIN söyler; "künefe bitti", "adana 200 lira oldu", "bugün kapalıyız" gibi
// değişiklikler anında uygulanır. Numara taklit edilebildiği için PIN şart; 1 saatte 3 yanlış PIN'de kilitlenir.
export const patronAyar=st=>{const p=st?.patron||{};return {aktif:!!p.aktif,numaralar:(p.numaralar||[]).filter(x=>/^\d{10}$/.test(x)).slice(0,3),pinVar:!!p.pin};};
export const patronMu=(st,tel)=>{const p=patronAyar(st);return p.aktif&&p.pinVar&&tel.length===10&&p.numaralar.includes(tel);};
export async function patronIslem({bid,biz,a,call}){
 const st=biz.settings||{},tel=son10(call.customer?.number);
 if(!patronMu(st,tel))return {ok:false,reason:'Bu numara patron hattına kayıtlı değil. Arayana bunun sadece işletme sahibinin kayıtlı numarasından yapılabileceğini söyle.'};
 const {count:hata}=await adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('business_id',bid).eq('type','patron_pin_hata').gte('created_at',new Date(Date.now()-36e5).toISOString());
 if(hata>=3)return {ok:false,reason:'Çok fazla yanlış PIN denendi, patron hattı 1 saat kilitli. Bunu söyle ve görüşmeyi kibarca bitir.'};
 if(String(a.pin||'').replace(/\D/g,'')!==String(st.patron.pin)){await adminSb.from('webhook_events').insert({type:'patron_pin_hata',business_id:bid,vapi_call_id:call.id||null,payload:{}});
  return {ok:false,reason:`PIN yanlış (${2-hata>0?2-hata+' deneme hakkı kaldı':'son deneme yanlıştı, hat kilitlendi'}). Tekrar sor.`};}
 const islem=String(a.islem||''),urun=temiz(a.urun,80),metin=temiz(a.metin,300);let sonuc='',degisti=true;
 const urunBul=async()=>{const t=['restaurant','wholesale'].includes(biz.vertical||'restaurant')?'menu_items':'services';if(!urun)return {t,l:[]};
  const {data}=await adminSb.from(t).select('id,name,price').eq('business_id',bid).ilike('name','%'+urun.replace(/[%_,()]/g,' ')+'%').limit(6);return {t,l:data||[]};};
 if(islem==='kontrol')return {ok:true,message:'PIN doğru. Patrona ne değiştirmek istediğini sor: ürün tükendi/geldi, fiyat, bugün kapalı/açık, kampanya, bilgi notu.'};
 if(['tukendi','geldi','fiyat'].includes(islem)){const {t,l}=await urunBul();
  if(!l.length)return {ok:false,reason:`"${urun}" listede bulunamadı. Patrona ürünün tam adını sor.`};
  if(l.length>1&&!l.some(x=>x.name.toLowerCase()===urun.toLowerCase()))return {ok:false,reason:'Birden fazla ürün eşleşti: '+l.map(x=>x.name).join(', ')+'. Patrona hangisi olduğunu sor ve tam adıyla tekrar çağır.'};
  const x=l.find(x=>x.name.toLowerCase()===urun.toLowerCase())||l[0];
  if(islem==='fiyat'){const f=Math.round(+String(a.fiyat||'').replace(',','.')*100)/100;if(!(f>0&&f<1e6))return {ok:false,reason:'Yeni fiyatı rakamla sor.'};await adminSb.from(t).update({price:f}).eq('id',x.id);sonuc=`${x.name}: ${x.price??'-'} ₺ → ${f} ₺`;}
  else{await adminSb.from(t).update(t==='menu_items'?{available:islem==='geldi'}:{active:islem==='geldi'}).eq('id',x.id);sonuc=`${x.name}: ${islem==='geldi'?'tekrar satışta':'tükendi, asistan önermeyecek'}`;}}
 else if(islem==='kapali'||islem==='acik'){const s={...st,tatil:{aktif:islem==='kapali',mesaj:metin||st.tatil?.mesaj||''}};await adminSb.from('businesses').update({settings:s}).eq('id',bid);sonuc=islem==='kapali'?`Kapalı modu açıldı${metin?' ('+metin+')':''}`:'Kapalı modu kapatıldı, normal çalışılıyor';}
 else if(islem==='kampanya'){const s={...st,kampanya:{aktif:!!metin,metin}};await adminSb.from('businesses').update({settings:s}).eq('id',bid);sonuc=metin?'Kampanya: '+metin:'Kampanya kapatıldı';}
 else if(islem==='bilgi'){if(!metin)return {ok:false,reason:'Eklenecek bilgiyi sor.'};const tarih=new Date().toLocaleDateString('tr-TR',{timeZone:TZ});const s={...st,bilgi:[String(st.bilgi||''),`(${tarih}) ${metin}`].filter(Boolean).join('\n').slice(-4000)};await adminSb.from('businesses').update({settings:s}).eq('id',bid);sonuc='Bilgi eklendi: '+metin;}
 else degisti=false;
 if(!degisti)return {ok:false,reason:'Bu işlem yapılamıyor. Yapabildiklerin: ürün tükendi/geldi, fiyat değişikliği, kapalı/açık, kampanya, bilgi notu.'};
 await adminSb.from('webhook_events').insert({type:'patron_islem',business_id:bid,vapi_call_id:call.id||null,payload:{islem,sonuc}});
 await bildir(bid,`🎙 Patron hattından değişiklik\n${sonuc}`);
 return {ok:true,message:`Yapıldı: ${sonuc}. Patrona kısaca onayla ve başka bir şey isteyip istemediğini sor.`};}

// ---------- 7) ÇOK DİLLİ ASİSTAN ----------
// Açılınca asistanın dinleyicisi otomatik dil algılayan modele, sesi çok dilli sese alınır; eski ayar yedeklenir, kapanınca geri yüklenir.
// Vapi ayarı reddederse özellik açılmaz (arama bozulmasın diye).
const COK_DIL_DINLEYICI=[{provider:'google',model:'gemini-3.8-flash',language:'Multilingual'},{provider:'google',language:'Multilingual'},{provider:'deepgram',model:'nova-3',language:'multi'}];
export async function cokDilAyarla(b,aktif,vapi){
 if(!b.vapi_assistant_id)throw new Error('Asistan henüz kurulmamış.');
 const g=await vapi('/assistant/'+b.vapi_assistant_id);if(!g.ok)throw new Error('Asistan okunamadı.');
 const st=b.settings||{},once=st.cok_dil||{};
 if(!aktif){if(once.aktif&&once.yedek){const r=await vapi('/assistant/'+b.vapi_assistant_id,{method:'PATCH',body:JSON.stringify({...(once.yedek.transcriber?{transcriber:once.yedek.transcriber}:{}),...(once.yedek.voice?{voice:once.yedek.voice}:{})})});if(!r.ok)throw new Error('Eski dil ayarı geri yüklenemedi: '+r.error);}
  return {aktif:false};}
 if(once.aktif)return once;
 const yedek={transcriber:g.d.transcriber||null,voice:g.d.voice||null},v={...(g.d.voice||{})};let sesNot='';
 if(v.provider==='azure')v.voiceId='multilingual-auto';
 else if(v.provider==='11labs'&&!/multilingual|turbo_v2_5|flash_v2_5|eleven_v3/.test(String(v.model||'')))v.model='eleven_turbo_v2_5';
 else if(!['azure','11labs','vapi'].includes(v.provider))sesNot=' Sesinizin sağlayıcısı ('+(v.provider||'?')+') yabancı dilde aksanlı konuşabilir.';
 let son=null;
 for(const tr of COK_DIL_DINLEYICI){const r=await vapi('/assistant/'+b.vapi_assistant_id,{method:'PATCH',body:JSON.stringify({transcriber:tr,voice:v})});if(r.ok)return {aktif:true,yedek,dinleyici:tr.provider+(tr.model?' '+tr.model:''),not:sesNot};son=r.error;}
 throw new Error('Vapi çok dilli ayarı kabul etmedi: '+son);}
