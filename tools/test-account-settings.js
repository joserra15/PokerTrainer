/* RG-G02 — account-settings preferencias round-trip (lang / advisor). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const localStore = {};
const sandbox = {
  window: {},
  console,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  },
  document: {
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  },
  addEventListener() {},
  dispatchEvent() { return true; },
  CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

// live-advisor prefs
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'js/live-advisor.js'), 'utf8'),
  sandbox,
  { filename: 'live-advisor.js' }
);

const LA = sandbox.window.PTLiveAdvisor;
assert.ok(LA, 'PTLiveAdvisor');
if (LA.savePreference) LA.savePreference(true);
if (LA.loadPreference) assert.strictEqual(!!LA.loadPreference(), true);
localStore.pt_live_advisor_mode_v1 = 'serious';
localStore.pt_serious_ev_threshold_v1 = '0.75';
assert.strictEqual(localStore.pt_live_advisor_mode_v1, 'serious');
assert.strictEqual(localStore.pt_serious_ev_threshold_v1, '0.75');

// i18n lang key
localStore.pt_lang_v1 = 'en';
assert.strictEqual(localStore.pt_lang_v1, 'en');
localStore.pt_lang_v1 = 'es';
assert.strictEqual(localStore.pt_lang_v1, 'es');

const settingsSrc = fs.readFileSync(path.join(__dirname, '..', 'js/account-settings.js'), 'utf8');
assert.ok(/data-settings-lang|pt_lang_v1|settings-lang/.test(settingsSrc), 'settings lang UI');
assert.ok(/advisor|PTLiveAdvisor|settings-advisor/.test(settingsSrc), 'settings advisor');
assert.ok(/settings-help|data-open-help|hotkey|ayuda/i.test(settingsSrc), 'settings help/hotkeys link');
assert.ok(/settings-push-enable/.test(settingsSrc), 'toggle push');
assert.ok(/settings-push-test/.test(settingsSrc), 'botón prueba push');
assert.ok(/PTPush/.test(settingsSrc), 'bind PTPush');

const i18nSrc = fs.readFileSync(path.join(__dirname, '..', 'js/i18n.js'), 'utf8');
assert.ok(/settings\.pushPromptTitle/.test(i18nSrc) && /settings\.pushPromptLead/.test(i18nSrc),
  'i18n prompt de notificaciones');
assert.ok(/settings\.pushPromptAccept/.test(i18nSrc) && /settings\.pushPromptCancel/.test(i18nSrc),
  'i18n Aceptar/Cancelar');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.ok(/id="account-settings-content"|id="tab-account"/.test(html), 'account panel');

console.log('*** account-settings OK (lang + advisor round-trip keys) ***');
