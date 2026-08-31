/*
 * villainLinePolicy.js — Política de líneas del villano pro:
 * check-raise, delayed c-bet, probe, donk, overbet eligibility.
 * Heurística con frecuencias (no solver tree).
 */
(function (global) {
  'use strict';

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function boardTexture(board) {
    const Board = global.GTOBoardCluster;
    if (Board && Board.boardTexture) return Board.boardTexture(board || []);
    return { wet: false, paired: false, monotone: false };
  }

  function formatMults(ctx) {
    const FA = global.GTOVillainFormatAdjust;
    return FA && FA.multipliers ? FA.multipliers(ctx) : { xr: 1, overbet: 1, bluff: 1, cbet: 1 };
  }

  function exploitMults(ctx) {
    const Ex = global.GTOVillainProExploit;
    return Ex && Ex.multipliers ? Ex.multipliers(ctx) : { xr: 1, overbet: 1, barrel: 1, donk: 1 };
  }

  /**
   * ¿Spot apto para overbet de river (lead o raise)?
   */
  function overbetEligible(ctx) {
    ctx = ctx || {};
    if (ctx.street !== 'river') return false;
    const m = formatMults(ctx);
    if (m.overbet < 0.2) return false;
    const spr = ctx.spr != null ? ctx.spr : 8;
    const band = ctx.band || '';
    const polar = ctx.polarization != null ? ctx.polarization : 0.4;
    const strength = ctx.strength != null ? ctx.strength : 0.5;
    const nuts = !!ctx.isNuts || band === 'nuts' || (ctx.madeCategory != null && ctx.madeCategory >= 4);
    const air = band === 'air' || strength < 0.28;
    const valuePolar = nuts || (band === 'value' && strength > 0.78);
    const bluffPolar = air && (ctx.hasBlocker || polar > 0.45);
    if (spr > 12 && !nuts) return false;
    if (valuePolar || bluffPolar) return true;
    if (polar > 0.55 && (strength > 0.72 || strength < 0.3)) return true;
    if (spr <= 4 && strength > 0.65) return true;
    return false;
  }

  /** Peso base de overbet cuando es elegible (antes de format/exploit). */
  function overbetWeight(ctx) {
    if (!overbetEligible(ctx)) return 0;
    const m = formatMults(ctx);
    const e = exploitMults(ctx);
    let w = 0.14;
    if (ctx.isNuts || ctx.band === 'nuts') w = 0.22;
    else if (ctx.band === 'air' || (ctx.strength != null && ctx.strength < 0.28)) w = 0.16;
    else if (ctx.band === 'value') w = 0.18;
    if ((ctx.spr != null && ctx.spr <= 3.5) || (ctx.stackBB != null && ctx.stackBB <= 25)) w += 0.06;
    return clamp(w * m.overbet * (e.overbet || 1), 0, 0.35);
  }

  /**
   * Decisión de lead (primero en actuar en la calle).
   * Retorna { actionHint: 'check'|'bet'|'auto', intent, forceCheck, preferSizeKey, reason }
   */
  function decideLead(ctx, rnd) {
    ctx = ctx || {};
    rnd = rnd != null ? rnd : Math.random();
    const m = formatMults(ctx);
    const e = exploitMults(ctx);
    const street = ctx.street || 'flop';
    const texture = boardTexture(ctx.board);
    const inPos = !!ctx.inPosition;
    const isAgg = ctx.initiative === 'aggressor';
    const strength = ctx.strength != null ? ctx.strength : 0.5;
    const band = ctx.band || '';
    const priorChecks = !!ctx.priorStreetCheckCheck;

    // Delayed c-bet: agresor, flop fue check-check, turn
    if (isAgg && priorChecks && street === 'turn') {
      let delayFreq = clamp(0.42 * m.cbet * (e.barrel || 1), 0.25, 0.62);
      if (texture.wet) delayFreq *= 0.85;
      if (strength > 0.55 || band === 'value' || band === 'nuts') delayFreq = clamp(delayFreq + 0.12, 0.3, 0.75);
      if (rnd < delayFreq) {
        return { actionHint: 'bet', intent: 'delayedCbet', forceCheck: false, preferSizeKey: null, reason: 'delayed_cbet' };
      }
    }

    // Donk: caller OOP, fuerte cambio / nutted, turn/river — raro
    if (!isAgg && !inPos && (street === 'turn' || street === 'river')) {
      const strong = strength > 0.78 || band === 'nuts' || band === 'value' || (ctx.madeCategory != null && ctx.madeCategory >= 3);
      if (strong) {
        let donkFreq = clamp(0.07 * (e.donk || 1), 0.03, 0.14);
        if (street === 'river') donkFreq *= 1.15;
        if (m.bluff < 0.7) donkFreq *= 0.6;
        if (rnd < donkFreq) {
          return { actionHint: 'bet', intent: 'donk', forceCheck: false, preferSizeKey: 'bet_66', reason: 'donk_strong' };
        }
      }
    }

    // Check-raise setup: OOP en flop, textura mid/wet, no bubble extremo
    if (!inPos && street === 'flop' && m.xr >= 0.5) {
      const midWet = texture.wet || (!texture.paired && !texture.monotone);
      const canXrValue = strength > 0.62 || band === 'value' || band === 'nuts' || (ctx.madeCategory != null && ctx.madeCategory >= 2);
      const canXrBluff = (strength < 0.35 || band === 'air') && m.bluff > 0.65;
      if (midWet && (canXrValue || canXrBluff)) {
        let xrSetup = clamp(0.12 * m.xr * (e.xr || 1), 0.05, 0.22);
        if (canXrValue) xrSetup = clamp(xrSetup + 0.04, 0.06, 0.24);
        if (texture.paired) xrSetup *= 0.55;
        if (rnd < xrSetup) {
          return { actionHint: 'check', intent: 'checkRaise', forceCheck: true, preferSizeKey: null, reason: 'xr_setup' };
        }
      }
    }

    // Overbet lead river
    if (street === 'river' && overbetEligible(ctx)) {
      const w = overbetWeight(ctx);
      // Solo fuerza size; la decisión bet/check sigue la estrategia
      if (w > 0.08 && rnd < w * 1.4) {
        return { actionHint: 'auto', intent: 'overbet', forceCheck: false, preferSizeKey: 'overbet', reason: 'river_overbet' };
      }
    }

    return { actionHint: 'auto', intent: null, forceCheck: false, preferSizeKey: null, reason: 'default' };
  }

  /**
   * Ajuste de freqs al enfrentar apuesta (check-raise follow-through).
   */
  function adjustFacing(freqs, ctx) {
    ctx = ctx || {};
    const out = Object.assign({}, freqs || {});
    const m = formatMults(ctx);
    const e = exploitMults(ctx);

    if (ctx.lineIntent === 'checkRaise') {
      const street = ctx.street || 'flop';
      let boost = street === 'flop' ? 0.22 : (street === 'turn' ? 0.16 : 0.12);
      boost *= m.xr * (e.xr || 1);
      const strength = ctx.strength != null ? ctx.strength : 0.5;
      if (strength < 0.38) boost *= m.bluff;
      if (strength > 0.7) boost *= 1.15;
      const raise = (out.raise || 0) + boost;
      const fold = Math.max(0, (out.fold || 0) * 0.75);
      const call = Math.max(0, 1 - raise - fold);
      out.raise = raise;
      out.fold = fold;
      out.call = call;
    }

    // Raise polar river → boost overbet eligibility flag (sizing layer lo usa)
    if (ctx.street === 'river' && overbetEligible(ctx) && (out.raise || 0) > 0.05) {
      out._preferOverbetRaise = true;
    }

    let sum = (out.fold || 0) + (out.call || 0) + (out.raise || 0);
    if (sum > 0) {
      out.fold = (out.fold || 0) / sum;
      out.call = (out.call || 0) / sum;
      out.raise = (out.raise || 0) / sum;
    }
    return out;
  }

  global.GTOVillainLinePolicy = {
    overbetEligible: overbetEligible,
    overbetWeight: overbetWeight,
    decideLead: decideLead,
    adjustFacing: adjustFacing,
    boardTexture: boardTexture
  };
})(typeof window !== 'undefined' ? window : global);
