/* ==========================================================================
   GlowGuide backend — middleware/optionalAuth.js
   For routes that work whether or not the caller is logged in (e.g.
   feedback), but should still attach req.userId when a valid session
   cookie IS present. Never rejects the request on a missing/bad token —
   that's the difference from authMiddleware.
   ========================================================================== */
const { verifyToken, COOKIE_NAME } = require('../utils/jwt');

module.exports = function optionalAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      req.userId = verifyToken(token).sub;
    } catch (err) {
      // invalid/expired token on an optional route — just proceed as a guest
    }
  }
  next();
};
