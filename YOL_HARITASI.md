# Dinlio yol haritası (sonra eklenecekler)

Kullanıcıyla konuşulup "şimdi değil, sonra" denen özellikler. Paket kademeleri: lib/paket.js.

## Herkese (Başlangıç+)
- [ ] Kapalı saat / tatil modu: kapalıyken farklı açılış ("yarın 9'da açılıyoruz, şimdiden alayım mı"), panelde "Bugün kapalıyım" tuşu
- [ ] Kara liste: şaka/rahatsız eden numaralar asistana bağlanmaz (assist ucunda)

## Standart
- [ ] Müşteri defteri: arayan herkes, arama sayısı, son talep, toplam sipariş, Excel indir
- [ ] Kampanya duyurusu: panelden yazılan kampanyayı asistan uygun anda söyler
- [ ] Görüşme sırasında yetkiliye aktarma (Vapi transferCall; Netgsm gelince test, aktarılan dakika paketten düşsün)

## Büyük
- [ ] Bilgi bankası (önce yazılı SSS, sonra PDF)
- [ ] Haftalık rapor (pazartesi bildirimi: arama, sipariş, yoğun saat, yönlendirilen arama)
- [ ] Randevu hatırlatma araması (giden arama, Netgsm gerekli, sadece randevulu müşteri; İYS)
- [ ] İkinci dil (İngilizce / Arapça)

## Pro
- [ ] Kalite puanı (Gemini görüşmeyi puanlar, kötüler kırmızı)
- [ ] Tüm diller, özel ses / ses kopyası, şube-departman yönlendirme

## Sonra düşünülecek fikirler
- [ ] Kurye uygulaması **Dinlio Go** (PWA, ana ekrana eklenir): işletme paket başı ücret + davet kodu; sipariş gelince bağlı kuryelere push ("X'e sipariş geldi, teslim ücreti 60 ₺, 2,3 km"); ilk kabul eden alır; "Yemeği aldım" → Google Maps navigasyon, panelde Yolda; "Teslim ettim"; kurye günlük kazanç, işletme kurye başı paket sayısı. Para bizden geçmez. Dağıtım: işletme panelinde "Kurye ekle" QR'ı (davet kodu içinde) → Android: APK (GitHub Actions + Capacitor, arka plan GPS, imza anahtarı GitHub secrets'ta) / iPhone: PWA ana ekrana ekle. Kurye ekranı web sayfası olduğu için güncellemeler APK'sız gelir. İleride Play Store (25 $, 18+ hesap). Sonra: serbest kurye havuzu (en yakına bildirim).
- [ ] Komisyonsuz sipariş sistemi (restoranın kendi sipariş sayfası, ödeme restoranın kendi iyzico/PayTR hesabına; şirket sonrası). Satış cümlesi: "Yemeksepeti komisyonunun yarısıyla telefonunu biz açalım".
- [ ] Sipariş / randevu onay SMS'i (Netgsm SMS)
- [ ] Google yorum isteği (randevudan sonra link)
- [ ] Bekleme listesi (dolu randevuda, iptal olunca sıradakine haber)
- [ ] Asistanın ses tonu seçimi (kadın/erkek, resmi/samimi)

## Kararlar
- Web sitesi "Hemen ara" butonu: kullanıcı gereksiz buldu, fiyat kartından çıkarılabilir.
- Kendi altyapı (Pipecat/LiveKit): Vapi faturası ayda ~1000-1500 $'ı geçince.
- Vapi eş zamanlı hat: 10 hat ilk ~10 restoran / 20-25 randevulu işletmeye yeter; "hat_dolu" kayıtları artınca hat al.
