// HAFTALIK YEDEK: önemli tablolar sıkıştırılmış JSON olarak Supabase Storage'daki gizli "yedek" klasörüne yazılır, son 8 yedek tutulur.
// Admin panelinden indirilebilir (bilgisayarına da kopyası olsun diye). Gizli anahtarlar (Vapi şifresi, bildirim anahtarları,
// Google bağlantı anahtarları, webhook adresleri) yedeğe ALINMAZ: çalınsa bile işe yaramasın, geri yüklemede yeniden üretilir.
import {adminSb} from './admin';import zlib from 'zlib';
const KOVA='yedek';
export const TABLOLAR=['businesses','calls','appointments','reservations','menu_items','services','resources','calisanlar','musteri_izin','bekleme_listesi','dakika_siparisleri','business_requests','alerts','kuryeler','kurye_isletme','mesajlar','admin_isler','leads','verticals'];
const GIZLI_AYAR=['gizli','vapid'];
async function kovaHazir(){const {data}=await adminSb.storage.getBucket(KOVA);if(data)return;
 const {error}=await adminSb.storage.createBucket(KOVA,{public:false,fileSizeLimit:'50MB'});if(error&&!/exist/i.test(error.message))throw error;}
async function tabloOku(t){const satir=[];for(let i=0;i<200;i++){const {data,error}=await adminSb.from(t).select('*').range(i*1000,i*1000+999);
  if(error){if(/does not exist|schema cache/i.test(error.message))return null;throw new Error(t+': '+error.message);}satir.push(...data);if(data.length<1000)break;}return satir;}
export async function yedekAl(){await kovaHazir();const veri={surum:1,tarih:new Date().toISOString(),tablolar:{}},sayim={};
 for(const t of TABLOLAR){const r=await tabloOku(t);if(r){veri.tablolar[t]=t==='kuryeler'?r.map(({token_hash,...x})=>x):r;sayim[t]=r.length;}}
 const {data:ay}=await adminSb.from('sistem_ayarlari').select('*');veri.tablolar.sistem_ayarlari=(ay||[]).filter(x=>!GIZLI_AYAR.includes(x.anahtar));sayim.sistem_ayarlari=veri.tablolar.sistem_ayarlari.length;
 const gz=zlib.gzipSync(Buffer.from(JSON.stringify(veri)));const ad=`dinlio-yedek-${veri.tarih.slice(0,10)}.json.gz`;
 const {error}=await adminSb.storage.from(KOVA).upload(ad,gz,{contentType:'application/gzip',upsert:true});if(error)throw error;
 // en yeni 8 yedeği tut
 const {data:l}=await adminSb.storage.from(KOVA).list('',{limit:100,sortBy:{column:'name',order:'desc'}});
 const eski=(l||[]).filter(x=>x.name.startsWith('dinlio-yedek-')).slice(8).map(x=>x.name);if(eski.length)await adminSb.storage.from(KOVA).remove(eski);
 await adminSb.from('sistem_ayarlari').upsert({anahtar:'son_yedek',deger:{tarih:veri.tarih,dosya:ad,boyut:gz.length,sayim}},{onConflict:'anahtar'});
 return {dosya:ad,boyut:gz.length,sayim};}
export async function yedekListe(){await kovaHazir();const {data}=await adminSb.storage.from(KOVA).list('',{limit:50,sortBy:{column:'name',order:'desc'}});
 return (data||[]).filter(x=>x.name.startsWith('dinlio-yedek-')).map(x=>({ad:x.name,boyut:x.metadata?.size||0}));}
export async function yedekLink(ad){if(!/^dinlio-yedek-\d{4}-\d{2}-\d{2}\.json\.gz$/.test(String(ad)))throw new Error('Geçersiz dosya');
 const {data,error}=await adminSb.storage.from(KOVA).createSignedUrl(ad,120,{download:true});if(error)throw error;return data.signedUrl;}
