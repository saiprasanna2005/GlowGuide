const analyticsService = require('../services/analyticsService');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getDashboard = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardAnalytics(req.userId);
  return ok(res, data);
});

module.exports = { getDashboard };
