import {BIZ_TYPE,CITY_LL} from './leadsConst';import {scoreLead} from './leads';
export async function searchYandex(city,cat,limit){
 const key=process.env.YANDEX_PLACES_KEY;if(!key)throw new Error('YANDEX_PLACES_KEY tanımlı değil (Vercel ortam değişkeni).');
 const text=`${BIZ_TYPE[cat]||cat}, ${city}`,ll=CITY_LL[city],rows=new Map(),want=Math.min(200,limit||100);
 for(let skip=0;rows.size<want&&skip<190;skip+=20){
  const u=new URL('https://search-maps.yandex.ru/v1/');u.searchParams.set('apikey',key);u.searchParams.set('text',text);u.searchParams.set('lang','tr_TR');u.searchParams.set('type','biz');u.searchParams.set('results','20');if(skip)u.searchParams.set('skip',String(skip));if(ll){u.searchParams.set('ll',ll);u.searchParams.set('spn','0.9,0.9');}
  const r=await fetch(u,{signal:AbortSignal.timeout(15000)});if(r.status===403)throw new Error('Yandex anahtarı reddedildi (403). Anahtarın Geosearch API için etkin olduğundan emin olun.');if(!r.ok)throw new Error('Yandex hatası '+r.status);
  const j=await r.json(),feats=j.features||[];if(!feats.length)break;
  for(const f of feats){const m=f.properties?.CompanyMetaData;if(!m?.id)continue;if(rows.has(m.id))continue;
   const phone=(m.Phones||[]).map(p=>p.formatted||p.number).filter(Boolean)[0]||null,coords=f.geometry?.coordinates||[];
   rows.set(m.id,{yandex_id:m.id,name:String(m.name||'').slice(0,120),category:cat,city,address:m.address||null,phone,website:m.url||null,opening_hours:null,hours:m.Hours?.text||null,lat:coords[1]??null,lon:coords[0]??null,source:'yandex'});}
  if(feats.length<20)break;}
 return [...rows.values()].slice(0,want).map(l=>({...l,score:scoreLead({phone:l.phone,website:l.website,rating:null,rating_count:0,price_level:null})}));}
