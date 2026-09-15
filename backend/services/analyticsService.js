/* ==========================================================================
   GlowGuide backend — services/analyticsService.js
   Real calculations over routine_completions — nothing here is hard-coded.
   This mirrors the math the frontend used to do client-side over its
   LocalStorage `gg_history` blob (see the old GG.stats in js/storage.js),
   just computed from real rows instead of a derived snapshot.

   Definitions (documented per the spec's request):
   - "completion %" for a day = (distinct steps completed that day) /
     (total steps across both routines) * 100
   - a day counts toward the STREAK if at least one of the two routines
     (morning or evening) was completed IN FULL that day
   - weeklyConsistency = average completion % over the last 7 days
     (today inclusive)
   - monthlyConsistency = fraction of the last 30 days that had at least
     one fully-completed routine (not an average of %, a day-count ratio —
     mirrors the frontend's original monthlyConsistency() in insights.js)
   - glowScore = round(weeklyConsistency * 0.8 + min(streak * 2, 20)),
     carried over verbatim from the frontend's original GG.stats.glowScore()
   ========================================================================== */
const pool = require('../config/db');

function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function getStepCountsByType(userId) {
  const [rows] = await pool.query(
    `SELECT r.type, COUNT(rs.id) AS stepCount
     FROM routines r LEFT JOIN routine_steps rs ON rs.routine_id = r.id
     WHERE r.user_id = ? GROUP BY r.type`,
    [userId]
  );
  const counts = { morning: 0, evening: 0 };
  rows.forEach(r => { counts[r.type] = r.stepCount; });
  return counts;
}

/** One row per (day, type) with how many distinct steps of that type were completed that day. */
async function getDailyCompletionsByType(userId, sinceDate) {
  const [rows] = await pool.query(
    `SELECT rc.completed_on, r.type, COUNT(DISTINCT rc.step_id) AS completedCount
     FROM routine_completions rc
     JOIN routine_steps rs ON rs.id = rc.step_id
     JOIN routines r ON r.id = rs.routine_id
     WHERE rc.user_id = ? AND rc.completed_on >= ?
     GROUP BY rc.completed_on, r.type`,
    [userId, sinceDate]
  );
  // shape: { 'YYYY-MM-DD': { morning: n, evening: n } }
  const byDay = {};
  rows.forEach(r => {
    const key = r.completed_on;
    if (!byDay[key]) byDay[key] = { morning: 0, evening: 0 };
    byDay[key][r.type] = r.completedCount;
  });
  return byDay;
}

function buildLast7Days(byDay, stepCounts) {
  const totalSteps = stepCounts.morning + stepCounts.evening;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const entry = byDay[key] || { morning: 0, evening: 0 };
    const completed = entry.morning + entry.evening;
    const pct = totalSteps ? Math.round((completed / totalSteps) * 100) : 0;
    days.push({ date: key, label: d.toLocaleDateString('en-US', { weekday: 'short' }), pct });
  }
  return days;
}

function isDayFullyDone(entry, stepCounts) {
  if (!entry) return false;
  const morningDone = stepCounts.morning > 0 && entry.morning >= stepCounts.morning;
  const eveningDone = stepCounts.evening > 0 && entry.evening >= stepCounts.evening;
  return { morningDone, eveningDone, any: morningDone || eveningDone };
}

function computeStreak(byDay, stepCounts) {
  let streak = 0;
  const today = new Date();
  const todayEntry = byDay[dateKey(today)];
  const cursor = new Date(today);
  // If today has no completed routine yet, start counting from yesterday
  // so an in-progress day doesn't zero out an existing streak.
  if (!isDayFullyDone(todayEntry, stepCounts).any) cursor.setDate(cursor.getDate() - 1);

  for (let i = 0; i < 365; i++) {
    const entry = byDay[dateKey(cursor)];
    if (isDayFullyDone(entry, stepCounts).any) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function computeTotalRoutinesCompleted(byDay, stepCounts) {
  let total = 0;
  Object.values(byDay).forEach(entry => {
    const { morningDone, eveningDone } = isDayFullyDone(entry, stepCounts);
    total += (morningDone ? 1 : 0) + (eveningDone ? 1 : 0);
  });
  return total;
}

function computeMonthlyConsistency(byDay, stepCounts) {
  let daysWithActivity = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (isDayFullyDone(byDay[dateKey(d)], stepCounts).any) daysWithActivity++;
  }
  return Math.round((daysWithActivity / 30) * 100);
}

async function getDashboardAnalytics(userId) {
  const stepCounts = await getStepCountsByType(userId);

  const since30 = new Date(); since30.setDate(since30.getDate() - 29);
  const byDay = await getDailyCompletionsByType(userId, dateKey(since30));

  const last7Days = buildLast7Days(byDay, stepCounts);
  const weeklyConsistency = Math.round(last7Days.reduce((s, d) => s + d.pct, 0) / last7Days.length);
  const currentStreak = computeStreak(byDay, stepCounts);
  const totalRoutines = computeTotalRoutinesCompleted(byDay, stepCounts);
  const monthlyConsistency = computeMonthlyConsistency(byDay, stepCounts);
  const glowScore = Math.max(0, Math.min(100, Math.round(weeklyConsistency * 0.8 + Math.min(currentStreak * 2, 20))));

  const todayKey = dateKey(new Date());
  const completedToday = (byDay[todayKey]?.morning || 0) + (byDay[todayKey]?.evening || 0);

  const [[{ completedTasks }]] = await pool.query(
    'SELECT COUNT(*) AS completedTasks FROM routine_completions WHERE user_id = ?',
    [userId]
  );

  const [[{ favoriteProducts }]] = await pool.query(
    'SELECT COUNT(*) AS favoriteProducts FROM beauty_products WHERE user_id = ? AND favorite = TRUE',
    [userId]
  );
  const [[{ upcomingEvents }]] = await pool.query(
    'SELECT COUNT(*) AS upcomingEvents FROM beauty_events WHERE user_id = ? AND event_date >= CURDATE()',
    [userId]
  );
  const [[{ journalCount }]] = await pool.query(
    'SELECT COUNT(*) AS journalCount FROM journal_entries WHERE user_id = ?',
    [userId]
  );
  const [categoryRows] = await pool.query(
    `SELECT category, COUNT(*) AS n FROM beauty_products WHERE user_id = ? GROUP BY category ORDER BY n DESC LIMIT 1`,
    [userId]
  );

  return {
    totalRoutines,
    completedToday,
    weeklyConsistency,
    monthlyConsistency,
    currentStreak,
    completedTasks,
    glowScore,
    favoriteProducts,
    upcomingEvents,
    journalCount,
    mostUsedCategory: categoryRows[0]?.category || null,
    last7Days,
  };
}

module.exports = { getDashboardAnalytics };
