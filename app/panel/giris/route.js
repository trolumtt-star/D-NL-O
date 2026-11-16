// Panel uygulamasının kendi giriş sayfası (/login ile aynı sayfa, uygulamanın kapsamı içinde).
// Uygulama olarak açıldığında panel dışına giden bağlantılar (ana sayfa, yasal metinler) uygulamanın içinde değil tarayıcıda açılır.
import html from '@/lib/loginHtml';import {DESTEK} from '@/lib/destek';
export const dynamic='force-dynamic';
const EK=`<link rel="manifest" href="/manifest.webmanifest"><script>(function(){var u=matchMedia('(display-mode: standalone)').matches||navigator.standalone;if(!u)return;document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'';if(h[0]==='/'&&h.indexOf('/panel')!==0){e.preventDefault();window.open(h,'_blank','noopener');}},true);})();</script>`;
export function GET(){const h=html.replace('{{DESTEK}}',DESTEK).replace('{{SUPA_URL}}',process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace('{{SUPA_KEY}}',process.env.NEXT_PUBLIC_SUPABASE_KEY||'').replace('</head>',EK+'</head>');
 return new Response(h,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});}
