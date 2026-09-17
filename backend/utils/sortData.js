/**
 * Sorting for mock collections.
 *
 * Sort spec syntax (query param `sort`): `field`, `-field`, `a,-b,c`.
 * A trailing `id` tiebreaker is always appended so the order is total and
 * stable, which cursor / keyset pagination depend on.
 */
const { HttpError } = require('./httpError');

const DEFAULT_SORT = '-created_at';
const FIELD_RE = /^[A-Za-z_][A-Za-z0-9_.]*$/;

function parseSort(raw) {
  const spec = (raw === undefined || raw === null || raw === '') ? DEFAULT_SORT : String(raw);
  const fields = spec.split(',').map(s => s.trim()).filter(Boolean).map(token => {
    const dir = token.startsWith('-') ? -1 : 1;
    const field = token.replace(/^[-+]/, '');
    if (!FIELD_RE.test(field)) {
      throw new HttpError(400, 'INVALID_SORT', `Invalid sort field: ${token}`);
    }
    return { field, dir };
  });
  if (!fields.some(f => f.field === 'id')) {
    fields.push({ field: 'id', dir: fields.length ? fields[fields.length - 1].dir : -1 });
  }
  return fields;
}

function normaliseSort(fields) {
  return fields.map(f => (f.dir === -1 ? '-' : '') + f.field).join(',');
}

// Dates compare as ISO-8601 strings so a key survives a JSON round-trip
// through an opaque cursor unchanged (ISO strings sort chronologically).
function typeRank(v) {
  if (v === null || v === undefined) return 3;
  if (typeof v === 'number' || typeof v === 'bigint' || typeof v === 'boolean') return 0;
  if (typeof v === 'string' || v instanceof Date) return 1;
  return 2;
}

function toComparable(v) {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'bigint') return Number(v);
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return v;
}

/** Compare two scalar values; nulls sort last regardless of direction. */
function compareValues(a, b) {
  const ra = typeRank(a), rb = typeRank(b);
  if (ra === 3 && rb === 3) return 0;
  if (ra === 3) return 1;
  if (rb === 3) return -1;
  if (ra !== rb) return ra - rb;
  const ca = toComparable(a), cb = toComparable(b);
  if (typeof ca === 'number' && typeof cb === 'number') return ca - cb;
  const sa = String(ca), sb = String(cb);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/** Compare two key tuples produced by `keyOf` under the given sort fields. */
function compareKeys(ka, kb, fields) {
  for (let i = 0; i < fields.length; i++) {
    const c = compareValues(ka[i], kb[i]);
    if (c !== 0) {
      // null-last is direction independent
      if (ka[i] == null || kb[i] == null) return c;
      return c * fields[i].dir;
    }
  }
  return 0;
}

/**
 * Build a `keyOf(item)` function. `getValue(item, field)` lets the caller
 * resolve metadata fields (created_at, updated_at) that aren't in the payload.
 */
function makeKeyOf(fields, getValue) {
  return item => fields.map(f => getValue(item, f.field));
}

function sortItems(items, fields, getValue) {
  const keyOf = makeKeyOf(fields, getValue);
  return items
    .map(item => ({ item, key: keyOf(item) }))
    .sort((a, b) => compareKeys(a.key, b.key, fields))
    .map(x => x.item);
}

module.exports = { DEFAULT_SORT, parseSort, normaliseSort, compareValues, compareKeys, makeKeyOf, sortItems };
