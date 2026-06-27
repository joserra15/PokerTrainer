/*
 * demo-mode.js — Admin prueba la app como usuario demo (plan/límites reales).
 */
(function (global) {
  'use strict';

  var KEY = 'pt_demo_mode_v1';

  function readFlag(storage) {
    try {
      return storage.getItem(KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function writeFlag(on) {
    var val = on ? '1' : null;
    try {
      if (val) sessionStorage.setItem(KEY, val);
      else sessionStorage.removeItem(KEY);
    } catch (e) { /* noop */ }
    try {
      if (val) localStorage.setItem(KEY, val);
      else localStorage.removeItem(KEY);
    } catch (e) { /* noop */ }
  }

  function isActive() {
    return readFlag(sessionStorage) || readFlag(localStorage);
  }

  function start() {
    writeFlag(true);
    try {
      if (global.PTAdmin && global.PTAdmin.setAdminVisible) global.PTAdmin.setAdminVisible(false);
    } catch (e) { /* noop */ }
    global.location.reload();
  }

  function stop() {
    writeFlag(false);
    global.location.reload();
  }

  function bindDemoButton(btn, handler) {
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.type = 'button';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      handler();
    });
  }

  function bindUi() {
    bindDemoButton(document.getElementById('account-demo'), function () {
      var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
      if (!u || !u.isAdmin) return;
      start();
    });
    bindDemoButton(document.getElementById('account-stop-demo'), function () {
      stop();
    });
    bindDemoButton(document.getElementById('admin-demo-start'), function () {
      var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
      if (!u || !u.isAdmin) {
        alert('Inicia sesión como administrador para usar el modo demo.');
        return;
      }
      start();
    });
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
  global.addEventListener('pt-auth-ready', bindUi);
})(window);
