/*
 * preflopSolver.js — Mezclas preflop continuas por fuerza de mano (Fase 2).
 * Refina tablas estáticas con frecuencias solver-like en manos frontera.
 */
(function (global) {
  'use strict';

  const HS = global.GTOHandStrength;
  const N = global.GTORangesNotation;

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function normalize(freqs) {
    let sum = 0;
    for (const k in freqs) sum += freqs[k] || 0;
    if (sum <= 0) return freqs;
    const out = {};
    for (const k in freqs) out[k] = (freqs[k] || 0) / sum;
    return out;
  }

  /** Suaviza manos mix con strength 0..1 hacia fold/raise o fold/call. */
  function refineMixStrategy(base, code, mode) {
    if (!HS || !base) return base;
    const s = HS.handStrength01(code);
    const out = Object.assign({}, base);

    if (mode === 'rfi_mix') {
      const raiseFreq = clamp(0.15 + (s - 0.52) * 2.8, 0.08, 0.92);
      out.fold = 1 - raiseFreq;
      out.raise = raiseFreq;
      return normalize(out);
    }

    if (mode === 'call_mix') {
      const callFreq = clamp(0.22 + (s - 0.48) * 2.2, 0.12, 0.78);
      out.fold = 1 - callFreq;
      out.call = callFreq;
      out.raise = 0;
      return normalize(out);
    }

    if (mode === 'threebet_mix') {
      const hasCall = (out.call || 0) > 0;
      if (hasCall) {
        const raiseFreq = clamp(0.25 + (s - 0.58) * 2.5, 0.15, 0.85);
        out.raise = raiseFreq;
        out.call = 1 - raiseFreq;
        out.fold = 0;
      } else {
        const raiseFreq = clamp(0.20 + (s - 0.55) * 2.4, 0.10, 0.88);
        out.raise = raiseFreq;
        out.fold = 1 - raiseFreq;
      }
      return normalize(out);
    }

    if (mode === 'squeeze' || mode === 'iso') {
      const raiseFreq = clamp(0.05 + (s - 0.40) * 1.8, 0.02, 0.95);
      if (out.raise != null) {
        out.raise = raiseFreq;
        out.fold = clamp(1 - raiseFreq - (out.call || 0), 0, 0.95);
      }
      return normalize(out);
    }

    return base;
  }

  /**
   * Refina estrategia preflop según tipo de spot y si la mano está en zona mix.
   */
  function enhancePreflopStrategy(base, code, spotKind, tableCtx) {
    tableCtx = tableCtx || {};
    if (!base || !code) return base;

    if (spotKind === 'RFI' && tableCtx.inMix) {
      return refineMixStrategy(base, code, 'rfi_mix');
    }

    if (spotKind === 'vsRFI') {
      if (tableCtx.inThreeBetMix) return refineMixStrategy(base, code, 'threebet_mix');
      if (tableCtx.inCallMix) return refineMixStrategy(base, code, 'call_mix');
    }

    if (spotKind === 'squeeze') return refineMixStrategy(base, code, 'squeeze');
    if (spotKind === 'isoLimp' || spotKind === 'vsLimp') return refineMixStrategy(base, code, 'iso');

    return base;
  }

  function tableContext(spotKind, code, data, key) {
    const ctx = { inMix: false, inThreeBetMix: false, inCallMix: false };
    if (!N || !data) return ctx;

    if (spotKind === 'RFI' && data.mix) {
      ctx.inMix = N.toSet(data.mix).has(code);
    }
    if (spotKind === 'vsRFI') {
      const row = data[key] || data;
      if (row.threeBetMix) ctx.inThreeBetMix = N.toSet(row.threeBetMix).has(code);
      if (row.callMix) ctx.inCallMix = N.toSet(row.callMix).has(code);
    }
    return ctx;
  }

  global.GTOPreflopSolver = { enhancePreflopStrategy, refineMixStrategy, tableContext };
})(window);
