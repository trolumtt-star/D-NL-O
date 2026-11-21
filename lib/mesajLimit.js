// OTOMATİK MESAJ CEVABI SINIRI (WhatsApp/Instagram): Standart 1.000, Büyük 3.000, Pro sınırsız (adil kullanım 20.000) / ay.
// Sayılan: sadece asistanın yazdığı otomatik cevaplar (mesajlar.oto). İşletmenin elle yazdıkları sayılmaz.
// Ek mesaj: settings.ek_mesaj={ay:'2026-11',adet:1000} (o ay için geçerli; ileride ek paket satışıyla doldurulur).
import {adminSb} from './admin';import {paketOf} from './paket';
export const buAy=()=>new Date(Date.now()+3*36e5).toISOString().slice(0,7);      // Türkiye saatine göre ay
const ayBasi=()=>{const a=buAy();return new Date(a+'-01T00:00:00+03:00').toISOString();};
export async function mesajDurum(b){const pk=paketOf(b),ek=b.settings?.ek_mesaj?.ay===buAy()?Math.max(0,+b.settings.ek_mesaj.adet||0):0,limit=(pk.mesajLimit||0)+ek;
 const {count}=await adminSb.from('mesajlar').select('id',{count:'exact',head:true}).eq('business_id',b.id).eq('oto',true).gte('created_at',ayBasi());
 const kullanilan=count||0;return {limit,kullanilan,kalan:Math.max(0,limit-kullanilan),sinirsiz:pk.id==='p'};}
