// Panel → Hattını bağla: yönlendirme kodları ve otomatik test.
import {NextResponse} from 'next/server';import {requireOwner} from '@/lib/owner';import {testBaslat,testDurum,KODLAR,sifirli} from '@/lib/yonlendirme';import {numaraAyar} from '@/lib/numara';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function GET(req){try{const b=await requireOwner(req),u=new URL(req.url),t=u.searchParams.get('test');
 if(t)return NextResponse.json(await testDurum(b,t));
 const s=b.settings||{},hat=sifirli(s.numara?.hat||''),{testHat}=await numaraAyar();
 return NextResponse.json({hat,kodlar:hat?KODLAR(hat):null,kendi:sifirli(s.yonlendirme?.tel||s.satin_al?.numara?.mevcut||b.phone_number||''),ok:s.yonlendirme?.ok||null,
  kirala:s.numara?.tip==='0850'&&s.satin_al?.numara?.tercih==='kirala',testHazir:!!testHat?.id,bagli:!!b.vapi_phone_id});}catch(e){return hata(e.message,401);}}
export async function POST(req){let b;try{b=await requireOwner(req);}catch(e){return hata(e.message,401);}
 try{const x=await req.json();return NextResponse.json({ok:true,...await testBaslat(b,x.tel)});}catch(e){return hata(e.message);}}
