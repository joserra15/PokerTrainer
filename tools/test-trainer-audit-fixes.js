/**
 * Regresión auditoría entrenador: ICM grading, leak presets, school/legendary,
 * ante HU, Harville n>3, allowMultiway defaults, hotkeys hand-end.
 * Uso: node tools/test-trainer-audit-fixes.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
let failed = 0;
function check(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL:', msg);
  } else {
    console.log('OK:', msg);
  }
}

const presetsSrc = fs.readFileSync(path.join(root, 'js/trainer-leak-presets.js'), 'utf8');
check(/sbLimp:\s*\{[\s\S]*?scenario:\s*'sbLimp'/.test(presetsSrc), 'preset sbLimp → scenario sbLimp');
check(/cold4bet:\s*\{[\s\S]*?scenario:\s*'cold4bet'/.test(presetsSrc), 'preset cold4bet → scenario cold4bet');
check(!/sbLimp:\s*\{[\s\S]*?scenario:\s*'iso'/.test(presetsSrc), 'preset sbLimp ya no usa iso');

const hotkeysSrc = fs.readFileSync(path.join(root, 'js/hotkeys.js'), 'utf8');
check(/handEndModalOpen|hand-end-modal/.test(hotkeysSrc), 'hotkeys detectan modal fin de mano');
check(/hand-end-next/.test(hotkeysSrc), 'hotkeys N → hand-end-next');
check(!/#btn-new/.test(hotkeysSrc) && !/view-play/.test(hotkeysSrc), 'sin fallbacks DOM muertos');

const storageSrc = fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8');
check(/isLegendaryHand|isNonTrainerHand/.test(storageSrc), 'storage distingue legendary/non-trainer');
check(/nonTrainer/.test(storageSrc) || /isNonTrainerHand/.test(storageSrc), 'saveHand filtra non-trainer');

const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Object,
  Array,
  Number,
  String,
  Boolean,
  JSON,
  parseInt,
  isNaN,
  Set,
  Map,
  localStorage: {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
    clear() { this._d = {}; }
  }
};
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
vm.createContext(sandbox);

function load(rel) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
}

[
  'js/engine/format/taxonomy.js',
  'js/engine/ranges/notation.js',
  'js/engine/ranges/data.js',
  'js/engine/ranges/extended.js',
  'js/engine/ranges/variants.js',
  'js/engine/ranges/registry.js',
  'js/engine/scoring/icmEv.js',
  'js/play-config.js',
  'js/storage.js',
  'js/trainer-leak-presets.js'
].forEach(load);

const Tax = sandbox.window.PTFormatTaxonomy || sandbox.PTFormatTaxonomy;
const RR = sandbox.window.GTORangesRegistry || sandbox.GTORangesRegistry;
const Icm = sandbox.window.GTOIcmEv || sandbox.GTOIcmEv;
const PC = sandbox.window.PTPlayConfig || sandbox.PTPlayConfig;
const Store = sandbox.window.Store || sandbox.Store;
const LeakPresets = sandbox.window.PTTrainerLeakPresets || sandbox.PTTrainerLeakPresets;

check(!!Tax && !!RR && !!Icm && !!PC && !!Store, 'módulos cargados');

// --- ICM: normalize deriva usesIcm (spin siempre; cash nunca) ---
const spinNorm = RR.normalize({ formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb15', mttPhase: 'short' });
check(spinNorm.icmEnabled === true, 'spin normalize → icmEnabled true');
const cashNorm = RR.normalize({ formatHub: 'cash', gameType: 'cash6', stackDepth: 'bb100' });
check(cashNorm.icmEnabled === false, 'cash normalize → icmEnabled false');

const input = { potBB: 10, toCallBB: 0 };
RR.attachToInput(input, { formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb15', mttPhase: 'short' });
check(input.icmEnabled === true, 'attachToInput spin → icmEnabled true');
check(Icm.shouldApply(input) === true, 'shouldApply true cuando icmEnabled');

const mttEarly = RR.normalize({
  formatHub: 'mtt', gameType: 'mtt', stackDepth: 'bb40', mttPhase: 'early',
  playersLeft: 100, placesPaid: 15
});
// early lejos de money → usesIcm puede ser false
check(typeof mttEarly.icmEnabled === 'boolean', 'mtt early icmEnabled resuelto');

// --- Harville n>3: equities ≈ prize pool ---
const stacks5 = [40, 30, 25, 20, 15];
const pays5 = [0.4, 0.25, 0.15, 0.12, 0.08];
const eq5 = Icm.icmEquities(stacks5, pays5);
const eqSum = eq5.reduce((s, x) => s + x, 0);
const paySum = pays5.reduce((s, x) => s + x, 0);
check(eq5 && eq5.length === 5, 'icmEquities n=5');
check(Math.abs(eqSum - paySum) < 0.05, '∑eq ≈ ∑pays (n=5), got ' + eqSum + ' vs ' + paySum);

// --- allowMultiway defaults ---
const rfiCfg = PC.normalize({ scenario: 'rfi', formatHub: 'cash', gameType: 'cash6' });
check(rfiCfg.allowMultiway === false, 'RFI → allowMultiway false');
const randCfg = PC.normalize({ scenario: 'random', formatHub: 'cash', gameType: 'cash6' });
check(randCfg.allowMultiway === true, 'random → allowMultiway true');
const mwCfg = PC.normalize({ scenario: 'multiway', formatHub: 'cash', gameType: 'cash6' });
check(mwCfg.allowMultiway === true, 'multiway → allowMultiway true');
const forced = PC.normalize({ scenario: 'rfi', allowMultiway: true, formatHub: 'cash', gameType: 'cash6' });
check(forced.allowMultiway === true, 'allowMultiway explícito se respeta');

// --- stack aliases ---
check(PC.stackDepthToBB('short') === 50, 'short → 50bb');
check(PC.stackDepthToBB('deep') === 200, 'deep → 200bb');

// --- Leak presets runtime ---
const leakMod = sandbox.window.PTTrainerLeakPresets || sandbox.PTTrainerLeakPresets;
check(!!leakMod && leakMod.TYPE_PRESETS, 'PTTrainerLeakPresets expuesto');
if (leakMod && leakMod.TYPE_PRESETS) {
  check(leakMod.TYPE_PRESETS.sbLimp.scenario === 'sbLimp', 'TYPE_PRESETS.sbLimp = sbLimp');
  check(leakMod.TYPE_PRESETS.cold4bet.scenario === 'cold4bet', 'TYPE_PRESETS.cold4bet = cold4bet');
  const cfgSb = leakMod.presetForLeak({ key: 'sbLimp|BTN|preflop' });
  check(cfgSb.scenario === 'sbLimp', 'presetForLeak sbLimp');
  const cfgC4 = leakMod.presetForLeak({ key: 'cold4bet|CO|preflop' });
  check(cfgC4.scenario === 'cold4bet', 'presetForLeak cold4bet');
}

// --- School / legendary no inflan handsPlayed ---
Store.setUserId('audit-user');
Store.clearAll && Store.clearAll();
const baseStats = Store.getStats();
const before = Number(baseStats.handsPlayed) || 0;

function fakeHand(extraCfg) {
  return {
    id: 'h' + Math.random(),
    createdAt: new Date().toISOString(),
    seed: 1,
    scenario: { type: 'RFI', heroPos: 'BTN' },
    playConfig: Object.assign({ formatHub: 'cash', gameType: 'cash6' }, extraCfg || {}),
    displayHeroPos: 'BTN',
    hero: { pos: 'BTN', cards: ['As', 'Kh'], code: 'AKo' },
    villain: { pos: 'BB' },
    decisions: [{ street: 'preflop', class: 'optima', label: 'Raise', action: 'raise', evLoss: 0 }],
    result: { heroNet: 2, totalEvLoss: 0, school: !!(extraCfg && extraCfg.schoolMode) }
  };
}

Store.saveHand(fakeHand({ schoolMode: true }));
check(Store.getStats().handsPlayed === before, 'school no incrementa handsPlayed');
check((Store.getHistory() || []).every((h) => !(h.playConfig && h.playConfig.schoolMode)),
  'school no entra en history');

Store.saveHand(fakeHand({ legendaryMode: true }));
check(Store.getStats().handsPlayed === before, 'legendary no incrementa handsPlayed');

Store.saveHand(fakeHand({}));
check(Store.getStats().handsPlayed === before + 1, 'mano normal sí incrementa handsPlayed');

// --- Ante HU: source check ---
const engineSrc = fs.readFileSync(path.join(root, 'js/engine.js'), 'utf8');
check(/isHuPhase/.test(engineSrc) && /payers = isHu \? 2/.test(engineSrc),
  'applyAnteToHand usa 2 pagadores en HU');
check(!/hand\.table\.length \? hand\.table\.length/.test(engineSrc),
  'ya no usa hand.table.length para antes');

check(/resolveHandConfig\(cfg,\s*function \(\) \{ return C\.rng\.random/.test(engineSrc)
  || /resolveHandConfig\(cfg, function \(\) \{ return C\.rng\.random/.test(engineSrc),
  'newHand resuelve stack aleatorio tras setSeed');

const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
check(/Cupo: solo tras deal exitoso/.test(appSrc) || /solo tras deal exitoso/.test(appSrc),
  'cupo registrado tras deal');

if (failed) {
  console.error('\n' + failed + ' fallos');
  process.exit(1);
}
console.log('\nAll audit trainer checks passed.');
