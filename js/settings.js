/* ==========================================================================
   GlowGuide — settings.js
   Migrated (Step 9): notifications persist via the backend. Theme stays
   local (see app.js's GG.theme). Export/Import/Clear/Reset are rebuilt to
   orchestrate the existing per-resource APIs client-side — there's no new
   backend endpoint for any of them, just honest use of what already exists,
   since leaving them silently acting on empty LocalStorage would mean the
   buttons lie about what they do now that MySQL is the source of truth.
   ========================================================================== */
(function () {
  async function init() {
    const profileResult = await GG.store.getProfile();
    document.getElementById('profileGoalsSummary').textContent = (profileResult.ok && profileResult.data.goals?.length)
      ? `Focused on: ${profileResult.data.goals.slice(0,2).join(', ')}${profileResult.data.goals.length > 2 ? '…' : ''}`
      : 'No goals set yet';

    const settingsResult = await GG.store.getSettings();
    document.getElementById('notifToggle').checked = settingsResult.ok ? !!settingsResult.data.notifications : true;
  }

  document.getElementById('notifToggle').addEventListener('change', async (e) => {
    const wantOn = e.target.checked;
    const result = await GG.store.putSettings({ notifications: wantOn });
    if (!result.ok) {
      e.target.checked = !wantOn;
      GG.toast(result.message || 'Could not save that preference.');
      return;
    }
    GG.toast(wantOn ? 'Notifications preference on' : 'Notifications preference off');
  });

  document.getElementById('themeToggleSettings').addEventListener('click', () => {
    const t = GG.theme.toggle();
    GG.toast(t === 'dark' ? '🌙 Dark mode on' : '☀️ Light mode on');
  });

  document.getElementById('loadDemoBtn').addEventListener('click', async () => {
    const ok = await GG.confirm({ title: 'Load demo data?', body: 'This adds fictional routines, products, events and a journal entry to your account. It will not erase anything already saved.', confirmText: 'Load Demo Data', danger: false });
    if (!ok) return;
    const result = await window.GG_DEMO.load();
    GG.toast(result.ok ? '✨ Demo data loaded' : (result.message || 'Could not load demo data.'));
  });

  /** Pulls every resource the signed-in account owns via the existing GET
   *  endpoints and bundles them into one JSON file — a client-side export,
   *  no dedicated backend endpoint needed. */
  document.getElementById('exportBtn').addEventListener('click', async () => {
    GG.toast('Preparing your export…');
    const [profile, routines, products, journal, events, looks, settings] = await Promise.all([
      GG.store.getProfile(), GG.store.getRoutines(), GG.store.getVault(),
      GG.store.getJournal(), GG.store.getEvents(), GG.store.getLooks(), GG.store.getSettings(),
    ]);
    const anyFailed = [profile, routines, products, journal, events, looks, settings].some(r => !r.ok);
    if (anyFailed) { GG.toast('Could not export — one or more requests failed.'); return; }

    const dump = {
      exportedAt: new Date().toISOString(),
      profile: profile.data, routines: routines.data, products: products.data,
      journal: journal.data, events: events.data, looks: looks.data, settings: settings.data,
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'glowguide-export.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    GG.toast('Data exported');
  });

  /** Re-creates products/journal/events/looks from an exported file by
   *  POSTing each item through the existing add-* endpoints. Routines and
   *  settings aren't re-imported (every account already has its own
   *  default routines; re-posting steps would just duplicate them). */
  document.getElementById('importInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let data;
      try { data = JSON.parse(reader.result); }
      catch (err) { GG.toast('That file could not be read as GlowGuide data'); e.target.value = ''; return; }

      const ok = await GG.confirm({ title: 'Import this file?', body: 'This adds the products, journal entries, events and saved looks from this file to your account (existing data is kept, not replaced).', confirmText: 'Import', danger: false });
      e.target.value = '';
      if (!ok) return;

      let imported = 0, failed = 0;
      for (const p of data.products || []) { const r = await GG.store.addProduct(p); r.ok ? imported++ : failed++; }
      for (const j of data.journal || []) { const r = await GG.store.addJournalEntry(j); r.ok ? imported++ : failed++; }
      for (const ev of data.events || []) { const r = await GG.store.addEvent(ev); r.ok ? imported++ : failed++; }
      for (const l of data.looks || []) { const r = await GG.store.addLook(l); r.ok ? imported++ : failed++; }

      GG.toast(failed ? `Imported ${imported} item${imported===1?'':'s'}, ${failed} failed` : `Imported ${imported} item${imported===1?'':'s'}`);
    };
    reader.readAsText(file);
  });

  /** Shared deletion logic for both "Clear Data" and "Reset". */
  async function clearAllUserData() {
    const [routinesR, productsR, journalR, eventsR, looksR] = await Promise.all([
      GG.store.getRoutines(), GG.store.getVault(), GG.store.getJournal(), GG.store.getEvents(), GG.store.getLooks(),
    ]);
    const deletions = [];
    if (routinesR.ok) [...routinesR.data.morning, ...routinesR.data.evening].forEach(s => deletions.push(GG.store.deleteRoutineStep(s.id)));
    if (productsR.ok) productsR.data.forEach(p => deletions.push(GG.store.deleteProduct(p.id)));
    if (journalR.ok) journalR.data.forEach(j => deletions.push(GG.store.deleteJournalEntry(j.id)));
    if (eventsR.ok) eventsR.data.forEach(ev => deletions.push(GG.store.deleteEvent(ev.id)));
    if (looksR.ok) looksR.data.forEach(l => deletions.push(GG.store.deleteLook(l.id)));
    await Promise.all(deletions);
  }

  document.getElementById('clearDemoBtn').addEventListener('click', async () => {
    const ok = await GG.confirm({ title: 'Clear all data?', body: 'This removes routine steps, events, vault products, journal entries and saved looks, but keeps your account and profile.', confirmText: 'Clear Data' });
    if (!ok) return;
    await clearAllUserData();
    GG.toast('Data cleared');
  });

  /** There's no account-deletion endpoint (deliberately out of scope) —
   *  "Reset" now means: clear all data (same as Clear Data), then log out,
   *  so the person lands back at a truly empty, signed-out state. */
  document.getElementById('resetAppBtn').addEventListener('click', async () => {
    const ok = await GG.confirm({ title: 'Reset GlowGuide?', body: 'This clears your routines, events, vault, journal and saved looks, then signs you out. Your account itself is not deleted.', confirmText: 'Reset Everything' });
    if (!ok) return;
    await clearAllUserData();
    await GG.api.post('/auth/logout');
    GG.toast('Application reset');
    setTimeout(() => { window.location.href = 'index.html'; }, 600);
  });

  document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('fbName').value.trim();
    const email = document.getElementById('fbEmail').value.trim();
    const message = document.getElementById('fbMessage').value.trim();
    if (!name || !email || !message) { GG.toast('Please fill in every field'); return; }

    const btn = document.getElementById('fbSubmitBtn');
    btn.disabled = true;
    const result = await GG.store.submitFeedback({ name, email, message });
    btn.disabled = false;

    if (!result.ok) { GG.toast(result.message || 'Could not send feedback — please try again.'); return; }
    document.getElementById('feedbackForm').reset();
    GG.toast('💌 Thanks for the feedback!');
  });

  init();
})();
