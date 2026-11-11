import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';
export const dynamic='force-dynamic';export const maxDuration=45;
// Sektöre göre gereken bütün Vapi araçlarını oluşturur, asistana bağlar ve prompta kullanım kurallarını ekler.
// Asistanda aynı isimde araç zaten varsa onu tekrar oluşturmaz, sadece adresini günceller.
const S=(t,d,e={})=>({type:t,description:d,...e});
const TANIM={
 save_order:{d:'Müşterinin onayladığı siparişi işletme paneline anında kaydeder.',p:{customerName:S('string','Müşterinin adı'),orders:S('string','Ürünler ve adetleri, ör. 2 adana dürüm, 1 ayran'),address:S('string','Tam teslimat adresi (gel-al ise "gel-al")'),phone:S('string','Müşterinin söylediği telefon numarası'),lat:S('number','find_location ile onaylanan konumun enlemi'),lng:S('number','find_location ile onaylanan konumun boylamı'),kuryeNotu:S('string','Müşterinin tarifi: hangi binadan dönülür, ev rengi, kapı vb.')},r:['orders'],m:'Hemen kaydediyorum.',
  k:'- Sipariş netleşip müşteriye tekrar edip onay aldığın anda save_order aracını çağır (orders: ürünler ve adetler, address: tam adres, customerName: ad, phone: söylediği numara). Müşteri sonradan değişiklik yaparsa save_order\'ı güncel tam siparişle yeniden çağır. Araç başarılı dönünce siparişin alındığını söyle.'},
 find_location:{d:'Müşteri tam adres veremeyip tarif ettiğinde (mahalle + yakındaki market, eczane, cami, okul gibi yerler) haritada konumu bulur ve teyit için aday yerler döner.',p:{mahalle:S('string','Mahalle adı, ör. Dere'),ilce:S('string','İlçe (biliniyorsa)'),yerler:S('array','Tarifte geçen yerler, ör. ["BİM","eczane"]',{items:{type:'string'}}),tarif:S('string','Müşterinin tarifi aynen')},r:['yerler'],m:'Hemen haritadan bakıyorum.',
  k:'- Müşteri tam adres veremeyip tarif ederse find_location aracını çağır (mahalle + tarifteki yerler). Dönen adayı evet/hayır ile teyit et; hayır derse sıradakini sor. Onaylanınca save_order\'a lat, lng ve müşterinin tarifini kuryeNotu olarak ekle.'},
 get_price:{d:'Menüdeki ya da hizmet listesindeki ürünün/hizmetin güncel fiyatını ve durumunu verir. Boş bırakılırsa listenin tamamını döner.',p:{item:S('string','Sorulan ürün veya hizmet, ör. adana dürüm. Tüm menü için boş bırak.')},r:[],m:'Hemen fiyata bakıyorum.',
  k:'- Müşteri fiyat, menü, ne var ne yok sorarsa MUTLAKA get_price aracını çağır ve fiyatı sadece araçtan gelen listeden söyle. Asla "bilgim yok" deme, asla fiyat uydurma. Ürün listede yoksa olmadığını söyle ve benzerini öner.'},
 check_tables:{d:'Belirtilen tarih ve saatte boş masaları listeler.',p:{date:S('string','Tarih YYYY-AA-GG ya da "bugün", "yarın"'),time:S('string','Saat SS:DD'),partySize:S('string','Kişi sayısı')},r:['time'],m:'Bir saniye, masalara bakıyorum.',
  k:'- Masa/rezervasyon sorulursa önce check_tables ile boş masaya bak, sonra book_table ile ayır.'},
 book_table:{d:'Masa rezervasyonu yapar.',p:{date:S('string','Tarih'),time:S('string','Saat SS:DD'),name:S('string','Müşteri adı'),phone:S('string','Telefon'),partySize:S('string','Kişi sayısı'),tableNumber:S('string','Masa numarası (biliniyorsa)')},r:['time','name'],m:'Rezervasyonunuzu yapıyorum.',k:''},
 check_availability:{d:'Belirtilen gün için boş randevu saatlerini listeler.',p:{date:S('string','Tarih YYYY-AA-GG ya da "bugün", "yarın"'),service:S('string','İstenen hizmet')},r:['date'],m:'Bir saniye, takvime bakıyorum.',
  k:'- Randevu istenirse önce check_availability ile boş saatlere bak, müşteriye 2-3 seçenek sun, onaylanınca book_appointment ile kaydet.'},
 book_appointment:{d:'Randevu oluşturur.',p:{date:S('string','Tarih'),time:S('string','Saat SS:DD'),service:S('string','Hizmet'),staff:S('string','Tercih edilen kişi (usta/doktor)'),name:S('string','Müşteri adı'),phone:S('string','Telefon'),notes:S('string','Not')},r:['date','time','name'],m:'Randevunuzu oluşturuyorum.',k:''},
};
const arac=(ad,T,url,sec)=>{const t=T[ad];return {type:'function',async:false,function:{name:ad,description:t.d,parameters:{type:'object',properties:t.p,required:t.r}},messages:[{type:'request-start',content:t.m}],server:sec?{url,headers:{'x-vapi-secret':sec}}:{url}};};
export async function POST(req){try{await requireAdmin(req);const {business_id}=await req.json();
 const key=process.env.VAPI_API_KEY,sec=process.env.VAPI_SECRET;if(!key)throw new Error('Vercel\'de VAPI_API_KEY tanımlı değil.');
 const {data:b}=await adminSb.from('businesses').select('id,vertical,plan,vapi_assistant_id,settings').eq('id',business_id).single();
 if(!b?.vapi_assistant_id)throw new Error('Bu işletmede Vapi asistan kimliği yok.');
 const V=b.vertical||'restaurant';
 // Sektörün araştırılmış yapılandırması: alanlar, terimler, notlar (Sektörler sekmesinden yönetilir)
 const {data:vd}=await adminSb.from('verticals').select('id,name,kind,config').eq('id',V).maybeSingle();
 const cfg=vd?.config||{},kind=vd?.kind||(['restaurant','wholesale'].includes(V)?'order':'appointment'),siparis=kind==='order';
 const alanlar=(cfg.fields||[]).filter(f=>f.k&&f.l&&!['orders','address','customerName','statedPhone','phone'].includes(f.k)).slice(0,12);
 const T2={...TANIM};
 if(!siparis){const pr={customerName:S('string','Müşterinin adı')};for(const f of alanlar)pr[f.k]=S('string',f.l);pr.phone=S('string','Müşterinin geri aranmak için söylediği telefon numarası');
  T2.save_request={d:'Görüşmede öğrenilen bilgileri işletme paneline anında kaydeder. Aynı çağrıda tekrar çağrılınca eski bilgilerle birleşir.',p:pr,r:[],m:'Not alıyorum.',
   k:'- Müşterinin adını ve ne istediğini öğrenir öğrenmez save_request aracını çağır; yeni bilgi geldikçe ('+alanlar.slice(0,4).map(f=>String(f.l).toLowerCase()).join(', ')+' gibi) aracı o ana kadar bildiğin TÜM bilgilerle tekrar çağır. Müşteriye bu kayıttan bahsetme, doğal konuşmaya devam et.'};}
 const gerek=siparis?['save_order','find_location','get_price',...(V==='restaurant'?['check_tables','book_table']:[])]
  :kind==='appointment'?['save_request','get_price','check_availability','book_appointment']
  :['save_request','get_price'];
 let {data:ep}=await adminSb.from('webhook_endpoints').select('token').eq('business_id',b.id).eq('kind','tools').limit(1).maybeSingle();
 if(!ep){const r=await adminSb.from('webhook_endpoints').insert({business_id:b.id,kind:'tools',label:'vapi araçları'}).select('token').single();if(r.error)throw r.error;ep=r.data;}
 const url=new URL(req.url).origin+'/api/vapi/tools?k='+ep.token,H={'content-type':'application/json',authorization:'Bearer '+key};
 const j=async(path,o={})=>{const r=await fetch('https://api.vapi.ai'+path,{...o,headers:H,signal:AbortSignal.timeout(10000)});const t=await r.text();let d=null;try{d=JSON.parse(t);}catch{}return {ok:r.ok,status:r.status,d,t};};
 const as=await j('/assistant/'+b.vapi_assistant_id);if(!as.ok)throw new Error('Asistan okunamadı: '+as.status);
 const m=as.d.model||{},mevcut={};
 for(const id of m.toolIds||[]){const g=await j('/tool/'+id);if(g.ok&&g.d?.function?.name)mevcut[g.d.function.name]=id;}
 for(const t of m.tools||[])if(t.function?.name)mevcut[t.function.name]='satır içi';
 const ids={...(b.settings?.vapi_tool_ids||{})},sonuc=[];
 for(const ad of gerek){
  if(mevcut[ad]&&mevcut[ad]!=='satır içi'){await j('/tool/'+mevcut[ad],{method:'PATCH',body:JSON.stringify({server:arac(ad,T2,url,sec).server,function:arac(ad,T2,url,sec).function})});ids[ad]=mevcut[ad];sonuc.push(ad+': güncellendi');continue;}
  if(mevcut[ad]==='satır içi'){sonuc.push(ad+': asistanda zaten var');continue;}
  let c=await j('/tool',{method:'POST',body:JSON.stringify(arac(ad,T2,url,sec))});
  if(!c.ok&&sec){const a=arac(ad,T2,url,null);a.server={url,secret:sec};c=await j('/tool',{method:'POST',body:JSON.stringify(a)});}
  if(c.ok){ids[ad]=c.d.id;sonuc.push(ad+': eklendi');}else sonuc.push(ad+': HATA '+c.status+' '+c.t.slice(0,120));}
 const yeniIds=[...new Set([...(m.toolIds||[]),...gerek.map(a=>ids[a]).filter(Boolean)])];
 const kurallar=gerek.map(a=>T2[a].k).filter(Boolean),blok='\n\n# ARAÇ KULLANIMI\n'+kurallar.join('\n');
 const msgs=(m.messages||[]).map(x=>{if(x.role!=='system')return x;let c=String(x.content||'').replace(/\n\n# (ARAÇ KULLANIMI|CANLI SİPARİŞ KAYDI|TARİFTEN ADRES BULMA)[\s\S]*?(?=\n\n# |$)/g,'');return {...x,content:c+blok};});
 // KVKK: açılış cümlesinde yapay zeka ve kayıt bilgilendirmesi
 const ilk=String(as.d.firstMessage||'');const bilgi=/kayd|kayıt/i.test(ilk)?ilk:(ilk?ilk.replace(/\s*$/,'')+' ':'')+'Ben yapay zeka asistanıyım, görüşmemiz hizmet kalitesi için kaydedilmektedir.';
 const p=await j('/assistant/'+b.vapi_assistant_id,{method:'PATCH',body:JSON.stringify({model:{...m,toolIds:yeniIds,messages:msgs},...(bilgi!==ilk?{firstMessage:bilgi}:{})})});
 if(bilgi!==ilk)sonuc.push('açılış cümlesine kayıt bilgilendirmesi eklendi');
 if(!p.ok)throw new Error('Asistana bağlanamadı: '+p.status+' '+p.t.slice(0,250));
 // Çağrı sonu yedek şema: Gemini okuyamazsa Vapi'nin kendi çıkardığı veri kullanılır. Her sektörde kendi alanlarıyla kurulur.
 let props;
 if(siparis)props={customerName:S('string','Müşterinin adı'),orders:S('string','Ürünler ve adetleri'),address:S('string','Teslimat adresi'),statedPhone:S('string','Müşterinin söylediği telefon numarası'),reservationDate:S('string','Rezervasyon tarihi YYYY-AA-GG'),reservationTime:S('string','Rezervasyon saati SS:DD'),partySize:S('string','Kişi sayısı')};
 else{props={customerName:S('string','Müşterinin adı'),statedPhone:S('string','Müşterinin söylediği telefon numarası')};for(const f of alanlar)props[f.k]=S('string',f.l);}
 const an=await j('/assistant/'+b.vapi_assistant_id,{method:'PATCH',body:JSON.stringify({analysisPlan:{...(as.d.analysisPlan||{}),structuredDataPlan:{enabled:true,schema:{type:'object',properties:props}}}})});
 const yedek=an.ok?'açık':'açılamadı ('+an.status+')';
 await adminSb.from('businesses').update({settings:{...(b.settings||{}),vapi_tool_ids:ids,save_order_tool_id:ids.save_order||null,find_location_tool_id:ids.find_location||null}}).eq('id',b.id);
 const fiyatUyari=siparis&&b.plan!=='all'?' Not: bu işletme Çağrı paketinde, fiyat listesi sadece All in one pakette çalışır.':'';
 return NextResponse.json({ok:true,sonuc,yedekAnaliz:yedek,uyari:fiyatUyari});}catch(e){return NextResponse.json({error:e.message},{status:e.message==='Yetkisiz'?401:400});}}
