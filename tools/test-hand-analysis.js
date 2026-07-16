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

// --- 4b) varias acciones en la misma calle + fold posterior ---
const multi = PTHandAnalysis.emptyDraft('6max');
multi.heroPos = 'HJ';
multi.villains = [{ pos: 'CO', cards: [] }, { pos: 'BTN', cards: [] }];
multi.actions.flop = [
  { pos: 'HJ', action: 'check', amountBB: null },
  { pos: 'CO', action: 'bet', amountBB: 3 },
  { pos: 'BTN', action: 'call', amountBB: null },
  { pos: 'HJ', action: 'fold', amountBB: null }
];
PTHandAnalysis.syncActionsFromSeats(multi);
assert(multi.actions.flop.length === 4, 'flop conserva 4 acciones en orden');
assert(multi.actions.flop.map((a) => a.pos + ':' + a.action).join('|') === 'HJ:check|CO:bet|BTN:call|HJ:fold',
  'orden temporal flop: ' + multi.actions.flop.map((a) => a.pos + ':' + a.action).join('|'));
assert(!multi.actions.turn.some((a) => a.pos === 'HJ'), 'HJ no está en turn tras fold flop');
const flopCall = PTHandAnalysis.computeStreetDisplayActions('flop', multi.actions.flop)[2];
assert(flopCall.action === 'call' && flopCall.derivedAmountBB === 3, 'call BTN auto = 3bb');

// --- 4c) añadir villano después no debe dejarlo fuera de acciones ---
const addLater = PTHandAnalysis.emptyDraft('6max');
addLater.heroPos = 'CO';
PTHandAnalysis.syncActionsFromSeats(addLater);
assert(addLater.actions.preflop.map((a) => a.pos).join(',') === 'CO', 'solo héroe al inicio');
addLater.villains = [{ pos: 'BTN', cards: [] }];
PTHandAnalysis.syncActionsFromSeats(addLater);
assert(addLater.actions.preflop.some((a) => a.pos === 'BTN'), 'BTN aparece en preflop al añadirlo');
assert(addLater.actions.flop.some((a) => a.pos === 'BTN'), 'BTN aparece en flop al añadirlo');
assert(!addLater.actions.preflop.some((a) => a.pos === 'BB'), 'no se inventa BB si el villano es BTN');

// --- 4d) cambiar posición remapea acciones ---
const remap = PTHandAnalysis.emptyDraft('6max');
remap.heroPos = 'CO';
remap.villains = [{ pos: 'BB', cards: [] }];
PTHandAnalysis.syncActionsFromSeats(remap);
remap.actions.preflop.find((a) => a.pos === 'BB').action = 'raise';
remap.actions.preflop.find((a) => a.pos === 'BB').amountBB = 3;
PTHandAnalysis.remapActionPositions(remap, 'BB', 'BTN');
remap.villains[0].pos = 'BTN';
PTHandAnalysis.syncActionsFromSeats(remap);
const btnAct = remap.actions.preflop.find((a) => a.pos === 'BTN');
assert(btnAct && btnAct.action === 'raise' && btnAct.amountBB === 3, 'acciones BB → BTN conservan raise 3');
assert(!remap.actions.preflop.some((a) => a.pos === 'BB'), 'ya no queda fila BB tras remap');

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
assert(!/data-ha-clone-row/.test(fsHa), 'no debe existir botón clonar acción');
assert(!/ha-row-clone/.test(fsHa), 'no debe existir clase ha-row-clone');

// --- 8) valor BB en € ---
const rawDefault = PTHandAnalysis.specToRawHand(spec);
assert(Math.abs(rawDefault.bb - 0.05) < 1e-9, 'BB por defecto 0.05€: ' + rawDefault.bb);
assert(Math.abs(rawDefault.sb - 0.025) < 1e-9, 'SB = mitad: ' + rawDefault.sb);
const raisePf = rawDefault.streets.preflop.find((a) => a.type === 'raise');
assert(raisePf && Math.abs(raisePf.to - 0.125) < 1e-9, 'raise 2.5bb = 0.125€: ' + (raisePf && raisePf.to));

const specNl2 = Object.assign({}, spec, { bbEuro: 0.02 });
const rawNl2 = PTHandAnalysis.specToRawHand(specNl2);
assert(Math.abs(rawNl2.bb - 0.02) < 1e-9, 'BB NL2 = 0.02€');
const callBb = rawNl2.streets.preflop.find((a) => a.player === 'BB' && a.type === 'call');
assert(callBb && Math.abs(callBb.amount - 0.03) < 1e-9, 'BB call paga 0.03€ (1.5bb): ' + (callBb && callBb.amount));
const analyzedNl2 = PTHandAnalysis.buildAnalyzedHand(specNl2, 'manual');
assert(analyzedNl2.bbEuro === 0.02 && analyzedNl2.spec.bbEuro === 0.02, 'bbEuro persistido en analyzed');

// --- 9) swap POV con villano ---
sandbox.window.Store = {
  getAnalysisHands: function () { return []; },
  saveAnalysisHand: function (h) { return { ok: true, hand: h }; },
  updateAnalysisHand: function (h) { return { ok: true, hand: h }; }
};
const swapList = PTHandAnalysis.listSwappableVillains(analyzed);
assert(swapList.some((v) => v.pos === 'BB'), 'BB es swappeable');
const swapped = PTHandAnalysis.swapHeroWithVillain(analyzed, 'BB');
assert(swapped.ok, 'swap ok: ' + (swapped.error || ''));
assert(swapped.hand.heroPos === 'BB', 'nuevo héroe BB');
assert(swapped.hand.heroCards.join('') === 'QsQd', 'cartas héroe = QQ: ' + swapped.hand.heroCards.join(''));
assert(swapped.hand.spec.villains.some((v) => v.pos === 'CO' && v.cards.join('') === 'AsKd'),
  'CO queda como villano con AK');
assert(swapped.hand.decisions && swapped.hand.decisions.length >= 1, 'decisiones recalculadas para BB');
assert(/como BB/.test(swapped.hand.savedName || ''), 'nombre indica POV: ' + swapped.hand.savedName);

// --- 10) forceDeal + forceScript en entrenador; cartas de villano bloqueadas ---
assert(cfg.force.forceScript && cfg.force.forceScript.actions.length >= 6, 'forceScript con acciones');
assert(trainerHand.forceDeal && trainerHand.forceDeal.villainCards.join('') === 'QsQd',
  'forceDeal persistido en hand: ' + (trainerHand.forceDeal && trainerHand.forceDeal.villainCards && trainerHand.forceDeal.villainCards.join('')));
assert(trainerHand._script && trainerHand._script.active, 'guion activo al inicio');

// Héroe abre (misma acción real) → BB debe call por guion, no fold GTO
const afterOpen = Engine.act(trainerHand, 'raise');
assert(afterOpen.hand.stage === 'flop' || afterOpen.hand.stage === 'complete',
  'tras open sigue viva o termina: ' + afterOpen.hand.stage);
if (afterOpen.hand.stage === 'flop') {
  const vSeat2 = afterOpen.hand.villain && afterOpen.hand.villain.pos;
  const vCards2 = vSeat2 && afterOpen.hand.table.holeCards[vSeat2]
    ? afterOpen.hand.table.holeCards[vSeat2].join('') : '';
  assert(vCards2 === 'QsQd', 'villano mantiene QQ tras open: ' + vCards2 + ' @' + vSeat2);
  assert(afterOpen.hand._script && afterOpen.hand._script.active, 'guion sigue activo tras misma línea');
}

// Desvío: nueva mano, hero fold en RFI → guion se desactiva
const divert = Engine.newHand(cfg.force, cfg.playConfig);
Engine.act(divert, 'fold');
assert(!divert._script || !divert._script.active, 'guion desactivado si hero se desvía');

// Repetir con forceDeal restaurado → mismas cartas
const replayForce = Object.assign({}, cfg.force, {
  seed: trainerHand.seed,
  forceDeal: trainerHand.forceDeal,
  forceScript: trainerHand.forceScript
});
const replayed = Engine.newHand(replayForce, cfg.playConfig);
assert(replayed.hero.cards.join('') === 'AsKd', 'replay héroe AsKd');
const rvSeat = (replayed._predeal && replayed._predeal.villainPos) || (replayed.villain && replayed.villain.pos);
const rvCards = rvSeat && replayed.table.holeCards[rvSeat] ? replayed.table.holeCards[rvSeat].join('') : '';
assert(rvCards === 'QsQd', 'replay villano QQ: ' + rvCards);
assert((replayed._predeal.board || []).slice(0, 3).join(' ') === '9c Tc 8c',
  'replay board flop: ' + (replayed._predeal.board || []).slice(0, 3).join(' '));

if (failed) { console.error('\n*** TEST FALLÓ ***'); process.exit(1); }
console.log('\n*** TEST HAND-ANALYSIS OK ***');
