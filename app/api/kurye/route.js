// İşletme sahibi: Dinlio Go ayarları, davet QR'ı, kurye onayı/çıkarma, siparişi kuryelere duyurma.
import {NextResponse} from 'next/server';import crypto from 'crypto';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';import {paketOf,enAzPaket} from '@/lib/paket';import {kuryeAyar,kuryeCagir} from '@/lib/kurye';import {SITE} from '@/lib/site';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
const ozet=async b=>{const ay=kuryeAyar(b.settings),gunBas=new Date(new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'})+'T00:00:00+03:00'),hb=new Date(gunBas.getTime()-6*864e5);
 const [{data:kl},{data:t}]=await Promise.all([adminSb.from('kurye_isletme').select('kurye_id,onayli,created_at,kuryeler(ad,tel)').eq('business_id',b.id).order('created_at'),
  adminSb.from('calls').select('kurye_id,kurye_ucret,kurye_teslim_at').eq('business_id',b.id).eq('kurye_durum','teslim').gte('kurye_teslim_at',hb.toISOString()).limit(5000)]);
 return {izin:paketOf(b).kurye,enAz:enAzPaket('kurye'),ayar:{acik:ay.acik,taban:ay.taban,esik:ay.esik,km_ek:ay.kmEk,ne_zaman:ay.ne_zaman},davet:ay.acik&&ay.davet?SITE+'/go?d='+ay.davet:null,konumVar:!!b.settings?.konum?.lat,
  kuryeler:(kl||[]).map(x=>{const l=(t||[]).filter(y=>y.kurye_id===x.kurye_id),g=l.filter(y=>new Date(y.kurye_teslim_at)>=gunBas),top=a=>a.reduce((s,y)=>s+(+y.kurye_ucret||0),0);
   return {id:x.kurye_id,ad:x.kuryeler?.ad,tel:x.kuryeler?.tel,onayli:x.onayli,bugun:g.length,bugunTl:top(g),hafta:l.length,haftaTl:top(l)};})};};
export async function GET(req){try{const b=await requireOwner(req);return NextResponse.json(await ozet(b));}catch(e){return hata(e.message,401);}}
export async function POST(req){try{const b=await requireOwner(req);const x=await req.json(),s={...(b.settings||{})};
 if(!paketOf(b).kurye)return hata(`Dinlio Go ${enAzPaket('kurye')} paketten itibaren açılır.`);
 const kid=String(x.kurye_id||''),uuid=v=>/^[0-9a-f-]{36}$/.test(v);
 if(x.islem==='ayar'){const taban=Math.round(+x.taban),esik=+x.esik||0,kmEk=Math.round(+x.km_ek||0);
  if(!(taban>=0&&taban<=2000)||!(esik>=0&&esik<=50)||!(kmEk>=0&&kmEk<=500))return hata('Ücret değerlerini kontrol edin.');
  s.kurye={...(s.kurye||{}),acik:!!x.acik,taban,esik,km_ek:kmEk,ne_zaman:x.ne_zaman==='gelince'?'gelince':'onay',davet:s.kurye?.davet||crypto.randomBytes(12).toString('base64url')};}
 else if(x.islem==='davet_yenile'){s.kurye={...(s.kurye||{}),davet:crypto.randomBytes(12).toString('base64url')};}
 else if(x.islem==='onayla'&&uuid(kid)){await adminSb.from('kurye_isletme').update({onayli:true}).eq('kurye_id',kid).eq('business_id',b.id);return NextResponse.json({ok:true,...(await ozet(b))});}
 else if(x.islem==='cikar'&&uuid(kid)){
  // Üstlendiği ama teslim etmediği paketler yeniden kuryelere açılır
  await adminSb.from('calls').update({kurye_id:null,kurye_durum:'bekliyor',kurye_kabul_at:null,kurye_alindi_at:null}).eq('business_id',b.id).eq('kurye_id',kid).in('kurye_durum',['kabul','yolda']);
  await adminSb.from('kurye_isletme').delete().eq('kurye_id',kid).eq('business_id',b.id);return NextResponse.json({ok:true,...(await ozet(b))});}
 else if(x.islem==='cagir'){if(!uuid(String(x.cid||'')))return hata('Geçersiz');const r=await kuryeCagir(b.id,x.cid);return r.ok?NextResponse.json(r):hata(r.neden);}
 else return hata('Geçersiz işlem');
 const {error}=await adminSb.from('businesses').update({settings:s}).eq('id',b.id);if(error)return hata(error.message);
 return NextResponse.json({ok:true,...(await ozet({...b,settings:s}))});}catch(e){return hata(e.message,e.message==='Giriş gerekli'?401:400);}}
