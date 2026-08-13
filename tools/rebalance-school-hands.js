#!/usr/bin/env node
'use strict';
/**
 * Reequilibra manos del héroe en spots de Escuela.
 * Ejecutar desde la raíz: node tools/rebalance-school-hands.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const FILES = [
  'js/school-data.js',
  'js/school-data-m1.js',
  'js/school-data-m2.js',
  'js/school-data-spin.js',
  'js/school-data-mtt.js',
  'js/school-data-ranges.js',
  'js/school-data-pro.js',
  'js/school-extra-spots.js',
  'js/school-data-practice.js'
];

function loadData() {
  const s = { window: {}, console, Math, Date, Set, Map, JSON, Object, Array };
  s.global = s; s.window = s;
  vm.createContext(s);
  FILES.forEach((f) => {
    vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), s, { filename: f });
  });
  return s.PTSchoolData;
}

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

function rotator(arr) {
  let i = 0;
  return function next() {
    const x = arr[i % arr.length];
    i += 1;
    return { c: x.c.slice(), n: x.n };
  };
}

function H(a, b, n) { return { c: [a, b], n: n }; }

const trash = rotator([
  H('8c', '2h', '82o'), H('9d', '3c', '93o'), H('Jh', '2d', 'J2o'),
  H('Td', '3s', 'T3o'), H('Qc', '2h', 'Q2o'), H('6h', '2c', '62o'),
  H('5d', '3c', '53o'), H('4s', '2d', '42o'), H('7d', '3c', '73o'),
  H('8h', '3d', '83o'), H('9c', '2s', '92o'), H('Js', '4d', 'J4o'),
  H('Th', '2c', 'T2o'), H('6d', '4c', '64o'), H('5h', '2s', '52o'),
  H('7s', '4d', '74o'), H('8d', '4h', '84o'), H('9h', '4c', '94o'),
  H('Jd', '3h', 'J3o'), H('Tc', '4d', 'T4o'), H('6s', '3h', '63o'),
  H('5c', '4d', '54o'), H('Qh', '3d', 'Q3o'), H('Kh', '2c', 'K2o')
]);

const utgFold = rotator([
  H('Kh', 'Jd', 'KJo'), H('Qd', 'Tc', 'QTo'), H('As', '9d', 'A9o'),
  H('Jh', 'Td', 'JTo'), H('Kc', 'Th', 'KTo'), H('Qs', 'Jh', 'QJo'),
  H('Ad', '8c', 'A8o'), H('Kd', '9h', 'K9o'), H('Qh', '9c', 'Q9o')
]);

const vsEarlyFold = rotator([
  H('Kh', 'Js', 'KJo'), H('Ah', 'Jd', 'AJo'), H('Qd', 'Th', 'QTo'),
  H('Kc', 'Td', 'KTo'), H('As', '9c', 'A9o'), H('Jh', 'Ts', 'JTo'),
  H('Qh', 'Jd', 'QJo'), H('Ad', 'Tc', 'ATo')
]);
const vsBtnFold = rotator([
  H('8d', '3c', '83o'), H('Jh', '7d', 'J7o'), H('Ts', '6c', 'T6o'),
  H('9h', '6d', '96o'), H('Qd', '7c', 'Q7o'), H('Kc', '6h', 'K6o'),
  H('8s', '5d', '85o'), H('Jd', '6h', 'J6o'), H('Th', '7c', 'T7o'),
  H('9c', '5h', '95o'), H('Qh', '6d', 'Q6o'), H('7d', '5c', '75o')
]);

const vsShoveFold = rotator([
  H('Qd', '8c', 'Q8o'), H('Jh', '7s', 'J7o'), H('Td', '6h', 'T6o'),
  H('9c', '6d', '96o'), H('8h', '5c', '85o'), H('Kd', '6s', 'K6o'),
  H('Qs', '7h', 'Q7o'), H('Jc', '8d', 'J8o'), H('Th', '5c', 'T5o'),
  H('9h', '7d', '97o'), H('8d', '6c', '86o'), H('Kh', '7c', 'K7o')
]);

const borderlineVsShove = rotator([
  H('Qh', '9d', 'Q9o'), H('Js', '9c', 'J9o'), H('Kc', '8d', 'K8o'),
  H('Td', '8h', 'T8o'), H('8s', '7d', '87o'),   H('Qd', 'Tc', 'QTo'),
  H('Jh', 'Td', 'JTo')
]);

const premiums = rotator([
  H('Jh', 'Jd', 'JJ'), H('Ts', 'Tc', 'TT'), H('Kd', 'Kh', 'KK'),
  H('Ac', 'Qc', 'AQs'), H('Ah', 'Jh', 'AJs'), H('Ks', 'Qs', 'KQs'),
  H('Qs', 'Qh', 'QQ'), H('As', 'Kd', 'AKo'), H('Ad', 'Kd', 'AKs'),
  H('Td', 'Th', 'TT'), H('Jc', 'Js', 'JJ'), H('Ah', 'Qd', 'AQo')
]);

const fourBetValue = rotator([
  H('Kd', 'Kh', 'KK'), H('Qs', 'Qd', 'QQ'), H('Jh', 'Jc', 'JJ'),
  H('As', 'Ah', 'AA'), H('Ad', 'Kd', 'AKs'), H('Ts', 'Td', 'TT'),
  H('Kc', 'Ks', 'KK'), H('Ah', 'Kd', 'AKo')
]);

const midPairs = rotator([
  H('8s', '8c', '88'), H('7h', '7d', '77'), H('Ts', 'Th', 'TT'),
  H('Jh', 'Jc', 'JJ'), H('6s', '6c', '66'), H('9d', '9c', '99'),
  H('8h', '8d', '88'), H('7s', '7c', '77'), H('Td', 'Tc', 'TT')
]);

const k9Fold = rotator([
  H('Kh', '8d', 'K8o'), H('Qd', '9c', 'Q9o'), H('Js', '9h', 'J9o'),
  H('Td', '9c', 'T9o'), H('Qc', 'Th', 'QTo'), H('Ks', '7d', 'K7o'),
  H('Qh', '8c', 'Q8o'), H('Jd', '8h', 'J8o')
]);

const k9Steal = rotator([
  H('Kh', 'Jd', 'KJo'), H('Qd', 'Tc', 'QTo'), H('As', '9h', 'A9o'),
  H('Kc', 'Ts', 'KTo'), H('Qs', 'Jh', 'QJo'), H('Jh', 'Td', 'JTo'),
  H('Ah', '8h', 'A8s'), H('Kd', 'Jd', 'KJs')
]);

const a5sPool = rotator([
  H('Ah', '4h', 'A4s'), H('As', '3s', 'A3s'), H('Ad', '8d', 'A8s'),
  H('Ac', '9c', 'A9s'), H('Ah', '2h', 'A2s'), H('7s', '6s', '76s'),
  H('Ts', '9s', 'T9s'), H('Ad', '7d', 'A7s'), H('As', '6s', 'A6s')
]);

const scPool = rotator([
  H('7h', '6h', '76s'), H('6d', '5d', '65s'), H('9s', '8s', '98s'),
  H('Th', '9h', 'T9s'), H('Jh', '9h', 'J9s'), H('5c', '4c', '54s'),
  H('8d', '6d', '86s'), H('9c', '7c', '97s'), H('Td', '8d', 'T8s')
]);

const q8Pool = rotator([
  H('Qd', '7c', 'Q7o'), H('Jh', '8d', 'J8o'), H('Ts', '7c', 'T7o'),
  H('9h', '7d', '97o'), H('Kc', '8h', 'K8o'), H('9s', '6c', '96o'),
  H('Jd', '7h', 'J7o'), H('Qh', '6s', 'Q6o')
]);

const t8Pool = rotator([
  H('Th', '7c', 'T7o'), H('9d', '7h', '97o'), H('8s', '6c', '86o'),
  H('Jh', '7d', 'J7o'), H('9c', '5h', '95o'), H('Td', '6s', 'T6o'),
  H('8h', '5d', '85o'), H('Qc', '7h', 'Q7o')
]);

const aaPool = rotator([
  H('Kd', 'Kh', 'KK'), H('Ad', 'Kd', 'AKs'), H('Jh', 'Jd', 'JJ'),
  H('As', 'Ah', 'AA'), H('Qs', 'Qd', 'QQ'), H('Ts', 'Tc', 'TT')
]);

function isFoldTeach(tb) {
  const t = String(tb || '');
  if (/fold equity/i.test(t) && !/\bfold[.:—,]|\bfold frecuente|\bes fold|\b: fold|\bfold típico|\bfold siempre|\bfold —/i.test(t)) {
    return false;
  }
  return /\bfold\b/i.test(t) && !/\bno\s+fold|\bsin fold|\bno te fold/i.test(t);
}

function isFourBet(tb) {
  return /4-bet|4bet/i.test(String(tb || ''));
}

function isStealOpen(tb, spot) {
  const t = String(tb || '').toLowerCase();
  const sc = (spot.playConfig && spot.playConfig.scenario) || '';
  return sc === 'steal' || sc === 'rfi' || /\bopen\b|\bsteal\b|\bshove\b/.test(t);
}

function isPushFold(spot) {
  const p = spot.playConfig || {};
  return p.scenario === 'push' || p.mttPhase === 'push' || p.stackDepth === 'bb10' || p.stackDepth === 'bb11' || p.stackDepth === 'bb12';
}

function vsKey(spot) {
  return String(spot.key || '');
}

function isPostflop(spot) {
  const board = (spot.forceDeal && spot.forceDeal.board) || [];
  if (board.length) return true;
  const st = spot.playConfig && spot.playConfig.practiceStreet;
  return st && st !== 'preflop' && st !== 'random';
}

function pick(spot) {
  if (isPostflop(spot)) return null;
  const cards = (spot.forceDeal && spot.forceDeal.heroCards) || [];
  const code = handCode(cards);
  const tb = spot.teachBack || '';
  const pos = spot.heroPos || '';
  const key = vsKey(spot);
  const fold = isFoldTeach(tb) || spot.trapTag === 'dominated' || spot.trapTag === 'fancy_play';

  if (code === '72o' || code === '52o') {
    if (spot.type === 'RFI' && (pos === 'UTG' || pos === 'HJ' || pos === 'UTG1')) return utgFold();
    if (spot.type === 'vsRFI' && /vs_UTG|vs_HJ|vs_UTG1/.test(key)) return vsEarlyFold();
    if (spot.type === 'vsRFI' && isPushFold(spot)) {
      return (spot.id.charCodeAt(spot.id.length - 1) % 3 === 0) ? borderlineVsShove() : vsShoveFold();
    }
    if (spot.type === 'vsRFI') return vsBtnFold();
    if (spot.type === 'face3bet' || spot.type === 'squeeze') return trash();
    if (isPushFold(spot) && fold) return vsShoveFold();
    if (spot.type === 'RFI' && (pos === 'BTN' || pos === 'CO' || pos === 'SB')) return trash();
    return trash();
  }

  if (code === 'AKo' || code === 'AKs') {
    if (fold) return k9Fold();
    if (isFourBet(tb)) return fourBetValue();
    return premiums();
  }

  if (code === 'QQ') {
    if (fold) return midPairs();
    if (isFourBet(tb)) return fourBetValue();
    return premiums();
  }

  if (code === '99') return midPairs();

  if (code === 'K9o') {
    if (fold) return k9Fold();
    if (isStealOpen(tb, spot)) return k9Steal();
    return k9Fold();
  }

  if (code === 'A5s' || code === 'A5o') return a5sPool();
  if (code === '87s') return scPool();
  if (code === 'Q8o') return fold ? q8Pool() : k9Steal();
  if (code === 'T8o') return t8Pool();
  if (code === 'AA') {
    if (fold) return trash();
    return aaPool();
  }
  if (code === 'KK' && !fold) return fourBetValue();

  return null;
}

function fixATo(h) {
  if (h.n === 'ATo' && h.c[1] === 'To') h.c[1] = 'Tc';
  if (h.n === 'JTo' && h.c[1] === 'To') h.c[1] = 'Td';
  return h;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patchLeadHand(tb, code) {
  const lead = /^[AKQJT2-9]{2}[so]\b|^([AKQJT2-9])\1\b/;
  if (lead.test(tb)) return tb.replace(lead, code);
  return tb;
}

function main() {
  const Data = loadData();
  const map = Object.create(null);
  Data.getLessons().forEach((lesson) => {
    (lesson.spots || []).forEach((spot) => {
      let next = pick(spot);
      if (!next) return;
      next = fixATo(next);
      const old = handCode(spot.forceDeal.heroCards);
      if (next.n === old) return;
      map[spot.id] = { old: old, cards: next.c, code: next.n };
    });
  });

  const cardRe = /\[['\"][AKQJT2-9][shdc]['\"],\s*['\"][AKQJT2-9][shdc]['\"]\]/;
  const ids = Object.keys(map);

  FILES.forEach((rel) => {
    const fp = path.join(root, rel);
    let src = fs.readFileSync(fp, 'utf8');
    ids.forEach((id) => {
      const m = map[id];
      const idRe = new RegExp("['\"]" + escapeRe(id) + "['\"]");
      const found = idRe.exec(src);
      if (!found) return;
      const start = found.index;
      const neu = "['" + m.cards[0] + "', '" + m.cards[1] + "']";

      const cardWindow = src.slice(start, start + 95);
      const cm = cardRe.exec(cardWindow);
      if (cm) {
        const abs = start + cm.index;
        src = src.slice(0, abs) + neu + src.slice(abs + cm[0].length);
      }

      const found2 = new RegExp("['\"]" + escapeRe(id) + "['\"]").exec(src);
      if (!found2) return;
      const s2 = found2.index;
      const win = src.slice(s2, s2 + 750);
      let relTb = -1;
      const objTb = /teachBack:\s*'/.exec(win);
      if (objTb) {
        relTb = objTb.index + objTb[0].length;
      } else {
        const compact = /,\s*\d{4,6},\s*'/.exec(win);
        if (compact) relTb = compact.index + compact[0].length;
      }
      if (relTb < 0) return;
      const tbStart = s2 + relTb;
      const tbEnd = src.indexOf("'", tbStart);
      if (tbEnd < 0 || tbEnd - tbStart > 600) return;
      let tb = src.slice(tbStart, tbEnd);
      tb = tb.replace(new RegExp('\\b' + escapeRe(m.old) + '\\b'), m.code);
      tb = patchLeadHand(tb, m.code);
      src = src.slice(0, tbStart) + tb + src.slice(tbEnd);
    });
    fs.writeFileSync(fp, src);
  });

  console.log('patched spots', ids.length);
}

main();
