/*
 * hhUtils.js — Utilidades compartidas para parsers de historiales de manos.
 * Incluye detección de gameKind / tableMax / stakes y asignación de posiciones.
 */
(function (global) {
  'use strict';

  /** Normaliza mojibake habitual de € en exports Winamax/PS (`â‚¬`, etc.). */
  function normalizeMoneyText(s) {
    if (s == null) return '';
    return String(s)
      .replace(/\u00e2\u20ac|\u00e2\u0082\u00ac|â‚¬|â\u0082¬/g, '€')
      .replace(/\u20ac/g, '€');
  }

  function num(s) {
    if (s == null) return 0;
    s = normalizeMoneyText(String(s)).trim().replace(/\s|[€$£]/g, '');
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.indexOf(',') >= 0) s = s.replace(',', '.');
    const v = parseFloat(s);
    return isNaN(v) ? 0 : v;
  }

  function cardsFrom(str) {
    const m = str.match(/[2-9TJQKA][shdc]/g) || str.match(/(?:10|[2-9TJQKA])[shdc]/g);
    if (!m) return [];
    return m.map((c) => c.replace('10', 'T'));
  }

  /** Labels mid desde el botón hacia UTG (índice 0 = más cerca del BTN = CO). */
  const LABELS_FROM_MID_6 = ['CO', 'HJ', 'UTG'];
  const LABELS_FROM_MID_9 = ['CO', 'HJ', 'LJ', 'UTG2', 'UTG1', 'UTG'];
  const LABELS_FROM_MID = LABELS_FROM_MID_9; // compat exports

  function midLabelsForN(n) {
    if (n <= 3) return [];
    if (n <= 6) return LABELS_FROM_MID_6;
    return LABELS_FROM_MID_9;
  }

  function assignPositions(hand) {
    if (!hand || !hand.seats || !hand.seats.length || hand.buttonSeat == null) return;
    const sorted = hand.seats.slice().sort((a, b) => a.seat - b.seat);
    const n = sorted.length;
    const btnIdx = sorted.findIndex((s) => s.seat === hand.buttonSeat);
    if (btnIdx < 0) return;
    const order = [];
    for (let i = 0; i < n; i++) order.push(sorted[(btnIdx + i) % n]);
    const pos = hand.positions || (hand.positions = {});
    Object.keys(pos).forEach((k) => { delete pos[k]; });

    if (n === 2) {
      pos[order[0].name] = 'SB';
      pos[order[1].name] = 'BB';
    } else if (n === 3) {
      // Spins / 3-max: BTN, SB, BB
      pos[order[0].name] = 'BTN';
      pos[order[1].name] = 'SB';
      pos[order[2].name] = 'BB';
    } else {
      pos[order[0].name] = 'BTN';
      pos[order[1].name] = 'SB';
      pos[order[2].name] = 'BB';
      const middle = order.slice(3);
      const labels = midLabelsForN(n);
      for (let i = 0; i < middle.length; i++) {
        pos[middle[middle.length - 1 - i].name] = labels[i] || ('EP' + i);
      }
    }
    if (hand.blinds && hand.blinds.sb) pos[hand.blinds.sb] = 'SB';
    if (hand.blinds && hand.blinds.bb) pos[hand.blinds.bb] = 'BB';
  }

  function detectTableMaxFromText(text) {
    if (!text) return null;
    const m = String(text).match(/\b(\d+)\s*-\s*max\b/i) || String(text).match(/\b(\d+)max\b/i);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return (n >= 2 && n <= 10) ? n : null;
  }

  function isSpinSignal(text) {
    if (!text) return false;
    return /Spin\s*&?\s*Go|Spin\s*and\s*Go|Jackpot\s*Sit\s*&?\s*Go|Sit\s*&?\s*Go\s*Jackpot|Nitro\s*&\s*Go|Spins?\b/i.test(text);
  }

  function isSngSignal(text) {
    if (!text) return false;
    return /\bSit\s*&?\s*Go\b|\bSNG\b|\bSit\s*and\s*Go\b/i.test(text) && !isSpinSignal(text);
  }

  function detectVariant(text) {
    if (!text) return 'unknown';
    if (/Omaha|PLO|Pot[\s-]?Limit\s+Omaha/i.test(text)) return 'plo';
    if (/Short\s*Deck|6\+\s*Hold'?em/i.test(text)) return 'shortdeck';
    if (/Hold'?em|Holdem/i.test(text)) return 'nlhe';
    return 'unknown';
  }

  function parseBuyInFromText(text) {
    if (!text) return null;
    const t = String(text);
    // "$5+$0.50" / "€10+€1"
    let m = t.match(/((?:[€$£]|â‚¬))([\d.,]+)\s*\+\s*((?:[€$£]|â‚¬)?)([\d.,]+)/);
    if (m) {
      const currency = (m[1] === '€' || m[1] === 'â‚¬') ? '€' : (m[1] === '£' ? '£' : '$');
      return { buyIn: num(m[2]), fee: num(m[4]), currency: currency };
    }
    // Buy-in: $25
    m = t.match(/(?:Buy[\s-]?[Ii]n|BI)[:\s]*((?:[€$£]|â‚¬)?)([\d.,]+)/i);
    if (m) {
      const currency = (m[1] === '€' || m[1] === 'â‚¬') ? '€' : (m[1] === '£' ? '£' : (m[1] === '$' ? '$' : null));
      return { buyIn: num(m[2]), fee: 0, currency: currency };
    }
    // Tournament #…, $25 …
    m = t.match(/(?:Tournament|Torneo)[^,]*,\s*((?:[€$£]|â‚¬)?)([\d.,]+)/i);
    if (m) {
      const currency = (m[1] === '€' || m[1] === 'â‚¬') ? '€' : (m[1] === '£' ? '£' : (m[1] === '$' ? '$' : null));
      return { buyIn: num(m[2]), fee: 0, currency: currency };
    }
    return null;
  }

  function parseMultiplierFromText(text) {
    if (!text) return null;
    const m = String(text).match(/(\d+(?:[.,]\d+)?)\s*x\b/i) || String(text).match(/multiplier[:\s]*(\d+)/i);
    return m ? num(m[1]) : null;
  }

  function parseTournamentBlinds(text) {
    if (!text) return null;
    // Level II (15/30) · Level2 (60/120) · Level 5 (100/200/25)
    const m = String(text).match(/Level\s*[IVXLC\d]+\s*\(([\d.,]+)\s*\/\s*([\d.,]+)(?:\s*\/\s*([\d.,]+))?\)/i);
    if (!m) return null;
    return { sb: num(m[1]), bb: num(m[2]), ante: m[3] != null ? num(m[3]) : 0 };
  }

  function stakeTierFromBb(bb, currency) {
    const b = Number(bb) || 0;
    if (b <= 0) return null;
    // Approximate NL stake from BB in €/$ (NL2 ≈ 0.01/0.02, NL10 ≈ 0.05/0.10, NL50 ≈ 0.25/0.50…)
    const nl = Math.round(b * 100);
    if (nl <= 5) return 'micro';
    if (nl <= 25) return 'low';
    if (nl <= 100) return 'mid';
    return 'high';
  }

  function stakesLabel(hand) {
    if (!hand) return '';
    const cur = hand.currency || '€';
    if (hand.gameKind === 'spin' || hand.gameKind === 'sng' || hand.gameKind === 'mtt') {
      if (hand.buyIn != null) {
        const fee = hand.buyInFee ? ('+' + cur + hand.buyInFee) : '';
        const kind = hand.gameKind === 'spin' ? 'Spin' : (hand.gameKind === 'sng' ? 'SNG' : 'MTT');
        return kind + ' ' + cur + hand.buyIn + fee;
      }
      return hand.gameKind === 'spin' ? 'Spin' : (hand.gameKind === 'sng' ? 'SNG' : 'MTT');
    }
    if (hand.bb > 0) {
      const sb = hand.sb || (hand.bb / 2);
      return cur + sb + '/' + cur + hand.bb;
    }
    return '';
  }

  function formatKeyFromMeta(meta) {
    meta = meta || {};
    const kind = meta.gameKind || 'cash';
    const tmax = meta.tableMax || meta.playersSeated || 6;
    if (kind === 'spin') return 'spin3';
    if (kind === 'mtt' || kind === 'sng') {
      if (tmax >= 8) return 'mtt9';
      if (tmax <= 3) return 'mtt3';
      return 'mtt6';
    }
    if (tmax <= 2) return 'cash2';
    if (tmax === 3) return 'cash3';
    if (tmax >= 8) return 'cash9';
    return 'cash6';
  }

  /** Legacy display format used by STYLE_IDEAL_BY_FORMAT keys. */
  function legacyFormatFromKey(formatKey) {
    const k = formatKey || 'cash6';
    if (k.indexOf('spin') === 0) return 'spin';
    if (k.indexOf('mtt') === 0 || k === 'sng') return 'mtt';
    if (k === 'cash9' || k === 'mtt9') return '9max';
    if (k === 'cash2' || k === 'cash3') return 'shorthand';
    return '6max';
  }

  function mttPhaseFromStackBB(stackBB) {
    const n = Number(stackBB) || 0;
    if (n <= 0) return null;
    if (n < 15) return 'push';
    if (n < 25) return 'short';
    if (n < 40) return 'mid';
    return 'early';
  }

  function avgStackBB(hand) {
    if (!hand || !hand.seats || !hand.bb) return null;
    const bb = hand.bb;
    if (!bb) return null;
    const stacks = hand.seats.map((s) => (s.stack || 0) / bb).filter((x) => x > 0);
    if (!stacks.length) return null;
    return Math.round((stacks.reduce((a, b) => a + b, 0) / stacks.length) * 10) / 10;
  }

  function heroStackBB(hand) {
    if (!hand || !hand.hero || !hand.seats || !hand.bb) return null;
    const seat = hand.seats.find((s) => s.name === hand.hero);
    if (!seat || !hand.bb) return null;
    return Math.round((seat.stack / hand.bb) * 10) / 10;
  }

  /**
   * Completa metadata de una mano tras el parseo de líneas.
   * Debe llamarse al final de parseHand (antes de return).
   */
  function finalizeHandMeta(hand, headerText) {
    if (!hand) return hand;
    const hdr = headerText || '';
    const full = hdr;

    if (!hand.variant || hand.variant === 'unknown') {
      hand.variant = detectVariant(full) || 'nlhe';
    }

    if (hand.tableMax == null) {
      hand.tableMax = detectTableMaxFromText(full);
    }
    hand.playersSeated = (hand.seats && hand.seats.length) || 0;
    if (hand.tableMax == null && hand.playersSeated) {
      // Infer capacity from seated count buckets
      const n = hand.playersSeated;
      hand.tableMax = n <= 2 ? 2 : (n <= 3 ? 3 : (n <= 6 ? 6 : (n <= 8 ? 8 : 9)));
    }

    // Tournament blinds if cash stakes missing
    if ((!hand.bb || hand.bb <= 0) && (hand.isTournament || /Tournament|Torneo|Level/i.test(full))) {
      const lvl = parseTournamentBlinds(full);
      if (lvl) {
        hand.sb = lvl.sb;
        hand.bb = lvl.bb;
        if (lvl.ante) hand.ante = lvl.ante;
        hand.isTournament = true;
        hand.isCash = false;
      }
    }

    const spin = isSpinSignal(full) || hand.gameKind === 'spin';
    const sng = !spin && (isSngSignal(full) || hand.gameKind === 'sng');
    if (spin) {
      hand.gameKind = 'spin';
      hand.isTournament = true;
      hand.isCash = false;
      if (!hand.tableMax || hand.tableMax > 3) hand.tableMax = 3;
    } else if (sng) {
      hand.gameKind = 'sng';
      hand.isTournament = true;
      hand.isCash = false;
    } else if (hand.isTournament) {
      hand.gameKind = 'mtt';
      hand.isCash = false;
    } else if (hand.isCash || (hand.bb > 0 && !hand.isTournament)) {
      hand.gameKind = 'cash';
      hand.isCash = true;
      hand.isTournament = false;
    } else {
      hand.gameKind = hand.gameKind || 'unknown';
    }

    const bi = hand.buyIn != null ? null : parseBuyInFromText(full);
    if (bi) {
      hand.buyIn = bi.buyIn;
      hand.buyInFee = bi.fee;
      if (bi.currency) hand.currency = bi.currency;
    }
    if (hand.multiplier == null) {
      const mult = parseMultiplierFromText(full);
      if (mult != null) hand.multiplier = mult;
    }

    hand.shortHanded = !!(hand.tableMax && hand.playersSeated && hand.playersSeated < hand.tableMax - 1);
    hand.stackDepthBB = heroStackBB(hand) != null ? heroStackBB(hand) : avgStackBB(hand);
    hand.avgStackBB = avgStackBB(hand);
    hand.stakeTier = hand.gameKind === 'cash' ? stakeTierFromBb(hand.bb, hand.currency) : null;
    hand.mttPhase = (hand.gameKind === 'mtt' || hand.gameKind === 'sng' || hand.gameKind === 'spin')
      ? mttPhaseFromStackBB(hand.stackDepthBB)
      : null;
    hand.formatKey = formatKeyFromMeta(hand);
    hand.stakesLabel = stakesLabel(hand);
    hand.isZoom = !!(hand.isZoom || /Zoom/i.test(full));

    if (hand.buttonSeat != null && hand.seats && hand.seats.length) {
      assignPositions(hand);
    }
    return hand;
  }

  /** ¿Se puede conservar la mano para análisis? */
  function isKeepableHand(hand) {
    if (!hand || !hand.id) return { ok: false, reason: 'badParse' };
    if (hand.variant && hand.variant !== 'nlhe' && hand.variant !== 'unknown') {
      return { ok: false, reason: 'unsupportedVariant' };
    }
    // Si unknown pero parece Hold'em por acciones, permitir
    if (!hand.bb || hand.bb <= 0) return { ok: false, reason: 'noBlinds' };
    const kind = hand.gameKind || 'unknown';
    if (kind === 'cash' || kind === 'spin' || kind === 'mtt' || kind === 'sng') {
      return { ok: true, reason: null };
    }
    return { ok: false, reason: 'unknownGame' };
  }

  function emptyDiscardCounts() {
    return {
      badParse: 0,
      unsupportedVariant: 0,
      noBlinds: 0,
      unknownGame: 0,
      noHeroCards: 0
    };
  }

  function buildSessionContext(hands, discardCounts) {
    const mix = { cash: 0, spin: 0, mtt: 0, sng: 0, unknown: 0 };
    const tableVotes = {};
    const keyVotes = {};
    let stakesLabel = '';
    let buyInSum = 0;
    let buyInN = 0;
    let currency = null;
    (hands || []).forEach((h) => {
      const k = (h && h.gameKind) || 'unknown';
      mix[k] = (mix[k] || 0) + 1;
      const tm = h.tableMax || h.playersSeated;
      if (tm) tableVotes[tm] = (tableVotes[tm] || 0) + 1;
      const fk = h.formatKey || formatKeyFromMeta(h);
      keyVotes[fk] = (keyVotes[fk] || 0) + 1;
      if (!stakesLabel && h.stakesLabel) stakesLabel = h.stakesLabel;
      if (h.buyIn != null) { buyInSum += h.buyIn; buyInN++; }
      if (!currency && h.currency) currency = h.currency;
    });
    function mode(votes) {
      let best = null; let n = -1;
      Object.keys(votes).forEach((k) => {
        if (votes[k] > n) { n = votes[k]; best = k; }
      });
      return best;
    }
    const formatKey = mode(keyVotes) || 'cash6';
    const tableMax = mode(tableVotes) != null ? parseInt(mode(tableVotes), 10) : null;
    let gameKind = 'cash';
    if (mix.spin >= mix.cash && mix.spin >= mix.mtt && mix.spin > 0) gameKind = 'spin';
    else if ((mix.mtt + mix.sng) > mix.cash && (mix.mtt + mix.sng) > 0) gameKind = mix.sng > mix.mtt ? 'sng' : 'mtt';
    else if (mix.cash > 0) gameKind = 'cash';
    else if (mix.spin > 0) gameKind = 'spin';
    else if (mix.mtt + mix.sng > 0) gameKind = 'mtt';
    else gameKind = 'unknown';

    return {
      gameKind,
      tableMax,
      formatKey,
      format: legacyFormatFromKey(formatKey),
      mix,
      stakesLabel,
      currency,
      avgBuyIn: buyInN ? Math.round((buyInSum / buyInN) * 100) / 100 : null,
      nDiscardedByReason: discardCounts || emptyDiscardCounts(),
      shortHandedShare: (hands || []).length
        ? Math.round(((hands || []).filter((h) => h.shortHanded).length / hands.length) * 1000) / 10
        : 0
    };
  }

  global.PTHHUtils = {
    num,
    normalizeMoneyText,
    cardsFrom,
    assignPositions,
    LABELS_FROM_MID,
    LABELS_FROM_MID_6,
    LABELS_FROM_MID_9,
    detectTableMaxFromText,
    isSpinSignal,
    isSngSignal,
    detectVariant,
    parseBuyInFromText,
    parseMultiplierFromText,
    parseTournamentBlinds,
    stakeTierFromBb,
    stakesLabel,
    formatKeyFromMeta,
    legacyFormatFromKey,
    mttPhaseFromStackBB,
    avgStackBB,
    heroStackBB,
    finalizeHandMeta,
    isKeepableHand,
    emptyDiscardCounts,
    buildSessionContext
  };
})(window);
