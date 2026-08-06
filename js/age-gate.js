/*
 * age-gate.js — Confirmación obligatoria de mayoría de edad por usuario.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'pt_age_gate_v1';
  var activeResolve = null;
  var activeUser = null;

  function userKey(user) {
    return (user && (user.sub || user.id || user.email)) || 'anon';
  }

  function readAll() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { users: {} };
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return { users: {} };
      if (!data.users || typeof data.users !== 'object') data.users = {};
      return data;
    } catch (e) {
      return { users: {} };
    }
  }

  function writeAll(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data || { users: {} })); } catch (e) { /* noop */ }
  }

  function isConfirmed(user) {
    var data = readAll();
    return !!(data.users && data.users[userKey(user)]);
  }

  function remember(user) {
    var data = readAll();
    if (!data.users) data.users = {};
    data.users[userKey(user)] = {
      confirmed: true,
      ts: Date.now()
    };
    writeAll(data);
  }

  function modalEl() {
    return document.getElementById('age-gate-modal');
  }

  function hide() {
    var el = modalEl();
    if (el) el.classList.add('hidden');
    document.body.classList.remove('age-gate-open');
  }

  function show(user) {
    var el = modalEl();
    if (!el) return Promise.resolve(false);
    activeUser = user || null;
    el.classList.remove('hidden');
    document.body.classList.add('age-gate-open');
    var confirmBtn = document.getElementById('age-gate-confirm');
    var exitBtn = document.getElementById('age-gate-exit');
    var emailEl = document.getElementById('age-gate-user');
    if (emailEl) {
      var legalEmail = global.PT_LEGAL && (global.PT_LEGAL.supportEmail || global.PT_LEGAL.controllerEmail);
      emailEl.textContent = legalEmail || 'info@pokerforgeai.com';
    }
    return new Promise(function (resolve) {
      activeResolve = resolve;
      if (confirmBtn) {
        confirmBtn.onclick = function () {
          remember(activeUser);
          hide();
          var done = activeResolve;
          activeResolve = null;
          if (done) done(true);
        };
      }
      if (exitBtn) {
        exitBtn.onclick = function () {
          hide();
          var done = activeResolve;
          activeResolve = null;
          if (done) done(false);
        };
      }
    });
  }

  function ensureConfirmed(user) {
    if (!user) return Promise.resolve(false);
    if (global.PT_E2E_MODE) {
      remember(user);
      return Promise.resolve(true);
    }
    if (isConfirmed(user)) return Promise.resolve(true);
    return show(user);
  }

  global.PTAgeGate = {
    STORAGE_KEY: STORAGE_KEY,
    userKey: userKey,
    isConfirmed: isConfirmed,
    remember: remember,
    ensureConfirmed: ensureConfirmed,
    hide: hide
  };
})(window);
