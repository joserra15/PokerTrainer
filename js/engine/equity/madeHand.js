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
    let oesd = false;
    let gutshot = false;
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
    return { oesd: oesd, gutshot: gutshot };
  }

  function classifyMadeHand(holeCards, board) {
    const ev = C.evaluate(holeCards.concat(board));
    const boardVals = board.map((c) => C.RANK_VALUE[c[0]]).sort((a, b) => b - a);
    const holeVals = holeCards.map((c) => C.RANK_VALUE[c[0]]);
    const topBoard = boardVals[0] || 0;

    const suitCount = {};
    holeCards.concat(board).forEach((c) => { suitCount[c[1]] = (suitCount[c[1]] || 0) + 1; });
    let flushDraw = false;
    let flush = false;
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
      ev: ev,
      tier: tier,
      flush: flush,
      flushDraw: flushDraw,
      oesd: straightStuff.oesd,
      gutshot: straightStuff.gutshot,
      hasDraw: flushDraw || straightStuff.oesd || straightStuff.gutshot,
      isNutFlush: flush && (function () {
        const Eq = global.GTOEquity;
        if (!Eq || !Eq.heroNonNutFlushContext) return flush;
        const ctx = Eq.heroNonNutFlushContext(holeCards, board);
        return ctx ? ctx.isNut : false;
      })()
    };
  }

  function rankCmp(a, b) {
    if (!a || !b) return 0;
    const ra = a.rank || [];
    const rb = b.rank || [];
    const n = Math.max(ra.length, rb.length);
    for (let i = 0; i < n; i++) {
      const x = ra[i] || 0;
      const y = rb[i] || 0;
      if (x !== y) return x - y;
    }
    return 0;
  }

  /**
   * Fuerza 0..1 relativa al board: playing-the-board / solo kicker ≈ air.
   * street: 'flop'|'turn'|'river' (draws aportan en flop/turn).
   */
  function relativeStrength01(holeCards, board, street) {
    if (!holeCards || holeCards.length < 2) return 0.08;
    const holeStr = (function () {
      const ranks = '23456789TJQKA';
      const a = Math.max(0, ranks.indexOf(String(holeCards[0])[0]));
      const b = Math.max(0, ranks.indexOf(String(holeCards[1])[0]));
      const pair = String(holeCards[0])[0] === String(holeCards[1])[0];
      const suited = String(holeCards[0])[1] === String(holeCards[1])[1];
      return Math.max(0.05, Math.min(0.95,
        (Math.max(a, b) / 12) * 0.55 + (Math.min(a, b) / 12) * 0.2 +
        (pair ? 0.25 : 0) + (suited ? 0.08 : 0)));
    })();

    if (!board || board.length < 3 || !C || !C.evaluate) return holeStr;

    const full = C.evaluate(holeCards.concat(board));
    const boardOnly = C.evaluate(board.slice());
    const cat = full && full.category != null ? Number(full.category) : 0;
    const bcat = boardOnly && boardOnly.category != null ? Number(boardOnly.category) : -1;
    const made = classifyMadeHand(holeCards, board);
    const highHole = Math.max(
      C.RANK_VALUE[String(holeCards[0])[0]] || 0,
      C.RANK_VALUE[String(holeCards[1])[0]] || 0
    );

    const sameCat = cat === bcat;
    const primaryImproved = sameCat && (
      (full.rank[1] || 0) > (boardOnly.rank[1] || 0) ||
      (cat >= 2 && (full.rank[1] || 0) === (boardOnly.rank[1] || 0) &&
        (full.rank[2] || 0) > (boardOnly.rank[2] || 0))
    );
    const kickerOnly = sameCat && !primaryImproved && cat <= 3;

    let score;
    if (cat > bcat) {
      score = 0.34 + (cat / 8) * 0.58;
      if (cat === 1) {
        const pairVal = full.rank[1] || 0;
        const topBoard = Math.max.apply(null, board.map((c) => C.RANK_VALUE[String(c)[0]] || 0));
        if (pairVal >= topBoard) score = kickerStrength(holeCards, pairVal) ? 0.72 : 0.58;
        else if (pairVal >= topBoard - 2) score = 0.48;
        else score = 0.38;
        if (String(holeCards[0])[0] === String(holeCards[1])[0] && pairVal > topBoard) {
          score = Math.max(score, 0.78);
        }
      } else if (cat === 2) {
        score = Math.max(0.62, score);
      }
    } else if (kickerOnly) {
      if (cat <= 0) score = 0.10 + (highHole / 14) * 0.18;
      else if (cat === 1) score = 0.14 + (highHole / 14) * 0.16;
      else score = 0.16 + (highHole / 14) * 0.14;
    } else if (sameCat && primaryImproved) {
      score = 0.42 + (cat / 8) * 0.45 + (highHole / 14) * 0.08;
    } else {
      score = 0.16 + (cat / 8) * 0.72;
      if (cat <= 0) score = Math.max(score, 0.12 + holeStr * 0.28);
    }

    if (street !== 'river' && made) {
      if (made.flushDraw && made.oesd) score = Math.max(score, 0.52);
      else if (made.flushDraw) score = Math.max(score, 0.44);
      else if (made.oesd) score = Math.max(score, 0.40);
      else if (made.gutshot) score = Math.max(score, Math.min(0.36, score + 0.06));
    }

    return Math.max(0.06, Math.min(0.98, score));
  }

  global.GTOEquityMadeHand = {
    classifyMadeHand: classifyMadeHand,
    straightDraws: straightDraws,
    kickerStrength: kickerStrength,
    relativeStrength01: relativeStrength01,
    rankCmp: rankCmp
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
