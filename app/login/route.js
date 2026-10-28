import html from '@/lib/loginHtml';
export const dynamic='force-dynamic';
export function GET(){const h=html.replace('{{ADMIN}}',process.env.NEXT_PUBLIC_ADMIN_EMAIL||'').replace('{{SUPA_URL}}',process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace('{{SUPA_KEY}}',process.env.NEXT_PUBLIC_SUPABASE_KEY||'');
 return new Response(h,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});}
