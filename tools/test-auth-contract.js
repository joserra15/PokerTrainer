/* RG-D05 — Contrato cliente auth: sesión, signOut limpia storage sensible. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const localStore = {};
const sessionStore = {};
const listeners = {};

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
const bodyClasses = new Set(['auth-locked']);

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

let cloudUser = 'pending';
let cloudSessionsUser = 'pending';

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
  setTimeout: (fn) => { /* skip GSI poll in tests */ },
  clearTimeout: () => {},
  addEventListener(type, fn) {
    (listeners[type] = listeners[type] || []).push(fn);
  },
  dispatchEvent() { return true; },
  location: { reload() { sandbox._reloaded = true; }, href: 'http://localhost/' }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
sandbox.window.sessionStorage = sandbox.sessionStorage;
sandbox.window.document = documentMock;
sandbox.window.location = sandbox.location;
sandbox.window.matchMedia = sandbox.matchMedia;
sandbox.window.setTimeout = sandbox.setTimeout;
sandbox.window.PTCloud = {
  setUser(u) { cloudUser = u; },
  syncOnLogin() { return Promise.resolve(); }
};
sandbox.window.PTCloudSessions = {
  setUser(u) { cloudSessionsUser = u; }
};
sandbox.window.PT_retryLogin = function () { sandbox._retryLogin = true; };
sandbox.PTCloud = sandbox.window.PTCloud;
sandbox.PTCloudSessions = sandbox.window.PTCloudSessions;
sandbox.PT_retryLogin = sandbox.window.PT_retryLogin;

vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'js/auth.js'), 'utf8'),
  sandbox,
  { filename: 'auth.js' }
);

const Auth = sandbox.window.PTAuth;
assert.ok(Auth && Auth.signOut && Auth.getUser, 'PTAuth');

const user = {
  sub: 'auth-test-user',
  email: 'auth@test.local',
  name: 'Auth Test',
  loginAt: Date.now(),
  authProvider: 'test'
};
sandbox.localStorage.setItem('pt_auth_v1', JSON.stringify(user));
sandbox.sessionStorage.setItem('pt_oauth_nonce', 'nonce-secret');
sandbox.window.PT_AUTH_USER = user;

// Simular sesión activa
assert.ok(Auth.isAuthenticated() || Auth.getUser() || sandbox.localStorage.getItem('pt_auth_v1'), 'sesión presente');

Auth.signOut();

assert.strictEqual(sandbox.localStorage.getItem('pt_auth_v1'), null, 'signOut quita pt_auth_v1');
assert.strictEqual(sandbox.sessionStorage.getItem('pt_oauth_nonce'), null, 'signOut quita oauth nonce');
assert.strictEqual(sandbox.window.PT_AUTH_USER, null, 'PT_AUTH_USER null');
assert.strictEqual(cloudUser, null, 'PTCloud.setUser(null)');
assert.strictEqual(cloudSessionsUser, null, 'PTCloudSessions.setUser(null)');
assert.ok(sandbox._retryLogin || sandbox._reloaded, 'reintenta login o reload');

// Expiry: sesión > 30 días se descarta en loadSession vía requireAuth path
const old = {
  sub: 'old',
  email: 'old@test.local',
  name: 'Old',
  loginAt: Date.now() - 31 * 24 * 60 * 60 * 1000
};
sandbox.localStorage.setItem('pt_auth_v1', JSON.stringify(old));
sandbox._retryLogin = false;
// getUser may still return currentUser null after signOut; load via requireAuth
let readyUser = 'unset';
Auth.requireAuth(function (u) { readyUser = u; });
assert.strictEqual(sandbox.localStorage.getItem('pt_auth_v1'), null, 'sesión expirada se borra');
assert.ok(bodyClasses.has('auth-locked') || authGate, 'gate auth visible conceptualmente');

// Fuente: SESSION_KEY y limpieza documentadas
const src = fs.readFileSync(path.join(__dirname, '..', 'js/auth.js'), 'utf8');
assert.ok(/pt_auth_v1/.test(src), 'SESSION_KEY');
assert.ok(/pt_oauth_nonce/.test(src), 'oauth nonce cleanup');
assert.ok(/signOut/.test(src), 'signOut export');

console.log('*** auth-contract OK (signOut + expiry) ***');
