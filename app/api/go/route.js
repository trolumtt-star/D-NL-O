// DİNLİO GO kurye uygulamasının sunucu ucu. Kurye Supabase hesabı kullanmaz; davet kodu ile katılır, cihazına özel anahtar alır.
// Kurye yalnızca işletmenin ONAYLADIĞI bağlantılardaki siparişleri görür; müşteri adı ve telefonu sadece siparişi üstlenen kuryeye açılır.
import {NextResponse} from 'next/server';import crypto from 'crypto';import {adminSb} from '@/lib/admin';import {tokenHash} from '@/lib/kurye';import {vapid} from '@/lib/push';import {bildir} from '@/lib/bildir';import {paketOf} from '@/lib/paket';import {smsGonder,tr90} from '@/lib/entegrasyon';import {SITE} from '@/lib/site';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
const TZ='Europe/Istanbul';
const kim=async req=>{const t=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(t.length<20)return null;
 const {data}=await adminSb.from('kuryeler').select('id,ad,tel,konum_at').eq('token_hash',tokenHash(t)).maybeSingle();return data||null;};
const isletmeBul=async kod=>{if(!/^[A-Za-z0-9_-]{8,40}$/.test(String(kod||'')))return null;
 const {data}=await adminSb.from('businesses').select('id,name,quota_minutes_total,settings').eq('settings->kurye->>davet',kod).limit(1);const b=data?.[0];
 return b&&b.settings?.kurye?.acik&&paketOf(b).kurye?b:null;};
async function durum(k){
 const {data:bl}=await adminSb.from('kurye_isletme').select('business_id,onayli,businesses(name,settings)').eq('kurye_id',k.id);
 const onayli=(bl||[]).filter(x=>x.onayli),ids=onayli.map(x=>x.business_id),ad=Object.fromEntries((bl||[]).map(x=>[x.business_id,x.businesses?.name||'İşletme']));
 const gunBas=new Date(new Date().toLocaleDateString('sv-SE',{timeZone:TZ})+'T00:00:00+03:00'),haftaBas=new Date(gunBas.getTime()-6*864e5);
 const [{data:acik},{data:benim},{data:bit}]=await Promise.all([
  ids.length?adminSb.from('calls').select('id,business_id,address,kurye_ucret,kurye_km,created_at').in('business_id',ids).eq('kurye_durum','bekliyor').order('created_at').limit(30):{data:[]},
  adminSb.from('calls').select('id,business_id,orders,address,customer_name,caller_phone,stated_phone,extracted,kurye_durum,kurye_ucret,kurye_km,takip_kod,created_at').eq('kurye_id',k.id).in('kurye_durum',['kabul','yolda']).order('kurye_kabul_at'),
  adminSb.from('calls').select('kurye_ucret,kurye_teslim_at').eq('kurye_id',k.id).eq('kurye_durum','teslim').gte('kurye_teslim_at',haftaBas.toISOString()).limit(2000)]);
 const say=l=>({adet:l.length,tutar:l.reduce((t,x)=>t+(+x.kurye_ucret||0),0)}),bg=(bit||[]).filter(x=>new Date(x.kurye_teslim_at)>=gunBas);
 return {kurye:{ad:k.ad},isletmeler:(bl||[]).map(x=>({ad:ad[x.business_id],onayli:x.onayli})),
  acik:(acik||[]).map(x=>({id:x.id,isletme:ad[x.business_id],adres:x.address,ucret:+x.kurye_ucret||0,km:x.kurye_km,saat:x.created_at})),
  benim:(benim||[]).filter(x=>ids.includes(x.business_id)).map(x=>{const mk=(bl||[]).find(y=>y.business_id===x.business_id)?.businesses?.settings?.konum;
   return {id:x.id,isletme:ad[x.business_id],isletmeKonum:mk?.lat?{lat:+mk.lat,lng:+mk.lng,adres:mk.adres||mk.bulunan||''}:null,durum:x.kurye_durum,siparis:x.orders,adres:x.address,musteri:x.customer_name,tel:x.stated_phone||x.caller_phone,not:x.extracted?.kuryeNotu||null,konum:x.extracted?.konum||null,ucret:+x.kurye_ucret||0,km:x.kurye_km,takip:x.takip_kod?SITE+'/t/'+x.takip_kod:null};}),
  bugun:say(bg),hafta:say(bit||[])};}
export async function GET(req){const u=new URL(req.url),d=u.searchParams.get('d');
 if(d){const b=await isletmeBul(d);return b?NextResponse.json({isletme:b.name}):hata('Davet kodu geçersiz veya süresi dolmuş. İşletmeden yeni QR isteyin.',404);}
 const k=await kim(req);if(!k)return hata('Giriş gerekli',401);
 const v=await vapid();return NextResponse.json({...(await durum(k)),publicKey:v.pub});}
export async function POST(req){try{const x=await req.json();
 if(x.islem==='katil'){const b=await isletmeBul(x.davet);if(!b)return hata('Davet kodu geçersiz veya süresi dolmuş. İşletmeden yeni QR isteyin.',404);
  let k=await kim(req),token=null;
  if(!k){const ad=String(x.ad||'').trim().slice(0,60),tel=tr90(x.tel);if(ad.length<3)return hata('Adınızı ve soyadınızı yazın.');if(!tel)return hata('Geçerli bir cep telefonu yazın (05xx…).');
   const {count}=await adminSb.from('kurye_isletme').select('kurye_id',{count:'exact',head:true}).eq('business_id',b.id);if(count>=30)return hata('Bu işletmenin kurye sınırı dolmuş.');
   token=crypto.randomBytes(32).toString('base64url');const {data:yeni,error}=await adminSb.from('kuryeler').insert({ad,tel,token_hash:tokenHash(token)}).select('id,ad,tel').single();if(error)return hata('Kayıt yapılamadı.');k=yeni;}
  const {data:var_}=await adminSb.from('kurye_isletme').select('onayli').eq('kurye_id',k.id).eq('business_id',b.id).maybeSingle();
  if(!var_){const {count}=await adminSb.from('kurye_isletme').select('kurye_id',{count:'exact',head:true}).eq('business_id',b.id);if(count>=30)return hata('Bu işletmenin kurye sınırı dolmuş.');
   await adminSb.from('kurye_isletme').insert({kurye_id:k.id,business_id:b.id});
   try{await bildir(b.id,`🛵 ${k.ad} kurye olarak katılmak istiyor\nAyarlar > Dinlio Go kuryeleri kısmından onaylayın. Tanımıyorsanız çıkarın.`);}catch{}}
  return NextResponse.json({ok:true,token,isletme:b.name,onayli:!!var_?.onayli});}
 const k=await kim(req);if(!k)return hata('Giriş gerekli',401);
 const cid=String(x.cid||''),uuid=/^[0-9a-f-]{36}$/.test(cid);
 if(x.islem==='kabul'){if(!uuid)return hata('Geçersiz');
  const {data:c}=await adminSb.from('calls').select('business_id').eq('id',cid).eq('kurye_durum','bekliyor').maybeSingle();if(!c)return hata('Bu paketi başka bir kurye aldı.');
  const {data:bag}=await adminSb.from('kurye_isletme').select('onayli').eq('kurye_id',k.id).eq('business_id',c.business_id).maybeSingle();if(!bag?.onayli)return hata('Bu işletme sizi henüz onaylamadı.',403);
  const {count:aktif}=await adminSb.from('calls').select('id',{count:'exact',head:true}).eq('kurye_id',k.id).in('kurye_durum',['kabul','yolda']);if(aktif>=4)return hata('Aynı anda en fazla 4 paket alabilirsiniz.');
  // Aynı anda iki kurye basarsa yalnızca biri alır (koşullu güncelleme)
  const {data:u}=await adminSb.from('calls').update({kurye_id:k.id,kurye_durum:'kabul',kurye_kabul_at:new Date().toISOString()}).eq('id',cid).eq('kurye_durum','bekliyor').is('kurye_id',null).select('id');
  if(!u?.length)return hata('Bu paketi başka bir kurye aldı.');
  try{await bildir(c.business_id,`🛵 ${k.ad} paketi üstlendi`);}catch{}}
 else if(['aldim','teslim','birak'].includes(x.islem)){if(!uuid)return hata('Geçersiz');
  const {data:c}=await adminSb.from('calls').select('id,business_id,kurye_durum,takip_kod,stated_phone,caller_phone').eq('id',cid).eq('kurye_id',k.id).maybeSingle();if(!c)return hata('Paket bulunamadı.');
  if(x.islem==='aldim'){if(c.kurye_durum!=='kabul')return hata('Bu paket zaten alınmış.');
   await adminSb.from('calls').update({kurye_durum:'yolda',kurye_alindi_at:new Date().toISOString(),order_status:'delivering'}).eq('id',cid).eq('kurye_id',k.id);
   const {data:b}=await adminSb.from('businesses').select('name,quota_minutes_total,settings').eq('id',c.business_id).single();
   if(paketOf(b).sms&&b.settings?.sms_onay&&c.takip_kod){const no=c.stated_phone||c.caller_phone;if(no)await smsGonder(no,`${b.name||'İşletme'}: Siparişiniz yolda! Canlı takip: ${SITE}/t/${c.takip_kod}`);}}
  else if(x.islem==='teslim'){if(c.kurye_durum!=='yolda')return hata('Önce "Paketi aldım" deyin.');
   await adminSb.from('calls').update({kurye_durum:'teslim',kurye_teslim_at:new Date().toISOString(),order_status:'done'}).eq('id',cid).eq('kurye_id',k.id);
   try{await bildir(c.business_id,`✅ ${k.ad} paketi teslim etti`);}catch{}}
  else{if(c.kurye_durum!=='kabul')return hata('Yola çıkan paket bırakılamaz; işletmeyi arayın.');
   await adminSb.from('calls').update({kurye_id:null,kurye_durum:'bekliyor',kurye_kabul_at:null}).eq('id',cid).eq('kurye_id',k.id);
   try{await bildir(c.business_id,`⚠ ${k.ad} paketi bıraktı, paket yeniden kuryelere açıldı`);}catch{}}}
 else if(x.islem==='konum'){const lat=+x.lat,lng=+x.lng;if(!(lat>=-90&&lat<=90&&lng>=-180&&lng<=180))return hata('Geçersiz konum');
  if(k.konum_at&&Date.now()-new Date(k.konum_at)<4000)return NextResponse.json({ok:true});
  // Konum sadece yolda paket varken saklanır (mesai dışında takip yok)
  const {count}=await adminSb.from('calls').select('id',{count:'exact',head:true}).eq('kurye_id',k.id).eq('kurye_durum','yolda');
  if(count)await adminSb.from('kuryeler').update({konum_lat:lat,konum_lng:lng,konum_at:new Date().toISOString()}).eq('id',k.id);
  return NextResponse.json({ok:true});}
 else if(x.islem==='push'){const s=x.subscription||{},ep=String(s.endpoint||''),kk=s.keys||{};let host='';try{host=new URL(ep).hostname;}catch{}
  const izinli=/^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/i.test(host);
  if(!/^https:\/\//.test(ep)||!izinli||ep.length>1000||!kk.p256dh||!kk.auth)return hata('Geçersiz abonelik.');
  const {count}=await adminSb.from('push_abonelik').select('id',{count:'exact',head:true}).eq('kurye_id',k.id);if(count>=3)await adminSb.from('push_abonelik').delete().eq('kurye_id',k.id);
  const {error}=await adminSb.from('push_abonelik').upsert({kurye_id:k.id,business_id:null,user_id:null,endpoint:ep,p256dh:String(kk.p256dh).slice(0,200),auth:String(kk.auth).slice(0,100),cihaz:'Dinlio Go'},{onConflict:'endpoint'});
  if(error)return hata('Bildirim açılamadı.');}
 else return hata('Geçersiz işlem');
 return NextResponse.json({ok:true,...(await durum(k))});}catch(e){return hata('Hata',400);}}
