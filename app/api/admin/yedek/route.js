// Admin → Yedekler: listele, şimdi yedek al, indir (2 dakikalık imzalı link)
import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {yedekAl,yedekListe,yedekLink} from '@/lib/yedek';
export const dynamic='force-dynamic';export const maxDuration=60;
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function GET(req){try{await requireAdmin(req);}catch(e){return hata(e.message,401);}
 try{const {data}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','son_yedek').maybeSingle();return NextResponse.json({son:data?.deger||null,liste:await yedekListe()});}catch(e){return hata(e.message);}}
export async function POST(req){try{await requireAdmin(req);}catch(e){return hata(e.message,401);}
 const x=await req.json().catch(()=>({}));
 try{if(x.islem==='al')return NextResponse.json({ok:true,...await yedekAl()});
  if(x.islem==='indir')return NextResponse.json({url:await yedekLink(x.ad)});
  return hata('Geçersiz işlem');}catch(e){return hata(e.message);}}
