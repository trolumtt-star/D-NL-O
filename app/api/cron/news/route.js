import {adminSb} from '@/lib/admin';import {runNews} from '@/lib/news';import {bekleyenleriOku} from '@/lib/ayikla';
export const maxDuration=60;export const dynamic='force-dynamic';
export async function GET(req){
 if(!process.env.CRON_SECRET||req.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return Response.json({error:'unauthorized'},{status:401});
 const {data}=await adminSb.from('businesses').select('*').eq('plan','all').eq('status','active').not('news_keywords','is',null).order('news_last_scan',{ascending:true,nullsFirst:true}).limit(8);
 const due=(data||[]).filter(b=>!b.news_last_scan||Date.now()-new Date(b.news_last_scan).getTime()>20*36e5);
 const [res,oku]=await Promise.all([Promise.all(due.map(b=>runNews(b))),bekleyenleriOku({limit:15,butce:45000})]);return Response.json({ok:true,okunamayanlar:oku,taranan:due.length,eklenen:res.reduce((a,r)=>a+(r.count||0),0),hatalar:res.filter(r=>r.error).map(r=>r.error)});}
