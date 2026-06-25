/*
 * villainPreflop.js — Decisiones preflop del villano ancladas a rangos GTO.
 * El perfil modula frecuencias dentro del rango; no permite 3-bet/4-bet/call AI con basura.
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

  function defendBuckets(defender, opener) {
    const data = D.VS_RFI[vsRfiKey(defender, opener)];
    if (!data) return null;
    return {
      threeBet: bucketWeights({ threeBet: data.threeBet, threeBetMix: data.threeBetMix }),
      call: bucketWeights({ call: data.call, callMix: data.callMix })
    };
  }

  function vs3betBuckets() {
    const data = D.VS_3BET;
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

  /** Defensa BB/SB frente a open del héroe (fold / call / 3bet). */
  function defendVsOpen(code, profile, rnd, defenderPos, openerPos) {
    const r = rnd != null ? rnd : Math.random();
    const buckets = defendBuckets(defenderPos, openerPos);
    if (!buckets) return 'fold';

    const w3 = handWeight(buckets.threeBet, code);
    const wc = handWeight(buckets.call, code);

    if (w3 >= 1) {
      if (r < VP.adjustThreeBetProb(0.68, profile)) return '3bet';
      if (wc > 0 && r < VP.adjustCallProb(0.82, profile)) return 'call';
      return 'fold';
    }
    if (w3 >= 0.5) {
      if (r < VP.adjustThreeBetProb(0.32, profile)) return '3bet';
      if (wc > 0 && r < VP.adjustCallProb(0.58, profile)) return 'call';
      return 'fold';
    }
    if (wc >= 1) return r < VP.adjustFoldProb(0.14, profile) ? 'fold' : 'call';
    if (wc >= 0.42) return r < VP.adjustCallProb(0.36, profile) ? 'call' : 'fold';
    return 'fold';
  }

  /** Opener frente al 3-bet del héroe (fold / call / 4bet). */
  function openerVs3BetAction(code, profile, rnd) {
    const r = rnd != null ? rnd : Math.random();
    const buckets = vs3betBuckets();
    const wf = handWeight(buckets.fourBet, code);
    const wc = handWeight(buckets.call, code);

    if (wf <= 0 && wc <= 0) return 'fold';

    if (wf >= 1) {
      if (r < VP.adjustFourBetProb(0.58, profile)) return '4bet';
      if (wc > 0 && r < VP.adjustCallProb(0.72, profile)) return 'call';
      return 'fold';
    }
    if (wc >= 1) return r < VP.adjustFoldProb(0.18, profile) ? 'fold' : 'call';
    if (wc >= 0.42) return r < VP.adjustCallProb(0.34, profile) ? 'call' : 'fold';
    return 'fold';
  }

  /** Opener (o 3-bettor) frente al 4-bet del héroe (fold / call). */
  function villainVs4BetAction(code, profile, rnd) {
    const r = rnd != null ? rnd : Math.random();
    const buckets = vs4betBuckets();
    const wf = handWeight(buckets.fourBet, code);
    const wc = handWeight(buckets.call, code);

    if (wf >= 1) return r < VP.adjustCallProb(0.78, profile) ? 'call' : 'fold';
    if (wc >= 1) return r < VP.adjustFoldProb(0.28, profile) ? 'fold' : 'call';
    if (wc >= 0.42) return r < VP.adjustCallProb(0.22, profile) ? 'call' : 'fold';
    return 'fold';
  }

  /** Call o fold frente al all-in del héroe (5-bet). */
  function villainVsAllInAction(code, profile, rnd) {
    const r = rnd != null ? rnd : Math.random();
    const w = handWeight(allInCallBuckets(), code);
    if (w >= 1) return r < VP.adjustCallProb(0.82, profile) ? 'call' : 'fold';
    if (w >= 0.42) return r < VP.adjustCallProb(0.18, profile) ? 'call' : 'fold';
    return 'fold';
  }

  function rangeStrFor3Bet(defender, opener) {
    const data = D.VS_RFI[vsRfiKey(defender, opener)];
    if (!data) return 'QQ+, AKs, AKo';
    return data.threeBet + ', ' + data.threeBetMix;
  }

  function rangeStrFor4Bet() {
    return D.VS_3BET.fourBet;
  }

  function rangeStrForCall3Bet() {
    const d = D.VS_3BET;
    return d.call + (d.callMix ? ', ' + d.callMix : '');
  }

  global.GTOVillainPreflop = {
    defendVsOpen, openerVs3BetAction, villainVs4BetAction, villainVsAllInAction,
    rangeStrFor3Bet, rangeStrFor4Bet, rangeStrForCall3Bet
  };
})(window);
