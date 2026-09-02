/* Sesión huérfana (pt_auth_v1 sin JWT): no entrar a la app; auth errors → landing. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');

const authSrc = fs.readFileSync(path.join(root, 'js/auth.js'), 'utf8');
const bootSrc = fs.readFileSync(path.join(root, 'js/auth-bootstrap.js'), 'utf8');
const cloudSrc = fs.readFileSync(path.join(root, 'js/cloud-store.js'), 'utf8');
const settingsSrc = fs.readFileSync(path.join(root, 'js/account-settings.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const profileSrc = fs.readFileSync(path.join(root, 'js/user-profile.js'), 'utf8');
const entSrc = fs.readFileSync(path.join(root, 'js/entitlements.js'), 'utf8');

assert.ok(/handleAuthFailure/.test(authSrc), 'auth.js exporta handleAuthFailure');
assert.ok(/ensureLiveSession/.test(authSrc), 'auth.js exporta ensureLiveSession');
assert.ok(/waitForSupabaseBootstrap/.test(authSrc), 'auth.js espera bootstrap Supabase');
assert.ok(/PT_AUTH_BOOT_DONE/.test(authSrc) && /PT_AUTH_BOOT_DONE/.test(bootSrc), 'flag boot done');
assert.ok(/clearStaleLegacySession/.test(bootSrc), 'bootstrap limpia sesión huérfana');
assert.ok(/SIGNED_OUT/.test(bootSrc), 'bootstrap reacciona a SIGNED_OUT');
assert.ok(/markAuthBootDone/.test(bootSrc), 'bootstrap marca fin de boot');
assert.ok(/notifyAuthFailure/.test(cloudSrc), 'cloud-store notifica auth failure');
assert.ok(/handleAuthFailure/.test(settingsSrc), 'account-settings redirige en not_authenticated');
assert.ok(/ensureLiveSession/.test(appSrc), 'goToTab verifica sesión viva');
assert.ok(/handleAuthFailure/.test(profileSrc), 'profile toca auth failure');
assert.ok(/handleAuthFailure/.test(entSrc), 'entitlements toca auth failure');
assert.ok(/auth_required|not_authenticated/.test(authSrc), 'detecta códigos de las capturas');

const localStore = {};
const sessionStore = {};
const listeners = {};
const bodyClasses = new Set(['auth-locked']);

function el(id, hidden) {
  return {
    id: id,
    classList: {
      _h: !!hidden,
      add(c) { if (c === 'hidden') this._h = true; },
      remove(c) { if (c === 'hidden') this._h = false; },
      toggle(c, on) { if (c === 'hidden') this._h = !!on; },
      contains(c) { return c === 'hidden' ? this._h : false; }
    },
    setAttribute() {},
    getAttribute() { return null; },
    innerHTML: '',
    textContent: '',
    style: {},
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

const appShell = el('app-shell', true);
const authGate = el('auth-gate', false);

const documentMock = {
  body: {
    classList: {
      add: (c) => bodyClasses.add(c),
      remove: (c) => bodyClasses.delete(c),
      toggle: (c, on) => { if (on) bodyClasses.add(c); else bodyClasses.delete(c); },
      contains: (c) => bodyClasses.has(c)
    }
  },
  getElementById(id) {
    if (id === 'app-shell') return appShell;
    if (id === 'auth-gate') return authGate;
    return el(id);
  },
  querySelector(sel) {
    if (sel === '#app-shell') return appShell;
    if (sel === '#auth-gate') return authGate;
    return null;
  },
  querySelectorAll() { return []; },
  addEventListener(type, fn) {
    (listeners[type] = listeners[type] || []).push(fn);
  }
};

const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Set,
  Map,
  JSON,
  Number,
  String,
  Object,
  Array,
  Promise,
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  },
  sessionStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sessionStore, k) ? sessionStore[k] : null),
    setItem: (k, v) => { sessionStore[k] = String(v); },
    removeItem: (k) => { delete sessionStore[k]; }
  },
  document: documentMock,
  CustomEvent: function (name, opts) { this.type = name; this.detail = opts && opts.detail; },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  setTimeout: (fn) => {
    sandbox._timers.push(fn);
    return sandbox._timers.length;
  },
  clearTimeout: () => {},
  addEventListener(type, fn) {
    (listeners[type] = listeners[type] || []).push(fn);
  },
  dispatchEvent(ev) {
    const list = listeners[ev && ev.type] || [];
    list.forEach((fn) => fn(ev));
    return true;
  },
  location: { reload() { sandbox._reloaded = true; }, href: 'http://localhost/', protocol: 'https:' }
};
sandbox._timers = [];
sandbox.global = sandbox;
sandbox.window = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
sandbox.window.sessionStorage = sandbox.sessionStorage;
sandbox.window.document = documentMock;
sandbox.window.location = sandbox.location;
sandbox.window.matchMedia = sandbox.matchMedia;
sandbox.window.setTimeout = sandbox.setTimeout;
sandbox.window.PTSupabase = {
  useAuth() { return true; },
  getClient() {
    return {
      auth: {
        signOut() {
          return {
            finally(fn) {
              if (typeof fn === 'function') fn();
              return Promise.resolve();
            },
            then(fn) {
              if (typeof fn === 'function') fn();
              return this;
            }
          };
        },
        getSession() {
          return Promise.resolve({ data: { session: null } });
        }
      }
    };
  }
};
sandbox.window.PTCloud = { setUser() {} };
sandbox.window.PTCloudSessions = { setUser() {} };
sandbox.window.PT_retryLogin = function () { sandbox._retryLogin = true; };
sandbox.PTSupabase = sandbox.window.PTSupabase;
sandbox.PTCloud = sandbox.window.PTCloud;
sandbox.PTCloudSessions = sandbox.window.PTCloudSessions;
sandbox.PT_retryLogin = sandbox.window.PT_retryLogin;

vm.createContext(sandbox);
vm.runInContext(authSrc, sandbox, { filename: 'auth.js' });

const Auth = sandbox.window.PTAuth;
assert.ok(Auth && Auth.handleAuthFailure && Auth.isAuthFailureError && Auth.ensureLiveSession);

assert.strictEqual(Auth.isAuthFailureError('auth_required'), true);
assert.strictEqual(Auth.isAuthFailureError('not_authenticated'), true);
assert.strictEqual(Auth.isAuthFailureError({ message: 'No se pudo sincronizar: auth_required' }), true);
assert.strictEqual(Auth.isAuthFailureError({ message: 'network timeout' }), false);
assert.strictEqual(Auth.isAuthFailureError({ code: 'PGRST301', message: 'JWT' }), true);

const stale = {
  sub: 'user-stale',
  email: 'jose@test.local',
  name: 'José',
  loginAt: Date.now(),
  authProvider: 'supabase',
  isAdmin: true
};
sandbox.localStorage.setItem('pt_auth_v1', JSON.stringify(stale));
sandbox.window.PT_AUTH_USER = null;
sandbox.window.PT_AUTH_BOOT_DONE = true;
sandbox._retryLogin = false;

let appEntered = false;
Auth.requireAuth(function () { appEntered = true; });
while (sandbox._timers.length) {
  const fn = sandbox._timers.shift();
  if (typeof fn === 'function') fn();
}
assert.strictEqual(appEntered, false, 'requireAuth no entra solo con localStorage + useAuth');
assert.strictEqual(sandbox.localStorage.getItem('pt_auth_v1'), null, 'sesión huérfana borrada al boot done');
assert.ok(bodyClasses.has('auth-locked') || authGate.classList._h === false, 'landing / auth gate');

sandbox.localStorage.setItem('pt_auth_v1', JSON.stringify(stale));
sandbox.window.PT_AUTH_USER = Object.assign({}, stale);
assert.strictEqual(Auth.handleAuthFailure('auth_required'), true);
assert.strictEqual(sandbox.localStorage.getItem('pt_auth_v1'), null, 'handleAuthFailure borra pt_auth_v1');
assert.strictEqual(sandbox.window.PT_AUTH_USER, null, 'PT_AUTH_USER null');
assert.ok(sandbox._retryLogin || sandbox._reloaded, 'redirige a landing vía retryLogin/reload');
assert.strictEqual(Auth.handleAuthFailure('auth_required'), false, 'no reentra en bucle');

console.log('*** stale-auth-landing OK ***');
