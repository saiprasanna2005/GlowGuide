/* ==========================================================================
   GlowGuide backend — utils/apiResponse.js
   Consistent success/error envelope for every API response.
   ========================================================================== */

function ok(res, data = {}, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, message = 'Something went wrong', status = 400, extra = {}) {
  return res.status(status).json({ success: false, message, ...extra });
}

module.exports = { ok, fail };
