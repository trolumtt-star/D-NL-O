// Admin: Shopier'e "sipariş oluştu" bildirimini (webhook) kaydeder. Zaten kayıtlıysa tekrar eklemez.
import {NextResponse} from 'next/server';import {requireAdmin} from '@/lib/admin';import {sapi,patVar} from '@/lib/shopierPat';
export const dynamic='force-dynamic';
export async function POST(req){try{await requireAdmin(req);if(!patVar())throw new Error('Vercel\'de SHOPIER_PAT yok.');
 const url=new URL(req.url).origin+'/api/odeme/shopier-webhook';
 const l=await sapi('GET','/webhooks');const var_=(Array.isArray(l.d)?l.d:[]).find(w=>w.url===url&&w.event==='order.created');
 if(var_)return NextResponse.json({ok:true,mesaj:'Zaten bağlı.',webhook:{id:var_.id,event:var_.event,url:var_.url}});
 const c=await sapi('POST','/webhooks',{event:'order.created',url});
 if(!c.ok)throw new Error('Shopier webhook kaydı başarısız: '+c.durum+' '+(c.d?.message||c.t.slice(0,200)));
 return NextResponse.json({ok:true,mesaj:'Bağlandı. Ödemeler artık otomatik eklenecek.',webhook:{id:c.d?.id,event:c.d?.event,url:c.d?.url}});}
 catch(e){return NextResponse.json({error:e.message},{status:e.message==='Yetkisiz'?401:400});}}
