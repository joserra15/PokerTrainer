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
    isPushPhase: isPushPhase,
    ALWAYS_SHOVE: ALWAYS_SHOVE
  };
})(typeof window !== 'undefined' ? window : globalThis);
