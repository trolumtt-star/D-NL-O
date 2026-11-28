// KAPASİTE İZLEME: Supabase veritabanı/depolama doluluğu, Vapi aynı anda çağrı zirvesi, Vercel planı.
// Plan sınırları Admin'den seçilir (sistem_ayarlari 'kapasite'). %70'te sarı, %90'da kırmızı uyarı; %80 üstü Yapılacaklar'a + telefona düşer.
// Not: Vercel kullanımını (istek sayısı vb.) buradan ölçemiyoruz; onun için Vercel panelindeki Usage sayfasına bakılmalı.
import {adminSb} from './admin';
export const SB_PLAN={free:{ad:'Ücretsiz',db:500e6,depo:1e9,mau:50000},pro:{ad:'Pro ($25)',db:8e9,depo:100e9,mau:100000}};
export const VARSAYILAN={supabase:'free',vercel:'hobby',vapiKanal:10};
export async function kapasiteAyar(){const {data}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','kapasite').maybeSingle();return {...VARSAYILAN,...(data?.deger||{})};}
const mb=b=>b>=1e9?(b/1e9).toFixed(2)+' GB':Math.round(b/1e6)+' MB';
export async function kapasiteOlc(){
 const [{data:o,error},ay,{data:g}]=await Promise.all([adminSb.rpc('kapasite_olcum'),kapasiteAyar(),adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','kapasite_gecmis').maybeSingle()]);
 if(error)throw error;const sp=SB_PLAN[ay.supabase]||SB_PLAN.free,gecmis=Array.isArray(g?.deger?.l)?g.deger.l:[];
 // günlük büyüme hızı (son 30 günün ilk ve son ölçümü)
 const eski=gecmis.find(x=>Date.now()-x.t<31*864e5),gunluk=eski&&Date.now()-eski.t>3*864e5?Math.max(0,(o.db_bayt-eski.db)/((Date.now()-eski.t)/864e5)):null;
 const kalanGun=gunluk>0?Math.floor((sp.db-o.db_bayt)/gunluk):null;
 const k=[
  {id:'db',ad:'Supabase veritabanı',yuzde:o.db_bayt/sp.db*100,detay:`${mb(o.db_bayt)} / ${mb(sp.db)} (${sp.ad})`+(kalanGun!==null?` · bu hızla ~${kalanGun} günde dolar`:'')+` · arama metinleri ${mb(o.metin_bayt)}`,cozum:'Supabase → Settings → Billing → Pro plana geç, sonra burada planı "Pro" seç. Ya da eski arama metinlerini sildir.'},
  {id:'depo',ad:'Supabase dosya depolama (yedekler)',yuzde:o.depo_bayt/sp.depo*100,detay:`${mb(o.depo_bayt)} / ${mb(sp.depo)}`,cozum:'Supabase planını yükselt ya da eski yedekleri sil.'},
  {id:'mau',ad:'Supabase aylık aktif kullanıcı',yuzde:o.kullanici_30g/sp.mau*100,detay:`${o.kullanici_30g} / ${sp.mau.toLocaleString('tr-TR')}`,cozum:'Supabase planını yükselt.'},
  {id:'kanal',ad:'Vapi aynı anda çağrı (son 30 gün zirvesi)',yuzde:o.esz_zirve_30g/Math.max(1,ay.vapiKanal)*100,detay:`zirve ${o.esz_zirve_30g} çağrı / ${ay.vapiKanal} kanal`,cozum:'Vapi → Billing → ek eşzamanlı çağrı kanalı al, sonra burada kanal sayısını güncelle. Sınır aşılınca fazla çağrılar işletmenin kendi telefonuna düşer.'}];
 if(ay.vercel!=='pro')k.push({id:'vercel',ad:'Vercel planı',yuzde:o.ucretli_isletme>0?100:o.aktif_isletme>0?75:0,detay:'Ücretsiz (Hobby) plan ticari kullanım için değil'+(o.ucretli_isletme?` · ${o.ucretli_isletme} ücretli işletme var`:''),cozum:'Vercel → Settings → Billing → Pro ($20/ay). Sonra burada planı "Pro" seç.'});
 for(const x of k)x.yuzde=Math.min(100,Math.round(x.yuzde*10)/10);
 return {olcum:o,ayar:ay,kalemler:k,gunluk};}
// Günlük cron: ölçümü kaydet, %80 üstünü admin'e bildir
export async function kapasiteKontrol(){try{const r=await kapasiteOlc(),{adminIs,adminIsKapat}=await import('./adminIs');
 const {data:g}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','kapasite_gecmis').maybeSingle();
 const l=[...(Array.isArray(g?.deger?.l)?g.deger.l:[]).filter(x=>Date.now()-x.t<60*864e5),{t:Date.now(),db:r.olcum.db_bayt}].slice(-90);
 await adminSb.from('sistem_ayarlari').upsert({anahtar:'kapasite_gecmis',deger:{l}},{onConflict:'anahtar'});
 for(const x of r.kalemler){const an='kapasite:'+x.id;
  if(x.yuzde>=80)await adminIs({tur:'guvenlik',anahtar:an+':'+(x.yuzde>=90?'kritik':'uyari'),baslik:`${x.yuzde>=90?'🔴 SİSTEM ÇÖKEBİLİR':'🟡 Kapasite dolmak üzere'}: ${x.ad} %${x.yuzde}`,detay:x.detay+'\n'+x.cozum});
  else{await adminIsKapat(an+':uyari');await adminIsKapat(an+':kritik');}}
 return r;}catch(e){return {hata:String(e?.message||e)};}}
