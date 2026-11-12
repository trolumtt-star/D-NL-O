/** @type {import('next').NextConfig} */
const sec=[
 {key:'X-Frame-Options',value:'DENY'},
 {key:'Content-Security-Policy',value:"frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://www.shopier.com; object-src 'none'"},
 {key:'X-Content-Type-Options',value:'nosniff'},
 {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
 {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(self), payment=(), usb=()'},
 {key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains; preload'},
 {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
 {key:'X-DNS-Prefetch-Control',value:'off'}
];
module.exports={poweredByHeader:false,productionBrowserSourceMaps:false,reactStrictMode:true,
 async headers(){const gizli=[{key:'X-Robots-Tag',value:'noindex, nofollow'}];return [{source:'/:path*',headers:sec},...['/admin/:path*','/admin','/panel/:path*','/panel','/saha','/kod','/login'].map(source=>({source,headers:gizli}))];}};
