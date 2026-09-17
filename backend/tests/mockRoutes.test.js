/**
 * Route-level tests for the mock router (versioning, pagination, ETag) using
 * an in-memory fake database. Runs a real Express server on a random port.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { install } = require('./helpers/fakeDb');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// --- seed -------------------------------------------------------------------
const USER = { id: 'u1', username: 'ibrahim', email: 'i@x.io', role: 'user', is_active: true };
const OTHER = { id: 'u2', username: 'someone', email: 's@x.io', role: 'user', is_active: true };
const T0 = Date.UTC(2026, 0, 1);
const api = (id, version, extra = {}) => ({
  id, user_id: USER.id, name: 'Shop', version, description: '', base_path: '/shop',
  is_public: true, is_default: false, deprecated: false, deprecated_at: null, sunset_at: null,
  created_at: new Date(T0), updated_at: new Date(T0), ...extra,
});
const ep = (id, api_id, extra = {}) => ({
  id, api_id, path: '/products', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  schema: null, mock_enabled: false, pagination_config: {}, ...extra,
});
const db = install({
  users: [USER, OTHER],
  apis: [
    api('a1', '1.0.0', { deprecated: true, deprecated_at: new Date(T0), sunset_at: new Date(Date.now() + 86400000) }),
    api('a2', '2.0.0'),
    api('a3', '2.1.0'),
    api('a4', '0.9.0', { deprecated: true, sunset_at: new Date(T0) }),           // already sunset
    api('p1', '1.0.0', { base_path: '/private', is_public: false }),
  ],
  endpoints: [
    ep('e1', 'a1'), ep('e2', 'a2'), ep('e3', 'a3', { pagination_config: { default_style: 'cursor', default_limit: 4, max_limit: 20 } }),
    ep('e4', 'a4'), ep('e5', 'p1'),
  ],
  resources: [],
});
// 12 products on v2.0.0 (e2), 6 on v2.1.0 (e3), 2 on v1.0.0 (e1)
function seedProducts(endpoint_id, n, prefix) {
  for (let i = 1; i <= n; i++) {
    db.state.resources.push({
      id: `${prefix}${String(i).padStart(2, '0')}`, endpoint_id, parent_resource_ids: null,
      data: { name: `${prefix} product ${i}`, price: i * 10, category: i % 2 ? 'odd' : 'even' },
      created_at: new Date(T0 + i * 60000), updated_at: new Date(T0 + i * 60000),
    });
  }
}
seedProducts('e2', 12, 'r');
seedProducts('e3', 6, 'n');
seedProducts('e1', 2, 'o');

// --- server -----------------------------------------------------------------
const mockRoutes = require('../routes/mockRoutes');
const app = express();
app.use(express.json());
app.use('', mockRoutes);
let server, base;

test.before(async () => {
  await new Promise(resolve => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

async function call(path, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { /* not json */ }
  return { status: res.status, headers: res.headers, json, text };
}

// ---------------------------------------------------------------------------
// Versioning
// ---------------------------------------------------------------------------

test('default version is the highest non-deprecated one', async () => {
  const r = await call('/ibrahim/shop/products');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-api-version'), '2.1.0');
  assert.match(r.headers.get('vary'), /X-API-Version/);
  assert.equal(r.json.length, 6);
});

test('query-param versioning: api-version, api_version, v', async () => {
  for (const p of ['api-version=2.0.0', 'api_version=2.0', 'v=v2.0']) {
    const r = await call(`/ibrahim/shop/products?${p}`);
    assert.equal(r.status, 200, p);
    assert.equal(r.headers.get('x-api-version'), '2.0.0', p);
    assert.equal(r.json.length, 12, p);
  }
  // prefix "2" resolves to the highest 2.x
  const r = await call('/ibrahim/shop/products?v=2');
  assert.equal(r.headers.get('x-api-version'), '2.1.0');
});

test('header versioning: X-API-Version, API-Version and Accept media type', async () => {
  let r = await call('/ibrahim/shop/products', { headers: { 'X-API-Version': '2.0.0' } });
  assert.equal(r.headers.get('x-api-version'), '2.0.0');
  r = await call('/ibrahim/shop/products', { headers: { 'API-Version': '1' } });
  assert.equal(r.headers.get('x-api-version'), '1.0.0');
  r = await call('/ibrahim/shop/products', { headers: { Accept: 'application/vnd.mock-api.v2.0+json' } });
  assert.equal(r.headers.get('x-api-version'), '2.0.0');
  r = await call('/ibrahim/shop/products', { headers: { Accept: 'application/json; version=1.0.0' } });
  assert.equal(r.headers.get('x-api-version'), '1.0.0');
});

test('body versioning on writes, and the key is stripped from stored data', async () => {
  const r = await call('/ibrahim/shop/products', {
    method: 'POST', body: { api_version: '2.0.0', name: 'bodyver', price: 1, category: 'odd' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.headers.get('x-api-version'), '2.0.0');
  assert.equal(r.json.api_version, undefined);
  assert.ok(r.headers.get('etag'));
  assert.equal(r.headers.get('location'), `/ibrahim/shop/products/${r.json.id}`);
  const stored = db.state.resources.find(x => x.id === r.json.id);
  assert.equal(stored.endpoint_id, 'e2');
  assert.deepEqual(stored.data, { name: 'bodyver', price: 1, category: 'odd' });
  db.state.resources = db.state.resources.filter(x => x.id !== r.json.id); // keep the seed stable for later tests
});

test('conflicting version hints → 400, unknown → 404, unknown via Accept → 406', async () => {
  let r = await call('/ibrahim/shop/products?v=2', { headers: { 'X-API-Version': '1' } });
  assert.equal(r.status, 400);
  assert.equal(r.json.code, 'API_VERSION_CONFLICT');

  r = await call('/ibrahim/shop/products?v=7');
  assert.equal(r.status, 404);
  assert.equal(r.json.code, 'API_VERSION_NOT_FOUND');
  assert.deepEqual(r.json.available_versions, ['0.9.0', '1.0.0', '2.0.0', '2.1.0']);

  r = await call('/ibrahim/shop/products', { headers: { Accept: 'application/vnd.mock-api.v7+json' } });
  assert.equal(r.status, 406);

  r = await call('/ibrahim/shop/products?v=latest');
  assert.equal(r.status, 400);
  assert.equal(r.json.code, 'INVALID_API_VERSION');
});

test('deprecated version emits Deprecation, Sunset and successor Link headers', async () => {
  const r = await call('/ibrahim/shop/products?v=1');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('deprecation'), `@${Math.floor(T0 / 1000)}`);
  assert.ok(r.headers.get('sunset'));
  assert.match(r.headers.get('link'), /<\/ibrahim\/shop\/products\?api-version=2\.1\.0>; rel="successor-version"/);
});

test('sunset version → 410 Gone with successor', async () => {
  const r = await call('/ibrahim/shop/products?v=0.9.0');
  assert.equal(r.status, 410);
  assert.equal(r.json.code, 'API_VERSION_SUNSET');
  assert.equal(r.json.successor_version, '2.1.0');
});

test('unknown API / endpoint → 404 with codes', async () => {
  let r = await call('/ibrahim/nope/products');
  assert.equal(r.status, 404);
  assert.equal(r.json.code, 'API_NOT_FOUND');
  r = await call('/ibrahim/shop/nothing');
  assert.equal(r.status, 404);
  assert.equal(r.json.code, 'ENDPOINT_NOT_FOUND');
});

test('private API requires the owner token', async () => {
  let r = await call('/ibrahim/private/products');
  assert.equal(r.status, 401);
  const stranger = jwt.sign({ userId: OTHER.id }, process.env.JWT_SECRET);
  r = await call('/ibrahim/private/products', { headers: { Authorization: `Bearer ${stranger}` } });
  assert.equal(r.status, 401);
  const owner = jwt.sign({ userId: USER.id }, process.env.JWT_SECRET);
  r = await call('/ibrahim/private/products', { headers: { Authorization: `Bearer ${owner}` } });
  assert.equal(r.status, 200);
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

test('no pagination params → bare array (legacy behaviour)', async () => {
  const r = await call('/ibrahim/shop/products?v=2.0.0');
  assert.ok(Array.isArray(r.json));
  assert.equal(r.json.length, 12);
  assert.equal(r.headers.get('link'), null);
});

test('page style envelope + headers', async () => {
  const r = await call('/ibrahim/shop/products?v=2.0.0&page=2&limit=5');
  assert.equal(r.status, 200);
  assert.equal(r.json.data.length, 5);
  assert.deepEqual(r.json.pagination, { style: 'page', page: 2, limit: 5, total: 12, total_pages: 3, has_more: true, has_previous: true });
  assert.equal(r.json.links.next, '/ibrahim/shop/products?v=2.0.0&pagination=page&limit=5&page=3');
  assert.equal(r.headers.get('x-total-count'), '12');
  assert.match(r.headers.get('link'), /rel="next"/);
  // Links keep the version pin so they resolve to the same API version.
  const next = await call(r.json.links.next);
  assert.equal(next.headers.get('x-api-version'), '2.0.0');
  assert.equal(next.json.data.length, 2);
});

test('offset style', async () => {
  const r = await call('/ibrahim/shop/products?v=2.0.0&offset=10&limit=5');
  assert.equal(r.json.data.length, 2);
  assert.equal(r.json.pagination.style, 'offset');
  assert.equal(r.json.pagination.has_more, false);
});

test('cursor style: full walk through filtered + sorted collection', async () => {
  const seen = [];
  let url = '/ibrahim/shop/products?v=2.0.0&category=even&sort=price&pagination=cursor&limit=2';
  for (let guard = 0; guard < 10 && url; guard++) {
    const r = await call(url);
    assert.equal(r.status, 200, url);
    assert.equal(r.json.pagination.style, 'cursor');
    seen.push(...r.json.data.map(d => d.price));
    url = r.json.links.next;
  }
  assert.deepEqual(seen, [20, 40, 60, 80, 100, 120]);
});

test('keyset style: after_id', async () => {
  const first = await call('/ibrahim/shop/products?v=2.0.0&sort=price&limit=3&pagination=keyset');
  assert.deepEqual(first.json.data.map(d => d.price), [10, 20, 30]);
  const second = await call(first.json.links.next);
  assert.deepEqual(second.json.data.map(d => d.price), [40, 50, 60]);
  assert.equal(second.json.pagination.after_id, first.json.pagination.last_id);
});

test('endpoint pagination_config: default style/limit and max_limit', async () => {
  // e3 (v2.1.0) defaults to cursor with limit 4 and max 20
  let r = await call('/ibrahim/shop/products?limit=4');
  assert.equal(r.json.pagination.style, 'cursor');
  assert.equal(r.json.data.length, 4);
  r = await call('/ibrahim/shop/products?limit=21');
  assert.equal(r.status, 400);
  assert.equal(r.json.code, 'INVALID_LIMIT');
});

test('invalid pagination input is a 400 with a code', async () => {
  let r = await call('/ibrahim/shop/products?cursor=garbage');
  assert.equal(r.status, 400);
  assert.equal(r.json.code, 'INVALID_CURSOR');
  r = await call('/ibrahim/shop/products?page=0');
  assert.equal(r.status, 400);
  assert.equal(r.json.code, 'INVALID_PAGE');
  r = await call('/ibrahim/shop/products?sort=nope');
  assert.equal(r.status, 400);
  assert.equal(r.json.code, 'INVALID_SORT');
  r = await call('/ibrahim/shop/products?bogus=1');
  assert.equal(r.status, 400);
  assert.equal(r.json.code, 'INVALID_FILTER');
});

test('sorting by row metadata and by data fields', async () => {
  let r = await call('/ibrahim/shop/products?v=2.0.0&sort=created_at&limit=3');
  assert.deepEqual(r.json.data.map(d => d.price), [10, 20, 30]);
  r = await call('/ibrahim/shop/products?v=2.0.0&sort=-price&limit=2');
  assert.deepEqual(r.json.data.map(d => d.price), [120, 110]);
});

// ---------------------------------------------------------------------------
// ETag / conditional requests
// ---------------------------------------------------------------------------

test('collection ETag and If-None-Match → 304', async () => {
  const r = await call('/ibrahim/shop/products?v=2.0.0&page=1&limit=3');
  const etag = r.headers.get('etag');
  assert.ok(etag);
  const again = await call('/ibrahim/shop/products?v=2.0.0&page=1&limit=3', { headers: { 'If-None-Match': etag } });
  assert.equal(again.status, 304);
  assert.equal(again.text, '');
});

test('resource ETag, If-None-Match and If-Match lifecycle', async () => {
  const one = await call('/ibrahim/shop/products/r01?v=2.0.0');
  assert.equal(one.status, 200);
  const etag = one.headers.get('etag');
  assert.ok(etag);
  assert.ok(one.headers.get('last-modified'));

  assert.equal((await call('/ibrahim/shop/products/r01?v=2.0.0', { headers: { 'If-None-Match': etag } })).status, 304);

  // Stale If-Match → 412
  let w = await call('/ibrahim/shop/products/r01?v=2.0.0', { method: 'PATCH', headers: { 'If-Match': '"stale"' }, body: { price: 999 } });
  assert.equal(w.status, 412);
  assert.equal(w.json.code, 'PRECONDITION_FAILED');
  assert.equal(w.json.current_etag, etag);

  // Fresh If-Match → 200 and a new ETag
  w = await call('/ibrahim/shop/products/r01?v=2.0.0', { method: 'PATCH', headers: { 'If-Match': etag }, body: { price: 999 } });
  assert.equal(w.status, 200);
  assert.equal(w.json.price, 999);
  const etag2 = w.headers.get('etag');
  assert.notEqual(etag2, etag);

  // Old tag no longer matches
  w = await call('/ibrahim/shop/products/r01?v=2.0.0', { method: 'PUT', headers: { 'If-Match': etag }, body: { name: 'x' } });
  assert.equal(w.status, 412);
  w = await call('/ibrahim/shop/products/r01?v=2.0.0', { method: 'DELETE', headers: { 'If-Match': etag2 } });
  assert.equal(w.status, 200);
  assert.equal((await call('/ibrahim/shop/products/r01?v=2.0.0')).status, 404);
});

test('resources are scoped to the resolved version', async () => {
  // r02 lives on v2.0.0; asking for it under v2.1.0 is a 404
  assert.equal((await call('/ibrahim/shop/products/r02?v=2.1.0')).status, 404);
  assert.equal((await call('/ibrahim/shop/products/r02?v=2.0.0')).status, 200);
});
