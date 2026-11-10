import html from '@/lib/landing';import {DESTEK} from '@/lib/destek';
const sayfa=html.replaceAll('{{DESTEK}}',DESTEK);
export function GET(){return new Response(sayfa,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300'}});}
