/*
 * guest-funnel.js — Telemetría de producto (landing → invitado → registro).
 * UUID anónimo en localStorage; sin correo ni nombre. Independiente de Plausible.
 */
(function (global) {
  'use strict';

  var STORE_KEY = 'pt_funnel_vid';
  var ALLOWED = {
    landing_view: true,
    cta_try: true,
    cta_login: true,
    guest_start: true,
    guest_hand: true,
    guest_gate_shown: true,
    guest_login: true,
    guest_convert: true
  };
  var sent = {};
  var landingScheduled = false;

  function uuid() {
    try {
      if (global.crypto && typeof global.crypto.randomUUID === 'function') {
        return String(global.crypto.randomUUID()).toLowerCase();
      }
    } catch (e) { /* noop */ }
    var bytes = new Array(16);
    var i;
    try {
      if (global.crypto && global.crypto.getRandomValues) {
        var buf = new Uint8Array(16);
        global.crypto.getRandomValues(buf);
        for (i = 0; i < 16; i++) bytes[i] = buf[i];
      } else {
        for (i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
      }
    } catch (e2) {
      for (i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = bytes.map(function (b) {
      return (b + 0x100).toString(16).slice(1);
    }).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) +
      '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  }

  function isVid(v) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v || '');
  }

  function visitorId() {
    var id = '';
    try { id = String(localStorage.getItem(STORE_KEY) || '').toLowerCase(); } catch (e) { id = ''; }
    if (!isVid(id)) {
      id = uuid();
      try { localStorage.setItem(STORE_KEY, id); } catch (e2) { /* noop */ }
    }
    return id;
  }

  function dedupeKey(event, extra) {
    if (event === 'guest_hand') return event + ':' + String((extra && extra.hand_index) || 0);
    return event;
  }

  function rpcPayload(event, extra) {
    extra = extra || {};
    var hand = extra.hand_index;
    if (hand == null && extra.index != null) hand = extra.index;
    hand = Number(hand);
    return {
      p_visitor_id: visitorId(),
      p_event: event,
      p_hand_index: event === 'guest_hand' && hand >= 1 && hand <= 5 ? hand : null,
      p_source: extra.source ? String(extra.source).slice(0, 32) : null,
      p_trap_id: extra.trap_id || extra.trap ? String(extra.trap_id || extra.trap).slice(0, 64) : null
    };
  }

  function isOAuthReturn() {
    try {
      return /[?&#](code|access_token|error|error_code)=/.test(
        (global.location && global.location.href) || ''
      );
    } catch (e) {
      return false;
    }
  }

  function sendRpc(payload) {
    // Nunca el cliente Auth: un rpc autenticado llama getSession y puede
    // borrar el code verifier PKCE; el retorno de Google vuelve a la landing.
    try {
      if (isOAuthReturn()) return;
      var cfg = global.PT_SUPABASE || {};
      if (!cfg.url || !cfg.anonKey || typeof global.fetch !== 'function') return;
      global.fetch(String(cfg.url).replace(/\/$/, '') + '/rest/v1/rpc/pt_guest_funnel_ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: cfg.anonKey,
          Authorization: 'Bearer ' + cfg.anonKey
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {});
    } catch (e) { /* noop */ }
  }

  function track(event, extra) {
    extra = extra || {};
    event = String(event || '');
    if (!ALLOWED[event]) return false;
    if (isOAuthReturn()) return false;
    var mapped = extra;
    if (event === 'guest_hand') {
      mapped = {
        hand_index: Number(extra.index || extra.hand_index || 0) || null,
        trap_id: extra.trap || extra.trap_id || '',
        source: extra.source || ''
      };
    }
    var key = dedupeKey(event, mapped);
    if (sent[key]) return false;
    sent[key] = true;
    sendRpc(rpcPayload(event, mapped));
    return true;
  }

  function landingVisible() {
    var gate = global.document && global.document.getElementById
      ? global.document.getElementById('auth-gate')
      : null;
    if (gate && gate.classList && gate.classList.contains('hidden')) return false;
    return true;
  }

  function shouldSkipLanding() {
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    if (u && !u.isGuest) return true;
    if (global.document && global.document.body && global.document.body.classList &&
        global.document.body.classList.contains('guest-mode')) {
      return true;
    }
    return false;
  }

  function maybeLandingView() {
    if (sent.landing_view) return;
    if (shouldSkipLanding()) {
      sent.landing_view = true;
      return;
    }
    if (!landingVisible()) return;
    track('landing_view');
  }

  function scheduleLandingView() {
    if (landingScheduled) return;
    landingScheduled = true;
    var oauthWait = 0;
    function onReady() {
      if (isOAuthReturn()) {
        if (oauthWait++ < 25 && typeof global.setTimeout === 'function') {
          global.setTimeout(onReady, 400);
        }
        return;
      }
      maybeLandingView();
    }
    if (typeof global.addEventListener === 'function') {
      global.addEventListener('pt-auth-ready', onReady);
      global.addEventListener('pt-auth-bootstrap', onReady);
    }
    if (typeof global.setTimeout === 'function') {
      global.setTimeout(onReady, 4000);
    }
  }

  global.PTGuestFunnel = {
    STORE_KEY: STORE_KEY,
    isOAuthReturn: isOAuthReturn,
    visitorId: visitorId,
    track: track,
    rpcPayload: rpcPayload,
    scheduleLandingView: scheduleLandingView,
    maybeLandingView: maybeLandingView
  };
})(window);
