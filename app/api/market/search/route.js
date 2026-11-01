import {NextResponse} from 'next/server';import {requireOwner} from '@/lib/owner';import {adminSb} from '@/lib/admin';import {marketSearch} from '@/lib/market';
export const maxDuration=60;
export async function POST(req){try{const b=await requireOwner(req);if(b.plan!=='all')throw new Error('Bu özellik All in one pakete dahildir.');
 const {q}=await req.json();const query=String(q||'').trim().toLowerCase().slice(0,60);if(query.length<2)throw new Error('En az 2 harf yazın.');
 const {count}=await adminSb.from('market_search_log').select('id',{count:'exact',head:true}).eq('business_id',b.id).gte('created_at',new Date(Date.now()-864e5).toISOString());
 if(count>=20)throw new Error('Günlük arama sınırına ulaştınız (20). Yarın tekrar deneyin.');
 await adminSb.from('market_search_log').insert({business_id:b.id,q:query});
 const {data:c}=await adminSb.from('market_cache').select('results,fetched_at').eq('q',query).maybeSingle();
 if(c&&Date.now()-new Date(c.fetched_at).getTime()<864e5)return NextResponse.json({items:c.results});
 const r=await marketSearch(query);if(r.error){if(r.blocked)await adminSb.from('webhook_events').insert({type:'market_bot',business_id:b.id,payload:{error:'Arama engellendi: '+r.error.slice(0,200)}});throw new Error(r.error);}
 await adminSb.from('market_cache').upsert({q:query,results:r.items,fetched_at:new Date().toISOString()});return NextResponse.json({items:r.items});}
 catch(e){return NextResponse.json({error:e.message},{status:400});}}
