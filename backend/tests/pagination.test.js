const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSort, sortItems, normaliseSort } = require('../utils/sortData');
const {
  parsePaginationParams, paginate, encodeCursor, decodeCursor, buildLink, linkHeader,
} = require('../utils/pagination');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE = Date.UTC(2026, 0, 1);
/** 25 items: ids i01..i25, created_at ascending, price = i * 10, name cycles a/b/c. */
function makeItems(n = 25) {
  const rows = [];
  for (let i = 1; i <= n; i++) {
    rows.push({
      id: `i${String(i).padStart(2, '0')}`,
      created_at: new Date(BASE + i * 60000),
      data: { name: ['alpha', 'beta', 'gamma'][i % 3], price: i * 10 },
    });
  }
  return rows;
}
const getValue = (item, field) => {
  if (field in item.data) return item.data[field];
  return item[field];
};
const ctxFor = (query, sort) => ({
  path: '/u/shop/products',
  query,
  sortFields: parseSort(sort ?? query.sort),
  getValue,
});
const ids = data => data.map(d => d.id);
const sorted = (items, query) => sortItems(items, parseSort(query.sort), getValue);

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

test('parseSort defaults to -created_at and appends id tiebreaker', () => {
  assert.equal(normaliseSort(parseSort(undefined)), '-created_at,-id');
  assert.equal(normaliseSort(parseSort('name')), 'name,id');
  assert.equal(normaliseSort(parseSort('name,-price')), 'name,-price,-id');
  assert.equal(normaliseSort(parseSort('-price,id')), '-price,id');
});

test('parseSort rejects malformed fields', () => {
  assert.throws(() => parseSort('name;drop'), e => e.code === 'INVALID_SORT');
});

test('sortItems sorts by data field then id tiebreaker', () => {
  const items = makeItems(6);
  const out = sortItems(items, parseSort('name,-price'), getValue);
  assert.deepEqual(out.map(i => `${i.data.name}:${i.data.price}`), [
    'alpha:60', 'alpha:30', 'beta:40', 'beta:10', 'gamma:50', 'gamma:20',
  ]);
});

test('sortItems puts nulls last regardless of direction', () => {
  const items = [
    { id: 'a', created_at: new Date(1), data: { score: null } },
    { id: 'b', created_at: new Date(2), data: { score: 5 } },
    { id: 'c', created_at: new Date(3), data: { score: 1 } },
  ];
  assert.deepEqual(ids(sortItems(items, parseSort('score'), getValue)), ['c', 'b', 'a']);
  assert.deepEqual(ids(sortItems(items, parseSort('-score'), getValue)), ['b', 'c', 'a']);
});

// ---------------------------------------------------------------------------
// Parameter parsing / style inference
// ---------------------------------------------------------------------------

test('no pagination params → null (bare array behaviour)', () => {
  assert.equal(parsePaginationParams({}, {}), null);
  assert.equal(parsePaginationParams({ name: 'x' }, {}), null);
});

test('always_paginate forces the default style', () => {
  const p = parsePaginationParams({}, { always_paginate: true, default_style: 'cursor', default_limit: 5 });
  assert.equal(p.style, 'cursor');
  assert.equal(p.limit, 5);
});

test('style inference from parameters', () => {
  assert.equal(parsePaginationParams({ page: '2' }, {}).style, 'page');
  assert.equal(parsePaginationParams({ offset: '0' }, {}).style, 'offset');
  assert.equal(parsePaginationParams({ after_id: 'x' }, {}).style, 'keyset');
  assert.equal(parsePaginationParams({ limit: '5' }, {}).style, 'page');
  assert.equal(parsePaginationParams({ limit: '5' }, { default_style: 'offset' }).style, 'offset');
  const c = encodeCursor({ key: [1], id: 'x', direction: 'next', sort: '-created_at,-id' });
  assert.equal(parsePaginationParams({ cursor: c }, {}).style, 'cursor');
});

test('explicit pagination param wins and validates', () => {
  assert.equal(parsePaginationParams({ pagination: 'offset' }, {}).style, 'offset');
  assert.throws(() => parsePaginationParams({ pagination: 'nope' }, {}), e => e.code === 'INVALID_PAGINATION_STYLE');
});

test('limit aliases and bounds', () => {
  assert.equal(parsePaginationParams({ per_page: '7' }, {}).limit, 7);
  assert.equal(parsePaginationParams({ page_size: '8' }, {}).limit, 8);
  assert.equal(parsePaginationParams({ page: '1' }, { default_limit: 20 }).limit, 20);
  assert.throws(() => parsePaginationParams({ limit: '0' }, {}), e => e.code === 'INVALID_LIMIT');
  assert.throws(() => parsePaginationParams({ limit: '101' }, {}), e => e.code === 'INVALID_LIMIT');
  assert.throws(() => parsePaginationParams({ limit: 'abc' }, {}), e => e.code === 'INVALID_LIMIT');
  assert.equal(parsePaginationParams({ limit: '500' }, { max_limit: 1000 }).limit, 500);
});

test('mixing parameters of different styles is rejected', () => {
  assert.throws(() => parsePaginationParams({ page: '1', offset: '5' }, {}), e => e.code === 'INVALID_PAGINATION_PARAMS');
  assert.throws(() => parsePaginationParams({ pagination: 'cursor', page: '2' }, {}), e => e.code === 'INVALID_PAGINATION_PARAMS');
  assert.throws(() => parsePaginationParams({ after_id: 'a', before_id: 'b' }, {}), e => e.code === 'INVALID_PAGINATION_PARAMS');
});

test('page / offset validation', () => {
  assert.throws(() => parsePaginationParams({ page: '0' }, {}), e => e.code === 'INVALID_PAGE');
  assert.equal(parsePaginationParams({ offset: '0' }, {}).offset, 0);
  assert.throws(() => parsePaginationParams({ offset: '-1' }, {}), e => e.code === 'INVALID_OFFSET');
});

// ---------------------------------------------------------------------------
// Page style
// ---------------------------------------------------------------------------

test('page style: envelope, links and headers', () => {
  const items = makeItems();
  const query = { page: '2', limit: '10', name: 'alpha' };
  const view = sorted(items, query);
  const { body, headers } = paginate(view, parsePaginationParams(query, {}), ctxFor(query));
  assert.equal(body.data.length, 10);
  assert.deepEqual(body.pagination, {
    style: 'page', page: 2, limit: 10, total: 25, total_pages: 3, has_more: true, has_previous: true,
  });
  assert.equal(body.links.prev, '/u/shop/products?name=alpha&pagination=page&limit=10&page=1');
  assert.equal(body.links.next, '/u/shop/products?name=alpha&pagination=page&limit=10&page=3');
  assert.equal(body.links.last, '/u/shop/products?name=alpha&pagination=page&limit=10&page=3');
  assert.equal(headers['X-Total-Count'], '25');
  assert.match(headers.Link, /rel="next"/);
  assert.match(headers.Link, /rel="prev"/);
  assert.doesNotMatch(headers.Link, /rel="self"/);
});

test('page style: last page and out-of-range page', () => {
  const items = makeItems();
  let q = { page: '3', limit: '10' };
  let r = paginate(sorted(items, q), parsePaginationParams(q, {}), ctxFor(q));
  assert.equal(r.body.data.length, 5);
  assert.equal(r.body.pagination.has_more, false);
  assert.equal(r.body.links.next, null);

  q = { page: '9', limit: '10' };
  r = paginate(sorted(items, q), parsePaginationParams(q, {}), ctxFor(q));
  assert.deepEqual(r.body.data, []);
  assert.equal(r.body.pagination.has_more, false);
  assert.equal(r.body.links.prev, '/u/shop/products?pagination=page&limit=10&page=3');
});

test('page style: empty collection', () => {
  const q = { page: '1', limit: '10' };
  const r = paginate([], parsePaginationParams(q, {}), ctxFor(q));
  assert.deepEqual(r.body.pagination, {
    style: 'page', page: 1, limit: 10, total: 0, total_pages: 1, has_more: false, has_previous: false,
  });
});

// ---------------------------------------------------------------------------
// Offset style
// ---------------------------------------------------------------------------

test('offset style: envelope and links', () => {
  const items = makeItems();
  const q = { offset: '20', limit: '10' };
  const { body } = paginate(sorted(items, q), parsePaginationParams(q, {}), ctxFor(q));
  assert.equal(body.data.length, 5);
  assert.deepEqual(body.pagination, { style: 'offset', offset: 20, limit: 10, total: 25, has_more: false, has_previous: true });
  assert.equal(body.links.prev, '/u/shop/products?pagination=offset&limit=10&offset=10');
  assert.equal(body.links.next, null);
  assert.equal(body.links.last, '/u/shop/products?pagination=offset&limit=10&offset=20');
});

// ---------------------------------------------------------------------------
// Cursor style
// ---------------------------------------------------------------------------

test('cursor round-trips and rejects garbage', () => {
  const c = encodeCursor({ key: ['2026-01-01', 'i05'], id: 'i05', direction: 'next', sort: '-created_at,-id' });
  assert.deepEqual(decodeCursor(c), { key: ['2026-01-01', 'i05'], id: 'i05', direction: 'next', sort: '-created_at,-id' });
  assert.throws(() => decodeCursor('not-a-cursor'), e => e.code === 'INVALID_CURSOR');
  assert.throws(() => decodeCursor(Buffer.from('{"v":99}').toString('base64url')), e => e.code === 'INVALID_CURSOR');
});

test('cursor style: walking forward visits every item exactly once', () => {
  const items = makeItems();
  const seen = [];
  let query = { limit: '7' };
  for (let guard = 0; guard < 10; guard++) {
    const view = sorted(items, query);
    const { body } = paginate(view, { ...parsePaginationParams(query, {}), style: 'cursor', cursor: query.cursor ? decodeCursor(query.cursor) : null }, ctxFor(query));
    seen.push(...ids(body.data));
    if (!body.pagination.has_more) {
      assert.equal(body.pagination.next_cursor, null);
      break;
    }
    assert.ok(body.pagination.next_cursor);
    query = { limit: '7', cursor: body.pagination.next_cursor };
  }
  assert.deepEqual(seen, ids(sorted(items, {})));
  assert.equal(new Set(seen).size, 25);
});

test('cursor style: backwards navigation returns the previous window', () => {
  const items = makeItems();
  let q = { pagination: 'cursor', limit: '10' };
  const p1 = paginate(sorted(items, q), parsePaginationParams(q, {}), ctxFor(q)).body;
  assert.equal(p1.pagination.prev_cursor, null);
  assert.equal(p1.pagination.has_previous, false);

  q = { pagination: 'cursor', limit: '10', cursor: p1.pagination.next_cursor };
  const p2 = paginate(sorted(items, q), parsePaginationParams(q, {}), ctxFor(q)).body;
  assert.equal(p2.pagination.has_previous, true);
  assert.notDeepEqual(ids(p2.data), ids(p1.data));

  q = { pagination: 'cursor', limit: '10', cursor: p2.pagination.prev_cursor };
  const back = paginate(sorted(items, q), parsePaginationParams(q, {}), ctxFor(q)).body;
  assert.deepEqual(ids(back.data), ids(p1.data));
});

test('cursor style: stays consistent when the boundary item is deleted', () => {
  const items = makeItems();
  const q1 = { pagination: 'cursor', limit: '5' };
  const p1 = paginate(sorted(items, q1), parsePaginationParams(q1, {}), ctxFor(q1)).body;
  const lastId = p1.data[4].id;
  const remaining = items.filter(i => i.id !== lastId);
  const q2 = { pagination: 'cursor', limit: '5', cursor: p1.pagination.next_cursor };
  const p2 = paginate(sorted(remaining, q2), parsePaginationParams(q2, {}), ctxFor(q2)).body;
  // No overlap with page 1 and no skipped rows.
  assert.equal(p2.data.some(i => ids(p1.data).includes(i.id)), false);
  assert.deepEqual(ids(p2.data), ids(sorted(items, {})).slice(5, 10));
});

test('cursor style: cursor issued for a different sort is rejected', () => {
  const items = makeItems();
  const q1 = { pagination: 'cursor', limit: '5', sort: 'price' };
  const p1 = paginate(sorted(items, q1), parsePaginationParams(q1, {}), ctxFor(q1)).body;
  const q2 = { pagination: 'cursor', limit: '5', sort: '-price', cursor: p1.pagination.next_cursor };
  assert.throws(() => paginate(sorted(items, q2), parsePaginationParams(q2, {}), ctxFor(q2)), e => e.code === 'INVALID_CURSOR');
});

test('cursor style: total only when include_total=true', () => {
  const items = makeItems();
  let q = { pagination: 'cursor', limit: '5' };
  let r = paginate(sorted(items, q), parsePaginationParams(q, {}), ctxFor(q));
  assert.equal(r.body.pagination.total, undefined);
  assert.equal(r.headers['X-Total-Count'], undefined);
  q = { pagination: 'cursor', limit: '5', include_total: 'true' };
  r = paginate(sorted(items, q), parsePaginationParams(q, {}), ctxFor(q));
  assert.equal(r.body.pagination.total, 25);
  assert.equal(r.headers['X-Total-Count'], '25');
});

test('cursor style: works with custom multi-field sort', () => {
  const items = makeItems();
  const order = ids(sorted(items, { sort: 'name,-price' }));
  const seen = [];
  let q = { pagination: 'cursor', limit: '4', sort: 'name,-price' };
  for (let guard = 0; guard < 20; guard++) {
    const { body } = paginate(sorted(items, q), parsePaginationParams(q, {}), ctxFor(q));
    seen.push(...ids(body.data));
    if (!body.pagination.has_more) break;
    q = { ...q, cursor: body.pagination.next_cursor };
  }
  assert.deepEqual(seen, order);
});

// ---------------------------------------------------------------------------
// Keyset style
// ---------------------------------------------------------------------------

test('keyset style: after_id / before_id windows', () => {
  const items = makeItems();
  const order = ids(sorted(items, {}));
  let q = { after_id: order[4], limit: '5' };
  let r = paginate(sorted(items, q), parsePaginationParams(q, {}), ctxFor(q)).body;
  assert.deepEqual(ids(r.data), order.slice(5, 10));
  assert.equal(r.pagination.last_id, order[9]);
  assert.equal(r.links.next, `/u/shop/products?pagination=keyset&limit=5&after_id=${order[9]}`);
  assert.equal(r.links.prev, `/u/shop/products?pagination=keyset&limit=5&before_id=${order[5]}`);

  q = { before_id: order[5], limit: '5' };
  r = paginate(sorted(items, q), parsePaginationParams(q, {}), ctxFor(q)).body;
  assert.deepEqual(ids(r.data), order.slice(0, 5));
  assert.equal(r.pagination.has_previous, false);
  assert.equal(r.links.prev, null);
});

test('keyset style: unknown anchor id is a 400', () => {
  const items = makeItems();
  const q = { after_id: 'nope', limit: '5' };
  assert.throws(() => paginate(sorted(items, q), parsePaginationParams(q, {}), ctxFor(q)), e => e.code === 'INVALID_KEYSET_ANCHOR');
});

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

test('buildLink preserves bracket filters and drops nulls', () => {
  const href = buildLink('/p', { name: { like: 'ph' }, page: '2', delay: '5' }, { page: 3, delay: null });
  assert.equal(href, '/p?name%5Blike%5D=ph&page=3');
});

test('linkHeader formats RFC 8288 and omits self/null', () => {
  assert.equal(linkHeader({ self: '/a', next: '/b', prev: null }), '</b>; rel="next"');
});
