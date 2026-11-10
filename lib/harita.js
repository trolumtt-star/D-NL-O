// HARİTA: müşterinin tarifinden (mahalle + "BİM'in yanındaki eczane" gibi yerler) konum bulur.
// Önce Yandex (YANDEX_API_KEY / YANDEX_GEOCODER_KEY / YANDEX_PLACES_KEY), olmazsa OpenStreetMap (ücretsiz).
const UA = { 'user-agent': 'DinlioAI/1.0 (+https://dinlio.vercel.app)', 'accept-language': 'tr' };
const T = ms => AbortSignal.timeout(ms);
const GKEY = () => process.env.YANDEX_GEOCODER_KEY || process.env.YANDEX_API_KEY || '';
const PKEY = () => process.env.YANDEX_PLACES_KEY || process.env.YANDEX_API_KEY || '';
const R = Math.PI / 180;
export const mesafe = (a, b) => { const d1 = (b.lat - a.lat) * R, d2 = (b.lng - a.lng) * R, x = Math.sin(d1 / 2) ** 2 + Math.cos(a.lat * R) * Math.cos(b.lat * R) * Math.sin(d2 / 2) ** 2; return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))); };
const temiz = s => String(s || '').replace(/[<>"]/g, '').trim().slice(0, 120);

// ---------- adres -> nokta
export async function adresBul(metin, yakin = null) {
  const q = temiz(metin); if (!q) return null;
  if (GKEY()) try {
    const u = new URL('https://geocode-maps.yandex.ru/1.x/'); u.search = new URLSearchParams({ apikey: GKEY(), geocode: q, format: 'json', lang: 'tr_TR', results: '1', ...(yakin ? { ll: `${yakin.lng},${yakin.lat}`, spn: '0.3,0.3' } : {}) });
    const j = await (await fetch(u, { signal: T(5000) })).json(); const g = j?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    if (g) { const [lng, lat] = g.Point.pos.split(' ').map(Number); return { lat, lng, ad: g.metaDataProperty?.GeocoderMetaData?.text || q, kaynak: 'yandex' }; }
  } catch { }
  try {
    const u = new URL('https://nominatim.openstreetmap.org/search'); u.search = new URLSearchParams({ q, format: 'jsonv2', limit: '1', countrycodes: 'tr', ...(yakin ? { viewbox: `${yakin.lng - .25},${yakin.lat + .25},${yakin.lng + .25},${yakin.lat - .25}`, bounded: '1' } : {}) });
    const j = await (await fetch(u, { headers: UA, signal: T(6000) })).json();
    if (j?.[0]) return { lat: +j[0].lat, lng: +j[0].lon, ad: j[0].display_name, kaynak: 'osm' };
  } catch { }
  return null;
}
// ---------- nokta -> sokak adı
export async function sokakBul(p) {
  if (GKEY()) try {
    const u = new URL('https://geocode-maps.yandex.ru/1.x/'); u.search = new URLSearchParams({ apikey: GKEY(), geocode: `${p.lng},${p.lat}`, kind: 'street', format: 'json', lang: 'tr_TR', results: '1' });
    const j = await (await fetch(u, { signal: T(4000) })).json(); const g = j?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject; if (g) return g.name;
  } catch { }
  try {
    const u = new URL('https://nominatim.openstreetmap.org/reverse'); u.search = new URLSearchParams({ lat: p.lat, lon: p.lng, format: 'jsonv2', zoom: '17' });
    const j = await (await fetch(u, { headers: UA, signal: T(5000) })).json(); return j?.address?.road || j?.address?.pedestrian || null;
  } catch { return null; }
}
// ---------- yakındaki yerler (eczane, BİM, cami, okul...)
const OSM = [ // tarifte geçen kelime -> OpenStreetMap etiketi (küçük harfle eşleşir)

  [/eczane/i, '["amenity"="pharmacy"]'], [/cami|mescit/i, '["amenity"="place_of_worship"]'], [/okul|lise|ilkokul|ortaokul|kolej/i, '["amenity"~"school|college"]'],
  [/park/i, '["leisure"="park"]'], [/spor|fitness|gym|halı ?saha|saha/i, '["leisure"~"sports_centre|fitness_centre|pitch|stadium"]'], [/hastane|sağlık ocağı|aile sağlık|klinik/i, '["amenity"~"hospital|clinic|doctors"]'],
  [/fırın|ekmek/i, '["shop"="bakery"]'], [/banka|atm/i, '["amenity"~"bank|atm"]'], [/benzin|akaryakıt|petrol|opet|shell/i, '["amenity"="fuel"]'], [/karakol|polis/i, '["amenity"="police"]'],
  [/kahve|kahvehane|kafe|cafe/i, '["amenity"="cafe"]'], [/lokanta|restoran|dönerci|pideci/i, '["amenity"~"restaurant|fast_food"]'], [/durak|otobüs/i, '["highway"="bus_stop"]'], [/berber|kuaför/i, '["shop"="hairdresser"]'],
  [/market|bakkal|süpermarket/i, '["shop"~"supermarket|convenience"]'], [/postane|ptt/i, '["amenity"="post_office"]'], [/muhtar/i, '["office"="government"]'],
];
// zincir marketler: Overpass'ta Türkçe büyük/küçük harf sorunu olmasın diye açık desen
const MARKA = [[/\bbim\b/, 'B[İIi][Mm]'], [/\ba-?101\b/, 'A ?-?101'], [/\bşok\b/, '[ŞS][Oo][Kk]'], [/\bmigros\b/, '[Mm][İIi]gros'], [/\bcarrefour/, '[Cc]arrefour'], [/\bfile\b/, '[Ff][İIi]le'], [/\bhakmar/, '[Hh]akmar'], [/\bmetro\b/, '[Mm]etro'], [/\bbizim\b/, '[Bb][İIi]z[İIi]m'], [/\bmacro/, '[Mm]acro'], [/\bonur\b/, '[Oo]nur']];
async function yerAraOSM(yer, c, r) {
  const y = temiz(yer), yl = y.toLocaleLowerCase('tr-TR'); const f = OSM.find(([re]) => re.test(yl))?.[1];
  const mk = MARKA.find(([re]) => re.test(yl))?.[1], ar = `(around:${r},${c.lat},${c.lng})`;
  const serbest = yl.replace(/[^\p{L}\p{N} ]/gu, '').slice(0, 40).replace(/[iİı]/g, '[İIiı]');
  const sel = mk ? `nwr["name"~"${mk}"]${ar};nwr["brand"~"${mk}"]${ar};` : f ? `nwr${f}${ar};` : `nwr["name"~"${serbest}",i]${ar};`;
  const q = `[out:json][timeout:8];(${sel});out center 25;`;
  const rs = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { ...UA, 'content-type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q), signal: T(9000) });
  const j = await rs.json();
  return (j.elements || []).map(e => ({ ad: e.tags?.name || y, lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon, tur: y })).filter(x => x.lat);
}
async function yerAraYandex(yer, c, r) {
  const sp = (r / 111000 * 2).toFixed(4);
  const u = new URL('https://search-maps.yandex.ru/v1/'); u.search = new URLSearchParams({ apikey: PKEY(), text: temiz(yer), lang: 'tr_TR', type: 'biz', ll: `${c.lng},${c.lat}`, spn: `${sp},${sp}`, rspn: '1', results: '20' });
  const r2 = await fetch(u, { signal: T(5000) }); if (!r2.ok) throw new Error('yandex places ' + r2.status);
  const j = await r2.json();
  return (j.features || []).map(f => ({ ad: f.properties?.name || yer, adres: f.properties?.CompanyMetaData?.address, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], tur: yer }));
}
export async function yerAra(yer, c, r = 1500) {
  if (PKEY()) try { const a = await yerAraYandex(yer, c, r); if (a.length) return a; } catch { }
  try { return await yerAraOSM(yer, c, r); } catch { return []; }
}
// ---------- tariften konum: mahalle + yerler -> yan yana olan yerleri eşleştir
export async function tariftenBul({ mahalle, ilce, yerler = [], tarif = '' }, dukkan) {
  const yakin = dukkan?.lat ? { lat: dukkan.lat, lng: dukkan.lng } : null;
  const bolge = [mahalle && (/mah/i.test(mahalle) ? mahalle : mahalle + ' Mahallesi'), ilce || dukkan?.ilce, dukkan?.il].filter(Boolean).join(', ');
  const merkez = (mahalle ? await adresBul(bolge, yakin) : null) || yakin;
  if (!merkez) return { ok: false, reason: 'Mahalle bulunamadı. Müşteriye mahalleyi ve ilçeyi tekrar sor.' };
  const liste = [...new Set((yerler || []).map(temiz).filter(Boolean))].slice(0, 3);
  if (!liste.length) { const s = await sokakBul(merkez); return { ok: true, adaylar: [{ aciklama: merkez.ad, sokak: s, lat: merkez.lat, lng: merkez.lng }], message: 'Sadece mahalle bulundu. Müşteriye yakında bilinen bir yer (market, eczane, cami, okul) sor.' }; }
  const sonuc = await Promise.all(liste.map(y => yerAra(y, merkez, 1500)));
  let adaylar = [];
  if (liste.length >= 2 && sonuc[0].length && sonuc[1].length) {
    for (const a of sonuc[0].slice(0, 15)) for (const b of sonuc[1].slice(0, 15)) { const d = mesafe(a, b); if (d <= 300) adaylar.push({ a, b, d, lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }); }
    adaylar.sort((x, y) => x.d - y.d);
    adaylar = adaylar.slice(0, 3).map(x => ({ aciklama: `${x.a.ad} ile ${x.b.ad} (aralarında ${x.d} m)`, lat: x.lat, lng: x.lng, yakinYer: x.b.ad }));
  }
  if (!adaylar.length) {
    const tek = sonuc.flat().map(x => ({ ...x, d: mesafe(merkez, x) })).sort((a, b) => a.d - b.d).slice(0, 3);
    adaylar = tek.map(x => ({ aciklama: x.ad + (x.adres ? ' · ' + x.adres : ''), lat: x.lat, lng: x.lng, yakinYer: x.ad }));
  }
  if (!adaylar.length) return { ok: false, merkez: { lat: merkez.lat, lng: merkez.lng }, reason: `${bolge} içinde ${liste.join(', ')} bulunamadı. Müşteriden başka bilinen bir yer (cami, okul, park, durak) iste.` };
  for (const x of adaylar) x.sokak = await sokakBul(x);
  const ilk = adaylar[0];
  return { ok: true, adaylar, message: `Müşteriye evet/hayır ile teyit ettir: "${ilk.yakinYer || ilk.aciklama}${ilk.sokak ? ', ' + ilk.sokak + ' tarafı' : ''} mı?" Hayır derse diğer adayı sor. Onaylanınca save_order'a address olarak mahalle + sokak + yakın yer yaz, lat ve lng'yi ekle, müşterinin tarifini kuryeNotu olarak yaz.` };
}
