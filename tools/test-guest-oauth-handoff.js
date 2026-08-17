/* Tras las 5 manos, el retorno de Google no debe reabrir el resumen invitado. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const guestSrc = fs.readFileSync(path.join(root, 'js/guest-mode.js'), 'utf8');
const trapsSrc = fs.readFileSync(path.join(root, 'js/guest-traps.js'), 'utf8');
const authSrc = fs.readFileSync(path.join(root, 'js/auth.js'), 'utf8');
const bootSrc = fs.readFileSync(path.join(root, 'js/auth-bootstrap.js'), 'utf8');
const ageSrc = fs.readFileSync(path.join(root, 'js/age-gate.js'), 'utf8');

assert.ok(/oauthHandoffPending\(\) \|\| hasRealUser\(\)/.test(guestSrc),
  'wantsEnter/isActive ignoran invitado durante OAuth o cuenta real');
assert.ok(/if \(oauthHandoffPending\(\) \|\| hasRealUser\(\)\) return;/.test(guestSrc),
  'showGate/startTraps no corren en el retorno de Google');
assert.ok(/pt_oauth_handoff/.test(guestSrc) && /markOAuthHandoff/.test(guestSrc),
  'flag de entrega OAuth en sessionStorage');

const enterGuestFn = authSrc.split('function enterGuest()')[1].split('async function enterApp')[0];
assert.ok(/oauthHandoffPending\(\)\) return/.test(enterGuestFn),
  'enterGuest no pisa el login de Google');

const requireFn = authSrc.split('function requireAuth(')[1].split('function bindUi()')[0];
assert.ok(/oauthHandoffPending\(\)/.test(requireFn),
  'requireAuth espera el callback OAuth en vez de reabrir invitado');

const runEnter = authSrc.split('async function runEnterApp(')[1].split('function setupGsiButton')[0];
assert.ok(runEnter.indexOf('hideGuestChrome') < runEnter.indexOf('ensureConfirmed'),
  'enterApp oculta el muro invitado antes del age-gate');

const enterBoot = bootSrc.split('async function enterFromBootstrap(')[1].split('function trackAuthFlow')[0];
assert.ok(enterBoot.indexOf('saveLegacySession') < enterBoot.indexOf('dispatchEvent'),
  'bootstrap guarda sesión antes de avisar a auth.js');
assert.ok(enterBoot.indexOf('saveLegacySession') < enterBoot.indexOf('ensureConfirmed'),
  'bootstrap no espera el age-gate antes de persistir la cuenta');
assert.ok(/if \(hasOAuthCallback\(\)\) \{\s*markHandoff\(\);\s*hideGuestChrome\(\);/.test(
  bootSrc.replace(/\s+/g, ' ')
), 'boot marca handoff y quita chrome invitado al ver ?code=');

assert.ok(/account \|\| legalEmail/.test(ageSrc),
  'age-gate muestra el email de la cuenta cuando existe');

function makeSandbox(href) {
  const localStore = {};
  const sessionStore = {};
  const bodyClasses = new Set();
  let gateHidden = true;
  const sandbox = {
    window: {},
    console,
    setTimeout: function (fn) { if (typeof fn === 'function') fn(); return 1; },
    setInterval: function () { return 1; },
    clearInterval: function () {},
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
    location: { href: href, search: href.split('?')[1] ? '?' + href.split('?')[1].split('#')[0] : '', pathname: '/' },
    document: {
      readyState: 'complete',
      getElementById: function (id) {
        if (id === 'guest-gate-modal') {
          return {
            classList: {
              remove: function (c) { if (c === 'hidden') gateHidden = false; },
              add: function (c) { if (c === 'hidden') gateHidden = true; }
            }
          };
        }
        if (id === 'guest-gate-score' || id === 'guest-gate-streets' || id === 'guest-gate-age' || id === 'guest-gate-login') {
          return { textContent: '', disabled: true, innerHTML: '', dataset: {}, addEventListener: function () {} };
        }
        if (id === 'pt-gsi-client') return { id: id };
        return {
          id: id,
          classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
          setAttribute: function () {},
          removeAttribute: function () {},
          querySelector: function () { return { textContent: '' }; },
          textContent: '',
          hidden: true
        };
      },
      createElement: function (tag) {
        return { tagName: tag, id: '', src: '', async: true };
      },
      head: { appendChild: function () {} },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      addEventListener: function () {},
      body: {
        classList: {
          add: function (c) { bodyClasses.add(c); },
          remove: function (c) { bodyClasses.delete(c); },
          toggle: function (c, on) { if (on) bodyClasses.add(c); else bodyClasses.delete(c); },
          contains: function (c) { return bodyClasses.has(c); }
        }
      }
    },
    addEventListener: function () {},
    dispatchEvent: function () { return true; },
    CustomEvent: function (name, opts) { this.type = name; this.detail = opts && opts.detail; }
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  sandbox._gateHidden = function () { return gateHidden; };
  sandbox._bodyClasses = bodyClasses;
  sandbox._localStore = localStore;
  sandbox._sessionStore = sessionStore;
  vm.createContext(sandbox);
  return sandbox;
}

const oauthHref = 'https://www.pokerforgeai.com/?code=pkce-test&state=xyz';
const sandbox = makeSandbox(oauthHref);
vm.runInContext(trapsSrc, sandbox, { filename: 'guest-traps.js' });
vm.runInContext(guestSrc, sandbox, { filename: 'guest-mode.js' });

const G = sandbox.window.PTGuest;
assert.ok(G.hasOAuthCallback(), 'detecta ?code=');
assert.ok(G.oauthHandoffPending(), 'handoff pendiente con callback');
assert.strictEqual(sandbox._sessionStore.pt_oauth_handoff, '1', 'marca sessionStorage');

sandbox._localStore.pt_guest_v1 = JSON.stringify({
  active: true,
  hands: [
    { class: 'optima', street: 'preflop' },
    { class: 'optima', street: 'preflop' },
    { class: 'optima', street: 'preflop' },
    { class: 'optima', street: 'preflop' },
    { class: 'optima', street: 'preflop' }
  ],
  startedAt: Date.now(),
  gateShown: true,
  index: 5
});

assert.strictEqual(G.remaining(), 0, '5/5 jugadas');
assert.ok(!G.wantsEnter(), 'no reabre invitado con ?code=');
assert.ok(!G.isActive(), 'guest inactivo durante OAuth');

let played = false;
sandbox.window.Engine = {};
sandbox.window.playAnalysisHand = function () { played = true; };
G.startTraps();
assert.ok(!played, 'no relanza trampas en el callback');
G.showGate('limit');
assert.ok(sandbox._gateHidden(), 'no muestra Resumen de tu prueba');

G.clearOAuthHandoff();
sandbox.location.href = 'https://www.pokerforgeai.com/';
sandbox.location.search = '';
assert.ok(G.wantsEnter(), 'sin callback, la prueba 5/5 sigue disponible');

const authBox = makeSandbox(oauthHref);
authBox._timers = [];
authBox.setTimeout = function (fn) {
  if (typeof fn === 'function') authBox._timers.push(fn);
  return 1;
};
authBox.window.setTimeout = authBox.setTimeout;
authBox.matchMedia = function () {
  return { matches: false, addEventListener: function () {}, addListener: function () {} };
};
authBox.window.matchMedia = authBox.matchMedia;
authBox.window.PTGuest = {
  wantsEnter: function () { return true; },
  oauthHandoffPending: function () { return true; },
  hideGate: function () { authBox._hidGate = true; },
  applyChrome: function (on) { authBox._chrome = on; },
  startTraps: function () { authBox._traps = true; },
  guestUser: function () {
    return { sub: 'pt_guest_local', email: '', name: 'Invitado', isGuest: true, loginAt: Date.now() };
  }
};
authBox.PTGuest = authBox.window.PTGuest;
vm.runInContext(authSrc, authBox, { filename: 'auth.js' });
authBox.window.PTAuth.requireAuth(function () {});
assert.ok(!authBox._bodyClasses.has('guest-mode'), 'requireAuth no entra en guest-mode con OAuth pendiente');
assert.strictEqual(authBox._chrome, false, 'requireAuth oculta el chrome invitado al esperar Google');
assert.ok(!authBox._traps, 'no arranca trampas mientras vuelve Google');
assert.ok(authBox._timers.length > 0, 'espera el intercambio PKCE');

console.log('*** guest-oauth-handoff OK ***');
