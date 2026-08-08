/*
 * demo-mode.js — Admin prueba la app como usuario demo (plan/límites reales).
 * Solo se inicia desde el menú Admin (`#admin-demo-start`).
 * Salir: opción en el menú de cuenta (solo en modo demo) y banner.
 */
(function (global) {
  'use strict';

  var KEY = 'pt_demo_mode_v1';
  var MENU_EXIT_ID = 'account-demo-stop';

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

  function isAdminUser() {
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    return !!(u && u.isAdmin);
  }

  function start() {
    if (!isAdminUser()) {
      alert('Inicia sesión como administrador para usar el modo demo.');
      return;
    }
    writeFlag(true);
    try {
      if (global.PTAdmin && global.PTAdmin.lockdown) global.PTAdmin.lockdown();
      else if (global.PTAdmin && global.PTAdmin.setAdminVisible) global.PTAdmin.setAdminVisible(false);
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

  function onExitClick() {
    try {
      if (global.PTAuth && global.PTAuth.collapseAccountAccordion) {
        global.PTAuth.collapseAccountAccordion();
      }
    } catch (e) { /* noop */ }
    stop();
  }

  function bindUi() {
    bindDemoButton(document.getElementById('admin-demo-start'), function () {
      start();
    });
    document.body.classList.toggle('demo-mode-active', isActive());
    ensureDemoBanner();
    ensureDemoMenuExit();
  }

  function ensureDemoBanner() {
    var id = 'demo-mode-banner';
    var existing = document.getElementById(id);
    if (!isActive()) {
      if (existing) existing.remove();
      return;
    }
    if (existing) {
      bindDemoButton(existing.querySelector('#demo-mode-stop'), stop);
      return;
    }
    var el = document.createElement('div');
    el.id = id;
    el.className = 'demo-mode-banner';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<span class="demo-mode-banner-text">Modo demo activo — pruebas con el plan del usuario demo.</span>' +
      '<button type="button" class="btn btn-primary btn-sm" id="demo-mode-stop">Parar demo</button>';
    document.body.prepend(el);
    bindDemoButton(el.querySelector('#demo-mode-stop'), stop);
  }

  /** Añade "Salir del modo demo" al menú de cuenta solo mientras el modo demo está activo. */
  function ensureDemoMenuExit() {
    var existing = document.getElementById(MENU_EXIT_ID);
    if (!isActive()) {
      if (existing) existing.remove();
      return;
    }
    if (existing) {
      existing.classList.remove('hidden');
      bindDemoButton(existing, onExitClick);
      return;
    }
    var actions = document.querySelector('#account-dropdown .account-dropdown-actions');
    if (!actions) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = MENU_EXIT_ID;
    btn.className = 'btn btn-primary btn-block';
    btn.textContent = 'Salir del modo demo';
    var adminBtn = document.getElementById('account-admin');
    if (adminBtn && adminBtn.parentNode === actions) {
      actions.insertBefore(btn, adminBtn.nextSibling);
    } else {
      var settingsBtn = document.getElementById('account-settings');
      if (settingsBtn && settingsBtn.parentNode === actions) {
        actions.insertBefore(btn, settingsBtn.nextSibling);
      } else {
        actions.insertBefore(btn, actions.firstChild);
      }
    }
    bindDemoButton(btn, onExitClick);
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
