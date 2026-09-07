/* Si GoTrue responde 504, Continuar no debe navegar a la página JSON Gateway Timeout. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js', 'auth-bootstrap.js'), 'utf8');
const docs = fs.readFileSync(path.join(root, 'docs', 'SUPABASE_AUTH.md'), 'utf8');

assert(/probeAuthReady/.test(src), 'auth-bootstrap tiene probeAuthReady');
assert(/skipBrowserRedirect:\s*true/.test(src), 'OAuth con skipBrowserRedirect');
assert(/Gateway Timeout/.test(docs), 'docs documentan Gateway Timeout');
assert(/Restart project/.test(docs), 'docs indican Restart project');

const listeners = {};
const timers = [];
let oauthCalls = 0;
let assignedUrl = '';
let authError = '';
let healthStatus = 504;

const mobileBtn = {
  id: 'auth-mobile-login',
  classList: {
    _h: false,
    add(c) { if (c === 'hidden') this._h = true; },
    remove(c) { if (c === 'hidden') this._h = false; }
  },
  closest(sel) { return sel === '#auth-mobile-login' ? this : null; }
};

const mockClient = {
  auth: {
    getSession: function () { return Promise.resolve({ data: { session: null }, error: null }); },
    onAuthStateChange: function () {},
    signInWithOAuth: function () {
      oauthCalls += 1;
      return Promise.resolve({
        data: { url: 'https://example.supabase.co/auth/v1/authorize?provider=google' },
        error: null
      });
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
  fetch: function (url) {
    assert.ok(/\/auth\/v1\/health$/.test(String(url)), 'probe llama /auth/v1/health');
    return Promise.resolve({ status: healthStatus, ok: healthStatus >= 200 && healthStatus < 300 });
  },
  AbortController: function () {
    this.signal = {};
    this.abort = function () {};
  },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  location: {
    protocol: 'https:',
    origin: 'https://www.pokerforgeai.com',
    pathname: '/',
    search: '',
    hash: '',
    href: 'https://www.pokerforgeai.com/',
    assign: function (url) { assignedUrl = String(url || ''); }
  },
  history: { replaceState() {} },
  navigator: { userAgent: 'Mozilla/5.0', maxTouchPoints: 1 },
  matchMedia: function () { return { matches: false }; },
  document: {
    readyState: 'loading',
    body: { classList: { remove() {}, add() {}, toggle() {} } },
    getElementById(id) {
      if (id === 'auth-mobile-login') return mobileBtn;
      if (id === 'google-signin-btn') {
        return {
          id: 'google-signin-btn',
          classList: {
            _h: true,
            add(c) { if (c === 'hidden') this._h = true; },
            remove(c) { if (c === 'hidden') this._h = false; }
          }
        };
      }
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
listeners.DOMContentLoaded.forEach(function (fn) { fn(); });

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

function clickContinuar() {
  const evt = {
    target: mobileBtn,
    preventDefault: function () {}
  };
  listeners.click.forEach(function (fn) { fn(evt); });
}

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

function drain(n) {
  let p = Promise.resolve();
  for (let i = 0; i < n; i++) {
    p = p.then(function () {
      flushTimers(50);
      return Promise.resolve();
    });
  }
  return p;
}

clickContinuar();

drain(8).then(function () {
  assert.strictEqual(oauthCalls, 0, 'con Auth 504 no llama signInWithOAuth');
  assert.strictEqual(assignedUrl, '', 'con Auth 504 no navega a authorize');
  assert.ok(/no responde|Restart project|504/i.test(authError),
    'muestra error actionable: ' + authError);

  // Recuperación: health OK → sí redirige
  healthStatus = 200;
  authError = '';
  assignedUrl = '';
  clickContinuar();
  return drain(8);
}).then(function () {
  assert.strictEqual(oauthCalls, 1, 'con Auth OK dispara OAuth');
  assert.ok(/authorize\?provider=google/.test(assignedUrl), 'navega a authorize');
  console.log('*** auth-gateway-timeout OK ***');
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
