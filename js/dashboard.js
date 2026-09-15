/* ==========================================================================
   GlowGuide — dashboard.js
   Migrated (Step 3 + Step 4): routine checklist and Glow Score / streak /
   quick stats now come from the backend (MySQL is the source of truth).
   The Upcoming Event card reads from the real events API (full Glam
   Planner CRUD migration is Step 7 — this page only needs to read it).
   ========================================================================== */
(function () {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greetingHeading').textContent = `${greeting}, ${GG._sessionUser?.name || 'Beautiful'} ✨`;
  document.getElementById('todayDateLabel').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  function renderTaskList(container, list, key) {
    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = `<p class="muted" style="margin:0">No steps yet — add some in My Routine.</p>`;
      return;
    }
    list.forEach(task => {
      const row = document.createElement('label');
      row.className = 'task-row' + (task.done ? ' done' : '');
      row.innerHTML = `
        <input type="checkbox" ${task.done ? 'checked' : ''} aria-label="Mark ${GG.esc(task.text)} complete">
        <span class="task-text">${GG.esc(task.text)}</span>
        <span class="task-meta">${task.time} min</span>`;
      const checkbox = row.querySelector('input');
      checkbox.addEventListener('change', async (e) => {
        const wantDone = e.target.checked;
        checkbox.disabled = true;
        const result = await GG.store.completeRoutineStep(task.id, wantDone);
        if (!result.ok) {
          e.target.checked = !wantDone;
          checkbox.disabled = false;
          GG.toast(result.message || 'Could not save that — please try again.');
          return;
        }
        task.done = wantDone;
        if (wantDone) GG.toast('✨ Routine completed!');
        await refresh(); // re-pull analytics too, since completion changes the Glow Score/streak
      });
      container.appendChild(row);
    });
  }

  function showDashboardError(message) {
    document.getElementById('morningTasks').innerHTML = `<p class="muted" style="margin:0">⚠️ ${GG.esc(message)}</p>`;
    document.getElementById('eveningTasks').innerHTML = '';
  }

  async function refresh() {
    const [routinesResult, analyticsResult, eventsResult] = await Promise.all([
      GG.store.getRoutines(),
      GG.stats.getDashboardAnalytics(),
      GG.store.getEvents(),
    ]);

    if (!routinesResult.ok || !analyticsResult.ok) {
      const msg = (routinesResult.status === 0 || analyticsResult.status === 0)
        ? 'Network error — is the GlowGuide server running?'
        : (routinesResult.message || analyticsResult.message);
      showDashboardError(msg);
      return;
    }

    const routines = routinesResult.data;
    renderTaskList(document.getElementById('morningTasks'), routines.morning, 'morning');
    renderTaskList(document.getElementById('eveningTasks'), routines.evening, 'evening');

    const mDone = routines.morning.filter(t => t.done).length;
    const eDone = routines.evening.filter(t => t.done).length;
    document.getElementById('morningPill').textContent = `${mDone}/${routines.morning.length}`;
    document.getElementById('eveningPill').textContent = `${eDone}/${routines.evening.length}`;

    const a = analyticsResult.data;
    GG.renderRing(document.getElementById('glowRing'), { value: a.glowScore, size: 100, stroke: 10, label: a.glowScore + '%', sub: 'Glow Score' });

    document.getElementById('streakFigure').textContent = `${a.currentStreak} day${a.currentStreak === 1 ? '' : 's'}`;
    document.getElementById('streakNote').textContent = a.currentStreak > 0
      ? `You've kept a routine going for ${a.currentStreak} day${a.currentStreak === 1 ? '' : 's'} straight.`
      : 'Complete a routine today to start your streak.';

    document.getElementById('statRoutines').textContent = a.totalRoutines;
    document.getElementById('statStreak').textContent = a.currentStreak;
    document.getElementById('statEvents').textContent = a.upcomingEvents;
    document.getElementById('statFavorites').textContent = a.favoriteProducts;

    const box = document.getElementById('upcomingEventBox');
    if (eventsResult.ok) {
      const upcoming = eventsResult.data.filter(e => GG.daysUntil(e.date) >= 0).sort((x, y) => new Date(x.date) - new Date(y.date));
      if (upcoming.length) {
        const ev = upcoming[0];
        const days = GG.daysUntil(ev.date);
        box.innerHTML = `
          <div class="stat-figure" style="font-size:1.25rem">${GG.esc(ev.name)}</div>
          <p style="margin-top:8px;font-size:.85rem">${days === 0 ? 'Today!' : days + ' day' + (days===1?'':'s') + ' away'} · ${GG.fmtDate(ev.date)}</p>`;
      } else {
        box.innerHTML = `<div class="stat-figure" style="font-size:1.3rem">No events yet</div><p style="margin-top:8px;font-size:.85rem">Plan one in the Glam Planner.</p>`;
      }
    } else {
      box.innerHTML = `<p class="muted" style="margin:0">Couldn't load events.</p>`;
    }

    renderChart(a.last7Days);
  }

  let chartInstance = null;
  function renderChart(last7Days) {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;
    if (typeof Chart === 'undefined') {
      const note = document.createElement('p');
      note.className = 'muted';
      note.style.margin = '0';
      note.textContent = 'Chart could not load (no network connection). Your data is still saved.';
      ctx.replaceWith(note);
      return;
    }
    const styles = getComputedStyle(document.documentElement);
    const ink = styles.getPropertyValue('--ink').trim();
    const lav = styles.getPropertyValue('--lavender-deep').trim();
    const line = styles.getPropertyValue('--line').trim();
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: last7Days.map(d => d.label),
        datasets: [{
          label: 'Completion %',
          data: last7Days.map(d => d.pct),
          backgroundColor: lav,
          borderRadius: 8,
          maxBarThickness: 46,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { color: ink, callback: v => v + '%' }, grid: { color: line } },
          x: { ticks: { color: ink }, grid: { display: false } },
        },
      },
    });
  }

  refresh();
})();
