// Admin: Shopier'de ürün oluşturmanın kurallarını öğrenir. Eksik alan hatalarına bakarak isteği adım adım tamamlar,
// sonunda gizli bir deneme ürünü açar, cevabın biçimini gösterir ve ürünü hemen siler. Her adım raporlanır.
import {NextResponse} from 'next/server';import {requireAdmin} from '@/lib/admin';
export const dynamic='force-dynamic';export const maxDuration=45;
const tahmin=(ad,onceki)=>{const a=ad.toLowerCase();
 if(/currency/.test(a))return 'TRY';if(/price|amount|value|total/.test(a))return onceki==='1.00'?1:'1.00';
 if(/stock|quantity|qty|count/.test(a))return 1;if(/type/.test(a))return onceki==='digital'?'virtual':'digital';
 if(/url|link/.test(a))return 'https://dinlio.vercel.app';if(/media|image|photo/.test(a))return [];
 if(/shipping|cargo/.test(a))return onceki===false?0:false;if(/description|desc/.test(a))return 'Dinlio deneme ürünü, otomatik silinecek.';
 if(/category|categories/.test(a))return [];if(/visible|listed|active|public/.test(a))return false;return 'test';};
const koy=(o,yol,v)=>{const p=yol.split('.');let x=o;for(let i=0;i<p.length-1;i++){x[p[i]]=x[p[i]]&&typeof x[p[i]]==='object'?x[p[i]]:{};x=x[p[i]];}x[p[p.length-1]]=v;};
const al=(o,yol)=>yol.split('.').reduce((x,k)=>x?.[k],o);
export async function POST(req){try{await requireAdmin(req);const pat=process.env.SHOPIER_PAT;if(!pat)throw new Error('SHOPIER_PAT yok');
 const base=process.env.SHOPIER_API_BASE||'https://api.shopier.com/v1',H={authorization:'Bearer '+pat,accept:'application/json','content-type':'application/json'};
 const f=async(m,p,b)=>{const r=await fetch(base+p,{method:m,headers:H,body:b?JSON.stringify(b):undefined,signal:AbortSignal.timeout(8000)});const t=await r.text();let j=null;try{j=JSON.parse(t);}catch{}return {durum:r.status,govde:j??t.slice(0,400)};};
 const body={title:'Dinlio deneme - silinecek'},adimlar=[];let son=null;
 for(let i=0;i<14;i++){const r=await f('POST','/products',body);adimlar.push({gonderilen:JSON.parse(JSON.stringify(body)),durum:r.durum,cevap:r.govde});son=r;
  if(r.durum<300)break;const msg=String(r.govde?.message||'');const m=msg.match(/^([\w.\[\]]+) (?:is required|must|should|is invalid|has invalid|is not)/i);if(!m)break;
  const yol=m[1].replace(/\[\d+\]/g,'');koy(body,yol,tahmin(yol.split('.').pop(),al(body,yol)));}
 let silme=null;const id=son?.durum<300&&(son.govde?.id||son.govde?.data?.id);
 if(id){silme=await f('DELETE','/products/'+encodeURIComponent(id));}
 const wh=await f('POST','/webhooks',{event:'gecersiz.olay',url:'https://dinlio.vercel.app/api/odeme/shopier-webhook'});
 return NextResponse.json({adimlar,olusturulan:son?.durum<300?son.govde:null,silme,webhookOlayHatasi:wh});}
 catch(e){return NextResponse.json({error:e.message},{status:e.message==='Yetkisiz'?401:400});}}
