/**
 * Resolves an incoming mock request (`/:username/:apiPath/:endpointPath`) to
 * a concrete API version + endpoint, applying version negotiation, access
 * control and lifecycle (deprecation / sunset) headers.
 */
const Api = require('../models/Api');
const Endpoint = require('../models/Endpoint');
const authorize = require('../utils/authorize');
const { HttpError } = require('../utils/httpError');
const { selectApiVersion, stripBodyVersion, successorVersion } = require('../utils/version');

/** Append a value to a comma-separated list header (Link, Vary). */
function appendListHeader(res, name, value) {
  if (!value) return;
  const existing = res.get(name);
  res.set(name, existing ? `${existing}, ${value}` : value);
}

function versionedPath(req, version) {
  return `${req.baseUrl}${req.path}?api-version=${encodeURIComponent(version)}`;
}

function toHttpDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toUTCString();
}

/**
 * Emit version-related response headers:
 *   X-API-Version                      version actually served
 *   Vary                               so caches key on the negotiation inputs
 *   Deprecation (RFC 9745), Sunset (RFC 8594), Link rel="successor-version"
 */
function setVersionHeaders(req, res, api, versions) {
  res.set('X-API-Version', api.version);
  appendListHeader(res, 'Vary', 'Accept, X-API-Version, API-Version');
  if (api.deprecated) {
    const since = api.deprecated_at || api.updated_at;
    const stamp = since ? Math.floor(new Date(since).getTime() / 1000) : null;
    res.set('Deprecation', stamp ? `@${stamp}` : 'true');
    const sunset = api.sunset_at ? toHttpDate(api.sunset_at) : null;
    if (sunset) res.set('Sunset', sunset);
    const successor = successorVersion(versions, api);
    if (successor) {
      appendListHeader(res, 'Link', `<${versionedPath(req, successor.version)}>; rel="successor-version"`);
    }
  }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} method HTTP method the endpoint must support
 * @returns {Promise<{ api: object, endpoint: object, versions: object[] }>}
 */
async function resolveMockEndpoint(req, res, method) {
  const { username, apiPath, endpointPath } = req.params;

  const versions = await Api.findVersionsByUsernameAndBasePath(username, `/${apiPath}`);
  if (versions.length === 0) {
    throw new HttpError(404, 'API_NOT_FOUND', `No API mounted at /${username}/${apiPath}`);
  }

  const { api } = selectApiVersion(req, versions);
  stripBodyVersion(req.body);
  setVersionHeaders(req, res, api, versions);

  if (api.deprecated && api.sunset_at && new Date(api.sunset_at).getTime() <= Date.now()) {
    const successor = successorVersion(versions, api);
    throw new HttpError(410, 'API_VERSION_SUNSET',
      `API version ${api.version} was sunset on ${toHttpDate(api.sunset_at)}`,
      { successor_version: successor ? successor.version : null });
  }

  if (!api.is_public) {
    await authorize(req, res);
    if (!req.user || req.user.id !== api.user_id) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Unauthorized');
    }
  }

  const endpoint = await Endpoint.findByApiIdPathAndMethod(api.id, `/${endpointPath}`, method);
  if (!endpoint) {
    throw new HttpError(404, 'ENDPOINT_NOT_FOUND', `Endpoint not found or ${method} method not supported`);
  }

  return { api, endpoint, versions };
}

module.exports = { resolveMockEndpoint, setVersionHeaders, appendListHeader };
