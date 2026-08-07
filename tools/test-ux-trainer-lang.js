/* Regresión UX: chips modo avisador, i18n active, popup bloque, alerta umbral. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const localStore = {};
const sandbox = {
  window: {},
  console,
  Math,
  Date,
  JSON,
  Number,
  String,
  Object,
  Array,
  CustomEvent: function (name, opts) { this.type = name; this.detail = opts && opts.detail; },
  document: {
    readyState: 'complete',
    documentElement: { lang: 'es' },
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
sandbox.window.document = sandbox.document;
vm.createContext(sandbox);

function load(rel) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'), sandbox, { filename: rel });
}

load('js/i18n.js');
load('js/live-advisor.js');

const I18n = sandbox.window.PTI18n;
assert.ok(I18n.syncLangButtons, 'syncLangButtons exported');

const buttons = [
  { getAttribute: (a) => (a.indexOf('lang') >= 0 ? 'es' : null), classList: { _on: false, toggle(n, v) { if (n === 'active') this._on = !!v; }, contains(n) { return n === 'active' && this._on; } }, setAttribute() {}, className: '' },
  { getAttribute: (a) => (a.indexOf('lang') >= 0 ? 'en' : null), classList: { _on: false, toggle(n, v) { if (n === 'active') this._on = !!v; }, contains(n) { return n === 'active' && this._on; } }, setAttribute() {}, className: '' }
];
buttons[0].getAttribute = (a) => (a === 'data-set-lang' || a === 'data-settings-lang' ? 'es' : null);
buttons[1].getAttribute = (a) => (a === 'data-set-lang' || a === 'data-settings-lang' ? 'en' : null);

const root = {
  querySelectorAll: (sel) => {
    if (sel.indexOf('data-set-lang') >= 0 || sel.indexOf('data-settings-lang') >= 0 || sel.indexOf('data-i18n') >= 0) {
      if (sel.indexOf('data-i18n') >= 0 && sel.indexOf('lang') < 0) return [];
      return buttons;
    }
    return [];
  }
};
I18n.setLang('en');
assert.strictEqual(I18n.getLang(), 'es', 'language locked to Spanish');
assert.ok(I18n.isLangLocked && I18n.isLangLocked(), 'isLangLocked');
assert.strictEqual(I18n.t('advisor.silent'), 'Modo silencio');
assert.strictEqual(I18n.t('tab.play'), 'Entrenar');
assert.ok(/Solo aviso si EV perdido/.test(I18n.t('advisor.silentHint', { n: '2.00' })), 'ES silent hint');
I18n.setLang('es');
assert.strictEqual(I18n.t('advisor.silent'), 'Modo silencio');
assert.strictEqual(I18n.t('play.pot'), 'Bote');

const LA = sandbox.window.PTLiveAdvisor;
LA.saveMode('serious');
assert.strictEqual(LA.loadMode(), 'serious');
LA.saveThreshold('');
assert.strictEqual(LA.loadThreshold(), 0.5, 'empty threshold resets to default');
LA.saveThreshold(2);
assert.strictEqual(LA.loadThreshold(), 2);
assert.ok(!LA.shouldWarn(1.5, 'serious', 2), 'below threshold stays silent');
assert.ok(LA.shouldWarn(3.5, 'serious', 2), 'above threshold warns');
assert.ok(LA.recordSeriousAlert, 'recordSeriousAlert exported');
const alert = LA.recordSeriousAlert({
  street: 'preflop',
  label: 'Cold 4-bet a 23bb',
  class: 'error',
  evLoss: 3.5
}, 2);
assert.ok(alert, 'alert recorded');
assert.strictEqual(alert.evLoss, 3.5);
assert.strictEqual(LA.getPendingAlert().evLoss, 3.5);

const host = {
  classList: {
    _c: { hidden: true },
    add(n) { this._c[n] = true; },
    remove(n) { delete this._c[n]; },
    contains(n) { return !!this._c[n]; },
    toggle(n, on) { if (on) this.add(n); else this.remove(n); }
  },
  innerHTML: ''
};
LA.update(host, { stage: 'flop', current: { potBB: 80 } }, true);
assert.ok(host.classList.contains('live-advisor-alert'), 'panel shows alert after serious leak');
assert.ok(/Aviso grave|Serious alert/.test(host.innerHTML) || /3\.5/.test(host.innerHTML), 'alert content rendered');
assert.ok(!host.classList.contains('hidden'), 'alert panel visible');

LA.clearPendingAlert();
LA.update(host, { stage: 'flop', current: { potBB: 80 } }, true);
assert.ok(host.classList.contains('live-advisor-silent'), 'back to silent without pending alert');
assert.ok(/Modo silencio|Silent mode/.test(host.innerHTML) || /2/.test(host.innerHTML), 'silent badge shown');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.ok(/id="setup-advisor-mode"[\s\S]*setup-chip[\s\S]*data-val="always"/.test(html), 'advisor mode uses chips');
assert.ok(!/<select id="setup-advisor-mode">/.test(html), 'no native select for advisor mode');
assert.ok(/data-i18n="tab\.play"/.test(html), 'tabs have i18n');
assert.ok(/data-i18n="play\.session"/.test(html), 'session labels have i18n');

const app = fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8');
assert.ok(/function openSessionBlockPopup/.test(app), 'block popup exists');
assert.ok(/openSessionBlockPopup\(target\)/.test(app), 'block popup called on finish');
assert.ok(/recordSeriousAlert/.test(app), 'app records serious alerts');
assert.ok(/syncAdvisorSettingsToSession/.test(app), 'settings sync to live session');

console.log('OK test-ux-trainer-lang');
