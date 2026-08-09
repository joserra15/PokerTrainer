/* PokerForgeAI bundle: pt-sessions.js — do not edit */
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
    if (/5[\s-]?Card\s+Omaha|Omaha\s*5|PLO[\s-]?5|Pot[\s-]?Limit\s+Omaha\s*5/i.test(text)) return 'plo5';
    if (/Omaha|PLO|Pot[\s-]?Limit\s+Omaha/i.test(text)) return 'plo';
    if (/Short\s*Deck|6\+\s*Hold'?em|Hold'?em\s*6\+/i.test(text)) return 'shortdeck';
    if (/Hold'?em|Holdem/i.test(text)) return 'nlhe';
    return 'unknown';
  }

  function isAnalysisUnsupportedVariant(variant) {
    return variant === 'plo' || variant === 'plo5' || variant === 'shortdeck';
  }

  function variantLabel(variant) {
    if (variant === 'plo') return 'PLO';
    if (variant === 'plo5') return 'PLO5';
    if (variant === 'shortdeck') return 'Short Deck';
    if (variant === 'nlhe') return 'NLHE';
    return variant || '?';
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

  /** ¿Se puede conservar la mano? PLO/Short Deck: parse-only (sin GTO). */
  function isKeepableHand(hand) {
    if (!hand || !hand.id) return { ok: false, reason: 'badParse' };
    if (!hand.bb || hand.bb <= 0) return { ok: false, reason: 'noBlinds' };
    const kind = hand.gameKind || 'unknown';
    if (!(kind === 'cash' || kind === 'spin' || kind === 'mtt' || kind === 'sng')) {
      return { ok: false, reason: 'unknownGame' };
    }
    if (isAnalysisUnsupportedVariant(hand.variant)) {
      hand.analysisUnsupported = true;
      return { ok: true, reason: null, analysisUnsupported: true };
    }
    if (hand.variant && hand.variant !== 'nlhe' && hand.variant !== 'unknown') {
      return { ok: false, reason: 'unsupportedVariant' };
    }
    return { ok: true, reason: null };
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

  /** True si el texto parece un historial de manos (no un resumen de resultados). */
  function looksLikeHandHistory(text) {
    const t = String(text || '');
    if (/(?:Mano n\.º\s*\d+|PokerStars (?:Zoom )?Hand #\d+|Poker Hand #(?:HM)?\d+|Winamax Poker\s*-)/i.test(t)) {
      return true;
    }
    if (/\*\*\*\s*HOLE CARDS\s*\*\*\*/i.test(t) || /Dealt to\s+\S+\s*\[/i.test(t)) return true;
    if (/Seat \d+:\s+.+\(/i.test(t) && /posts (?:the )?(?:small|big) blind/i.test(t)) return true;
    return false;
  }

  /**
   * Detecta ficheros que parecen historial pero no lo son (p.ej. Tournament History de PokerStars).
   * Devuelve null si no aplica, o { kind, hint } con mensaje para el usuario.
   */
  function detectNonHandHistory(text) {
    const t = String(text || '');
    if (!t.trim()) {
      return {
        kind: 'empty',
        hint: 'El archivo está vacío.'
      };
    }
    if (looksLikeHandHistory(t)) return null;

    // PokerStars Tournament History se importa como sesión de resultados (PTTournamentSummary).
    if (global.PTTournamentSummary
      && global.PTTournamentSummary.isPokerStarsTournamentSummary
      && global.PTTournamentSummary.isPokerStarsTournamentSummary(t)) {
      return null;
    }

    if (/You finished in \d+/i.test(t) && /Prize Pool/i.test(t) && !/Hand #/i.test(t)) {
      return {
        kind: 'tournamentResults',
        hint: 'Parece un resumen de resultados de torneo no soportado. Usa Tournament History de PokerStars o el Hand History (.txt) con manos.'
      };
    }

    return null;
  }

  function importFailureMessage(fileName, text, parsed) {
    const name = fileName || 'archivo.txt';
    const rooms = 'PokerStars, Winamax, GGPoker o 888poker';
    const nonHh = detectNonHandHistory(text);
    if (nonHh) {
      return 'No se importó «' + name + '»: ' + nonHh.hint;
    }
    const disc = (parsed && parsed.discardedByReason) || {};
    const discParts = Object.keys(disc).filter((k) => disc[k] > 0).map((k) => disc[k] + ' ' + k);
    return 'No se reconocieron manos NLHE (cash/spins/torneo) en «' + name
      + '». Comprueba que sea un historial de manos de ' + rooms + '.'
      + (discParts.length ? ' Descartadas: ' + discParts.join(', ') + '.' : '');
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
    isAnalysisUnsupportedVariant,
    variantLabel,
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
    buildSessionContext,
    looksLikeHandHistory,
    detectNonHandHistory,
    importFailureMessage
  };
})(window);

/*
 * formatDetector.js — Registro y detección automática de formatos de historial (sala + idioma).
 */
(function (global) {
  'use strict';

  /** @type {Array<{id:string,name:string,detect:Function,parseSession:Function,parseHand:Function,describe:Function}>} */
  const registry = [];

  function register(format) {
    if (!format || !format.id || typeof format.detect !== 'function') return;
    const idx = registry.findIndex((f) => f.id === format.id);
    if (idx >= 0) registry[idx] = format;
    else registry.push(format);
  }

  function list() {
    return registry.slice();
  }

  /** Devuelve el formato con mayor puntuación de detección (>0). */
  function detectBest(text) {
    if (!text || !registry.length) return null;
    let best = null;
    for (let i = 0; i < registry.length; i++) {
      const fmt = registry[i];
      const score = fmt.detect(text) || 0;
      if (score > 0 && (!best || score > best.score)) {
        best = { format: fmt, score: score };
      }
    }
    return best ? best.format : null;
  }

  /** Metadatos legibles para UI (sala, idioma, variante). */
  function describe(text) {
    const fmt = detectBest(text);
    if (!fmt) return null;
    if (typeof fmt.describe === 'function') return fmt.describe(text);
    return { platform: fmt.id, platformLabel: fmt.name || fmt.id, locale: 'unknown' };
  }

  global.PTHandHistoryFormats = { register, list, detectBest, describe };
})(window);

/*
 * icmLite.js — ICM aproximado para spins 3-max / burbuja MTT (IMP-39).
 * No sustituye un modelo ICM completo; da presión relativa chip-EV → $EV.
 */
(function (global) {
  'use strict';

  /** Payouts spin aprox. sobre prizepool normalizado a 1 (2× BI típico). */
  const SPIN_PAYOUTS_2X = [0.65, 0.35, 0];

  /**
   * Harville simplificado: P(1º) ∝ stack; P(2º) condicionado.
   * `payouts` suma ~1 (fracciones del prizepool).
   */
  function icmEquities(stacks, payouts) {
    const n = stacks.length;
    if (n < 2 || n > 4) return null;
    const total = stacks.reduce((s, x) => s + Math.max(0, Number(x) || 0), 0);
    if (total <= 0) return null;
    const pays = (payouts && payouts.length) ? payouts.slice(0, n) : null;
    if (!pays) return null;

    const pFirst = stacks.map((s) => Math.max(0, Number(s) || 0) / total);
    const pSecond = new Array(n).fill(0);
    for (let w = 0; w < n; w++) {
      const rem = total - Math.max(0, Number(stacks[w]) || 0);
      if (rem <= 0) continue;
      for (let j = 0; j < n; j++) {
        if (j === w) continue;
        pSecond[j] += pFirst[w] * (Math.max(0, Number(stacks[j]) || 0) / rem);
      }
    }
    const eq = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      eq[i] = (pFirst[i] || 0) * (pays[0] || 0) + (pSecond[i] || 0) * (pays[1] || 0);
      if (pays[2]) {
        const pThird = Math.max(0, 1 - (pFirst[i] || 0) - (pSecond[i] || 0));
        eq[i] += pThird * pays[2];
      }
      eq[i] = Math.round(eq[i] * 1000) / 1000;
    }
    return eq;
  }

  function chipEvShare(stacks) {
    const total = stacks.reduce((s, x) => s + Math.max(0, Number(x) || 0), 0);
    if (total <= 0) return stacks.map(() => 0);
    return stacks.map((s) => Math.max(0, Number(s) || 0) / total);
  }

  /** >0 ⇒ stack sobrevalorado en chips (jugar más tight). */
  function icmPressure(stacks, payouts) {
    const eq = icmEquities(stacks, payouts);
    const chip = chipEvShare(stacks);
    if (!eq) return null;
    const prize = (payouts || []).reduce((s, x) => s + x, 0) || 1;
    return eq.map((e, i) => Math.round(((chip[i] || 0) * prize - e) * 1000) / 1000);
  }

  function annotateHand(hand, decisions) {
    if (!hand || !decisions || !decisions.length) return;
    const kind = hand.gameKind || 'cash';
    if (kind !== 'spin' && kind !== 'mtt' && kind !== 'sng') return;
    const seats = hand.seats || [];
    if (seats.length < 2 || seats.length > 4) return;
    const bb = hand.bb || 1;
    const stacks = seats.map((s) => Math.max(0, (Number(s.stack) || 0) / bb));
    const hero = hand.hero;
    const heroIdx = seats.findIndex((s) => s.name === hero);
    if (heroIdx < 0) return;

    if (kind !== 'spin') {
      const phase = hand.mttPhase || '';
      const stackBB = hand.stackDepthBB;
      if (stackBB != null && stackBB <= 20) {
        decisions.forEach((d) => {
          if (d.street !== 'preflop') return;
          d.icmNote = 'Stack corto en ' + (phase || 'torneo') + ' (~' + Math.round(stackBB)
            + ' bb): prioriza $EV/ICM frente a chipEV puro.';
          d.icmLite = true;
        });
      }
      return;
    }

    const payouts = SPIN_PAYOUTS_2X.slice(0, seats.length);
    while (payouts.length < seats.length) payouts.push(0);
    const pressure = icmPressure(stacks, payouts);
    if (!pressure) return;
    const pHero = pressure[heroIdx];
    const eq = icmEquities(stacks, payouts);
    hand.icmLite = {
      stacksBB: stacks.map((x) => Math.round(x * 10) / 10),
      equities: eq,
      pressure: pressure,
      heroPressure: pHero,
      note: pHero > 0.05
        ? 'ICM lite: tu stack está sobrevalorado en chips → juega más tight (especialmente shove/call).'
        : (pHero < -0.05
          ? 'ICM lite: puedes aplicar más presión; chipEV puro te infravalora.'
          : 'ICM lite: presión moderada; chipEV ≈ $EV en este spot.')
    };
    decisions.forEach((d) => {
      if (d.street !== 'preflop') return;
      d.icmLite = true;
      d.icmNote = hand.icmLite.note;
      d.icmPressure = pHero;
    });
  }

  global.PTIcmLite = {
    icmEquities: icmEquities,
    icmPressure: icmPressure,
    annotateHand: annotateHand,
    SPIN_PAYOUTS_2X: SPIN_PAYOUTS_2X
  };
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * populationCompare.js — Comparativa vs rangos GTO genéricos (IMP-40).
 * No es HUD de población live: usa OPEN_RAISE del trainer como referencia.
 */
(function (global) {
  'use strict';

  function handInRange(code, rangeStr) {
    if (!code || !rangeStr) return null;
    const R = global.Ranges;
    if (!R || typeof R.toSet !== 'function') return null;
    try {
      return R.toSet(rangeStr).has(code);
    } catch (e) {
      return null;
    }
  }

  function rfiRangeFor(hand, pos) {
    const R = global.Ranges;
    if (R && R.OPEN_RAISE && R.OPEN_RAISE[pos]) return R.OPEN_RAISE[pos];
    const RR = global.GTORangesRegistry;
    if (RR && typeof RR.getRfi === 'function') {
      try {
        const ctx = hand.rangeContext || (RR.inferFromHand ? RR.inferFromHand(hand) : {});
        const table = RR.getRfi(ctx || {});
        if (table && table[pos]) return table[pos];
      } catch (e) { /* ignore */ }
    }
    return null;
  }

  function annotateDecisions(hand, decisions) {
    if (!hand || !decisions) return;
    if (hand.analysisUnsupported) return;
    const hero = hand.hero;
    const pos = hand.heroPos || (hand.positions && hand.positions[hero]);
    let code = hand.heroCode;
    const R = global.Ranges;
    if (!code && hand.heroCards && hand.heroCards.length === 2 && R && typeof R.handCode === 'function') {
      code = R.handCode(hand.heroCards[0], hand.heroCards[1]);
    }
    if (!pos || !code) return;

    decisions.forEach((d) => {
      if (!d || d.street !== 'preflop') return;
      const kind = d.spotKind || '';
      const spot = String(d.spot || '');
      const isRfi = kind === 'RFI' || /^RFI\b/i.test(spot);
      if (!isRfi) return;
      const rangeStr = rfiRangeFor(hand, pos);
      if (!rangeStr) return;
      const inRange = handInRange(code, rangeStr);
      if (inRange == null) return;
      d.populationCompare = {
        spot: 'RFI ' + pos,
        hand: code,
        inGtoRange: inRange,
        rangeLabel: 'RFI GTO genérico ' + pos,
        note: inRange
          ? (code + ' está dentro del rango RFI GTO genérico en ' + pos + '.')
          : (code + ' está fuera del rango RFI GTO genérico en ' + pos + ' (referencia trainer, no población live).')
      };
    });
  }

  global.PTPopulationCompare = {
    annotateDecisions: annotateDecisions,
    handInRange: handInRange,
    rfiRangeFor: rfiRangeFor
  };
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * tournamentSummary.js — PokerStars Tournament History (resumen de resultados).
 * No incluye manos; genera una sesión de resultados (profit/ROI/puesto).
 */
(function (global) {
  'use strict';

  const U = function () { return global.PTHHUtils; };

  function isPokerStarsTournamentSummary(text) {
    const t = String(text || '');
    if (!t.trim()) return false;
    if (U() && U().looksLikeHandHistory && U().looksLikeHandHistory(t)) return false;
    return /Tournament History for your last/i.test(t)
      || (
        /PokerStars Tournament #\d+/i.test(t)
        && /(?:Buy-In:|Total Prize Pool:|You finished in)/i.test(t)
        && !/PokerStars (?:Zoom )?Hand #\d+/i.test(t)
        && !/Mano n\.º\s*\d+/i.test(t)
      );
  }

  function moneyToken(raw) {
    const s = String(raw || '').trim();
    const curM = s.match(/^[€$£]/);
    const currency = curM
      ? (curM[0] === '€' ? '€' : (curM[0] === '£' ? '£' : '$'))
      : null;
    const amount = U() ? U().num(s) : (parseFloat(s.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0);
    return { amount: amount, currency: currency };
  }

  /** Buy-In: €0.46/€0.04 EUR | €0.00/€0.90/€0.10 EUR | $5+$0.50 */
  function parseSummaryBuyIn(text) {
    const t = String(text || '');
    let m = t.match(/Buy-In:\s*([€$£]?[\d.,]+)\s*\/\s*([€$£]?[\d.,]+)\s*\/\s*([€$£]?[\d.,]+)/i);
    if (m) {
      const a = moneyToken(m[1]);
      const b = moneyToken(m[2]);
      const c = moneyToken(m[3]);
      const currency = a.currency || b.currency || c.currency || (/EUR/i.test(t) ? '€' : (/USD|\$/i.test(t) ? '$' : '€'));
      return {
        prizePart: a.amount,
        bountyPart: b.amount,
        fee: c.amount,
        buyIn: a.amount + b.amount,
        buyInFee: c.amount,
        invested: a.amount + b.amount + c.amount,
        currency: currency,
        parts: 3
      };
    }
    m = t.match(/Buy-In:\s*([€$£]?[\d.,]+)\s*\/\s*([€$£]?[\d.,]+)/i);
    if (m) {
      const a = moneyToken(m[1]);
      const b = moneyToken(m[2]);
      const currency = a.currency || b.currency || (/EUR/i.test(t) ? '€' : '€');
      return {
        prizePart: a.amount,
        bountyPart: 0,
        fee: b.amount,
        buyIn: a.amount,
        buyInFee: b.amount,
        invested: a.amount + b.amount,
        currency: currency,
        parts: 2
      };
    }
    if (U() && U().parseBuyInFromText) {
      const bi = U().parseBuyInFromText(t);
      if (bi) {
        return {
          prizePart: bi.buyIn,
          bountyPart: 0,
          fee: bi.fee || 0,
          buyIn: bi.buyIn,
          buyInFee: bi.fee || 0,
          invested: bi.buyIn + (bi.fee || 0),
          currency: bi.currency || '€',
          parts: 1
        };
      }
    }
    return null;
  }

  function parsePlace(text) {
    const m = String(text || '').match(/You finished in\s+(\d+)(?:st|nd|rd|th)?\s+place/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function parseHero(text) {
    let m = String(text || '').match(/Tournament History for your last[^\n]*requested by\s+([^\s(]+)/i);
    if (m) return m[1].trim();
    m = String(text || '').match(/^\s*\d+:\s*([^\n(]+?)\s*\(/m);
    return m ? m[1].trim() : null;
  }

  function parseHeroPrize(text, hero, place) {
    if (!hero) return 0;
    const lines = String(text || '').split(/\r?\n/);
    const re = new RegExp(
      '^\\s*' + (place != null ? String(place) : '\\d+') + ':\\s*' +
      hero.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '\\s*\\([^)]*\\)\\s*,\\s*([€$£]?[\\d.,]+)',
      'i'
    );
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].replace(/\u00a0/g, ' ').match(re);
      if (m) return moneyToken(m[1]).amount;
    }
    // Línea sin puesto forzado
    const re2 = new RegExp(
      '^\\s*\\d+:\\s*' + hero.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '\\s*\\([^)]*\\)\\s*,\\s*([€$£]?[\\d.,]+)',
      'i'
    );
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].replace(/\u00a0/g, ' ').match(re2);
      if (m) return moneyToken(m[1]).amount;
    }
    return 0;
  }

  function parseBounties(text) {
    const m = String(text || '').match(
      /You collected\s+(\d+)\s+bount(?:y|ies)\s+for a total of\s+(?:EUR|USD|GBP)?\s*([€$£]?[\d.,]+)/i
    );
    if (!m) return { count: 0, amount: 0 };
    return { count: parseInt(m[1], 10) || 0, amount: moneyToken(m[2]).amount };
  }

  function parseDateIso(line) {
    // Tournament started 2026/08/09 22:31:00 CET [2026/08/09 16:31:00 ET]
    const m = String(line || '').match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    return m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':' + m[6];
  }

  function inferGameKind(text, players) {
    if (U() && U().isSpinSignal && U().isSpinSignal(text)) return 'spin';
    if (players === 3) return 'spin';
    if (U() && U().isSngSignal && U().isSngSignal(text)) return 'sng';
    if (players > 0 && players <= 10) return 'sng';
    return 'mtt';
  }

  function r2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  function parsePokerStarsTournamentSummary(text, fileName) {
    const t = String(text || '');
    const idM = t.match(/PokerStars Tournament #(\d+)/i);
    const tournamentId = idM ? idM[1] : null;
    const playersM = t.match(/(\d+)\s+players/i);
    const players = playersM ? parseInt(playersM[1], 10) : null;
    const poolM = t.match(/Total Prize Pool:\s*([€$£]?[\d.,]+)/i);
    const prizePool = poolM ? moneyToken(poolM[1]).amount : 0;
    const buy = parseSummaryBuyIn(t) || {
      prizePart: 0, bountyPart: 0, fee: 0, buyIn: 0, buyInFee: 0, invested: 0, currency: '€', parts: 0
    };
    const hero = parseHero(t);
    const finishPlace = parsePlace(t);
    const cashPrize = parseHeroPrize(t, hero, finishPlace);
    const bounties = parseBounties(t);
    const startedM = t.match(/Tournament started[^\n]*/i);
    const finishedM = t.match(/Tournament finished[^\n]*/i);
    const startedAt = startedM ? parseDateIso(startedM[0]) : null;
    const finishedAt = finishedM ? parseDateIso(finishedM[0]) : null;
    const gameKind = inferGameKind(t, players);
    const variant = (U() && U().detectVariant) ? U().detectVariant(t) : 'nlhe';
    const invested = buy.invested;
    const profitEuro = r2(cashPrize + bounties.amount - invested);
    const roiPct = invested > 0 ? Math.round((profitEuro / invested) * 1000) / 10 : null;
    const tableMax = gameKind === 'spin' ? 3 : (players && players <= 9 ? players : 9);
    const formatKey = (U() && U().formatKeyFromMeta)
      ? U().formatKeyFromMeta({ gameKind: gameKind, tableMax: tableMax })
      : (gameKind === 'spin' ? 'spin3' : 'mtt9');
    const format = (U() && U().legacyFormatFromKey) ? U().legacyFormatFromKey(formatKey) : gameKind;
    const cur = buy.currency || '€';
    let stakesLabel = (gameKind === 'spin' ? 'Spin' : (gameKind === 'sng' ? 'SNG' : 'MTT'))
      + ' ' + cur + buy.buyIn;
    if (buy.buyInFee) stakesLabel += '+' + cur + buy.buyInFee;
    if (buy.parts === 3 && buy.bountyPart) stakesLabel += ' (KO)';

    return {
      source: 'tournamentSummary',
      fileName: fileName || 'tournament.txt',
      hero: hero,
      hands: [],
      heroConfirmed: !!hero,
      format: {
        platform: 'pokerstars',
        platformLabel: 'PokerStars',
        locale: /requested by/i.test(t) ? 'en' : null,
        localeLabel: 'English',
        kind: 'tournamentSummary'
      },
      discardedByReason: U() && U().emptyDiscardCounts ? U().emptyDiscardCounts() : {},
      tournament: {
        id: tournamentId,
        gameKind: gameKind,
        players: players,
        tableMax: tableMax,
        buyIn: buy.buyIn,
        buyInFee: buy.buyInFee,
        bountyBuyIn: buy.bountyPart || 0,
        currency: cur,
        prizePool: prizePool,
        finishPlace: finishPlace,
        cashPrize: cashPrize,
        bountyCount: bounties.count,
        bountyCollected: bounties.amount,
        invested: invested,
        profitEuro: profitEuro,
        roiPct: roiPct,
        startedAt: startedAt,
        finishedAt: finishedAt,
        variant: variant,
        formatKey: formatKey,
        format: format,
        stakesLabel: stakesLabel
      }
    };
  }

  function buildTournamentSummarySession(parsed, fileName, rawText) {
    const t = parsed && parsed.tournament ? parsed.tournament : {};
    const hero = (parsed && parsed.hero) || 'Hero';
    const gameKind = t.gameKind || 'mtt';
    const formatKey = t.formatKey || 'mtt9';
    const format = t.format || 'mtt';
    const context = {
      gameKind: gameKind,
      formatKey: formatKey,
      format: format,
      tableMax: t.tableMax || null,
      stakesLabel: t.stakesLabel || '',
      avgBuyIn: t.invested != null ? t.invested : t.buyIn,
      mix: { cash: 0, spin: gameKind === 'spin' ? 1 : 0, mtt: gameKind === 'mtt' ? 1 : 0, sng: gameKind === 'sng' ? 1 : 0, unknown: 0 },
      nDiscardedByReason: {},
      shortHandedShare: 0,
      source: 'tournamentSummary',
      tournamentId: t.id || null
    };
    const grade = {
      letter: 'R',
      score: null,
      verdict: 'Resultados de torneo (sin historial de manos). Importa el Hand History para análisis GTO.'
    };
    const stats = {
      nHands: 0,
      nDecisions: 0,
      accuracy: null,
      accByStreet: { preflop: null, flop: null, turn: null, river: null },
      dist: { optima: 0, aceptable: 0, imprecisa: 0, error: 0 },
      netBB: 0,
      evLossBB: 0,
      grade: grade,
      gameKind: gameKind,
      formatKey: formatKey,
      format: format,
      tableMax: t.tableMax || null,
      stakesLabel: t.stakesLabel || '',
      stakeTier: null,
      mttPhase: null,
      shortHandedShare: 0,
      profitEuro: t.profitEuro != null ? t.profitEuro : 0,
      avgBuyIn: t.invested != null ? t.invested : null,
      roiPct: t.roiPct,
      finishPlace: t.finishPlace,
      cashPrize: t.cashPrize || 0,
      bountyCollected: t.bountyCollected || 0,
      bountyCount: t.bountyCount || 0,
      prizePool: t.prizePool || 0,
      tournamentId: t.id || null,
      players: t.players || null,
      source: 'tournamentSummary',
      context: context
    };
    const createdAt = t.finishedAt
      ? (t.finishedAt.indexOf('Z') >= 0 || t.finishedAt.indexOf('+') >= 0
        ? new Date(t.finishedAt).toISOString()
        : new Date(t.finishedAt + 'Z').toISOString())
      : new Date().toISOString();
    return {
      id: 's' + Date.now() + Math.floor(Math.random() * 1000),
      createdAt: isNaN(Date.parse(createdAt)) ? new Date().toISOString() : createdAt,
      fileName: fileName || parsed.fileName || 'tournament.txt',
      hero: hero,
      nTotal: 0,
      nParsed: 0,
      nDiscarded: 0,
      nDiscardedByReason: {},
      hands: [],
      stats: stats,
      context: context,
      format: parsed.format || null,
      analysisVersion: global.PT_BUILD || '1',
      hasTxt: !!(rawText || (parsed && parsed.rawText)),
      rawText: rawText != null ? rawText : ((parsed && parsed.rawText) || null),
      source: 'tournamentSummary',
      tournamentId: t.id || null,
      tournament: t
    };
  }

  global.PTTournamentSummary = {
    isPokerStarsTournamentSummary: isPokerStarsTournamentSummary,
    parsePokerStarsTournamentSummary: parsePokerStarsTournamentSummary,
    buildTournamentSummarySession: buildTournamentSummarySession,
    parseSummaryBuyIn: parseSummaryBuyIn
  };
})(window);

/*
 * parsers/pokerstars.js — Parser PokerStars NLHE (cash / spins / MTT; ES + EN).
 */
(function (global) {
  'use strict';

  const U = global.PTHHUtils;
  const Formats = global.PTHandHistoryFormats;
  if (!U || !Formats) return;

  const num = U.num;
  const cardsFrom = U.cardsFrom;
  const finalizeHandMeta = U.finalizeHandMeta;
  const isKeepableHand = U.isKeepableHand;
  const emptyDiscardCounts = U.emptyDiscardCounts;

  const LOCALES = {
    es: {
      id: 'es',
      label: 'Español',
      blockSplit: /(?=^Mano n\.º )/m,
      blockTest: /^Mano n\.º/,
      heroDealtRe: /^Repartidas a /m,
      skipActionNoise: /pone la ciega|se retira|pasa|iguala|apuesta|sube|muestra|descarta/
    },
    en: {
      id: 'en',
      label: 'English',
      blockSplit: /(?=^PokerStars (?:Zoom )?Hand #)/m,
      blockTest: /^PokerStars (?:Zoom )?Hand #/,
      heroDealtRe: /^Dealt to /m,
      skipActionNoise: /posts small blind|posts big blind|folds|checks|calls|bets|raises|shows|collected/
    }
  };

  function detectLocale(text) {
    const es = (text.match(/^Mano n\.º /gm) || []).length;
    const en = (text.match(/^PokerStars (?:Zoom )?Hand #/gm) || []).length;
    if (en > es && en >= 1) return 'en';
    if (es >= 1) return 'es';
    if (en >= 1) return 'en';
    return null;
  }

  function parseAction(ln, locale) {
    let m;
    if (locale === 'en') {
      if ((m = ln.match(/^(.+?): folds/))) return { player: m[1], type: 'fold' };
      if ((m = ln.match(/^(.+?): checks/))) return { player: m[1], type: 'check' };
      if ((m = ln.match(/^(.+?): calls ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
        return { player: m[1], type: 'call', amount: num(m[3]), allin: /all-in/i.test(ln) };
      }
      if ((m = ln.match(/^(.+?): bets ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
        return { player: m[1], type: 'bet', amount: num(m[3]), allin: /all-in/i.test(ln) };
      }
      if ((m = ln.match(/^(.+?): raises ((?:[€$£]|â‚¬)?)([\d.,]+) to ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
        return {
          player: m[1], type: 'raise', amount: num(m[3]), to: num(m[5]),
          allin: /all-in/i.test(ln)
        };
      }
      return null;
    }
    if ((m = ln.match(/^(.+?): se retira/))) return { player: m[1], type: 'fold' };
    if ((m = ln.match(/^(.+?): pasa/))) return { player: m[1], type: 'check' };
    if ((m = ln.match(/^(.+?): iguala ([\d.,]+)/))) {
      return { player: m[1], type: 'call', amount: num(m[2]), allin: /all-in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?): apuesta ([\d.,]+)/))) {
      return { player: m[1], type: 'bet', amount: num(m[2]), allin: /all-in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?): sube ([\d.,]+)\s*€? a ([\d.,]+)/))) {
      return { player: m[1], type: 'raise', amount: num(m[2]), to: num(m[3]), allin: /all-in/i.test(ln) };
    }
    return null;
  }

  function parseHand(block, locale) {
    locale = locale || detectLocale(block) || 'es';
    const lines = block.split(/\r?\n/);
    const hand = {
      id: null, datetime: null, sb: 0, bb: 0, currency: '€',
      buttonSeat: null, seats: [], hero: null, heroCards: [],
      blinds: { sb: null, bb: null }, posts: {},
      streets: { preflop: [], flop: [], turn: [], river: [] },
      board: { flop: [], turn: [], river: [] }, boardAll: [],
      shows: {}, collected: {}, uncalledTo: {},
      rake: 0, potTotal: 0, positions: {}, isCash: false, isTournament: false,
      platform: 'pokerstars', locale: locale,
      gameKind: 'unknown', tableMax: null, variant: 'unknown', isZoom: false
    };

    let street = 'preheader';
    let headerText = '';
    const L = LOCALES[locale] || LOCALES.es;

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i].trim();
      if (!ln) continue;

      if (/^Dealer:|has timed out|disconnected|will be allowed|is sitting out|joins the table|leaves the table/i.test(ln)) continue;
      if (/^[^*].* says?:/i.test(ln) && !L.skipActionNoise.test(ln)) continue;

      // Table line: captura N-max + botón (antes se ignoraba si no traía Seat #)
      let m;
      if (/^Table '/i.test(ln) || /^Mesa '/i.test(ln)) {
        headerText += ' ' + ln;
        const tmax = U.detectTableMaxFromText(ln);
        if (tmax) hand.tableMax = tmax;
        if ((m = ln.match(/Seat #(\d+) is the button/i)) || (m = ln.match(/asiento n\.º (\d+) es el botón/i))) {
          hand.buttonSeat = +m[1];
        }
        continue;
      }

      if (locale === 'en') {
        if ((m = ln.match(/^PokerStars(?: Zoom)? Hand #(\d+):\s+(.+)/))) {
          hand.id = m[1];
          hand.isZoom = /Zoom/i.test(ln);
          headerText += ' ' + ln;
          hand.isTournament = /Tournament #/i.test(ln) || U.isSpinSignal(ln) || U.isSngSignal(ln);
          const bl = ln.match(/(?:Hold'?em No Limit|Pot Limit Omaha|Omaha Pot Limit|Short Deck Hold'?em No Limit)\s*\(((?:[€$£]|â‚¬)?)([\d.,]+)\/((?:[€$£]|â‚¬)?)([\d.,]+)(?:\s+[A-Z]{3})?\)/i);
          if (bl) {
            hand.sb = num(bl[2]);
            hand.bb = num(bl[4]);
            hand.currency = bl[1] || bl[3] || '€';
            hand.isCash = !hand.isTournament;
            hand.variant = U.detectVariant(ln) || 'nlhe';
          } else {
            const lvl = U.parseTournamentBlinds(ln);
            if (lvl) {
              hand.sb = lvl.sb;
              hand.bb = lvl.bb;
              if (lvl.ante) hand.ante = lvl.ante;
              hand.isTournament = true;
              hand.isCash = false;
              hand.variant = U.detectVariant(ln) || 'nlhe';
            }
          }
          {
            const det = U.detectVariant(ln);
            if (det && det !== 'unknown') hand.variant = det;
          }
          const dt = ln.match(/-\s*(\d{4}\/\d{2}\/\d{2} \d{1,2}:\d{2}:\d{2})/);
          if (dt) hand.datetime = dt[1];
          continue;
        }
        if ((m = ln.match(/Seat #(\d+) is the button/))) { hand.buttonSeat = +m[1]; continue; }
        if ((m = ln.match(/^Seat (\d+):\s*(.+?)\s*\((?:[€$£])?([\d.,]+) in chips\)/))) {
          hand.seats.push({ seat: +m[1], name: m[2], stack: num(m[3]) });
          continue;
        }
        if ((m = ln.match(/^(.+?): posts the ante ((?:[€$£]|â‚¬)?)([\d.,]+)/i))) {
          hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[3]);
          hand.ante = hand.ante || num(m[3]);
          continue;
        }
        if ((m = ln.match(/^(.+?): posts small blind ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
          hand.blinds.sb = m[1]; hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[3]); continue;
        }
        if ((m = ln.match(/^(.+?): posts big blind ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
          hand.blinds.bb = m[1]; hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[3]); continue;
        }
        if ((m = ln.match(/^(.+?): posts straddle ((?:[€$£]|â‚¬)?)([\d.,]+)/i))) {
          hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[3]);
          hand.straddle = { player: m[1], amount: num(m[3]) };
          continue;
        }
        if (/^\*\*\* HOLE CARDS \*\*\*/.test(ln)) { street = 'preflop'; continue; }
        if ((m = ln.match(/^Dealt to (.+?) \[(.+?)\]/))) {
          hand.hero = m[1]; hand.heroCards = cardsFrom(m[2]); continue;
        }
        if ((m = ln.match(/^\*\*\* FLOP \*\*\* \[(.+?)\]/))) { street = 'flop'; hand.board.flop = cardsFrom(m[1]); continue; }
        if ((m = ln.match(/^\*\*\* TURN \*\*\* \[(.+?)\] \[(.+?)\]/))) {
          street = 'turn'; hand.board.turn = cardsFrom(m[2]); continue;
        }
        if ((m = ln.match(/^\*\*\* RIVER \*\*\* \[(.+?)\] \[(.+?)\]/))) {
          street = 'river'; hand.board.river = cardsFrom(m[2]); continue;
        }
        if (/^\*\*\* (SHOW DOWN|SUMMARY)/.test(ln)) {
          street = /SUMMARY/.test(ln) ? 'summary' : 'showdown'; continue;
        }
        if ((m = ln.match(/^Uncalled bet \(((?:[€$£]|â‚¬)?)([\d.,]+)\) returned to (.+)/))) {
          hand.uncalledTo[m[3]] = num(m[2]); continue;
        }
        if ((m = ln.match(/^(.+?) collected ((?:[€$£]|â‚¬)?)([\d.,]+) from pot/))) {
          hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[3])); continue;
        }
        if ((m = ln.match(/^(.+?): shows \[(.+?)\]/))) { hand.shows[m[1]] = cardsFrom(m[2]); continue; }
        if ((m = ln.match(/^Total pot ((?:[€$£]|â‚¬)?)([\d.,]+)\s*\|\s*Rake ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
          hand.potTotal = num(m[2]); hand.rake = num(m[4]); continue;
        }
        if (street === 'summary') {
          if ((m = ln.match(/^Seat \d+: (.+?) (?:\(.*?\) )?showed \[(.+?)\]/))) {
            hand.shows[m[1]] = hand.shows[m[1]] || cardsFrom(m[2]); continue;
          }
          if ((m = ln.match(/^Seat \d+: (.+?) (?:\(.*?\) )?collected \(((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
            hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[4])); continue;
          }
          continue;
        }
      } else {
        if ((m = ln.match(/^Mano n\.º\s*(\d+)\s*de (.+?):\s*(.*)/))) {
          hand.id = m[1];
          headerText += ' ' + ln;
          hand.isTournament = /Torneo|Tournament|Spin/i.test(ln);
          const bl = ln.match(/Hold'em No Limit \(([\d.,]+)\s*€\/([\d.,]+)\s*€\)/);
          if (bl) {
            hand.sb = num(bl[1]);
            hand.bb = num(bl[2]);
            hand.isCash = !hand.isTournament;
            hand.variant = U.detectVariant(ln) || 'nlhe';
          } else {
            const lvl = U.parseTournamentBlinds(ln);
            if (lvl) {
              hand.sb = lvl.sb;
              hand.bb = lvl.bb;
              hand.isTournament = true;
              hand.isCash = false;
              hand.variant = U.detectVariant(ln) || 'nlhe';
            }
          }
          {
            const det = U.detectVariant(ln);
            if (det && det !== 'unknown') hand.variant = det;
          }
          const dt = ln.match(/-\s*(\d{2}-\d{2}-\d{4} \d{1,2}:\d{2}:\d{2})/);
          if (dt) hand.datetime = dt[1];
          continue;
        }
        if ((m = ln.match(/El asiento n\.º (\d+) es el botón/))) { hand.buttonSeat = +m[1]; continue; }
        if ((m = ln.match(/^Asiento (\d+):\s*(.+?)\s*\(([\d.,]+)\s*€?\s*en fichas\)/))) {
          hand.seats.push({ seat: +m[1], name: m[2], stack: num(m[3]) }); continue;
        }
        if ((m = ln.match(/^(.+?): pone la ante ([\d.,]+)/i)) || (m = ln.match(/^(.+?): posts the ante ([\d.,]+)/i))) {
          hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]);
          hand.ante = hand.ante || num(m[2]);
          continue;
        }
        if ((m = ln.match(/^(.+?): pone la ciega pequeña ([\d.,]+)/))) {
          hand.blinds.sb = m[1]; hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]); continue;
        }
        if ((m = ln.match(/^(.+?): pone la ciega grande ([\d.,]+)/))) {
          hand.blinds.bb = m[1]; hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]); continue;
        }
        if ((m = ln.match(/^(.+?): pone las ciegas pequeña y grande ([\d.,]+)/))) {
          hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]); continue;
        }
        if ((m = ln.match(/^(.+?): pone straddle ([\d.,]+)/i))) {
          hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]);
          hand.straddle = { player: m[1], amount: num(m[2]) };
          continue;
        }
        if (/^\*\*\* CARTAS DE MANO \*\*\*/.test(ln)) { street = 'preflop'; continue; }
        if ((m = ln.match(/^Repartidas a (.+?) \[(.+?)\]/))) {
          hand.hero = m[1]; hand.heroCards = cardsFrom(m[2]); continue;
        }
        if ((m = ln.match(/^\*\*\* FLOP \*\*\* \[(.+?)\]/))) { street = 'flop'; hand.board.flop = cardsFrom(m[1]); continue; }
        if ((m = ln.match(/^\*\*\* TURN \*\*\* \[(.+?)\] \[(.+?)\]/))) {
          street = 'turn'; hand.board.turn = cardsFrom(m[2]); continue;
        }
        if ((m = ln.match(/^\*\*\* RIVER \*\*\* \[(.+?)\] \[(.+?)\]/))) {
          street = 'river'; hand.board.river = cardsFrom(m[2]); continue;
        }
        if (/^\*\*\* (MOSTRAR|SHOW DOWN|REPARTO|TERCERA|SEGUNDA)/.test(ln)) {
          street = 'showdown'; continue;
        }
        if (/^\*\*\* RESUMEN \*\*\*/.test(ln)) { street = 'summary'; continue; }
        if ((m = ln.match(/^La apuesta no igualada \(([\d.,]+)\s*€?\) ha sido devuelta a (.+)/))) {
          hand.uncalledTo[m[2]] = num(m[1]); continue;
        }
        if ((m = ln.match(/^(.+?) se lleva ([\d.,]+)\s*€? del bote/))) {
          hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[2])); continue;
        }
        if ((m = ln.match(/^(.+?): muestra \[(.+?)\]/))) { hand.shows[m[1]] = cardsFrom(m[2]); continue; }
        if ((m = ln.match(/^Bote total ([\d.,]+)\s*€?\s*\|\s*Comisión ([\d.,]+)/))) {
          hand.potTotal = num(m[1]); hand.rake = num(m[2]); continue;
        }
        if (street === 'summary') {
          if ((m = ln.match(/^Asiento \d+: (.+?) (?:\(.*?\) )?(?:mostró|muestra) \[(.+?)\] y (ganó|perdió|empató)(?:\s*\(([\d.,]+))?/))) {
            hand.shows[m[1]] = hand.shows[m[1]] || cardsFrom(m[2]);
            if (m[4]) hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[4]));
            continue;
          }
          if ((m = ln.match(/^Asiento \d+: (.+?) (?:\(.*?\) )?recaudó \(([\d.,]+)/))) {
            hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[2])); continue;
          }
          continue;
        }
      }

      if (['preflop', 'flop', 'turn', 'river'].includes(street)) {
        const act = parseAction(ln, locale);
        if (act) hand.streets[street].push(act);
      }
    }

    hand.boardAll = hand.board.flop.concat(hand.board.turn, hand.board.river);
    finalizeHandMeta(hand, headerText);
    return hand;
  }

  function parseSession(text, fileName, locale) {
    locale = locale || detectLocale(text) || 'es';
    const L = LOCALES[locale] || LOCALES.es;
    const blocks = text.split(L.blockSplit).filter((b) => L.blockTest.test(b.trim()));
    const hands = [];
    const heroCount = {};
    const discardedByReason = emptyDiscardCounts();
    for (let i = 0; i < blocks.length; i++) {
      try {
        const h = parseHand(blocks[i], locale);
        const keep = isKeepableHand(h);
        if (!keep.ok) {
          if (keep.reason && discardedByReason[keep.reason] != null) discardedByReason[keep.reason]++;
          else discardedByReason.badParse++;
          continue;
        }
        if (h.hero) heroCount[h.hero] = (heroCount[h.hero] || 0) + 1;
        hands.push(h);
      } catch (e) { discardedByReason.badParse++; }
    }
    let hero = null;
    let best = -1;
    const heroCandidates = Object.keys(heroCount).map((n) => ({ name: n, hands: heroCount[n] }))
      .sort((a, b) => b.hands - a.hands);
    for (let i = 0; i < heroCandidates.length; i++) {
      if (heroCandidates[i].hands > best) { best = heroCandidates[i].hands; hero = heroCandidates[i].name; }
    }
    return {
      fileName: fileName || 'sesion.txt',
      hero,
      heroCandidates,
      hands,
      discardedByReason,
      format: {
        platform: 'pokerstars',
        platformLabel: 'PokerStars',
        locale: locale,
        localeLabel: L.label
      }
    };
  }

  function countHandBlocks(text, locale) {
    if (locale === 'en') return (text.match(/^PokerStars (?:Zoom )?Hand #/gm) || []).length;
    return (text.match(/^Mano n\.º /gm) || []).length;
  }

  function detect(text) {
    const locale = detectLocale(text);
    if (!locale) return 0;
    return countHandBlocks(text, locale);
  }

  function describe(text) {
    const locale = detectLocale(text);
    if (!locale) return null;
    const L = LOCALES[locale];
    const blocks = countHandBlocks(text, locale);
    return {
      platform: 'pokerstars',
      platformLabel: 'PokerStars',
      locale: locale,
      localeLabel: L.label,
      handBlocks: blocks
    };
  }

  Formats.register({
    id: 'pokerstars',
    name: 'PokerStars',
    detect: detect,
    describe: describe,
    parseSession: parseSession,
    parseHand: parseHand,
    detectLocale: detectLocale
  });

  global.PTPokerStarsParser = { parseSession, parseHand, detectLocale, describe };
})(window);

/*
 * parsers/winamax.js — Parser Winamax NLHE (cash / tournament / spins).
 */
(function (global) {
  'use strict';

  const U = global.PTHHUtils;
  const Formats = global.PTHandHistoryFormats;
  if (!U || !Formats) return;

  const num = U.num;
  const cardsFrom = U.cardsFrom;
  const finalizeHandMeta = U.finalizeHandMeta;
  const isKeepableHand = U.isKeepableHand;
  const emptyDiscardCounts = U.emptyDiscardCounts;
  const norm = U.normalizeMoneyText || function (s) { return String(s == null ? '' : s); };
  // Tras el número puede ir €, â‚¬ (mojibake) u otros restos de encoding
  const CUR = '[^0-9./\\s)]*';

  const BLOCK_SPLIT = /(?=^Winamax Poker - )/m;
  const BLOCK_TEST = /^Winamax Poker - /;

  function countHandBlocks(text) {
    return (text.match(/^Winamax Poker - /gm) || []).length;
  }

  function parseAction(ln) {
    let m;
    if ((m = ln.match(/^(.+?)(?::\s*|\s+)folds$/))) return { player: m[1].trim(), type: 'fold' };
    if ((m = ln.match(/^(.+?)(?::\s*|\s+)checks$/))) return { player: m[1].trim(), type: 'check' };
      if ((m = ln.match(/^(.+?)(?::\s*|\s+)calls ([\d.,]+)/))) {
      return { player: m[1].trim(), type: 'call', amount: num(m[2]), allin: /all-in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?)(?::\s*|\s+)bets ([\d.,]+)/))) {
      return { player: m[1].trim(), type: 'bet', amount: num(m[2]), allin: /all-in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?)(?::\s*|\s+)raises ([\d.,]+)(?:€|â‚¬)? to ([\d.,]+)/))) {
      return {
        player: m[1].trim(), type: 'raise', amount: num(m[2]), to: num(m[3]),
        allin: /all-in/i.test(ln)
      };
    }
    return null;
  }

  function parseHand(block) {
    const lines = block.split(/\r?\n/);
    const hand = {
      id: null, datetime: null, sb: 0, bb: 0, currency: '€',
      buttonSeat: null, seats: [], hero: null, heroCards: [],
      blinds: { sb: null, bb: null }, posts: {},
      streets: { preflop: [], flop: [], turn: [], river: [] },
      board: { flop: [], turn: [], river: [] }, boardAll: [],
      shows: {}, collected: {}, uncalledTo: {},
      rake: 0, potTotal: 0, positions: {}, isCash: false, isTournament: false,
      platform: 'winamax', locale: 'en',
      gameKind: 'unknown', tableMax: null, variant: 'unknown'
    };

    let street = 'preheader';
    let headerText = '';

    for (let i = 0; i < lines.length; i++) {
      const ln = norm(lines[i].trim());
      if (!ln) continue;

      let m;

      if (/^Escape to Pot:/i.test(ln)) continue;

      if ((m = ln.match(new RegExp('^Winamax Poker - .+ - HandId: #([\\d-]+) - Holdem no limit \\(([\\d.,]+)' + CUR + '\\/([\\d.,]+)' + CUR + '\\) - (.+)', 'i')))) {
        hand.id = (m[1].split('-').pop() || m[1]);
        hand.sb = num(m[2]);
        hand.bb = num(m[3]);
        hand.datetime = m[4].replace(' UTC', '').trim();
        headerText += ' ' + ln;
        hand.isTournament = /tournament|spin|sit\s*&?\s*go|expresso/i.test(ln);
        hand.isCash = !hand.isTournament;
        hand.variant = 'nlhe';
        continue;
      }
      // Tournament / Expresso sin stakes €/€ en la misma forma
      if ((m = ln.match(/^Winamax Poker - .+ - HandId: #([\d-]+) - (.+)/i))) {
        if (!hand.id) {
          hand.id = (m[1].split('-').pop() || m[1]);
          headerText += ' ' + ln;
          hand.isTournament = /tournament|spin|expresso|sit\s*&?\s*go/i.test(ln);
          hand.isCash = !hand.isTournament;
          if (/Holdem|Hold'em/i.test(ln)) hand.variant = 'nlhe';
          const lvl = U.parseTournamentBlinds(ln);
          if (lvl) { hand.sb = lvl.sb; hand.bb = lvl.bb; }
          const cash = ln.match(new RegExp('\\(([\\d.,]+)' + CUR + '\\/([\\d.,]+)' + CUR + '\\)'));
          if (cash) { hand.sb = num(cash[1]); hand.bb = num(cash[2]); }
          const dt = ln.match(/(\d{4}\/\d{2}\/\d{2}\s+\d{1,2}:\d{2}:\d{2})/);
          if (dt) hand.datetime = dt[1];
        }
        continue;
      }

      if ((m = ln.match(/^Table: '([^']*)'\s+(\d+)-max/i)) || (m = ln.match(/^Table: .+ (\d+)-max/i))) {
        headerText += ' ' + ln;
        if (m[2]) hand.tableMax = parseInt(m[2], 10);
        else {
          const tmax = U.detectTableMaxFromText(ln);
          if (tmax) hand.tableMax = tmax;
        }
        if (/real money/i.test(ln) && !hand.isTournament) hand.isCash = true;
        if ((m = ln.match(/Seat #(\d+) is the button/))) hand.buttonSeat = +m[1];
        continue;
      }

      if ((m = ln.match(/^Table: .+ Seat #(\d+) is the button/))) {
        hand.buttonSeat = +m[1];
        headerText += ' ' + ln;
        const tmax = U.detectTableMaxFromText(ln);
        if (tmax) hand.tableMax = tmax;
        if (/real money/i.test(ln) && !hand.isTournament) hand.isCash = true;
        continue;
      }

      if ((m = ln.match(/^Seat (\d+):\s*(.+?)\s*\(([\d.,]+)/))) {
        hand.seats.push({ seat: +m[1], name: m[2].trim(), stack: num(m[3]) });
        continue;
      }

      if (/^\*\*\* ANTE\/BLINDS \*\*\*/.test(ln)) { street = 'preflop'; continue; }

      if ((m = ln.match(/^(.+?) posts ante ([\d.,]+)/i)) || (m = ln.match(/^(.+?) posts the ante ([\d.,]+)/i))) {
        hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]);
        hand.ante = hand.ante || num(m[2]);
        continue;
      }
      if ((m = ln.match(/^(.+?) posts small blind ([\d.,]+)/))) {
        hand.blinds.sb = m[1];
        hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]);
        continue;
      }
      if ((m = ln.match(/^(.+?) posts big blind ([\d.,]+)/))) {
        hand.blinds.bb = m[1];
        hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]);
        continue;
      }
      if ((m = ln.match(/^(.+?) posts straddle ([\d.,]+)/i))) {
        hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]);
        hand.straddle = { player: m[1], amount: num(m[2]) };
        continue;
      }

      if ((m = ln.match(/^Dealt to (.+?) \[(.+?)\]/))) {
        hand.hero = m[1];
        hand.heroCards = cardsFrom(m[2]);
        continue;
      }

      if (/^\*\*\* PRE-FLOP \*\*/i.test(ln)) { street = 'preflop'; continue; }
      if ((m = ln.match(/^\*\*\* FLOP \*\*\* \[(.+?)\]/i))) {
        street = 'flop';
        hand.board.flop = cardsFrom(m[1]);
        continue;
      }
      if ((m = ln.match(/^\*\*\* TURN \*\*\* \[(.+?)\]\s*\[(.+?)\]/i))) {
        street = 'turn';
        hand.board.turn = cardsFrom(m[2]);
        if (!hand.board.flop.length) hand.board.flop = cardsFrom(m[1]).slice(0, 3);
        continue;
      }
      if ((m = ln.match(/^\*\*\* RIVER \*\*\* \[(.+?)\]\s*\[(.+?)\]/i))) {
        street = 'river';
        hand.board.river = cardsFrom(m[2]);
        continue;
      }
      if (/^\*\*\* SHOW DOWN \*\*\*/.test(ln)) { street = 'showdown'; continue; }
      if (/^\*\*\* SUMMARY \*\*\*/.test(ln)) { street = 'summary'; continue; }

      if ((m = ln.match(/^(.+?) collected ([\d.,]+)€? from (?:main pot|side pot \d+|pot)/))) {
        const who = m[1].trim();
        hand.collected[who] = (hand.collected[who] || 0) + num(m[2]);
        continue;
      }
      if ((m = ln.match(/^(.+?)(?::\s*|\s+)shows \[(.+?)\]/))) {
        hand.shows[m[1].trim()] = cardsFrom(m[2]);
        continue;
      }

      if (street === 'summary') {
        if ((m = ln.match(/^Total pot ([\d.,]+)€?(?:\s*\|\s*(?:Rake ([\d.,]+)€?|No rake))?/))) {
          hand.potTotal = num(m[1]);
          if (m[2]) hand.rake = num(m[2]);
          continue;
        }
        if ((m = ln.match(/^Board: \[(.+?)\]/))) {
          const b = cardsFrom(m[1]);
          if (b.length >= 3 && !hand.board.flop.length) hand.board.flop = b.slice(0, 3);
          if (b.length >= 4 && !hand.board.turn.length) hand.board.turn = [b[3]];
          if (b.length >= 5 && !hand.board.river.length) hand.board.river = [b[4]];
          continue;
        }
        if ((m = ln.match(/^Seat \d+: (.+?) (?:\([^)]*\) )?showed \[([^\]]+)\](?: and won ([\d.,]+)€?(?: with|$))?/))) {
          const who = m[1].trim();
          hand.shows[who] = hand.shows[who] || cardsFrom(m[2]);
          if (m[3] != null) hand.collected[who] = Math.max(hand.collected[who] || 0, num(m[3]));
          continue;
        }
        if ((m = ln.match(/^Seat \d+: (.+?) (?:\([^)]*\) )?won ([\d.,]+)€?(?: with|$)/))) {
          const who = m[1].trim();
          hand.collected[who] = Math.max(hand.collected[who] || 0, num(m[2]));
          continue;
        }
        continue;
      }

      if (['preflop', 'flop', 'turn', 'river'].includes(street)) {
        const act = parseAction(ln);
        if (act) hand.streets[street].push(act);
      }
    }

    hand.boardAll = hand.board.flop.concat(hand.board.turn, hand.board.river);
    finalizeHandMeta(hand, headerText);
    return hand;
  }

  function parseSession(text, fileName) {
    const blocks = text.split(BLOCK_SPLIT).filter((b) => BLOCK_TEST.test(b.trim()));
    const hands = [];
    const heroCount = {};
    const discardedByReason = emptyDiscardCounts();
    for (let i = 0; i < blocks.length; i++) {
      try {
        const h = parseHand(blocks[i]);
        const keep = isKeepableHand(h);
        if (!keep.ok) {
          if (keep.reason && discardedByReason[keep.reason] != null) discardedByReason[keep.reason]++;
          else discardedByReason.badParse++;
          continue;
        }
        if (h.hero) heroCount[h.hero] = (heroCount[h.hero] || 0) + 1;
        hands.push(h);
      } catch (e) { discardedByReason.badParse++; }
    }
    let hero = null;
    let best = -1;
    const heroCandidates = Object.keys(heroCount).map((n) => ({ name: n, hands: heroCount[n] }))
      .sort((a, b) => b.hands - a.hands);
    for (let i = 0; i < heroCandidates.length; i++) {
      if (heroCandidates[i].hands > best) { best = heroCandidates[i].hands; hero = heroCandidates[i].name; }
    }
    return {
      fileName: fileName || 'winamax.txt',
      hero,
      heroCandidates,
      hands,
      discardedByReason,
      format: {
        platform: 'winamax',
        platformLabel: 'Winamax',
        locale: 'en',
        localeLabel: 'English'
      }
    };
  }

  function detect(text) {
    return countHandBlocks(text);
  }

  function describe(text) {
    const blocks = countHandBlocks(text);
    if (!blocks) return null;
    return {
      platform: 'winamax',
      platformLabel: 'Winamax',
      locale: 'en',
      localeLabel: 'English',
      handBlocks: blocks
    };
  }

  Formats.register({
    id: 'winamax',
    name: 'Winamax',
    detect: detect,
    describe: describe,
    parseSession: parseSession,
    parseHand: parseHand
  });

  global.PTWinamaxParser = { parseSession, parseHand, describe };
})(window);

/*
 * parsers/ggpoker.js — Parser GGPoker / Natural8 NLHE (cash / spins / MTT).
 */
(function (global) {
  'use strict';

  const U = global.PTHHUtils;
  const Formats = global.PTHandHistoryFormats;
  if (!U || !Formats) return;

  const num = U.num;
  const cardsFrom = U.cardsFrom;
  const finalizeHandMeta = U.finalizeHandMeta;
  const isKeepableHand = U.isKeepableHand;
  const emptyDiscardCounts = U.emptyDiscardCounts;

  const BLOCK_SPLIT = /(?=^Poker Hand #)/m;
  const BLOCK_TEST = /^Poker Hand #/;
  const GG_HAND_RE = /^Poker Hand #([A-Z]{0,2}\d+)/gm;
  const PS_HAND_RE = /^PokerStars (?:Zoom )?Hand #/gm;

  function countHandBlocks(text) {
    if (!text) return 0;
    const gg = (text.match(GG_HAND_RE) || []).length;
    if (!gg) return 0;
    const ps = (text.match(PS_HAND_RE) || []).length;
    if (ps > 0 && /PokerStars/i.test(text.slice(0, 400))) return 0;
    return gg;
  }

  function parseAction(ln) {
    let m;
    if ((m = ln.match(/^(.+?): folds/))) return { player: m[1].trim(), type: 'fold' };
    if ((m = ln.match(/^(.+?): checks/))) return { player: m[1].trim(), type: 'check' };
    if ((m = ln.match(/^(.+?): calls ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
      return { player: m[1].trim(), type: 'call', amount: num(m[3]), allin: /all-in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?): bets ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
      return { player: m[1].trim(), type: 'bet', amount: num(m[3]), allin: /all-in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?): raises ((?:[€$£]|â‚¬)?)([\d.,]+) to ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
      return {
        player: m[1].trim(), type: 'raise', amount: num(m[3]), to: num(m[5]),
        allin: /all-in/i.test(ln)
      };
    }
    return null;
  }

  function parseHand(block) {
    const lines = block.split(/\r?\n/);
    const hand = {
      id: null, datetime: null, sb: 0, bb: 0, currency: '$',
      buttonSeat: null, seats: [], hero: null, heroCards: [],
      blinds: { sb: null, bb: null }, posts: {},
      streets: { preflop: [], flop: [], turn: [], river: [] },
      board: { flop: [], turn: [], river: [] }, boardAll: [],
      shows: {}, collected: {}, uncalledTo: {},
      rake: 0, potTotal: 0, positions: {}, isCash: false, isTournament: false,
      platform: 'ggpoker', locale: 'en',
      gameKind: 'unknown', tableMax: null, variant: 'unknown'
    };

    let street = 'preheader';
    let headerText = '';

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i].trim();
      if (!ln) continue;

      let m;

      if ((m = ln.match(/^Poker Hand #([A-Z]{0,2}\d+):\s*(.+)$/))) {
        hand.id = m[1];
        const rest = m[2];
        headerText += ' ' + ln;
        hand.isTournament = /Tournament\s*#/i.test(rest) || /^TM/i.test(m[1])
          || U.isSpinSignal(rest) || U.isSngSignal(rest);
        hand.isCash = !hand.isTournament;

        const cashStakes = rest.match(/Hold'?em\s+No\s+Limit\s+\(((?:[€$£]|â‚¬)?)([\d.,]+)\/((?:[€$£]|â‚¬)?)([\d.,]+)\)/i);
        if (cashStakes) {
          hand.currency = cashStakes[1] === '€' || cashStakes[1] === 'â‚¬' ? '€'
            : (cashStakes[1] === '£' ? '£' : '$');
          hand.sb = num(cashStakes[2]);
          hand.bb = num(cashStakes[4]);
          // Si el id es TM… o hay Tournament, mantener torneo aunque haya (sb/bb) en chips
          if (!hand.isTournament) {
            hand.isCash = true;
            hand.isTournament = false;
          }
          hand.variant = 'nlhe';
        } else {
          const lvl = U.parseTournamentBlinds(rest);
          if (lvl) {
            hand.sb = lvl.sb;
            hand.bb = lvl.bb;
            if (lvl.ante) hand.ante = lvl.ante;
            hand.isTournament = true;
            hand.isCash = false;
            hand.variant = 'nlhe';
          }
        }
        if (/Hold'?em/i.test(rest)) hand.variant = 'nlhe';

        const dt = rest.match(/-\s+(\d{4}\/\d{2}\/\d{2}\s+\d{1,2}:\d{2}(?::\d{2})?)/);
        if (dt) hand.datetime = dt[1].trim();
        continue;
      }

      if (/^Table\s+/i.test(ln)) {
        headerText += ' ' + ln;
        const tmax = U.detectTableMaxFromText(ln);
        if (tmax) hand.tableMax = tmax;
        if ((m = ln.match(/Seat\s+#(\d+)\s+is the button/i))) hand.buttonSeat = +m[1];
        continue;
      }

      if ((m = ln.match(/^Seat\s+(\d+):\s*(.+?)\s*\(((?:[€$£]|â‚¬)?)([\d.,]+)\s+in chips/i))) {
        const cur = m[3];
        if (cur === '€' || cur === 'â‚¬') hand.currency = '€';
        else if (cur === '£') hand.currency = '£';
        else if (cur === '$') hand.currency = '$';
        hand.seats.push({ seat: +m[1], name: m[2].trim(), stack: num(m[4]) });
        continue;
      }

      if ((m = ln.match(/^(.+?): posts small blind ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
        hand.blinds.sb = m[1].trim();
        hand.posts[m[1].trim()] = (hand.posts[m[1].trim()] || 0) + num(m[3]);
        continue;
      }
      if ((m = ln.match(/^(.+?): posts big blind ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
        hand.blinds.bb = m[1].trim();
        hand.posts[m[1].trim()] = (hand.posts[m[1].trim()] || 0) + num(m[3]);
        continue;
      }
      if ((m = ln.match(/^(.+?): posts the ante ((?:[€$£]|â‚¬)?)([\d.,]+)/i))) {
        const who = m[1].trim();
        hand.posts[who] = (hand.posts[who] || 0) + num(m[3]);
        hand.ante = hand.ante || num(m[3]);
        continue;
      }
      if ((m = ln.match(/^(.+?): straddle[s]? ((?:[€$£]|â‚¬)?)([\d.,]+)/i))) {
        const who = m[1].trim();
        hand.posts[who] = (hand.posts[who] || 0) + num(m[3]);
        hand.straddle = { player: who, amount: num(m[3]) };
        continue;
      }

      if (/^\*\*\* HOLE CARDS \*\*\*/i.test(ln) || /^\*\*\* PRE-FLOP \*\*\*/i.test(ln)) {
        street = 'preflop';
        continue;
      }
      if ((m = ln.match(/^Dealt to (.+?) \[(.+?)\]/))) {
        if (!hand.hero && m[2] && m[2].trim()) {
          hand.hero = m[1].trim();
          hand.heroCards = cardsFrom(m[2]);
        }
        continue;
      }
      if (/^Dealt to /i.test(ln)) continue;

      if ((m = ln.match(/^\*\*\* FLOP \*\*\* \[(.+?)\]/i))) {
        street = 'flop';
        hand.board.flop = cardsFrom(m[1]);
        continue;
      }
      if ((m = ln.match(/^\*\*\* TURN \*\*\* \[(.+?)\]\s*\[(.+?)\]/i))) {
        street = 'turn';
        hand.board.turn = cardsFrom(m[2]);
        if (!hand.board.flop.length) hand.board.flop = cardsFrom(m[1]).slice(0, 3);
        continue;
      }
      if ((m = ln.match(/^\*\*\* RIVER \*\*\* \[(.+?)\]\s*\[(.+?)\]/i))) {
        street = 'river';
        hand.board.river = cardsFrom(m[2]);
        continue;
      }
      if (/^\*\*\* SHOWDOWN \*\*\*/i.test(ln) || /^\*\*\* SHOW DOWN \*\*\*/i.test(ln)) {
        street = 'showdown';
        continue;
      }
      if (/^\*\*\* SUMMARY \*\*\*/i.test(ln)) {
        street = 'summary';
        continue;
      }

      if ((m = ln.match(/^Uncalled bet \(((?:[€$£]|â‚¬)?)([\d.,]+)\) returned to (.+)$/i))) {
        hand.uncalledTo[m[3].trim()] = (hand.uncalledTo[m[3].trim()] || 0) + num(m[2]);
        continue;
      }
      if ((m = ln.match(/^(.+?) collected ((?:[€$£]|â‚¬)?)([\d.,]+) from (?:main )?pot/i))) {
        const who = m[1].trim();
        hand.collected[who] = (hand.collected[who] || 0) + num(m[3]);
        continue;
      }
      if ((m = ln.match(/^(.+?): shows \[(.+?)\]/))) {
        hand.shows[m[1].trim()] = cardsFrom(m[2]);
        continue;
      }

      if (street === 'summary') {
        if ((m = ln.match(/^Total pot ((?:[€$£]|â‚¬)?)([\d.,]+)(?:\s*\|\s*Rake ((?:[€$£]|â‚¬)?)([\d.,]+))?/i))) {
          hand.potTotal = num(m[2]);
          if (m[4] != null) hand.rake = num(m[4]);
          continue;
        }
        if ((m = ln.match(/^Board\s*\[(.+?)\]/i))) {
          const b = cardsFrom(m[1]);
          if (b.length >= 3 && !hand.board.flop.length) hand.board.flop = b.slice(0, 3);
          if (b.length >= 4 && !hand.board.turn.length) hand.board.turn = [b[3]];
          if (b.length >= 5 && !hand.board.river.length) hand.board.river = [b[4]];
          continue;
        }
        if ((m = ln.match(/^Seat \d+: (.+?) (?:\([^)]*\) )?showed \[([^\]]+)\](?: and (?:won|collected) \(((?:[€$£]|â‚¬)?)([\d.,]+)\))?/i))) {
          const who = m[1].trim();
          hand.shows[who] = hand.shows[who] || cardsFrom(m[2]);
          if (m[4] != null) hand.collected[who] = Math.max(hand.collected[who] || 0, num(m[4]));
          continue;
        }
        if ((m = ln.match(/^Seat \d+: (.+?) (?:\([^)]*\) )?(?:won|collected) \(((?:[€$£]|â‚¬)?)([\d.,]+)\)/i))) {
          const who = m[1].trim();
          hand.collected[who] = Math.max(hand.collected[who] || 0, num(m[3]));
          continue;
        }
        continue;
      }

      if (['preflop', 'flop', 'turn', 'river'].includes(street)) {
        const act = parseAction(ln);
        if (act) hand.streets[street].push(act);
      }
    }

    hand.boardAll = hand.board.flop.concat(hand.board.turn, hand.board.river);
    finalizeHandMeta(hand, headerText);
    return hand;
  }

  function parseSession(text, fileName) {
    const blocks = text.split(BLOCK_SPLIT).filter((b) => BLOCK_TEST.test(b.trim()));
    const hands = [];
    const heroCount = {};
    const discardedByReason = emptyDiscardCounts();
    for (let i = 0; i < blocks.length; i++) {
      try {
        const h = parseHand(blocks[i]);
        const keep = isKeepableHand(h);
        if (!keep.ok) {
          if (keep.reason && discardedByReason[keep.reason] != null) discardedByReason[keep.reason]++;
          else discardedByReason.badParse++;
          continue;
        }
        if (h.hero) heroCount[h.hero] = (heroCount[h.hero] || 0) + 1;
        hands.push(h);
      } catch (e) { discardedByReason.badParse++; }
    }
    let hero = null;
    let best = -1;
    const heroCandidates = Object.keys(heroCount).map((n) => ({ name: n, hands: heroCount[n] }))
      .sort((a, b) => b.hands - a.hands);
    for (let i = 0; i < heroCandidates.length; i++) {
      if (heroCandidates[i].hands > best) { best = heroCandidates[i].hands; hero = heroCandidates[i].name; }
    }
    return {
      fileName: fileName || 'ggpoker.txt',
      hero,
      heroCandidates,
      hands,
      discardedByReason,
      format: {
        platform: 'ggpoker',
        platformLabel: 'GGPoker',
        locale: 'en',
        localeLabel: 'English'
      }
    };
  }

  function detect(text) {
    return countHandBlocks(text);
  }

  function describe(text) {
    const blocks = countHandBlocks(text);
    if (!blocks) return null;
    return {
      platform: 'ggpoker',
      platformLabel: 'GGPoker',
      locale: 'en',
      localeLabel: 'English',
      handBlocks: blocks
    };
  }

  Formats.register({
    id: 'ggpoker',
    name: 'GGPoker',
    detect: detect,
    describe: describe,
    parseSession: parseSession,
    parseHand: parseHand
  });

  global.PTGGPokerParser = { parseSession, parseHand, describe };
})(window);

/*
 * parsers/eightyeight.js — Parser 888poker / Pacific (NLHE cash + torneos).
 * Formato típico: "***** 888poker Hand History for Game … *****"
 */
(function (global) {
  'use strict';

  const U = global.PTHHUtils;
  const Formats = global.PTHandHistoryFormats;
  if (!U || !Formats) return;

  const num = U.num;
  const cardsFrom = U.cardsFrom;
  const finalizeHandMeta = U.finalizeHandMeta;
  const isKeepableHand = U.isKeepableHand;
  const emptyDiscardCounts = U.emptyDiscardCounts;

  const BLOCK_SPLIT = /(?=^\*{3,}\s*888poker Hand History for Game\s+\d+|\n?#Game No\s*:\s*\d+)/im;
  const BLOCK_TEST = /888poker Hand History for Game|^\s*#Game No\s*:/i;

  function countHandBlocks(text) {
    const a = (text.match(/\*{3,}\s*888poker Hand History for Game\s+\d+/gi) || []).length;
    const b = (text.match(/^\s*#Game No\s*:\s*\d+/gim) || []).length;
    return Math.max(a, b);
  }

  function parseAction(ln) {
    let m;
    if ((m = ln.match(/^(.+?) folds$/i))) return { player: m[1].trim(), type: 'fold' };
    if ((m = ln.match(/^(.+?) checks$/i))) return { player: m[1].trim(), type: 'check' };
    if ((m = ln.match(/^(.+?) calls?\s*\[?\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\]?/i))) {
      return { player: m[1].trim(), type: 'call', amount: num(m[3]), allin: /all[\s-]?in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?) bets?\s*\[?\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\]?/i))) {
      return { player: m[1].trim(), type: 'bet', amount: num(m[3]), allin: /all[\s-]?in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?) raises?\s*\[?\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\]?/i))) {
      return { player: m[1].trim(), type: 'raise', amount: num(m[3]), to: num(m[3]), allin: /all[\s-]?in/i.test(ln) };
    }
    return null;
  }

  function parseHand(block) {
    const lines = String(block || '').split(/\r?\n/);
    const hand = {
      id: null, datetime: null, sb: 0, bb: 0, currency: '$',
      buttonSeat: null, seats: [], hero: null, heroCards: [],
      blinds: { sb: null, bb: null }, posts: {},
      streets: { preflop: [], flop: [], turn: [], river: [] },
      board: { flop: [], turn: [], river: [] }, boardAll: [],
      shows: {}, collected: {}, uncalledTo: {},
      rake: 0, potTotal: 0, positions: {}, isCash: false, isTournament: false,
      platform: '888poker', locale: 'en',
      gameKind: 'unknown', tableMax: null, variant: 'unknown', isZoom: false
    };

    let street = 'preheader';
    let headerText = '';

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i].trim();
      if (!ln) continue;

      let m;
      if ((m = ln.match(/#Game No\s*:\s*(\d+)/i)) || (m = ln.match(/Hand History for Game\s+(\d+)/i))) {
        hand.id = m[1];
        headerText += ' ' + ln;
        continue;
      }

      // Blinds line: $0.05/$0.10 Blinds No Limit Holdem
      if ((m = ln.match(/((?:[€$£]|â‚¬)?)([\d.,]+)\s*\/\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*Blinds/i))) {
        headerText += ' ' + ln;
        hand.sb = num(m[2]);
        hand.bb = num(m[4]);
        hand.currency = (m[1] === '€' || m[1] === 'â‚¬') ? '€' : (m[1] === '£' ? '£' : '$');
        hand.isTournament = /Tournament/i.test(ln) || /Tournament/i.test(headerText);
        hand.isCash = !hand.isTournament;
        const det = U.detectVariant(ln);
        hand.variant = (det && det !== 'unknown') ? det : 'nlhe';
        continue;
      }

      // Tournament blinds without $ in blinds line
      if (/Tournament\s*#/i.test(ln) || /\bTournament\b/i.test(ln)) {
        headerText += ' ' + ln;
        hand.isTournament = true;
        hand.isCash = false;
        continue;
      }

      if ((m = ln.match(/Table\s+(.+?)\s+(\d+)\s*Max/i))) {
        hand.tableMax = +m[2];
        headerText += ' ' + ln;
        continue;
      }
      if ((m = ln.match(/Seat\s+(\d+)\s+is the button/i))) {
        hand.buttonSeat = +m[1];
        continue;
      }
      if ((m = ln.match(/^Seat\s+(\d+):\s*(.+?)\s*\(\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\)/i))) {
        hand.seats.push({ seat: +m[1], name: m[2].trim(), stack: num(m[4]) });
        continue;
      }

      if ((m = ln.match(/^(.+?)\s+posts ante\s*\[?\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\]?/i))) {
        const who = m[1].trim();
        hand.posts[who] = (hand.posts[who] || 0) + num(m[3]);
        hand.ante = hand.ante || num(m[3]);
        continue;
      }
      if ((m = ln.match(/^(.+?)\s+posts small blind\s*\[?\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\]?/i))) {
        hand.blinds.sb = m[1].trim();
        hand.posts[hand.blinds.sb] = (hand.posts[hand.blinds.sb] || 0) + num(m[3]);
        continue;
      }
      if ((m = ln.match(/^(.+?)\s+posts big blind\s*\[?\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\]?/i))) {
        hand.blinds.bb = m[1].trim();
        hand.posts[hand.blinds.bb] = (hand.posts[hand.blinds.bb] || 0) + num(m[3]);
        continue;
      }

      if (/\*\*\s*Dealing down cards\s*\*\*/i.test(ln)) {
        street = 'preflop';
        continue;
      }
      if ((m = ln.match(/^Dealt to\s+(.+?)\s*\[\s*(.+?)\s*\]/i))) {
        hand.hero = m[1].trim();
        hand.heroCards = cardsFrom(m[2]);
        street = 'preflop';
        continue;
      }
      if ((m = ln.match(/\*\*\s*Dealing flop\s*\*\*\s*\[\s*(.+?)\s*\]/i))) {
        street = 'flop';
        hand.board.flop = cardsFrom(m[1]);
        continue;
      }
      if ((m = ln.match(/\*\*\s*Dealing turn\s*\*\*\s*\[\s*(.+?)\s*\]/i))) {
        street = 'turn';
        hand.board.turn = cardsFrom(m[1]);
        continue;
      }
      if ((m = ln.match(/\*\*\s*Dealing river\s*\*\*\s*\[\s*(.+?)\s*\]/i))) {
        street = 'river';
        hand.board.river = cardsFrom(m[1]);
        continue;
      }
      if (/\*\*\s*Summary\s*\*\*/i.test(ln)) {
        street = 'summary';
        continue;
      }

      if (street === 'summary') {
        if ((m = ln.match(/^(.+?)\s+shows?\s*\[\s*(.+?)\s*\]/i))) {
          hand.shows[m[1].trim()] = cardsFrom(m[2]);
          continue;
        }
        if ((m = ln.match(/^(.+?)\s+collected\s*\[?\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\]?/i))) {
          const who = m[1].trim();
          hand.collected[who] = (hand.collected[who] || 0) + num(m[3]);
          continue;
        }
        continue;
      }

      if (street === 'preflop' || street === 'flop' || street === 'turn' || street === 'river') {
        const act = parseAction(ln);
        if (act) {
          hand.streets[street].push(act);
          continue;
        }
      }
    }

    hand.boardAll = [].concat(hand.board.flop || [], hand.board.turn || [], hand.board.river || []);
    if (!hand.bb && hand.blinds.bb && hand.posts[hand.blinds.bb]) hand.bb = hand.posts[hand.blinds.bb];
    if (!hand.sb && hand.blinds.sb && hand.posts[hand.blinds.sb]) hand.sb = hand.posts[hand.blinds.sb];
    finalizeHandMeta(hand, headerText);
    return hand;
  }

  function parseSession(text, fileName) {
    const blocks = String(text || '').split(BLOCK_SPLIT).filter((b) => BLOCK_TEST.test(b.trim()));
    const hands = [];
    const heroCount = {};
    const discardedByReason = emptyDiscardCounts();
    for (let i = 0; i < blocks.length; i++) {
      try {
        const h = parseHand(blocks[i]);
        const keep = isKeepableHand(h);
        if (!keep.ok) {
          if (keep.reason && discardedByReason[keep.reason] != null) discardedByReason[keep.reason]++;
          else discardedByReason.badParse++;
          continue;
        }
        if (h.hero) heroCount[h.hero] = (heroCount[h.hero] || 0) + 1;
        hands.push(h);
      } catch (e) { discardedByReason.badParse++; }
    }
    let hero = null;
    let best = -1;
    const heroCandidates = Object.keys(heroCount).map((n) => ({ name: n, hands: heroCount[n] }))
      .sort((a, b) => b.hands - a.hands);
    for (let i = 0; i < heroCandidates.length; i++) {
      if (heroCandidates[i].hands > best) { best = heroCandidates[i].hands; hero = heroCandidates[i].name; }
    }
    return {
      fileName: fileName || '888poker.txt',
      hero,
      heroCandidates,
      hands,
      discardedByReason,
      format: {
        platform: '888poker',
        platformLabel: '888poker',
        locale: 'en',
        localeLabel: 'English'
      }
    };
  }

  function detect(text) {
    return countHandBlocks(text);
  }

  Formats.register({
    id: '888poker',
    name: '888poker',
    detect: detect,
    parseSession: parseSession,
    parseHand: parseHand,
    describe: function () {
      return {
        platform: '888poker',
        platformLabel: '888poker',
        locale: 'en',
        localeLabel: 'English'
      };
    }
  });
})(window);

/*
 * import.js
 * Importa y analiza historiales de manos (PokerStars ES/EN, Winamax, GGPoker).
 * - Detección automática de plataforma e idioma (PTHandHistoryFormats).
 * - Parsea cada mano (asientos, posiciones, acciones, board, resultado).
 * - Conserva cash / spins / MTT-SNG NLHE; descarta variantes no soportadas.
 * - Metadata: gameKind, tableMax, formatKey; ideales y rangos por formato.
 * - Analiza todas las manos del héroe con cartas (incl. folds preflop).
 * Expuesto como `Importer`.
 */
(function (global) {
  'use strict';

  const C = global.Cards;
  const R = global.Ranges;
  const E = global.Engine;
  const GTO = global.GTO;
  const D = global.GTORangesData;
  const VT = global.GTOVillainTracking;
  const PM = global.GTOPotMath;

  // ---------- utilidades numéricas ----------
  function num(s) {
    return global.PTHHUtils ? global.PTHHUtils.num(s) : numLocal(s);
  }
  function numLocal(s) {
    if (s == null) return 0;
    s = String(s).trim().replace(/\s|[€$£]/g, '');
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.indexOf(',') >= 0) s = s.replace(',', '.');
    const v = parseFloat(s);
    return isNaN(v) ? 0 : v;
  }
  function cardsFrom(str) {
    return global.PTHHUtils ? global.PTHHUtils.cardsFrom(str) : cardsFromLocal(str);
  }
  function cardsFromLocal(str) {
    const m = str.match(/[2-9TJQKA][shdc]/g) || str.match(/(?:10|[2-9TJQKA])[shdc]/g);
    if (!m) return [];
    return m.map((c) => c.replace('10', 'T'));
  }
  function r2(x) {
    return PM ? PM.roundBB(x) : Math.round(x * 100) / 100;
  }

  // ---------- PARSER (delegado a PTHandHistoryFormats) ----------
  function detectSessionFormat(text) {
    const Formats = global.PTHandHistoryFormats;
    if (!Formats) return null;
    return Formats.describe(text);
  }

  function parseSession(text, fileName) {
    const TS = global.PTTournamentSummary;
    if (TS && TS.isPokerStarsTournamentSummary && TS.isPokerStarsTournamentSummary(text)) {
      return TS.parsePokerStarsTournamentSummary(text, fileName);
    }
    const Formats = global.PTHandHistoryFormats;
    if (!Formats) throw new Error('Módulos de importación no cargados');
    const format = Formats.detectBest(text);
    if (!format || typeof format.parseSession !== 'function') {
      return { fileName: fileName || 'sesion.txt', hero: null, hands: [], format: null };
    }
    return format.parseSession(text, fileName);
  }

  function splitHandBlocks(text) {
    return text.split(/(?=^(?:Mano n\.º |PokerStars (?:Zoom )?Hand #|Poker Hand #|Winamax Poker - ))/m)
      .filter(function (b) {
        var t = b.trim();
        // Poker Hand # = GGPoker; PokerStars Hand # = PokerStars EN
        return /^(Mano n\.º|PokerStars|Poker Hand #|Winamax)/.test(t);
      });
  }

  function analyzeChunkSize(total) {
    if (total > 15000) return 50;
    if (total > 10000) return 40;
    if (total > 5000) return 25;
    if (total > 1000) return 12;
    return 6;
  }

  function parseChunkSize(total) {
    if (total > 10000) return 150;
    if (total > 5000) return 100;
    return 60;
  }

  /** Parsea sesiones grandes en lotes para no bloquear la UI. */
  function parseSessionAsync(text, fileName, onProgress) {
    var blocks = splitHandBlocks(text || '');
    if (blocks.length < 800) {
      return Promise.resolve(parseSession(text, fileName));
    }
    var hands = [];
    var heroCount = {};
    var detectedFormat = null;
    var discardedByReason = global.PTHHUtils && global.PTHHUtils.emptyDiscardCounts
      ? global.PTHHUtils.emptyDiscardCounts()
      : { badParse: 0, unsupportedVariant: 0, noBlinds: 0, unknownGame: 0, noHeroCards: 0 };
    var i = 0;
    var chunk = parseChunkSize(blocks.length);
    return new Promise(function (resolve, reject) {
      function step() {
        try {
          var end = Math.min(i + chunk, blocks.length);
          for (; i < end; i++) {
            var h = parseHand(blocks[i]);
            var keep = global.PTHHUtils && global.PTHHUtils.isKeepableHand
              ? global.PTHHUtils.isKeepableHand(h)
              : { ok: !!(h && h.bb > 0), reason: 'badParse' };
            if (!keep.ok) {
              if (keep.reason && discardedByReason[keep.reason] != null) discardedByReason[keep.reason]++;
              else discardedByReason.badParse++;
              continue;
            }
            if (h.hero) heroCount[h.hero] = (heroCount[h.hero] || 0) + 1;
            hands.push(h);
            if (!detectedFormat && h.platform) {
              detectedFormat = {
                platform: h.platform,
                platformLabel: h.platform === 'ggpoker' ? 'GGPoker'
                  : (h.platform === 'winamax' ? 'Winamax' : 'PokerStars'),
                locale: h.locale || null,
                localeLabel: h.locale === 'es' ? 'Español' : 'English'
              };
            }
          }
          if (onProgress) onProgress(i, blocks.length, 'parse');
          if (i < blocks.length) setTimeout(step, 0);
          else {
            var hero = null;
            var best = -1;
            Object.keys(heroCount).forEach(function (n) {
              if (heroCount[n] > best) { best = heroCount[n]; hero = n; }
            });
            var fmt = detectedFormat;
            if (!fmt) {
              var d = detectSessionFormat(text);
              if (d) fmt = { platform: d.platform, platformLabel: d.platformLabel, locale: d.locale, localeLabel: d.localeLabel };
            }
            resolve({
              fileName: fileName || 'sesion.txt',
              hero: hero,
              hands: hands,
              discardedByReason: discardedByReason,
              format: fmt
            });
          }
        } catch (e) { reject(e); }
      }
      setTimeout(step, 0);
    });
  }

  const BLOCK_TEST_WM = /^Winamax Poker - /;
  const BLOCK_TEST_GG = /^Poker Hand #/;

  function parseHand(block) {
    const text = (block || '').trim();
    const WM = global.PTWinamaxParser;
    const GG = global.PTGGPokerParser;
    const PS = global.PTPokerStarsParser;
    if (WM && BLOCK_TEST_WM.test(text)) return WM.parseHand(block);
    // GGPoker: "Poker Hand #" sin prefijo PokerStars
    if (GG && BLOCK_TEST_GG.test(text) && !/^PokerStars/i.test(text)) {
      return GG.parseHand(block);
    }
    if (PS && typeof PS.parseHand === 'function' && (/^Mano n\.º/i.test(text) || /^PokerStars/i.test(text))) {
      const locale = PS.detectLocale ? PS.detectLocale(block) : null;
      return PS.parseHand(block, locale);
    }
    const Formats = global.PTHandHistoryFormats;
    if (Formats) {
      const fmt = Formats.detectBest(block);
      if (fmt && typeof fmt.parseHand === 'function') return fmt.parseHand(block);
    }
    return null;
  }

  // ---------- ¿analizar esta mano del héroe? ----------
  function heroPlayed(hand) {
    if (!hand || !hand.hero || !hand.heroCards) return false;
    const n = hand.heroCards.length;
    const v = hand.variant || 'nlhe';
    if (v === 'plo' || v === 'plo5') return n >= 4;
    return n >= 2;
  }

  // ---------- ANALIZADOR GTO (vía evaluateSpot) ----------
  const BROAD_CONTINUE = D.BROAD_CONTINUE;
  const RANGE_3BET_POT = 'TT+, AQs+, AJs, KQs, AKo, AQo, 99, 88';
  const RANGE_SINGLE_RAISED = '99+, AJs+, KQs, QJs, JTs, AQo, AKo, TT';

  function inferVillainBaseRange(hand, hero) {
    const VT = global.GTOVillainTracking;
    if (VT && VT.preflopRangeFromHand) return VT.preflopRangeFromHand(hand, hero);
    let raiseCount = 0;
    let heroRaised = false;
    hand.streets.preflop.forEach((a) => {
      if (a.type === 'raise') {
        raiseCount++;
        if (a.player === hero) heroRaised = true;
      }
    });
    if (raiseCount >= 2 && heroRaised) return RANGE_3BET_POT;
    if (raiseCount >= 1) return RANGE_SINGLE_RAISED;
    return BROAD_CONTINUE;
  }

  // Orden postflop (primero → último). Quien actúa al final está en posición.
  const POSTFLOP_ORDER = ['SB', 'BB', 'UTG', 'UTG1', 'UTG2', 'EP0', 'EP1', 'LJ', 'HJ', 'CO', 'BTN'];

  function postflopOrderIndex(pos) {
    if (!pos) return -1;
    const i = POSTFLOP_ORDER.indexOf(pos);
    if (i >= 0) return i;
    if (String(pos).indexOf('UTG') === 0 || String(pos).indexOf('EP') === 0) return POSTFLOP_ORDER.indexOf('UTG');
    return -1;
  }

  /** Jugadores que llegan al flop (no foldearon preflop). */
  function playersReachedFlop(hand) {
    const folded = new Set();
    ((hand.streets && hand.streets.preflop) || []).forEach((a) => {
      if (a.type === 'fold') folded.add(a.player);
    });
    return Object.keys(hand.positions || {}).filter((p) => !folded.has(p));
  }

  /**
   * Héroe en posición postflop si actúa el último entre los que siguen en el bote.
   * Ej.: BB vs SB heads-up → BB está IP (antes se marcaba OOP por lista fija).
   */
  function heroIsInPositionPostflop(hand, hero) {
    const heroPos = (hand.positions && hand.positions[hero]) || null;
    if (!heroPos) return false;
    const remaining = playersReachedFlop(hand);
    if (remaining.length <= 1) return true;
    const heroIdx = postflopOrderIndex(heroPos);
    if (heroIdx < 0) return false;
    let maxIdx = -1;
    remaining.forEach((p) => {
      const idx = postflopOrderIndex(hand.positions[p]);
      if (idx > maxIdx) maxIdx = idx;
    });
    return heroIdx === maxIdx;
  }

  function inferHeroPostflopContext(hand, hero) {
    let heroRaised = false;
    hand.streets.preflop.forEach((a) => {
      if (a.type === 'raise' && a.player === hero) heroRaised = true;
    });
    return {
      initiative: heroRaised ? 'aggressor' : 'caller',
      inPosition: heroIsInPositionPostflop(hand, hero)
    };
  }

  /** True si el héroe ya bet/raise en una calle postflop anterior a `street`. */
  function heroLedOnPriorStreets(hand, hero, street) {
    const prior = street === 'turn' ? ['flop']
      : (street === 'river' ? ['flop', 'turn'] : []);
    return prior.some((st) => {
      const acts = (hand.streets && hand.streets[st]) || [];
      return acts.some((a) => a.player === hero && (a.type === 'bet' || a.type === 'raise'));
    });
  }

  function attachProbeAlerts(hand, decisions) {
    if (!global.GTOStreetValidation) return;
    decisions.forEach((d) => { delete d.renderAlert; });
    global.GTOStreetValidation.validateHandDecisions(decisions).forEach((alert) => {
      const d = decisions.find((x) => x.street === alert.street);
      if (d) d.renderAlert = alert.alert;
    });
    const boardsByStreet = {
      flop: boardUpTo(hand, 'flop'),
      turn: boardUpTo(hand, 'turn'),
      river: boardUpTo(hand, 'river')
    };
    const sanity = global.GTOStreetValidation.sanityCheckSolver(decisions, boardsByStreet, 1);
    if (!sanity.ok) {
      const rd = decisions.find((x) => x.street === 'river');
      if (rd) rd.renderAlert = (rd.renderAlert ? rd.renderAlert + ' ' : '') + sanity.log;
    }
  }

  function probeBetIdFromSize(betBB, potBB) {
    const pot = Math.max(potBB || 1, 0.1);
    const ratio = (betBB || 0) / pot;
    if (ratio >= 0.85) return 'bet_100';
    if (ratio >= 0.48) return 'bet_66';
    return 'bet_33';
  }

  function resolvePostflopChosen(type, toCallBB, betBB, potBB) {
    const raw = mapPostflopAction(type, toCallBB);
    if (raw === 'bet') return probeBetIdFromSize(betBB, potBB);
    return raw;
  }

  /** Reconstruye input de evaluateSpot desde una decisión guardada (replay / revisión). */
  function boardForAnalyzedHand(hand, d, street) {
    if (d && d.board && d.board.length) return d.board.slice();
    if (hand && hand.board && hand.board.length) {
      const n = { preflop: 0, flop: 3, turn: 4, river: 5 }[street] || 0;
      return hand.board.slice(0, n);
    }
    if (hand && hand.board && hand.board.flop) return boardUpTo(hand, street);
    return [];
  }

  function postflopCtxForDecision(hand, d) {
    if (d && d.initiative) {
      return {
        initiative: d.initiative,
        inPosition: d.inPosition != null ? d.inPosition : true
      };
    }
    if (hand && hand.streets && hand.hero) {
      return inferHeroPostflopContext(hand, hand.hero);
    }
    return { initiative: 'caller', inPosition: true };
  }

  function rebuildStreetsFromSummary(h) {
    const streets = { preflop: [], flop: [], turn: [], river: [] };
    (h.summary || []).forEach((item) => {
      if (item.kind !== 'action' || !streets[item.street]) return;
      streets[item.street].push({
        player: item.player,
        type: item.type,
        amount: item.amount,
        to: item.to,
        allin: item.allin
      });
    });
    return streets;
  }

  function ensureAnalyzedHandContext(h) {
    if (!h) return h;
    const out = h;
    if (!out.streets && out.summary && out.summary.length) {
      out.streets = rebuildStreetsFromSummary(out);
    }
    return out;
  }

  function villainContextForAnalyzedHand(hand, d) {
    hand = ensureAnalyzedHandContext(hand);
    if (!hand.streets || !hand.hero || !VT || !VT.inferVillainLineContext) {
      return {
        villainRange: d.villainRange || BROAD_CONTINUE,
        villainLastAction: d.villainLastAction || null,
        villainBetRatio: d.villainBetRatio != null ? d.villainBetRatio : null
      };
    }
    const street = d.street;
    const acts = hand.streets[street] || [];
    let heroActIndex = d.actionSequenceId;
    if (heroActIndex == null) {
      let n = 0;
      for (let i = 0; i < acts.length; i++) {
        if (acts[i].player === hand.hero) {
          if (n === 0 && d.chosen) { heroActIndex = i; break; }
          n++;
        }
      }
      if (heroActIndex == null) heroActIndex = acts.length;
    }
    const board = boardForAnalyzedHand(hand, d, street);
    const villainBase = inferVillainBaseRange(hand, hand.hero);
    return VT.inferVillainLineContext({
      hand, hero: hand.hero, street, heroActIndex,
      boardSoFar: board, villainBase, priorPotBB
    });
  }

  function handRangeContext(hand) {
    const RR = global.GTORangesRegistry;
    if (!RR) return null;
    if (hand.rangeContext) return RR.normalize(hand.rangeContext);
    return RR.inferFromHand(hand);
  }

  function attachRangeContext(input, hand) {
    const RR = global.GTORangesRegistry;
    const ctx = handRangeContext(hand);
    if (RR && ctx) RR.attachToInput(input, ctx);
    else if (!input.stackDepth) input.stackDepth = 100;
    return input;
  }

  function buildEvalInputFromDecision(hand, d, chosenOverride) {
    const heroPos = (hand.positions && hand.hero && hand.positions[hand.hero]) || hand.heroPos || '??';
    const street = d.street || 'preflop';
    const board = boardForAnalyzedHand(hand, d, street);
    const toCallBB = d.toCallBB || 0;
    const potEvalBB = d.potEvalBB != null ? d.potEvalBB
      : (toCallBB > 0 ? r2((d.potBB || 0) + toCallBB) : r2(d.potBB || 0));
    const potBeforeBB = d.potBeforeBB != null ? d.potBeforeBB
      : (toCallBB > 0 ? r2(Math.max(potEvalBB - toCallBB, 0.1)) : potEvalBB);
    const lineCtx = street !== 'preflop' ? villainContextForAnalyzedHand(hand, d) : null;
    const villainRange = lineCtx ? lineCtx.villainRange : (d.villainRange || BROAD_CONTINUE);
    const villainLastAction = lineCtx ? lineCtx.villainLastAction : d.villainLastAction;
    const villainBetRatio = lineCtx ? lineCtx.villainBetRatio : d.villainBetRatio;
    const RS = global.GTORiverShoveNode;
    const facingNode = d.facingNode || (RS
      ? RS.classifyFacingNode(toCallBB, potBeforeBB, d.street, villainLastAction)
      : 'small');
    const isRiverShove = d.street === 'river' && (facingNode === 'shove' || facingNode === 'overbet');
    const postflopCtx = postflopCtxForDecision(hand, d);

    const chosen = chosenOverride != null ? chosenOverride : d.chosen;
    const chosenAction = chosen === 'bet'
      ? probeBetIdFromSize(d.betSizeBB, potEvalBB)
      : (chosen === 'bet_33' || chosen === 'bet_66' || chosen === 'bet_100' ? chosen : chosen);
    const base = {
      spotKind: d.spotKind || (d.street === 'preflop' ? 'vsRFI' : 'postflop'),
      position: heroPos,
      vsPosition: d.vsPosition,
      vsRfiKey: d.vsRfiKey,
      stackDepth: (handRangeContext(hand) || {}).stackBB || 100,
      street: d.street,
      board,
      priorBoard: d.priorBoard,
      heroCards: hand.heroCards,
      handCode: hand.heroCode || (hand.heroCards.length === 2 ? R.handCode(hand.heroCards[0], hand.heroCards[1]) : null),
      potBB: potEvalBB,
      toCallBB,
      betSizeBB: d.betSizeBB || 0,
      potBeforeBB,
      bbSizeEuro: hand.bb || 0,
      chosenAction,
      initiative: d.initiative || postflopCtx.initiative,
      inPosition: d.inPosition != null ? d.inPosition : postflopCtx.inPosition,
      availableActions: d.options || (toCallBB > 0 ? ['fold', 'call', 'raise'] : ['check', 'bet_33', 'bet_66', 'bet_100'])
    };
    if (d.street === 'preflop') return attachRangeContext(base, hand);

    const initiative = base.initiative;
    let priorAggressorBet = d.priorAggressorBet;
    if (priorAggressorBet == null && initiative === 'aggressor' && hand && hand.hero) {
      priorAggressorBet = heroLedOnPriorStreets(ensureAnalyzedHandContext(hand), hand.hero, street);
    }
    if (priorAggressorBet == null) priorAggressorBet = false;

    return Object.assign(attachRangeContext(base, hand), {
      villainRange,
      heroEquity: d.heroEquity != null ? d.heroEquity / 100 : null,
      villainLastAction,
      villainBetRatio,
      potBeforeBB,
      facingNode,
      actionSequenceId: d.actionSequenceId,
      priorAggressorBet
    });
  }

  function recomputeDecisionGto(hand, d, chosenOverride) {
    if (!GTO || !GTO.evaluateSpot) return d;
    const evalResult = GTO.evaluateSpot(buildEvalInputFromDecision(hand, d, chosenOverride));
    const ev = evalResult.evaluation;
    d.gto = evalResult.strategy;
    d.optionBreakdown = evalResult.optionBreakdown;
    d.best = ev.best;
    d.class = ev.class;
    d.evLoss = ev.evLoss;
    d.evLossEuro = ev.evLossEuro;
    d.evErroneous = ev.evErroneous;
    d.evErrorReasons = ev.evErrorReasons;
    d.mathParams = ev.mathParams;
    d.bestAction = ev.bestAction;
    d.evLossTier = ev.evLossTier;
    d.actionEV = ev.actionEV;
    d.bestEV = ev.bestEV;
    d.frequency = ev.frequency;
    d.confidence = ev.confidence;
    d.confidenceTier = ev.confidenceTier;
    d.confidenceLabel = ev.confidenceLabel;
    d.confidenceTitle = ev.confidenceTitle;
    d.confidenceReasons = ev.confidenceReasons;
    d.score = ev.score;
    d.explanation = evalResult.explanation;
    const inputSnap = buildEvalInputFromDecision(hand, d, chosenOverride);
    d.villainRange = inputSnap.villainRange;
    d.villainLastAction = inputSnap.villainLastAction;
    d.villainBetRatio = inputSnap.villainBetRatio;
    if (evalResult.heroEquity != null) d.heroEquity = Math.round(evalResult.heroEquity * 100);
    return d;
  }

  /** Recalcula GTO de todas las decisiones (sesiones antiguas o tras invalidar caché). */
  function recomputeHandDecisions(hand) {
    if (!hand || !hand.decisions) return hand;
    hand = ensureAnalyzedHandContext(hand);
    try {
      if (global.GTOStreetValidation) global.GTOStreetValidation.invalidateSolverCache('hand refresh');
      hand.decisions.forEach((d) => recomputeDecisionGto(hand, d));
    } catch (e) {
      console.error('[Importer] recomputeHandDecisions failed', e);
      recomputeHeroNet(hand);
      return hand;
    }
    let totalEvLoss = GTO.EvLoss.totalEvLossFromDecisions(hand.decisions);
    const byStreet = {};
    hand.decisions.forEach((d) => {
      byStreet[d.street] = byStreet[d.street] || { n: 0, good: 0 };
      byStreet[d.street].n++;
      if (d.class === 'optima' || d.class === 'aceptable') byStreet[d.street].good++;
    });
    const nGood = hand.decisions.filter((d) => d.class === 'optima' || d.class === 'aceptable').length;
    hand.totalEvLoss = r2(totalEvLoss);
    hand.accuracy = hand.decisions.length ? Math.round((nGood / hand.decisions.length) * 100) : 100;
    hand.accuracyByStreet = byStreet;
    let worst = 'optima';
    const order = ['optima', 'aceptable', 'imprecisa', 'error'];
    hand.decisions.forEach((d) => { if (order.indexOf(d.class) > order.indexOf(worst)) worst = d.class; });
    hand.worstClass = worst;
    if (global.GTOScoring && global.GTOScoring.ensureHandScore) {
      global.GTOScoring.ensureHandScore(hand);
    }
    attachProbeAlerts(hand, hand.decisions);
    recomputeHeroNet(hand);
    return hand;
  }

  /** PLO / Short Deck: parse + timeline, sin scoring GTO (IMP-36/37). */
  function analyzeUnsupportedHand(hand) {
    const U = global.PTHHUtils;
    if (U && U.finalizeHandMeta) U.finalizeHandMeta(hand);
    const hero = hand.hero;
    const heroPos = (hand.positions && hand.positions[hero]) || '??';
    const heroCards = hand.heroCards || [];
    const bb = hand.bb || 0.05;
    const formatKey = hand.formatKey || (U && U.formatKeyFromMeta ? U.formatKeyFromMeta(hand) : 'cash6');
    const seatsCopy = (hand.seats || []).map((s) => ({ seat: s.seat, name: s.name, stack: s.stack }));
    const vLabel = U && U.variantLabel ? U.variantLabel(hand.variant) : (hand.variant || '?');
    const heroNetEuro = heroNet(hand);
    const heroNetBB = bb ? r2(heroNetEuro / bb) : 0;
    const analyzed = {
      id: hand.id, datetime: hand.datetime,
      heroPos, heroCards, heroCode: null,
      board: hand.boardAll, sb: hand.sb, bb: hand.bb,
      currency: hand.currency || '€',
      hero: hand.hero,
      positions: hand.positions,
      seats: seatsCopy,
      streets: hand.streets,
      posts: hand.posts,
      blinds: hand.blinds,
      villainShows: hand.shows,
      collected: Object.assign({}, hand.collected || {}),
      uncalledTo: Object.assign({}, hand.uncalledTo || {}),
      rake: hand.rake || 0,
      potTotal: hand.potTotal || 0,
      gameKind: hand.gameKind || (hand.isTournament ? 'mtt' : 'cash'),
      isCash: !!hand.isCash,
      isTournament: !!hand.isTournament,
      isZoom: !!hand.isZoom,
      tableMax: hand.tableMax || null,
      playersSeated: hand.playersSeated || seatsCopy.length,
      shortHanded: !!hand.shortHanded,
      variant: hand.variant,
      analysisUnsupported: true,
      unsupportedReason: 'Variante ' + vLabel + ': importada sin análisis GTO (aún no soportada).',
      platform: hand.platform || null,
      locale: hand.locale || null,
      formatKey: formatKey,
      format: U && U.legacyFormatFromKey ? U.legacyFormatFromKey(formatKey) : '6max',
      stakeTier: hand.stakeTier || null,
      stakesLabel: hand.stakesLabel || '',
      stackDepthBB: hand.stackDepthBB != null ? hand.stackDepthBB : null,
      avgStackBB: hand.avgStackBB != null ? hand.avgStackBB : null,
      mttPhase: hand.mttPhase || null,
      buyIn: hand.buyIn != null ? hand.buyIn : null,
      buyInFee: hand.buyInFee != null ? hand.buyInFee : null,
      multiplier: hand.multiplier != null ? hand.multiplier : null,
      ante: hand.ante || 0,
      straddle: hand.straddle || null,
      rangeContext: null,
      decisions: [],
      totalEvLoss: 0,
      accuracy: null,
      accuracyByStreet: {},
      heroNetBB,
      worstClass: 'optima',
      handScore: null,
      handScoreMeta: null,
      nDecisions: 0,
      summary: buildHandTimeline(hand),
      tags: [vLabel, 'sin GTO']
    };
    return analyzed;
  }

  function analyzeHand(hand) {
    const U0 = global.PTHHUtils;
    const unsupported = !!(hand.analysisUnsupported
      || (U0 && U0.isAnalysisUnsupportedVariant && U0.isAnalysisUnsupportedVariant(hand.variant)));
    if (unsupported) {
      return analyzeUnsupportedHand(hand);
    }

    const RR = global.GTORangesRegistry;
    if (RR) hand.rangeContext = RR.inferFromHand(hand);

    const hero = hand.hero;
    const heroPos = hand.positions[hero] || '??';
    const heroCards = hand.heroCards;
    const code = heroCards.length === 2 ? R.handCode(heroCards[0], heroCards[1]) : null;
    const bb = hand.bb || 0.05;

    if (global.GTOStreetValidation) global.GTOStreetValidation.invalidateSolverCache('new hand analysis');

    const decisions = [];
    // --- PREFLOP ---
    evalPreflop(hand, hero, heroPos, code, decisions);
    // --- POSTFLOP ---
    const villainBase = inferVillainBaseRange(hand, hero);
    const postflopCtx = inferHeroPostflopContext(hand, hero);
    ['flop', 'turn', 'river'].forEach((st) => evalStreet(hand, st, hero, heroCards, bb, decisions, villainBase, postflopCtx));

    if (global.GTOStreetValidation) {
      attachProbeAlerts(hand, decisions);
      const boardsByStreet = {
        flop: boardUpTo(hand, 'flop'),
        turn: boardUpTo(hand, 'turn'),
        river: boardUpTo(hand, 'river')
      };
      const sanity = global.GTOStreetValidation.sanityCheckSolver(decisions, boardsByStreet, 1);
      const facingAlerts = global.GTOStreetValidation.validateHandFacingNodes(decisions);
      if (!sanity.ok || facingAlerts.length) {
        if (!sanity.ok) global.GTOStreetValidation.invalidateSolverCache(sanity.log);
        if (facingAlerts.length) global.GTOStreetValidation.invalidateSolverCache('facing node clone');
        decisions.forEach((d) => recomputeDecisionGto(hand, d));
        attachProbeAlerts(hand, decisions);
      }
    }

    // ICM lite (spins/MTT): anota presión en decisiones cortas
    if (global.PTIcmLite && global.PTIcmLite.annotateHand) {
      global.PTIcmLite.annotateHand(hand, decisions);
    }

    // Comparativa vs rango GTO genérico (población) en spots RFI
    if (global.PTPopulationCompare && global.PTPopulationCompare.annotateDecisions) {
      global.PTPopulationCompare.annotateDecisions(hand, decisions);
    }

    // EV y acierto
    let totalEvLoss = GTO.EvLoss.totalEvLossFromDecisions(decisions);
    const byStreet = {};
    decisions.forEach((d) => {
      byStreet[d.street] = byStreet[d.street] || { n: 0, good: 0 };
      byStreet[d.street].n++;
      if (d.class === 'optima' || d.class === 'aceptable') byStreet[d.street].good++;
    });
    const nGood = decisions.filter((d) => d.class === 'optima' || d.class === 'aceptable').length;
    const accuracy = decisions.length ? Math.round((nGood / decisions.length) * 100) : 100;

    const heroNetEuro = heroNet(hand);
    const heroNetBB = bb ? r2(heroNetEuro / bb) : 0;
    const collected = Object.assign({}, hand.collected || {});
    const uncalledTo = Object.assign({}, hand.uncalledTo || {});

    let worst = 'optima';
    const order = ['optima', 'aceptable', 'imprecisa', 'error'];
    decisions.forEach((d) => { if (order.indexOf(d.class) > order.indexOf(worst)) worst = d.class; });

    const handScoreMeta = (global.GTOScoring && global.GTOScoring.scoreHand)
      ? global.GTOScoring.scoreHand(decisions, totalEvLoss)
      : null;

    const U = global.PTHHUtils;
    const formatKey = hand.formatKey || (U && U.formatKeyFromMeta ? U.formatKeyFromMeta(hand) : 'cash6');
    const seatsCopy = (hand.seats || []).map((s) => ({ seat: s.seat, name: s.name, stack: s.stack }));

    const analyzed = {
      id: hand.id, datetime: hand.datetime,
      heroPos, heroCards, heroCode: code,
      board: hand.boardAll, sb: hand.sb, bb: hand.bb,
      currency: hand.currency || '€',
      hero: hand.hero,
      positions: hand.positions,
      seats: seatsCopy,
      streets: hand.streets,
      posts: hand.posts,
      blinds: hand.blinds,
      villainShows: hand.shows,
      collected,
      uncalledTo,
      rake: hand.rake || 0,
      potTotal: hand.potTotal || 0,
      // Metadata de formato (P0/P1)
      gameKind: hand.gameKind || (hand.isTournament ? 'mtt' : 'cash'),
      isCash: !!hand.isCash,
      isTournament: !!hand.isTournament,
      isZoom: !!hand.isZoom,
      tableMax: hand.tableMax || null,
      playersSeated: hand.playersSeated || seatsCopy.length,
      shortHanded: !!hand.shortHanded,
      variant: hand.variant || 'nlhe',
      analysisUnsupported: false,
      platform: hand.platform || null,
      locale: hand.locale || null,
      formatKey: formatKey,
      format: U && U.legacyFormatFromKey ? U.legacyFormatFromKey(formatKey) : '6max',
      stakeTier: hand.stakeTier || null,
      stakesLabel: hand.stakesLabel || '',
      stackDepthBB: hand.stackDepthBB != null ? hand.stackDepthBB : null,
      avgStackBB: hand.avgStackBB != null ? hand.avgStackBB : null,
      mttPhase: hand.mttPhase || null,
      buyIn: hand.buyIn != null ? hand.buyIn : null,
      buyInFee: hand.buyInFee != null ? hand.buyInFee : null,
      multiplier: hand.multiplier != null ? hand.multiplier : null,
      ante: hand.ante || 0,
      straddle: hand.straddle || null,
      rangeContext: hand.rangeContext || null,
      icmLite: hand.icmLite || null,
      decisions, totalEvLoss: r2(totalEvLoss),
      accuracy, accuracyByStreet: byStreet,
      heroNetBB, worstClass: worst,
      handScore: handScoreMeta ? handScoreMeta.score : null,
      handScoreMeta: handScoreMeta,
      nDecisions: decisions.length,
      summary: buildHandTimeline(hand)
    };
    analyzed.tags = buildHandTags(analyzed);
    return analyzed;
  }

  function playerStreetCommit(hand, player, st) {
    const posts = hand.posts || {};
    const stActs = (hand.streets && hand.streets[st]) || [];
    let committed = (st === 'preflop') ? (posts[player] || 0) : 0;
    stActs.forEach((a) => {
      if (a.player !== player) return;
      if (a.type === 'raise') committed = a.to;
      else if (a.type === 'bet') committed = a.amount;
      else if (a.type === 'call') committed += a.amount;
    });
    return committed;
  }

  function playerInvested(hand, player) {
    let invested = 0;
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      const c = playerStreetCommit(hand, player, st);
      if (st === 'preflop') invested = c;
      else invested += c;
    });
    return r2(invested);
  }

  function boardCardsForShowdown(hand) {
    if (hand.boardAll && hand.boardAll.length) return hand.boardAll.slice();
    if (Array.isArray(hand.board) && hand.board.length && typeof hand.board[0] === 'string') {
      return hand.board.slice();
    }
    if (hand.board && hand.board.flop) {
      return [].concat(hand.board.flop || [], hand.board.turn || [], hand.board.river || []);
    }
    return [];
  }

  function holeCardsByPlayer(hand) {
    const map = Object.assign({}, hand.shows || {}, hand.villainShows || {});
    if (hand.hero && hand.heroCards && hand.heroCards.length >= 2) {
      map[hand.hero] = hand.heroCards.slice(0, 2);
    }
    return map;
  }

  function foldedPlayers(hand) {
    const folded = {};
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      ((hand.streets && hand.streets[st]) || []).forEach((a) => {
        if (a && a.type === 'fold' && a.player) folded[a.player] = true;
      });
    });
    return folded;
  }

  /**
   * Reconstruye collected[] en showdowns cuando el parser no lo rellenó
   * (p. ej. manos antiguas o entrada manual/IA sin premios). Usa side pots
   * estándar; el rake se descuenta del bote disputado (eligible >= 2), no del
   * exceso uncalled.
   */
  function inferCollectedFromShowdown(hand) {
    if (!hand || !C || !C.evaluate || !C.compare) return null;
    const board = boardCardsForShowdown(hand);
    if (board.length < 5) return null;
    const holes = holeCardsByPlayer(hand);
    const folded = foldedPlayers(hand);
    const invested = {};
    const players = {};
    Object.keys(hand.posts || {}).forEach((p) => { players[p] = true; });
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      ((hand.streets && hand.streets[st]) || []).forEach((a) => {
        if (a && a.player) players[a.player] = true;
      });
    });
    Object.keys(holes).forEach((p) => { players[p] = true; });
    Object.keys(players).forEach((p) => {
      const v = playerInvested(hand, p);
      if (v > 0) invested[p] = v;
    });
    const contrib = Object.keys(invested);
    if (!contrib.length) return null;
    if (!contrib.some((p) => !folded[p])) return null;

    const active = contrib.filter((p) => !folded[p]);
    const evalCache = {};
    function evalPlayer(p) {
      if (evalCache[p]) return evalCache[p];
      const hole = holes[p];
      if (!hole || hole.length < 2) return null;
      evalCache[p] = C.evaluate(hole.concat(board));
      return evalCache[p];
    }
    function winnersOf(eligible) {
      const ranked = eligible.map((p) => ({ p, ev: evalPlayer(p) })).filter((x) => x.ev);
      if (!ranked.length) return eligible.slice();
      let best = ranked[0].ev;
      ranked.forEach((x) => { if (C.compare(x.ev, best) > 0) best = x.ev; });
      return ranked.filter((x) => C.compare(x.ev, best) === 0).map((x) => x.p);
    }

    // Bote principal = aportaciones hasta el menor stack activo (+ ciega muerta).
    // Side pots / uncalled = exceso por encima de ese tope.
    const mainCap = Math.min.apply(null, active.map((p) => invested[p]));
    let mainGross = 0;
    contrib.forEach((p) => { mainGross = r2(mainGross + Math.min(invested[p], mainCap)); });
    let mainNet = mainGross;
    if (hand.rake > 0) mainNet = r2(Math.max(0, mainGross - hand.rake));

    const collected = {};
    const mainWinners = winnersOf(active);
    if (mainNet > 0 && mainWinners.length) {
      const share = r2(mainNet / mainWinners.length);
      mainWinners.forEach((w) => { collected[w] = r2((collected[w] || 0) + share); });
    }

    const above = active.filter((p) => invested[p] > mainCap).sort((a, b) => invested[a] - invested[b]);
    let prevCap = mainCap;
    for (let i = 0; i < above.length; i++) {
      const lvl = invested[above[i]];
      const layer = r2(lvl - prevCap);
      if (layer <= 0) continue;
      const eligible = above.filter((p) => invested[p] >= lvl);
      const size = r2(layer * eligible.length);
      if (size <= 0) { prevCap = lvl; continue; }
      const winners = winnersOf(eligible);
      const share = r2(size / winners.length);
      winners.forEach((w) => { collected[w] = r2((collected[w] || 0) + share); });
      prevCap = lvl;
    }

    if (hand.potTotal > 0 && hand.rake <= 0) {
      const awarded = Object.keys(collected).reduce((s, k) => s + collected[k], 0);
      const diff = r2(hand.potTotal - awarded);
      if (Math.abs(diff) >= 0.01 && mainWinners.length) {
        const share = r2(diff / mainWinners.length);
        mainWinners.forEach((w) => { collected[w] = r2((collected[w] || 0) + share); });
      }
    }
    return Object.keys(collected).length ? collected : null;
  }

  function resolveCollected(hand) {
    const collected = hand.collected || {};
    const hero = hand.hero;
    const known = Object.keys(collected).some((k) => (collected[k] || 0) > 0);
    if (known) return collected;
    const inferred = inferCollectedFromShowdown(hand);
    if (inferred) {
      hand.collected = Object.assign({}, collected, inferred);
      return hand.collected;
    }
    return collected;
  }

  function heroNet(hand) {
    const hero = hand.hero;
    if (!hero) return 0;
    const invested = playerInvested(hand, hero);
    const collected = resolveCollected(hand);
    const uncalled = hand.uncalledTo || {};
    const won = (collected[hero] || 0) + (uncalled[hero] || 0);
    return r2(won - invested);
  }

  /** Recalcula heroNetBB (p. ej. sesiones antiguas sin collected). */
  function recomputeHeroNet(hand) {
    if (!hand) return hand;
    hand = ensureAnalyzedHandContext(hand);
    const bb = hand.bb || 0;
    const euro = heroNet(hand);
    hand.heroNetBB = bb ? r2(euro / bb) : 0;
    return hand;
  }

  // Recorre el preflop y evalúa cada decisión voluntaria del héroe.
  // Detecta el tipo de spot: RFI, iso vs limpers, vs open, squeeze,
  // vs 3-bet / vs 4-bet (como abridor) y cold 3-bet+.
  function evalPreflop(hand, hero, heroPos, code, decisions) {
    if (!code) return;
    const RR = global.GTORangesRegistry;
    const ctx = handRangeContext(hand);
    const stackBB = ctx ? ctx.stackBB : 100;
    let raiseCount = 0, lastRaiser = null, potBB = 0, toMatch = hand.bb;
    let limpers = 0, callersAfterRaise = 0, heroHasRaised = false, openRaiser = null;
    const committed = {};
    // Ciegas + antes/straddles desde posts (si existen)
    if (hand.posts && Object.keys(hand.posts).length) {
      Object.keys(hand.posts).forEach((p) => { committed[p] = hand.posts[p] || 0; });
    } else {
      if (hand.blinds && hand.blinds.sb) committed[hand.blinds.sb] = hand.sb;
      if (hand.blinds && hand.blinds.bb) committed[hand.blinds.bb] = hand.bb;
      if (hand.ante && hand.seats && hand.seats.length) {
        hand.seats.forEach((s) => {
          if (!s || !s.name) return;
          committed[s.name] = (committed[s.name] || 0) + hand.ante;
        });
      }
    }
    potBB = Object.values(committed).reduce((s, v) => s + v, 0) / (hand.bb || 1);

    for (const a of hand.streets.preflop) {
      const isHero = a.player === hero;
      const cur = committed[a.player] || 0;

      if (isHero && (a.type === 'fold' || a.type === 'call' || a.type === 'raise')) {
        let facing;
        if (raiseCount === 0) facing = limpers > 0 ? 'vsLimp' : 'RFI';
        else if (raiseCount === 1) facing = callersAfterRaise > 0 ? 'squeeze' : 'vsRFI';
        else if (heroHasRaised && raiseCount === 2) facing = 'vs3bet';
        else if (heroHasRaised && raiseCount >= 3) facing = 'vs4bet';
        else facing = 'cold3bet';

        const openerPos = (openRaiser ? hand.positions[openRaiser] : (lastRaiser ? hand.positions[lastRaiser] : null));
        const toCallBB = Math.max(0, (toMatch - cur) / hand.bb);
        if (!(facing === 'RFI' && heroPos === 'BB' && a.type === 'fold')) {
          const chosen = a.type === 'raise' ? 'raise' : (a.type === 'call' ? 'call' : 'fold');
          const spotKind = mapFacingToKind(facing);
          const opts = facing === 'RFI' ? ['fold', 'raise'] : ['fold', 'call', 'raise'];
          const vsRfiKey = facing === 'vsRFI'
            ? (RR ? RR.vsRfiKey(heroPos, openerPos, ctx) : heroPos + '_vs_' + openerPos)
            : undefined;
          const evalInput = attachRangeContext({
            spotKind, position: heroPos, vsPosition: openerPos,
            stackDepth: stackBB, street: 'preflop', board: [], heroCards: hand.heroCards,
            handCode: code, potBB, toCallBB, chosenAction: chosen,
            vsRfiKey,
            initiative: facing === 'RFI' ? 'none' : 'caller',
            availableActions: opts,
            bbSizeEuro: hand.bb
          }, hand);
          const evalResult = GTO.evaluateSpot(evalInput);
          const ev = evalResult.evaluation;
          const raiseBB = a.type === 'raise' ? r2(a.to / hand.bb) : 0;
          decisions.push({
            street: 'preflop', spot: spotLabel(facing, heroPos, openerPos),
            spotKind, facing, vsPosition: openerPos, vsRfiKey,
            actionType: a.type, chosen, class: ev.class, best: ev.best,
            gto: evalResult.strategy, evLoss: ev.evLoss, evLossEuro: ev.evLossEuro,
            evErroneous: ev.evErroneous, evErrorReasons: ev.evErrorReasons, mathParams: ev.mathParams,
            evLossTier: ev.evLossTier,
            actionEV: ev.actionEV, bestEV: ev.bestEV, frequency: ev.frequency,
            confidence: ev.confidence, confidenceTier: ev.confidenceTier,
            confidenceLabel: ev.confidenceLabel, confidenceTitle: ev.confidenceTitle,
            confidenceReasons: ev.confidenceReasons,
            score: ev.score, explanation: evalResult.explanation,
            optionBreakdown: evalResult.optionBreakdown,
            potBB: r2(potBB), potEvalBB: r2(potBB), toCallBB: r2(toCallBB),
            betSizeBB: raiseBB,
            options: opts,
            context: preflopContext(facing, heroPos, openerPos, toCallBB)
          });
        }
      }

      // actualizar estado
      if (a.type === 'raise') {
        raiseCount++; lastRaiser = a.player; if (raiseCount === 1) openRaiser = a.player;
        if (isHero) heroHasRaised = true;
        callersAfterRaise = 0; toMatch = a.to; committed[a.player] = a.to;
      } else if (a.type === 'bet') { toMatch = a.amount; committed[a.player] = a.amount; }
      else if (a.type === 'call') {
        if (raiseCount === 0) limpers++; else callersAfterRaise++;
        committed[a.player] = toMatch;
      }
      potBB = Object.values(committed).reduce((s, v) => s + v, 0) / hand.bb;
    }
  }

  function mapFacingToKind(facing) {
    const map = { RFI: 'RFI', vsLimp: 'isoLimp', vsRFI: 'vsRFI', squeeze: 'squeeze', vs3bet: 'face3bet', vs4bet: 'face4bet', cold3bet: 'cold3bet' };
    return map[facing] || 'vsRFI';
  }

  function spotLabel(facing, heroPos, openerPos) {
    switch (facing) {
      case 'RFI': return `RFI ${heroPos}`;
      case 'vsLimp': return `${heroPos} iso vs limp`;
      case 'vsRFI': return `${heroPos} vs ${openerPos}`;
      case 'squeeze': return `${heroPos} squeeze vs ${openerPos}`;
      case 'vs3bet': return `${heroPos} abre y afronta 3-bet`;
      case 'vs4bet': return `${heroPos} afronta 4-bet`;
      default: return `${heroPos} vs 3bet+`;
    }
  }

  function preflopContext(facing, heroPos, openerPos, toCallBB) {
    switch (facing) {
      case 'RFI': return `Preflop: eres ${heroPos} y la acción te llega sin subir (RFI).`;
      case 'vsLimp': return `Preflop: eres ${heroPos} con limpers por delante. ¿Aislar (iso-raise), foldear o pagar?`;
      case 'vsRFI': return `Preflop: eres ${heroPos} y ${openerPos} ha abierto. Pagar ${r2(toCallBB)}bb.`;
      case 'squeeze': return `Preflop: eres ${heroPos}, ${openerPos} abre y hay pagador(es). Spot de squeeze. Pagar ${r2(toCallBB)}bb.`;
      case 'vs3bet': return `Preflop: abriste desde ${heroPos} y te hacen 3-bet. ¿Fold, call o 4-bet? Pagar ${r2(toCallBB)}bb.`;
      case 'vs4bet': return `Preflop: te hacen 4-bet. ¿Fold, call o all-in? Pagar ${r2(toCallBB)}bb.`;
      default: return `Preflop: spot de 3-bet en frío o más. Pagar ${r2(toCallBB)}bb.`;
    }
  }

  // Recorre una calle postflop y evalúa cada decisión del héroe
  function evalStreet(hand, st, hero, heroCards, bb, decisions, villainBase, postflopCtx) {
    villainBase = villainBase || BROAD_CONTINUE;
    postflopCtx = postflopCtx || { initiative: 'caller', inPosition: true };
    const ctx = handRangeContext(hand);
    const stackBB = ctx ? ctx.stackBB : 100;
    const acts = hand.streets[st];
    if (!acts.length) return;
    const boardSoFar = boardUpTo(hand, st);
    if (boardSoFar.length < 3 || heroCards.length < 2) return;

    let potBB = priorPotBB(hand, st);
    let toMatch = 0; // apuesta actual de la calle (€)
    const committed = {};
    let pendingVillainAudit = null;

    for (const a of acts) {
      const isHero = a.player === hero;
      const cur = committed[a.player] || 0;

      if (!isHero && a.type === 'call' && global.GTOVillainCallAudit) {
        pendingVillainAudit = global.GTOVillainCallAudit.auditVillainCall({
          action: 'call',
          street: st,
          board: boardSoFar,
          betBB: r2(toMatch / bb),
          potBeforeBB: r2(potBB - (toMatch / bb)),
          heroCards,
          defenderRange: villainBase
        });
      }

      if (isHero && a.type !== 'show') {
        const toCallBB = r2(Math.max(0, (toMatch - cur) / bb));
        const lineCtx = VT && VT.inferVillainLineContext
          ? VT.inferVillainLineContext({
            hand, hero, street: st, heroActIndex: acts.indexOf(a),
            boardSoFar, villainBase, priorPotBB
          })
          : null;
        const villainRange = lineCtx
          ? lineCtx.villainRange
          : (VT && VT.estimateRangeFromActions
            ? VT.estimateRangeFromActions(acts.slice(0, acts.indexOf(a)), hero, bb, priorPotBB(hand, st), boardSoFar, villainBase)
            : villainBase);
        let villainLastAction = lineCtx ? lineCtx.villainLastAction : null;
        let villainBetRatio = lineCtx ? lineCtx.villainBetRatio : null;
        if (!villainLastAction) {
          const priorActs = acts.slice(0, acts.indexOf(a));
          for (let i = priorActs.length - 1; i >= 0; i--) {
            if (priorActs[i].player === hero) break;
            if (priorActs[i].type === 'bet' || priorActs[i].type === 'raise' || priorActs[i].type === 'check' || priorActs[i].type === 'call') {
              villainLastAction = priorActs[i].type;
              if (priorActs[i].type === 'bet') villainBetRatio = r2(priorActs[i].amount / bb / Math.max(potBB - priorActs[i].amount / bb, 0.1));
              else if (priorActs[i].type === 'raise') villainBetRatio = r2(priorActs[i].to / bb / Math.max(potBB - priorActs[i].to / bb, 0.1));
              break;
            }
          }
        }
        const potForEval = r2(potBB);
        const potForDisplay = toCallBB > 0 ? r2(Math.max(potBB - toCallBB, priorPotBB(hand, st))) : potForEval;
        const potBeforeBB = toCallBB > 0 ? potForDisplay : potForEval;
        const RS = global.GTORiverShoveNode;
        const facingNode = RS ? RS.classifyFacingNode(toCallBB, potBeforeBB, st, villainLastAction) : 'small';
        const isRiverShove = st === 'river' && (facingNode === 'shove' || facingNode === 'overbet');
        const heroEquityNow = GTO.Equity.equityVsRange(heroCards, boardSoFar, villainRange, 600, {
          street: st,
          facingBet: toCallBB > 0 && !isRiverShove,
          riverShove: isRiverShove,
          shoveNode: isRiverShove
        });
        let heroEquityAdj = heroEquityNow;
        if (RS && isRiverShove) {
          const deval = RS.pairedBoardFlushDevaluation(heroCards, boardSoFar);
          if (deval.vulnerable) heroEquityAdj = Math.min(heroEquityNow, deval.capEquity);
        }
        const betSizeBB = a.type === 'bet' ? r2(a.amount / bb) : (a.type === 'raise' ? r2(a.to / bb) : 0);
        const chosen = resolvePostflopChosen(a.type, toCallBB, betSizeBB, potForEval);
        const actionType = (a.type === 'raise' && toCallBB <= 0.0001) ? 'bet' : a.type;
        const opts = toCallBB > 0 ? ['fold', 'call', 'raise'] : ['check', 'bet_33', 'bet_66', 'bet_100'];
        const priorBoard = st === 'river' ? boardUpTo(hand, 'turn')
          : (st === 'turn' ? boardUpTo(hand, 'flop') : null);
        const priorAggressorBet = postflopCtx.initiative === 'aggressor'
          ? heroLedOnPriorStreets(hand, hero, st)
          : false;
        const evalResult = GTO.evaluateSpot(attachRangeContext({
          spotKind: 'postflop', position: hand.positions[hero] || '??',
          stackDepth: stackBB, street: st, board: boardSoFar, priorBoard, heroCards,
          handCode: R.handCode(heroCards[0], heroCards[1]),
          potBB: potForEval, toCallBB, chosenAction: chosen,
          villainRange, heroEquity: heroEquityAdj,
          villainLastAction, villainBetRatio,
          potBeforeBB, facingNode, actionSequenceId: acts.indexOf(a),
          initiative: postflopCtx.initiative, inPosition: postflopCtx.inPosition,
          priorAggressorBet,
          availableActions: opts,
          betSizeBB,
          bbSizeEuro: bb
        }, hand));
        const ev = evalResult.evaluation;
        const info = GTO.Equity.classifyMadeHand(heroCards, boardSoFar);
        const handName = info.flush && info.isNutFlush === false
          ? 'Color (sin nuts)'
          : (global.GTOBoardTextureShift && global.GTOBoardTextureShift.isNutStraight(heroCards, boardSoFar)
            ? 'Escalera (nuts)'
            : info.ev.name);
        decisions.push({
          street: st, spot: `${cap(st)} · ${handName}`,
          spotKind: 'postflop', facing: 'postflop',
          actionType, chosen, betSizeBB, class: ev.class, best: ev.best,
          gto: evalResult.strategy, evLoss: ev.evLoss, evLossEuro: ev.evLossEuro,
          evErroneous: ev.evErroneous, evErrorReasons: ev.evErrorReasons, mathParams: ev.mathParams,
          evLossTier: ev.evLossTier,
          actionEV: ev.actionEV, bestEV: ev.bestEV, frequency: ev.frequency,
          confidence: ev.confidence, confidenceTier: ev.confidenceTier,
          confidenceLabel: ev.confidenceLabel, confidenceTitle: ev.confidenceTitle,
          confidenceReasons: ev.confidenceReasons,
          score: ev.score, explanation: evalResult.explanation,
          optionBreakdown: evalResult.optionBreakdown,
          potBB: potForDisplay, potEvalBB: potForEval, potBeforeBB, facingNode,
          toCallBB, villainLastAction, villainBetRatio, villainRange,
          priorBoard, actionSequenceId: acts.indexOf(a),
          initiative: postflopCtx.initiative, inPosition: postflopCtx.inPosition,
          priorAggressorBet,
          board: boardSoFar.slice(),
          heroCards: heroCards.slice(),
          handRank: evalResult.handRank || null,
          madeHandTier: (evalResult.handRank && evalResult.handRank.tier) || info.tier || null,
          options: opts,
          heroEquity: Math.round(heroEquityAdj * 100),
          villainAudit: pendingVillainAudit,
          context: (function () {
            let ctx = `${cap(st)} [${boardSoFar.join(' ')}]: tienes ${handName}. Bote ${potForDisplay}bb${toCallBB > 0 ? `, pagar ${toCallBB}bb` : ''}.`;
            if (toCallBB <= 0 && postflopCtx.initiative === 'aggressor') {
              const lead = (global.GTOSpotKey && global.GTOSpotKey.aggressorLeadLabel)
                ? global.GTOSpotKey.aggressorLeadLabel(st, priorAggressorBet)
                : (st === 'flop' ? 'c-bet'
                  : (priorAggressorBet
                    ? (st === 'turn' ? 'segundo barrel' : 'tercer barrel')
                    : 'delayed c-bet'));
              ctx += villainLastAction === 'check'
                ? ` El villano pasó: spot de ${lead}.`
                : ` Spot de ${lead}.`;
            }
            return ctx;
          })()
        });
        pendingVillainAudit = null;
      }

      if (a.type === 'bet') { toMatch = a.amount; committed[a.player] = a.amount; }
      else if (a.type === 'raise') { toMatch = a.to; committed[a.player] = a.to; }
      else if (a.type === 'call') { committed[a.player] = toMatch; }
      const streetEuro = Object.values(committed).reduce((s, v) => s + v, 0);
      potBB = PM ? PM.potBBFromEuro(priorPotBB(hand, st), streetEuro, bb)
        : r2(priorPotBB(hand, st) + streetEuro / bb);
    }
  }

  function mapPostflopAction(type, toCallBB) {
    if (type === 'fold') return 'fold';
    if (type === 'check') return 'check';
    if (type === 'bet') return 'bet';
    // "Raise" sin apuesta previa = apuesta de apertura (error típico en entrada manual)
    if (type === 'raise') return (toCallBB > 0.0001) ? 'raise' : 'bet';
    if (type === 'call') return (toCallBB > 0.0001) ? 'call' : 'check';
    return type;
  }

  function boardUpTo(hand, st) {
    if (hand.board && Array.isArray(hand.board)) {
      const n = { flop: 3, turn: 4, river: 5 }[st] || 0;
      return hand.board.slice(0, n);
    }
    if (!hand.board || !hand.board.flop) return [];
    if (st === 'flop') return hand.board.flop.slice();
    if (st === 'turn') return hand.board.flop.concat(hand.board.turn);
    return hand.board.flop.concat(hand.board.turn, hand.board.river);
  }
  // pot (en bb) acumulado ANTES de empezar la calle st
  function priorPotBB(hand, st) {
    const bb = hand.bb || 0.05;
    const order = ['preflop', 'flop', 'turn', 'river'];
    const idx = order.indexOf(st);
    if (idx < 0) return 0;
    const upto = order.slice(0, idx);
    let euro = 0;
    upto.forEach((s) => { euro += streetMoney(hand, s); });
    return euro / bb;
  }
  function streetMoney(hand, st) {
    const committed = {};
    const posts = hand.posts || {};
    const acts = (hand.streets && hand.streets[st]) || [];
    if (st === 'preflop') { Object.keys(posts).forEach((p) => { committed[p] = posts[p]; }); }
    let toMatch = st === 'preflop' ? (hand.bb || 0) : 0;
    acts.forEach((a) => {
      if (a.type === 'raise') { toMatch = a.to; committed[a.player] = a.to; }
      else if (a.type === 'bet') { toMatch = a.amount; committed[a.player] = a.amount; }
      else if (a.type === 'call') { committed[a.player] = toMatch; }
    });
    return Object.values(committed).reduce((s, v) => s + v, 0);
  }

  // Timeline legible de la mano real (para revisión paso a paso)
  function buildHandTimeline(hand) {
    const tl = [];
    const streetBoard = { preflop: [], flop: hand.board.flop, turn: hand.board.flop.concat(hand.board.turn), river: hand.boardAll };
    const minBoard = { flop: 3, turn: 4, river: 5 };
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      const acts = hand.streets[st];
      const board = streetBoard[st] || [];
      const hasBoard = st === 'preflop' || board.length >= (minBoard[st] || 0);
      if (st !== 'preflop' && !acts.length && !hasBoard) return;
      if (acts.length || (st !== 'preflop' && hasBoard)) {
        tl.push({ kind: 'street', street: st, board: board.slice() });
      }
      acts.forEach((a) => {
        tl.push({ kind: 'action', street: st, player: a.player, pos: hand.positions[a.player] || '', type: a.type, amount: a.amount, to: a.to, allin: a.allin });
      });
    });
    if (hand.shows) {
      Object.keys(hand.shows).forEach((player) => {
        tl.push({ kind: 'show', street: 'river', player, pos: hand.positions[player] || '', cards: hand.shows[player].slice() });
      });
    }
    return tl;
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- ESTADÍSTICAS DE SESIÓN ----------
  function mergeDiscardCounts(a, b) {
    const out = global.PTHHUtils && global.PTHHUtils.emptyDiscardCounts
      ? global.PTHHUtils.emptyDiscardCounts()
      : { badParse: 0, unsupportedVariant: 0, noBlinds: 0, unknownGame: 0, noHeroCards: 0 };
    [a, b].forEach((src) => {
      if (!src) return;
      Object.keys(out).forEach((k) => { out[k] += src[k] || 0; });
    });
    return out;
  }

  /** Candidatos a héroe (IMP-29): nicks con «Dealt to» en el archivo. */
  function heroCandidatesFromParsed(parsed) {
    if (parsed && Array.isArray(parsed.heroCandidates) && parsed.heroCandidates.length) {
      return parsed.heroCandidates.slice();
    }
    const count = {};
    (parsed && parsed.hands || []).forEach((h) => {
      if (h && h.hero) count[h.hero] = (count[h.hero] || 0) + 1;
    });
    return Object.keys(count).map((n) => ({ name: n, hands: count[n] }))
      .sort((a, b) => b.hands - a.hands);
  }

  /** True si hay ≥2 nicks con manos hero (archivo compartido / equipo). */
  function needsHeroConfirmation(parsed) {
    const cands = heroCandidatesFromParsed(parsed);
    if (cands.length < 2) return false;
    // Segundo nick con al menos 1 mano hero o ≥5% del top
    const top = cands[0].hands || 0;
    const second = cands[1].hands || 0;
    return second >= 1 && (second >= 3 || second / Math.max(1, top) >= 0.05);
  }

  function handDedupeKey(hand) {
    if (!hand) return '';
    const platform = hand.platform || (hand.format && hand.format.platform) || '';
    const id = hand.id != null ? String(hand.id) : '';
    return platform + '|' + id;
  }

  function buildSession(parsed, fileName, rawText) {
    const TS = global.PTTournamentSummary;
    if (parsed && parsed.source === 'tournamentSummary' && TS && TS.buildTournamentSummarySession) {
      return TS.buildTournamentSummarySession(parsed, fileName, rawText);
    }
    const hero = parsed.hero;
    // Solo filtrar por nick si el usuario confirmó un héroe (IMP-29); si no, conservar todas
    // las manos con cartas hero (HH mixtos / fixtures con varios Dealt to).
    const filterHero = !!(parsed && (parsed.heroConfirmed || parsed.filterHero));
    const kept = [];
    let discarded = 0;
    const discardCounts = mergeDiscardCounts(parsed.discardedByReason, null);
    for (const h of parsed.hands) {
      if (filterHero && hero && h.hero && h.hero !== hero) {
        discarded++;
        continue;
      }
      if (!heroPlayed(h)) {
        discarded++;
        discardCounts.noHeroCards++;
        continue;
      }
      const a = analyzeHand(h);
      kept.push(a);
    }
    const stats = computeStats(kept);
    return sessionPayload(parsed, fileName, hero, kept, discarded, stats, rawText, discardCounts);
  }

  /** Analiza manos en lotes para no bloquear la UI del navegador (10k+ manos). */
  function buildSessionAsync(parsed, fileName, onProgress, rawText) {
    const TS = global.PTTournamentSummary;
    if (parsed && parsed.source === 'tournamentSummary' && TS && TS.buildTournamentSummarySession) {
      if (onProgress) onProgress(1, 1, 'analyze');
      return Promise.resolve(TS.buildTournamentSummarySession(parsed, fileName, rawText));
    }
    const hero = parsed.hero;
    const filterHero = !!(parsed && (parsed.heroConfirmed || parsed.filterHero));
    const hands = parsed.hands || [];
    const kept = [];
    let discarded = 0;
    const discardCounts = mergeDiscardCounts(parsed.discardedByReason, null);
    let i = 0;
    const CHUNK = analyzeChunkSize(hands.length);
    return new Promise(function (resolve, reject) {
      function step() {
        try {
          const end = Math.min(i + CHUNK, hands.length);
          for (; i < end; i++) {
            const h = hands[i];
            if (filterHero && hero && h.hero && h.hero !== hero) {
              discarded++;
              continue;
            }
            if (!heroPlayed(h)) {
              discarded++;
              discardCounts.noHeroCards++;
              continue;
            }
            kept.push(analyzeHand(h));
          }
          if (onProgress) onProgress(i, hands.length, 'analyze');
          if (i < hands.length) setTimeout(step, 0);
          else resolve(sessionPayload(parsed, fileName, hero, kept, discarded, computeStats(kept), rawText, discardCounts));
        } catch (e) { reject(e); }
      }
      setTimeout(step, 0);
    });
  }

  function sessionPayload(parsed, fileName, hero, kept, discarded, stats, rawText, discardCounts) {
    const txt = rawText != null ? rawText : (parsed && parsed.rawText) || null;
    const U = global.PTHHUtils;
    const context = U && U.buildSessionContext
      ? U.buildSessionContext(kept, discardCounts || parsed.discardedByReason)
      : { gameKind: 'cash', formatKey: 'cash6', format: '6max', mix: {}, nDiscardedByReason: discardCounts || {} };
    if (stats) {
      stats.formatKey = stats.formatKey || context.formatKey;
      stats.format = stats.format || context.format;
      stats.gameKind = stats.gameKind || context.gameKind;
      stats.tableMax = stats.tableMax != null ? stats.tableMax : context.tableMax;
      stats.context = context;
    }
    return {
      id: 's' + Date.now() + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      fileName: fileName || parsed.fileName,
      hero,
      nTotal: (parsed.hands || []).length + (
        discardCounts
          ? Object.keys(discardCounts).reduce((s, k) => s + (k === 'noHeroCards' ? 0 : (discardCounts[k] || 0)), 0)
          : 0
      ),
      nParsed: (parsed.hands || []).length,
      nDiscarded: discarded,
      nDiscardedByReason: context.nDiscardedByReason || discardCounts || {},
      hands: kept,
      stats,
      context,
      format: parsed.format || null,
      analysisVersion: global.PT_BUILD || '1',
      hasTxt: !!txt,
      rawText: txt || null
    };
  }

  /** Rangos ideales 6-max cash NL + umbrales de muestra (STYLE_IDEAL). */
  const STYLE_IDEAL_6MAX = {
    vpipMin: 20, vpipMax: 28,
    pfrMin: 15, pfrMax: 24,
    gapMin: 3, gapMax: 8,
    threeBetMin: 6, threeBetMax: 10,
    foldToThreeBetMin: 45, foldToThreeBetMax: 60,
    fourBetMin: 2, fourBetMax: 4,
    foldToFourBetMin: 45, foldToFourBetMax: 65,
    limpMin: 0, limpMax: 4,
    overlimpMin: 0, overlimpMax: 2,
    isoLimpMin: 40, isoLimpMax: 70,
    stealMin: 30, stealMax: 40,
    foldToStealMin: 55, foldToStealMax: 65,
    squeezeMin: 7, squeezeMax: 9,
    cbetFlopMin: 50, cbetFlopMax: 70,
    foldToCbetFlopMin: 45, foldToCbetFlopMax: 55,
    cbetTurnMin: 40, cbetTurnMax: 60,
    cbetRiverMin: 30, cbetRiverMax: 55,
    delayedCbetMin: 25, delayedCbetMax: 50,
    afMin: 2, afMax: 3.5,
    afqMin: 35, afqMax: 45,
    wtsdMin: 27, wtsdMax: 32,
    wsdMin: 49, wsdMax: 54,
    wwsfMin: 45, wwsfMax: 53,
    sample: {
      vpip: { low: 50, ok: 100, good: 200 },
      pfr: { low: 50, ok: 100, good: 200 },
      threeBet: { low: 30, ok: 100, good: 400 },
      foldToThreeBet: { low: 20, ok: 50, good: 200 },
      fourBet: { low: 15, ok: 40, good: 150 },
      foldToFourBet: { low: 10, ok: 30, good: 100 },
      limp: { low: 30, ok: 80, good: 200 },
      overlimp: { low: 15, ok: 40, good: 120 },
      isoLimp: { low: 15, ok: 40, good: 120 },
      steal: { low: 30, ok: 80, good: 200 },
      foldToSteal: { low: 20, ok: 50, good: 150 },
      squeeze: { low: 20, ok: 50, good: 200 },
      cbetFlop: { low: 20, ok: 50, good: 200 },
      foldToCbetFlop: { low: 20, ok: 50, good: 200 },
      cbetTurn: { low: 15, ok: 40, good: 150 },
      cbetRiver: { low: 10, ok: 30, good: 100 },
      delayedCbet: { low: 15, ok: 40, good: 120 },
      af: { low: 30, ok: 80, good: 200 },
      wtsd: { low: 30, ok: 80, good: 200 },
      wsd: { low: 20, ok: 50, good: 150 },
      wwsf: { low: 30, ok: 80, good: 200 },
      byPos: { low: 20, ok: 50, good: 100 }
    }
  };

  function cloneIdeal(base, overrides) {
    const out = {};
    Object.keys(base).forEach((k) => {
      if (k === 'sample') {
        out.sample = Object.assign({}, base.sample);
        return;
      }
      out[k] = base[k];
    });
    if (overrides) Object.keys(overrides).forEach((k) => { out[k] = overrides[k]; });
    return out;
  }

  const STYLE_IDEAL_BY_FORMAT = {
    '6max': STYLE_IDEAL_6MAX,
    cash6: STYLE_IDEAL_6MAX,
    '9max': cloneIdeal(STYLE_IDEAL_6MAX, {
      vpipMin: 15, vpipMax: 22, pfrMin: 12, pfrMax: 18,
      threeBetMin: 5, threeBetMax: 9, fourBetMin: 1.5, fourBetMax: 3.5,
      stealMin: 25, stealMax: 35
    }),
    cash9: null, // filled below
    shorthand: cloneIdeal(STYLE_IDEAL_6MAX, {
      vpipMin: 28, vpipMax: 42, pfrMin: 22, pfrMax: 36,
      threeBetMin: 8, threeBetMax: 14, stealMin: 40, stealMax: 60,
      foldToStealMin: 45, foldToStealMax: 60
    }),
    cash2: null,
    cash3: null,
    mtt: cloneIdeal(STYLE_IDEAL_6MAX, {
      vpipMin: 18, vpipMax: 28, pfrMin: 14, pfrMax: 24,
      threeBetMin: 5, threeBetMax: 9, fourBetMin: 1.5, fourBetMax: 4,
      stealMin: 28, stealMax: 42,
      foldToStealMin: 50, foldToStealMax: 65
    }),
    mtt6: null,
    mtt9: null,
    mtt3: null,
    spin: cloneIdeal(STYLE_IDEAL_6MAX, {
      vpipMin: 35, vpipMax: 55, pfrMin: 28, pfrMax: 48,
      threeBetMin: 8, threeBetMax: 16, fourBetMin: 2, fourBetMax: 8,
      stealMin: 45, stealMax: 70,
      foldToStealMin: 35, foldToStealMax: 55,
      foldToThreeBetMin: 35, foldToThreeBetMax: 55,
      cbetFlopMin: 45, cbetFlopMax: 75,
      wtsdMin: 22, wtsdMax: 35
    }),
    spin3: null
  };
  STYLE_IDEAL_BY_FORMAT.cash9 = STYLE_IDEAL_BY_FORMAT['9max'];
  STYLE_IDEAL_BY_FORMAT.cash2 = STYLE_IDEAL_BY_FORMAT.shorthand;
  STYLE_IDEAL_BY_FORMAT.cash3 = STYLE_IDEAL_BY_FORMAT.shorthand;
  STYLE_IDEAL_BY_FORMAT.mtt6 = STYLE_IDEAL_BY_FORMAT.mtt;
  STYLE_IDEAL_BY_FORMAT.mtt9 = STYLE_IDEAL_BY_FORMAT.mtt;
  STYLE_IDEAL_BY_FORMAT.mtt3 = STYLE_IDEAL_BY_FORMAT.spin;
  STYLE_IDEAL_BY_FORMAT.spin3 = STYLE_IDEAL_BY_FORMAT.spin;

  /** Alias activo (6-max por defecto); computeStats puede sustituir por formato. */
  let STYLE_IDEAL = STYLE_IDEAL_6MAX;
  const HUD_IDEAL = STYLE_IDEAL_6MAX;

  const STEAL_POS = { CO: true, BTN: true, SB: true };
  const POS_ORDER = ['UTG', 'UTG1', 'UTG2', 'EP0', 'EP1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

  function emptyHeroStyleHud() {
    return {
      vpip: false, pfr: false,
      limpOpp: false, limp: false,
      overlimpOpp: false, overlimp: false,
      isoLimpOpp: false, isoLimp: false,
      threeBetOpp: false, threeBet: false,
      foldToThreeBetOpp: false, foldToThreeBet: false,
      fourBetOpp: false, fourBet: false,
      foldToFourBetOpp: false, foldToFourBet: false,
      stealOpp: false, steal: false,
      foldToStealOpp: false, foldToSteal: false,
      squeezeOpp: false, squeeze: false,
      cbetFlopOpp: false, cbetFlop: false,
      cbetFlopIpOpp: false, cbetFlopIp: false,
      cbetFlopOopOpp: false, cbetFlopOop: false,
      foldToCbetFlopOpp: false, foldToCbetFlop: false,
      cbetTurnOpp: false, cbetTurn: false,
      cbetRiverOpp: false, cbetRiver: false,
      delayedCbetOpp: false, delayedCbet: false,
      sawFlop: false, wentToSd: false, wonAtSd: false, wonWhenSawFlop: false,
      afBets: 0, afRaises: 0, afCalls: 0, afChecks: 0,
      heroPos: null
    };
  }

  function handStreets(hand) {
    hand = ensureAnalyzedHandContext(hand);
    let streets = (hand && hand.streets) || null;
    if ((!streets || !(streets.preflop || []).length) && hand && hand.summary && hand.summary.length) {
      streets = rebuildStreetsFromSummary(hand);
      if (hand && !hand.streets) hand.streets = streets;
    }
    return streets || { preflop: [], flop: [], turn: [], river: [] };
  }

  function heroFoldedStreet(acts, hero) {
    for (let i = 0; i < (acts || []).length; i++) {
      if (acts[i] && acts[i].player === hero && acts[i].type === 'fold') return true;
    }
    return false;
  }

  function heroNeverFolded(streets, hero) {
    return !['preflop', 'flop', 'turn', 'river'].some((st) => heroFoldedStreet(streets[st], hero));
  }

  function detectShowdown(hand, streets, hero) {
    const shows = Object.assign({}, hand.shows || {}, hand.villainShows || {});
    if (Object.keys(shows).length) return true;
    if ((hand.summary || []).some((x) => x && x.kind === 'show')) return true;
    const boardLen = (hand.board && hand.board.length) || 0;
    if (boardLen >= 5 && heroNeverFolded(streets, hero) && ((streets.river || []).length || (streets.turn || []).length)) {
      return true;
    }
    return false;
  }

  function inferSessionFormatKey(hands) {
    let isSpin = false;
    let isMtt = false;
    let maxTable = 0;
    let hasExplicitMeta = false;
    const posSet = {};
    const keyVotes = {};
    (hands || []).forEach((h) => {
      if (!h) return;
      if (h.gameKind || h.formatKey || h.tableMax) hasExplicitMeta = true;
      if (h.gameKind === 'spin' || h.formatKey === 'spin3') isSpin = true;
      if (h.gameKind === 'mtt' || h.gameKind === 'sng' || h.isTournament) isMtt = true;
      const tm = h.tableMax || h.playersSeated || (h.seats && h.seats.length) || 0;
      if (tm > maxTable) maxTable = tm;
      const pos = h.positions || {};
      Object.keys(pos).forEach((p) => { posSet[pos[p]] = true; });
      if (h.heroPos) posSet[h.heroPos] = true;
      if (h.formatKey) keyVotes[h.formatKey] = (keyVotes[h.formatKey] || 0) + 1;
    });
    if (isSpin) return 'spin3';
    if (isMtt) return maxTable >= 8 ? 'mtt9' : (maxTable <= 3 ? 'mtt3' : 'mtt6');
    // Con metadata explícita de mesa, priorizar tableMax
    if (hasExplicitMeta && maxTable >= 8) return 'cash9';
    if (hasExplicitMeta && maxTable > 0 && maxTable <= 3) return maxTable <= 2 ? 'cash2' : 'cash3';
    if (hasExplicitMeta && maxTable > 0 && maxTable <= 6) {
      // aún así, posiciones 9-max ganan si aparecen
      if (posSet.UTG1 || posSet.UTG2 || posSet.LJ) return 'cash9';
      return 'cash6';
    }
    // Heurística clásica por posiciones (sesiones antiguas sin tableMax)
    if (posSet.UTG1 || posSet.UTG2 || posSet.LJ) return 'cash9';
    const nPos = Object.keys(posSet).length;
    if (nPos >= 8 || maxTable >= 8) return 'cash9';
    if (maxTable > 0 && maxTable <= 3) return maxTable <= 2 ? 'cash2' : 'cash3';
    let bestKey = null; let bestN = -1;
    Object.keys(keyVotes).forEach((k) => {
      if (keyVotes[k] > bestN) { bestN = keyVotes[k]; bestKey = k; }
    });
    return bestKey || 'cash6';
  }

  function inferSessionFormat(hands) {
    const U = global.PTHHUtils;
    const key = inferSessionFormatKey(hands);
    return (U && U.legacyFormatFromKey) ? U.legacyFormatFromKey(key) : (
      key.indexOf('spin') === 0 ? 'spin'
        : (key.indexOf('mtt') === 0 ? 'mtt'
          : (key === 'cash9' ? '9max' : (key === 'cash2' || key === 'cash3' ? 'shorthand' : '6max')))
    );
  }

  function styleIdealForFormat(format) {
    if (!format) return STYLE_IDEAL_6MAX;
    if (STYLE_IDEAL_BY_FORMAT[format]) return STYLE_IDEAL_BY_FORMAT[format];
    const U = global.PTHHUtils;
    // Acepta formatKey o legacy
    if (format.indexOf('cash') === 0 || format.indexOf('spin') === 0 || format.indexOf('mtt') === 0) {
      const legacy = U && U.legacyFormatFromKey ? U.legacyFormatFromKey(format) : format;
      return STYLE_IDEAL_BY_FORMAT[legacy] || STYLE_IDEAL_BY_FORMAT[format] || STYLE_IDEAL_6MAX;
    }
    return STYLE_IDEAL_6MAX;
  }

  function formatKeyToRangeGameType(formatKey) {
    const k = formatKey || 'cash6';
    if (k.indexOf('spin') === 0 || k.indexOf('mtt') === 0) return 'mtt';
    if (k === 'cash9') return 'cash9';
    return 'cash6';
  }

  /**
   * HUD de estilo del héroe por mano (Tracker-like).
   * Recorre streets (no solo decisions) para denominadores de oportunidad.
   */
  function heroStyleHud(hand) {
    const out = emptyHeroStyleHud();
    hand = ensureAnalyzedHandContext(hand);
    const hero = hand && hand.hero;
    if (!hero) return out;
    const streets = handStreets(hand);
    const heroPos = (hand.positions && hand.positions[hero]) || hand.heroPos || null;
    out.heroPos = heroPos;
    const preflop = streets.preflop || [];

    let raiseCount = 0;
    let lastRaiser = null;
    let openRaiser = null;
    let openRaiserPos = null;
    let limpers = 0;
    let callersAfterRaise = 0;
    let heroHasRaised = false;

    for (let i = 0; i < preflop.length; i++) {
      const a = preflop[i];
      if (!a) continue;
      if (a.player === hero) {
        if (a.type === 'raise' || a.type === 'bet' || a.type === 'call' || a.type === 'fold' || a.type === 'check') {
          // Limp / overlimp / iso: acción voluntaria preflop sin raise previo (BB check no cuenta)
          if (raiseCount === 0 && !(heroPos === 'BB' && a.type === 'check') && !(heroPos === 'BB' && a.type === 'fold')) {
            if (limpers === 0) {
              out.limpOpp = true;
              if (a.type === 'call') out.limp = true;
            } else {
              out.overlimpOpp = true;
              out.isoLimpOpp = true;
              if (a.type === 'call') out.overlimp = true;
              if (a.type === 'raise' || a.type === 'bet') out.isoLimp = true;
            }
          }
          if (raiseCount === 0 && limpers === 0 && STEAL_POS[heroPos]) {
            out.stealOpp = true;
            if (a.type === 'raise' || a.type === 'bet') out.steal = true;
          }
          if (raiseCount === 1) {
            out.threeBetOpp = true;
            if (a.type === 'raise' || a.type === 'bet') out.threeBet = true;
            if (callersAfterRaise > 0) {
              out.squeezeOpp = true;
              if (a.type === 'raise' || a.type === 'bet') out.squeeze = true;
            }
            const stealFace = openRaiserPos && STEAL_POS[openRaiserPos] && (
              heroPos === 'BB' || (heroPos === 'SB' && openRaiserPos === 'BTN')
            );
            if (stealFace) {
              out.foldToStealOpp = true;
              if (a.type === 'fold') out.foldToSteal = true;
            }
          }
          if (heroHasRaised && raiseCount === 2 && lastRaiser && lastRaiser !== hero) {
            out.foldToThreeBetOpp = true;
            if (a.type === 'fold') out.foldToThreeBet = true;
          }
          // 4-bet opp: facing a 3-bet (open-raiser o cold 4-bet)
          if (raiseCount === 2 && lastRaiser && lastRaiser !== hero) {
            out.fourBetOpp = true;
            if (a.type === 'raise' || a.type === 'bet') out.fourBet = true;
          }
          if (heroHasRaised && raiseCount >= 3 && lastRaiser && lastRaiser !== hero) {
            out.foldToFourBetOpp = true;
            if (a.type === 'fold') out.foldToFourBet = true;
          }
        }
        if (a.type === 'raise' || a.type === 'bet') {
          out.vpip = true;
          out.pfr = true;
        } else if (a.type === 'call') {
          out.vpip = true;
        }
      }

      if (a.type === 'call') {
        if (raiseCount === 0) limpers++;
        else callersAfterRaise++;
      } else if (a.type === 'raise' || a.type === 'bet') {
        raiseCount++;
        lastRaiser = a.player;
        callersAfterRaise = 0;
        if (raiseCount === 1) {
          openRaiser = a.player;
          openRaiserPos = (hand.positions && hand.positions[a.player]) || null;
        }
        if (a.player === hero) heroHasRaised = true;
      }
    }

    const preflopLastRaiser = lastRaiser;
    const flop = streets.flop || [];
    let heroCheckedFlopAsPfr = false;
    if (flop.length && preflopLastRaiser) {
      let facedBet = false;
      let cbetFromPfr = false;
      let heroCbetResolved = false;
      let foldToCbetResolved = false;
      const heroIp = heroIsInPositionPostflop(hand, hero);

      for (let i = 0; i < flop.length; i++) {
        const a = flop[i];
        if (!a) continue;
        if (a.player === hero) {
          if (preflopLastRaiser === hero && !facedBet && !heroCbetResolved) {
            out.cbetFlopOpp = true;
            if (a.type === 'bet' || a.type === 'raise') out.cbetFlop = true;
            if (a.type === 'check') heroCheckedFlopAsPfr = true;
            if (heroIp) {
              out.cbetFlopIpOpp = true;
              if (a.type === 'bet' || a.type === 'raise') out.cbetFlopIp = true;
            } else {
              out.cbetFlopOopOpp = true;
              if (a.type === 'bet' || a.type === 'raise') out.cbetFlopOop = true;
            }
            heroCbetResolved = true;
          }
          if (cbetFromPfr && !foldToCbetResolved) {
            out.foldToCbetFlopOpp = true;
            if (a.type === 'fold') out.foldToCbetFlop = true;
            foldToCbetResolved = true;
          }
        }
        if (a.type === 'bet' || a.type === 'raise') {
          facedBet = true;
          if (a.player === preflopLastRaiser && a.player !== hero) cbetFromPfr = true;
        }
      }
    }

    // Barrel = c-bet en calle previa acertado; delayed = PFR checkeó flop y lidera turn
    function walkBarrel(streetActs, prevCbetHit, oppKey, hitKey) {
      if (!prevCbetHit || !(streetActs || []).length) return;
      let facedBet = false;
      let resolved = false;
      for (let i = 0; i < streetActs.length; i++) {
        const a = streetActs[i];
        if (!a) continue;
        if (a.player === hero && !resolved) {
          if (!facedBet) {
            out[oppKey] = true;
            if (a.type === 'bet' || a.type === 'raise') out[hitKey] = true;
          }
          resolved = true;
        }
        if (a.type === 'bet' || a.type === 'raise') facedBet = true;
      }
    }
    walkBarrel(streets.turn || [], out.cbetFlop, 'cbetTurnOpp', 'cbetTurn');
    walkBarrel(streets.river || [], out.cbetTurn, 'cbetRiverOpp', 'cbetRiver');

    if (heroCheckedFlopAsPfr && preflopLastRaiser === hero && (streets.turn || []).length) {
      let facedBet = false;
      let resolved = false;
      for (let i = 0; i < streets.turn.length; i++) {
        const a = streets.turn[i];
        if (!a) continue;
        if (a.player === hero && !resolved) {
          if (!facedBet) {
            out.delayedCbetOpp = true;
            if (a.type === 'bet' || a.type === 'raise') out.delayedCbet = true;
          }
          resolved = true;
        }
        if (a.type === 'bet' || a.type === 'raise') facedBet = true;
      }
    }

    ['flop', 'turn', 'river'].forEach((stName) => {
      (streets[stName] || []).forEach((a) => {
        if (!a || a.player !== hero) return;
        if (a.type === 'bet') out.afBets++;
        else if (a.type === 'raise') out.afRaises++;
        else if (a.type === 'call') out.afCalls++;
        else if (a.type === 'check') out.afChecks++;
      });
    });

    const foldedPre = heroFoldedStreet(preflop, hero);
    const hasFlop = !!(flop && flop.length) || ((hand.board || []).length >= 3);
    out.sawFlop = !foldedPre && (hasFlop
      || (flop || []).some((a) => a && a.player === hero)
      || (playersReachedFlop(hand).indexOf(hero) >= 0));
    if (out.sawFlop) {
      const sd = detectShowdown(hand, streets, hero) && heroNeverFolded(streets, hero);
      out.wentToSd = sd;
      const won = (hand.heroNetBB != null ? hand.heroNetBB : 0) > 0;
      out.wonWhenSawFlop = won;
      out.wonAtSd = sd && won;
    }

    return out;
  }

  /**
   * VPIP / PFR del héroe en una mano (definición Tracker).
   * Si faltan streets (p. ej. payload slim), se reconstruyen desde summary.
   */
  function heroPreflopHud(hand) {
    const s = heroStyleHud(hand);
    return { vpip: s.vpip, pfr: s.pfr };
  }

  function pctFrom(hits, opps) {
    if (!opps) return null;
    return Math.round((hits / opps) * 1000) / 10;
  }

  function sampleTrust(n, key, ideal) {
    const ideals = ideal || STYLE_IDEAL;
    const th = (ideals.sample && ideals.sample[key]) || { low: 30, ok: 80, good: 200 };
    const count = Number(n) || 0;
    if (count < th.low) return { level: 'low', label: 'Muestra baja', n: count, thresholds: th };
    if (count < th.ok) return { level: 'ok', label: 'Muestra orientativa', n: count, thresholds: th };
    if (count < th.good) return { level: 'good', label: 'Muestra buena', n: count, thresholds: th };
    return { level: 'high', label: 'Muestra sólida', n: count, thresholds: th };
  }

  function bandStatus(value, min, max, trust) {
    if (value == null) return { status: 'unknown', soft: true };
    if (trust && trust.level === 'low') return { status: 'low_sample', soft: true };
    if (value < min) return { status: 'low', soft: false };
    if (value > max) return { status: 'high', soft: false };
    return { status: 'ok', soft: false };
  }

  function assessVpipPfr(vpipPct, pfrPct, handsN, ideal) {
    const I = ideal || STYLE_IDEAL;
    if (vpipPct == null || pfrPct == null) {
      return {
        status: 'unknown',
        label: 'Sin datos',
        comment: 'No hay suficientes acciones preflop del héroe para calcular VPIP/PFR.',
        gap: null,
        ideal: I,
        sample: sampleTrust(handsN || 0, 'vpip', I)
      };
    }
    const gap = Math.max(0, Math.round((vpipPct - pfrPct) * 10) / 10);
    const trust = sampleTrust(handsN != null ? handsN : 999, 'vpip', I);
    const parts = [];
    let status = 'ok';
    const soft = trust.level === 'low';

    if (vpipPct < I.vpipMin) {
      if (!soft) status = 'low';
      parts.push(
        'VPIP bajo (' + vpipPct + '%; ideal ~' + I.vpipMin + '–' + I.vpipMax +
        '%). Estás jugando demasiado tight: abre un poco más desde late (BTN/CO) y revisa folds excesivos vs opens pequeños.'
      );
    } else if (vpipPct > I.vpipMax) {
      if (!soft) status = 'high';
      parts.push(
        'VPIP alto (' + vpipPct + '%; ideal ~' + I.vpipMin + '–' + I.vpipMax +
        '%). Estás entrando en demasiadas manos: recorta limps y calls especulativos out of position; prioriza raises con manos con plan postflop.'
      );
    } else {
      parts.push(
        'VPIP adecuado (' + vpipPct + '% dentro de ~' + I.vpipMin + '–' + I.vpipMax + '%).'
      );
    }

    if (pfrPct < I.pfrMin) {
      if (!soft && status === 'ok') status = 'low';
      parts.push(
        'PFR bajo (' + pfrPct + '%; ideal ~' + I.pfrMin + '–' + I.pfrMax +
        '%). Demasiado pasivo preflop: convierte más limps/calls en opens o 3-bets cuando la mano lo justifica.'
      );
    } else if (pfrPct > I.pfrMax) {
      if (!soft && status === 'ok') status = 'high';
      parts.push(
        'PFR alto (' + pfrPct + '%; ideal ~' + I.pfrMin + '–' + I.pfrMax +
        '%). Estás subiendo de más: reduce opens light UTG/HJ y 3-bets sin equity o sin fold equity clara.'
      );
    } else {
      parts.push(
        'PFR adecuado (' + pfrPct + '% dentro de ~' + I.pfrMin + '–' + I.pfrMax + '%).'
      );
    }

    if (gap > I.gapMax) {
      if (!soft && status === 'ok') status = 'gap';
      parts.push(
        'Hueco VPIP−PFR amplio (' + gap + ' pts; típico ~' + I.gapMin + '–' + I.gapMax +
        '). Indica muchos limps/calls: prioriza raise-or-fold y evita completar SB o flattear manos débiles.'
      );
      if (gap > 10) {
        parts.push('Con más de 10 pts de hueco el perfil es claramente calling-station: value-bet fino y faroles mínimos.');
      }
    } else if (gap < I.gapMin && vpipPct >= I.vpipMin) {
      parts.push(
        'Hueco VPIP−PFR muy estrecho (' + gap + ' pts): casi no flateas. Está bien si es intencional; asegúrate de no overfoldear spots rentables de call (p. ej. BB vs opens pequeños).'
      );
    }

    if (soft) {
      status = 'low_sample';
      parts.unshift('Muestra baja (' + trust.n + ' manos): toma el diagnóstico como orientación, no como veredicto.');
    }

    let label = 'Adecuado';
    if (status === 'low') label = 'Por debajo del ideal';
    else if (status === 'high') label = 'Por encima del ideal';
    else if (status === 'gap') label = 'Desbalance pasivo';
    else if (status === 'low_sample') label = 'Muestra insuficiente';

    return { status, label, comment: parts.join(' '), gap, ideal: I, sample: trust };
  }

  function assessMetricLine(name, pct, min, max, trust, tips) {
    const band = bandStatus(pct, min, max, trust);
    if (pct == null) {
      return { key: name, status: 'unknown', text: null, sample: trust };
    }
    const unit = name === 'AF' ? '' : '%';
    const range = '~' + min + '–' + max + unit;
    let text;
    if (band.status === 'low_sample') {
      text = name + ' ' + pct + unit + ' (ideal ' + range + '; ' + trust.label.toLowerCase() + ', n=' + trust.n + ').';
    } else if (band.status === 'low') {
      text = name + ' bajo (' + pct + unit + '; ideal ' + range + '). ' + (tips.low || '');
    } else if (band.status === 'high') {
      text = name + ' alto (' + pct + unit + '; ideal ' + range + '). ' + (tips.high || '');
    } else {
      text = name + ' adecuado (' + pct + unit + ' dentro de ' + range + ').';
    }
    return { key: name, status: band.status, text: text.trim(), sample: trust, value: pct, idealMin: min, idealMax: max };
  }

  const STYLE_DRILL_MAP = {
    '3-Bet': { low: { scenario: '3bet', practiceStreet: 'preflop', label: 'Practicar 3-bets' }, high: { scenario: '3bet', practiceStreet: 'preflop', label: 'Afinar 3-bets' } },
    'Fold to 3-Bet': { low: { scenario: 'face3bet', practiceStreet: 'preflop', label: 'Defender vs 3-bet' }, high: { scenario: 'face3bet', practiceStreet: 'preflop', label: 'Defender vs 3-bet' } },
    '4-Bet': { low: { scenario: 'face3bet', practiceStreet: 'preflop', label: 'Practicar 4-bets' }, high: { scenario: 'face3bet', practiceStreet: 'preflop', label: 'Afinar 4-bets' } },
    'Fold to 4-Bet': { low: { scenario: 'face3bet', practiceStreet: 'preflop', label: 'vs 4-bet' }, high: { scenario: 'face3bet', practiceStreet: 'preflop', label: 'vs 4-bet' } },
    'Limp': { low: { scenario: 'rfi', practiceStreet: 'preflop', label: 'RFI en vez de limp' }, high: { scenario: 'rfi', practiceStreet: 'preflop', label: 'Raise or fold' } },
    'Overlimp': { low: { scenario: 'rfi', practiceStreet: 'preflop', label: 'Iso vs limpers' }, high: { scenario: 'rfi', practiceStreet: 'preflop', label: 'No overlimpear' } },
    'Iso-limp': { low: { scenario: 'rfi', practiceStreet: 'preflop', label: 'Aislar limpers' }, high: { scenario: 'rfi', practiceStreet: 'preflop', label: 'Iso selectivo' } },
    'Delayed C-Bet': { low: { scenario: 'rfi', practiceStreet: 'flop', label: 'Delayed c-bet' }, high: { scenario: 'rfi', practiceStreet: 'flop', label: 'Delayed selectivo' } },
    'Steal': { low: { scenario: 'rfi', practiceStreet: 'preflop', label: 'Robar blinds (RFI late)' }, high: { scenario: 'rfi', practiceStreet: 'preflop', label: 'RFI más selectivo' } },
    'Fold to Steal': { low: { scenario: '3bet', practiceStreet: 'preflop', label: 'Defensa de blinds' }, high: { scenario: '3bet', practiceStreet: 'preflop', label: 'Defensa de blinds' } },
    'Squeeze': { low: { scenario: 'squeeze', practiceStreet: 'preflop', label: 'Practicar squeezes' }, high: { scenario: 'squeeze', practiceStreet: 'preflop', label: 'Squeezes selectivos' } },
    'C-Bet flop': { low: { scenario: 'rfi', practiceStreet: 'flop', label: 'C-bet y planes de flop' }, high: { scenario: 'rfi', practiceStreet: 'flop', label: 'C-bet selectivo' } },
    'Fold to C-Bet': { low: { scenario: '3bet', practiceStreet: 'flop', label: 'Defensa vs c-bet' }, high: { scenario: '3bet', practiceStreet: 'flop', label: 'Defensa vs c-bet' } },
    'AF': { low: { scenario: 'rfi', practiceStreet: 'flop', label: 'Agresión postflop' }, high: { scenario: 'rfi', practiceStreet: 'flop', label: 'Controlar agresión' } },
    'C-Bet turn': { low: { scenario: 'rfi', practiceStreet: 'flop', label: 'Barrels turn' }, high: { scenario: 'rfi', practiceStreet: 'flop', label: 'Barrels selectivos' } },
    'C-Bet river': { low: { scenario: 'rfi', practiceStreet: 'flop', label: 'River barrels' }, high: { scenario: 'rfi', practiceStreet: 'flop', label: 'River selectivo' } },
    'WTSD': { low: { scenario: 'rfi', practiceStreet: 'flop', label: 'Llegar a showdown' }, high: { scenario: 'rfi', practiceStreet: 'flop', label: 'Foldear peores manos' } }
  };

  function drillsFromAssess(lines, formatKey) {
    const drills = [];
    const seen = {};
    const gameType = formatKeyToRangeGameType(formatKey || (STYLE_IDEAL && STYLE_IDEAL._formatKey) || 'cash6');
    (lines || []).forEach((l) => {
      if (!l || (l.status !== 'low' && l.status !== 'high' && l.status !== 'gap')) return;
      const map = STYLE_DRILL_MAP[l.key];
      if (!map) return;
      const d = map[l.status] || map.low || map.high;
      if (!d || seen[d.label]) return;
      seen[d.label] = true;
      drills.push({
        label: d.label,
        scenario: d.scenario,
        practiceStreet: d.practiceStreet,
        handRange: 'playable',
        villainLevel: 'fish',
        liveAdvisor: true,
        gameType: gameType,
        reason: l.key + ' ' + l.status
      });
    });
    return drills.slice(0, 4);
  }

  function assessStyleStats(style, ideal) {
    const I = ideal || STYLE_IDEAL;
    if (!style) {
      return { status: 'unknown', label: 'Sin datos', comment: 'Sin métricas de estilo.', lines: [], drills: [], sample: {}, ideal: I };
    }
    const formatKey = (style && (style.formatKey || style.format)) || null;
    const lines = [];
    const s = style;
    const samp = s.sample || {};
    lines.push(assessMetricLine('3-Bet', s.threeBetPct, I.threeBetMin, I.threeBetMax, samp.threeBet, {
      low: 'Amplía 3-bets light IP y vs opens late.',
      high: 'Recorta 3-bets sin plan; prioriza valor + bluffs con blockers.'
    }));
    lines.push(assessMetricLine('Fold to 3-Bet', s.foldToThreeBetPct, I.foldToThreeBetMin, I.foldToThreeBetMax, samp.foldToThreeBet, {
      low: 'Estás defendiendo de más vs 3-bets: foldea peores suited connectors OOP.',
      high: 'Overfold vs 3-bet: defiende más IP y 4-betea polarizado.'
    }));
    lines.push(assessMetricLine('4-Bet', s.fourBetPct, I.fourBetMin, I.fourBetMax, samp.fourBet, {
      low: 'Añade 4-bets polarizados (value + blockers) vs 3-bets.',
      high: '4-beteas demasiado light: reduce bluffs sin plan postflop.'
    }));
    lines.push(assessMetricLine('Fold to 4-Bet', s.foldToFourBetPct, I.foldToFourBetMin, I.foldToFourBetMax, samp.foldToFourBet, {
      low: 'Llamas/shippeas de más vs 4-bet: foldea peores bluffcatchers.',
      high: 'Overfold vs 4-bet: defiende más combos de valor.'
    }));
    lines.push(assessMetricLine('Limp', s.limpPct, I.limpMin, I.limpMax, samp.limp, {
      low: 'Casi no limpeas (bien en regs).',
      high: 'Demasiados limps: prefer raise or fold, sobre todo EP/MP.'
    }));
    lines.push(assessMetricLine('Overlimp', s.overlimpPct, I.overlimpMin, I.overlimpMax, samp.overlimp, {
      low: 'Pocos overlimps.',
      high: 'Overlimpeas: aísla o foldea en vez de pagar limps.'
    }));
    lines.push(assessMetricLine('Iso-limp', s.isoLimpPct, I.isoLimpMin, I.isoLimpMax, samp.isoLimp, {
      low: 'Aísla poco vs limpers: añade value + blockers.',
      high: 'Iso demasiado wide: reduce basura OOP.'
    }));
    lines.push(assessMetricLine('Steal', s.stealPct, I.stealMin, I.stealMax, samp.steal, {
      low: 'Roba más desde CO/BTN/SB cuando llega folded to you.',
      high: 'Steals demasiado anchos: reduce basura OOP y vs blinds sticky.'
    }));
    lines.push(assessMetricLine('Fold to Steal', s.foldToStealPct, I.foldToStealMin, I.foldToStealMax, samp.foldToSteal, {
      low: 'Defiendes de más los blinds: recorta calls dominados.',
      high: 'Overfold a steals: amplia defensa BB vs opens late.'
    }));
    lines.push(assessMetricLine('Squeeze', s.squeezePct, I.squeezeMin, I.squeezeMax, samp.squeeze, {
      low: 'Añade squeezes con blockers cuando hay open+call.',
      high: 'Squeezes demasiado light: prioriza manos con equity o fold equity.'
    }));
    lines.push(assessMetricLine('C-Bet flop', s.cbetFlopPct, I.cbetFlopMin, I.cbetFlopMax, samp.cbetFlop, {
      low: 'C-beteas poco: añade polarización en boards favorables.',
      high: 'C-bet demasiado automático: check más en boards malos OOP.'
    }));
    lines.push(assessMetricLine('Fold to C-Bet', s.foldToCbetFlopPct, I.foldToCbetFlopMin, I.foldToCbetFlopMax, samp.foldToCbetFlop, {
      low: 'Pegajoso vs c-bet: foldea peores backdoors OOP.',
      high: 'Overfold al c-bet: defiende más equity y floats IP.'
    }));
    lines.push(assessMetricLine('C-Bet turn', s.cbetTurnPct, I.cbetTurnMin, I.cbetTurnMax, samp.cbetTurn, {
      low: 'Barrelas poco en turn: añade presión en boards buenos.',
      high: 'Demasiados barrels: check más cuando el board no favorece tu rango.'
    }));
    lines.push(assessMetricLine('C-Bet river', s.cbetRiverPct, I.cbetRiverMin, I.cbetRiverMax, samp.cbetRiver, {
      low: 'Pocos rivers como aggressor: value fino + bluffs con blockers.',
      high: 'Overbarrel river: reduce bluffs sin nut advantage.'
    }));
    lines.push(assessMetricLine('Delayed C-Bet', s.delayedCbetPct, I.delayedCbetMin, I.delayedCbetMax, samp.delayedCbet, {
      low: 'Poco delayed tras check flop: añade leads en turn favorables.',
      high: 'Demasiados delayed: elige boards donde el check-raise range del villano sea estrecho.'
    }));
    lines.push(assessMetricLine('AF', s.af, I.afMin, I.afMax, samp.af, {
      low: 'Pasivo postflop: sustituye calls por bets/raises con value y bluffs.',
      high: 'Agresión excesiva: reduce bluffs multi-street sin equity.'
    }));
    if (s.afq != null) {
      lines.push(assessMetricLine('AFq', s.afq, I.afqMin, I.afqMax, samp.af, {
        low: 'Pocas acciones agresivas postflop.',
        high: 'Demasiada frecuencia agresiva postflop.'
      }));
    }
    lines.push(assessMetricLine('WTSD', s.wtsdPct, I.wtsdMin, I.wtsdMax, samp.wtsd, {
      low: 'Llegas poco a showdown: no overfoldees equity realizable.',
      high: 'Calling station en calles tardías: foldea peores manos vs presión.'
    }));
    lines.push(assessMetricLine('W$SD', s.wsdPct, I.wsdMin, I.wsdMax, samp.wsd, {
      low: 'Ganas poco en showdown: value-bea más fino y evita peores calls.',
      high: 'Muy alto W$SD: puedes value-betear más thin.'
    }));
    lines.push(assessMetricLine('WWSF', s.wwsfPct, I.wwsfMin, I.wwsfMax, samp.wwsf, {
      low: 'Ganas pocos botes vistos: más c-bets y value.',
      high: 'Buen winrate en flops vistos.'
    }));

    const hard = lines.filter((l) => l.status === 'low' || l.status === 'high');
    let status = 'ok';
    if (hard.length) status = hard[0].status;
    else if (lines.every((l) => l.status === 'unknown' || l.status === 'low_sample')) status = 'low_sample';

    let label = 'Estilo equilibrado';
    if (status === 'low') label = 'Estilo conservador / pasivo';
    else if (status === 'high') label = 'Estilo agresivo / loose';
    else if (status === 'low_sample') label = 'Muestra insuficiente';

    const commentParts = lines.map((l) => l.text).filter(Boolean);
    const drills = drillsFromAssess(lines.concat(
      style.gap != null && style.gap > (I.gapMax || 8)
        ? [{ key: 'Steal', status: 'low', text: 'gap' }]
        : []
    ), formatKey);
    return {
      status,
      label,
      comment: commentParts.join(' '),
      lines,
      drills,
      ideal: I,
      formatKey: formatKey || null
    };
  }

  function emptyPosBucket() {
    return { hands: 0, vpip: 0, pfr: 0, threeBetOpps: 0, threeBetHits: 0, stealOpps: 0, stealHits: 0 };
  }

  /** IC aproximado 95% para bb/100 (normal, SE = sd/sqrt(n) * 100). */
  function computeBbPer100CI(handNets) {
    const arr = handNets || [];
    const n = arr.length;
    if (n < 30) return null;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += arr[i];
    const mean = sum / n;
    let ss = 0;
    for (let i = 0; i < n; i++) {
      const d = arr[i] - mean;
      ss += d * d;
    }
    const sd = Math.sqrt(ss / Math.max(1, n - 1));
    const se100 = (sd / Math.sqrt(n)) * 100;
    const mean100 = mean * 100;
    const z = 1.96;
    return {
      mean: Math.round(mean100 * 10) / 10,
      se: Math.round(se100 * 10) / 10,
      low: Math.round((mean100 - z * se100) * 10) / 10,
      high: Math.round((mean100 + z * se100) * 10) / 10,
      n: n
    };
  }

  /** Tags ligeros tipo estudio (IMP-26). */
  function buildHandTags(hand, hud) {
    const tags = [];
    const h = hand || {};
    const style = hud || heroStyleHud(h);
    const hero = h.hero;
    const pos = h.heroPos || (h.positions && hero && h.positions[hero]) || null;
    const pre = ((h.streets && h.streets.preflop) || []);
    let raises = 0;
    pre.forEach((a) => { if (a && (a.type === 'raise' || a.type === 'bet')) raises++; });
    const ip = hero ? heroIsInPositionPostflop(h, hero) : null;
    if (raises >= 2) tags.push(ip ? '3bet pot IP' : '3bet pot OOP');
    else if (raises === 1) tags.push(ip ? 'SRP IP' : 'SRP OOP');
    else if (style.limp || style.overlimp) tags.push('limped pot');
    if (style.isoLimp) tags.push('iso limp');
    if (style.squeeze) tags.push('squeeze');
    if (style.cbetFlopOpp && !style.cbetFlop) tags.push('miss cbet flop');
    if (style.foldToCbetFlop) tags.push('fold to cbet');
    if (style.delayedCbet) tags.push('delayed cbet');
    if (style.cbetTurn) tags.push('barrel turn');
    if (h.shortHanded) tags.push('short-handed');
    if (h.gameKind && h.gameKind !== 'cash') tags.push(h.gameKind);
    if (h.mttPhase) tags.push('stack:' + h.mttPhase);
    if (pos) tags.push('pos:' + pos);
    // unique
    const seen = {};
    return tags.filter((t) => { if (seen[t]) return false; seen[t] = true; return true; });
  }

  function computeStats(hands) {
    const n = hands.length;
    const formatKey = inferSessionFormatKey(hands);
    const format = inferSessionFormat(hands);
    let ideal = styleIdealForFormat(formatKey);
    // Short-handed efectivo: afloja bandas cash si muchas manos a mesa incompleta
    const shortN = (hands || []).filter((h) => h && h.shortHanded).length;
    if (shortN > n * 0.5 && (formatKey === 'cash6' || formatKey === 'cash9')) {
      ideal = cloneIdeal(ideal, {
        vpipMin: ideal.vpipMin + 3, vpipMax: ideal.vpipMax + 5,
        pfrMin: ideal.pfrMin + 2, pfrMax: ideal.pfrMax + 4,
        stealMin: (ideal.stealMin || 30) + 5, stealMax: (ideal.stealMax || 40) + 8
      });
    }
    STYLE_IDEAL = ideal;

    const U = global.PTHHUtils;
    const ctx = U && U.buildSessionContext ? U.buildSessionContext(hands, null) : null;
    const gameKind = (ctx && ctx.gameKind) || 'cash';
    const tableMax = ctx && ctx.tableMax;

    let decN = 0, decGood = 0, evLoss = 0, netBB = 0, evLossEuro = 0;
    let handScoreSum = 0, handScoreN = 0;
    let vpipN = 0, pfrN = 0;
    let threeBetOpps = 0, threeBetHits = 0;
    let foldToThreeBetOpps = 0, foldToThreeBetHits = 0;
    let fourBetOpps = 0, fourBetHits = 0;
    let foldToFourBetOpps = 0, foldToFourBetHits = 0;
    let stealOpps = 0, stealHits = 0;
    let foldToStealOpps = 0, foldToStealHits = 0;
    let squeezeOpps = 0, squeezeHits = 0;
    let limpOpps = 0, limpHits = 0;
    let overlimpOpps = 0, overlimpHits = 0;
    let isoLimpOpps = 0, isoLimpHits = 0;
    let delayedCbetOpps = 0, delayedCbetHits = 0;
    let netEuro = 0;
    let buyInTotal = 0;
    let buyInEvents = 0;
    const stakeTierCount = {};
    const phaseCount = {};
    const byStakesMap = {};
    let cbetFlopOpps = 0, cbetFlopHits = 0;
    let cbetFlopIpOpps = 0, cbetFlopIpHits = 0;
    let cbetFlopOopOpps = 0, cbetFlopOopHits = 0;
    let foldToCbetFlopOpps = 0, foldToCbetFlopHits = 0;
    let cbetTurnOpps = 0, cbetTurnHits = 0;
    let cbetRiverOpps = 0, cbetRiverHits = 0;
    let afBets = 0, afRaises = 0, afCalls = 0, afChecks = 0;
    let sawFlopN = 0, wtsdN = 0, wonAtSdN = 0, wonSawFlopN = 0;
    const byPosition = {};
    const handNets = [];
    const bbRef = hands[0] && hands[0].bb ? hands[0].bb : 0.05;
    const street = { preflop: { n: 0, good: 0 }, flop: { n: 0, good: 0 }, turn: { n: 0, good: 0 }, river: { n: 0, good: 0 } };
    const dist = { optima: 0, aceptable: 0, imprecisa: 0, error: 0 };
    hands.forEach((h) => {
      ensureAnalyzedHandContext(h);
      if (global.GTOScoring && global.GTOScoring.ensureHandScore) {
        global.GTOScoring.ensureHandScore(h);
      } else if (h.handScore == null && global.GTOScoring && global.GTOScoring.scoreHand) {
        const graded = global.GTOScoring.scoreHand(h.decisions || [], h.totalEvLoss);
        h.handScore = graded.score;
        h.handScoreMeta = graded;
      }
      if (h.handScore != null) {
        handScoreSum += Number(h.handScore) || 0;
        handScoreN++;
      }
      netBB += h.heroNetBB;
      handNets.push(Number(h.heroNetBB) || 0);
      evLoss += h.totalEvLoss;
      if (h.bb) netEuro += (h.heroNetBB || 0) * h.bb;
      if (h.buyIn != null) {
        buyInTotal += h.buyIn + (h.buyInFee || 0);
        buyInEvents++;
      }
      if (h.stakeTier) stakeTierCount[h.stakeTier] = (stakeTierCount[h.stakeTier] || 0) + 1;
      if (h.mttPhase) phaseCount[h.mttPhase] = (phaseCount[h.mttPhase] || 0) + 1;
      const stakeKey = h.stakesLabel || (h.bb ? ((h.currency || '€') + (h.sb || h.bb / 2) + '/' + (h.currency || '€') + h.bb) : 'unknown');
      if (!byStakesMap[stakeKey]) byStakesMap[stakeKey] = { hands: 0, netBB: 0, stakeTier: h.stakeTier || null };
      byStakesMap[stakeKey].hands++;
      byStakesMap[stakeKey].netBB += Number(h.heroNetBB) || 0;
      const hud = heroStyleHud(h);
      if (hud.vpip) vpipN++;
      if (hud.pfr) pfrN++;
      if (hud.limpOpp) { limpOpps++; if (hud.limp) limpHits++; }
      if (hud.overlimpOpp) { overlimpOpps++; if (hud.overlimp) overlimpHits++; }
      if (hud.isoLimpOpp) { isoLimpOpps++; if (hud.isoLimp) isoLimpHits++; }
      if (hud.threeBetOpp) { threeBetOpps++; if (hud.threeBet) threeBetHits++; }
      if (hud.foldToThreeBetOpp) { foldToThreeBetOpps++; if (hud.foldToThreeBet) foldToThreeBetHits++; }
      if (hud.fourBetOpp) { fourBetOpps++; if (hud.fourBet) fourBetHits++; }
      if (hud.foldToFourBetOpp) { foldToFourBetOpps++; if (hud.foldToFourBet) foldToFourBetHits++; }
      if (hud.stealOpp) { stealOpps++; if (hud.steal) stealHits++; }
      if (hud.foldToStealOpp) { foldToStealOpps++; if (hud.foldToSteal) foldToStealHits++; }
      if (hud.squeezeOpp) { squeezeOpps++; if (hud.squeeze) squeezeHits++; }
      if (hud.cbetFlopOpp) { cbetFlopOpps++; if (hud.cbetFlop) cbetFlopHits++; }
      if (hud.cbetFlopIpOpp) { cbetFlopIpOpps++; if (hud.cbetFlopIp) cbetFlopIpHits++; }
      if (hud.cbetFlopOopOpp) { cbetFlopOopOpps++; if (hud.cbetFlopOop) cbetFlopOopHits++; }
      if (hud.foldToCbetFlopOpp) { foldToCbetFlopOpps++; if (hud.foldToCbetFlop) foldToCbetFlopHits++; }
      if (hud.cbetTurnOpp) { cbetTurnOpps++; if (hud.cbetTurn) cbetTurnHits++; }
      if (hud.cbetRiverOpp) { cbetRiverOpps++; if (hud.cbetRiver) cbetRiverHits++; }
      if (hud.delayedCbetOpp) { delayedCbetOpps++; if (hud.delayedCbet) delayedCbetHits++; }
      afBets += hud.afBets;
      afRaises += hud.afRaises;
      afCalls += hud.afCalls;
      afChecks += hud.afChecks;
      if (hud.sawFlop) {
        sawFlopN++;
        if (hud.wentToSd) {
          wtsdN++;
          if (hud.wonAtSd) wonAtSdN++;
        }
        if (hud.wonWhenSawFlop) wonSawFlopN++;
      }
      const pos = hud.heroPos || h.heroPos || '??';
      if (!byPosition[pos]) byPosition[pos] = emptyPosBucket();
      const pb = byPosition[pos];
      pb.hands++;
      if (hud.vpip) pb.vpip++;
      if (hud.pfr) pb.pfr++;
      if (hud.threeBetOpp) { pb.threeBetOpps++; if (hud.threeBet) pb.threeBetHits++; }
      if (hud.stealOpp) { pb.stealOpps++; if (hud.steal) pb.stealHits++; }
      (h.decisions || []).forEach((d) => {
        if (d.evErroneous) evLossEuro += d.evLossEuro != null ? d.evLossEuro : r2((d.evLoss || 0) * bbRef);
        decN++;
        if (d.class === 'optima' || d.class === 'aceptable') decGood++;
        dist[d.class] = (dist[d.class] || 0) + 1;
        const s = street[d.street]; if (s) { s.n++; if (d.class === 'optima' || d.class === 'aceptable') s.good++; }
      });
    });
    const accuracy = decN ? Math.round((decGood / decN) * 100) : 100;
    const accByStreet = {};
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      accByStreet[st] = street[st].n ? Math.round((street[st].good / street[st].n) * 100) : null;
    });

    const byNet = hands.slice().sort((a, b) => b.heroNetBB - a.heroNetBB);
    const best5 = byNet.slice(0, 5);
    const worst5 = byNet.slice(-5).reverse();

    const evLostBB = r2(evLoss);
    const actualNet = r2(netBB);
    const netEv = GTO.EvLoss.computeNetEvStats(actualNet, evLostBB);
    const expectedNet = netEv.expectedNet;
    const varianceAdj = netEv.varianceAdj;
    const perfectPlayNetBB = expectedNet;
    const perfectPlayNetEuro = r2(perfectPlayNetBB * bbRef);
    const adjustedNet = expectedNet;
    const evLossEuroTotal = r2(evLossEuro || evLostBB * bbRef);
    const leakVar = GTO.EvLoss.computeLeakVariancePct
      ? GTO.EvLoss.computeLeakVariancePct(actualNet, evLostBB)
      : { pctDecision: 50, pctVariance: 50, leakPartBB: evLostBB, varPartBB: 0 };
    const pctDecision = leakVar.pctDecision;
    const pctVariance = leakVar.pctVariance;

    const grade = sessionGrade(accuracy, evLoss, decN, netBB);
    const avgHandScore = handScoreN ? r2(handScoreSum / handScoreN) : null;
    const vpipPct = n ? Math.round((vpipN / n) * 1000) / 10 : null;
    const pfrPct = n ? Math.round((pfrN / n) * 1000) / 10 : null;
    const vpipPfr = assessVpipPfr(vpipPct, pfrPct, n, ideal);

    const limpPct = pctFrom(limpHits, limpOpps);
    const overlimpPct = pctFrom(overlimpHits, overlimpOpps);
    const isoLimpPct = pctFrom(isoLimpHits, isoLimpOpps);
    const threeBetPct = pctFrom(threeBetHits, threeBetOpps);
    const foldToThreeBetPct = pctFrom(foldToThreeBetHits, foldToThreeBetOpps);
    const fourBetPct = pctFrom(fourBetHits, fourBetOpps);
    const foldToFourBetPct = pctFrom(foldToFourBetHits, foldToFourBetOpps);
    const stealPct = pctFrom(stealHits, stealOpps);
    const foldToStealPct = pctFrom(foldToStealHits, foldToStealOpps);
    const squeezePct = pctFrom(squeezeHits, squeezeOpps);
    const cbetFlopPct = pctFrom(cbetFlopHits, cbetFlopOpps);
    const cbetFlopIpPct = pctFrom(cbetFlopIpHits, cbetFlopIpOpps);
    const cbetFlopOopPct = pctFrom(cbetFlopOopHits, cbetFlopOopOpps);
    const foldToCbetFlopPct = pctFrom(foldToCbetFlopHits, foldToCbetFlopOpps);
    const cbetTurnPct = pctFrom(cbetTurnHits, cbetTurnOpps);
    const cbetRiverPct = pctFrom(cbetRiverHits, cbetRiverOpps);
    const delayedCbetPct = pctFrom(delayedCbetHits, delayedCbetOpps);
    const afAgg = afBets + afRaises;
    const afActions = afAgg + afCalls + afChecks;
    const af = afCalls > 0 ? Math.round((afAgg / afCalls) * 100) / 100
      : (afAgg > 0 ? afAgg : null);
    const afq = afActions > 0 ? Math.round((afAgg / afActions) * 1000) / 10 : null;
    const wtsdPct = pctFrom(wtsdN, sawFlopN);
    const wsdPct = pctFrom(wonAtSdN, wtsdN);
    const wwsfPct = pctFrom(wonSawFlopN, sawFlopN);
    const bbPer100 = n ? Math.round((actualNet / n) * 1000) / 10 : null;
    const bbPer100CI = computeBbPer100CI(handNets);
    const bbPer100Note = n < 20000
      ? 'Varianza alta con menos de 20k manos; interpreta bb/100 con cautela.'
        + (bbPer100CI ? (' IC95%: ' + (bbPer100CI.low >= 0 ? '+' : '') + bbPer100CI.low
          + ' … ' + (bbPer100CI.high >= 0 ? '+' : '') + bbPer100CI.high + ' bb/100.') : '')
      : (bbPer100CI ? ('IC95% ≈ ' + (bbPer100CI.low >= 0 ? '+' : '') + bbPer100CI.low
        + ' … ' + (bbPer100CI.high >= 0 ? '+' : '') + bbPer100CI.high + ' bb/100.') : null);
    const evLossPer100 = n ? Math.round((evLostBB / n) * 1000) / 10 : null;
    const byStakes = Object.keys(byStakesMap).map((k) => {
      const b = byStakesMap[k];
      return {
        stakesLabel: k,
        stakeTier: b.stakeTier,
        hands: b.hands,
        netBB: r2(b.netBB),
        bbPer100: b.hands ? Math.round((b.netBB / b.hands) * 1000) / 10 : null
      };
    }).sort((a, b) => b.hands - a.hands);

    const byPositionOut = {};
    POS_ORDER.concat(Object.keys(byPosition)).forEach((pos) => {
      if (!byPosition[pos] || byPositionOut[pos]) return;
      const pb = byPosition[pos];
      byPositionOut[pos] = {
        hands: pb.hands,
        vpipPct: pctFrom(pb.vpip, pb.hands),
        pfrPct: pctFrom(pb.pfr, pb.hands),
        threeBetPct: pctFrom(pb.threeBetHits, pb.threeBetOpps),
        threeBetOpps: pb.threeBetOpps,
        stealPct: pctFrom(pb.stealHits, pb.stealOpps),
        stealOpps: pb.stealOpps,
        sample: sampleTrust(pb.hands, 'byPos', ideal)
      };
    });

    // ROI aproximado (spins/MTT): profit € / buy-ins invertidos
    // Nota: sin ficheros de resultados de torneo, usamos buyIn declarado × manos/estimación débil.
    const avgBuyIn = buyInEvents ? (buyInTotal / buyInEvents) : (ctx && ctx.avgBuyIn) || null;
    let roiPct = null;
    let profitEuro = r2(netEuro);
    if (avgBuyIn && (gameKind === 'spin' || gameKind === 'mtt' || gameKind === 'sng')) {
      // Heurística: 1 buy-in por sesión-archivo si no hay mejor señal; si hay buyIn en manos, usamos suma
      const invested = buyInEvents ? buyInTotal : avgBuyIn;
      if (invested > 0) roiPct = Math.round(((profitEuro) / invested) * 1000) / 10;
    }
    let dominantStakeTier = null;
    let bestTierN = -1;
    Object.keys(stakeTierCount).forEach((k) => {
      if (stakeTierCount[k] > bestTierN) { bestTierN = stakeTierCount[k]; dominantStakeTier = k; }
    });
    let dominantPhase = null;
    let bestPhaseN = -1;
    Object.keys(phaseCount).forEach((k) => {
      if (phaseCount[k] > bestPhaseN) { bestPhaseN = phaseCount[k]; dominantPhase = k; }
    });

    const style = {
      format,
      formatKey,
      gameKind,
      tableMax,
      vpipPct, pfrPct, gap: vpipPct != null && pfrPct != null ? Math.round((vpipPct - pfrPct) * 10) / 10 : null,
      limpPct, limpOpps, limpHits,
      overlimpPct, overlimpOpps, overlimpHits,
      isoLimpPct, isoLimpOpps, isoLimpHits,
      threeBetPct, threeBetOpps, threeBetHits,
      foldToThreeBetPct, foldToThreeBetOpps, foldToThreeBetHits,
      fourBetPct, fourBetOpps, fourBetHits,
      foldToFourBetPct, foldToFourBetOpps, foldToFourBetHits,
      stealPct, stealOpps, stealHits,
      foldToStealPct, foldToStealOpps, foldToStealHits,
      squeezePct, squeezeOpps, squeezeHits,
      cbetFlopPct, cbetFlopOpps, cbetFlopHits,
      cbetFlopIpPct, cbetFlopIpOpps, cbetFlopIpHits,
      cbetFlopOopPct, cbetFlopOopOpps, cbetFlopOopHits,
      foldToCbetFlopPct, foldToCbetFlopOpps, foldToCbetFlopHits,
      cbetTurnPct, cbetTurnOpps, cbetTurnHits,
      cbetRiverPct, cbetRiverOpps, cbetRiverHits,
      delayedCbetPct, delayedCbetOpps, delayedCbetHits,
      af, afq, afBets, afRaises, afCalls, afChecks,
      wtsdPct, wsdPct, wwsfPct, sawFlopN, wtsdN, wonAtSdN, wonSawFlopN,
      bbPer100, bbPer100Note, bbPer100CI, evLossPer100,
      byPosition: byPositionOut,
      byStakes,
      sample: {
        vpip: sampleTrust(n, 'vpip', ideal),
        pfr: sampleTrust(n, 'pfr', ideal),
        limp: sampleTrust(limpOpps, 'limp', ideal),
        overlimp: sampleTrust(overlimpOpps, 'overlimp', ideal),
        isoLimp: sampleTrust(isoLimpOpps, 'isoLimp', ideal),
        threeBet: sampleTrust(threeBetOpps, 'threeBet', ideal),
        foldToThreeBet: sampleTrust(foldToThreeBetOpps, 'foldToThreeBet', ideal),
        fourBet: sampleTrust(fourBetOpps, 'fourBet', ideal),
        foldToFourBet: sampleTrust(foldToFourBetOpps, 'foldToFourBet', ideal),
        steal: sampleTrust(stealOpps, 'steal', ideal),
        foldToSteal: sampleTrust(foldToStealOpps, 'foldToSteal', ideal),
        squeeze: sampleTrust(squeezeOpps, 'squeeze', ideal),
        cbetFlop: sampleTrust(cbetFlopOpps, 'cbetFlop', ideal),
        foldToCbetFlop: sampleTrust(foldToCbetFlopOpps, 'foldToCbetFlop', ideal),
        cbetTurn: sampleTrust(cbetTurnOpps, 'cbetTurn', ideal),
        cbetRiver: sampleTrust(cbetRiverOpps, 'cbetRiver', ideal),
        delayedCbet: sampleTrust(delayedCbetOpps, 'delayedCbet', ideal),
        af: sampleTrust(afActions, 'af', ideal),
        wtsd: sampleTrust(sawFlopN, 'wtsd', ideal),
        wsd: sampleTrust(wtsdN, 'wsd', ideal),
        wwsf: sampleTrust(sawFlopN, 'wwsf', ideal)
      }
    };
    const styleAssess = assessStyleStats(style, ideal);

    return {
      nHands: n, nDecisions: decN, accuracy, accByStreet, dist,
      netBB: actualNet, evLossBB: evLostBB,
      evPerHand: n ? r2(evLoss / n) : 0,
      avgHandScore,
      best5: best5.map(slim), worst5: worst5.map(slim),
      evDecision: evLostBB, expectedNet, actualNet, varianceAdj, adjustedNet,
      perfectPlayNetBB, perfectPlayNetEuro, evLossEuroTotal,
      pctDecision, pctVariance, leakPartBB: leakVar.leakPartBB, varPartBB: leakVar.varPartBB,
      vpipPct, pfrPct, vpipHands: vpipN, pfrHands: pfrN,
      vpipPfrGap: style.gap,
      vpipPfr: vpipPfr,
      limpPct, limpOpps, limpHits,
      overlimpPct, overlimpOpps, overlimpHits,
      isoLimpPct, isoLimpOpps, isoLimpHits,
      threeBetPct, threeBetOpps, threeBetHits,
      foldToThreeBetPct, foldToThreeBetOpps, foldToThreeBetHits,
      fourBetPct, fourBetOpps, fourBetHits,
      foldToFourBetPct, foldToFourBetOpps, foldToFourBetHits,
      stealPct, stealOpps, stealHits,
      foldToStealPct, foldToStealOpps, foldToStealHits,
      squeezePct, squeezeOpps, squeezeHits,
      cbetFlopPct, cbetFlopOpps, cbetFlopHits,
      cbetFlopIpPct, cbetFlopIpOpps, cbetFlopIpHits,
      cbetFlopOopPct, cbetFlopOopOpps, cbetFlopOopHits,
      foldToCbetFlopPct, foldToCbetFlopOpps, foldToCbetFlopHits,
      cbetTurnPct, cbetTurnOpps, cbetTurnHits,
      cbetRiverPct, cbetRiverOpps, cbetRiverHits,
      delayedCbetPct, delayedCbetOpps, delayedCbetHits,
      af, afq, afBets, afRaises, afCalls, afChecks,
      wtsdPct, wsdPct, wwsfPct, sawFlopN, wtsdN, wonAtSdN, wonSawFlopN,
      bbPer100, bbPer100Note, bbPer100CI, evLossPer100,
      byPosition: byPositionOut,
      byStakes,
      format, formatKey, gameKind, tableMax,
      stakesLabel: (ctx && ctx.stakesLabel) || '',
      stakeTier: dominantStakeTier,
      mttPhase: dominantPhase,
      shortHandedShare: ctx ? ctx.shortHandedShare : 0,
      profitEuro, avgBuyIn, roiPct,
      styleIdeal: ideal,
      style, styleAssess,
      grade
    };
  }

  function slim(h) {
    const scoreMeta = (h.handScoreMeta && h.handScore != null)
      ? h.handScoreMeta
      : (global.GTOScoring && global.GTOScoring.scoreHand
        ? global.GTOScoring.scoreHand(h.decisions || [], h.totalEvLoss)
        : null);
    const handScore = h.handScore != null ? h.handScore : (scoreMeta ? scoreMeta.score : null);
    return {
      id: h.id, heroCode: h.heroCode, heroCards: h.heroCards, heroPos: h.heroPos, board: h.board,
      heroNetBB: h.heroNetBB, totalEvLoss: h.totalEvLoss, accuracy: h.accuracy, worstClass: h.worstClass,
      handScore: handScore,
      handScoreMeta: scoreMeta
    };
  }

  function sessionGrade(accuracy, evLoss, decN, netBB) {
    const evPer100 = decN ? (evLoss / decN) * 100 : 0; // bb perdidos cada 100 decisiones
    // puntuación 0..10: acierto pesa, penaliza EV perdido por decisión
    let score = (accuracy / 10) * 0.6 + Math.max(0, 10 - evPer100 / 3) * 0.4;
    score = Math.max(0, Math.min(10, score));
    let letter;
    if (score >= 9) letter = 'A+';
    else if (score >= 8) letter = 'A';
    else if (score >= 7) letter = 'B';
    else if (score >= 6) letter = 'C';
    else if (score >= 4.5) letter = 'D';
    else letter = 'E';
    let verdict;
    if (score >= 8) verdict = 'Sesión muy sólida, decisiones cercanas a GTO.';
    else if (score >= 6.5) verdict = 'Buena sesión con margen de mejora puntual.';
    else if (score >= 5) verdict = 'Sesión regular: revisa los spots con más EV perdido.';
    else verdict = 'Sesión con fugas importantes; repasa los errores marcados.';
    return { score: r2(score), letter, verdict };
  }

  function appendShowdownToTimeline(h, tl) {
    const shows = h.villainShows || {};
    Object.keys(shows).forEach((player) => {
      if (tl.some((x) => x.kind === 'show' && x.player === player)) return;
      const posItem = tl.find((x) => (x.kind === 'action' || x.kind === 'show') && x.player === player && x.pos);
      tl.push({
        kind: 'show', street: 'river', player,
        pos: posItem ? posItem.pos : '',
        cards: shows[player].slice()
      });
    });
  }

  /** Añade river y showdown al timeline si el board está completo (p. ej. all-in en turn). */
  function ensureFullTimeline(h) {
    if (!h) return h;
    const board = h.board || [];
    if (board.length < 5) return h;
    const summary = (h.summary && h.summary.length) ? h.summary.slice() : [];
    const hasRiver = summary.some((x) => x.kind === 'street' && x.street === 'river');
    if (!hasRiver) {
      summary.push({ kind: 'street', street: 'river', board: board.slice() });
    }
    appendShowdownToTimeline(h, summary);
    h.summary = summary;
    return h;
  }

  function ensureHandSummary(h) {
    if (!h) return h;
    if (!h.summary || !h.summary.length) {
      const tl = [];
      let lastStreet = null;
      (h.decisions || []).forEach(function (d) {
        if (d.street !== lastStreet) {
          const n = { preflop: 0, flop: 3, turn: 4, river: 5 }[d.street] || 0;
          tl.push({ kind: 'street', street: d.street, board: (h.board || []).slice(0, n) });
          lastStreet = d.street;
        }
        const raw = d.chosen || d.action || 'check';
        const type = raw.indexOf('bet_') === 0 ? 'bet' : raw.split('_')[0];
        tl.push({
          kind: 'action', street: d.street,
          player: h.heroPos || 'Héroe', pos: h.heroPos,
          type: type, amount: d.betSizeBB, to: null
        });
      });
      h.summary = tl;
    }
    return ensureFullTimeline(h);
  }

  function importFailureMessage(fileName, text, parsed) {
    if (global.PTHHUtils && typeof global.PTHHUtils.importFailureMessage === 'function') {
      return global.PTHHUtils.importFailureMessage(fileName, text, parsed);
    }
    return 'No se reconocieron manos NLHE (cash/spins/torneo) en «' + (fileName || 'archivo.txt')
      + '». Comprueba que sea un historial de manos de PokerStars, Winamax, GGPoker o 888poker.';
  }

  global.Importer = {
    parseSession, parseSessionAsync, parseHand, detectSessionFormat, analyzeHand, buildSession, buildSessionAsync,
    heroPlayed, computeStats, heroPreflopHud, heroStyleHud, assessVpipPfr, assessStyleStats,
    sampleTrust, styleIdealForFormat, inferSessionFormat, inferSessionFormatKey, formatKeyToRangeGameType,
    drillsFromAssess, buildHandTags, computeBbPer100CI,
    heroCandidatesFromParsed, needsHeroConfirmation, handDedupeKey,
    importFailureMessage,
    STYLE_IDEAL: STYLE_IDEAL_6MAX, STYLE_IDEAL_6MAX, STYLE_IDEAL_BY_FORMAT, HUD_IDEAL,
    num, cardsFrom,
    buildEvalInputFromDecision, recomputeDecisionGto, recomputeHandDecisions, recomputeHeroNet,
    heroNet, inferCollectedFromShowdown,
    ensureAnalyzedHandContext, ensureHandSummary, ensureFullTimeline
  };
})(window);
