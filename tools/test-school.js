/* Escuela de Póker M0: datos, spots RFI forzados y progreso. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
const chunks = fs.readFileSync(path.join(root, 'js/bundle-chunks.js'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'js/pt-loader.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

assert.ok(/data-tab="school"/.test(html), 'nav school');
assert.ok(/id="tab-school"/.test(html), 'panel school');
assert.ok(/Escuela de Póker/.test(html), 'label Escuela');
assert.ok(/tab-school/.test(css) && /pt-is-admin/.test(css), 'CSS admin gate school');
assert.ok(/school:\s*\[/.test(chunks), 'chunk school');
assert.ok(/school:\s*'dist\/pt-school\.js'/.test(loader), 'loader school');
assert.ok(/tabId === 'school'/.test(app), 'goToTab school');
assert.ok(/PTSchool\.afterTrainerAction/.test(app), 'hook afterTrainerAction');

const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Set,
  Map,
  JSON,
  localStorage: {
    _d: {},
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem: function (k, v) { this._d[k] = String(v); },
    removeItem: function (k) { delete this._d[k]; }
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

const engineScripts = [
  'js/cards.js',
  'js/engine/cache.js',
  'js/engine/format/taxonomy.js',
  'js/engine/ranges/notation.js',
  'js/engine/ranges/data.js',
  'js/engine/ranges/extended.js',
  'js/engine/ranges/variants.js',
  'js/engine/ranges/pushFold.js',
  'js/engine/ranges/registry.js',
  'js/engine/ranges/weights.js',
  'js/engine/ranges/villainTracking.js',
  'js/engine/handStrength.js',
  'js/engine/equity/madeHand.js',
  'js/engine/math/potMath.js',
  'js/engine/math/evMath.js',
  'js/engine/equity/monteCarlo.js',
  'js/engine/equity/handRank.js',
  'js/engine/equity/blockers.js',
  'js/engine/solver/boardCluster.js',
  'js/engine/validation/boardTextureShift.js',
  'js/engine/validation/villainCallAudit.js',
  'js/engine/validation/streetStrategy.js',
  'js/engine/solver/rangeAdvantage.js',
  'js/engine/solver/riverShoveNode.js',
  'js/engine/solver/probeEV.js',
  'js/engine/solver/villainStrategyAdjust.js',
  'js/engine/solver/preflopSolver.js',
  'js/engine/solver/facingBet.js',
  'js/engine/solver/spotKey.js',
  'js/engine/solver/strategyTables.js',
  'js/engine/solver/bluffSpotDetector.js',
  'js/engine/solver/SolverProvider.js',
  'js/engine/scoring/classifier.js',
  'js/engine/scoring/icmEv.js',
  'js/engine/scoring/evLoss.js',
  'js/engine/scoring/scoring.js',
  'js/engine/scoring/errors.js',
  'js/engine/explanations/rules.js',
  'js/engine/solver/LocalSolverProvider.js',
  'js/engine/evaluateSpot.js',
  'js/engine/villainProfiles.js',
  'js/engine/villainPreflop.js',
  'js/engine/multiway.js',
  'js/engine/stacks.js',
  'js/play-config.js',
  'js/ranges.js',
  'js/engine.js',
  'js/school-data.js',
  'js/school.js'
];

engineScripts.forEach(function (rel) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
});

const Data = sandbox.PTSchoolData;
const School = sandbox.PTSchool;
const Engine = sandbox.Engine || sandbox.window.Engine;
assert.ok(Data && School && Engine, 'APIs cargadas');

const lessons = Data.lessonsForRoute('cash');
assert.strictEqual(lessons.length, 5, 'M0 tiene 5 lecciones');
assert.strictEqual(
  lessons.map(function (l) { return l.id; }).join(','),
  'C-00,C-01,C-02,C-03,C-04',
  'ids M0 en orden'
);

let spotCount = 0;
lessons.forEach(function (lesson) {
  (lesson.spots || []).forEach(function (spot) {
    spotCount += 1;
    const force = {
      type: spot.type || 'RFI',
      heroPos: spot.heroPos,
      seed: spot.seed,
      forceDeal: spot.forceDeal
    };
    const cfg = {
      scenario: 'rfi',
      practiceStreet: 'preflop',
      handRange: 'all',
      villainLevel: 'fish',
      formatHub: 'cash',
      gameType: 'cash6',
      schoolDecisionEnd: true
    };
    const hand = Engine.newHand(force, cfg);
    assert.ok(hand && hand.hero && hand.hero.cards, 'mano ' + spot.id);
    assert.strictEqual(hand.hero.cards.join(''), spot.forceDeal.heroCards.join(''), 'cartas ' + spot.id);
    assert.ok(hand.current && hand.current.options && hand.current.options.length, 'opciones ' + spot.id);
    const ids = hand.current.options.map(function (o) { return o.id; });
    assert.ok(ids.indexOf('fold') >= 0, 'fold disponible ' + spot.id);
    assert.ok(ids.indexOf('raise') >= 0, 'raise disponible ' + spot.id);

    const raiseHand = Engine.newHand(force, cfg);
    const raiseRes = Engine.act(raiseHand, 'raise');
    assert.ok(raiseRes && raiseRes.decision && raiseRes.decision.class, 'grade raise ' + spot.id);

    const foldHand = Engine.newHand(force, cfg);
    const foldRes = Engine.act(foldHand, 'fold');
    assert.ok(foldRes && foldRes.decision && foldRes.decision.class, 'grade fold ' + spot.id);

    const bestRaise = raiseRes.decision.class === 'optima' || raiseRes.decision.class === 'aceptable';
    const bestFold = foldRes.decision.class === 'optima' || foldRes.decision.class === 'aceptable';
    assert.ok(bestRaise || bestFold, 'al menos una acción razonable en ' + spot.id);
  });
});
assert.ok(spotCount >= 50, 'suficientes spots M0: ' + spotCount);

/* Progreso / desbloqueo con Store mínimo */
sandbox.Store = {
  _st: { handsPlayed: 0, school: { xp: 0, lessons: {}, updatedAt: 0 } },
  getStats: function () { return this._st; },
  persistStats: function (st) { this._st = st; },
  saveHand: function () { return {}; }
};
assert.ok(School.isLessonUnlocked('C-00'), 'C-00 desbloqueada');
assert.ok(!School.isLessonUnlocked('C-01'), 'C-01 bloqueada al inicio');

School._state.view = 'hub';
const summary = School.startLessonSession
  ? (function () {
    /* C-00 sin spots: completa teoría */
    School.startLessonSession('C-00');
    return School._state.lastResult && School._state.lastResult.summary;
  })()
  : null;
assert.ok(summary && summary.passed, 'C-00 se completa');
assert.ok(School.isLessonPassed('C-00'), 'C-00 passed');
assert.ok(School.isLessonUnlocked('C-01'), 'C-01 desbloqueada tras C-00');

console.log('*** school M0 OK (' + spotCount + ' spots) ***');
