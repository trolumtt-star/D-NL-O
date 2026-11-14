// Admin → Kendi kaydolanlar: varsayılan deneme hakkı, işletme bazında deneme dakikası/günü, "kurulum tamamlandı" işareti.
import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {denemeVarsayilan,denemeVarsayilanKaydet,denemeDegistir} from '@/lib/deneme';import {bildir} from '@/lib/bildir';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function GET(req){try{await requireAdmin(req);return NextResponse.json({varsayilan:await denemeVarsayilan()});}catch(e){return hata(e.message,401);}}
export async function POST(req){try{await requireAdmin(req);}catch(e){return hata(e.message,401);}
 try{const x=await req.json(),o=new URL(req.url).origin;
  if(x.islem==='varsayilan')return NextResponse.json({ok:true,varsayilan:await denemeVarsayilanKaydet(x.gun,x.dk)});
  if(x.islem==='degistir')return NextResponse.json({ok:true,...await denemeDegistir(String(x.id||''),{dk:x.dk,gun:x.gun},o)});
  if(x.islem==='kurulum'){const {data:b}=await adminSb.from('businesses').select('settings').eq('id',String(x.id||'')).single();if(!b)return hata('İşletme yok');
   const s={...b.settings};if(x.tamam){s.kurulum_onay=new Date().toISOString();}else delete s.kurulum_onay;
   await adminSb.from('businesses').update({settings:s}).eq('id',x.id);
   if(x.tamam)await bildir(x.id,'✅ Hesabınızın kurulumu tamamlandı! Asistanınız hazır. Panelden "Asistanını dene" ile konuşabilirsiniz.').catch(()=>{});
   return NextResponse.json({ok:true});}
  return hata('Geçersiz işlem');}catch(e){return hata(e.message);}}
