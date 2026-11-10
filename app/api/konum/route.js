import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';import {adresBul} from '@/lib/harita';
export const dynamic='force-dynamic';
// İşletme sahibi dükkânın adresini girer; tariften konum bulurken arama bu bölgede yapılır.
export async function POST(req){try{const b=await requireOwner(req);const {adres,ilce,il}=await req.json();
 const a=String(adres||'').slice(0,200).trim(),i=String(ilce||'').slice(0,60).trim(),s=String(il||'').slice(0,60).trim();if(!i||!s)throw new Error('İlçe ve il gerekli');
 const p=await adresBul([a,i,s].filter(Boolean).join(', '))||await adresBul(i+', '+s);if(!p)throw new Error('Adres haritada bulunamadı, ilçe ve ili kontrol edin.');
 const konum={adres:a,ilce:i,il:s,lat:p.lat,lng:p.lng,bulunan:p.ad,kaynak:p.kaynak};
 const {error}=await adminSb.from('businesses').update({settings:{...(b.settings||{}),konum}}).eq('id',b.id);if(error)throw error;return NextResponse.json({ok:true,konum});
}catch(e){return NextResponse.json({error:e.message},{status:e.message==='Giriş gerekli'?401:400});}}
