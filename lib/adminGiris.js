// ADMİN GİRİŞ TAKİBİ: admin paneline yeni bir yerden (şehir/ülke) ya da yeni bir cihazdan girilince admin'e bildirim gider.
// Sadece IP'ye bakılmaz: mobil internette IP sık değişir, her seferinde uyarı gelmesin diye konum + cihaz türü birlikte izlenir.
// Ayrıca admin e-postasıyla Google'sız ya da 2 adımlı kod olmadan girilmeye çalışılırsa (şifre çalınmış olabilir) uyarı verilir.
import {adminSb} from './admin';import crypto from 'crypto';
const son=new Map();
const cihazAdi=ua=>{ua=String(ua||'');const os=/iphone|ipad/i.test(ua)?'iPhone/iPad':/android/i.test(ua)?'Android':/windows/i.test(ua)?'Windows':/mac os/i.test(ua)?'Mac':/linux/i.test(ua)?'Linux':'Bilinmeyen';
 const br=/edg\//i.test(ua)?'Edge':/opr\/|opera/i.test(ua)?'Opera':/firefox|fxios/i.test(ua)?'Firefox':/samsungbrowser/i.test(ua)?'Samsung':/chrome|crios/i.test(ua)?'Chrome':/safari/i.test(ua)?'Safari':'Tarayıcı';return br+' · '+os;};
export const istekBilgi=req=>{const h=k=>req.headers.get(k)||'';let sehir=h('x-vercel-ip-city');try{sehir=decodeURIComponent(sehir);}catch{}
 return {ip:h('x-forwarded-for').split(',')[0].trim().slice(0,60),ulke:h('x-vercel-ip-country').slice(0,4),sehir:sehir.slice(0,60),cihaz:cihazAdi(h('user-agent'))};};
export async function adminGirisKaydet(req){try{const b=istekBilgi(req),anahtar=crypto.createHash('sha256').update(b.ip+'|'+b.cihaz).digest('hex').slice(0,16);
 if(Date.now()-(son.get(anahtar)||0)<10*60e3)return;son.set(anahtar,Date.now());if(son.size>200)son.clear();
 const {data}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','admin_giris').maybeSingle();
 const l=Array.isArray(data?.deger?.liste)?data.deger.liste:[],simdi=new Date().toISOString();
 const konum=(b.sehir||'?')+'/'+(b.ulke||'?'),biliniyor=x=>x.konum===konum&&x.cihaz===b.cihaz;
 const eski=l.find(biliniyor),ilk=!l.length;
 const yeni=eski?l.map(x=>biliniyor(x)?{...x,son:simdi,ip:b.ip}:x):[{konum,cihaz:b.cihaz,ip:b.ip,ilk:simdi,son:simdi},...l].slice(0,30);
 await adminSb.from('sistem_ayarlari').upsert({anahtar:'admin_giris',deger:{liste:yeni}},{onConflict:'anahtar'});
 if(!eski&&!ilk){const {adminIs}=await import('./adminIs');
  await adminIs({tur:'guvenlik',anahtar:'giris:'+konum+':'+b.cihaz,baslik:'Admin paneline yeni yerden giriş'+(b.ulke&&b.ulke!=='TR'?' (YURT DIŞI: '+b.ulke+')':''),
   detay:`Konum: ${b.sehir||'bilinmiyor'}, ${b.ulke||'?'}\nCihaz: ${b.cihaz}\nIP: ${b.ip}\nSen değilsen hemen: Admin → Genel bakış → Güvenlik → "Bütün oturumları kapat", sonra Google şifreni değiştir.`});}}catch{}}
// Admin e-postasıyla ama Google'sız / 2 adımlı kod olmadan erişim denemesi
export async function adminSupheli(req,neden){try{const b=istekBilgi(req),{adminIs}=await import('./adminIs');
 await adminIs({tur:'guvenlik',anahtar:'supheli:'+b.ip+':'+new Date().toISOString().slice(0,10),baslik:'Admin hesabına şüpheli erişim denemesi',
  detay:`${neden}\nKonum: ${b.sehir||'?'}, ${b.ulke||'?'} · Cihaz: ${b.cihaz} · IP: ${b.ip}\nBu sen değilsen şifren başkasında olabilir: Google şifreni değiştir ve "Bütün oturumları kapat"a bas.`});}catch{}}
export async function adminGirisListe(){const {data}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','admin_giris').maybeSingle();return data?.deger?.liste||[];}
