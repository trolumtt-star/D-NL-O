// ZAMANLANMIŞ GÖREV YETKİSİ: CRON_SECRET varsa Vercel'in gönderdiği "Bearer <CRON_SECRET>" şart.
// Yoksa (kurulum tamamlanmamışsa) görev yine çalışır ama sadece Vercel cron'dan geliyormuş gibi görünen isteklerle ve
// en fazla belirlenen sıklıkta: dışarıdan biri tekrar tekrar tetikleyip arama/dakika harcatamaz.
import {adminSb} from './admin';import crypto from 'crypto';
const esit=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);};
export async function cronYetki(req,ad,enAzDk){
 const sir=process.env.CRON_SECRET;if(sir)return esit(req.headers.get('authorization')||'','Bearer '+sir);
 if(!/vercel-cron/i.test(req.headers.get('user-agent')||''))return false;
 const {data}=await adminSb.from('webhook_events').select('created_at').eq('type','cron_calisti').eq('payload->>ad',ad).order('created_at',{ascending:false}).limit(1);
 if(data?.[0]&&Date.now()-new Date(data[0].created_at)<enAzDk*6e4)return false;
 await adminSb.from('webhook_events').insert({type:'cron_calisti',payload:{ad}});return true;}
