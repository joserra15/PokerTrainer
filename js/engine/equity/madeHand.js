/*
 * madeHand.js — Clasificación de mano hecha y draws postflop.
 */
(function (global) {
  'use strict';

  const C = global.Cards;

  function kickerStrength(holeCards, pairVal) {
    const others = holeCards.map((c) => C.RANK_VALUE[c[0]]).filter((v) => v !== pairVal);
    return others.some((v) => v >= 12);
  }

  function straightDraws(cards) {
    const vals = new Set(cards.map((c) => C.RANK_VALUE[c[0]]));
    if (vals.has(14)) vals.add(1);
    let oesd = false, gutshot = false;
    for (let lo = 2; lo <= 11; lo++) {
      const seq = [lo, lo + 1, lo + 2, lo + 3];
      if (seq.every((v) => vals.has(v)) && lo - 1 >= 1 && lo + 4 <= 14) oesd = true;
    }
    if (!oesd) {
      for (let lo = 1; lo <= 11; lo++) {
        const window = [lo, lo + 1, lo + 2, lo + 3, lo + 4];
        if (window.filter((v) => vals.has(v)).length === 4) gutshot = true;
      }
    }
    return { oesd, gutshot };
  }

  function classifyMadeHand(holeCards, board) {
    const ev = C.evaluate(holeCards.concat(board));
    const boardVals = board.map((c) => C.RANK_VALUE[c[0]]).sort((a, b) => b - a);
    const holeVals = holeCards.map((c) => C.RANK_VALUE[c[0]]);
    const topBoard = boardVals[0] || 0;

    const suitCount = {};
    holeCards.concat(board).forEach((c) => { suitCount[c[1]] = (suitCount[c[1]] || 0) + 1; });
    let flushDraw = false, flush = false;
    for (const s in suitCount) {
      if (suitCount[s] >= 5) flush = true;
      else if (suitCount[s] === 4) flushDraw = true;
    }
    const straightStuff = straightDraws(holeCards.concat(board));

    let tier;
    if (ev.category >= 3) tier = 'strong';
    else if (ev.category === 2) tier = 'strong';
    else if (ev.category === 1) {
      const pairVal = ev.rank[1];
      if (holeVals[0] === holeVals[1] && holeVals[0] > topBoard) tier = 'strong';
      else if (pairVal >= topBoard) tier = kickerStrength(holeCards, pairVal) ? 'strong' : 'medium';
      else tier = 'medium';
    } else {
      tier = (flushDraw || straightStuff.oesd) ? 'weak' : 'air';
    }

    return {
      ev, tier, flush, flushDraw,
      oesd: straightStuff.oesd, gutshot: straightStuff.gutshot,
      hasDraw: flushDraw || straightStuff.oesd || straightStuff.gutshot,
      isNutFlush: flush && (function () {
        const Eq = global.GTOEquity;
        if (!Eq || !Eq.heroNonNutFlushContext) return flush;
        const ctx = Eq.heroNonNutFlushContext(holeCards, board);
        return ctx ? ctx.isNut : false;
      })()
    };
  }

  global.GTOEquityMadeHand = { classifyMadeHand, straightDraws, kickerStrength };
})(window);
