/*
 * Regresión: EV perdido Poker76 vs Excel de referencia.
 * Ejecutar: node tools/regression-poker76.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN };
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js', 'engine/cache.js', 'engine/ranges/notation.js', 'engine/ranges/data.js',
  'engine/ranges/weights.js', 'engine/ranges/villainTracking.js', 'engine/handStrength.js',
  'engine/equity/madeHand.js', 'engine/math/potMath.js', 'engine/math/evMath.js',
  'engine/equity/monteCarlo.js', 'engine/equity/handRank.js', 'engine/equity/blockers.js',
  'engine/solver/boardCluster.js', 'engine/validation/boardTextureShift.js',
  'engine/validation/villainCallAudit.js', 'engine/validation/streetStrategy.js',
  'engine/solver/rangeAdvantage.js', 'engine/solver/riverShoveNode.js', 'engine/solver/probeEV.js',
  'engine/solver/villainStrategyAdjust.js', 'engine/solver/preflopSolver.js',
  'engine/solver/facingBet.js', 'engine/solver/spotKey.js', 'engine/solver/strategyTables.js',
  'engine/solver/SolverProvider.js', 'engine/scoring/classifier.js', 'engine/scoring/evLoss.js',
  'engine/scoring/scoring.js', 'engine/scoring/errors.js', 'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js', 'engine/evaluateSpot.js',
  'engine/villainProfiles.js',
  'ranges.js', 'engine.js', 'import.js'
];
scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});

const Importer = sandbox.window.Importer;

function r2(x) { return Math.round(x * 100) / 100; }

const HAND_IDS = {
  9: null, 12: null, 19: null, 28: null, 29: null, 40: null, 41: null,
  42: '261162731419', 48: null, 54: null, 57: null, 61: null, 72: null,
  79: null, 83: null, 98: null, 103: null, 106: null,
  107: '261162561057', 121: '261162529812', 130: null, 132: null, 138: null,
  147: null, 152: null, 159: null, 161: null, 171: null, 177: null, 179: null,
  180: null, 185: null, 193: null
};

const ref = JSON.parse(fs.readFileSync(path.join(__dirname, 'poker76-ev-reference.json'), 'utf8'));
const txt = fs.readFileSync(path.join(__dirname, '..', 'sesiones', 'Poker76.txt'), 'utf8');
const parsed = Importer.parseSession(txt, 'Poker76.txt');
const session = Importer.buildSession(parsed, 'Poker76.txt');

function findHand(seqId) {
  const psId = HAND_IDS[seqId];
  if (psId) {
    const h = session.hands.find((x) => String(x.id) === psId);
    if (h) return h;
  }
  const idx = session.hands.findIndex((_, i) => i + 1 === Number(seqId));
  return idx >= 0 ? session.hands[idx] : null;
}

function parseEuro(s) {
  return parseFloat(String(s).replace('+', '')) || 0;
}

let fails = 0;
let checked = 0;
const TOL = 0.04;

ref.slice(1).forEach((row) => {
  const seq = Math.round(parseFloat(row.A));
  const expectedEvEuro = parseEuro(row.G);
  const expectedErr = row.E === 'Errónea';
  const h = findHand(seq);
  if (!h) {
    console.log(`SKIP mano #${seq}: no encontrada en sesión importada`);
    return;
  }
  checked++;
  const appEvEuro = -r2(h.totalEvLoss * (h.bb || 0.05));
  const appErr = h.decisions.some((d) => d.evErroneous);
  const okEv = Math.abs(appEvEuro - expectedEvEuro) <= TOL;
  const okErr = expectedErr ? appErr && appEvEuro < 0 : Math.abs(appEvEuro) <= TOL;
  if (!okEv || !okErr) {
    fails++;
    console.log(`FAIL #${seq} id=${h.id} hero=${h.heroCode}`);
    console.log(`  Excel EV: ${expectedEvEuro.toFixed(2)}€ (${row.E}) | App: ${appEvEuro.toFixed(2)}€ erroneous=${appErr}`);
    h.decisions.filter((d) => d.evErroneous).forEach((d) => {
      console.log(`    ${d.street} ${d.chosen || d.actionType} evLoss=${d.evLoss}bb reasons=${(d.evErrorReasons || []).map((r) => r.type).join(',')}`);
      if (d.mathParams) console.log(`      eq=${d.mathParams.equityPct}% be=${d.mathParams.breakEvenPct}%`);
    });
  } else {
    console.log(`OK #${seq} EV ${appEvEuro.toFixed(2)}€`);
  }
});

const totalExcelEv = ref.slice(1).reduce((s, r) => s + parseEuro(r.G), 0);
let totalAppEvRef = 0;
ref.slice(1).forEach((row) => {
  const h = findHand(Math.round(parseFloat(row.A)));
  if (h) totalAppEvRef += h.totalEvLoss * (h.bb || 0.05);
});
const okTotal = Math.abs(totalAppEvRef - Math.abs(totalExcelEv)) <= 0.2;

console.log('\n--- Totales ---');
console.log(`Excel EV perdido (suma |G|): ${Math.abs(totalExcelEv).toFixed(2)}€`);
console.log(`App EV perdido (manos Excel): ${totalAppEvRef.toFixed(2)}€`);
console.log(`App EV perdido (sesión completa): ${session.stats.evLossEuroTotal.toFixed(2)}€ (${session.stats.evLossBB} bb)`);
console.log(`EV esperado sesión: ${session.stats.perfectPlayNetEuro.toFixed(2)}€ (${session.stats.perfectPlayNetBB} bb)`);
console.log(`Real: ${(session.stats.netBB * 0.05).toFixed(2)}€ (${session.stats.netBB} bb)`);

if (fails > 0 || !okTotal) {
  console.log(`\n*** REGRESIÓN FALLIDA: ${fails} manos, total ok=${okTotal} ***`);
  process.exit(1);
}
console.log(`\n*** REGRESIÓN OK (${checked} manos verificadas) ***`);
