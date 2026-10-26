import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';
const err=e=>NextResponse.json({error:e.message},{status:400});
export async function POST(req){try{await requireAdmin(req);const {business_id,kind,label}=await req.json();if(!['events','tools'].includes(kind))throw new Error('Geçersiz tür');
 const {data,error}=await adminSb.from('webhook_endpoints').insert({business_id,kind,label:label||null}).select('id').single();if(error)throw error;return NextResponse.json({id:data.id});}catch(e){return err(e);}}
export async function DELETE(req){try{await requireAdmin(req);const {id}=await req.json();const {error}=await adminSb.from('webhook_endpoints').delete().eq('id',id);if(error)throw error;return NextResponse.json({ok:true});}catch(e){return err(e);}}
