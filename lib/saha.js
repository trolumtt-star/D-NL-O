// SAHA MODU: konuma yakın, Dinlio'yu alma ihtimali yüksek işletmeyi bulur.
// Kaynak OpenStreetMap (ücretsiz). Puan = sektörün telefonla iş alma yoğunluğu + işaretler (paket servis,
// telefon kayıtlı, çalışma saati, zincir değil, yorum sayısı) − mesafe cezası. Ziyaret edilenler bir süre önerilmez.
export const SEKTOR={
 bayi:{ad:'Su / tüp bayisi',agirlik:34,dikey:'wholesale',aci:'Sipariş tamamen telefonla geliyor; dağıtımdayken açılmayan her telefon kaçan sipariş.',soz:'Dağıtımdayken telefona bakamadığınızda siparişi asistan alıyor, adres ve adetle panelinize düşüyor.'},
 kebap:{ad:'Kebap / dönerci / pide',agirlik:32,dikey:'restaurant',aci:'Yoğun saatlerde telefon çalar, ocak başındaki usta açamaz.',soz:'Akşam yoğunluğunda telefonu asistan açsın, siparişi adresiyle ekranınıza yazsın.'},
 fastfood:{ad:'Fast food',agirlik:28,dikey:'restaurant',aci:'Paket sipariş telefonu ile tezgâh aynı anda yetişmiyor.',soz:'Telefon siparişlerini asistan alır, kasadaki kişi müşteriye bakmaya devam eder.'},
 restoran:{ad:'Restoran',agirlik:26,dikey:'restaurant',aci:'Rezervasyon ve paket telefonları servis sırasında kaçıyor.',soz:'Masa rezervasyonunu ve paket siparişini asistan alır, masalar ekranda görünür.'},
 dis:{ad:'Diş kliniği',agirlik:32,dikey:'dental',aci:'Sekreter hastayla ilgilenirken ya da mesai dışında arayan hasta başka kliniğe gider.',soz:'7/24 randevu: mesai dışında arayan hasta da randevusunu alır.'},
 kuafor:{ad:'Kuaför / berber',agirlik:30,dikey:'barber',aci:'Usta makas elindeyken telefona bakamıyor.',soz:'Makas elinizdeyken telefonu asistan açar, boş saate randevuyu kendisi yazar.'},
 guzellik:{ad:'Güzellik merkezi',agirlik:30,dikey:'beauty',aci:'Uygulama sırasında gelen aramalar cevapsız kalıyor.',soz:'Seans sırasında gelen her arama randevuya dönüşür, uzman takvimi panelde.'},
 veteriner:{ad:'Veteriner',agirlik:26,dikey:'vet',aci:'Muayenedeyken telefona bakılamıyor, aşı randevuları karışıyor.',soz:'Aşı ve muayene randevularını asistan verir, acil durumda yönlendirir.'},
 doktor:{ad:'Doktor / klinik',agirlik:24,dikey:'doctor',aci:'Telefon trafiği sekreteri bağlıyor.',soz:'Randevu ve bilgi aramalarını asistan karşılar, sekreter içerideki hastaya odaklanır.'},
 oto:{ad:'Oto servis / lastikçi',agirlik:22,dikey:'auto',aci:'Usta aracın altındayken telefon çalıyor.',soz:'Arıza ve randevu bilgisini asistan alır, plaka ve arıza notuyla panele yazar.'},
 spor:{ad:'Spor salonu / pilates',agirlik:20,dikey:'gym',aci:'Üyelik fiyatı soran arayanlar kayda dönüşmüyor.',soz:'Fiyat soran herkese deneme dersi randevusu verilir.'},
 otel:{ad:'Otel / pansiyon',agirlik:20,dikey:'hotel',aci:'Gece ve hafta sonu gelen rezervasyon aramaları kaçıyor.',soz:'Gece gelen rezervasyon talepleri tarih ve kişi sayısıyla sabah ekranınızda.'},
 pastane:{ad:'Pastane / fırın',agirlik:16,dikey:'restaurant',aci:'Pasta siparişleri telefonda karışıyor.',soz:'Özel pasta siparişini asistan detaylarıyla not alır.'},
 emlak:{ad:'Emlak ofisi',agirlik:16,dikey:'realestate',aci:'Ofis dışındayken ilan aramaları kaçıyor.',soz:'İlan arayanın bütçe ve isteğini asistan alır, danışmana iletir.'},
 kafe:{ad:'Kafe',agirlik:10,dikey:'restaurant',aci:'Rezervasyon aramaları servis sırasında kaçıyor.',soz:'Grup rezervasyonlarını asistan alır.'},
};
export function kategori(t){const a=t.amenity,s=t.shop,c=String(t.cuisine||'');
 if(s==='gas'||s==='water'||/su|tüp/i.test(t.name||'')&&/bayi/i.test(t.name||''))return 'bayi';
 if(a==='fast_food'&&/kebab|doner|döner|pide|lahmacun|turkish/i.test(c+' '+(t.name||'')))return 'kebap';
 if(a==='restaurant'&&/kebab|turkish|regional|pide|lahmacun|kofte|köfte/i.test(c+' '+(t.name||'')))return 'kebap';
 if(a==='fast_food')return 'fastfood';if(a==='restaurant')return 'restoran';if(a==='cafe')return 'kafe';
 if(a==='dentist'||t.healthcare==='dentist')return 'dis';if(a==='doctors'||a==='clinic')return 'doktor';if(a==='veterinary')return 'veteriner';
 if(s==='hairdresser')return 'kuafor';if(s==='beauty')return 'guzellik';if(s==='bakery'||s==='pastry'||s==='confectionery')return 'pastane';
 if(s==='car_repair'||s==='tyres')return 'oto';if(t.leisure==='fitness_centre'||t.leisure==='sports_centre')return 'spor';
 if(t.tourism==='hotel'||t.tourism==='guest_house'||t.tourism==='hostel')return 'otel';if(t.office==='estate_agent')return 'emlak';return null;}
const R=Math.PI/180;export const mesafe=(a,b)=>{const d1=(b.lat-a.lat)*R,d2=(b.lon-a.lon)*R,x=Math.sin(d1/2)**2+Math.cos(a.lat*R)*Math.cos(b.lat*R)*Math.sin(d2/2)**2;return Math.round(6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)));};
export async function yakindakiler(lat,lon,r){
 const ar=`(around:${r},${lat},${lon})`;
 const q=`[out:json][timeout:14];(nwr["amenity"~"^(restaurant|fast_food|cafe|dentist|doctors|clinic|veterinary)$"]["name"]${ar};nwr["shop"~"^(hairdresser|beauty|bakery|pastry|confectionery|car_repair|tyres|gas|water)$"]["name"]${ar};nwr["leisure"~"^(fitness_centre|sports_centre)$"]["name"]${ar};nwr["tourism"~"^(hotel|guest_house|hostel)$"]["name"]${ar};nwr["office"="estate_agent"]["name"]${ar};nwr["healthcare"="dentist"]["name"]${ar};);out center tags 400;`;
 // Birden çok harita sunucusuna AYNI ANDA sor, ilk cevap veren kazanır (tek sunucu yavaş/yoğun olabiliyor)
 const SUNUCU=['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
 const kontrol=new AbortController();
 const dene=async url=>{const tarayici=typeof window!=='undefined';
  const res=await fetch(url,{method:'POST',headers:tarayici?{'content-type':'application/x-www-form-urlencoded'}:{'content-type':'application/x-www-form-urlencoded','user-agent':'DinlioAI-Saha/1.0 (+https://dinlio.vercel.app)',accept:'application/json'},body:'data='+encodeURIComponent(q),signal:AbortSignal.any?AbortSignal.any([kontrol.signal,AbortSignal.timeout(16000)]):AbortSignal.timeout(16000)});
  if(!res.ok)throw new Error('durum '+res.status);const j=await res.json();if(!Array.isArray(j.elements))throw new Error('biçim');return j;};
 let j;try{j=await Promise.any(SUNUCU.map(dene));}catch{throw new Error('Harita sunucuları şu an yanıt vermedi.');}finally{kontrol.abort();}
 const out=[];
 for(const e of j.elements||[]){const t=e.tags||{},k=kategori(t);if(!k||!t.name)continue;const la=e.lat??e.center?.lat,lo=e.lon??e.center?.lon;if(la==null)continue;
  out.push({osm_id:`${e.type}/${e.id}`,name:String(t.name).slice(0,120),category:k,lat:la,lon:lo,phone:(t.phone||t['contact:phone']||'').split(';')[0].trim()||null,website:t.website||t['contact:website']||null,opening_hours:t.opening_hours||null,
   address:[t['addr:street'],t['addr:housenumber'],t['addr:suburb']||t['addr:district']].filter(Boolean).join(' ')||null,source:'osm',
   tags:{brand:t.brand||t['brand:wikidata']||null,delivery:t.delivery||null,takeaway:t.takeaway||null,cuisine:t.cuisine||null}});}
 return out;}
export function puanla(l,konum){const s=SEKTOR[l.category];if(!s)return null;const t=l.tags||{},neden=[];let p=s.agirlik;
 if(t.brand){p-=40;neden.push('Zincir marka, karar merkezde olabilir');}else neden.push('Bağımsız işletme, karar sahibi dükkânda');
 if(t.delivery==='yes'||t.takeaway==='yes'||t.takeaway==='only'){p+=14;neden.push('Paket servis / gel-al yapıyor');}
 if(l.phone){p+=12;neden.push('Telefon numarası haritada kayıtlı, telefonla iş alıyor');}
 if(l.opening_hours){p+=4;}if(l.website){p+=3;}
 if(l.rating_count){p+=l.rating_count>=300?14:l.rating_count>=100?9:l.rating_count>=30?4:0;if(l.rating_count>=100)neden.push(l.rating_count+' Google yorumu, yoğun çalışıyor');}
 const m=mesafe(konum,{lat:l.lat,lon:l.lon});p-=Math.max(0,(m-250)/100)*1.5;
 return {puan:Math.round(p),mesafe:m,yuruyus:Math.max(1,Math.round(m/80)),neden:neden.slice(0,3)};}
