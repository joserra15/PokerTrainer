/*
 * onboarding.js — Checklist de primeras 3 acciones para nuevos usuarios (P0).
 * 1) Abrir sesión demo · 2) Calentamiento 10 manos · 3) Ver fugas / errores
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'pt_onboarding_v1';
  var WARMUP_HANDS = 10;
  var STEPS = [
    { id: 'demo', label: 'Revisa la sesión de ejemplo', hint: 'Sin subir ficheros: abre fugas reales', cta: 'Abrir ejemplo' },
    { id: 'warmup', label: 'Calentamiento 10 manos', hint: 'Con avisador en vivo', cta: 'Calentar 10 manos' },
    { id: 'leaks', label: 'Mira tus fugas o errores', hint: 'Stats o banco de errores', cta: 'Ver mis fugas' }
  ];

  function userKey() {
    var u = global.PT_AUTH_USER;
    var fromAuth = u && (u.sub || u.id || u.email);
    if (fromAuth) return fromAuth;
    try {
      if (global.Store && typeof global.Store.getUserId === 'function') {
        var id = global.Store.getUserId();
        if (id) return id;
      }
    } catch (e) { /* ignore */ }
    return 'anon';
  }

  function cloneDone(done) {
    var out = {};
    if (!done || typeof done !== 'object') return out;
    Object.keys(done).forEach(function (k) {
      if (done[k]) out[k] = true;
    });
    return out;
  }

  function mergeStates(a, b) {
    a = a || {};
    b = b || {};
    var done = cloneDone(a.done);
    var extra = cloneDone(b.done);
    Object.keys(extra).forEach(function (k) { done[k] = true; });
    return {
      dismissed: !!(a.dismissed || b.dismissed),
      done: done,
      updatedAt: Math.max(Number(a.updatedAt) || 0, Number(b.updatedAt) || 0)
    };
  }

  function flagKey(prefix) {
    return prefix + userKey();
  }

  function sampleOpened() {
    try {
      return localStorage.getItem(flagKey('pt_onboarding_sample_')) === '1';
    } catch (e) {
      return false;
    }
  }

  function markSampleOpened() {
    try {
      localStorage.setItem(flagKey('pt_onboarding_sample_'), '1');
    } catch (e) { /* ignore */ }
  }

  function leaksViewed() {
    try {
      return localStorage.getItem(flagKey('pt_onboarding_leaks_')) === '1';
    } catch (e) {
      return false;
    }
  }

  function markLeaksViewed() {
    try {
      localStorage.setItem(flagKey('pt_onboarding_leaks_'), '1');
    } catch (e) { /* ignore */ }
  }

  /**
   * Inferencia por paso: no marcar los 3 solo por haber entrenado una vez.
   * demo → abrió la sesión ejemplo; warmup → ≥10 manos/decisiones; leaks → visitó Stats/Errores.
   */
  function inferActivityDone() {
    var done = {};
    if (sampleOpened()) done.demo = true;
    var S = global.Store;
    if (S) {
      var stats = S.getStats ? S.getStats() : null;
      var history = S.getHistory ? S.getHistory() : [];
      var hands = Math.max(
        Number(stats && stats.handsPlayed) || 0,
        (history && history.length) || 0
      );
      var decisions = Number(stats && stats.decisions) || 0;
      if (hands >= WARMUP_HANDS || decisions >= WARMUP_HANDS) done.warmup = true;
    }
    if (leaksViewed()) done.leaks = true;
    return done;
  }

  function applyInferredProgress() {
    var inferred = inferActivityDone();
    if (!inferred.demo && !inferred.warmup && !inferred.leaks) return false;
    var data = load();
    var k = userKey();
    if (!data.users[k]) data.users[k] = { dismissed: false, done: {} };
    var st = data.users[k];
    if (!st.done) st.done = {};
    var changed = false;
    Object.keys(inferred).forEach(function (id) {
      if (inferred[id] && !st.done[id]) {
        st.done[id] = true;
        changed = true;
      }
    });
    if (changed) {
      st.updatedAt = Date.now();
      save(data);
    }
    return changed;
  }

  function notifyCloud() {
    if (!global.PTCloud) return;
    if (global.PTCloud.markLocalDirty) global.PTCloud.markLocalDirty(['onboarding']);
    if (global.PTCloud.schedulePush) global.PTCloud.schedulePush(['onboarding']);
    /* No esperar 2s: Safari en móvil mata el JS al cambiar de app. */
    if (global.PTCloud.flushPush) global.PTCloud.flushPush();
  }

  function getCloudState() {
    applyInferredProgress();
    var st = stateForUser();
    return {
      dismissed: !!st.dismissed,
      done: cloneDone(st.done),
      updatedAt: Number(st.updatedAt) || 0
    };
  }

  function mergeFromCloud(remote) {
    var data = load();
    var k = userKey();
    if (!data.users[k]) data.users[k] = { dismissed: false, done: {} };
    if (remote && typeof remote === 'object') {
      data.users[k] = mergeStates(data.users[k], remote);
      data.users[k].updatedAt = Math.max(Number(data.users[k].updatedAt) || 0, Date.now());
    }
    save(data);
    applyInferredProgress();
    if (typeof document !== 'undefined') render();
    return stateForUser();
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { users: {} };
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return { users: {} };
      if (!data.users) data.users = {};
      return data;
    } catch (e) {
      return { users: {} };
    }
  }

  function save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }

  function stateForUser() {
    var data = load();
    var k = userKey();
    if (!data.users[k]) {
      data.users[k] = { dismissed: false, done: {} };
      save(data);
    }
    return data.users[k];
  }

  function isDone(stepId) {
    var st = stateForUser();
    return !!(st.done && st.done[stepId]);
  }

  function markDone(stepId) {
    if (!stepId) return;
    var data = load();
    var k = userKey();
    if (!data.users[k]) data.users[k] = { dismissed: false, done: {} };
    if (!data.users[k].done) data.users[k].done = {};
    data.users[k].done[stepId] = true;
    data.users[k].updatedAt = Date.now();
    save(data);
    notifyCloud();
    if (typeof document !== 'undefined') render();
  }

  function dismiss() {
    var data = load();
    var k = userKey();
    if (!data.users[k]) data.users[k] = { dismissed: false, done: {} };
    data.users[k].dismissed = true;
    data.users[k].updatedAt = Date.now();
    save(data);
    notifyCloud();
    if (typeof document !== 'undefined') render();
  }

  function allDone(st) {
    return STEPS.every(function (s) { return st.done && st.done[s.id]; });
  }

  function shouldShow() {
    applyInferredProgress();
    var st = stateForUser();
    if (st.dismissed) return false;
    if (allDone(st)) return false;
    return true;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render(host) {
    if (typeof document === 'undefined' && !host) return;
    var el = host || document.getElementById('home-onboarding');
    if (!el) return;
    if (!shouldShow()) {
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }
    var st = stateForUser();
    var doneCount = STEPS.filter(function (s) { return st.done && st.done[s.id]; }).length;
    var html = '<div class="onboarding-card" role="region" aria-label="Primeros pasos">';
    html += '<div class="onboarding-head">';
    html += '<h3>Tus primeros 3 pasos</h3>';
    html += '<button type="button" class="btn btn-ghost btn-sm" data-onboarding-dismiss aria-label="Cerrar">Omitir</button>';
    html += '</div>';
    html += '<p class="muted-text onboarding-progress">' + doneCount + ' / ' + STEPS.length + ' completados</p>';
    html += '<ol class="onboarding-steps">';
    STEPS.forEach(function (s, i) {
      var done = !!(st.done && st.done[s.id]);
      html += '<li class="onboarding-step' + (done ? ' is-done' : '') + '">';
      html += '<span class="onboarding-step-num" aria-hidden="true">' + (done ? '✓' : String(i + 1)) + '</span>';
      html += '<div class="onboarding-step-body">';
      html += '<strong>' + escapeHtml(s.label) + '</strong>';
      html += '<span class="muted-text">' + escapeHtml(s.hint) + '</span>';
      html += '</div>';
      if (!done) {
        html += '<button type="button" class="btn btn-primary btn-sm" data-onboarding-step="' + s.id + '">' +
          escapeHtml(s.cta || 'Ir') + '</button>';
      }
      html += '</li>';
    });
    html += '</ol></div>';
    el.innerHTML = html;
    el.classList.remove('hidden');
  }

  function bind(host) {
    if (typeof document === 'undefined' && !host) return;
    var el = host || document.getElementById('home-onboarding');
    if (!el || el._ptOnboardingBound) return;
    el._ptOnboardingBound = true;
    el.addEventListener('click', function (e) {
      var dismissBtn = e.target.closest('[data-onboarding-dismiss]');
      if (dismissBtn) {
        dismiss();
        return;
      }
      var stepBtn = e.target.closest('[data-onboarding-step]');
      if (!stepBtn) return;
      var id = stepBtn.getAttribute('data-onboarding-step');
      runStep(id);
    });
  }

  function openSampleSession() {
    var sampleId = (global.PTSampleSession && (PTSampleSession.SAMPLE_ID || PTSampleSession.SESSION_ID)) || 'pt_sample_session_v1';
    if (typeof global.goToTab === 'function') global.goToTab('sessions');
    function tryOpen() {
      if (typeof global.openSession === 'function') {
        global.openSession(sampleId);
      } else {
        var btn = document.querySelector('[data-open-session="' + sampleId + '"]');
        if (btn) btn.click();
      }
      markSampleOpened();
      markDone('demo');
    }
    if (typeof document !== 'undefined' && document.addEventListener) {
      var once = function () {
        document.removeEventListener('pt-sample-session-ready', once);
        tryOpen();
      };
      document.addEventListener('pt-sample-session-ready', once);
      setTimeout(function () {
        document.removeEventListener('pt-sample-session-ready', once);
        tryOpen();
      }, 250);
    } else {
      setTimeout(tryOpen, 200);
    }
  }

  function runWarmup() {
    /* No marcar aquí: se completa al llegar a 10 manos / decisiones. */
    if (typeof global.startGuidedTraining === 'function') {
      global.startGuidedTraining({
        scenario: 'random',
        practiceStreet: 'preflop',
        handRange: 'playable',
        villainLevel: 'fish',
        liveAdvisor: true,
        handsTarget: WARMUP_HANDS
      });
      return;
    }
    if (typeof global.goToTab === 'function') global.goToTab('play', { setup: true });
  }

  function runLeaks() {
    /* No marcar aquí: se completa al visitar Stats o Errores. */
    var errs = (global.Store && Store.getErrors) ? Store.getErrors() : [];
    if (errs && errs.length && typeof global.goToTab === 'function') {
      global.goToTab('errors');
      return;
    }
    if (typeof global.goToTab === 'function') global.goToTab('stats');
  }

  function runStep(id) {
    if (id === 'demo') openSampleSession();
    else if (id === 'warmup') runWarmup();
    else if (id === 'leaks') runLeaks();
  }

  /** Llamar al visitar Stats o Errores. */
  function notifyLeaksViewed() {
    markLeaksViewed();
    markDone('leaks');
  }

  /** Llamar tras progreso del entrenador. */
  function notifyTrainerProgress(handsOrDecisions) {
    var n = Number(handsOrDecisions) || 0;
    var S = global.Store;
    var stats = S && S.getStats ? S.getStats() : null;
    var history = S && S.getHistory ? S.getHistory() : [];
    var hands = Math.max(
      n,
      Number(stats && stats.handsPlayed) || 0,
      (history && history.length) || 0
    );
    var decisions = Number(stats && stats.decisions) || 0;
    if (hands >= WARMUP_HANDS || decisions >= WARMUP_HANDS) markDone('warmup');
  }

  if (typeof global.addEventListener === 'function') {
    global.addEventListener('pt-cloud-synced', function () { render(); });
  }

  global.PTOnboarding = {
    STEPS: STEPS,
    WARMUP_HANDS: WARMUP_HANDS,
    render: render,
    bind: bind,
    markDone: markDone,
    dismiss: dismiss,
    isDone: isDone,
    shouldShow: shouldShow,
    runStep: runStep,
    notifyLeaksViewed: notifyLeaksViewed,
    notifyTrainerProgress: notifyTrainerProgress,
    markSampleOpened: markSampleOpened,
    getCloudState: getCloudState,
    mergeFromCloud: mergeFromCloud,
    mergeStates: mergeStates,
    STORAGE_KEY: STORAGE_KEY
  };
})(window);
