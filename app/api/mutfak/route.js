// MUTFAK EKRANI sunucu ucu. Link kodu (?k=) ile çalışır; müşteri telefonu ve adresi gösterilmez (sadece "Paket" ve semt bilgisi yok, adres kısaltılmaz: mutfağın adrese ihtiyacı yok).
// Listeler: bugünkü açık siparişler (yeni / hazırlanıyor / hazır), patron teyidi bekleyenler, garson onayı bekleyen masa siparişleri, masa çağrıları.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {mutfakIsletme} from '@/lib/mutfak';import {bildir} from '@/lib/bildir';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
const SAAT12=()=>new Date(Date.now()-12*36e5).toISOString();
function kart(x){const e=x.extracted||{};return {id:x.id,siparis:x.orders||'',durum:x.order_status||'new',zaman:x.created_at,acil:!!x.acil,
 masa:e.masa||null,kaynak:e.kaynak==='qr'?'masa':(/gel-?al/i.test(String(x.address||''))?'gelal':'paket'),not:e.not||e.kuryeNotu||'',
 hazirAt:e.hazir_at||null,hazirlanAt:e.hazirlan_at||null,masaOnay:e.masaOnay||null,teyit:e.teyit?{sebep:e.teyit.sebep}:null};}
async function liste(b){
 const [{data:c},{data:cg}]=await Promise.all([
  adminSb.from('calls').select('id,orders,address,order_status,created_at,extracted,acil').eq('business_id',b.id).not('orders','is',null).gte('created_at',SAAT12()).in('order_status',['new','preparing','ready']).order('created_at').limit(120),
  adminSb.from('webhook_events').select('id,created_at,payload').eq('business_id',b.id).eq('type','masa_cagri').gte('created_at',new Date(Date.now()-90*6e4).toISOString()).order('created_at',{ascending:false}).limit(30)]);
 const k=(c||[]).map(kart),simdi=Date.now();
 return {isletme:b.name,
  masaOnay:k.filter(x=>x.durum==='new'&&x.masaOnay==='bekliyor'),
  teyit:k.filter(x=>x.durum==='new'&&x.teyit&&x.masaOnay!=='bekliyor'),
  yeni:k.filter(x=>x.durum==='new'&&!x.teyit&&x.masaOnay!=='bekliyor'),
  hazirlaniyor:k.filter(x=>x.durum==='preparing'),
  hazir:k.filter(x=>x.durum==='ready'&&(!x.hazirAt||simdi-new Date(x.hazirAt).getTime()<45*6e4)),
  cagrilar:(cg||[]).filter(x=>!x.payload?.kapandi).map(x=>({id:x.id,masa:x.payload?.masa,tur:x.payload?.tur,zaman:x.created_at}))};}
export async function GET(req){const b=await mutfakIsletme(new URL(req.url).searchParams.get('k'));if(!b)return hata('Mutfak linki geçersiz ya da yenilenmiş. Panelden yeni linki açın.',404);
 return NextResponse.json(await liste(b));}
export async function POST(req){try{const x=await req.json();const b=await mutfakIsletme(x.k);if(!b)return hata('Mutfak linki geçersiz.',404);
 if(x.islem==='cagri_kapat'){if(!/^[0-9a-f-]{36}$/.test(String(x.id||'')))return hata('Geçersiz');const {data:e}=await adminSb.from('webhook_events').select('payload').eq('id',x.id).eq('business_id',b.id).eq('type','masa_cagri').maybeSingle();
  if(e)await adminSb.from('webhook_events').update({payload:{...(e.payload||{}),kapandi:true}}).eq('id',x.id);return NextResponse.json(await liste(b));}
 if(!/^[0-9a-f-]{36}$/.test(String(x.id||'')))return hata('Geçersiz sipariş');
 const {data:c}=await adminSb.from('calls').select('id,order_status,extracted,orders').eq('id',x.id).eq('business_id',b.id).maybeSingle();if(!c)return hata('Sipariş bulunamadı',404);
 const e={...(c.extracted||{})},st=c.order_status||'new',simdi=new Date().toISOString();let u=null;
 switch(x.islem){
  case 'hazirla':if(st!=='new'||e.teyit||e.masaOnay==='bekliyor')return hata('Bu sipariş önce onaylanmalı.');u={order_status:'preparing',extracted:{...e,hazirlan_at:simdi}};break;
  case 'hazir':if(!['new','preparing'].includes(st)||e.teyit&&st==='new'||e.masaOnay==='bekliyor')return hata('Bu sipariş hazır yapılamaz.');u={order_status:'ready',extracted:{...e,hazir_at:simdi}};break;
  case 'geri':if(st==='ready')u={order_status:'preparing',extracted:{...e,hazir_at:null}};else if(st==='preparing')u={order_status:'new'};else return hata('Geri alınamaz.');break;
  case 'servis':if(st!=='ready'||e.kaynak!=='qr')return hata('Sadece hazır masa siparişleri servis edildi yapılabilir.');u={order_status:'done'};break;
  case 'masa_onay':if(e.masaOnay!=='bekliyor')return hata('Onay beklemiyor.');u={extracted:{...e,masaOnay:'onayli'}};break;
  case 'masa_red':if(e.masaOnay!=='bekliyor')return hata('Onay beklemiyor.');u={order_status:'cancelled',extracted:{...e,masaOnay:'red'}};break;
  default:return hata('Geçersiz işlem');}
 await adminSb.from('calls').update(u).eq('id',c.id).eq('business_id',b.id);
 if(x.islem==='hazir'&&e.kaynak!=='qr')try{await bildir(b.id,`✅ Sipariş hazır: ${String(c.orders||'').slice(0,120)}`);}catch{}
 return NextResponse.json(await liste(b));}catch(e){return hata('İşlem yapılamadı');}}
