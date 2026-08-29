/*
 * community.js — Multi-comunidad: resolve, access, menus, branding, switcher.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'pt_app_variant';
  var ACCESS_CACHE = null;
  var MY_COMMUNITIES = null;
  var DEFAULT_APP = 'pokerforge';
  var ACTIVE = 'pokerforge';
  var BOOTSTRAPPED = false;

  function configs() {
    return global.PT_COMMUNITY_CONFIGS || {};
  }

  function getConfig(id) {
    var map = configs();
    return map[id] || map.pokerforge || null;
  }

  function normalizeId(id) {
    var s = String(id || '').trim().toLowerCase();
    if (!s) return 'pokerforge';
    if (getConfig(s)) return s;
    return 'pokerforge';
  }

  function readStored() {
    try {
      return normalizeId(sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return 'pokerforge';
    }
  }

  function writeStored(id) {
    try {
      sessionStorage.setItem(STORAGE_KEY, id);
      localStorage.setItem(STORAGE_KEY, id);
    } catch (e) { /* noop */ }
  }

  function pathCommunity() {
    try {
      var path = String(location.pathname || '');
      if (/\/mttlab\/?/i.test(path)) return 'mttlab';
      var q = new URLSearchParams(location.search || '');
      var app = q.get('app') || q.get('community');
      if (app) return normalizeId(app);
    } catch (e) { /* noop */ }
    return null;
  }

  /** Solo para landing pre-login (branding). Tras OAuth no manda. */
  function resolveInitial() {
    return pathCommunity() || 'pokerforge';
  }

  function accessibleIds() {
    return (MY_COMMUNITIES || [])
      .filter(function (c) { return c && c.id; })
      .map(function (c) { return c.id; });
  }

  /**
   * Tras login: 1 acceso → ese; varios → default_app si es válido; si no, pokerforge.
   * OAuth siempre vuelve a /; aquí se elige el shell.
   */
  function resolveActiveFromMemberships() {
    var ids = accessibleIds();
    if (!ids.length) return 'pokerforge';
    if (ids.length === 1) return ids[0];
    var def = normalizeId(DEFAULT_APP);
    if (ids.indexOf(def) >= 0) return def;
    if (ids.indexOf('pokerforge') >= 0) return 'pokerforge';
    return ids[0];
  }

  function cleanEntryUrl() {
    try {
      var dirty = /\/mttlab\/?/i.test(location.pathname || '') ||
        /[?&](?:app|community)=/i.test(location.search || '');
      if (dirty) {
        history.replaceState({}, '', '/' + (location.hash || ''));
      }
    } catch (e) { /* noop */ }
  }

  function client() {
    return global.PTSupabase && global.PTSupabase.getClient
      ? global.PTSupabase.getClient()
      : null;
  }

  function useAuth() {
    return global.PTSupabase && global.PTSupabase.useAuth && global.PTSupabase.useAuth();
  }

  function id() {
    return ACTIVE;
  }

  function config() {
    return getConfig(ACTIVE) || getConfig('pokerforge');
  }

  function is(communityId) {
    return id() === normalizeId(communityId);
  }

  function requireMembership() {
    var cfg = config();
    return !!(cfg && cfg.requireMembership);
  }

  function isManager() {
    return !!(ACCESS_CACHE && ACCESS_CACHE.is_manager);
  }

  function hasAccess() {
    if (!requireMembership()) return true;
    return !!(ACCESS_CACHE && ACCESS_CACHE.allowed);
  }

  function myCommunities() {
    return MY_COMMUNITIES || [{ id: 'pokerforge', name: 'PokerForgeAI', role: 'member', entry_path: '/' }];
  }

  function defaultApp() {
    return DEFAULT_APP || 'pokerforge';
  }

  function setActive(communityId, opts) {
    opts = opts || {};
    ACTIVE = normalizeId(communityId);
    writeStored(ACTIVE);
    applyDocument();
    if (!opts.skipMenus) applyMenus();
    if (!opts.skipBrand) applyBranding();
    return ACTIVE;
  }

  function applyDocument() {
    try {
      if (document.body) {
        document.body.setAttribute('data-community', ACTIVE);
        document.body.classList.toggle('community-gated', requireMembership() && !hasAccess());
      }
    } catch (e) { /* noop */ }
  }

  function applyBranding() {
    var cfg = config();
    if (!cfg) return;
    var logos = document.querySelectorAll('img.app-logo, .landing-brand .app-logo, #brand-home .app-logo');
    logos.forEach(function (img) {
      if (!img.getAttribute('data-pf-logo')) {
        img.setAttribute('data-pf-logo', img.getAttribute('src') || '');
      }
      var src = cfg.logo || img.getAttribute('data-pf-logo');
      if (src) img.setAttribute('src', src);
      img.setAttribute('alt', cfg.siteName || 'App');
    });
    var brandTitle = document.querySelector('#brand-home h1, .brand-title');
    if (brandTitle) {
      if (!brandTitle.getAttribute('data-pf-title')) {
        brandTitle.setAttribute('data-pf-title', brandTitle.textContent || '');
      }
      brandTitle.textContent = cfg.siteName || brandTitle.getAttribute('data-pf-title');
    }
    try {
      document.title = (cfg.siteName || 'PokerForgeAI') + (ACTIVE === 'pokerforge'
        ? ' · Entrenador GTO'
        : ' · Comunidad');
    } catch (e) { /* noop */ }
  }

  function applyMenus() {
    var cfg = config();
    if (!cfg || !cfg.menus) return;
    var show = cfg.menus.show;
    var hide = cfg.menus.hide || [];
    var tabs = document.querySelectorAll('#topbar-nav .tab[data-tab], .tabs .tab[data-tab]');
    tabs.forEach(function (btn) {
      var tab = btn.getAttribute('data-tab');
      if (!tab) return;
      var shouldHide = false;
      if (hide.indexOf(tab) >= 0) shouldHide = true;
      if (show && show.indexOf(tab) < 0 && tab !== 'home' && tab !== 'account' && tab !== 'admin') {
        shouldHide = true;
      }
      if (tab === 'manager') {
        shouldHide = !(hasAccess() && (isManager() || (global.PTAuth && global.PTAuth.getUser && global.PTAuth.getUser() && global.PTAuth.getUser().isAdmin)));
        if (show && show.indexOf('manager') < 0) shouldHide = true;
      }
      if (tab === 'pricing' && cfg.billing && cfg.billing.hidePricing) shouldHide = true;
      if (tab === 'admin' && ACTIVE !== 'pokerforge') shouldHide = true;
      btn.classList.toggle('hidden', shouldHide);
      if (shouldHide) btn.setAttribute('aria-hidden', 'true');
      else btn.removeAttribute('aria-hidden');
    });
  }

  function showAccessDenied(message) {
    var gate = document.getElementById('auth-gate');
    var shell = document.getElementById('app-shell');
    if (shell) {
      shell.classList.add('hidden');
      shell.setAttribute('aria-hidden', 'true');
    }
    if (gate) {
      gate.classList.remove('hidden');
      gate.setAttribute('aria-hidden', 'false');
    }
    document.body.classList.add('community-gated', 'auth-locked');
    var host = document.getElementById('community-access-gate');
    if (!host) {
      host = document.createElement('div');
      host.id = 'community-access-gate';
      host.className = 'community-access-gate';
      var login = document.getElementById('landing-login') || gate;
      if (login && login.parentNode) login.parentNode.insertBefore(host, login);
      else if (gate) gate.appendChild(host);
    }
    var cfg = config();
    host.innerHTML =
      '<div class="community-access-card">' +
      '<img src="' + (cfg.logoAuth || cfg.logo || '') + '" alt="" class="app-logo app-logo-auth" width="72" height="72" />' +
      '<h2>' + escapeHtml(cfg.siteName || 'Comunidad') + '</h2>' +
      '<p class="muted-text">' + escapeHtml(message || 'Esta área es exclusiva para miembros de la comunidad.') + '</p>' +
      '<form id="community-join-form" class="community-join-form">' +
      '<label for="community-join-code">Código de acceso</label>' +
      '<input type="text" id="community-join-code" autocomplete="off" placeholder="Tu código" />' +
      '<button type="submit" class="btn btn-primary">Unirme</button>' +
      '</form>' +
      '<p id="community-join-error" class="admin-error" role="alert"></p>' +
      '<p class="muted-text"><a href="/">Ir a PokerForgeAI</a></p>' +
      '</div>';
    var form = document.getElementById('community-join-form');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        joinWithCode();
      });
    }
  }

  function hideAccessDenied() {
    var host = document.getElementById('community-access-gate');
    if (host) host.innerHTML = '';
    document.body.classList.remove('community-gated');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function refreshMembership() {
    MY_COMMUNITIES = [{ id: 'pokerforge', name: 'PokerForgeAI', role: 'member', entry_path: '/', active: true }];
    DEFAULT_APP = 'pokerforge';
    ACCESS_CACHE = { allowed: !requireMembership(), is_manager: false, community_id: ACTIVE };

    if (global.PT_E2E_MODE) {
      ACCESS_CACHE = { allowed: true, is_manager: true, community_id: ACTIVE };
      applyDocument();
      applyMenus();
      return ACCESS_CACHE;
    }

    if (!useAuth() || !client()) {
      applyDocument();
      applyMenus();
      return ACCESS_CACHE;
    }

    try {
      var res = await client().rpc('pt_my_communities');
      if (!res.error && res.data) {
        var list = res.data.communities || [];
        MY_COMMUNITIES = Array.isArray(list) ? list : [];
        if (!MY_COMMUNITIES.some(function (c) { return c.id === 'pokerforge'; })) {
          MY_COMMUNITIES.unshift({ id: 'pokerforge', name: 'PokerForgeAI', role: 'member', entry_path: '/' });
        }
        DEFAULT_APP = res.data.default_app || 'pokerforge';
      }
    } catch (e) {
      console.warn('[PTCommunity] my_communities', e);
    }

    if (!requireMembership()) {
      ACCESS_CACHE = { allowed: true, is_manager: false, community_id: ACTIVE };
    } else {
      try {
        var feat = await client().rpc('pt_community_feature_access', {
          p_community_id: ACTIVE,
          p_feature: 'shell'
        });
        if (feat.error) {
          ACCESS_CACHE = { allowed: false, is_manager: false, community_id: ACTIVE, error: feat.error.message };
        } else {
          ACCESS_CACHE = feat.data || { allowed: false, community_id: ACTIVE };
        }
      } catch (e2) {
        ACCESS_CACHE = { allowed: false, is_manager: false, community_id: ACTIVE, error: String(e2) };
      }
    }

    applyDocument();
    applyMenus();
    return ACCESS_CACHE;
  }

  async function assertFeature(feature) {
    var feat = feature || 'shell';
    if (global.PT_E2E_MODE) {
      return { ok: true, allowed: true, community_id: ACTIVE, feature: feat, is_manager: true };
    }
    if (!requireMembership() && feat !== 'manager') {
      return { ok: true, allowed: true };
    }
    if (!useAuth() || !client()) {
      return { ok: false, allowed: false, error: 'not_authenticated' };
    }
    var res = await client().rpc('pt_community_feature_access', {
      p_community_id: ACTIVE,
      p_feature: feat
    });
    if (res.error) return { ok: false, allowed: false, error: res.error.message };
    return res.data || { ok: false, allowed: false };
  }

  /**
   * Gate síncrono de navegación (menús + ACCESS_CACHE).
   * No hace RPC: el backend autoriza al cargar datos; aquí solo UX.
   */
  function canOpenTab(tabId) {
    if (global.PT_E2E_MODE) return { ok: true, allowed: true };
    var cfg = config();
    if (cfg && cfg.menus) {
      if (cfg.menus.hide && cfg.menus.hide.indexOf(tabId) >= 0) {
        return { ok: false, allowed: false, error: 'tab_hidden' };
      }
      if (cfg.menus.show && cfg.menus.show.indexOf(tabId) < 0 &&
          tabId !== 'home' && tabId !== 'account' && tabId !== 'admin') {
        return { ok: false, allowed: false, error: 'tab_hidden' };
      }
    }
    if (tabId === 'admin' && ACTIVE !== 'pokerforge') {
      return { ok: false, allowed: false, error: 'forbidden' };
    }
    if (tabId === 'manager') {
      var user = (global.PTAuth && global.PTAuth.getUser && global.PTAuth.getUser()) || global.PT_AUTH_USER;
      var admin = !!(user && user.isAdmin);
      if (!(isManager() || admin)) {
        return { ok: false, allowed: false, error: 'forbidden' };
      }
    }
    if (requireMembership() && !hasAccess()) {
      return { ok: false, allowed: false, error: 'forbidden' };
    }
    return { ok: true, allowed: true };
  }

  async function assertTab(tabId) {
    var sync = canOpenTab(tabId);
    if (!sync.allowed) return sync;
    if (tabId === 'manager') return assertFeature('manager');
    if (requireMembership()) return assertFeature(tabId === 'school' ? 'school' : 'shell');
    return { ok: true, allowed: true };
  }

  async function joinWithCode() {
    var input = document.getElementById('community-join-code');
    var errEl = document.getElementById('community-join-error');
    var code = input ? String(input.value || '').trim() : '';
    if (errEl) errEl.textContent = '';
    if (!code) {
      if (errEl) errEl.textContent = 'Introduce un código.';
      return;
    }
    if (!client()) {
      if (errEl) errEl.textContent = 'Sesión no disponible.';
      return;
    }
    var res = await client().rpc('pt_join_community', { p_code: code });
    if (res.error || !(res.data && res.data.ok)) {
      var msg = (res.data && res.data.error) || (res.error && res.error.message) || 'Código inválido';
      if (errEl) errEl.textContent = msg === 'invalid_code' ? 'Código no válido.' : String(msg);
      return;
    }
    if (res.data.community_id) {
      setActive(res.data.community_id, { skipMenus: true, skipBrand: true });
    }
    await refreshMembership();
    if (hasAccess()) {
      hideAccessDenied();
      var shell = document.getElementById('app-shell');
      var gate = document.getElementById('auth-gate');
      if (shell) {
        shell.classList.remove('hidden');
        shell.setAttribute('aria-hidden', 'false');
      }
      if (gate) {
        gate.classList.add('hidden');
        gate.setAttribute('aria-hidden', 'true');
      }
      document.body.classList.remove('auth-locked');
      applyBranding();
      applyMenus();
      global.dispatchEvent(new CustomEvent('pt-community-ready', { detail: { id: ACTIVE } }));
      if (global.goToTab) global.goToTab('home');
    }
  }

  async function gateAfterLogin() {
    if (global.PT_E2E_MODE) {
      setActive('pokerforge', { skipMenus: true, skipBrand: true });
      ACCESS_CACHE = { allowed: true, is_manager: true, community_id: 'pokerforge' };
      hideAccessDenied();
      applyBranding();
      applyMenus();
      return true;
    }
    await refreshMembership();
    var next = resolveActiveFromMemberships();
    setActive(next, { skipMenus: true, skipBrand: true });
    // Recalcular ACCESS_CACHE del shell elegido
    await refreshMembership();
    cleanEntryUrl();

    if (requireMembership() && !hasAccess()) {
      showAccessDenied();
      return false;
    }
    hideAccessDenied();
    applyBranding();
    applyMenus();
    return true;
  }

  async function switchTo(communityId) {
    var next = normalizeId(communityId);
    var ids = accessibleIds();
    if (ids.indexOf(next) < 0 && next !== 'pokerforge') {
      showAccessDenied('No tienes acceso a esa comunidad.');
      return false;
    }
    setActive(next, { skipMenus: true, skipBrand: true });
    await refreshMembership();
    if (requireMembership() && !hasAccess()) {
      showAccessDenied();
      return false;
    }
    hideAccessDenied();
    applyBranding();
    applyMenus();
    cleanEntryUrl();
    global.dispatchEvent(new CustomEvent('pt-community-switch', { detail: { id: next } }));
    if (global.goToTab) global.goToTab('home');
    return true;
  }

  async function setDefaultApp(appId) {
    var app = normalizeId(appId);
    if (!client()) return { ok: false };
    var res = await client().rpc('pt_set_default_app', { p_app: app });
    if (!res.error && res.data && res.data.ok) {
      DEFAULT_APP = app;
    }
    return res.data || { ok: false, error: res.error && res.error.message };
  }

  function openSwitcherModal() {
    var list = myCommunities().filter(function (c) {
      return c && c.id;
    });
    if (list.length <= 1) return;

    var existing = document.getElementById('community-switcher-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'community-switcher-modal';
    modal.className = 'community-switcher-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML =
      '<div class="community-switcher-backdrop" data-close="1"></div>' +
      '<div class="community-switcher-panel card-box">' +
      '<h3>Tus apps y comunidades</h3>' +
      '<ul class="community-switcher-list">' +
      list.map(function (c) {
        var cfg = getConfig(c.id) || {};
        var active = c.id === ACTIVE ? ' is-active' : '';
        return '<li><button type="button" class="community-switcher-item' + active + '" data-community="' +
          escapeHtml(c.id) + '">' +
          '<img src="' + escapeHtml(cfg.logo || 'icons/logo-header.png') + '" alt="" width="36" height="36" />' +
          '<span><strong>' + escapeHtml(c.name || cfg.siteName || c.id) + '</strong>' +
          (c.role === 'manager' ? '<small>Manager</small>' : '') +
          (c.id === ACTIVE ? '<small>Actual</small>' : '') +
          '</span></button></li>';
      }).join('') +
      '</ul>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-close="1">Cerrar</button>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (ev) {
      var t = ev.target;
      if (t && t.getAttribute && t.getAttribute('data-close')) {
        modal.remove();
        return;
      }
      var btn = t.closest ? t.closest('[data-community]') : null;
      if (btn) {
        var cid = btn.getAttribute('data-community');
        modal.remove();
        switchTo(cid);
      }
    });
  }

  function bindLogoSwitcher() {
    var brand = document.getElementById('brand-home');
    if (!brand || brand.getAttribute('data-community-bound')) return;
    brand.setAttribute('data-community-bound', '1');
    brand.addEventListener('click', function (ev) {
      var list = myCommunities();
      if (list && list.length > 1) {
        ev.preventDefault();
        ev.stopPropagation();
        openSwitcherModal();
      }
    }, true);
  }

  function schoolPack() {
    var cfg = config();
    return (cfg && cfg.school && cfg.school.pack) || 'pokerforge';
  }

  function unlockMode() {
    var cfg = config();
    return (cfg && cfg.school && cfg.school.unlockMode) || 'linear';
  }

  function bypassPaywalls() {
    var cfg = config();
    return !!(cfg && cfg.billing && cfg.billing.bypassPaywalls && hasAccess());
  }

  function contactCommunityId() {
    var cfg = config();
    if (cfg && cfg.contact && cfg.contact.communityScoped && ACTIVE !== 'pokerforge') {
      return ACTIVE;
    }
    return null;
  }

  function progressKey() {
    if (ACTIVE === 'pokerforge') return 'school_progress';
    return 'school_progress_' + ACTIVE;
  }

  function boot() {
    if (BOOTSTRAPPED) return;
    BOOTSTRAPPED = true;
    // Pre-login: URL solo afecta branding de landing. Tras login manda membership/default.
    setActive(resolveInitial(), { skipMenus: true });
    applyBranding();
    bindLogoSwitcher();
  }

  // Early resolve so body attribute is available ASAP (landing only)
  try {
    ACTIVE = resolveInitial();
  } catch (e) { /* noop */ }

  global.PTCommunity = {
    boot: boot,
    id: id,
    config: config,
    getConfig: getConfig,
    is: is,
    setActive: setActive,
    requireMembership: requireMembership,
    hasAccess: hasAccess,
    isManager: isManager,
    myCommunities: myCommunities,
    defaultApp: defaultApp,
    refreshMembership: refreshMembership,
    gateAfterLogin: gateAfterLogin,
    resolveActiveFromMemberships: resolveActiveFromMemberships,
    assertFeature: assertFeature,
    assertTab: assertTab,
    canOpenTab: canOpenTab,
    switchTo: switchTo,
    setDefaultApp: setDefaultApp,
    openSwitcherModal: openSwitcherModal,
    applyMenus: applyMenus,
    applyBranding: applyBranding,
    schoolPack: schoolPack,
    unlockMode: unlockMode,
    bypassPaywalls: bypassPaywalls,
    contactCommunityId: contactCommunityId,
    progressKey: progressKey,
    showAccessDenied: showAccessDenied,
    joinWithCode: joinWithCode
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : this);
