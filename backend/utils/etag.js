/**
 * ETag / conditional request helpers (RFC 9110 §8.8, §13.1).
 *
 * Resources get a strong ETag derived from their content and updated_at,
 * so any write changes the tag. Collections get a strong ETag derived
 * from the serialised response body.
 */
const crypto = require('crypto');
const { HttpError } = require('./httpError');

/** JSON.stringify with recursively sorted object keys for a deterministic hash. */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function hash(input) {
  return crypto.createHash('sha1').update(input).digest('hex');
}

/** Strong ETag for a stored resource row ({ id, data, updated_at }). */
function resourceEtag(resource) {
  const stamp = resource.updated_at instanceof Date ? resource.updated_at.toISOString() : String(resource.updated_at || '');
  return `"${hash(`${resource.id}:${stamp}:${stableStringify(resource.data)}`)}"`;
}

/** Strong ETag for an arbitrary JSON body. */
function bodyEtag(body) {
  return `"${hash(stableStringify(body))}"`;
}

/** Parse an If-Match / If-None-Match header into a list of tags (or ['*']). */
function parseTagList(header) {
  if (header === undefined || header === null || header === '') return [];
  const s = String(header).trim();
  if (s === '*') return ['*'];
  return s.split(',').map(t => t.trim()).filter(Boolean);
}

function stripWeak(tag) {
  return tag.startsWith('W/') ? tag.slice(2) : tag;
}

/** Weak comparison: ignores the W/ prefix on either side. */
function weakMatch(a, b) {
  return stripWeak(a) === stripWeak(b);
}

/** Strong comparison: both must be strong and byte-equal. */
function strongMatch(a, b) {
  return !a.startsWith('W/') && !b.startsWith('W/') && a === b;
}

/**
 * True if the request's If-None-Match matches the current tag (→ 304 for GET/HEAD).
 */
function ifNoneMatchSatisfied(header, currentTag) {
  const tags = parseTagList(header);
  if (tags.length === 0) return false;
  if (tags[0] === '*') return true;
  return tags.some(t => weakMatch(t, currentTag));
}

/**
 * Enforce If-Match on a state-changing request. Throws 412 when the client's
 * tag no longer matches (lost-update protection).
 */
function assertIfMatch(header, currentTag) {
  const tags = parseTagList(header);
  if (tags.length === 0) return;
  if (tags[0] === '*') return;
  if (!tags.some(t => strongMatch(t, currentTag))) {
    throw new HttpError(412, 'PRECONDITION_FAILED',
      'The resource has been modified since it was last retrieved (If-Match mismatch)',
      { current_etag: currentTag });
  }
}

module.exports = {
  stableStringify, resourceEtag, bodyEtag, parseTagList,
  weakMatch, strongMatch, ifNoneMatchSatisfied, assertIfMatch,
};
