// Sitenin herkese açık adresi (özel domain alınınca Vercel'de NEXT_PUBLIC_SITE_URL ile değiştir)
export const SITE=(process.env.NEXT_PUBLIC_SITE_URL||'https://dinlio.vercel.app').replace(/\/+$/,'');
