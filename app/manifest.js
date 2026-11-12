// Panel uygulaması. scope '/panel': yüklenen uygulama yalnızca paneli kapsar; sitenin ana sayfası, Dinlio Kod (/kod) ve
// Dinlio Go (/go) ayrı kalır, her biri kendi manifestiyle ayrı uygulama olarak yüklenir ve birbirinin içinde açılmaz.
export default function manifest(){return {id:'/panel',name:'Dinlio AI Panel',short_name:'Dinlio',description:'Telefon asistanınızın aldığı sipariş, randevu ve rezervasyonlar',start_url:'/panel',scope:'/panel',display:'standalone',background_color:'#050505',theme_color:'#050505',lang:'tr',
 icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};}
