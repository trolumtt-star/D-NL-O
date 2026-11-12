// Teklif asistanının arama sonu raporu: sonucu yazar, sıradaki işletmeyi arar (zincir).
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {ayar,sonrakiniAra} from '@/lib/teklif';
export const dynamic='force-dynamic';export const maxDuration=30;
const ACMADI=/no-answer|did-not-answer|busy|voicemail|failed-to-connect|not-reachable|declined|rejected/i;
export async function POST(req){
 if(process.env.VAPI_SECRET&&req.headers.get('x-vapi-secret')!==process.env.VAPI_SECRET)return NextResponse.json({error:'yetkisiz'},{status:401});
 let body;try{body=await req.json();}catch{return NextResponse.json({ok:true});}
 const m=body.message||{};if(m.type!=='end-of-call-report')return NextResponse.json({ok:true});
 const id=m.call?.id;const {data:x}=id?await adminSb.from('teklif_arama').select('id,durum,deneme').eq('vapi_call_id',id).maybeSingle():{data:null};
 if(x){const a=await ayar(),u={ozet:String(m.analysis?.summary||m.summary||'').slice(0,800)||null};
  // Asistan sonuç aracını çağırmadıysa sonucu aramanın bitiş nedeninden çıkar
  if(x.durum==='araniyor'){const sebep=String(m.endedReason||'');
   if(ACMADI.test(sebep)){u.durum=x.deneme>=a.max_deneme?'bitti':'acmadi';u.sonraki_at=new Date(Date.now()+(x.deneme>=2?20:3)*36e5).toISOString();u.notlar='Açmadı ('+sebep+')';}
   else{u.durum='bitti';u.notlar='Sonuç kaydedilmedi ('+sebep+')';}}
  await adminSb.from('teklif_arama').update(u).eq('id',x.id);}
 let r=null;try{r=await sonrakiniAra();}catch(e){r={hata:String(e.message||e).slice(0,120)};}
 return NextResponse.json({ok:true,sonraki:r});}
