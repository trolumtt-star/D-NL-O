import {sayfaHtml} from '@/lib/yasal';
export const dynamic='force-dynamic';
export async function GET(_req,{params}){const h=sayfaHtml(params.sayfa);if(!h)return new Response('Sayfa bulunamadı',{status:404});
 return new Response(h,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=600'}});}
