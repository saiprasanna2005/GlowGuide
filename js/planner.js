/* ==========================================================================
   GlowGuide — planner.js
   Event creation + dynamic staged preparation timeline.
   Migrated (Step 7): events and their 5-stage task checklist are now
   created and stored server-side (backend/services/eventService.js holds
   the same STAGES template this file used to own) — MySQL is the source
   of truth, including per-task completion.
   ========================================================================== */
(function () {
  const modal = document.getElementById('eventModal');
  const form = document.getElementById('eventForm');
  let cache = [];

  // Stage order/labels, used only for grouping the flat task list the
  // backend returns — the actual checklist content lives server-side now.
  const STAGE_ORDER = ['d7', 'd3', 'd1', 'h3', 'm30'];
  const STAGE_DAYS = { d7: 7, d3: 3, d1: 1, h3: 0.125, m30: 0.02 };

  function openModal() {
    modal.classList.remove('hidden');
    document.getElementById('evName').focus();
    const d = new Date(); d.setDate(d.getDate() + 14);
    if (!document.getElementById('evDate').value) document.getElementById('evDate').value = d.toISOString().slice(0,10);
  }
  function closeModal() { modal.classList.add('hidden'); form.reset(); document.querySelectorAll('#styleChips .chip').forEach((c,i)=>c.classList.toggle('selected', i===1)); }

  document.getElementById('newEventBtn').addEventListener('click', openModal);
  document.getElementById('newEventBtnEmpty').addEventListener('click', openModal);
  document.getElementById('cancelEventBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  document.getElementById('styleChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    document.querySelectorAll('#styleChips .chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('evName').value.trim();
    const date = document.getElementById('evDate').value;
    const time = document.getElementById('evTime').value || '19:00';
    const style = document.querySelector('#styleChips .chip.selected')?.dataset.value || 'Soft Glam';
    if (!name || !date) { GG.toast('Add an event name and date'); return; }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const result = await GG.store.addEvent({ name, date, time, style });
    submitBtn.disabled = false;

    if (!result.ok) { GG.toast(result.message || 'Could not create that event.'); return; }

    closeModal();
    GG.toast('👑 Event created — timeline ready');
    loadAndRender(); // simplest correct way to get the server-generated task list
  });

  function currentStageKey(tasksByStage, daysUntil) {
    for (const key of STAGE_ORDER) {
      const tasks = tasksByStage[key] || [];
      const doneCount = tasks.filter(t => t.isDone).length;
      if (daysUntil <= STAGE_DAYS[key] && doneCount < tasks.length) return key;
    }
    return null;
  }

  function renderEventCard(ev) {
    const daysUntil = GG.daysUntil(ev.date);
    const isPast = daysUntil < 0;
    const wrap = document.createElement('div');
    wrap.className = 'card scale-in';

    const tasksByStage = {};
    ev.tasks.forEach(t => { (tasksByStage[t.stageKey] = tasksByStage[t.stageKey] || []).push(t); });
    const totalItems = ev.tasks.length;
    const completedItems = ev.tasks.filter(t => t.isDone).length;
    const pct = totalItems ? Math.round((completedItems / totalItems) * 100) : 0;
    const activeStage = currentStageKey(tasksByStage, daysUntil);

    wrap.innerHTML = `
      <div class="flex-between" style="align-items:flex-start;margin-bottom:18px;flex-wrap:wrap;gap:14px">
        <div class="flex gap-md center">
          <div id="ring-${ev.id}"></div>
          <div>
            <h3 style="margin-bottom:2px">${GG.esc(ev.name)}</h3>
            <div class="muted">${GG.fmtDate(ev.date)} · ${ev.time || ''} · <span class="pill pill-lav" style="padding:.2em .7em">${GG.esc(ev.style || '')}</span></div>
            <div style="margin-top:6px;font-weight:700;font-size:.85rem;color:${isPast ? 'var(--ink-faint)' : 'var(--rose-deep)'}">
              ${isPast ? 'This event has passed' : daysUntil === 0 ? "It's today! ✨" : daysUntil + ' day' + (daysUntil===1?'':'s') + ' to go'}
            </div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" data-del-event="${ev.id}">Delete</button>
      </div>`;

    const timeline = document.createElement('div');
    timeline.className = 'timeline';

    const STAGE_LABELS = { d7: '7 Days Before', d3: '3 Days Before', d1: '1 Day Before', h3: '3 Hours Before', m30: '30 Minutes Before' };
    STAGE_ORDER.forEach(key => {
      const tasks = tasksByStage[key] || [];
      if (!tasks.length) return;
      const doneCount = tasks.filter(t => t.isDone).length;
      const block = document.createElement('div');
      block.className = 'timeline-block' + (doneCount === tasks.length ? ' complete' : '');
      const itemsHtml = tasks.map(t => `
        <label class="checkline">
          <input type="checkbox" data-task-id="${t.id}" ${t.isDone ? 'checked' : ''}>
          <span style="${t.isDone ? 'text-decoration:line-through;color:var(--ink-faint)' : ''}">${GG.esc(t.itemLabel)}</span>
        </label>`).join('');
      block.innerHTML = `
        <h4>${STAGE_LABELS[key]} ${!isPast && key === activeStage ? '<span class="pill pill-rose" style="margin-left:6px">now</span>' : ''}</h4>
        <div class="timeline-items">${itemsHtml}</div>`;
      timeline.appendChild(block);
    });
    wrap.appendChild(timeline);

    setTimeout(() => GG.renderRing(document.getElementById(`ring-${ev.id}`), { value: pct, size: 64, stroke: 7, label: pct + '%' }), 0);

    wrap.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', async () => {
        const taskId = Number(cb.dataset.taskId);
        const wantDone = cb.checked;
        cb.disabled = true;
        const result = await GG.store.setEventTaskDone(ev.id, taskId, wantDone);
        cb.disabled = false;
        if (!result.ok) { cb.checked = !wantDone; GG.toast(result.message || 'Could not save that.'); return; }
        const task = ev.tasks.find(t => t.id === taskId);
        task.isDone = wantDone;
        if (wantDone) GG.toast('✨ Prep step complete!');
        render(); // re-render this event card with fresh completion state
      });
    });

    wrap.querySelector(`[data-del-event]`).addEventListener('click', async () => {
      const ok = await GG.confirm({ title: 'Delete this event?', body: `"${ev.name}" and its prep timeline will be removed.` });
      if (!ok) return;
      const result = await GG.store.deleteEvent(ev.id);
      if (!result.ok) { GG.toast(result.message || 'Could not delete that event.'); return; }
      cache = cache.filter(x => x.id !== ev.id);
      GG.toast('Event deleted');
      render();
    });

    return wrap;
  }

  function render() {
    const events = [...cache].sort((a,b) => new Date(a.date) - new Date(b.date));
    const list = document.getElementById('eventsList');
    const empty = document.getElementById('eventsEmpty');
    list.innerHTML = '';
    if (!events.length) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    events.forEach(ev => list.appendChild(renderEventCard(ev)));
  }

  async function loadAndRender() {
    document.getElementById('eventsList').innerHTML = `<div class="empty-state"><div class="icon">✨</div><h3>Loading…</h3><p>Fetching your events.</p></div>`;
    document.getElementById('eventsEmpty').classList.add('hidden');

    const result = await GG.store.getEvents();
    if (!result.ok) {
      const msg = result.status === 0 ? 'Network error — is the GlowGuide server running?' : result.message;
      document.getElementById('eventsList').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Couldn't load your events</h3><p>${GG.esc(msg)}</p><button class="btn btn-soft btn-sm" id="plannerRetryBtn">Try again</button></div>`;
      document.getElementById('plannerRetryBtn').addEventListener('click', loadAndRender);
      return;
    }
    cache = result.data;
    render();
  }

  loadAndRender();
})();
