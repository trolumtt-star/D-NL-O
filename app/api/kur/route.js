import {usdKur} from '@/lib/kur';import {kdvOrani} from '@/lib/sistem';import {durum} from '@/lib/entegrasyon';
export const dynamic='force-dynamic';
// Fiyat kartları için: kur, KDV ve hangi dış bağlantıların açık olduğu (açık değilse özellik "Yakında" görünür)
export async function GET(){const [k,kdv]=await Promise.all([usdKur(),kdvOrani()]);const d=durum();
 return Response.json({...k,kdv,baglanti:{netgsm:d.netgsm,eposta:d.eposta,google:d.google,elevenlabs:d.elevenlabs}},{headers:{'cache-control':'public, s-maxage=60, stale-while-revalidate=600'}});}
