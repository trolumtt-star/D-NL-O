// Admin → Numaralar: 0850 kira ücreti ve otomatik bağlanacak numara havuzu (Vapi'ye bağlı numaralar).
import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {numaraAyar,numaraAyarKaydet} from '@/lib/numara';import {vapiIstek} from '@/lib/vapi';import {otoKurulum} from '@/lib/otoKurulum';
export const dynamic='force-dynamic';export const maxDuration=60;
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function GET(req){try{await requireAdmin(req);}catch(e){return hata(e.message,401);}
 const [a,v,{data:bz}]=await Promise.all([numaraAyar(),vapiIstek('/phone-number'),adminSb.from('businesses').select('id,name,vapi_phone_id').not('vapi_phone_id','is',null)]);
 const kim=Object.fromEntries((bz||[]).map(x=>[x.vapi_phone_id,x.name]));
 const vn=(v.ok?(Array.isArray(v.d)?v.d:v.d?.results||[]):[]).map(x=>({id:x.id,numara:x.number||x.sipUri||x.name||'(numara yok)',ad:x.name||'',kullanan:kim[x.id]||null}));
 return NextResponse.json({...a,vapi:vn,vapiHata:v.ok?null:v.error});}
export async function POST(req){try{await requireAdmin(req);}catch(e){return hata(e.message,401);}
 try{const x=await req.json();
  if(x.islem==='kaydet')return NextResponse.json({ok:true,...await numaraAyarKaydet({ucret:x.ucret,havuz:x.havuz})});
  if(x.islem==='oto')return NextResponse.json({ok:true,...await otoKurulum(String(x.id||''))});
  return hata('Geçersiz işlem');}catch(e){return hata(e.message);}}
