import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';import {ac} from '@/lib/vapi';
export const dynamic='force-dynamic';
// İşletme sahibinin kendi ayarları: kota bitince yönlendirme numarası, aşım tercihi.
const ok=d=>NextResponse.json(d),hata=(e,s=400)=>NextResponse.json({error:e},{status:s});
export async function GET(req){try{const b=await requireOwner(req);return ok({yonlendirme:b.settings?.kota_yonlendirme||'',asim:{acik:!!b.settings?.asim?.acik,limit_dk:b.settings?.asim?.limit_dk||100,tavan:Math.max(30,Math.min(3000,b.quota_minutes_total||100))}});}catch(e){return hata(e.message,401);}}
export async function POST(req){try{const b=await requireOwner(req);const x=await req.json(),s={...(b.settings||{})};
 if(x.islem==='yonlendirme'){const d=String(x.numara||'').replace(/\D/g,'');if(d&&(d.length<10||d.length>13))return hata('Geçerli bir telefon numarası girin.');
  if(d&&b.phone_number&&String(b.phone_number).replace(/\D/g,'').slice(-10)===d.slice(-10))return hata('Bu, aramaları asistana yönlendirdiğiniz numaranın aynısı. Döngü olmaması için başka bir numara girin (ör. ikinci cep telefonu).');
  s.kota_yonlendirme=d||null;}
 else if(x.islem==='asim'){const lim=Math.round(+x.limit_dk||0),tavan=Math.max(30,Math.min(3000,b.quota_minutes_total||100));if(x.acik&&!(lim>=10&&lim<=tavan))return hata(`Aşım limiti en fazla paketinizdeki dakika kadar (${tavan} dk) olabilir.`);
  s.asim={acik:!!x.acik,limit_dk:lim||100};
  // kota yüzünden durmuşsa ve aşım açılınca yer açıldıysa hemen geri aç
  const limS=((b.quota_minutes_total||0)+(b.ek_dakika||0))*60,u=b.quota_seconds_used||0,vade=s.asim_son&&new Date(s.asim_son)<new Date();
  const {error:e2}=await adminSb.from('businesses').update({settings:s}).eq('id',b.id);if(e2)throw e2;
  if(x.acik&&b.status==='suspended'&&u>=limS&&u<limS+lim*60&&!vade){await adminSb.from('businesses').update({status:'active'}).eq('id',b.id);await ac(b.id);return ok({ok:true,acildi:true});}
  return ok({ok:true});}
 else return hata('Bilinmeyen işlem');
 const {error}=await adminSb.from('businesses').update({settings:s}).eq('id',b.id);if(error)throw error;return ok({ok:true});}catch(e){return hata(e.message);}}
