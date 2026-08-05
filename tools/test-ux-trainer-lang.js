/* Regresión UX: chips modo avisador, i18n active, popup bloque. */
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
I18n.syncLangButtons(root);
assert.ok(buttons[1].classList._on, 'EN button active');
assert.ok(!buttons[0].classList._on, 'ES button inactive');

const LA = sandbox.window.PTLiveAdvisor;
LA.saveMode('serious');
assert.strictEqual(LA.loadMode(), 'serious');
LA.saveThreshold('');
assert.strictEqual(LA.loadThreshold(), 0.5, 'empty threshold resets to default');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.ok(/id="setup-advisor-mode"[\s\S]*setup-chip[\s\S]*data-val="always"/.test(html), 'advisor mode uses chips');
assert.ok(!/<select id="setup-advisor-mode">/.test(html), 'no native select for advisor mode');

const app = fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8');
assert.ok(/function openSessionBlockPopup/.test(app), 'block popup exists');
assert.ok(/openSessionBlockPopup\(target\)/.test(app), 'block popup called on finish');

console.log('OK test-ux-trainer-lang');
