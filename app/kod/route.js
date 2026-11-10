import html from '@/lib/kodHtml';
export const dynamic='force-static';
export function GET(){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300','referrer-policy':'no-referrer','x-robots-tag':'noindex'}});}
