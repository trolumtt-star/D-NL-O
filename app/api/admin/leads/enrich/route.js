import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {enrichLead} from '@/lib/leads';
export const maxDuration=60;
export async function POST(req){try{await requireAdmin(req);const {ids}=await req.json();if(!Array.isArray(ids)||!ids.length||ids.length>4)throw new Error('1-4 işletme seçin.');
 const {data:ls}=await adminSb.from('leads').select('*').in('id',ids);const out=[];
 for(const l of ls||[]){try{const u=await enrichLead(l);await adminSb.from('leads').update(u).eq('id',l.id);out.push({id:l.id,ok:true});}catch(e){out.push({id:l.id,ok:false,error:e.message});if(/GOOGLE_PLACES_KEY|Places 40[13]/.test(e.message))throw e;}}
 return NextResponse.json({results:out});}catch(e){return NextResponse.json({error:e.message},{status:400});}}
