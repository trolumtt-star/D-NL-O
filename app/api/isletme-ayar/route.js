// İşletme sahibinin asistan ayarları. Hepsi businesses.settings içinde tutulur; /api/vapi/assist her aramada okur.
import {NextResponse} from 'next/server';import crypto from 'crypto';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';import {paketOf,enAzPaket} from '@/lib/paket';import {durum,tr90} from '@/lib/entegrasyon';import {cikisGonder,urlGuvenli} from '@/lib/cikis';
export const dynamic='force-dynamic';
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
// Asistanın şablon motoru {{ }} ve {% %} kullanır; işletmenin yazdığı metin şablon gibi çalışmasın
const temiz=(s,n)=>String(s||'').replace(/[{}%]/g,'').replace(/\r/g,'').trim().slice(0,n);
const no10=s=>{const d=String(s||'').replace(/\D/g,'');return d.length>=10?d.slice(-10):null;};
const KAPI={kampanya:'Kampanya duyurusu',bilgi:'Bilgi bankası',aktarma:'Yetkiliye aktarma',hatirlatma:'Randevu hatırlatma',sms:'SMS onay mesajı',eposta:'E-posta özeti',cikis:'Kendi sisteminize bağlantı'};
const ozet=b=>{const s=b.settings||{},pk=paketOf(b),d=durum();
 return {tatil:s.tatil||{aktif:false,mesaj:''},kara_liste:s.kara_liste||[],kampanya:s.kampanya||{aktif:false,metin:''},bilgi:s.bilgi||'',
  asistan:s.asistan||{ad:'',kisilik:''},gorusme:s.gorusme||{max_dk:0,yavas:false,kayit_kapali:false},teslimat_km:s.teslimat_km||0,acil_tanim:s.acil_tanim||'',
  aktarma_no:s.aktarma_no||'',hatirlatma:s.hatirlatma||'yok',sms_onay:!!s.sms_onay,eposta_ozet:s.eposta_ozet||{aktif:false,adres:''},
  cikis:s.cikis?{url:s.cikis.url,gizli:s.cikis.gizli}:null,konumVar:!!s.konum?.lat,
  baglanti:{netgsm:d.netgsm,eposta:d.eposta},
  paket:Object.fromEntries(Object.entries(pk).filter(([k])=>k!=='id')),enAz:Object.fromEntries(Object.keys(KAPI).map(k=>[k,enAzPaket(k)]))};};
export async function GET(req){try{const b=await requireOwner(req);return NextResponse.json(ozet(b));}catch(e){return hata(e.message,401);}}
export async function POST(req){try{const b=await requireOwner(req);const x=await req.json(),pk=paketOf(b),s={...(b.settings||{})};
 const kapi=k=>{if(!pk[k])throw new Error(`${KAPI[k]} ${enAzPaket(k)} paketten itibaren açılır.`);};
 switch(x.islem){
  case 'tatil':s.tatil={aktif:!!x.aktif,mesaj:temiz(x.mesaj,200)};break;
  case 'kara_liste':{const l=[...new Set((Array.isArray(x.numaralar)?x.numaralar:[]).map(no10).filter(Boolean))];if(l.length>200)return hata('En fazla 200 numara engellenebilir.');s.kara_liste=l;break;}
  case 'kampanya':kapi('kampanya');s.kampanya={aktif:!!x.aktif,metin:temiz(x.metin,300)};break;
  case 'bilgi':kapi('bilgi');s.bilgi=temiz(x.metin,4000);break;
  case 'asistan':s.asistan={ad:temiz(x.ad,30),kisilik:temiz(x.kisilik,300)};break;
  case 'gorusme':{const m=Math.round(+x.max_dk||0);if(m&&(m<2||m>30))return hata('Süre sınırı 2-30 dakika arası olmalı (0 = sınır yok).');s.gorusme={max_dk:m,yavas:!!x.yavas,kayit_kapali:!!x.kayit_kapali};break;}
  case 'teslimat':{const k=+x.km||0;if(k&&(k<0.5||k>100))return hata('Teslimat yarıçapı 0,5-100 km arası olmalı (0 = kontrol yok).');if(k&&!s.konum?.lat)return hata('Önce Ayarlar > Dükkân konumu kısmından adresinizi kaydedin.');s.teslimat_km=Math.round(k*10)/10;break;}
  case 'acil':s.acil_tanim=temiz(x.metin,300);break;
  case 'aktarma':{kapi('aktarma');if(!x.numara){delete s.aktarma_no;break;}const n=tr90(x.numara)||(String(x.numara).replace(/\D/g,'').length>=10?String(x.numara).replace(/\D/g,''):null);if(!n)return hata('Geçerli bir telefon numarası yazın.');s.aktarma_no=n;break;}
  case 'hatirlatma':{const v=['yok','sms','arama'].includes(x.tur)?x.tur:'yok';if(v!=='yok')kapi('hatirlatma');s.hatirlatma=v;break;}
  case 'sms_onay':if(x.aktif)kapi('sms');s.sms_onay=!!x.aktif;break;
  case 'eposta':{if(x.aktif)kapi('eposta');const a=String(x.adres||'').trim().slice(0,200);if(x.aktif&&!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(a))return hata('Geçerli bir e-posta adresi yazın.');s.eposta_ozet={aktif:!!x.aktif,adres:a};break;}
  case 'cikis':{if(!x.url){delete s.cikis;break;}kapi('cikis');const u=String(x.url).trim().slice(0,500);const g=await urlGuvenli(u);if(!g.ok)return hata(g.neden);
   s.cikis={url:u,gizli:s.cikis?.gizli||crypto.randomBytes(18).toString('base64url')};break;}
  case 'cikis_test':{if(!s.cikis?.url)return hata('Önce adresi kaydedin.');const r=await cikisGonder(s.cikis,{olay:'test',mesaj:'Dinlio bağlantı testi',zaman:new Date().toISOString()});return r.ok?NextResponse.json({ok:true,mesaj:'Test gönderildi, sisteminiz '+r.durum+' döndü.'}):hata('Gönderilemedi: '+r.neden);}
  default:return hata('Geçersiz işlem');}
 const {error}=await adminSb.from('businesses').update({settings:s}).eq('id',b.id);if(error)return hata(error.message);
 return NextResponse.json({ok:true,...ozet({...b,settings:s})});}catch(e){return hata(e.message,e.message==='Giriş gerekli'?401:400);}}
