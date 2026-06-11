/*
 * facingBet.js — Frecuencias dinámicas fold/call/raise ante apuesta postflop.
 *
 * Sustituye tablas estáticas irrealistas (ej. raise 45% en river) por lógica
 * basada en calle, pot odds, sizing relativo y textura del board.
 */
(function (global) {
  'use strict';

  const C = global.Cards;
  const Board = global.GTOBoardCluster;

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function normalize(freqs) {
    let sum = 0;
    for (const k in freqs) sum += freqs[k] || 0;
    if (sum <= 0) return { fold: 0.33, call: 0.45, raise: 0.22 };
    const out = {};
    for (const k in freqs) out[k] = (freqs[k] || 0) / sum;
    return out;
  }

  /**
   * Pot odds de call: betSize / (currentPot + 2 * betSize).
   * currentPot = bote antes de la apuesta del villano; betSize = cantidad a igualar.
   */
  function calculatePotOdds(currentPot, betSize) {
    const pot = Math.max(currentPot || 0, 0.1);
    const bet = Math.max(betSize || 0, 0);
    if (bet <= 0) return 0;
    return bet / (pot + bet + bet);
  }

  /** betSize relativo al bote previo (0.33 = 33%, 1.0 = pot bet). */
  function betToPotRatio(currentPot, betSize) {
    return betSize / Math.max(currentPot || 0.1, 0.1);
  }

  function rankVal(card) { return C ? C.RANK_VALUE[card[0]] : 0; }

  /**
   * Textura relevante para defender/raise ante apuesta.
   */
  function analyzeBoardTexture(board, street) {
    const b = board || [];
    const out = {
      paired: false, wet: false, monotone: false,
      flushPossible: false, straightPossible: false,
      scaryRiver: false, hasDraws: false
    };
    if (b.length < 3) return out;

    const tex = Board ? Board.boardTexture(b) : { wet: false, paired: false, category: 'LOW_BOARD' };
    out.paired = tex.paired;
    out.wet = tex.wet;
    out.monotone = tex.category === 'MONOTONE';

    const suits = {};
    b.forEach((c) => { suits[c[1]] = (suits[c[1]] || 0) + 1; });
    const maxSuit = Math.max(...Object.values(suits));
    out.flushPossible = maxSuit >= 3;
    if (street === 'river' && maxSuit >= 3) out.scaryRiver = true;

    const vals = b.map(rankVal).sort((a, b2) => a - b2);
    const span = vals[vals.length - 1] - vals[0];
    const unique = new Set(vals).size;
    out.straightPossible = span <= 4 && unique >= 3;
    out.hasDraws = street !== 'river' && (out.wet || out.flushPossible || out.straightPossible);

    if (street === 'river' && (out.paired || out.monotone || out.straightPossible)) {
      out.scaryRiver = true;
    }
    return out;
  }

  function streetRaiseBounds(street) {
    if (street === 'flop') return { min: 0.06, max: 0.32, default: 0.14 };
    if (street === 'turn') return { min: 0.03, max: 0.18, default: 0.08 };
    return { min: 0.02, max: 0.12, default: 0.05 }; // river — sin semibluffs
  }

  /**
   * Frecuencias fold/call/raise ante apuesta.
   *
   * @param {Object} params
   * @param {string} params.street — flop | turn | river
   * @param {number} params.currentPot — bote antes de la apuesta del villano (bb)
   * @param {number} params.betSize — cantidad a igualar (bb)
   * @param {string} params.tier — strong | medium | weak | air
   * @param {number} [params.heroEquity] — 0..1
   * @param {boolean} [params.inPosition]
   * @param {string[]} [params.board]
   */
  function calculateActionFrequencies(params) {
    params = params || {};
    const street = params.street || 'flop';
    const currentPot = params.currentPot || params.potBB || 1;
    const betSize = params.betSize || params.toCallBB || 0;
    const tier = params.tier || 'medium';
    const heroEquity = params.heroEquity != null ? params.heroEquity : 0.5;
    const inPosition = params.inPosition !== false;
    const board = params.board || [];

    const potOdds = calculatePotOdds(currentPot, betSize);
    const betRatio = betToPotRatio(currentPot, betSize);
    const texture = analyzeBoardTexture(board, street);
    const rb = streetRaiseBounds(street);

    // Fold mínimo ligado a pot odds y sizing (pot bet → más fold en manos medias)
    let minFold = potOdds;
    if (betRatio >= 1.0) minFold = Math.max(minFold, 0.38);
    else if (betRatio >= 0.66) minFold = Math.max(minFold, 0.28);
    else if (betRatio >= 0.40) minFold = Math.max(minFold, 0.20);
    else minFold = Math.max(minFold, 0.12);

    let fold, call, raise;

    if (tier === 'strong') {
      raise = street === 'river' ? 0.07 : (street === 'turn' ? 0.12 : 0.22);
      if (street === 'flop' && texture.hasDraws) raise += 0.06;
      raise = clamp(raise, rb.min, rb.max);
      call = street === 'river' ? 0.78 : (street === 'turn' ? 0.62 : 0.58);
      fold = clamp(1 - call - raise, 0.02, 0.12);
    } else if (tier === 'medium') {
      raise = rb.default;
      if (street === 'river') raise = clamp(0.04 + (heroEquity > 0.62 ? 0.04 : 0), rb.min, 0.08);

      if (heroEquity >= potOdds + 0.04) {
        call = clamp(0.48 + (heroEquity - potOdds) * 0.5, 0.35, 0.62);
        fold = clamp(1 - call - raise, minFold * 0.85, 0.45);
      } else {
        fold = clamp(minFold + 0.08, 0.28, 0.55);
        call = clamp(1 - fold - raise, 0.12, 0.45);
      }
    } else if (tier === 'weak') {
      raise = street === 'river' ? rb.min : clamp(rb.default * 0.75, rb.min, rb.max * 0.6);
      if (heroEquity >= potOdds + 0.02) {
        call = clamp(0.38 + (heroEquity - potOdds) * 0.4, 0.22, 0.52);
        fold = clamp(1 - call - raise, 0.18, 0.55);
      } else {
        fold = clamp(minFold + 0.12, 0.40, 0.72);
        call = clamp(1 - fold - raise, 0.05, 0.35);
      }
    } else {
      // air — river: solo faroles puros, casi nunca call
      raise = street === 'river' ? clamp(0.06 + (texture.scaryRiver ? 0.04 : 0), 0.04, rb.max)
        : (street === 'turn' ? 0.10 : 0.14);
      call = street === 'river' ? 0.04 : 0.07;
      fold = clamp(1 - raise - call, 0.55, 0.92);
    }

    // Turn: polarización — menos raise estándar salvo valor/bloqueador
    if (street === 'turn' && tier !== 'strong' && tier !== 'air') {
      raise = Math.min(raise, 0.10);
      const rem = 1 - raise;
      fold = clamp(Math.max(fold, minFold), 0.20, rem - 0.10);
      call = rem - fold;
    }

    // River: eliminar raise tipo semibluff (solo valor extremo o farol puro)
    if (street === 'river' && tier !== 'strong' && tier !== 'air') {
      raise = Math.min(raise, 0.06);
    }

    // Textura coordinada / OOP: contraer raise, más defensa pasiva
    if (!inPosition && (texture.paired || texture.wet || texture.scaryRiver)) {
      raise *= 0.55;
      fold = clamp(fold + 0.06, 0, 0.85);
      call = Math.max(0.05, 1 - fold - raise);
    }

    return normalize({ fold, call, raise });
  }

  global.GTOFacingBet = {
    calculateActionFrequencies,
    calculatePotOdds,
    betToPotRatio,
    analyzeBoardTexture,
    normalize
  };
})(window);
