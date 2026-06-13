/*
 * strategyTables.js — Estrategia postflop EV-based + tablas preflop (Fase 1/2).
 */
(function (global) {
  'use strict';

  const N = global.GTORangesNotation;
  const D = global.GTORangesData;
  const HS = global.GTOHandStrength;
  const Made = global.GTOEquityMadeHand;
  const Board = global.GTOBoardCluster;
  const Cache = global.GTOCache;
  const FacingBet = global.GTOFacingBet;
  const ProbeEV = global.GTOProbeEV;
  const Preflop = global.GTOPreflopSolver;
  const VillainAdj = global.GTOVillainStrategyAdjust;

  function normalize(freqs) {
    let sum = 0;
    for (const k in freqs) sum += freqs[k] || 0;
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
    let base;
    if (raiseSet.has(code)) base = { fold: 0, raise: 1 };
    else if (mixSet.has(code)) base = { fold: 0.5, raise: 0.5 };
    else base = { fold: 1, raise: 0 };
    if (Preflop) {
      return Preflop.enhancePreflopStrategy(base, code, 'RFI', Preflop.tableContext('RFI', code, data));
    }
    return base;
  }

  function vsRfiStrategy(key, code) {
    const data = D.VS_RFI[key];
    if (!data) return { fold: 1, call: 0, raise: 0 };
    const tb = N.toSet(data.threeBet);
    const tbMix = N.toSet(data.threeBetMix);
    const call = N.toSet(data.call);
    const callMix = N.toSet(data.callMix || '');
    let base;
    if (tb.has(code)) base = { fold: 0, call: 0, raise: 1 };
    else if (tbMix.has(code)) base = call.has(code) ? { fold: 0, call: 0.5, raise: 0.5 } : { fold: 0.5, call: 0, raise: 0.5 };
    else if (call.has(code)) base = { fold: 0, call: 1, raise: 0 };
    else if (callMix.has(code)) base = { fold: 0.58, call: 0.42, raise: 0 };
    else base = { fold: 1, call: 0, raise: 0 };
    if (Preflop) {
      return Preflop.enhancePreflopStrategy(base, code, 'vsRFI', Preflop.tableContext('vsRFI', code, data, key));
    }
    return base;
  }

  function squeezeStrategy(code) {
    const s = HS.handStrength01(code);
    let base;
    if (s > 0.93) base = { fold: 0.03, call: 0.27, raise: 0.7 };
    else if (s > 0.85) base = { fold: 0.2, call: 0.45, raise: 0.35 };
    else if (s > 0.72) base = { fold: 0.5, call: 0.38, raise: 0.12 };
    else if (s > 0.55) base = { fold: 0.82, call: 0.16, raise: 0.02 };
    else base = { fold: 0.96, call: 0.03, raise: 0.01 };
    return Preflop ? Preflop.enhancePreflopStrategy(base, code, 'squeeze', {}) : base;
  }

  function isoStrategy(code) {
    const s = HS.handStrength01(code);
    let base;
    if (s > 0.8) base = { fold: 0, call: 0.05, raise: 0.95 };
    else if (s > 0.58) base = { fold: 0.25, call: 0.05, raise: 0.7 };
    else if (s > 0.42) base = { fold: 0.62, call: 0.08, raise: 0.3 };
    else base = { fold: 0.93, call: 0.05, raise: 0.02 };
    return Preflop ? Preflop.enhancePreflopStrategy(base, code, 'isoLimp', {}) : base;
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

  const STREET_PROBE_SCALE = { flop: 1.0, turn: 0.82, river: 0.52 };

  function betSizeSplit(street, tier) {
    if (ProbeEV && ProbeEV.dynamicSizeSplit) {
      const band = tier === 'strong' ? 'value' : (tier === 'medium' ? 'merge' : (tier === 'weak' ? 'bluffcatch' : 'air'));
      return ProbeEV.dynamicSizeSplit({ street }, band, 0.35);
    }
    if (street === 'river' && (tier === 'air' || tier === 'weak')) {
      return { s33: 0.58, s66: 0.28, s100: 0.14 };
    }
    if (street === 'river') return { s33: 0.42, s66: 0.33, s100: 0.25 };
    return { s33: 0.45, s66: 0.35, s100: 0.20 };
  }

  /** Fallback tabular probe (si probeEV no disponible). */
  function probeStrategyLegacy(input) {
    const info = input.madeHandInfo || Made.classifyMadeHand(input.heroCards, input.board);
    let tier = input.handRank && input.handRank.tier ? input.handRank.tier : info.tier;
    const street = input.street || 'flop';
    const board = input.board || [];
    const texture = Board.boardTexture(board);
    const BTS = global.GTOBoardTextureShift;

    if (BTS) {
      const valueMode = BTS.riverStraightValueMode(input.heroCards, board, input.priorBoard, street);
      if (valueMode) {
        return normalize({ check: valueMode.check, bet_33: valueMode.bet_33, bet_66: valueMode.bet_66, bet_100: valueMode.bet_100 });
      }
    }

    if (BTS && BTS.isNutStraight(input.heroCards, board)) {
      const freqs = BTS.nutStraightValueFrequencies(street);
      return normalize({ check: freqs.check, bet_33: freqs.bet_33, bet_66: freqs.bet_66, bet_100: freqs.bet_100 });
    }

    const role = (input.initiative === 'aggressor' ? 'aggressor' : 'caller') + '_' + (input.inPosition ? 'IP' : 'OOP');
    const base = POSTFLOP_TABLE[role] || POSTFLOP_TABLE.aggressor_IP;

    if (street === 'river' && info.ev && info.ev.category === 0) tier = 'air';

    let f = Object.assign({}, base[tier] || base.medium);
    f.bet = (f.bet || 0) * (STREET_PROBE_SCALE[street] || 1);
    if (texture.paired) f.bet *= street === 'river' ? (tier === 'air' ? 0.32 : 0.55) : 0.88;
    if (street === 'river' && tier === 'air' && input.initiative === 'aggressor' && input.inPosition) {
      f.bet = Math.min(f.bet, 0.09);
    }
    const pot = input.potBB || 1;
    if (pot >= 8 && street === 'river') f.bet *= 0.72;
    if (pot <= 6 && street === 'flop') f.bet *= 1.08;
    f.bet = Math.min(Math.max(f.bet, 0), 0.85);
    const split = betSizeSplit(street, tier);
    const betTotal = f.bet;
    return normalize({
      check: 1 - betTotal,
      bet_33: betTotal * split.s33,
      bet_66: betTotal * split.s66,
      bet_100: betTotal * split.s100
    });
  }

  function probeStrategy(input) {
    const BTS = global.GTOBoardTextureShift;
    const street = input.street || 'flop';
    const board = input.board || [];

    if (BTS) {
      const valueMode = BTS.riverStraightValueMode(input.heroCards, board, input.priorBoard, street);
      if (valueMode) {
        return normalize({ check: valueMode.check, bet_33: valueMode.bet_33, bet_66: valueMode.bet_66, bet_100: valueMode.bet_100 });
      }
    }
    if (BTS && BTS.isNutStraight(input.heroCards, board)) {
      const freqs = BTS.nutStraightValueFrequencies(street);
      return normalize({ check: freqs.check, bet_33: freqs.bet_33, bet_66: freqs.bet_66, bet_100: freqs.bet_100 });
    }

    if (ProbeEV && ProbeEV.computeProbeStrategy) {
      const result = ProbeEV.computeProbeStrategy(input);
      return result.strategy;
    }
    return probeStrategyLegacy(input);
  }

  function applyPostflopAdjustments(freqs, input, facing) {
    let out = Object.assign({}, freqs);
    if (VillainAdj) {
      const potBefore = Math.max((input.potBB || 1) - (input.toCallBB || 0), 0.1);
      const betRatio = (input.toCallBB || 0) / potBefore;
      out = VillainAdj.applyVillainAdjustments(out, {
        villainLastAction: input.villainLastAction,
        villainBetRatio: input.villainBetRatio != null ? input.villainBetRatio : betRatio,
        street: input.street,
        facingBet: facing,
        toCallBB: input.toCallBB
      });
    }
    return out;
  }

  function postflopStrategy(input) {
    const facing = (input.toCallBB || 0) > 0;
    const info = input.madeHandInfo || Made.classifyMadeHand(input.heroCards, input.board);
    const tier = input.handRank && input.handRank.tier ? input.handRank.tier : info.tier;

    if (!facing) {
      const strat = probeStrategy(Object.assign({}, input, { madeHandInfo: info }));
      return applyPostflopAdjustments(strat, input, false);
    }

    const eq = input.heroEquity != null ? input.heroEquity : 0.5;
    const potBeforeBet = Math.max((input.potBB || 1) - (input.toCallBB || 0), 0.1);
    const betRatio = (input.toCallBB || 0) / potBeforeBet;

    if (FacingBet && FacingBet.calculateActionFrequencies) {
      const strat = FacingBet.calculateActionFrequencies({
        street: input.street || 'flop',
        currentPot: potBeforeBet,
        betSize: input.toCallBB || 0,
        potBB: input.potBB,
        toCallBB: input.toCallBB,
        betRatio,
        tier,
        handRank: input.handRank,
        heroEquity: eq,
        heroCards: input.heroCards,
        inPosition: input.inPosition !== false,
        board: input.board || [],
        madeHandInfo: info,
        villainLastAction: input.villainLastAction,
        potBeforeBB: input.potBeforeBB != null ? input.potBeforeBB : potBeforeBet,
        facingNode: input.facingNode
      });
      return applyPostflopAdjustments(strat, input, true);
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
    const StreetVal = global.GTOStreetValidation;
    const suffix = StreetVal ? StreetVal.strategyCacheSuffix(input) : '';
    const eqSuffix = input.heroEquity != null ? Math.round(input.heroEquity * 1000) : '-';
    const pctSuffix = input.handRank && input.handRank.percentile != null
      ? Math.round(input.handRank.percentile * 100) : '-';
    const RS = global.GTORiverShoveNode;
    const nodeKey = RS ? RS.facingNodeCacheKey(input) : '';
    const cacheKey = global.GTOSpotKey.spotKeyString(spotKey) + '|' + (input.handCode || '')
      + '|' + suffix + '|eq' + eqSuffix + '|p' + pctSuffix + '|' + nodeKey;
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

      return postflopStrategy(Object.assign({}, input, {
        spr: spotKey.spr,
        initiative: spotKey.initiative,
        inPosition: spotKey.inPosition,
        priorBoard: input.priorBoard
      }));
    });
  }

  function actionEV(action, freqs, input) {
    const facing = (input.toCallBB || 0) > 0;
    const potBeforeBet = Math.max((input.potBB || 1) - (input.toCallBB || 0), 0.1);
    const betRatio = (input.toCallBB || 0) / potBeforeBet;

    if (input.street !== 'preflop' && input.street != null) {
      if (facing && FacingBet && FacingBet.actionEV) {
        return FacingBet.actionEV(action, {
          street: input.street,
          currentPot: potBeforeBet,
          betSize: input.toCallBB || 0,
          toCallBB: input.toCallBB,
          potBB: input.potBB,
          betRatio,
          heroEquity: input.heroEquity,
          inPosition: input.inPosition !== false,
          handRank: input.handRank,
          tier: input.handRank ? input.handRank.tier : (input.madeHandInfo ? input.madeHandInfo.tier : 'medium')
        }, freqs);
      }
      if (!facing && ProbeEV && ProbeEV.actionEV) {
        return ProbeEV.actionEV(action, input, freqs);
      }
    }

    const pot = input.potBB || 1;
    const tier = input.handRank ? input.handRank.tier : (input.madeHandInfo ? input.madeHandInfo.tier : 'medium');
    const eq = input.heroEquity != null ? input.heroEquity : HS.handStrength01(input.handCode || '72o');
    const tierMul = { strong: 1.2, medium: 1, weak: 0.85, air: 0.6 };
    const base = eq * pot * 0.5 * (tierMul[tier] || 1);
    const best = bestAction(freqs);
    const bestBonus = { fold: 0.05, check: 0.1, call: 0.12, raise: 0.15, bet_33: 0.12, bet_66: 0.14, bet_100: 0.16 };
    const spotEV = base + (bestBonus[best.best] || 0.12) * pot;
    const freq = freqs[action] || 0;
    if (freq >= 0.005) return spotEV;
    const penMul = { strong: 0.75, medium: 1, weak: 1.15, air: 1.35 };
    const penalties = { fold: 0.12, check: 0.08, call: 0.15, raise: 0.25, bet_33: 0.18, bet_66: 0.28, bet_100: 0.42 };
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
    postflopStrategy, probeStrategy, probeStrategyLegacy, getStrategy, actionEV, bestAction, betSizingOptions
  };
})(window);
