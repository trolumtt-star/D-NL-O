import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';import {adresBul,tersAdres} from '@/lib/harita';
export const dynamic='force-dynamic';
// İşletme sahibi dükkânın adresini girer; tariften konum bulurken arama bu bölgede yapılır.
export async function POST(req){try{const b=await requireOwner(req);const x=await req.json();
 // GPS ile: telefonun konumu doğrudan kaydedilir, adres metni konumdan bulunur
 if(x.lat!==undefined&&x.lng!==undefined){const r=await tersAdres(x.lat,x.lng);if(!r)throw new Error('Konumdan adres bulunamadı, elle yazın.');
  const konum={adres:r.adres,ilce:r.ilce,il:r.il,lat:r.lat,lng:r.lng,bulunan:r.ad,kaynak:'gps'};
  const s={...(b.settings||{}),konum};if(s.kurulum?.bilgi)s.kurulum={...s.kurulum,bilgi:{...s.kurulum.bilgi,adres:[r.adres,r.ilce,r.il].filter(Boolean).join(', ')}};
  const {error}=await adminSb.from('businesses').update({settings:s}).eq('id',b.id);if(error)throw error;return NextResponse.json({ok:true,konum});}
 const {adres,ilce,il}=x;
 const a=String(adres||'').slice(0,200).trim(),i=String(ilce||'').slice(0,60).trim(),s=String(il||'').slice(0,60).trim();if(!i||!s)throw new Error('İlçe ve il gerekli');
 const p=await adresBul([a,i,s].filter(Boolean).join(', '))||await adresBul(i+', '+s);if(!p)throw new Error('Adres haritada bulunamadı, ilçe ve ili kontrol edin.');
 const konum={adres:a,ilce:i,il:s,lat:p.lat,lng:p.lng,bulunan:p.ad,kaynak:p.kaynak};
 const {error}=await adminSb.from('businesses').update({settings:{...(b.settings||{}),konum}}).eq('id',b.id);if(error)throw error;return NextResponse.json({ok:true,konum});
}catch(e){return NextResponse.json({error:e.message},{status:e.message==='Giriş gerekli'?401:400});}}
