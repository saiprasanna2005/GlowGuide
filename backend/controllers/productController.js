/* ==========================================================================
   GlowGuide backend — controllers/productController.js
   Beauty Vault. Every query is scoped to req.userId — a product ID
   belonging to another user simply won't match any row.
   ========================================================================== */
const pool = require('../config/db');
const { ok, fail } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { isNonEmptyString, isValidRating, isValidDate } = require('../validators/common');

const CATEGORIES = ['Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Tools', 'Other'];

const getProducts = asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  const where = ['user_id = ?'];
  const params = [req.userId];

  if (category && CATEGORIES.includes(category)) { where.push('category = ?'); params.push(category); }
  if (search) { where.push('(name LIKE ? OR brand LIKE ? OR notes LIKE ?)'); const s = `%${search}%`; params.push(s, s, s); }

  const [rows] = await pool.query(
    `SELECT id, name, category, brand, rating, favorite, purchase_date AS purchaseDate, notes, created_at AS createdAt
     FROM beauty_products WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
    params
  );
  return ok(res, rows);
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, category, brand, rating, favorite, purchaseDate, notes } = req.body || {};
  if (!isNonEmptyString(name)) return fail(res, 'Product name is required', 400);
  if (!CATEGORIES.includes(category)) return fail(res, `Category must be one of: ${CATEGORIES.join(', ')}`, 400);
  if (!isValidRating(rating)) return fail(res, 'Rating must be an integer 0-5', 400);
  if (purchaseDate && !isValidDate(purchaseDate)) return fail(res, 'purchaseDate must be YYYY-MM-DD', 400);

  const [result] = await pool.query(
    `INSERT INTO beauty_products (user_id, name, category, brand, rating, favorite, purchase_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.userId, name.trim(), category, brand?.trim() || null, rating || 0, !!favorite, purchaseDate || null, notes?.trim() || null]
  );
  return ok(res, { id: result.insertId }, 201);
});

const updateProduct = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, category, brand, rating, favorite, purchaseDate, notes } = req.body || {};

  if (category !== undefined && !CATEGORIES.includes(category)) return fail(res, `Category must be one of: ${CATEGORIES.join(', ')}`, 400);
  if (rating !== undefined && !isValidRating(rating)) return fail(res, 'Rating must be an integer 0-5', 400);
  if (purchaseDate && !isValidDate(purchaseDate)) return fail(res, 'purchaseDate must be YYYY-MM-DD', 400);

  const [result] = await pool.query(
    `UPDATE beauty_products SET
       name = COALESCE(?, name), category = COALESCE(?, category), brand = ?,
       rating = COALESCE(?, rating), favorite = COALESCE(?, favorite),
       purchase_date = ?, notes = ?
     WHERE id = ? AND user_id = ?`,
    [name?.trim() || null, category || null, brand?.trim() || null, rating, favorite, purchaseDate || null, notes?.trim() || null, id, req.userId]
  );
  if (result.affectedRows === 0) return fail(res, 'Product not found', 404);
  return ok(res, { updated: true });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM beauty_products WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
  if (result.affectedRows === 0) return fail(res, 'Product not found', 404);
  return ok(res, { deleted: true });
});

module.exports = { getProducts, createProduct, updateProduct, deleteProduct, CATEGORIES };
