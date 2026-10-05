/*
 * villainPreflop.js — Decisiones preflop del villano ancladas a rangos GTO.
 * El perfil modula frecuencias dentro del rango; fuera del rango solo leaks en fish/intermedio.
 */
(function (global) {
  'use strict';

  const D = global.GTORangesData;
  const W = global.GTORangesWeights;
  const VP = global.GTOVillainProfiles;

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function handWeight(weights, code) {
    if (!code || !weights) return 0;
    return W.weightOf(weights, code);
  }

  /** Off-chart / polar 3bet: Ax suited, broadways, SC fuertes — no Q2o. */
  function speculativeThreeBetOk(code) {
    if (!code || code.length < 2) return false;
    if (code.length === 2) {
      /* Pares medios+ fuera de chart 3bet puro a veces. */
      const ranks = '23456789TJQKA';
      return ranks.indexOf(code[0]) >= ranks.indexOf('8');
    }
    const ranks = '23456789TJQKA';
    const hi = code[0];
    const lo = code[1];
    const suited = code[2] === 's';
    const ri = ranks.indexOf(hi);
    const rj = ranks.indexOf(lo);
    if (ri < 0 || rj < 0) return false;
    if (hi === 'A' && (suited || rj >= ranks.indexOf('T'))) return true;
    if (suited && hi === 'A') return true;
    if (!suited && ri >= ranks.indexOf('K') && rj >= ranks.indexOf('T')) return true;
    if (!suited && ri >= ranks.indexOf('Q') && rj >= ranks.indexOf('J')) return true;
    if (suited && ri >= ranks.indexOf('T') && (ri - rj) <= 2) return true;
    if (suited && ri >= ranks.indexOf('J') && rj >= ranks.indexOf('9')) return true;
    return false;
  }

  /** Off-chart BB/SB defend: Ax, suited decentes, broadway — no basura tipo Q2o. */
  function speculativeDefendOk(code) {
    if (!code || code.length < 2) return false;
    if (code.length === 2) return true;
    const ranks = '23456789TJQKA';
    const hi = code[0];
    const lo = code[1];
    const suited = code[2] === 's';
    const ri = ranks.indexOf(hi);
    const rj = ranks.indexOf(lo);
    if (ri < 0 || rj < 0) return false;
    if (hi === 'A') return true;
    if (suited && ri >= ranks.indexOf('7')) return true;
    if (!suited && ri >= ranks.indexOf('K') && rj >= ranks.indexOf('9')) return true;
    if (!suited && ri >= ranks.indexOf('Q') && rj >= ranks.indexOf('T')) return true;
    if (!suited && ri >= ranks.indexOf('J') && rj >= ranks.indexOf('T')) return true;
    if (suited && (ri - rj) <= 2 && ri >= ranks.indexOf('5')) return true;
    return false;
  }

  function bucketWeights(sets) {
    return W.fromSets(sets || {});
  }

  function vsRfiKey(defender, opener) {
    return defender + '_vs_' + opener;
  }

  function defendBuckets(defender, opener, ctx) {
    const RR = global.GTORangesRegistry;
    const data = RR && ctx
      ? RR.getVsRfiRow(defender, opener, ctx)
      : D.VS_RFI[vsRfiKey(defender, opener)];
    if (!data) return null;
    return {
      threeBet: bucketWeights({ threeBet: data.threeBet, threeBetMix: data.threeBetMix }),
      call: bucketWeights({ call: data.call, callMix: data.callMix })
    };
  }

  function vs3betBuckets(ctx) {
    const RR = global.GTORangesRegistry;
    const data = RR && ctx ? RR.getVs3bet(ctx) : D.VS_3BET;
    return {
      fourBet: bucketWeights({ fourBet: data.fourBet }),
      call: bucketWeights({ call: data.call, callMix: data.callMix })
    };
  }

  function vs4betBuckets() {
    const data = D.VS_4BET;
    return {
      fourBet: bucketWeights({ fourBet: data.fourBet }),
      call: bucketWeights({ call: data.call, callMix: data.callMix })
    };
  }

  function allInCallBuckets() {
    return bucketWeights({ call: 'QQ+, AKs, AKo, JJ', callMix: 'TT, AQs' });
  }

  function strictness(profile) {
    if (!profile) return 0;
    if (profile.preflopStrict != null) return profile.preflopStrict;
    const lvl = profile.difficultyLevel || 'fish';
    if (lvl === 'pro') return 1;
    if (lvl === 'intermediate') return 0.88;
    return 0;
  }

  function allowsLeak(profile, action, rnd) {
    const s = strictness(profile);
    if (s >= 0.99) return false;
    // Fish / hiper-agresivo: no 3-bet/4-bet fuera de rango con basura.
    if ((action === '3bet' || action === '4bet') && profile && (profile.id === 'fish' || profile.id === 'maniac')) {
      return false;
    }
    const leak = profile.leakRate != null ? profile.leakRate : (s >= 0.75 ? 0.025 : 0.09);
    const r = rnd != null ? rnd : Math.random();
    if (action === '3bet' || action === '4bet') return r < leak * 0.3;
    if (action === 'call') return r < leak;
    return false;
  }

  function gtoMixAction(r, wAgg, wPass, passAction) {
    if (wAgg >= 1) return r < 0.94 ? 'aggress' : 'pass';
    if (wAgg > 0) {
      if (r < wAgg) return 'aggress';
      if (wPass > 0 && r < wAgg + (1 - wAgg) * Math.min(wPass, 1)) return 'pass';
      return 'fold';
    }
    if (wPass >= 1) return r < 0.9 ? 'pass' : 'fold';
    if (wPass >= 0.42) return r < Math.min(0.55, 0.25 + wPass * 0.35) ? 'pass' : 'fold';
    return 'fold';
  }

  function isInFourBetRange(code, ctx) {
    if (!code) return false;
    const wf = handWeight(vs3betBuckets(ctx).fourBet, code);
    return wf > 0;
  }

  function isInThreeBetRange(code, defender, opener, ctx) {
    if (!code) return false;
    const buckets = defendBuckets(defender, opener, ctx);
    if (!buckets) return false;
    return handWeight(buckets.threeBet, code) > 0;
  }

  function openBuckets(openerPos, ctx) {
    const RR = global.GTORangesRegistry;
    const data = RR && ctx
      ? RR.getOpenRaiseRow(openerPos, ctx)
      : (D.OPEN_RAISE && D.OPEN_RAISE[openerPos]);
    if (!data) return null;
    return bucketWeights({ raise: data.raise, mix: data.mix });
  }

  function isInOpenRange(code, openerPos, ctx) {
    if (!code) return false;
    const buckets = openBuckets(openerPos, ctx);
    return buckets ? handWeight(buckets, code) > 0 : false;
  }

  /**
   * Open consciente de perfil (shared torneo + entrenador).
   * Chart base + widen/skip por arquetipo.
   * @param {number} [holeStr01] fuerza holística 0–1 para widen fuera de chart
   */
  function shouldOpen(code, openerPos, ctx, profile, holeStr01, rnd) {
    const r = rnd != null ? rnd : Math.random();
    const inChart = isInOpenRange(code, openerPos, ctx);
    const style = (VP.openStyle && VP.openStyle(profile)) || { widenThr: null, skipChance: 0 };
    if (inChart) {
      if (style.skipChance > 0 && r < style.skipChance) return false;
      return true;
    }
    if (style.widenThr == null) return false;
    const hs = holeStr01 != null ? Number(holeStr01) : 0;
    if (!(hs > style.widenThr)) return false;
    /* Late positions widen más; early más selectivo. */
    const late = openerPos === 'BTN' || openerPos === 'CO' || openerPos === 'SB';
    const thr = late ? style.widenThr : style.widenThr + 0.08;
    return hs > thr;
  }

  function isoDefendBuckets() {
    const data = D.ISO_LIMP;
    if (!data) return null;
    return {
      call: bucketWeights({ call: data.raise + ', ' + data.callMix }),
      fold: bucketWeights({ fold: data.fold })
    };
  }

  function isInLimpRange(code) {
    if (!code || !D.LIMP_RANGE) return false;
    return handWeight(bucketWeights({ call: D.LIMP_RANGE }), code) > 0;
  }

  function isInIsoDefendRange(code) {
    if (!code) return false;
    const buckets = isoDefendBuckets();
    if (!buckets) return false;
    return handWeight(buckets.call, code) > 0;
  }

  function squeezeContinueBuckets() {
    const data = D.SQUEEZE;
    if (!data) return null;
    return bucketWeights({
      call: data.raise + ', ' + data.call + (data.callMix ? ', ' + data.callMix : '')
    });
  }

  function isInSqueezeContinueRange(code) {
    if (!code) return false;
    const buckets = squeezeContinueBuckets();
    return buckets ? handWeight(buckets, code) > 0 : false;
  }

  function isInDefendRange(code, defender, opener, ctx) {
    if (!code) return false;
    const buckets = defendBuckets(defender, opener, ctx);
    if (!buckets) return false;
    return handWeight(buckets.threeBet, code) > 0 || handWeight(buckets.call, code) > 0;
  }

  function isExplicitHu(ctx) {
    const VP = global.GTOVillainProfiles;
    if (VP && typeof VP.shouldApplyHuAdjust === 'function' && VP.shouldApplyHuAdjust(ctx || {})) return true;
    const c = ctx || {};
    return c.mttPhase === 'hu' || c.kind === 'hu' || c.tournamentKind === 'hu'
      || c.mttStructureSituation === 'hu';
  }

  /** En HU explícito: menos fold / más 3bet-call (chip-EV). 0..~0.2 */
  function huAggressionBias(ctx) {
    if (!isExplicitHu(ctx)) return 0;
    const stack = Number(ctx.stackBB) || 25;
    if (stack <= 14) return 0.12;
    if (stack <= 25) return 0.16;
    return 0.14;
  }

  function tournamentFoldBias(ctx) {
    if (!ctx || !ctx.isTournament) return 0;
    // Heads Up WTA / fase hu: sin overfold ICM.
    if (isExplicitHu(ctx)) return 0;
    const Tax = global.PTFormatTaxonomy;
    if (Tax && Tax.isHeadsUpWta && Tax.isHeadsUpWta(ctx)) return 0;

    // Preferir risk premium propio (asimetría cubre/cubierto).
    if (ctx.ownRiskPremium != null && Number(ctx.ownRiskPremium) > 0) {
      let bias = clamp(Number(ctx.ownRiskPremium) * 1.15, 0, 0.28);
      const role = ctx.stackRole || '';
      // Short overfoldea menos que mid en burbuja.
      if (role === 'short') bias *= 0.7;
      else if (role === 'cover' || ctx.coversOpponent || ctx.coversHero) bias *= 0.35;
      else if (role === 'mid') bias *= 1.1;
      const t = String(ctx.tournamentType || '').toLowerCase();
      if (bias > 0 && (t === 'pko' || t === 'mystery')) bias *= 0.55;
      return bias;
    }

    const phase = ctx.effectivePhase || ctx.resolvedPhase || ctx.mttPhase;
    let bias = 0;
    if (phase === 'bubble') bias = 0.18;
    else if (phase === 'ft') bias = 0.14;
    else if (phase === 'push') bias = 0.14;
    else if (phase === 'short') bias = 0.08;
    else if (phase === 'itm') bias = 0.05;
    else {
      if (Tax && Tax.usesIcm && Tax.usesIcm(ctx)) bias = 0.1;
    }
    const role = ctx.stackRole || '';
    if (role === 'cover' || ctx.coversOpponent || ctx.coversHero) bias *= 0.4;
    else if (role === 'short') bias *= 0.75;
    else if (role === 'mid') bias *= 1.1;
    // PKO / mystery: menos overfold (bounty incentive); sin EV bounty real.
    const t = String(ctx.tournamentType || '').toLowerCase();
    if (bias > 0 && (t === 'pko' || t === 'mystery')) bias *= 0.55;
    return bias;
  }

  /**
   * Bias de presión/steal cuando el rival tiene risk premium alto (está cubierto).
   * 0..~0.22 — se suma a 3bet / reduce fold en defensa agresiva.
   */
  function tournamentStealBias(ctx) {
    if (!ctx || !ctx.isTournament) return 0;
    if (isExplicitHu(ctx)) return 0;
    const Tax = global.PTFormatTaxonomy;
    if (Tax && Tax.isHeadsUpWta && Tax.isHeadsUpWta(ctx)) return 0;

    if (ctx.opponentRiskPremium != null && Number(ctx.opponentRiskPremium) > 0) {
      let bias = clamp(Number(ctx.opponentRiskPremium) * 1.05, 0, 0.22);
      if (ctx.stackRole === 'cover' || ctx.coversOpponent || ctx.coversHero) bias *= 1.15;
      if (ctx.stackRole === 'mid' || ctx.coveredByOpponent || ctx.coveredByHero) bias *= 0.45;
      return bias;
    }

    const phase = ctx.effectivePhase || ctx.resolvedPhase || ctx.mttPhase;
    if (phase !== 'bubble' && phase !== 'ft' && phase !== 'itm' && phase !== 'push') return 0;
    if (ctx.stackRole === 'cover' || ctx.coversOpponent || ctx.coversHero) return 0.12;
    if (ctx.stackRole === 'short') return 0.04;
    return 0;
  }

  /** Defensa BB/SB frente a open del héroe (fold / call / 3bet). */
  function defendVsOpen(code, profile, rnd, defenderPos, openerPos, ctx) {
    const r = rnd != null ? rnd : Math.random();
    const buckets = defendBuckets(defenderPos, openerPos, ctx);
    if (!buckets) return 'fold';

    let w3 = handWeight(buckets.threeBet, code);
    let wc = handWeight(buckets.call, code);
    const strict = strictness(profile);
    const icmBias = tournamentFoldBias(ctx);
    const stealBias = tournamentStealBias(ctx);
    const huAgg = huAggressionBias(ctx) + stealBias;
    const pf = (profile && profile.preflop) || {};
    const callBias = Number(pf.callBias) || 0;
    const threeBias = Number(pf.threeBetBias) || 0;
    const foldBias = Number(pf.foldBias) || 0;

    /* Identidad de arquetipo: ensancha/aprieta pesos de chart. */
    if (callBias > 0 && wc > 0) wc = Math.min(1, wc + callBias * 1.35);
    if (threeBias > 0 && w3 > 0) w3 = Math.min(1, w3 + threeBias * 1.45);
    if (threeBias > 0.04 && wc >= 0.28 && w3 < 0.35) {
      /* Presión: parte del calling range pasa a 3bet polar/light. */
      w3 = Math.max(w3, threeBias * 1.25 + stealBias * 0.55);
    }
    /* Pro: manos especulativas fuertes → peso 3bet aunque chart diga fold/call mix bajo. */
    if ((profile && profile.id === 'pro') && threeBias > 0.08 && speculativeThreeBetOk(code)
      && w3 < 0.55) {
      w3 = Math.max(w3, 0.38 + threeBias * 0.9 + stealBias * 0.4);
    }
    if (foldBias > 0.05 && wc > 0) wc = Math.max(0, wc - foldBias * 0.8);
    if (foldBias > 0.05 && w3 > 0) w3 = Math.max(0, w3 - foldBias * 0.35);
    /* BB: bump extra al calling range in-chart (MDF). */
    if (defenderPos === 'BB' && callBias >= 0 && wc > 0) {
      wc = Math.min(1, wc + 0.12 + callBias * 0.8);
    }
    if (defenderPos === 'BB' && callBias > 0.02 && w3 <= 0 && wc <= 0
      && speculativeDefendOk(code)) {
      /* ≥0.42 para entrar en la rama call (no caer al fold final). */
      wc = Math.min(0.9, 0.48 + callBias * 2.2);
    }

    if (w3 <= 0 && wc <= 0) {
      if (allowsLeak(profile, '3bet', r)) return '3bet';
      /* Fish/LAG/pro: defensa especulativa fuera de chart (no solo leakRate). */
      const offChartCall = Math.max(0, callBias * 1.55 - foldBias * 0.6 + huAgg * 0.25);
      const offChart3 = Math.max(0, threeBias * 1.05 + huAgg * 0.25 - foldBias * 0.35);
      /* BB: más defend (MDF). SB un poco menos que BB. */
      const blindDef = defenderPos === 'BB' ? 2.45 : (defenderPos === 'SB' ? 1.4 : 1);
      /* Pro/TAG/Nit: no callar basura off-chart (Q2o). Fish/LAG/maniac sí pueden. */
      const pid = profile && profile.id;
      const gateTrash = pid === 'pro' || pid === 'tag' || pid === 'nit';
      const okSpec = !gateTrash || speculativeDefendOk(code);
      const ok3 = !gateTrash || speculativeThreeBetOk(code);
      if (offChart3 * blindDef > 0.04 && ok3 && r < offChart3 * blindDef) return '3bet';
      if (offChartCall * blindDef > 0.04 && okSpec && r < (offChartCall + offChart3) * blindDef) return 'call';
      if ((!icmBias || huAgg > 0) && allowsLeak(profile, 'call', r) && okSpec) return 'call';
      return 'fold';
    }

    if (strict >= 0.99) {
      const w3Hu = Math.min(1, w3 + huAgg * 0.35);
      const act = gtoMixAction(r, w3Hu, wc * Math.max(0, 1 - icmBias + huAgg * 0.5), 'call');
      if (act === 'aggress') return '3bet';
      if (act === 'pass') return 'call';
      return 'fold';
    }

    if (w3 >= 1) {
      if (r < VP.adjustThreeBetProb((strict >= 0.75 ? 0.85 : 0.72) + huAgg * 0.22, profile)) return '3bet';
      if (wc > 0 && r < VP.adjustCallProb(0.82 - icmBias + huAgg * 0.15, profile)) return 'call';
      return 'fold';
    }
    if (w3 >= 0.5) {
      const freq = strict >= 0.75
        ? Math.min(1, w3 + huAgg * 0.28 + threeBias * 0.35)
        : VP.adjustThreeBetProb(0.45 + huAgg * 0.22, profile);
      if (r < freq) return '3bet';
      if (wc > 0 && r < VP.adjustCallProb(0.58 - icmBias + huAgg * 0.2, profile)) return 'call';
      return 'fold';
    }
    if (w3 > 0) {
      const f3 = strict >= 0.75
        ? Math.min(1, w3 + huAgg * 0.22 + threeBias * 0.4)
        : VP.adjustThreeBetProb(w3 * 0.7 + huAgg * 0.18, profile);
      if (r < f3) return '3bet';
      if (wc > 0 && r < VP.adjustCallProb(0.42 - icmBias + huAgg * 0.2, profile)) return 'call';
      return 'fold';
    }
    if (wc >= 1) return r < VP.adjustFoldProb(Math.max(0.05, 0.12 + icmBias - huAgg * 0.5 - callBias * 0.3), profile) ? 'fold' : 'call';
    if (wc >= 0.42) return r < VP.adjustCallProb(0.4 - icmBias * 0.5 + huAgg * 0.25 + callBias * 0.35 + (defenderPos === 'BB' ? 0.12 : 0), profile) ? 'call' : 'fold';
    if (defenderPos === 'BB' && speculativeDefendOk(code) && (callBias > 0.02 || (profile && profile.id === 'pro'))
      && r < Math.min(0.78, 0.42 + callBias * 3 - icmBias * 0.5)) {
      return 'call';
    }
    return 'fold';
  }

  /** Opener frente al 3-bet del héroe (fold / call / 4bet). */
  function openerVs3BetAction(code, profile, rnd, ctx) {
    const r = rnd != null ? rnd : Math.random();
    const buckets = vs3betBuckets(ctx);
    let wf = handWeight(buckets.fourBet, code);
    let wc = handWeight(buckets.call, code);
    const strict = strictness(profile);
    const pf = (profile && profile.preflop) || {};
    const callBias = Number(pf.callBias) || 0;
    const threeBias = Number(pf.threeBetBias) || 0;
    const fourBias = Number(pf.fourBetBias) || 0;
    const foldBias = Number(pf.foldBias) || 0;
    let act;

    /* Continue vs 3bet: ensanchar call/4bet según perfil (bajar fold-to-3bet). */
    if (callBias > 0 && wc > 0) wc = Math.min(1, wc + callBias * 1.5);
    if (fourBias > 0 && wf > 0) wf = Math.min(1, wf + fourBias * 1.3);
    if (threeBias > 0.04 && wc >= 0.35 && wf < 0.15) {
      wf = Math.max(wf, threeBias * 0.55);
    }

    if (wf <= 0 && wc <= 0) {
      if (allowsLeak(profile, '4bet', r)) act = '4bet';
      else {
        /* Off-chart continue: pro/lag/fish no overfoldean tanto vs 3bet. */
        const off4 = Math.max(0, fourBias * 1.05 + threeBias * 0.4 - foldBias * 0.45);
        const offCall = Math.max(0, callBias * 2.4 + threeBias * 0.45 - foldBias * 0.35);
        if (off4 > 0.05 && r < off4) act = '4bet';
        else if (offCall > 0.05 && r < off4 + offCall) act = 'call';
        else act = 'fold';
      }
    } else if (strict >= 0.99) {
      const mix = gtoMixAction(r, wf, wc * (1 + callBias * 0.55), 'call');
      act = mix === 'aggress' ? '4bet' : (mix === 'pass' ? 'call' : 'fold');
    } else if (wf >= 1) {
      if (r < VP.adjustFourBetProb(strict >= 0.75 ? 0.58 : 0.62, profile)) act = '4bet';
      else if (wc > 0 && r < VP.adjustCallProb(0.82 + callBias * 0.5, profile)) act = 'call';
      else act = 'fold';
    } else if (wf > 0) {
      const freq = strict >= 0.75 ? Math.min(1, wf + fourBias * 0.4) : VP.adjustFourBetProb(Math.min(0.35, wf * 0.7), profile);
      if (r < freq) act = '4bet';
      else if (wc > 0 && r < VP.adjustCallProb(0.64 + callBias * 0.55, profile)) act = 'call';
      else act = 'fold';
    } else if (wc >= 1) act = r < VP.adjustFoldProb(Math.max(0.05, 0.10 - callBias * 0.45 + foldBias * 0.35), profile) ? 'fold' : 'call';
    else if (wc >= 0.42) act = r < VP.adjustCallProb(0.5 + callBias * 0.6, profile) ? 'call' : 'fold';
    else {
      const lightCall = Math.max(0, callBias * 1.6 + threeBias * 0.2 - foldBias * 0.25);
      act = (lightCall > 0.05 && r < lightCall) ? 'call' : 'fold';
    }

    if (act === '4bet' && !isInFourBetRange(code, ctx)) {
      if (wc > 0 || callBias > 0.03) return 'call';
      return 'fold';
    }
    return act;
  }

  /** Opener (o 3-bettor) frente al 4-bet del héroe (fold / call). */
  function villainVs4BetAction(code, profile, rnd) {
    const r = rnd != null ? rnd : Math.random();
    const buckets = vs4betBuckets();
    const wf = handWeight(buckets.fourBet, code);
    const wc = handWeight(buckets.call, code);
    const strict = strictness(profile);

    if (wf <= 0 && wc <= 0) return 'fold';

    if (strict >= 0.99) {
      if (wf >= 1) return r < 0.82 ? 'call' : 'fold';
      if (wc >= 1) return r < 0.78 ? 'call' : 'fold';
      if (wc >= 0.42) return r < wc * 0.55 ? 'call' : 'fold';
      return 'fold';
    }

    if (wf >= 1) return r < VP.adjustCallProb(0.78, profile) ? 'call' : 'fold';
    if (wc >= 1) return r < VP.adjustFoldProb(0.28, profile) ? 'fold' : 'call';
    if (wc >= 0.42) return r < VP.adjustCallProb(0.22, profile) ? 'call' : 'fold';
    return 'fold';
  }

  /** Limper frente al aislamiento del héroe (fold / call). */
  function limperVsIsoAction(code, profile, rnd) {
    const r = rnd != null ? rnd : Math.random();
    const buckets = isoDefendBuckets();
    if (!buckets) return 'fold';
    const wc = handWeight(buckets.call, code);
    const wf = handWeight(buckets.fold, code);
    const strict = strictness(profile);

    if (wc <= 0 && wf <= 0) {
      if (allowsLeak(profile, 'call', r)) return 'call';
      return 'fold';
    }

    if (strict >= 0.99) {
      if (wf >= 1) return 'fold';
      if (wc >= 1) return r < 0.88 ? 'call' : 'fold';
      if (wc >= 0.42) return r < wc * 0.62 ? 'call' : 'fold';
      if (wc > 0) return r < wc * 0.35 ? 'call' : 'fold';
      return 'fold';
    }

    if (wc >= 1) return r < VP.adjustCallProb(0.78, profile) ? 'call' : 'fold';
    if (wc >= 0.42) return r < VP.adjustCallProb(0.42, profile) ? 'call' : 'fold';
    if (wc > 0) return r < VP.adjustCallProb(wc * 0.48, profile) ? 'call' : 'fold';
    return r < VP.adjustFoldProb(0.12, profile) ? 'fold' : 'call';
  }

  /** Abridor frente al squeeze del héroe (fold / call). */
  function openerVsSqueezeAction(code, profile, rnd, openerPos, ctx) {
    const r = rnd != null ? rnd : Math.random();
    const strict = strictness(profile);
    const wOpen = openBuckets(openerPos, ctx) ? handWeight(openBuckets(openerPos, ctx), code) : 0;
    const wCont = handWeight(squeezeContinueBuckets(), code);

    if (wOpen <= 0) {
      if (allowsLeak(profile, 'call', r)) return 'call';
      return 'fold';
    }

    if (strict >= 0.99) {
      const data = D.SQUEEZE;
      const wStrong = data ? handWeight(bucketWeights({ call: data.raise }), code) : 0;
      const wMarg = data ? handWeight(bucketWeights({ call: data.call + (data.callMix ? ', ' + data.callMix : '') }), code) : 0;
      if (wStrong >= 1) return r < 0.74 ? 'call' : 'fold';
      if (wStrong > 0) return r < wStrong * 0.68 ? 'call' : 'fold';
      if (wMarg >= 0.42) return r < wMarg * 0.38 ? 'call' : 'fold';
      if (wMarg > 0) return r < wMarg * 0.18 ? 'call' : 'fold';
      return 'fold';
    }

    if (wCont >= 1) return r < VP.adjustCallProb(0.68, profile) ? 'call' : 'fold';
    if (wCont >= 0.42) return r < VP.adjustCallProb(0.34, profile) ? 'call' : 'fold';
    if (wCont > 0) return r < VP.adjustCallProb(wCont * 0.28, profile) ? 'call' : 'fold';
    return r < VP.adjustFoldProb(clamp(0.62 - wOpen * 0.18, 0.28, 0.82), profile) ? 'fold' : 'call';
  }

  /** Call o fold frente al all-in del héroe (5-bet). */
  function villainVsAllInAction(code, profile, rnd) {
    const r = rnd != null ? rnd : Math.random();
    const w = handWeight(allInCallBuckets(), code);
    const strict = strictness(profile);

    if (w <= 0) {
      return allowsLeak(profile, 'call', r) ? 'call' : 'fold';
    }

    if (strict >= 0.99) {
      if (w >= 1) return r < 0.86 ? 'call' : 'fold';
      if (w >= 0.42) return r < w * 0.45 ? 'call' : 'fold';
      return 'fold';
    }

    if (w >= 1) return r < VP.adjustCallProb(0.82, profile) ? 'call' : 'fold';
    if (w >= 0.42) return r < VP.adjustCallProb(0.18, profile) ? 'call' : 'fold';
    return 'fold';
  }

  function rangeStrFor3Bet(defender, opener, ctx) {
    const RR = global.GTORangesRegistry;
    const data = RR && ctx
      ? RR.getVsRfiRow(defender, opener, ctx)
      : D.VS_RFI[vsRfiKey(defender, opener)];
    if (!data) return 'QQ+, AKs, AKo';
    return data.threeBet + ', ' + data.threeBetMix;
  }

  function rangeStrFor4Bet(ctx) {
    const RR = global.GTORangesRegistry;
    const data = RR && ctx ? RR.getVs3bet(ctx) : D.VS_3BET;
    return data.fourBet;
  }

  function rangeStrForCall3Bet(ctx) {
    const RR = global.GTORangesRegistry;
    const d = RR && ctx ? RR.getVs3bet(ctx) : D.VS_3BET;
    return d.call + (d.callMix ? ', ' + d.callMix : '');
  }

  /** Pagador en squeeze frente al squeeze del héroe (fold / call). */
  function callerVsSqueezeAction(code, profile, rnd, ctx) {
    const r = rnd != null ? rnd : Math.random();
    const strict = strictness(profile);
    const wCont = handWeight(squeezeContinueBuckets(), code);

    if (wCont <= 0) {
      if (allowsLeak(profile, 'call', r)) return 'call';
      return 'fold';
    }

    if (strict >= 0.99) {
      const data = D.SQUEEZE;
      const wMarg = data ? handWeight(bucketWeights({ call: data.call + (data.callMix ? ', ' + data.callMix : '') }), code) : wCont;
      if (wCont >= 1) return r < 0.68 ? 'call' : 'fold';
      if (wMarg >= 0.42) return r < wMarg * 0.42 ? 'call' : 'fold';
      if (wMarg > 0) return r < wMarg * 0.2 ? 'call' : 'fold';
      return 'fold';
    }

    if (wCont >= 1) return r < VP.adjustCallProb(0.52, profile) ? 'call' : 'fold';
    if (wCont >= 0.42) return r < VP.adjustCallProb(0.28, profile) ? 'call' : 'fold';
    if (wCont > 0) return r < VP.adjustCallProb(wCont * 0.22, profile) ? 'call' : 'fold';
    return 'fold';
  }

  /**
   * Cold 4-bet: jugador frío frente a open + 3-bet (no es el opener).
   * Más tight que 4-bet del opener; se aprieta más en ICM / short.
   */
  function cold4BetAction(code, profile, rnd, ctx) {
    ctx = ctx || {};
    const r = rnd != null ? rnd : Math.random();
    const strict = strictness(profile);
    const w4 = handWeight(vs4betBuckets().fourBet, code);
    const wCall = handWeight(vs4betBuckets().call, code);
    const icm = tournamentFoldBias(ctx);
    let fourFreq = 0;
    if (w4 >= 1) fourFreq = strict >= 0.99 ? 0.55 : VP.adjustFourBetProb(0.48, profile);
    else if (w4 >= 0.42) fourFreq = strict >= 0.99 ? w4 * 0.35 : VP.adjustFourBetProb(w4 * 0.28, profile);
    else if (allowsLeak(profile, '4bet', r) && strict < 0.9) fourFreq = 0.04;

    fourFreq *= clamp(1 - icm * 0.55, 0.35, 1);
    if (ctx.stackBB != null && ctx.stackBB <= 25) fourFreq *= 0.7;
    if (ctx.multiwayCount >= 3 || ctx.callersAhead >= 1) fourFreq *= 0.75;

    if (r < fourFreq && isInFourBetRange(code, ctx)) return '4bet';

    let callFreq = 0;
    if (wCall >= 1 && (ctx.stackBB == null || ctx.stackBB >= 40)) {
      callFreq = strict >= 0.99 ? 0.18 : VP.adjustCallProb(0.22, profile);
      callFreq *= clamp(1 - icm * 0.7, 0.2, 1);
    }
    if (r < callFreq) return 'call';
    return 'fold';
  }

  /**
   * Squeeze vs multi-caller: más value, faroles más selectivos.
   */
  function squeezeAction(code, profile, rnd, ctx) {
    ctx = ctx || {};
    const r = rnd != null ? rnd : Math.random();
    const data = D.SQUEEZE;
    if (!data) return 'fold';
    const wRaise = handWeight(bucketWeights({ raise: data.raise }), code);
    const wCall = handWeight(bucketWeights({ call: data.call }), code);
    const strict = strictness(profile);
    const callers = ctx.callersAhead != null ? ctx.callersAhead
      : (ctx.multiwayCount != null ? Math.max(0, ctx.multiwayCount - 2) : 1);
    let raiseFreq = 0;
    if (wRaise >= 1) raiseFreq = strict >= 0.99 ? 0.88 : VP.adjustThreeBetProb(0.82, profile);
    else if (wRaise > 0) raiseFreq = strict >= 0.99 ? wRaise * 0.75 : VP.adjustThreeBetProb(wRaise * 0.65, profile);
    if (callers >= 2) {
      if (wRaise < 1) raiseFreq *= 0.55;
      else raiseFreq = Math.min(1, raiseFreq * 1.05);
    }
    raiseFreq *= clamp(1 - tournamentFoldBias(ctx) * 0.4, 0.4, 1);
    if (r < raiseFreq) return '3bet';
    if (wCall >= 1 && r < (strict >= 0.99 ? 0.45 : 0.55)) return 'call';
    if (wCall >= 0.42 && r < wCall * 0.35) return 'call';
    return 'fold';
  }

  global.GTOVillainPreflop = {
    defendVsOpen, openerVs3BetAction, villainVs4BetAction, villainVsAllInAction,
    limperVsIsoAction, openerVsSqueezeAction, callerVsSqueezeAction,
    cold4BetAction, squeezeAction,
    rangeStrFor3Bet, rangeStrFor4Bet, rangeStrForCall3Bet,
    isInFourBetRange, isInThreeBetRange, isInOpenRange, shouldOpen, isInDefendRange,
    isInLimpRange, isInIsoDefendRange, isInSqueezeContinueRange, strictness,
    tournamentFoldBias, tournamentStealBias, isExplicitHu, huAggressionBias
  };
})(window);
