// Dış hizmet bağlantıları. Her biri Vercel ortam değişkeniyle açılır; anahtar yoksa sessizce "bağlı değil" döner,
// böylece hesap açılınca sadece anahtarı eklemek yeter, kod değişmez. Anahtarlar asla koda yazılmaz.
import crypto from 'crypto';
const zaman=ms=>AbortSignal.timeout(ms);
// ---- İmzalı kısa kodlar (bildirimdeki Onayla/Reddet, Google bağlantı dönüşü). Anahtar sunucu gizlisinden türetilir.
const anahtar=()=>crypto.createHash('sha256').update('dinlio-imza:'+(process.env.SUPABASE_SERVICE_ROLE_KEY||'')).digest();
export const imzala=s=>crypto.createHmac('sha256',anahtar()).update(String(s)).digest('base64url').slice(0,32);
export const imzaDogru=(s,i)=>{const a=Buffer.from(imzala(s)),b=Buffer.from(String(i||''));return a.length===b.length&&crypto.timingSafeEqual(a,b);};
// ---- Telefon numarası: 905xxxxxxxxx
export const tr90=s=>{let d=String(s||'').replace(/\D/g,'');if(d.length===10&&d[0]==='5')d='90'+d;else if(d.length===11&&d[0]==='0')d='90'+d.slice(1);return /^905\d{9}$/.test(d)?d:null;};

// ---- SMS: Netgsm (NETGSM_USERCODE, NETGSM_PASSWORD, NETGSM_HEADER = onaylı gönderici başlığı)
export const smsHazir=()=>!!(process.env.NETGSM_USERCODE&&process.env.NETGSM_PASSWORD&&process.env.NETGSM_HEADER);
export async function smsGonder(no,metin){
 if(!smsHazir())return {ok:false,atlandi:true,neden:'Netgsm bağlı değil'};
 const n=tr90(no);if(!n)return {ok:false,neden:'Geçersiz cep numarası'};
 try{const r=await fetch('https://api.netgsm.com.tr/sms/rest/v2/send',{method:'POST',signal:zaman(8000),
   headers:{'content-type':'application/json',authorization:'Basic '+Buffer.from(process.env.NETGSM_USERCODE+':'+process.env.NETGSM_PASSWORD).toString('base64')},
   body:JSON.stringify({msgheader:process.env.NETGSM_HEADER,encoding:'TR',iysfilter:'0',messages:[{msg:String(metin).slice(0,600),no:n}]})});
  const t=await r.text();let j={};try{j=JSON.parse(t);}catch{}
  return r.ok&&(j.code==='00'||j.jobid)?{ok:true,id:j.jobid}:{ok:false,neden:`Netgsm ${r.status} ${t.slice(0,160)}`};}
 catch(e){return {ok:false,neden:String(e.message||e).slice(0,160)};}}

// ---- E-posta: Resend (RESEND_API_KEY, RESEND_FROM = "Dinlio AI <bildirim@alanadiniz.com>", alan adı Resend'de doğrulanmış olmalı)
export const epostaHazir=()=>!!(process.env.RESEND_API_KEY&&process.env.RESEND_FROM);
export async function epostaGonder(to,konu,html){
 if(!epostaHazir())return {ok:false,atlandi:true,neden:'E-posta servisi bağlı değil'};
 if(!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(String(to||'')))return {ok:false,neden:'Geçersiz e-posta'};
 try{const r=await fetch('https://api.resend.com/emails',{method:'POST',signal:zaman(8000),headers:{'content-type':'application/json',authorization:'Bearer '+process.env.RESEND_API_KEY},
   body:JSON.stringify({from:process.env.RESEND_FROM,to:[to],subject:String(konu).slice(0,150),html})});
  const t=await r.text();return r.ok?{ok:true}:{ok:false,neden:`Resend ${r.status} ${t.slice(0,160)}`};}
 catch(e){return {ok:false,neden:String(e.message||e).slice(0,160)};}}
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---- WhatsApp Business Cloud API (META_WA_TOKEN = sistem kullanıcısı kalıcı anahtarı). Numara kimliği mesaj_kanallari.dis_id'de.
export const waHazir=()=>!!process.env.META_WA_TOKEN;
export async function waGonder(phoneId,to,metin){
 if(!waHazir())return {ok:false,atlandi:true,neden:'WhatsApp bağlı değil'};
 const n=tr90(to)||String(to||'').replace(/\D/g,'');
 try{const r=await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`,{method:'POST',signal:zaman(8000),headers:{'content-type':'application/json',authorization:'Bearer '+process.env.META_WA_TOKEN},
   body:JSON.stringify({messaging_product:'whatsapp',to:n,type:'text',text:{body:String(metin).slice(0,4000)}})});
  const t=await r.text();return r.ok?{ok:true}:{ok:false,neden:`WhatsApp ${r.status} ${t.slice(0,160)}`};}
 catch(e){return {ok:false,neden:String(e.message||e).slice(0,160)};}}

// ---- Durum özeti (admin Entegrasyonlar kartı). Sadece açık/kapalı döner, anahtarın kendisi asla dönmez.
export const durum=()=>({
 vapi:!!process.env.VAPI_API_KEY,
 vapiPublic:!!process.env.VAPI_PUBLIC_KEY,
 netgsm:smsHazir(),
 eposta:epostaHazir(),
 whatsapp:waHazir()&&!!process.env.META_APP_SECRET&&!!process.env.META_VERIFY_TOKEN,
 instagram:!!process.env.META_APP_SECRET&&!!process.env.META_VERIFY_TOKEN,
 google:!!(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET),
 elevenlabs:!!process.env.ELEVENLABS_API_KEY,
});
