/* ==========================================================================
   GlowGuide backend — controllers/profileController.js
   Maps directly to the profile.html wizard fields. `name` lives on the
   users table (set at registration); everything else lives in `profiles`.
   GET returns hasProfile:false until the wizard has been completed once,
   so the frontend can redirect exactly like the old requireProfile() guard.
   ========================================================================== */
const pool = require('../config/db');
const { ok, fail } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { isNonEmptyString } = require('../validators/common');

const getProfile = asyncHandler(async (req, res) => {
  const [users] = await pool.query('SELECT name, email FROM users WHERE id = ?', [req.userId]);
  if (!users[0]) return fail(res, 'User not found', 404);

  const [profiles] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [req.userId]);
  const profile = profiles[0];

  return ok(res, {
    name: users[0].name,
    email: users[0].email,
    hasProfile: !!profile,
    goals: profile ? profile.goals : [],
    routineLength: profile ? profile.routine_length : null,
    categories: profile ? profile.categories : [],
    timePref: profile ? profile.time_pref : null,
    makeupStyle: profile ? profile.makeup_style : null,
    hairPref: profile ? profile.hair_pref : null,
  });
});

const putProfile = asyncHandler(async (req, res) => {
  const { name, goals, routineLength, categories, timePref, makeupStyle, hairPref } = req.body || {};

  if (name !== undefined) {
    if (!isNonEmptyString(name)) return fail(res, 'Name cannot be empty', 400);
    await pool.query('UPDATE users SET name = ? WHERE id = ?', [name.trim(), req.userId]);
  }

  await pool.query(
    `INSERT INTO profiles (user_id, goals, routine_length, categories, time_pref, makeup_style, hair_pref)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       goals = VALUES(goals), routine_length = VALUES(routine_length), categories = VALUES(categories),
       time_pref = VALUES(time_pref), makeup_style = VALUES(makeup_style), hair_pref = VALUES(hair_pref)`,
    [
      req.userId,
      JSON.stringify(goals || []),
      routineLength || null,
      JSON.stringify(categories || []),
      timePref || null,
      makeupStyle || null,
      hairPref || null,
    ]
  );

  return ok(res, { saved: true });
});

module.exports = { getProfile, putProfile };
