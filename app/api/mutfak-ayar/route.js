// İşletme sahibi: mutfak ekranı linki ve masadan QR sipariş ayarları.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';import {paketOf,enAzPaket} from '@/lib/paket';import {SITE} from '@/lib/site';import {yeniKod,masaImza} from '@/lib/mutfak';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
function ozet(b){const s=b.settings||{},pk=paketOf(b),q=s.qr||{},n=Math.max(0,Math.min(100,+b.table_count||0));
 return {mutfak:s.mutfak?.kod?SITE+'/mutfak/'+s.mutfak.kod:null,
  qr:{izin:!!pk.qrSiparis,enAz:enAzPaket('qrSiparis'),acik:!!q.acik,garsonOnay:!!q.garsonOnay,
   masalar:q.kod&&q.gizli?Array.from({length:n},(_,i)=>({masa:i+1,url:`${SITE}/masa/${q.kod}?m=${i+1}&t=${masaImza(q.gizli,i+1)}`})):[],menu:q.kod?`${SITE}/masa/${q.kod}`:null},
  masaSayisi:n};}
export async function GET(req){try{return NextResponse.json(ozet(await requireOwner(req)));}catch(e){return hata(e.message,401);}}
export async function POST(req){try{const b=await requireOwner(req),x=await req.json(),s={...(b.settings||{})},pk=paketOf(b);
 switch(x.islem){
  case 'mutfak':s.mutfak={kod:yeniKod()};break;                  // oluştur ya da yenile (eski link çalışmaz)
  case 'mutfak_kapat':delete s.mutfak;break;
  case 'qr':{if(x.acik&&!pk.qrSiparis)return hata(`Masadan QR sipariş ${enAzPaket('qrSiparis')} paketten itibaren açılır.`);
   const q={...(s.qr||{})};if(!q.kod)q.kod=yeniKod(12);if(!q.gizli)q.gizli=yeniKod(24);q.acik=!!x.acik;q.garsonOnay=!!x.garsonOnay;s.qr=q;break;}
  case 'masa_sayisi':{const n=Math.round(+x.n||0);if(n<0||n>100)return hata('Masa sayısı 0-100 arası olmalı.');
   await adminSb.from('businesses').update({table_count:n}).eq('id',b.id);b.table_count=n;break;}
  case 'qr_yenile':{if(!s.qr)return hata('Önce QR siparişi açın.');s.qr={...s.qr,gizli:yeniKod(24)};break;} // eski QR'lar geçersiz olur
  default:return hata('Geçersiz işlem');}
 await adminSb.from('businesses').update({settings:s}).eq('id',b.id);b.settings=s;
 return NextResponse.json(ozet(b));}catch(e){return hata(e.message,400);}}
