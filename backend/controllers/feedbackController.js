const pool = require('../config/db');
const { ok, fail } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { isNonEmptyString } = require('../validators/common');
const { EMAIL_RE } = require('../validators/authValidators');

const submitFeedback = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!isNonEmptyString(name)) return fail(res, 'Name is required', 400);
  if (!email || !EMAIL_RE.test(email)) return fail(res, 'A valid email is required', 400);
  if (!isNonEmptyString(message)) return fail(res, 'Message is required', 400);

  await pool.query(
    'INSERT INTO feedback (user_id, name, email, message) VALUES (?, ?, ?, ?)',
    [req.userId || null, name.trim(), email.trim(), message.trim()]
  );
  return ok(res, { submitted: true }, 201);
});

module.exports = { submitFeedback };
