/* Regresión unificada del login landing (desktop / portátil).
 * Cubre: Entrar → OAuth, Continuar enlazado antes de getSession, GSI oculto. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const landingSrc = fs.readFileSync(path.join(root, 'js', 'landing.js'), 'utf8');
const bootstrapSrc = fs.readFileSync(path.join(root, 'js', 'auth-bootstrap.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// --- Contratos estáticos (anti-regresión del bug portátil) ---
assert(
  /querySelectorAll\('\[data-landing-login\]'\)[\s\S]{0,400}?openLoginPanel\(\)/.test(landingSrc),
  '[data-landing-login] debe abrir el panel de login'
);
assert(
  /querySelectorAll\('\[data-landing-try\]'\)[\s\S]{0,400}?startGuestNow\(\)/.test(landingSrc),
  '[data-landing-try] inicia modo invitado'
);
assert(
  !/querySelectorAll\('\[data-landing-login\]'\)[\s\S]{0,280}?scrollToLogin\(\)/.test(landingSrc),
  '[data-landing-login] no debe limitarse a scrollToLogin()'
);
assert(/Siempre enlazar el CTA de login antes/.test(bootstrapSrc), 'boot() enlaza CTA antes de awaits');
assert(/t\.closest\('#auth-mobile-login'\)/.test(bootstrapSrc), 'delegación click #auth-mobile-login');
assert(/withTimeout\(client\.auth\.getSession\(\)/.test(bootstrapSrc), 'getSession con timeout');
assert(
  /id="auth-mobile-login"[\s\S]{0,120}?Continuar con Google/.test(indexHtml),
  'CTA Continuar con Google presente en landing'
);
assert(
  /google-signin-btn" class="google-signin-host hidden"/.test(indexHtml),
  'GSI host oculto por defecto'
);
assert(
  /auth-bootstrap\.js/.test(indexHtml) && /landing\.js/.test(indexHtml),
  'landing.js y auth-bootstrap.js en early scripts'
);

// --- Landing: Entrar dispara OAuth ---
{
  const clickHandlers = [];
  const loginBtn = {
    addEventListener: function (type, fn) {
      if (type === 'click') clickHandlers.push(fn);
    },
    getAttribute: function () { return null; },
    setAttribute: function () {},
    focus: function () {}
  };
  let oauthCalls = 0;
  const panelClass = { add: function () {}, remove: function () {} };
  const sandbox = {
    window: {},
    console,
    setTimeout: function (fn) { return setTimeout(fn, 0); },
    setInterval: function () { return 1; },
    clearInterval: function () {},
    document: {
      readyState: 'complete',
      body: { classList: { add: function () {}, remove: function () {}, toggle: function () {} } },
      getElementById: function (id) {
        if (id === 'auth-gate') return { id: 'auth-gate' };
        if (id === 'landing-login') {
          return {
            id: 'landing-login',
            classList: panelClass,
            setAttribute: function () {},
            scrollIntoView: function () {},
            insertBefore: function () {},
            firstChild: null,
            dataset: {},
            addEventListener: function () {}
          };
        }
        if (id === 'auth-mobile-login') return loginBtn;
        return null;
      },
      querySelector: function () { return null; },
      querySelectorAll: function (sel) {
        if (sel === '[data-landing-login]') return [loginBtn];
        return [];
      },
      addEventListener: function () {}
    },
    PT_startGoogleLogin: function () { oauthCalls += 1; },
    PTI18n: { t: function (k) { return k; }, apply: function () {} },
    PT_BILLING: { plans: {}, trial: {} },
    PT_SITE: {}
  };
  sandbox.window = sandbox;
  vm.runInContext(landingSrc, vm.createContext(sandbox), { filename: 'landing.js' });
  assert.strictEqual(clickHandlers.length, 1, 'handler Entrar');
  const evt = { preventDefault: function () { this.prevented = true; }, prevented: false };
  clickHandlers[0](evt);
  assert.ok(evt.prevented);
  assert.ok(sandbox.PTLanding.openLoginPanel, 'Entrar abre panel');
  assert.strictEqual(oauthCalls, 0, 'Entrar ya no dispara OAuth directo');
}

// --- Bootstrap: Continuar funciona aunque getSession cuelgue ---
{
  const listeners = {};
  const timers = [];
  let oauthCalls = 0;
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
      getSession: function () { return new Promise(function () { /* hang */ }); },
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
    clearTimeout: function (id) { if (timers[id]) timers[id].cleared = true; },
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
        if (id === 'auth-error') return { textContent: '' };
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
  vm.runInContext(bootstrapSrc, vm.createContext(sandbox), { filename: 'auth-bootstrap.js' });
  listeners.DOMContentLoaded.forEach(function (fn) { fn(); });
  assert.ok(listeners.click && listeners.click.length >= 1, 'delegación antes de getSession');
  assert.strictEqual(gsiHost.classList._h, true, 'GSI oculto con Supabase');
  const evt = {
    target: mobileBtn,
    prevented: false,
    preventDefault: function () { this.prevented = true; }
  };
  listeners.click.forEach(function (fn) { fn(evt); });
  assert.ok(evt.prevented);

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

  Promise.resolve()
    .then(function () { flushTimers(50); })
    .then(function () { flushTimers(50); })
    .then(function () {
      assert.strictEqual(oauthCalls, 1, 'Continuar → OAuth con getSession colgado');
      console.log('*** login-desktop-regression OK ***');
    })
    .catch(function (err) {
      console.error(err);
      process.exit(1);
    });
}
