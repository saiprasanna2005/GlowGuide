/* ==========================================================================
   GlowGuide — app.js
   Shared shell behaviour: sidebar nav, mobile drawer, theme toggle,
   toasts, confirm dialogs, and the Glow Ring renderer. Loaded on every
   page that uses GG.toast/GG.confirm/GG.theme — the full app shell
   (dashboard, routine, planner, vault, journal, looks, insights,
   settings) plus profile.html, which uses toasts during onboarding
   even though it has no sidebar shell of its own.
   ========================================================================== */

(function () {
  const GG = window.GG;

  /* ---- theme ----
     Deliberately frontend-only (its own dedicated LocalStorage key, not
     routed through GG.store/the backend at all): theme is cosmetic, has
     no cross-device value, and reading it synchronously here avoids a
     flash of the wrong theme before any API call could resolve. */
  const THEME_KEY = 'gg_theme';
  GG.theme = {
    apply(theme) {
      document.documentElement.setAttribute('data-theme', theme);
    },
    init() {
      this.apply(localStorage.getItem(THEME_KEY) || 'light');
    },
    toggle() {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      this.apply(next);
      return next;
    },
  };
  GG.theme.init();

  /* ---- HTML escaping for any user-entered text inserted via innerHTML ---- */
  GG.esc = function (str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };

  /* ---- toast notifications ---- */
  let toastStack = null;
  GG.toast = function (message, opts = {}) {
    if (!toastStack) {
      toastStack = document.createElement('div');
      toastStack.className = 'toast-stack';
      toastStack.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastStack);
    }
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = message;
    toastStack.appendChild(el);
    const life = opts.duration || 2800;
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 300);
    }, life);
  };

  /* ---- confirm dialog (promise-based) ---- */
  GG.confirm = function ({ title = 'Are you sure?', body = '', confirmText = 'Delete', danger = true } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
          <h3 id="confirmTitle">${title}</h3>
          <p>${body}</p>
          <div class="modal-actions">
            <button class="btn btn-ghost" data-act="cancel">Cancel</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${confirmText}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const cleanup = (val) => { overlay.remove(); resolve(val); };
      overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
      overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => cleanup(false));
      overlay.querySelector('[data-act="ok"]').addEventListener('click', () => cleanup(true));
      overlay.querySelector('[data-act="ok"]').focus();
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { cleanup(false); document.removeEventListener('keydown', esc); }
      });
    });
  };

  /* ---- Glow Ring renderer (signature element) ---- */
  GG.renderRing = function (el, { value = 0, size = 96, stroke = 9, label = '', sub = '', colorFrom = '#C79A55', colorTo = '#8E76BE' } = {}) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c;
    const gradId = 'grad-' + Math.random().toString(36).slice(2, 8);
    el.classList.add('glow-ring');
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.innerHTML = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colorFrom}"/>
            <stop offset="100%" stop-color="${colorTo}"/>
          </linearGradient>
        </defs>
        <circle class="ring-track" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}"/>
        <circle class="ring-value" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}"
          stroke="url(#${gradId})" stroke-dasharray="${c}" stroke-dashoffset="${c}"/>
      </svg>
      <div class="ring-center">
        <span class="ring-num" style="font-size:${size*0.22}px">${label}</span>
        ${sub ? `<span class="ring-cap">${sub}</span>` : ''}
      </div>`;
    requestAnimationFrame(() => {
      const valCircle = el.querySelector('.ring-value');
      if (valCircle) valCircle.style.strokeDashoffset = offset;
    });
  };

  /* ---- sidebar / mobile nav wiring ---- */
  GG.initShell = function (activePage) {
    document.querySelectorAll('[data-nav-link]').forEach((link) => {
      if (link.getAttribute('data-nav-link') === activePage) link.classList.add('active');
    });
    const sidebar = document.querySelector('.sidebar');
    const hamburger = document.querySelector('.hamburger');
    const overlay = document.querySelector('.sidebar-overlay');
    const closeBtn = document.querySelector('.sidebar-close');
    const openSidebar = () => { sidebar?.classList.add('open'); overlay?.classList.add('show'); };
    const closeSidebar = () => { sidebar?.classList.remove('open'); overlay?.classList.remove('show'); };
    hamburger?.addEventListener('click', openSidebar);
    overlay?.addEventListener('click', closeSidebar);
    closeBtn?.addEventListener('click', closeSidebar);

    const themeBtn = document.querySelector('[data-theme-toggle]');
    const syncThemeIcon = () => {
      if (!themeBtn) return;
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      themeBtn.textContent = isDark ? '☀️' : '🌙';
    };
    syncThemeIcon();
    themeBtn?.addEventListener('click', () => { GG.theme.toggle(); syncThemeIcon(); GG.toast(document.documentElement.getAttribute('data-theme') === 'dark' ? '🌙 Dark mode on' : '☀️ Light mode on'); });

    // greet with the name resolved by GG.requireProfile() during the auth
    // check (avoids a second round-trip just to populate the sidebar).
    const sessionUser = GG._sessionUser;
    document.querySelectorAll('[data-user-name]').forEach(elm => { elm.textContent = sessionUser?.name || 'Beautiful'; });
    document.querySelectorAll('[data-user-initial]').forEach(elm => { elm.textContent = (sessionUser?.name || 'G').charAt(0).toUpperCase(); });
  };

  /* ---- sequential script loader for post-auth page scripts ----
     Page-specific scripts (dashboard.js, routine.js, etc.) must not run
     until GG.requireProfile() has resolved — otherwise they'd fire off
     API calls before we know the session/profile check passed. Loads
     each URL in order and calls back once the last one has executed. */
  GG.loadPageScripts = function (urls, callback) {
    let i = 0;
    function next() {
      if (i >= urls.length) { callback && callback(); return; }
      const s = document.createElement('script');
      s.src = urls[i++];
      s.onload = next;
      s.onerror = () => GG.toast('A required script failed to load — please refresh.');
      document.body.appendChild(s);
    }
    next();
  };

  /* ---- auth/profile guard for inner pages ----
     Replaces the old LocalStorage-flag guard. Resolves to true only when
     the page is safe to render:
       - no valid session          -> GG.api already redirected to login.html
       - session but no profile    -> redirect to profile.html
       - session + profile         -> resolves true, caches the name/email
                                       on GG._sessionUser for initShell(). */
  GG.requireProfile = async function () {
    const me = await GG.api.get('/auth/me');
    if (!me.ok) return false; // 401 already triggered a redirect inside GG.api

    const profile = await GG.api.get('/profile');
    if (!profile.ok) return false;

    GG._sessionUser = { name: profile.data.name, email: profile.data.email };
    GG._sessionProfile = profile.data; // full payload, so profile.html can prefill without a second GET

    const onProfilePage = /profile\.html$/.test(location.pathname);
    if (!profile.data.hasProfile && !onProfilePage) {
      window.location.href = 'profile.html';
      return false;
    }
    return true;
  };

  /* ---- small date helpers reused across planner/insights ---- */
  GG.fmtDate = (iso) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  GG.daysUntil = (iso) => {
    const target = new Date(iso + 'T00:00:00');
    const now = new Date(); now.setHours(0,0,0,0);
    return Math.round((target - now) / 86400000);
  };
})();
