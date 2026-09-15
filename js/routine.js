/* ==========================================================================
   GlowGuide — routine.js
   Add / delete / complete / reorder (drag & drop) routine steps.
   Migrated (Step 3): MySQL via the backend API is now the source of
   truth — every mutation calls the API first and only updates the screen
   once the server confirms it. Nothing here writes to LocalStorage.
   ========================================================================== */
(function () {
  let dragId = null;
  let cache = { morning: [], evening: [] }; // last known-good server state, used only to render

  function loadingMarkup() {
    return `<div class="empty-state"><div class="icon">✨</div><h3>Loading…</h3><p>Fetching your routine.</p></div>`;
  }
  function errorMarkup(message) {
    return `<div class="empty-state"><div class="icon">⚠️</div><h3>Couldn't load this routine</h3><p>${GG.esc(message || 'Please check your connection and try again.')}</p><button class="btn btn-soft btn-sm" data-retry>Try again</button></div>`;
  }

  async function loadAndRender() {
    document.getElementById('morningList').innerHTML = loadingMarkup();
    document.getElementById('eveningList').innerHTML = loadingMarkup();

    const result = await GG.store.getRoutines();
    if (!result.ok) {
      const msg = result.status === 0 ? 'Network error — is the GlowGuide server running?' : result.message;
      document.getElementById('morningList').innerHTML = errorMarkup(msg);
      document.getElementById('eveningList').innerHTML = errorMarkup(msg);
      document.querySelectorAll('[data-retry]').forEach(btn => btn.addEventListener('click', loadAndRender));
      return;
    }

    cache = result.data;
    render();
  }

  function render() {
    renderList('morningList', cache.morning, 'morning');
    renderList('eveningList', cache.evening, 'evening');
    document.getElementById('morningCount').textContent = `${cache.morning.length} step${cache.morning.length===1?'':'s'}`;
    document.getElementById('eveningCount').textContent = `${cache.evening.length} step${cache.evening.length===1?'':'s'}`;
  }

  function renderList(containerId, list, key) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon">🪞</div><h3>No steps yet</h3><p>Add your first step below.</p></div>`;
      return;
    }
    list.forEach(task => {
      const row = document.createElement('div');
      row.className = 'task-row' + (task.done ? ' done' : '');
      row.draggable = true;
      row.dataset.id = task.id;
      row.innerHTML = `
        <span class="drag-handle" aria-hidden="true">⠿</span>
        <input type="checkbox" ${task.done ? 'checked' : ''} aria-label="Mark ${GG.esc(task.text)} complete">
        <span class="task-text">${GG.esc(task.text)}</span>
        <span class="task-meta">${task.time} min</span>
        <button class="btn-icon btn-sm-icon" data-del aria-label="Delete ${GG.esc(task.text)}" style="width:32px;height:32px">🗑️</button>`;

      const checkbox = row.querySelector('input');
      checkbox.addEventListener('change', async (e) => {
        const wantDone = e.target.checked;
        checkbox.disabled = true;
        const result = await GG.store.completeRoutineStep(task.id, wantDone);
        checkbox.disabled = false;
        if (!result.ok) {
          e.target.checked = !wantDone; // revert — the server didn't confirm the change
          GG.toast(result.message || 'Could not save that — please try again.');
          return;
        }
        task.done = wantDone;
        row.classList.toggle('done', wantDone);
        if (wantDone) GG.toast('✨ Routine completed!');
      });

      row.querySelector('[data-del]').addEventListener('click', async () => {
        const ok = await GG.confirm({ title: 'Delete this step?', body: `"${task.text}" will be removed from your ${key} routine.`, confirmText: 'Delete' });
        if (!ok) return;
        const result = await GG.store.deleteRoutineStep(task.id);
        if (!result.ok) { GG.toast(result.message || 'Could not delete that step.'); return; }
        cache[key] = cache[key].filter(x => x.id !== task.id);
        GG.toast('Step removed');
        render();
      });

      row.addEventListener('dragstart', () => { dragId = task.id; row.style.opacity = '.4'; });
      row.addEventListener('dragend', () => { row.style.opacity = '1'; });
      row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drag-over'); });
      row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
      row.addEventListener('drop', async (e) => {
        e.preventDefault();
        row.classList.remove('drag-over');
        if (!dragId || dragId === task.id) return;
        const arr = cache[key];
        const fromIdx = arr.findIndex(x => x.id === dragId);
        const toIdx = arr.findIndex(x => x.id === task.id);
        if (fromIdx === -1 || toIdx === -1) return;
        const [moved] = arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, moved);
        render(); // reorder feels instant; persist in the background
        const result = await GG.store.reorderRoutineSteps(key, arr.map(s => s.id));
        if (!result.ok) {
          GG.toast('Could not save the new order — reloading.');
          loadAndRender();
        }
      });

      container.appendChild(row);
    });
  }

  function wireForm(formId, inputId, timeId, key) {
    document.getElementById(formId).addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById(inputId);
      const timeInput = document.getElementById(timeId);
      const text = input.value.trim();
      if (!text) { GG.toast('Enter a step name first'); return; }
      const time = Math.max(1, Math.min(180, Number(timeInput.value) || 5));

      const submitBtn = document.querySelector(`#${formId} button[type="submit"]`);
      submitBtn.disabled = true;
      const result = await GG.store.addRoutineStep(key, text, time);
      submitBtn.disabled = false;

      if (!result.ok) { GG.toast(result.message || 'Could not add that step.'); return; }

      cache[key].push(result.data);
      input.value = '';
      timeInput.value = 5;
      GG.toast('Step added');
      render();
    });
  }

  wireForm('morningForm', 'morningInput', 'morningTime', 'morning');
  wireForm('eveningForm', 'eveningInput', 'eveningTime', 'evening');

  loadAndRender();
})();
