import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {searchOverpass} from '@/lib/leads';import {searchYandex} from '@/lib/yandex';
export const maxDuration=60;
export async function POST(req){try{await requireAdmin(req);const {city,cat,limit,source}=await req.json();
 // Varsayılan kaynak OpenStreetMap (ücretsiz). Yandex sadece açıkça seçilirse ve anahtar varsa; hata verirse OpenStreetMap'e düşülür.
 let rows,not='';
 if(source==='yandex'&&process.env.YANDEX_PLACES_KEY){try{rows=await searchYandex(city,cat,+limit||100);}catch(e){not='Yandex kullanılamadı ('+String(e.message).slice(0,80)+'), OpenStreetMap ile arandı. ';rows=await searchOverpass(city,cat,+limit||100);}}
 else rows=await searchOverpass(city,cat,+limit||100);
 let added=0;if(rows.length){const onConflict=rows[0].yandex_id?'yandex_id':'osm_id';const {data}=await adminSb.from('leads').upsert(rows,{onConflict,ignoreDuplicates:true}).select('id');added=data?.length||0;}
 const {data:items}=await adminSb.from('leads').select('*').eq('city',city).eq('category',cat).order('score',{ascending:false,nullsFirst:false}).limit(300);
 return NextResponse.json({added,items:items||[],found:rows.length,source:rows[0]?.source||'osm',not});}catch(e){return NextResponse.json({error:e.message},{status:400});}}
