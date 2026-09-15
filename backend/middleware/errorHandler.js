/* ==========================================================================
   GlowGuide backend — middleware/errorHandler.js
   Centralized error handler. Never leaks raw SQL/stack traces to the
   client — logs the real error server-side, returns a generic message.
   ========================================================================== */
const { fail } = require('../utils/apiResponse');

function notFoundHandler(req, res) {
  return fail(res, `No route: ${req.method} ${req.originalUrl}`, 404);
}

function errorHandler(err, req, res, next) {
  console.error('[API ERROR]', req.method, req.originalUrl, '-', err.message);

  if (err.code === 'ER_DUP_ENTRY') {
    return fail(res, 'That email is already registered', 409);
  }
  if (err.type === 'entity.parse.failed') {
    return fail(res, 'Malformed JSON in request body', 400);
  }

  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  return fail(res, message, status);
}

module.exports = { notFoundHandler, errorHandler };
