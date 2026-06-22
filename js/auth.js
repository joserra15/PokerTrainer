/*
 * auth.js — Complementa auth-bootstrap.js: menú de cuenta y arranque de la app.
 */
(function (global) {
  'use strict';

  const SESSION_KEY = 'pt_auth_v1';
  const SESSION_MAX_MS = 30 * 24 * 60 * 60 * 1000;

  let currentUser = global.PT_AUTH_USER || null;
  let appReadyCallback = null;
  let appStarted = false;

  function $(sel) { return document.querySelector(sel); }

  function loadSession() {
    if (currentUser) return normalizeUser(currentUser);
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.sub || !data.email) return null;
      if (Date.now() - (data.loginAt || 0) > SESSION_MAX_MS) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return normalizeUser(data);
    } catch (e) {
      return null;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setAppVisible(visible) {
    const shell = $('#app-shell');
    const gate = $('#auth-gate');
    if (shell) shell.classList.toggle('hidden', !visible);
    if (gate) gate.classList.toggle('hidden', visible);
    document.body.classList.toggle('auth-locked', !visible);
  }

  function normalizeUser(user) {
    if (global.PT_normalizeUser) return global.PT_normalizeUser(user);
    if (!user || !user.name) return user;
    return user;
  }

  function decodeGsiCredential(credential) {
    if (global.PT_decodeJwt) return global.PT_decodeJwt(credential);
    try {
      const b64 = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return JSON.parse(new TextDecoder('utf-8').decode(bytes));
    } catch (e) {
      return null;
    }
  }

  function renderAccountMenu(user) {
    user = normalizeUser(user);
    const trigger = $('#account-trigger');
    if (!trigger || !user) return;

    const avatar = $('#account-avatar');
    const avatarLg = $('#account-avatar-lg');
    if (avatar) { avatar.src = user.picture || ''; avatar.alt = user.name; avatar.hidden = !user.picture; }
    if (avatarLg) { avatarLg.src = user.picture || ''; avatarLg.alt = user.name; avatarLg.hidden = !user.picture; }

    const nameEl = $('#account-name');
    const emailEl = $('#account-email');
    const shortEl = $('#account-email-short');
    if (nameEl) nameEl.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;
    if (shortEl) shortEl.textContent = user.email.length > 22 ? user.email.slice(0, 20) + '…' : user.email;

    const metaEl = $('#account-meta');
    if (metaEl) {
      metaEl.innerHTML =
        '<div class="account-row"><span>Correo</span><strong>' + escapeHtml(user.email) + '</strong></div>' +
        (user.emailVerified ? '<div class="account-row"><span>Verificado</span><strong>Sí</strong></div>' : '') +
        (user.locale ? '<div class="account-row"><span>Idioma</span><strong>' + escapeHtml(user.locale) + '</strong></div>' : '') +
        '<div class="account-row"><span>ID</span><code>' + escapeHtml(user.sub.slice(0, 12)) + '…</code></div>' +
        '<div class="account-row" data-cloud-status><span>Nube</span><strong>…</strong></div>';
    }
    if (global.PTCloud && global.PTCloud.getStatus) {
      const st = global.PTCloud.getStatus();
      const cloudRow = metaEl && metaEl.querySelector('[data-cloud-status] strong');
      if (cloudRow) {
        const labels = { disabled: 'Desactivado', pending: 'Pendiente', ready: 'Listo', syncing: 'Sincronizando…', online: 'Sincronizado', error: 'Error' };
        cloudRow.textContent = labels[st.status] || st.status;
      }
    }

    trigger.onclick = function (e) {
      e.stopPropagation();
      if (window.matchMedia('(max-width: 680px)').matches) return;
      const dropdown = $('#account-dropdown');
      if (!dropdown) return;
      const open = dropdown.classList.toggle('hidden');
      trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
    };

    const signout = $('#account-signout');
    if (signout) signout.onclick = function () { signOut(); };

    const syncBtn = $('#account-sync');
    if (syncBtn) {
      syncBtn.onclick = function () {
        if (typeof global.runCloudSync === 'function') global.runCloudSync(syncBtn);
        else if (global.PTCloud && global.PTCloud.syncNow) {
          syncBtn.disabled = true;
          global.PTCloud.syncNow().finally(function () { syncBtn.disabled = false; });
        }
      };
    }
  }

  function startAppIfNeeded() {
    if (appStarted) return;
    if (typeof appReadyCallback === 'function') {
      const cb = appReadyCallback;
      appReadyCallback = null;
      appStarted = true;
      cb();
    }
  }

  async function enterApp(user) {
    if (!user) return;
    user = normalizeUser(user);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (e) { /* noop */ }
    currentUser = user;
    global.PT_AUTH_USER = user;
    if (global.Store && global.Store.setUserId) global.Store.setUserId(user.sub);
    if (global.PTCloud && global.PTCloud.setUser) {
      global.PTCloud.setUser(user);
      document.body.classList.add('pt-cloud-syncing');
      try { await global.PTCloud.syncOnLogin(); } catch (e) { console.warn('[PTCloud]', e); }
      document.body.classList.remove('pt-cloud-syncing');
    }
    setAppVisible(true);
    renderAccountMenu(user);
    startAppIfNeeded();
    global.dispatchEvent(new CustomEvent('pt-auth-ready', { detail: user }));
  }

  function setupGsiButton() {
    const touch = global.matchMedia('(max-width: 768px)').matches ||
      ('ontouchstart' in global) || (navigator.maxTouchPoints > 0);
    if (touch) return;
    const cfg = global.PT_GOOGLE || {};
    if (!cfg.clientId || cfg.clientId.indexOf('TU_CLIENT_ID') >= 0) return;
    if (!global.google || !global.google.accounts || !global.google.accounts.id) return;

    const host = $('#google-signin-btn');
    if (!host) return;
    host.classList.remove('hidden');

    global.google.accounts.id.initialize({
      client_id: cfg.clientId,
      callback: function (response) {
        if (!response || !response.credential) return;
        try {
          const payload = decodeGsiCredential(response.credential);
          if (!payload) return;
          const user = normalizeUser({
            sub: payload.sub, email: payload.email,
            name: payload.name || payload.email, picture: payload.picture || '',
            emailVerified: !!payload.email_verified, locale: payload.locale || '',
            loginAt: Date.now()
          });
          localStorage.setItem(SESSION_KEY, JSON.stringify(user));
          enterApp(user);
        } catch (e) { console.warn('[PTAuth]', e); }
      },
      ux_mode: 'popup',
      use_fedcm_for_prompt: false
    });

    host.innerHTML = '';
    try {
      global.google.accounts.id.renderButton(host, {
        type: 'standard', theme: 'filled_blue', size: 'large',
        text: 'signin_with', width: Math.min(320, Math.max(240, host.offsetWidth || 280))
      });
    } catch (e) { /* noop */ }
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
    try { sessionStorage.removeItem('pt_oauth_nonce'); } catch (e) { /* noop */ }
    currentUser = null;
    global.PT_AUTH_USER = null;
    if (global.PTCloud && global.PTCloud.setUser) global.PTCloud.setUser(null);
    appStarted = false;
    if (global.PT_retryLogin) global.PT_retryLogin();
    else location.reload();
  }

  function requireAuth(onReady) {
    appReadyCallback = onReady;
    const user = loadSession();
    if (user) enterApp(user);
    else {
      setAppVisible(false);
      if (global.PT_startGoogleLogin) {
        const mobileBtn = $('#auth-mobile-login');
        if (mobileBtn) mobileBtn.classList.remove('hidden');
      }
    }
  }

  function bindUi() {
    document.addEventListener('click', function () {
      if (window.matchMedia('(max-width: 680px)').matches) return;
      const dropdown = $('#account-dropdown');
      const trigger = $('#account-trigger');
      if (dropdown) dropdown.classList.add('hidden');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
    const menu = $('#account-menu');
    if (menu) menu.addEventListener('click', function (e) { e.stopPropagation(); });

    global.addEventListener('pt-auth-bootstrap', function (e) {
      enterApp(e.detail);
    });

    global.addEventListener('pt-cloud-status', function () {
      if (currentUser) renderAccountMenu(currentUser);
    });

    let gsiAttempts = 0;
    function waitGsi() {
      if (global.google && global.google.accounts && global.google.accounts.id) {
        setupGsiButton();
        return;
      }
      if (gsiAttempts++ < 80) setTimeout(waitGsi, 100);
    }
    waitGsi();
  }

  global.PTAuth = {
    getUser: function () { return currentUser; },
    isAuthenticated: function () { return !!currentUser; },
    requireAuth: requireAuth,
    signOut: signOut,
    startLogin: function () { if (global.PT_startGoogleLogin) global.PT_startGoogleLogin(); }
  };

  bindUi();
})(window);
