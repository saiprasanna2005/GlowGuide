/* ==========================================================================
   GlowGuide — js/api.js
   The one place that knows how to talk to the backend. Every fetch() call
   in the app goes through GG.api.request() so auth-cookie handling, error
   shapes, and "session expired -> redirect to login" are handled once,
   consistently, instead of being duplicated in every page module.

   This file is the "safe migration layer": GG.store (storage.js) is being
   converted method-by-method to call GG.api instead of localStorage.
   Nothing here touches localStorage at all.
   ========================================================================== */
(function () {
  const GG = window.GG || (window.GG = {});

  const BASE_URL = window.GG_API_BASE || 'http://localhost:4000/api';

  /**
   * @returns {Promise<{ok:boolean, status:number, data:any, message:string}>}
   * Never throws for HTTP-level errors (4xx/5xx) — those come back as
   * ok:false with a message, so callers can show a normal empty/error
   * state instead of an uncaught exception. Only a genuine network
   * failure (server unreachable) sets status 0.
   */
  async function request(method, path, body) {
    let res;
    try {
      res = await fetch(BASE_URL + path, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        credentials: 'include', // send/receive the HTTP-only auth cookie
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      return { ok: false, status: 0, data: null, message: 'Network error — is the GlowGuide server running?' };
    }

    let payload = null;
    try {
      payload = await res.json();
    } catch (parseErr) {
      return { ok: false, status: res.status, data: null, message: 'Unexpected server response' };
    }

    if (res.status === 401) {
      // Session missing/expired. Every protected page relies on this
      // single choke point to send the user back to login — no page
      // module needs its own 401 handling.
      if (!location.pathname.endsWith('login.html') && !location.pathname.endsWith('register.html')) {
        sessionStorage.setItem('gg_redirect_after_login', location.pathname + location.search);
        location.href = 'login.html';
      }
      return { ok: false, status: 401, data: null, message: payload?.message || 'Not authenticated' };
    }

    if (!res.ok || payload?.success === false) {
      return { ok: false, status: res.status, data: null, message: payload?.message || `Request failed (${res.status})` };
    }

    return { ok: true, status: res.status, data: payload.data, message: null };
  }

  GG.api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body ?? {}),
    put: (path, body) => request('PUT', path, body ?? {}),
    del: (path) => request('DELETE', path),
  };
})();
