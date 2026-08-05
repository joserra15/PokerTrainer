/* Regresión P2: advisor umbral, session export, postflop matrix, i18n. */
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
  Set,
  Map,
  JSON,
  parseFloat,
  parseInt,
  isNaN,
  Number,
  String,
  Object,
  Array,
  Promise,
  Blob: function (parts, opts) { this.parts = parts; this.type = (opts && opts.type) || ''; },
  URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
  document: {
    createElement: () => ({ click() {}, style: {}, setAttribute() {}, appendChild() {} }),
    body: { appendChild() {}, removeChild() {} },
    querySelectorAll: () => [],
    documentElement: { lang: 'es' }
  },
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  }
};
sandbox.global = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
sandbox.window.document = sandbox.document;
vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

// Minimal stubs for play-config
sandbox.window.GTORangesNotation = {};
sandbox.window.GTORangesData = { OPEN_RAISE: {}, VS_RFI: {}, VS_3BET: {}, BROAD_CONTINUE: '22+,A2s+' };
sandbox.window.GTORangesWeights = { fromSets: () => ({}), rangeString: () => '' };
sandbox.window.GTOEquity = {};

load('js/i18n.js');
load('js/live-advisor.js');
load('js/play-config.js');
load('js/session-export.js');
load('js/range-matrix.js');

const I18n = sandbox.window.PTI18n;
assert.ok(I18n, 'PTI18n');
assert.strictEqual(I18n.t('nav.login'), 'Entrar');
I18n.setLang('en');
assert.strictEqual(I18n.getLang(), 'es', 'lang locked to es');
assert.strictEqual(I18n.t('nav.login'), 'Entrar');
I18n.setLang('es');
assert.strictEqual(I18n.getLang(), 'es');

const LA = sandbox.window.PTLiveAdvisor;
assert.ok(LA.shouldWarn, 'shouldWarn');
assert.strictEqual(LA.DEFAULT_THRESHOLD, 0.5);
LA.saveMode('always');
assert.ok(LA.shouldWarn(0.1), 'always warns small');
LA.saveMode('serious');
LA.saveThreshold(0.5);
assert.ok(!LA.shouldWarn(0.2), 'serious skips 0.2');
assert.ok(LA.shouldWarn(0.8), 'serious warns 0.8');
assert.ok(!LA.isPreActionVisible('serious'), 'no pre-action in serious');
assert.ok(LA.isPreActionVisible('always'), 'pre-action in always');

const PC = sandbox.window.PTPlayConfig;
const cfg = PC.normalize({ liveAdvisor: true, advisorMode: 'serious', seriousEvThreshold: 1 });
assert.strictEqual(cfg.advisorMode, 'serious');
assert.strictEqual(cfg.seriousEvThreshold, 1);

const Exp = sandbox.window.PTSessionExport;
assert.ok(Exp, 'PTSessionExport');
const sample = {
  fileName: 'test.txt',
  hero: 'Hero',
  stats: { nHands: 2, netBB: -3, accuracy: 50, evLossBB: 4.5, grade: { letter: 'C', score: 5 } },
  hands: [
    { id: 'h1', heroCode: 'AKs', heroPos: 'BTN', heroNetBB: -2, totalEvLoss: 1.5, accuracy: 0, worstClass: 'error',
      decisions: [{ street: 'flop', chosen: 'call', best: 'fold', class: 'error', evLoss: 1.5 }] },
    { id: 'h2', heroCode: '72o', heroPos: 'BB', heroNetBB: -1, totalEvLoss: 0, accuracy: 100, worstClass: 'optima', decisions: [] }
  ]
};
const json = Exp.buildJson(sample);
assert.strictEqual(json.hands.length, 2);
const jsonErr = Exp.buildJson(sample, { errorsOnly: true });
assert.strictEqual(jsonErr.hands.length, 1);
const csv = Exp.buildCsv(sample);
assert.ok(csv.indexOf('handId') === 0, 'csv header');
assert.ok(csv.indexOf('AKs') >= 0, 'csv has hand');
const html = Exp.buildPrintHtml(sample);
assert.ok(/Informe de sesión/.test(html), 'print html');

const RM = sandbox.window.PTRangeMatrix;
assert.ok(RM.buildPostflopExplorerInput, 'buildPostflopExplorerInput');
assert.ok(RM.parseBoardText('As Kd 7c').length === 3, 'parse board');
const pf = RM.buildPostflopExplorerInput({
  heroPos: 'BB', villainPos: 'BTN', board: 'As Kd 7c', potBB: 6, toCallBB: 0
});
assert.ok(pf && pf.street === 'flop' && pf.board.length === 3, 'postflop input');
assert.ok(RM.EXPLORER_SPOTS.postflop, 'postflop spot chip');

const bad = RM.buildPostflopExplorerInput({ board: 'As Kd' });
assert.strictEqual(bad, null, 'needs 3 cards');

console.log('OK test-p2-expansion');
