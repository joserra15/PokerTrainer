/* Regresión: pricing de landing no debe mostrar claves i18n crudas. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const i18nSrc = fs.readFileSync(path.join(root, 'js', 'i18n.js'), 'utf8');
const landingSrc = fs.readFileSync(path.join(root, 'js', 'landing.js'), 'utf8');

assert(/el\.async\s*=\s*false/.test(indexHtml), 'early scripts deben ser async=false (orden i18n → landing)');
assert(/applyAndRefreshLanding/.test(i18nSrc), 'i18n debe refrescar la landing al cargar');
assert(/i18nReady/.test(landingSrc), 'landing no debe pintar pricing sin PTI18n');

const REQUIRED_KEYS = [
  'limits.title',
  'limits.free',
  'limits.trial',
  'limits.card',
  'plan.free',
  'plan.free.f1',
  'plan.free.f2',
  'plan.free.f3',
  'plan.free.f4',
  'plan.study.f1',
  'plan.study.f2',
  'plan.study.f3',
  'plan.study.f4',
  'plan.study.f5',
  'plan.coach.f1',
  'plan.coach.f2',
  'plan.coach.f3',
  'plan.coach.f4',
  'plan.coach.f5',
  'plan.coach.invite',
  'plan.study.beta',
  'plan.cta',
  'plan.cta.paused',
  'plan.cta.invite',
  'plan.cta.founder',
  'plan.founder.note'
];

let limitsHtml = '';
let pricingHtml = '';
const listeners = {};

function makeEl(id) {
  const el = {
    id: id || '',
    innerHTML: '',
    className: '',
    classList: { add() {}, remove() {}, toggle() {} },
    style: {},
    children: [],
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    setAttribute: function () {},
    getAttribute: function () { return null; },
    remove: function () {},
    insertBefore: function () {},
    firstChild: null,
    textContent: '',
    focus: function () {}
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () {
      if (id === 'landing-limits-box') return limitsHtml;
      if (id === 'landing-pricing-grid') return pricingHtml;
      return this._html || '';
    },
    set: function (v) {
      this._html = String(v);
      if (id === 'landing-limits-box') limitsHtml = this._html;
      if (id === 'landing-pricing-grid') pricingHtml = this._html;
    }
  });
  return el;
}

const authGate = makeEl('auth-gate');
const limitsBox = makeEl('landing-limits-box');
const pricingGrid = makeEl('landing-pricing-grid');
const byId = {
  'auth-gate': authGate,
  'landing-limits-box': limitsBox,
  'landing-pricing-grid': pricingGrid
};

const localStore = {};
const sandbox = {
  console: console,
  Date: Date,
  JSON: JSON,
  Math: Math,
  Object: Object,
  String: String,
  RegExp: RegExp,
  CustomEvent: function CustomEvent(name, opts) {
    this.type = name;
    this.detail = opts && opts.detail;
  },
  localStorage: {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null; },
    setItem: function (k, v) { localStore[k] = String(v); },
    removeItem: function (k) { delete localStore[k]; }
  },
  document: {
    readyState: 'complete',
    documentElement: { lang: 'es' },
    getElementById: function (id) { return byId[id] || null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function (type, fn) {
      (listeners[type] || (listeners[type] = [])).push(fn);
    }
  },
  setTimeout: function (fn) { return fn(); }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.window.PT_BILLING = {
  purchasesPaused: true,
  plans: {
    pro: { label: 'Study', monthly: '14,99' },
    premium: { label: 'Coach', monthly: '34,99' }
  },
  trial: { days: 10, label: 'Prueba Study 10 días' },
  founder: {
    launchLabel: '15 de noviembre de 2026',
    discount: '40%',
    seatsNote: 'plazas limitadas'
  }
};

vm.createContext(sandbox);

// Simula la carrera real: landing se ejecuta antes que i18n.
vm.runInContext(landingSrc, sandbox, { filename: 'landing.js' });
assert.strictEqual(limitsHtml, '', 'sin i18n no debe rellenar limits con claves');
assert.strictEqual(pricingHtml, '', 'sin i18n no debe rellenar pricing con claves');

vm.runInContext(i18nSrc, sandbox, { filename: 'i18n.js' });

assert.ok(sandbox.PTI18n, 'PTI18n expuesto');
REQUIRED_KEYS.forEach(function (key) {
  const val = sandbox.PTI18n.t(key, { days: 10, trial: 'Prueba Study 10 días' });
  assert.ok(val && val !== key, 'clave resuelta: ' + key);
  assert.ok(!/^(limits|plan)\./.test(val), 'texto no es clave cruda: ' + key + ' → ' + val);
});

assert.ok(limitsHtml.indexOf('limits.title') < 0, 'limits no muestra limits.title');
assert.ok(limitsHtml.indexOf('Empieza sin fricción') >= 0, 'limits muestra título traducido');
assert.ok(pricingHtml.indexOf('plan.free') < 0, 'pricing no muestra plan.free');
assert.ok(pricingHtml.indexOf('plan.cta') < 0, 'pricing no muestra plan.cta');
assert.ok(pricingHtml.indexOf('Gratis') >= 0, 'pricing muestra Gratis');
assert.ok(pricingHtml.indexOf('Empezar gratis') >= 0, 'pricing muestra CTA free traducido');
assert.ok(pricingHtml.indexOf('Compra el 15 de noviembre') >= 0, 'Study muestra CTA pausado');
assert.ok(pricingHtml.indexOf('Solo por invitación') >= 0, 'Coach muestra CTA invitación');
assert.ok(pricingHtml.indexOf('Solicitar plaza FOUNDER') >= 0 || pricingHtml.indexOf('data-founder-request') >= 0,
  'Study muestra CTA solicitud FOUNDER');
assert.ok(pricingHtml.indexOf('disabled') >= 0, 'botones de compra deshabilitados');
assert.ok(pricingHtml.indexOf('plan.free.f1') < 0, 'features free traducidas');
assert.ok(pricingHtml.indexOf('15 manos entrenador') >= 0, 'feature free f1 visible');

console.log('OK test-landing-i18n');
