/** @type {import('next').NextConfig} */
const sec=[
 {key:'X-Frame-Options',value:'DENY'},
 {key:'Content-Security-Policy',value:"frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://www.shopier.com; object-src 'none'"},
 {key:'X-Content-Type-Options',value:'nosniff'},
 {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
 {key:'Permissions-Policy',value:'camera=(), microphone=(self), geolocation=(self), payment=(), usb=()'},
 {key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains; preload'},
 {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
 {key:'X-DNS-Prefetch-Control',value:'off'}
];
module.exports={poweredByHeader:false,productionBrowserSourceMaps:false,reactStrictMode:true,
 async headers(){const gizli=[{key:'X-Robots-Tag',value:'noindex, nofollow'}];// /demo yalnızca kendi sitemizdeki "Asistanla konuş" penceresine gömülebilir (başka siteler gömemez)
 const demo=[{key:'X-Frame-Options',value:'SAMEORIGIN'},{key:'Content-Security-Policy',value:"frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"}];
 return [{source:'/:path*',headers:sec},{source:'/demo',headers:demo},...['/admin/:path*','/admin','/panel/:path*','/panel','/saha','/kod','/login','/go','/t/:path*','/kurulum'].map(source=>({source,headers:gizli}))];}};
