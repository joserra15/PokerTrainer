/* Regresión: los botones Entrar (header + nav) no tocan el cliente Auth.
 * Un rpc autenticado (getSession) borra el PKCE y Google vuelve a la landing. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const landingSrc = fs.readFileSync(path.join(root, 'js/landing.js'), 'utf8');
const funnelSrc = fs.readFileSync(path.join(root, 'js/guest-funnel.js'), 'utf8');
const guestSrc = fs.readFileSync(path.join(root, 'js/guest-mode.js'), 'utf8');

const entrarBtns = html.match(/<button\b[^>]*\bdata-landing-login(?:\s|>)/g) || [];
assert.strictEqual(entrarBtns.length, 2, 'dos botones Entrar (header + nav)');
assert.ok(/landing-login-btn/.test(entrarBtns[0]), 'header .landing-login-btn');
assert.ok(/landing-nav-login/.test(entrarBtns[1]), 'nav .landing-nav-login');
assert.ok(/id="guest-gate-login"/.test(html) && /Continuar con Google/.test(html),
  'CTA Google tras la prueba');

assert.ok(!/getClient\s*\(/.test(funnelSrc), 'guest-funnel no llama getClient');
assert.ok(/rest\/v1\/rpc\/pt_guest_funnel_ingest/.test(funnelSrc), 'ingest por fetch anon');
assert.ok(/PT_startGoogleLogin\(\);\s*if \(source === 'guest'\) trackFunnel/.test(
  landingSrc.replace(/\s+/g, ' ')
), 'OAuth de invitado antes que telemetría');
assert.ok(/startLoginNow\('guest'\)/.test(guestSrc), 'muro de registro usa startLoginNow guest');

function makeBtn() {
  const handlers = [];
  return {
    handlers: handlers,
    addEventListener: function (type, fn) {
      if (type === 'click') handlers.push(fn);
    },
    getAttribute: function () { return null; },
    setAttribute: function () {},
    focus: function () {},
    click: function () {
      handlers.forEach(function (fn) {
        fn({ preventDefault: function () {} });
      });
    }
  };
}

function runLanding() {
  const headerBtn = makeBtn();
  const navBtn = makeBtn();
  const fetches = [];
  let getClientCalls = 0;
  let oauthCalls = 0;
  let panelHidden = true;
  const sandbox = {
    window: {},
    console,
    setTimeout: function (fn) { if (typeof fn === 'function') fn(); return 1; },
    setInterval: function () { return 1; },
    clearInterval: function () {},
    fetch: function (url) {
      fetches.push(String(url || ''));
      return { catch: function () {} };
    },
    localStorage: {
      _s: {},
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._s, k) ? this._s[k] : null; },
      setItem: function (k, v) { this._s[k] = String(v); },
      removeItem: function (k) { delete this._s[k]; }
    },
    location: { href: 'https://www.pokerforgeai.com/', search: '', pathname: '/' },
    sessionStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
    document: {
      readyState: 'complete',
      body: { classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } } },
      getElementById: function (id) {
        if (id === 'auth-gate') return { id: 'auth-gate', classList: { contains: function () { return false; } } };
        if (id === 'landing-login') {
          return {
            id: 'landing-login',
            classList: {
              add: function (c) { if (c === 'hidden') panelHidden = true; },
              remove: function (c) { if (c === 'hidden') panelHidden = false; }
            },
            setAttribute: function () {},
            dataset: {},
            addEventListener: function () {}
          };
        }
        if (id === 'auth-mobile-login') return headerBtn;
        return null;
      },
      querySelector: function () { return null; },
      querySelectorAll: function (sel) {
        if (sel === '[data-landing-login]') return [headerBtn, navBtn];
        return [];
      },
      addEventListener: function () {}
    },
    PT_startGoogleLogin: function () { oauthCalls += 1; },
    PTSupabase: {
      getClient: function () {
        getClientCalls += 1;
        throw new Error('Entrar no debe usar PTSupabase.getClient');
      }
    },
    PT_SUPABASE: { url: 'https://example.supabase.co', anonKey: 'anon-test' },
    PTI18n: { t: function (k) { return k; }, apply: function () {} },
    PT_BILLING: { plans: {}, trial: {} },
    PT_SITE: {}
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(funnelSrc, ctx, { filename: 'guest-funnel.js' });
  vm.runInContext(landingSrc, ctx, { filename: 'landing.js' });
  return {
    headerBtn: headerBtn,
    navBtn: navBtn,
    fetches: fetches,
    getClientCalls: function () { return getClientCalls; },
    oauthCalls: function () { return oauthCalls; },
    panelHidden: function () { return panelHidden; },
    landing: sandbox.PTLanding
  };
}

const env = runLanding();
assert.strictEqual(env.headerBtn.handlers.length, 1, 'handler header Entrar');
assert.strictEqual(env.navBtn.handlers.length, 1, 'handler nav Entrar');

env.headerBtn.click();
assert.strictEqual(env.panelHidden(), false, 'header Entrar abre el panel');
assert.strictEqual(env.getClientCalls(), 0, 'header Entrar no llama getClient');
assert.ok(env.fetches.some(function (u) { return /pt_guest_funnel_ingest/.test(u); }),
  'header Entrar manda cta_login por fetch anon');
assert.strictEqual(env.oauthCalls(), 0, 'Entrar no dispara OAuth solo; abre el panel');

const fetchesAfterHeader = env.fetches.length;
env.landing.closeLoginPanel();
env.navBtn.click();
assert.strictEqual(env.panelHidden(), false, 'nav Entrar abre el panel');
assert.strictEqual(env.getClientCalls(), 0, 'nav Entrar no llama getClient');
assert.strictEqual(env.oauthCalls(), 0, 'nav Entrar no dispara OAuth directo');
assert.ok(env.fetches.length >= fetchesAfterHeader, 'nav no usa cliente Auth');

env.landing.startLoginNow('guest');
assert.strictEqual(env.oauthCalls(), 1, 'Continuar tras jugar dispara OAuth');
assert.strictEqual(env.getClientCalls(), 0, 'guest login no llama getClient');

console.log('*** test-entrar-buttons-pkce OK ***');
