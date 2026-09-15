/* ==========================================================================
   GlowGuide backend — services/routineService.js
   All DB access for routines/steps/completions. Every read/write is
   scoped by user_id (via a join back to `routines`), so a step ID that
   doesn't belong to the caller simply won't be found — never leaked,
   never editable.
   ========================================================================== */
const pool = require('../config/db');

/** Ensures the user has a `routines` row for this type, creating one if needed
 *  (covers accounts created before this feature, or edge cases). */
async function ensureRoutine(conn, userId, type) {
  const [rows] = await conn.query('SELECT id FROM routines WHERE user_id = ? AND type = ?', [userId, type]);
  if (rows[0]) return rows[0].id;
  const [result] = await conn.query('INSERT INTO routines (user_id, type) VALUES (?, ?)', [userId, type]);
  return result.insertId;
}

/** Returns { morning: [...], evening: [...] } with `done` = completed today,
 *  matching the exact shape the frontend already expects from GG.store.getRoutines(). */
async function getRoutinesForUser(userId) {
  const [rows] = await pool.query(
    `SELECT r.type, rs.id, rs.text, rs.minutes, rs.sort_order,
            (rc.step_id IS NOT NULL) AS done
     FROM routines r
     JOIN routine_steps rs ON rs.routine_id = r.id
     LEFT JOIN routine_completions rc
       ON rc.step_id = rs.id AND rc.completed_on = CURDATE() AND rc.user_id = r.user_id
     WHERE r.user_id = ?
     ORDER BY r.type, rs.sort_order, rs.id`,
    [userId]
  );

  const result = { morning: [], evening: [] };
  for (const row of rows) {
    result[row.type].push({ id: row.id, text: row.text, time: row.minutes, done: !!row.done });
  }
  return result;
}

async function addStep(userId, type, text, minutes) {
  const conn = await pool.getConnection();
  try {
    const routineId = await ensureRoutine(conn, userId, type);
    const [[{ maxOrder }]] = await conn.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM routine_steps WHERE routine_id = ?',
      [routineId]
    );
    const [result] = await conn.query(
      'INSERT INTO routine_steps (routine_id, text, minutes, sort_order) VALUES (?, ?, ?, ?)',
      [routineId, text, minutes, maxOrder + 1]
    );
    return { id: result.insertId, text, time: minutes, done: false };
  } finally {
    conn.release();
  }
}

/** Confirms a step belongs to this user before any mutation touches it. */
async function findOwnedStep(userId, stepId) {
  const [rows] = await pool.query(
    `SELECT rs.id, rs.routine_id, r.type FROM routine_steps rs
     JOIN routines r ON r.id = rs.routine_id
     WHERE rs.id = ? AND r.user_id = ?`,
    [stepId, userId]
  );
  return rows[0] || null;
}

async function updateStep(userId, stepId, { text, minutes }) {
  const step = await findOwnedStep(userId, stepId);
  if (!step) return null;
  const fields = [];
  const values = [];
  if (text !== undefined) { fields.push('text = ?'); values.push(text); }
  if (minutes !== undefined) { fields.push('minutes = ?'); values.push(minutes); }
  if (!fields.length) return step;
  values.push(stepId);
  await pool.query(`UPDATE routine_steps SET ${fields.join(', ')} WHERE id = ?`, values);
  return { id: stepId };
}

async function deleteStep(userId, stepId) {
  const step = await findOwnedStep(userId, stepId);
  if (!step) return false;
  await pool.query('DELETE FROM routine_steps WHERE id = ?', [stepId]);
  return true;
}

async function setStepCompletion(userId, stepId, done) {
  const step = await findOwnedStep(userId, stepId);
  if (!step) return null;
  if (done) {
    await pool.query(
      'INSERT IGNORE INTO routine_completions (step_id, user_id, completed_on) VALUES (?, ?, CURDATE())',
      [stepId, userId]
    );
  } else {
    await pool.query(
      'DELETE FROM routine_completions WHERE step_id = ? AND completed_on = CURDATE()',
      [stepId]
    );
  }
  return { id: stepId, done };
}

/** Persists a new step order for one routine type (drag-and-drop reorder). */
async function reorderSteps(userId, type, orderedStepIds) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < orderedStepIds.length; i++) {
      await conn.query(
        `UPDATE routine_steps rs
         JOIN routines r ON r.id = rs.routine_id
         SET rs.sort_order = ?
         WHERE rs.id = ? AND r.user_id = ? AND r.type = ?`,
        [i, orderedStepIds[i], userId, type]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { getRoutinesForUser, addStep, updateStep, deleteStep, setStepCompletion, reorderSteps, findOwnedStep };
