/*
 * tournament/index.js — API pública PTTournaments (lazy chunk).
 * Acceso: menú para usuarios autenticados / miembros de comunidad;
 * presets por plan (Gratis/Study/Coach); Personalizado solo admin/manager.
 */
(function (global) {
  'use strict';

  var ENABLED = true;

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

  function activeCommunityId() {
    try {
      if (global.PTCommunity && typeof global.PTCommunity.id === 'function') {
        return String(global.PTCommunity.id() || 'pokerforge');
      }
    } catch (e) { /* */ }
    return 'pokerforge';
  }

  /**
   * En comunidad (membership): sin límite de plan si eres miembro.
   * También respeta bypassPaywalls (p.ej. MTT Lab).
   */
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

  /**
   * PokerForgeAI: usuarios autenticados (no demo).
   * Comunidades gated: cualquier miembro con acceso.
   */
  function menuVisible() {
    if (!ENABLED || isDemoActive()) return false;
    if (communityRequiresMembership()) return communityHasAccess();
    return !!authUser();
  }

  /** Personalizado: solo admin global o manager de comunidad. */
  function canUseCustom() {
    if (!menuVisible()) return false;
    return hasAdminAccess() || isManagerAccess();
  }

  function entitlementsPlan() {
    var ent = global.PTEntitlements && global.PTEntitlements.get
      ? global.PTEntitlements.get()
      : null;
    if (ent && ent.plan) return String(ent.plan);
    var u = authUser();
    return (u && u.plan) || 'free';
  }

  /** free=0, study/pro=1, coach/premium=2 */
  function planRank(plan) {
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') return 2;
    if (p === 'pro' || p === 'study') return 1;
    return 0;
  }

  function planLabel(plan) {
    var Cfg = global.PTTournamentConfig;
    if (Cfg && typeof Cfg.planLabel === 'function') return Cfg.planLabel(plan);
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') return 'Coach';
    if (p === 'pro' || p === 'study') return 'Study';
    return 'Gratis';
  }

  function requiredPlanForPreset(presetId) {
    var Cfg = global.PTTournamentConfig;
    if (Cfg && typeof Cfg.requiredPlanForPreset === 'function') {
      return Cfg.requiredPlanForPreset(presetId);
    }
    return null;
  }

  /**
   * ¿Puede jugar este preset según el plan?
   * Comunidad: todos los miembros pueden jugar cualquier preset.
   */
  function canPlayPreset(presetId) {
    if (!menuVisible()) {
      return { ok: false, reason: 'hidden', message: 'Torneos no disponibles.' };
    }
    var id = String(presetId || '');
    if (!id || id === 'custom') {
      if (canUseCustom()) return { ok: true };
      return {
        ok: false,
        reason: 'custom_role',
        message: 'Los torneos personalizados solo están disponibles para administradores y managers de comunidad.'
      };
    }
    if (communityPlanBypass()) return { ok: true, bypass: true };
    var need = requiredPlanForPreset(id) || 'pro';
    var have = planRank(entitlementsPlan());
    if (have < planRank(need)) {
      return {
        ok: false,
        reason: 'plan',
        message: 'Este torneo requiere el plan ' + planLabel(need) + '. Mejora tu plan para desbloquearlo.',
        requiredPlan: need,
        requiredPlanLabel: planLabel(need),
        upgrade: true
      };
    }
    return { ok: true, requiredPlan: need };
  }

  function refreshMenuVisibility() {
    var tab = document.querySelector('.tab[data-tab="tournaments"]');
    if (tab) tab.classList.toggle('hidden', !menuVisible());
    var panel = document.getElementById('tab-tournaments');
    if (panel && !menuVisible() && panel.classList.contains('active')) {
      /* parent app.js suele cambiar de tab; no forzamos aquí */
    }
  }

  function render(el) {
    if (!el) return;
    if (global.PTTournamentsUI && global.PTTournamentsUI.render) {
      global.PTTournamentsUI.render(el);
    } else {
      el.innerHTML = '<p class="muted">Módulo de torneos no cargado.</p>';
    }
  }

  global.PTTournaments = {
    ENABLED: ENABLED,
    menuVisible: menuVisible,
    refreshMenuVisibility: refreshMenuVisibility,
    render: render,
    canUseCustom: canUseCustom,
    canPlayPreset: canPlayPreset,
    communityPlanBypass: communityPlanBypass,
    entitlementsPlan: entitlementsPlan,
    planRank: planRank,
    planLabel: planLabel,
    requiredPlanForPreset: requiredPlanForPreset,
    hasAdminAccess: hasAdminAccess,
    isManagerAccess: isManagerAccess
  };

  // Alias estable por si el chunk se importa como default
  global.PTTournamentsIndex = global.PTTournaments;
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
