const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.RATE_LIMIT_MOCK_MAX = '3';
process.env.RATE_LIMIT_MOCK_WINDOW_MS = '60000';
const { mockLimiter } = require('../middleware/rateLimit');

const app = express();
app.set('trust proxy', 1);
app.get('/:username/:apiPath/:endpointPath', mockLimiter, (req, res) => res.json({ ok: true }));
let server, base;
test.before(async () => {
  await new Promise(resolve => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

test('mock limiter is scoped per IP + per API and announces draft-7 headers', async () => {
  for (let i = 1; i <= 3; i++) {
    const r = await fetch(`${base}/ibrahim/shop/products`);
    assert.equal(r.status, 200, `request ${i}`);
    assert.match(r.headers.get('ratelimit'), /limit=3, remaining=\d+, reset=\d+/);
    assert.equal(r.headers.get('ratelimit-policy'), '3;w=60');
  }
  const blocked = await fetch(`${base}/ibrahim/shop/products`);
  assert.equal(blocked.status, 429);
  const body = await blocked.json();
  assert.equal(body.code, 'RATE_LIMITED');
  assert.equal(body.limit, 3);
  assert.ok(Number(blocked.headers.get('retry-after')) >= 1);

  // A different mock API on the same host has its own budget.
  const other = await fetch(`${base}/ibrahim/blog/posts`);
  assert.equal(other.status, 200);
});
