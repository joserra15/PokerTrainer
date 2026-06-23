/*
 * facingBet.js — Frecuencias fold/call/raise ante apuesta postflop.
 * Fase 1: MDF, equity-driven, percentil de mano.
 * Fase 2: blockers, ajuste por línea del villano (vía strategyTables).
 */
(function (global) {
  'use strict';

  const C = global.Cards;
  const Board = global.GTOBoardCluster;
  const Block = global.GTOBlockers;

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function normalize(freqs) {
    let sum = 0;
    for (const k in freqs) sum += freqs[k] || 0;
    if (sum <= 0) return { fold: 0.33, call: 0.45, raise: 0.22 };
    const out = {};
    for (const k in freqs) out[k] = (freqs[k] || 0) / sum;
    return out;
  }

  function calculatePotOdds(currentPot, betSize) {
    const pot = Math.max(currentPot || 0, 0.1);
    const bet = Math.max(betSize || 0, 0);
    if (bet <= 0) return 0;
    return bet / (pot + bet + bet);
  }

  function betToPotRatio(currentPot, betSize) {
    return betSize / Math.max(currentPot || 0.1, 0.1);
  }

  /** alpha = bet/(pot+bet); MDF = 1 - alpha */
  function calculateMDF(currentPot, betSize) {
    const pot = Math.max(currentPot || 0, 0.1);
    const bet = Math.max(betSize || 0, 0);
    if (bet <= 0) return 1;
    const alpha = bet / (pot + bet);
    return clamp(1 - alpha, 0.15, 0.95);
  }

  function rankVal(card) { return C ? C.RANK_VALUE[card[0]] : 0; }

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
    return { min: 0.02, max: 0.12, default: 0.05 };
  }

  function resolveBand(params) {
    if (params.handRank && params.handRank.band) return params.handRank.band;
    const eq = params.heroEquity != null ? params.heroEquity : 0;
    const tier = params.tier || 'medium';
    if (tier === 'strong' && eq >= 0.82) return 'nuts';
    if (tier === 'strong') return 'value';
    if (tier === 'medium') return 'merge';
    if (tier === 'weak') return 'bluffcatch';
    return 'air';
  }

  function applyMDF(freqs, mdf, heroEquity, potOdds, band) {
    const defend = (freqs.call || 0) + (freqs.raise || 0);
    if (defend >= mdf) return freqs;

    const needDefend = mdf - defend;
    const canDefend = heroEquity >= potOdds - 0.06 || band === 'bluffcatch' || band === 'merge';

    if (!canDefend && band === 'air') return freqs;

    const out = Object.assign({}, freqs);
    if (canDefend) {
      out.call = (out.call || 0) + needDefend * 0.75;
      out.raise = (out.raise || 0) + needDefend * 0.25;
      out.fold = Math.max(0, 1 - (out.call + out.raise));
    } else if (band !== 'air') {
      out.call = (out.call || 0) + needDefend * 0.5;
      out.fold = Math.max(0, 1 - (out.call + (out.raise || 0)));
    }
    return out;
  }

  function calculateActionFrequencies(params) {
    params = params || {};
    const street = params.street || 'flop';
    const currentPot = params.currentPot || params.potBB || 1;
    const betSize = params.betSize || params.toCallBB || 0;
    const tier = params.tier || 'medium';
    const band = resolveBand(params);
    const heroEquity = params.heroEquity != null ? params.heroEquity : 0.5;
    const inPosition = params.inPosition !== false;
    const board = params.board || [];

    const RS = global.GTORiverShoveNode;
    if (RS && street === 'river' && betSize > 0) {
      const shoveFreqs = RS.computeRiverShoveFrequencies(Object.assign({}, params, {
        potBeforeBB: currentPot,
        toCallBB: betSize,
        betSize: betSize
      }));
      if (shoveFreqs) return shoveFreqs;
    }

    const potOdds = calculatePotOdds(currentPot, betSize);
    const betRatio = betToPotRatio(currentPot, betSize);
    const mdf = calculateMDF(currentPot, betSize);
    const texture = analyzeBoardTexture(board, street);
    const rb = streetRaiseBounds(street);
    const eqEdge = heroEquity - potOdds;

    let minFold = potOdds;
    if (betRatio >= 1.0) minFold = Math.max(minFold, 0.38);
    else if (betRatio >= 0.66) minFold = Math.max(minFold, 0.28);
    else if (betRatio >= 0.40) minFold = Math.max(minFold, 0.20);
    else minFold = Math.max(minFold, 0.12);

    let fold, call, raise;

    if (band === 'nuts' || band === 'value') {
      raise = street === 'river'
        ? clamp(0.05 + Math.max(0, eqEdge) * 0.4, rb.min, 0.10)
        : (street === 'turn' ? clamp(0.08 + eqEdge * 0.35, rb.min, 0.18) : clamp(0.14 + eqEdge * 0.5, rb.min, rb.max));
      if (street === 'flop' && texture.hasDraws) raise += 0.05;
      raise = clamp(raise, rb.min, rb.max);
      call = street === 'river'
        ? clamp(0.82 - raise * 0.3, 0.68, 0.90)
        : (street === 'turn' ? clamp(0.58 + eqEdge * 0.25, 0.48, 0.72) : clamp(0.52 + eqEdge * 0.3, 0.42, 0.68));
      fold = clamp(1 - call - raise, 0.02, 0.15);
    } else if (band === 'merge') {
      raise = rb.default;
      if (street === 'river') raise = clamp(0.03 + (eqEdge > 0.08 ? 0.04 : 0), rb.min, 0.08);

      if (eqEdge >= 0.04) {
        call = clamp(0.42 + eqEdge * 0.55, 0.32, 0.68);
        fold = clamp(1 - call - raise, minFold * 0.8, 0.48);
      } else if (eqEdge >= -0.04) {
        const mix = 0.5 + eqEdge * 4;
        call = clamp(mix * 0.45, 0.22, 0.48);
        fold = clamp(1 - call - raise, minFold, 0.55);
      } else {
        fold = clamp(minFold + 0.10 - eqEdge * 0.3, 0.32, 0.62);
        call = clamp(1 - fold - raise, 0.08, 0.40);
      }
    } else if (band === 'bluffcatch') {
      raise = street === 'river' ? rb.min : clamp(rb.default * 0.7, rb.min, rb.max * 0.55);
      if (eqEdge >= 0.02) {
        call = clamp(0.35 + eqEdge * 0.45, 0.20, 0.55);
        fold = clamp(1 - call - raise, 0.15, 0.52);
      } else if (eqEdge >= -0.06) {
        call = clamp(0.28 + eqEdge * 2.5, 0.12, 0.38);
        fold = clamp(1 - call - raise, minFold + 0.05, 0.58);
      } else {
        fold = clamp(minFold + 0.14, 0.42, 0.78);
        call = clamp(1 - fold - raise, 0.04, 0.32);
      }
    } else {
      raise = street === 'river'
        ? clamp(0.04 + (texture.scaryRiver ? 0.05 : 0) + (eqEdge < -0.15 ? 0.04 : 0), 0.03, rb.max)
        : (street === 'turn' ? 0.10 : 0.13);
      call = street === 'river'
        ? clamp(0.03 + (eqEdge > 0.05 ? 0.06 : 0), 0.02, 0.10)
        : clamp(0.06 + Math.max(0, eqEdge) * 0.2, 0.04, 0.14);
      fold = clamp(1 - raise - call, 0.55, 0.92);
    }

    if (street === 'turn' && band !== 'nuts' && band !== 'value' && band !== 'air') {
      raise = Math.min(raise, 0.10);
      const rem = 1 - raise;
      fold = clamp(Math.max(fold, minFold * 0.9), 0.18, rem - 0.08);
      call = rem - fold;
    }

    if (street === 'river' && band !== 'nuts' && band !== 'value' && band !== 'air') {
      raise = Math.min(raise, 0.07);
    }

    if (!inPosition && (texture.paired || texture.wet || texture.scaryRiver)) {
      raise *= 0.55;
      fold = clamp(fold + 0.05, 0, 0.85);
      call = Math.max(0.04, 1 - fold - raise);
    }

    let freqs = normalize({ fold, call, raise });
    freqs = applyMDF(freqs, mdf, heroEquity, potOdds, band);

    if (Block && params.heroCards) {
      freqs = Block.applyBlockerAdjustments(freqs, params.heroCards, board, { street, band, tier });
      freqs = normalize(freqs);
    }

    return freqs;
  }

  function actionEV(action, params, freqs) {
    const currentPot = params.currentPot || Math.max((params.potBB || 1) - (params.toCallBB || 0), 0.1);
    const betSize = params.betSize || params.toCallBB || 0;
    const heroEquity = params.heroEquity != null ? params.heroEquity : 0.5;
    const potAfterCall = currentPot + 2 * betSize;
    const rf = params.inPosition !== false ? 0.95 : 0.82;

    if (action === 'fold') return 0;

    if (action === 'call') {
      return heroEquity * potAfterCall * rf - betSize;
    }

    if (action === 'raise') {
      const raiseSize = betSize * 2.5;
      const fe = 0.22 + (params.betRatio || betSize / currentPot) * 0.15;
      const potWon = currentPot + betSize + raiseSize;
      const whenCalled = heroEquity * (potWon + raiseSize) * rf - raiseSize;
      return fe * (currentPot + betSize) + (1 - fe) * whenCalled;
    }

    const best = { best: 'call', maxFreq: 0 };
    for (const a in freqs) if ((freqs[a] || 0) > best.maxFreq) { best.maxFreq = freqs[a]; best.best = a; }
    return actionEV(best.best, params, freqs);
  }

  global.GTOFacingBet = {
    calculateActionFrequencies,
    calculatePotOdds,
    calculateMDF,
    betToPotRatio,
    analyzeBoardTexture,
    actionEV,
    normalize
  };
})(window);
