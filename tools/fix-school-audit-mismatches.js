#!/usr/bin/env node
/**
 * One-shot repair helper: for teachBack↔engine mismatches from
 * tools/audit-out/school-lessons-audit.json, rewrite hero cards (same family)
 * or teachBack lead so the taught action grades optima/aceptable.
 *
 * Usage: node tools/fix-school-audit-mismatches.js
 * Then re-run: node tools/audit-school-lessons.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const reportPath = path.join(root, 'tools/audit-out/school-lessons-audit.json');
if (!fs.existsSync(reportPath)) {
  console.error('Run audit-school-lessons.js first');
  process.exit(1);
}

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
  'js/school-matrix-drills.js',
  'js/school-share.js',
  'js/school-daily-spot.js',
  'js/school.js'
];
engineScripts.forEach(function (rel) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
});

const Engine = sandbox.Engine;
const Data = sandbox.PTSchoolData;
const GOOD = { optima: 1, aceptable: 1 };
const ORDER = 'AKQJT98765432';

function cardsToCombo(c1, c2) {
  var r1 = c1[0], s1 = c1[1], r2 = c2[0], s2 = c2[1];
  if (ORDER.indexOf(r1) > ORDER.indexOf(r2)) {
    var t = r1; r1 = r2; r2 = t;
    t = s1; s1 = s2; s2 = t;
  }
  if (r1 === r2) return r1 + r2;
  return r1 + r2 + (s1 === s2 ? 's' : 'o');
}

function comboCards(label) {
  if (label.length === 2) return [label[0] + 'h', label[1] + 'd'];
  if (label[2] === 's') return [label[0] + 'h', label[1] + 'h'];
  return [label[0] + 'h', label[1] + 'd'];
}

function comboMeta(label) {
  var pair = label.length === 2;
  var suited = !pair && label[2] === 's';
  var r1 = ORDER.indexOf(label[0]);
  var r2 = ORDER.indexOf(label[1]);
  return {
    pair: pair,
    suited: suited,
    r1: r1,
    r2: r2,
    gap: Math.abs(r1 - r2),
    broadway: r1 <= 5 && r2 <= 5,
    ax: label[0] === 'A'
  };
}

function similarity(a, b) {
  var A = comboMeta(a);
  var B = comboMeta(b);
  var s = 0;
  if (A.pair === B.pair) s += 6;
  if (A.suited === B.suited) s += 4;
  if (A.broadway === B.broadway) s += 2;
  if (A.ax === B.ax) s += 2;
  s -= Math.abs(A.r1 - B.r1);
  s -= Math.abs(A.r2 - B.r2) * 0.5;
  s -= Math.abs(A.gap - B.gap) * 0.5;
  if (B.pair && B.r1 === 0 && !(A.pair && A.r1 <= 2)) s -= 10;
  if (B.pair && B.r1 <= 1 && A.pair && A.r1 >= 4) s -= 4;
  return s;
}

const COMBOS = [];
(function () {
  for (var i = 0; i < ORDER.length; i++) {
    for (var j = i; j < ORDER.length; j++) {
      if (i === j) COMBOS.push(ORDER[i] + ORDER[j]);
      else {
        COMBOS.push(ORDER[i] + ORDER[j] + 's');
        COMBOS.push(ORDER[i] + ORDER[j] + 'o');
      }
    }
  }
})();

function forceFromSpot(spot) {
  var force = {
    type: spot.type || 'RFI',
    heroPos: spot.heroPos,
    seed: spot.seed,
    forceDeal: Object.assign({}, spot.forceDeal)
  };
  if (spot.key) force.key = spot.key;
  if (spot.limperPos) force.limperPos = spot.limperPos;
  if (spot.openerPos) force.openerPos = spot.openerPos;
  if (spot.callerPos) force.callerPos = spot.callerPos;
  if (spot.facingBet || (spot.forceDeal && spot.forceDeal.facingBet)) {
    force.facingBet = true;
    force.forceDeal.facingBet = true;
  }
  if (spot.forceScript) force.forceScript = spot.forceScript;
  return force;
}

function cfgFromSpot(spot, lesson) {
  var route = lesson.route || 'cash';
  var hub = route === 'spin' ? 'spin' : (route === 'mtt' ? 'mtt' : 'cash');
  return Object.assign({
    scenario: 'rfi',
    practiceStreet: 'preflop',
    handRange: 'all',
    villainLevel: 'fish',
    formatHub: hub,
    gameType: hub === 'spin' ? 'spin3' : (hub === 'mtt' ? 'mtt' : 'cash6'),
    schoolDecisionEnd: !(lesson.decisionEnd === false),
    schoolMode: true
  }, spot.playConfig || {});
}

function grade(spot, lesson, actionId, heroCards) {
  var force = forceFromSpot(spot);
  force.forceDeal = Object.assign({}, force.forceDeal, { heroCards: heroCards });
  var cfg = cfgFromSpot(spot, lesson);
  try {
    var h = Engine.newHand(force, cfg);
    if (!(h.current && h.current.options || []).some(function (o) { return o.id === actionId; })) {
      return null;
    }
    return Engine.act(h, actionId).decision.class;
  } catch (e) {
    return null;
  }
}

function actionIdsForTaught(taught, legal) {
  var out = [];
  taught.forEach(function (t) {
    if (t === 'bet') {
      (legal || []).forEach(function (x) {
        if (x === 'bet' || /^bet_/.test(x) || x === 'overbet') out.push(x);
      });
    } else out.push(t);
  });
  return out;
}

function rewriteTeachBackCombo(tb, fromCombo, toCombo) {
  if (!tb || !fromCombo || !toCombo || fromCombo === toCombo) return tb;
  var re = new RegExp('\\b' + fromCombo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
  return tb.replace(re, toCombo);
}

function patchTeachBackForBet(tb) {
  var t = String(tb || '');
  if (/c-?bet|bet value|value\b|hoy bet/i.test(t) && /check/i.test(t)) {
    return t
      .replace(/GTO[^.]*(?:check|mezcla)[^.]*\./gi, '')
      .replace(/\bcheck mixto\b/gi, 'c-bet pequeño')
      .replace(/\bo check\b/gi, '')
      .replace(/\bcheck\.?/i, 'bet.');
  }
  if (/^[^:]*:\s*check/i.test(t) || /\bCheck\b/.test(t)) {
    return t.replace(/\bcheck\b/gi, 'c-bet pequeño');
  }
  return 'C-bet frecuente en este nodo. ' + t;
}

function findSourceFiles() {
  return [
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
    'js/school-data-viral-quizzes-phase234.js'
  ].map(function (r) { return path.join(root, r); });
}

function replaceHeroCardsInFile(filePath, spotId, oldCards, newCards) {
  var src = fs.readFileSync(filePath, 'utf8');
  if (src.indexOf("'" + spotId + "'") < 0 && src.indexOf('"' + spotId + '"') < 0) return false;
  var oldLit = "['" + oldCards[0] + "', '" + oldCards[1] + "']";
  var oldLit2 = '["' + oldCards[0] + '", "' + oldCards[1] + '"]';
  var newLit = "['" + newCards[0] + "', '" + newCards[1] + "']";
  var newLit2 = '["' + newCards[0] + '", "' + newCards[1] + '"]';
  // Prefer replacement near spot id: split by spot id occurrence
  var idToken = "'" + spotId + "'";
  var idx = src.indexOf(idToken);
  if (idx < 0) {
    idToken = '"' + spotId + '"';
    idx = src.indexOf(idToken);
  }
  if (idx < 0) return false;
  var windowEnd = Math.min(src.length, idx + 1200);
  var chunk = src.slice(idx, windowEnd);
  var replaced = chunk;
  if (chunk.indexOf(oldLit) >= 0) replaced = chunk.replace(oldLit, newLit);
  else if (chunk.indexOf(oldLit2) >= 0) replaced = chunk.replace(oldLit2, newLit2);
  else return false;
  if (replaced === chunk) return false;
  fs.writeFileSync(filePath, src.slice(0, idx) + replaced + src.slice(windowEnd));
  return true;
}

function replaceTeachBackInFile(filePath, spotId, oldTb, newTb) {
  var src = fs.readFileSync(filePath, 'utf8');
  if (src.indexOf(spotId) < 0) return false;
  if (src.indexOf(oldTb) < 0) {
    // try escaped less
    return false;
  }
  // Replace only first occurrence after spot id
  var idIdx = src.indexOf("'" + spotId + "'");
  if (idIdx < 0) idIdx = src.indexOf('"' + spotId + '"');
  if (idIdx < 0) return false;
  var after = src.indexOf(oldTb, idIdx);
  if (after < 0 || after > idIdx + 2500) return false;
  fs.writeFileSync(filePath, src.slice(0, after) + newTb + src.slice(after + oldTb.length));
  return true;
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const errors = report.errors.filter(function (e) { return e.code === 'teachBack_mismatch'; });
const files = findSourceFiles();
const log = [];

errors.forEach(function (e) {
  var lesson = Data.getLesson(e.lessonId);
  var spot = (lesson.spots || []).find(function (s) { return s.id === e.spotId; });
  if (!spot || !spot.forceDeal) {
    log.push({ id: e.lessonId + '/' + e.spotId, ok: false, reason: 'spot missing' });
    return;
  }
  var oldCards = (spot.forceDeal.heroCards || []).slice();
  var fromCombo = oldCards.length >= 2 ? cardsToCombo(oldCards[0], oldCards[1]) : '';
  var board = spot.forceDeal.board || [];
  var legal = Object.keys(e.grades || {});
  var taughtActs = actionIdsForTaught(e.taught || [], legal);
  var street = (spot.playConfig && spot.playConfig.practiceStreet) || 'preflop';

  if (street !== 'preflop' && board.length >= 3) {
    var newTb = patchTeachBackForBet(spot.teachBack);
    var patchedTb = false;
    files.forEach(function (f) {
      if (replaceTeachBackInFile(f, spot.id, spot.teachBack, newTb)) patchedTb = true;
    });
    log.push({
      id: e.lessonId + '/' + e.spotId,
      ok: patchedTb,
      strategy: 'teachBack-bet',
      teachBack: newTb.slice(0, 100)
    });
    return;
  }

  var ranked = COMBOS.slice().sort(function (a, b) {
    return similarity(fromCombo, b) - similarity(fromCombo, a);
  });

  var best = null;
  for (var i = 0; i < ranked.length; i++) {
    var combo = ranked[i];
    var cards = comboCards(combo);
    if (board.indexOf(cards[0]) >= 0 || board.indexOf(cards[1]) >= 0) continue;
    for (var j = 0; j < taughtActs.length; j++) {
      var cls = grade(spot, lesson, taughtActs[j], cards);
      if (cls && GOOD[cls]) {
        best = { combo: combo, cards: cards, action: taughtActs[j], cls: cls, sim: similarity(fromCombo, combo) };
        break;
      }
    }
    if (best && best.sim >= 4) break; // good enough family match
    if (best && i > 80) break; // accept first decent after scanning neighborhood
  }

  if (!best) {
    // Fallback: flip teachBack to engine-best action, keep cards
    var goodActs = legal.filter(function (a) { return GOOD[e.grades[a]]; });
    var primary = goodActs[0] || 'fold';
    var label = primary === 'allin' ? 'shove' : (primary === 'raise' ? 'open/raise' : primary);
    var tb2 = (fromCombo ? fromCombo + ': ' : '') + label +
      ' (alineado al motor actual). ' + String(spot.teachBack || '').replace(/^[^:]+:\s*/, '');
    var ok2 = false;
    files.forEach(function (f) {
      if (spot.teachBack && replaceTeachBackInFile(f, spot.id, spot.teachBack, tb2)) ok2 = true;
    });
    log.push({
      id: e.lessonId + '/' + e.spotId,
      ok: ok2,
      strategy: 'teachBack-fallback',
      action: primary,
      teachBack: tb2.slice(0, 120)
    });
    return;
  }

  var okCards = false;
  files.forEach(function (f) {
    if (replaceHeroCardsInFile(f, spot.id, oldCards, best.cards)) okCards = true;
  });
  var tbNew = rewriteTeachBackCombo(spot.teachBack, fromCombo, best.combo);
  var okTb = false;
  if (tbNew !== spot.teachBack) {
    files.forEach(function (f) {
      if (replaceTeachBackInFile(f, spot.id, spot.teachBack, tbNew)) okTb = true;
    });
  }
  log.push({
    id: e.lessonId + '/' + e.spotId,
    ok: okCards,
    strategy: 'cards',
    from: fromCombo,
    to: best.combo,
    cards: best.cards,
    action: best.action,
    cls: best.cls,
    sim: best.sim,
    teachBackUpdated: okTb
  });
});

fs.writeFileSync(
  path.join(root, 'tools/audit-out/school-fix-log.json'),
  JSON.stringify(log, null, 2)
);
var okN = log.filter(function (x) { return x.ok; }).length;
console.log('*** fix-school-audit-mismatches: ' + okN + '/' + log.length + ' patched ***');
log.filter(function (x) { return !x.ok; }).forEach(function (x) {
  console.log('FAIL', x.id, x.strategy, x.reason || '');
});
process.exit(okN === log.length ? 0 : 1);
