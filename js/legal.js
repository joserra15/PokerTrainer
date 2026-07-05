/*
 * legal.js — Banner de cookies, rutas legales y utilidades RGPD en cliente.
 */
(function (global) {
  'use strict';

  const CONSENT_KEY = 'pt_cookie_consent_v1';
  const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

  const DEFAULTS = {
    controllerName: 'Responsable del tratamiento (configura js/legal-config.js)',
    controllerEmail: 'privacidad@ejemplo.com',
    appUrl: '',
    lastUpdated: '19 de junio de 2026'
  };

  function cfg() {
    return Object.assign({}, DEFAULTS, global.PT_LEGAL || {});
  }

  function appBasePath() {
    var path = global.location.pathname || '/';
    if (/\/legal\//i.test(path)) {
      return path.replace(/\/legal\/[^/]*$/i, '/');
    }
    if (/index\.html$/i.test(path)) {
      return path.replace(/index\.html$/i, '');
    }
    if (path.slice(-1) !== '/') {
      return path.replace(/\/[^/]*$/, '/');
    }
    return path;
  }

  function legalUrl(page) {
    var base = appBasePath();
    return base + 'legal/' + page;
  }

  function readConsent() {
    try {
      var raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.ts) return null;
      if (Date.now() - data.ts > CONSENT_MAX_AGE_MS) {
        localStorage.removeItem(CONSENT_KEY);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  function saveConsent(partial) {
    var prev = readConsent() || { necessary: true, analytics: false };
    var next = Object.assign({}, prev, partial || {}, { ts: Date.now() });
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(next)); } catch (e) { /* noop */ }
    global.dispatchEvent(new CustomEvent('pt-cookie-consent', { detail: next }));
    hideBanner();
    return next;
  }

  function hasAnalyticsConsent() {
    var c = readConsent();
    return !!(c && c.analytics);
  }

  function hideBanner() {
    var el = document.getElementById('cookie-banner');
    if (el) el.classList.add('hidden');
    document.body.classList.remove('cookie-banner-open');
  }

  function legalLinksHtml(prefix) {
    prefix = prefix || '';
    return '<nav class="legal-links" aria-label="Legal">' +
      '<a href="' + legalUrl('metodologia.html') + '">' + prefix + 'Metodología GTO</a>' +
      '<a href="' + legalUrl('privacidad.html') + '">' + prefix + 'Privacidad</a>' +
      '<a href="' + legalUrl('terminos.html') + '">' + prefix + 'Términos</a>' +
      '<a href="' + legalUrl('cookies.html') + '">' + prefix + 'Cookies</a>' +
      '<a href="' + legalUrl('ia.html') + '">' + prefix + 'IA</a>' +
      '</nav>';
  }

  function mountFooterLinks() {
    var gateFoot = document.getElementById('auth-legal-foot');
    if (gateFoot) gateFoot.innerHTML = legalLinksHtml('');
    var appFoot = document.getElementById('app-legal-foot');
    if (appFoot) appFoot.innerHTML = legalLinksHtml('');
  }

  function mountBanner() {
    if (readConsent()) {
      hideBanner();
      return;
    }
    var el = document.getElementById('cookie-banner');
    if (!el) return;
    el.classList.remove('hidden');
    document.body.classList.add('cookie-banner-open');

    var acceptAll = document.getElementById('cookie-accept-all');
    var acceptNec = document.getElementById('cookie-accept-necessary');
    var configure = document.getElementById('cookie-configure');
    var panel = document.getElementById('cookie-config-panel');
    var saveCfg = document.getElementById('cookie-save-config');
    var analyticsCb = document.getElementById('cookie-analytics-opt');

    if (acceptAll) {
      acceptAll.onclick = function () {
        saveConsent({ necessary: true, analytics: true });
      };
    }
    if (acceptNec) {
      acceptNec.onclick = function () {
        saveConsent({ necessary: true, analytics: false });
      };
    }
    if (configure && panel) {
      configure.onclick = function () {
        panel.classList.toggle('hidden');
      };
    }
    if (saveCfg && analyticsCb) {
      saveCfg.onclick = function () {
        saveConsent({ necessary: true, analytics: !!analyticsCb.checked });
      };
    }
  }

  function init() {
    mountFooterLinks();
    mountBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.PTLegal = {
    cfg: cfg,
    appBasePath: appBasePath,
    legalUrl: legalUrl,
    legalLinksHtml: legalLinksHtml,
    readConsent: readConsent,
    saveConsent: saveConsent,
    hasAnalyticsConsent: hasAnalyticsConsent,
    showCookieBanner: function () {
      try { localStorage.removeItem(CONSENT_KEY); } catch (e) { /* noop */ }
      mountBanner();
    }
  };
})(window);
