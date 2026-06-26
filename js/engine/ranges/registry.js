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
    return toEnginePos(heroPos) + '_vs_' + toEnginePos(openerPos);
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
    if (!row || stackDepth === 'standard' || !W() || !HS()) return row;
    const w = W().fromSets({ raise: row.raise, mix: row.mix });
    Object.keys(w).forEach(function (code) {
      const s = HS().handStrength01(code);
      if (stackDepth === 'short') {
        if (w[code] >= 1 && s < 0.42) w[code] = 0;
        else if (w[code] > 0 && w[code] < 1 && s < 0.5) w[code] = 0;
        else if (w[code] > 0 && w[code] < 1) w[code] *= 0.65;
      } else if (stackDepth === 'deep') {
        if (w[code] > 0 && w[code] < 1) w[code] = Math.min(1, w[code] * 1.2);
      }
    });
    return weightsToOpenRow(w);
  }

  function adjustVsRfiRow(row, stackDepth) {
    if (!row || stackDepth === 'standard' || !W() || !HS()) return row;
    const w = W().fromSets({
      threeBet: row.threeBet,
      threeBetMix: row.threeBetMix,
      call: row.call,
      callMix: row.callMix
    });
    Object.keys(w).forEach(function (code) {
      const s = HS().handStrength01(code);
      if (stackDepth === 'short') {
        if (w[code] > 0 && w[code] < 1 && s < 0.55) w[code] = 0;
        else if (w[code] >= 1 && s < 0.38) w[code] = 0;
        else if (w[code] > 0 && w[code] < 1) w[code] *= 0.7;
      } else if (stackDepth === 'deep' && w[code] > 0 && w[code] < 1) {
        w[code] = Math.min(1, w[code] * 1.15);
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
    if (c.isMtt && V()) return V().OPEN_RAISE_MTT;
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

  function getVsRfiTable(ctx) {
    const c = normalize(ctx);
    const base = D().VS_RFI;
    const out = {};
    Object.keys(base).forEach(function (key) {
      out[key] = adjustVsRfiRow(cloneRow(base[key]), c.stackDepth);
    });
    return out;
  }

  function getVsRfiRow(heroPos, openerPos, ctx) {
    const key = vsRfiKey(heroPos, openerPos, ctx);
    return getVsRfiTable(ctx)[key] || null;
  }

  function getVs3bet(ctx) {
    const c = normalize(ctx);
    const data = cloneRow(D().VS_3BET);
    if (c.stackDepth === 'short') {
      data.fourBet = 'QQ+, AKs, AKo, JJ';
      data.call = 'TT, 99, AQs, AJs';
      data.callMix = '88, ATs, KQs, AQo';
    } else if (c.stackDepth === 'deep') {
      data.call = 'JJ, TT, 99, 88, AQs, AJs, KQs, AQo, KQo';
      data.callMix = '77, 66, ATs, KJs, QJs, AJo';
    }
    return data;
  }

  function getVs4bet(ctx) { return D().VS_4BET; }
  function getSqueeze(ctx) { return D().SQUEEZE; }

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
    getOpenRaiseTable,
    getOpenRaiseRow,
    openRangeStr,
    getVsRfiTable,
    getVsRfiRow,
    getVs3bet,
    getVs4bet,
    getSqueeze,
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
