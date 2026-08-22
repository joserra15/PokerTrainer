/*
 * Test: la equity de river se calcula contra un rango de apuesta POLARIZADO.
 *
 * Caso reportado: T♠Q♦ en K♦A♣2♠6♠T♦ afrontando 7.4bb en un bote de 8.8bb.
 * El rango de valor 'JJ+, AQs+, AKo, TT, AJs, KQs' no contiene ni una mano peor
 * que una pareja de dieces, así que la equity salía exactamente 0 % y el call
 * quedaba marcado como «Error −7.40bb». Un rango de apuesta equilibrado siempre
 * contiene faroles: una pareja hecha nunca puede tener 0 % de equity.
 *
 * Ejecutar: node tools/test-river-equity-polar.js
 */
'use strict';
const assert = require('assert');
const L = require('./load-engine-vm.js');

const sandbox = L.createSandbox();
L.loadEngine(sandbox);

const C = sandbox.window.Cards;
const GTO = sandbox.window.GTO;
const Eq = sandbox.window.GTOEquity;
const D = sandbox.window.GTORangesData;
const VT = sandbox.window.GTOVillainTracking;
const RS = sandbox.window.GTORiverShoveNode;

function pct(x) { return (x * 100).toFixed(1) + '%'; }

function riverOpts(betBB, potBeforeBB, villainLastAction) {
  const node = RS.classifyFacingNode(betBB, potBeforeBB, 'river', villainLastAction || 'bet');
  const shove = node === 'shove' || node === 'overbet';
  return {
    street: 'river',
    facingBet: betBB > 0 && !shove,
    riverShove: shove,
    shoveNode: shove,
    betBB: betBB,
    potBeforeBB: potBeforeBB,
    villainLastAction: villainLastAction || 'bet'
  };
}

/* ------------------------------------------------------------------ *
 * 1) Caso reportado: pareja de dieces afrontando una apuesta grande
 * ------------------------------------------------------------------ */
const HERO = ['Ts', 'Qd'];
const BOARD = ['Kd', 'Ac', '2s', '6s', 'Td'];
const POT_BEFORE = 8.8;
const TO_CALL = 7.4;
const POT_FINAL = POT_BEFORE + 2 * TO_CALL;
const POT_ODDS = TO_CALL / POT_FINAL;

assert.strictEqual(C.evaluate(HERO.concat(BOARD)).category, 1, 'Hero debe tener pareja de dieces');

const villainRange = VT.estimateActiveRange({
  baseRange: D.BROAD_CONTINUE,
  street: 'river',
  lastAction: 'bet',
  betBB: TO_CALL,
  potBeforeBB: POT_BEFORE,
  board: BOARD,
  tags: []
});

// El rango de valor por sí solo no contiene ninguna mano peor que la del héroe:
// es exactamente la condición que producía el 0 %.
const valueCombos = Eq.allVillainCombos(villainRange, HERO.concat(BOARD));
const beatenByHero = valueCombos.filter(function (vh) {
  return C.compare(C.evaluate(HERO.concat(BOARD)), C.evaluate(vh.concat(BOARD))) >= 0;
});
assert.strictEqual(beatenByHero.length, 0,
  'Precondición del bug: el rango de valor no contiene manos peores que la pareja de dieces');

const opts = riverOpts(TO_CALL, POT_BEFORE);
const eq = GTO.Equity.equityVsRange(HERO, BOARD, villainRange, 600, opts);
assert.ok(eq > 0.10, `Un bluff-catcher no puede tener ~0 % de equity; obtuvo ${pct(eq)}`);
assert.ok(eq <= POT_ODDS + 0.02,
  `Un bluff-catcher puro no debe superar las pot odds (${pct(POT_ODDS)}); obtuvo ${pct(eq)}`);

const spot = GTO.evaluateSpot({
  spotKind: 'postflop', street: 'river', board: BOARD, heroCards: HERO, handCode: 'QTo',
  villainRange, potBB: POT_BEFORE + TO_CALL, toCallBB: TO_CALL, potBeforeBB: POT_BEFORE,
  villainLastAction: 'bet', chosenAction: 'call',
  availableActions: ['fold', 'call', 'raise'],
  inPosition: true, initiative: 'aggressor', bbSizeEuro: 0.05
});
const mp = spot.evaluation.mathParams;
assert.ok(mp.equityPct > 10, `La UI no puede mostrar Equity 0 %; muestra ${mp.equityPct}%`);
assert.strictEqual(mp.potFinalBB, POT_FINAL, 'Pozo final debe ser bote + 2×apuesta');
assert.notStrictEqual(spot.evaluation.class, 'error',
  'Pagar con un bluff-catcher marginal no es un error grave');
// La ficha de EV tiene que cuadrar: ΔEV = óptimo − acción.
assert.ok(Math.abs(mp.deltaEV - (mp.bestEV - mp.actionEV)) < 0.06,
  `ΔEV ${mp.deltaEV} incoherente con óptimo ${mp.bestEV} − acción ${mp.actionEV}`);
assert.ok(spot.evaluation.evLoss <= TO_CALL,
  `La fuga de un call nunca supera la inversión (${TO_CALL}bb); got ${spot.evaluation.evLoss}`);

console.log('1) bluff-catcher river:', pct(eq), '| pot odds', pct(POT_ODDS),
  '| class', spot.evaluation.class, '| ΔEV', spot.evaluation.evLoss + 'bb');

/* ------------------------------------------------------------------ *
 * 2) Orden de fuerza: mejor mano nunca menos equity
 * ------------------------------------------------------------------ */
const ladder = [
  { cards: ['7h', '4h'], label: 'aire' },
  { cards: ['Th', 'Qh'], label: 'pareja de dieces' },
  { cards: ['Ah', '6h'], label: 'doble pareja' },
  { cards: ['Ah', 'Ad'], label: 'trío de ases' },
  { cards: ['Qh', 'Jh'], label: 'escalera broadway (nuts)' }
];
let prev = -1;
ladder.forEach(function (h) {
  const e = GTO.Equity.equityVsRange(h.cards, BOARD, villainRange, 600, opts);
  assert.ok(e >= prev - 1e-9,
    `Equity no monótona: ${h.label} ${pct(e)} < anterior ${pct(prev)}`);
  assert.ok(e >= 0 && e <= 1, `Equity fuera de rango para ${h.label}: ${e}`);
  console.log('2) ' + h.label.padEnd(28), pct(e));
  prev = e;
});
assert.strictEqual(prev, 1, 'La escalera broadway es la nuez absoluta: 100 %');

/* ------------------------------------------------------------------ *
 * 3) La cuota de faroles sigue al sizing
 * ------------------------------------------------------------------ */
const small = GTO.Equity.equityVsRange(HERO, BOARD, villainRange, 600, riverOpts(2.2, POT_BEFORE));
const big = GTO.Equity.equityVsRange(HERO, BOARD, villainRange, 600, riverOpts(13.2, POT_BEFORE));
assert.ok(big > small,
  `Cuanto mayor el sizing, más faroles debe contener el rango: ${pct(small)} → ${pct(big)}`);
assert.ok(Eq.gtoBluffShare(10, 10) > Eq.gtoBluffShare(5, 10), 'bluffShare debe crecer con el sizing');
console.log('3) sizing 25% bote:', pct(small), '| 150% bote:', pct(big));

/* ------------------------------------------------------------------ *
 * 4) Valor de showdown relativo al board (seco, pareado, 4 del palo)
 * ------------------------------------------------------------------ */
assert.strictEqual(Eq.hasShowdownValue(['Th', 'Qh'], BOARD), true, 'Pareja en board seco es valor');
assert.strictEqual(Eq.hasShowdownValue(['7h', '4h'], BOARD), false, 'Aire en board seco no es valor');

const PAIRED = ['6c', '8c', '3c', '3s', 'Ts'];
assert.strictEqual(Eq.hasShowdownValue(['Ah', 'Kd'], PAIRED), false,
  'En board pareado, jugar la pareja del board con kicker no es valor de showdown');
assert.strictEqual(Eq.hasShowdownValue(['8h', '8d'], PAIRED), true,
  'En board pareado, doble pareja sí es valor de showdown');
assert.strictEqual(Eq.hasShowdownValue(['Qc', 'Jc'], PAIRED), true, 'Color es valor de showdown');

const STRAIGHT_BOARD = ['5h', '6d', '7c', '8s', '9h'];
assert.strictEqual(Eq.hasShowdownValue(['Th', 'Jd'], STRAIGHT_BOARD), true,
  'Con escalera en la mesa, mejorarla sí es valor de showdown');
assert.strictEqual(Eq.hasShowdownValue(['Ah', 'Kd'], STRAIGHT_BOARD), false,
  'Con escalera en la mesa, un kicker alto no añade valor');
console.log('4) valor de showdown relativo al board: OK');

/* ------------------------------------------------------------------ *
 * 5) Board con 4 del mismo palo: el rango de apuesta es casi puro valor
 * ------------------------------------------------------------------ */
const FLUSH_BOARD = ['4h', 'Kc', '6c', '4c', '8c'];
assert.strictEqual(Eq.textureBluffFactor(FLUSH_BOARD, ['Kh', 'As']), 0.25,
  'Sin carta del palo en un board de 4 palos, apenas hay faroles que batir');
assert.strictEqual(Eq.textureBluffFactor(FLUSH_BOARD, ['Kh', 'Ac']), 1,
  'Con carta del palo, la textura no reduce la cuota de faroles');
const twoPairNoClub = GTO.computeHeroEquity({
  street: 'river', board: FLUSH_BOARD, heroCards: ['Kh', 'As'],
  villainRange: 'TT+, AJs+, KQs, QJs, JTs, AQo, AKo, 99, 88',
  potBB: 99.74, toCallBB: 48.6, potBeforeBB: 51.14, villainLastAction: 'bet',
  initiative: 'caller', inPosition: true
});
assert.ok(twoPairNoClub > 0 && twoPairNoClub < 0.12,
  `Doble pareja sin el palo en board de 4 palos: baja pero no 0 %; got ${pct(twoPairNoClub)}`);
console.log('5) doble pareja sin palo en board de 4 palos:', pct(twoPairNoClub));

/* ------------------------------------------------------------------ *
 * 6) Cotas absolutas: 0 % solo con la peor mano, 100 % solo con las nuts
 * ------------------------------------------------------------------ */
const spread = Eq.riverSpread(HERO, BOARD);
assert.strictEqual(spread.total, 990, 'Deben quedar C(45,2) = 990 manos posibles');
assert.ok(spread.beat > 0 && spread.lose > 0, 'La pareja de dieces gana a unas y pierde con otras');
assert.strictEqual(Eq.clampRiverEquity(0, HERO, BOARD) > 0, true,
  'Con manos que batir, la equity no puede quedar en 0 %');
assert.strictEqual(Eq.clampRiverEquity(1, HERO, BOARD) < 1, true,
  'Sin las nuts, la equity no puede quedar en 100 %');
assert.strictEqual(Eq.clampRiverEquity(1, ['Qh', 'Jh'], BOARD), 1,
  'Con la nuez absoluta la equity es 100 %');
console.log('6) cotas de cordura: gana', spread.beat, 'empata', spread.tie, 'pierde', spread.lose);

/* ------------------------------------------------------------------ *
 * 7) Barrido: cualquier river afrontando apuesta da equity sana
 * ------------------------------------------------------------------ */
C.rng.setSeed(20260822);
const BOARDS = [
  ['Kd', 'Ac', '2s', '6s', 'Td'],   // seco, carta alta
  ['6c', '8c', '3c', '3s', 'Ts'],   // pareado con 3 del palo
  ['Td', '9d', '4c', '5s', '8d'],   // 4 del palo + conectado
  ['5h', '6d', '7c', '8s', '9h'],   // escalera en la mesa
  ['Qs', '9h', '3h', '9d', '2d'],   // pareado seco
  ['As', 'Ks', 'Qs', 'Js', 'Ts'],   // escalera de color en la mesa
  ['7h', '7d', '7c', '2s', '2d']    // full en la mesa
];
const SIZINGS = [[3, 12], [8, 12], [14, 12], [30, 12]];
let checks = 0;
BOARDS.forEach(function (board) {
  const dead = new Set(board);
  const deck = C.fullDeck().filter(function (c) { return !dead.has(c); });
  for (let i = 0; i < 14; i++) {
    const a = deck[Math.floor(C.rng.random() * deck.length)];
    let b = deck[Math.floor(C.rng.random() * deck.length)];
    if (a === b) b = deck[(deck.indexOf(a) + 7) % deck.length];
    const hero = [a, b];
    SIZINGS.forEach(function (sz) {
      const o = riverOpts(sz[0], sz[1]);
      const range = VT.estimateActiveRange({
        baseRange: D.BROAD_CONTINUE, street: 'river', lastAction: 'bet',
        betBB: sz[0], potBeforeBB: sz[1], board: board, tags: []
      });
      const e = GTO.Equity.equityVsRange(hero, board, range, 400, o);
      assert.ok(typeof e === 'number' && !isNaN(e) && e >= 0 && e <= 1,
        `Equity inválida ${e} para ${hero.join('')} en ${board.join('')}`);
      const sp = Eq.riverSpread(hero, board);
      if (sp.beat + sp.tie > 0) {
        assert.ok(e > 0,
          `Equity 0 % con manos que batir: ${hero.join('')} en ${board.join('')} vs ${sz[0]}/${sz[1]}`);
      }
      if (sp.lose > 0) {
        assert.ok(e < 1,
          `Equity 100 % sin las nuts: ${hero.join('')} en ${board.join('')} vs ${sz[0]}/${sz[1]}`);
      }
      checks++;
    });
  }
});
console.log('7) barrido river:', checks, 'combinaciones board × mano × sizing sin equity degenerada');

/* ------------------------------------------------------------------ *
 * 8) Extremo a extremo: la mano importada del caso reportado
 * ------------------------------------------------------------------ */
const fs = require('fs');
const path = require('path');

const impBox = L.createSandbox();
L.loadTrainer(impBox);
L.runFiles(impBox, [
  'js/import/hhUtils.js', 'js/import/formatDetector.js', 'js/import/icmLite.js',
  'js/import/populationCompare.js', 'js/import/tournamentSummary.js',
  'js/import/parsers/pokerstars.js', 'js/import/parsers/winamax.js',
  'js/import/parsers/ggpoker.js', 'js/import/parsers/eightyeight.js',
  'js/import/parsers/coinpoker.js', 'js/import.js'
]);
const Importer = impBox.window.Importer;
const fixture = path.join(__dirname, 'fixtures', 'river-bluffcatch-sample.txt');
const parsedSession = Importer.parseSession(fs.readFileSync(fixture, 'utf8'), 'river-bluffcatch-sample.txt');
const session = Importer.buildSession(parsedSession, 'river-bluffcatch-sample.txt');
const hand = session.hands[0];

assert.strictEqual(session.hero, 'KazeDj', 'Héroe de la mano de prueba');
assert.strictEqual(hand.positions.KazeDj, 'HJ', 'El héroe es HJ');
assert.strictEqual(hand.positions.sanje35, 'BB', 'El villano es BB');

const river = hand.decisions.find(function (d) { return d.street === 'river'; });
assert.ok(river, 'Debe existir una decisión de river');
assert.strictEqual(river.chosen, 'call', 'El héroe pagó en river');
assert.strictEqual(river.potBeforeBB, 8.8, 'Bote antes de la apuesta de river');
assert.strictEqual(river.toCallBB, 7.4, 'Apuesta afrontada en river');
assert.ok(river.heroEquity > 10,
  `La equity mostrada no puede ser 0 %; muestra ${river.heroEquity}%`);
assert.ok(river.heroEquityExact > 0.10 && river.heroEquityExact < 1,
  'La equity se guarda con precisión completa: ' + river.heroEquityExact);
assert.notStrictEqual(river.class, 'error',
  'Pagar con pareja de dieces vs un rango polarizado no es un error grave');
assert.ok(river.evLoss < 3,
  `ΔEV del call debe ser marginal, no ~7.4bb; got ${river.evLoss}bb`);

// Sesiones antiguas: sin heroEquityExact y con un 0 % redondeado, el refresco
// recalcula la equity en vez de arrastrar el cero.
delete river.heroEquityExact;
river.heroEquity = 0;
Importer.recomputeHandDecisions(hand);
const refreshed = hand.decisions.find(function (d) { return d.street === 'river'; });
assert.ok(refreshed.heroEquity > 10,
  `El refresco debe recalcular la equity, no reutilizar el 0 %; got ${refreshed.heroEquity}%`);
assert.ok(refreshed.mathParams && refreshed.mathParams.equityPct > 10,
  'mathParams.equityPct tras refrescar: ' + (refreshed.mathParams || {}).equityPct);
assert.ok(Math.abs(refreshed.mathParams.deltaEV
  - (refreshed.mathParams.bestEV - refreshed.mathParams.actionEV)) < 0.06,
  'ΔEV coherente con EV acción/óptimo tras refrescar');

console.log('8) mano importada river:', 'eq', refreshed.heroEquity + '%',
  '| class', refreshed.class, '| ΔEV', refreshed.evLoss + 'bb',
  '| EV acción', refreshed.mathParams.actionEV + 'bb');

console.log('\n*** test-river-equity-polar OK ***');
