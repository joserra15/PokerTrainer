/*
 * villain-assist-complexity.js — Vetoes, impacto pot/stack, rawScore × fase × nivel.
 * Decide si un spot de villano merece asistente IA (sin llamar a la red).
 */
(function (global) {
  'use strict';

  var LEVELS = {
    low: { id: 'low', threshold: 0.80, capPerHand: 1, capPerTournament: 20 },
    medium: { id: 'medium', threshold: 0.64, capPerHand: 2, capPerTournament: 40 },
    high: { id: 'high', threshold: 0.50, capPerHand: 2, capPerTournament: 60 }
  };

  var PHASE_MULT = {
    early: 0.55,
    mid: 0.75,
    late: 0.90,
    short: 0.90,
    push: 0.90,
    bubble: 1.20,
    mincash: 1.20,
    ft: 1.25,
    ft9: 1.25,
    hu: 1.25,
    spin: 1.05,
    auto: 0.75
  };

  var PRO_PRESETS = { mttPro: 1, sngPro: 1, spinPro: 1, huPro: 1 };

  function clamp01(x) {
    return Math.max(0, Math.min(1, Number(x) || 0));
  }

  function normalizeLevel(v) {
    var s = String(v || 'medium').toLowerCase();
    if (s === 'low' || s === 'baja') return 'low';
    if (s === 'high' || s === 'alta') return 'high';
    return 'medium';
  }

  function levelConfig(level) {
    return LEVELS[normalizeLevel(level)] || LEVELS.medium;
  }

  function isProPreset(id) {
    return !!PRO_PRESETS[String(id || '')];
  }

  function resolvePhase(ctx) {
    ctx = ctx || {};
    var p = String(ctx.effectivePhase || ctx.resolvedPhase || ctx.mttPhase || '').toLowerCase();
    var situ = String(ctx.mttStructureSituation || '').toLowerCase();
    if (situ === 'hu' || p === 'hu') return 'hu';
    if (situ === 'bubble' || p === 'bubble') return 'bubble';
    if (situ === 'ft9' || situ === 'ft' || p === 'ft' || p === 'ft9') return situ === 'ft9' ? 'ft9' : 'ft';
    if (situ === 'mincash' || p === 'mincash') return 'mincash';
    if (p === 'early' || p === 'mid' || p === 'late' || p === 'short' || p === 'push') return p;
    if (ctx.formatHub === 'spin' && p !== 'hu') return 'spin';
    return p || 'mid';
  }

  function phaseMult(phase) {
    var p = String(phase || 'mid').toLowerCase();
    return PHASE_MULT[p] != null ? PHASE_MULT[p] : 0.75;
  }

  function sortedFreqEntries(freqs) {
    var out = [];
    if (!freqs || typeof freqs !== 'object') return out;
    Object.keys(freqs).forEach(function (k) {
      if (!k || k.charAt(0) === '_') return;
      var v = Number(freqs[k]) || 0;
      if (v > 0) out.push({ id: k, f: v });
    });
    out.sort(function (a, b) { return b.f - a.f; });
    return out;
  }

  function topFreq(freqs) {
    var e = sortedFreqEntries(freqs);
    return e.length ? e[0] : null;
  }

  function mixEntropy01(freqs) {
    var e = sortedFreqEntries(freqs);
    if (!e.length) return 0.5;
    if (e.length === 1 || e[0].f >= 0.82) return 0.05;
    var gap = e.length > 1 ? (e[0].f - e[1].f) : 1;
    if (e[0].f >= 0.75 && gap >= 0.45) return 0.08;
    if (gap < 0.12) return 0.95;
    if (gap < 0.18) return 0.8;
    if (gap < 0.28) return 0.55;
    return 0.25;
  }

  function handCodeOf(seat, hand) {
    var D = global.PTTournamentVillainDecide;
    if (D && typeof D.handCode === 'function') {
      try { return D.handCode(seat && seat.cards); } catch (e) { /* */ }
    }
    return null;
  }

  function isPremiumTrivialPreflop(code, local) {
    var c = String(code || '').toUpperCase();
    if (c !== 'AA' && c !== 'KK' && c !== 'QQ') return false;
    var top = topFreq(local && local.freqs);
    var act = String((local && local.action && local.action.id) || (top && top.id) || '').toLowerCase();
    if (act === 'fold') return false;
    if (act === 'raise' || act === 'bet' || act === 'allin' || act === 'call') {
      if (top && top.f >= 0.70) return true;
      if (!top) return true;
    }
    return c === 'AA' || c === 'KK';
  }

  /**
   * Hard vetoes: spots claros donde no se debe consultar (ni caché ni Gemini).
   * @returns {{ veto: boolean, reason: string|null }}
   */
  function hardVeto(ctx, local, seat, hand) {
    ctx = ctx || {};
    local = local || {};
    var options = ctx.legalOptions || local.legalOptions;
    if (options && options.length === 1) {
      return { veto: true, reason: 'veto_single_option' };
    }

    var freqs = local.freqs || ctx.freqs;
    var top = topFreq(freqs);
    if (top) {
      var entries = sortedFreqEntries(freqs);
      var gap = entries.length > 1 ? (entries[0].f - entries[1].f) : 1;
      if (top.f >= 0.82) return { veto: true, reason: 'veto_motor_seguro' };
      if (top.f >= 0.75 && gap >= 0.45) return { veto: true, reason: 'veto_motor_seguro' };
    }

    var street = String(ctx.street || (hand && hand.street) || '').toLowerCase();
    if (street === 'preflop') {
      var code = handCodeOf(seat, hand);
      if (isPremiumTrivialPreflop(code, local)) {
        return { veto: true, reason: 'veto_premium_preflop' };
      }
      var strict = Number(ctx.preflopStrict != null ? ctx.preflopStrict
        : (local.profile && local.profile.preflopStrict)) || 0;
      if (strict >= 0.92 && top && top.f >= 0.70 && mixEntropy01(freqs) < 0.35) {
        var icm = Number(ctx.icmPressure) || 0;
        if (icm < 0.65) return { veto: true, reason: 'veto_preflop_chart' };
      }
    }

    var band = String(ctx.handBand || local.handBand || '').toLowerCase();
    if (band === 'nuts' && top && (top.id === 'raise' || top.id === 'bet' || top.id === 'call' || top.id === 'allin')
      && top.f >= 0.80) {
      return { veto: true, reason: 'veto_nuts' };
    }
    if ((band === 'air' || band === 'weak') && top && top.id === 'fold' && top.f >= 0.85) {
      return { veto: true, reason: 'veto_air_fold' };
    }

    return { veto: false, reason: null };
  }

  /**
   * Impacto pot vs stack. 0 = hard skip (ni en HU).
   */
  function impactMult(ctx) {
    ctx = ctx || {};
    var potBB = Math.max(0.01, Number(ctx.potBB) || 0);
    var stackBB = Math.max(0.01, Number(ctx.villainStackBB != null ? ctx.villainStackBB : ctx.stackBB) || 1);
    var eff = Math.max(0.01, Number(ctx.effStackBB != null ? ctx.effStackBB : stackBB) || stackBB);
    var potFrac = potBB / Math.max(stackBB, eff);
    var spr = eff / Math.max(potBB, 0.5);
    var committed = Number(ctx.committedFrac);
    if (!isFinite(committed)) committed = 0;
    var facingJam = !!ctx.facingJam;
    var toCallBB = Number(ctx.toCallBB) || 0;
    if (toCallBB >= eff * 0.85) facingJam = true;

    if (committed >= 0.35 || facingJam) {
      return 1.1;
    }
    if (potFrac < 0.08 && spr > 12) return 0;
    if (potFrac < 0.15 || spr > 8) {
      return potFrac < 0.10 ? 0.35 : 0.5;
    }
    if (potFrac >= 0.30 || spr <= 4) return potFrac >= 0.45 || spr <= 2.5 ? 1.15 : 1.0;
    return 0.8;
  }

  function handBandAmbiguity(band) {
    var b = String(band || '').toLowerCase();
    if (b === 'merge' || b === 'bluffcatch') return 0.9;
    if (b === 'draw' || b === 'semi') return 0.75;
    if (b === 'value') return 0.35;
    if (b === 'nuts') return 0.1;
    if (b === 'air') return 0.2;
    return 0.45;
  }

  function lineComplexity01(ctx) {
    ctx = ctx || {};
    var n = 0;
    if (ctx.threeBetPot || ctx.potType === '3bet') n += 0.35;
    if (ctx.lineIntent === 'checkRaise' || ctx.didCheckRaise) n += 0.25;
    if (ctx.leadType === 'donk' || ctx.leadType === 'delayed_cbet') n += 0.2;
    if (ctx.playersInPot >= 3 || ctx.multiway) n += 0.25;
    if (ctx.facingSizeBucket === 'over' || ctx.facingSizeBucket === 'jam') n += 0.15;
    return clamp01(n);
  }

  function icmPressure01(ctx) {
    ctx = ctx || {};
    if (ctx.icmPressure != null && isFinite(Number(ctx.icmPressure))) {
      return clamp01(ctx.icmPressure);
    }
    var phase = resolvePhase(ctx);
    if (phase === 'bubble' || phase === 'mincash') return 0.85;
    if (phase === 'ft' || phase === 'ft9') return 0.8;
    if (phase === 'hu') return 0.55;
    if (phase === 'late' || phase === 'short' || phase === 'push') return 0.45;
    if (phase === 'early') return 0.15;
    return 0.3;
  }

  function streetPressure01(street) {
    var s = String(street || '').toLowerCase();
    if (s === 'river') return 1;
    if (s === 'turn') return 0.7;
    if (s === 'flop') return 0.45;
    return 0.25;
  }

  function rawScore(ctx, local) {
    ctx = ctx || {};
    local = local || {};
    var freqs = local.freqs || ctx.freqs;
    var band = ctx.handBand || local.handBand;
    return clamp01(
      0.40 * mixEntropy01(freqs) +
      0.20 * handBandAmbiguity(band) +
      0.15 * lineComplexity01(ctx) +
      0.15 * icmPressure01(ctx) +
      0.10 * streetPressure01(ctx.street || (local && local.street))
    );
  }

  /**
   * Evaluación completa: ¿debe activarse el camino assist?
   */
  function evaluate(ctx, local, seat, hand, level) {
    var lvl = levelConfig(level);
    var veto = hardVeto(ctx, local, seat, hand);
    if (veto.veto) {
      return {
        shouldAssist: false,
        score: 0,
        reason: veto.reason,
        impact: 0,
        phase: resolvePhase(ctx),
        threshold: lvl.threshold,
        level: lvl.id
      };
    }
    var impact = impactMult(ctx);
    if (impact <= 0) {
      return {
        shouldAssist: false,
        score: 0,
        reason: 'low_impact',
        impact: 0,
        phase: resolvePhase(ctx),
        threshold: lvl.threshold,
        level: lvl.id
      };
    }
    var phase = resolvePhase(ctx);
    var raw = rawScore(ctx, local);
    var score = clamp01(raw * impact * phaseMult(phase));
    var should = score >= lvl.threshold;
    return {
      shouldAssist: should,
      score: score,
      raw: raw,
      impact: impact,
      phase: phase,
      phaseMult: phaseMult(phase),
      reason: should ? 'pass' : 'below_threshold',
      threshold: lvl.threshold,
      level: lvl.id
    };
  }

  global.PTVillainAssistComplexity = {
    LEVELS: LEVELS,
    PRO_PRESETS: PRO_PRESETS,
    normalizeLevel: normalizeLevel,
    levelConfig: levelConfig,
    isProPreset: isProPreset,
    resolvePhase: resolvePhase,
    phaseMult: phaseMult,
    hardVeto: hardVeto,
    impactMult: impactMult,
    rawScore: rawScore,
    mixEntropy01: mixEntropy01,
    evaluate: evaluate,
    clamp01: clamp01
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
