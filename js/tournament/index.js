/*
 * tournament/index.js — API pública PTTournaments (lazy chunk).
 * Menú abierto a usuarios autenticados (TOURNAMENTS_PUBLIC=true).
 */
(function (global) {
  'use strict';

  var ENABLED = true;
  /**
   * Visibilidad del menú Torneos.
   * TOURNAMENTS_PUBLIC=true → cualquier usuario autenticado (no demo).
   * menus.show/hide de comunidad sigue aplicando en app.js.
   */
  var TOURNAMENTS_PUBLIC = true;

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

  function activeCommunityId() {
    try {
      if (global.PTCommunity && typeof global.PTCommunity.id === 'function') {
        return String(global.PTCommunity.id() || 'pokerforge');
      }
    } catch (e) { /* */ }
    return 'pokerforge';
  }

  /** ¿Puede ver el tab Torneos? Usuarios autenticados (GA). */
  function menuVisible() {
    if (!ENABLED || isDemoActive()) return false;
    if (TOURNAMENTS_PUBLIC) return !!authUser();
    /* Legacy: PokerForge admin; MTTLab / gated → managers. */
    var cid = activeCommunityId();
    if (cid === 'mttlab') return isManagerAccess();
    if (cid !== 'pokerforge') {
      try {
        if (global.PTCommunity && PTCommunity.requireMembership && PTCommunity.requireMembership()) {
          return isManagerAccess();
        }
      } catch (e) { /* */ }
    }
    return hasAdminAccess();
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
    TOURNAMENTS_PUBLIC: TOURNAMENTS_PUBLIC,
    menuVisible: menuVisible,
    refreshMenuVisibility: refreshMenuVisibility,
    render: render
  };

  // Alias estable por si el chunk se importa como default
  global.PTTournamentsIndex = global.PTTournaments;
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
