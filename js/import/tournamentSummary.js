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
