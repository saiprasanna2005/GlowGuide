/* ==========================================================================
   GlowGuide backend — controllers/settingsController.js
   Only `notifications` is server-backed. Theme intentionally stays a
   frontend-only LocalStorage preference (see README) — no backend field
   for it, by design, not by omission.
   ========================================================================== */
const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getSettings = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT notifications FROM user_settings WHERE user_id = ?', [req.userId]);
  const notifications = rows[0] ? !!rows[0].notifications : true;
  return ok(res, { notifications });
});

const putSettings = asyncHandler(async (req, res) => {
  const notifications = req.body?.notifications !== false;
  await pool.query(
    `INSERT INTO user_settings (user_id, notifications) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE notifications = VALUES(notifications)`,
    [req.userId, notifications]
  );
  return ok(res, { notifications });
});

module.exports = { getSettings, putSettings };
