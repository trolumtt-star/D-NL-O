// GİZLİ ANAHTAR (VAPI_SECRET): Vapi'nin bize gönderdiği her istekte "x-vapi-secret" başlığında gelen ortak şifre.
// Admin → Entegrasyonlar'dan tek tuşla üretilir; veritabanında (sistem_ayarlari 'gizli') tarayıcıların okuyamadığı yerde durur,
// hiçbir ekranda gösterilmez. Vercel'de VAPI_SECRET tanımlıysa o da geçerli sayılır.
// Yenilemede eski şifre 2 saat daha kabul edilir (asistanlar yeni şifreye geçerken aramalar kesilmesin).
import {adminSb} from './admin';import crypto from 'crypto';
let cache={t:0,v:null};
const esit=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&x.length>0&&crypto.timingSafeEqual(x,y);};
export async function vapiGizli(){
 if(cache.v&&Date.now()-cache.t<30000)return cache.v;
 let g={};try{const {data}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','gizli').maybeSingle();g=data?.deger||{};}catch{}
 const env=process.env.VAPI_SECRET||null,gecis=!!(g.vapiEskiBitis&&Date.now()<new Date(g.vapiEskiBitis).getTime());
 const kabul=[...new Set([g.vapi,gecis?g.vapiEski:null,env].filter(Boolean))];
 cache={t:Date.now(),v:{aktif:g.vapi||env||null,kabul,gecis,kaynak:g.vapi?'sistem':env?'vercel':null,tarih:g.tarih||null,guclu:!!(g.vapi||(env&&env.length>=16))}};return cache.v;}
// İstek başlığı geçerli mi? Hiç şifre ayarlanmamışsa (eski kurulum) izin verir; geçiş süresinde başlıksız isteğe de izin verir.
export async function vapiIzin(hs){const g=await vapiGizli();if(!g.kabul.length)return true;if(!hs)return g.gecis;return g.kabul.some(k=>esit(hs,k));}
export const basliktan=req=>req.headers.get('x-vapi-secret')||(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
export async function vapiGizliUret(){
 const yeni=crypto.randomBytes(32).toString('base64url'),eski=(await vapiGizli()).aktif;
 const {error}=await adminSb.from('sistem_ayarlari').upsert({anahtar:'gizli',deger:{vapi:yeni,vapiEski:eski,vapiEskiBitis:new Date(Date.now()+2*36e5).toISOString(),tarih:new Date().toISOString()}},{onConflict:'anahtar'});
 if(error)throw error;cache={t:0,v:null};return true;}
