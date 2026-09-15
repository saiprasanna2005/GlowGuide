/* ==========================================================================
   GlowGuide backend — middleware/authMiddleware.js
   Verifies the HTTP-only session cookie and attaches req.userId.
   Every protected route uses this — the user's identity always comes
   from the verified token, NEVER from a client-supplied :id/body field.
   ========================================================================== */
const { verifyToken, COOKIE_NAME } = require('../utils/jwt');
const { fail } = require('../utils/apiResponse');

module.exports = function authMiddleware(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return fail(res, 'Not authenticated', 401);

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return fail(res, 'Session expired or invalid, please log in again', 401);
  }
};
