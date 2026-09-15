/* ==========================================================================
   GlowGuide backend — utils/asyncHandler.js
   Wraps an async route handler so a thrown/rejected error is forwarded
   to Express's error-handling middleware instead of crashing the process
   or requiring a try/catch in every controller.
   ========================================================================== */
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
