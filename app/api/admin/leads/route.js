import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {searchOverpass} from '@/lib/leads';
export const maxDuration=60;
export async function POST(req){try{await requireAdmin(req);const {city,cat,limit}=await req.json();
 const rows=await searchOverpass(city,cat,+limit||100);
 let added=0;if(rows.length){const {data}=await adminSb.from('leads').upsert(rows,{onConflict:'osm_id',ignoreDuplicates:true}).select('id');added=data?.length||0;}
 const {data:items}=await adminSb.from('leads').select('*').eq('city',city).eq('category',cat).order('score',{ascending:false,nullsFirst:false}).limit(300);
 return NextResponse.json({added,items:items||[],found:rows.length});}catch(e){return NextResponse.json({error:e.message},{status:400});}}
