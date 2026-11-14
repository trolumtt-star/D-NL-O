// Panel → Büyüme: kazanç özeti, sadakat programı, geri kazanma aramaları, kampanya izinleri ve bekleme listesi.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';import {paketOf,enAzPaket} from '@/lib/paket';
import {kazanc,sadakatAyar,geriAyar,temiz,ekSatisAyar,patronAyar,cokDilAyarla} from '@/lib/buyume';import {vapiIstek} from '@/lib/vapi';import {araclariKur} from '@/lib/asistanKur';
export const dynamic='force-dynamic';export const maxDuration=30;
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
const ayBasi=()=>{const g=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});return new Date(g.slice(0,8)+'01T00:00:00+03:00');};
// Ayar asistanın promptunu/araçlarını değiştiriyorsa asistan yeniden kurulur
async function yenile(b,req,ok){if(!b.vapi_assistant_id)return ok+' (Asistan kurulunca geçerli olur.)';try{await araclariKur(b.id,new URL(req.url).origin);return ok;}catch(e){return 'Kaydedildi ama asistan güncellenemedi: '+e.message;}}
async function ozet(b){const pk=paketOf(b),st=b.settings||{},bugun=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});
 const [k,{count:izinli},{count:ret},{data:bk}]=await Promise.all([kazanc(b,ayBasi()),
  adminSb.from('musteri_izin').select('tel',{count:'exact',head:true}).eq('business_id',b.id).eq('izin',true),
  adminSb.from('musteri_izin').select('tel',{count:'exact',head:true}).eq('business_id',b.id).eq('izin',false),
  adminSb.from('bekleme_listesi').select('id,ad,tel,tarih,hizmet,notlar,durum').eq('business_id',b.id).gte('tarih',bugun).in('durum',['bekliyor','haber_verildi']).order('tarih').limit(60)]);
 return {kazanc:k,sadakat:sadakatAyar(st),geri:geriAyar(st),ekSatis:ekSatisAyar(st),patron:patronAyar(st),cokDil:{aktif:!!st.cok_dil?.aktif,dinleyici:st.cok_dil?.dinleyici||''},izinli:izinli||0,ret:ret||0,bekleme:bk||[],
  paket:{sadik:pk.sadik,geri:pk.geri,hatirlatma:pk.hatirlatma,sms:pk.sms,ekSatis:pk.ekSatis,patron:pk.patron,cokDil:pk.cokDil,ad:pk.ad},enAz:Object.fromEntries(['sadik','geri','hatirlatma','ekSatis','patron','cokDil'].map(k=>[k,enAzPaket(k)])),
  siparis:!!(b.vertical&&['restaurant','wholesale'].includes(b.vertical))||!b.vertical,randevu:!['restaurant','wholesale'].includes(b.vertical||'restaurant')};}
export async function GET(req){try{const b=await requireOwner(req);const u=new URL(req.url);
 if(u.searchParams.get('csv')==='izin'){const {data}=await adminSb.from('musteri_izin').select('tel,ad,izin,kaynak,guncel,son_arama').eq('business_id',b.id).order('guncel',{ascending:false}).limit(20000);
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const t='﻿'+[['Telefon','Ad','İzin','Kaynak','İzin tarihi','Son kampanya araması'],...(data||[]).map(x=>['0'+x.tel,x.ad||'',x.izin?'ONAY':'RET',x.kaynak==='telefon'?'Sesli (telefon görüşmesi, kayıtlı)':x.kaynak||'',new Date(x.guncel).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}),x.son_arama?new Date(x.son_arama).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}):''])].map(r=>r.map(q).join(';')).join('\r\n');
  return new NextResponse(t,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="kampanya_izinleri.csv"','cache-control':'no-store'}});}
 return NextResponse.json(await ozet(b));}catch(e){return hata(e.message,401);}}
export async function POST(req){try{const b=await requireOwner(req);const x=await req.json(),pk=paketOf(b),s={...(b.settings||{})};let mesaj='Kaydedildi.';
 switch(x.islem){
  case 'sadakat':{if(x.aktif&&!pk.sadik)return hata(`Sadakat programı ${enAzPaket('sadik')} paketten itibaren açılır.`);const odul=temiz(x.odul,80);if(x.aktif&&!odul)return hata('Ödülü yazın (ör. "künefe ikram" ya da "%20 indirim").');
   s.sadakat={aktif:!!x.aktif,her:Math.min(50,Math.max(2,Math.round(+x.her||5))),odul,komisyon:Math.min(50,Math.max(0,+x.komisyon||0)),sepet:Math.min(100000,Math.max(0,Math.round(+x.sepet||0)))};break;}
  case 'geri':{if(x.aktif&&!pk.geri)return hata(`Geri kazanma aramaları ${enAzPaket('geri')} paketten itibaren açılır.`);const teklif=temiz(x.teklif,200);if(x.aktif&&teklif.length<10)return hata('Aranan müşteriye söylenecek teklifi yazın (ör. "bu hafta size özel tüm dürümlerde %15 indirim").');
   const once=!!s.geri_cagirma?.aktif;s.geri_cagirma={aktif:!!x.aktif,gun:Math.min(365,Math.max(15,Math.round(+x.gun||45))),teklif,gunluk:Math.min(30,Math.max(1,Math.round(+x.gunluk||10)))};
   await adminSb.from('businesses').update({settings:s}).eq('id',b.id);
   // Açılınca asistana "kampanya izni sor" aracı ve kuralı kurulur
   if(once!==!!x.aktif&&b.vapi_assistant_id){try{await araclariKur(b.id,new URL(req.url).origin);mesaj=x.aktif?'Açıldı. Asistan bundan sonra sipariş/randevu sonunda kampanya izni soracak.':'Kapatıldı.';}catch(e){mesaj='Kaydedildi ama asistan güncellenemedi: '+e.message;}}
   return NextResponse.json({ok:true,mesaj,...await ozet({...b,settings:s})});}
  case 'ek_satis':{if(x.aktif&&!pk.ekSatis)return hata(`Akıllı ek satış ${enAzPaket('ekSatis')} paketten itibaren açılır.`);const once=!!s.ek_satis?.aktif;s.ek_satis={aktif:!!x.aktif,oneri:temiz(x.oneri,300)};
   await adminSb.from('businesses').update({settings:s}).eq('id',b.id);if(once!==!!x.aktif)mesaj=await yenile(b,req,x.aktif?'Açıldı, asistan bundan sonra bir kez ürün önerecek.':'Kapatıldı.');return NextResponse.json({ok:true,mesaj,...await ozet({...b,settings:s})});}
  case 'patron':{if(x.aktif&&!pk.patron)return hata(`Patron hattı ${enAzPaket('patron')} paketten itibaren açılır.`);
   const nl=[...new Set((Array.isArray(x.numaralar)?x.numaralar:[]).map(n=>String(n||'').replace(/\D/g,'')).filter(n=>n.length>=10).map(n=>n.slice(-10)))];
   if(nl.some(n=>!/^[2-5]\d{9}$/.test(n)))return hata('Numaraları 05xx… ya da 0 alan kodu… şeklinde yazın.');if(x.aktif&&!nl.length)return hata('En az bir patron numarası yazın.');if(nl.length>3)return hata('En fazla 3 numara.');
   const pin=String(x.pin||'').replace(/\D/g,'');if(pin&&!/^\d{4}$/.test(pin))return hata('PIN 4 haneli olmalı.');if(pin&&/^(\d)\1{3}$|^(1234|4321|0123)$/.test(pin))return hata('Bu PIN çok kolay tahmin edilir, başka bir PIN seçin.');
   const eskiPin=s.patron?.pin;if(x.aktif&&!pin&&!eskiPin)return hata('4 haneli bir PIN belirleyin.');const once=!!s.patron?.aktif;
   s.patron={aktif:!!x.aktif,numaralar:nl,pin:pin||eskiPin||''};await adminSb.from('businesses').update({settings:s}).eq('id',b.id);
   mesaj=once!==!!x.aktif?await yenile(b,req,x.aktif?'Açıldı. Kayıtlı numaranızdan işletme hattınızı arayın, asistan PIN soracak.':'Kapatıldı.'):'Kaydedildi.';return NextResponse.json({ok:true,mesaj,...await ozet({...b,settings:s})});}
  case 'cok_dil':{if(x.aktif&&!pk.cokDil)return hata(`Çok dilli asistan ${enAzPaket('cokDil')} paketten itibaren açılır.`);
   const r=await cokDilAyarla(b,!!x.aktif,vapiIstek);s.cok_dil=r;await adminSb.from('businesses').update({settings:s}).eq('id',b.id);
   mesaj=await yenile(b,req,x.aktif?`Açıldı (${r.dinleyici}). Asistan arayanın dilinde cevap verecek.${r.not||''} Lütfen bir İngilizce test araması yapın.`:'Kapatıldı, asistan yalnızca Türkçe dinliyor.');return NextResponse.json({ok:true,mesaj,...await ozet({...b,settings:s})});}
  case 'bekleme':{const d=['tamam','iptal'].includes(x.durum)?x.durum:null;if(!d||!x.id)return hata('Geçersiz');await adminSb.from('bekleme_listesi').update({durum:d}).eq('id',x.id).eq('business_id',b.id);return NextResponse.json({ok:true,...await ozet(b)});}
  case 'izin_kaldir':{const t=String(x.tel||'').replace(/\D/g,'').slice(-10);if(t.length!==10)return hata('Numara geçersiz');await adminSb.from('musteri_izin').upsert({business_id:b.id,tel:t,izin:false,kaynak:'panel',guncel:new Date().toISOString()},{onConflict:'business_id,tel'});mesaj='Numara kampanya aramalarından çıkarıldı.';break;}
  default:return hata('Geçersiz işlem');}
 const {error}=await adminSb.from('businesses').update({settings:s}).eq('id',b.id);if(error)return hata(error.message);
 return NextResponse.json({ok:true,mesaj,...await ozet({...b,settings:s})});}catch(e){return hata(e.message,e.message==='Giriş gerekli'?401:400);}}
