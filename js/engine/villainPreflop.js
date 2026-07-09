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

  /** Defensa BB/SB frente a open del héroe (fold / call / 3bet). */
  function defendVsOpen(code, profile, rnd, defenderPos, openerPos, ctx) {
    const r = rnd != null ? rnd : Math.random();
    const buckets = defendBuckets(defenderPos, openerPos, ctx);
    if (!buckets) return 'fold';

    const w3 = handWeight(buckets.threeBet, code);
    const wc = handWeight(buckets.call, code);
    const strict = strictness(profile);

    if (w3 <= 0 && wc <= 0) {
      if (allowsLeak(profile, '3bet', r)) return '3bet';
      if (allowsLeak(profile, 'call', r)) return 'call';
      return 'fold';
    }

    if (strict >= 0.99) {
      const act = gtoMixAction(r, w3, wc, 'call');
      if (act === 'aggress') return '3bet';
      if (act === 'pass') return 'call';
      return 'fold';
    }

    if (w3 >= 1) {
      if (r < VP.adjustThreeBetProb(strict >= 0.75 ? 0.72 : 0.68, profile)) return '3bet';
      if (wc > 0 && r < VP.adjustCallProb(0.82, profile)) return 'call';
      return 'fold';
    }
    if (w3 >= 0.5) {
      const freq = strict >= 0.75 ? w3 : VP.adjustThreeBetProb(0.32, profile);
      if (r < freq) return '3bet';
      if (wc > 0 && r < VP.adjustCallProb(0.58, profile)) return 'call';
      return 'fold';
    }
    if (w3 > 0) {
      if (r < (strict >= 0.75 ? w3 : VP.adjustThreeBetProb(w3 * 0.55, profile))) return '3bet';
      if (wc > 0 && r < VP.adjustCallProb(0.42, profile)) return 'call';
      return 'fold';
    }
    if (wc >= 1) return r < VP.adjustFoldProb(0.14, profile) ? 'fold' : 'call';
    if (wc >= 0.42) return r < VP.adjustCallProb(0.36, profile) ? 'call' : 'fold';
    return 'fold';
  }

  /** Opener frente al 3-bet del héroe (fold / call / 4bet). */
  function openerVs3BetAction(code, profile, rnd, ctx) {
    const r = rnd != null ? rnd : Math.random();
    const buckets = vs3betBuckets(ctx);
    const wf = handWeight(buckets.fourBet, code);
    const wc = handWeight(buckets.call, code);
    const strict = strictness(profile);
    let act;

    if (wf <= 0 && wc <= 0) {
      if (allowsLeak(profile, '4bet', r)) act = '4bet';
      else act = 'fold';
    } else if (strict >= 0.99) {
      const mix = gtoMixAction(r, wf, wc, 'call');
      act = mix === 'aggress' ? '4bet' : (mix === 'pass' ? 'call' : 'fold');
    } else if (wf >= 1) {
      if (r < VP.adjustFourBetProb(strict >= 0.75 ? 0.55 : 0.58, profile)) act = '4bet';
      else if (wc > 0 && r < VP.adjustCallProb(0.72, profile)) act = 'call';
      else act = 'fold';
    } else if (wf > 0) {
      const freq = strict >= 0.75 ? wf : VP.adjustFourBetProb(Math.min(0.28, wf * 0.65), profile);
      if (r < freq) act = '4bet';
      else if (wc > 0 && r < VP.adjustCallProb(0.52, profile)) act = 'call';
      else act = 'fold';
    } else if (wc >= 1) act = r < VP.adjustFoldProb(0.18, profile) ? 'fold' : 'call';
    else if (wc >= 0.42) act = r < VP.adjustCallProb(0.34, profile) ? 'call' : 'fold';
    else act = 'fold';

    if (act === '4bet' && !isInFourBetRange(code, ctx)) {
      if (wc > 0) return 'call';
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

  global.GTOVillainPreflop = {
    defendVsOpen, openerVs3BetAction, villainVs4BetAction, villainVsAllInAction,
    limperVsIsoAction, openerVsSqueezeAction, callerVsSqueezeAction,
    rangeStrFor3Bet, rangeStrFor4Bet, rangeStrForCall3Bet,
    isInFourBetRange, isInThreeBetRange, isInOpenRange, isInDefendRange,
    isInLimpRange, isInIsoDefendRange, isInSqueezeContinueRange, strictness
  };
})(window);
