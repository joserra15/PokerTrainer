#!/usr/bin/env node
/**
 * Auditoría sistemática Escuela ↔ motor:
 * por cada lección con spots, abre la mano y comprueba que la acción
 * enseñada en teachBack sea optima/aceptable bajo Engine.act.
 *
 * Uso:
 *   node tools/audit-school-lessons.js
 *   node tools/audit-school-lessons.js --route mtt
 *   node tools/audit-school-lessons.js --json
 *   npm run audit:school-lessons
 *
 * Exit 1 si hay errores (warnings no fallan).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'tools', 'audit-out');
const outFile = path.join(outDir, 'school-lessons-audit.json');

const args = process.argv.slice(2);
const wantJson = args.indexOf('--json') >= 0;
const routeFilter = (function () {
  const i = args.indexOf('--route');
  return i >= 0 ? String(args[i + 1] || '') : '';
})();
const lessonFilter = (function () {
  const i = args.indexOf('--lesson');
  return i >= 0 ? String(args[i + 1] || '') : '';
})();

const GOOD = { optima: 1, aceptable: 1 };

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
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null;
    },
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
  'js/engine/ranges/nash-push-data.js',
  'js/engine/ranges/jsonLoader.js',
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
  'js/engine/heroExploitAdjust.js',
  'js/engine/villainPreflop.js',
  'js/engine/multiway.js',
  'js/engine/stacks.js',
  'js/play-config.js',
  'js/ranges.js',
  'js/engine.js',
  'js/school-data.js',
  'js/school-data-m1.js',
  'js/school-data-m2.js',
  'js/school-data-m3.js',
  'js/school-data-spin.js',
  'js/school-data-mtt.js',
  'js/school-data-ranges.js',
  'js/school-data-pro.js',
  'js/school-data-exploit.js',
  'js/school-extra-spots.js',
  'js/school-data-practice.js',
  'js/school-data-exploit-practice.js',
  'js/school-data-ranges-line.js',
  'js/school-data-ranges-line-sizing.js',
  'js/school-data-viral-quizzes.js',
  'js/school-data-viral-quizzes-phase234.js',
  'js/school-data-mttlab.js',
  'js/school-matrix-drills.js',
  'js/school-share.js',
  'js/school-daily-spot.js',
  'js/school.js'
];

engineScripts.forEach(function (rel) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
});

const Data = sandbox.PTSchoolData;
const Engine = sandbox.Engine || sandbox.window.Engine;
const MXDrills = sandbox.PTSchoolMatrixDrills;
if (!Data || !Engine) {
  console.error('audit-school-lessons: failed to load PTSchoolData / Engine');
  process.exit(1);
}

function isMatrixSpot(spot) {
  return MXDrills && MXDrills.isMatrixSpot && MXDrills.isMatrixSpot(spot);
}

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
  if (spot.forceScript) force.forceScript = spot.forceScript;
  return force;
}

function cfgFromSpot(spot, lesson) {
  const route = (lesson && lesson.route) || 'cash';
  const hub = route === 'spin' ? 'spin' : (route === 'mtt' ? 'mtt' : 'cash');
  const base = {
    scenario: 'rfi',
    practiceStreet: 'preflop',
    handRange: 'all',
    villainLevel: 'fish',
    villainType: 'random',
    scoreMode: 'gto',
    formatHub: hub,
    gameType: hub === 'spin' ? 'spin3' : (hub === 'mtt' ? 'mtt' : 'cash6'),
    schoolDecisionEnd: !(lesson && lesson.decisionEnd === false),
    schoolMode: true
  };
  const extra = (spot && spot.playConfig) || {};
  const out = Object.assign({}, base, extra);
  if (spot && spot.schoolObserveOnly) {
    out.scoreMode = 'gto';
    out.schoolObserveOnly = true;
  }
  return out;
}

function openHand(spot, lesson) {
  const force = forceFromSpot(spot);
  const cfg = cfgFromSpot(spot, lesson);
  const hand = Engine.newHand(force, cfg);
  return { hand: hand, cfg: cfg, force: force };
}

function legalOptionIds(hand) {
  const opts = (hand && hand.current && hand.current.options) || [];
  return opts.map(function (o) { return o.id; });
}

function gradeAction(spot, lesson, actionId) {
  const pack = openHand(spot, lesson);
  const hand = pack.hand;
  const ids = legalOptionIds(hand);
  if (ids.indexOf(actionId) < 0) {
    return { ok: false, missing: true, class: null, legal: ids };
  }
  const res = Engine.act(hand, actionId);
  const cls = res && res.decision && res.decision.class;
  return { ok: !!GOOD[cls], missing: false, class: cls || null, legal: ids };
}

/**
 * Enmascarar ruido pedagógico antes de inferir la acción enseñada.
 * Los tokens MASK_* no deben anular verbos posteriores (Fold tras NO_RAISE).
 */
function preprocessTeachBack(raw) {
  var tb = String(raw || '');
  tb = tb.replace(/fold\s*equity/gi, 'FE');
  tb = tb.replace(/GTO\s+(?:mezclaría|mezcla|a\s+menudo|check(?:-back|ea|ear)?|check\s+mix|bluff\s+selectivo)[^.；;]*/gi, '«GTO_ALT»');
  tb = tb.replace(/vs\s+reg\s+más\s+check[^.；;]*/gi, '«GTO_ALT»');
  tb = tb.replace(/el\s+chart\s+a\s+veces\s+checkea[^.；;]*/gi, '«GTO_ALT»');
  tb = tb.replace(/no\s+tiltees\s+si\s+el\s+chart[^.；;]*/gi, '«GTO_ALT»');
  tb = tb.replace(/\bancla\.?/gi, '');
  tb = tb.replace(/no\s+es\s+un\s+open[^\s.]*/gi, '«NO_OPEN»');
  tb = tb.replace(/no\s+(?:la\s+)?trates\s+como\s+open[^\s.]*/gi, '«NO_OPEN»');
  tb = tb.replace(/no\s+entra\s+en\s+open[^\s.]*/gi, '«OUT_BAND»');
  tb = tb.replace(/fuera\s+de\s+(?:todo\s+)?rango\s+de\s+(?:shove|call|open|3-?\s*bet)/gi, '«OUT_BAND»');
  tb = tb.replace(/no\s+está\s+en\s+(?:el\s+)?rango\s+de\s+shove/gi, '«OUT_BAND»');
  tb = tb.replace(/no\s+está\s+en\s+ninguna\s+banda/gi, '«OUT_BAND»');
  tb = tb.replace(/3-?\s*bet(?:ear)?\s+aquí\s+suele\s+ser\s+spew[^.；;]*/gi, '«NO_RAISE»');
  tb = tb.replace(/no\s+(?:hagas\s+)?(?:squeeze|3-?\s*bet|4-?\s*bet)\s*(?:spew|bluff\s+war|ear)?/gi, '«NO_RAISE»');
  tb = tb.replace(/no\s+3-?\s*bet(?:ear)?(?:\s+spew|\s+bluff)?/gi, '«NO_RAISE»');
  tb = tb.replace(/no\s+4-?\s*bet/gi, '«NO_RAISE»');
  tb = tb.replace(/no\s+squeeze(?:\s+spew)?/gi, '«NO_RAISE»');
  tb = tb.replace(/sin\s+min-?3bet/gi, '«NO_MIN»');
  tb = tb.replace(/no\s+min-?raise(?:es)?/gi, '«NO_MIN»');
  tb = tb.replace(/preferible\s+a\s+shove[^.；;]*/gi, '«PREFER_OPEN»');
  tb = tb.replace(/sin\s+shove/gi, '«NO_SHOVE»');
  tb = tb.replace(/no\s+commitees[^.；;]*/gi, '«NO_SHOVE»');
  tb = tb.replace(/no\s+shove(?:es|ar)?/gi, '«NO_SHOVE»');
  tb = tb.replace(/shove\s+panic/gi, '«NO_SHOVE»');
  tb = tb.replace(/shove\s+reservado[^.；;]*/gi, '«NO_SHOVE»');
  tb = tb.replace(/no\s+mereces\s+iso[^.；;]*/gi, '«NO_RAISE»');
  tb = tb.replace(/no\s+polar\s+sin[^.；;]*/gi, '«NO_RAISE»');
  tb = tb.replace(/no\s+spew\s+bluff(?:\s+war)?[^.；;]*/gi, '«NO_RAISE»');
  tb = tb.replace(/no\s+autocbet(?:\s+spew|\s+grande)?/gi, '«NO_BET»');
  tb = tb.replace(/no\s+hinches[^.；;]*/gi, '«NO_BET»');
  tb = tb.replace(/no\s+overbetees[^.；;]*/gi, '«NO_BET»');
  tb = tb.replace(/no\s+fuerces\s+barrel[^.；;]*/gi, '«NO_BET»');
  tb = tb.replace(/no\s+second\s+barrel\s+spew[^.；;]*/gi, '«NO_BET»');
  tb = tb.replace(/no\s+bluff\s+spew[^.；;]*/gi, '«NO_BET»');
  tb = tb.replace(/menos\s+farol[^.；;]*/gi, '');
  return tb;
}

/**
 * Inferir acciones pedagógicas desde teachBack.
 */
function inferTaughtActions(teachBack, legalIds) {
  const raw = String(teachBack || '');
  if (!raw.trim()) return { actions: [], confidence: 'none', reason: 'empty teachBack' };

  const tb = preprocessTeachBack(raw);
  var outOfBand = /«OUT_BAND»/.test(tb);
  var noBet = /«NO_BET»/.test(tb);

  // Lead = tras ':' o primeras 2 frases (para pillar «Fold.» tras «NO_RAISE.»)
  var lead = tb;
  var colon = tb.indexOf(':');
  if (colon >= 0 && colon < 80) lead = tb.slice(colon + 1);
  var sentences = lead.split(/\.\s+/);
  lead = sentences.slice(0, 2).join('. ').slice(0, 280);

  var found = [];
  var seen = Object.create(null);

  function negatedAt(full, idx) {
    var before = full.slice(Math.max(0, idx - 40), idx);
    var after = full.slice(idx, idx + 40).toLowerCase();
    // Ignorar tokens «MASK» al mirar negación inmediata
    var beforeClean = before.replace(/«[^»]+»/g, ' ').toLowerCase();
    if (/\bno\s+(?:es\s+)?(?:auto-)?$/.test(beforeClean)) return true;
    if (/\bsin\s+(?:auto-)?$/.test(beforeClean)) return true;
    if (/\bevita(?:r)?\s+$/.test(beforeClean)) return true;
    if (/\bno\s+min-?$/.test(beforeClean)) return true;
    if (/sería\s+demasiado/.test(after)) return true;
    if (/demasiado\s+tight/.test(after)) return true;
    return false;
  }

  function resolveId(id) {
    if (!legalIds || !legalIds.length) return id;
    if (legalIds.indexOf(id) >= 0) return id;
    if (id === 'bet') {
      if (legalIds.some(function (x) { return x === 'bet' || /^bet_/.test(x) || x === 'overbet'; })) return 'bet';
      if (legalIds.indexOf('raise') >= 0) return 'raise';
    }
    if (id === 'raise') {
      // 3-bet / resteal en stacks cortos: el nodo solo ofrece allin
      if (legalIds.indexOf('allin') >= 0 && legalIds.indexOf('raise') < 0) return 'allin';
      if (legalIds.indexOf('bet') >= 0) return 'bet';
      if (legalIds.some(function (x) { return /^bet_/.test(x) || x === 'overbet'; })) return 'bet';
    }
    // BB vs limp: «check» del teachBack = call en el nodo
    if (id === 'check' && legalIds.indexOf('check') < 0 && legalIds.indexOf('call') >= 0) return 'call';
    // No mapear call→check: «call down» en nodo check/bet es mismatch de street/facingBet
    return null;
  }

  function add(id, conf) {
    var resolved = resolveId(id);
    if (!resolved || seen[resolved]) return;
    seen[resolved] = 1;
    found.push({ id: resolved, confidence: conf });
  }

  var patterns = [
    { re: /3-?\s*bet\s*shove|\bshove\b|\ball-?in\b|\bjam\b|\bstack-?off\b/gi, id: 'allin', conf: 'high' },
    { re: /\bcheck-raise\b|\bxr\b/gi, id: 'raise', conf: 'high' },
    { re: /\bfold\b|\bpliega|\bretir(?:arse)?\b|\btirar\b|\boverfold\b/gi, id: 'fold', conf: 'high' },
    { re: /\bcall(?:\s*down)?\b|\biguala(?:r)?\b|\bpaga(?:r)?\b|\bdefiende\b|\bdefend(?:e|es|er)?\b|\bdefensa\b|\bcatcher\b/gi, id: 'call', conf: 'high' },
    { re: /\bcheck(?:ea|ear|-call|-back)?\b|\bpot\s*control\b|\bgive\s*-?\s*up\b|\bcedes?\b|\bcede\b/gi, id: 'check', conf: 'high' },
    { re: /\b3-?\s*bets?\b|\b4-?\s*bets?\b|\braise\b|\bopen(?:\s+steal|\s+min)?\b|\bsteal\b|\biso(?:-?raise)?\b|\bsqueeze\b|\bresteal\b|\brestéal\b|\bsube\b|\bentra\b|\bse\s+abre\b|\babre(?:s|n)?\b|\brobo\b|\bpressure\b|\bpresión\b/gi, id: 'raise', conf: 'high' },
    { re: /\bc-?bet\b|\bvalue(?:\s*bet|\s*thin|\s*fat|\s*up|\s*merge)?\b|\bbarrel\b|\bbet(?:ea|ear)?\b|\bapuesta\b|\bcobra|\bthin\b|\boverbet\b|\bsizing\b/gi, id: 'bet', conf: 'med' }
  ];

  function scan(src, conf) {
    patterns.forEach(function (p) {
      p.re.lastIndex = 0;
      var m;
      while ((m = p.re.exec(src))) {
        if (negatedAt(src, m.index)) continue;
        // «overfold» no es fold pedagógico
        if (p.id === 'fold' && /overfold/i.test(m[0])) continue;
        add(p.id, conf);
      }
    });
  }

  scan(lead, 'high');
  if (!found.length) scan(tb.slice(0, 320), 'low');

  if (!found.length && outOfBand) add('fold', 'med');
  if (!found.length && noBet) add('check', 'med');

  // «no autocbet / selectivo / pot control» sin verbo → check
  if (!found.length && /\b(?:selectivo|pot\s*control|no\s+autocbet|give\s*-?\s*up|cede)/i.test(raw)) {
    add('check', 'med');
  }
  // «value / barrel» sin check → bet
  if (!found.length && /\b(?:value|barrel|c-?bet|thin|overbet)\b/i.test(raw)) {
    add('bet', 'med');
  }
  // «mix GTO / según chart / juega el mix / ≈ GTO» → cualquier línea buena
  if (!found.length && /\b(?:mix\s*GTO|según\s+(?:el\s+)?chart|decisión\s+GTO|≈\s*GTO|juega(?:r)?\s+(?:el\s+)?mix|benchmark|identidad|checklist|node\s*lock)\b/i.test(raw)) {
    if (legalIds.indexOf('check') >= 0) add('check', 'low');
    if (legalIds.some(function (x) { return x === 'bet' || /^bet_/.test(x); })) add('bet', 'low');
    if (legalIds.indexOf('fold') >= 0) add('fold', 'low');
    if (legalIds.indexOf('call') >= 0) add('call', 'low');
    if (legalIds.indexOf('raise') >= 0) add('raise', 'low');
    if (legalIds.indexOf('allin') >= 0) add('allin', 'low');
  }
  // «fold o bluff» en river check/bet → check (give up) y/o bet (bluff)
  if (!found.length && /\bfold\s+o\s+bluff\b|\bbluff\s+solo\b/i.test(raw)) {
    if (legalIds.indexOf('check') >= 0) add('check', 'med');
    if (legalIds.some(function (x) { return /^bet_/.test(x) || x === 'bet'; })) add('bet', 'med');
    if (legalIds.indexOf('fold') >= 0) add('fold', 'med');
  }
  // «robo / especulativa pero razonable» RFI → raise
  if (!found.length && /\b(?:robo|especulativa|razonable)\b/i.test(raw) &&
      legalIds.indexOf('raise') >= 0) {
    add('raise', 'low');
  }
  // «tampoco / spew / muerto» sin acción → fold
  if (!found.length && /\b(?:tampoco|spew|muerto)\b/i.test(raw) && legalIds.indexOf('fold') >= 0) {
    add('fold', 'low');
  }

  // Contraste GTO check + exploit bet
  if (found.length === 1 && found[0].id === 'check') {
    if (/\b(?:c-?bet|bet\s*value|value\b|cobras?|hoy\s+bet|exploit\s+bet)\b/i.test(raw) &&
        !/\bNO\s+farol\b/i.test(raw)) {
      add('bet', 'high');
    }
  }

  return {
    actions: found.map(function (f) { return f.id; }),
    confidence: found.length ? (found[0].confidence || 'med') : 'none',
    reason: found.length ? null : 'no action verb mapped'
  };
}

/** Expande id pedagógico a ids legales del nodo (bet → bet_33…). */
function expandActionIds(taughtId, legalIds) {
  if (taughtId === 'bet') {
    var bets = legalIds.filter(function (x) {
      return x === 'bet' || /^bet_/.test(x) || x === 'overbet';
    });
    if (bets.length) return bets;
    if (legalIds.indexOf('raise') >= 0) return ['raise'];
    return [];
  }
  if (legalIds.indexOf(taughtId) >= 0) return [taughtId];
  // raise pedagógico en nodo shove-only
  if (taughtId === 'raise' && legalIds.indexOf('allin') >= 0) return ['allin'];
  return [];
}

function auditQuizSpot(lesson, spot) {
  const sid = lesson.id + '/' + (spot.id || '?');
  const issues = [];

  // matrixPaint / locate / inRange / paint: no options[] — valid drill shapes
  if (spot.kind === 'matrixPaint') {
    if (!spot.paint || !spot.paint.position) {
      issues.push({ level: 'error', code: 'paint_missing', msg: sid + ': matrixPaint without paint payload' });
    }
    return issues;
  }
  if (spot.kind === 'rangeAdvQuiz' || spot.kind === 'nutAdvQuiz') {
    if (!spot.quiz) {
      issues.push({ level: 'error', code: 'quiz_missing', msg: sid + ': rangeAdv without quiz' });
    }
    return issues;
  }

  const q = spot.quiz || spot.villainQuiz;
  if (!q) {
    issues.push({ level: 'error', code: 'quiz_missing', msg: sid + ': quiz spot without quiz payload' });
    return issues;
  }
  if (q.mode === 'locate' || q.mode === 'inRange' || q.mode === 'paint') {
    if (q.mode === 'locate' && !q.targetCell) {
      issues.push({ level: 'error', code: 'locate_cell', msg: sid + ': locate without targetCell' });
    }
    if (q.mode === 'inRange' && !q.hand) {
      issues.push({ level: 'error', code: 'inRange_hand', msg: sid + ': inRange without hand' });
    }
    return issues;
  }
  const opts = q.options || [];
  if (!opts.length) {
    issues.push({ level: 'error', code: 'quiz_empty', msg: sid + ': quiz without options' });
    return issues;
  }
  if (q.correctId != null) {
    const ids = opts.map(function (o) { return o.id; });
    if (ids.indexOf(q.correctId) < 0) {
      issues.push({
        level: 'error',
        code: 'quiz_correctId',
        msg: sid + ': correctId «' + q.correctId + '» not in options'
      });
    }
  } else if (spot.kind === 'villainTypeQuiz' || spot.villainQuiz) {
    const hasCorrect = opts.some(function (o) { return o.correct === true; });
    if (!hasCorrect && !(q.answerCards && q.answerCards.length)) {
      issues.push({
        level: 'warning',
        code: 'quiz_no_flag',
        msg: sid + ': no correct flag / answerCards'
      });
    }
  }
  if (spot.kind === 'decisionQuiz' && q.facingBet === false) {
    const ids = opts.map(function (o) { return o.id; });
    if (ids.indexOf('call') >= 0 || ids.indexOf('fold') >= 0) {
      issues.push({
        level: 'error',
        code: 'decision_facing',
        msg: sid + ': facingBet=false must use Check/Bet'
      });
    }
  }
  return issues;
}

function auditEngineSpot(lesson, spot) {
  const sid = lesson.id + '/' + (spot.id || '?');
  const issues = [];
  var pack;
  try {
    pack = openHand(spot, lesson);
  } catch (e) {
    issues.push({
      level: 'error',
      code: 'open_fail',
      msg: sid + ': Engine.newHand threw: ' + (e && e.message ? e.message : e)
    });
    return issues;
  }
  const hand = pack.hand;
  if (!hand || !hand.hero || !hand.hero.cards) {
    issues.push({ level: 'error', code: 'no_hand', msg: sid + ': no hero hand' });
    return issues;
  }
  const legal = legalOptionIds(hand);
  if (!legal.length) {
    issues.push({ level: 'error', code: 'no_options', msg: sid + ': no legal options' });
    return issues;
  }

  // Observe-only: only require openable hand
  if (spot.schoolObserveOnly) {
    return issues;
  }

  // Villain-quiz line spots: teachBack describes villain, not hero action
  if (spot.villainQuiz) {
    var anyGood = false;
    var gradesPreview = {};
    legal.forEach(function (aid) {
      var g = gradeAction(spot, lesson, aid);
      gradesPreview[aid] = g.class;
      if (g.ok) anyGood = true;
    });
    if (!anyGood) {
      issues.push({
        level: 'error',
        code: 'no_good_action',
        msg: sid + ': villainQuiz spot has no optima/aceptable among ' + legal.join(','),
        grades: gradesPreview
      });
    }
    const qIssues = auditQuizSpot(lesson, spot);
    return issues.concat(qIssues);
  }

  // Multi-street lessons (decisionEnd=false): only check that some action grades OK
  if (lesson.decisionEnd === false) {
    var goodLine = false;
    var gmap = {};
    legal.forEach(function (aid) {
      var g = gradeAction(spot, lesson, aid);
      gmap[aid] = g.class;
      if (g.ok) goodLine = true;
    });
    if (!goodLine) {
      issues.push({
        level: 'error',
        code: 'no_good_action',
        msg: sid + ': decisionEnd=false spot with no optima/aceptable',
        grades: gmap
      });
    }
    return issues;
  }

  const inferred = inferTaughtActions(spot.teachBack, legal);
  if (!inferred.actions.length) {
    // Still require at least one good legal action
    var any = false;
    var gm = {};
    legal.forEach(function (aid) {
      var g = gradeAction(spot, lesson, aid);
      gm[aid] = g.class;
      if (g.ok) any = true;
    });
    issues.push({
      level: 'warning',
      code: 'unparsed_teachBack',
      msg: sid + ': ' + (inferred.reason || 'unparsed') + ' — «' +
        String(spot.teachBack || '').slice(0, 90) + '»',
      grades: gm
    });
    if (!any) {
      issues.push({
        level: 'error',
        code: 'no_good_action',
        msg: sid + ': no optima/aceptable among ' + legal.join(','),
        grades: gm
      });
    }
    return issues;
  }

  var bestOk = false;
  var detail = [];
  inferred.actions.forEach(function (aid) {
    var expanded = expandActionIds(aid, legal);
    if (!expanded.length) {
      detail.push(aid + '=missing');
      return;
    }
    var anyAid = false;
    expanded.forEach(function (eid) {
      var g = gradeAction(spot, lesson, eid);
      detail.push(eid + '=' + (g.missing ? 'missing' : g.class));
      if (g.ok) { bestOk = true; anyAid = true; }
    });
    if (!anyAid && expanded.length > 1) {
      /* already recorded each sizing */
    }
  });

  if (!bestOk) {
    // Also compute full grade map for triage
    var full = {};
    legal.forEach(function (aid) {
      full[aid] = gradeAction(spot, lesson, aid).class;
    });
    issues.push({
      level: 'error',
      code: 'teachBack_mismatch',
      msg: sid + ': taught [' + inferred.actions.join('|') + '] → ' + detail.join(', ') +
        ' (legal grades: ' + JSON.stringify(full) + ')',
      taught: inferred.actions,
      grades: full,
      teachBack: String(spot.teachBack || '').slice(0, 160)
    });
  }
  return issues;
}

function priorityForRoute(route) {
  if (route === 'mtt' || route === 'spin') return 'P0';
  if (route === 'cash') return 'P1';
  return 'P2';
}

const report = {
  generatedAt: new Date().toISOString(),
  lessonsAudited: 0,
  spotsAudited: 0,
  engineSpots: 0,
  quizSpots: 0,
  skippedEmpty: 0,
  errors: [],
  warnings: [],
  byLesson: {}
};

const allLessons = Data.getLessons().filter(function (l) {
  if (routeFilter && l.route !== routeFilter) return false;
  if (lessonFilter && l.id !== lessonFilter) return false;
  return true;
});

// Stable order: mtt, spin, cash, ranges, mttlab, other
const routeOrder = { mtt: 0, spin: 1, cash: 2, ranges: 3, mttlab: 4 };
allLessons.sort(function (a, b) {
  const ra = routeOrder[a.route] != null ? routeOrder[a.route] : 9;
  const rb = routeOrder[b.route] != null ? routeOrder[b.route] : 9;
  if (ra !== rb) return ra - rb;
  return (a.order || 0) - (b.order || 0) || String(a.id).localeCompare(String(b.id));
});

allLessons.forEach(function (lesson) {
  const spots = lesson.spots || [];
  if (!spots.length) {
    report.skippedEmpty += 1;
    return;
  }
  report.lessonsAudited += 1;
  const lessonIssues = [];

  spots.forEach(function (spot) {
    report.spotsAudited += 1;
    var issues;
    if (isMatrixSpot(spot) || (spot.kind && !spot.forceDeal)) {
      report.quizSpots += 1;
      issues = auditQuizSpot(lesson, spot);
    } else if (spot.forceDeal || spot.type) {
      report.engineSpots += 1;
      issues = auditEngineSpot(lesson, spot);
    } else {
      report.quizSpots += 1;
      issues = auditQuizSpot(lesson, spot);
    }
    issues.forEach(function (iss) {
      const row = Object.assign({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        route: lesson.route,
        priority: priorityForRoute(lesson.route),
        spotId: spot.id
      }, iss);
      lessonIssues.push(row);
      if (iss.level === 'error') report.errors.push(row);
      else report.warnings.push(row);
    });
  });

  if (lessonIssues.length) {
    report.byLesson[lesson.id] = {
      title: lesson.title,
      route: lesson.route,
      priority: priorityForRoute(lesson.route),
      errors: lessonIssues.filter(function (i) { return i.level === 'error'; }).length,
      warnings: lessonIssues.filter(function (i) { return i.level === 'warning'; }).length,
      issues: lessonIssues
    };
  }
});

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

function printSummary() {
  console.log('*** audit-school-lessons ***');
  console.log('Lessons with spots: ' + report.lessonsAudited +
    ' (empty skipped: ' + report.skippedEmpty + ')');
  console.log('Spots: ' + report.spotsAudited +
    ' (engine ' + report.engineSpots + ', quiz ' + report.quizSpots + ')');
  console.log('Errors: ' + report.errors.length + ' · Warnings: ' + report.warnings.length);
  console.log('Report: ' + path.relative(root, outFile));

  if (report.errors.length) {
    console.log('\nErrors by priority:');
    ['P0', 'P1', 'P2'].forEach(function (p) {
      const list = report.errors.filter(function (e) { return e.priority === p; });
      if (!list.length) return;
      console.log('  ' + p + ' (' + list.length + ')');
      list.slice(0, 40).forEach(function (e) {
        console.log('    ✗ [' + e.route + '] ' + e.msg);
      });
      if (list.length > 40) console.log('    … +' + (list.length - 40) + ' more');
    });
  }
  if (report.warnings.length && report.warnings.length <= 30) {
    console.log('\nWarnings:');
    report.warnings.forEach(function (w) {
      console.log('  ⚠ ' + w.msg);
    });
  } else if (report.warnings.length) {
    console.log('\nWarnings: ' + report.warnings.length + ' (see JSON)');
  }
}

if (wantJson) {
  process.stdout.write(JSON.stringify({
    errors: report.errors.length,
    warnings: report.warnings.length,
    lessonsAudited: report.lessonsAudited,
    spotsAudited: report.spotsAudited,
    outFile: outFile
  }, null, 2) + '\n');
} else {
  printSummary();
}

if (report.errors.length) {
  console.error('\naudit-school-lessons FAILED with ' + report.errors.length + ' errors');
  process.exit(1);
}
console.log('\n*** audit-school-lessons OK ***');
process.exit(0);
