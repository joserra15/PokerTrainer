/* Escuela de Póker M0 v2: 7 lecciones gratis, spots RFI, migración C-04→C-06. */
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
const schoolDataSrc = fs.readFileSync(path.join(root, 'js/school-data.js'), 'utf8');
const schoolSrc = fs.readFileSync(path.join(root, 'js/school.js'), 'utf8');

assert.ok(/data-tab="school"/.test(html), 'nav school');
assert.ok(/id="tab-school"/.test(html), 'panel school');
assert.ok(/Escuela de Póker/.test(html), 'label Escuela');
assert.ok(/tab-school/.test(css) && /pt-is-admin/.test(css), 'CSS admin gate school');
assert.ok(/school:\s*\[/.test(chunks), 'chunk school');
assert.ok(/school:\s*'dist\/pt-school\.js'/.test(loader), 'loader school');
assert.ok(/tabId === 'school'/.test(app), 'goToTab school');
assert.ok(/PTSchool\.afterTrainerAction/.test(app), 'hook afterTrainerAction');
assert.ok(/canPlayLesson/.test(schoolSrc), 'canPlayLesson preparado Fase D');
assert.ok(/migrateSchoolProgress|C-06/.test(schoolSrc), 'migración v2');
assert.ok(/Sizing del open|RFI desde SB|Examen M0/.test(schoolDataSrc), 'lecciones M0 v2');

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
assert.strictEqual(Data.SCHOOL_DATA_VERSION, 2, 'data version 2');

const lessons = Data.lessonsForRoute('cash');
assert.strictEqual(lessons.length, 7, 'M0 tiene 7 lecciones');
assert.strictEqual(
  lessons.map(function (l) { return l.id; }).join(','),
  'C-00,C-01,C-02,C-03,C-04,C-05,C-06',
  'ids M0 en orden'
);
assert.strictEqual(Data.getLesson('C-04').title, 'Sizing del open', 'C-04 sizing');
assert.strictEqual(Data.getLesson('C-05').title, 'RFI desde SB', 'C-05 SB');
assert.ok(/Examen/.test(Data.getLesson('C-06').title), 'C-06 examen');
lessons.forEach(function (l) {
  assert.strictEqual(l.plan, 'free', l.id + ' plan free');
});

/* Voz pedagógica: conceptos clave se introducen una vez en M0 */
assert.ok(/Estilo de texto|profesor/.test(schoolDataSrc), 'guía de estilo en school-data');

/* Verbo limpear: en textos de lección no usar limpiar=limp */
(function () {
  var blob = '';
  Data.LESSONS.forEach(function (l) {
    blob += ' ' + (l.concept || '');
    (l.theory || []).forEach(function (x) { blob += ' ' + x; });
    (l.examples || []).forEach(function (ex) { blob += ' ' + (ex.title || '') + ' ' + (ex.body || ''); });
    (l.aiQuestions || []).forEach(function (q) { blob += ' ' + q; });
    (l.spots || []).forEach(function (s) { blob += ' ' + (s.teachBack || ''); });
  });
  assert.ok(!/\b[Ll]impiar\b|\blimpies\b|\blimpias\b|\blimpiao\b/.test(blob), 'lecciones sin limpiar=limp');
  assert.ok(/\b[Ll]impear\b|\blimpees\b|\blimpeas\b|\blimpeado\b/.test(blob), 'lecciones usan limpear');
})();

assert.ok(/hacen call \(si te igualan la apuesta\)/.test(Data.getLesson('C-01').theory.join(' ')), 'C-01 explica call');
assert.ok(
  /todos folden \(tiren su mano\)/.test(Data.getLesson('C-03').concept) &&
    /no limpear para/.test(Data.getLesson('C-03').concept),
  'C-03 concept folden + no limpear'
);
assert.ok(/o te tiras/.test(Data.getLesson('C-03').theory.join(' ')), 'C-03 te tiras');
assert.ok(/limpees .por si conecta./.test(Data.getLesson('C-03').examples[0].body) || /limpees “por si conecta”/.test(Data.getLesson('C-03').examples[0].body), 'C-03 ejemplo limpees');

assert.ok(
  /Limpear \(o limp\) es igualar la ciega grande/.test(Data.getLesson('C-02').theory.join(' ')),
  'C-02 explica limpear la primera vez'
);
assert.ok(
  /menú Rangos/.test(Data.getLesson('C-02').theory.join(' ')),
  'C-02 apunta a rangos RFI en menú Rangos'
);
assert.ok(
  /Fold equity es la probabilidad/.test(Data.getLesson('C-03').theory.join(' ')),
  'C-03 define fold equity'
);
assert.ok(
  /Sizing es el tamaño/.test(Data.getLesson('C-04').theory.join(' ')) &&
    /bb \(ciegas grandes\)/.test(Data.getLesson('C-04').theory.join(' ')),
  'C-04 define sizing/bb'
);
assert.ok(
  /fuera de posición|OOP \(out of position\)/.test(Data.getLesson('C-05').theory.join(' ')),
  'C-05 introduce OOP'
);
assert.ok(/si hacen call, siempre juegas fuera de posición/.test(Data.getLesson('C-05').concept), 'C-05 concept call');
assert.ok(/polar \(/.test(Data.getLesson('C-05').examples[0].body) && /wide \(/.test(Data.getLesson('C-05').examples[0].body), 'C-05 ejemplo explica polar y wide');

assert.ok(
  !/Limpear \(o limp\) es igualar/.test(Data.getLesson('C-03').theory.join(' ')),
  'C-03 no redefine limp'
);
lessons.forEach(function (l) {
  assert.ok((l.concept || '').length > 40, l.id + ' concept no telegráfico');
  (l.theory || []).forEach(function (t, i) {
    assert.ok(t.length > 60, l.id + ' theory[' + i + '] demasiado corta');
  });
  (l.spots || []).forEach(function (s) {
    assert.ok((s.teachBack || '').length > 25, l.id + ' teachBack ' + s.id);
  });
});
assert.ok(/4\.5 Voz pedagógica/.test(fs.readFileSync(path.join(root, 'docs/ROADMAP_LECCIONES_DIRIGIDAS.md'), 'utf8')), 'roadmap §4.5');


/* Validar códigos de carta */
(function () {
  const re = /\['([A-Za-z0-9]{2})',\s*'([A-Za-z0-9]{2})'\]/g;
  let m;
  const bad = [];
  while ((m = re.exec(schoolDataSrc))) {
    [m[1], m[2]].forEach(function (c) {
      if (!/^[AKQJT98765432][hdcs]$/.test(c)) bad.push(c);
    });
  }
  assert.strictEqual(bad.length, 0, 'cartas válidas: ' + bad.join(','));
})();

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

    assert.strictEqual(raiseHand.stage, 'complete', 'raise corta en complete ' + spot.id);
    assert.ok(!raiseHand.board || raiseHand.board.length === 0, 'sin board tras decisionEnd ' + spot.id);
    assert.ok(raiseHand.result && raiseHand.result.school, 'result.school ' + spot.id);
    assert.strictEqual(foldHand.stage, 'complete', 'fold complete ' + spot.id);
  });
});
assert.ok(spotCount >= 70, 'suficientes spots M0 v2: ' + spotCount);

/* Control: sin schoolDecisionEnd puede avanzar */
(function () {
  const spot = Data.getLesson('C-02').spots[0];
  const force = {
    type: 'RFI',
    heroPos: spot.heroPos,
    seed: spot.seed,
    forceDeal: spot.forceDeal
  };
  const cfgNoCut = {
    scenario: 'rfi',
    practiceStreet: 'preflop',
    handRange: 'all',
    villainLevel: 'fish',
    formatHub: 'cash',
    gameType: 'cash6'
  };
  const h = Engine.newHand(force, cfgNoCut);
  Engine.act(h, 'raise');
  assert.ok(h.stage === 'complete' || h.stage === 'flop' || h.stage === 'preflop',
    'raise sin decisionEnd avanza o completa: ' + h.stage);
})();

/* Migración C-04 (examen v1) → C-06 */
(function () {
  const migrated = School.migrateSchoolProgress({
    xp: 150,
    version: 1,
    lessons: {
      'C-00': { passed: true, bestScore: 1, bestPct: 100, attempts: 1 },
      'C-01': { passed: true, bestScore: 0.8, bestPct: 80, attempts: 2 },
      'C-02': { passed: true, bestScore: 0.75, bestPct: 75, attempts: 1 },
      'C-03': { passed: true, bestScore: 0.7, bestPct: 70, attempts: 1 },
      'C-04': { passed: true, bestScore: 0.85, bestPct: 85, attempts: 3, gold: true }
    }
  });
  assert.strictEqual(migrated.version, 2, 'version 2 tras migrate');
  assert.ok(migrated.lessons['C-06'] && migrated.lessons['C-06'].passed, 'examen migrado a C-06');
  assert.ok(!migrated.lessons['C-04'], 'C-04 limpio para sizing');
  assert.strictEqual(migrated.lessons['C-06'].bestPct, 85, 'bestPct conservado');
})();

/* Progreso / desbloqueo / canPlayLesson */
sandbox.PTAdmin = { hasAccess: function () { return true; } };
sandbox.Store = {
  _st: { handsPlayed: 0, school: { xp: 0, lessons: {}, updatedAt: 0, version: 2 } },
  getStats: function () { return this._st; },
  persistStats: function (st) { this._st = st; },
  saveHand: function () { return {}; }
};
assert.ok(School.isLessonUnlocked('C-00'), 'C-00 desbloqueada');
assert.ok(!School.isLessonUnlocked('C-01'), 'C-01 bloqueada al inicio');
assert.ok(School.canPlayLesson('C-00').ok, 'canPlay C-00 admin');
assert.ok(!School.canPlayLesson('C-01').ok, 'canPlay C-01 locked');

School._state.view = 'hub';
School.startLessonSession('C-00');
const summary = School._state.lastResult && School._state.lastResult.summary;
assert.ok(summary && summary.passed, 'C-00 se completa');
assert.ok(School.isLessonPassed('C-00'), 'C-00 passed');
assert.ok(School.isLessonUnlocked('C-01'), 'C-01 desbloqueada tras C-00');
assert.ok(School.canPlayLesson('C-01').ok, 'canPlay C-01 tras C-00');

console.log('*** school M0 v2 OK (' + spotCount + ' spots, 7 lecciones free) ***');
