/*
 * tournament/index.js — API pública PTTournaments (lazy chunk).
 */
(function (global) {
  'use strict';

  var ENABLED = true;

  function isDemoActive() {
    return !!(global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive());
  }

  function hasAdminAccess() {
    if (global.PTAdmin && typeof global.PTAdmin.hasAccess === 'function') {
      return !!global.PTAdmin.hasAccess();
    }
    if (isDemoActive()) return false;
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    return !!(u && u.isAdmin);
  }

  function menuVisible() {
    if (!ENABLED) return false;
    return hasAdminAccess() && !isDemoActive();
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
    render: render
  };

  // Alias estable por si el chunk se importa como default
  global.PTTournamentsIndex = global.PTTournaments;
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
