import html from '@/lib/landing';
export function GET(){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300'}});}
