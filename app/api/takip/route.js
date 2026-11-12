// Müşterinin canlı takip linki (giriş yok). Kod tahmin edilemez; kurye konumu yalnızca paket yoldayken ve son 3 dakikadaysa döner.
// Teslimden 2 saat sonra link kapanır. Müşteri adı, telefonu, sipariş içeriği dönmez.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';
export const dynamic='force-dynamic';
export async function GET(req){const k=new URL(req.url).searchParams.get('k')||'';
 if(!/^[A-Za-z0-9_-]{10,20}$/.test(k))return NextResponse.json({error:'Bulunamadı'},{status:404});
 const {data:c}=await adminSb.from('calls').select('kurye_durum,kurye_teslim_at,order_status,extracted,kurye_id,businesses(name),kuryeler(ad,konum_lat,konum_lng,konum_at)').eq('takip_kod',k).maybeSingle();
 if(!c||(c.kurye_teslim_at&&Date.now()-new Date(c.kurye_teslim_at)>2*36e5))return NextResponse.json({error:'Bu takip linki artık geçerli değil.'},{status:404});
 const ky=c.kuryeler,taze=ky?.konum_at&&Date.now()-new Date(ky.konum_at)<180e3,h=c.extracted?.konum;
 return NextResponse.json({isletme:c.businesses?.name||'',durum:c.order_status==='cancelled'?'iptal':c.kurye_durum,kurye:ky?.ad?String(ky.ad).split(' ')[0]:null,
  konum:c.kurye_durum==='yolda'&&taze?{lat:ky.konum_lat,lng:ky.konum_lng}:null,hedef:h?.lat?{lat:+h.lat,lng:+h.lng}:null},{headers:{'cache-control':'no-store'}});}
