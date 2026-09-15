/* ==========================================================================
   GlowGuide — storage.js
   Thin data-access layer: every method here calls the backend REST API
   (via GG.api, see js/api.js) rather than LocalStorage. MySQL is the
   source of truth for all user data. The one deliberate exception is
   theme, which lives entirely in app.js's GG.theme and never touches
   this file — see the comment there for why.
   ========================================================================== */

const GG = window.GG || {};
window.GG = GG;

GG.today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

GG.store = {
  // ---- Profile: migrated to the backend (Step 2). ----
  getProfile() { return GG.api.get('/profile'); },
  putProfile(profile) { return GG.api.put('/profile', profile); },

  // ---- Routines: migrated to the backend (Step 3). MySQL is now the
  // source of truth; completion history lives in routine_completions,
  // not a LocalStorage snapshot. ----
  getRoutines() { return GG.api.get('/routines'); },
  addRoutineStep(type, text, minutes) { return GG.api.post(`/routines/${type}/steps`, { text, minutes }); },
  updateRoutineStep(id, patch) { return GG.api.put(`/routines/steps/${id}`, patch); },
  deleteRoutineStep(id) { return GG.api.del(`/routines/steps/${id}`); },
  completeRoutineStep(id, done) { return GG.api.post(`/routines/steps/${id}/complete`, { done }); },
  reorderRoutineSteps(type, order) { return GG.api.post(`/routines/${type}/reorder`, { order }); },

  // ---- Glam Planner events: migrated to the backend (Step 7). ----
  getEvents() { return GG.api.get('/events'); },
  addEvent(event) { return GG.api.post('/events', event); },
  updateEvent(id, patch) { return GG.api.put(`/events/${id}`, patch); },
  deleteEvent(id) { return GG.api.del(`/events/${id}`); },
  setEventTaskDone(eventId, taskId, isDone) { return GG.api.put(`/events/${eventId}/tasks/${taskId}`, { isDone }); },

  // ---- Beauty Vault: migrated to the backend (Step 5). ----
  getVault(params) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return GG.api.get('/products' + qs);
  },
  addProduct(product) { return GG.api.post('/products', product); },
  updateProduct(id, patch) { return GG.api.put(`/products/${id}`, patch); },
  deleteProduct(id) { return GG.api.del(`/products/${id}`); },


  // ---- Beauty Journal: migrated to the backend (Step 6). Images are sent
  // as the same base64 data URL the browser's FileReader already produces. ----
  getJournal() { return GG.api.get('/journal'); },
  addJournalEntry(entry) { return GG.api.post('/journal', entry); },
  deleteJournalEntry(id) { return GG.api.del(`/journal/${id}`); },

  // ---- Look Planner saved plans: migrated to the backend (Step 8). The
  // generation logic itself (occasion/style/time -> steps) stays entirely
  // client-side in looks.js — it's a deterministic lookup table, not user
  // data — only the SAVED result is persisted here. ----
  getLooks() { return GG.api.get('/looks'); },
  addLook(look) { return GG.api.post('/looks', look); },
  deleteLook(id) { return GG.api.del(`/looks/${id}`); },

  // ---- Settings: migrated to the backend (Step 9). Only `notifications`
  // lives here — theme is intentionally handled entirely in app.js's
  // GG.theme (see comment there) and never touches this API. ----
  getSettings() { return GG.api.get('/settings'); },
  putSettings(settings) { return GG.api.put('/settings', settings); },

  // ---- Feedback (Step 10): no LocalStorage equivalent ever existed for
  // this — it's a new, minimal addition wired straight to the backend. ----
  submitFeedback(feedback) { return GG.api.post('/feedback', feedback); },
};

/* ---- Analytics: migrated to the backend (Step 4). Glow Score, streak,
   weekly/monthly consistency, and the quick-stat counts are all computed
   server-side from real routine_completions/products/events/journal rows
   — see backend/services/analyticsService.js for the documented formulas.
   This single call replaces the old client-side GG.stats calculations. */
GG.stats = {
  getDashboardAnalytics() { return GG.api.get('/analytics/dashboard'); },
};

