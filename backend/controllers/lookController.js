/* ==========================================================================
   GlowGuide backend — controllers/lookController.js
   Look Planner saved plans. `steps` is stored as a JSON snapshot of the
   generated Base/Eyes/Brows/... text, exactly as the frontend already
   saves it — the generation logic itself stays client-side (it's a pure,
   deterministic lookup table, not user data).
   ========================================================================== */
const pool = require('../config/db');
const { ok, fail } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { isNonEmptyString } = require('../validators/common');

const getLooks = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, occasion, style, time_minutes AS time, steps, saved_at AS savedAt
     FROM look_plans WHERE user_id = ? ORDER BY saved_at DESC`,
    [req.userId]
  );
  return ok(res, rows);
});

const createLook = asyncHandler(async (req, res) => {
  const { occasion, style, time, steps } = req.body || {};
  if (!isNonEmptyString(occasion) || !isNonEmptyString(style)) return fail(res, 'occasion and style are required', 400);
  const minutes = Number(time) || 15;

  const [result] = await pool.query(
    'INSERT INTO look_plans (user_id, occasion, style, time_minutes, steps) VALUES (?, ?, ?, ?, ?)',
    [req.userId, occasion, style, minutes, JSON.stringify(steps || [])]
  );
  return ok(res, { id: result.insertId }, 201);
});

const deleteLook = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM look_plans WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
  if (result.affectedRows === 0) return fail(res, 'Look plan not found', 404);
  return ok(res, { deleted: true });
});

module.exports = { getLooks, createLook, deleteLook };
