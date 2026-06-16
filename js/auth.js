/*
 * auth.js — Login con Google (GIS) y menú de cuenta.
 * Bloquea la app hasta autenticación; persiste sesión por usuario (sub).
 * Móvil: flujo redirect con id_token (GitHub Pages no recibe POST de GIS).
 */
(function (global) {
  'use strict';

  const SESSION_KEY = 'pt_auth_v1';
  const SESSION_MAX_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

  let currentUser = null;
  let appReadyCallback = null;
  let gsiConfigured = false;
  let bootDone = false;
  let pendingRequireAuth = null;
  let appStarted = false;

  function $(sel) { return document.querySelector(sel); }

  function isMobileDevice() {
    return window.matchMedia('(max-width: 768px)').matches ||
      /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(navigator.userAgent || '');
  }

  function decodeJwt(token) {
    try {
      const payload = token.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.sub || !data.email) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      if (Date.now() - (data.loginAt || 0) > SESSION_MAX_MS) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return data;
    } catch (e) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function saveSession(profile) {
    const user = {
      sub: profile.sub,
      email: profile.email,
      name: profile.name || profile.email,
      picture: profile.picture || '',
      emailVerified: !!profile.email_verified,
      locale: profile.locale || '',
      loginAt: Date.now()
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('[PTAuth] No se pudo guardar sesión', e);
      showAuthError('No se pudo guardar la sesión. Desactiva modo privado o libera espacio.');
      return null;
    }
    currentUser = user;
    return user;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    try { sessionStorage.removeItem('pt_oauth_nonce'); } catch (e) { /* noop */ }
    currentUser = null;
  }

  function isConfigured() {
    const cfg = global.PT_GOOGLE || {};
    return cfg.clientId && cfg.clientId.indexOf('TU_CLIENT_ID') === -1;
  }

  function setAppVisible(visible) {
    const shell = $('#app-shell');
    const gate = $('#auth-gate');
    if (shell) shell.classList.toggle('hidden', !visible);
    if (gate) gate.classList.toggle('hidden', visible);
    document.body.classList.toggle('auth-locked', !visible);
  }

  function renderAccountMenu(user) {
    const trigger = $('#account-trigger');
    const dropdown = $('#account-dropdown');
    if (!trigger || !user) return;

    const avatar = $('#account-avatar');
    const avatarLg = $('#account-avatar-lg');
    const nameEl = $('#account-name');
    const emailEl = $('#account-email');
    const shortEl = $('#account-email-short');
    const metaEl = $('#account-meta');

    const shortEmail = user.email.length > 22 ? user.email.slice(0, 20) + '…' : user.email;

    if (avatar) {
      avatar.src = user.picture || '';
      avatar.alt = user.name;
      avatar.hidden = !user.picture;
    }
    if (avatarLg) {
      avatarLg.src = user.picture || '';
      avatarLg.alt = user.name;
      avatarLg.hidden = !user.picture;
    }
    if (nameEl) nameEl.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;
    if (shortEl) shortEl.textContent = shortEmail;

    if (metaEl) {
      const rows = [];
      rows.push('<div class="account-row"><span>Correo</span><strong>' + escapeHtml(user.email) + '</strong></div>');
      if (user.emailVerified) rows.push('<div class="account-row"><span>Verificado</span><strong>Sí</strong></div>');
      if (user.locale) rows.push('<div class="account-row"><span>Idioma</span><strong>' + escapeHtml(user.locale) + '</strong></div>');
      rows.push('<div class="account-row"><span>ID</span><code>' + escapeHtml(user.sub.slice(0, 12)) + '…</code></div>');
      metaEl.innerHTML = rows.join('');
    }

    trigger.onclick = function (e) {
      e.stopPropagation();
      const open = dropdown.classList.toggle('hidden');
      trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
    };

    $('#account-signout').onclick = function () {
      signOut();
    };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function closeAccountDropdown() {
    const dropdown = $('#account-dropdown');
    const trigger = $('#account-trigger');
    if (dropdown) dropdown.classList.add('hidden');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
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

  function enterApp(user) {
    if (!user) return;
    currentUser = user;
    if (global.Store && global.Store.setUserId) global.Store.setUserId(user.sub);
    setAppVisible(true);
    renderAccountMenu(user);
    startAppIfNeeded();
    global.dispatchEvent(new CustomEvent('pt-auth-ready', { detail: user }));
  }

  function handleCredentialResponse(response) {
    if (!response || !response.credential) {
      showAuthError('Respuesta de Google vacía. Pulsa «Reintentar».');
      return;
    }
    const payload = decodeJwt(response.credential);
    if (!payload || !payload.sub || !payload.email) {
      showAuthError('No se pudo leer la respuesta de Google. Inténtalo de nuevo.');
      return;
    }
    const errEl = $('#auth-error');
    if (errEl) errEl.textContent = '';
    const user = saveSession(payload);
    if (user) enterApp(user);
  }

  function pageOrigin() {
    return location.protocol + '//' + location.host;
  }

  function loginRedirectUri() {
    const path = location.pathname || '/';
    const dir = path.endsWith('/') ? path : path.replace(/\/[^/]*$/, '/');
    return pageOrigin() + dir;
  }

  function isSecureContext() {
    return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }

  function renderOriginHelp() {
    const el = $('#auth-origin-help');
    if (!el) return;
    if (!isSecureContext()) {
      el.innerHTML = '<p class="auth-warn"><strong>No se puede usar login desde <code>file://</code>.</strong> Abre la app desde GitHub Pages o un servidor local (<code>http://localhost</code>).</p>';
      return;
    }
    if (isMobileDevice()) {
      el.innerHTML = '<p class="muted-text">En móvil se usa inicio de sesión por redirección. Si falla, pulsa «Reintentar».</p>';
      return;
    }
    const origin = pageOrigin();
    const redirect = loginRedirectUri();
    el.innerHTML =
      '<p class="auth-hint-title">Si ves <em>Error 400: invalid_request</em>, revisa en Google Cloud Console → Credenciales → tu cliente <strong>Web</strong>:</p>' +
      '<ol class="auth-checklist">' +
      '<li><strong>Orígenes JavaScript autorizados</strong> (sin ruta):<br><code class="auth-copy">' + escapeHtml(origin) + '</code></li>' +
      '<li><strong>URIs de redirección autorizados</strong>:<br><code class="auth-copy">' + escapeHtml(redirect) + '</code></li>' +
      '</ol>';
  }

  function showAuthError(msg) {
    const errEl = $('#auth-error');
    if (errEl) errEl.textContent = msg;
  }

  function handleAuthError(error) {
    console.warn('[PTAuth]', error);
    if (error && error.type === 'popup_closed') return;
    if (error && error.type === 'popup_failed_to_open') {
      showAuthError('Ventana bloqueada. En móvil usa el botón azul «Continuar con Google».');
      return;
    }
    showAuthError('Error de autorización. Pulsa «Reintentar» o revisa la configuración OAuth.');
  }

  function showSetupInstructions() {
    const btnHost = $('#google-signin-btn');
    const mobileBtn = $('#auth-mobile-login');
    const setup = $('#auth-setup');
    if (btnHost) btnHost.innerHTML = '';
    if (mobileBtn) mobileBtn.classList.add('hidden');
    if (setup) setup.classList.remove('hidden');
  }

  function setupGsi() {
    if (gsiConfigured || !isConfigured()) return false;
    if (!global.google || !global.google.accounts || !global.google.accounts.id) return false;
    gsiConfigured = true;

    global.google.accounts.id.initialize({
      client_id: global.PT_GOOGLE.clientId,
      callback: handleCredentialResponse,
      error_callback: handleAuthError,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      ux_mode: 'popup',
      itp_support: true,
      use_fedcm_for_prompt: false
    });
    return true;
  }

  function renderGsiButton() {
    const host = $('#google-signin-btn');
    if (!host || !gsiConfigured) return;
    host.innerHTML = '';
    const w = host.offsetWidth || Math.min(320, window.innerWidth - 56);
    try {
      global.google.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'filled_blue',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: Math.max(200, Math.min(320, w))
      });
    } catch (e) {
      console.warn('[PTAuth] renderButton failed', e);
    }
  }

  function startMobileIdTokenLogin() {
    if (!isConfigured()) return;
    const nonce = (global.crypto && global.crypto.randomUUID)
      ? global.crypto.randomUUID()
      : (Date.now().toString(36) + Math.random().toString(36).slice(2));
    try { sessionStorage.setItem('pt_oauth_nonce', nonce); } catch (e) { /* noop */ }
    const params = new URLSearchParams({
      client_id: global.PT_GOOGLE.clientId,
      redirect_uri: loginRedirectUri(),
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce: nonce,
      prompt: 'select_account'
    });
    location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
  }

  function handleIdTokenReturn() {
    const hash = location.hash;
    if (!hash || hash.indexOf('id_token=') < 0) return false;

    const params = new URLSearchParams(hash.charAt(0) === '#' ? hash.slice(1) : hash);
    const idToken = params.get('id_token');
    const err = params.get('error');
    history.replaceState(null, '', location.pathname + location.search);

    if (err) {
      showAuthError('Google: ' + (params.get('error_description') || err));
      return true;
    }
    if (!idToken) return false;

    const payload = decodeJwt(idToken);
    if (!payload || !payload.sub || !payload.email) {
      showAuthError('Token de Google inválido. Reintenta el login.');
      return true;
    }

    let nonceOk = true;
    try {
      const expected = sessionStorage.getItem('pt_oauth_nonce');
      if (expected && payload.nonce && payload.nonce !== expected) nonceOk = false;
      sessionStorage.removeItem('pt_oauth_nonce');
    } catch (e) { /* noop */ }

    if (!nonceOk) {
      showAuthError('Error de seguridad en el login. Reintenta.');
      return true;
    }

    const user = saveSession(payload);
    if (user) enterApp(user);
    return true;
  }

  function bindLoginButtons() {
    const mobileBtn = $('#auth-mobile-login');
    const retryBtn = $('#auth-retry-login');
    if (mobileBtn) {
      mobileBtn.onclick = function () {
        showAuthError('');
        startMobileIdTokenLogin();
      };
    }
    if (retryBtn) {
      retryBtn.onclick = function () {
        showAuthError('');
        clearSession();
        showLoginGate();
      };
    }
  }

  function initLoginUi() {
    renderOriginHelp();
    if (!isSecureContext()) {
      showAuthError('Abre la app por HTTPS o http://localhost, no como archivo local.');
      return;
    }
    if (!isConfigured()) {
      showSetupInstructions();
      return;
    }

    const setup = $('#auth-setup');
    if (setup) setup.classList.add('hidden');

    const mobileBtn = $('#auth-mobile-login');
    const host = $('#google-signin-btn');

    if (isMobileDevice()) {
      if (host) host.classList.add('hidden');
      if (mobileBtn) mobileBtn.classList.remove('hidden');
    } else {
      if (host) host.classList.remove('hidden');
      if (mobileBtn) mobileBtn.classList.add('hidden');
      setupGsi();
      renderGsiButton();
    }
  }

  function waitForGsi(cb, attempts) {
    attempts = attempts || 0;
    if (!isConfigured() || isMobileDevice()) {
      cb();
      return;
    }
    if (global.google && global.google.accounts && global.google.accounts.id) {
      cb();
      return;
    }
    if (attempts > 100) {
      showAuthError('Google Sign-In no disponible. Pulsa «Reintentar».');
      cb();
      return;
    }
    setTimeout(function () { waitForGsi(cb, attempts + 1); }, 100);
  }

  function showLoginGate() {
    setAppVisible(false);
    waitForGsi(function () {
      if (!isMobileDevice()) setupGsi();
      initLoginUi();
    });
  }

  function finishRequireAuth() {
    if (currentUser) {
      startAppIfNeeded();
      return;
    }
    const saved = loadSession();
    if (saved) {
      enterApp(saved);
      return;
    }
    showLoginGate();
  }

  function signOut() {
    clearSession();
    closeAccountDropdown();
    appStarted = false;
    if (global.google && global.google.accounts && global.google.accounts.id) {
      try { global.google.accounts.id.disableAutoSelect(); } catch (e) { /* noop */ }
    }
    location.href = location.pathname + location.search;
  }

  function requireAuth(onReady) {
    appReadyCallback = onReady;
    if (bootDone) finishRequireAuth();
    else pendingRequireAuth = finishRequireAuth;
  }

  function bootAuth() {
    bindGlobalUi();
    bindLoginButtons();

    if (handleIdTokenReturn()) {
      bootDone = true;
      if (pendingRequireAuth) pendingRequireAuth();
      return;
    }

    waitForGsi(function () {
      setupGsi();
      bootDone = true;
      if (pendingRequireAuth) pendingRequireAuth();
    });
  }

  global.PTAuth = {
    getUser: function () { return currentUser; },
    isAuthenticated: function () { return !!currentUser; },
    requireAuth: requireAuth,
    signOut: signOut,
    isConfigured: isConfigured
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAuth);
  } else {
    bootAuth();
  }
})(window);
