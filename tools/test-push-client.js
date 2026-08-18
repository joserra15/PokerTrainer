/* Cliente Web Push: iOS, plataforma, VAPID decode, deep link. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'js/push.js'), 'utf8');

function load(nav, extras) {
  extras = extras || {};
  const store = extras.store || {};
  const sandbox = {
    window: {},
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    Uint8Array,
    URL,
    Promise,
    setTimeout() { return 0; },
    navigator: nav || { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' },
    Notification: extras.Notification || { permission: extras.permission || 'default' },
    PushManager: function () {},
    location: { href: 'https://www.pokerforgeai.com/' },
    addEventListener() {},
    fetch() { return Promise.resolve({ ok: true, json: async () => ({}) }); },
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    document: extras.document || {
      body: { classList: { contains() { return false; }, add() {}, remove() {} } },
      getElementById() { return null; },
      createElement() {
        return {
          setAttribute() {},
          addEventListener() {},
          classList: { add() {}, remove() {} }
        };
      }
    },
    console
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  sandbox.PT_PUSH = { enabled: true, vapidPublicKey: 'B' + 'A'.repeat(86) };
  sandbox.PTPwa = {
    isIOS() { return /iPhone|iPad|iPod/.test(sandbox.navigator.userAgent); },
    isStandalone() { return !!sandbox.navigator.standalone; }
  };
  if (extras.e2e) sandbox.PT_E2E_MODE = true;
  sandbox.PTAuth = extras.PTAuth || {
    getUser() { return extras.user || null; }
  };
  sandbox.PTDemo = extras.PTDemo || { isActive() { return false; } };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'push.js' });
  return { api: sandbox.window.PTPush, sandbox, store };
}

const desktop = load({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
  serviceWorker: {}
}).api;
assert.ok(desktop, 'PTPush');
assert.strictEqual(desktop.detectPlatform(), 'desktop');
assert.strictEqual(desktop.iosBlockReason(), '');
assert.ok(typeof desktop.buildOpenUrl === 'function');
assert.ok(/source=push/.test(desktop.buildOpenUrl('./?source=push&tab=play')));

const bytes = desktop.urlBase64ToUint8Array('AQIDBA');
assert.ok(bytes instanceof Uint8Array || bytes.length >= 1, 'urlBase64ToUint8Array');

const android = load({
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel) Chrome/120 Mobile',
  serviceWorker: {}
}).api;
assert.strictEqual(android.detectPlatform(), 'android');

const iosTab = load({
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605',
  standalone: false,
  serviceWorker: {}
}).api;
assert.strictEqual(iosTab.detectPlatform(), 'ios');
assert.strictEqual(iosTab.iosBlockReason(), 'ios_not_installed');
assert.strictEqual(iosTab.isStandaloneIOS(), false);

const iosPwa = load({
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605',
  standalone: true,
  serviceWorker: {}
}).api;
assert.strictEqual(iosPwa.isStandaloneIOS(), true);
assert.strictEqual(iosPwa.iosBlockReason(), '');

assert.ok(/async function subscribe/.test(src) && /requestPermission/.test(src),
  'pide permiso en subscribe');
assert.ok(/userVisibleOnly:\s*true/.test(src), 'userVisibleOnly');
assert.ok(/push-subscribe/.test(src) && /push-unsubscribe/.test(src), 'endpoints subscribe');
assert.ok(/type:\s*'test'/.test(src), 'self-test type=test');
assert.ok(/endpoint:\s*sub/.test(src), 'self-test filtra endpoint actual');
assert.ok(/function notifyUsers/.test(src) && /all_users/.test(src) && /user_ids/.test(src),
  'notifyUsers envía a user_ids o all_users');
assert.ok(/pt_push_prompt_v1_/.test(src) && /function maybePrompt/.test(src), 'prompt one-shot');
assert.ok(/pt-push-prompt-accept/.test(src) && /pt-push-prompt-cancel/.test(src), 'Aceptar/Cancelar');
assert.ok(/function finish\(enable\)/.test(src) && /if \(enable\) \{\s*subscribe\(\)/.test(src),
  'Aceptar llama subscribe');
assert.ok(/PT_E2E_MODE/.test(src), 'E2E no muestra el prompt');

const userNav = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
  serviceWorker: {}
};
const logged = { sub: 'u-prompt', email: 'a@b.c', isGuest: false };
assert.strictEqual(load(userNav, { user: logged }).api.shouldPrompt(), true, 'usuario nuevo ve el prompt');
assert.strictEqual(load(userNav, { user: { sub: 'g1', isGuest: true } }).api.shouldPrompt(), false,
  'invitado no ve el prompt');
assert.strictEqual(load(userNav, { user: logged, e2e: true }).api.shouldPrompt(), false,
  'E2E no ve el prompt');
assert.strictEqual(load(userNav, { user: logged, permission: 'granted' }).api.shouldPrompt(), false,
  'ya concedido no vuelve a preguntar');
assert.strictEqual(load(userNav, { user: logged, permission: 'denied' }).api.shouldPrompt(), false,
  'denegado en desktop no pregunta');

const once = load(userNav, { user: logged });
assert.strictEqual(once.api.wasPrompted(), false, 'aún no preguntado');
once.api.markPrompted();
assert.strictEqual(once.api.wasPrompted(), true, 'marca one-shot');
assert.strictEqual(once.api.shouldPrompt(), false, 'solo una vez');

const nodes = {};
const body = {
  classList: {
    _c: new Set(),
    add(c) { this._c.add(c); },
    remove(c) { this._c.delete(c); },
    contains(c) { return this._c.has(c); }
  },
  appendChild(el) { if (el && el.id) nodes[el.id] = el; return el; }
};
function elStub() {
  const el = {
    id: '',
    className: '',
    _html: '',
    classList: {
      _c: new Set(),
      add(c) { this._c.add(c); },
      remove(c) { this._c.delete(c); },
      contains(c) { return this._c.has(c); }
    },
    setAttribute() {},
    addEventListener(type, fn) {
      this._on = this._on || {};
      this._on[type] = fn;
    }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(v) {
      el._html = String(v || '');
      String(v || '').replace(/id="([^"]+)"/g, function (_, id) {
        if (!nodes[id]) {
          const child = elStub();
          child.id = id;
          nodes[id] = child;
        }
        return _;
      });
    }
  });
  return el;
}
const modalEnv = load(userNav, {
  user: logged,
  document: {
    body,
    createElement() {
      const el = elStub();
      return el;
    },
    getElementById(id) { return nodes[id] || null; }
  }
});
modalEnv.api.maybePrompt();
assert.ok(nodes['pt-push-prompt'], 'crea el modal');
assert.ok(body.classList.contains('push-prompt-open'), 'bloquea scroll');
const cancel = nodes['pt-push-prompt-cancel'];
assert.ok(cancel && cancel._on && cancel._on.click, 'botón cancelar');
cancel._on.click();
assert.strictEqual(modalEnv.api.wasPrompted(), true, 'cancelar cuenta como preguntado');
assert.strictEqual(modalEnv.api.shouldPrompt(), false, 'cancelar no vuelve a preguntar');

const iosPrompt = load({
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605',
  standalone: false,
  serviceWorker: {}
}, { user: logged, permission: 'denied' }).api;
assert.strictEqual(iosPrompt.shouldPrompt(), true, 'iOS no instalado sí pregunta una vez');

console.log('*** push-client OK ***');
