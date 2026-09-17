/**
 * API version negotiation for mock endpoints.
 *
 * A mock API is identified by (username, base_path) and may exist in several
 * versions (semver strings such as `1.0.0`, `2.1.0`). A client selects one via:
 *
 *   1. Query string   ?api-version=2   ?api_version=2.1.0   ?v=2
 *   2. Headers        X-API-Version: 2       API-Version: 2
 *                     Accept: application/vnd.mock-api.v2+json
 *                     Accept: application/vnd.mock-api+json; version=2.1
 *                     Accept: application/json; version=2
 *   3. Request body   { "api_version": "2" } or { "apiVersion": "2" } (stripped before validation)
 *
 * A requested version may be a prefix (`2`, `2.1`, `v2`) and matches the
 * highest available version with those leading components. Supplying
 * different versions through several channels is a client error.
 */
const { HttpError } = require('./httpError');
const { VERSION_PARAMS } = require('./queryParams');

const VERSION_HEADERS = ['x-api-version', 'api-version'];
const BODY_KEYS = ['api_version', 'apiVersion'];
const VENDOR_TYPE = 'application/vnd.mock-api';

// v2 | 2 | 2.1 | 2.1.0  (optionally prefixed with "v")
const REQUESTED_RE = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/i;
const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

function isSemver(v) {
  return SEMVER_RE.test(String(v));
}

function parseSemver(v) {
  const m = SEMVER_RE.exec(String(v));
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function compareSemver(a, b) {
  const pa = parseSemver(a) || [0, 0, 0];
  const pb = parseSemver(b) || [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

/** Normalise a requested version string to its numeric components, or null if unparseable. */
function parseRequested(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  const m = REQUESTED_RE.exec(s);
  if (!m) return null;
  const parts = [m[1], m[2], m[3]].filter(x => x !== undefined).map(Number);
  return { raw: s, parts, normalised: parts.join('.') };
}

/** Extract a version from an Accept header value, if it carries one. */
function versionFromAccept(accept) {
  if (!accept) return null;
  for (const part of String(accept).split(',')) {
    const [type, ...paramParts] = part.split(';').map(s => s.trim());
    // application/vnd.mock-api.v2+json
    let m = new RegExp(`^${VENDOR_TYPE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.v?(\\d+(?:\\.\\d+){0,2})\\+json$`, 'i').exec(type);
    if (m) return m[1];
    // application/vnd.mock-api+json; version=2   |   application/json; version=2   |   ...; v=2
    if (/^application\/(json|vnd\.mock-api\+json)$/i.test(type)) {
      for (const p of paramParts) {
        const kv = /^(version|v)\s*=\s*"?([^"]+)"?$/i.exec(p);
        if (kv) return kv[2];
      }
    }
  }
  return null;
}

/**
 * Collect every version hint present on the request.
 * @returns {Array<{source: string, value: string}>}
 */
function collectRequestedVersions(req) {
  const found = [];
  const query = req.query || {};
  for (const name of VERSION_PARAMS) {
    if (query[name] !== undefined && query[name] !== '') found.push({ source: `query:${name}`, value: String(query[name]) });
  }
  const headers = req.headers || {};
  for (const name of VERSION_HEADERS) {
    if (headers[name]) found.push({ source: `header:${name}`, value: String(headers[name]) });
  }
  const fromAccept = versionFromAccept(headers.accept);
  if (fromAccept) found.push({ source: 'header:accept', value: fromAccept });
  const body = req.body;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    for (const key of BODY_KEYS) {
      if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
        found.push({ source: `body:${key}`, value: String(body[key]) });
      }
    }
  }
  return found;
}

/** Remove version keys from a JSON body so they never reach validation or storage. */
function stripBodyVersion(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  for (const key of BODY_KEYS) delete body[key];
  return body;
}

/**
 * Resolve the single version the client asked for.
 * @returns {{ requested: object|null, source: string|null }}
 * @throws HttpError 400 on malformed or conflicting hints
 */
function resolveRequestedVersion(req) {
  const hints = collectRequestedVersions(req);
  if (hints.length === 0) return { requested: null, source: null };

  const parsed = hints.map(h => {
    const p = parseRequested(h.value);
    if (!p) {
      throw new HttpError(400, 'INVALID_API_VERSION',
        `Invalid API version "${h.value}" (${h.source}). Use forms like 2, v2, 2.1 or 2.1.0`);
    }
    return { ...h, parsed: p };
  });

  const distinct = [...new Set(parsed.map(p => p.parsed.normalised))];
  if (distinct.length > 1) {
    throw new HttpError(400, 'API_VERSION_CONFLICT',
      `Conflicting API versions requested: ${parsed.map(p => `${p.source}=${p.value}`).join(', ')}`);
  }
  return { requested: parsed[0].parsed, source: parsed[0].source };
}

/**
 * Pick the API row matching a requested version among all versions of a base path.
 * Prefix requests (`2`, `2.1`) resolve to the highest matching semver.
 * @returns {object|null}
 */
function matchVersion(apis, requested) {
  const candidates = apis.filter(api => {
    const parts = parseSemver(api.version);
    if (!parts) return String(api.version) === requested.raw.replace(/^v/i, '');
    return requested.parts.every((n, i) => parts[i] === n);
  });
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => compareSemver(b.version, a.version))[0];
}

/**
 * The version served when the client doesn't ask for one:
 * explicit default → highest non-deprecated → highest overall.
 */
function defaultVersion(apis) {
  if (apis.length === 0) return null;
  const explicit = apis.find(a => a.is_default);
  if (explicit) return explicit;
  const live = apis.filter(a => !a.deprecated);
  const pool = live.length ? live : apis;
  return [...pool].sort((a, b) => compareSemver(b.version, a.version))[0];
}

/**
 * Full resolution: request → concrete API row.
 * @param {object} req
 * @param {Array} apis all versions sharing (username, base_path)
 * @returns {{ api: object, requested: object|null, source: string|null }}
 */
function selectApiVersion(req, apis) {
  const { requested, source } = resolveRequestedVersion(req);
  const available = apis.map(a => a.version).sort(compareSemver);
  if (!requested) {
    return { api: defaultVersion(apis), requested: null, source: null };
  }
  const api = matchVersion(apis, requested);
  if (!api) {
    const status = source === 'header:accept' ? 406 : 404;
    throw new HttpError(status, 'API_VERSION_NOT_FOUND',
      `API version "${requested.raw}" does not exist`, { available_versions: available });
  }
  return { api, requested, source };
}

/** Successor of a (deprecated) version: the highest non-deprecated version newer than it. */
function successorVersion(apis, current) {
  return apis
    .filter(a => !a.deprecated && compareSemver(a.version, current.version) > 0)
    .sort((a, b) => compareSemver(b.version, a.version))[0] || null;
}

module.exports = {
  VERSION_HEADERS, BODY_KEYS, VENDOR_TYPE,
  isSemver, parseSemver, compareSemver, parseRequested, versionFromAccept,
  collectRequestedVersions, stripBodyVersion, resolveRequestedVersion,
  matchVersion, defaultVersion, selectApiVersion, successorVersion,
};
