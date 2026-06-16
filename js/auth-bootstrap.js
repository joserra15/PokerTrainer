/*
 * auth-bootstrap.js — Login mínimo que carga al instante (antes del motor GTO).
 * En móvil los scripts tardan; sin esto los botones no responden.
 */
(function (global) {
  'use strict';

  var SESSION_KEY = 'pt_auth_v1';

  function $(id) { return document.getElementById(id); }

  function decodeJwtPayloadJson(b64url) {
    var base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    var binary = atob(base64);
    if (global.TextDecoder) {
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new TextDecoder('utf-8').decode(bytes);
    }
    return decodeURIComponent(escape(binary));
  }

  function decodeJwt(token) {
    try {
      return JSON.parse(decodeJwtPayloadJson(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  }

  /** Repara nombres guardados con atob() sin UTF-8 (p. ej. JosÃ© → José). */
  function fixUtf8Text(str) {
    if (!str || typeof str !== 'string') return str;
    if (str.indexOf('\u00C3') < 0 && str.indexOf('\u00C2') < 0) return str;
    try {
      return decodeURIComponent(escape(str));
    } catch (e) {
      return str;
    }
  }

  function normalizeUser(user) {
    if (!user) return user;
    if (user.name) user.name = fixUtf8Text(user.name);
    return user;
  }

  function redirectUri() {
    var origin = location.origin;
    var path = location.pathname || '/';
    if (/index\.html$/i.test(path)) return origin + path.replace(/index\.html$/i, '');
    if (path.charAt(path.length - 1) === '/') return origin + path;
    return origin + path + '/';
  }

  function showError(msg) {
    var el = $('auth-error');
    if (el) el.textContent = msg || '';
  }

  function saveSessionFromPayload(payload) {
    var user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || '',
      emailVerified: !!payload.email_verified,
      locale: payload.locale || '',
      loginAt: Date.now()
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch (e) {
      showError('No se pudo guardar la sesión (¿modo privado?).');
      return null;
    }
    return user;
  }

  function enterFromBootstrap(user) {
    var shell = $('app-shell');
    var gate = $('auth-gate');
    if (shell) shell.classList.remove('hidden');
    if (gate) gate.classList.add('hidden');
    document.body.classList.remove('auth-locked');
    global.PT_AUTH_USER = user;
    global.dispatchEvent(new CustomEvent('pt-auth-bootstrap', { detail: user }));
  }

  function processHashLogin() {
    var hash = location.hash;
    if (!hash || hash.indexOf('id_token=') < 0) return false;

    var params = new URLSearchParams(hash.charAt(0) === '#' ? hash.slice(1) : hash);
    var idToken = params.get('id_token');
    var err = params.get('error');
    history.replaceState(null, '', location.pathname + location.search);

    if (err) {
      showError('Google: ' + (params.get('error_description') || err));
      return true;
    }
    if (!idToken) return false;

    var payload = decodeJwt(idToken);
    if (!payload || !payload.sub || !payload.email) {
      showError('Token de Google inválido.');
      return true;
    }

    var nonceOk = true;
    try {
      var expected = sessionStorage.getItem('pt_oauth_nonce');
      if (expected && payload.nonce && payload.nonce !== expected) nonceOk = false;
      sessionStorage.removeItem('pt_oauth_nonce');
    } catch (e) { /* noop */ }

    if (!nonceOk) {
      showError('Error de seguridad. Reintenta el login.');
      return true;
    }

    var user = saveSessionFromPayload(payload);
    if (user) enterFromBootstrap(normalizeUser(user));
    return true;
  }

  function loadSavedSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.sub || !data.email) return null;
      data = normalizeUser(data);
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch (e) { /* noop */ }
      return data;
    } catch (e) {
      return null;
    }
  }

  function startGoogleLogin() {
    var cfg = global.PT_GOOGLE || {};
    if (!cfg.clientId || cfg.clientId.indexOf('TU_CLIENT_ID') >= 0) {
      showError('Falta configurar js/google-config.js');
      return;
    }
    if (location.protocol === 'file:') {
      showError('No funciona con file://. Usa GitHub Pages o localhost.');
      return;
    }
    showError('');
    var nonce = (global.crypto && global.crypto.randomUUID)
      ? global.crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(36).slice(2);
    try { sessionStorage.setItem('pt_oauth_nonce', nonce); } catch (e) { /* noop */ }

    var uri = redirectUri();
    var q = [
      'client_id=' + encodeURIComponent(cfg.clientId),
      'redirect_uri=' + encodeURIComponent(uri),
      'response_type=id_token',
      'scope=' + encodeURIComponent('openid email profile'),
      'nonce=' + encodeURIComponent(nonce),
      'prompt=select_account'
    ].join('&');
    location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + q);
  }

  function retryLogin() {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem('pt_oauth_nonce');
    } catch (e) { /* noop */ }
    location.reload();
  }

  function isTouchUi() {
    return global.matchMedia('(max-width: 768px)').matches ||
      ('ontouchstart' in global) ||
      (navigator.maxTouchPoints > 0) ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  }

  function setupLoginUi() {
    var mobileBtn = $('auth-mobile-login');
    var gsiHost = $('google-signin-btn');
    var retryBtn = $('auth-retry-login');
    var help = $('auth-origin-help');

    if (mobileBtn) {
      mobileBtn.classList.remove('hidden');
      mobileBtn.addEventListener('click', function (e) {
        e.preventDefault();
        startGoogleLogin();
      });
    }
    if (retryBtn) {
      retryBtn.addEventListener('click', function (e) {
        e.preventDefault();
        retryLogin();
      });
    }
    if (isTouchUi()) {
      if (gsiHost) gsiHost.classList.add('hidden');
    }
    if (help && location.protocol !== 'file:') {
      help.innerHTML = '<p class="muted-text">URI de redirección registrada en Google:<br><code class="auth-copy">' +
        redirectUri() + '</code></p>';
    }
  }

  function boot() {
    if (processHashLogin()) return;
    var saved = loadSavedSession();
    if (saved) {
      global.PT_AUTH_USER = normalizeUser(saved);
      enterFromBootstrap(global.PT_AUTH_USER);
      return;
    }
    setupLoginUi();
  }

  global.PT_startGoogleLogin = startGoogleLogin;
  global.PT_retryLogin = retryLogin;
  global.PT_redirectUri = redirectUri;
  global.PT_decodeJwt = decodeJwt;
  global.PT_fixUtf8Text = fixUtf8Text;
  global.PT_normalizeUser = normalizeUser;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
