// Google Takvim (tek yönlü): asistanın verdiği randevular işletmenin Google Takvimine yazılır.
// Gerekli env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET. Google Cloud'da yönlendirme adresi: {SITE}/api/google/donus
import {adminSb} from './admin';import {imzala,imzaDogru} from './entegrasyon';import {SITE} from './site';
const KAPSAM='https://www.googleapis.com/auth/calendar.events';
export const donusAdresi=()=>SITE+'/api/google/donus';
export function baglantiLinki(bid){const ts=Date.now(),state=`${bid}.${ts}.${imzala(bid+'.'+ts)}`;
 const q=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID||'',redirect_uri:donusAdresi(),response_type:'code',scope:KAPSAM,access_type:'offline',prompt:'consent',include_granted_scopes:'true',state});
 return 'https://accounts.google.com/o/oauth2/v2/auth?'+q;}
export function stateCoz(state){const [bid,ts,i]=String(state||'').split('.');if(!bid||!ts||!imzaDogru(bid+'.'+ts,i)||Date.now()-+ts>15*60e3)return null;return bid;}
export async function kodDegistir(code){const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(8000),headers:{'content-type':'application/x-www-form-urlencoded'},
 body:new URLSearchParams({code,client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,redirect_uri:donusAdresi(),grant_type:'authorization_code'})});return r.json();}
async function erisim(refresh){const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(8000),headers:{'content-type':'application/x-www-form-urlencoded'},
 body:new URLSearchParams({refresh_token:refresh,client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,grant_type:'refresh_token'})});const j=await r.json();return j.access_token||null;}
// Randevuyu takvime yaz. Hata olursa sessizce geçer (randevu Dinlio'da zaten kayıtlı).
export async function takvimeYaz(bid,{baslik,bas,dk=30,aciklama=''}){
 try{if(!process.env.GOOGLE_CLIENT_ID)return {ok:false,atlandi:true};
  const {data:g}=await adminSb.from('google_baglanti').select('refresh_token,takvim').eq('business_id',bid).maybeSingle();if(!g)return {ok:false,atlandi:true};
  const tok=await erisim(g.refresh_token);if(!tok)return {ok:false,neden:'Google erişimi yenilenemedi, bağlantıyı tekrar kurun.'};
  const s=new Date(bas),e=new Date(s.getTime()+dk*60e3);
  const r=await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(g.takvim||'primary')}/events`,{method:'POST',signal:AbortSignal.timeout(8000),headers:{'content-type':'application/json',authorization:'Bearer '+tok},
   body:JSON.stringify({summary:String(baslik).slice(0,200),description:String(aciklama).slice(0,2000),start:{dateTime:s.toISOString(),timeZone:'Europe/Istanbul'},end:{dateTime:e.toISOString(),timeZone:'Europe/Istanbul'}})});
  return r.ok?{ok:true}:{ok:false,neden:'Google '+r.status};}catch(e){return {ok:false,neden:String(e.message||e).slice(0,120)};}}
