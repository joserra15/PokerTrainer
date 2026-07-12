/*
 * analytics.js — Eventos de producto con consentimiento de cookies (G-07).
 * Funnel: registro → uso (jugar/import) → pago.
 */
(function (global) {
  'use strict';

  var loaded = false;

  function cfg() {
    return global.PT_ANALYTICS || { enabled: false };
  }

  function canTrack() {
    return !!(cfg().enabled && global.PTLegal && global.PTLegal.hasAnalyticsConsent && global.PTLegal.hasAnalyticsConsent());
  }

  function loadScript() {
    if (loaded || !canTrack()) return;
    var c = cfg();
    if (!c.domain || !c.scriptUrl) return;
    var s = document.createElement('script');
    s.defer = true;
    s.dataset.domain = c.domain;
    s.src = c.scriptUrl;
    document.head.appendChild(s);
    loaded = true;
  }

  function track(eventName, props) {
    if (!canTrack()) return;
    loadScript();
    if (typeof global.plausible === 'function') {
      global.plausible(eventName, props ? { props: props } : undefined);
    }
  }

  function trackPage() {
    track('pageview');
  }

  function trackRegister(method) {
    track('register', { method: method || 'google' });
  }

  function trackLogin(method) {
    track('login', { method: method || 'google' });
  }

  function trackLogout() {
    track('logout');
  }

  function trackTab(tab) {
    track('tab_view', { tab: tab || 'home' });
  }

  function trackHandStart(meta) {
    track('hand_start', meta || {});
  }

  function trackPlayHand(meta) {
    track('play_hand', meta || {});
  }

  function trackImportSession(meta) {
    track('import_session', meta || {});
  }

  function trackAiCoach(meta) {
    track('ai_coach_used', meta || {});
  }

  function trackCheckoutStart(meta) {
    track('checkout_start', meta || {});
  }

  global.PTAnalytics = {
    load: loadScript,
    track: track,
    trackPage: trackPage,
    trackRegister: trackRegister,
    trackLogin: trackLogin,
    trackLogout: trackLogout,
    trackTab: trackTab,
    trackHandStart: trackHandStart,
    trackPlayHand: trackPlayHand,
    trackImportSession: trackImportSession,
    trackAiCoach: trackAiCoach,
    trackCheckoutStart: trackCheckoutStart
  };

  global.addEventListener('pt-cookie-consent', function () {
    if (canTrack()) loadScript();
  });

  if (canTrack()) loadScript();
})(window);
