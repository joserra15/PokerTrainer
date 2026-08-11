/* Regresión: CTAs [data-landing-login] deben iniciar OAuth (no solo scroll).
 * En desktop el panel ya está sticky/visible; scrollToLogin parece un no-op. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const landingSrc = fs.readFileSync(path.join(root, 'js', 'landing.js'), 'utf8');

assert(
  /querySelectorAll\('\[data-landing-login\]'\)[\s\S]{0,280}?startLoginNow\(\)/.test(landingSrc),
  '[data-landing-login] debe llamar startLoginNow()'
);

const clickHandlers = [];
const loginBtn = {
  addEventListener: function (type, fn) {
    if (type === 'click') clickHandlers.push(fn);
  },
  getAttribute: function () { return null; },
  setAttribute: function () {},
  focus: function () {}
};

const listeners = {};
let oauthCalls = 0;

const sandbox = {
  window: {},
  console,
  setTimeout: function (fn) { return setTimeout(fn, 0); },
  document: {
    readyState: 'complete',
    getElementById: function (id) {
      if (id === 'auth-gate') return { id: 'auth-gate' };
      if (id === 'landing-login') {
        return {
          id: 'landing-login',
          classList: { add: function () {}, remove: function () {} },
          scrollIntoView: function () {},
          insertBefore: function () {},
          firstChild: null
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
    addEventListener: function (type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    }
  },
  PT_startGoogleLogin: function () { oauthCalls += 1; },
  PTI18n: { t: function (k) { return k; }, apply: function () {} },
  PT_BILLING: { plans: {}, trial: {} },
  PT_SITE: {}
};
sandbox.window = sandbox;
sandbox.global = sandbox;

vm.runInContext(landingSrc, vm.createContext(sandbox), { filename: 'landing.js' });

assert.ok(sandbox.PTLanding, 'PTLanding exportado');
assert.strictEqual(clickHandlers.length, 1, 'handler click en Entrar');

const fakeEvent = { preventDefault: function () { this.prevented = true; }, prevented: false };
clickHandlers[0](fakeEvent);
assert.ok(fakeEvent.prevented, 'preventDefault en click Entrar');
assert.strictEqual(oauthCalls, 1, 'Entrar debe llamar PT_startGoogleLogin');

console.log('*** landing-login-cta OK ***');
