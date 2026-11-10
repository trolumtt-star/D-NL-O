// Destek / satış WhatsApp numarası (Vercel'de NEXT_PUBLIC_DESTEK_WHATSAPP ile değiştirilebilir)
export const DESTEK=(process.env.NEXT_PUBLIC_DESTEK_WHATSAPP||'905068154577').replace(/\D/g,'');
export const waLink=(metin='')=>'https://wa.me/'+DESTEK+(metin?'?text='+encodeURIComponent(metin):'');
