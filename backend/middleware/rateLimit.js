/**
 * Rate limiting (governance) for the three traffic classes the server handles.
 *
 *   management  /api/v1/**            per client IP
 *   auth        /api/v1/users/login   per client IP, much stricter (credential stuffing)
 *               /api/v1/users/register
 *   mock        /:username/:api/**    per client IP *and* per mock API, so one noisy
 *                                     consumer cannot starve every API on the host
 *
 * Limits are announced with the IETF draft-7 headers (RateLimit, RateLimit-Policy)
 * and a Retry-After on 429. Everything is tunable through the environment:
 *
 *   RATE_LIMIT_ENABLED            default true      set to "false" to disable (local dev / tests)
 *   RATE_LIMIT_WINDOW_MS          default 900000    15 min window for management + auth
 *   RATE_LIMIT_MANAGEMENT_MAX     default 300       requests / window / IP
 *   RATE_LIMIT_AUTH_MAX           default 20        requests / window / IP
 *   RATE_LIMIT_MOCK_WINDOW_MS     default 60000     1 min window for mock traffic
 *   RATE_LIMIT_MOCK_MAX           default 120       requests / window / IP / mock API
 *
 * The store is in-memory (single process). For a multi-instance deployment
 * swap in a shared store (e.g. rate-limit-redis) via the `store` option.
 */
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const ENABLED = String(process.env.RATE_LIMIT_ENABLED ?? 'true').toLowerCase() !== 'false';

function rateLimitedHandler(scope) {
  return (req, res, next, options) => {
    const resetMs = req.rateLimit?.resetTime ? req.rateLimit.resetTime.getTime() - Date.now() : options.windowMs;
    const retryAfter = Math.max(1, Math.ceil(resetMs / 1000));
    res.set('Retry-After', String(retryAfter));
    res.status(options.statusCode).json({
      error: `Too many requests to ${scope}. Limit is ${options.limit} per ${Math.round(options.windowMs / 1000)}s`,
      code: 'RATE_LIMITED',
      scope,
      limit: options.limit,
      window_seconds: Math.round(options.windowMs / 1000),
      retry_after: retryAfter,
    });
  };
}

function makeLimiter(scope, { windowMs, limit, keyGenerator, skip }) {
  if (!ENABLED) return (req, res, next) => next();
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    skip,
    handler: rateLimitedHandler(scope),
  });
}

const windowMs = envInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000);
const mockWindowMs = envInt('RATE_LIMIT_MOCK_WINDOW_MS', 60 * 1000);

const managementLimiter = makeLimiter('the management API', {
  windowMs,
  limit: envInt('RATE_LIMIT_MANAGEMENT_MAX', 300),
  skip: req => req.path === '/ping' || req.path === '/ping/',
});

const authLimiter = makeLimiter('authentication', {
  windowMs,
  limit: envInt('RATE_LIMIT_AUTH_MAX', 20),
});

const mockLimiter = makeLimiter('this mock API', {
  windowMs: mockWindowMs,
  limit: envInt('RATE_LIMIT_MOCK_MAX', 120),
  // ipKeyGenerator normalises IPv6 so a /64 can't rotate addresses to dodge the limit.
  keyGenerator: req => `${ipKeyGenerator(req.ip)}|${req.params.username}/${req.params.apiPath}`,
});

module.exports = { managementLimiter, authLimiter, mockLimiter, ENABLED };
