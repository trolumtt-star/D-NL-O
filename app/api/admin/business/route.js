import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';
const err=e=>NextResponse.json({error:e.message},{status:400});
const mail=u=>u.includes('@')?u:u.toLowerCase().trim()+'@isletme.panel';
export async function POST(req){try{await requireAdmin(req);const b=await req.json(),login=mail(b.username);
 const {data:u,error:e1}=await adminSb.auth.admin.createUser({email:login,password:b.password,email_confirm:true});if(e1)throw e1;
 const {data,error}=await adminSb.from('businesses').insert({name:b.name,username:b.username.toLowerCase().trim(),business_type:b.business_type||'restaurant',email:b.email||login,phone_number:b.phone_number||null,owner_id:u.user.id,quota_minutes_total:+b.quota_minutes_total||0,table_count:+b.table_count||0,vapi_assistant_id:b.vapi_assistant_id||null,vapi_phone_number:b.vapi_phone_number||null}).select('id').single();
 if(error){await adminSb.auth.admin.deleteUser(u.user.id);throw error;}
 return NextResponse.json({id:data.id});}catch(e){return err(e);}}
export async function PATCH(req){try{await requireAdmin(req);const {id,reset,password,...p}=await req.json();
 const ok=['name','status','quota_minutes_total','vapi_assistant_id','vapi_phone_number','phone_number','table_count'],d={};
 ok.forEach(k=>{if(k in p)d[k]=p[k]===''?null:p[k];});
 if(reset)Object.assign(d,{quota_minutes_used:0,quota_seconds_used:0,quota_reset_at:new Date(Date.now()+30*864e5).toISOString(),status:'active'});
 if(password){const {data}=await adminSb.from('businesses').select('owner_id').eq('id',id).single();const {error}=await adminSb.auth.admin.updateUserById(data.owner_id,{password});if(error)throw error;}
 const {error}=await adminSb.from('businesses').update({...d,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;return NextResponse.json({ok:true});}catch(e){return err(e);}}
export async function DELETE(req){try{await requireAdmin(req);const {id}=await req.json();const {data}=await adminSb.from('businesses').select('owner_id').eq('id',id).single();
 for(const t of ['reservations','calls','webhook_events'])await adminSb.from(t).delete().eq('business_id',id);
 await adminSb.from('businesses').delete().eq('id',id);if(data)await adminSb.auth.admin.deleteUser(data.owner_id);return NextResponse.json({ok:true});}catch(e){return err(e);}}
