// Admin: Shopier REST API'nin gerçek cevap biçimini görmek için salt okunur keşif (hiçbir şey değiştirmez).
// Kişisel bilgiler (e-posta, telefon, isim, adres) maskelenir.
import {NextResponse} from 'next/server';import {requireAdmin} from '@/lib/admin';
export const dynamic='force-dynamic';export const maxDuration=30;
const GIZLI=/mail|phone|tel|name|surname|address|adres|isim|ad$|soyad|iban|token|secret/i;
const maskele=(x,d=0)=>{if(d>6)return '…';if(Array.isArray(x))return x.slice(0,2).map(y=>maskele(y,d+1));
 if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,GIZLI.test(k)&&typeof v==='string'?'«'+typeof v+' '+v.length+'»':maskele(v,d+1)]));return x;};
export async function GET(req){try{await requireAdmin(req);const pat=process.env.SHOPIER_PAT;if(!pat)throw new Error('Vercel\'de SHOPIER_PAT yok.');
 const base=process.env.SHOPIER_API_BASE||'https://api.shopier.com/v1',out={base};
 // Okuma uçları + boş gövdeli doğrulama istekleri (eksik alan hatası döner, hiçbir şey oluşturmaz)
 const L=[['GET','/products'],['GET','/products?limit=1'],['GET','/orders?limit=1'],['GET','/webhooks'],['GET','/shop'],['GET','/me'],['POST','/products',{}],['POST','/webhooks',{}]];
 for(const [m,p,bd] of L){const key=m+' '+p;try{const r=await fetch(base+p,{method:m,headers:{authorization:'Bearer '+pat,accept:'application/json',...(bd?{'content-type':'application/json'}:{})},body:bd?JSON.stringify(bd):undefined,signal:AbortSignal.timeout(8000)});
  const t=await r.text();let j=null;try{j=JSON.parse(t);}catch{}out[key]={durum:r.status,basliklar:Object.fromEntries([...r.headers].filter(([k])=>/content-type|x-ratelimit|link|x-total/i.test(k))),govde:j?maskele(j):t.slice(0,300)};}catch(e){out[key]={hata:String(e.message||e)};}}
 return NextResponse.json(out);}catch(e){return NextResponse.json({error:e.message},{status:e.message==='Yetkisiz'?401:400});}}
