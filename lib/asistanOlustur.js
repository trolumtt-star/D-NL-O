// KENDİ KENDİNE KURULUM: işletme sahibinin kurulum sohbetinde verdiği bilgilerle Vapi asistanını otomatik oluşturur.
// Ses, yapay zekâ modeli ve sunucu ayarları "şablon" asistandan kopyalanır (admin ayarlar: sistem_ayarlari 'sablon_asistan';
// yoksa mevcut işletmelerden birinin asistanı). Sonra sektör araçları lib/asistanKur.js ile kurulur.
import {adminSb} from './admin';import {vapiIstek} from './vapi';import {composePrompt} from './prompt';import {araclariKur} from './asistanKur';import {SITE} from './site';
const temiz=(s,n)=>String(s??'').replace(/[{}%]/g,'').replace(/\r/g,'').trim().slice(0,n);
const GUN=['','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
export async function sablon(){const {data:a}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','sablon_asistan').maybeSingle();
 let id=a?.deger?.id;if(!id){const {data:b}=await adminSb.from('businesses').select('vapi_assistant_id').not('vapi_assistant_id','is',null).order('created_at').limit(1);id=b?.[0]?.vapi_assistant_id;}
 if(!id)throw new Error('Şablon asistan yok (admin önce bir asistan bağlamalı).');const r=await vapiIstek('/assistant/'+encodeURIComponent(id));if(!r.ok)throw new Error('Şablon asistan okunamadı.');return r.d;}
const saat=s=>/^([01]?\d|2[0-3])[:.][0-5]\d$/.test(String(s||'').trim())?String(s).trim().replace('.',':').padStart(5,'0'):null;
export function bilgiMetni(b,x){const sat=[];
 if(x.adres)sat.push('Adres: '+temiz(x.adres,200));if(x.telefon)sat.push('İşletme telefonu: '+temiz(x.telefon,30));
 const cs=(x.calisma_saatleri||[]).filter(g=>g.gun>=1&&g.gun<=7);if(cs.length)sat.push('Çalışma saatleri: '+cs.map(g=>g.kapali?`${GUN[g.gun]} kapalı`:`${GUN[g.gun]} ${g.acilis}-${g.kapanis}`).join(', '));
 if(x.teslimat?.var)sat.push(`Paket servis var${x.teslimat.km?`, yaklaşık ${x.teslimat.km} km içine`:''}${x.teslimat.ucret?`, teslimat ücreti: ${temiz(x.teslimat.ucret,60)}`:''}${x.teslimat.min_siparis?`, en az sipariş: ${temiz(x.teslimat.min_siparis,60)}`:''}.`);
 else if(x.teslimat&&x.teslimat.var===false)sat.push('Paket servis yok, sadece gel-al / yerinde.');
 if(x.randevu?.personel?.length)sat.push('Çalışanlar: '+x.randevu.personel.map(p=>temiz(p,40)).join(', '));
 for(const q of (x.sss||[]).slice(0,25))if(q.soru&&q.cevap)sat.push(`${temiz(q.soru,150)} → ${temiz(q.cevap,300)}`);
 if(x.ozel_notlar)sat.push(temiz(x.ozel_notlar,800));
 return sat.join('\n').slice(0,4000);}
export async function asistanOlustur(bid){
 const {data:b}=await adminSb.from('businesses').select('*').eq('id',bid).single();const x=b.settings?.kurulum?.bilgi||{};
 const {data:v}=await adminSb.from('verticals').select('*').eq('id',b.vertical||'generic').maybeSingle();
 const s=await sablon(),ad=temiz(x.asistan_adi,30),isim=temiz(x.isletme_adi||b.name,80);
 const prompt=composePrompt(v||{id:'generic',name:'işletme',kind:'appointment',config:{}})+`\n\n# BU İŞLETME\nİşletmenin adı: ${isim}.${x.tarz?' Konuşma tarzın: '+temiz(x.tarz,200)+'.':''}`;
 const govde={name:('Dinlio · '+isim).slice(0,40),firstMessage:`Merhaba, ${isim}, ben yapay zeka asistanı${ad?' '+ad:'yım'}. Görüşmemiz hizmet kalitesi için kaydedilmektedir. Size nasıl yardımcı olabilirim?`,
  model:{...s.model,messages:[{role:'system',content:prompt}],toolIds:undefined,tools:undefined},voice:s.voice,transcriber:s.transcriber,
  ...(s.server?{server:s.server}:{}),...(s.serverMessages?{serverMessages:s.serverMessages}:{}),...(s.analysisPlan?{analysisPlan:s.analysisPlan}:{}),
  maxDurationSeconds:s.maxDurationSeconds||600,endCallFunctionEnabled:true,...(s.backgroundSound?{backgroundSound:s.backgroundSound}:{})};
 let aid=b.vapi_assistant_id;
 if(aid){const r=await vapiIstek('/assistant/'+encodeURIComponent(aid),{method:'PATCH',body:JSON.stringify({name:govde.name,firstMessage:govde.firstMessage,model:govde.model})});if(!r.ok)aid=null;}
 if(!aid){const c=await vapiIstek('/assistant',{method:'POST',body:JSON.stringify(govde)});if(!c.ok||!c.d?.id)throw new Error('Asistan oluşturulamadı: '+(c.error||''));aid=c.d.id;}
 // Fiyat listesi: sipariş alan işletmede menü, randevulu işletmede hizmetler (boşsa doldurulur, varsa dokunulmaz)
 const urun=(x.urunler||[]).filter(u=>u.ad).slice(0,150),siparis=v?.kind==='order';
 if(urun.length){const tablo=siparis?'menu_items':'services';const {count}=await adminSb.from(tablo).select('id',{count:'exact',head:true}).eq('business_id',bid);
  if(!count||!siparis){if(!siparis)await adminSb.from('services').delete().eq('business_id',bid);
   const satir=urun.map(u=>({business_id:bid,name:temiz(u.ad,80),price:+u.fiyat>0?+u.fiyat:null,category:temiz(u.kategori,40)||null,...(siparis?{available:true}:{duration_minutes:Math.min(480,Math.max(5,+u.sure_dk||x.randevu?.sure_dk||30)),active:true})}));
   await adminSb.from(tablo).insert(satir);}}
 // Randevulu işletmede çalışanlar (kaynak) ve çalışma saatleri
 const wh={};for(const g of (x.calisma_saatleri||[]))if(g.gun>=1&&g.gun<=7&&!g.kapali&&saat(g.acilis)&&saat(g.kapanis))wh[g.gun]=[saat(g.acilis),saat(g.kapanis)];
 if(!siparis&&(x.randevu?.personel||[]).length){const {count}=await adminSb.from('resources').select('id',{count:'exact',head:true}).eq('business_id',bid);
  if(!count)await adminSb.from('resources').insert(x.randevu.personel.slice(0,20).map(p=>({business_id:bid,name:temiz(p,40),kind:'staff',active:true})));}
 const st={...(b.settings||{}),bilgi:bilgiMetni(b,x),asistan:{ad,kisilik:temiz(x.tarz,300)},...(Object.keys(wh).length?{working_hours:wh}:{}),...(x.randevu?.sure_dk?{slot_minutes:Math.min(240,Math.max(10,+x.randevu.sure_dk))}:{}),
  ...(x.teslimat?.km&&siparis?{teslimat_km:Math.min(50,Math.max(0.5,+x.teslimat.km))}:{}),kurulum:{...(b.settings?.kurulum||{}),tamam:new Date().toISOString()}};
 await adminSb.from('businesses').update({vapi_assistant_id:aid,name:isim||b.name,phone_number:b.phone_number||temiz(x.telefon,20)||null,settings:st}).eq('id',bid);
 const k=await araclariKur(bid,SITE);
 return {ok:true,assistantId:aid,sonuc:k.sonuc};}
