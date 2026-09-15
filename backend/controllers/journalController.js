/* ==========================================================================
   GlowGuide backend — controllers/journalController.js
   Beauty Journal. `image` is the same base64 data URL the frontend already
   produces client-side via FileReader — stored as-is in a MEDIUMTEXT column.
   ========================================================================== */
const pool = require('../config/db');
const { ok, fail } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { isNonEmptyString, isValidDate } = require('../validators/common');

// ~2MB of base64 text is a generous ceiling above the frontend's existing
// 1.5MB *file* limit (base64 inflates size by ~33%) — guards against an
// oversized payload reaching the database at all.
const MAX_IMAGE_LENGTH = 2_100_000;

const getEntries = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, entry_date AS date, mood, look, routine_completed AS routineCompleted,
            products, notes, image, created_at AS createdAt
     FROM journal_entries WHERE user_id = ? ORDER BY entry_date DESC, created_at DESC`,
    [req.userId]
  );
  return ok(res, rows);
});

const getEntry = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, entry_date AS date, mood, look, routine_completed AS routineCompleted,
            products, notes, image, created_at AS createdAt
     FROM journal_entries WHERE id = ? AND user_id = ?`,
    [Number(req.params.id), req.userId]
  );
  if (!rows[0]) return fail(res, 'Journal entry not found', 404);
  return ok(res, rows[0]);
});

const createEntry = asyncHandler(async (req, res) => {
  const { date, mood, look, routineCompleted, products, notes, image } = req.body || {};
  if (!isValidDate(date)) return fail(res, 'date must be YYYY-MM-DD', 400);
  if (!isNonEmptyString(look)) return fail(res, 'Look of the day is required', 400);
  if (image && image.length > MAX_IMAGE_LENGTH) return fail(res, 'Image is too large', 400);

  const [result] = await pool.query(
    `INSERT INTO journal_entries (user_id, entry_date, mood, look, routine_completed, products, notes, image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.userId, date, mood || null, look.trim(), !!routineCompleted, products?.trim() || null, notes?.trim() || null, image || null]
  );
  return ok(res, { id: result.insertId }, 201);
});

const updateEntry = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { date, mood, look, routineCompleted, products, notes, image } = req.body || {};
  if (date !== undefined && !isValidDate(date)) return fail(res, 'date must be YYYY-MM-DD', 400);
  if (image && image.length > MAX_IMAGE_LENGTH) return fail(res, 'Image is too large', 400);

  const [result] = await pool.query(
    `UPDATE journal_entries SET
       entry_date = COALESCE(?, entry_date), mood = ?, look = COALESCE(?, look),
       routine_completed = COALESCE(?, routine_completed), products = ?, notes = ?, image = COALESCE(?, image)
     WHERE id = ? AND user_id = ?`,
    [date || null, mood || null, look?.trim() || null, routineCompleted, products?.trim() || null, notes?.trim() || null, image || null, id, req.userId]
  );
  if (result.affectedRows === 0) return fail(res, 'Journal entry not found', 404);
  return ok(res, { updated: true });
});

const deleteEntry = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM journal_entries WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
  if (result.affectedRows === 0) return fail(res, 'Journal entry not found', 404);
  return ok(res, { deleted: true });
});

module.exports = { getEntries, getEntry, createEntry, updateEntry, deleteEntry };
