import {usdKur} from '@/lib/kur';
export const revalidate=3600;
export async function GET(){return Response.json(await usdKur(),{headers:{'cache-control':'public, s-maxage=3600, stale-while-revalidate=86400'}});}
