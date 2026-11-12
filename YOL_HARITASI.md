# Dinlio yol haritası (sonra eklenecekler)

Kullanıcıyla konuşulup "şimdi değil, sonra" denen özellikler. Paket kademeleri: lib/paket.js.

## Herkese (Başlangıç+)
- [x] Kapalı saat / tatil modu: kapalıyken farklı açılış ("yarın 9'da açılıyoruz, şimdiden alayım mı"), panelde "Bugün kapalıyım" tuşu
- [x] Kara liste: şaka/rahatsız eden numaralar asistana bağlanmaz (assist ucunda)

## Standart
- [x] Müşteri defteri: arayan herkes, arama sayısı, son talep, toplam sipariş, Excel indir
- [x] Kampanya duyurusu: panelden yazılan kampanyayı asistan uygun anda söyler
- [ ] Görüşme sırasında yetkiliye aktarma (Vapi transferCall; Netgsm gelince test, aktarılan dakika paketten düşsün)

## Büyük
- [x] Bilgi bankası (önce yazılı SSS, sonra PDF)
- [x] Haftalık rapor (pazartesi bildirimi: arama, sipariş, yoğun saat, yönlendirilen arama)
- [ ] Randevu hatırlatma araması (giden arama, Netgsm gerekli, sadece randevulu müşteri; İYS)
- [ ] İkinci dil (İngilizce / Arapça)

## Pro
- [x] Kalite puanı (Gemini görüşmeyi puanlar, kötüler kırmızı)
- [ ] Tüm diller, özel ses / ses kopyası, şube-departman yönlendirme

## Sonra düşünülecek fikirler
- [x] (web sürümü yayında: /go, takip /t/kod, panelde Dinlio Go kuryeleri kartı; APK ve arka plan konumu SIRADA) Kurye uygulaması **Dinlio Go** (PWA, ana ekrana eklenir): işletme paket başı ücret + davet kodu; sipariş gelince bağlı kuryelere push ("X'e sipariş geldi, teslim ücreti 60 ₺, 2,3 km"); ilk kabul eden alır; "Yemeği aldım" → Google Maps navigasyon, panelde Yolda; "Teslim ettim"; kurye günlük kazanç, işletme kurye başı paket sayısı. Para bizden geçmez. Dağıtım: işletme panelinde "Kurye ekle" QR'ı (davet kodu içinde) → Android: APK (GitHub Actions + Capacitor, arka plan GPS, imza anahtarı GitHub secrets'ta) / iPhone: PWA ana ekrana ekle. Kurye ekranı web sayfası olduğu için güncellemeler APK'sız gelir. Play Store YOK: dağıtım sadece GitHub Releases APK + QR.
  - KARAR: baştan APK (canlı konum için). Play Protect uyarısını azalt: güncel targetSdk, az izin, arka plan konum izni sadece teslimat başlayınca, hep aynı imza, gerekirse Google'a inceleme. 2027 geliştirici doğrulaması: öğrenci hesabı 20 cihaza kadar, fazlası için doğrulama (anne adına).
  - Müşteri takip linki: kurye "yemeği aldım" deyince müşteriye WhatsApp (wa.me, ücretsiz) veya SMS (Netgsm) ile link; sayfada canlı kurye konumu, tahmini varış, durum. Konum sadece teslimat sürerken paylaşılır, teslimde link kapanır. Sonra: serbest kurye havuzu (en yakına bildirim).
- [ ] Komisyonsuz sipariş sistemi (restoranın kendi sipariş sayfası, ödeme restoranın kendi iyzico/PayTR hesabına; şirket sonrası). Satış cümlesi: "Yemeksepeti komisyonunun yarısıyla telefonunu biz açalım".
- [ ] Sipariş / randevu onay SMS'i (Netgsm SMS)
- [x] Google yorum isteği (akşam SMS, Netgsm gelince çalışır)
- [ ] Bekleme listesi (dolu randevuda, iptal olunca sıradakine haber)
- [ ] Asistanın ses tonu seçimi (kadın/erkek, resmi/samimi)

## Alt marka: komisyonsuz sipariş uygulaması (isim seçilecek: Doyur / Kapıda / Sıcak / Paketle, TÜRKPATENT kontrolü)
- Dinlio kullanan restoranlar otomatik listelenir (menü/fiyat zaten sistemde). Adında "Dinlio" geçmez.
- Müşteri giriş kapısı: takip linki sayfasında "Komisyonsuz, işletmenin kendi fiyatına sipariş ver" çağrısı.
- Fiyat = işletmenin kendi fiyatı (telefonla aynı), uygulama komisyonu yok. Reklamda rakip adı geçmesin (karşılaştırmalı reklam riski).
- Ödeme: önce sadece kapıda (nakit / kuryenin POS'u); online kart şirket sonrası, restoranın kendi iyzico/PayTR hesabına.
- Siparişler Dinlio Go kuryelerine düşer. Açılış zamanı: Yalova'da 15-20 restoran Dinlio'dayken.
- Teslimat ücreti (işletme seçer): ücretsiz / sabit ücret / "X ₺ üstü ücretsiz" / mesafeye göre. Sepette açık döküm: Ürünler + Teslimat + "Uygulama komisyonu: 0 ₺" = Toplam. Rakip uygulamanın tahmini fiyatı gösterilmez.
- Kurye ücreti (Dinlio Go) müşterinin ödediği teslimat ücretinden ayrı: taban (~60 ₺) + km başı ek + gece/yağmur primi, işletme ayarlar. Türkiye ortalaması paket başı ~70 ₺ (Ocak 2026).
- Gelir sonra: öne çıkarma ücreti / küçük komisyon / Dinlio paketine dahil.

## Mesajlaşma (altyapı hazır: mesaj_kanallari, mesajlar tabloları, /api/mesaj/meta webhook; env META_VERIFY_TOKEN, META_APP_SECRET)
- [x] WhatsApp otomatik cevap (lib/mesajCevap.js, Meta hattı gelince çalışır)
- [ ] Instagram DM otomatik cevap
- [ ] Sipariş onay mesajı, randevu onayı/hatırlatma, "yolda" takip linki, bekleme listesi bildirimi
- [x] Google yorum isteme
- [ ] Kampanya mesajı (İYS)

## Rakiplerden alınacaklar (Kasım 2026 araştırması: Sesla, Sesera, Lidscope, buyur.co, CallTech, Sesvia, Callivo)
Hemen yapılabilir:
- [x] Görüşme süresi sınırı (dolunca kibar veda) — Callivo
- [x] Kayıt itirazında kaydı silme, ses kaydını kapatma seçeneği — Callivo, Sesera
- [x] Yavaş/net konuşma ayarı — Callivo
- [x] Asistana ad ve kişilik verme — Sesera
- [x] Teslimat bölgesi kontrolü (bölge dışını kibarca reddet) — Sesla
- [x] Acil / nöbetçi ayrımı (acil işi işaretle, öncelikli bildir) — Sesla
- [x] Duygu, niyet ve takip önerisi (çağrı sonu analiz) — CallTech
- [x] Bildirimde Onayla / Reddet tuşları (push action) — Lidscope'un WhatsApp onay akışının bizdeki karşılığı
- [x] Geri arama listesi (bilgi alınamayan / aktarılamayan aramalar) — Sesera
- [x] "Siparişim nerede?" cevabı — Sesera, Callivo
- [x] Çıkış webhook'u + API anahtarı: işletmenin kendi sistemine/CRM'ine çağrı verisi — buyur, CallTech, Sesera Dev
- [ ] Çok dil (en az İngilizce, Arapça, Almanca, Rusça) — Sesera 60 dil, buyur 30+
- [x] Yıllık ödeme indirimi — Sesla %25, Sesera %10
Dış hesap / onay gerekir (KOD HAZIR, anahtar eklenince açılır — admin > Sistem > Entegrasyonlar):
- [~] Giden arama: randevu teyidi/hatırlatma, kampanya + aranmak istemeyenler listesi (İYS) — Netgsm
- [~] SMS hatırlatma — Netgsm
- [~] Google / Outlook takvim — Google OAuth onayı
- [~] Ses klonlama — ElevenLabs maliyeti (Standart ve üstü)
- [ ] Bayi / ajans programı (white label) — Sesera, Lidscope
Önerilmeyen: sosyal medya içerik ve Meta reklam (Lidscope, Callivo), sürükle-bırak iş akışı editörü (Sesla), web sesli arama butonu.
Fiyat uyarısı: Sesera 499 ₺ / 150 dk (KDV dahil, ~3,3 ₺/dk) bizim Vapi maliyetimizin (~0,09 $/dk) altında; fiyatla değil sektöre özel özellikle (sipariş + adres + kurye) rekabet.

## Kararlar
- Web sitesi "Hemen ara" butonu: kullanıcı gereksiz buldu, fiyat kartından çıkarıldı.
- Kendi altyapı (Pipecat/LiveKit): Vapi faturası ayda ~1000-1500 $'ı geçince.
- Vapi eş zamanlı hat: 10 hat ilk ~10 restoran / 20-25 randevulu işletmeye yeter; "hat_dolu" kayıtları artınca hat al.

## Sıradaki işler (Kasım 2026)
- [ ] Dinlio Go APK (GitHub Actions + Capacitor, arka plan konumu, imza anahtarı)
- [ ] Bekleme listesi, çok dil, Instagram DM cevabı, komisyonsuz sipariş sayfası
- [ ] Netgsm gelince ilk gerçek aramada doğrula: ses hızı, kayıt kapatma, yetkiliye aktarma, giden arama
