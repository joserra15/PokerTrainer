/*
 * pushFold.js — Charts push/fold simplificados (spins / MTT short).
 * Heurístico Nash-aprox por posición; no es una tabla solver exacta.
 */
(function (global) {
  'use strict';

  // Códigos de mano (notation) agrupados por tier de shove.
  const ALWAYS_SHOVE = [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77',
    'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'ATo',
    'KQs', 'KQo', 'KJs', 'QJs', 'JTs', 'T9s', '98s',
    'A9s', 'A8s', 'A5s', 'A4s', 'A3s', 'A2s', 'KTs', 'QTs', 'J9s'
  ];

  const WIDE_BTN = [
    '66', '55', '44', '33', '22',
    'A7s', 'A6s', 'A9o', 'A8o', 'A7o',
    'K9s', 'K8s', 'KJo', 'KTo', 'QJo', 'Q9s', 'J8s', 'T8s', '97s', '87s', '76s', '65s'
  ];

  const WIDE_SB = [
    '66', '55', '44',
    'A7s', 'A6s', 'A9o', 'A8o',
    'K9s', 'KJo', 'QJo', 'Q9s', 'J8s', 'T8s', '97s', '87s'
  ];

  const CALL_SHOVE_TIGHT = [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88',
    'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'KQs', 'KQo', 'KJs'
  ];

  const CALL_SHOVE_WIDE = CALL_SHOVE_TIGHT.concat([
    '77', '66', 'A9s', 'A8s', 'A5s', 'ATo', 'KTs', 'QJs', 'JTs', 'T9s'
  ]);

  function setFrom(list) {
    const o = Object.create(null);
    (list || []).forEach(function (c) { o[c] = 1; });
    return o;
  }

  const SET_ALWAYS = setFrom(ALWAYS_SHOVE);
  const SET_BTN = setFrom(ALWAYS_SHOVE.concat(WIDE_BTN));
  const SET_SB = setFrom(ALWAYS_SHOVE.concat(WIDE_SB));
  const SET_CALL_T = setFrom(CALL_SHOVE_TIGHT);
  const SET_CALL_W = setFrom(CALL_SHOVE_WIDE);

  /** ~20 bb steal: shove con valor; open min con el resto del rango GTO. */
  const STEAL_SHOVE_BTN = setFrom([
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88',
    'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'ATo',
    'KQs', 'KQo'
  ]);
  const STEAL_SHOVE_SB = setFrom([
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99',
    'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'ATs', 'KQs'
  ]);

  function openShoveWeights(pos, stackBB) {
    const bb = Number(stackBB) || 10;
    let base = SET_ALWAYS;
    if (pos === 'BTN' || pos === 'CO' || pos === 'HJ') base = bb <= 12 ? SET_BTN : SET_ALWAYS;
    else if (pos === 'SB') base = bb <= 14 ? SET_SB : SET_ALWAYS;
    else if (pos === 'BB') base = SET_ALWAYS;
    else base = bb <= 10 ? SET_SB : SET_ALWAYS;

    const out = {};
    Object.keys(base).forEach(function (code) {
      out[code] = 1;
    });
    // En stacks ultra-cortos, ensanchar un poco más BTN/SB
    if (bb <= 8 && (pos === 'BTN' || pos === 'SB')) {
      ['54s', '64s', 'K7s', 'Q8s', 'J7s', 'T7s'].forEach(function (c) { out[c] = 0.7; });
    }
    return out;
  }

  function callShoveWeights(pos, stackBB, openerPos) {
    const bb = Number(stackBB) || 10;
    const wide = bb <= 12 || openerPos === 'BTN' || openerPos === 'SB';
    const base = wide ? SET_CALL_W : SET_CALL_T;
    const out = {};
    Object.keys(base).forEach(function (code) { out[code] = 1; });
    if (pos === 'BB' && openerPos === 'SB' && bb <= 15) {
      ['77', '66', 'A9s', 'A8s', 'A5s', 'KTs', 'QJs'].forEach(function (c) { out[c] = 1; });
    }
    return out;
  }

  function shouldOpenShove(handCode, pos, stackBB) {
    const w = openShoveWeights(pos, stackBB);
    return (w[handCode] || 0) >= 0.5;
  }

  function shouldCallShove(handCode, pos, stackBB, openerPos) {
    const w = callShoveWeights(pos, stackBB, openerPos);
    return (w[handCode] || 0) >= 0.5;
  }

  function openRangeTier(code, pos, ctx) {
    const RR = global.GTORangesRegistry;
    const N = global.GTORangesNotation;
    const D = global.GTORangesData;
    const data = RR && ctx ? RR.getOpenRaiseRow(pos, ctx) : (D && D.OPEN_RAISE ? D.OPEN_RAISE[pos] : null);
    if (!data) return 'fold';
    const raiseSet = N.toSet(data.raise);
    const mixSet = N.toSet(data.mix);
    if (raiseSet.has(code)) return 'raise';
    if (mixSet.has(code)) return 'mix';
    return 'fold';
  }

  /** Manos de steal mid que el chart short ajustado puede tirar (p. ej. 76s). */
  const STEAL_OPEN_BTN = setFrom([
    'Q9o', 'Q8o', 'J9o', 'T9o', 'K9o',
    '87s', '76s', '65s', '97s', '86s', 'T8s', 'J8s'
  ]);
  const STEAL_OPEN_SB = setFrom([
    'QTs', 'QJo', 'QTo', 'KTo', 'KJo', 'JTs', 'T9s', 'A9s', 'K9s', 'A8s'
  ]);
  const STEAL_OPEN_CO = setFrom([
    'QTo', 'KTo', 'J9s', 'T9s', '98s', '87s', 'A9s'
  ]);

  function stealOpenExtraSet(pos) {
    if (pos === 'BTN') return STEAL_OPEN_BTN;
    if (pos === 'SB') return STEAL_OPEN_SB;
    if (pos === 'CO') return STEAL_OPEN_CO;
    return null;
  }

  function stealShoveSet(pos) {
    return pos === 'SB' ? STEAL_SHOVE_SB : STEAL_SHOVE_BTN;
  }

  /** Steal ~15–25 bb: premium → shove; medio GTO → open min; resto fold. */
  function stealOpenStrategy(input) {
    const code = input.handCode;
    const pos = input.position || input.heroPos || 'BTN';
    const shoveSet = stealShoveSet(pos);
    const ctx = input.rangeContext || null;
    if (shoveSet[code]) {
      return { fold: 0.1, raise: 0.05, allin: 0.85, call: 0 };
    }
    const tier = openRangeTier(code, pos, ctx);
    if (tier === 'raise') return { fold: 0.12, raise: 0.83, allin: 0.05, call: 0 };
    // En steal el mix se ejecuta como open (no como coin-flip fold/raise).
    if (tier === 'mix') return { fold: 0.28, raise: 0.67, allin: 0.05, call: 0 };
    const extra = stealOpenExtraSet(pos);
    if (extra && extra[code]) return { fold: 0.22, raise: 0.73, allin: 0.05, call: 0 };
    return { fold: 0.96, raise: 0.03, allin: 0.01, call: 0 };
  }

  /** Defensa BB/SB vs steal ~20 bb: 3-bet shove en lugar de 3-bet pequeño. */
  function stealDefenseStrategy(input) {
    const code = input.handCode;
    const pos = input.position || input.heroPos || 'BB';
    const openerPos = input.vsPosition || input.openerPos || 'BTN';
    const RR = global.GTORangesRegistry;
    const N = global.GTORangesNotation;
    const D = global.GTORangesData;
    const ctx = input.rangeContext || (RR ? RR.normalize(input) : null);
    let data = null;
    if (RR && ctx) data = RR.getVsRfiRow(pos, openerPos, ctx);
    if (!data) {
      const key = input.vsRfiKey || (pos + '_vs_' + openerPos);
      data = D && D.VS_RFI ? D.VS_RFI[key] : null;
    }
    if (data) {
      const tb = N.toSet(data.threeBet);
      const tbMix = N.toSet(data.threeBetMix);
      const callSet = N.toSet(data.call);
      const callMix = N.toSet(data.callMix || '');
      if (tb.has(code)) return { fold: 0.08, call: 0.04, allin: 0.88, raise: 0 };
      if (tbMix.has(code)) {
        return callSet.has(code)
          ? { fold: 0.32, call: 0.38, allin: 0.3, raise: 0 }
          : { fold: 0.42, call: 0.08, allin: 0.5, raise: 0 };
      }
      if (callSet.has(code)) return { fold: 0.14, call: 0.82, allin: 0.04, raise: 0 };
      if (callMix.has(code)) return { fold: 0.52, call: 0.44, allin: 0.04, raise: 0 };
      return { fold: 0.94, call: 0.05, allin: 0.01, raise: 0 };
    }
    const stack = Number(input.effStack || input.stackDepth) || 20;
    if (shouldCallShove(code, pos, stack, openerPos)) {
      return { fold: 0.18, call: 0.72, allin: 0.1, raise: 0 };
    }
    return { fold: 0.92, call: 0.06, allin: 0.02, raise: 0 };
  }

  function isStealPhase(config) {
    const bb = Number(config && (config.stackBB || config.effStack || config.stackDepth)) || 100;
    const sc = config && config.scenario;
    if (sc === 'steal') return bb >= 14 && bb <= 25;
    if (sc === '3bet' && bb >= 14 && bb <= 25) {
      const hub = config.formatHub || '';
      return hub === 'spin' || hub === 'mtt';
    }
    return false;
  }

  /** Frecuencias preflop simplificadas para nodos push. */
  function pushFoldStrategy(input) {
    const code = input.handCode;
    const pos = input.position || input.heroPos || 'BTN';
    const stack = Number(input.effStack || input.stackDepth) || 10;
    const toCall = Number(input.toCallBB) || 0;
    if (toCall > 0) {
      const ok = shouldCallShove(code, pos, stack, input.openerPos || 'BTN');
      return ok
        ? { call: 0.85, fold: 0.15, raise: 0 }
        : { call: 0.08, fold: 0.92, raise: 0 };
    }
    const shove = shouldOpenShove(code, pos, stack);
    return shove
      ? { raise: 0.9, fold: 0.1, call: 0, allin: 0.9 }
      : { raise: 0.05, fold: 0.95, call: 0 };
  }

  function isPushPhase(config) {
    const Tax = global.PTFormatTaxonomy;
    if (!Tax) {
      const bb = Number(config && (config.stackBB || config.effStack)) || 100;
      return bb <= 12;
    }
    const phase = Tax.resolvePhase(config);
    return phase === 'push' || (Number(config && config.stackBB) || 100) <= 12;
  }

  global.GTOPushFold = {
    openShoveWeights: openShoveWeights,
    callShoveWeights: callShoveWeights,
    shouldOpenShove: shouldOpenShove,
    shouldCallShove: shouldCallShove,
    pushFoldStrategy: pushFoldStrategy,
    stealOpenStrategy: stealOpenStrategy,
    stealDefenseStrategy: stealDefenseStrategy,
    isPushPhase: isPushPhase,
    isStealPhase: isStealPhase,
    ALWAYS_SHOVE: ALWAYS_SHOVE
  };
})(typeof window !== 'undefined' ? window : globalThis);
