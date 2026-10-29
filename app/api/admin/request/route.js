import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';
const err=e=>NextResponse.json({error:e.message},{status:400});
export async function PATCH(req){try{await requireAdmin(req);const {id,action}=await req.json(),now=Date.now(),u={};
 if(action==='accept'){u.status='accepted';u.accepted_at=new Date(now).toISOString();u.setup_deadline=new Date(now+3*864e5).toISOString();}
 else if(action==='reject')u.status='rejected';else if(action==='done')u.status='done';else if(action==='reopen'){u.status='new';u.setup_deadline=null;}
 else if(action==='extend'){const {data}=await adminSb.from('business_requests').select('setup_deadline').eq('id',id).single();u.setup_deadline=new Date(Math.max(now,new Date(data?.setup_deadline||now).getTime())+864e5).toISOString();}
 else throw new Error('Geçersiz işlem');
 const {error}=await adminSb.from('business_requests').update(u).eq('id',id);if(error)throw error;return NextResponse.json({ok:true});}catch(e){return err(e);}}
export async function DELETE(req){try{await requireAdmin(req);const {id}=await req.json();const {error}=await adminSb.from('business_requests').delete().eq('id',id);if(error)throw error;return NextResponse.json({ok:true});}catch(e){return err(e);}}
