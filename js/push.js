/*
 * push.js — Web Push: permiso, suscripción, sync con backend y UX iOS/PC.
 */
(function (global) {
  'use strict';

  function cfg() {
    return global.PT_PUSH || { enabled: false, vapidPublicKey: '' };
  }

  function t(key, fallback) {
    return (global.PTI18n && global.PTI18n.t) ? global.PTI18n.t(key) : fallback;
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = global.atob(base64);
    var out = new Uint8Array(raw.length);
    var i;
    for (i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function isIOS() {
    if (global.PTPwa && global.PTPwa.isIOS) return !!global.PTPwa.isIOS();
    var ua = (global.navigator && global.navigator.userAgent) || '';
    return /iPad|iPhone|iPod/.test(ua) ||
      (global.navigator && global.navigator.platform === 'MacIntel' && global.navigator.maxTouchPoints > 1);
  }

  function isStandalone() {
    if (global.PTPwa && global.PTPwa.isStandalone) return !!global.PTPwa.isStandalone();
    try {
      return !!(global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) ||
        !!(global.navigator && global.navigator.standalone);
    } catch (e) {
      return false;
    }
  }

  function detectPlatform(ua) {
    ua = ua || ((global.navigator && global.navigator.userAgent) || '');
    if (isIOS()) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return 'desktop';
    return 'unknown';
  }

  function vapidKey() {
    return String((cfg().vapidPublicKey || '')).trim();
  }

  function isConfigured() {
    return !!(cfg().enabled && vapidKey());
  }

  function hasApi() {
    return !!(global.navigator &&
      'serviceWorker' in global.navigator &&
      global.PushManager &&
      global.Notification);
  }

  function iosBlockReason() {
    if (!isIOS()) return '';
    if (!isStandalone()) return 'ios_not_installed';
    if (!global.PushManager) return 'ios_needs_update';
    return '';
  }

  function isSupported() {
    if (!isConfigured()) return false;
    if (!hasApi()) return false;
    if (iosBlockReason()) return false;
    return true;
  }

  function permission() {
    if (!global.Notification) return 'denied';
    return global.Notification.permission || 'default';
  }

  function functionsBase() {
    var billing = global.PT_BILLING || {};
    if (billing.functionsUrl) return String(billing.functionsUrl).replace(/\/$/, '');
    var sb = global.PT_SUPABASE || {};
    if (sb.url) return String(sb.url).replace(/\/$/, '') + '/functions/v1';
    return '';
  }

  function anonKey() {
    return (global.PT_SUPABASE && global.PT_SUPABASE.anonKey) || '';
  }

  async function authHeaders() {
    var token = global.PTSupabase && global.PTSupabase.getAccessToken
      ? await global.PTSupabase.getAccessToken()
      : null;
    if (!token) throw new Error(t('settings.pushNeedLogin', 'Inicia sesión para activar avisos.'));
    var headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    };
    var key = anonKey();
    if (key) headers.apikey = key;
    return headers;
  }

  async function postFunction(path, body) {
    var base = functionsBase();
    if (!base) throw new Error(t('settings.pushNotConfigured', 'Notificaciones no configuradas en este entorno.'));
    var res = await fetch(base + path, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(body || {})
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }

  function track(name, props) {
    if (global.PTAnalytics && global.PTAnalytics.track) {
      global.PTAnalytics.track(name, props);
    }
  }

  function buildOpenUrl(path) {
    path = path || './?source=push&tab=play';
    try {
      return new URL(path, global.location.href).href;
    } catch (e) {
      return path;
    }
  }

  async function readyRegistration() {
    if (!global.navigator || !global.navigator.serviceWorker) return null;
    try {
      return await global.navigator.serviceWorker.ready;
    } catch (e) {
      return null;
    }
  }

  async function currentSubscription() {
    var reg = await readyRegistration();
    if (!reg || !reg.pushManager) return null;
    try {
      return await reg.pushManager.getSubscription();
    } catch (e) {
      return null;
    }
  }

  function subscriptionPayload(sub) {
    var json = sub.toJSON ? sub.toJSON() : {};
    var keys = json.keys || {};
    return {
      endpoint: json.endpoint || sub.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: (global.navigator && global.navigator.userAgent) || '',
      platform: detectPlatform()
    };
  }

  async function subscribe() {
    var ios = iosBlockReason();
    if (ios === 'ios_not_installed') {
      if (global.PTPwa && global.PTPwa.installApp) global.PTPwa.installApp();
      throw new Error(t('settings.pushIosInstall', 'Instala la app en la pantalla de inicio para recibir avisos en iPhone.'));
    }
    if (ios === 'ios_needs_update') {
      throw new Error(t('settings.pushIosUpdate', 'Actualiza iOS (16.4 o posterior) para recibir avisos.'));
    }
    if (!isConfigured() || !hasApi()) {
      throw new Error(t('settings.pushUnsupported', 'Este navegador no admite notificaciones push.'));
    }
    if (permission() === 'denied') {
      track('push_permission_denied', { platform: detectPlatform() });
      throw new Error(t('settings.pushDenied', 'Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador.'));
    }

    var perm = permission();
    if (perm !== 'granted') {
      perm = await global.Notification.requestPermission();
    }
    if (perm !== 'granted') {
      track('push_permission_denied', { platform: detectPlatform() });
      throw new Error(t('settings.pushDenied', 'Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador.'));
    }
    track('push_permission_granted', { platform: detectPlatform() });

    var reg = await readyRegistration();
    if (!reg || !reg.pushManager) {
      throw new Error(t('settings.pushUnsupported', 'Este navegador no admite notificaciones push.'));
    }

    var sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey())
    });
    var payload = subscriptionPayload(sub);
    await postFunction('/push-subscribe', payload);
    track('push_subscribed', { platform: payload.platform });
    return payload;
  }

  async function unsubscribe() {
    var sub = await currentSubscription();
    if (sub) {
      try {
        await postFunction('/push-unsubscribe', { endpoint: sub.endpoint });
      } catch (e) { /* seguir con baja local */ }
      try { await sub.unsubscribe(); } catch (e2) { /* noop */ }
    }
    track('push_unsubscribed', { platform: detectPlatform() });
    return true;
  }

  async function sync() {
    if (!isSupported() || permission() !== 'granted') return null;
    var sub = await currentSubscription();
    if (!sub) return null;
    try {
      return await postFunction('/push-subscribe', subscriptionPayload(sub));
    } catch (e) {
      return null;
    }
  }

  async function sendTest() {
    var sub = await currentSubscription();
    var data = await postFunction('/push-send', {
      type: 'test',
      endpoint: sub && sub.endpoint,
      title: 'PokerForgeAI',
      body: 'Prueba OK. Si ves esto, los avisos llegan a este dispositivo.',
      tag: 'test',
      url: './?source=push&tab=play',
      campaign: 'test'
    });
    track('push_test_sent', { platform: detectPlatform() });
    return data;
  }

  async function adminSend(userId, opts) {
    opts = opts || {};
    return notifyUsers({
      userIds: userId ? [userId] : [],
      title: opts.title,
      body: opts.body,
      url: opts.url || './?source=push&tab=play',
      tag: opts.tag || 'admin',
      campaign: opts.campaign || 'admin'
    });
  }

  async function notifyUsers(opts) {
    opts = opts || {};
    var payload = {
      type: 'admin',
      title: opts.title || 'PokerForgeAI',
      body: String(opts.body || 'Tienes un aviso de PokerForgeAI.').slice(0, 180),
      url: opts.url || './?source=push&tab=contact',
      tag: opts.tag || 'admin-msg',
      campaign: opts.campaign || 'admin_message'
    };
    if (opts.allUsers) payload.all_users = true;
    else {
      payload.user_ids = (opts.userIds || []).map(function (id) {
        return String(id || '').trim();
      }).filter(Boolean);
      if (opts.userId) payload.user_ids.push(String(opts.userId));
      if (!payload.user_ids.length) return { ok: true, sent: 0 };
    }
    return postFunction('/push-send', payload);
  }

  function statusCode() {
    if (!isConfigured()) return 'not_configured';
    var ios = iosBlockReason();
    if (ios) return ios;
    if (!hasApi()) return 'unsupported';
    if (permission() === 'denied') return 'denied';
    if (permission() === 'granted') return 'ready';
    return 'off';
  }

  function statusText() {
    var code = statusCode();
    if (code === 'not_configured') {
      return t('settings.pushNotConfigured', 'Notificaciones no configuradas en este entorno.');
    }
    if (code === 'ios_not_installed') {
      return t('settings.pushIosInstall', 'Instala la app en la pantalla de inicio para recibir avisos en iPhone.');
    }
    if (code === 'ios_needs_update') {
      return t('settings.pushIosUpdate', 'Actualiza iOS (16.4 o posterior) para recibir avisos.');
    }
    if (code === 'unsupported') {
      return t('settings.pushUnsupported', 'Este navegador no admite notificaciones push.');
    }
    if (code === 'denied') {
      return t('settings.pushDenied', 'Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador.');
    }
    if (code === 'ready') {
      return t('settings.pushReady', 'Este dispositivo recibirá avisos aunque la app esté cerrada.');
    }
    return t('settings.pushOff', 'Activa el interruptor para pedir permiso y suscribir este dispositivo.');
  }

  function bindSettings(root) {
    root = root || (global.document && global.document.getElementById('account-settings-content')) ||
      (global.document ? global.document.body : null);
    if (!root || !root.querySelector) return;

    var toggle = root.querySelector('#settings-push-enable');
    var testBtn = root.querySelector('#settings-push-test');
    var installBtn = root.querySelector('#settings-push-install');
    var statusEl = root.querySelector('#settings-push-status');
    var card = root.querySelector('#settings-push-card');

    function paint() {
      var code = statusCode();
      if (statusEl) statusEl.textContent = statusText();
      if (toggle) {
        toggle.checked = code === 'ready';
        toggle.disabled = code === 'not_configured' || code === 'unsupported' ||
          code === 'ios_needs_update' || code === 'denied';
      }
      if (testBtn) {
        testBtn.classList.toggle('hidden', code !== 'ready');
      }
      if (installBtn) {
        installBtn.classList.toggle('hidden', code !== 'ios_not_installed');
      }
      if (card) card.classList.remove('hidden');
    }

    if (toggle && !toggle.dataset.boundPush) {
      toggle.dataset.boundPush = '1';
      toggle.addEventListener('change', function () {
        var on = toggle.checked;
        toggle.disabled = true;
        var op = on ? subscribe() : unsubscribe();
        op.then(function () {
          paint();
        }).catch(function (e) {
          if (toggle) toggle.checked = !on;
          if (statusEl) statusEl.textContent = (e && e.message) || statusText();
          paint();
        }).then(function () {
          if (toggle) toggle.disabled = false;
        });
      });
    }
    if (testBtn && !testBtn.dataset.boundPush) {
      testBtn.dataset.boundPush = '1';
      testBtn.addEventListener('click', function () {
        testBtn.disabled = true;
        sendTest().then(function () {
          if (statusEl) statusEl.textContent = t('settings.pushTestSent', 'Notificación de prueba enviada.');
        }).catch(function (e) {
          if (statusEl) statusEl.textContent = (e && e.message) || 'No se pudo enviar la prueba.';
        }).then(function () {
          testBtn.disabled = false;
        });
      });
    }
    if (installBtn && !installBtn.dataset.boundPush) {
      installBtn.dataset.boundPush = '1';
      installBtn.addEventListener('click', function () {
        if (global.PTPwa && global.PTPwa.installApp) global.PTPwa.installApp();
      });
    }
    paint();
  }

  function currentUser() {
    if (global.PTAuth && global.PTAuth.getUser) return global.PTAuth.getUser();
    return global.PT_AUTH_USER || null;
  }

  function uid() {
    var u = currentUser();
    return (u && (u.sub || u.id)) || '';
  }

  function promptStorageKey() {
    return 'pt_push_prompt_v1_' + uid();
  }

  function wasPrompted() {
    if (!uid()) return true;
    try { return localStorage.getItem(promptStorageKey()) === '1'; } catch (e) { return false; }
  }

  function markPrompted() {
    if (!uid()) return;
    try { localStorage.setItem(promptStorageKey(), '1'); } catch (e) { /* noop */ }
  }

  function iosNeedsInstall() {
    return isIOS() && !isStandalone();
  }

  function shouldPrompt() {
    if (global.PT_E2E_MODE) return false;
    var u = currentUser();
    if (!u || u.isGuest) return false;
    if (u.sub === 'pt_demo_user') return false;
    if (global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive()) return false;
    if (!uid()) return false;
    if (wasPrompted()) return false;
    if (permission() === 'granted') return false;
    if (permission() === 'denied' && !iosNeedsInstall()) return false;
    if (!hasApi() && !iosNeedsInstall()) return false;
    return true;
  }

  function hidePrompt() {
    var el = global.document && global.document.getElementById('pt-push-prompt');
    if (el) el.classList.add('hidden');
    if (global.document && global.document.body) {
      global.document.body.classList.remove('push-prompt-open');
    }
  }

  function showPrompt() {
    if (!global.document || !global.document.body) return;
    var existing = global.document.getElementById('pt-push-prompt');
    if (existing) {
      existing.classList.remove('hidden');
      global.document.body.classList.add('push-prompt-open');
      return;
    }
    var modal = global.document.createElement('div');
    modal.id = 'pt-push-prompt';
    modal.className = 'modal pt-push-prompt';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'pt-push-prompt-title');
    modal.innerHTML =
      '<div class="modal-content pt-push-prompt-content">' +
      '<h3 id="pt-push-prompt-title">' +
      t('settings.pushPromptTitle', 'Activa las notificaciones') + '</h3>' +
      '<p>' + t('settings.pushPromptLead',
        'Recibe avisos en este dispositivo (mensajes y recordatorios). Puedes cambiarlo cuando quieras en Configuración.') +
      '</p>' +
      '<div class="pt-push-prompt-actions">' +
      '<button type="button" class="btn btn-primary" id="pt-push-prompt-accept">' +
      t('settings.pushPromptAccept', 'Aceptar') + '</button>' +
      '<button type="button" class="btn btn-ghost" id="pt-push-prompt-cancel">' +
      t('settings.pushPromptCancel', 'Cancelar') + '</button>' +
      '</div></div>';
    global.document.body.appendChild(modal);
    global.document.body.classList.add('push-prompt-open');

    function finish(enable) {
      markPrompted();
      hidePrompt();
      if (enable) {
        subscribe().catch(function () { /* el usuario ya respondió; el error se ve en Configuración */ });
      }
    }

    var accept = global.document.getElementById('pt-push-prompt-accept');
    var cancel = global.document.getElementById('pt-push-prompt-cancel');
    if (accept) accept.addEventListener('click', function () { finish(true); });
    if (cancel) cancel.addEventListener('click', function () { finish(false); });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) finish(false);
    });
  }

  function maybePrompt() {
    if (!shouldPrompt()) {
      if (uid() && !wasPrompted() && permission() === 'granted') markPrompted();
      if (uid() && !wasPrompted() && permission() === 'denied' && !iosNeedsInstall()) markPrompted();
      return;
    }
    if (global.document && global.document.body &&
        global.document.body.classList.contains('age-gate-open')) {
      global.setTimeout(maybePrompt, 400);
      return;
    }
    showPrompt();
  }

  function init() {
    if (!global.addEventListener) return;
    global.addEventListener('pt-auth-ready', function (e) {
      var user = (e && e.detail) || currentUser();
      if (!user || user.isGuest) return;
      sync();
      global.setTimeout(maybePrompt, 700);
    });
  }

  init();

  global.PTPush = {
    isSupported: isSupported,
    isConfigured: isConfigured,
    permission: permission,
    isStandaloneIOS: function () { return isIOS() && isStandalone(); },
    statusCode: statusCode,
    statusText: statusText,
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    sync: sync,
    sendTest: sendTest,
    adminSend: adminSend,
    notifyUsers: notifyUsers,
    bindSettings: bindSettings,
    maybePrompt: maybePrompt,
    shouldPrompt: shouldPrompt,
    wasPrompted: wasPrompted,
    markPrompted: markPrompted,
    detectPlatform: detectPlatform,
    iosBlockReason: iosBlockReason,
    buildOpenUrl: buildOpenUrl,
    urlBase64ToUint8Array: urlBase64ToUint8Array
  };
})(typeof window !== 'undefined' ? window : this);
