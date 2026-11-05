// Vapi webhook mantığı. Next.js route dosyası yalnızca POST/GET gibi export'lara izin verdiği için
// yardımcılar burada durur; bağımlılıklar (Supabase, Gemini, resolve) dışarıdan verilir, böylece test edilebilir.

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

// Boş, sadece boşluk ya da "undefined"/"null" metni olan değerleri transcript sayma.
const clean = v => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t && t !== 'undefined' && t !== 'null' ? t : null;
};

// Vapi bazen { message: {...} }, bazen doğrudan {...} gönderir.
const unwrap = body => (isObj(body) ? (isObj(body.message) ? body.message : body) : null);

const ROLE_LABEL = { user: 'user', assistant: 'assistant', bot: 'assistant' };

// artifact.messages -> "user: ...\nassistant: ..."
function transcriptFromMessages(messages) {
  if (!Array.isArray(messages)) return null;
  const lines = [];
  for (const x of messages) {
    if (!isObj(x)) continue;
    const label = ROLE_LABEL[x.role];
    if (!label) continue; // system / tool / function vb. atla
    const text = clean(x.message) || clean(x.content); // Vapi: "message", OpenAI biçimi: "content"
    if (text) lines.push(label + ': ' + text);
  }
  return lines.length ? lines.join('\n') : null;
}

/**
 * Vapi payload'ından konuşma metnini çıkarır. Bulamazsa null döner (asla "undefined" metni üretmez).
 *  - message.type === "transcript"          -> message.transcript (yalnızca transcriptType === "final")
 *  - message.type === "end-of-call-report"  -> artifact.transcript, yoksa artifact.messages, en son eski düz alan message.transcript
 */
export function extractTranscript(body) {
  const m = unwrap(body);
  if (!m) return null;
  if (m.type === 'transcript') {
    return m.transcriptType === 'final' ? clean(m.transcript) : null;
  }
  if (m.type === 'end-of-call-report') {
    const a = isObj(m.artifact) ? m.artifact : null;
    return clean(a?.transcript) || transcriptFromMessages(a?.messages) || clean(m.transcript);
  }
  return null;
}

// Loglanması güvenli alanlar: kişisel veri, transcript, URL, secret içermez.
export function safeMeta(body) {
  const m = unwrap(body) || {};
  const a = isObj(m.artifact) ? m.artifact : null;
  return {
    messageType: typeof m.type === 'string' ? m.type.slice(0, 40) : null,
    transcriptType: typeof m.transcriptType === 'string' ? m.transcriptType.slice(0, 20) : null,
    hasArtifact: !!a,
    artifactKeys: a ? Object.keys(a).slice(0, 30).map(k => k.slice(0, 40)) : [],
  };
}

const ph = s => { const d = String(s || '').replace(/\D/g, ''); return d.length >= 10 && d.length <= 13 ? (d.length === 10 && d[0] === '5' ? '0' + d : d) : null; };
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

// Vercel'de yanıt döndükten sonra işi sürdürmek için (@vercel/functions waitUntil ile aynı mekanizma).
// Ortam desteklemiyorsa false döner, çağıran işi yanıttan önce bekler.
const vercelWaitUntil = p => {
  const ctx = globalThis[Symbol.for('@vercel/request-context')]?.get?.();
  if (typeof ctx?.waitUntil === 'function') { ctx.waitUntil(p); return true; }
  return false;
};

const res = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

export function createVapiHandler({ adminSb, resolve, extract, extractGeneric, env = process.env, waitUntil = vercelWaitUntil, logger = console, ttlMs = 15 * 60 * 1000, now = Date.now }) {
  // Aynı sunucu örneği içinde hızlı idempotency (call ID + event türü). Kalıcı koruma: record_call (eoc) ve webhook_events (canlı).
  const seen = new Map();
  const claim = key => {
    const t = now();
    if (seen.size > 500) for (const [k, v] of seen) if (t - v.ts > ttlMs) seen.delete(k);
    const cur = seen.get(key);
    if (cur && t - cur.ts <= ttlMs) return false;
    seen.set(key, { ts: t });
    return true;
  };
  const release = key => seen.delete(key);

  const log = async (type, bid, cid, error, extra) => {
    try { await adminSb.from('webhook_events').insert({ type, business_id: bid || null, vapi_call_id: cid || null, payload: { error, ...(extra || {}) } }); } catch { /* log hatası webhook'u düşürmesin */ }
  };

  // Görüşme sonu: Gemini ile ayıkla, kaydı doldur. Hatalar loglanır, dışarı fırlatılmaz (Vapi tekrar denemesin).
  async function enrich({ bid, call, cid, m, transcript, meta }) {
    try {
      if (!transcript) {
        logger.warn('[vapi-webhook] transcript bulunamadı', meta);
        await log('gemini_error', bid, call.id, 'Konuşma metni (transcript) gelmedi; Gemini çağrılmadı', meta);
        return;
      }
      const v = m.analysis?.structuredData || {};
      const { data: bz } = await adminSb.from('businesses').select('vertical').eq('id', bid).single();
      if (bz?.vertical && bz.vertical !== 'restaurant') {
        const { data: vc } = await adminSb.from('verticals').select('config').eq('id', bz.vertical).single();
        const gx = await extractGeneric(transcript, today(), vc?.config?.fields || []);
        if (gx.error) await log('gemini_error', bid, call.id, gx.error);
        const d = gx.data || {}, ex = Object.fromEntries(Object.entries(d).filter(([k, x]) => x != null && x !== '' && k !== 'customerName' && k !== 'statedPhone'));
        await adminSb.from('calls').update({ customer_name: d.customerName || null, orders: d.orders || null, address: d.address || d.deliveryAddress || null, stated_phone: ph(d.statedPhone), extracted: Object.keys(ex).length ? ex : null }).eq('id', cid);
        return;
      }
      const g = await extract(transcript, today());
      if (g.error) await log('gemini_error', bid, call.id, g.error);
      const sd = { ...v, ...g.data };
      const sp = ph(sd.statedPhone);
      if (sd.customerName || sd.orders || sd.address || sp) await adminSb.from('calls').update({ customer_name: sd.customerName || null, orders: sd.orders || null, address: sd.address || null, stated_phone: sp }).eq('id', cid);
      const tn = parseInt(String(sd.tableNumber || '').replace(/\D/g, ''));
      if (tn && sd.reservationTime) await adminSb.rpc('book_table', { p_business: bid, p_date: sd.reservationDate || today(), p_time: String(sd.reservationTime).padStart(5, '0'), p_name: sd.customerName || null, p_phone: sp || call.customer?.number || null, p_size: parseInt(sd.partySize) || null, p_table: tn, p_call: cid, p_source: 'vapi' });
    } catch (e) {
      await log('reddedildi', bid, call.id, 'Beklenmeyen hata: ' + String(e?.message || e).slice(0, 200));
    }
  }

  return async function POST(req) {
    if (env.VAPI_SECRET && req.headers.get('x-vapi-secret') !== env.VAPI_SECRET) {
      await log('reddedildi', null, null, 'VAPI_SECRET uyuşmuyor. Vapi secret başlığı: ' + (req.headers.get('x-vapi-secret') ? 'geldi ama farklı' : 'hiç gelmedi'));
      return res({ error: 'unauthorized' }, 401);
    }
    let body;
    try { body = await req.json(); } catch { return res({ error: 'invalid_json' }, 400); }
    const m = unwrap(body);
    if (!m) return res({ ok: true, ignored: 'unknown' });
    const type = m.type || 'unknown', call = isObj(m.call) ? m.call : {}, aid = call.assistantId || m.assistant?.id;
    const meta = safeMeta(body);

    // ---- Canlı transcript: yalnızca final olanlar ----
    if (type === 'transcript') {
      if (m.transcriptType !== 'final') return res({ ok: true, ignored: 'partial_transcript' });
      if (!call.id) return res({ ok: true, ignored: 'no_call_id' });
      const transcript = extractTranscript(body);
      if (!transcript) { logger.warn('[vapi-webhook] transcript bulunamadı', meta); return res({ ok: true, ignored: 'no_transcript' }); }
      const key = call.id + ':transcript';
      if (!claim(key)) return res({ ok: true, duplicate: true });
      try {
        const bid = await resolve(req, 'events', aid);
        if (!bid) { await log('reddedildi', null, call.id, 'İşletme bulunamadı (canlı transcript).'); return res({ ok: true, error: 'business_not_found' }); }
        const { data: prev } = await adminSb.from('webhook_events').select('id').eq('vapi_call_id', call.id).eq('type', 'transcript').limit(1);
        if (prev?.length) return res({ ok: true, duplicate: true });
        // Canlı parçalar tek cümledir; Gemini ayıklaması çağrının TAMAMI geldiğinde (end-of-call-report) tek sefer yapılır.
        await adminSb.from('webhook_events').insert({ type: 'transcript', business_id: bid, vapi_call_id: call.id, payload: { chars: transcript.length } });
        return res({ ok: true, processed: 'transcript' });
      } catch (e) {
        release(key);
        await log('reddedildi', null, call.id, 'Canlı transcript hatası: ' + String(e?.message || e).slice(0, 200));
        return res({ ok: true, error: 'transcript_failed' });
      }
    }

    // ---- Görüşme sonu raporu ----
    if (type !== 'end-of-call-report' || !call.id) return res({ ok: true, ignored: type });
    const key = call.id + ':end-of-call-report';
    if (!claim(key)) return res({ ok: true, duplicate: true });
    try {
      const bid = await resolve(req, 'events', aid);
      const transcript = extractTranscript(body);
      // Transcript yoksa tüm payload'ı değil yalnızca güvenli alanları sakla.
      await adminSb.from('webhook_events').insert({ type, vapi_call_id: call.id, business_id: bid, payload: transcript ? body : meta });
      if (!bid) { await log('reddedildi', null, call.id, 'İşletme bulunamadı. Adres yanlış veya araç adresi kullanılmış, ya da assistant ID eşleşmiyor.'); return res({ ok: true, error: 'business_not_found' }); }

      const sec = Math.round(m.durationSeconds ?? ((new Date(m.endedAt) - new Date(m.startedAt)) / 1000)) || 0;
      const v = m.analysis?.structuredData || {};
      // 1) kaydı hemen yaz (kota düşer, çağrı panelde görünür)
      const { data: cid, error } = await adminSb.rpc('record_call', { p_business: bid, p_call: call.id, p_phone: call.customer?.number || null, p_sec: sec, p_name: v.customerName || null, p_orders: v.orders || null, p_address: v.address || null, p_summary: m.summary || m.analysis?.summary || null, p_transcript: transcript });
      if (error) { release(key); await log('reddedildi', bid, call.id, 'Kayıt yazılamadı: ' + error.message); return res({ error: error.message }, 500); }
      if (!cid) return res({ ok: true, duplicate: true });

      // 2) Gemini: olay alındı, hemen 200 dön; ayıklama arka planda sürer.
      const job = enrich({ bid, call, cid, m, transcript, meta });
      // test- ile başlayan çağrılar (admin test aracı) sonucu hemen okuduğu için beklenir.
      const background = !String(call.id).startsWith('test-') && waitUntil(job);
      if (!background) await job;
      return res({ ok: true });
    } catch (e) {
      release(key);
      await log('reddedildi', null, call.id, 'Beklenmeyen hata: ' + String(e?.message || e).slice(0, 200));
      return res({ error: 'internal' }, 500);
    }
  };
}
