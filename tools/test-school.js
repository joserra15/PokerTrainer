/* Escuela de Póker G–J: Cash + Spins + MTT + Rangos/Pro + leaks→lección; abierta a usuarios. */
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

/** Normaliza theory[] (string | {title,body}) a texto plano para asserts. */
function theoryText(t) {
  if (t && typeof t === 'object') return String(t.title || '') + ' ' + String(t.body || t.text || '');
  return String(t || '');
}
function theoryJoin(arr) {
  return (arr || []).map(theoryText).join(' ');
}
function lessonBlob(lesson) {
  var blob = ' ' + (lesson.concept || '');
  blob += ' ' + theoryJoin(lesson.theory);
  (lesson.examples || []).forEach(function (ex) {
    blob += ' ' + (ex.title || '') + ' ' + (ex.body || '');
  });
  (lesson.aiQuestions || []).forEach(function (q) { blob += ' ' + q; });
  (lesson.spots || []).forEach(function (s) { blob += ' ' + (s.teachBack || ''); });
  return blob;
}

assert.ok(/data-tab="school"/.test(html), 'nav school');
assert.ok(/id="tab-school"/.test(html), 'panel school');
assert.ok(/Escuela de Póker/.test(html), 'label Escuela');
assert.ok(/tab-school/.test(css), 'CSS tab school');
assert.ok(/demo-mode-active[^{]*#tab-school/.test(css) || /demo-mode-active #tab-school/.test(css), 'CSS oculta school en demo');
assert.ok(!/body:not\(\.pt-is-admin\) #tab-school/.test(css), 'CSS ya no oculta school a no-admin');
assert.ok(/school:\s*\[/.test(chunks), 'chunk school');
assert.ok(/school-data-m1\.js/.test(chunks) && /school-data-m2\.js/.test(chunks), 'chunk incluye M1/M2');
assert.ok(/school-data-spin\.js/.test(chunks) && /school-data-mtt\.js/.test(chunks), 'chunk Spins/MTT');
assert.ok(/school-data-ranges\.js/.test(chunks) && /school-data-pro\.js/.test(chunks), 'chunk Rangos/Pro');
assert.ok(/school-extra-spots\.js/.test(chunks), 'chunk extra spots (≥10 manos)');
assert.ok(/school-data-practice\.js/.test(chunks), 'chunk práctica teoría-only (≥10 manos)');
assert.ok(/school-share\.js/.test(chunks), 'chunk school-share (redes / logro)');
assert.ok(/school:\s*'dist\/pt-school\.js'/.test(loader), 'loader school');
assert.ok(/tabId === 'school'/.test(app), 'goToTab school');
assert.ok(/schoolMenuVisible/.test(app), 'goToTab usa schoolMenuVisible');
assert.ok(/schoolUser && !schoolDemo/.test(app), 'goToTab school para usuarios autenticados');
assert.ok(/PTSchool\.afterTrainerAction/.test(app), 'hook afterTrainerAction');
assert.ok(/SCHOOL_PUBLIC\s*=\s*true/.test(schoolSrc), 'SCHOOL_PUBLIC true (abierta a usuarios)');
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
assert.ok(/R-01|R-21/.test(schoolRangesSrc), 'lecciones Rangos');
assert.ok(/school-data-ranges-line\.js/.test(chunks), 'chunk Rangos línea M2–M4');
assert.ok(/C-26|C-31/.test(schoolProSrc), 'lecciones Pro Cash');
assert.ok(/lessonId:\s*'C-02'/.test(aiReportSrc) && /lessonFromLeak/.test(aiReportSrc), 'TRAINING_FOCUSES → lessonId');
assert.ok(/data-leak-school|Ver lección/.test(leaksSrc), 'CTA Ver lección en leaks');
assert.ok(/school-coach-note|schoolCoachTip/.test(schoolSrc), 'tip coach resultado F');
assert.ok(/school-stars|is-plan/.test(schoolSrc + css), 'maestría / muro plan UI');
assert.ok(/routePct/.test(schoolSrc) && /width:' \+ routePct/.test(schoolSrc),
  'barra hub = progreso de ruta (routePct)');
assert.ok(!/school-xp-fill school-xp-fill-anim" style="width:' \+\s*Math\.min\(100, Math\.round\(\(lv\.into/.test(schoolSrc),
  'barra hub no calcula width con XP del nivel');
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
  'js/school-extra-spots.js',
  'js/school-data-practice.js',
  'js/school-data-ranges-line.js',
  'js/school-share.js',
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
assert.strictEqual(Data.lessonsForRoute('ranges').length, 21, 'Rangos 21');
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

/** Práctica: mínimo 10 manos; hands alineado con spots; progresión por dificultad. */
(function assertPracticeVolume() {
  const routes = ['cash', 'spin', 'mtt', 'ranges', 'pro'];
  const practice = [];
  routes.forEach(function (route) {
    Data.lessonsForRoute(route).forEach(function (lesson) {
      const n = Array.isArray(lesson.spots) ? lesson.spots.length : 0;
      assert.ok(n >= 10, lesson.id + ' debe tener ≥10 spots, tiene ' + n);
      assert.strictEqual(lesson.hands, n, lesson.id + ' hands debe igualar spots.length');
      practice.push(lesson);
    });
  });
  assert.ok(practice.length >= 30, 'hay suficientes lecciones con práctica');

  function minSpots(route, lessonId) {
    const lesson = Data.getLesson(lessonId);
    return lesson && Array.isArray(lesson.spots) ? lesson.spots.length : 0;
  }
  assert.ok(minSpots('spin', 'S-01') >= 10, 'S-01 ≥10');
  assert.ok(minSpots('spin', 'S-09') > minSpots('spin', 'S-01'), 'Spins: push/fold > steal intro');
  assert.ok(minSpots('spin', 'S-08') >= minSpots('spin', 'S-04'), 'Spins: examen M1 ≥ iso');
  assert.ok(minSpots('spin', 'S-03') > minSpots('spin', 'S-01'), 'Spins: examen M0 > S-01');
  assert.ok(minSpots('mtt', 'T-01') >= 10, 'T-01 ≥10');
  assert.ok(minSpots('mtt', 'T-02') >= 10, 'T-02 antenas ≥10 spots');
  assert.ok(minSpots('mtt', 'T-09') > minSpots('mtt', 'T-01'), 'MTT: push/fold > early');
  assert.ok(minSpots('mtt', 'T-07') >= minSpots('mtt', 'T-04'), 'MTT: examen mid ≥ steal');
  assert.ok(minSpots('cash', 'C-07') >= 10, 'C-07 ≥10');
  assert.ok(minSpots('cash', 'C-06') > minSpots('cash', 'C-01'), 'Cash: examen M0 > C-01');
  assert.ok(minSpots('cash', 'C-13') > minSpots('cash', 'C-07'), 'Cash: examen M1 > M1 intro');
  assert.ok(minSpots('cash', 'C-20') > minSpots('cash', 'C-14'), 'Cash: examen M2 > postflop intro');
  assert.ok(minSpots('cash', 'C-14') > minSpots('cash', 'C-07'), 'Cash M2 > M1 volumen base');
  assert.ok(minSpots('cash', 'C-00') >= 10, 'C-00 práctica ≥10');
  assert.ok(minSpots('spin', 'S-00') >= 10, 'S-00 práctica ≥10');
  assert.ok(minSpots('mtt', 'T-00') >= 10, 'T-00 práctica ≥10');
  assert.ok(minSpots('ranges', 'R-01') >= 10, 'R-01 práctica ≥10');
  assert.ok(minSpots('cash', 'C-26') >= 10, 'C-26 4-bet ≥10');
  assert.ok(minSpots('spin', 'S-10') >= 10, 'S-10 call shove ICM ≥10');
  assert.ok(minSpots('mtt', 'T-13') >= 10, 'T-13 roles burbuja ≥10');
})();

/** Mix de manos del héroe: menos 72o/AK/QQ repetidos, más JJ/TT y celdas borderline. */
(function assertHeroHandMix() {
  function handCode(cards) {
    if (!cards || cards.length < 2) return '?';
    const r1 = cards[0][0];
    const r2 = cards[1][0];
    const s1 = cards[0][1];
    const s2 = cards[1][1];
    const order = 'AKQJT98765432';
    if (r1 === r2) return r1 + r2;
    const hi = order.indexOf(r1) <= order.indexOf(r2) ? r1 : r2;
    const lo = hi === r1 ? r2 : r1;
    return hi + lo + (s1 === s2 ? 's' : 'o');
  }
  const counts = Object.create(null);
  let n = 0;
  const leadMismatch = [];
  Data.getLessons().forEach(function (lesson) {
    const per = Object.create(null);
    (lesson.spots || []).forEach(function (spot) {
      const cards = spot.forceDeal && spot.forceDeal.heroCards;
      const code = handCode(cards);
      counts[code] = (counts[code] || 0) + 1;
      per[code] = (per[code] || 0) + 1;
      n += 1;
      const tb = String(spot.teachBack || '');
      const lead = tb.match(/^([AKQJT2-9]{2}[so]|([AKQJT2-9])\2)\b/);
      if (lead && lead[0] !== code) leadMismatch.push(spot.id + ':' + code + '!=' + lead[0]);
    });
    Object.keys(per).forEach(function (h) {
      assert.ok(per[h] <= 4, lesson.id + ' no debe repetir ' + h + ' ≥5 veces (' + per[h] + ')');
    });
  });
  assert.ok(n >= 800, 'volumen spots Escuela: ' + n);
  assert.ok((counts['72o'] || 0) <= 5, '72o no satura el mix: ' + (counts['72o'] || 0));
  assert.ok((counts['AKo'] || 0) <= 45, 'AKo no satura el mix: ' + (counts['AKo'] || 0));
  assert.ok((counts['QQ'] || 0) <= 40, 'QQ no satura el mix: ' + (counts['QQ'] || 0));
  assert.ok((counts['JJ'] || 0) >= 20, 'JJ presente a lo largo del recorrido: ' + (counts['JJ'] || 0));
  assert.ok((counts['TT'] || 0) >= 20, 'TT presente a lo largo del recorrido: ' + (counts['TT'] || 0));
  const uniq = Object.keys(counts).length;
  assert.ok(uniq >= 90, 'manos distintas del héroe: ' + uniq);
  let max = 0;
  Object.keys(counts).forEach(function (h) { if (counts[h] > max) max = counts[h]; });
  assert.ok(max / n <= 0.06, 'ninguna mano >6 % del mix: ' + max + '/' + n);
  assert.deepStrictEqual(leadMismatch, [], 'teachBack inicial coincide con cartas: ' + leadMismatch.join(', '));
})();

/** T-00 recorre early / mid / push para sentir las fases. */
(function assertT00Stages() {
  const PC = sandbox.PTPlayConfig;
  const lesson = Data.getLesson('T-00');
  const depths = lesson.spots.map(function (sp) { return PC.normalize(sp.playConfig).stackBB; });
  assert.ok(depths.some(function (d) { return d >= 35; }), 'T-00 incluye early ~40bb');
  assert.ok(depths.some(function (d) { return d >= 20 && d <= 30; }), 'T-00 incluye mid ~25bb');
  assert.ok(depths.some(function (d) { return d <= 12; }), 'T-00 incluye push ~10–12bb');
})();

/** T-02: profundidades bb11/bb22/etc. no deben caer a 100bb por defecto. */
(function assertT02StackDepths() {
  const PC = sandbox.PTPlayConfig;
  const lesson = Data.getLesson('T-02');
  assert.ok(lesson && Array.isArray(lesson.spots) && lesson.spots.length >= 12, 'T-02 spots');
  const expected = {
    't02-01': 11, 't02-02': 11, 't02-03': 10, 't02-04': 22, 't02-05': 25,
    't02-06': 25, 't02-07': 45, 't02-08': 45, 't02-09': 45, 't02-10': 45,
    't02-11': 40, 't02-12': 22
  };
  lesson.spots.forEach(function (sp) {
    const bb = PC.normalize(sp.playConfig).stackBB;
    assert.strictEqual(bb, expected[sp.id], sp.id + ' stackBB');
  });
  const first = PC.normalize(lesson.spots[0].playConfig);
  assert.strictEqual(first.stackBB, 11, 't02-01 short ~11bb, no push/fold a 100bb');
  assert.strictEqual(first.scenario, 'push');
})();

/* Voz pedagógica Spins S-00…S-17: términos anclados, sin telegramas */
(function () {
  var spinLessons = Data.lessonsForRoute('spin');
  assert.strictEqual(spinLessons.length, 18, '18 lecciones Spins');
  var blob = '';
  spinLessons.forEach(function (l) {
    blob += lessonBlob(l);
    assert.ok((l.concept || '').length > 60, l.id + ' concept explicativo');
    (l.theory || []).forEach(function (t, i) {
      assert.ok(theoryText(t).length > 70, l.id + ' theory[' + i + '] demasiado corta');
    });
    assert.ok((l.examples || []).length >= 1, l.id + ' tiene ejemplo');
  });
  assert.ok(!/\b[Ll]lamar\b|\bllaman\b/.test(blob), 'Spins sin llamar=call');
  assert.ok(/\b[Ll]impear\b/.test(blob), 'Spins usa limpear donde aplica');
  assert.ok(/steal|robar ciegas/.test(blob), 'Spins explica steal');
  assert.ok(/ICM|fichas/.test(blob), 'Spins explica ICM/fichas');
})();

/* Voz pedagógica MTT / Rangos / Pro */
(function () {
  function assertRouteVoice(routeId, minLessons) {
    var lessons = Data.lessonsForRoute(routeId);
    assert.ok(lessons.length >= minLessons, routeId + ' count');
    var blob = '';
    lessons.forEach(function (l) {
      blob += lessonBlob(l);
      assert.ok((l.concept || '').length > 60, l.id + ' concept explicativo');
      assert.ok((l.theory || []).length >= 2, l.id + ' theory suficiente');
      (l.theory || []).forEach(function (t, i) {
        assert.ok(theoryText(t).length > 70, l.id + ' theory[' + i + '] corta');
        if (t && typeof t === 'object') {
          assert.ok(t.title && t.title.length > 2, l.id + ' theory title');
        }
      });
      assert.ok((l.examples || []).length >= 1, l.id + ' ejemplo');
    });
    assert.ok(!/\b[Ll]lamar\b|\bllaman\b/.test(blob), routeId + ' sin llamar=call');
    return blob;
  }
  var mttBlob = assertRouteVoice('mtt', 23);
  assert.ok(/ante|ICM|steal|push|burbuja|bb/.test(mttBlob), 'MTT vocabulario torneo');
  var rangesBlob = assertRouteVoice('ranges', 21);
  assert.ok(/matriz|rango|frecuencia|blocker|menú Rangos/.test(rangesBlob), 'Rangos vocabulario');
  var proBlob = assertRouteVoice('cash', 27); // includes M0-M4
  assert.ok(/4-bet|farol|fish|reg/.test(proBlob), 'Pro cash vocabulario');
  assert.ok(/school-theory-title/.test(schoolSrc), 'UI títulos de teoría');
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
assert.ok(/menú Rangos/.test(theoryJoin(Data.getLesson('C-06').theory)), 'C-06 recuerda menú Rangos');
Data.m0Lessons().forEach(function (l) {
  assert.strictEqual(l.plan, 'free', l.id + ' plan free');
});
Data.m1Lessons().concat(Data.m2Lessons()).forEach(function (l) {
  assert.strictEqual(l.plan, 'study', l.id + ' plan study');
});
/* M0 Spins y MTT enteros en plan Gratis */
['S-00', 'S-01', 'S-02', 'S-03'].forEach(function (id) {
  var l = Data.getLesson(id);
  assert.ok(l && l.module === 'M0', id + ' es M0');
  assert.strictEqual(l.plan, 'free', id + ' plan free');
});
['T-00', 'T-01', 'T-02', 'T-03'].forEach(function (id) {
  var l = Data.getLesson(id);
  assert.ok(l && l.module === 'M0', id + ' es M0');
  assert.strictEqual(l.plan, 'free', id + ' plan free');
});
assert.strictEqual(Data.getLesson('S-04').plan, 'study', 'S-04 M1 sigue Study');
assert.strictEqual(Data.getLesson('T-04').plan, 'study', 'T-04 M1 sigue Study');
/* Rangos: M0 gratis, M1 Study, M2 Study, M3–M4 Coach */
['R-01', 'R-02', 'R-03'].forEach(function (id) {
  var l = Data.getLesson(id);
  assert.ok(l && l.module === 'M0', id + ' es M0');
  assert.strictEqual(l.plan, 'free', id + ' plan free');
});
['R-04', 'R-05', 'R-06'].forEach(function (id) {
  var l = Data.getLesson(id);
  assert.ok(l && l.module === 'M1', id + ' es M1');
  assert.strictEqual(l.plan, 'study', id + ' plan study');
});
['R-07', 'R-08', 'R-09', 'R-10', 'R-11'].forEach(function (id) {
  var l = Data.getLesson(id);
  assert.ok(l && l.module === 'M2', id + ' es M2');
  assert.strictEqual(l.plan, 'study', id + ' plan study');
});
['R-12', 'R-13', 'R-14', 'R-15', 'R-16'].forEach(function (id) {
  var l = Data.getLesson(id);
  assert.ok(l && l.module === 'M3', id + ' es M3');
  assert.strictEqual(l.plan, 'coach', id + ' plan coach');
});
['R-17', 'R-18', 'R-19', 'R-20', 'R-21'].forEach(function (id) {
  var l = Data.getLesson(id);
  assert.ok(l && l.module === 'M4', id + ' es M4');
  assert.strictEqual(l.plan, 'coach', id + ' plan coach');
});
assert.ok(/M0 completo en Gratis/.test(fs.readFileSync(path.join(root, 'js/school.js'), 'utf8')), 'hub Spins/MTT menciona M0 gratis');
assert.ok(/M0 · Bases de rangos \(Gratis\)/.test(fs.readFileSync(path.join(root, 'js/school.js'), 'utf8')), 'hub Rangos M0 gratis');

/* Voz pedagógica: conceptos clave se introducen una vez en M0 */
assert.ok(/Estilo de texto|profesor/.test(schoolDataSrc), 'guía de estilo en school-data');

/* Verbo limpear: en textos de lección no usar limpiar=limp */
(function () {
  var blob = '';
  Data.LESSONS.forEach(function (l) {
    blob += lessonBlob(l);
  });
  assert.ok(!/\b[Ll]impiar\b|\blimpies\b|\blimpias\b|\blimpiao\b/.test(blob), 'lecciones sin limpiar=limp');
  assert.ok(/\b[Ll]impear\b|\blimpees\b|\blimpeas\b|\blimpeado\b/.test(blob), 'lecciones usan limpear');
})();

assert.ok(/hacen call \(si te igualan la apuesta\)/.test(theoryJoin(Data.getLesson('C-01').theory)), 'C-01 explica call');
assert.ok(
  /todos folden \(tiren su mano\)/.test(Data.getLesson('C-03').concept) &&
    /no limpear para/.test(Data.getLesson('C-03').concept),
  'C-03 concept folden + no limpear'
);
assert.ok(/o te tiras/.test(theoryJoin(Data.getLesson('C-03').theory)), 'C-03 te tiras');
assert.ok(/limpees .por si conecta./.test(Data.getLesson('C-03').examples[0].body) || /limpees “por si conecta”/.test(Data.getLesson('C-03').examples[0].body), 'C-03 ejemplo limpees');

assert.ok(
  /Limpear \(o limp\) es igualar la ciega grande/.test(theoryJoin(Data.getLesson('C-02').theory)),
  'C-02 explica limpear la primera vez'
);
assert.ok(
  /menú Rangos/.test(theoryJoin(Data.getLesson('C-02').theory)),
  'C-02 apunta a rangos RFI en menú Rangos'
);
assert.ok(
  /Fold equity es la probabilidad/.test(theoryJoin(Data.getLesson('C-03').theory)),
  'C-03 define fold equity'
);
assert.ok(
  /Sizing es el tamaño/.test(theoryJoin(Data.getLesson('C-04').theory)) &&
    /bb \(ciegas grandes\)/.test(theoryJoin(Data.getLesson('C-04').theory)),
  'C-04 define sizing/bb'
);
assert.ok(
  /fuera de posición|OOP \(out of position\)/.test(theoryJoin(Data.getLesson('C-05').theory)),
  'C-05 introduce OOP'
);
assert.ok(/si hacen call, siempre juegas fuera de posición/.test(Data.getLesson('C-05').concept), 'C-05 concept call');
assert.ok(/polar \(/.test(Data.getLesson('C-05').examples[0].body) && /wide \(/.test(Data.getLesson('C-05').examples[0].body), 'C-05 ejemplo explica polar y wide');

/* C-08: conceptos polar / bluff / blockers / spew en lenguaje natural */
(function () {
  var c08 = Data.getLesson('C-08');
  var blob = lessonBlob(c08);
  assert.ok(/bluff \(farol\)|farol/.test(blob), 'C-08 explica bluff/farol');
  assert.ok(/blockers?:/.test(blob) || /blockers /.test(blob), 'C-08 explica blockers');
  assert.ok(/Polar significa/.test(blob), 'C-08 define polar');
  assert.ok(/Spew es/.test(blob), 'C-08 define spew');
  assert.ok(!/Value: QQ\+|Polar light:|linear\/value/.test(blob), 'C-08 no es telegrama de chart');
})();

/* C-09+: voz novato — ancla términos, sin telegramas densos */
(function () {
  function blobOf(id) {
    return lessonBlob(Data.getLesson(id));
  }
  var c09 = blobOf('C-09');
  assert.ok(/4-bet/.test(c09) && /hero-call/.test(c09), 'C-09 introduce 4-bet y hero-call');
  assert.ok(/vuelve a subir|siguiente subida/.test(c09), 'C-09 ancla 4-bet en español');
  assert.ok(!/4-bet value: QQ\+\/AK\. 4-bet bluff:/.test(c09), 'C-09 no es telegrama');

  var c10 = blobOf('C-10');
  assert.ok(/cold-call|Cold-call/.test(c10) && /Squeeze/.test(c10), 'C-10 define cold-call/squeeze');
  assert.ok(/dead money|fichas ya en el bote/.test(c10), 'C-10 ancla dead money');

  var c14 = blobOf('C-14');
  assert.ok(/flop seco|seco /.test(c14) && /c-bet/.test(c14), 'C-14 textura + c-bet');
  assert.ok(/continuación|apost/.test(c14), 'C-14 ancla c-bet');

  var c17 = blobOf('C-17');
  assert.ok(/pot odds|precio/.test(c17) && /backdoor/.test(c17), 'C-17 pot odds/backdoors');
  assert.ok(/54s/.test(c17) && /gutshot/.test(c17), 'C-17 ejemplo 54s con gutshot real en A72');
  assert.ok(!/86s \(gutshot/.test(c17), 'C-17 ya no enseña 86s como gutshot en A72');

  assert.ok(!/\b[Ll]lamar\b|\bllaman\b/.test(
    Data.m1Lessons().concat(Data.m2Lessons()).map(function (l) {
      return blobOf(l.id);
    }).join(' ')
  ), 'M1/M2 sin llamar=call');

  var road = fs.readFileSync(path.join(root, 'docs/ROADMAP_LECCIONES_DIRIGIDAS.md'), 'utf8');
  assert.ok(/Término \+ ancla \(C-09\+\)/.test(road), 'roadmap regla C-09+');
  assert.ok(/Orden de introducción en Cash M2/.test(road), 'roadmap vocabulario M2');
  assert.ok(/Regla para lecciones futuras/.test(road), 'roadmap regla futuras');
})();

assert.ok(
  !/Limpear \(o limp\) es igualar/.test(theoryJoin(Data.getLesson('C-03').theory)),
  'C-03 no redefine limp'
);
Data.m0Lessons().forEach(function (l) {
  assert.ok((l.concept || '').length > 40, l.id + ' concept no telegráfico');
  (l.theory || []).forEach(function (t, i) {
    assert.ok(theoryText(t).length > 60, l.id + ' theory[' + i + '] demasiado corta');
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

/* C-17: el spot de ejemplo vs c-bet 1/3 debe premiar call (teachBack = call). */
(function () {
  function spotById(lessonId, sid) {
    return Data.getLesson(lessonId).spots.filter(function (s) { return s.id === sid; })[0];
  }
  function grade(spot, actionId) {
    const h = openHand(spot).hand;
    const res = Engine.act(h, actionId);
    assert.ok(res && res.decision, 'grade ' + spot.id + ' ' + actionId);
    return res.decision.class;
  }
  const s = spotById('C-17', 'c17-01');
  assert.ok(s, 'c17-01 existe');
  assert.strictEqual(s.forceDeal.heroCards.join(''), '5h4h', 'c17-01 es 54s (gutshot en A72)');
  assert.strictEqual(s.forceDeal.board.join(''), 'As7d2c', 'c17-01 board A72r');
  assert.ok(/call/i.test(s.teachBack), 'c17-01 teachBack pide call');
  assert.ok(['optima', 'aceptable'].indexOf(grade(s, 'call')) >= 0, 'c17-01 call no es imprecisa');
})();

/** Turn/river: board completo y determinista; teachBack no cobra a Xx si el board está paired con X. */
(function assertPostflopBoardCoherence() {
  function spotById(lessonId, sid) {
    return Data.getLesson(lessonId).spots.filter(function (s) { return s.id === sid; })[0];
  }
  function gradeBet(spot) {
    const h = openHand(spot).hand;
    const bet = (h.current.options || []).map(function (o) { return o.id; })
      .filter(function (id) { return id === 'bet' || id.indexOf('bet_') === 0; })[0];
    assert.ok(bet, 'opción bet ' + spot.id);
    const res = Engine.act(h, bet);
    return res.decision.class;
  }
  Data.getLessons().forEach(function (lesson) {
    (lesson.spots || []).forEach(function (spot) {
      const st = (spot.playConfig && spot.playConfig.practiceStreet) || 'preflop';
      if (st !== 'turn' && st !== 'river') return;
      const board = (spot.forceDeal && spot.forceDeal.board) || [];
      const need = st === 'turn' ? 4 : 5;
      assert.ok(board.length >= need, spot.id + ' board completo (' + board.length + '<' + need + ')');
      const h1 = openHand(spot).hand;
      const h2 = openHand(spot).hand;
      assert.strictEqual(h1.board.join(''), h2.board.join(''), spot.id + ' board determinista');
      assert.strictEqual(h1.board.length, need, spot.id + ' engine street board');
      const tb = String(spot.teachBack || '');
      const m = tb.match(/cobra(?:s)? a ([AKQJT2-9])x/i);
      if (m) {
        const ranks = h1.board.map(function (c) { return c[0]; });
        const paired = ranks.filter(function (r, i) { return ranks.indexOf(r) !== i; });
        assert.ok(paired.indexOf(m[1]) < 0, spot.id + ' no cobra a ' + m[1] + 'x en board paired ' + h1.board.join(' '));
      }
    });
  });
  const c1913 = spotById('C-19', 'c19-13');
  assert.ok(c1913, 'c19-13');
  assert.strictEqual(c1913.forceDeal.board.length, 5, 'c19-13 river 5 cartas');
  assert.ok(['optima', 'aceptable'].indexOf(gradeBet(c1913)) >= 0, 'c19-13 value bet OK');
  assert.ok(/no paired|board no paired|no está paired/i.test(c1913.teachBack), 'c19-13 aclara board no paired');
})();

/* T-04 MTT mid steal: teachBack open ≠ chart de push. Raise debe ser óptima/aceptable. */
(function assertT04StealTeachBackAligned() {
  function grade(spot, actionId) {
    const h = openHand(spot).hand;
    const res = Engine.act(h, actionId);
    assert.ok(res && res.decision, 'grade ' + spot.id + ' ' + actionId);
    return res.decision.class;
  }
  const lesson = Data.getLesson('T-04');
  assert.ok(lesson && lesson.spots && lesson.spots.length >= 12, 'T-04 spots');
  const openIds = ['t04-04', 't04-06', 't04-10', 't04-11'];
  openIds.forEach(function (sid) {
    const spot = lesson.spots.filter(function (s) { return s.id === sid; })[0];
    assert.ok(spot, sid + ' existe');
    assert.ok(/steal|open|entra|razonable|frecuente|jugabilidad/i.test(spot.teachBack), sid + ' teachBack open');
    assert.ok(['optima', 'aceptable'].indexOf(grade(spot, 'raise')) >= 0,
      sid + ' raise alineado con teachBack (no chart push a 25 bb)');
  });
  ['t04-02', 't04-05', 't04-08', 't04-12'].forEach(function (sid) {
    const spot = lesson.spots.filter(function (s) { return s.id === sid; })[0];
    assert.ok(spot, sid);
    assert.ok(['optima', 'aceptable'].indexOf(grade(spot, 'fold')) >= 0, sid + ' fold sigue OK');
  });
})();

/* Spins S-01/S-02: sizing steal ~20 bb (shove vs open min vs 3-bet shove) */
(function () {
  function spotById(lessonId, sid) {
    return Data.getLesson(lessonId).spots.filter(function (s) { return s.id === sid; })[0];
  }
  function grade(spot, actionId) {
    const h = openHand(spot).hand;
    const res = Engine.act(h, actionId);
    assert.ok(res && res.decision, 'grade ' + spot.id + ' ' + actionId);
    return res.decision.class;
  }
  const s0101 = spotById('S-01', 's01-01');
  const hSteal = openHand(s0101).hand;
  assert.ok(hSteal.current.options.some(function (o) { return o.id === 'allin'; }), 'S-01 steal ofrece shove');
  assert.ok(hSteal.current.options.some(function (o) { return o.id === 'raise'; }), 'S-01 steal ofrece open min');
  assert.ok(['optima', 'aceptable'].indexOf(grade(s0101, 'allin')) >= 0, 'ATo steal: shove óptimo');
  const s0106 = spotById('S-01', 's01-06');
  assert.ok(['optima', 'aceptable'].indexOf(grade(s0106, 'raise')) >= 0, '97s steal: open min óptimo');
  const s0105 = spotById('S-01', 's01-05');
  assert.ok(['optima', 'aceptable'].indexOf(grade(s0105, 'allin')) >= 0, 'TT steal: shove óptimo');
  const s0201 = spotById('S-02', 's02-01');
  const hDef = openHand(s0201).hand;
  assert.ok(hDef.current.options.some(function (o) { return o.id === 'allin'; }), 'S-02 defensa ofrece 3-bet shove');
  assert.ok(['optima', 'aceptable'].indexOf(grade(s0201, 'allin')) >= 0, 'AJs vs steal: 3-bet shove óptimo');
  const s0501 = spotById('S-05', 'sp-01');
  const hPush = openHand(s0501).hand;
  assert.ok(hPush.current.options.some(function (o) { return o.id === 'allin'; }), 'S-05 push ofrece shove');
  assert.ok(!hPush.current.options.some(function (o) { return o.id === 'raise'; }), 'S-05 push sin min-raise');
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
sandbox.PTAuth = { getUser: function () { return { email: 'admin@x.com', isAdmin: true, plan: 'free' }; } };
sandbox.PTDemo = { isActive: function () { return false; } };
sandbox.PTEntitlements = { get: function () { return { plan: 'free' }; } };
sandbox.Store = {
  _st: { handsPlayed: 0, school: { xp: 0, lessons: {}, updatedAt: 0, version: 2 } },
  getStats: function () { return this._st; },
  persistStats: function (st) { this._st = st; },
  saveHand: function () { return {}; }
};
assert.ok(School.schoolMenuVisible(), 'menú visible con usuario autenticado');
assert.ok(School.isLessonUnlocked('C-00'), 'C-00 desbloqueada');
assert.ok(!School.isLessonUnlocked('C-01'), 'C-01 bloqueada al inicio');
assert.ok(School.canPlayLesson('C-00').ok, 'canPlay C-00');
assert.ok(!School.canPlayLesson('C-01').ok, 'canPlay C-01 locked');

School._state.view = 'hub';
sandbox.Store._st.school.lessons['C-00'] = {
  passed: true, bestScore: 1, bestPct: 100, attempts: 1
};
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
  sandbox.PTEntitlements.get = function () { return { plan: 'free' }; };
})();

/* M0 Spins/MTT jugable en plan free (tras desbloqueo lineal) */
(function () {
  sandbox.PTEntitlements.get = function () { return { plan: 'free' }; };
  ['S-00', 'S-01', 'S-02'].forEach(function (id) {
    sandbox.Store._st.school.lessons[id] = {
      passed: true, bestScore: 1, bestPct: 100, attempts: 1, gold: true, perfect: true
    };
  });
  assert.ok(School.isLessonUnlocked('S-03'), 'S-03 desbloqueada');
  assert.ok(School.canPlayLesson('S-03').ok, 'S-03 examen M0 jugable en free');
  sandbox.Store._st.school.lessons['S-03'] = {
    passed: true, bestScore: 1, bestPct: 100, attempts: 1, gold: true, perfect: true
  };
  assert.ok(School.isLessonUnlocked('S-04'), 'S-04 desbloqueada tras examen M0 spin');
  const gateS04 = School.canPlayLesson('S-04');
  assert.ok(!gateS04.ok && gateS04.reason === 'plan', 'S-04 M1 sigue muro Study en free');
  ['T-00', 'T-01', 'T-02'].forEach(function (id) {
    sandbox.Store._st.school.lessons[id] = {
      passed: true, bestScore: 1, bestPct: 100, attempts: 1, gold: true, perfect: true
    };
  });
  assert.ok(School.canPlayLesson('T-03').ok, 'T-03 examen M0 jugable en free');
  sandbox.Store._st.school.lessons['T-03'] = {
    passed: true, bestScore: 1, bestPct: 100, attempts: 1, gold: true, perfect: true
  };
  const gateT04 = School.canPlayLesson('T-04');
  assert.ok(!gateT04.ok && gateT04.reason === 'plan', 'T-04 M1 sigue muro Study en free');
})();

/* S-06 chip lead: héroe cover + short en mesa; sin «foldar». */
(function assertS06ChipLeadStacks() {
  const lesson = Data.getLesson('S-06');
  assert.ok(lesson && lesson.spots && lesson.spots.length >= 12, 'S-06 spots');
  assert.ok(!/\bfolda|\bfoldar\b/i.test(JSON.stringify(lesson.theory || []) + (lesson.concept || '')),
    'S-06 sin foldar/folda');
  lesson.spots.forEach(function (spot) {
    assert.strictEqual((spot.playConfig && spot.playConfig.stackRole) || '', 'cover',
      spot.id + ' stackRole cover');
    const pack = openHand(spot);
    const hand = pack.hand;
    const hero = hand.displayHeroPos || hand.hero.pos;
    const heroBB = hand.stacks[hero];
    const others = Object.keys(hand.stacks).filter(function (p) {
      return p !== hero && p !== 'hero' && p !== 'villain';
    }).map(function (p) { return hand.stacks[p]; });
    assert.ok(others.every(function (v) { return v < heroBB - 0.5; }),
      spot.id + ' villanos < héroe');
    assert.ok(others.some(function (v) { return v <= Math.min(heroBB * 0.55, 14) + 0.2; }),
      spot.id + ' hay short');
  });
})();

/* Barra hub = progreso de ruta (no XP del nivel; Nv.24 ≈99% XP engañaba) */
(function () {
  sandbox.PTAdmin = { hasAccess: function () { return true; } };
  sandbox.PTAuth = { getUser: function () { return { email: 'admin@x.com', isAdmin: true, plan: 'free' }; } };
  sandbox.Store._st.school.xp = 4799;
  var mttLessons = Data.lessonsForRoute('mtt');
  assert.ok(mttLessons.length >= 5, 'MTT tiene lecciones');
  mttLessons.forEach(function (l, i) {
    if (i < 5) {
      sandbox.Store._st.school.lessons[l.id] = {
        passed: true, bestScore: 1, bestPct: 100, attempts: 1, gold: true
      };
    }
  });
  var expectPct = Math.round((5 / mttLessons.length) * 100);
  assert.ok(expectPct < 90, 'fixture parcial (no 100%)');
  School._state.view = 'hub';
  School._state.route = 'mtt';
  var root = {
    innerHTML: '',
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
  School.render(root);
  var now = root.innerHTML.match(/aria-valuenow="(\d+)"/);
  var width = root.innerHTML.match(/school-xp-fill[^>]*style="width:(\d+)%"/);
  assert.ok(now, 'progressbar aria-valuenow');
  assert.strictEqual(Number(now[1]), expectPct, 'aria-valuenow = ruta ' + expectPct + '%');
  assert.ok(width, 'school-xp-fill width');
  assert.strictEqual(Number(width[1]), expectPct, 'barra width = ruta, no XP nivel');
  assert.ok(root.innerHTML.indexOf('5/' + mttLessons.length) >= 0, 'stat Ruta 5/N');
})();

/* Usuario autenticado no-admin: menú visible; sin login: oculto */
(function () {
  sandbox.PTAdmin = { hasAccess: function () { return false; } };
  sandbox.PTAuth = { getUser: function () { return { email: 'user@x.com', isAdmin: false, plan: 'pro' }; } };
  sandbox.PTDemo = { isActive: function () { return false; } };
  assert.ok(School.schoolMenuVisible(), 'menú visible para usuario autenticado');
  assert.ok(School.canPlayLesson('C-00').ok || School.isLessonUnlocked('C-00'), 'usuario puede acceder lecciones');
  sandbox.PTAuth = { getUser: function () { return null; } };
  assert.ok(!School.schoolMenuVisible(), 'menú oculto sin login');
  assert.ok(!School.openLesson('C-02'), 'openLesson denegado sin login');
  sandbox.PTAuth = { getUser: function () { return { email: 'user@x.com', isAdmin: false, plan: 'pro' }; } };
  sandbox.PTAdmin = { hasAccess: function () { return true; } };
})();

/* openLesson deep-link (usuario autenticado) */
(function () {
  sandbox.PTAdmin = { hasAccess: function () { return false; } };
  sandbox.PTAuth = { getUser: function () { return { email: 'user@x.com', isAdmin: false, plan: 'free' }; } };
  assert.ok(School.openLesson('S-00'), 'openLesson S-00');
  assert.strictEqual(School._state.route, 'spin', 'ruta spin tras openLesson');
  assert.strictEqual(School._state.lessonId, 'S-00', 'lessonId S-00');
  assert.strictEqual(School._state.view, 'lesson', 'view lesson');
  sandbox.PTAdmin = { hasAccess: function () { return true; } };
})();

/* R-05 y M2–M4 (R-07…R-21): manos completas (river) + quiz «¿qué crees que tiene?». */
(function assertRangesLineQuiz() {
  const lineIds = ['R-05'].concat(
    ['R-07', 'R-08', 'R-09', 'R-10', 'R-11', 'R-12', 'R-13', 'R-14', 'R-15', 'R-16', 'R-17', 'R-18', 'R-19', 'R-20', 'R-21']
  );
  lineIds.forEach(function (lessonId) {
    const lesson = Data.getLesson(lessonId);
    assert.ok(lesson, lessonId + ' existe');
    assert.ok(/línea|qué crees que tiene|set|flush|escalera|draw|barrel|color|full|boat|polar|merge/i.test(lessonBlob(lesson)),
      lessonId + ' teoría de lectura de línea');
    assert.ok(Array.isArray(lesson.spots) && lesson.spots.length >= 12, lessonId + ' ≥12 spots');
    lesson.spots.forEach(function (spot) {
      const st = (spot.playConfig && spot.playConfig.practiceStreet) || 'preflop';
      assert.strictEqual(st, 'river', spot.id + ' debe ser river (mano completa)');
      const board = (spot.forceDeal && spot.forceDeal.board) || [];
      assert.strictEqual(board.length, 5, spot.id + ' board river 5 cartas');
      assert.ok(Array.isArray(spot.lineStory) && spot.lineStory.length >= 3, spot.id + ' lineStory');
      const quiz = spot.villainQuiz;
      assert.ok(quiz && Array.isArray(quiz.options) && quiz.options.length === 3, spot.id + ' quiz 3 opciones');
      const correct = quiz.options.filter(function (o) { return o.correct; });
      assert.strictEqual(correct.length, 1, spot.id + ' exactamente 1 correcta');
      assert.ok(quiz.answerCards && quiz.answerCards.length === 2, spot.id + ' answerCards');
      const dead = [].concat(spot.forceDeal.heroCards || [], board, quiz.answerCards);
      const seen = Object.create(null);
      dead.forEach(function (c) {
        assert.ok(!seen[c], spot.id + ' carta duplicada ' + c);
        seen[c] = true;
      });
      quiz.options.forEach(function (o) {
        assert.ok(o.cards && o.cards.length === 2, spot.id + ' option cards');
        if (!o.correct) {
          assert.ok(o.eliminated && o.eliminated.length > 10, spot.id + ' eliminated text');
          assert.ok(/flop|turn|river|c-bet|barrel|donk|check-check|raise|pot-control/i.test(o.eliminated),
            spot.id + ' ' + o.label + ' debe descartarse postflop, no solo preflop');
          assert.ok(!/^(No abre|No entra en RFI|Fuera del RFI|Basura|No está en el RFI)/i.test(o.eliminated),
            spot.id + ' ' + o.label + ' no debe ser descarte trivial de open');
        }
      });
      const pack = openHand(spot);
      assert.strictEqual(pack.hand.stage, 'river', spot.id + ' stage river');
      assert.ok(pack.hand.current && pack.hand.current.options.length, spot.id + ' opciones river');
      const callOrFold = pack.hand.current.options.map(function (o) { return o.id; })
        .filter(function (id) { return id === 'call' || id === 'fold' || id === 'check'; })[0];
      assert.ok(callOrFold, spot.id + ' call/fold/check');
      const graded = openHand(spot).hand;
      const res = Engine.act(graded, callOrFold);
      assert.ok(res && res.decision, spot.id + ' gradeable');
      assert.strictEqual(graded.stage, 'complete', spot.id + ' decisionEnd');
    });
  });
  assert.ok(/villainQuiz|showVillainQuiz|¿Qué crees que tiene/.test(schoolSrc), 'school.js quiz villano');
  assert.ok(/school-quiz-option|school-line-story/.test(css), 'CSS quiz/línea');
  assert.ok(/school-quiz-option-cards/.test(schoolSrc), 'opciones quiz muestran cartas');
  assert.ok(!/school-quiz-option-label/.test(schoolSrc), 'opciones quiz sin etiqueta de texto debajo');
  assert.ok(/mountLineQuizShare|buildLineQuizShareHtml/.test(schoolSrc), 'quiz línea comparte spot');
  assert.ok(/flush draw|OESD|semi-bluff|boat|overbet|merge/i.test(
    lineIds.slice(1).map(function (id) { return lessonBlob(Data.getLesson(id)); }).join(' ')
  ), 'M2–M4 cubren draws/boats/sizing');
})();

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

console.log('*** school G–J OK (M0 ' + spotCount + ' spots + Spins/MTT/Rangos/Pro + leaks→lección, abierta a usuarios) ***');
