import html from '@/lib/landing';import {DESTEK} from '@/lib/destek';import {SITE} from '@/lib/site';import {TEMA_ETIKET} from '@/lib/tema';
const sayfa=html.replaceAll('{{DESTEK}}',DESTEK).replaceAll('{{SITE}}',SITE).replace('</head>',TEMA_ETIKET+'</head>');
export function GET(){return new Response(sayfa,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300'}});}
