/*
 * blockers.js — Efecto de blockers en frecuencias de farol y defensa (Fase 2).
 */
(function (global) {
  'use strict';

  const C = global.Cards;

  function suitCounts(cards) {
    const counts = { s: 0, h: 0, d: 0, c: 0 };
    (cards || []).forEach((c) => { counts[c[1]] = (counts[c[1]] || 0) + 1; });
    return counts;
  }

  function boardFlushSuit(board) {
    const counts = suitCounts(board);
    for (const s of C.SUITS) {
      if (counts[s] >= 3) return s;
    }
    return null;
  }

  /**
   * Score -1..+1: positivo = buenos blockers para farol/defensa, negativo = malos.
   */
  function computeBlockerScore(heroCards, board, ctx) {
    ctx = ctx || {};
    const street = ctx.street || 'flop';
    const band = ctx.band || 'merge';
    let score = 0;
    const boardArr = board || [];
    const hero = heroCards || [];

    const flushSuit = boardFlushSuit(boardArr);
    if (flushSuit) {
      const heroFlushCards = hero.filter((c) => c[1] === flushSuit);
      if (heroFlushCards.some((c) => c[0] === 'A')) score += 0.35;
      else if (heroFlushCards.some((c) => C.RANK_VALUE[c[0]] >= 12)) score += 0.12;
      if (band === 'air' && heroFlushCards.length) score += 0.08;
    }

    const boardVals = boardArr.map((c) => C.RANK_VALUE[c[0]]);
    const heroVals = hero.map((c) => C.RANK_VALUE[c[0]]);
    const topBoard = Math.max(...boardVals, 0);
    if (heroVals.some((v) => v === topBoard)) score += 0.1;
    if (heroVals.some((v) => v === topBoard - 1)) score += 0.06;

    if (street === 'river' && band === 'bluffcatch') {
      if (heroVals.some((v) => v >= 12)) score -= 0.08;
    }

    if (street === 'river' && band === 'air') {
      if (heroVals.every((v) => v <= 9)) score += 0.05;
    }

    return Math.max(-1, Math.min(1, score));
  }

  /** Multiplicadores sobre frecuencias (probe o facing bet). */
  function applyBlockerAdjustments(freqs, heroCards, board, ctx) {
    const score = computeBlockerScore(heroCards, board, ctx);
    const out = Object.assign({}, freqs);
    const band = ctx.band || 'merge';

    if (band === 'air' || band === 'bluffcatch') {
      const bluffBoost = 1 + score * 0.25;
      ['bet_33', 'bet_66', 'bet_100', 'raise'].forEach((a) => {
        if (out[a] != null) out[a] *= bluffBoost;
      });
      if (out.call != null && band === 'air') out.call *= (1 - score * 0.3);
    }

    if (band === 'bluffcatch' && out.call != null) {
      out.call *= (1 + score * 0.12);
      if (out.fold != null) out.fold *= (1 - score * 0.1);
    }

    if (band === 'nuts' || band === 'value') {
      if (out.check != null && score > 0.2) out.check *= 1.06;
    }

    return out;
  }

  global.GTOBlockers = { computeBlockerScore, applyBlockerAdjustments, boardFlushSuit };
})(window);
