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

  function isMobileNav() {
    return window.matchMedia('(max-width: 680px)').matches;
  }

  function setAccountAccordion(open) {
    const dropdown = $('#account-dropdown');
    const toggle = $('#account-accordion-toggle');
    const panel = $('#account-accordion-panel');
    if (!dropdown || !toggle || !panel) return;
    if (!isMobileNav()) {
      dropdown.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      return;
    }
    dropdown.classList.toggle('is-open', !!open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function toggleAccountAccordion() {
    const dropdown = $('#account-dropdown');
    if (!dropdown) return;
    setAccountAccordion(!dropdown.classList.contains('is-open'));
  }

  function bindAccountAccordion() {
    const toggle = $('#account-accordion-toggle');
    if (!toggle || toggle.dataset.bound) return;
    toggle.dataset.bound = '1';
    toggle.addEventListener('click', function (e) {
      if (!isMobileNav()) return;
      e.stopPropagation();
      toggleAccountAccordion();
    });
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
      var planRow = user.plan && user.plan !== 'free'
        ? '<div class="account-row"><span>Plan</span><strong>' + escapeHtml(user.planLabel || user.plan) + '</strong></div>'
        : '';
      metaEl.innerHTML =
        '<div class="account-row"><span>Correo</span><strong>' + escapeHtml(user.email) + '</strong></div>' +
        (user.emailVerified ? '<div class="account-row"><span>Verificado</span><strong>Sí</strong></div>' : '') +
        planRow +
        (user.isAdmin ? '<div class="account-row account-row-admin"><span>Rol</span><strong>Administrador</strong></div>' : '') +
        (user.locale ? '<div class="account-row"><span>Idioma</span><strong>' + escapeHtml(user.locale) + '</strong></div>' : '') +
        '<div class="account-row"><span>ID</span><code>' + escapeHtml(user.sub.slice(0, 12)) + '…</code></div>' +
        '<div class="account-row" data-cloud-status><span>Nube</span><strong>…</strong></div>' +
        '<div class="account-row" data-ai-usage><span>IA mes</span><strong>…</strong></div>';
    }
    if (global.PTProfile && global.PTProfile.getMyAiUsageToday) {
      global.PTProfile.getMyAiUsageToday().then(function (usage) {
        var aiRow = metaEl && metaEl.querySelector('[data-ai-usage] strong');
        if (aiRow) {
          aiRow.textContent = usage.limit === '∞'
            ? (usage.used + ' / ∞')
            : (usage.used + ' / ' + usage.limit);
        }
      });
    }

    var upgradeBtn = $('#account-upgrade');
    if (upgradeBtn) {
      upgradeBtn.onclick = function () {
        if (global.goToTab) global.goToTab('pricing');
      };
      upgradeBtn.classList.toggle('hidden', user.plan === 'premium' && user.paidActive);
    }
    var billingBtn = $('#account-billing');
    if (billingBtn) {
      var showBilling = user.plan !== 'free' || user.subscriptionStatus === 'active';
      billingBtn.classList.toggle('hidden', !showBilling || !global.PTBilling || !global.PTBilling.enabled());
      billingBtn.onclick = function () {
        if (global.PTBilling && global.PTBilling.openPortal) {
          global.PTBilling.openPortal().catch(function (e) {
            alert(e.message || 'No se pudo abrir el portal de facturación.');
          });
        }
      };
    }
    if (global.PTAdmin && global.PTAdmin.setAdminVisible) {
      var demoOn = global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive();
      global.PTAdmin.setAdminVisible(!!user.isAdmin && !demoOn);
    }
    var demoBtn = $('#account-demo');
    var stopDemoBtn = $('#account-stop-demo');
    var demoOn = global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive();
    if (demoBtn) {
      demoBtn.classList.toggle('hidden', !user.isAdmin || demoOn);
    }
    if (stopDemoBtn) {
      stopDemoBtn.classList.toggle('hidden', !demoOn);
    }
    var adminMenuBtn = $('#account-admin');
    if (adminMenuBtn) {
      adminMenuBtn.classList.toggle('hidden', !user.isAdmin || demoOn);
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

    const exportBtn = $('#account-export');
    if (exportBtn) exportBtn.onclick = function () { exportAccountData(); };

    const deleteBtn = $('#account-delete');
    if (deleteBtn) deleteBtn.onclick = function () { deleteAccount(); };

    const cookiesBtn = $('#account-cookies');
    if (cookiesBtn) {
      cookiesBtn.onclick = function () {
        if (global.PTLegal && global.PTLegal.showCookieBanner) global.PTLegal.showCookieBanner();
      };
    }

    const adminBtn = $('#account-admin');
    if (adminBtn) {
      adminBtn.classList.toggle('hidden', !user.isAdmin || demoOn);
    }

    bindAccountAccordion();
    setAccountAccordion(false);
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
    downloadJson('pokertrainer-export-' + date + '.json', data);
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

    const deleteBtn = $('#account-delete');
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
        .finally(function () { document.body.classList.remove('pt-cloud-syncing'); });
    }

    if (global.PTProfile && global.PTProfile.touchAndApply) {
      withTimeout(global.PTProfile.touchAndApply(user), 8000, 'profile')
        .then(function () {
          renderAccountMenu(user);
          if (global.PTAdmin && global.PTAdmin.initForUser) global.PTAdmin.initForUser(user);
        })
        .catch(function (e) { console.warn('[PTProfile]', e); });
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
      if (currentUser) renderAccountMenu(currentUser);
    });

    window.addEventListener('resize', function () {
      setAccountAccordion(false);
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
    exportAccountData: exportAccountData,
    deleteAccount: deleteAccount,
    collapseAccountAccordion: function () { setAccountAccordion(false); },
    startLogin: function () { if (global.PT_startGoogleLogin) global.PT_startGoogleLogin(); }
  };

  bindUi();
})(window);
