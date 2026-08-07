/* Regresión P1: leaks queue, sizing, favorites, free AI limits, what-if API. */
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
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  }
};
sandbox.global = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

load('js/entitlements.js');
load('js/leaks.js');
load('js/storage.js');
load('js/range-matrix.js');

const Ent = sandbox.window.PTEntitlements;
assert.ok(Ent, 'PTEntitlements');
const freeLim = Ent.DEFAULT_LIMITS
  ? Ent.DEFAULT_LIMITS.free
  : (Ent._testDefaults && Ent._testDefaults().free);
const limits = sandbox.window.PTEntitlements && (function () {
  // DEFAULT_LIMITS is module-private; use localFallback via get/refresh pattern
  const st = Ent.get ? Ent.get() : null;
  if (st && st.limits) return st.limits;
  return null;
})();

// Free AI trial: client default must be 3
const entSrc = fs.readFileSync(path.join(__dirname, '..', 'js/entitlements.js'), 'utf8');
assert.ok(/free:\s*\{[\s\S]*?ai_reports_per_month:\s*3/.test(entSrc), 'free ai_reports_per_month = 3');
const mig = fs.readFileSync(path.join(__dirname, '..', 'supabase/migrations/035_free_ai_trial_quota.sql'), 'utf8');
assert.ok(/ai_reports_per_month',\s*3/.test(mig), 'migration free AI = 3');

const PTLeaks = sandbox.window.PTLeaks;
assert.ok(PTLeaks && PTLeaks.worstSpotsQueue, 'worstSpotsQueue');
assert.ok(PTLeaks.weeklyTopLeak, 'weeklyTopLeak');
assert.ok(PTLeaks.renderBreakdownBars, 'renderBreakdownBars');

const sampleErrors = [
  { id: 'e1', class: 'error', street: 'flop', evLoss: 2.5, createdAt: new Date().toISOString(), scenarioRaw: { type: 'postflop' }, heroPos: 'BB', chosen: 'call', best: 'fold' },
  { id: 'e2', class: 'imprecisa', street: 'flop', evLoss: 1.2, createdAt: new Date().toISOString(), scenarioRaw: { type: 'postflop' }, heroPos: 'BB', chosen: 'check', best: 'bet_33' },
  { id: 'e3', class: 'error', street: 'preflop', evLoss: 0.8, createdAt: new Date().toISOString(), scenarioRaw: { type: 'RFI' }, heroPos: 'UTG', chosen: 'fold', best: 'raise' },
  { id: 'e4', class: 'optima', street: 'turn', evLoss: 0, createdAt: new Date().toISOString(), scenarioRaw: { type: 'postflop' }, heroPos: 'BTN' }
];

const queue = PTLeaks.worstSpotsQueue(sampleErrors, 5, 10);
assert.ok(queue.length >= 2, 'adaptive queue has errors');
assert.strictEqual(queue[0].id, 'e1', 'highest EV loss first among top spots');
assert.ok(!queue.some((e) => e.class === 'optima'), 'optima excluded');

const top = PTLeaks.weeklyTopLeak(sampleErrors);
assert.ok(top && top.count >= 1, 'weekly top leak');
assert.ok(String(top.label).length > 0, 'leak has label');

const bars = PTLeaks.renderBreakdownBars('Test', [{ street: 'flop', label: 'Flop', count: 2, evLoss: 3.7 }], '--red', 'street');
assert.ok(bars.indexOf('data-leak-filter-street="flop"') >= 0, 'clickable street bars');
assert.ok(bars.indexOf('leak-bar-col-click') >= 0, 'click class');

const RM = sandbox.window.PTRangeMatrix;
assert.ok(RM && RM.applyOpenSizing, 'applyOpenSizing');
const base = { spotKind: 'vsRFI', potBB: 5, toCallBB: 2.5 };
const sized3 = RM.applyOpenSizing(Object.assign({}, base), 3);
assert.strictEqual(sized3.toCallBB, 3, '3x toCall');
assert.ok(Math.abs(sized3.potBB - 5.5) < 0.01, '3x pot ~5.5 got ' + sized3.potBB);
const sized25 = RM.applyOpenSizing(Object.assign({}, base), 2.5);
assert.strictEqual(sized25.toCallBB, 2.5, '2.5x toCall');

const Store = sandbox.window.Store;
assert.ok(Store.toggleFavoriteSpot, 'favorites API');
const spot = { spot: '3bet', heroPos: 'BB', villainPos: 'BTN', openSize: 2.5, gameType: 'cash6', stackDepth: 'standard', label: 'BB vs BTN' };
let res = Store.toggleFavoriteSpot(spot);
assert.ok(res.ok && res.favorited, 'add favorite');
assert.strictEqual(Store.getFavoriteSpots().length, 1);
assert.ok(Store.isFavoriteSpot(spot));
res = Store.toggleFavoriteSpot(spot);
assert.ok(res.ok && !res.favorited, 'remove favorite');
assert.strictEqual(Store.getFavoriteSpots().length, 0);

// What-if core API present on Importer when loaded; smoke-check source
const importSrc = fs.readFileSync(path.join(__dirname, '..', 'js/import.js'), 'utf8');
assert.ok(/function recomputeDecisionGto\(hand, d, chosenOverride\)/.test(importSrc), 'recomputeDecisionGto signature');

const aiSrc = fs.readFileSync(path.join(__dirname, '..', 'js/ai-report.js'), 'utf8');
assert.ok(/thread\.slice\(0,\s*8\)/.test(aiSrc), 'coach thread sends up to 8 turns');

const shareEdge = fs.readFileSync(path.join(__dirname, '..', 'supabase/functions/share-hand/index.ts'), 'utf8');
assert.ok(/'leak'/.test(shareEdge), 'share-hand allows leak source');

const shareJs = fs.readFileSync(path.join(__dirname, '..', 'js/share-hand.js'), 'utf8');
assert.ok(/bodyHtml|bodyOverride/.test(shareJs), 'share supports bodyHtml override');

console.log('OK test-p1-retention');
