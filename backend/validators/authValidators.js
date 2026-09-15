/* ==========================================================================
   GlowGuide backend — validators/authValidators.js
   ========================================================================== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(body) {
  const errors = [];
  const { name, email, password, confirmPassword } = body || {};
  if (!name || !String(name).trim()) errors.push('Name is required');
  if (!email || !EMAIL_RE.test(String(email).trim())) errors.push('A valid email is required');
  if (!password || String(password).length < 8) errors.push('Password must be at least 8 characters');
  if (password !== confirmPassword) errors.push('Passwords do not match');
  return errors;
}

function validateLogin(body) {
  const errors = [];
  const { email, password } = body || {};
  if (!email || !EMAIL_RE.test(String(email).trim())) errors.push('A valid email is required');
  if (!password) errors.push('Password is required');
  return errors;
}

module.exports = { validateRegister, validateLogin, EMAIL_RE };
