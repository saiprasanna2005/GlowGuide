/* ==========================================================================
   GlowGuide — journal.js
   Journal entries stored as a timeline of cards, newest first.
   Migrated (Step 6): entries persist via the backend/MySQL. Images are
   still read client-side as a base64 data URL (FileReader) — only WHERE
   they're stored changed, not how the upload UI works.
   ========================================================================== */
(function () {
  const modal = document.getElementById('entryModal');
  const form = document.getElementById('entryForm');
  let pendingImage = '';
  let cache = [];

  function openModal() {
    modal.classList.remove('hidden');
    document.getElementById('entDate').value = GG.today();
    document.getElementById('entDate').focus();
  }
  function closeModal() {
    modal.classList.add('hidden'); form.reset(); pendingImage = '';
    document.getElementById('entImagePreview').classList.add('hidden');
  }

  document.getElementById('newEntryBtn').addEventListener('click', openModal);
  document.getElementById('newEntryBtnEmpty').addEventListener('click', openModal);
  document.getElementById('cancelEntryBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  document.getElementById('entImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) { GG.toast('Please choose an image under 1.5MB'); e.target.value=''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      pendingImage = reader.result;
      const preview = document.getElementById('entImagePreview');
      preview.src = pendingImage;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const look = document.getElementById('entLook').value.trim();
    const date = document.getElementById('entDate').value;
    if (!look || !date) { GG.toast('Add a date and a look of the day'); return; }

    const entry = {
      date,
      mood: document.getElementById('entMood').value,
      look,
      routineCompleted: document.getElementById('entRoutine').checked,
      products: document.getElementById('entProducts').value.trim(),
      notes: document.getElementById('entNotes').value.trim(),
      image: pendingImage,
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const result = await GG.store.addJournalEntry(entry);
    submitBtn.disabled = false;

    if (!result.ok) { GG.toast(result.message || 'Could not save that entry.'); return; }

    cache.unshift({ id: result.data.id, ...entry, createdAt: Date.now() });
    GG.toast('📖 Journal entry saved');
    closeModal();
    render();
  });

  function productCount(str) {
    if (!str) return 0;
    return str.split(',').map(s => s.trim()).filter(Boolean).length;
  }

  function renderCard(entry) {
    const card = document.createElement('div');
    card.className = 'card journal-card scale-in';
    card.innerHTML = `
      ${entry.image ? `<img src="${entry.image}" alt="" style="width:100%;border-radius:var(--radius-md);margin-bottom:14px;max-height:220px;object-fit:cover">` : ''}
      <div class="flex-between" style="margin-bottom:6px">
        <h3 style="margin:0;font-size:1.05rem">${GG.fmtDate(entry.date)}</h3>
        ${entry.routineCompleted ? '<span class="pill pill-lav">Routine done</span>' : ''}
      </div>
      <div class="muted" style="margin-bottom:10px">Mood: ${GG.esc(entry.mood)}</div>
      <div style="font-weight:700;margin-bottom:4px">${GG.esc(entry.look)}</div>
      <div class="muted" style="margin-bottom:10px">Products: ${productCount(entry.products)}</div>
      ${entry.notes ? `<p style="font-style:italic;font-size:.9rem;margin-bottom:14px">"${GG.esc(entry.notes)}"</p>` : ''}
      <button class="btn btn-danger btn-sm" data-del>Delete</button>`;
    card.querySelector('[data-del]').addEventListener('click', async () => {
      const ok = await GG.confirm({ title: 'Delete this entry?', body: `Your entry from ${GG.fmtDate(entry.date)} will be removed.` });
      if (!ok) return;
      const result = await GG.store.deleteJournalEntry(entry.id);
      if (!result.ok) { GG.toast(result.message || 'Could not delete that entry.'); return; }
      cache = cache.filter(x => x.id !== entry.id);
      GG.toast('Entry removed');
      render();
    });
    return card;
  }

  function render() {
    const grid = document.getElementById('journalGrid');
    const empty = document.getElementById('journalEmpty');
    grid.innerHTML = '';
    if (!cache.length) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    cache.forEach(e => grid.appendChild(renderCard(e)));
  }

  async function loadAndRender() {
    document.getElementById('journalGrid').innerHTML = `<div class="empty-state"><div class="icon">✨</div><h3>Loading…</h3><p>Fetching your journal.</p></div>`;
    document.getElementById('journalEmpty').classList.add('hidden');

    const result = await GG.store.getJournal();
    if (!result.ok) {
      const msg = result.status === 0 ? 'Network error — is the GlowGuide server running?' : result.message;
      document.getElementById('journalGrid').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">⚠️</div><h3>Couldn't load your journal</h3><p>${GG.esc(msg)}</p><button class="btn btn-soft btn-sm" id="journalRetryBtn">Try again</button></div>`;
      document.getElementById('journalRetryBtn').addEventListener('click', loadAndRender);
      return;
    }
    cache = result.data;
    render();
  }

  loadAndRender();
})();
