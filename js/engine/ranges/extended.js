/*
 * extended.js — Rangos posicionales ampliados (vs 3-bet, squeeze, iso, blind war, cold 4-bet, MTT push).
 */
(function (global) {
  'use strict';

  var POS6 = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  var ORD6 = { UTG: 0, HJ: 1, CO: 2, BTN: 3, SB: 4, BB: 5 };

  var BASE_VS_3BET = {
    fourBet: 'QQ+, AKs, AKo',
    call: 'JJ, TT, 99, AQs, AJs, KQs, AQo',
    callMix: '88, 77, ATs, KJs, QJs, AJo, KQo'
  };

  var BASE_VS_4BET = {
    fourBet: 'KK+, AKs',
    call: 'QQ, JJ, AKo, AQs',
    callMix: 'TT, 99, AJs, KQs'
  };

  function cloneRow(row) {
    if (!row) return null;
    var out = {};
    Object.keys(row).forEach(function (k) { out[k] = row[k]; });
    return out;
  }

  function vs3betTemplate(opener, tb) {
    var o = ORD6[opener];
    var t = ORD6[tb];
    var blind = tb === 'SB' || tb === 'BB';
    var epOpen = o <= 1;
    var lpOpen = o >= 3;
    var row = cloneRow(BASE_VS_3BET);
    if (epOpen && blind) {
      row.fourBet = 'QQ+, AKs, AKo';
      row.call = 'JJ, TT, AQs, AJs, KQs';
      row.callMix = '99, 88, ATs, AQo';
    } else if (epOpen && !blind) {
      row.fourBet = 'QQ+, AKs, AKo';
      row.call = 'JJ, TT, 99, AQs, AJs, KQs, AQo';
      row.callMix = '88, ATs, KJs, AJo';
    } else if (lpOpen && blind) {
      row.fourBet = 'JJ+, AKs, AKo, A5s';
      row.call = 'TT, 99, AQs, AJs, ATs, KQs, KJs, QJs, AQo, AJo';
      row.callMix = '88, 77, 66, KQo, KJo, QJo';
    } else if (lpOpen) {
      row.fourBet = 'JJ+, AKs, AKo, A5s, A4s';
      row.call = 'TT, 99, 88, AQs, AJs, ATs, KQs, KJs, QJs, AQo, AJo, KQo';
      row.callMix = '77, 66, 55, T9s, 98s, KJo, QJo';
    } else if (blind) {
      row.fourBet = 'QQ+, AKs, AKo, A5s';
      row.call = 'JJ, TT, 99, AQs, AJs, KQs, AQo';
      row.callMix = '88, 77, ATs, KJs, QJs, AJo, KQo';
    }
    if (tb === 'BB' && o <= 2) {
      row.fourBet = 'KK+, AKs, AKo';
      row.callMix = 'JJ, TT, 99, AQs, AJs, ATs, KQs, AQo';
    }
    if (opener === 'SB' && tb === 'BB') {
      row.fourBet = 'TT+, AQs+, AKo, A5s-A2s';
      row.call = '99, 88, 77, AJs, ATs, KQs, KJs, QJs, AJo, KQo';
      row.callMix = '66, 55, 44, T9s, 98s, KJo, QJo';
    }
    return row;
  }

  function buildVs3betPairs() {
    var out = {};
    for (var oi = 0; oi < POS6.length - 1; oi++) {
      for (var ti = oi + 1; ti < POS6.length; ti++) {
        var opener = POS6[oi];
        var tb = POS6[ti];
        out[opener + '_vs_' + tb] = vs3betTemplate(opener, tb);
      }
    }
    return out;
  }

  function vs4betTemplate(opener, tb) {
    var blind = tb === 'SB' || tb === 'BB';
    var row = cloneRow(BASE_VS_4BET);
    if (blind) {
      row.fourBet = 'KK+, AKs';
      row.call = 'QQ, JJ, AKo, AQs';
      row.callMix = 'TT, AJs, KQs';
    } else if (ORD6[opener] >= 3) {
      row.fourBet = 'QQ+, AKs, AKo';
      row.call = 'JJ, TT, AQs, AJs, KQs, AKo';
      row.callMix = '99, 88, ATs, KQo';
    }
    return row;
  }

  function buildVs4betPairs() {
    var out = {};
    for (var oi = 0; oi < POS6.length - 1; oi++) {
      for (var ti = oi + 1; ti < POS6.length; ti++) {
        out[POS6[oi] + '_vs_' + POS6[ti]] = vs4betTemplate(POS6[oi], POS6[ti]);
      }
    }
    return out;
  }

  var BASE_SQUEEZE = {
    raise: 'TT+, AQs+, AKo, A5s-A2s',
    call: '99-JJ, AJs, ATs, KQs, KJs, QJs, JTs, T9s, 98s, AQo',
    callMix: '88, 77, AJo, KQo, KJo'
  };

  var SQUEEZE_PAIR_KEYS = [
    'BB|CO|BTN', 'BB|HJ|CO', 'BB|HJ|BTN', 'BB|UTG|CO',
    'BB|UTG|HJ', 'BB|BTN|SB', 'SB|CO|BTN',
    'SB|HJ|CO', 'SB|UTG|CO', 'BTN|UTG|HJ', 'BTN|HJ|CO', 'BTN|UTG|CO',
    'CO|UTG|HJ'
  ];

  function squeezeTemplate(hero, opener, caller) {
    var row = cloneRow(BASE_SQUEEZE);
    var ep = ORD6[opener] <= 1;
    var lp = ORD6[opener] >= 3;
    if (hero === 'BB' && ep) {
      row.raise = 'JJ+, AQs+, AKo, A5s-A3s';
      row.call = 'TT, 99, AJs, ATs, KQs, KJs, QJs, AQo';
      row.callMix = '88, 77, AJo, KQo';
    } else if (hero === 'BB' && lp) {
      row.raise = '99+, AJs+, AKo, A5s-A2s, KQs';
      row.call = '88-JJ, ATs, KJs, QJs, JTs, T9s, 98s, AQo, AJo, KQo';
      row.callMix = '77, 66, KJo, QJo, T9o';
    } else if (hero === 'BTN' || hero === 'CO') {
      row.raise = 'TT+, AQs+, AKo, A5s-A2s';
      row.callMix = '99, 88, AJs, ATs, KQs, KJs, AJo, KQo, KJo';
    } else if (hero === 'SB') {
      row.raise = 'TT+, AQs+, AKo, A5s-A4s';
      row.callMix = '99, 88, AJs, ATs, KQs, AJo, KQo';
    }
    if (caller === 'SB' && hero === 'BB') {
      row.raise = '99+, ATs+, KJs+, AJo+, A5s-A2s';
    }
    return row;
  }

  function buildSqueezePairs() {
    var out = {};
    SQUEEZE_PAIR_KEYS.forEach(function (k) {
      var p = k.split('|');
      out[k] = squeezeTemplate(p[0], p[1], p[2]);
    });
    return out;
  }

  var ISO_LIMP_PAIR_KEYS = [
    'CO|UTG', 'CO|HJ', 'BTN|UTG', 'BTN|HJ', 'BTN|CO',
    'SB|CO', 'SB|BTN', 'BB|SB', 'HJ|UTG'
  ];

  var BASE_ISO = {
    raise: '88+, A9s+, A5s-A2s, KTs+, QTs+, JTs, AJo+, KQo',
    callMix: '66-77, A8s, ATo, KJo, QJo, JTo, T9s, 98s',
    fold: '22-55, A2o-A7o, K9o-, Q9o-, J9o-'
  };

  function isoTemplate(hero, limper) {
    var row = cloneRow(BASE_ISO);
    if (ORD6[limper] <= 1) {
      row.raise = '99+, AJs+, A5s-A2s, KQs, KJs, QJs, AJo+, KQo';
      row.callMix = '88, 77, ATs, ATo, KJo, QJo, T9s';
    } else if (hero === 'BB' && limper === 'SB') {
      row.raise = '77+, A8s+, A5s-A2s, KTs+, QTs+, JTs, T9s, ATo+, KJo+, QJo';
      row.callMix = '66, 55, 44, A9s, 98s, 87s, JTo';
      row.fold = '22-33, A2o-A7o, K9o-, Q9o-';
    } else if (ORD6[hero] >= 3) {
      row.raise = '77+, A7s+, A5s-A2s, K9s+, Q9s+, J9s+, T9s, 98s, A9o+, KTo+, QTo+, JTo';
      row.callMix = '66, 55, A8s, A6o, K9o, Q9o';
    }
    return row;
  }

  function buildIsoLimpPairs() {
    var out = {};
    ISO_LIMP_PAIR_KEYS.forEach(function (k) {
      var p = k.split('|');
      out[p[0] + '_vs_' + p[1]] = isoTemplate(p[0], p[1]);
    });
    return out;
  }

  var BB_VS_SB_LIMP = {
    raise: '77+, A8s+, A5s-A2s, KTs+, QTs+, JTs, T9s, 98s, ATo+, KJo+, QJo',
    callMix: '66, 55, 44, A9s, A7s, 87s, 76s, A9o, KTo, QTo, JTo',
    check: '22-33, A6s-A2s, K9s-K2s, Q9s-Q5s, J9s-J6s, T8s-T6s, 97s, 86s, 75s, 65s, 54s, A8o-A2o, K9o-K8o, Q9o, J9o, T9o, 98o'
  };

  var SB_LIMP = {
    raise: '22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, A7o+, K9o+, QTo+, JTo',
    limp: '22-99, A2s-A9s, K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, ATo-AJo, KJo, QJo, JTo',
    limpMix: 'A2o-A6o, K8o, Q9o, T9o, 98o'
  };

  var COLD_4BET = {
    raise: 'QQ+, AKs, AKo, A5s',
    call: 'JJ, TT, AQs, AJs, KQs',
    callMix: '99, 88, ATs, KJs, AQo, AJo',
    fold: '77-, A9s-A2s, KTs-, QTs-, JTs-, ATo-, KJo-'
  };

  var VS_RFI_9MAX_EXTENDED = {
    HJ_vs_UTG1: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, AQs, A5s, KQs',
      call: 'TT, 99, AJs, ATs, KJs, QJs, AQo',
      callMix: '88, 77, KTs, T9s, AJo, KJo'
    },
    CO_vs_UTG1: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, TT, AQs, A5s, KJs',
      call: '99, 88, AJs, ATs, KQs, QJs, JTs, AQo, AJo',
      callMix: '77, 66, KTs, T9s, 98s, KJo'
    },
    CO_vs_UTG2: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, AQs, A5s-A4s, KQs, KJs',
      call: 'TT, 99, AJs, ATs, QJs, JTs, T9s, 98s, AQo',
      callMix: '88, 77, KTs, AJo, KJo, KQo'
    },
    BTN_vs_UTG1: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, AQs, A5s, A4s, KJs',
      call: 'TT-22, AJs, ATs, KQs, KJs, QJs, JTs, T9s, 98s, AQo, KQo',
      callMix: 'AJo, KJo'
    },
    BTN_vs_UTG2: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, TT, AQs, AJs, A5s-A3s, KQs, KJs',
      call: '99-22, ATs, KTs+, QTs+, JTs, T9s, 98s, 87s, AQo, AJo, KQo',
      callMix: 'KJo, QJo'
    },
    BTN_vs_LJ: {
      threeBet: 'JJ+, AQs+, AKo',
      threeBetMix: 'TT, 99, AJs, ATs, A5s-A2s, KQs, KJs, QJs, A5o',
      call: '88-22, A9s, K9s+, Q9s+, J9s, T9s, 98s, 87s, 76s, AJo, KQo, QJo',
      callMix: 'KJo, T9o'
    },
    SB_vs_UTG1: {
      threeBet: 'TT+, AQs+, AKo',
      threeBetMix: '99, AJs, A5s, A4s, KQs',
      call: '88-22, ATs, KJs, QJs, JTs, T9s, 98s',
      callMix: 'AJo, KQo'
    },
    SB_vs_LJ: {
      threeBet: 'TT+, AQs+, AKo',
      threeBetMix: '99, 88, AJs, ATs, A5s-A3s, KJs, KQs',
      call: '77-22, KTs, QTs, JTs, T9s, 98s, AJo, KQo',
      callMix: 'KJo, QJo'
    },
    BB_vs_LJ: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, TT, AQs, A5s, A4s, A3s, KJs, KTs',
      call: '22-JJ, A2s-AQs, K8s+, Q8s+, J8s+, T8s+, 98s, 87s, 76s, 65s, 54s, ATo+, KJo+, QJo, JTo'
    },
    BB_vs_UTG1: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, AQs, A5s, A4s, KJs',
      call: '22-JJ, A2s-AQs, K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s, AJo+, KQo, KJo, QJo'
    },
    BB_vs_UTG2: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, TT, AQs, A5s, A4s, A3s, KJs, KTs',
      call: '22-JJ, A2s-AQs, K8s+, Q8s+, J8s+, T8s+, 98s, 87s, 76s, 65s, 54s, ATo+, KJo+, QJo, JTo'
    }
  };

  var OPEN_RAISE_MTT_PUSH = {
    UTG: { raise: 'TT+, AQs+, AKo', mix: '99, 88, ATs, KQs, AJo' },
    HJ: { raise: '99+, AJs+, KQs, AJo+, KQo', mix: '88, 77, ATs, KJs, QJs, ATo' },
    CO: { raise: '77+, A9s+, A5s-A2s, KTs+, QJs, JTs, ATo+, KJo+', mix: '66, 55, 98s, 87s, K9s' },
    BTN: { raise: '66+, A8s+, A5s-A2s, K9s+, Q9s+, J9s+, T9s, 98s, A9o+, KTo+, QTo+', mix: '55, 44, 87s, 76s, A8o' },
    SB: { raise: '88+, ATs+, KJs+, QJs, AJo+, KQo', mix: '77, 66, A9s, KTs, T9s, ATo' }
  };

  var VS_3BET_PAIRS = buildVs3betPairs();
  var VS_4BET_PAIRS = buildVs4betPairs();
  var SQUEEZE_PAIRS = buildSqueezePairs();
  var ISO_LIMP_PAIRS = buildIsoLimpPairs();

  function allVs3betPairKeys() { return Object.keys(VS_3BET_PAIRS); }
  function allVs4betPairKeys() { return Object.keys(VS_4BET_PAIRS); }
  function allSqueezePairKeys() { return SQUEEZE_PAIR_KEYS.slice(); }
  function allIsoLimpPairKeys() { return ISO_LIMP_PAIR_KEYS.map(function (k) { return k.replace('|', '_vs_'); }); }

  function parseSqueezeKey(key) {
    var p = String(key || '').split('|');
    if (p.length < 3) return null;
    return { heroPos: p[0], openerPos: p[1], callerPos: p[2] };
  }

  function squeezeKey(hero, opener, caller) {
    return hero + '|' + opener + '|' + caller;
  }

  global.GTORangesExtended = {
    VS_3BET_PAIRS: VS_3BET_PAIRS,
    VS_4BET_PAIRS: VS_4BET_PAIRS,
    SQUEEZE_PAIRS: SQUEEZE_PAIRS,
    ISO_LIMP_PAIRS: ISO_LIMP_PAIRS,
    BB_VS_SB_LIMP: BB_VS_SB_LIMP,
    SB_LIMP: SB_LIMP,
    COLD_4BET: COLD_4BET,
    VS_RFI_9MAX_EXTENDED: VS_RFI_9MAX_EXTENDED,
    OPEN_RAISE_MTT_PUSH: OPEN_RAISE_MTT_PUSH,
    SQUEEZE_PAIR_KEYS: SQUEEZE_PAIR_KEYS,
    ISO_LIMP_PAIR_KEYS: ISO_LIMP_PAIR_KEYS,
    allVs3betPairKeys: allVs3betPairKeys,
    allVs4betPairKeys: allVs4betPairKeys,
    allSqueezePairKeys: allSqueezePairKeys,
    allIsoLimpPairKeys: allIsoLimpPairKeys,
    parseSqueezeKey: parseSqueezeKey,
    squeezeKey: squeezeKey,
    POS6: POS6,
    ORD6: ORD6
  };

  if (global.GTORangesData) {
    var D = global.GTORangesData;
    D.VS_3BET_PAIRS = VS_3BET_PAIRS;
    D.VS_4BET_PAIRS = VS_4BET_PAIRS;
    D.SQUEEZE_PAIRS = SQUEEZE_PAIRS;
    D.ISO_LIMP_PAIRS = ISO_LIMP_PAIRS;
    D.BB_VS_SB_LIMP = BB_VS_SB_LIMP;
    D.SB_LIMP = SB_LIMP;
    D.COLD_4BET = COLD_4BET;
    D.VS_3BET_PAIR_KEYS = allVs3betPairKeys();
    D.VS_4BET_PAIR_KEYS = allVs4betPairKeys();
  }
})(window);
