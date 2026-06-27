/*
 * demo-mode.js — Admin prueba la app como usuario demo (plan/límites reales).
 */
(function (global) {
  'use strict';

  var KEY = 'pt_demo_mode_v1';

  function isActive() {
    try {
      return sessionStorage.getItem(KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function start() {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch (e) { /* noop */ }
    global.location.reload();
  }

  function stop() {
    try {
      sessionStorage.removeItem(KEY);
    } catch (e) { /* noop */ }
    global.location.reload();
  }

  function bindUi() {
    var demoBtn = document.getElementById('account-demo');
    var stopBtn = document.getElementById('account-stop-demo');
    if (demoBtn && !demoBtn.dataset.bound) {
      demoBtn.dataset.bound = '1';
      demoBtn.addEventListener('click', function () {
        var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
        if (!u || !u.isAdmin) return;
        start();
      });
    }
    if (stopBtn && !stopBtn.dataset.bound) {
      stopBtn.dataset.bound = '1';
      stopBtn.addEventListener('click', function () {
        stop();
      });
    }
    document.body.classList.toggle('demo-mode-active', isActive());
    ensureDemoBanner();
  }

  function ensureDemoBanner() {
    var id = 'demo-mode-banner';
    var existing = document.getElementById(id);
    if (!isActive()) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    var el = document.createElement('div');
    el.id = id;
    el.className = 'demo-mode-banner';
    el.setAttribute('role', 'status');
    el.textContent = 'Modo demo activo — pruebas con el plan del usuario demo. Pulsa «Parar demo» para volver a admin.';
    document.body.prepend(el);
  }

  global.PTDemo = {
    isActive: isActive,
    start: start,
    stop: stop,
    bindUi: bindUi,
    DEMO_USER_ID: 'pt_demo_user'
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindUi);
  } else {
    bindUi();
  }
})(window);
