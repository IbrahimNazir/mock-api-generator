const test = require('node:test');
const assert = require('node:assert/strict');
const {
  stableStringify, resourceEtag, bodyEtag, ifNoneMatchSatisfied, assertIfMatch,
} = require('../utils/etag');

test('stableStringify is key-order independent', () => {
  assert.equal(stableStringify({ b: 1, a: [{ d: 2, c: 3 }] }), stableStringify({ a: [{ c: 3, d: 2 }], b: 1 }));
  assert.equal(stableStringify(new Date(0)), '"1970-01-01T00:00:00.000Z"');
});

test('resourceEtag changes when data or updated_at change', () => {
  const base = { id: 'r1', data: { name: 'x' }, updated_at: new Date(1000) };
  const same = resourceEtag({ ...base });
  assert.equal(resourceEtag(base), same);
  assert.match(same, /^"[0-9a-f]{40}"$/);
  assert.notEqual(resourceEtag({ ...base, data: { name: 'y' } }), same);
  assert.notEqual(resourceEtag({ ...base, updated_at: new Date(2000) }), same);
});

test('bodyEtag is deterministic for collections', () => {
  assert.equal(bodyEtag([{ id: 1 }, { id: 2 }]), bodyEtag([{ id: 1 }, { id: 2 }]));
  assert.notEqual(bodyEtag([{ id: 1 }]), bodyEtag([{ id: 2 }]));
});

test('If-None-Match: weak comparison, lists and wildcard', () => {
  const tag = '"abc"';
  assert.equal(ifNoneMatchSatisfied(undefined, tag), false);
  assert.equal(ifNoneMatchSatisfied('"abc"', tag), true);
  assert.equal(ifNoneMatchSatisfied('W/"abc"', tag), true);
  assert.equal(ifNoneMatchSatisfied('"zzz", "abc"', tag), true);
  assert.equal(ifNoneMatchSatisfied('"zzz"', tag), false);
  assert.equal(ifNoneMatchSatisfied('*', tag), true);
});

test('If-Match: strong comparison, 412 on mismatch', () => {
  const tag = '"abc"';
  assert.doesNotThrow(() => assertIfMatch(undefined, tag));
  assert.doesNotThrow(() => assertIfMatch('*', tag));
  assert.doesNotThrow(() => assertIfMatch('"abc"', tag));
  assert.throws(() => assertIfMatch('W/"abc"', tag), e => e.status === 412);
  assert.throws(() => assertIfMatch('"old"', tag), e => e.status === 412 && e.code === 'PRECONDITION_FAILED');
});
