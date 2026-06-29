/*
 * sample-session.js — Sesión de ejemplo precargada para usuarios nuevos (G-05).
 */
(function (global) {
  'use strict';

  const SAMPLE_ID = 'pt_sample_session_v1';

  function flagKey(uid) {
    return 'pt_sample_seeded_' + uid;
  }

  function isSampleId(id) {
    return id === SAMPLE_ID;
  }

  function isSampleSession(s) {
    return !!(s && (s.isSample || s.id === SAMPLE_ID));
  }

  async function loadPayload() {
    const v = encodeURIComponent(global.PT_BUILD || '1');
    const res = await fetch('data/demo-session.json?v=' + v);
    if (!res.ok) throw new Error('demo_load_failed');
    return res.json();
  }

  async function ensureForUser(userId) {
    if (!userId || !global.Store || !global.Store.saveSession) {
      return { ok: false, error: 'store_unavailable' };
    }
    try {
      if (global.localStorage.getItem(flagKey(userId))) {
        return { ok: true, skipped: true };
      }
    } catch (e) { /* ignore */ }

    if (global.Store.getSessions().some(function (s) { return s.id === SAMPLE_ID; })) {
      try { global.localStorage.setItem(flagKey(userId), '1'); } catch (e) { /* ignore */ }
      return { ok: true, skipped: true };
    }

    let payload;
    try {
      payload = await loadPayload();
    } catch (e) {
      console.warn('[PTSampleSession] load', e);
      return { ok: false, error: e.message || 'load_failed' };
    }

    const session = Object.assign({}, payload, {
      id: SAMPLE_ID,
      isSample: true,
      fileName: 'Sesión de ejemplo (demo).txt',
      cloudOnly: false
    });

    const saved = await global.Store.saveSession(session);
    if (!saved.ok) return saved;
    try { global.localStorage.setItem(flagKey(userId), '1'); } catch (e) { /* ignore */ }
    global.dispatchEvent(new CustomEvent('pt-sample-session-ready', { detail: { sessionId: SAMPLE_ID } }));
    return { ok: true, seeded: true, session: saved.session };
  }

  global.PTSampleSession = {
    SAMPLE_ID: SAMPLE_ID,
    ensureForUser: ensureForUser,
    isSampleId: isSampleId,
    isSampleSession: isSampleSession
  };
})(window);
