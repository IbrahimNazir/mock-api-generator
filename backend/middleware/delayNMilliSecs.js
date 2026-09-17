const MAX_DELAY_MS = 30000;

const delayNMilliSecs = (req, res, next) => {
  if (!req.query || req.query.delay === undefined) {
    return next();
  }
  const raw = req.query.delay;
  const n = /^\d+$/.test(String(raw)) ? parseInt(raw, 10) : NaN;
  if (Number.isNaN(n) || n < 0) {
    return res.status(400).json({ error: 'Delay must be a non-negative integer (milliseconds)', code: 'INVALID_DELAY' });
  }
  if (n > MAX_DELAY_MS) {
    return res.status(400).json({ error: `Delay must not exceed ${MAX_DELAY_MS} ms`, code: 'INVALID_DELAY' });
  }
  return setTimeout(next, n);
};

module.exports = { delayNMilliSecs, MAX_DELAY_MS };
