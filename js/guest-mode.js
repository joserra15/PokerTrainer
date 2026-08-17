/*
 * guest-mode.js — Prueba de 5 manos-trampa sin registro (L2–L3).
 */
(function (global) {
  'use strict';

  var GUEST_ID = 'pt_guest_local';
  var STORE_KEY = 'pt_guest_v1';
  var HAND_LIMIT = 5;
  var starting = false;
  var firstDealt = false;

  function trapsApi() {
    return global.PTGuestTraps;
  }

  function handLimit() {
    var T = trapsApi();
    return (T && T.HAND_LIMIT) || HAND_LIMIT;
  }

  function emptyState() {
    return {
      active: false,
      hands: [],
      startedAt: 0,
      gateShown: false,
      index: 0
    };
  }

  function readState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return emptyState();
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return emptyState();
      if (!Array.isArray(data.hands)) data.hands = [];
      data.index = Number(data.index) || data.hands.length || 0;
      return data;
    } catch (e) {
      return emptyState();
    }
  }

  function writeState(st) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(st || emptyState())); } catch (e) { /* noop */ }
  }

  function isActive() {
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    if (u && u.isGuest) return true;
    var st = readState();
    return !!(st.active && !u);
  }

  function wantsEnter() {
    var st = readState();
    return !!(st && st.active);
  }

  function remaining() {
    var st = readState();
    return Math.max(0, handLimit() - (st.hands ? st.hands.length : 0));
  }

  function score() {
    var hands = readState().hands || [];
    var good = 0;
    hands.forEach(function (h) {
      if (h && (h.class === 'optima' || h.class === 'aceptable')) good++;
    });
    return { good: good, total: hands.length, limit: handLimit() };
  }

  function hasProgress() {
    var st = readState();
    return !!(st.hands && st.hands.length);
  }

  function track(name, props) {
    var A = global.PTAnalytics;
    if (!A || !A.track) return;
    A.track(name, props || {});
  }

  function guestUser() {
    return {
      sub: GUEST_ID,
      email: '',
      name: 'Invitado',
      picture: '',
      isGuest: true,
      loginAt: Date.now()
    };
  }

  function applyChrome(on) {
    if (document.body && document.body.classList) {
      document.body.classList.toggle('guest-mode', !!on);
    }
    var banner = document.getElementById('guest-mode-banner');
    if (banner) {
      banner.classList.toggle('hidden', !on);
      var count = banner.querySelector('#guest-banner-count');
      if (count) {
        var st = readState();
        count.textContent = (st.hands ? st.hands.length : 0) + ' / ' + handLimit();
      }
    }
    if (global.PTAuth && global.PTAuth.renderAccountMenu) {
      var u = global.PTAuth.getUser && global.PTAuth.getUser();
      if (u) global.PTAuth.renderAccountMenu(u);
    }
  }

  function refreshBanner() {
    applyChrome(isActive());
  }

  function currentSpot() {
    var T = trapsApi();
    if (!T) return null;
    var st = readState();
    return T.get(st.index) || T.get(st.hands.length);
  }

  function nextForce() {
    var T = trapsApi();
    var spot = currentSpot();
    if (!T || !spot) return null;
    return T.toForce(spot);
  }

  function nextPlayConfig() {
    var T = trapsApi();
    var spot = currentSpot();
    if (!T || !spot) return null;
    return T.playConfig(spot);
  }

  function showGate(reason) {
    var el = document.getElementById('guest-gate-modal');
    if (!el) return;
    var st = readState();
    st.gateShown = true;
    writeState(st);
    var sc = score();
    var scoreEl = document.getElementById('guest-gate-score');
    if (scoreEl) {
      scoreEl.textContent = sc.total
        ? ('Has acertado ' + sc.good + ' de ' + sc.total +
          '. Estas manos están hechas para pillar el instinto recreativo.')
        : 'Guarda la cuenta para seguir entrenando.';
    }
    var age = document.getElementById('guest-gate-age');
    var loginBtn = document.getElementById('guest-gate-login');
    if (age && loginBtn) {
      loginBtn.disabled = !age.checked;
    }
    el.classList.remove('hidden');
    if (document.body && document.body.classList) {
      document.body.classList.add('guest-gate-open');
    }
    track('guest_gate_shown', { reason: reason || 'limit', good: sc.good, total: sc.total });
  }

  function hideGate() {
    var el = document.getElementById('guest-gate-modal');
    if (el) el.classList.add('hidden');
    if (document.body && document.body.classList) {
      document.body.classList.remove('guest-gate-open');
    }
  }

  function maybeGate(reason) {
    if (!isActive()) return false;
    if (remaining() <= 0) {
      showGate(reason || 'limit');
      return true;
    }
    if (reason === 'tab' || reason === 'import' || reason === 'ai') {
      showGate(reason);
      return true;
    }
    return false;
  }

  function recordDecision(decision) {
    if (!isActive() || !decision) return;
    var st = readState();
    if (st.hands.length >= handLimit()) return;
    var spot = currentSpot();
    st.hands.push({
      id: spot ? spot.id : ('g' + (st.hands.length + 1)),
      class: decision.class || '',
      action: decision.action || '',
      best: decision.best || '',
      ts: Date.now()
    });
    st.index = st.hands.length;
    writeState(st);
    refreshBanner();
    track('guest_hand', {
      index: st.hands.length,
      class: decision.class || '',
      trap: spot ? spot.id : ''
    });
    if (st.hands.length >= handLimit()) {
      global.setTimeout(function () { showGate('limit'); }, 650);
    }
  }

  function afterTrainerAction(hand, decision) {
    if (!isActive()) return false;
    recordDecision(decision);
    return false;
  }

  function waitFor(cond, tries, delay, done) {
    var n = 0;
    function tick() {
      if (cond()) return done(true);
      if (++n >= (tries || 80)) return done(false);
      global.setTimeout(tick, delay || 80);
    }
    tick();
  }

  function startTraps() {
    if (firstDealt || starting) return;
    if (!global.Engine || !global.playAnalysisHand) {
      waitFor(function () { return !!(global.Engine && global.playAnalysisHand); }, 80, 80, function (ok) {
        if (ok) startTraps();
      });
      return;
    }
    if (maybeGate('limit')) return;
    var force = nextForce();
    var cfg = nextPlayConfig();
    if (!force || !cfg) {
      showGate('limit');
      return;
    }
    starting = true;
    firstDealt = true;
    try {
      global.playAnalysisHand(force, cfg);
    } finally {
      starting = false;
    }
  }

  function enter() {
    var st = readState();
    if (!st.active) {
      st = emptyState();
      st.active = true;
      st.startedAt = Date.now();
      writeState(st);
      track('guest_start');
    }
    applyChrome(true);
    function go() {
      if (global.PTAuth && global.PTAuth.enterGuest) {
        global.PTAuth.enterGuest();
      }
    }
    if (global.PTAuth && global.PTAuth.enterGuest) go();
    else waitFor(function () { return !!(global.PTAuth && global.PTAuth.enterGuest); }, 80, 80, function (ok) {
      if (ok) go();
    });
  }

  function clear() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* noop */ }
    hideGate();
    applyChrome(false);
  }

  function mergeIntoUser(toId) {
    if (!toId || toId === GUEST_ID) return { merged: false };
    var progressed = hasProgress();
    if (!progressed) {
      clear();
      return { merged: false };
    }
    var destHist = null;
    try { destHist = localStorage.getItem('pt_history_v1_' + toId); } catch (e) { /* noop */ }
    var destBusy = !!(destHist && destHist !== '[]' && destHist !== 'null');
    if (!destBusy && global.Store && global.Store.migrateLocalUserKeys) {
      global.Store.migrateLocalUserKeys(GUEST_ID, toId);
    }
    track('guest_convert', { merged: !destBusy, good: score().good, total: score().total });
    clear();
    return { merged: !destBusy };
  }

  function bindGate() {
    var age = document.getElementById('guest-gate-age');
    var loginBtn = document.getElementById('guest-gate-login');
    if (age && loginBtn && !age.dataset.bound) {
      age.dataset.bound = '1';
      age.addEventListener('change', function () {
        loginBtn.disabled = !age.checked;
      });
    }
    if (loginBtn && !loginBtn.dataset.bound) {
      loginBtn.dataset.bound = '1';
      loginBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (age && !age.checked) return;
        hideGate();
        if (global.PTLanding && global.PTLanding.startLoginNow) global.PTLanding.startLoginNow();
        else if (global.PTAuth && global.PTAuth.startLogin) global.PTAuth.startLogin();
        else if (global.PT_startGoogleLogin) global.PT_startGoogleLogin();
      });
    }
    var saveBtns = document.querySelectorAll('[data-guest-save]');
    saveBtns.forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        showGate('save');
      });
    });
    document.querySelectorAll('[data-close-guest-gate]').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        hideGate();
      });
    });
  }

  function init() {
    bindGate();
    global.addEventListener('pt-guest-ready', function () {
      global.setTimeout(startTraps, 50);
    });
    if (wantsEnter() && !(global.PTAuth && global.PTAuth.getUser && global.PTAuth.getUser())) {
      applyChrome(true);
    }
  }

  global.PTGuest = {
    GUEST_ID: GUEST_ID,
    HAND_LIMIT: HAND_LIMIT,
    isActive: isActive,
    wantsEnter: wantsEnter,
    remaining: remaining,
    score: score,
    hasProgress: hasProgress,
    enter: enter,
    guestUser: guestUser,
    nextForce: nextForce,
    nextPlayConfig: nextPlayConfig,
    startTraps: startTraps,
    afterTrainerAction: afterTrainerAction,
    recordDecision: recordDecision,
    maybeGate: maybeGate,
    showGate: showGate,
    hideGate: hideGate,
    mergeIntoUser: mergeIntoUser,
    clear: clear,
    refreshBanner: refreshBanner,
    applyChrome: applyChrome
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
