// Teklif asistanının araçları: demo_saatleri, teklif_sonuc. Sadece bizim kuyruğumuzdaki aramalar için çalışır.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {ayar,demoSaatleri} from '@/lib/teklif';import {smsGonder} from '@/lib/entegrasyon';import {DESTEK} from '@/lib/destek';
export const dynamic='force-dynamic';export const maxDuration=20;
const SONUC=['randevu','ilgilendi','sonra','istemiyor','yanlis'];
export async function POST(req){
 const sec=process.env.VAPI_SECRET,hs=req.headers.get('x-vapi-secret')||(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(sec&&hs!==sec)return NextResponse.json({error:'yetkisiz'},{status:401});
 let body;try{body=await req.json();}catch{return NextResponse.json({results:[]});}
 const m=body.message||{},call=m.call||{},calls=m.toolCallList||m.toolCalls||[],results=[];
 const {data:x}=call.id?await adminSb.from('teklif_arama').select('id,ad,tel').eq('vapi_call_id',call.id).maybeSingle():{data:null};
 for(const tc of calls){const name=tc.function?.name||tc.name;let a=tc.function?.arguments||tc.arguments||{};if(typeof a==='string'){try{a=JSON.parse(a);}catch{a={};}}let out;
  if(!x)out={ok:false,reason:'Bu arama teklif listesinde değil.'};
  else if(name==='demo_saatleri'){const s=await demoSaatleri(await ayar());out=s.length?{ok:true,saatler:s,message:'En fazla 3 seçenek söyle (gün adı ve saatle).'}:{ok:true,saatler:[],message:'Bu hafta boş demo saati yok. Müşteriye birkaç gün içinde tekrar arayıp gün ayarlayacağımızı söyle ve sonuc="ilgilendi" ile kaydet.'};}
  else if(name==='teklif_sonuc'){const sonuc=SONUC.includes(a.sonuc)?a.sonuc:'ilgilendi',u={durum:sonuc,yetkili:a.yetkili?String(a.yetkili).slice(0,60):null,notlar:[a.geri_ara?'Geri ara: '+a.geri_ara:'',a.not?String(a.not):''].filter(Boolean).join(' · ').slice(0,400)||null};
   if(sonuc==='randevu'){const t=new Date(`${a.randevu_tarih}T${a.randevu_saat}:00+03:00`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(a.randevu_tarih||'')||!/^\d{2}:\d{2}$/.test(a.randevu_saat||'')||isNaN(t)||t<new Date()){out={ok:false,reason:'Tarih YYYY-AA-GG, saat SS:DD olmalı ve ileri bir zaman olmalı. demo_saatleri listesinden seçtir.'};results.push({toolCallId:tc.id,result:JSON.stringify(out)});continue;}
    const {count}=await adminSb.from('teklif_arama').select('id',{count:'exact',head:true}).eq('durum','randevu').eq('randevu_at',t.toISOString()).neq('id',x.id);
    if(count){out={ok:false,reason:'Bu saat az önce doldu, demo_saatleri ile başka saat öner.'};results.push({toolCallId:tc.id,result:JSON.stringify(out)});continue;}
    u.randevu_at=t.toISOString();}
   if(sonuc==='sonra')u.sonraki_at=new Date(Date.now()+24*36e5).toISOString();
   await adminSb.from('teklif_arama').update(u).eq('id',x.id);
   if(sonuc==='istemiyor'||sonuc==='yanlis')await adminSb.from('aranmayacak').upsert({tel:x.tel,neden:sonuc});
   if(sonuc==='randevu'){const z=new Date(u.randevu_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
    await adminSb.from('webhook_events').insert({type:'teklif_randevu',payload:{ad:x.ad,zaman:z}});try{await smsGonder(DESTEK,`Dinlio teklif: ${x.ad} demo randevusu verdi: ${z}${u.yetkili?' ('+u.yetkili+')':''}. Tel: 0${x.tel}`);}catch{}}
   out={ok:true,message:'Kaydedildi. Kısaca teşekkür et ve vedalaşıp görüşmeyi bitir.'};}
  else out={ok:false,reason:'Bilinmeyen araç'};
  results.push({toolCallId:tc.id,result:JSON.stringify(out)});}
 return NextResponse.json({results});}
