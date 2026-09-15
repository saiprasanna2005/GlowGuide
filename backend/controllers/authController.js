/* ==========================================================================
   GlowGuide backend — controllers/authController.js
   ========================================================================== */
const authService = require('../services/authService');
const { validateRegister, validateLogin } = require('../validators/authValidators');
const { signToken, COOKIE_NAME, cookieOptions } = require('../utils/jwt');
const { ok, fail } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const errors = validateRegister(req.body);
  if (errors.length) return fail(res, errors[0], 400, { errors });

  const email = req.body.email.trim().toLowerCase();
  const existing = await authService.findByEmail(email);
  if (existing) return fail(res, 'That email is already registered', 409);

  const user = await authService.createUser({ name: req.body.name, email, password: req.body.password });
  const token = signToken(user.id);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return ok(res, { user }, 201);
});

const login = asyncHandler(async (req, res) => {
  const errors = validateLogin(req.body);
  if (errors.length) return fail(res, errors[0], 400, { errors });

  const email = req.body.email.trim().toLowerCase();
  const user = await authService.findByEmail(email);
  if (!user) return fail(res, 'Invalid email or password', 401);

  const validPassword = await authService.verifyPassword(req.body.password, user.password_hash);
  if (!validPassword) return fail(res, 'Invalid email or password', 401);

  const token = signToken(user.id);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return ok(res, { user: { id: user.id, name: user.name, email: user.email } });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  return ok(res, { loggedOut: true });
});

// Lets the frontend check "am I logged in?" on page load without
// duplicating token-decoding logic client-side.
const me = asyncHandler(async (req, res) => {
  const user = await authService.findById(req.userId);
  if (!user) return fail(res, 'User not found', 404);
  return ok(res, { user });
});

module.exports = { register, login, logout, me };
