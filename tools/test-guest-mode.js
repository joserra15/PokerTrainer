/* Guest mode: persistencia, límite 5, merge. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const localStore = {};
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
  document: {
    readyState: 'complete',
    getElementById: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {}
  },
  addEventListener: function () {},
  dispatchEvent: function () { return true; },
  CustomEvent: function (name, opts) { this.type = name; this.detail = opts && opts.detail; }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
sandbox.document.body = { classList: { toggle: function () {}, add: function () {}, remove: function () {} } };
vm.createContext(sandbox);

vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'js/guest-traps.js'), 'utf8'),
  sandbox,
  { filename: 'guest-traps.js' }
);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'js/guest-mode.js'), 'utf8'),
  sandbox,
  { filename: 'guest-mode.js' }
);

const G = sandbox.window.PTGuest;
const T = sandbox.window.PTGuestTraps;
assert.ok(G && T, 'PTGuest + traps');
assert.strictEqual(T.list().length, 5);
sandbox.window.PTAuth = {
  enterGuest: function () {},
  getUser: function () { return { isGuest: true, sub: 'pt_guest_local' }; }
};
G.enter();
assert.ok(G.isActive(), 'guest activo');
assert.strictEqual(G.remaining(), 5);

G.recordDecision({ class: 'error', action: 'call', best: 'fold' });
assert.strictEqual(G.remaining(), 4);
assert.strictEqual(G.score().total, 1);
assert.strictEqual(G.score().good, 0);
assert.ok(G.hasProgress());

G.recordDecision({ class: 'optima', action: 'fold', best: 'fold', street: 'preflop' });
assert.strictEqual(G.score().good, 1);
assert.strictEqual(G.streetScore().by.preflop.n, 2);

G.afterHandFinished({
  decisions: [
    { street: 'preflop', class: 'optima', action: 'raise', best: 'raise' },
    { street: 'flop', class: 'error', action: 'call', best: 'fold' }
  ]
});
assert.strictEqual(G.remaining(), 2);
assert.strictEqual(G.streetScore().by.flop.n, 1);
assert.strictEqual(G.streetScore().by.flop.good, 0);

let migrated = null;
sandbox.window.Store = {
  migrateLocalUserKeys: function (from, to) { migrated = [from, to]; return { moved: 1 }; }
};
const merged = G.mergeIntoUser('user-abc');
assert.ok(merged.merged, 'merge guest→cuenta si el destino está vacío');
assert.deepStrictEqual(migrated, ['pt_guest_local', 'user-abc']);
assert.ok(!G.hasProgress(), 'estado guest se limpia al convertir');
assert.ok(!G.wantsEnter(), 'tras merge no se reabre invitado');

G.enter();
G.recordDecision({ class: 'error', action: 'call', best: 'fold' });
localStore['pt_history_v1_user-busy'] = '[{"id":"old"}]';
migrated = null;
const skipped = G.mergeIntoUser('user-busy');
assert.strictEqual(skipped.merged, false, 'no pisa historial de cuenta existente');
assert.strictEqual(migrated, null);

assert.strictEqual(typeof G.returnToLanding, 'function', 'returnToLanding exportado');
G.enter();
assert.ok(G.wantsEnter(), 'guest activo antes de volver al inicio');
G.clear();
assert.ok(!G.wantsEnter(), 'clear quita el flag para no reabrir invitado');

const src = fs.readFileSync(path.join(__dirname, '..', 'js/guest-mode.js'), 'utf8');
assert.ok(/guest_start/.test(src) && /guest_hand/.test(src) && /guest_gate_shown/.test(src) && /guest_convert/.test(src), 'eventos L3');
assert.ok(/migrateLocalUserKeys/.test(src), 'merge guest→cuenta');
assert.ok(/returnToLanding/.test(src) && /data-guest-landing/.test(src), 'Volver al inicio');

const landing = fs.readFileSync(path.join(__dirname, '..', 'js/landing.js'), 'utf8');
assert.ok(/landing_view/.test(landing) && /cta_try/.test(landing) && /cta_login/.test(landing), 'eventos landing');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.ok(/data-landing-try/.test(html), 'CTA probar');
assert.ok(!/Probar ahora — sin registro/.test(html), 'CTA sin “sin registro”');
const heroHtml = html.split('id="landing-hero"')[1].split('id="landing-how"')[0];
assert.ok(!/sin tarjeta/.test(heroHtml), 'hero sin “sin tarjeta”');
assert.ok(!/instinto recreativo/.test(heroHtml), 'hero sin “instinto recreativo”');
assert.ok(!/landing-felt/.test(html), 'hero sin mock de mesa');
assert.ok(!/landing-hero-bullets/.test(html), 'hero sin bullets de producto');
assert.ok(/Serás capaz de jugar estas manos correctamente/.test(html), 'reto en el hero');
assert.ok(/entrenador IA 24\/7/.test(html) && /how\.s3\.body/.test(html), 'paso 3: registro y estudio completo');
assert.ok(!/trampas/.test(html.match(/guest-mode-banner[\s\S]{0,280}/)[0]), 'banner sin trampas');
assert.ok(/guest-gate-streets/.test(html), 'resumen por calle');
assert.ok(/guest-gate-modal/.test(html), 'modal gate');
assert.ok(/id="guest-gate-login"[^>]*>Continuar con Google/.test(html), 'CTA Google en resumen');
const gateActions = html.match(/guest-gate-actions[\s\S]*?<\/div>/)[0];
assert.ok(/data-guest-landing/.test(gateActions) && /Volver al inicio/.test(gateActions), 'segundo botón vuelve a la landing');
assert.ok(!/>Cerrar</.test(gateActions), 'resumen sin Cerrar');
assert.ok(/¿Aciertas las cinco manos, del preflop al river\?/.test(html) && /how\.s1\.body/.test(html), 'paso 1: reto preflop→river');
assert.ok(!/as débil/.test(html) && !/broadway offsuit/.test(html), 'paso 1 sin lista de spots viejos');
assert.ok(/guest-mode-banner/.test(html), 'banner guest');
assert.ok(/js\/guest-mode\.js/.test(html) && /js\/guest-traps\.js/.test(html), 'scripts early');

const i18n = fs.readFileSync(path.join(__dirname, '..', 'js/i18n.js'), 'utf8');
assert.ok(/¿Aciertas las cinco manos, del preflop al river\?/.test(i18n) && /from preflop to river/.test(i18n), 'i18n how.s1 reto');
assert.ok(!/instinto recreativo/.test(i18n) && !/recreational instincts/.test(i18n), 'i18n sin instinto recreativo');

console.log('*** guest-mode OK ***');
