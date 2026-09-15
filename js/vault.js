/* ==========================================================================
   GlowGuide — vault.js
   Product collection: add / edit / delete / search / filter.
   Migrated (Step 5): MySQL via the backend is now the source of truth.
   Search/filter stay instant and client-side over a local cache of the
   user's own products (fetched once), matching the original UX exactly.
   ========================================================================== */
(function () {
  const modal = document.getElementById('productModal');
  const form = document.getElementById('productForm');
  let editingId = null;
  let cache = []; // last known-good server state

  const CATEGORY_ICON = { Skincare: '🧴', Makeup: '💄', Haircare: '💇', Fragrance: '🌸', Tools: '🖌️', Other: '✨' };

  function openModal(product) {
    editingId = product ? product.id : null;
    document.getElementById('productModalTitle').textContent = product ? 'Edit Product' : 'Add Product';
    document.getElementById('saveProductBtn').textContent = product ? 'Save Changes' : 'Add Product';
    document.getElementById('prodName').value = product?.name || '';
    document.getElementById('prodCategory').value = product?.category || 'Skincare';
    document.getElementById('prodBrand').value = product?.brand || '';
    document.getElementById('prodRating').value = product?.rating || 0;
    document.getElementById('prodDate').value = product?.purchaseDate || '';
    document.getElementById('prodFav').checked = !!product?.favorite;
    document.getElementById('prodNotes').value = product?.notes || '';
    modal.classList.remove('hidden');
    document.getElementById('prodName').focus();
  }
  function closeModal() { modal.classList.add('hidden'); form.reset(); editingId = null; }

  document.getElementById('addProductBtn').addEventListener('click', () => openModal(null));
  document.getElementById('addProductBtnEmpty').addEventListener('click', () => openModal(null));
  document.getElementById('cancelProductBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('prodName').value.trim();
    if (!name) { GG.toast('Add a product name'); return; }
    const data = {
      name,
      category: document.getElementById('prodCategory').value,
      brand: document.getElementById('prodBrand').value.trim(),
      rating: Number(document.getElementById('prodRating').value),
      purchaseDate: document.getElementById('prodDate').value,
      favorite: document.getElementById('prodFav').checked,
      notes: document.getElementById('prodNotes').value.trim(),
    };

    const saveBtn = document.getElementById('saveProductBtn');
    saveBtn.disabled = true;

    if (editingId) {
      const result = await GG.store.updateProduct(editingId, data);
      saveBtn.disabled = false;
      if (!result.ok) { GG.toast(result.message || 'Could not update that product.'); return; }
      const p = cache.find(x => x.id === editingId);
      Object.assign(p, data);
      GG.toast('Product updated');
    } else {
      const result = await GG.store.addProduct(data);
      saveBtn.disabled = false;
      if (!result.ok) { GG.toast(result.message || 'Could not add that product.'); return; }
      cache.push({ id: result.data.id, ...data, createdAt: new Date().toISOString() });
      GG.toast('💄 Product added to your vault');
    }
    closeModal();
    render();
  });

  function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

  function renderCard(p) {
    const card = document.createElement('div');
    card.className = 'card scale-in';
    card.innerHTML = `
      <div class="flex-between" style="margin-bottom:10px">
        <span style="font-size:1.6rem">${CATEGORY_ICON[p.category] || '✨'}</span>
        ${p.favorite ? '<span class="pill pill-rose">♥ Favorite</span>' : ''}
      </div>
      <h3 style="font-size:1.02rem;margin-bottom:2px">${GG.esc(p.name)}</h3>
      <div class="muted" style="margin-bottom:8px">${GG.esc(p.brand) || 'No brand noted'} · ${GG.esc(p.category)}</div>
      ${p.rating ? `<div class="rating-stars" style="margin-bottom:8px">${stars(p.rating)}</div>` : ''}
      ${p.notes ? `<p style="font-size:.85rem;margin-bottom:10px">${GG.esc(p.notes)}</p>` : ''}
      ${p.purchaseDate ? `<div class="muted" style="margin-bottom:14px">Purchased ${GG.fmtDate(p.purchaseDate)}</div>` : '<div style="margin-bottom:14px"></div>'}
      <div class="flex gap-sm">
        <button class="btn btn-ghost btn-sm" data-edit>Edit</button>
        <button class="btn btn-danger btn-sm" data-del>Delete</button>
      </div>`;
    card.querySelector('[data-edit]').addEventListener('click', () => openModal(p));
    card.querySelector('[data-del]').addEventListener('click', async () => {
      const ok = await GG.confirm({ title: 'Delete this product?', body: `"${p.name}" will be removed from your vault.` });
      if (!ok) return;
      const result = await GG.store.deleteProduct(p.id);
      if (!result.ok) { GG.toast(result.message || 'Could not delete that product.'); return; }
      cache = cache.filter(x => x.id !== p.id);
      GG.toast('Product removed');
      render();
    });
    return card;
  }

  function render() {
    const search = document.getElementById('vaultSearch').value.trim().toLowerCase();
    const filter = document.getElementById('vaultFilter').value;
    const vault = cache;

    document.getElementById('vaultTotal').textContent = vault.length;
    document.getElementById('vaultFav').textContent = vault.filter(p => p.favorite).length;
    const cats = {};
    vault.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
    const top = Object.entries(cats).sort((a,b) => b[1]-a[1])[0];
    document.getElementById('vaultTopCat').textContent = top ? top[0] : '—';
    document.getElementById('vaultCatCount').textContent = Object.keys(cats).length;

    let filtered = vault;
    if (filter) filtered = filtered.filter(p => p.category === filter);
    if (search) filtered = filtered.filter(p => (p.name + (p.brand||'') + (p.notes||'')).toLowerCase().includes(search));

    const grid = document.getElementById('vaultGrid');
    const empty = document.getElementById('vaultEmpty');
    grid.innerHTML = '';
    if (!filtered.length) {
      empty.classList.remove('hidden');
      empty.querySelector('.icon').textContent = '💄';
      empty.querySelector('h3').textContent = vault.length ? 'No matches' : 'Your vault is empty';
      empty.querySelector('p').textContent = vault.length ? 'Try a different search or filter.' : 'Add the products you love and use most.';
      empty.querySelector('button')?.classList.toggle('hidden', !!vault.length);
      return;
    }
    empty.classList.add('hidden');
    filtered.forEach(p => grid.appendChild(renderCard(p)));
  }

  function showLoadError(message) {
    const grid = document.getElementById('vaultGrid');
    const empty = document.getElementById('vaultEmpty');
    grid.innerHTML = '';
    empty.classList.add('hidden');
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">⚠️</div><h3>Couldn't load your vault</h3><p>${GG.esc(message)}</p><button class="btn btn-soft btn-sm" id="vaultRetryBtn">Try again</button></div>`;
    document.getElementById('vaultRetryBtn').addEventListener('click', loadAndRender);
  }

  async function loadAndRender() {
    document.getElementById('vaultGrid').innerHTML = `<div class="empty-state"><div class="icon">✨</div><h3>Loading…</h3><p>Fetching your vault.</p></div>`;
    document.getElementById('vaultEmpty').classList.add('hidden');

    const result = await GG.store.getVault();
    if (!result.ok) {
      const msg = result.status === 0 ? 'Network error — is the GlowGuide server running?' : result.message;
      showLoadError(msg);
      return;
    }
    cache = result.data;
    render();
  }

  document.getElementById('vaultSearch').addEventListener('input', render);
  document.getElementById('vaultFilter').addEventListener('change', render);

  loadAndRender();
})();
