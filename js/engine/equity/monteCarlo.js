/*
 * monteCarlo.js — Equity vs rango con muestreo, caché y conciencia de calle.
 *
 * En turn solo se reparte 1 carta (46 desconocidas); en flop 2 cartas.
 * En river (board completo) usa enumeración exacta de combos.
 * Amplía el rango del villano en boards de color cuando el héroe no tiene las nuts.
 */
(function (global) {
  'use strict';

  const C = global.Cards;
  const N = global.GTORangesNotation;
  const Cache = global.GTOCache;
  const W = global.GTORangesWeights;

  function streetFromBoard(board) {
    const n = (board || []).length;
    if (n >= 5) return 'river';
    if (n === 4) return 'turn';
    if (n === 3) return 'flop';
    return 'preflop';
  }

  function cardsToRun(street, board) {
    const n = (board || []).length;
    const need = Math.max(0, 5 - n);
    return { need, street: street || streetFromBoard(board), unknownDeck: 52 - n - 2 };
  }

  function boardSuitCounts(board) {
    const counts = { s: 0, h: 0, d: 0, c: 0 };
    (board || []).forEach((c) => { counts[c[1]] = (counts[c[1]] || 0) + 1; });
    return counts;
  }

  /** ¿El héroe tiene color hecho y le falta el As del palo dominante? */
  function heroNonNutFlushContext(heroCards, board) {
    if (!board || board.length < 3) return null;
    const heroScore = C.evaluate(heroCards.concat(board));
    if (heroScore.category !== 5) return null;

    const suitCounts = boardSuitCounts(board);
    let flushSuit = null;
    for (const s of C.SUITS) {
      if (suitCounts[s] >= 3) flushSuit = s;
    }
    if (!flushSuit) return null;

    const heroHasAce = heroCards.some((c) => c[0] === 'A' && c[1] === flushSuit);
    const heroFlushHigh = heroScore.rank[1];
    return { flushSuit, heroHasAce, heroFlushHigh, isNut: heroHasAce && heroFlushHigh >= 14 };
  }

  /**
   * Incluye combos del villano que pueden superar un color no-nut del héroe.
   * Crítico cuando el board bloquea KQ del palo pero el villano puede tener Ax del palo.
   */
  function isFlushBoard(board) {
    const counts = boardSuitCounts(board);
    return C.SUITS.some((s) => counts[s] >= 3);
  }

  /** Ante apuesta en board de color: estrechar solo si el héroe ya tiene color hecho. */
  function filterCombosFacingBet(combos, board, facingBet, heroCards) {
    if (!facingBet || !isFlushBoard(board) || !combos.length) return combos;
    if (!heroCards || heroCards.length < 2) return combos;
    if (C.evaluate(heroCards.concat(board)).category !== 5) return combos;
    const made = combos.filter((vh) => C.evaluate(vh.concat(board)).category >= 5);
    return made.length ? made : combos;
  }

  /**
   * River shove/overbet: estrechar rango solo si el héroe tiene color vulnerable
   * en mesa doblada (full houses del villano). No filtrar «solo combos que ganan»
   * con manos fuertes hechas (trío+): eso forzaba equity 0 % erróneamente.
   */
  function filterCombosFacingShove(combos, heroCards, board, opts) {
    if (!opts || (!opts.riverShove && !opts.shoveNode)) return combos;
    if (!combos.length || !heroCards || !board || board.length < 5) return combos;

    const RS = global.GTORiverShoveNode;
    if (!RS) return combos;

    const deval = RS.pairedBoardFlushDevaluation(heroCards, board);
    if (!deval.vulnerable) return combos;

    const heroScore = C.evaluate(heroCards.concat(board));
    const ctx = heroNonNutFlushContext(heroCards, board);
    const beating = combos.filter((vh) => C.compare(C.evaluate(vh.concat(board)), heroScore) > 0);
    if (beating.length >= 1 && !(ctx && ctx.isNut)) return beating;

    const strong = combos.filter((vh) => C.evaluate(vh.concat(board)).category >= 6);
    if (ctx && ctx.isNut && strong.length) return strong;

    return strong.length ? strong : combos.filter((vh) => C.evaluate(vh.concat(board)).category >= 5);
  }

  function augmentVillainRange(heroCards, board, rangeStr) {
    const ctx = heroNonNutFlushContext(heroCards, board);
    if (!ctx || ctx.isNut) return rangeStr || '';
    const parts = [rangeStr || ''];
    if (!ctx.heroHasAce) parts.push('A2s-AKs');
    if (ctx.heroFlushHigh < 13) parts.push('KTs, KJs');
    if (ctx.heroFlushHigh < 12) parts.push('QJs, QTs');
    if (ctx.heroFlushHigh < 11) parts.push('JTs');
    return parts.filter(Boolean).join(', ');
  }

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

  function allVillainCombos(rangeStr, excluded) {
    const combos = [];
    const seen = new Set();
    N.expand(rangeStr || '').forEach((code) => {
      concreteCombos(code, excluded).forEach((vh) => {
        const key = vh.join('');
        if (!seen.has(key)) { seen.add(key); combos.push(vh); }
      });
    });
    return combos;
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

  function equityExact(heroCards, boardArr, rangeStr, opts) {
    opts = opts || {};
    const dead = heroCards.concat(boardArr);
    const heroScore = C.evaluate(dead);
    let combos = allVillainCombos(rangeStr, dead);
    combos = filterCombosFacingShove(combos, heroCards, boardArr, opts);
    combos = filterCombosFacingBet(combos, boardArr, opts.facingBet && !opts.riverShove, heroCards);
    if (!combos.length) return 0.5;

    let win = 0, tie = 0;
    for (const vh of combos) {
      const vScore = C.evaluate(vh.concat(boardArr));
      const cmp = C.compare(heroScore, vScore);
      if (cmp > 0) win++;
      else if (cmp === 0) tie++;
    }
    return (win + tie / 2) / combos.length;
  }

  /** Enumeración exacta con runout restante (turn/flop) para rangos filtrados pequeños. */
  function equityExactRunout(heroCards, boardArr, villainCombos, cardsNeeded) {
    if (!cardsNeeded || !villainCombos.length) return 0.5;
    let win = 0, tie = 0, n = 0;
    for (const vh of villainCombos) {
      const used = new Set(heroCards.concat(boardArr, vh));
      const deck = C.fullDeck().filter((c) => !used.has(c));
      if (cardsNeeded === 1) {
        for (const river of deck) {
          const full = boardArr.concat([river]);
          const cmp = C.compare(
            C.evaluate(heroCards.concat(full)),
            C.evaluate(vh.concat(full))
          );
          if (cmp > 0) win++;
          else if (cmp === 0) tie++;
          n++;
        }
      } else if (cardsNeeded === 2) {
        for (let i = 0; i < deck.length; i++) {
          for (let j = i + 1; j < deck.length; j++) {
            const full = boardArr.concat([deck[i], deck[j]]);
            const cmp = C.compare(
              C.evaluate(heroCards.concat(full)),
              C.evaluate(vh.concat(full))
            );
            if (cmp > 0) win++;
            else if (cmp === 0) tie++;
            n++;
          }
        }
      }
    }
    return n ? (win + tie / 2) / n : 0.5;
  }

  /**
   * Equity Monte Carlo (flop/turn) o exacta (river) vs rango del villano.
   */
  function equityVsRange(heroCards, board, villainRangeStr, iters, opts) {
    opts = opts || {};
    iters = iters || 500;
    const boardArr = board || [];
    const street = opts.street || streetFromBoard(boardArr);
    const run = cardsToRun(street, boardArr);
    const rangeStr = augmentVillainRange(heroCards, boardArr, villainRangeStr);

    const key = [
      heroCards.join(''), boardArr.join(''), street, run.need,
      opts.facingBet ? 'fb' : '',
      opts.riverShove ? 'sh' : '',
      opts.shoveNode ? 'sn' : '',
      (rangeStr || '').slice(0, 120), iters
    ].join('|');
    const cached = Cache.get('equity', key);
    if (cached !== undefined) return cached;

    const dead = heroCards.concat(boardArr);
    let combos = allVillainCombos(rangeStr, dead);
    combos = filterCombosFacingShove(combos, heroCards, boardArr, opts);
    const filtered = filterCombosFacingBet(combos, boardArr, opts.facingBet && !opts.riverShove, heroCards);

    if (run.need === 0) {
      const eq = equityExact(heroCards, boardArr, rangeStr, opts);
      Cache.set('equity', key, eq);
      return eq;
    }

    if (opts.facingBet && filtered.length && filtered.length < combos.length) {
      const eq = equityExactRunout(heroCards, boardArr, filtered, run.need);
      Cache.set('equity', key, eq);
      return eq;
    }

    let win = 0, tie = 0, n = 0;
    const mc = Math.random;
    const samplePool = filtered.length ? filtered : null;

    for (let k = 0; k < iters; k++) {
      const vh = samplePool
        ? samplePool[Math.floor(mc() * samplePool.length)]
        : sampleHandFromRange(rangeStr, dead, mc);
      if (!vh) break;
      const used = dead.concat(vh);
      const deck = C.shuffledDeckExcluding(used, mc);
      const runout = deck.slice(0, run.need);
      const full = boardArr.concat(runout);
      const hScore = C.evaluate(heroCards.concat(full));
      const vScore = C.evaluate(vh.concat(full));
      const cmp = C.compare(hScore, vScore);
      if (cmp > 0) win++;
      else if (cmp === 0) tie++;
      n++;
    }

    const eq = n ? (win + tie / 2) / n : 0.5;
    Cache.set('equity', key, eq);
    return eq;
  }

  function equityOneCardByOuts(outs, unknownCards) {
    const deck = unknownCards || 46;
    return Math.min(1, Math.max(0, outs / deck));
  }

  global.GTOEquity = {
    equityVsRange, equityExact, equityExactRunout, sampleHandFromRange, concreteCombos, allVillainCombos,
    augmentVillainRange, heroNonNutFlushContext, isFlushBoard, filterCombosFacingBet,
    combosOf: W ? W.combosOf : function () { return 1; },
    streetFromBoard, cardsToRun, equityOneCardByOuts
  };
})(window);
