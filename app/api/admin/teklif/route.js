// Admin: teklif asistanı yönetimi (kurulum, arama listesi, başlat/durdur, sonuçlar).
import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {ayar,ayarYaz,saatUygun,sonrakiniAra,telNo,demoSil,ASISTAN_PROMPT} from '@/lib/teklif';import {vapiIstek} from '@/lib/vapi';import {SITE} from '@/lib/site';
export const dynamic='force-dynamic';export const maxDuration=40;
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
const SAAT=/^([01]\d|2[0-3]):[0-5]\d$/;
async function durum(){const a=await ayar();
 const [{data:l},{count:ret},{data:nums}]=await Promise.all([
  adminSb.from('teklif_arama').select('id,ad,tel,kategori,durum,deneme,sonraki_at,son_arama_at,randevu_at,yetkili,notlar,ozet,demo_asistan_id,created_at').order('created_at',{ascending:false}).limit(400),
  adminSb.from('aranmayacak').select('tel',{count:'exact',head:true}),vapiIstek('/phone-number')]);
 const sayac={};for(const x of l||[])sayac[x.durum]=(sayac[x.durum]||0)+1;
 return {ayar:a,saatUygun:saatUygun(a),liste:l||[],sayac,aranmayacak:ret||0,numaralar:Array.isArray(nums?.d)?nums.d.map(n=>({id:n.id,ad:n.name||n.number||n.sipUri||n.id})):[],vapi:!!process.env.VAPI_API_KEY};}
export async function GET(req){try{await requireAdmin(req);return NextResponse.json(await durum());}catch(e){return hata(e.message,401);}}
export async function POST(req){try{await requireAdmin(req);const x=await req.json(),a=await ayar();
 switch(x.islem){
  case 'kur':{// Satış asistanı: bir işletme asistanının sesini/modelini kopyalar, kendi prompt'u ve araçlarıyla yeni asistan açar
   const {data:b}=await adminSb.from('businesses').select('vapi_assistant_id').not('vapi_assistant_id','is',null).limit(1);const kaynak=String(x.kaynak||b?.[0]?.vapi_assistant_id||'');
   if(!kaynak)return hata('Ses ve modeli kopyalamak için önce bir işletmenin Vapi asistanı olmalı.');
   const src=await vapiIstek('/assistant/'+encodeURIComponent(kaynak));if(!src.ok)return hata('Kaynak asistan okunamadı: '+src.error);
   const sec=process.env.VAPI_SECRET,server={url:SITE+'/api/teklif/tool',...(sec?{headers:{'x-vapi-secret':sec}}:{})};
   const S=(t,d,e)=>({type:t,description:d,...(e?{enum:e}:{})});
   const tanim=[{name:'demo_saatleri',description:'Demo randevusu için boş gün ve saatleri getirir.',parameters:{type:'object',properties:{}}},
    {name:'teklif_sonuc',description:'Görüşmenin sonucunu kaydeder. Görüşmeyi bitirmeden önce bir kez çağrılır.',parameters:{type:'object',required:['sonuc'],properties:{sonuc:S('string','randevu: demo günü verildi; ilgilendi: bilgi istedi; sonra: daha sonra aranacak; istemiyor: aranmak istemiyor; yanlis: yanlış numara',['randevu','ilgilendi','sonra','istemiyor','yanlis']),randevu_tarih:S('string','YYYY-AA-GG'),randevu_saat:S('string','SS:DD'),yetkili:S('string','Görüşülen yetkilinin adı'),geri_ara:S('string','Ne zaman aranmak istedi'),not:S('string','Kısa not')}}}];
   const ids=[...(a.tool_ids||[])];
   for(let i=0;i<tanim.length;i++){const body={type:'function',function:tanim[i],server,messages:[{type:'request-start',content:i===0?'Hemen bakıyorum.':''}].filter(m=>m.content)};
    const r=ids[i]?await vapiIstek('/tool/'+ids[i],{method:'PATCH',body:JSON.stringify({function:tanim[i],server})}):{ok:false};
    if(!r.ok){const c=await vapiIstek('/tool',{method:'POST',body:JSON.stringify(body)});if(!c.ok)return hata('Araç oluşturulamadı: '+c.error);ids[i]=c.d.id;}}
   const s=src.d,govde={name:'Dinlio Teklif Asistanı',firstMessage:'Merhaba, ben Dinlio AI\'ın yapay zekâ asistanıyım.',
    model:{...s.model,messages:[{role:'system',content:ASISTAN_PROMPT}],toolIds:ids,tools:undefined},voice:s.voice,transcriber:s.transcriber,
    endCallFunctionEnabled:true,maxDurationSeconds:300,silenceTimeoutSeconds:20,
    server:{url:SITE+'/api/teklif/webhook',...(sec?{headers:{'x-vapi-secret':sec}}:{})},serverMessages:['end-of-call-report']};
   const r=a.asistan_id?await vapiIstek('/assistant/'+a.asistan_id,{method:'PATCH',body:JSON.stringify(govde)}):{ok:false};
   let aid=a.asistan_id;if(!r.ok){const c=await vapiIstek('/assistant',{method:'POST',body:JSON.stringify(govde)});if(!c.ok)return hata('Asistan oluşturulamadı: '+c.error);aid=c.d.id;}
   await ayarYaz({...a,asistan_id:aid,tool_ids:ids,kaynak_id:kaynak});break;}
  case 'ayar':{const es=Math.round(+x.eszamanli||1),gun=l=>[...new Set((l||[]).map(Number).filter(n=>n>=1&&n<=7))];
   const ar=(x.araliklar||[]).filter(r=>SAAT.test(r?.[0])&&SAAT.test(r?.[1])&&r[0]<r[1]).slice(0,4),ds=[...new Set((x.demo_saatler||[]).filter(s=>SAAT.test(s)))].sort().slice(0,10);
   if(es<1||es>3)return hata('Aynı anda 1-3 arama.');if(!ar.length)return hata('En az bir arama saati aralığı girin.');if(!ds.length)return hata('En az bir demo saati girin.');
   await ayarYaz({...a,eszamanli:es,gunler:gun(x.gunler),araliklar:ar,numara_id:x.numara_id?String(x.numara_id).slice(0,80):a.numara_id,demo:{...a.demo,gunler:gun(x.demo_gunler),saatler:ds}});break;}
  case 'ekle_lead':{let q=adminSb.from('leads').select('id,name,phone,category,address,score').not('phone','is',null).order('score',{ascending:false,nullsFirst:false}).limit(Math.min(500,+x.adet||50));
   if(x.sehir)q=q.eq('city',x.sehir);if(x.kategori)q=q.eq('category',x.kategori);if(x.min_puan)q=q.gte('score',+x.min_puan);
   const {data:l}=await q;const satir=(l||[]).map(y=>({lead_id:y.id,ad:String(y.name||'İşletme').slice(0,100),tel:telNo(y.phone),kategori:y.category,adres:y.address})).filter(y=>y.tel);
   const {data:ret}=satir.length?await adminSb.from('aranmayacak').select('tel').in('tel',satir.map(y=>y.tel)):{data:[]};const rs=new Set((ret||[]).map(y=>y.tel));
   const {error}=await adminSb.from('teklif_arama').upsert(satir.filter(y=>!rs.has(y.tel)),{onConflict:'tel',ignoreDuplicates:true});if(error)return hata(error.message);break;}
  case 'ekle_elle':{const satir=String(x.metin||'').split('\n').map(s=>s.split(/[;,\t]/)).map(([ad,tel,kat])=>({ad:String(ad||'').trim().slice(0,100),tel:telNo(tel),kategori:kat?String(kat).trim().slice(0,40):null})).filter(y=>y.ad&&y.tel).slice(0,500);
   if(!satir.length)return hata('Her satıra "İşletme adı; telefon" yazın.');
   const {data:ret}=await adminSb.from('aranmayacak').select('tel').in('tel',satir.map(y=>y.tel));const rs=new Set((ret||[]).map(y=>y.tel));
   const {error}=await adminSb.from('teklif_arama').upsert(satir.filter(y=>!rs.has(y.tel)),{onConflict:'tel',ignoreDuplicates:true});if(error)return hata(error.message);break;}
  case 'baslat':{if(!a.asistan_id)return hata('Önce "Teklif asistanını kur" tuşuna basın.');if(!a.numara_id)return hata('Arama yapılacak Vapi numarasını seçin (Netgsm numaranız Vapi\'ye eklenmiş olmalı).');
   await ayarYaz({...a,aktif:true});const r=await sonrakiniAra();return NextResponse.json({ok:true,mesaj:r.aranan?`${r.aranan} arama başladı.`:'Başlatıldı. '+(r.neden?'Şu an '+r.neden+'; uygun saatte kendiliğinden arar.':r.hata?'Hata: '+r.hata:'Sırada aranacak işletme yok.'),...(await durum())});}
  case 'durdur':await ayarYaz({...a,aktif:false});break;
  case 'tekrar':await adminSb.from('teklif_arama').update({durum:'sirada',sonraki_at:new Date().toISOString(),deneme:0}).eq('id',String(x.id||'')).neq('durum','araniyor');break;
  case 'sil':{const {data:y}=await adminSb.from('teklif_arama').select('demo_asistan_id').eq('id',String(x.id||'')).maybeSingle();if(y?.demo_asistan_id)await demoSil(y.demo_asistan_id);}
   await adminSb.from('teklif_arama').delete().eq('id',String(x.id||'')).neq('durum','araniyor');break;
  case 'aranmasin':{const {data:y}=await adminSb.from('teklif_arama').select('tel,demo_asistan_id').eq('id',String(x.id||'')).maybeSingle();if(y){await adminSb.from('aranmayacak').upsert({tel:y.tel,neden:'admin'});if(y.demo_asistan_id)await demoSil(y.demo_asistan_id);await adminSb.from('teklif_arama').update({durum:'istemiyor'}).eq('id',String(x.id));}break;}
  case 'randevu_bitti':await adminSb.from('teklif_arama').update({durum:'bitti'}).eq('id',String(x.id||'')).eq('durum','randevu');break;
  default:return hata('Geçersiz işlem');}
 return NextResponse.json({ok:true,...(await durum())});}catch(e){return hata(e.message,e.message==='Yetkisiz'?401:400);}}
