/* ==========================================================================
   GlowGuide — insights.js
   Analytics dashboard: charts + generated "Glow Habits" text insights.
   Migrated alongside Steps 4/5/7: pulls from the same
   GET /api/analytics/dashboard used by dashboard.js, plus the vault and
   events APIs for the category-distribution and event-prep breakdowns
   (those two are per-item views the summary endpoint doesn't carry).

   Note: the previous LocalStorage version could tell whether morning or
   evening was your "strongest habit" from raw daily history. The backend
   summary endpoint doesn't expose that per-routine-type breakdown, so
   that specific insight line is dropped rather than faked — everything
   else here reflects real, current data.
   ========================================================================== */
(function () {
  const styles = getComputedStyle(document.documentElement);
  const cssVar = (name) => styles.getPropertyValue(name).trim();

  function chartUnavailableNote() {
    const p = document.createElement('p');
    p.className = 'muted';
    p.style.margin = '0';
    p.textContent = 'Chart could not load (no network connection). Your data is still saved.';
    return p;
  }

  function showLoadError(message) {
    document.getElementById('habitsList').innerHTML = `<li>⚠️ ${GG.esc(message)}</li>`;
  }

  async function render() {
    const [analyticsResult, vaultResult, eventsResult] = await Promise.all([
      GG.stats.getDashboardAnalytics(), GG.store.getVault(), GG.store.getEvents(),
    ]);

    if (!analyticsResult.ok) {
      const msg = analyticsResult.status === 0 ? 'Network error — is the GlowGuide server running?' : analyticsResult.message;
      showLoadError(msg);
      return;
    }
    const a = analyticsResult.data;
    const days = a.last7Days;

    GG.renderRing(document.getElementById('insightRing'), { value: a.weeklyConsistency, size: 96, stroke: 10, label: a.weeklyConsistency + '%', sub: 'This week' });
    document.getElementById('insightStreak').textContent = a.currentStreak;
    document.getElementById('insightMonthly').textContent = a.monthlyConsistency + '%';
    document.getElementById('favProductsInsight').textContent = a.favoriteProducts;
    document.getElementById('journalCountInsight').textContent = a.journalCount;

    // weekly chart
    if (typeof Chart !== 'undefined') {
      new Chart(document.getElementById('insightsWeekChart'), {
        type: 'line',
        data: {
          labels: days.map(d => d.label),
          datasets: [{
            label: 'Completion %', data: days.map(d => d.pct), borderColor: cssVar('--rose-deep'),
            backgroundColor: 'rgba(227,174,172,.25)', fill: true, tension: .35, pointBackgroundColor: cssVar('--lavender-deep'),
            borderWidth: 3, pointRadius: 4,
          }],
        },
        options: {
          responsive: true, plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, max: 100, ticks: { color: cssVar('--ink'), callback: v => v + '%' }, grid: { color: cssVar('--line') } },
            x: { ticks: { color: cssVar('--ink') }, grid: { display: false } },
          },
        },
      });
    } else {
      document.getElementById('insightsWeekChart').replaceWith(chartUnavailableNote());
    }

    // category distribution
    const catEl = document.getElementById('categoryChart');
    const vault = vaultResult.ok ? vaultResult.data : [];
    if (!vault.length) {
      catEl.style.display = 'none';
      document.getElementById('categoryEmptyNote').style.display = 'block';
    } else if (typeof Chart !== 'undefined') {
      const counts = {};
      vault.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
      new Chart(catEl, {
        type: 'doughnut',
        data: {
          labels: Object.keys(counts),
          datasets: [{ data: Object.values(counts), backgroundColor: [cssVar('--rose'), cssVar('--lavender'), cssVar('--gold'), cssVar('--beige'), cssVar('--rose-deep'), cssVar('--lavender-deep')] }],
        },
        options: { plugins: { legend: { position: 'bottom', labels: { color: cssVar('--ink') } } } },
      });
    } else {
      catEl.replaceWith(chartUnavailableNote());
    }

    // event prep completion
    const events = eventsResult.ok ? eventsResult.data : [];
    const prepBox = document.getElementById('eventPrepStats');
    if (!events.length) {
      prepBox.innerHTML = `<p class="muted" style="margin:0">No events planned yet — visit the Glam Planner to create one.</p>`;
    } else {
      prepBox.innerHTML = events.map(ev => {
        const total = ev.tasks.length;
        const done = ev.tasks.filter(t => t.isDone).length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        return `<div style="margin-bottom:14px">
          <div class="flex-between" style="margin-bottom:4px"><strong>${GG.esc(ev.name)}</strong><span class="muted">${pct}%</span></div>
          <div style="height:8px;background:var(--line);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--grad-glow)"></div>
          </div>
        </div>`;
      }).join('');
    }

    renderHabits(a);
  }

  function renderHabits(a) {
    const list = document.getElementById('habitsList');
    const insights = [];

    const completedThisWeek = a.last7Days.filter(d => d.pct === 100).length;
    insights.push(`You completed ${completedThisWeek} full routine${completedThisWeek===1?'':'s'} this week.`);

    if (a.currentStreak > 0) {
      insights.push(`You've been consistent for ${a.currentStreak} day${a.currentStreak===1?'':'s'} in a row.`);
    } else {
      insights.push(`No active streak right now — complete a routine today to start one.`);
    }

    if (a.favoriteProducts > 0) insights.push(`You've marked ${a.favoriteProducts} product${a.favoriteProducts===1?'':'s'} as favorites in your Beauty Vault.`);
    if (a.journalCount > 0) insights.push(`You've written ${a.journalCount} journal entr${a.journalCount===1?'y':'ies'} — keep the timeline going.`);
    if (a.mostUsedCategory) insights.push(`${a.mostUsedCategory} is your most-stocked category in the Beauty Vault.`);

    if (a.weeklyConsistency >= 70) insights.push(`Your 7-day average completion is ${a.weeklyConsistency}% — a strong week.`);
    else if (a.weeklyConsistency > 0) insights.push(`Your 7-day average completion is ${a.weeklyConsistency}% — small steps still count.`);

    list.innerHTML = insights.map(i => `<li>${GG.esc(i)}</li>`).join('');
  }

  render();
})();
