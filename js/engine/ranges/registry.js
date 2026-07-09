/*
 * registry.js — Selección de rangos por formato (6-max / 9-max / MTT) y profundidad (standard / short / deep).
 */
(function (global) {
  'use strict';

  const D = function () { return global.GTORangesData; };
  const V = function () { return global.GTORangesVariants; };
  const W = function () { return global.GTORangesWeights; };
  const HS = function () { return global.GTOHandStrength; };
  const N = function () { return global.GTORangesNotation; };

  const POS_9_TO_ENGINE = {
    UTG: 'UTG', UTG1: 'UTG', UTG2: 'HJ', LJ: 'HJ', HJ: 'CO', CO: 'CO', BTN: 'BTN', SB: 'SB', BB: 'BB'
  };

  const STACK_BB = { standard: 100, short: 40, deep: 150 };
  const GAME_LABELS = { cash6: 'Cash 6-max', cash9: 'Cash 9-max', mtt: 'MTT' };
  const STACK_LABELS = { standard: '100bb', short: '40bb', deep: '150bb' };

  function normalize(ctx) {
    const c = ctx || {};
    const gameType = c.gameType || 'cash6';
    const stackDepth = c.stackDepth || 'standard';
    return {
      gameType: gameType,
      stackDepth: stackDepth,
      is9Max: gameType === 'cash9' || gameType === 'mtt',
      isMtt: gameType === 'mtt',
      stackBB: STACK_BB[stackDepth] || 100
    };
  }

  function stackLabelFromBB(bb) {
    const n = Number(bb) || 100;
    if (n <= 55) return 'short';
    if (n >= 120) return 'deep';
    return 'standard';
  }

  function toEnginePos(pos) {
    return POS_9_TO_ENGINE[pos] || pos;
  }

  function vsRfiKey(heroPos, openerPos, ctx) {
    const c = normalize(ctx);
    if (c.is9Max || c.isMtt) {
      return toEnginePos(heroPos) + '_vs_' + toEnginePos(openerPos);
    }
    return heroPos + '_vs_' + openerPos;
  }

  function vsRfiPairKey(heroPos, openerPos) {
    return heroPos + '_vs_' + openerPos;
  }

  function cloneRow(row) {
    if (!row) return row;
    const out = {};
    Object.keys(row).forEach(function (k) { out[k] = row[k]; });
    return out;
  }

  function weightsToOpenRow(weights) {
    const raise = [];
    const mix = [];
    Object.keys(weights || {}).forEach(function (code) {
      const w = weights[code];
      if (w <= 0) return;
      if (w >= 0.99) raise.push(code);
      else mix.push(code);
    });
    return { raise: raise.join(', '), mix: mix.join(', ') };
  }

  function adjustOpenRow(row, stackDepth) {
    if (!row || !W() || !HS()) return row;
    if (stackDepth === 'standard') return row;
    const w = W().fromSets({ raise: row.raise, mix: row.mix });
    Object.keys(w).forEach(function (code) {
      const s = HS().handStrength01(code);
      if (stackDepth === 'short') {
        if (w[code] >= 1 && s < 0.48) w[code] = 0;
        else if (w[code] > 0 && w[code] < 1 && s < 0.55) w[code] = 0;
        else if (w[code] > 0 && w[code] < 1) w[code] *= 0.5;
      } else if (stackDepth === 'deep') {
        if (w[code] > 0 && w[code] < 1) w[code] = Math.min(1, w[code] * 1.25);
        if (w[code] >= 1 && s > 0.38 && s < 0.52) w[code] = 0.85;
      }
    });
    return weightsToOpenRow(w);
  }

  function adjustVsRfiRow(row, stackDepth) {
    if (!row || !W() || !HS()) return row;
    if (stackDepth === 'standard') return row;
    const w = W().fromSets({
      threeBet: row.threeBet,
      threeBetMix: row.threeBetMix,
      call: row.call,
      callMix: row.callMix
    });
    Object.keys(w).forEach(function (code) {
      const s = HS().handStrength01(code);
      if (stackDepth === 'short') {
        if (w[code] > 0 && w[code] < 1 && s < 0.58) w[code] = 0;
        else if (w[code] >= 1 && s < 0.42) w[code] = 0;
        else if (w[code] > 0 && w[code] < 0.99 && s < 0.52) w[code] = Math.min(1, w[code] * 1.35);
        else if (w[code] > 0 && w[code] < 1) w[code] *= 0.55;
      } else if (stackDepth === 'deep' && w[code] > 0 && w[code] < 1) {
        w[code] = Math.min(1, w[code] * 1.2);
      }
    });
    const threeBet = [];
    const threeBetMix = [];
    const call = [];
    const callMix = [];
    Object.keys(w).forEach(function (code) {
      const val = w[code];
      if (val <= 0) return;
      if (val >= 0.99) {
        if (row.threeBet && N().expand(row.threeBet).indexOf(code) >= 0) threeBet.push(code);
        else if (row.call && N().expand(row.call).indexOf(code) >= 0) call.push(code);
        else threeBet.push(code);
      } else if (val >= 0.45) {
        if (row.threeBetMix && N().expand(row.threeBetMix).indexOf(code) >= 0) threeBetMix.push(code);
        else callMix.push(code);
      } else {
        callMix.push(code);
      }
    });
    return {
      threeBet: threeBet.join(', ') || row.threeBet,
      threeBetMix: threeBetMix.join(', ') || row.threeBetMix,
      call: call.join(', ') || row.call,
      callMix: callMix.join(', ') || row.callMix
    };
  }

  function baseOpenTable(ctx) {
    const c = normalize(ctx);
    if (c.isMtt && V()) {
      if (c.stackDepth === 'short') {
        const ext = global.GTORangesExtended;
        if (ext && ext.OPEN_RAISE_MTT_PUSH) return ext.OPEN_RAISE_MTT_PUSH;
        return V().OPEN_RAISE_MTT_SHORT;
      }
      return V().OPEN_RAISE_MTT;
    }
    if (c.is9Max && V()) return V().OPEN_RAISE_9MAX;
    return D().OPEN_RAISE;
  }

  function getOpenRaiseTable(ctx) {
    const c = normalize(ctx);
    const base = baseOpenTable(c);
    const out = {};
    Object.keys(base).forEach(function (pos) {
      out[pos] = adjustOpenRow(cloneRow(base[pos]), c.stackDepth);
    });
    return out;
  }

  function getOpenRaiseRow(pos, ctx) {
    const table = getOpenRaiseTable(ctx);
    return table[pos] || table[toEnginePos(pos)] || null;
  }

  function openRangeStr(pos, ctx) {
    const row = getOpenRaiseRow(pos, ctx);
    if (!row) return '';
    return [row.raise, row.mix].filter(Boolean).join(', ');
  }

  function baseVsRfiTable(ctx) {
    const c = normalize(ctx);
    if (c.isMtt && V() && V().getVsRfiMtt) return V().getVsRfiMtt();
    if (c.is9Max && V() && V().getVsRfi9Max) return V().getVsRfi9Max();
    return D().VS_RFI;
  }

  function getVsRfiTable(ctx) {
    const c = normalize(ctx);
    const base = baseVsRfiTable(c);
    const out = {};
    Object.keys(base).forEach(function (key) {
      out[key] = adjustVsRfiRow(cloneRow(base[key]), c.stackDepth);
    });
    return out;
  }

  function getVsRfiRow(heroPos, openerPos, ctx) {
    const c = normalize(ctx);
    const table = getVsRfiTable(c);
    if (c.is9Max || c.isMtt) {
      const pairKey = vsRfiPairKey(heroPos, openerPos);
      if (table[pairKey]) return table[pairKey];
    }
    const key = vsRfiKey(heroPos, openerPos, ctx);
    return table[key] || null;
  }

  function getVs3betRow(openerPos, threeBettorPos, ctx) {
    const c = normalize(ctx);
    const key = openerPos + '_vs_' + threeBettorPos;
    const ext = global.GTORangesExtended;
    const pairs = D().VS_3BET_PAIRS || (ext && ext.VS_3BET_PAIRS);
    let row = pairs && pairs[key] ? cloneRow(pairs[key]) : null;
    if (!row) row = cloneRow(D().VS_3BET);
    return adjustVs3betRow(row, c.stackDepth);
  }

  function adjustVs3betRow(row, stackDepth) {
    if (!row || stackDepth === 'standard') return row;
    const data = cloneRow(row);
    if (stackDepth === 'short') {
      data.fourBet = widenField(data.fourBet, 'JJ');
      data.call = trimField(data.call, '99, 88, AJo, KQo');
      data.callMix = trimField(data.callMix || '', '77, 66, ATs, KJs');
    } else if (stackDepth === 'deep') {
      data.call = widenField(data.call, '88, 77, KQo');
      data.callMix = widenField(data.callMix || '', '66, 55, AJo, QJs');
    }
    return data;
  }

  function widenField(str, addCsv) {
    if (!addCsv) return str || '';
    if (!str) return addCsv;
    return str + ', ' + addCsv;
  }

  function trimField(str, removeCsv) {
    if (!str || !removeCsv) return str;
    const N = global.GTORangesNotation;
    if (!N) return str;
    const keep = N.toSet(str);
    N.expand(removeCsv).forEach(function (c) { keep.delete(c); });
    return Array.from(keep).join(', ');
  }

  function getVs3bet(ctx, openerPos, threeBettorPos) {
    if (openerPos && threeBettorPos) {
      return getVs3betRow(openerPos, threeBettorPos, ctx);
    }
    const c = normalize(ctx);
    const data = cloneRow(D().VS_3BET);
    return adjustVs3betRow(data, c.stackDepth);
  }

  function getVs4betRow(openerPos, fourBettorPos, ctx) {
    const c = normalize(ctx);
    const key = openerPos + '_vs_' + fourBettorPos;
    const pairs = D().VS_4BET_PAIRS;
    let row = pairs && pairs[key] ? cloneRow(pairs[key]) : cloneRow(D().VS_4BET);
    return adjustVs4betRow(row, c.stackDepth);
  }

  function adjustVs4betRow(row, stackDepth) {
    if (!row || stackDepth === 'standard') return row;
    const data = cloneRow(row);
    if (stackDepth === 'short') {
      data.fourBet = widenField(data.fourBet, 'QQ, AKo');
      data.call = trimField(data.call, 'JJ, TT, AQs');
    } else if (stackDepth === 'deep') {
      data.call = widenField(data.call, 'TT, 99, AJs, KQs');
      data.callMix = widenField(data.callMix || '', '88, 77');
    }
    return data;
  }

  function getVs4bet(ctx, openerPos, fourBettorPos) {
    if (openerPos && fourBettorPos) return getVs4betRow(openerPos, fourBettorPos, ctx);
    const c = normalize(ctx);
    return adjustVs4betRow(cloneRow(D().VS_4BET), c.stackDepth);
  }

  function getSqueezeRow(heroPos, openerPos, callerPos, ctx) {
    const c = normalize(ctx);
    const ext = global.GTORangesExtended;
    const key = ext && ext.squeezeKey ? ext.squeezeKey(heroPos, openerPos, callerPos)
      : heroPos + '|' + openerPos + '|' + callerPos;
    const pairs = D().SQUEEZE_PAIRS || (ext && ext.SQUEEZE_PAIRS);
    let row = pairs && pairs[key] ? cloneRow(pairs[key]) : cloneRow(D().SQUEEZE);
    return adjustSqueezeRow(row, c.stackDepth);
  }

  function adjustSqueezeRow(row, stackDepth) {
    if (!row || stackDepth === 'standard') return row;
    const data = cloneRow(row);
    if (stackDepth === 'short') {
      data.raise = widenField(data.raise, '99, AJs');
      data.callMix = trimField(data.callMix || '', '88, 77, AJo');
    } else if (stackDepth === 'deep') {
      data.call = widenField(data.call, '88, 77, AJo, KJo');
    }
    return data;
  }

  function getSqueeze(ctx, heroPos, openerPos, callerPos) {
    if (heroPos && openerPos && callerPos) {
      return getSqueezeRow(heroPos, openerPos, callerPos, ctx);
    }
    const c = normalize(ctx);
    return adjustSqueezeRow(cloneRow(D().SQUEEZE), c.stackDepth);
  }

  function getIsoLimpRow(heroPos, limperPos, ctx) {
    const pairs = D().ISO_LIMP_PAIRS;
    const key = heroPos + '_vs_' + limperPos;
    return (pairs && pairs[key]) ? cloneRow(pairs[key]) : cloneRow(D().ISO_LIMP);
  }

  function getBbVsSbLimp(ctx) {
    return cloneRow(D().BB_VS_SB_LIMP || (global.GTORangesExtended && global.GTORangesExtended.BB_VS_SB_LIMP));
  }

  function getSbLimp(ctx) {
    return cloneRow(D().SB_LIMP || (global.GTORangesExtended && global.GTORangesExtended.SB_LIMP));
  }

  function getCold4bet(ctx) {
    return cloneRow(D().COLD_4BET || (global.GTORangesExtended && global.GTORangesExtended.COLD_4BET));
  }

  function getCold3bet(ctx) {
    return cloneRow(D().COLD_3BET);
  }

  function validVs3betPairs(ctx) {
    const openers = rfiPositions(ctx);
    const ext = global.GTORangesExtended;
    const pos = ext && ext.POS6 ? ext.POS6 : ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    const ord = ext && ext.ORD6 ? ext.ORD6 : { UTG: 0, HJ: 1, CO: 2, BTN: 3, SB: 4, BB: 5 };
    const pairs = {};
    openers.forEach(function (opener) {
      pos.forEach(function (tb) {
        if ((ord[tb] || 0) > (ord[opener] || 0)) {
          if (!pairs[opener]) pairs[opener] = [];
          pairs[opener].push(tb);
        }
      });
    });
    return pairs;
  }

  function heroPositions(ctx) {
    const c = normalize(ctx);
    if (c.is9Max) return ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    return ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  }

  function rfiPositions(ctx) {
    const c = normalize(ctx);
    if (c.is9Max) return ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB'];
    return ['UTG', 'HJ', 'CO', 'BTN', 'SB'];
  }

  function contextLabel(ctx) {
    const c = normalize(ctx);
    return (GAME_LABELS[c.gameType] || c.gameType) + ' · ' + (STACK_LABELS[c.stackDepth] || c.stackDepth);
  }

  function inferFromHand(hand) {
    const n = hand && hand.seats ? hand.seats.length : 6;
    let gameType = 'cash6';
    if (hand && hand.isTournament) gameType = 'mtt';
    else if (n >= 8) gameType = 'cash9';
    let stackDepth = 'standard';
    if (hand && hand.seats && hand.bb) {
      const bb = hand.bb || 1;
      const stacks = hand.seats.map(function (s) { return (s.stack || 0) / bb; }).filter(function (x) { return x > 0; });
      if (stacks.length) {
        const avg = stacks.reduce(function (a, b) { return a + b; }, 0) / stacks.length;
        stackDepth = stackLabelFromBB(avg);
      }
    }
    return normalize({ gameType: gameType, stackDepth: stackDepth });
  }

  function attachToInput(input, ctx) {
    const c = normalize(ctx);
    input.gameType = c.gameType;
    input.stackDepthLabel = c.stackDepth;
    input.stackDepth = c.stackBB;
    input.rangeContext = c;
    return input;
  }

  global.GTORangesRegistry = {
    normalize,
    stackBB: function (ctx) { return normalize(ctx).stackBB; },
    stackLabelFromBB,
    toEnginePos,
    vsRfiKey,
    vsRfiPairKey,
    getOpenRaiseTable,
    getOpenRaiseRow,
    openRangeStr,
    getVsRfiTable,
    getVsRfiRow,
    getVs3bet,
    getVs3betRow,
    getVs4bet,
    getVs4betRow,
    getSqueeze,
    getSqueezeRow,
    getIsoLimpRow,
    getBbVsSbLimp,
    getSbLimp,
    getCold4bet,
    getCold3bet,
    validVs3betPairs,
    heroPositions,
    rfiPositions,
    contextLabel,
    inferFromHand,
    attachToInput,
    POS_9_TO_ENGINE,
    GAME_LABELS,
    STACK_LABELS,
    STACK_BB
  };
})(window);
