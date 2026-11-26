// Admin → Yapılacaklar: sistemin çözemediği işler (lib/adminIs.js)
import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function GET(req){try{await requireAdmin(req);}catch(e){return hata(e.message,401);}
 const {data,error}=await adminSb.from('admin_isler').select('id,tur,baslik,detay,business_id,created_at').is('cozuldu_at',null).order('created_at',{ascending:false}).limit(100);
 if(error)return hata(error.message);return NextResponse.json({isler:data||[]});}
export async function POST(req){try{await requireAdmin(req);}catch(e){return hata(e.message,401);}
 const x=await req.json().catch(()=>({}));
 if(x.islem==='coz'&&/^[0-9a-f-]{36}$/.test(String(x.id||''))){await adminSb.from('admin_isler').update({cozuldu_at:new Date().toISOString()}).eq('id',x.id);return NextResponse.json({ok:true});}
 return hata('Geçersiz işlem');}
