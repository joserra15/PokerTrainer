/* Escuela de Póker G–J: Cash + Spins + MTT + Rangos/Pro + leaks→lección; menú admin-only. */
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
const schoolM1Src = fs.readFileSync(path.join(root, 'js/school-data-m1.js'), 'utf8');
const schoolM2Src = fs.readFileSync(path.join(root, 'js/school-data-m2.js'), 'utf8');
const schoolSpinSrc = fs.readFileSync(path.join(root, 'js/school-data-spin.js'), 'utf8');
const schoolMttSrc = fs.readFileSync(path.join(root, 'js/school-data-mtt.js'), 'utf8');
const schoolRangesSrc = fs.readFileSync(path.join(root, 'js/school-data-ranges.js'), 'utf8');
const schoolProSrc = fs.readFileSync(path.join(root, 'js/school-data-pro.js'), 'utf8');
const schoolSrc = fs.readFileSync(path.join(root, 'js/school.js'), 'utf8');
const aiReportSrc = fs.readFileSync(path.join(root, 'js/ai-report.js'), 'utf8');
const leaksSrc = fs.readFileSync(path.join(root, 'js/leaks.js'), 'utf8');
const allSchoolDataSrc = [
  schoolDataSrc, schoolM1Src, schoolM2Src, schoolSpinSrc, schoolMttSrc, schoolRangesSrc, schoolProSrc
].join('\n');

assert.ok(/data-tab="school"/.test(html), 'nav school');
assert.ok(/id="tab-school"/.test(html), 'panel school');
assert.ok(/Escuela de Póker/.test(html), 'label Escuela');
assert.ok(/tab-school/.test(css) && /pt-is-admin/.test(css), 'CSS admin gate school');
assert.ok(/body:not\(\.pt-is-admin\)[^{]*#tab-school/.test(css) ||
  /body:not\(\.pt-is-admin\) #tab-school/.test(css), 'CSS oculta school sin admin');
assert.ok(/school:\s*\[/.test(chunks), 'chunk school');
assert.ok(/school-data-m1\.js/.test(chunks) && /school-data-m2\.js/.test(chunks), 'chunk incluye M1/M2');
assert.ok(/school-data-spin\.js/.test(chunks) && /school-data-mtt\.js/.test(chunks), 'chunk Spins/MTT');
assert.ok(/school-data-ranges\.js/.test(chunks) && /school-data-pro\.js/.test(chunks), 'chunk Rangos/Pro');
assert.ok(/school:\s*'dist\/pt-school\.js'/.test(loader), 'loader school');
assert.ok(/tabId === 'school'/.test(app), 'goToTab school');
assert.ok(/schoolMenuVisible/.test(app), 'goToTab usa schoolMenuVisible');
assert.ok(/PTSchool\.afterTrainerAction/.test(app), 'hook afterTrainerAction');
assert.ok(/SCHOOL_PUBLIC\s*=\s*false/.test(schoolSrc), 'SCHOOL_PUBLIC false (menú admin-only)');
assert.ok(/schoolMenuVisible/.test(schoolSrc), 'schoolMenuVisible');
assert.ok(/canPlayLesson/.test(schoolSrc), 'canPlayLesson Fase D');
assert.ok(/openLesson/.test(schoolSrc), 'openLesson Fase J');
assert.ok(/lesson_start|lesson_complete|lesson_fail|lesson_blocked_plan/.test(schoolSrc), 'analytics Escuela');
assert.ok(/migrateSchoolProgress|C-06/.test(schoolSrc), 'migración v2');
assert.ok(/Sizing del open|RFI desde SB|Examen M0/.test(schoolDataSrc), 'lecciones M0 v2');
assert.ok(/Defender BB vs open|Examen M1/.test(schoolM1Src), 'lecciones M1');
assert.ok(/Textura de flop|Examen M2/.test(schoolM2Src), 'lecciones M2');
assert.ok(/S-00|S-17/.test(schoolSpinSrc), 'lecciones Spins');
assert.ok(/buy-in|entrada/.test(schoolSpinSrc) && /fichas no valen|fichas ≠|Entrada ≠ fichas/.test(schoolSpinSrc), 'S-00 explica entrada vs fichas');
assert.ok(/T-00|T-22/.test(schoolMttSrc), 'lecciones MTT');
assert.ok(/R-01|R-06/.test(schoolRangesSrc), 'lecciones Rangos');
assert.ok(/C-26|C-31/.test(schoolProSrc), 'lecciones Pro Cash');
assert.ok(/lessonId:\s*'C-02'/.test(aiReportSrc) && /lessonFromLeak/.test(aiReportSrc), 'TRAINING_FOCUSES → lessonId');
assert.ok(/data-leak-school|Ver lección/.test(leaksSrc), 'CTA Ver lección en leaks');
assert.ok(/school-coach-note|schoolCoachTip/.test(schoolSrc), 'tip coach resultado F');
assert.ok(/school-stars|is-plan/.test(schoolSrc + css), 'maestría / muro plan UI');
assert.ok(/Estado de implementación \(letras A–J\)/.test(
  fs.readFileSync(path.join(root, 'docs/ROADMAP_LECCIONES_DIRIGIDAS.md'), 'utf8')
), 'roadmap letras A–J');

const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Set,
  Map,
  JSON,
  Object,
  Array,
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
  'js/school-data-m1.js',
  'js/school-data-m2.js',
  'js/school-data-spin.js',
  'js/school-data-mtt.js',
  'js/school-data-ranges.js',
  'js/school-data-pro.js',
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
assert.strictEqual(Data.SCHOOL_DATA_VERSION, 4, 'data version 4');

const lessons = Data.lessonsForRoute('cash');
assert.strictEqual(lessons.length, 27, 'Cash M0+M1+M2+Pro = 27 lecciones');
assert.strictEqual(Data.lessonsForRoute('spin').length, 18, 'Spins 18');
assert.strictEqual(Data.lessonsForRoute('mtt').length, 23, 'MTT 23');
assert.strictEqual(Data.lessonsForRoute('ranges').length, 6, 'Rangos 6');
assert.strictEqual(Data.m0Lessons().length, 7, 'M0 7');
assert.strictEqual(Data.m1Lessons().length, 7, 'M1 7');
assert.strictEqual(Data.m2Lessons().length, 7, 'M2 7');
assert.strictEqual(
  Data.m0Lessons().map(function (l) { return l.id; }).join(','),
  'C-00,C-01,C-02,C-03,C-04,C-05,C-06',
  'ids M0 en orden'
);
['spin', 'mtt', 'ranges'].forEach(function (rid) {
  const r = Data.ROUTES.find(function (x) { return x.id === rid; });
  assert.ok(r && r.status === 'active', rid + ' route active');
});
assert.strictEqual(Data.getLesson('S-00').route, 'spin', 'S-00 spin');
(function () {
  var s00 = Data.getLesson('S-00');
  var blob = [s00.concept].concat(s00.theory || []).concat(
    (s00.examples || []).map(function (ex) { return (ex.title || '') + ' ' + (ex.body || ''); })
  ).join(' ');
  assert.ok(/entrada|buy-in/i.test(blob), 'S-00 menciona entrada/buy-in');
  assert.ok(/fichas/.test(blob) && (/no valen|no se cambian|≠|no es cash|moneda del torneo/.test(blob)), 'S-00 separa fichas de dinero');
  assert.ok(/payout|2×|3×|5×/.test(blob), 'S-00 explica multiplicador');
  assert.ok(/ICM/.test(blob) && (/modelo|dinero|€|euros|premio/.test(blob)), 'S-00 ancla ICM');
  assert.ok(/bb \(ciegas grandes\)|ciega grande \(BB\)|en bb/.test(blob), 'S-00 explica bb');
  (s00.theory || []).forEach(function (t, i) {
    assert.ok(t.length > 80, 'S-00 theory[' + i + '] suficientemente explicativa');
  });
})();
assert.strictEqual(Data.getLesson('T-00').route, 'mtt', 'T-00 mtt');
assert.strictEqual(Data.getLesson('R-01').route, 'ranges', 'R-01 ranges');
assert.strictEqual(Data.getLesson('C-26').module, 'M4', 'C-26 Pro M4');
assert.strictEqual(Data.getLesson('C-26').plan, 'coach', 'C-26 coach');
assert.ok((Data.getLesson('S-01').spots || []).length >= 4, 'S-01 spots resueltos');
assert.ok((Data.getLesson('T-01').spots || []).length >= 4, 'T-01 spots resueltos');
assert.strictEqual(Data.getLesson('C-07').module, 'M1', 'C-07 M1');
assert.strictEqual(Data.getLesson('C-07').plan, 'study', 'C-07 study');
assert.strictEqual(Data.getLesson('C-14').module, 'M2', 'C-14 M2');
assert.strictEqual(Data.getLesson('C-14').plan, 'study', 'C-14 study');
assert.strictEqual(Data.getLesson('C-04').title, 'Sizing del open', 'C-04 sizing');
assert.strictEqual(Data.getLesson('C-05').title, 'RFI desde SB', 'C-05 SB');
assert.ok(/Examen/.test(Data.getLesson('C-06').title), 'C-06 examen');
assert.ok(/menú Rangos/.test(Data.getLesson('C-06').theory.join(' ')), 'C-06 recuerda menú Rangos');
Data.m0Lessons().forEach(function (l) {
  assert.strictEqual(l.plan, 'free', l.id + ' plan free');
});
Data.m1Lessons().concat(Data.m2Lessons()).forEach(function (l) {
  assert.strictEqual(l.plan, 'study', l.id + ' plan study');
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

/* C-08: conceptos polar / bluff / blockers / spew en lenguaje natural */
(function () {
  var c08 = Data.getLesson('C-08');
  var blob = [c08.concept].concat(c08.theory || []).concat(
    (c08.examples || []).map(function (ex) { return (ex.title || '') + ' ' + (ex.body || ''); })
  ).join(' ');
  assert.ok(/bluff \(farol\)|farol/.test(blob), 'C-08 explica bluff/farol');
  assert.ok(/blockers?:/.test(blob) || /blockers /.test(blob), 'C-08 explica blockers');
  assert.ok(/Polar significa/.test(blob), 'C-08 define polar');
  assert.ok(/Spew es/.test(blob), 'C-08 define spew');
  assert.ok(!/Value: QQ\+|Polar light:|linear\/value/.test(blob), 'C-08 no es telegrama de chart');
})();

/* C-09+: voz novato — ancla términos, sin telegramas densos */
(function () {
  function lessonBlob(id) {
    var l = Data.getLesson(id);
    return [l.concept].concat(l.theory || []).concat(
      (l.examples || []).map(function (ex) { return (ex.title || '') + ' ' + (ex.body || ''); })
    ).join(' ');
  }
  var c09 = lessonBlob('C-09');
  assert.ok(/4-bet/.test(c09) && /hero-call/.test(c09), 'C-09 introduce 4-bet y hero-call');
  assert.ok(/vuelve a subir|siguiente subida/.test(c09), 'C-09 ancla 4-bet en español');
  assert.ok(!/4-bet value: QQ\+\/AK\. 4-bet bluff:/.test(c09), 'C-09 no es telegrama');

  var c10 = lessonBlob('C-10');
  assert.ok(/cold-call|Cold-call/.test(c10) && /Squeeze/.test(c10), 'C-10 define cold-call/squeeze');
  assert.ok(/dead money|fichas ya en el bote/.test(c10), 'C-10 ancla dead money');

  var c14 = lessonBlob('C-14');
  assert.ok(/flop seco|seco /.test(c14) && /c-bet/.test(c14), 'C-14 textura + c-bet');
  assert.ok(/continuación|apost/.test(c14), 'C-14 ancla c-bet');

  var c17 = lessonBlob('C-17');
  assert.ok(/pot odds|precio/.test(c17) && /backdoor/.test(c17), 'C-17 pot odds/backdoors');

  assert.ok(!/\b[Ll]lamar\b|\bllaman\b/.test(
    Data.m1Lessons().concat(Data.m2Lessons()).map(function (l) {
      return lessonBlob(l.id) + ' ' + (l.spots || []).map(function (s) { return s.teachBack || ''; }).join(' ');
    }).join(' ')
  ), 'M1/M2 sin llamar=call');

  var road = fs.readFileSync(path.join(root, 'docs/ROADMAP_LECCIONES_DIRIGIDAS.md'), 'utf8');
  assert.ok(/Término \+ ancla \(C-09\+\)/.test(road), 'roadmap regla C-09+');
  assert.ok(/Orden de introducción en Cash M2/.test(road), 'roadmap vocabulario M2');
  assert.ok(/Regla para lecciones futuras/.test(road), 'roadmap regla futuras');
})();

assert.ok(
  !/Limpear \(o limp\) es igualar/.test(Data.getLesson('C-03').theory.join(' ')),
  'C-03 no redefine limp'
);
Data.m0Lessons().forEach(function (l) {
  assert.ok((l.concept || '').length > 40, l.id + ' concept no telegráfico');
  (l.theory || []).forEach(function (t, i) {
    assert.ok(t.length > 60, l.id + ' theory[' + i + '] demasiado corta');
  });
  (l.spots || []).forEach(function (s) {
    assert.ok((s.teachBack || '').length > 25, l.id + ' teachBack ' + s.id);
  });
});
assert.ok(/4\.5 Voz pedagógica/.test(fs.readFileSync(path.join(root, 'docs/ROADMAP_LECCIONES_DIRIGIDAS.md'), 'utf8')), 'roadmap §4.5');

/* Validar códigos de carta en todo el currículum */
(function () {
  const re = /\['([A-Za-z0-9]{2})',\s*'([A-Za-z0-9]{2})'\]/g;
  let m;
  const bad = [];
  while ((m = re.exec(allSchoolDataSrc))) {
    [m[1], m[2]].forEach(function (c) {
      if (!/^[AKQJT98765432][hdcs]$/.test(c)) bad.push(c);
    });
  }
  assert.strictEqual(bad.length, 0, 'cartas válidas: ' + bad.join(','));
})();

function forceFromSpot(spot) {
  const force = {
    type: spot.type || 'RFI',
    heroPos: spot.heroPos,
    seed: spot.seed,
    forceDeal: Object.assign({}, spot.forceDeal)
  };
  if (spot.key) force.key = spot.key;
  if (spot.limperPos) force.limperPos = spot.limperPos;
  if (spot.openerPos) force.openerPos = spot.openerPos;
  if (spot.callerPos) force.callerPos = spot.callerPos;
  if (spot.limperPositions) force.limperPositions = spot.limperPositions;
  if (spot.facingBet || (spot.forceDeal && spot.forceDeal.facingBet)) {
    force.facingBet = true;
    force.forceDeal.facingBet = true;
  }
  return force;
}

function cfgFromSpot(spot) {
  const extra = (spot && spot.playConfig) || {};
  return Object.assign({
    scenario: 'rfi',
    practiceStreet: 'preflop',
    handRange: 'all',
    villainLevel: 'fish',
    formatHub: 'cash',
    gameType: 'cash6',
    schoolDecisionEnd: true,
    schoolMode: true
  }, extra);
}

function openHand(spot) {
  const force = forceFromSpot(spot);
  const cfg = cfgFromSpot(spot);
  const hand = Engine.newHand(force, cfg);
  const street = cfg.practiceStreet;
  // School postflop salta solo; fastForward queda como red de seguridad fuera de schoolMode.
  if (!cfg.schoolMode && street && street !== 'random' && street !== 'preflop' && Engine.fastForwardToStreet) {
    Engine.fastForwardToStreet(hand, street);
  }
  return { hand: hand, cfg: cfg, force: force };
}

/* Grading completo M0 (RFI); muestras M1/M2 */
let spotCount = 0;
Data.m0Lessons().forEach(function (lesson) {
  (lesson.spots || []).forEach(function (spot) {
    spotCount += 1;
    const pack = openHand(spot);
    const hand = pack.hand;
    assert.ok(hand && hand.hero && hand.hero.cards, 'mano ' + spot.id);
    assert.strictEqual(hand.hero.cards.join(''), spot.forceDeal.heroCards.join(''), 'cartas ' + spot.id);
    assert.ok(hand.current && hand.current.options && hand.current.options.length, 'opciones ' + spot.id);
    const ids = hand.current.options.map(function (o) { return o.id; });
    assert.ok(ids.indexOf('fold') >= 0, 'fold disponible ' + spot.id);
    assert.ok(ids.indexOf('raise') >= 0, 'raise disponible ' + spot.id);

    const raiseHand = openHand(spot).hand;
    const raiseRes = Engine.act(raiseHand, 'raise');
    assert.ok(raiseRes && raiseRes.decision && raiseRes.decision.class, 'grade raise ' + spot.id);

    const foldHand = openHand(spot).hand;
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

/* Muestras M1/M2 + Spins/MTT */
(function () {
  const samples = [
    Data.getLesson('C-07').spots[0],
    Data.getLesson('C-09').spots[0],
    Data.getLesson('C-10').spots[0],
    Data.getLesson('C-11').spots[0],
    Data.getLesson('C-12').spots[0],
    Data.getLesson('C-14').spots[0],
    Data.getLesson('C-15').spots[0],
    Data.getLesson('S-01').spots[0],
    Data.getLesson('S-02').spots[0],
    Data.getLesson('T-01').spots[0],
    Data.getLesson('T-04').spots[0]
  ];
  samples.forEach(function (spot) {
    const pack = openHand(spot);
    const hand = pack.hand;
    assert.ok(hand && hand.current && hand.current.options && hand.current.options.length, 'opts ' + spot.id);
    if ((pack.cfg.practiceStreet || 'preflop') === 'flop') {
      assert.strictEqual(hand.stage, 'flop', 'stage flop ' + spot.id);
      assert.ok(hand.board && hand.board.length >= 3, 'board flop ' + spot.id);
    }
    const opt = hand.current.options[0];
    const graded = openHand(spot).hand;
    const res = Engine.act(graded, opt.id);
    assert.ok(res && res.decision && res.decision.class, 'grade sample ' + spot.id);
    assert.strictEqual(graded.stage, 'complete', 'decisionEnd sample ' + spot.id);
    assert.ok(graded.result && graded.result.school, 'school flag ' + spot.id);
  });
})();

/* Control: sin schoolDecisionEnd puede avanzar */
(function () {
  const spot = Data.getLesson('C-02').spots[0];
  const force = forceFromSpot(spot);
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

/* Progreso / desbloqueo / canPlayLesson + muro plan */
sandbox.PTAdmin = { hasAccess: function () { return true; } };
sandbox.PTEntitlements = { get: function () { return { plan: 'free' }; } };
sandbox.Store = {
  _st: { handsPlayed: 0, school: { xp: 0, lessons: {}, updatedAt: 0, version: 2 } },
  getStats: function () { return this._st; },
  persistStats: function (st) { this._st = st; },
  saveHand: function () { return {}; }
};
assert.ok(School.schoolMenuVisible(), 'menú visible admin');
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

/* Desbloquear hasta C-07 y comprobar muro Study en free */
(function () {
  ['C-00', 'C-01', 'C-02', 'C-03', 'C-04', 'C-05', 'C-06'].forEach(function (id) {
    sandbox.Store._st.school.lessons[id] = {
      passed: true, bestScore: 1, bestPct: 100, attempts: 1, gold: true, perfect: true
    };
  });
  assert.ok(School.isLessonUnlocked('C-07'), 'C-07 desbloqueada tras M0');
  const gate = School.canPlayLesson('C-07');
  assert.ok(!gate.ok && gate.reason === 'plan', 'C-07 bloqueada por plan free');
  assert.ok(gate.upgrade, 'C-07 sugiere upgrade');
  sandbox.PTEntitlements.get = function () { return { plan: 'pro' }; };
  assert.ok(School.canPlayLesson('C-07').ok, 'C-07 OK con Study/pro');
  assert.ok(School.planRank('pro') >= 1 && School.planRank('free') === 0, 'planRank');
})();

/* Sin admin: menú oculto */
(function () {
  sandbox.PTAdmin = { hasAccess: function () { return false; } };
  sandbox.PTAuth = { getUser: function () { return { email: 'user@x.com', isAdmin: false, plan: 'pro' }; } };
  assert.ok(!School.schoolMenuVisible(), 'menú oculto sin admin');
  assert.ok(!School.canPlayLesson('C-00').ok, 'canPlay denegado sin menú');
  assert.ok(!School.openLesson('C-02'), 'openLesson denegado sin admin');
  sandbox.PTAdmin = { hasAccess: function () { return true; } };
})();

/* openLesson deep-link (admin) */
(function () {
  sandbox.PTAdmin = { hasAccess: function () { return true; } };
  assert.ok(School.openLesson('S-00'), 'openLesson S-00');
  assert.strictEqual(School._state.route, 'spin', 'ruta spin tras openLesson');
  assert.strictEqual(School._state.lessonId, 'S-00', 'lessonId S-00');
  assert.strictEqual(School._state.view, 'lesson', 'view lesson');
})();

/* Resumen spots a repasar: cartas/pos/board + teachBack, sin trapTag */
(function () {
  assert.ok(typeof School.formatFailSpotHtml === 'function', 'formatFailSpotHtml export');
  const htmlOut = School.formatFailSpotHtml({
    spotId: 'c06-02',
    class: 'error',
    heroPos: 'UTG',
    heroCards: ['Kd', '9c'],
    board: [],
    teachBack: 'K9o desde UTG: fold. Demasiado frágil con gente detrás.',
    trapTag: 'dominated'
  });
  assert.ok(/UTG/.test(htmlOut) && /Kd 9c/.test(htmlOut), 'muestra pos y cartas');
  assert.ok(/K9o desde UTG/.test(htmlOut), 'muestra teachBack');
  assert.ok(!/trampa/i.test(htmlOut) && !/dominated/.test(htmlOut), 'no muestra trapTag');
  assert.ok(!/c06-02/.test(htmlOut), 'no muestra id interno');
  const withBoard = School.formatFailSpotHtml({
    class: 'imprecisa',
    heroPos: 'BTN',
    heroCards: ['As', 'Kh'],
    board: ['Td', '7c', '2h'],
    teachBack: 'En seco, c-bet pequeño suele bastar.'
  });
  assert.ok(/board Td 7c 2h/.test(withBoard), 'incluye board cuando aplica');
  assert.ok(!/Trampa:/.test(schoolSrc), 'feedback spot no imprime Trampa:');
  assert.ok(/5\.2bis Resumen de lección/.test(
    fs.readFileSync(path.join(root, 'docs/ROADMAP_LECCIONES_DIRIGIDAS.md'), 'utf8')
  ), 'roadmap §5.2bis resumen spots');
  assert.ok(/postflop|Textura/.test(School.schoolCoachTip(Data.getLesson('C-14'), false, [])), 'coach tip M2');
})();

/* Fase J: lessonFromLeak vía TRAINING_FOCUSES (cargamos ai-report en sandbox ligero) */
(function () {
  const aiSandbox = {
    window: {},
    console: console,
    Math: Math,
    Date: Date,
    Set: Set,
    Map: Map,
    JSON: JSON,
    Object: Object,
    Array: Array,
    localStorage: sandbox.localStorage,
    sessionStorage: { _d: {}, getItem: function () { return null; }, setItem: function () {} },
    document: { createElement: function () { return {}; } }
  };
  aiSandbox.global = aiSandbox;
  aiSandbox.window = aiSandbox;
  vm.createContext(aiSandbox);
  vm.runInContext(aiReportSrc, aiSandbox, { filename: 'ai-report.js' });
  const AI = aiSandbox.PTAIReport;
  assert.ok(AI && typeof AI.lessonFromLeak === 'function', 'lessonFromLeak export');
  assert.strictEqual(AI.lessonFromLeak({ key: 'RFI|BTN|preflop' }), 'C-02', 'RFI→C-02');
  assert.strictEqual(AI.lessonFromLeak({ key: 'vsRFI|BB|preflop' }), 'C-08', 'vsRFI→C-08');
  assert.strictEqual(AI.lessonFromLeak({ key: 'face3bet|BTN|preflop' }), 'C-09', 'face3bet→C-09');
  assert.strictEqual(AI.lessonFromLeak({ key: 'squeeze|BB|preflop' }), 'C-10', 'squeeze→C-10');
  assert.strictEqual(AI.lessonFromLeak({ key: 'sbLimp|SB|preflop' }), 'C-11', 'sbLimp→C-11');
  assert.strictEqual(AI.lessonFromLeak({ key: 'bbVsSbLimp|BB|preflop' }), 'C-12', 'bbvsb→C-12');
  assert.strictEqual(AI.lessonFromLeak({ key: 'postflop|BTN|flop' }), 'C-15', 'flop→C-15');
  assert.strictEqual(AI.lessonFromLeak({ key: 'postflop|BTN|turn' }), 'C-18', 'turn→C-18');
  assert.strictEqual(AI.lessonFromLeak({ key: 'postflop|BTN|river' }), 'C-19', 'river→C-19');
  assert.strictEqual(AI.lessonFromLeak({ key: 'face4bet|BTN|preflop' }), 'C-26', '4bet→C-26');
})();

console.log('*** school G–J OK (M0 ' + spotCount + ' spots + Spins/MTT/Rangos/Pro + leaks→lección, admin-only) ***');
