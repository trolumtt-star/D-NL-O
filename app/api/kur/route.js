import {usdKur} from '@/lib/kur';import {kdvOrani} from '@/lib/sistem';
export const dynamic='force-dynamic';
export async function GET(){const [k,kdv]=await Promise.all([usdKur(),kdvOrani()]);return Response.json({...k,kdv},{headers:{'cache-control':'public, s-maxage=60, stale-while-revalidate=600'}});}
