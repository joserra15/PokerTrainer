/*
 * guest-mode.js — Prueba de 5 manos sin registro (L2–L3).
 */
(function (global) {
  'use strict';

  var GUEST_ID = 'pt_guest_local';
  var STORE_KEY = 'pt_guest_v1';
  var HAND_LIMIT = 5;
  var starting = false;
  var firstDealt = false;
  var STREET_ORDER = ['preflop', 'flop', 'turn', 'river'];
  var STREET_LABEL = {
    preflop: 'Preflop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River'
  };

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

  function isGoodClass(cls) {
    return cls === 'optima' || cls === 'aceptable';
  }

  function decisionsOf(handRec) {
    if (!handRec) return [];
    if (Array.isArray(handRec.decisions) && handRec.decisions.length) return handRec.decisions;
    if (handRec.class || handRec.action) {
      return [{
        street: handRec.street || 'preflop',
        class: handRec.class || '',
        action: handRec.action || '',
        best: handRec.best || ''
      }];
    }
    return [];
  }

  function streetScore() {
    var by = {
      preflop: { good: 0, n: 0 },
      flop: { good: 0, n: 0 },
      turn: { good: 0, n: 0 },
      river: { good: 0, n: 0 }
    };
    var good = 0;
    var total = 0;
    (readState().hands || []).forEach(function (h) {
      decisionsOf(h).forEach(function (d) {
        var key = d && STREET_LABEL[d.street] ? d.street : 'preflop';
        by[key].n += 1;
        total += 1;
        if (isGoodClass(d.class)) {
          by[key].good += 1;
          good += 1;
        }
      });
    });
    return { by: by, good: good, total: total, hands: (readState().hands || []).length, limit: handLimit() };
  }

  function score() {
    var sc = streetScore();
    return { good: sc.good, total: sc.total, hands: sc.hands, limit: sc.limit, byStreet: sc.by };
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
    var newHand = document.getElementById('new-hand');
    if (newHand) {
      if (on) {
        newHand.removeAttribute('data-i18n');
        newHand.textContent = 'Siguiente mano';
      } else {
        newHand.setAttribute('data-i18n', 'play.newHand');
        newHand.textContent = (global.PTI18n && global.PTI18n.t) ? global.PTI18n.t('play.newHand') : 'Nueva mano';
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

  function pct(good, n) {
    if (!n) return '—';
    return Math.round((good / n) * 100) + '%';
  }

  function renderStreetSummary() {
    var host = document.getElementById('guest-gate-streets');
    if (!host) return;
    var sc = streetScore();
    var rows = STREET_ORDER.map(function (key) {
      var row = sc.by[key];
      if (!row || !row.n) return '';
      return '<div class="guest-street-row"><span>' + STREET_LABEL[key] +
        '</span><span>' + row.good + ' / ' + row.n + ' · ' + pct(row.good, row.n) + '</span></div>';
    }).filter(Boolean).join('');
    if (!rows) {
      host.innerHTML = '';
      return;
    }
    host.innerHTML = rows +
      '<div class="guest-street-row total"><span>Total</span><span>' +
      sc.good + ' / ' + sc.total + ' · ' + pct(sc.good, sc.total) + '</span></div>';
  }

  function showGate(reason) {
    var el = document.getElementById('guest-gate-modal');
    if (!el) return;
    var st = readState();
    st.gateShown = true;
    writeState(st);
    var sc = streetScore();
    var scoreEl = document.getElementById('guest-gate-score');
    if (scoreEl) {
      scoreEl.textContent = sc.hands
        ? ('Has jugado ' + sc.hands + ' de ' + sc.limit +
          ' manos. Acierto por calle de esta prueba:')
        : 'Guarda la cuenta para seguir entrenando.';
    }
    renderStreetSummary();
    var age = document.getElementById('guest-gate-age');
    var loginBtn = document.getElementById('guest-gate-login');
    if (age && loginBtn) {
      loginBtn.disabled = !age.checked;
    }
    el.classList.remove('hidden');
    if (document.body && document.body.classList) {
      document.body.classList.add('guest-gate-open');
    }
    track('guest_gate_shown', { reason: reason || 'limit', good: sc.good, total: sc.total, hands: sc.hands });
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

  function pushHandRecord(rec) {
    if (!isActive() || !rec) return;
    var st = readState();
    if (st.hands.length >= handLimit()) return;
    var spot = currentSpot();
    st.hands.push({
      id: rec.id || (spot ? spot.id : ('g' + (st.hands.length + 1))),
      class: rec.class || '',
      action: rec.action || '',
      best: rec.best || '',
      street: rec.street || '',
      decisions: Array.isArray(rec.decisions) ? rec.decisions : [],
      ts: Date.now()
    });
    st.index = st.hands.length;
    writeState(st);
    refreshBanner();
    track('guest_hand', {
      index: st.hands.length,
      class: rec.class || '',
      trap: rec.id || (spot ? spot.id : ''),
      decisions: (rec.decisions || []).length
    });
    if (st.hands.length >= handLimit()) {
      global.setTimeout(function () { showGate('limit'); }, 650);
    }
  }

  function recordDecision(decision) {
    if (!decision) return;
    pushHandRecord({
      class: decision.class || '',
      action: decision.action || '',
      best: decision.best || '',
      street: decision.street || 'preflop',
      decisions: [{
        street: decision.street || 'preflop',
        class: decision.class || '',
        action: decision.action || '',
        best: decision.best || ''
      }]
    });
  }

  function afterHandFinished(hand) {
    if (!isActive() || !hand) return;
    var spot = currentSpot();
    var decisions = (hand.decisions || []).map(function (d) {
      return {
        street: d.street || '',
        class: d.class || '',
        action: d.action || d.id || '',
        best: d.best || ''
      };
    });
    var last = decisions.length ? decisions[decisions.length - 1] : {};
    pushHandRecord({
      id: spot ? spot.id : '',
      class: last.class || '',
      action: last.action || '',
      best: last.best || '',
      street: last.street || '',
      decisions: decisions
    });
  }

  function afterTrainerAction(/* hand, decision */) {
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
    firstDealt = false;
    starting = false;
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* noop */ }
    hideGate();
    applyChrome(false);
  }

  function returnToLanding() {
    hideGate();
    clear();
    if (global.PTAuth && typeof global.PTAuth.signOut === 'function') {
      global.PTAuth.signOut();
      return;
    }
    if (document.body && document.body.classList) {
      document.body.classList.remove('guest-mode', 'guest-gate-open');
    }
    var shell = document.getElementById('app-shell');
    var gate = document.getElementById('auth-gate');
    if (shell) {
      shell.classList.add('hidden');
      shell.setAttribute('aria-hidden', 'true');
    }
    if (gate) {
      gate.classList.remove('hidden');
      gate.setAttribute('aria-hidden', 'false');
    }
    document.body.classList.add('auth-locked', 'landing-scrollable');
    try { window.scrollTo(0, 0); } catch (e) { /* noop */ }
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
    document.querySelectorAll('[data-guest-landing]').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        returnToLanding();
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
    streetScore: streetScore,
    hasProgress: hasProgress,
    enter: enter,
    guestUser: guestUser,
    nextForce: nextForce,
    nextPlayConfig: nextPlayConfig,
    startTraps: startTraps,
    afterTrainerAction: afterTrainerAction,
    afterHandFinished: afterHandFinished,
    recordDecision: recordDecision,
    maybeGate: maybeGate,
    showGate: showGate,
    hideGate: hideGate,
    returnToLanding: returnToLanding,
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
