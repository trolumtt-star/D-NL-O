import {NextResponse} from 'next/server';import {requireOwner} from '@/lib/owner';import {runNews} from '@/lib/news';
export const maxDuration=60;
export async function POST(req){try{const b=await requireOwner(req);if(b.plan!=='all')throw new Error('Bu özellik All in one pakete dahildir.');
 if(b.news_last_scan&&Date.now()-new Date(b.news_last_scan).getTime()<36e5)throw new Error('Haberler en fazla saatte bir taranabilir, biraz sonra tekrar deneyin.');
 const r=await runNews(b);if(r.error)throw new Error(r.error);return NextResponse.json({count:r.count});}catch(e){return NextResponse.json({error:e.message},{status:400});}}
