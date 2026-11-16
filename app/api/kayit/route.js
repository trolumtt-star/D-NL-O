// KENDİ KENDİNE KAYIT: ücretsiz hesap + 7 gün deneme. İşletme kendi asistanını /kurulum sohbetinde kurar, deneme bitince paket alır.
// Kötüye kullanım: IP başına günde 3, toplamda günde 60 kayıt; bot tuzağı alanı; deneme sadece 30 dakika.
import {NextResponse} from 'next/server';import crypto from 'crypto';import {adminSb} from '@/lib/admin';import {PK} from '@/lib/fiyatlar';import {denemeVarsayilan} from '@/lib/deneme';import {numaraAyar} from '@/lib/numara';import {bildir} from '@/lib/bildir';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
const ipHash=req=>crypto.createHash('sha256').update('kayit:'+(req.headers.get('x-forwarded-for')||'').split(',')[0].trim()+(process.env.SUPABASE_SERVICE_ROLE_KEY||'').slice(0,12)).digest('hex').slice(0,24);
export async function GET(){const {data}=await adminSb.from('verticals').select('id,name,kind').order('sort');return NextResponse.json({sektorler:data||[],paketler:PK.map(p=>({id:p.id,ad:p.ad,dk:p.dk})),deneme:await denemeVarsayilan(),numara:{ucret:(await numaraAyar()).ucret}});}

// Satın alma formundaki işletme bilgisi → asistan kurulum bilgisi (lib/asistanOlustur.js biçimi)
const tz=(v,n)=>String(v??'').replace(/[{}%<>]/g,'').replace(/\r/g,'').trim().slice(0,n);
const hhmm=v=>/^([01]?\d|2[0-3])[:.][0-5]\d$/.test(String(v||'').trim())?String(v).trim().replace('.',':').padStart(5,'0'):null;
function bilgiYap(f,isletme,tel){f=f||{};const ac=hhmm(f.acilis)||'09:00',kp=hhmm(f.kapanis)||'21:00',kap=new Set((Array.isArray(f.kapali)?f.kapali:[]).map(Number));
 const urunler=String(f.liste||'').split(/\n/).map(l=>l.trim()).filter(Boolean).slice(0,150).map(l=>{const m=l.match(/^(.*?)[\s:\-–—]*([\d.,]+)\s*(?:tl|₺)?\s*$/i);
  if(m&&m[1].trim()){const fy=+m[2].replace(/\.(?=\d{3}\b)/g,'').replace(',','.');return {ad:tz(m[1],80),fiyat:fy>0?fy:null};}return {ad:tz(l,80),fiyat:null};});
 return {isletme_adi:isletme,asistan_adi:tz(f.asistan_adi,30),adres:tz(f.adres,200),telefon:'0'+tel,tarz:tz(f.tarz,200),
  calisma_saatleri:[1,2,3,4,5,6,7].map(g=>kap.has(g)?{gun:g,kapali:true}:{gun:g,acilis:ac,kapanis:kp}),urunler,
  ...(f.teslimat!==undefined?{teslimat:{var:!!f.teslimat,km:+f.km>0?Math.min(50,+f.km):null,ucret:tz(f.teslimat_ucret,60)||null,min_siparis:tz(f.min_siparis,60)||null}}:{}),
  ...(f.personel||f.sure_dk?{randevu:{personel:String(f.personel||'').split(/[,\n]/).map(x=>tz(x,40)).filter(Boolean).slice(0,20),sure_dk:Math.min(240,Math.max(10,+f.sure_dk||30))}}:{}),
  ozel_notlar:tz(f.notlar,800)};}
export async function POST(req){try{const x=await req.json();
 if(x.web)return NextResponse.json({ok:true}); // bot tuzağı: görünmeyen alan doluysa sessizce geç
 const ad=String(x.ad||'').trim().slice(0,60),isletme=String(x.isletme||'').trim().replace(/[{}%<>]/g,'').slice(0,80),eposta=String(x.eposta||'').trim().toLowerCase().slice(0,120),sifre=String(x.sifre||'');
 let tel=String(x.tel||'').replace(/\D/g,'');if(tel.length===11&&tel[0]==='0')tel=tel.slice(1);if(tel.length===12&&tel.startsWith('90'))tel=tel.slice(2);
 if(ad.length<3)return hata('Adınızı ve soyadınızı yazın.');if(isletme.length<2)return hata('İşletmenizin adını yazın.');
 if(!/^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,120}\.[a-z]{2,}$/i.test(eposta))return hata('Geçerli bir e-posta yazın.');if(!/^[2-5]\d{9}$/.test(tel))return hata('Geçerli bir telefon yazın (05xx… veya 0 alan kodu…).');
 if(sifre.length<8||!/\d/.test(sifre)||!/[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(sifre))return hata('Şifre en az 8 karakter olmalı, harf ve rakam içermeli.');
 if(!x.kvkk)return hata('Devam etmek için KVKK aydınlatma metnini ve hizmet sözleşmesini onaylayın.');
 const {data:v}=await adminSb.from('verticals').select('id,config').eq('id',String(x.sektor||'')).maybeSingle();if(!v)return hata('Sektörünüzü seçin.');
 const ip=ipHash(req),gun=new Date(Date.now()-864e5).toISOString();
 const [{count:ipN},{count:top}]=await Promise.all([adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('type','kayit').eq('payload->>ip',ip).gte('created_at',gun),
  adminSb.from('webhook_events').select('id',{count:'exact',head:true}).eq('type','kayit').gte('created_at',gun)]);
 if(ipN>=3)return hata('Bu bağlantıdan bugün çok fazla hesap açıldı. Yarın tekrar deneyin ya da bize WhatsApp\'tan yazın.',429);
 if(top>=60)return hata('Bugün çok yoğunuz, lütfen birkaç saat sonra tekrar deneyin.',429);
 const {data:var_}=await adminSb.from('businesses').select('id').or(`email.eq.${eposta},username.eq.${eposta}`).limit(1);if(var_?.length)return hata('Bu e-posta ile zaten bir hesap var. Giriş yapın.');
 const {data:u,error:e1}=await adminSb.auth.admin.createUser({email:eposta,password:sifre,email_confirm:true,user_metadata:{ad}});
 if(e1)return hata(/registered|exists/i.test(e1.message)?'Bu e-posta ile zaten bir hesap var. Giriş yapın.':'Hesap açılamadı.');
 const DV=await denemeVarsayilan(),satin=!!x.satin,pk=PK.find(p=>p.id===x.paket)?.id||null,bitis=new Date(Date.now()+DV.gun*864e5).toISOString();
 if(satin&&!pk)return hata('Paket seçin.');
 const numara=satin?{tercih:x.numara?.tercih==='kirala'?'kirala':'kendi',mevcut:String(x.numara?.mevcut||'').replace(/\D/g,'').slice(-10)||null}:null;
 if(satin&&numara.tercih==='kendi'&&numara.mevcut&&!/^[2-5]\d{9}$/.test(numara.mevcut))return hata('Yönlendireceğiniz numarayı 05xx… ya da 0 alan kodu… şeklinde yazın.');
 const {data:b,error}=await adminSb.from('businesses').insert({name:isletme,username:eposta,email:eposta,owner_id:u.user.id,vertical:v.id,business_type:v.id,plan:'all',quota_minutes_total:satin?0:DV.dk,status:!satin&&DV.dk>0&&DV.gun>0?'active':'suspended',phone_number:'0'+tel,
  settings:{...(satin&&Number.isFinite(+x.bilgi?.lat)&&Number.isFinite(+x.bilgi?.lng)&&x.bilgi?.lat!==null?{konum:{adres:String(x.bilgi.adres||'').slice(0,200),lat:+x.bilgi.lat,lng:+x.bilgi.lng,bulunan:String(x.bilgi.adres||'').slice(0,200),kaynak:'gps'}}:{}),...(satin?{satin_al:{paket:pk,all:!!x.all,yil:!!x.yil,numara},kurulum:{bilgi:bilgiYap(x.bilgi,isletme,tel),kaynak:'satin_al_formu'}}:{deneme:{bitis,dk:DV.dk,gun:DV.gun}}),kayit:{kaynak:satin?'satin_al':'site',ad,tarih:new Date().toISOString()}}}).select('id').single();
 if(error){await adminSb.auth.admin.deleteUser(u.user.id);return hata('Hesap açılamadı, lütfen tekrar deneyin.');}
 await adminSb.from('webhook_events').insert({type:'kayit',business_id:b.id,payload:{ip,isletme,sektor:v.id,paket:pk,satin}});
 try{await bildir(b.id,satin?'👋 Hoş geldiniz! Ödemeniz onaylanınca asistanınız formdaki bilgilerle otomatik kurulacak ve hattınız bağlanacak.':DV.dk>0&&DV.gun>0?`👋 Hoş geldiniz! ${DV.gun} günlük, ${DV.dk} dakikalık ücretsiz denemeniz başladı. Hesabınızın kurulumu 24 saat içinde tamamlanacak; bu arada birkaç soruya cevap verip asistanınızı hazırlayabilirsiniz.`:'👋 Hoş geldiniz! Asistanınızı kullanmaya başlamak için panelden paketinizi seçin.');}catch{}
 return NextResponse.json({ok:true});}catch(e){return hata('Bir şeyler ters gitti, lütfen tekrar deneyin.');}}
