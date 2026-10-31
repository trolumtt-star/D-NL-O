import {adminSb} from '@/lib/admin';import {runNews} from '@/lib/news';
export const maxDuration=60;export const dynamic='force-dynamic';
export async function GET(req){
 if(!process.env.CRON_SECRET||req.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return Response.json({error:'unauthorized'},{status:401});
 const {data}=await adminSb.from('businesses').select('*').eq('plan','all').eq('status','active').not('news_keywords','is',null).order('news_last_scan',{ascending:true,nullsFirst:true}).limit(8);
 const due=(data||[]).filter(b=>!b.news_last_scan||Date.now()-new Date(b.news_last_scan).getTime()>20*36e5);
 const res=await Promise.all(due.map(b=>runNews(b)));return Response.json({ok:true,taranan:due.length,eklenen:res.reduce((a,r)=>a+(r.count||0),0),hatalar:res.filter(r=>r.error).map(r=>r.error)});}
