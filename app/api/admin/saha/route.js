// Saha modu: yakındaki en umutlu işletmeyi öner, ziyaret sonucunu kaydet, günlük ilerlemeyi göster.
import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {yakindakiler,puanla,SEKTOR} from '@/lib/saha';
export const dynamic='force-dynamic';export const maxDuration=45;
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
const SONUC={demo:'Demo yaptım, ilgilendi',ilgilendi:'İlgilendi, tekrar gel',sonra:'Yetkili yoktu, sonra gel',ilgilenmedi:'İlgilenmedi',kapali:'Kapalı / bulunamadı',musteri:'Müşteri oldu 🎉'};
// Bu sonuçlardan sonra kaç gün tekrar önerilmesin
const BEKLE={demo:3,ilgilendi:3,sonra:1,ilgilenmedi:60,kapali:14,musteri:3650};
const bugunBasi=()=>new Date(new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'})+'T00:00:00+03:00');
export async function GET(req){try{await requireAdmin(req);
 const {data}=await adminSb.from('leads').select('id,name,category,ziyaret_sonuc,ziyaret_at,lat,lon,phone').gte('ziyaret_at',bugunBasi().toISOString()).order('ziyaret_at',{ascending:false});
 const {data:takip}=await adminSb.from('leads').select('id,name,category,ziyaret_sonuc,ziyaret_at,lat,lon,phone,notes').in('ziyaret_sonuc',['demo','ilgilendi','sonra']).order('ziyaret_at',{ascending:false}).limit(30);
 return NextResponse.json({bugun:data||[],takip:takip||[],sonuclar:SONUC});}catch(e){return hata(e.message,401);}}
export async function POST(req){try{await requireAdmin(req);const x=await req.json();
 if(x.islem==='sonuc'){if(!SONUC[x.sonuc])return hata('Geçersiz sonuç');
  const {error}=await adminSb.from('leads').update({ziyaret_sonuc:x.sonuc,ziyaret_at:new Date().toISOString(),status:x.sonuc,notes:x.not?String(x.not).slice(0,500):undefined}).eq('id',String(x.id||''));
  if(error)throw error;return NextResponse.json({ok:true});}
 if(x.islem!=='oner')return hata('Geçersiz işlem');
 const lat=+x.lat,lon=+x.lon;if(!(lat>35&&lat<43&&lon>25&&lon<45))return hata('Konum Türkiye dışında görünüyor ya da alınamadı.');
 const konum={lat,lon},atla=new Set((x.atla||[]).map(String).slice(0,200));
 // 1) yakındakileri haritadan çek (önce 1,5 km; azsa 3 km)
 let bulunan=await yakindakiler(lat,lon,1500);if(bulunan.length<8)bulunan=bulunan.concat(await yakindakiler(lat,lon,3000).catch(()=>[]));
 const ids=[...new Set(bulunan.map(b=>b.osm_id))];
 // 2) veritabanında olmayanları ekle (ziyaret geçmişi korunur)
 const mevcut=new Map();for(let i=0;i<ids.length;i+=150){const {data}=await adminSb.from('leads').select('id,osm_id,ziyaret_at,ziyaret_sonuc,rating_count,rating').in('osm_id',ids.slice(i,i+150));for(const r of data||[])mevcut.set(r.osm_id,r);}
 const yeni=[];const goruldu=new Set();for(const b of bulunan){if(mevcut.has(b.osm_id)||goruldu.has(b.osm_id))continue;goruldu.add(b.osm_id);yeni.push({...b,city:'Saha'});}
 if(yeni.length){const {data}=await adminSb.from('leads').insert(yeni).select('id,osm_id');for(const r of data||[])mevcut.set(r.osm_id,{id:r.id});}
 // 3) puanla, yakın zamanda gidilenleri ve "geç" denenleri çıkar
 const simdi=Date.now(),aday=[];const tek=new Set();
 for(const b of bulunan){if(tek.has(b.osm_id))continue;tek.add(b.osm_id);const m=mevcut.get(b.osm_id);if(!m?.id||atla.has(m.id))continue;
  if(m.ziyaret_at&&m.ziyaret_sonuc&&simdi-new Date(m.ziyaret_at).getTime()<(BEKLE[m.ziyaret_sonuc]||3)*864e5)continue;
  const p=puanla({...b,rating_count:m.rating_count},konum);if(!p||p.puan<=0)continue;aday.push({id:m.id,...b,...p});}
 aday.sort((a,b)=>b.puan-a.puan);
 const hazirla=a=>{const s=SEKTOR[a.category];return {id:a.id,ad:a.name,sektor:s.ad,puan:a.puan,mesafe:a.mesafe,yuruyus:a.yuruyus,neden:a.neden,acik:a.opening_hours,telefon:a.phone,adres:a.address,lat:a.lat,lon:a.lon,
  aci:s.aci,soz:s.soz,dikey:s.dikey,yol:`https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lon}&travelmode=walking`};};
 return NextResponse.json({toplam:aday.length,oneri:aday[0]?hazirla(aday[0]):null,alternatif:aday.slice(1,4).map(hazirla)});}
 catch(e){return hata(e.message,e.message==='Yetkisiz'?401:400);}}
