/**
 * Error carrying an HTTP status and a stable machine-readable code.
 * Controllers convert these into `{ error, code, ...details }` responses.
 */
class HttpError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return { error: this.message, code: this.code, ...this.details };
  }
}

/**
 * Normalise any thrown value into a { status, body } pair.
 * Legacy code throws plain objects like `{ status, message }`; keep supporting them.
 */
function toResponse(err) {
  if (err instanceof HttpError) {
    return { status: err.status, body: err.toJSON() };
  }
  const status = err && Number.isInteger(err.status) ? err.status : 500;
  const message = (err && err.message) || 'Internal server error';
  const body = { error: message };
  if (err && err.code) body.code = err.code;
  return { status, body };
}

module.exports = { HttpError, toResponse };
