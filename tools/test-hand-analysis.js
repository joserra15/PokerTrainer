/* Test: análisis de manos manual (specToRawHand -> analyzeHand) e inyección de cartas fijas en el entrenador. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON };
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js',
  'engine/cache.js', 'engine/format/taxonomy.js',
  'engine/ranges/notation.js',
  'engine/ranges/data.js',
  'engine/ranges/extended.js',
  'engine/ranges/variants.js', 'engine/ranges/pushFold.js',
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
  'engine/solver/strategyTables.js', 'engine/solver/bluffSpotDetector.js',
  'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js', 'engine/scoring/icmEv.js',
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
  'import/icmLite.js', 'import/populationCompare.js',
  'import/parsers/pokerstars.js',
  'import/parsers/winamax.js', 'import/parsers/ggpoker.js',
  'import/parsers/eightyeight.js',
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
assert(displayRaise[1].amountLocked === false && displayRaise[2].amountLocked === false, 'calls editables (sin candado)');

// Re-raise + call final (secuencia de varias subidas)
const display3bet = PTHandAnalysis.computeStreetDisplayActions('preflop', [
  { pos: 'CO', action: 'raise', amountBB: 2.5 },
  { pos: 'BTN', action: 'raise', amountBB: 8 },
  { pos: 'CO', action: 'call' },
  { pos: 'BB', action: 'call' }
]);
assert(display3bet[2] && display3bet[2].derivedAmountBB === 5.5, 'CO call tras 3bet = 8-2.5: ' + (display3bet[2] && display3bet[2].derivedAmountBB));
assert(display3bet[3] && display3bet[3].derivedAmountBB === 7, 'BB call final tras 3bet = 8-1: ' + (display3bet[3] && display3bet[3].derivedAmountBB));
assert(display3bet[3].amountLocked === false, 'último call editable');

// River: bet → raise → re-raise → call (totales)
const riverReraise = PTHandAnalysis.computeStreetDisplayActions('river', [
  { pos: 'SB', action: 'bet', amountBB: 15 },
  { pos: 'BB', action: 'raise', amountBB: 65.98 },
  { pos: 'SB', action: 'raise', amountBB: 120 },
  { pos: 'BB', action: 'call' }
]);
assert(riverReraise[3] && Math.abs(riverReraise[3].derivedAmountBB - 54.02) < 1e-9,
  'BB call tras re-raise river = 120-65.98: ' + (riverReraise[3] && riverReraise[3].derivedAmountBB));
assert(riverReraise[3].amountLocked === false, 'call river tras resubidas editable');

// Raise escrito como tamaño (≤ toMatch) se interpreta como incremento
const riverRaiseBy = PTHandAnalysis.computeStreetDisplayActions('river', [
  { pos: 'SB', action: 'bet', amountBB: 15 },
  { pos: 'BB', action: 'raise', amountBB: 65.98 },
  { pos: 'SB', action: 'raise', amountBB: 41.68 },
  { pos: 'BB', action: 'call' }
]);
assert(Math.abs(riverRaiseBy[3].derivedAmountBB - 41.68) < 1e-9,
  'raise-by 41.68 → BB call 41.68: ' + riverRaiseBy[3].derivedAmountBB);
const riverRaiseByFilled = PTHandAnalysis.computeStreetDisplayActions('river', [
  { pos: 'SB', action: 'bet', amountBB: 15 },
  { pos: 'BB', action: 'raise', amountBB: 65.98 },
  { pos: 'SB', action: 'raise', amountBB: 41.68 },
  { pos: 'BB', action: 'call' }
], { fillDefaults: true });
assert(Math.abs(riverRaiseByFilled[2].amountBB - 107.66) < 1e-9,
  'fillDefaults normaliza raise-by a total 107.66: ' + riverRaiseByFilled[2].amountBB);

// Misma línea con call intermedio (captura del bug) + raise corto
const riverBugShot = PTHandAnalysis.computeStreetDisplayActions('river', [
  { pos: 'SB', action: 'bet', amountBB: 15 },
  { pos: 'BB', action: 'raise', amountBB: 65.98 },
  { pos: 'SB', action: 'call' },
  { pos: 'SB', action: 'raise', amountBB: 41.68 },
  { pos: 'BB', action: 'call' }
]);
assert(Math.abs(riverBugShot[4].derivedAmountBB - 41.68) < 1e-9,
  'tras call+raise-by, BB call auto = 41.68 (antes 0): ' + riverBugShot[4].derivedAmountBB);

// Ante de torneo en spec manual
assert(PTHandAnalysis.normalizeAnteBB(-1) === 0, 'ante negativo → 0');
assert(PTHandAnalysis.normalizeAnteBB(0.1) === 0.1, 'ante 0.1 bb');
const anteNorm = PTHandAnalysis.normalizeAnteBB(0.125);
const specAnte = Object.assign({}, spec, { anteBB: 0.125, bbEuro: 0.05 });
const rawAnte = PTHandAnalysis.specToRawHand(specAnte);
assert(rawAnte.isTournament === true && rawAnte.isCash === false, 'ante > 0 marca torneo');
assert(Math.abs(rawAnte.ante - anteNorm * 0.05) < 1e-9, 'ante € = anteBB*BB: ' + rawAnte.ante);
assert(Math.abs((rawAnte.posts.UTG || 0) - rawAnte.ante) < 1e-9, 'todos los asientos postean ante');
assert(Math.abs(rawAnte.posts.BB - (0.05 + rawAnte.ante)) < 1e-9, 'BB = ciega + ante');
const anAnte = PTHandAnalysis.buildAnalyzedHand(specAnte, 'manual');
assert(anAnte.spec.anteBB === anteNorm, 'anteBB persistido en spec: ' + anAnte.spec.anteBB);
const draftAnte = PTHandAnalysis.draftFromSpec(anAnte.spec);
assert(draftAnte.anteBB === anteNorm, 'draft conserva anteBB: ' + draftAnte.anteBB);

// Raise vacío no debe tumbar el cálculo del call (usa mínimo provisional)
const displayEmptyRaise = PTHandAnalysis.computeStreetDisplayActions('preflop', [
  { pos: 'CO', action: 'raise', amountBB: null },
  { pos: 'BB', action: 'call' }
]);
assert(displayEmptyRaise[0].amountBB == null, 'raise vacío se conserva vacío al editar');
assert(displayEmptyRaise[1].derivedAmountBB === 2, 'call tras raise vacío usa mínimo lógico (3-1): ' + displayEmptyRaise[1].derivedAmountBB);

const filledRaise = PTHandAnalysis.computeStreetDisplayActions('preflop', [
  { pos: 'CO', action: 'raise', amountBB: null },
  { pos: 'BB', action: 'call' }
], { fillDefaults: true });
assert(filledRaise[0].amountBB === 3, 'fillDefaults rellena raise vacío a 3bb');

// Call manual respetado en specToRawHand
const rawManualCall = PTHandAnalysis.specToRawHand({
  format: '6max', heroPos: 'BB', heroCards: ['Ah', 'Kd'],
  bbEuro: 0.05,
  villains: [{ pos: 'CO', cards: [] }],
  board: [],
  actions: {
    preflop: [
      { pos: 'CO', action: 'raise', amountBB: 2.5 },
      { pos: 'BB', action: 'call', amountBB: 1.5 }
    ],
    flop: [], turn: [], river: []
  }
});
const bbCall = rawManualCall.streets.preflop.find((a) => a.player === 'BB' && a.type === 'call');
assert(bbCall && Math.abs(bbCall.amount - 0.075) < 1e-6, 'call manual 1.5bb → €: ' + (bbCall && bbCall.amount));

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
assert(draft.actions.flop.map((a) => a.pos).join(',') === 'BB,CO,BTN',
  'flop orden de habla SB→…: ' + draft.actions.flop.map((a) => a.pos).join(','));
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

// --- 12) raise postflop sin apuesta previa → bet + sizing GTO ---
const specOpenRaise = {
  format: '6max',
  heroPos: 'BTN',
  heroCards: ['As', 'Ah'],
  bbEuro: 0.20,
  villains: [{ pos: 'BB', cards: [] }, { pos: 'HJ', cards: [] }],
  board: ['Ks', 'Th', '6s'],
  actions: {
    preflop: [
      { pos: 'HJ', action: 'call', amountBB: 1 },
      { pos: 'BTN', action: 'raise', amountBB: 5 },
      { pos: 'BB', action: 'call' },
      { pos: 'HJ', action: 'call' }
    ],
    flop: [
      { pos: 'BB', action: 'check' },
      { pos: 'HJ', action: 'check' },
      { pos: 'BTN', action: 'raise', amountBB: 15 }
    ],
    turn: [],
    river: []
  },
  _source: 'manual'
};
const rawOpen = PTHandAnalysis.specToRawHand(specOpenRaise);
const btnFlopAct = rawOpen.streets.flop.find((a) => a.player === 'BTN');
assert(btnFlopAct && btnFlopAct.type === 'bet', 'raise sin prior → bet en raw: ' + (btnFlopAct && btnFlopAct.type));
const anOpen = PTHandAnalysis.buildAnalyzedHand(specOpenRaise, 'manual');
const flopDec = (anOpen.decisions || []).find((d) => d.street === 'flop');
assert(flopDec && String(flopDec.chosen).indexOf('bet') === 0,
  'chosen mapea a bet_*: ' + (flopDec && flopDec.chosen));
assert(flopDec.class === 'optima' || flopDec.class === 'aceptable',
  'no marcar error por raise mal etiquetado: ' + flopDec.class + ' ΔEV=' + flopDec.evLoss);
assert(PTHandAnalysis.speakingOrderRing('6max', 'flop').join(',') === 'SB,BB,UTG,HJ,CO,BTN',
  'anillo postflop desde SB');

// --- 13) editar mano IA: villanos vacíos no deben borrar acciones ---
const aiSpecSparse = {
  format: '6max',
  heroPos: 'SB',
  heroCards: ['Jh', '9h'],
  villains: [],
  board: ['Ac', 'Qc', '5h', 'Th', '2s'],
  bbEuro: 0.05,
  actions: {
    preflop: [
      { pos: 'HJ', action: 'raise', amountBB: 7.6 },
      { pos: 'BTN', action: 'call', amountBB: 7.6 },
      { pos: 'SB', action: 'call', amountBB: 6.6 },
      { pos: 'BB', action: 'call', amountBB: 6.6 },
      { pos: 'UTG', action: 'call', amountBB: 5.6 }
    ],
    flop: [
      { pos: 'UTG', action: 'check' },
      { pos: 'HJ', action: 'check' },
      { pos: 'BTN', action: 'check' },
      { pos: 'SB', action: 'check' },
      { pos: 'BB', action: 'check' }
    ],
    turn: [
      { pos: 'SB', action: 'bet', amountBB: 10 },
      { pos: 'BB', action: 'call', amountBB: 10 },
      { pos: 'HJ', action: 'call', amountBB: 10 }
    ],
    river: [
      { pos: 'SB', action: 'bet', amountBB: 20 }
    ]
  },
  _source: 'text'
};
const filled = PTHandAnalysis.ensureVillainsFromActions(JSON.parse(JSON.stringify(aiSpecSparse)));
const vPos = filled.villains.map((v) => v.pos).sort().join(',');
assert(vPos === 'BB,BTN,HJ,UTG', 'villanos inferidos de acciones: ' + vPos);
assert(filled.villains.every((v) => Array.isArray(v.cards)), 'villanos sin cartas conocidas → cards []');

const draftEdit = PTHandAnalysis.draftFromSpec(filled);
PTHandAnalysis.syncActionsFromSeats(draftEdit);
assert(draftEdit.actions.preflop.length === 5,
  'editar conserva 5 acciones preflop: ' + draftEdit.actions.preflop.length);
assert(draftEdit.actions.preflop.map((a) => a.pos).join(',') === 'HJ,BTN,SB,BB,UTG',
  'orden temporal preflop al editar: ' + draftEdit.actions.preflop.map((a) => a.pos).join(','));
assert(draftEdit.actions.flop.length === 5, 'editar conserva checks del flop');
assert(draftEdit.actions.turn.some((a) => a.pos === 'SB' && a.action === 'bet' && a.amountBB === 10),
  'editar conserva lead turn 10bb');
assert(draftEdit.actions.turn.some((a) => a.pos === 'BB' && a.action === 'call'),
  'editar conserva call BB en turn');
assert(draftEdit.actions.turn.some((a) => a.pos === 'HJ' && a.action === 'call'),
  'editar conserva call HJ en turn');
assert(draftEdit.actions.river.some((a) => a.pos === 'SB' && a.action === 'bet'),
  'editar conserva bet river del héroe');

// ensureHandSpec con spec incompleto (villains []) como manos IA guardadas
const anSparse = PTHandAnalysis.buildAnalyzedHand(Object.assign({}, aiSpecSparse, {
  villains: []
}), 'text');
// Simular lo que a veces queda guardado: acciones completas, villains vacíos
anSparse.spec.villains = [];
const recovered = PTHandAnalysis.ensureHandSpec(anSparse);
assert(recovered.villains.map((v) => v.pos).sort().join(',') === 'BB,BTN,HJ,UTG',
  'ensureHandSpec recupera villanos: ' + recovered.villains.map((v) => v.pos).sort().join(','));
const draftFromHand = PTHandAnalysis.draftFromSpec(recovered);
PTHandAnalysis.syncActionsFromSeats(draftFromHand);
assert(draftFromHand.actions.preflop.filter((a) => a.pos === 'HJ').length === 1,
  'tras sync sigue el open de HJ');
assert(draftFromHand.villains.filter((v) => v.pos).length === 4,
  'draft de edición tiene 4 villanos');

// Caso bug: sync SIN completar villanos borra acciones (regresión documentada)
const draftBroken = PTHandAnalysis.draftFromSpec(Object.assign({}, aiSpecSparse, {
  villains: [{ pos: '', cards: [] }]
}));
PTHandAnalysis.syncActionsFromSeats(draftBroken);
assert(draftBroken.actions.preflop.every((a) => a.pos === 'SB'),
  'sin villanos, sync solo deja al héroe (comportamiento documentado)');
assert(draftBroken.actions.preflop.length <= 2,
  'sin villanos las acciones rivales desaparecen');

// Historial Winamax pegado: parse local con resultado real positivo (trips ganan main pot)
const wmHh = `Winamax Poker - ESCAPE "Colorado" - HandId: #22618550-211764-1783203261 - Holdem no limit (0.01€/0.02€) - 2026/07/04 22:14:21 UTC
Table: 'Colorado' 6-max (real money) Seat #6 is the button
Seat 1: JOY_BERCK (2.86€)
Seat 2: dryer (1.37€)
Seat 3: Zzz Loustic (4.64€)
Seat 4: Anyiinca (5.78€)
Seat 5: SYGOWIN (3.75€)
Seat 6: KazeDj (2.16€)
*** ANTE/BLINDS ***
JOY_BERCK posts small blind 0.01€
dryer posts big blind 0.02€
Dealt to KazeDj [Tc Td]
*** PRE-FLOP ***
Zzz Loustic folds
Anyiinca folds
SYGOWIN raises 0.03€ to 0.05€
KazeDj raises 0.10€ to 0.15€
JOY_BERCK folds
dryer folds
SYGOWIN calls 0.10€
*** FLOP *** [Th Qh 6h]
SYGOWIN checks
KazeDj bets 0.21€
SYGOWIN calls 0.21€
*** TURN *** [Th Qh 6h][Kd]
SYGOWIN checks
KazeDj bets 0.49€
SYGOWIN raises 2.90€ to 3.39€ and is all-in
KazeDj calls 1.31€ and is all-in
*** RIVER *** [Th Qh 6h Kd][5s]
*** SHOW DOWN ***
SYGOWIN shows [Kh Ts] (Two pairs : Kings and Tens)
KazeDj shows [Tc Td] (Trips of Tens)
KazeDj collected 3.91€ from main pot
SYGOWIN collected 1.59€ from side pot 1
*** SUMMARY ***
Total pot 5.50€ | Rake 0.44€
Board: [Th Qh 6h Kd 5s]
Seat 5: SYGOWIN showed [Kh Ts] and won 1.59€ with Two pairs : Kings and Tens
Seat 6: KazeDj (button) showed [Tc Td] and won 3.91€ with Trips of Tens
`;
assert(PTHandAnalysis.looksLikeHandHistory(wmHh), 'detecta HH Winamax');
const fromHh = PTHandAnalysis.tryImportHandHistory(wmHh);
assert(!!fromHh, 'importa HH Winamax sin IA');
assert(fromHh && fromHh.heroNetBB === 87.5, 'HH import heroNetBB 87.5 (era −108 sin collected)');
assert(fromHh && fromHh.collected && fromHh.collected.KazeDj === 3.91, 'HH import conserva collected main pot');
assert(fromHh && fromHh.source === 'handhistory', 'fuente handhistory');

if (failed) { console.error('\n*** TEST FALLÓ ***'); process.exit(1); }
console.log('\n*** TEST HAND-ANALYSIS OK ***');
