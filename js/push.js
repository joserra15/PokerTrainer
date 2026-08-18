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
    return postFunction('/push-send', {
      type: 'admin',
      user_id: userId,
      title: opts.title || 'PokerForgeAI',
      body: opts.body || 'Tienes un aviso de PokerForgeAI.',
      url: opts.url || './?source=push&tab=play',
      tag: 'admin',
      campaign: 'admin'
    });
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

  function init() {
    if (!global.addEventListener) return;
    global.addEventListener('pt-auth-ready', function () {
      sync();
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
    bindSettings: bindSettings,
    detectPlatform: detectPlatform,
    iosBlockReason: iosBlockReason,
    buildOpenUrl: buildOpenUrl,
    urlBase64ToUint8Array: urlBase64ToUint8Array
  };
})(typeof window !== 'undefined' ? window : this);
