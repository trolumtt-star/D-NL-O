// İşletme sahibinin asistan ayarları: tatil/kapalı modu, kara liste, kampanya duyurusu, bilgi bankası.
// Hepsi businesses.settings içinde tutulur; /api/vapi/assist her aramada okur ve asistana verir.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';import {paketOf,enAzPaket} from '@/lib/paket';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
// Asistanın şablon motoru {{ }} ve {% %} kullanır; işletmenin yazdığı metin şablon gibi çalışmasın
const temiz=(s,n)=>String(s||'').replace(/[{}%]/g,'').replace(/\r/g,'').trim().slice(0,n);
const no10=s=>{const d=String(s||'').replace(/\D/g,'');return d.length>=10?d.slice(-10):null;};
const ozet=b=>{const s=b.settings||{},pk=paketOf(b);
 return {tatil:s.tatil||{aktif:false,mesaj:''},kara_liste:s.kara_liste||[],kampanya:s.kampanya||{aktif:false,metin:''},bilgi:s.bilgi||'',
  paket:{ad:pk.ad,kampanya:pk.kampanya,bilgi:pk.bilgi,defter:pk.defter,haftalik:pk.haftalik,kalite:pk.kalite},enAz:{kampanya:enAzPaket('kampanya'),bilgi:enAzPaket('bilgi')}};};
export async function GET(req){try{const b=await requireOwner(req);return NextResponse.json(ozet(b));}catch(e){return hata(e.message,401);}}
export async function POST(req){try{const b=await requireOwner(req);const x=await req.json(),pk=paketOf(b),s={...(b.settings||{})};
 if(x.islem==='tatil'){s.tatil={aktif:!!x.aktif,mesaj:temiz(x.mesaj,200)};}
 else if(x.islem==='kara_liste'){const l=[...new Set((Array.isArray(x.numaralar)?x.numaralar:[]).map(no10).filter(Boolean))];if(l.length>200)return hata('En fazla 200 numara engellenebilir.');s.kara_liste=l;}
 else if(x.islem==='kampanya'){if(!pk.kampanya)return hata(`Kampanya duyurusu ${enAzPaket('kampanya')} paketten itibaren açılır.`);s.kampanya={aktif:!!x.aktif,metin:temiz(x.metin,300)};}
 else if(x.islem==='bilgi'){if(!pk.bilgi)return hata(`Bilgi bankası ${enAzPaket('bilgi')} paketten itibaren açılır.`);s.bilgi=temiz(x.metin,4000);}
 else return hata('Geçersiz işlem');
 const {error}=await adminSb.from('businesses').update({settings:s}).eq('id',b.id);if(error)return hata(error.message);
 return NextResponse.json({ok:true,...ozet({...b,settings:s})});}catch(e){return hata(e.message,e.message==='Giriş gerekli'?401:400);}}
