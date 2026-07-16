/* Test: análisis de manos manual (specToRawHand -> analyzeHand) e inyección de cartas fijas en el entrenador. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON };
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js',
  'engine/cache.js',
  'engine/ranges/notation.js',
  'engine/ranges/data.js',
  'engine/ranges/extended.js',
  'engine/ranges/variants.js',
  'engine/ranges/registry.js',
  'engine/ranges/weights.js',
  'engine/ranges/villainTracking.js',
  'engine/handStrength.js',
  'engine/equity/madeHand.js',
  'engine/math/potMath.js',
  'engine/math/evMath.js',
  'engine/equity/monteCarlo.js',
  'engine/equity/handRank.js',
  'engine/equity/blockers.js',
  'engine/solver/boardCluster.js',
  'engine/validation/boardTextureShift.js',
  'engine/validation/villainCallAudit.js',
  'engine/validation/streetStrategy.js',
  'engine/solver/rangeAdvantage.js',
  'engine/solver/riverShoveNode.js',
  'engine/solver/probeEV.js',
  'engine/solver/villainStrategyAdjust.js',
  'engine/solver/preflopSolver.js',
  'engine/solver/facingBet.js',
  'engine/solver/spotKey.js',
  'engine/solver/strategyTables.js',
  'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js',
  'engine/scoring/evLoss.js',
  'engine/scoring/scoring.js',
  'engine/scoring/errors.js',
  'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js',
  'engine/evaluateSpot.js',
  'engine/villainProfiles.js',
  'engine/villainPreflop.js',
  'engine/stacks.js',
  'play-config.js',
  'ranges.js',
  'range-matrix.js',
  'engine.js',
  'import/hhUtils.js',
  'import/formatDetector.js',
  'import/parsers/pokerstars.js',
  'import/parsers/winamax.js',
  'import.js',
  'hand-analysis.js'
];

scripts.forEach((f) => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
});

const { Engine, Importer, PTHandAnalysis } = sandbox.window;
let failed = false;
function assert(cond, msg) {
  if (cond) console.log('OK:', msg);
  else { console.error('FAIL:', msg); failed = true; }
}

// --- 1) Spec manual -> mano analizada ---
const spec = {
  format: '6max',
  heroPos: 'CO',
  heroCards: ['As', 'Kd'],
  villains: [{ pos: 'BB', cards: ['Qs', 'Qd'] }],
  board: ['9c', 'Tc', '8c', '6s', '2h'],
  actions: {
    preflop: [
      { pos: 'UTG', action: 'fold' },
      { pos: 'HJ', action: 'fold' },
      { pos: 'CO', action: 'raise', amountBB: 2.5 },
      { pos: 'BTN', action: 'fold' },
      { pos: 'SB', action: 'fold' },
      { pos: 'BB', action: 'call' }
    ],
    flop: [
      { pos: 'BB', action: 'check' },
      { pos: 'CO', action: 'bet', amountBB: 3 },
      { pos: 'BB', action: 'call' }
    ],
    turn: [
      { pos: 'BB', action: 'check' },
      { pos: 'CO', action: 'check' }
    ],
    river: [
      { pos: 'BB', action: 'bet', amountBB: 8 },
      { pos: 'CO', action: 'call' }
    ]
  },
  _source: 'manual'
};

const raw = PTHandAnalysis.specToRawHand(spec);
assert(raw.hero === 'CO', 'hero = CO');
assert(raw.positions.CO === 'CO', 'positions map ok');
assert(raw.streets.preflop.length === 6, 'preflop 6 acciones');

const displayActs = PTHandAnalysis.computeStreetDisplayActions('flop', [
  { pos: 'BB', action: 'check' },
  { pos: 'CO', action: 'bet', amountBB: 3 },
  { pos: 'BB', action: 'call' }
]);
assert(displayActs[2] && displayActs[2].derivedAmountBB === 3, 'call flop hereda 3bb del bet previo');

const displayActsChanged = PTHandAnalysis.computeStreetDisplayActions('river', [
  { pos: 'BB', action: 'bet', amountBB: 11 },
  { pos: 'CO', action: 'call' }
]);
assert(displayActsChanged[1] && displayActsChanged[1].derivedAmountBB === 11, 'call river se recalcula si cambia el bet');

const displayRaise = PTHandAnalysis.computeStreetDisplayActions('preflop', [
  { pos: 'CO', action: 'raise', amountBB: 2.5 },
  { pos: 'BTN', action: 'call' },
  { pos: 'BB', action: 'call' }
]);
assert(displayRaise[1] && displayRaise[1].derivedAmountBB === 2.5, 'caller sin inversión previa paga open completo');
assert(displayRaise[2] && displayRaise[2].derivedAmountBB === 1.5, 'BB call descuenta la ciega ya puesta');

const analyzed = PTHandAnalysis.buildAnalyzedHand(spec, 'manual');
assert(analyzed.heroPos === 'CO', 'analyzed heroPos CO');
assert(analyzed.heroCode === 'AKo' || analyzed.heroCode === 'AKs', 'heroCode ~ AK: ' + analyzed.heroCode);
assert(Array.isArray(analyzed.decisions) && analyzed.decisions.length >= 3, 'decisiones >=3: ' + (analyzed.decisions || []).length);
const pf = analyzed.decisions.find((d) => d.street === 'preflop');
assert(pf && pf.spotKind === 'RFI', 'preflop spot RFI: ' + (pf && pf.spotKind));
assert(analyzed.summary && analyzed.summary.length > 0, 'timeline generado');
assert(analyzed.boardAll.length === 5, 'board 5 cartas');

// --- 2) toTrainerConfig + Engine.newHand con cartas fijas ---
const cfg = PTHandAnalysis.toTrainerConfig(analyzed, 'pro', 'crimson');
assert(cfg.force && cfg.force.forceDeal, 'force.forceDeal presente');
assert(cfg.playConfig.villainLevel === 'pro', 'villainLevel pro');
assert(cfg.playConfig.tableTheme === 'crimson', 'tableTheme crimson');

const trainerHand = Engine.newHand(cfg.force, cfg.playConfig);
assert(trainerHand.hero.cards.join('') === 'AsKd', 'entrenador héroe = AsKd: ' + trainerHand.hero.cards.join(''));
const predealBoard = (trainerHand._predeal.board || []).slice(0, 5).join(' ');
assert(predealBoard.indexOf('9c') === 0, 'entrenador board comienza en 9c: ' + predealBoard);
// villano BB debería tener QsQd inyectado en el asiento del villano
const vSeat = (trainerHand._predeal && trainerHand._predeal.villainPos) || (trainerHand.villain && trainerHand.villain.pos);
const vCards = vSeat && trainerHand.table.holeCards[vSeat] ? trainerHand.table.holeCards[vSeat].join('') : '';
assert(vCards === 'QsQd', 'villano inyectado (' + vSeat + '): ' + vCards);

// unicidad de cartas en la mesa
const all = [];
Object.keys(trainerHand.table.holeCards).forEach((p) => { (trainerHand.table.holeCards[p] || []).forEach((c) => all.push(c)); });
(trainerHand._predeal.board || []).forEach((c) => all.push(c));
const uniq = new Set(all);
assert(uniq.size === all.length, 'sin cartas duplicadas en la mesa (' + all.length + ' cartas)');

// --- 3) vsRFI scenario mapping ---
const spec2 = {
  format: '6max', heroPos: 'BB', heroCards: ['7h', '7s'],
  villains: [{ pos: 'CO', cards: [] }],
  board: [],
  actions: { preflop: [
    { pos: 'UTG', action: 'fold' }, { pos: 'HJ', action: 'fold' },
    { pos: 'CO', action: 'raise', amountBB: 2.5 }, { pos: 'BTN', action: 'fold' },
    { pos: 'SB', action: 'fold' }, { pos: 'BB', action: 'call' }
  ], flop: [], turn: [], river: [] },
  _source: 'manual'
};
const an2 = PTHandAnalysis.buildAnalyzedHand(spec2, 'manual');
const pf2 = an2.decisions.find((d) => d.street === 'preflop');
assert(pf2 && pf2.spotKind === 'vsRFI', 'BB vs CO spot vsRFI: ' + (pf2 && pf2.spotKind));
const cfg2 = PTHandAnalysis.toTrainerConfig(an2, 'fish', 'midnight');
const th2 = Engine.newHand(cfg2.force, cfg2.playConfig);
assert(th2.hero.cards.join('') === '7h7s', 'vsRFI héroe = 7h7s: ' + th2.hero.cards.join(''));

// --- 4) sync asientos → acciones + fold limpia calles siguientes ---
const draft = PTHandAnalysis.emptyDraft('6max');
draft.heroPos = 'CO';
draft.villains = [{ pos: 'BB', cards: [] }, { pos: 'BTN', cards: [] }];
PTHandAnalysis.syncActionsFromSeats(draft);
assert(draft.actions.preflop.map((a) => a.pos).join(',') === 'CO,BTN,BB',
  'preflop players orden mesa: ' + draft.actions.preflop.map((a) => a.pos).join(','));
assert(draft.actions.flop.length === 3, 'flop 3 acciones iniciales');
assert(draft.actions.turn.length === 3, 'turn 3 acciones iniciales');

// Fold en flop BTN → desaparece de turn/river
const btnFlop = draft.actions.flop.find((a) => a.pos === 'BTN');
btnFlop.action = 'fold';
PTHandAnalysis.syncActionsFromSeats(draft);
assert(!draft.actions.turn.some((a) => a.pos === 'BTN'), 'BTN no está en turn tras fold flop');
assert(!draft.actions.river.some((a) => a.pos === 'BTN'), 'BTN no está en river tras fold flop');
assert(draft.actions.turn.some((a) => a.pos === 'CO'), 'CO sigue en turn');
assert(draft.actions.turn.some((a) => a.pos === 'BB'), 'BB sigue en turn');

// Fold en preflop CO → no aparece en flop+
const coPf = draft.actions.preflop.find((a) => a.pos === 'CO');
coPf.action = 'fold';
PTHandAnalysis.syncActionsFromSeats(draft);
assert(!draft.actions.flop.some((a) => a.pos === 'CO'), 'CO fuera de flop tras fold PF');
assert(!draft.actions.turn.some((a) => a.pos === 'CO'), 'CO fuera de turn tras fold PF');

// --- 5) asientos exclusivos héroe/villano ---
const taken = PTHandAnalysis.takenSeats({ heroPos: 'CO', villains: [{ pos: 'BB' }, { pos: 'BTN' }] }, null);
assert(taken.CO === 'hero' && taken.BB === 'villain' && taken.BTN === 'villain', 'taken seats map');
const takenEx = PTHandAnalysis.takenSeats({ heroPos: 'CO', villains: [{ pos: 'BB' }, { pos: 'BTN' }] }, 1);
assert(!takenEx.BTN && takenEx.BB === 'villain', 'exclude villain idx libera asiento en options');

// --- 6) editar: conservar id al reanalizar ---
const editSpec = Object.assign({}, spec, { _id: 'ah_edit_1', _createdAt: '2020-01-01T00:00:00.000Z' });
const edited = PTHandAnalysis.buildAnalyzedHand(editSpec, 'manual');
assert(edited.id === 'ah_edit_1', 'editar conserva id: ' + edited.id);
assert(edited.spec && edited.spec.heroPos === 'CO', 'spec guardado en analyzed');
assert(edited.createdAt === '2020-01-01T00:00:00.000Z', 'conserva createdAt');

// --- 7) markup del botón guardar: atributo booleano válido (sin comilla suelta) ---
const fsHa = fs.readFileSync(path.join(__dirname, '..', 'js', 'hand-analysis.js'), 'utf8');
assert(/data-ha-manual-save>/.test(fsHa), 'data-ha-manual-save sin comilla suelta');
assert(!/data-ha-manual-save\">/.test(fsHa), 'no debe haber data-ha-manual-save">');

if (failed) { console.error('\n*** TEST FALLÓ ***'); process.exit(1); }
console.log('\n*** TEST HAND-ANALYSIS OK ***');
