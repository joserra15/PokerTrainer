/* Presets de Entrenador: guardar / aplicar / borrar (local por usuario). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const storageSrc = fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
const help = fs.readFileSync(path.join(root, 'js/help.js'), 'utf8');
const ci = fs.readFileSync(path.join(root, 'tools/run-ci-tests.js'), 'utf8');

assert.ok(/PT_BUILD\s*=\s*'2.7.29'/.test(version), 'versión 2.7.29');
assert.ok(/id="setup-user-presets"/.test(html), 'host Mis presets');
assert.ok(/id="setup-preset-save"/.test(html) && /id="setup-preset-name"/.test(html), 'UI guardar preset');
assert.ok(/function saveCurrentPlayPreset/.test(app) && /function renderUserPlayPresets/.test(app), 'app save/render');
assert.ok(/Store\.savePlayPreset/.test(app) && /Store\.removePlayPreset/.test(app), 'app usa Store presets');
assert.ok(/getPlayPresets/.test(storageSrc) && /savePlayPreset/.test(storageSrc) && /removePlayPreset/.test(storageSrc),
  'Store API play presets');
assert.ok(/setup-preset-save-row/.test(css), 'CSS fila guardar');
assert.ok(/Presets/.test(help), 'help menciona presets');
assert.ok(/test-trainer-presets\.js/.test(ci), 'registrado en test:ci');

const localStore = {};
const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Set,
  Map,
  JSON,
  Number,
  String,
  Object,
  Array,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; },
    clear: () => { Object.keys(localStore).forEach((k) => delete localStore[k]); },
    get length() { return Object.keys(localStore).length; },
    key: (i) => Object.keys(localStore)[i] || null
  }
};
sandbox.global = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
vm.createContext(sandbox);
vm.runInContext(storageSrc, sandbox, { filename: 'storage.js' });

const Store = sandbox.window.Store;
assert.ok(Store && Store.savePlayPreset && Store.removePlayPreset, 'Store expuesto');
Store.setUserId('user-presets');

assert.strictEqual(Store.getPlayPresets().length, 0, 'lista vacía');

const cfg = {
  formatHub: 'spin',
  gameType: 'spin3',
  stackDepth: 'bb25',
  scenario: 'steal',
  villainLevel: 'pro',
  heroPos: 'BTN',
  handRange: 'borderline',
  practiceStreet: 'preflop',
  spinPayout: '3x',
  mttPhase: 'auto'
};
const saved = Store.savePlayPreset('  Spin BTN  ', cfg);
assert.ok(saved.ok && saved.preset && saved.preset.id, 'save ok');
assert.strictEqual(saved.preset.name, 'Spin BTN', 'trim nombre');
assert.strictEqual(Store.getPlayPresets().length, 1);
assert.strictEqual(Store.getPlayPreset(saved.preset.id).config.scenario, 'steal');

const empty = Store.savePlayPreset('   ', cfg);
assert.ok(!empty.ok && empty.reason === 'empty_name', 'nombre vacío rechazado');

const again = Store.savePlayPreset('spin btn', Object.assign({}, cfg, { stackDepth: 'bb15' }));
assert.ok(again.ok, 'overwrite por nombre');
assert.strictEqual(Store.getPlayPresets().length, 1, 'no duplica por nombre');
assert.strictEqual(again.preset.id, saved.preset.id, 'mismo id al overwrite');
assert.strictEqual(Store.getPlayPreset(again.preset.id).config.stackDepth, 'bb15');

Store.savePlayPreset('Cash 3bet', { formatHub: 'cash', gameType: 'cash6', scenario: '3bet' });
assert.strictEqual(Store.getPlayPresets().length, 2);

const rm = Store.removePlayPreset(again.preset.id);
assert.ok(rm.ok, 'borrar ok');
assert.strictEqual(Store.getPlayPresets().length, 1);
assert.ok(!Store.getPlayPreset(again.preset.id), 'ya no existe');
assert.strictEqual(Store.getPlayPresets()[0].name, 'Cash 3bet');

console.log('*** trainer-presets OK ***');
