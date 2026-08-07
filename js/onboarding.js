/*
 * onboarding.js — Checklist de primeras 3 acciones para nuevos usuarios (P0).
 * 1) Abrir sesión demo · 2) Calentamiento 10 manos · 3) Ver fugas / errores
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'pt_onboarding_v1';
  var STEPS = [
    { id: 'demo', label: 'Revisa la sesión de ejemplo', hint: 'Sin subir ficheros: abre fugas reales' },
    { id: 'warmup', label: 'Calentamiento 10 manos', hint: 'Con avisador en vivo' },
    { id: 'leaks', label: 'Mira tus fugas o errores', hint: 'Stats o banco de errores' }
  ];

  function userKey() {
    var u = global.PT_AUTH_USER;
    return (u && (u.sub || u.id || u.email)) || 'anon';
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
    var data = load();
    var k = userKey();
    if (!data.users[k]) data.users[k] = { dismissed: false, done: {} };
    data.users[k].done[stepId] = true;
    save(data);
    if (typeof document !== 'undefined') render();
  }

  function dismiss() {
    var data = load();
    var k = userKey();
    if (!data.users[k]) data.users[k] = { dismissed: false, done: {} };
    data.users[k].dismissed = true;
    save(data);
    if (typeof document !== 'undefined') render();
  }

  function allDone(st) {
    return STEPS.every(function (s) { return st.done && st.done[s.id]; });
  }

  function shouldShow() {
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
    html += '<h3>Empieza en 3 pasos</h3>';
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
        html += '<button type="button" class="btn btn-primary btn-sm" data-onboarding-step="' + s.id + '">Ir</button>';
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
    // Esperar a que la lista / sample esté lista
    setTimeout(function () {
      if (typeof global.openSession === 'function') {
        global.openSession(sampleId);
      } else {
        var btn = document.querySelector('[data-open-session="' + sampleId + '"]');
        if (btn) btn.click();
      }
      markDone('demo');
    }, 200);
  }

  function runWarmup() {
    markDone('warmup');
    if (typeof global.startGuidedTraining === 'function') {
      global.startGuidedTraining({
        scenario: 'random',
        practiceStreet: 'preflop',
        handRange: 'playable',
        villainLevel: 'fish',
        liveAdvisor: true,
        handsTarget: 10
      });
      return;
    }
    if (typeof global.goToTab === 'function') global.goToTab('play', { setup: true });
  }

  function runLeaks() {
    markDone('leaks');
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

  global.PTOnboarding = {
    STEPS: STEPS,
    render: render,
    bind: bind,
    markDone: markDone,
    dismiss: dismiss,
    isDone: isDone,
    shouldShow: shouldShow,
    runStep: runStep,
    STORAGE_KEY: STORAGE_KEY
  };
})(window);
