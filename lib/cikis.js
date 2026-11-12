// İşletmenin kendi sistemine (CRM, sipariş programı, Zapier/Make) çağrı verisi gönderme. İmza: X-Dinlio-Imza = HMAC-SHA256(gövde, gizli).
// Güvenlik: sadece https, iç ağ / localhost / IP adresleri engellenir (sunucumuzdan iç ağa istek atılamasın).
import crypto from 'crypto';import dns from 'dns/promises';
const ozel=ip=>/^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(ip)||/^(::1|fc|fd|fe80|::ffff:(10|127|192\.168|169\.254)\.)/i.test(ip)||ip==='::';
export async function urlGuvenli(u){let x;try{x=new URL(u);}catch{return {ok:false,neden:'Geçerli bir adres yazın (https://...).'};}
 if(x.protocol!=='https:')return {ok:false,neden:'Adres https:// ile başlamalı.'};
 if(x.username||x.password)return {ok:false,neden:'Adreste kullanıcı adı/şifre olmamalı.'};
 const h=x.hostname.toLowerCase();if(h==='localhost'||h.endsWith('.local')||h.endsWith('.internal')||/^[\d.]+$/.test(h)||h.includes(':'))return {ok:false,neden:'Bu adrese gönderim yapılamaz; alan adı kullanın.'};
 try{const l=await dns.lookup(h,{all:true});if(!l.length||l.some(a=>ozel(a.address)))return {ok:false,neden:'Bu adrese gönderim yapılamaz.'};}catch{return {ok:false,neden:'Alan adı bulunamadı.'};}
 return {ok:true};}
export async function cikisGonder(c,veri){
 try{const g=await urlGuvenli(c.url);if(!g.ok)return {ok:false,neden:g.neden};
  const govde=JSON.stringify(veri),imza=crypto.createHmac('sha256',c.gizli).update(govde).digest('hex');
  const r=await fetch(c.url,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(5000),headers:{'content-type':'application/json','user-agent':'Dinlio-Webhook/1','x-dinlio-imza':imza},body:govde});
  return r.status>=200&&r.status<300?{ok:true,durum:r.status}:{ok:false,neden:'Sistem '+r.status+' döndü'};}catch(e){return {ok:false,neden:String(e.message||e).slice(0,120)};}}
