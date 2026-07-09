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
    document.body.classList.toggle('landing-scrollable', !visible);
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

  function isMobileNav() {
    return window.matchMedia('(max-width: 680px)').matches;
  }

  function closeAccountDropdown() {
    const dropdown = $('#account-dropdown');
    const trigger = $('#account-trigger');
    if (dropdown) dropdown.classList.add('hidden');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
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

    if (global.PTAdmin && global.PTAdmin.setAdminVisible) {
      var demoOn = global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive();
      global.PTAdmin.setAdminVisible(!!user.isAdmin && !demoOn);
    }
    var demoOn = global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive();
    var adminMenuBtn = $('#account-admin');
    if (adminMenuBtn) {
      adminMenuBtn.classList.toggle('hidden', !user.isAdmin || demoOn);
    }

    trigger.onclick = function (e) {
      e.stopPropagation();
      if (window.matchMedia('(max-width: 680px)').matches) return;
      const dropdown = $('#account-dropdown');
      if (!dropdown) return;
      const open = dropdown.classList.toggle('hidden');
      trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
    };

    const settingsBtn = $('#account-settings');
    if (settingsBtn) {
      settingsBtn.onclick = function () {
        closeAccountDropdown();
        if (global.goToTab) global.goToTab('account');
      };
    }

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

    const adminBtn = $('#account-admin');
    if (adminBtn) {
      adminBtn.onclick = function () {
        closeAccountDropdown();
        if (global.goToTab) global.goToTab('admin');
      };
    }
  }

  function downloadJson(filename, jsonStr) {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAccountData() {
    if (!currentUser || !global.Store || !global.Store.exportFullUserData) return;
    const data = global.Store.exportFullUserData(currentUser);
    const date = new Date().toISOString().slice(0, 10);
    downloadJson('pokerforgeai-export-' + date + '.json', data);
  }

  async function deleteAccount() {
    if (!currentUser) return;
    const email = currentUser.email;
    const typed = prompt(
      'Eliminación irreversible de cuenta y datos.\n\n' +
      'Se borrarán datos en la nube (si aplica), localStorage de este navegador y caché IA.\n\n' +
      'Escribe tu correo para confirmar:\n' + email
    );
    if (typed !== email) {
      if (typed !== null) alert('El correo no coincide. Operación cancelada.');
      return;
    }
    if (!confirm('¿Confirmas la eliminación definitiva de tu cuenta y todos tus datos?')) return;

    const deleteBtn = $('#settings-delete') || $('#account-delete');
    if (deleteBtn) deleteBtn.disabled = true;

    let cloudOk = true;
    if (global.PTCloud && global.PTCloud.isReady && global.PTCloud.isReady() && global.PTCloud.deleteUserRow) {
      const res = await global.PTCloud.deleteUserRow();
      if (!res.ok) {
        cloudOk = false;
        if (!confirm('No se pudieron borrar los datos en la nube (' + (res.reason || 'error') + ').\n¿Borrar solo los datos de este dispositivo?')) {
          if (deleteBtn) deleteBtn.disabled = false;
          return;
        }
      }
    }
    if (global.Store && global.Store.purgeLocalUserData) {
      global.Store.purgeLocalUserData(currentUser.sub, { clearLegacy: true });
    }
    signOut();
    alert(cloudOk
      ? 'Cuenta y datos eliminados. Sesión cerrada.'
      : 'Datos locales eliminados. Si usabas la nube, comprueba que no queden datos remotos.');
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

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error((label || 'timeout') + ' (' + ms + 'ms)'));
        }, ms);
      })
    ]);
  }

  function seedSampleSession(user) {
    if (!user || !global.PTSampleSession || !global.PTSampleSession.ensureForUser) return;
    global.PTSampleSession.ensureForUser(user.sub)
      .catch(function (e) { console.warn('[PTSampleSession]', e); });
  }

  async function enterApp(user) {
    if (!user) return;
    user = normalizeUser(user);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (e) { /* noop */ }
    currentUser = user;
    global.PT_AUTH_USER = user;
    if (global.Store && global.Store.setUserId) global.Store.setUserId(user.sub);

    setAppVisible(true);
    renderAccountMenu(user);
    startAppIfNeeded();
    global.dispatchEvent(new CustomEvent('pt-auth-ready', { detail: user }));

    if (global.PTCloudSessions && global.PTCloudSessions.setUser) {
      global.PTCloudSessions.setUser(user);
    }
    if (global.PTCloud && global.PTCloud.setUser) {
      global.PTCloud.setUser(user);
      document.body.classList.add('pt-cloud-syncing');
      withTimeout(global.PTCloud.syncOnLogin(), 12000, 'cloud-sync')
        .catch(function (e) { console.warn('[PTCloud]', e); })
        .finally(function () {
          document.body.classList.remove('pt-cloud-syncing');
          seedSampleSession(user);
        });
    } else {
      seedSampleSession(user);
    }

    if (global.PTProfile && global.PTProfile.touchAndApply) {
      withTimeout(global.PTProfile.touchAndApply(user), 8000, 'profile')
        .then(function () {
          renderAccountMenu(user);
          if (global.PTAdmin && global.PTAdmin.initForUser) global.PTAdmin.initForUser(user);
          if (global.PTBilling && global.PTBilling.syncSubscription && global.PTBilling.enabled()) {
            global.PTBilling.syncSubscription()
              .then(function () {
                if (global.PTEntitlements && global.PTEntitlements.refresh) {
                  return global.PTEntitlements.refresh();
                }
              })
              .then(function () { renderAccountMenu(user); })
              .catch(function (e) { console.warn('[PTBilling] login sync', e); });
          }
        })
        .catch(function (e) {
          console.warn('[PTProfile]', e);
          if (global.PTEntitlements && global.PTEntitlements.refresh) {
            global.PTEntitlements.refresh().then(function () {
              renderAccountMenu(user);
              if (global.PTAdmin && global.PTAdmin.initForUser) global.PTAdmin.initForUser(user);
            });
          }
        });
    } else if (global.PTAdmin && global.PTAdmin.initForUser) {
      global.PTAdmin.initForUser(user);
    }
  }

  function setupGsiButton() {
    if (global.PTSupabase && global.PTSupabase.useAuth && global.PTSupabase.useAuth()) return;
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
    var done = function () {
      localStorage.removeItem(SESSION_KEY);
      try { sessionStorage.removeItem('pt_oauth_nonce'); } catch (e) { /* noop */ }
      currentUser = null;
      global.PT_AUTH_USER = null;
      if (global.PTCloudSessions && global.PTCloudSessions.setUser) global.PTCloudSessions.setUser(null);
      if (global.PTCloud && global.PTCloud.setUser) global.PTCloud.setUser(null);
      appStarted = false;
      if (global.PT_retryLogin) global.PT_retryLogin();
      else location.reload();
    };
    if (global.PTSupabase && global.PTSupabase.useAuth && global.PTSupabase.useAuth()) {
      var client = global.PTSupabase.getClient();
      if (client) {
        client.auth.signOut().finally(done);
        return;
      }
    }
    done();
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
      if (global.PTAccountSettings && global.PTAccountSettings.refresh) {
        global.PTAccountSettings.refresh();
      }
    });

    window.addEventListener('resize', function () { /* noop */ });

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
    exportAccountData: exportAccountData,
    deleteAccount: deleteAccount,
    renderAccountMenu: renderAccountMenu,
    collapseAccountAccordion: function () { closeAccountDropdown(); },
    startLogin: function () { if (global.PT_startGoogleLogin) global.PT_startGoogleLogin(); }
  };

  bindUi();
})(window);
