/* Valida data/ranges/*-6max-100bb.json (RFI, vs-RFI, vs-3bet). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const sandbox = { window: {}, console, Math, Date, Set, Map, JSON };
sandbox.global = sandbox;
vm.createContext(sandbox);

['js/engine/ranges/notation.js', 'js/engine/ranges/data.js', 'js/engine/ranges/jsonLoader.js'].forEach((rel) => {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
});

const N = sandbox.window.GTORangesNotation;
const D = sandbox.window.GTORangesData;

function expandCount(notation) {
  if (!notation) return 0;
  return new Set(N.expand(notation)).size;
}

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(root, 'data/ranges', name), 'utf8'));
}

// --- RFI ---
const rfi = loadJson('rfi-6max-100bb.json');
const rfiRequired = ['UTG', 'HJ', 'CO', 'BTN'];
const rfiMissing = rfiRequired.filter((p) => !rfi.positions || !rfi.positions[p]);
assert.strictEqual(rfiMissing.length, 0, 'RFI faltan posiciones: ' + rfiMissing.join(', '));

sandbox.window.PT_RFI_JSON = rfi;
sandbox.window.PTRangesJsonLoader.init();

let rfiCombos = 0;
rfiRequired.forEach((pos) => {
  const row = D.OPEN_RAISE[pos];
  const n = new Set(N.expand(row.raise || '').concat(N.expand(row.mix || ''))).size;
  assert.ok(n >= 20, 'RFI ' + pos + ' solo ' + n + ' combos');
  rfiCombos += n;
  console.log('OK RFI', pos + ':', n, 'combos');
});

// --- vs-RFI ---
const vsRfi = loadJson('vs-rfi-6max-100bb.json');
assert.ok(vsRfi.pairs && typeof vsRfi.pairs === 'object', 'vs-RFI: pairs');
const vsRfiKeys = Object.keys(vsRfi.pairs);
assert.ok(vsRfiKeys.length >= 10, 'vs-RFI: al menos 10 pares, hay ' + vsRfiKeys.length);
const vsRfiMust = ['BB_vs_UTG', 'BB_vs_BTN', 'SB_vs_BTN'];
vsRfiMust.forEach((k) => assert.ok(vsRfi.pairs[k], 'vs-RFI falta ' + k));

sandbox.window.PT_VS_RFI_JSON = vsRfi;
sandbox.window.PTRangesJsonLoader.init();

function continueSet(row) {
  return new Set(
    []
      .concat(N.expand(row.threeBet || ''))
      .concat(N.expand(row.threeBetMix || ''))
      .concat(N.expand(row.call || ''))
      .concat(N.expand(row.callMix || ''))
  );
}

let vsRfiCombos = 0;
vsRfiKeys.forEach((key) => {
  const row = vsRfi.pairs[key];
  const n =
    expandCount(row.threeBet) +
    expandCount(row.threeBetMix) +
    expandCount(row.call) +
    expandCount(row.callMix);
  assert.ok(n >= 8, 'vs-RFI ' + key + ' solo ' + n + ' combos');
  vsRfiCombos += n;
});
console.log('OK vs-RFI:', vsRfiKeys.length, 'pares,', vsRfiCombos, 'combos notación');

// BB vs BTN: AQo/AJo (y KJo) no pueden ser fold si el chart defiende Ax/Kx peores.
const bbBtn = vsRfi.pairs.BB_vs_BTN;
const bbBtnCont = continueSet(bbBtn);
['AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'KJo'].forEach((h) => {
  assert.ok(bbBtnCont.has(h), 'BB vs BTN debe continuar ' + h + ' (no fold)');
});
const axOffsuit = ['AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o'];
let weakerAxContinue = false;
for (let i = axOffsuit.length - 1; i >= 0; i--) {
  const h = axOffsuit[i];
  if (bbBtnCont.has(h)) weakerAxContinue = true;
  else assert.ok(!weakerAxContinue, 'BB vs BTN: ' + h + ' no puede ser fold si Ax offsuit peores continúan');
}
console.log('OK BB vs BTN: AQo/AJo/KJo continúan');

// BB vs UTG: ATo/JTo call (solvers ~100%); no fold si QJo/KJo continúan.
const bbUtg = vsRfi.pairs.BB_vs_UTG;
const bbUtgCont = continueSet(bbUtg);
['ATo', 'AJo', 'AQo', 'KJo', 'QJo', 'JTo'].forEach((h) => {
  assert.ok(bbUtgCont.has(h), 'BB vs UTG debe continuar ' + h + ' (no fold)');
});
['A9o', 'A8o'].forEach((h) => {
  assert.ok(!bbUtgCont.has(h), 'BB vs UTG no debe continuar ' + h + ' (sigue siendo fold)');
});
console.log('OK BB vs UTG: ATo/JTo continúan');

// --- vs-3bet ---
const vs3 = loadJson('vs-3bet-6max-100bb.json');
assert.ok(vs3.pairs && typeof vs3.pairs === 'object', 'vs-3bet: pairs');
const vs3Keys = Object.keys(vs3.pairs);
assert.ok(vs3Keys.length >= 10, 'vs-3bet: al menos 10 pares, hay ' + vs3Keys.length);
const vs3Must = ['UTG_vs_BTN', 'CO_vs_BTN', 'BTN_vs_BB'];
vs3Must.forEach((k) => assert.ok(vs3.pairs[k], 'vs-3bet falta ' + k));

sandbox.window.PT_VS_3BET_JSON = vs3;
sandbox.window.PTRangesJsonLoader.init();
assert.ok(D.VS_3BET_PAIRS && Object.keys(D.VS_3BET_PAIRS).length >= 10, 'loader VS_3BET_PAIRS');

let vs3Combos = 0;
vs3Keys.forEach((key) => {
  const row = vs3.pairs[key];
  const n =
    expandCount(row.fourBet) +
    expandCount(row.fourBetMix) +
    expandCount(row.call) +
    expandCount(row.callMix);
  assert.ok(n >= 5, 'vs-3bet ' + key + ' solo ' + n + ' combos');
  vs3Combos += n;
});
['UTG_vs_BB', 'HJ_vs_BB', 'CO_vs_BB'].forEach((k) => {
  const row = vs3.pairs[k];
  const cont = new Set(
    [].concat(N.expand(row.fourBet || '')).concat(N.expand(row.call || '')).concat(N.expand(row.callMix || ''))
  );
  assert.ok(cont.has('QQ'), k + ' debe continuar QQ (fourBet KK+ no puede dejar QQ en fold)');
});
const sbBb = vs3.pairs.SB_vs_BB;
assert.ok(continueSet({
  threeBet: sbBb.fourBet,
  threeBetMix: '',
  call: sbBb.call,
  callMix: sbBb.callMix
}).has('AQo'), 'SB vs BB AQo no puede ser fold si AJo llama');
console.log('OK vs-3bet QQ overlay y SB_vs_BB AQo');

console.log('OK vs-3bet:', vs3Keys.length, 'pares,', vs3Combos, 'combos notación');

console.log(
  '*** RANGOS JSON OK (RFI ' + rfiCombos +
    ' · vs-RFI ' + vsRfiKeys.length +
    ' · vs-3bet ' + vs3Keys.length + ') ***'
);
