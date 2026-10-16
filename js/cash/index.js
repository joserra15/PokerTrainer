/*
 * cash/index.js — API pública PTCash (lazy chunk).
 * Menú admin-only de momento (CASH_PUBLIC=false). Presets por plan Gratis/Study/Coach.
 */
(function (global) {
  'use strict';

  var ENABLED = true;
  /** false → solo admin (fase actual). true → cualquier autenticado. */
  var CASH_PUBLIC = false;

  function isDemoActive() {
    return !!(global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive());
  }

  function authUser() {
    return (global.PTAuth && global.PTAuth.getUser && global.PTAuth.getUser()) ||
      global.PT_AUTH_USER || null;
  }

  function hasAdminAccess() {
    if (global.PTAdmin && typeof global.PTAdmin.hasAccess === 'function') {
      return !!global.PTAdmin.hasAccess();
    }
    if (isDemoActive()) return false;
    var u = authUser();
    return !!(u && u.isAdmin);
  }

  function isManagerAccess() {
    try {
      return !!(global.PTCommunity && typeof global.PTCommunity.isManager === 'function' &&
        global.PTCommunity.isManager());
    } catch (e) {
      return false;
    }
  }

  function communityHasAccess() {
    try {
      if (global.PTCommunity && typeof global.PTCommunity.hasAccess === 'function') {
        return !!global.PTCommunity.hasAccess();
      }
    } catch (e) { /* */ }
    return false;
  }

  function communityRequiresMembership() {
    try {
      return !!(global.PTCommunity && typeof global.PTCommunity.requireMembership === 'function' &&
        global.PTCommunity.requireMembership());
    } catch (e) {
      return false;
    }
  }

  function communityPlanBypass() {
    try {
      if (global.PTCommunity && typeof global.PTCommunity.bypassPaywalls === 'function' &&
          global.PTCommunity.bypassPaywalls()) {
        return true;
      }
      if (communityRequiresMembership() && communityHasAccess()) return true;
    } catch (e) { /* */ }
    return false;
  }

  function menuVisible() {
    if (!ENABLED || isDemoActive()) return false;
    if (CASH_PUBLIC) return !!authUser();
    return hasAdminAccess();
  }

  function entitlementsPlan() {
    var ent = global.PTEntitlements && global.PTEntitlements.get
      ? global.PTEntitlements.get()
      : null;
    if (ent && ent.plan) return String(ent.plan);
    var u = authUser();
    return (u && u.plan) || 'free';
  }

  function planRank(plan) {
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') return 2;
    if (p === 'pro' || p === 'study') return 1;
    return 0;
  }

  function planLabel(plan) {
    var Cfg = global.PTCashConfig;
    if (Cfg && typeof Cfg.planLabel === 'function') return Cfg.planLabel(plan);
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') return 'Coach';
    if (p === 'pro' || p === 'study') return 'Study';
    return 'Gratis';
  }

  function requiredPlanForPreset(presetId) {
    var Cfg = global.PTCashConfig;
    if (Cfg && typeof Cfg.requiredPlanForPreset === 'function') {
      return Cfg.requiredPlanForPreset(presetId);
    }
    return null;
  }

  function canPlayPreset(presetId) {
    if (!menuVisible()) {
      return { ok: false, reason: 'hidden', message: 'Cash no disponible.' };
    }
    var id = String(presetId || '');
    if (!id) {
      return { ok: false, reason: 'invalid', message: 'Mesa no válida.' };
    }
    if (communityPlanBypass()) return { ok: true, bypass: true };
    var need = requiredPlanForPreset(id) || 'pro';
    var have = planRank(entitlementsPlan());
    if (have < planRank(need)) {
      return {
        ok: false,
        reason: 'plan',
        message: 'Esta mesa requiere el plan ' + planLabel(need) + '. Mejora tu plan para desbloquearla.',
        requiredPlan: need,
        requiredPlanLabel: planLabel(need),
        upgrade: true
      };
    }
    return { ok: true, requiredPlan: need };
  }

  function refreshMenuVisibility() {
    var tab = document.querySelector('.tab[data-tab="cash"]');
    if (tab) tab.classList.toggle('hidden', !menuVisible());
  }

  function render(el) {
    if (!el) return;
    if (global.PTCashUI && global.PTCashUI.render) {
      global.PTCashUI.render(el);
    } else {
      el.innerHTML = '<p class="muted">Módulo Cash no cargado.</p>';
    }
  }

  global.PTCash = {
    ENABLED: ENABLED,
    CASH_PUBLIC: CASH_PUBLIC,
    menuVisible: menuVisible,
    refreshMenuVisibility: refreshMenuVisibility,
    render: render,
    canPlayPreset: canPlayPreset,
    communityPlanBypass: communityPlanBypass,
    entitlementsPlan: entitlementsPlan,
    planRank: planRank,
    planLabel: planLabel,
    requiredPlanForPreset: requiredPlanForPreset,
    hasAdminAccess: hasAdminAccess,
    isManagerAccess: isManagerAccess
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
