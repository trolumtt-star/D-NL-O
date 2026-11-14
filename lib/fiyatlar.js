// Paket fiyatları (sitedeki fiyat kartlarıyla aynı: lib/landing.js içindeki PK). Fiyat değişirse İKİSİ de güncellenir.
// usd/aio: lansman fiyatı (kampanya bitene kadar) · liste/aioListe: normal fiyat · first: Başlangıç ilk ay
export const PK=[{id:'s',ad:'Başlangıç',dk:100,usd:45,liste:59,aio:54,aioListe:69,first:9},{id:'m',ad:'Standart',dk:300,usd:69,liste:89,aio:79,aioListe:99},
 {id:'l',ad:'Büyük',dk:600,usd:129,liste:169,aio:139,aioListe:179},{id:'p',ad:'Pro',dk:1500,usd:279,liste:349,aio:289,aioListe:359}];
export const KAMPANYA_BITIS=new Date('2026-12-31T23:59:59+03:00');
export const DENEME_GUN=7,DENEME_DK=30;
// ilkAy: işletme daha önce hiç paket almadıysa Başlangıç ilk ay fiyatı geçerli (aylık, Çağrı paketi)
export function paketFiyat({id,all=false,yil=false,ilkAy=false}){const p=PK.find(x=>x.id===id);if(!p)return null;
 const kamp=Date.now()<KAMPANYA_BITIS,ay=kamp?(all?p.aio:p.usd):(all?p.aioListe:p.liste);
 if(yil)return {...p,all,yil,usd:ay*10,aciklama:`${p.ad}${all?' All in one':''} · yıllık (2 ay bedava)`};
 if(ilkAy&&!all&&p.first)return {...p,all,yil,usd:p.first,aciklama:`${p.ad} · ilk ay`};
 return {...p,all,yil,usd:ay,aciklama:`${p.ad}${all?' All in one':''} · aylık`};}
export function tlHesap(usd,kur,kdv){const tl=Math.round(usd*kur*100)/100,k=Math.round(tl*kdv*100)/100;return {usd,tl_kdvsiz:tl,kdv:k,toplam_tl:Math.round((tl+k)*100)/100};}
