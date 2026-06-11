/*
 * strategyTables.js — Pseudo-solver por lookup tables (sin CFR+).
 */
(function (global) {
  'use strict';

  const N = global.GTORangesNotation;
  const D = global.GTORangesData;
  const W = global.GTORangesWeights;
  const HS = global.GTOHandStrength;
  const Made = global.GTOEquityMadeHand;
  const Eq = global.GTOEquity;
  const Board = global.GTOBoardCluster;
  const Cache = global.GTOCache;

  function normalize(freqs) {
    let sum = 0;
    for (const k in freqs) sum += freqs[k];
    if (sum <= 0) return freqs;
    const out = {};
    for (const k in freqs) out[k] = freqs[k] / sum;
    return out;
  }

  function rfiStrategy(pos, code) {
    const data = D.OPEN_RAISE[pos];
    if (!data) return { fold: 1, raise: 0 };
    const raiseSet = N.toSet(data.raise);
    const mixSet = N.toSet(data.mix);
    if (raiseSet.has(code)) return { fold: 0, raise: 1 };
    if (mixSet.has(code)) return { fold: 0.5, raise: 0.5 };
    return { fold: 1, raise: 0 };
  }

  function vsRfiStrategy(key, code) {
    const data = D.VS_RFI[key];
    if (!data) return { fold: 1, call: 0, raise: 0 };
    const tb = N.toSet(data.threeBet);
    const tbMix = N.toSet(data.threeBetMix);
    const call = N.toSet(data.call);
    const callMix = N.toSet(data.callMix || '');
    if (tb.has(code)) return { fold: 0, call: 0, raise: 1 };
    if (tbMix.has(code)) return call.has(code) ? { fold: 0, call: 0.5, raise: 0.5 } : { fold: 0.5, call: 0, raise: 0.5 };
    if (call.has(code)) return { fold: 0, call: 1, raise: 0 };
    if (callMix.has(code)) return { fold: 0.58, call: 0.42, raise: 0 };
    return { fold: 1, call: 0, raise: 0 };
  }

  function squeezeStrategy(code) {
    const s = HS.handStrength01(code);
    if (s > 0.93) return { fold: 0.03, call: 0.27, raise: 0.7 };
    if (s > 0.85) return { fold: 0.2, call: 0.45, raise: 0.35 };
    if (s > 0.72) return { fold: 0.5, call: 0.38, raise: 0.12 };
    if (s > 0.55) return { fold: 0.82, call: 0.16, raise: 0.02 };
    return { fold: 0.96, call: 0.03, raise: 0.01 };
  }

  function isoStrategy(code) {
    const s = HS.handStrength01(code);
    if (s > 0.8) return { fold: 0, call: 0.05, raise: 0.95 };
    if (s > 0.58) return { fold: 0.25, call: 0.05, raise: 0.7 };
    if (s > 0.42) return { fold: 0.62, call: 0.08, raise: 0.3 };
    return { fold: 0.93, call: 0.05, raise: 0.02 };
  }

  function vs3betStrategy(code) {
    const cont = N.toSet('QQ+, AKs, AKo');
    const callMix = N.toSet('JJ, TT, AQs, AJs, KQs, AQo, 99');
    if (cont.has(code)) return { fold: 0, call: 0.25, raise: 0.75 };
    if (callMix.has(code)) return { fold: 0.15, call: 0.8, raise: 0.05 };
    return { fold: 0.82, call: 0.15, raise: 0.03 };
  }

  function vs4betStrategy(code) {
    const jam = N.toSet('KK+, AKs');
    const callS = N.toSet('QQ, JJ, AKo, AQs');
    if (jam.has(code)) return { fold: 0, call: 0.2, raise: 0.8 };
    if (callS.has(code)) return { fold: 0.35, call: 0.6, raise: 0.05 };
    return { fold: 0.9, call: 0.08, raise: 0.02 };
  }

  function heuristicOpen(code) {
    const s = HS.handStrength01(code);
    if (s > 0.7) return { fold: 0, raise: 1 };
    if (s > 0.55) return { fold: 0.5, raise: 0.5 };
    return { fold: 1, raise: 0 };
  }

  function heuristicFacingRaise(code, threebetPlus) {
    const s = HS.handStrength01(code);
    let f;
    if (s > 0.94) f = { fold: 0.02, call: 0.33, raise: 0.65 };
    else if (s > 0.85) f = { fold: 0.12, call: 0.6, raise: 0.28 };
    else if (s > 0.68) f = { fold: 0.4, call: 0.55, raise: 0.05 };
    else if (s > 0.5) f = { fold: 0.72, call: 0.26, raise: 0.02 };
    else f = { fold: 0.95, call: 0.04, raise: 0.01 };
    if (threebetPlus) {
      f.fold = Math.min(0.97, f.fold + 0.15);
      f.call = Math.max(0, f.call - 0.1);
      f.raise = Math.max(0, 1 - f.fold - f.call);
    }
    return f;
  }

  const POSTFLOP_TABLE = {
    aggressor_IP: {
      strong: { bet: 0.65, check: 0.35 },
      medium: { bet: 0.48, check: 0.52 },
      weak: { bet: 0.58, check: 0.42 },
      air: { bet: 0.38, check: 0.62 }
    },
    aggressor_OOP: {
      strong: { bet: 0.55, check: 0.45 },
      medium: { bet: 0.4, check: 0.6 },
      weak: { bet: 0.52, check: 0.48 },
      air: { bet: 0.28, check: 0.72 }
    },
    caller_IP: {
      strong: { bet: 0.42, check: 0.58 },
      medium: { bet: 0.35, check: 0.65 },
      weak: { bet: 0.45, check: 0.55 },
      air: { bet: 0.22, check: 0.78 }
    },
    caller_OOP: {
      strong: { bet: 0.32, check: 0.68 },
      medium: { bet: 0.25, check: 0.75 },
      weak: { bet: 0.38, check: 0.62 },
      air: { bet: 0.15, check: 0.85 }
    }
  };

  const FacingBet = global.GTOFacingBet;

  function postflopStrategy(input) {
    const facing = (input.toCallBB || 0) > 0;
    const info = input.madeHandInfo || Made.classifyMadeHand(input.heroCards, input.board);
    const tier = info.tier;

    if (!facing) {
      const role = (input.initiative === 'aggressor' ? 'aggressor' : 'caller') + '_' + (input.inPosition ? 'IP' : 'OOP');
      const base = POSTFLOP_TABLE[role] || POSTFLOP_TABLE.aggressor_IP;
      let f = Object.assign({}, base[tier] || base.medium);
      const texture = Board.boardTexture(input.board);
      if (texture.category === 'MONOTONE' || texture.category === 'TWO_TONE_DYNAMIC') {
        if (tier === 'air') { f.bet = Math.min(f.bet + 0.08, 0.5); f.check = 1 - f.bet; }
        if (tier === 'strong') { f.bet = Math.min(f.bet + 0.1, 0.85); f.check = 1 - f.bet; }
      }
      if (input.spr === 'low' && tier === 'strong') { f.bet = Math.min(f.bet + 0.12, 0.9); f.check = 1 - f.bet; }
      const betTotal = f.bet || 0;
      return normalize({
        check: f.check || 0,
        bet_33: betTotal * 0.45,
        bet_66: betTotal * 0.35,
        bet_100: betTotal * 0.20
      });
    }

    const eq = input.heroEquity != null ? input.heroEquity : 0.5;
    const potBeforeBet = Math.max((input.potBB || 1) - (input.toCallBB || 0), 0.1);

    if (FacingBet && FacingBet.calculateActionFrequencies) {
      return FacingBet.calculateActionFrequencies({
        street: input.street || 'flop',
        currentPot: potBeforeBet,
        betSize: input.toCallBB || 0,
        potBB: input.potBB,
        toCallBB: input.toCallBB,
        tier,
        heroEquity: eq,
        inPosition: input.inPosition !== false,
        board: input.board || [],
        madeHandInfo: info
      });
    }

    return normalize({ fold: 0.33, call: 0.45, raise: 0.22 });
  }

  function betSizingOptions(potBB, wet) {
    const pot = Math.max(potBB || 1, 1);
    const s33 = Math.round(pot * 0.33 * 100) / 100;
    const s66 = Math.round(pot * (wet ? 0.66 : 0.55) * 100) / 100;
    const s100 = Math.round(pot * 100) / 100;
    return [
      { id: 'bet_33', label: `Bet ${s33}bb (33%)`, size: s33 },
      { id: 'bet_66', label: `Bet ${s66}bb (${wet ? '66' : '55'}%)`, size: s66 },
      { id: 'bet_100', label: `Bet ${s100}bb (pot)`, size: s100 }
    ];
  }

  function getStrategy(input, spotKey) {
    const cacheKey = global.GTOSpotKey.spotKeyString(spotKey) + '|' + (input.handCode || '');
    return Cache.memo('spot', cacheKey, () => {
      const kind = input.spotKind || spotKey.spotKind;
      const code = input.handCode;

      if (kind === 'RFI') return rfiStrategy(input.position, code);
      if (kind === 'vsRFI') return vsRfiStrategy(input.vsRfiKey || (input.position + '_vs_' + input.vsPosition), code);
      if (kind === 'squeeze') return squeezeStrategy(code);
      if (kind === 'isoLimp' || kind === 'vsLimp') return isoStrategy(code);
      if (kind === 'face3bet' || kind === 'vs3bet') return vs3betStrategy(code);
      if (kind === 'face4bet' || kind === 'vs4bet') return vs4betStrategy(code);
      if (kind === 'cold3bet') return heuristicFacingRaise(code, true);

      if (spotKey.street === 'preflop') {
        if (D.OPEN_RAISE[input.position]) return rfiStrategy(input.position, code);
        return heuristicOpen(code);
      }

      return postflopStrategy(Object.assign({}, input, { spr: spotKey.spr, initiative: spotKey.initiative, inPosition: spotKey.inPosition }));
    });
  }

  function actionEV(action, freqs, input) {
    const pot = input.potBB || 1;
    const tier = input.madeHandInfo ? input.madeHandInfo.tier : 'medium';
    const eq = input.heroEquity != null ? input.heroEquity : HS.handStrength01(input.handCode || '72o');
    const tierMul = { strong: 1.2, medium: 1, weak: 0.85, air: 0.6 };
    const base = eq * pot * 0.5 * (tierMul[tier] || 1);

    const best = bestAction(freqs);
    const bestBonus = { fold: 0.05, check: 0.1, call: 0.12, raise: 0.15, bet_33: 0.12, bet_66: 0.14, bet_100: 0.16 };
    const spotEV = base + (bestBonus[best.best] || 0.12) * pot;

    const freq = freqs[action] || 0;
    if (freq >= 0.005) return spotEV;

    const penMul = { strong: 0.75, medium: 1, weak: 1.15, air: 1.35 };
    const penalties = {
      fold: 0.12, check: 0.08, call: 0.15, raise: 0.25,
      bet_33: 0.18, bet_66: 0.28, bet_100: 0.42
    };
    return spotEV - (penalties[action] || 0.2) * pot * (penMul[tier] || 1);
  }

  function bestAction(freqs) {
    let max = 0, best = 'fold';
    for (const a in freqs) if (freqs[a] > max) { max = freqs[a]; best = a; }
    return { best, maxFreq: max };
  }

  global.GTOStrategyTables = {
    normalize, rfiStrategy, vsRfiStrategy, squeezeStrategy, isoStrategy,
    vs3betStrategy, vs4betStrategy, heuristicOpen, heuristicFacingRaise,
    postflopStrategy, getStrategy, actionEV, bestAction, betSizingOptions
  };
})(window);
