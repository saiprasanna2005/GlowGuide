/* ==========================================================================
   GlowGuide — demo.js
   Fictional demo data, now seeded through the real backend APIs instead of
   LocalStorage — it becomes genuine rows in the signed-in user's own
   account. No real brands, no copyrighted assets — everything invented.

   Note: unlike the old LocalStorage version, this does NOT fabricate a
   fake multi-day completion history — routine_completions represents real
   activity, and backdating it would mean writing fake-looking data into a
   real database record. Instead, today's routines are partially completed
   for real (via the same complete-step endpoint a genuine user action
   would call), and the 7-day chart fills in honestly from there.
   ========================================================================== */
(function () {
  function daysAgoKey(n) {
    const d = new Date(); d.setDate(d.getDate() - n);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function futureDateKey(n) {
    const d = new Date(); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  window.GG_DEMO = {
    /** Seeds fictional data into the CURRENTLY LOGGED-IN account via the
     *  real API. Returns {ok, message} so callers can show a toast either way. */
    async load() {
      try {
        // Partially complete today's default routines (3/5 morning, 2/5 evening)
        const routinesResult = await GG.api.get('/routines');
        if (routinesResult.ok) {
          const { morning, evening } = routinesResult.data;
          for (const step of morning.slice(0, 3)) await GG.api.post(`/routines/steps/${step.id}/complete`, { done: true });
          for (const step of evening.slice(0, 2)) await GG.api.post(`/routines/steps/${step.id}/complete`, { done: true });
        }

        await GG.api.post('/events', { name: "Cousin's Wedding", date: futureDateKey(7), time: '19:00', style: 'Soft Glam' });
        await GG.api.post('/events', { name: "Friend's Birthday Dinner", date: futureDateKey(2), time: '20:00', style: 'Bold' });

        const products = [
          { name: 'Cloudveil Hydrating Cream', category: 'Skincare', brand: 'Lumora', rating: 5, favorite: true, purchaseDate: daysAgoKey(40), notes: 'Perfect under makeup.' },
          { name: 'Petal Silk Blush Duo', category: 'Makeup', brand: 'Rosemere', rating: 4, favorite: true, purchaseDate: daysAgoKey(20), notes: '' },
          { name: 'Featherlight Setting Mist', category: 'Makeup', brand: 'Veya', rating: 4, favorite: false, purchaseDate: daysAgoKey(60), notes: 'Great for humid days.' },
          { name: 'Argan Smooth Hair Oil', category: 'Haircare', brand: 'Marisol', rating: 5, favorite: true, purchaseDate: daysAgoKey(15), notes: '' },
          { name: 'Golden Hour Eau de Parfum', category: 'Fragrance', brand: 'Amberlyn', rating: 5, favorite: false, purchaseDate: daysAgoKey(90), notes: 'Signature scent.' },
          { name: 'Precision Angled Brush Set', category: 'Tools', brand: 'Bellisa', rating: 4, favorite: false, purchaseDate: daysAgoKey(120), notes: '' },
        ];
        for (const p of products) await GG.api.post('/products', p);

        await GG.api.post('/journal', {
          date: GG.today(), mood: '✨ Confident', look: 'Natural Everyday Look',
          routineCompleted: true, products: 'Tinted moisturizer, Blush, Lip tint', notes: "Loved today's simple look.",
        });
        await GG.api.post('/journal', {
          date: daysAgoKey(3), mood: '💫 Glowing', look: 'Soft Glam for dinner',
          routineCompleted: true, products: 'Foundation, Bronzer, Highlighter, Lip gloss', notes: 'Tried a new blush placement — kept it for later.',
        });

        await GG.api.post('/looks', { occasion: 'Work', style: 'Minimal', time: 15, steps: [] });

        return { ok: true };
      } catch (err) {
        return { ok: false, message: 'Could not load demo data — please try again.' };
      }
    },
  };
})();
