// Admin → Güvenlik: son admin girişleri (konum/cihaz/IP) ve "bütün oturumları kapat"
import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {adminGirisListe,istekBilgi} from '@/lib/adminGiris';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function GET(req){try{await requireAdmin(req);}catch(e){return hata(e.message,401);}
 return NextResponse.json({liste:await adminGirisListe(),simdi:istekBilgi(req)});}
export async function POST(req){try{await requireAdmin(req);}catch(e){return hata(e.message,401);}
 const x=await req.json().catch(()=>({}));
 if(x.islem==='cikis_hepsi'){const t=(req.headers.get('authorization')||'').replace('Bearer ','');
  const {error}=await adminSb.auth.admin.signOut(t,'global');if(error)return hata(error.message);
  await adminSb.from('sistem_ayarlari').upsert({anahtar:'admin_giris',deger:{liste:[]}},{onConflict:'anahtar'});
  return NextResponse.json({ok:true});}
 return hata('Geçersiz işlem');}
