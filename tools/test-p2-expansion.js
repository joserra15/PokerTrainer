/* Regresión P2: advisor umbral, session export, postflop matrix, i18n. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const localStore = {};

function makeEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    style: {},
    children: [],
    parentNode: null,
    contentWindow: null,
    contentDocument: null,
    setAttribute(k, v) {
      this[k] = v;
      if (k === 'id') this.id = v;
    },
    getAttribute(k) { return this[k] == null ? null : String(this[k]); },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      child.parentNode = null;
      return child;
    },
    addEventListener() {},
    removeEventListener() {},
    focus() {},
    click() {}
  };
  if (String(tag).toLowerCase() === 'iframe') {
    const fdoc = {
      _html: '',
      open() {},
      write(html) { this._html = String(html || ''); },
      close() {}
    };
    el.contentDocument = fdoc;
    el.contentWindow = { document: fdoc, print() {} };
  }
  return el;
}

const docChildren = [];
const documentElement = {
  lang: 'es',
  classList: {
    _set: new Set(),
    add(c) { this._set.add(c); },
    remove(c) { this._set.delete(c); },
    contains(c) { return this._set.has(c); }
  }
};

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
    createElement: (tag) => makeEl(tag),
    body: {
      appendChild(child) {
        child.parentNode = this;
        docChildren.push(child);
        return child;
      },
      removeChild(child) {
        const i = docChildren.indexOf(child);
        if (i >= 0) docChildren.splice(i, 1);
        child.parentNode = null;
        return child;
      }
    },
    documentElement,
    getElementById(id) {
      return docChildren.find((c) => c.id === id) || null;
    },
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {}
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
sandbox.window.Object = Object;
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
assert.ok(/Cerrar \/ Volver/.test(html), 'print html has back control');
assert.ok(/Imprimir \/ Guardar PDF/.test(html), 'print html has print control');
const htmlInApp = Exp.buildPrintHtml(sample, { inApp: true });
assert.ok(!/Cerrar \/ Volver/.test(htmlInApp), 'in-app html omits window close');
assert.ok(typeof Exp.shouldUseInAppPrint === 'function', 'shouldUseInAppPrint');
assert.ok(typeof Exp.closePrintOverlay === 'function', 'closePrintOverlay');
const opened = Exp.download(sample, 'pdf', { forceInApp: true });
assert.ok(opened && opened.mode === 'overlay', 'pdf opens overlay when forced');
assert.ok(sandbox.document.getElementById('session-print-overlay'), 'overlay mounted');
Exp.closePrintOverlay();
assert.ok(!sandbox.document.getElementById('session-print-overlay'), 'overlay closed');

const RM = sandbox.window.PTRangeMatrix;
assert.ok(RM.buildPostflopExplorerInput, 'buildPostflopExplorerInput');
assert.ok(RM.parseBoardText('As Kd 7c').length === 3, 'parse board');
assert.ok(RM.POSTFLOP_STREETS && RM.POSTFLOP_STREETS.flop.cards === 3, 'flop cards');
assert.ok(RM.POSTFLOP_STREETS.turn.cards === 4, 'turn cards');
assert.ok(RM.POSTFLOP_STREETS.river.cards === 5, 'river cards');
const pf = RM.buildPostflopExplorerInput({
  heroPos: 'BB', villainPos: 'BTN', board: 'As Kd 7c', potBB: 6, toCallBB: 0
});
assert.ok(pf && pf.street === 'flop' && pf.board.length === 3, 'postflop input');
assert.ok(RM.EXPLORER_SPOTS.postflop, 'postflop spot chip');

const bad = RM.buildPostflopExplorerInput({ board: 'As Kd' });
assert.strictEqual(bad, null, 'needs 3 cards');

const turnOk = RM.buildPostflopExplorerInput({
  street: 'turn', board: 'As Kd 7c 2h', heroPos: 'BB', villainPos: 'BTN'
});
assert.ok(turnOk && turnOk.street === 'turn' && turnOk.board.length === 4, 'turn input');
const turnBad = RM.buildPostflopExplorerInput({ street: 'turn', board: 'As Kd 7c' });
assert.strictEqual(turnBad, null, 'turn needs 4 cards');

const riverOk = RM.buildPostflopExplorerInput({
  street: 'river', board: 'As Kd 7c 2h 9s', heroPos: 'BB', villainPos: 'BTN'
});
assert.ok(riverOk && riverOk.street === 'river' && riverOk.board.length === 5, 'river input');
const riverBad = RM.buildPostflopExplorerInput({ street: 'river', board: 'As Kd 7c 2h' });
assert.strictEqual(riverBad, null, 'river needs 5 cards');

console.log('OK test-p2-expansion');
