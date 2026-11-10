// SON ÇARE: Yapay zeka hiç cevap vermezse konuşma metninden kurallarla kaba bir sipariş çıkarır.
// Menüdeki ürün adlarını ve adetleri, adres cümlesini, ismi ve telefon numarasını arar.
// Sonuç "tahmin" olarak işaretlenir; çağrı yine yeniden okunmak üzere bekletilir.
const SAYI = { yarım: .5, bir: 1, tek: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10 };
const YAYGIN = ['adana dürüm', 'urfa dürüm', 'tavuk dürüm', 'et dürüm', 'dürüm', 'döner', 'iskender', 'lahmacun', 'pide', 'pizza', 'hamburger', 'burger', 'tost', 'kumpir', 'köfte', 'çorba', 'pilav', 'salata', 'ayran', 'kola', 'gazoz', 'şalgam', 'su', 'çay', 'meyve suyu', 'patates'];
const kucuk = s => String(s || '').toLocaleLowerCase('tr-TR');
const sade = s => kucuk(s).replace(/[çğıöşü]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[c]));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function kuralla(transcript, menu = []) {
  const satir = String(transcript || '').split('\n').filter(l => /^(user|müşteri|customer)\s*:/i.test(l.trim())).map(l => l.replace(/^[^:]*:\s*/, ''));
  const metin = (satir.length ? satir : [String(transcript || '')]).join(' . ');
  const ms = sade(metin), out = {};
  // ürünler
  const adlar = [...new Set([...menu.map(m => m.name).filter(Boolean), ...YAYGIN])].sort((a, b) => b.length - a.length);
  const bulunan = []; let kalan = ms;
  for (const ad of adlar) {
    const a = sade(ad).trim(); if (a.length < 2) continue;
    const re = new RegExp(`(?:(\\d+|${Object.keys(SAYI).map(sade).join('|')})\\s+(?:tane\\s+|adet\\s+|porsiyon\\s+)?)?\\b${esc(a)}(?:[a-z]{0,4})\\b`, 'g');
    let m, n = 0;
    while ((m = re.exec(kalan))) { const q = m[1] ? (/^\d+$/.test(m[1]) ? +m[1] : SAYI[Object.keys(SAYI).find(k => sade(k) === m[1])] || 1) : 1; n += q; }
    if (n) { bulunan.push(`${n} ${menu.find(x => x.name === ad)?.name || ad}`); kalan = kalan.replace(new RegExp(`\\b${esc(a)}[a-z]{0,4}\\b`, 'g'), ' '); }
  }
  if (bulunan.length) out.orders = bulunan.join(', ');
  // adres
  const cumleler = metin.split(/[.!?]\s*/);
  const adr = cumleler.find(c => /(mahalle|mah\b|cadde|cad\b|sokak|sok\b|bulvar|apartman|apt\b|daire|site|blok|\bno\b|numara)/i.test(c) && c.length > 8);
  if (adr) out.address = adr.trim().slice(0, 200);
  // isim
  const isim = metin.match(/(?:[Aa]dım|[İi]smim|[Bb]enim adım)\s+([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)?)/);
  if (isim) out.customerName = isim[1];
  // telefon
  const tel = metin.replace(/[\s-]/g, '').match(/(?:\+?90)?0?5\d{9}/);
  if (tel) out.statedPhone = tel[0];
  return out;
}
