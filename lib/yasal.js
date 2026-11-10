// Yasal metinler. Şirket bilgileri Vercel ortam değişkenlerinden gelir (FIRMA_UNVAN, FIRMA_ADRES, FIRMA_VERGI, FIRMA_EPOSTA, FIRMA_TEL, FIRMA_SEHIR).
// Bu metinler genel bir şablondur; şirket kurulduktan sonra bir avukat veya mali müşavire kontrol ettirilmelidir.
const E = process.env;
const BOS = '[şirket kuruluşu tamamlanınca güncellenecektir]';
export const firma = () => ({
  unvan: E.FIRMA_UNVAN || 'Dinlio AI', adres: E.FIRMA_ADRES || BOS, vergi: E.FIRMA_VERGI || BOS,
  eposta: E.FIRMA_EPOSTA || BOS, tel: E.FIRMA_TEL || E.NEXT_PUBLIC_DESTEK_WHATSAPP || BOS, sehir: E.FIRMA_SEHIR || 'İstanbul',
});
const TARIH = '10 Kasım 2026';
const kimlik = f => `<p><b>Veri sorumlusu / hizmet sağlayıcı:</b> ${f.unvan}<br><b>Adres:</b> ${f.adres}<br><b>Vergi dairesi / no:</b> ${f.vergi}<br><b>E-posta:</b> ${f.eposta}<br><b>Telefon:</b> ${f.tel}</p>`;

export const SAYFALAR = {
  kvkk: { baslik: 'KVKK Aydınlatma Metni', govde: f => `
<p>Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu’nun (“KVKK”) 10. maddesi uyarınca, ${f.unvan} (“Dinlio AI”) tarafından işlenen kişisel veriler hakkında sizi bilgilendirmek için hazırlanmıştır.</p>
${kimlik(f)}
<h2>1. Kimlerin verisini işliyoruz?</h2>
<ul><li><b>Site ziyaretçileri ve talep formunu dolduranlar:</b> Bu verilerin veri sorumlusu Dinlio AI’dır.</li>
<li><b>Hizmet alan işletmeler ve yetkilileri:</b> Hesap ve sözleşme verilerinin veri sorumlusu Dinlio AI’dır.</li>
<li><b>Hizmet alan işletmeleri telefonla arayan kişiler:</b> Bu görüşmelerin veri sorumlusu, aradığınız <b>işletmedir</b>. Dinlio AI, işletme adına ve onun talimatıyla <b>veri işleyen</b> olarak hareket eder.</li></ul>
<h2>2. Hangi verileri işliyoruz?</h2>
<ul><li><b>Talep formu:</b> ad soyad, işletme adı, telefon, e-posta, şehir, işletme türü, not.</li>
<li><b>İşletme hesabı:</b> kullanıcı adı, işletme bilgileri, paket ve kullanım bilgileri, ödeme kayıtları, giriş kayıtları.</li>
<li><b>Arayan kişiler:</b> arayan telefon numarası, görüşmenin ses kaydı ve yazıya dökümü, görüşmede söylenen ad, adres, sipariş, randevu ve benzeri bilgiler, adres tarifinden bulunan yaklaşık konum, arama tarihi ve süresi.</li></ul>
<h2>3. Hangi amaçlarla ve hangi hukuki sebeplere dayanarak?</h2>
<ul><li>Telefon görüşmelerinin yapay zeka asistanıyla karşılanması, sipariş, rezervasyon ve randevu taleplerinin işletmeye iletilmesi (KVKK m.5/2-c: sözleşmenin kurulması ve ifası; işletme adına).</li>
<li>Talep formuna dönüş yapılması, teklif ve sözleşme süreçleri (m.5/2-c).</li>
<li>Faturalandırma, muhasebe ve yasal yükümlülükler (m.5/2-ç).</li>
<li>Hizmet kalitesinin ölçülmesi, hataların giderilmesi, güvenlik ve kötüye kullanımın önlenmesi (m.5/2-f: meşru menfaat).</li></ul>
<h2>4. Veriler kimlere ve hangi ülkelere aktarılır?</h2>
<p>Hizmetin teknik olarak sunulabilmesi için veriler, gerekli olduğu ölçüde şu hizmet sağlayıcılarla paylaşılır: sesli asistan altyapısı (Vapi, ABD), yapay zeka ile metin işleme (Google Gemini, ABD), veritabanı ve barındırma (Supabase ve Vercel; sunucular yurt dışında bulunabilir), harita ve konum hizmetleri (OpenStreetMap, Yandex), telefon hattı sağlayıcıları. Bu aktarımlar KVKK m.9 kapsamında, gerektiğinde standart sözleşmeler veya ilgili kişinin açık rızası ile yapılır. Veriler ayrıca kanunen yetkili kamu kurumlarına, talep halinde aktarılabilir. Veriler hiçbir şekilde reklam amaçlı satılmaz.</p>
<h2>5. Toplama yöntemi</h2><p>Veriler; internet sitemizdeki formlar, işletme paneli ve hizmet alan işletmelerin telefon hatlarına gelen görüşmeler aracılığıyla elektronik ortamda, otomatik yollarla toplanır.</p>
<h2>6. Saklama süresi</h2><p>Görüşme kayıtları ve dökümleri işletme hesabı açık olduğu sürece, en fazla 1 yıl saklanır; işletme daha önce silebilir. Hesap ve fatura kayıtları yasal saklama süreleri boyunca (Vergi Usul Kanunu ve Türk Ticaret Kanunu uyarınca 10 yıla kadar) saklanır. Süre dolunca veriler silinir, yok edilir veya anonim hale getirilir.</p>
<h2>7. Haklarınız (KVKK m.11)</h2>
<p>Kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, amacını öğrenme, aktarıldığı kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini, KVKK m.7 şartlarıyla silinmesini veya yok edilmesini isteme, bu işlemlerin aktarıldığı kişilere bildirilmesini isteme, otomatik sistemlerle analiz sonucu aleyhinize bir sonuca itiraz etme ve kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme haklarına sahipsiniz.</p>
<p>Başvurularınızı yukarıdaki e-posta adresine yazılı olarak iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz sonuçlandırılır. Bir işletmeyi aradığınız görüşmelerle ilgili talepleriniz için öncelikle o işletmeye başvurmanız gerekir; Dinlio AI işletmeye gereken desteği sağlar.</p>` },

  gizlilik: { baslik: 'Gizlilik ve Çerez Politikası', govde: f => `
${kimlik(f)}
<h2>1. Genel</h2><p>Dinlio AI, kişisel verilerinizin gizliliğine önem verir. Kişisel verilerin nasıl işlendiğine dair ayrıntılar <a href="/yasal/kvkk">KVKK Aydınlatma Metni</a>’nde yer alır.</p>
<h2>2. Çerezler ve yerel depolama</h2>
<p>Sitemizde reklam veya takip çerezi kullanmıyoruz. Yalnızca şu zorunlu teknolojiler kullanılır:</p>
<ul><li><b>Oturum bilgisi:</b> İşletme paneline giriş yaptığınızda oturumunuzu açık tutmak için tarayıcınızın yerel depolamasına bir oturum anahtarı kaydedilir.</li>
<li><b>Tercihler:</b> Bildirim sesi gibi panel tercihleriniz tarayıcınızda saklanır.</li>
<li><b>Yazı tipleri:</b> Sayfaların görünümü için yazı tipleri Google Fonts üzerinden yüklenebilir; bu sırada IP adresiniz Google’a iletilebilir.</li></ul>
<p>Bu kayıtlar sitenin çalışması için zorunludur. Tarayıcı ayarlarınızdan silebilirsiniz; bu durumda panelden çıkış yapılmış olur.</p>
<h2>3. Güvenlik</h2><p>Veriler şifreli bağlantı (HTTPS) üzerinden iletilir. Erişim yetkileri sınırlandırılmıştır, her işletme yalnızca kendi verisini görebilir. Şifreler açık metin olarak saklanmaz.</p>
<h2>4. Çağrı kaydı</h2><p>Hizmet alan işletmeleri aradığınızda görüşme, hizmetin sunulması ve kalitesi için yapay zeka asistanı tarafından kaydedilir ve yazıya dökülür. Asistan görüşmenin başında bu konuda bilgi verir.</p>
<h2>5. Değişiklikler</h2><p>Bu politika güncellenebilir. Güncel metin her zaman bu sayfada yayımlanır.</p>` },

  sozlesme: { baslik: 'Hizmet Sözleşmesi ve Kullanım Şartları', govde: f => `
${kimlik(f)}
<p>Bu sözleşme, ${f.unvan} (“Hizmet Sağlayıcı”) ile Dinlio AI hizmetini satın alan işletme (“Müşteri”) arasında, hizmetin kullanım şartlarını düzenler. Müşteri, hizmeti kullanmaya başlayarak bu şartları kabul etmiş sayılır. Hizmet ticari işletmelere yöneliktir.</p>
<h2>1. Hizmetin konusu</h2><p>Müşterinin telefon hattına gelen ve Müşteri tarafından Dinlio AI hattına yönlendirilen aramaların yapay zeka asistanı tarafından karşılanması; sipariş, rezervasyon, randevu ve benzeri bilgilerin alınarak işletme paneline aktarılması; paketine göre fiyat listesi, maliyet takibi ve bildirim gibi ek özellikler.</p>
<h2>2. Paketler, dakika ve ücret</h2>
<ul><li>Paketler aylık konuşma dakikasına göre belirlenir. Fiyatlar sitede ABD doları cinsinden ve KDV hariç gösterilir; fatura, ödeme günündeki T.C. Merkez Bankası döviz satış kuru üzerinden Türk lirası olarak düzenlenir.</li>
<li>Ücret her dönem başında peşin ödenir. Kullanılmayan dakikalar bir sonraki aya devretmez.</li>
<li>Aylık dakika dolduğunda asistan devre dışı kalır ve aramalar Müşterinin belirlediği yönlendirme numarasına aktarılır. Yeni dönem başladığında veya ek paket alındığında asistan yeniden devreye girer.</li>
<li>Kampanya fiyatları sitede belirtilen tarihe kadar geçerlidir. Kampanya döneminde başlayan Müşteriler, aboneliği kesintisiz sürdüğü müddetçe kampanya fiyatıyla devam eder.</li></ul>
<h2>3. Müşterinin yükümlülükleri</h2>
<ul><li>Müşteri, kendisini arayan kişilere ait verilerin <b>veri sorumlusudur</b>. Arayanları, görüşmenin yapay zeka asistanıyla yapıldığı ve kaydedildiği konusunda bilgilendirmek (asistanın açılış cümlesi bu amaca hizmet eder) ve gerekiyorsa kendi aydınlatma yükümlülüğünü yerine getirmek Müşterinin sorumluluğundadır.</li>
<li>Panelde girilen menü, fiyat, çalışma saati ve hizmet bilgilerinin doğruluğundan Müşteri sorumludur. Asistan bu bilgileri esas alarak konuşur.</li>
<li>Hesap bilgilerini gizli tutmak ve hizmeti hukuka aykırı amaçlarla kullanmamak Müşterinin yükümlülüğüdür.</li></ul>
<h2>4. Veri işleme (veri işleyen sıfatıyla)</h2>
<ul><li>Hizmet Sağlayıcı, arayan kişilere ait verileri yalnızca Müşterinin talimatı doğrultusunda ve hizmetin sunulması amacıyla işler, başka amaçla kullanmaz ve satmaz.</li>
<li>Verilerin güvenliği için makul teknik ve idari tedbirleri alır; erişimi yetkili kişilerle sınırlar.</li>
<li>Hizmetin teknik altyapısı için alt hizmet sağlayıcılar (sesli asistan, yapay zeka, barındırma, harita) kullanılır; bunların listesi KVKK Aydınlatma Metni’nde yer alır. Müşteri bu aktarımlara onay verir.</li>
<li>Bir veri ihlali fark edilirse Müşteriye gecikmeksizin bildirilir. Sözleşme sona erdiğinde Müşterinin talebiyle veriler silinir veya Müşteriye teslim edilir.</li></ul>
<h2>5. Hizmet seviyesi ve sorumluluk</h2>
<ul><li>Hizmet Sağlayıcı hizmetin kesintisiz ve hatasız çalışması için makul çabayı gösterir. Yapay zeka asistanı insan gibi konuşsa da zaman zaman yanlış anlayabilir; bu nedenle önemli siparişler panelde ve görüşme kaydında kontrol edilmelidir.</li>
<li>İnternet, telefon operatörü veya üçüncü taraf hizmet sağlayıcılardan kaynaklanan kesintilerden ve mücbir sebeplerden Hizmet Sağlayıcı sorumlu değildir.</li>
<li>Hizmet Sağlayıcının bu sözleşmeden doğan toplam sorumluluğu, zarar tarihinden önceki son bir ayda Müşterinin ödediği hizmet bedeli ile sınırlıdır. Kâr kaybı ve dolaylı zararlardan sorumluluk kabul edilmez.</li></ul>
<h2>6. Süre, iptal ve iade</h2>
<ul><li>Sözleşme aylık olarak yenilenir. Müşteri dilediği zaman, bir sonraki dönem başlamadan önce yazılı olarak (e-posta veya WhatsApp) bildirerek aboneliği sona erdirebilir.</li>
<li>Başlamış dönemin ücreti iade edilmez. Hizmet Sağlayıcıdan kaynaklanan ve 48 saati aşan kesintilerde, kesinti süresine denk gelen tutar bir sonraki faturadan düşülür.</li>
<li>Ödemenin yapılmaması veya bu şartlara aykırılık halinde Hizmet Sağlayıcı hizmeti askıya alabilir veya sözleşmeyi feshedebilir.</li></ul>
<h2>7. Diğer</h2>
<ul><li>Hizmet Sağlayıcı bu şartları güncelleyebilir; değişiklikler sitede yayımlanır ve önemli değişiklikler Müşteriye bildirilir.</li>
<li>Uyuşmazlıklarda Türk hukuku uygulanır, ${f.sehir} mahkemeleri ve icra daireleri yetkilidir.</li></ul>` },
};
export function sayfaHtml(anahtar) {
  const s = SAYFALAR[anahtar]; if (!s) return null; const f = firma();
  const menu = Object.entries(SAYFALAR).map(([k, v]) => `<a href="/yasal/${k}"${k === anahtar ? ' class="on"' : ''}>${v.baslik}</a>`).join('');
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${s.baslik} | Dinlio AI</title><meta name="robots" content="index,follow">
<style>:root{color-scheme:dark}body{margin:0;background:#050505;color:#e9e9ee;font:16px/1.65 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}a{color:#ff4d63}.w{max-width:820px;margin:0 auto;padding:28px 18px 80px}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:26px}header .b{color:#fff;text-decoration:none;font-weight:800;font-size:20px}header .b i{color:#ff1f3d;font-style:normal}
nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:26px}nav a{border:1px solid #2a2a30;border-radius:99px;padding:7px 13px;text-decoration:none;color:#cfcfd6;font-size:14px}nav a.on{border-color:#ff1f3d;color:#fff;box-shadow:0 0 14px rgba(255,31,61,.35)}
h1{font-size:clamp(28px,6vw,40px);line-height:1.15;margin:0 0 6px;color:#fff}h2{font-size:19px;margin:28px 0 8px;color:#fff}.t{color:#8e8e98;font-size:14px;margin-bottom:22px}ul{padding-left:20px}li{margin:6px 0}p{margin:10px 0}
footer{margin-top:40px;color:#8e8e98;font-size:13px;border-top:1px solid #1d1d22;padding-top:16px}</style></head><body><div class="w">
<header><a class="b" href="/"><i>◎</i> Dinlio AI</a><a href="/">Ana sayfaya dön</a></header><nav>${menu}</nav>
<h1>${s.baslik}</h1><div class="t">Son güncelleme: ${TARIH}</div>${s.govde(f)}
<footer>Sorularınız için: ${f.eposta}${f.tel !== BOS ? ' · ' + f.tel : ''}</footer></div></body></html>`;
}
