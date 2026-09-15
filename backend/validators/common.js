/* ==========================================================================
   GlowGuide backend — validators/common.js
   Small, reusable field checks shared across controllers.
   ========================================================================== */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isValidDate(v) {
  return typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(new Date(v + 'T00:00:00').getTime());
}

function isValidRating(v) {
  return v === undefined || v === null || (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 5);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

module.exports = { isNonEmptyString, isValidDate, isValidRating, clamp, DATE_RE };
