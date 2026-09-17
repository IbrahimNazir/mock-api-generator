const test = require('node:test');
const assert = require('node:assert/strict');
const {
  compareSemver, parseRequested, versionFromAccept, collectRequestedVersions, stripBodyVersion,
  resolveRequestedVersion, matchVersion, defaultVersion, selectApiVersion, successorVersion,
} = require('../utils/version');

const apis = [
  { id: 'a', version: '1.0.0', deprecated: true, is_default: false },
  { id: 'b', version: '1.2.0', deprecated: false, is_default: false },
  { id: 'c', version: '2.0.0', deprecated: false, is_default: false },
  { id: 'd', version: '2.1.3', deprecated: false, is_default: false },
];
const req = ({ query = {}, headers = {}, body } = {}) => ({ query, headers, body });

test('compareSemver orders numerically, not lexically', () => {
  assert.ok(compareSemver('10.0.0', '9.0.0') > 0);
  assert.ok(compareSemver('1.2.0', '1.10.0') < 0);
  assert.equal(compareSemver('1.2.3', '1.2.3'), 0);
});

test('parseRequested accepts prefixes and v-prefix', () => {
  assert.deepEqual(parseRequested('v2').parts, [2]);
  assert.deepEqual(parseRequested('2.1').parts, [2, 1]);
  assert.deepEqual(parseRequested('2.1.3').parts, [2, 1, 3]);
  assert.equal(parseRequested('latest'), null);
  assert.equal(parseRequested('2.x'), null);
});

test('versionFromAccept understands vendor and parameter forms', () => {
  assert.equal(versionFromAccept('application/vnd.mock-api.v2+json'), '2');
  assert.equal(versionFromAccept('application/vnd.mock-api.2.1+json'), '2.1');
  assert.equal(versionFromAccept('application/vnd.mock-api+json; version=2.1.3'), '2.1.3');
  assert.equal(versionFromAccept('application/json; version=1'), '1');
  assert.equal(versionFromAccept('application/json;v=1'), '1');
  assert.equal(versionFromAccept('text/html, application/json;q=0.9, application/vnd.mock-api.v1+json'), '1');
  assert.equal(versionFromAccept('application/json'), null);
  assert.equal(versionFromAccept('*/*'), null);
  assert.equal(versionFromAccept(undefined), null);
});

test('collectRequestedVersions reads query, headers and body', () => {
  const r = req({
    query: { 'api-version': '2' },
    headers: { 'x-api-version': '2', accept: 'application/vnd.mock-api.v2+json' },
    body: { apiVersion: '2', name: 'x' },
  });
  assert.deepEqual(collectRequestedVersions(r).map(h => h.source), [
    'query:api-version', 'header:x-api-version', 'header:accept', 'body:apiVersion',
  ]);
});

test('stripBodyVersion removes version keys only', () => {
  const body = { api_version: '2', apiVersion: '2', name: 'x', version: 'keep-me' };
  stripBodyVersion(body);
  assert.deepEqual(body, { name: 'x', version: 'keep-me' });
  assert.deepEqual(stripBodyVersion([1]), [1]);
  assert.equal(stripBodyVersion(null), null);
});

test('resolveRequestedVersion: none, single, agreeing and conflicting', () => {
  assert.deepEqual(resolveRequestedVersion(req()), { requested: null, source: null });
  assert.equal(resolveRequestedVersion(req({ query: { v: 'v2' } })).requested.normalised, '2');
  // Same version on two channels is fine.
  assert.equal(resolveRequestedVersion(req({ query: { v: '2' }, headers: { 'x-api-version': 'v2' } })).requested.normalised, '2');
  assert.throws(
    () => resolveRequestedVersion(req({ query: { v: '2' }, headers: { 'x-api-version': '1' } })),
    e => e.status === 400 && e.code === 'API_VERSION_CONFLICT');
  assert.throws(
    () => resolveRequestedVersion(req({ headers: { 'api-version': 'beta' } })),
    e => e.status === 400 && e.code === 'INVALID_API_VERSION');
});

test('matchVersion resolves exact and prefix matches to the highest candidate', () => {
  assert.equal(matchVersion(apis, parseRequested('1')).id, 'b');
  assert.equal(matchVersion(apis, parseRequested('1.0')).id, 'a');
  assert.equal(matchVersion(apis, parseRequested('2')).id, 'd');
  assert.equal(matchVersion(apis, parseRequested('2.0')).id, 'c');
  assert.equal(matchVersion(apis, parseRequested('2.1.3')).id, 'd');
  assert.equal(matchVersion(apis, parseRequested('3')), null);
  assert.equal(matchVersion(apis, parseRequested('2.1.2')), null);
});

test('defaultVersion prefers explicit default, then highest non-deprecated', () => {
  assert.equal(defaultVersion(apis).id, 'd');
  const pinned = apis.map(a => ({ ...a, is_default: a.id === 'b' }));
  assert.equal(defaultVersion(pinned).id, 'b');
  const allDeprecated = apis.map(a => ({ ...a, deprecated: true }));
  assert.equal(defaultVersion(allDeprecated).id, 'd');
  assert.equal(defaultVersion([]), null);
});

test('selectApiVersion: 404 for unknown query/header version, 406 for Accept', () => {
  assert.equal(selectApiVersion(req(), apis).api.id, 'd');
  assert.equal(selectApiVersion(req({ query: { api_version: '1' } }), apis).api.id, 'b');
  assert.throws(() => selectApiVersion(req({ query: { api_version: '9' } }), apis),
    e => e.status === 404 && e.code === 'API_VERSION_NOT_FOUND' && e.details.available_versions.length === 4);
  assert.throws(() => selectApiVersion(req({ headers: { accept: 'application/vnd.mock-api.v9+json' } }), apis),
    e => e.status === 406);
  assert.throws(() => selectApiVersion(req({ body: { api_version: '9' } }), apis), e => e.status === 404);
});

test('successorVersion picks the next live version', () => {
  assert.equal(successorVersion(apis, apis[0]).id, 'd');
  assert.equal(successorVersion(apis, apis[3]), null);
});
