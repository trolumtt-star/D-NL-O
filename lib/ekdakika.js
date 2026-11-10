// EK DAKİKA FİYATI: işletmenin paketindeki dakika başı fiyatla aynı (KDV dahil ödenir).
// Paket fiyatları sitedeki normal (kampanyasız) fiyatlardır; özel kotalı işletmeler için 0.25 $/dk.
export const PAKET={100:[45,'Başlangıç'],300:[69,'Standart'],500:[129,'Büyük'],600:[129,'Büyük'],1500:[279,'Pro']};
export const KDV=0.20,EN_AZ=30,EN_COK=5000,SECENEK=[50,100,250];
export const birim=b=>{const p=PAKET[b?.quota_minutes_total];return p?{usd:+(p[0]/b.quota_minutes_total).toFixed(4),paket:p[1]}:{usd:0.25,paket:'Özel'};};
const r2=x=>Math.round(x*100)/100;
export function fiyat(dk,birimUsd,kur){const usd=r2(dk*birimUsd),tl=r2(usd*kur),kdv=r2(tl*KDV);return {dakika:dk,usd,tl_kdvsiz:tl,kdv,toplam_tl:r2(tl+kdv)};}
export const tl=x=>Number(x).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' ₺';
