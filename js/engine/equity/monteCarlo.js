/*
 * monteCarlo.js — Equity vs rango con muestreo y caché (sin bloquear).
 */
(function (global) {
  'use strict';

  const C = global.Cards;
  const N = global.GTORangesNotation;
  const Cache = global.GTOCache;
  const W = global.GTORangesWeights;

  function concreteCombos(code, excluded) {
    const ex = new Set(excluded || []);
    const out = [];
    const suits = C.SUITS;
    if (code.length === 2) {
      const r = code[0];
      for (let i = 0; i < suits.length; i++)
        for (let j = i + 1; j < suits.length; j++) {
          const c1 = r + suits[i], c2 = r + suits[j];
          if (!ex.has(c1) && !ex.has(c2)) out.push([c1, c2]);
        }
    } else {
      const r1 = code[0], r2 = code[1], suited = code[2] === 's';
      if (suited) {
        for (const s of suits) {
          const c1 = r1 + s, c2 = r2 + s;
          if (!ex.has(c1) && !ex.has(c2)) out.push([c1, c2]);
        }
      } else {
        for (const s1 of suits) for (const s2 of suits) {
          if (s1 === s2) continue;
          const c1 = r1 + s1, c2 = r2 + s2;
          if (!ex.has(c1) && !ex.has(c2)) out.push([c1, c2]);
        }
      }
    }
    return out;
  }

  function sampleHandFromRange(rangeStr, excluded, rnd) {
    const r = rnd || C.rng.random;
    const codes = N.expand(rangeStr);
    const weighted = [];
    let total = 0;
    for (const code of codes) {
      const combos = concreteCombos(code, excluded);
      if (combos.length) { weighted.push({ combos }); total += combos.length; }
    }
    if (!weighted.length) return null;
    let pick = Math.floor(r() * total);
    for (const w of weighted) {
      if (pick < w.combos.length) return w.combos[pick];
      pick -= w.combos.length;
    }
    return weighted[0].combos[0];
  }

  function equityVsRange(heroCards, board, villainRangeStr, iters) {
    iters = iters || 400;
    const key = heroCards.join('') + '|' + board.join('') + '|' + (villainRangeStr || '').slice(0, 40) + '|' + iters;
    const cached = Cache.get('equity', key);
    if (cached !== undefined) return cached;

    let win = 0, tie = 0, n = 0;
    const dead = heroCards.concat(board);
    const mc = Math.random;
    for (let k = 0; k < iters; k++) {
      const vh = sampleHandFromRange(villainRangeStr, dead, mc);
      if (!vh) break;
      const used = dead.concat(vh);
      const deck = C.shuffledDeckExcluding(used, mc);
      const need = 5 - board.length;
      const runout = deck.slice(0, need);
      const full = board.concat(runout);
      const hScore = C.evaluate(heroCards.concat(full));
      const vScore = C.evaluate(vh.concat(full));
      const cmp = C.compare(hScore, vScore);
      if (cmp > 0) win++; else if (cmp === 0) tie++;
      n++;
    }
    const eq = n ? (win + tie / 2) / n : 0.5;
    Cache.set('equity', key, eq);
    return eq;
  }

  global.GTOEquity = { equityVsRange, sampleHandFromRange, concreteCombos, combosOf: W.combosOf };
})(window);
