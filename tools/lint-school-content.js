#!/usr/bin/env node
/**
 * Content quality gates for Escuela de Póker lesson data.
 * Run: node tools/lint-school-content.js
 * Also invoked from npm run test:school-content
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const SUITS = new Set('shdc');
const RANKS = new Set('AKQJT98765432');

function loadSchool() {
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

  const scripts = [
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
    'js/school-data-mttlab.js'
  ];
  scripts.forEach(function (rel) {
    const code = fs.readFileSync(path.join(root, rel), 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
  });
  return sandbox.PTSchoolData;
}

function isValidCard(c) {
  return typeof c === 'string' && c.length === 2 && RANKS.has(c[0]) && SUITS.has(c[1]);
}

function expectedComboLabel(c1, c2) {
  if (!isValidCard(c1) || !isValidCard(c2)) return null;
  var r1 = c1[0], s1 = c1[1], r2 = c2[0], s2 = c2[1];
  var order = 'AKQJT98765432';
  if (order.indexOf(r1) > order.indexOf(r2)) {
    var t = r1; r1 = r2; r2 = t;
    t = s1; s1 = s2; s2 = t;
  }
  if (r1 === r2) return r1 + r2;
  return r1 + r2 + (s1 === s2 ? 's' : 'o');
}

function walkCards(spot, out) {
  var fd = spot.forceDeal || {};
  (fd.heroCards || spot.heroCards || []).forEach(function (c) { out.push({ where: 'hero', card: c, spot: spot }); });
  (fd.villainCards || []).forEach(function (c) { out.push({ where: 'villain', card: c, spot: spot }); });
  (fd.board || spot.board || (spot.quiz && spot.quiz.board) || []).forEach(function (c) {
    out.push({ where: 'board', card: c, spot: spot });
  });
  var quiz = spot.quiz || spot.villainQuiz;
  if (quiz && Array.isArray(quiz.options)) {
    quiz.options.forEach(function (opt) {
      (opt.cards || []).forEach(function (c) {
        out.push({ where: 'opt:' + (opt.label || opt.id), card: c, spot: spot, label: opt.label });
      });
    });
  }
  if (quiz && Array.isArray(quiz.answerCards)) {
    quiz.answerCards.forEach(function (c) {
      out.push({ where: 'answer', card: c, spot: spot });
    });
  }
}

var D = loadSchool();
assert.ok(D && typeof D.getLessons === 'function', 'PTSchoolData loaded');

var lessons = D.getLessons();
var errors = [];
var warnings = [];

var sigCount = Object.create(null);
var MAX_SIG_CROSS = 4; // same hand|pos|board across lessons

lessons.forEach(function (lesson) {
  var spots = lesson.spots || [];
  spots.forEach(function (spot) {
    var sid = (lesson.id || '?') + '/' + (spot.id || '?');

    // Valid cards
    var cardRefs = [];
    walkCards(spot, cardRefs);
    cardRefs.forEach(function (ref) {
      if (!isValidCard(ref.card)) {
        errors.push(sid + ': invalid card "' + ref.card + '" (' + ref.where + ')');
      }
    });

    // Draft teachBack markers
    var tb = String(spot.teachBack || '');
    if (/\bwait\b/i.test(tb) || /…\s*wait/i.test(tb)) {
      errors.push(sid + ': draft marker in teachBack: ' + tb.slice(0, 80));
    }
    var qtb = spot.quiz && spot.quiz.teachBack;
    if (qtb && /\bwait\b/i.test(String(qtb))) {
      errors.push(sid + ': draft marker in quiz.teachBack');
    }

    // Par fuerte only for pocket pairs
    if (/Par fuerte/i.test(tb)) {
      var hc = (spot.forceDeal && spot.forceDeal.heroCards) || spot.heroCards || [];
      if (hc.length >= 2 && isValidCard(hc[0]) && isValidCard(hc[1]) && hc[0][0] !== hc[1][0]) {
        errors.push(sid + ': "Par fuerte" on non-pair ' + hc[0] + hc[1]);
      }
    }

    // heroPos !== villainPos on flop-ish spots
    var fd = spot.forceDeal || {};
    var board = fd.board || [];
    if (board.length >= 3 && spot.heroPos && fd.villainPos && spot.heroPos === fd.villainPos) {
      errors.push(sid + ': heroPos === villainPos (' + spot.heroPos + ') on board spot');
    }

    // suited/offsuit label ↔ cards
    var quiz = spot.quiz || spot.villainQuiz;
    if (quiz && Array.isArray(quiz.options)) {
      quiz.options.forEach(function (opt) {
        if (!opt.label || !opt.cards || opt.cards.length < 2) return;
        var exp = expectedComboLabel(opt.cards[0], opt.cards[1]);
        if (!exp) return;
        var lab = String(opt.label);
        if (/^[A-Z2-9TJQKA]{2}[so]?$/.test(lab) && lab !== exp) {
          errors.push(sid + ': label "' + lab + '" ≠ cards ' + opt.cards.join('') + ' (expect ' + exp + ')');
        }
      });
    }

    // Pot-odds consistency: need = call / (pot_after_bet + call) = bet/(pot+2*bet)
    if (spot.kind === 'oddsQuiz' && spot.quiz) {
      var pot = Number(spot.quiz.potBB != null ? spot.quiz.potBB : spot.quiz.pot);
      var bet = Number(spot.quiz.betBB != null ? spot.quiz.betBB : spot.quiz.bet);
      var req = spot.quiz.requiredPct;
      if (pot > 0 && bet > 0 && req != null) {
        var expectPct = Math.round(100 * bet / (pot + 2 * bet));
        if (Math.abs(Number(req) - expectPct) > 1) {
          errors.push(sid + ': requiredPct ' + req + ' ≠ bet/(pot+2*bet)≈' + expectPct);
        }
      }
    }

    // Signature clone tracking
    var hero = (fd.heroCards || []).slice().sort().join('');
    var brd = board.slice().join('-');
    if (hero && brd) {
      var sig = hero + '|' + (spot.heroPos || '') + '|' + brd;
      if (!sigCount[sig]) sigCount[sig] = [];
      sigCount[sig].push(lesson.id);
    }
  });
});

Object.keys(sigCount).forEach(function (sig) {
  var uniq = Array.from(new Set(sigCount[sig]));
  if (uniq.length > MAX_SIG_CROSS) {
    warnings.push('clone ' + sig + ' in ' + uniq.length + ' lessons: ' + uniq.slice(0, 8).join(',') + (uniq.length > 8 ? '…' : ''));
  }
});

// Pack alias smoke: S-05 vs S-09 and T-05 vs T-06 must not share identical spot id sets
function spotIds(lessonId) {
  var L = D.getLesson(lessonId);
  return (L && L.spots || []).map(function (s) { return s.id; }).sort().join(',');
}
var s05 = spotIds('S-05');
var s09 = spotIds('S-09');
if (s05 && s09 && s05 === s09) {
  errors.push('S-05 and S-09 share identical spot packs (alias regression)');
}
var t05 = spotIds('T-05');
var t06 = spotIds('T-06');
if (t05 && t06 && t05 === t06) {
  errors.push('T-05 and T-06 share identical spot packs (alias regression)');
}

// X-01 must not be a pure clone of D-01
var x01 = D.getLesson('X-01');
var d01 = D.getLesson('D-01');
if (x01 && d01 && x01.spots && d01.spots) {
  var xIds = x01.spots.map(function (s) { return s.id; });
  var dIds = new Set(d01.spots.map(function (s) { return s.id; }));
  var overlap = xIds.filter(function (id) { return dIds.has(id) || dIds.has(id.replace(/^x/, 'd')); });
  // After remap, ids may be x01-* unique — compare teachBacks/prompts
  var dPrompts = new Set((d01.spots || []).map(function (s) {
    return (s.quiz && s.quiz.prompt) || s.teachBack || '';
  }));
  var samePrompt = (x01.spots || []).filter(function (s) {
    var p = (s.quiz && s.quiz.prompt) || s.teachBack || '';
    return p && dPrompts.has(p);
  }).length;
  if (samePrompt >= 10) {
    errors.push('X-01 still clones ≥10 D-01 prompts (' + samePrompt + ')');
  }
}

if (warnings.length) {
  console.warn('lint-school-content warnings (' + warnings.length + '):');
  warnings.slice(0, 20).forEach(function (w) { console.warn('  ⚠ ' + w); });
  if (warnings.length > 20) console.warn('  … +' + (warnings.length - 20) + ' more');
}

if (errors.length) {
  console.error('lint-school-content FAILED (' + errors.length + ' errors):');
  errors.forEach(function (e) { console.error('  ✗ ' + e); });
  process.exit(1);
}

console.log('*** lint-school-content OK (' + lessons.length + ' lessons, ' +
  lessons.reduce(function (n, l) { return n + (l.spots || []).length; }, 0) + ' spots) ***');
