import test from 'node:test';
import assert from 'node:assert/strict';
import { createVapiHandler, extractTranscript } from '../lib/vapiWebhook.mjs';

const TOKEN = 'SECRET_TOKEN_123', PHONE = '+905551112233';

// Supabase'in zincirli API'sinin sahte hali: yazılanları kaydeder, webhook_events okumasını destekler.
function makeEnv(opts = {}) {
  const events = [], updates = [], recorded = [], booked = [], extractCalls = [], warns = [], bg = [];
  const calls = opts.calls || new Set(); // "veritabanı": soğuk başlangıçta da paylaşılabilsin
  const adminSb = {
    from(table) {
      const q = { op: 'select', filters: [] };
      const api = {
        insert(row) { if (table === 'webhook_events') events.push(row); return Promise.resolve({ error: null }); },
        update(row) { q.op = 'update'; updates.push({ table, row }); return api; },
        select() { return api; },
        eq(k, v) { q.filters.push([k, v]); return api; },
        limit() { return api; },
        single() { return Promise.resolve({ data: table === 'businesses' ? { vertical: 'restaurant' } : null }); },
        then(ok, bad) {
          const data = q.op === 'select' && table === 'webhook_events' ? events.filter(e => q.filters.every(([k, v]) => e[k] === v)) : null;
          return Promise.resolve({ data, error: null }).then(ok, bad);
        },
      };
      return api;
    },
    rpc(name, args) {
      if (name === 'record_call') {
        if (calls.has(args.p_call)) return Promise.resolve({ data: null, error: null });
        calls.add(args.p_call); recorded.push(args);
        return Promise.resolve({ data: 'row-' + calls.size, error: null });
      }
      if (name === 'book_table') booked.push(args);
      return Promise.resolve({ data: null, error: null });
    },
  };
  const extract = opts.extract || (async t => { extractCalls.push(t); return { data: { customerName: 'Ali', orders: '2 pizza' }, error: null }; });
  const wrapped = async t => { if (!opts.extract) return extract(t); extractCalls.push(t); return opts.extract(t); };
  const POST = createVapiHandler({
    adminSb, resolve: async () => 'biz-1', extract: wrapped, extractGeneric: async () => ({ data: {}, error: null }),
    env: { VAPI_SECRET: 's3cret' }, logger: { warn: (...a) => warns.push(a) },
    waitUntil: opts.sync ? () => false : p => { bg.push(p); return true; },
  });
  const send = (body, { url = `http://x/api/vapi/webhook?k=${TOKEN}`, secret = 's3cret', raw } = {}) =>
    POST(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-vapi-secret': secret }, body: raw ?? JSON.stringify(body) }));
  return { send, events, updates, recorded, booked, extractCalls, warns, calls, flush: () => Promise.all(bg) };
}

const live = (over = {}) => ({ message: { type: 'transcript', transcriptType: 'final', transcript: 'iki pizza istiyorum', call: { id: 'c1', customer: { number: PHONE } }, ...over } });
const eoc = (artifact, over = {}) => ({ message: { type: 'end-of-call-report', call: { id: 'c1', customer: { number: PHONE } }, durationSeconds: 42, summary: 'özet', artifact, ...over } });

// 1) final canlı transcript
test('1. final canlı transcript doğru alandan okunur ve işlenir', async () => {
  assert.equal(extractTranscript(live()), 'iki pizza istiyorum');
  const t = makeEnv();
  const r = await t.send(live());
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, processed: 'transcript' });
  assert.equal(t.events.filter(e => e.type === 'transcript').length, 1);
  assert.equal(t.extractCalls.length, 0); // parça tek cümle; Gemini görüşme sonunda tek sefer
});

// 2) partial canlı transcript
test('2. partial canlı transcript işlenmez', async () => {
  const p = live({ transcriptType: 'partial' });
  assert.equal(extractTranscript(p), null);
  const t = makeEnv();
  const r = await t.send(p);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).ignored, 'partial_transcript');
  assert.equal(t.events.length, 0);
  assert.equal(t.extractCalls.length, 0);
  // transcriptType hiç yoksa da işlenmez
  assert.equal(extractTranscript(live({ transcriptType: undefined })), null);
});

// 3) end-of-call-report + artifact.transcript
test('3. end-of-call-report artifact.transcript kullanır, hemen 200 döner, sonra Gemini çalışır', async () => {
  const body = eoc({ transcript: 'AI: Merhaba\nUser: 2 pizza', messages: [{ role: 'user', message: 'başka bir şey' }] });
  assert.equal(extractTranscript(body), 'AI: Merhaba\nUser: 2 pizza');
  let release; const gate = new Promise(r => (release = r));
  const t = makeEnv({ extract: async () => { await gate; return { data: { customerName: 'Ali', orders: '2 pizza' }, error: null }; } });
  const r = await t.send(body);
  assert.equal(r.status, 200); // Gemini hâlâ bekliyorken yanıt geldi
  assert.equal(t.recorded[0].p_transcript, 'AI: Merhaba\nUser: 2 pizza');
  assert.equal(t.updates.length, 0);
  release(); await t.flush();
  assert.deepEqual(t.extractCalls, ['AI: Merhaba\nUser: 2 pizza']);
  assert.equal(t.updates[0].row.customer_name, 'Ali');
});

// 4) yalnızca artifact.messages
test('4. artifact.transcript yoksa artifact.messages\'tan transcript üretilir', async () => {
  const messages = [
    { role: 'system', message: 'gizli sistem istemi' },
    { role: 'bot', message: 'Merhaba, hoş geldiniz' },
    { role: 'user', message: '2 pizza istiyorum' },
    { role: 'assistant', content: 'Adresiniz?' },
    { role: 'user' },                 // metin yok -> "undefined" yazılmamalı
    { role: 'tool', message: 'x' },
  ];
  const expected = 'assistant: Merhaba, hoş geldiniz\nuser: 2 pizza istiyorum\nassistant: Adresiniz?';
  assert.equal(extractTranscript(eoc({ messages })), expected);
  assert.equal(extractTranscript(eoc({ transcript: '   ', messages })), expected);
  const t = makeEnv({ sync: true });
  const r = await t.send(eoc({ messages }));
  assert.equal(r.status, 200);
  assert.deepEqual(t.extractCalls, [expected]);
  assert.ok(!t.extractCalls[0].includes('undefined'));
});

// 5) transcript bulunmayan payload
test('5. transcript yoksa Gemini çağrılmaz; yalnızca güvenli alanlar loglanır', async () => {
  const body = eoc({ recordingUrl: 'https://x/rec.wav', messages: [{ role: 'user' }, { role: 'system', message: 's' }], cost: 1 });
  assert.equal(extractTranscript(body), null);
  const t = makeEnv({ sync: true });
  const r = await t.send(body);
  assert.equal(r.status, 200);
  assert.equal(t.extractCalls.length, 0);
  assert.equal(t.recorded[0].p_transcript, null); // çağrı yine panelde görünür
  const meta = { messageType: 'end-of-call-report', transcriptType: null, hasArtifact: true, artifactKeys: ['recordingUrl', 'messages', 'cost'] };
  assert.deepEqual(t.warns, [['[vapi-webhook] transcript bulunamadı', meta]]);
  const written = JSON.stringify(t.events);
  assert.ok(!written.includes(PHONE) && !written.includes('rec.wav') && !written.includes(TOKEN) && !written.includes('s3cret'));
  assert.ok(!JSON.stringify(t.warns).includes(PHONE));
  assert.deepEqual(t.events[0].payload, meta); // tüm payload değil, sadece meta
  const err = t.events.find(e => e.type === 'gemini_error');
  assert.deepEqual(Object.keys(err.payload).sort(), ['artifactKeys', 'error', 'hasArtifact', 'messageType', 'transcriptType']);
  // artifact hiç yoksa
  assert.deepEqual((await makeEnv({ sync: true }).send({ message: { type: 'end-of-call-report', call: { id: 'c9' } } })).status, 200);
});

// 6) aynı event'in tekrarı
test('6. aynı event tekrar gelirse Gemini\'ye iki kez gönderilmez', async () => {
  const body = eoc({ transcript: 'user: 2 pizza' });
  const t = makeEnv();
  assert.deepEqual(await (await t.send(body)).json(), { ok: true });
  assert.deepEqual(await (await t.send(body)).json(), { ok: true, duplicate: true });
  await t.flush();
  assert.equal(t.extractCalls.length, 1);
  assert.equal(t.recorded.length, 1);

  // sunucu yeniden başladı (bellek boş) ama veritabanı aynı: record_call tekrarı yakalar
  const t2 = makeEnv({ calls: t.calls });
  assert.deepEqual(await (await t2.send(body)).json(), { ok: true, duplicate: true });
  await t2.flush();
  assert.equal(t2.extractCalls.length, 0);

  // canlı final tekrarı + aynı çağrının canlı + görüşme sonu raporu
  const t3 = makeEnv();
  assert.equal((await (await t3.send(live())).json()).processed, 'transcript');
  assert.equal((await (await t3.send(live())).json()).duplicate, true);
  await t3.send(eoc({ transcript: 'user: 2 pizza' }));
  await t3.flush();
  assert.equal(t3.events.filter(e => e.type === 'transcript').length, 1);
  assert.equal(t3.extractCalls.length, 1);
});

// ek güvenlik/uyumluluk testleri
test('yetkisiz istek 401, bozuk JSON 400, ilgisiz event yok sayılır', async () => {
  const t = makeEnv();
  assert.equal((await t.send(live(), { secret: 'yanlis' })).status, 401);
  assert.equal((await t.send(null, { raw: '{bozuk' })).status, 400);
  assert.equal((await (await t.send({ message: { type: 'status-update', call: { id: 'c1' } } })).json()).ignored, 'status-update');
  assert.ok(!JSON.stringify(t.events).includes('s3cret'));
});

test('eski düz message.transcript (admin test aracı) hâlâ çalışır ve test- çağrıları beklenir', async () => {
  const body = { message: { type: 'end-of-call-report', call: { id: 'test-abc' }, durationSeconds: 0, transcript: 'user: merhaba', summary: 'Test' } };
  const t = makeEnv(); // arka plan açık olsa bile test- çağrısı yanıttan önce biter
  assert.equal((await t.send(body)).status, 200);
  assert.deepEqual(t.extractCalls, ['user: merhaba']);
});

test('kayıt hatası 500 döner (event alınamadı, tekrar denemeli) ve sonra yeniden işlenebilir', async () => {
  const t = makeEnv({ sync: true });
  const orig = t.calls.has; let fail = true;
  t.calls.has = id => { if (fail) throw new Error('db down'); return orig.call(t.calls, id); };
  assert.equal((await t.send(eoc({ transcript: 'user: x' }))).status, 500);
  fail = false;
  assert.deepEqual(await (await t.send(eoc({ transcript: 'user: x' }))).json(), { ok: true });
  assert.equal(t.extractCalls.length, 1);
});
