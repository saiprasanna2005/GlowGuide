const eventService = require('../services/eventService');
const { ok, fail } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { isNonEmptyString, isValidDate } = require('../validators/common');

const getEvents = asyncHandler(async (req, res) => {
  const events = await eventService.getEventsForUser(req.userId);
  return ok(res, events);
});

const createEvent = asyncHandler(async (req, res) => {
  const { name, date, time, style } = req.body || {};
  if (!isNonEmptyString(name)) return fail(res, 'Event name is required', 400);
  if (!isValidDate(date)) return fail(res, 'date must be YYYY-MM-DD', 400);

  const id = await eventService.createEvent(req.userId, { name: name.trim(), date, time, style });
  return ok(res, { id }, 201);
});

const updateEvent = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, date, time, style } = req.body || {};
  if (date !== undefined && !isValidDate(date)) return fail(res, 'date must be YYYY-MM-DD', 400);

  const updated = await eventService.updateEvent(req.userId, id, { name, date, time, style });
  if (!updated) return fail(res, 'Event not found', 404);
  return ok(res, { updated: true });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const deleted = await eventService.deleteEvent(req.userId, Number(req.params.id));
  if (!deleted) return fail(res, 'Event not found', 404);
  return ok(res, { deleted: true });
});

const updateTask = asyncHandler(async (req, res) => {
  const taskId = Number(req.params.taskId);
  const isDone = req.body?.isDone !== false;
  const updated = await eventService.setTaskDone(req.userId, taskId, isDone);
  if (!updated) return fail(res, 'Task not found', 404);
  return ok(res, { updated: true });
});

module.exports = { getEvents, createEvent, updateEvent, deleteEvent, updateTask };
