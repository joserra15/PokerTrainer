/*
 * riverShoveNode.js — Recálculo de nodos ante overbet/shove en river (NL2-NL10 pool).
 *
 * Reglas:
 * 1. Cada cambio de sizing (bet → raise → shove) invalida frecuencias previas.
 * 2. Board doblado devalúa colores vs rango polarizado de shove.
 * 3. Underbluffing en microlímites: shove river >150bb ≈ valor puro.
 * 4. Afrontando >50bb tras resubida: fold salvo nuts absolutas.
 */
(function (global) {
  'use strict';

  const C = global.Cards;
  const Board = global.GTOBoardCluster;
  const D = global.GTORangesData;

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function normalize(freqs) {
    let sum = 0;
    for (const k in freqs) sum += freqs[k] || 0;
    if (sum <= 0) return { fold: 1, call: 0, raise: 0 };
    const out = {};
    for (const k in freqs) out[k] = (freqs[k] || 0) / sum;
    return out;
  }

  /** Bucket de nodo — clave de caché y recálculo obligatorio. */
  function classifyFacingNode(toCallBB, potBeforeBB, street, villainLastAction) {
    const call = Math.max(toCallBB || 0, 0);
    const pot = Math.max(potBeforeBB || 0.1, 0.1);
    const ratio = call / pot;

    if ((street || 'flop') !== 'river' || call <= 0) {
      if (ratio >= 1.2) return 'overbet';
      if (ratio >= 0.66) return 'large';
      if (ratio >= 0.35) return 'medium';
      return 'small';
    }

    // Umbrales absolutos en bb solo cuentan si el sizing también es grande vs el bote.
    // Evita marcar como overbet una apuesta media (p. ej. 36bb en bote de 97bb ≈ 37%).
    if (ratio >= 0.70 || (call >= 50 && ratio >= 0.50)) return 'shove';
    if (ratio >= 0.55 || (call >= 30 && ratio >= 0.45)) return 'overbet';
    if (ratio >= 0.66) return 'large';
    if (ratio >= 0.35) return 'medium';
    if (villainLastAction === 'raise' && ratio >= 0.45) return 'large';
    return 'small';
  }

  function boardPairRank(board) {
    const counts = {};
    (board || []).forEach((c) => {
      const r = c[0];
      counts[r] = (counts[r] || 0) + 1;
    });
    let pairRank = null;
    let maxCount = 0;
    for (const r in counts) {
      if (counts[r] >= 2 && counts[r] > maxCount) {
        maxCount = counts[r];
        pairRank = r;
      }
    }
    return { paired: maxCount >= 2, pairRank, trips: maxCount >= 3 };
  }

  function heroHasNutFlush(heroCards, board) {
    const Eq = global.GTOEquity;
    if (Eq && Eq.heroNonNutFlushContext) {
      const ctx = Eq.heroNonNutFlushContext(heroCards, board);
      return ctx && ctx.isNut;
    }
    const score = C.evaluate(heroCards.concat(board));
    return score.category === 5;
  }

  /** ¿Hay 3+ del mismo palo? (color posible). */
  function boardFlushPossible(board) {
    const suits = {};
    let maxSuit = 0;
    (board || []).forEach((c) => {
      suits[c[1]] = (suits[c[1]] || 0) + 1;
      if (suits[c[1]] > maxSuit) maxSuit = suits[c[1]];
    });
    return maxSuit >= 3;
  }

  /**
   * Top dos parejas: ambas hole cards participan y las parejas son las dos
   * cartas más altas del board (p. ej. KJ en J♠…K♦).
   */
  function isTopTwoPair(heroCards, board) {
    if (!heroCards || !board || board.length < 5 || !C || !C.evaluate) return false;
    const heroScore = C.evaluate(heroCards.concat(board));
    if (heroScore.category !== 2) return false;
    const holeVals = heroCards.map((c) => C.RANK_VALUE[c[0]]);
    if (holeVals[0] === holeVals[1]) return false;
    const highPair = heroScore.rank[1];
    const lowPair = heroScore.rank[2];
    if (!holeVals.includes(highPair) || !holeVals.includes(lowPair)) return false;
    const boardVals = board.map((c) => C.RANK_VALUE[c[0]]);
    const uniqBoard = Array.from(new Set(boardVals)).sort((a, b) => b - a);
    if (uniqBoard.length < 2) return false;
    return highPair === uniqBoard[0] && lowPair === uniqBoard[1];
  }

  /**
   * Raise por valor con top dobles en river seco: board sin pareja (no hay full)
   * y sin color posible. En esa textura top dos gana casi siempre vs peores
   * (AK, top pair, unders) y no debe tratarse como farol residual.
   */
  function isDryTopTwoValue(heroCards, board) {
    const pairInfo = boardPairRank(board);
    if (pairInfo.paired || pairInfo.trips) return false;
    if (boardFlushPossible(board)) return false;
    return isTopTwoPair(heroCards, board);
  }

  /**
   * Mano fuerte en showdown: full house+, trío/set, escalera nut, o top dos
   * parejas en board no emparejado (value claro vs raise polarizado light).
   */
  function isStrongShowdownHand(heroCards, board) {
    if (!heroCards || !board || board.length < 5) return false;
    const heroScore = C.evaluate(heroCards.concat(board));
    if (heroScore.category >= 6) return true;

    if (heroScore.category === 3) {
      const pairInfo = boardPairRank(board);
      const tripVal = heroScore.rank[1];
      const holeVals = heroCards.map((c) => C.RANK_VALUE[c[0]]);
      const usesHoleForTrips = holeVals.includes(tripVal);
      if (pairInfo.paired && pairInfo.pairRank) {
        const pr = C.RANK_VALUE[pairInfo.pairRank];
        if (tripVal === pr && usesHoleForTrips) return true;
      }
      if (usesHoleForTrips && heroScore.rank[2] >= 12) return true;
    }

    if (heroScore.category === 4) {
      const BTS = global.GTOBoardTextureShift;
      return BTS ? BTS.isNutStraight(heroCards, board) : false;
    }

    // Top dos en board seco sin full/color: value raise legítimo.
    if (isDryTopTwoValue(heroCards, board)) return true;

    return false;
  }

  /**
   * ¿Nadie puede tener una mano mejor con las 5 cartas del river?
   * Empates (p. ej. otra combo de la misma escalera) siguen siendo nuts.
   * Color nut en mesa doblada no califica: un full le gana.
   */
  function isAbsoluteNuts(heroCards, board) {
    if (!heroCards || !board || board.length < 5 || !C || !C.evaluate || !C.fullDeck) return false;
    const heroScore = C.evaluate(heroCards.concat(board));
    const deck = C.fullDeck();
    const dead = new Set(heroCards.concat(board));
    for (let i = 0; i < deck.length; i++) {
      const c1 = deck[i];
      if (dead.has(c1)) continue;
      for (let j = i + 1; j < deck.length; j++) {
        const c2 = deck[j];
        if (dead.has(c2)) continue;
        const vScore = C.evaluate([c1, c2].concat(board));
        if (C.compare(vScore, heroScore) > 0) return false;
      }
    }
    return true;
  }

  /** Fold = 0 si la mano es la nuez absoluta (mezcla solo call/raise). */
  function zeroFoldIfAbsoluteNuts(freqs, heroCards, board, _street) {
    if (!freqs) return freqs;
    if (!board || board.length < 5) return freqs;
    if (!isAbsoluteNuts(heroCards, board)) return freqs;
    const out = Object.assign({}, freqs);
    out.fold = 0;
    let sum = 0;
    for (const k in out) {
      if (k === 'fold') continue;
      sum += out[k] || 0;
    }
    if (sum <= 0) {
      out.call = 1;
      if (out.raise != null) out.raise = 0;
      return out;
    }
    for (const k in out) {
      if (k === 'fold') continue;
      out[k] = (out[k] || 0) / sum;
    }
    return out;
  }

  /**
   * Color (incluso nut) pierde valor relativo en board doblado ante shove polarizado.
   */
  function pairedBoardFlushDevaluation(heroCards, board) {
    const pairInfo = boardPairRank(board);
    if (!pairInfo.paired) return { vulnerable: false, capEquity: 1, reason: null };

    const heroScore = C.evaluate(heroCards.concat(board));
    if (heroScore.category !== 5) {
      return { vulnerable: false, capEquity: 1, reason: null };
    }

    const nutFlush = heroHasNutFlush(heroCards, board);
    return {
      vulnerable: true,
      capEquity: nutFlush ? 0.22 : 0.12,
      reason: 'paired_board_flush_vs_polar_shove',
      nutFlush
    };
  }

  /** Rango villano underbluffed para 3-bet shove river en microlímites. */
  function microstakesRiverShoveRange(board, pairInfo) {
    if (pairInfo && pairInfo.paired) {
      return 'TT, 22, 33, T2s, T3s, T2o, T3o, 23s, 23o, TT';
    }
    if (D && D.RANGE_FACING_RIVER_3BET_SHOVE) return D.RANGE_FACING_RIVER_3BET_SHOVE;
    return 'TT+, 22, 33, 44, 55, 66, 77, 88, 99, JJ, QQ, KK, AA';
  }

  function isRiverShoveNode(params) {
    const potBefore = params.potBeforeBB != null
      ? params.potBeforeBB
      : Math.max((params.potBB || 1) - (params.toCallBB || params.betSize || 0), 0.1);
    const node = classifyFacingNode(
      params.toCallBB || params.betSize || 0,
      potBefore,
      params.street || 'river',
      params.villainLastAction
    );
    return node === 'shove' || node === 'overbet';
  }

  /**
   * Frecuencias fold/call/raise recalculadas para shove/overbet river.
   * Nunca hereda el nodo anterior.
   */
  function computeRiverShoveFrequencies(params) {
    params = params || {};
    const board = params.board || [];
    const heroCards = params.heroCards || [];
    const toCall = params.toCallBB || params.betSize || 0;
    const potBefore = params.potBeforeBB != null
      ? params.potBeforeBB
      : Math.max((params.potBB || 1) - toCall, 0.1);
    const heroEquity = params.heroEquity != null ? params.heroEquity : 0.5;
    const potOdds = toCall / (potBefore + toCall + toCall);
    const pairInfo = boardPairRank(board);
    const deval = pairedBoardFlushDevaluation(heroCards, board);
    const nuts = isAbsoluteNuts(heroCards, board);
    const strongShowdown = isStrongShowdownHand(heroCards, board);
    const eqEffective = deval.vulnerable
      ? Math.min(heroEquity, deval.capEquity)
      : heroEquity;
    const eqEdge = eqEffective - potOdds;
    const node = classifyFacingNode(toCall, potBefore, 'river', params.villainLastAction);

    function wrap(freqs) {
      return zeroFoldIfAbsoluteNuts(normalize(freqs), heroCards, board, 'river');
    }

    const dryTopTwo = isDryTopTwoValue(heroCards, board);

    if (nuts) {
      return wrap({
        fold: 0,
        call: clamp(0.82 + eqEdge * 0.15, 0.72, 0.92),
        raise: 0.08
      });
    }

    // Top dos en textura seca (sin full/color): raise por valor entra en la
    // mezcla con peso material — no marcar all-in/raise como error residual.
    if (dryTopTwo && eqEffective >= potOdds - 0.05) {
      const raiseW = clamp(0.18 + Math.max(0, eqEdge) * 0.2, 0.16, 0.28);
      return wrap({
        fold: 0.02,
        call: clamp(0.78 - raiseW * 0.35, 0.58, 0.78),
        raise: raiseW
      });
    }

    if (strongShowdown && eqEffective >= potOdds - 0.02) {
      return wrap({
        fold: 0.04,
        call: clamp(0.82 + eqEdge * 0.15, 0.72, 0.92),
        raise: 0.06
      });
    }

    if (node === 'shove' || toCall >= 50) {
      if (deval.vulnerable || eqEffective < potOdds + 0.08) {
        return wrap({
          fold: clamp(0.82 + (potOdds - eqEffective) * 0.25, 0.75, 0.96),
          call: clamp(0.12 - (potOdds - eqEffective) * 0.15, 0.03, 0.18),
          raise: 0.02
        });
      }
      if (eqEdge >= 0.12) {
        return wrap({ fold: 0.18, call: 0.74, raise: 0.08 });
      }
      return wrap({ fold: 0.62, call: 0.32, raise: 0.06 });
    }

    if (node === 'overbet') {
      if (deval.vulnerable && eqEffective < potOdds + 0.05) {
        return wrap({ fold: 0.68, call: 0.26, raise: 0.06 });
      }
      return wrap({
        fold: clamp(0.35 + (potOdds - eqEffective) * 0.4, 0.22, 0.58),
        call: clamp(0.48 + eqEdge * 0.35, 0.28, 0.62),
        raise: 0.05
      });
    }

    return null;
  }

  /** Clave de caché única por nodo de apuesta (evita herencia bet → shove). */
  function facingNodeCacheKey(input) {
    const toCall = input.toCallBB || 0;
    const potBefore = Math.max((input.potBB || 1) - toCall, 0.1);
    const node = classifyFacingNode(toCall, potBefore, input.street, input.villainLastAction);
    const act = input.villainLastAction || '-';
    const seq = input.actionSequenceId != null ? input.actionSequenceId : '-';
    return 'fn:' + node + ':' + Math.round(toCall * 100) + ':' + Math.round(potBefore * 100) + ':' + act + ':' + seq;
  }

  global.GTORiverShoveNode = {
    classifyFacingNode,
    isStrongShowdownHand,
    isTopTwoPair,
    isDryTopTwoValue,
    boardFlushPossible,
    isAbsoluteNuts,
    zeroFoldIfAbsoluteNuts,
    pairedBoardFlushDevaluation,
    microstakesRiverShoveRange,
    isRiverShoveNode,
    computeRiverShoveFrequencies,
    facingNodeCacheKey,
    boardPairRank,
    normalize
  };
})(window);
