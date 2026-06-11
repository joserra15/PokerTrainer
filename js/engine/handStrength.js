/*
 * handStrength.js — Ranking heurístico preflop 0..1.
 */
(function (global) {
  'use strict';

  const N = global.GTORangesNotation;

  const HAND_RANK = (function () {
    const all = [];
    for (let i = 0; i < N.ORDER.length; i++) {
      for (let j = 0; j < N.ORDER.length; j++) {
        const hi = N.ORDER[Math.max(i, j)], lo = N.ORDER[Math.min(i, j)];
        if (i === j) all.push(hi + lo);
        else { all.push(hi + lo + 's'); all.push(hi + lo + 'o'); }
      }
    }
    const uniq = Array.from(new Set(all));
    const score = (code) => {
      const v = (ch) => N.VAL[ch] + 2;
      if (code.length === 2) return 50 + v(code[0]) * 6;
      const a = v(code[0]), b = v(code[1]);
      const suited = code[2] === 's';
      const gap = a - b;
      let s = a * 4 + b * 2;
      if (suited) s += 5;
      if (gap === 1) s += 4; else if (gap === 2) s += 2; else if (gap === 3) s += 1; else s -= gap;
      return s;
    };
    uniq.sort((x, y) => score(x) - score(y));
    const rank = {};
    uniq.forEach((code, idx) => { rank[code] = idx / (uniq.length - 1); });
    return rank;
  })();

  function handStrength01(code) {
    return HAND_RANK[code] != null ? HAND_RANK[code] : 0.3;
  }

  global.GTOHandStrength = { HAND_RANK, handStrength01 };
})(window);
