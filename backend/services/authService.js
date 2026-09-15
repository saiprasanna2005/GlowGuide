/* ==========================================================================
   GlowGuide backend — services/authService.js
   All direct DB access for user accounts. Passwords are bcrypt-hashed
   here; controllers never see or handle a plaintext password beyond
   passing it in.
   ========================================================================== */
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const SALT_ROUNDS = 12;

// Default routine templates, carried over verbatim from the frontend's
// existing js/storage.js getRoutines() fallback so a new account starts
// with the same "Freshen up / Skincare / Haircare / Makeup / Final touch"
// experience the LocalStorage version always gave first-time users.
const DEFAULT_STEPS = {
  morning: [
    { text: 'Freshen up', minutes: 5 },
    { text: 'Skincare', minutes: 10 },
    { text: 'Haircare', minutes: 8 },
    { text: 'Makeup', minutes: 15 },
    { text: 'Final touch', minutes: 3 },
  ],
  evening: [
    { text: 'Remove makeup', minutes: 5 },
    { text: 'Cleanse', minutes: 8 },
    { text: 'Personal care', minutes: 10 },
    { text: 'Hair preparation', minutes: 5 },
    { text: 'Wind-down', minutes: 5 },
  ],
};

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

/**
 * Creates a user plus the same "day one" defaults the LocalStorage
 * version always had: default morning/evening routines and a settings row.
 * Runs inside a transaction so a failure partway through doesn't leave a
 * half-created account.
 */
async function createUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [userResult] = await conn.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), passwordHash]
    );
    const userId = userResult.insertId;

    for (const type of ['morning', 'evening']) {
      const [routineResult] = await conn.query(
        'INSERT INTO routines (user_id, type) VALUES (?, ?)',
        [userId, type]
      );
      const routineId = routineResult.insertId;
      const steps = DEFAULT_STEPS[type];
      for (let i = 0; i < steps.length; i++) {
        await conn.query(
          'INSERT INTO routine_steps (routine_id, text, minutes, sort_order) VALUES (?, ?, ?, ?)',
          [routineId, steps[i].text, steps[i].minutes, i]
        );
      }
    }

    await conn.query('INSERT INTO user_settings (user_id, notifications) VALUES (?, TRUE)', [userId]);

    await conn.commit();
    return { id: userId, name: name.trim(), email: email.trim().toLowerCase() };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { findByEmail, findById, createUser, verifyPassword };
