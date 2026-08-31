/*
 * villainFormatAdjust.js — Multiplicadores de freqs/sizings del villano pro
 * según hub (cash/spin/mtt), fase, SPR e ICM lite.
 */
(function (global) {
  'use strict';

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function hubOf(ctx) {
    const Tax = global.PTFormatTaxonomy;
    if (Tax && Tax.normalizeHub) {
      return Tax.normalizeHub(ctx.formatHub || Tax.hubFromGameType(ctx.gameType));
    }
    const g = String(ctx.gameType || ctx.formatHub || 'cash6');
    if (g.indexOf('spin') === 0) return 'spin';
    if (g === 'mtt' || g.indexOf('mtt') === 0) return 'mtt';
    return 'cash';
  }

  function phaseOf(ctx) {
    const Tax = global.PTFormatTaxonomy;
    const hub = hubOf(ctx);
    const explicit = ctx.effectivePhase || ctx.resolvedPhase || ctx.mttPhase;
    if (explicit && explicit !== 'auto') return explicit;
    if (Tax && Tax.phaseFromStackBB) {
      return Tax.phaseFromStackBB(ctx.stackBB != null ? ctx.stackBB : 100, hub);
    }
    const bb = Number(ctx.stackBB) || 100;
    if (hub === 'spin') {
      if (bb <= 12) return 'push';
      if (bb <= 20) return 'mid';
      return 'early';
    }
    if (bb <= 12) return 'push';
    if (bb <= 25) return 'short';
    if (bb <= 45) return 'mid';
    return 'early';
  }

  function usesIcm(ctx) {
    const Tax = global.PTFormatTaxonomy;
    if (Tax && Tax.usesIcm) {
      return !!Tax.usesIcm({
        formatHub: hubOf(ctx),
        gameType: ctx.gameType,
        mttPhase: phaseOf(ctx),
        resolvedPhase: phaseOf(ctx),
        stackBB: ctx.stackBB,
        mttStructureSituation: ctx.mttStructureSituation
      });
    }
    const hub = hubOf(ctx);
    const phase = phaseOf(ctx);
    if (hub === 'spin') return true;
    return phase === 'bubble' || phase === 'push' || phase === 'short';
  }

  /**
   * Devuelve multiplicadores aplicados a freqs/sizings del villano.
   * { bluff, raise, bet, xr, overbet, fold, thinValue, jamBias, sizeSimple }
   */
  function multipliers(ctx) {
    ctx = ctx || {};
    const hub = hubOf(ctx);
    const phase = phaseOf(ctx);
    const stackBB = Number(ctx.stackBB) || 100;
    const spr = ctx.spr != null ? Number(ctx.spr) : (stackBB / Math.max(ctx.potBB || 10, 1));
    const icm = usesIcm(ctx);
    const situ = ctx.mttStructureSituation || '';

    const out = {
      hub: hub,
      phase: phase,
      bluff: 1,
      raise: 1,
      bet: 1,
      xr: 1,
      overbet: 1,
      fold: 1,
      thinValue: 1,
      jamBias: 1,
      sizeSimple: false,
      cbet: 1
    };

    if (hub === 'cash') {
      if (stackBB >= 80) {
        out.xr = 1.35;
        out.overbet = 1.45;
        out.thinValue = 1.12;
        out.bluff = 1.05;
      } else if (stackBB <= 40 || spr < 4) {
        out.bluff = 0.72;
        out.overbet = 0.55;
        out.jamBias = 1.35;
        out.raise = 1.1;
        out.xr = 0.75;
      } else {
        out.overbet = 1.1;
        out.xr = 1.1;
      }
    } else if (hub === 'spin') {
      out.sizeSimple = true;
      out.overbet = 0.25;
      if (phase === 'push' || stackBB <= 12) {
        out.bluff = 0.45;
        out.overbet = 0.05;
        out.xr = 0.35;
        out.jamBias = 1.55;
        out.bet = 1.15;
        out.sizeSimple = true;
      } else if (phase === 'mid' || stackBB <= 20) {
        out.cbet = 1.2;
        out.bluff = 0.85;
        out.overbet = 0.15;
        out.xr = 0.55;
        out.jamBias = 1.25;
      } else {
        out.cbet = 1.25;
        out.bet = 1.12;
        out.overbet = 0.2;
        out.xr = 0.65;
      }
    } else {
      // MTT
      if (phase === 'bubble' || situ === 'bubble') {
        out.bluff = 0.55;
        out.xr = 0.45;
        out.overbet = 0.35;
        out.fold = 1.22;
        out.thinValue = 0.7;
        out.jamBias = 1.15;
      } else if (phase === 'push' || phase === 'short') {
        out.bluff = 0.62;
        out.overbet = 0.3;
        out.xr = 0.5;
        out.jamBias = 1.4;
        out.sizeSimple = true;
      } else if (situ === 'mincash' || situ === 'ft9') {
        out.bluff = 0.72;
        out.thinValue = 0.78;
        out.overbet = 0.85;
        out.fold = 1.08;
      } else if (phase === 'early' || phase === 'mid') {
        out.xr = 1.15;
        out.overbet = 1.05;
        out.thinValue = 1.05;
      }
      if (icm && phase !== 'early') {
        out.bluff = clamp(out.bluff * 0.88, 0.35, 1.2);
        out.fold = clamp(out.fold * 1.06, 1, 1.35);
      }
    }

    if (spr < 3) {
      out.jamBias = clamp(out.jamBias * 1.2, 1, 1.8);
      out.overbet = clamp(out.overbet * 0.5, 0.05, 1);
      out.sizeSimple = true;
    }

    return out;
  }

  /** Ajusta un mapa de frecuencias (fold/call/raise o check/bet_*). */
  function applyToFreqs(freqs, ctx, kind) {
    const m = multipliers(ctx);
    const out = Object.assign({}, freqs || {});
    kind = kind || 'auto';
    const facing = kind === 'facing' || (out.fold != null || out.call != null);

    if (facing) {
      if (out.raise != null) out.raise *= m.raise * (kind === 'xr' ? m.xr : 1);
      if (out.fold != null) out.fold *= m.fold;
      if (out.call != null && m.thinValue < 1 && (ctx.street === 'river')) {
        // Menos thin calls en ICM / near-money: empuja un poco a fold
        const shift = (1 - m.thinValue) * 0.12 * (out.call || 0);
        out.call = Math.max(0, (out.call || 0) - shift);
        out.fold = (out.fold || 0) + shift;
      }
      // Bluff-raises: si strength/band air, reducir raise
      if (ctx.band === 'air' || ctx.band === 'bluffcatch' || (ctx.strength != null && ctx.strength < 0.4)) {
        out.raise = (out.raise || 0) * m.bluff * (m.xr < 1 ? m.xr : 1);
      }
    } else {
      const betKeys = ['bet_33', 'bet_66', 'bet_100', 'bet_125', 'overbet', 'bet'];
      let betSum = 0;
      betKeys.forEach(function (k) { betSum += out[k] || 0; });
      const check = out.check != null ? out.check : Math.max(0, 1 - betSum);
      let scale = m.bet;
      if (ctx.band === 'air' || ctx.band === 'bluffcatch' || (ctx.strength != null && ctx.strength < 0.38)) {
        scale *= m.bluff;
      }
      if (ctx.initiative === 'aggressor') scale *= m.cbet;
      betKeys.forEach(function (k) {
        if (out[k] != null) out[k] *= scale;
      });
      if (out.overbet != null) out.overbet *= m.overbet;
      if (out.bet_125 != null) out.bet_125 *= m.overbet;
      if (m.sizeSimple) {
        // Colapsa a 50–75%: mueve peso de 33/100/overbet hacia 66
        const o33 = out.bet_33 || 0;
        const o100 = out.bet_100 || 0;
        const oOver = (out.overbet || 0) + (out.bet_125 || 0);
        out.bet_33 = o33 * 0.35;
        out.bet_100 = o100 * 0.45;
        out.overbet = (out.overbet || 0) * 0.15;
        out.bet_125 = (out.bet_125 || 0) * 0.15;
        out.bet_66 = (out.bet_66 || 0) + o33 * 0.65 + o100 * 0.55 + oOver * 0.7;
      }
      out.check = check + Math.max(0, betSum * (1 - scale));
    }

    // Renormaliza
    let sum = 0;
    Object.keys(out).forEach(function (k) { sum += Math.max(0, out[k] || 0); });
    if (sum <= 0) return freqs || out;
    Object.keys(out).forEach(function (k) { out[k] = Math.max(0, out[k] || 0) / sum; });
    return out;
  }

  global.GTOVillainFormatAdjust = {
    hubOf: hubOf,
    phaseOf: phaseOf,
    usesIcm: usesIcm,
    multipliers: multipliers,
    applyToFreqs: applyToFreqs
  };
})(typeof window !== 'undefined' ? window : global);
