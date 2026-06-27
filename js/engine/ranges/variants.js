/*
 * variants.js — Tablas de rangos por formato (9-max, MTT) y profundidad base.
 */
(function (global) {
  'use strict';

  const POS_9 = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const ENG = {
    UTG: 'UTG', UTG1: 'UTG', UTG2: 'HJ', LJ: 'HJ', HJ: 'CO', CO: 'CO', BTN: 'BTN', SB: 'SB', BB: 'BB'
  };
  const ORD6 = { UTG: 0, HJ: 1, CO: 2, BTN: 3, SB: 4, BB: 5 };

  /** MTT ~60-100bb: opens más tight que cash. */
  const OPEN_RAISE_MTT = {
    UTG: { raise: '77+, ATs+, KQs, AJo+, KQo', mix: '66, A5s-A2s, KJs, QJs' },
    HJ: { raise: '66+, A9s+, A5s-A2s, KTs+, QTs+, JTs, ATo+, KJo+', mix: '55, K9s, Q9s, 98s' },
    CO: { raise: '55+, A5s+, K9s+, Q9s+, J9s+, T9s, 98s, A9o+, KTo+, QTo+', mix: '44, A4s-A2s, 87s, K9o' },
    BTN: { raise: '44+, A2s+, K7s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, A7o+, K9o+, Q9o+, J9o+', mix: '33, 65s, A5o-A2o' },
    SB: { raise: '55+, A5s+, K8s+, Q9s+, J9s+, T9s, 98s, A8o+, KTo+, QTo+', mix: '44, A4s-A2s, 87s, JTo' }
  };

  /** MTT ~25-40bb: push/fold más agresivo en EP. */
  const OPEN_RAISE_MTT_SHORT = {
    UTG: { raise: '99+, AQs+, AKo', mix: '88, 77, ATs, KQs, AJo' },
    HJ: { raise: '88+, ATs+, KQs, AJo+, KQo', mix: '77, 66, A9s, KJs, QJs, ATo' },
    CO: { raise: '66+, A9s+, A5s-A2s, KTs+, QTs+, JTs, ATo+, KJo+', mix: '55, 98s, 87s, K9s' },
    BTN: { raise: '55+, A5s+, K9s+, Q9s+, J9s+, T9s, 98s, A9o+, KTo+, QTo+', mix: '44, A4s-A2s, 87s, 76s, A8o' },
    SB: { raise: '66+, A8s+, KTs+, QJs, JTs, T9s, ATo+, KJo+', mix: '55, A5s-A7s, 98s, K9s, QTo' }
  };

  /** Cash 9-max: progresión más tight en EP. */
  const OPEN_RAISE_9MAX = {
    UTG: { raise: '88+, ATs+, KQs, AJo+, KQo', mix: '77, A5s-A4s, KJs, QJs' },
    UTG1: { raise: '77+, ATs+, KJs+, QJs, AJo+, KQo', mix: '66, A5s-A2s, KTs, JTs' },
    UTG2: { raise: '66+, A9s+, A5s-A2s, KTs+, QTs+, JTs, ATo+, KJo+', mix: '55, K9s, Q9s, 98s' },
    LJ: { raise: '55+, A8s+, A5s-A2s, K9s+, Q9s+, J9s+, T9s, A9o+, KTo+, QJo', mix: '44, 98s, 87s, A8o' },
    HJ: { raise: '22+, A9s+, A5s-A2s, KTs+, QTs+, JTs, T9s, 98s, 87s, 76s, 65s, ATo+, KJo+, QJo', mix: 'A8s, K9s, Q9s, J9s, 54s, KTo' },
    CO: { raise: '22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 97s+, 87s, 76s, 65s, 54s, A9o+, KTo+, QTo+, JTo', mix: 'K8s, Q8s, J8s, 86s, A8o, K9o' },
    BTN: { raise: '22+, A2s+, K5s+, Q7s+, J7s+, T7s+, 96s+, 86s+, 75s+, 64s+, 54s, 43s, A2o+, K8o+, Q9o+, J9o+, T9o', mix: 'K2s-K4s, Q5s, Q6s, 53s, K7o, Q8o' },
    SB: { raise: '22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, A7o+, K9o+, QTo+, JTo', mix: 'K2s-K5s, Q6s, Q7s, J7s, 64s, A2o-A6o' }
  };

  /** Spots 9-max EP vs EP no presentes en tablas 6-max. */
  const VS_RFI_9MAX_OVERRIDES = {
    UTG1_vs_UTG: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, AQs, A5s',
      call: 'TT, 99, AJs, ATs, KQs, AQo',
      callMix: '88, 77, KJs, QJs, AJo'
    },
    UTG2_vs_UTG: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, TT, AQs, A5s-A4s, KQs',
      call: '99, 88, AJs, ATs, KJs, QJs, AQo, AJo',
      callMix: '77, 66, KTs, T9s, 98s'
    },
    UTG2_vs_UTG1: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, AQs, A5s, KQs',
      call: 'TT, 99, AJs, ATs, KJs, QJs, AQo',
      callMix: '88, 77, KTs, T9s, AJo, KJo'
    },
    LJ_vs_UTG2: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, TT, AQs, A5s, KQs, KJs',
      call: '99-22, ATs+, KTs+, QTs+, JTs, T9s, 98s, AQo, AJo',
      callMix: 'KJo, QJo, KQo'
    },
    LJ_vs_UTG1: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, AQs, A5s, KJs',
      call: 'TT-22, AJs+, ATs, KQs, KJs, QJs, JTs, T9s, 98s, AQo',
      callMix: 'AJo, KJo, KQo'
    },
    LJ_vs_UTG: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, AQs, A5s, KJs',
      call: 'TT-22, AJs+, ATs, KQs, KJs, QJs, JTs, T9s, 98s, AQo',
      callMix: 'AJo, KJo'
    }
  };

  function cloneRow(row) {
    if (!row) return null;
    const out = {};
    Object.keys(row).forEach(function (k) { out[k] = row[k]; });
    return out;
  }

  function pickBaseVsRfi(base, hero, villain) {
    const eh = ENG[hero];
    const ev = ENG[villain];
    if (ORD6[eh] > ORD6[ev]) {
      const direct = base[eh + '_vs_' + ev];
      if (direct) return cloneRow(direct);
    }
    var vOrd;
    for (vOrd = ORD6[ev]; vOrd >= 0; vOrd--) {
      var evName = null;
      Object.keys(ORD6).forEach(function (k) { if (ORD6[k] === vOrd) evName = k; });
      if (ORD6[eh] > vOrd && base[eh + '_vs_' + evName]) return cloneRow(base[eh + '_vs_' + evName]);
    }
    var hOrd;
    for (hOrd = ORD6[eh] + 1; hOrd <= 5; hOrd++) {
      var ehName = null;
      Object.keys(ORD6).forEach(function (k) { if (ORD6[k] === hOrd) ehName = k; });
      if (ORD6[ehName] > ORD6[ev] && base[ehName + '_vs_' + ev]) return cloneRow(base[ehName + '_vs_' + ev]);
    }
    if (hero === 'BB') return cloneRow(base.BB_vs_UTG || base.BB_vs_BTN);
    if (hero === 'SB') return cloneRow(base.SB_vs_UTG || base.SB_vs_BTN);
    if (hero === 'BTN') return cloneRow(base.BTN_vs_CO || base.BTN_vs_UTG);
    if (hero === 'CO') return cloneRow(base.CO_vs_HJ || base.CO_vs_UTG);
    return cloneRow(base.HJ_vs_UTG);
  }

  /** Genera todas las parejas hero/villain válidas en 9-max (36 spots). */
  function buildVsRfi9Max(base) {
    const out = {};
    Object.keys(VS_RFI_9MAX_OVERRIDES).forEach(function (k) {
      out[k] = cloneRow(VS_RFI_9MAX_OVERRIDES[k]);
    });
    for (var vi = 0; vi < POS_9.length - 1; vi++) {
      for (var hi = vi + 1; hi < POS_9.length; hi++) {
        var hero = POS_9[hi];
        var villain = POS_9[vi];
        var key = hero + '_vs_' + villain;
        if (out[key]) continue;
        var row = pickBaseVsRfi(base, hero, villain);
        if (row) out[key] = row;
      }
    }
    return out;
  }

  /** MTT: defiende más tight vs EP; más flat vs LP con stack medio. */
  function buildVsRfiMtt(base9) {
    const out = {};
    Object.keys(base9).forEach(function (key) {
      out[key] = cloneRow(base9[key]);
    });
    Object.keys(out).forEach(function (key) {
      var villain = key.split('_vs_')[1];
      var epIdx = POS_9.indexOf(villain);
      if (epIdx < 0) return;
      var row = out[key];
      if (epIdx <= 2) {
        row.threeBet = row.threeBet || 'QQ+, AKs, AKo';
        row.callMix = trimField(row.callMix, '88, 77, 66, AJo, KJo');
      } else if (epIdx >= 5) {
        row.call = widenField(row.call, 'A9s, K9s, Q9s, J9s, T9s, A9o, KTo');
      }
    });
    return out;
  }

  function trimField(str, removeCsv) {
    if (!str || !removeCsv) return str;
    var N = global.GTORangesNotation;
    if (!N) return str;
    var keep = N.toSet(str);
    N.expand(removeCsv).forEach(function (c) { keep.delete(c); });
    return Array.from(keep).join(', ');
  }

  function widenField(str, addCsv) {
    if (!addCsv) return str || '';
    if (!str) return addCsv;
    return str + ', ' + addCsv;
  }

  var VS_RFI_9MAX = null;
  var VS_RFI_MTT = null;

  function ensureVsRfiTables() {
    if (VS_RFI_9MAX) return;
    var base = (global.GTORangesData && global.GTORangesData.VS_RFI) || {};
    VS_RFI_9MAX = buildVsRfi9Max(base);
    VS_RFI_MTT = buildVsRfiMtt(VS_RFI_9MAX);
  }

  global.GTORangesVariants = {
    OPEN_RAISE_MTT,
    OPEN_RAISE_MTT_SHORT,
    OPEN_RAISE_9MAX,
    POS_9,
    vsRfiPairKey: function (hero, villain) { return hero + '_vs_' + villain; },
    getVsRfi9Max: function () { ensureVsRfiTables(); return VS_RFI_9MAX; },
    getVsRfiMtt: function () { ensureVsRfiTables(); return VS_RFI_MTT; },
    allVsRfi9MaxKeys: function () { ensureVsRfiTables(); return Object.keys(VS_RFI_9MAX); }
  };
})(window);
