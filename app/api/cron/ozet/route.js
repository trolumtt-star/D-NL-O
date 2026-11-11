// Akşam özeti (her gün 21:00 Türkiye): her işletmenin Bildirimler sekmesine ve telefonlarına günün özeti.
// Günde bir kez çalışır (settings.son_ozet); tekrar çağrılsa da aynı gün ikinci özet gitmez.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {bildir} from '@/lib/bildir';
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
 return NextResponse.json({ok:true,gonderilen});}
