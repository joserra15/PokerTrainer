/*
 * auth-bootstrap.js — Login (Supabase Auth + Google) con fallback legacy.
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

  function useSupabaseAuth() {
    return global.PTSupabase && global.PTSupabase.useAuth && global.PTSupabase.useAuth();
  }

  function waitFor(cond, maxTries, delayMs) {
    return new Promise(function (resolve) {
      var n = 0;
      function tick() {
        if (cond()) return resolve(true);
        if (++n >= maxTries) return resolve(false);
        setTimeout(tick, delayMs || 50);
      }
      tick();
    });
  }

  function saveLegacySession(user) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (e) { /* noop */ }
  }

  function migrateLocalData(user) {
    if (!user || !global.Store || !global.Store.migrateLocalUserKeys) return;
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      var old = JSON.parse(raw);
      if (old && old.sub && old.sub !== user.sub && old.authProvider !== 'supabase') {
        global.Store.migrateLocalUserKeys(old.sub, user.sub);
      }
      if (user.googleSub && user.googleSub !== user.sub) {
        global.Store.migrateLocalUserKeys(user.googleSub, user.sub);
      }
    } catch (e) { /* noop */ }
  }

  async function enterFromBootstrap(user) {
    user = normalizeUser(user);
    if (global.PTAgeGate && global.PTAgeGate.ensureConfirmed) {
      var ageOk = await global.PTAgeGate.ensureConfirmed(user);
      if (!ageOk) {
        retryLogin();
        return;
      }
    }
    var shell = $('app-shell');
    var gate = $('auth-gate');
    if (shell) {
      shell.classList.remove('hidden');
      shell.setAttribute('aria-hidden', 'false');
    }
    if (gate) {
      gate.classList.add('hidden');
      gate.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('auth-locked');
    global.PT_AUTH_USER = user;
    saveLegacySession(user);
    migrateLocalData(user);
    global.dispatchEvent(new CustomEvent('pt-auth-bootstrap', { detail: user }));
    trackAuthFlow(user);
  }

  // Distingue alta real (primera vez que vemos este usuario) de login recurrente,
  // para que "register" no se dispare en cada restauración de sesión.
  var REGISTERED_KEY = 'pt_registered_v1';
  function trackAuthFlow(user) {
    var A = global.PTAnalytics;
    if (!A) return;
    var provider = (user && user.authProvider) || 'google';
    var isNew = false;
    try {
      var raw = localStorage.getItem(REGISTERED_KEY);
      var seen = raw ? JSON.parse(raw) : {};
      if (user && user.sub && !seen[user.sub]) {
        isNew = true;
        seen[user.sub] = Date.now();
        localStorage.setItem(REGISTERED_KEY, JSON.stringify(seen));
      }
    } catch (e) { /* noop */ }
    if (isNew && A.trackRegister) A.trackRegister(provider);
    else if (A.trackLogin) A.trackLogin(provider);
  }

  function saveSessionFromPayload(payload) {
    var user = {
      sub: payload.sub,
      googleSub: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || '',
      emailVerified: !!payload.email_verified,
      locale: payload.locale || '',
      loginAt: Date.now(),
      authProvider: 'google_legacy'
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch (e) {
      showError('No se pudo guardar la sesión (¿modo privado?).');
      return null;
    }
    return user;
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
      return data;
    } catch (e) {
      return null;
    }
  }

  async function startSupabaseLogin() {
    if (location.protocol === 'file:') {
      showError('No funciona con file://. Usa GitHub Pages o localhost.');
      return;
    }
    showError('');
    // En portátil el panel derecho es clickable al instante; no fallar si el
    // CDN de Supabase aún está cargando (getSession del boot puede retrasarse).
    var ready = await waitFor(function () {
      return !!(global.supabase && global.PTSupabase && global.PTSupabase.getClient());
    }, 100, 50);
    var client = ready && global.PTSupabase.getClient();
    if (!client) {
      showError('Supabase no está listo. Recarga la página.');
      return;
    }
    var redirectTo = redirectUri();
    var errRes = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: { prompt: 'select_account' }
      }
    });
    if (errRes.error) {
      showError(errRes.error.message || 'Error al iniciar sesión');
    }
  }

  function startGoogleLogin() {
    if (useSupabaseAuth()) {
      startSupabaseLogin();
      return;
    }
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
    if (useSupabaseAuth() && global.PTSupabase) {
      var client = global.PTSupabase.getClient();
      if (client) client.auth.signOut().finally(function () { location.reload(); });
      else location.reload();
      return;
    }
    location.reload();
  }

  function isTouchUi() {
    return global.matchMedia('(max-width: 768px)').matches ||
      ('ontouchstart' in global) ||
      (navigator.maxTouchPoints > 0) ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  }

  var loginUiBound = false;

  function applyLoginVisibility() {
    var mobileBtn = $('auth-mobile-login');
    var gsiHost = $('google-signin-btn');
    if (mobileBtn) mobileBtn.classList.remove('hidden');
    // Con Supabase Auth el CTA propio (redirect) es el único fiable en desktop;
    // el popup GSI se bloquea o queda inerte en muchos portátiles.
    if (useSupabaseAuth() || isTouchUi()) {
      if (gsiHost) gsiHost.classList.add('hidden');
    }
  }

  function setupLoginUi() {
    applyLoginVisibility();
    if (loginUiBound) return;
    loginUiBound = true;

    // Delegación: el botón del panel derecho existe en el HTML antes de que
    // termine getSession()/CDN; sin esto el click en portátil no hace nada.
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var btn = t.closest('#auth-mobile-login');
      if (!btn) return;
      e.preventDefault();
      startGoogleLogin();
    });
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error('timeout'));
      }, ms);
      promise.then(function (v) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(v);
      }, function (err) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  function showOAuthCallbackError() {
    try {
      var params = new URLSearchParams(location.search || '');
      var hash = location.hash || '';
      if (hash.charAt(0) === '#') {
        var hp = new URLSearchParams(hash.slice(1));
        hp.forEach(function (v, k) { if (!params.has(k)) params.set(k, v); });
      }
      var err = params.get('error') || params.get('error_code');
      if (!err) return false;
      var desc = params.get('error_description') || err;
      try { desc = decodeURIComponent(String(desc).replace(/\+/g, ' ')); } catch (e) { /* noop */ }
      showError('Google/Supabase: ' + desc);
      history.replaceState(null, '', location.pathname);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function bootSupabase() {
    // Enlazar Continuar YA: no esperar a getSession (puede colgarse o tardar).
    setupLoginUi();
    showOAuthCallbackError();
    var ok = await waitFor(function () {
      return global.supabase && global.PTSupabase && global.PTSupabase.getClient();
    }, 120, 50);
    if (!ok) {
      legacyBoot();
      return;
    }
    var client = global.PTSupabase.getClient();
    try {
      client.auth.onAuthStateChange(function (event, sess) {
        if (sess && sess.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
          var u = global.PTSupabase.userFromSession(sess);
          if (u) enterFromBootstrap(u);
        }
      });
    } catch (e2) { /* noop */ }
    try {
      var sessionRes = await withTimeout(client.auth.getSession(), 8000);
      var session = sessionRes && sessionRes.data && sessionRes.data.session;
      if (session && session.user) {
        var user = global.PTSupabase.userFromSession(session);
        if (user) {
          enterFromBootstrap(user);
          return;
        }
      }
    } catch (e) {
      // UI de login ya está activa; el usuario puede pulsar Continuar.
      // Reintento corto por si el exchange PKCE aún no terminó.
      try {
        var retry = await withTimeout(client.auth.getSession(), 4000);
        var sess2 = retry && retry.data && retry.data.session;
        if (sess2 && sess2.user) {
          var u2 = global.PTSupabase.userFromSession(sess2);
          if (u2) {
            enterFromBootstrap(u2);
            return;
          }
        }
      } catch (e3) { /* noop */ }
    }
    setupLoginUi();
  }

  function legacyBoot() {
    setupLoginUi();
    if (processHashLogin()) return;
    var saved = loadSavedSession();
    if (saved && saved.authProvider !== 'supabase') {
      enterFromBootstrap(saved);
      return;
    }
  }

  async function boot() {
    // Siempre enlazar el CTA de login antes de cualquier await.
    setupLoginUi();
    if (global.PT_E2E_MODE) {
      var e2eUser = loadSavedSession();
      if (e2eUser) {
        enterFromBootstrap(e2eUser);
        return;
      }
      return;
    }
    if (useSupabaseAuth()) {
      await bootSupabase();
      return;
    }
    legacyBoot();
  }

  global.PT_startGoogleLogin = startGoogleLogin;
  global.PT_retryLogin = retryLogin;
  global.PT_redirectUri = redirectUri;
  global.PT_decodeJwt = decodeJwt;
  global.PT_fixUtf8Text = fixUtf8Text;
  global.PT_normalizeUser = normalizeUser;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { boot(); });
  } else {
    boot();
  }
})(window);
