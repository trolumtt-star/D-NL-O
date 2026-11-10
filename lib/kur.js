// Güncel USD/TRY kuru: önce TCMB (döviz satış), olmazsa açık kur servisi. 1 saat önbellek.
const tcmb=async()=>{const r=await fetch('https://www.tcmb.gov.tr/kurlar/today.xml',{next:{revalidate:3600},signal:AbortSignal.timeout(6000)});if(!r.ok)throw new Error('tcmb '+r.status);
 const x=await r.text(),blk=x.match(/<Currency[^>]*CurrencyCode="USD"[\s\S]*?<\/Currency>/);const v=blk&&blk[0].match(/<ForexSelling>([\d.]+)<\/ForexSelling>/);const d=x.match(/Tarih="([\d.]+)"/);
 if(!v)throw new Error('tcmb biçim');return {usd:+v[1],tarih:d?d[1]:null,kaynak:'TCMB döviz satış'};};
const yedek=async()=>{const r=await fetch('https://open.er-api.com/v6/latest/USD',{next:{revalidate:3600},signal:AbortSignal.timeout(6000)});const j=await r.json();if(!j?.rates?.TRY)throw new Error('yedek');
 return {usd:+j.rates.TRY.toFixed(4),tarih:new Date(j.time_last_update_unix*1000).toLocaleDateString('tr-TR'),kaynak:'piyasa kuru'};};
export async function usdKur(){try{return await tcmb();}catch{try{return await yedek();}catch{return {usd:null};}}}
