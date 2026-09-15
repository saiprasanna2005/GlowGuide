/* ==========================================================================
   GlowGuide backend — services/eventService.js
   The 5-stage prep template, copied verbatim from the frontend's
   js/planner.js STAGES constant, so newly created events get the exact
   same checklist the LocalStorage version always generated.
   ========================================================================== */
const pool = require('../config/db');

const STAGES = [
  { key: 'd7', label: '7 Days Before', items: ['Plan outfit', 'Choose makeup style', 'Plan hair look'] },
  { key: 'd3', label: '3 Days Before', items: ['Organize beauty products', 'Prepare accessories', 'Finalize look'] },
  { key: 'd1', label: '1 Day Before', items: ['Hair preparation', 'Personal care', 'Pack beauty essentials'] },
  { key: 'h3', label: '3 Hours Before', items: ['Hair', 'Makeup', 'Accessories'] },
  { key: 'm30', label: '30 Minutes Before', items: ['Final touch-up', 'Perfume', 'Photos'] },
];

async function getEventsForUser(userId) {
  const [events] = await pool.query(
    `SELECT id, name, event_date AS date, event_time AS time, style, created_at AS createdAt
     FROM beauty_events WHERE user_id = ? ORDER BY event_date ASC`,
    [userId]
  );
  if (!events.length) return [];

  const [tasks] = await pool.query(
    `SELECT event_id AS eventId, id, stage_key AS stageKey, stage_label AS stageLabel, item_label AS itemLabel, is_done AS isDone
     FROM event_tasks WHERE event_id IN (?) ORDER BY event_id, sort_order`,
    [events.map(e => e.id)]
  );

  return events.map(ev => ({
    ...ev,
    tasks: tasks.filter(t => t.eventId === ev.id).map(t => ({ id: t.id, stageKey: t.stageKey, stageLabel: t.stageLabel, itemLabel: t.itemLabel, isDone: !!t.isDone })),
  }));
}

async function createEvent(userId, { name, date, time, style }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO beauty_events (user_id, name, event_date, event_time, style) VALUES (?, ?, ?, ?, ?)',
      [userId, name, date, time || null, style || null]
    );
    const eventId = result.insertId;

    let sortOrder = 0;
    for (const stage of STAGES) {
      for (const item of stage.items) {
        await conn.query(
          'INSERT INTO event_tasks (event_id, stage_key, stage_label, item_label, sort_order) VALUES (?, ?, ?, ?, ?)',
          [eventId, stage.key, stage.label, item, sortOrder++]
        );
      }
    }
    await conn.commit();
    return eventId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateEvent(userId, eventId, { name, date, time, style }) {
  const [result] = await pool.query(
    `UPDATE beauty_events SET name = COALESCE(?, name), event_date = COALESCE(?, event_date),
       event_time = ?, style = COALESCE(?, style) WHERE id = ? AND user_id = ?`,
    [name || null, date || null, time || null, style || null, eventId, userId]
  );
  return result.affectedRows > 0;
}

async function deleteEvent(userId, eventId) {
  const [result] = await pool.query('DELETE FROM beauty_events WHERE id = ? AND user_id = ?', [eventId, userId]);
  return result.affectedRows > 0;
}

async function setTaskDone(userId, taskId, isDone) {
  const [result] = await pool.query(
    `UPDATE event_tasks et
     JOIN beauty_events be ON be.id = et.event_id
     SET et.is_done = ?
     WHERE et.id = ? AND be.user_id = ?`,
    [!!isDone, taskId, userId]
  );
  return result.affectedRows > 0;
}

module.exports = { getEventsForUser, createEvent, updateEvent, deleteEvent, setTaskDone, STAGES };
