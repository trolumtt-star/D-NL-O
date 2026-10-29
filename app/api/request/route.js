import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';
const T=(v,n)=>String(v??'').trim().slice(0,n),bad=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function POST(req){try{const b=await req.json();
 if(b.website)return NextResponse.json({ok:true});
 const name=T(b.contact_name,80),biz=T(b.business_name,100),phone=String(b.phone||'').replace(/\D/g,'');
 if(name.length<2||biz.length<2||phone.length<10||phone.length>13)return bad('Lütfen ad, işletme adı ve geçerli bir telefon numarası girin.');
 const h=n=>new Date(Date.now()-n).toISOString();
 const {count:c1}=await adminSb.from('business_requests').select('id',{count:'exact',head:true}).eq('phone',phone).gte('created_at',h(864e5));
 if(c1>=3)return bad('Bu numaradan çok sayıda talep geldi, lütfen daha sonra tekrar deneyin.',429);
 const {count:c2}=await adminSb.from('business_requests').select('id',{count:'exact',head:true}).gte('created_at',h(36e5));
 if(c2>=40)return bad('Şu an çok yoğunuz, lütfen biraz sonra tekrar deneyin.',429);
 const pk=['s','m','l','unsure'].includes(b.package)?b.package:'unsure';
 const {error}=await adminSb.from('business_requests').insert({contact_name:name,phone,business_name:biz,business_type:T(b.business_type,40)||null,package:pk,own_assistant:!!b.own_assistant,email:T(b.email,120)||null,note:T(b.note,500)||null});
 if(error)throw error;return NextResponse.json({ok:true});}catch(e){return bad('Talep gönderilemedi, lütfen tekrar deneyin.',500);}}
