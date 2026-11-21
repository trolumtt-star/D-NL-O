// Paket kademeleri: her paketin dakikası, aynı anda kaç aramaya cevap verdiği ve hangi özellikleri açtığı.
// Paket, işletmenin aylık dakikasından anlaşılır (100 → Başlangıç, 300 → Standart, 500/600 → Büyük, 1500+ → Pro).
// Admin özel bir paket vermek isterse businesses.settings.paket = 's'|'m'|'l'|'p' ile ezebilir.
// Dağılım: Başlangıç = temel + kazanç kartı. Standart = sadakat, ek satış, patron hattı, defter, kampanya, SMS, kurye...
// Büyük = randevu teyidi/bekleme, geri kazanma aramaları, çok dilli, bilgi bankası, haftalık rapor. Pro = kalite puanı ve en çok hat.
// Herkese açık (bayrak yok): kapalı/tatil modu, kara liste, görüşme süresi sınırı, ses kaydını kapatma ve itirazda silme,
// yavaş konuşma, asistan adı/kişiliği, teslimat bölgesi, "siparişim nerede", acil ayrımı, bildirimde Onayla/Reddet, geri arama listesi.
const ORT={ekSatis:true,patron:true,sadik:true,kayit:true,defter:true,kampanya:true,aktarma:true,duygu:true,eposta:true,takvim:true,sms:true,ozelSes:true,kurye:true,mesaj:true,qrSiparis:true};
export const PAKETLER={
 s:{id:'s',ad:'Başlangıç',eszamanli:1,calisan:0,sadik:false,kayit:false,defter:false,kampanya:false,aktarma:false,duygu:false,eposta:false,takvim:false,sms:false,bilgi:false,haftalik:false,hatirlatma:false,cikis:false,kalite:false,ozelSes:false,kurye:false,mesaj:false,qrSiparis:false,geri:false,ekSatis:false,patron:false,cokDil:false},
 m:{id:'m',ad:'Standart',eszamanli:2,calisan:3,...ORT,bilgi:false,haftalik:false,hatirlatma:false,cikis:false,kalite:false,geri:false,cokDil:false},
 l:{id:'l',ad:'Büyük',eszamanli:3,calisan:10,...ORT,bilgi:true,haftalik:true,hatirlatma:true,cikis:true,kalite:false,geri:true,cokDil:true},
 p:{id:'p',ad:'Pro',eszamanli:5,calisan:20,...ORT,bilgi:true,haftalik:true,hatirlatma:true,cikis:true,kalite:true,geri:true,cokDil:true},
};
export const SIRA=['s','m','l','p'];
// Ödemesi yapılmamış satın alma hesabı: hiçbir paket özelliği açık değil
const KAPALI=()=>({...Object.fromEntries(Object.entries(PAKETLER.s).map(([k,v])=>[k,typeof v==='boolean'?false:typeof v==='number'?0:v])),ad:'Ödeme bekleniyor',id:'yok'});
export function paketOf(b){
 const o=b?.settings?.paket;if(PAKETLER[o])return PAKETLER[o];
 // Satın alınan paket (ödeme onaylanınca yazılır) her zaman esas alınır
 const ab=b?.settings?.abonelik?.paket;if(PAKETLER[ab])return PAKETLER[ab];
 if(b?.settings?.satin_al)return KAPALI();
 // Ücretsiz deneme her zaman Başlangıç paketiyle birebir aynıdır (deneme dakikası kaç olursa olsun)
 if(b?.settings?.deneme&&!b?.settings?.abonelik)return PAKETLER.s;
 const d=+b?.quota_minutes_total||0;
 return d<=100?PAKETLER.s:d<=300?PAKETLER.m:d<=600?PAKETLER.l:PAKETLER.p;
}
// Bu özelliği açan en küçük paketin adı ("Standart pakette" gibi yükseltme mesajları için)
export const enAzPaket=ozellik=>{for(const k of SIRA){const v=PAKETLER[k][ozellik];if(v===true||(typeof v==='number'&&v>0))return PAKETLER[k].ad;}return 'Pro';};
