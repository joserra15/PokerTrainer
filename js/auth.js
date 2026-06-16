/*
 * auth.js — Login con Google (GIS) y menú de cuenta.
 * Bloquea la app hasta autenticación; persiste sesión por usuario (sub).
 */
(function (global) {
  'use strict';

  const SESSION_KEY = 'pt_auth_v1';
  const SESSION_MAX_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

  let currentUser = null;
  let appReadyCallback = null;
  let gsiReady = false;

  function $(sel) { return document.querySelector(sel); }

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
      if (!data || !data.sub || !data.email) return null;
      if (Date.now() - (data.loginAt || 0) > SESSION_MAX_MS) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return data;
    } catch (e) {
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
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    currentUser = user;
    return user;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
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

  function enterApp(user) {
    currentUser = user;
    if (global.Store && global.Store.setUserId) global.Store.setUserId(user.sub);
    setAppVisible(true);
    renderAccountMenu(user);
    if (typeof appReadyCallback === 'function') {
      const cb = appReadyCallback;
      appReadyCallback = null;
      cb();
    }
    global.dispatchEvent(new CustomEvent('pt-auth-ready', { detail: user }));
  }

  function handleCredentialResponse(response) {
    const payload = decodeJwt(response.credential);
    if (!payload || !payload.sub || !payload.email) {
      showAuthError('No se pudo leer la respuesta de Google. Inténtalo de nuevo.');
      return;
    }
    const errEl = $('#auth-error');
    if (errEl) errEl.textContent = '';
    enterApp(saveSession(payload));
  }

  function pageOrigin() {
    return location.protocol + '//' + location.host;
  }

  function loginRedirectUri() {
    const base = pageOrigin() + location.pathname.replace(/\/[^/]*$/, '/');
    return base.endsWith('/') ? base : base + '/';
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
    const origin = pageOrigin();
    const redirect = loginRedirectUri();
    el.innerHTML =
      '<p class="auth-hint-title">Si ves <em>Error 400: invalid_request</em>, revisa en Google Cloud Console → Credenciales → tu cliente <strong>Web</strong>:</p>' +
      '<ol class="auth-checklist">' +
      '<li><strong>Orígenes JavaScript autorizados</strong> (sin ruta):<br><code class="auth-copy">' + escapeHtml(origin) + '</code></li>' +
      '<li><strong>URIs de redirección autorizados</strong>:<br><code class="auth-copy">' + escapeHtml(redirect) + '</code></li>' +
      '<li><strong>Pantalla de consentimiento</strong> → Usuarios de prueba: añade <code>' + escapeHtml('tu@gmail.com') + '</code> si la app está en modo <em>Prueba</em>.</li>' +
      '</ol>' +
      '<p class="muted-text">En Brave/Chrome con bloqueadores, prueba desactivar el escudo para este sitio.</p>';
  }

  function showAuthError(msg) {
    const errEl = $('#auth-error');
    if (errEl) errEl.textContent = msg;
  }

  function handleAuthError(error) {
    console.warn('[PTAuth]', error);
    if (error && error.type === 'popup_failed_to_open') {
      showAuthError('El navegador bloqueó la ventana de Google. Permite ventanas emergentes o desactiva el escudo (Brave).');
      return;
    }
    if (error && error.type === 'popup_closed') return;
    showAuthError('Error de autorización de Google. Revisa la configuración OAuth indicada abajo (Error 400 suele ser origen mal registrado).');
  }

  function showSetupInstructions() {
    const btnHost = $('#google-signin-btn');
    const setup = $('#auth-setup');
    if (btnHost) btnHost.innerHTML = '';
    if (setup) setup.classList.remove('hidden');
  }

  function initGoogleButton() {
    renderOriginHelp();
    if (!isSecureContext()) {
      showAuthError('Abre la app por HTTPS o http://localhost, no como archivo local.');
      return;
    }
    if (!isConfigured()) {
      showSetupInstructions();
      return;
    }
    if (!global.google || !global.google.accounts || !global.google.accounts.id) {
      showAuthError('No se pudo cargar Google Sign-In. Comprueba tu conexión.');
      return;
    }
    const setup = $('#auth-setup');
    if (setup) setup.classList.add('hidden');

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

    const host = $('#google-signin-btn');
    if (host) {
      host.innerHTML = '';
      global.google.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'filled_blue',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: Math.min(320, Math.max(240, host.offsetWidth || 280))
      });
    }
    gsiReady = true;
  }

  function waitForGsi(cb, attempts) {
    attempts = attempts || 0;
    if (global.google && global.google.accounts && global.google.accounts.id) {
      cb();
      return;
    }
    if (attempts > 80) {
      showAuthError('Google Sign-In no disponible. Recarga la página.');
      return;
    }
    setTimeout(function () { waitForGsi(cb, attempts + 1); }, 100);
  }

  function showLoginGate() {
    setAppVisible(false);
    waitForGsi(initGoogleButton);
  }

  function signOut() {
    clearSession();
    closeAccountDropdown();
    if (global.google && global.google.accounts && global.google.accounts.id) {
      try { global.google.accounts.id.disableAutoSelect(); } catch (e) { /* noop */ }
    }
    location.reload();
  }

  function requireAuth(onReady) {
    appReadyCallback = onReady;
    const saved = loadSession();
    if (saved) {
      enterApp(saved);
    } else {
      showLoginGate();
    }
  }

  function bindGlobalUi() {
    document.addEventListener('click', function () {
      closeAccountDropdown();
    });
    const menu = $('#account-menu');
    if (menu) {
      menu.addEventListener('click', function (e) { e.stopPropagation(); });
    }
  }

  function bootAuthUi() {
    bindGlobalUi();
  }

  global.PTAuth = {
    getUser: function () { return currentUser; },
    isAuthenticated: function () { return !!currentUser; },
    requireAuth: requireAuth,
    signOut: signOut,
    isConfigured: isConfigured
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAuthUi);
  } else {
    bootAuthUi();
  }
})(window);
