/* Regresión: Continuar con Google debe responder al instante (panel derecho / desktop).
 * Antes solo se enlazaba tras await getSession(), que en portátil deja el botón muerto. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js', 'auth-bootstrap.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(/Siempre enlazar el CTA de login antes/.test(src), 'boot() enlaza CTA antes de awaits');
assert(/t\.closest\('#auth-mobile-login'\)/.test(src), 'delegación de click en #auth-mobile-login');
assert(/withTimeout\(client\.auth\.getSession\(\)/.test(src), 'getSession con timeout');
assert(
  /google-signin-btn" class="google-signin-host hidden"/.test(indexHtml),
  'GSI host oculto por defecto; Continuar es el CTA principal'
);

const listeners = {};
const timers = [];
let oauthCalls = 0;
let authError = '';

const mobileBtn = {
  id: 'auth-mobile-login',
  classList: {
    _h: false,
    add(c) { if (c === 'hidden') this._h = true; },
    remove(c) { if (c === 'hidden') this._h = false; }
  },
  closest(sel) { return sel === '#auth-mobile-login' ? this : null; }
};
const gsiHost = {
  id: 'google-signin-btn',
  classList: {
    _h: true,
    add(c) { if (c === 'hidden') this._h = true; },
    remove(c) { if (c === 'hidden') this._h = false; }
  }
};

const mockClient = {
  auth: {
    getSession: function () {
      // Simula getSession colgado: no resuelve. El boot no debe bloquear el CTA.
      return new Promise(function () { /* never */ });
    },
    onAuthStateChange: function () {},
    signInWithOAuth: function () {
      oauthCalls += 1;
      return Promise.resolve({ data: {}, error: null });
    }
  }
};

const sandbox = {
  window: {},
  console,
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  setTimeout: function (fn, ms) {
    const id = timers.length;
    timers.push({ fn: fn, ms: ms || 0, cleared: false });
    return id;
  },
  clearTimeout: function (id) {
    if (timers[id]) timers[id].cleared = true;
  },
  Promise,
  TextDecoder,
  Uint8Array,
  URLSearchParams,
  CustomEvent: function () {},
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  location: {
    protocol: 'https:',
    origin: 'https://www.pokerforgeai.com',
    pathname: '/',
    search: '',
    hash: '',
    href: 'https://www.pokerforgeai.com/',
    assign: function () {}
  },
  history: { replaceState() {} },
  navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', maxTouchPoints: 1 },
  matchMedia: function () { return { matches: false }; },
  document: {
    readyState: 'loading',
    body: { classList: { remove() {}, add() {}, toggle() {} } },
    getElementById(id) {
      if (id === 'auth-mobile-login') return mobileBtn;
      if (id === 'google-signin-btn') return gsiHost;
      if (id === 'auth-error') {
        return {
          get textContent() { return authError; },
          set textContent(v) { authError = String(v || ''); }
        };
      }
      if (id === 'app-shell' || id === 'auth-gate') {
        return { classList: { add() {}, remove() {} }, setAttribute() {} };
      }
      return null;
    },
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    }
  },
  supabase: { createClient: function () { return mockClient; } },
  PT_SUPABASE: {
    enabled: true,
    url: 'https://example.supabase.co',
    anonKey: 'test',
    useAuth: true
  },
  PTSupabase: {
    useAuth: function () { return true; },
    getClient: function () { return mockClient; },
    userFromSession: function () { return null; }
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;

vm.runInContext(src, vm.createContext(sandbox), { filename: 'auth-bootstrap.js' });

assert.ok(listeners.DOMContentLoaded && listeners.DOMContentLoaded.length, 'espera DOMContentLoaded');
listeners.DOMContentLoaded.forEach(function (fn) { fn(); });

assert.ok(listeners.click && listeners.click.length >= 1, 'delegación click registrada sin esperar getSession');
assert.strictEqual(mobileBtn.classList._h, false, 'Continuar visible');
assert.strictEqual(gsiHost.classList._h, true, 'GSI oculto con Supabase Auth');

const evt = {
  target: mobileBtn,
  prevented: false,
  preventDefault: function () { this.prevented = true; }
};
listeners.click.forEach(function (fn) { fn(evt); });
assert.ok(evt.prevented, 'click en Continuar hace preventDefault');

// Avanzar microtareas / waits cortos del startSupabaseLogin
function flushTimers(maxMs) {
  let guard = 0;
  while (guard++ < 200) {
    const due = timers.filter(function (t) { return !t.cleared && t.ms <= maxMs && t.fn; });
    if (!due.length) break;
    due.forEach(function (t) {
      t.cleared = true;
      try { t.fn(); } catch (e) { /* noop */ }
    });
  }
}
Promise.resolve().then(function () {
  flushTimers(50);
  return Promise.resolve();
}).then(function () {
  flushTimers(50);
  assert.strictEqual(oauthCalls, 1, 'Continuar dispara signInWithOAuth aunque getSession cuelgue');
  console.log('*** auth-bootstrap-login-ui OK ***');
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
