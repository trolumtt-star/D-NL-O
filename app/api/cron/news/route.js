import {adminSb} from '@/lib/admin';import {runNews} from '@/lib/news';import {bekleyenleriOku} from '@/lib/ayikla';import {durdur} from '@/lib/vapi';import {odemeleriKontrol} from '@/lib/shopierPat';import {bildir} from '@/lib/bildir';
export const maxDuration=60;export const dynamic='force-dynamic';
export async function GET(req){
 if(!process.env.CRON_SECRET||req.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return Response.json({error:'unauthorized'},{status:401});
 try{await odemeleriKontrol();}catch{}
 const {data:vade}=await adminSb.rpc('asim_vadesi_gecenler');const base=new URL(req.url).origin;
 for(const id of vade||[]){await durdur(id,base);try{await bildir(id,'⛔ Aşım ücreti son ödeme tarihine kadar ödenmediği için asistanınız durduruldu. Panelden ödeme yapınca hemen açılır.');}catch{}}
 const {data}=await adminSb.from('businesses').select('*').eq('plan','all').eq('status','active').not('news_keywords','is',null).order('news_last_scan',{ascending:true,nullsFirst:true}).limit(8);
 const due=(data||[]).filter(b=>!b.news_last_scan||Date.now()-new Date(b.news_last_scan).getTime()>20*36e5);
 const [res,oku]=await Promise.all([Promise.all(due.map(b=>runNews(b))),bekleyenleriOku({limit:15,butce:45000})]);return Response.json({ok:true,okunamayanlar:oku,taranan:due.length,eklenen:res.reduce((a,r)=>a+(r.count||0),0),hatalar:res.filter(r=>r.error).map(r=>r.error)});}
