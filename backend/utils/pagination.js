/**
 * Pagination engine for mock collections.
 *
 * Supported styles (selected explicitly with `?pagination=<style>` or inferred
 * from the parameters present):
 *
 *   page    ?page=2&limit=10                 page-number; returns total + total_pages
 *   offset  ?offset=20&limit=10              skip/limit; returns total
 *   cursor  ?cursor=<opaque>&limit=10        opaque keyset cursor; no total unless include_total=true
 *   keyset  ?after_id=<id>&limit=10          transparent keyset anchored on a record id
 *           ?before_id=<id>&limit=10         (Twitter since_id / max_id style)
 *
 * The engine is pure: it operates on an already filtered + sorted array and
 * never touches the database, which keeps it fully unit-testable.
 */
const { HttpError } = require('./httpError');
const { compareKeys, normaliseSort, makeKeyOf } = require('./sortData');

const STYLES = ['page', 'offset', 'cursor', 'keyset'];
const CURSOR_VERSION = 1;

const DEFAULT_CONFIG = Object.freeze({
  default_style: 'page',
  default_limit: 10,
  max_limit: 100,
  always_paginate: false,
});

function resolveConfig(raw) {
  return { ...DEFAULT_CONFIG, ...(raw && typeof raw === 'object' ? raw : {}) };
}

// ---------------------------------------------------------------------------
// Parameter parsing
// ---------------------------------------------------------------------------

function parseNonNegativeInt(name, raw, { min = 1, max = Infinity } = {}) {
  if (!/^\d+$/.test(String(raw))) {
    throw new HttpError(400, `INVALID_${name.toUpperCase()}`, `${name} must be an integer`);
  }
  const n = parseInt(raw, 10);
  if (n < min || n > max) {
    const range = max === Infinity ? `>= ${min}` : `between ${min} and ${max}`;
    throw new HttpError(400, `INVALID_${name.toUpperCase()}`, `${name} must be ${range}`);
  }
  return n;
}

function has(query, key) {
  return query[key] !== undefined && query[key] !== '';
}

function inferStyle(query, config) {
  if (has(query, 'pagination')) {
    const style = String(query.pagination).toLowerCase();
    if (!STYLES.includes(style)) {
      throw new HttpError(400, 'INVALID_PAGINATION_STYLE',
        `Unknown pagination style "${query.pagination}". Supported: ${STYLES.join(', ')}`);
    }
    return style;
  }
  if (has(query, 'cursor')) return 'cursor';
  if (has(query, 'after_id') || has(query, 'before_id')) return 'keyset';
  if (has(query, 'offset')) return 'offset';
  if (has(query, 'page')) return 'page';
  if (has(query, 'limit') || has(query, 'per_page') || has(query, 'page_size')) return config.default_style;
  return config.always_paginate ? config.default_style : null;
}

/**
 * Parse pagination parameters. Returns `null` when the request does not ask
 * for pagination (and the endpoint doesn't force it) — the caller returns a
 * bare array in that case for backwards compatibility.
 */
function parsePaginationParams(query, rawConfig) {
  const config = resolveConfig(rawConfig);
  const style = inferStyle(query, config);
  if (!style) return null;

  const limitRaw = has(query, 'limit') ? query.limit
    : has(query, 'per_page') ? query.per_page
    : has(query, 'page_size') ? query.page_size
    : undefined;
  const limit = limitRaw === undefined
    ? Math.min(config.default_limit, config.max_limit)
    : parseNonNegativeInt('limit', limitRaw, { min: 1, max: config.max_limit });

  const params = { style, limit, includeTotal: String(query.include_total).toLowerCase() === 'true' };

  // Reject parameters that belong to a different style so mistakes are loud.
  const owned = { page: ['page'], offset: ['offset'], cursor: ['cursor'], keyset: ['after_id', 'before_id'] };
  for (const [otherStyle, keys] of Object.entries(owned)) {
    if (otherStyle === style) continue;
    for (const k of keys) {
      if (has(query, k)) {
        throw new HttpError(400, 'INVALID_PAGINATION_PARAMS',
          `Parameter "${k}" belongs to ${otherStyle} pagination but ${style} pagination was requested`);
      }
    }
  }

  switch (style) {
    case 'page':
      params.page = has(query, 'page') ? parseNonNegativeInt('page', query.page, { min: 1 }) : 1;
      break;
    case 'offset':
      params.offset = has(query, 'offset') ? parseNonNegativeInt('offset', query.offset, { min: 0 }) : 0;
      break;
    case 'cursor':
      params.cursor = has(query, 'cursor') ? decodeCursor(query.cursor) : null;
      break;
    case 'keyset':
      if (has(query, 'after_id') && has(query, 'before_id')) {
        throw new HttpError(400, 'INVALID_PAGINATION_PARAMS', 'Use either after_id or before_id, not both');
      }
      params.afterId = has(query, 'after_id') ? String(query.after_id) : null;
      params.beforeId = has(query, 'before_id') ? String(query.before_id) : null;
      break;
    default:
      break;
  }
  return params;
}

// ---------------------------------------------------------------------------
// Cursor encoding (opaque, base64url JSON)
// ---------------------------------------------------------------------------

function encodeCursor({ key, id, direction, sort }) {
  const payload = { v: CURSOR_VERSION, s: sort, k: key, id, d: direction };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(raw) {
  let payload;
  try {
    payload = JSON.parse(Buffer.from(String(raw), 'base64url').toString('utf8'));
  } catch (e) {
    throw new HttpError(400, 'INVALID_CURSOR', 'Cursor is malformed');
  }
  if (!payload || payload.v !== CURSOR_VERSION || !Array.isArray(payload.k)
      || typeof payload.s !== 'string' || !['next', 'prev'].includes(payload.d)) {
    throw new HttpError(400, 'INVALID_CURSOR', 'Cursor is malformed');
  }
  return { key: payload.k, id: payload.id, direction: payload.d, sort: payload.s };
}

// ---------------------------------------------------------------------------
// Link building
// ---------------------------------------------------------------------------

/** Flatten the qs-parsed nested objects (`name[like]=x`) back to bracket keys. */
function flattenQuery(query, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(query || {})) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flattenQuery(v, key, out);
    else if (Array.isArray(v)) out[key] = v[0];
    else out[key] = v;
  }
  return out;
}

/**
 * Build a relative URL from the current path + query with some params
 * overridden (`undefined`/`null` removes a param). Preserves filters, sort,
 * delay etc. so links are self-sufficient.
 */
function buildLink(path, query, overrides) {
  const params = new URLSearchParams();
  const base = flattenQuery(query);
  for (const k of Object.keys(overrides)) delete base[k]; // overrides go last, in a stable order
  const merged = { ...base, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** RFC 8288 Link header from a links object. */
function linkHeader(links) {
  return Object.entries(links)
    .filter(([rel, href]) => href && rel !== 'self')
    .map(([rel, href]) => `<${href}>; rel="${rel}"`)
    .join(', ');
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

/** First index whose key is >= target under the sort order (binary search). */
function lowerBound(items, targetKey, keyOf, sortFields) {
  let lo = 0, hi = items.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (compareKeys(keyOf(items[mid]), targetKey, sortFields) < 0) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Paginate an already filtered + sorted list.
 *
 * @param {Array}  items           sorted items (each has `.id`)
 * @param {Object} params          from parsePaginationParams
 * @param {Object} ctx
 * @param {string} ctx.path        request path (for links)
 * @param {Object} ctx.query       request query (for links)
 * @param {Array}  ctx.sortFields  parsed sort fields
 * @param {Function} ctx.getValue  (item, field) => value  (for cursor keys)
 * @returns {{ body: {data, pagination, links}, headers: Object }}
 */
function paginate(items, params, ctx) {
  const { style, limit } = params;
  const sortFields = ctx.sortFields;
  const sortString = normaliseSort(sortFields);
  const keyOf = makeKeyOf(sortFields, ctx.getValue);
  const total = items.length;
  const STYLE_PARAMS = ['page', 'offset', 'cursor', 'after_id', 'before_id'];
  // Links: original filters/sort first, then pagination, limit, then the style's own params.
  const link = overrides => {
    const ov = {};
    for (const k of STYLE_PARAMS) if (!(k in overrides)) ov[k] = null;
    ov.pagination = style;
    ov.limit = limit;
    Object.assign(ov, overrides);
    return buildLink(ctx.path, ctx.query, ov);
  };

  let data, pagination, links;

  if (style === 'page') {
    const { page } = params;
    const start = (page - 1) * limit;
    data = items.slice(start, start + limit);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    pagination = {
      style, page, limit, total, total_pages: totalPages,
      has_more: start + limit < total, has_previous: page > 1,
    };
    links = {
      self: link({ page }),
      first: link({ page: 1 }),
      prev: page > 1 ? link({ page: Math.min(page - 1, totalPages) }) : null,
      next: pagination.has_more ? link({ page: page + 1 }) : null,
      last: link({ page: totalPages }),
    };
  } else if (style === 'offset') {
    const { offset } = params;
    data = items.slice(offset, offset + limit);
    const lastOffset = total === 0 ? 0 : Math.floor((total - 1) / limit) * limit;
    pagination = {
      style, offset, limit, total,
      has_more: offset + limit < total, has_previous: offset > 0,
    };
    links = {
      self: link({ offset }),
      first: link({ offset: 0 }),
      prev: offset > 0 ? link({ offset: Math.max(0, offset - limit) }) : null,
      next: pagination.has_more ? link({ offset: offset + limit }) : null,
      last: link({ offset: lastOffset }),
    };
  } else if (style === 'cursor') {
    const { cursor } = params;
    if (cursor && cursor.sort !== sortString) {
      throw new HttpError(400, 'INVALID_CURSOR',
        `Cursor was issued for sort "${cursor.sort}" but the request sorts by "${sortString}"`);
    }
    let startIdx = 0, endIdx = Math.min(total, limit); // window [startIdx, endIdx)
    if (cursor) {
      // Position of the boundary key in the sorted list — works even if the boundary item was deleted.
      const pos = lowerBound(items, cursor.key, keyOf, sortFields);
      const exact = pos < total && compareKeys(keyOf(items[pos]), cursor.key, sortFields) === 0;
      if (cursor.direction === 'next') {
        startIdx = exact ? pos + 1 : pos;
        endIdx = Math.min(total, startIdx + limit);
      } else {
        endIdx = pos;
        startIdx = Math.max(0, endIdx - limit);
      }
    }
    data = items.slice(startIdx, endIdx);
    const hasMore = endIdx < total;
    const hasPrevious = startIdx > 0;
    const first = data[0], last = data[data.length - 1];
    const nextCursor = hasMore && last ? encodeCursor({ key: keyOf(last), id: last.id, direction: 'next', sort: sortString }) : null;
    const prevCursor = hasPrevious && first ? encodeCursor({ key: keyOf(first), id: first.id, direction: 'prev', sort: sortString }) : null;
    pagination = { style, limit, next_cursor: nextCursor, prev_cursor: prevCursor, has_more: hasMore, has_previous: hasPrevious };
    if (params.includeTotal) pagination.total = total;
    links = {
      self: link({ cursor: cursor ? ctx.query.cursor : null }),
      first: link({}),
      prev: prevCursor ? link({ cursor: prevCursor }) : null,
      next: nextCursor ? link({ cursor: nextCursor }) : null,
    };
  } else if (style === 'keyset') {
    const { afterId, beforeId } = params;
    let startIdx = 0, endIdx = Math.min(total, limit);
    if (afterId !== null) {
      const pos = items.findIndex(i => String(i.id) === afterId);
      if (pos === -1) throw new HttpError(400, 'INVALID_KEYSET_ANCHOR', `No record with id "${afterId}" in this collection`);
      startIdx = pos + 1;
      endIdx = Math.min(total, startIdx + limit);
    } else if (beforeId !== null) {
      const pos = items.findIndex(i => String(i.id) === beforeId);
      if (pos === -1) throw new HttpError(400, 'INVALID_KEYSET_ANCHOR', `No record with id "${beforeId}" in this collection`);
      endIdx = pos;
      startIdx = Math.max(0, endIdx - limit);
    }
    data = items.slice(startIdx, endIdx);
    const hasMore = endIdx < total;
    const hasPrevious = startIdx > 0;
    const firstId = data.length ? data[0].id : null;
    const lastId = data.length ? data[data.length - 1].id : null;
    pagination = {
      style, limit, after_id: afterId, before_id: beforeId,
      first_id: firstId, last_id: lastId, has_more: hasMore, has_previous: hasPrevious,
    };
    if (params.includeTotal) pagination.total = total;
    links = {
      self: link({ after_id: afterId, before_id: beforeId }),
      first: link({}),
      prev: hasPrevious && firstId ? link({ before_id: firstId }) : null,
      next: hasMore && lastId ? link({ after_id: lastId }) : null,
    };
  } else {
    throw new HttpError(400, 'INVALID_PAGINATION_STYLE', `Unknown pagination style "${style}"`);
  }

  const headers = {};
  const lh = linkHeader(links);
  if (lh) headers.Link = lh;
  if (pagination.total !== undefined) headers['X-Total-Count'] = String(pagination.total);

  return { body: { data, pagination, links }, headers };
}

module.exports = {
  STYLES, DEFAULT_CONFIG,
  resolveConfig, parsePaginationParams, paginate,
  encodeCursor, decodeCursor, buildLink, linkHeader, flattenQuery,
};
