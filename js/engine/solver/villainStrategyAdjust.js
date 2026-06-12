/*
 * villainStrategyAdjust.js — Ajustes de frecuencia según línea del villano (Fase 2).
 */
(function (global) {
  'use strict';

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function normalize(freqs) {
    let sum = 0;
    for (const k in freqs) sum += freqs[k] || 0;
    if (sum <= 0) return freqs;
    const out = {};
    for (const k in freqs) out[k] = (freqs[k] || 0) / sum;
    return out;
  }

  /**
   * @param {Object} freqs — estrategia base
   * @param {Object} ctx — { villainLastAction, villainBetRatio, street, facingBet }
   */
  function applyVillainAdjustments(freqs, ctx) {
    ctx = ctx || {};
    if (!ctx.villainLastAction && ctx.villainBetRatio == null) return freqs;

    const out = Object.assign({}, freqs);
    const action = ctx.villainLastAction || 'bet';
    const ratio = ctx.villainBetRatio || 0;
    const street = ctx.street || 'flop';
    const facing = ctx.facingBet || (ctx.toCallBB || 0) > 0;

    if (!facing) {
      if (action === 'check') {
        if (out.bet_33 != null) out.bet_33 *= 1.12;
        if (out.bet_66 != null) out.bet_66 *= 1.08;
        if (out.bet_100 != null) out.bet_100 *= 1.05;
        if (out.check != null) out.check *= 0.88;
      }
      if (action === 'call' && street === 'turn') {
        if (out.bet_66 != null) out.bet_66 *= 1.1;
        if (out.bet_100 != null) out.bet_100 *= 1.06;
      }
      return normalize(out);
    }

    if (action === 'bet' || action === 'raise') {
      if (ratio >= 0.85) {
        if (out.fold != null) out.fold = clamp(out.fold * 1.08, 0, 0.85);
        if (out.raise != null) out.raise *= 0.65;
        if (out.call != null) out.call *= 0.92;
      } else if (ratio >= 0.55) {
        if (out.call != null) out.call *= 1.05;
        if (out.raise != null) out.raise *= 0.85;
      } else if (ratio <= 0.35) {
        if (out.call != null) out.call *= 1.08;
        if (out.raise != null) out.raise *= 1.12;
        if (out.fold != null) out.fold *= 0.92;
      }

      if (street === 'river' && ratio >= 0.65) {
        if (out.fold != null) out.fold = clamp(out.fold + 0.04, 0, 0.9);
        if (out.call != null) out.call = Math.max(0.02, (out.call || 0) - 0.03);
      }

      if (action === 'raise') {
        if (out.fold != null) out.fold = clamp(out.fold * 1.12, 0, 0.88);
        if (out.raise != null) out.raise *= 0.55;
      }
    }

    if (action === 'check' && facing) {
      if (out.call != null) out.call *= 1.06;
    }

    return normalize(out);
  }

  global.GTOVillainStrategyAdjust = { applyVillainAdjustments, normalize };
})(window);
