/*
 * re-engagement.js — Consentimiento marketing y aviso in-app (P-06).
 * El envío real de email requiere backend (Resend/Stripe); aquí: preferencia + banner.
 */
(function (global) {
  'use strict';

  var INACTIVE_DAYS = 7;
  var CONSENT_KEY = 'pt_marketing_consent';
  var LAST_TRAIN_KEY = 'pt_last_train';

  function uid() {
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : global.PT_AUTH_USER;
    return u && u.sub ? u.sub : null;
  }

  function scopedKey(base) {
    var id = uid();
    return id ? base + '_' + id : base;
  }

  function getConsent() {
    try { return global.localStorage.getItem(scopedKey(CONSENT_KEY)) === '1'; } catch (e) { return false; }
  }

  function setConsent(on) {
    try { global.localStorage.setItem(scopedKey(CONSENT_KEY), on ? '1' : '0'); } catch (e) { /* noop */ }
    global.dispatchEvent(new CustomEvent('pt-marketing-consent', { detail: { enabled: !!on } }));
  }

  function touchTrain() {
    try { global.localStorage.setItem(scopedKey(LAST_TRAIN_KEY), String(Date.now())); } catch (e) { /* noop */ }
    dismissBanner();
  }

  function daysSinceTrain() {
    try {
      var raw = global.localStorage.getItem(scopedKey(LAST_TRAIN_KEY));
      if (!raw) return null;
      return (Date.now() - Number(raw)) / (24 * 60 * 60 * 1000);
    } catch (e) { return null; }
  }

  function dismissBanner() {
    var el = document.getElementById('re-engage-banner');
    if (el) el.classList.add('hidden');
  }

  function renderBanner() {
    if (!getConsent()) return;
    var days = daysSinceTrain();
    if (days == null || days < INACTIVE_DAYS) return;
    var host = document.getElementById('home-page');
    if (!host || document.getElementById('re-engage-banner')) return;
    var el = document.createElement('div');
    el.id = 're-engage-banner';
    el.className = 're-engage-banner';
    el.innerHTML = '<p>Hace ' + Math.floor(days) + ' días que no entrenas. ¿Una mano rápida?</p>' +
      '<div class="re-engage-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" data-re-engage-play>Entrenar ahora</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-re-engage-dismiss>Ocultar</button>' +
      '</div>';
    host.insertBefore(el, host.firstChild);
    el.querySelector('[data-re-engage-play]').addEventListener('click', function () {
      dismissBanner();
      if (global.dispatchEvent) global.dispatchEvent(new CustomEvent('pt-go-tab', { detail: { tab: 'play', setup: true } }));
    });
    el.querySelector('[data-re-engage-dismiss]').addEventListener('click', dismissBanner);
  }

  function bindAccountToggle() {
    var box = document.getElementById('account-marketing-consent');
    if (!box || box.dataset.bound) return;
    box.dataset.bound = '1';
    var input = box.querySelector('input[type="checkbox"]');
    if (!input) return;
    input.checked = getConsent();
    input.addEventListener('change', function () { setConsent(input.checked); });
  }

  function init() {
    bindAccountToggle();
    renderBanner();
  }

  global.PTReEngage = {
    getConsent: getConsent,
    setConsent: setConsent,
    touchTrain: touchTrain,
    daysSinceTrain: daysSinceTrain,
    renderBanner: renderBanner,
    init: init
  };

  global.addEventListener('pt-auth-ready', init);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
