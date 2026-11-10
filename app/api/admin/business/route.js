import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {durdur,ac} from '@/lib/vapi';
const err=e=>NextResponse.json({error:e.message},{status:400});
const mail=u=>u.includes('@')?u:u.toLowerCase().trim()+'@isletme.panel';
export async function POST(req){try{await requireAdmin(req);const b=await req.json(),login=mail(b.username);
 const {data:u,error:e1}=await adminSb.auth.admin.createUser({email:login,password:b.password,email_confirm:true});if(e1)throw e1;
 const {data,error}=await adminSb.from('businesses').insert({name:b.name,username:b.username.toLowerCase().trim(),business_type:b.business_type||'restaurant',plan:b.plan==='all'?'all':'call',vertical:b.vertical||'restaurant',email:b.email||login,phone_number:b.phone_number||null,owner_id:u.user.id,quota_minutes_total:+b.quota_minutes_total||0,table_count:+b.table_count||0,vapi_assistant_id:b.vapi_assistant_id||null,vapi_phone_number:b.vapi_phone_number||null}).select('id').single();
 if(error){await adminSb.auth.admin.deleteUser(u.user.id);throw error;}
 if(b.vertical&&b.vertical!=='restaurant'){const {data:v}=await adminSb.from('verticals').select('config').eq('id',b.vertical).maybeSingle();const sv=(v?.config?.services||[]).map(x=>({business_id:data.id,name:x.n,duration_minutes:x.d||30}));if(sv.length)await adminSb.from('services').insert(sv);}
 return NextResponse.json({id:data.id});}catch(e){return err(e);}}
export async function PATCH(req){try{await requireAdmin(req);const {id,reset,password,...p}=await req.json();
 const ok=['name','status','quota_minutes_total','vapi_assistant_id','vapi_phone_number','vapi_phone_id','phone_number','table_count','plan','vertical','email','business_type'],d={};
 ok.forEach(k=>{if(k in p)d[k]=p[k]===''?null:p[k];});
 if(reset){const {data:c}=await adminSb.from('businesses').select('quota_minutes_total,ek_dakika,quota_seconds_used').eq('id',id).single();
  // önce paket dakikası harcanır; ek dakikanın kullanılmayan kısmı bir sonraki aya devreder
  if(c){const lim=(c.quota_minutes_total+(c.ek_dakika||0))*60,u=c.quota_seconds_used||0;d.ek_dakika=Math.max(0,Math.min(c.ek_dakika||0,Math.floor((lim-u)/60)));d._asim=Math.max(0,u-lim);}}
 if(reset)Object.assign(d,{quota_minutes_used:0,quota_seconds_used:0,quota_reset_at:new Date(Date.now()+30*864e5).toISOString(),status:'active'});
 // ödenmemiş aşım dakikası yeni dönemin kullanımına devreder (bir sonraki paketten düşer)
 if(reset&&d._asim){d.quota_seconds_used=d._asim;d.quota_minutes_used=Math.floor(d._asim/60);}delete d._asim;
 if(password){const {data}=await adminSb.from('businesses').select('owner_id').eq('id',id).single();const {error}=await adminSb.auth.admin.updateUserById(data.owner_id,{password});if(error)throw error;}
 // +50/+100 gibi kota artışları, işletme kota yüzünden durduysa ve artık yer açıldıysa otomatik tekrar aktifleştirsin
 if('quota_minutes_total' in d&&!('status' in d)){
  const {data:cur}=await adminSb.from('businesses').select('status,quota_seconds_used,ek_dakika').eq('id',id).single();
  if(cur?.status==='suspended'&&(+d.quota_minutes_total+(cur.ek_dakika||0))*60>(cur.quota_seconds_used||0))d.status='active';
 }
 if(d.status==='active')d.vapi_paused=false;
 const {error}=await adminSb.from('businesses').update({...d,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;
 // Durum admin tarafından değiştiyse (Durdur/Aç, kota reset, +dakika sonrası otomatik aktifleşme) Vapi numarasını da senkronla
 if('status' in d){if(d.status==='suspended')await durdur(id,new URL(req.url).origin);else await ac(id);}
 return NextResponse.json({ok:true});}catch(e){return err(e);}}
export async function DELETE(req){try{await requireAdmin(req);const {id}=await req.json();const {data}=await adminSb.from('businesses').select('owner_id').eq('id',id).single();
 for(const t of ['reservations','calls','webhook_events'])await adminSb.from(t).delete().eq('business_id',id);
 const {error:de}=await adminSb.from('businesses').delete().eq('id',id);if(de)throw de;if(data?.owner_id)await adminSb.auth.admin.deleteUser(data.owner_id);return NextResponse.json({ok:true});}catch(e){return err(e);}}
