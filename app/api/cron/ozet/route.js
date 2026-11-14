// Akşam özeti (her gün 21:00 Türkiye): her işletmenin Bildirimler sekmesine ve telefonlarına günün özeti.
// Ayrıca yarınki randevulara hatırlatma (SMS/arama) gider.
// Pazartesi akşamı Büyük/Pro işletmelere haftalık rapor da gider.
// Günde bir kez çalışır (settings.son_ozet); tekrar çağrılsa da aynı gün ikinci özet gitmez.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {bildir} from '@/lib/bildir';import {paketOf} from '@/lib/paket';import {hatirlatmalariGonder,yorumIste} from '@/lib/hatirlatma';import {abonelikKontrol} from '@/lib/abonelikKontrol';
export const dynamic='force-dynamic';export const maxDuration=60;
const TZ='Europe/Istanbul',gun=d=>new Date(d).toLocaleDateString('sv-SE',{timeZone:TZ});
// Türkiye saatine göre bugünün başlangıcı (UTC+3, yaz saati yok)
const gunBasi=g=>new Date(g+'T00:00:00+03:00');
export async function GET(req){
 const sir=process.env.CRON_SECRET;if(sir&&req.headers.get('authorization')!=='Bearer '+sir)return NextResponse.json({error:'unauthorized'},{status:401});
 // Erken tetiklenip günün yarım özetini göndermesin: Türkiye saatiyle 20:00'den önce çalışmaz
 const saat=+new Date().toLocaleString('en-GB',{timeZone:TZ,hour:'2-digit',hour12:false});if(saat<20)return NextResponse.json({ok:true,erken:true});
 const bugun=gun(Date.now()),bas=gunBasi(bugun),son=new Date(bas.getTime()+864e5),yarinSon=new Date(son.getTime()+864e5);
 const {data:l}=await adminSb.from('businesses').select('id,name,vertical,status,quota_minutes_total,ek_dakika,quota_seconds_used,settings');
 let gonderilen=0;
 for(const b of l||[]){
  if(b.settings?.son_ozet===bugun)continue;
  const [{data:c},{data:ap},{data:apY},{data:rs}]=await Promise.all([
   adminSb.from('calls').select('duration_seconds,orders,customer_name,extracted,asim').eq('business_id',b.id).gte('created_at',bas.toISOString()).lt('created_at',son.toISOString()).limit(2000),
   adminSb.from('appointments').select('id').eq('business_id',b.id).eq('source','vapi').gte('created_at',bas.toISOString()).lt('created_at',son.toISOString()),
   adminSb.from('appointments').select('id').eq('business_id',b.id).eq('status','confirmed').gte('starts_at',son.toISOString()).lt('starts_at',yarinSon.toISOString()),
   adminSb.from('reservations').select('id').eq('business_id',b.id).gte('created_at',bas.toISOString()).lt('created_at',son.toISOString())]);
  const cagri=(c||[]).length,yarin=(apY||[]).length;
  if(!cagri&&!yarin)continue;
  const sip=(c||[]).filter(x=>x.orders).length,talep=(c||[]).filter(x=>!x.orders&&x.extracted&&Object.keys(x.extracted).length).length;
  const bos=(c||[]).filter(x=>!x.orders&&!x.customer_name&&!(x.extracted&&Object.keys(x.extracted).length)).length,kilit=(c||[]).filter(x=>x.asim).length;
  const dk=Math.round((c||[]).reduce((t,x)=>t+(x.duration_seconds||0),0)/60),kalan=Math.max(0,Math.floor(((b.quota_minutes_total||0)+(b.ek_dakika||0))*60-(b.quota_seconds_used||0))/60|0);
  const satir=[`📊 Günün özeti: ${cagri} çağrı`];
  if(sip)satir.push(`🛵 ${sip} sipariş`);if(ap?.length)satir.push(`📅 ${ap.length} yeni randevu`);if(rs?.length)satir.push(`🍽 ${rs.length} rezervasyon`);if(talep)satir.push(`📋 ${talep} talep`);
  if(bos)satir.push(`☎ ${bos} çağrıda bilgi alınamadı, kontrol edin`);if(kilit)satir.push(`🔒 ${kilit} kilitli çağrı (aşım ücreti bekliyor)`);
  if(yarin)satir.push(`➡ Yarın ${yarin} randevunuz var`);
  satir.push(`⏱ Bugün ${dk} dk konuşuldu, ${kalan} dk kaldı`);
  await bildir(b.id,satir[0]+'\n'+satir.slice(1).join('\n'),'ozet');
  await adminSb.from('businesses').update({settings:{...(b.settings||{}),son_ozet:bugun}}).eq('id',b.id);
  gonderilen++;}
 // HAFTALIK RAPOR (Büyük ve Pro): pazartesi akşamı son 7 günün özeti
 let haftalik=0;const haftaGunu=new Date(new Date().toLocaleString('en-US',{timeZone:TZ})).getDay();
 if(haftaGunu===1){const hb=new Date(bas.getTime()-7*864e5);
  const {data:l2}=await adminSb.from('businesses').select('id,quota_minutes_total,settings');
  for(const b of l2||[]){if(!paketOf(b).haftalik||b.settings?.son_haftalik===bugun)continue;
   const [{data:c},{data:ap},{count:dolu}]=await Promise.all([
    adminSb.from('calls').select('created_at,duration_seconds,orders,kalite').eq('business_id',b.id).gte('created_at',hb.toISOString()).lt('created_at',bas.toISOString()).limit(5000),
    adminSb.from('appointments').select('id').eq('business_id',b.id).eq('source','vapi').gte('created_at',hb.toISOString()).lt('created_at',bas.toISOString()),
    adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('business_id',b.id).eq('type','hat_dolu').gte('created_at',hb.toISOString()).lt('created_at',bas.toISOString())]);
   const L=c||[];if(!L.length)continue;
   const saat={};for(const x of L){const h=new Date(x.created_at).toLocaleString('en-GB',{timeZone:TZ,hour:'2-digit',hour12:false});saat[h]=(saat[h]||0)+1;}
   const [yh,yn]=Object.entries(saat).sort((a,b2)=>b2[1]-a[1])[0];const kl=L.filter(x=>x.kalite),ort=kl.length?(kl.reduce((t,x)=>t+x.kalite,0)/kl.length).toFixed(1):null;
   const satir=[`📈 Haftalık rapor: ${L.length} çağrı, ${Math.round(L.reduce((t,x)=>t+(x.duration_seconds||0),0)/60)} dk`];
   const sip=L.filter(x=>x.orders).length;if(sip)satir.push(`🛵 ${sip} sipariş`);if(ap?.length)satir.push(`📅 ${ap.length} randevu`);
   satir.push(`⏰ En yoğun saat ${yh}:00 (${yn} çağrı)`);if(dolu)satir.push(`☎ ${dolu} arama hat dolu olduğu için size yönlendirildi`);if(ort)satir.push(`⭐ Ortalama görüşme puanı ${ort}/10`);
   await bildir(b.id,satir[0]+'\n'+satir.slice(1).join('\n'),'ozet');
   const {data:g}=await adminSb.from('businesses').select('settings').eq('id',b.id).single();
   await adminSb.from('businesses').update({settings:{...(g?.settings||{}),son_haftalik:bugun}}).eq('id',b.id);haftalik++;}}
 // Yarınki randevular için hatırlatma (SMS veya arama; Büyük+)
 let hat=null;try{hat=await hatirlatmalariGonder({butce:20000});}catch(e){hat={hata:String(e.message||e).slice(0,120)};}
 let abone=null;try{abone=await abonelikKontrol();}catch(e){abone={hata:String(e.message||e).slice(0,120)};}
 let yorum=null;try{yorum=await yorumIste({butce:12000});}catch(e){yorum={hata:String(e.message||e).slice(0,120)};}
 return NextResponse.json({ok:true,gonderilen,haftalik,hatirlatma:hat,yorum,abone});}
