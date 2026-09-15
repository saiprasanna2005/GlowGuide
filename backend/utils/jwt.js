/* ==========================================================================
   GlowGuide backend — utils/jwt.js
   Sign/verify helpers plus the one place that knows the auth cookie's name
   and options, so login/register/logout all stay consistent.
   ========================================================================== */
const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'gg_session';

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, mirrors default JWT_EXPIRES_IN
    path: '/',
  };
}

module.exports = { COOKIE_NAME, signToken, verifyToken, cookieOptions };
