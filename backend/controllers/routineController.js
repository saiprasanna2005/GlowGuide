/* ==========================================================================
   GlowGuide backend — controllers/routineController.js
   ========================================================================== */
const routineService = require('../services/routineService');
const { ok, fail } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { isNonEmptyString, clamp } = require('../validators/common');

const VALID_TYPES = ['morning', 'evening'];

const getRoutines = asyncHandler(async (req, res) => {
  const routines = await routineService.getRoutinesForUser(req.userId);
  return ok(res, routines);
});

const addStep = asyncHandler(async (req, res) => {
  const { type } = req.params;
  if (!VALID_TYPES.includes(type)) return fail(res, 'Routine type must be morning or evening', 400);

  const text = (req.body?.text || '').trim();
  if (!isNonEmptyString(text)) return fail(res, 'Step text is required', 400);
  const minutes = clamp(Number(req.body?.minutes) || 5, 1, 180);

  const step = await routineService.addStep(req.userId, type, text, minutes);
  return ok(res, step, 201);
});

const updateStep = asyncHandler(async (req, res) => {
  const stepId = Number(req.params.id);
  const patch = {};
  if (req.body?.text !== undefined) {
    if (!isNonEmptyString(req.body.text)) return fail(res, 'Step text cannot be empty', 400);
    patch.text = req.body.text.trim();
  }
  if (req.body?.minutes !== undefined) patch.minutes = clamp(Number(req.body.minutes) || 5, 1, 180);

  const updated = await routineService.updateStep(req.userId, stepId, patch);
  if (!updated) return fail(res, 'Step not found', 404);
  return ok(res, updated);
});

const deleteStep = asyncHandler(async (req, res) => {
  const stepId = Number(req.params.id);
  const deleted = await routineService.deleteStep(req.userId, stepId);
  if (!deleted) return fail(res, 'Step not found', 404);
  return ok(res, { deleted: true });
});

const completeStep = asyncHandler(async (req, res) => {
  const stepId = Number(req.params.id);
  const done = req.body?.done !== false; // default true if omitted
  const result = await routineService.setStepCompletion(req.userId, stepId, done);
  if (!result) return fail(res, 'Step not found', 404);
  return ok(res, result);
});

const reorderSteps = asyncHandler(async (req, res) => {
  const { type } = req.params;
  if (!VALID_TYPES.includes(type)) return fail(res, 'Routine type must be morning or evening', 400);
  const order = req.body?.order;
  if (!Array.isArray(order) || !order.length) return fail(res, 'order must be a non-empty array of step IDs', 400);

  await routineService.reorderSteps(req.userId, type, order.map(Number));
  return ok(res, { reordered: true });
});

module.exports = { getRoutines, addStep, updateStep, deleteStep, completeStep, reorderSteps };
