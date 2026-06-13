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

    if (call >= 50 || ratio >= 0.70) return 'shove';
    if (call >= 30 || ratio >= 0.55) return 'overbet';
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

  /**
   * ¿Nuts absolutas en river? (full house nut, quads, straight flush).
   * Color nut en mesa DOBLADA no califica.
   */
  function isAbsoluteNuts(heroCards, board) {
    if (!heroCards || !board || board.length < 5) return false;
    const heroScore = C.evaluate(heroCards.concat(board));
    const pairInfo = boardPairRank(board);

    if (heroScore.category >= 7) return true;
    if (heroScore.category === 8) return true;

    if (heroScore.category === 6) {
      if (!pairInfo.paired) return true;
      const boardTop = Math.max(...board.map((c) => C.RANK_VALUE[c[0]]));
      return heroScore.rank[1] >= boardTop;
    }

    if (heroScore.category === 5) {
      if (pairInfo.paired || pairInfo.trips) return false;
      return heroHasNutFlush(heroCards, board);
    }

    if (heroScore.category === 4) {
      const BTS = global.GTOBoardTextureShift;
      return BTS ? BTS.isNutStraight(heroCards, board) : false;
    }

    return false;
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
    const eqEffective = deval.vulnerable
      ? Math.min(heroEquity, deval.capEquity)
      : heroEquity;
    const eqEdge = eqEffective - potOdds;
    const node = classifyFacingNode(toCall, potBefore, 'river', params.villainLastAction);

    if (nuts && eqEffective >= potOdds + 0.05) {
      return normalize({
        fold: 0.04,
        call: clamp(0.82 + eqEdge * 0.15, 0.72, 0.92),
        raise: 0.06
      });
    }

    if (node === 'shove' || toCall >= 50) {
      if (deval.vulnerable || eqEffective < potOdds + 0.08) {
        return normalize({
          fold: clamp(0.82 + (potOdds - eqEffective) * 0.25, 0.75, 0.96),
          call: clamp(0.12 - (potOdds - eqEffective) * 0.15, 0.03, 0.18),
          raise: 0.02
        });
      }
      if (eqEdge >= 0.12) {
        return normalize({ fold: 0.18, call: 0.74, raise: 0.08 });
      }
      return normalize({ fold: 0.62, call: 0.32, raise: 0.06 });
    }

    if (node === 'overbet') {
      if (deval.vulnerable && eqEffective < potOdds + 0.05) {
        return normalize({ fold: 0.68, call: 0.26, raise: 0.06 });
      }
      return normalize({
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
    isAbsoluteNuts,
    pairedBoardFlushDevaluation,
    microstakesRiverShoveRange,
    isRiverShoveNode,
    computeRiverShoveFrequencies,
    facingNodeCacheKey,
    boardPairRank,
    normalize
  };
})(window);
