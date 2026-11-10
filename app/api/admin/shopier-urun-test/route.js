// Admin: Shopier'de ürün oluşturmanın kurallarını öğrenir. Eksik alan hatalarına bakarak isteği adım adım tamamlar,
// sonunda gizli bir deneme ürünü açar, cevabın biçimini gösterir ve ürünü hemen siler. Her adım raporlanır.
import {NextResponse} from 'next/server';import {requireAdmin} from '@/lib/admin';
export const dynamic='force-dynamic';export const maxDuration=45;
const RESIM='https://dinlio.vercel.app/icon-512.png';
const tahmin=(yol,onceki)=>{const a=yol[yol.length-1].toString().toLowerCase(),ust=yol.slice(0,-1).join('.').toLowerCase();
 if(/data$|info$|details?$/.test(a))return {};if(/currency/.test(a))return 'TRY';if(/price|amount|value|total/.test(a))return onceki==='1.00'?1:'1.00';
 if(/stock|quantity|qty|count/.test(a))return 1;
 if(/type/.test(a))return /media/.test(ust)?(onceki==='image'?'photo':'image'):(onceki==='digital'?'virtual':'digital');
 if(/url|link|src|path/.test(a))return RESIM;if(/placement|order|position|index|sort/.test(a))return 1;
 if(/shipping|cargo/.test(a))return onceki===false?0:false;if(/description|desc/.test(a))return 'Dinlio deneme ürünü, otomatik silinecek.';
 if(/^media$|images?$|photos?$/.test(a))return [{url:RESIM}];if(/category|categories/.test(a))return [];if(/visible|listed|active|public/.test(a))return false;return 'test';};
const parca=y=>y.replace(/\[(\d+)\]/g,'.$1').split('.').filter(Boolean).map(x=>/^\d+$/.test(x)?+x:x);
const al=(o,p)=>p.reduce((x,k)=>x?.[k],o);
const koy=(o,p,v)=>{let x=o;for(let i=0;i<p.length-1;i++){const k=p[i],sonraki=p[i+1];if(x[k]==null||typeof x[k]!=='object')x[k]=typeof sonraki==='number'?[]:{};x=x[k];}x[p[p.length-1]]=v;};
export async function POST(req){try{await requireAdmin(req);const pat=process.env.SHOPIER_PAT;if(!pat)throw new Error('SHOPIER_PAT yok');
 const base=process.env.SHOPIER_API_BASE||'https://api.shopier.com/v1',H={authorization:'Bearer '+pat,accept:'application/json','content-type':'application/json'};
 const f=async(m,p,b)=>{const r=await fetch(base+p,{method:m,headers:H,body:b?JSON.stringify(b):undefined,signal:AbortSignal.timeout(8000)});const t=await r.text();let j=null;try{j=JSON.parse(t);}catch{}return {durum:r.status,govde:j??t.slice(0,400)};};
 const body={title:'Dinlio deneme - silinecek'},adimlar=[];let son=null;
 let tekrar=0,onceMsg='';
 for(let i=0;i<30;i++){const r=await f('POST','/products',body);if(String(r.govde?.message)===onceMsg){if(++tekrar>=2){adimlar.push({durdu:'Aynı hata tekrarlandı'});break;}}else tekrar=0;onceMsg=String(r.govde?.message);adimlar.push({gonderilen:JSON.parse(JSON.stringify(body)),durum:r.durum,cevap:r.govde});son=r;
  if(r.durum<300)break;const msg=String(r.govde?.message||'');const m=msg.match(/^"?([\w.\[\]]+)"? (is required|must contain at least|must|should|is invalid|has invalid|is not allowed|is not)/i);if(!m)break;
  const p=parca(m[1]);
  if(/is not allowed|not permitted|unknown|unexpected/i.test(msg)){const ust=al(body,p.slice(0,-1))||body;delete ust[p[p.length-1]];continue;}
  const tur=msg.match(/must be (?:of type )?(?:an? )?(array|object|number|integer|string|boolean)/i),bir=msg.match(/must be one of \[([^\]]+)\]/i);
  if(bir){koy(body,p,bir[1].split(',')[0].trim());continue;}
  if(tur){const t=tur[1].toLowerCase(),v=al(body,p);koy(body,p,t==='array'?(/media|image/i.test(m[1])?[{url:RESIM}]:[]):t==='object'?{}:t==='number'||t==='integer'?(parseFloat(v)||1):t==='string'?String(v??'test'):false);continue;}
  if(/must contain at least/i.test(m[2])){const arr=al(body,p);const yeni=/media/i.test(m[1])?{url:RESIM}:{};if(Array.isArray(arr))arr.push(yeni);else koy(body,p,[yeni]);continue;}
  const once=JSON.stringify(body);koy(body,p,tahmin(p,al(body,p)));if(JSON.stringify(body)===once)break;}
 let silme=null;const id=son?.durum<300&&(son.govde?.id||son.govde?.data?.id);
 if(id){silme=await f('DELETE','/products/'+encodeURIComponent(id));}
 const wh=await f('POST','/webhooks',{event:'gecersiz.olay',url:'https://dinlio.vercel.app/api/odeme/shopier-webhook'});
 return NextResponse.json({adimlar,olusturulan:son?.durum<300?son.govde:null,silme,webhookOlayHatasi:wh});}
 catch(e){return NextResponse.json({error:e.message},{status:e.message==='Yetkisiz'?401:400});}}
