/* ==========================================================================
   GlowGuide — looks.js
   Rule-based look plan generator: occasion + style + time -> 7 steps.
   ========================================================================== */
(function () {
  const STEP_KEYS = ['Base', 'Eyes', 'Brows', 'Blush', 'Lips', 'Hair', 'Final Touch'];

  const STYLE_SUGGESTIONS = {
    Natural: {
      Base: 'Light tinted moisturizer or skin tint, blended with fingers for a bare-skin finish.',
      Eyes: 'A soft wash of neutral bronze or champagne shadow, smudged along the lash line.',
      Brows: 'Light brushing-up with a clear or tinted gel.',
      Blush: 'Cream blush on the cheeks, tapped upward for a flushed look.',
      Lips: 'Tinted balm or your natural lip color, one swipe.',
      Hair: 'Loose waves or a low natural bun.',
      'Final Touch': 'A light dusting of setting powder on the T-zone only.',
    },
    Minimal: {
      Base: 'Skin-tint or concealer only where needed — skip full coverage.',
      Eyes: 'Single neutral shade swept across the lid, no liner.',
      Brows: 'Quick fill with a brow pencil, then gel to set.',
      Blush: 'A touch of powder blush, high on the cheekbones.',
      Lips: 'Nude or your-lips-but-better gloss.',
      Hair: 'Sleek low ponytail or tucked-behind-ears.',
      'Final Touch': 'Setting spray, no powder.',
    },
    'Soft Glam': {
      Base: 'Medium-coverage foundation, cream contour, and highlighter on the high points.',
      Eyes: 'Warm transition shade in the crease, shimmer on the lid, soft winged liner.',
      Brows: 'Defined brows with pencil and gel for a structured shape.',
      Blush: 'Rosy blush blended from cheeks toward temples.',
      Lips: 'Lined lips with a satin or gloss finish.',
      Hair: 'Soft curls or a voluminous blowout.',
      'Final Touch': 'Setting spray plus a touch of face highlighter.',
    },
    Bold: {
      Base: 'Full-coverage foundation with sharp cream or powder contour.',
      Eyes: 'Graphic liner or a saturated colored shadow look with defined crease.',
      Brows: 'Sharp, structured brows with strong definition.',
      Blush: 'Bright or deep blush, blended with intention for a sculpted look.',
      Lips: 'Bold matte lip in a statement shade.',
      Hair: 'Sleek styling or defined curls that hold shape.',
      'Final Touch': 'Full setting spray for long wear, blot excess shine.',
    },
    Elegant: {
      Base: 'Airbrushed medium coverage with a soft-focus finish and subtle highlight.',
      Eyes: 'Smoky neutral eye with a fine line of definition, softly smudged.',
      Brows: 'Polished, groomed brows with a natural arch.',
      Blush: 'Subtle blush low on the cheeks for a classic flush.',
      Lips: 'Classic red or rosewood, precisely lined.',
      Hair: 'Elegant updo or smooth, defined waves.',
      'Final Touch': 'Fine mist setting spray and a dab of luxury balm on cheekbones.',
    },
  };

  const OCCASION_NOTES = {
    College: 'Comfortable and low-maintenance, made to last through a full day.',
    Work: 'Polished but understated, easy to wear through meetings.',
    Party: 'A little extra shimmer and staying power for the evening.',
    Wedding: 'Long-wear and photo-friendly, built to hold through the day.',
    Date: 'Soft and flattering, with a little glow.',
    Photoshoot: 'Camera-friendly finishes — avoid heavy SPF sheen, set well.',
  };

  const TIME_NOTES = {
    5: 'Quick version — focus on base, brows, and one lip step; skip anything optional.',
    15: 'Balanced routine — hit every step at a light-to-medium level.',
    30: 'Full routine with time to blend and build each step properly.',
    60: 'Unhurried — layer, build, and refine each step for a polished finish.',
  };

  function selected(groupId) {
    return document.querySelector(`#${groupId} .chip.selected`)?.dataset.value;
  }

  document.querySelectorAll('#occasionChips, #styleChipsLook, #timeChipsLook').forEach(group => {
    group.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip'); if (!chip) return;
      group.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });

  let currentPlan = null;

  function generate() {
    const occasion = selected('occasionChips') || 'College';
    const style = selected('styleChipsLook') || 'Natural';
    const time = selected('timeChipsLook') || '15';
    const suggestions = STYLE_SUGGESTIONS[style];

    currentPlan = { occasion, style, time, steps: STEP_KEYS.map(k => ({ step: k, text: suggestions[k] })) };

    document.getElementById('lookResultTitle').textContent = `${style} · ${occasion} (${time} min)`;
    const stepsEl = document.getElementById('lookSteps');
    stepsEl.innerHTML = '';

    const noteCard = document.createElement('div');
    noteCard.className = 'card scale-in';
    noteCard.style.gridColumn = '1 / -1';
    noteCard.innerHTML = `<p style="margin:0"><strong>${occasion}:</strong> ${OCCASION_NOTES[occasion]} <strong style="margin-left:6px">Time:</strong> ${TIME_NOTES[time]}</p>`;
    stepsEl.appendChild(noteCard);

    currentPlan.steps.forEach((s, i) => {
      const card = document.createElement('div');
      card.className = 'card scale-in';
      card.style.animationDelay = (i * 0.04) + 's';
      card.innerHTML = `<div class="eyebrow" style="margin-bottom:8px">${s.step}</div><p style="margin:0">${s.text}</p>`;
      stepsEl.appendChild(card);
    });

    document.getElementById('lookResultSection').style.display = 'block';
    document.getElementById('lookResultSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  document.getElementById('generateLookBtn').addEventListener('click', generate);

  let savedLooksCache = [];

  document.getElementById('saveLookBtn').addEventListener('click', async () => {
    if (!currentPlan) return;
    const saveBtn = document.getElementById('saveLookBtn');
    saveBtn.disabled = true;
    const result = await GG.store.addLook(currentPlan);
    saveBtn.disabled = false;
    if (!result.ok) { GG.toast(result.message || 'Could not save that plan.'); return; }
    savedLooksCache.unshift({ id: result.data.id, ...currentPlan, savedAt: Date.now() });
    GG.toast('🌷 Look plan saved');
    renderSaved();
  });

  function renderSaved() {
    const looks = savedLooksCache;
    const grid = document.getElementById('savedLooksGrid');
    const empty = document.getElementById('savedLooksEmpty');
    grid.innerHTML = '';
    if (!looks.length) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    looks.forEach(look => {
      const card = document.createElement('div');
      card.className = 'card scale-in';
      card.innerHTML = `
        <h3 style="font-size:1rem;margin-bottom:4px">${GG.esc(look.style)} · ${GG.esc(look.occasion)}</h3>
        <div class="muted" style="margin-bottom:12px">${look.time} minutes</div>
        <button class="btn btn-danger btn-sm" data-del>Delete</button>`;
      card.querySelector('[data-del]').addEventListener('click', async () => {
        const ok = await GG.confirm({ title: 'Delete this saved plan?' });
        if (!ok) return;
        const result = await GG.store.deleteLook(look.id);
        if (!result.ok) { GG.toast(result.message || 'Could not delete that plan.'); return; }
        savedLooksCache = savedLooksCache.filter(x => x.id !== look.id);
        GG.toast('Plan removed');
        renderSaved();
      });
      grid.appendChild(card);
    });
  }

  async function loadSaved() {
    document.getElementById('savedLooksGrid').innerHTML = `<div class="empty-state"><div class="icon">✨</div><h3>Loading…</h3><p>Fetching your saved plans.</p></div>`;
    document.getElementById('savedLooksEmpty').classList.add('hidden');
    const result = await GG.store.getLooks();
    if (!result.ok) {
      const msg = result.status === 0 ? 'Network error — is the GlowGuide server running?' : result.message;
      document.getElementById('savedLooksGrid').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Couldn't load saved plans</h3><p>${GG.esc(msg)}</p><button class="btn btn-soft btn-sm" id="looksRetryBtn">Try again</button></div>`;
      document.getElementById('looksRetryBtn').addEventListener('click', loadSaved);
      return;
    }
    savedLooksCache = result.data;
    renderSaved();
  }

  loadSaved();
})();
