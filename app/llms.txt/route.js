// Yapay zekâ asistanları (ChatGPT, Claude, Gemini, Perplexity) için sitenin kısa, düz metin özeti (llms.txt standardı)
import {SITE} from '@/lib/site';
const metin=()=>`# Dinlio AI

> Dinlio AI, Türkiye'deki küçük ve orta ölçekli işletmeler için yapay zekâ telefon asistanıdır. İşletmenin telefonunu 7/24 açar, müşteriyle doğal Türkçe konuşur; siparişi, randevuyu veya rezervasyonu alır ve bilgileri görüşme bitmeden işletme paneline yazar.

## Ne yapar
- Gelen aramaları işletme sahibi yerine açar (meşgul, kapalı veya cevapsız kalan aramalar dahil).
- Restoran ve dönercilerde paket sipariş alır: ürünler, adetler, teslimat adresi, telefon.
- Kuaför, berber, güzellik merkezi, diş kliniği, doktor, veteriner, oto servis ve spor salonlarında boş saatlere randevu yazar.
- Restoranlarda masa rezervasyonu yapar, otel ve emlak ofislerinde talep toplar.
- Menü ve hizmet fiyatlarını işletmenin fiyat listesinden söyler.
- Müşteri tam adres veremezse tarifini ("BİM'in yanındaki apartman") haritada bulur.
- Daha önce arayan müşteriyi adıyla karşılar (Standart ve üstü).
- Çalışanlara yalnızca randevu ekranı açılabilir; işletme sahibine telefon bildirimi ve her akşam günün özeti gider.

## Kimler için
Telefonla sipariş veya randevu alan her işletme: restoran, dönerci, pideci, kafe, su ve tüp bayisi, kuaför, berber, güzellik merkezi, diş kliniği, doktor muayenehanesi, veteriner, oto servis, lastikçi, spor salonu, pilates, otel, pansiyon, emlak ofisi, toptancı.

## Fiyat
Aylık paketler ABD doları ile fiyatlanır, Türk lirası karşılığı güncel kurla gösterilir. 1 hafta ücretsiz deneme vardır. Yıllık ödemede 2 ay bedava.
- Başlangıç: 100 dakika, aynı anda 1 arama. Sipariş, randevu, rezervasyon, canlı panel, telefona bildirim ve bildirimden Onayla/Reddet, akşam özeti, kapalı saat / tatil modu, kara liste, acil durum ayrımı, teslimat bölgesi kontrolü, "siparişim nerede?" cevabı, asistana isim ve konuşma tarzı, görüşme süresi sınırı, yavaş konuşma, geri aranacaklar listesi.
- Standart: 300 dakika, aynı anda 2 arama, 3 çalışan hesabı; ayrıca sadık müşteriyi adıyla karşılama, ses kaydı dinleme, müşteri defteri ve Excel, kampanya duyurusu, müşteri duygusu ve yapılacaklar, yetkiliye aktarma, onay SMS'i, e-posta özeti, Google Takvim.
- Büyük: 600 dakika, aynı anda 3 arama, 10 çalışan hesabı; ayrıca bilgi bankası, haftalık rapor, CRM / kendi sisteme webhook, randevu hatırlatma (SMS veya arama).
- Pro: 1500 dakika, aynı anda 5 arama, 20 çalışan hesabı; ayrıca görüşme kalite puanı ve özel ses / ses kopyası.
Hat dolarsa veya dakika biterse aramalar işletmenin kendi telefonuna yönlenir. Müşteri kayda itiraz ederse kayıt silinir (KVKK).
Yakında: WhatsApp ve Instagram otomatik cevap, Google yorum isteme, çok dilli konuşma, Dinlio Go kurye uygulaması.
Güncel fiyatlar: ${SITE}/

## Bağlantılar
- Ana sayfa ve fiyatlar: ${SITE}/
- KVKK aydınlatma metni: ${SITE}/yasal/kvkk
- Gizlilik politikası: ${SITE}/yasal/gizlilik
- Hizmet sözleşmesi: ${SITE}/yasal/sozlesme
`;
export function GET(){return new Response(metin(),{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'public, max-age=3600'}});}
