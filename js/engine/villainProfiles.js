/*
 * villainProfiles.js — Perfiles de rivales 6-max (5 villanos + héroe).
 * Cada asiento recibe un arquetipo aleatorio por mano; modula agresión, bluffs y calls.
 */
(function (global) {
  'use strict';

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  const PROFILES = [
    {
      id: 'tag',
      label: 'TAG',
      shortLabel: 'Tight-agresivo',
      preflop: { foldBias: 0.04, threeBetBias: 0.04, fourBetBias: 0.02, callBias: -0.03 },
      postflop: { betFreqMult: 1.15, bluffFreqMult: 0.95, raiseFreqMult: 1.2, callMult: 0.95, foldMult: 1.05, betSizeMult: 1.05 }
    },
    {
      id: 'lag',
      label: 'LAG',
      shortLabel: 'Loose-agresivo',
      preflop: { foldBias: -0.14, threeBetBias: 0.11, fourBetBias: 0.06, callBias: 0.08 },
      postflop: { betFreqMult: 1.55, bluffFreqMult: 1.75, raiseFreqMult: 1.65, callMult: 1.12, foldMult: 0.68, betSizeMult: 1.18 }
    },
    {
      id: 'nit',
      label: 'Nit',
      shortLabel: 'Tight-pasivo',
      preflop: { foldBias: 0.12, threeBetBias: -0.04, fourBetBias: -0.02, callBias: -0.06 },
      postflop: { betFreqMult: 0.52, bluffFreqMult: 0.28, raiseFreqMult: 0.42, callMult: 0.82, foldMult: 1.28, betSizeMult: 0.78 }
    },
    {
      id: 'fish',
      label: 'Fish',
      shortLabel: 'Loose-pasivo',
      preflop: { foldBias: -0.18, threeBetBias: -0.06, fourBetBias: -0.03, callBias: 0.14 },
      postflop: { betFreqMult: 0.72, bluffFreqMult: 0.45, raiseFreqMult: 0.38, callMult: 1.48, foldMult: 0.58, betSizeMult: 0.88 }
    },
    {
      id: 'maniac',
      label: 'Maniac',
      shortLabel: 'Hiper-agresivo',
      preflop: { foldBias: -0.22, threeBetBias: 0.16, fourBetBias: 0.1, callBias: 0.1 },
      postflop: { betFreqMult: 1.9, bluffFreqMult: 2.35, raiseFreqMult: 2.1, callMult: 1.18, foldMult: 0.42, betSizeMult: 1.32 }
    }
  ];

  const DEFAULT = PROFILES[0];
  const byId = {};
  PROFILES.forEach(function (p) { byId[p.id] = p; });

  function pickRandom() {
    return PROFILES[Math.floor(Math.random() * PROFILES.length)];
  }

  function getProfile(idOrObj) {
    if (!idOrObj) return DEFAULT;
    if (typeof idOrObj === 'object' && idOrObj.id) return idOrObj;
    return byId[idOrObj] || DEFAULT;
  }

  function profileForHand(hand, pos) {
    if (!hand || !pos) return DEFAULT;
    const prof = hand.table && hand.table.profiles && hand.table.profiles[pos];
    return getProfile(prof);
  }

  function assignTableProfiles(hand, positions, heroPos) {
    if (!hand.table) return;
    hand.table.profiles = hand.table.profiles || {};
    (positions || []).forEach(function (pos) {
      if (pos !== heroPos) hand.table.profiles[pos] = pickRandom();
    });
  }

  /** Acción postflop cuando el villano afronta apuesta/raise del héroe. */
  function postflopFacingBet(strength, potOdds, profile, rnd, opts) {
    opts = opts || {};
    const street = opts.street || 'flop';
    const tier = opts.tier || 'medium';
    const p = profile.postflop;
    const r = rnd != null ? rnd : Math.random();
    let bluffRaise = clamp(0.1 * p.raiseFreqMult * p.bluffFreqMult, 0.05, 0.48);
    const valueRaise = clamp(0.22 * p.raiseFreqMult, 0.1, 0.45);

    if (street === 'river') {
      bluffRaise = clamp(bluffRaise * 0.45, 0.02, 0.18);
      if ((tier === 'weak' || strength < 0.35) && strength <= potOdds + 0.05) {
        return r < bluffRaise ? 'raise' : 'fold';
      }
    }

    if (strength > 0.72) return r < valueRaise ? 'raise' : 'call';
    if (strength > potOdds + 0.08) {
      return r < clamp(0.82 * p.callMult, 0.32, 0.96) ? 'call' : 'fold';
    }
    if (strength > potOdds - 0.05) {
      return r < clamp(0.48 * p.callMult, 0.18, 0.82) ? 'call' : 'fold';
    }
    if (r < bluffRaise) return 'raise';
    return r < clamp(0.14 * p.callMult, 0.04, 0.38) ? 'call' : 'fold';
  }

  /** Acción postflop cuando el villano puede apostar o pasar (lead / probe). */
  function postflopLead(strength, profile, villainIsAgg, rnd, opts) {
    opts = opts || {};
    const street = opts.street || 'flop';
    const tier = opts.tier || 'medium';
    const p = profile.postflop;
    const r = rnd != null ? rnd : Math.random();

    if (street === 'river') {
      if (tier === 'weak' || strength < 0.32) {
        return r < clamp(0.04 * p.bluffFreqMult, 0.01, 0.1) ? 'bet' : 'check';
      }
      if (tier === 'medium' && strength < 0.48) {
        return r < clamp(0.07 * p.betFreqMult, 0.02, 0.18) ? 'bet' : 'check';
      }
    }

    const bluffMult = strength <= 0.28 ? p.bluffFreqMult : (strength <= 0.42 ? p.bluffFreqMult * 0.75 : 1);
    let betFreq;
    if (villainIsAgg) {
      if (strength > 0.68) betFreq = clamp(0.58 * p.betFreqMult, 0.22, 0.92);
      else if (strength > 0.42) betFreq = clamp(0.34 * p.betFreqMult, 0.14, 0.68);
      else if (strength > 0.22) betFreq = clamp(0.38 * p.betFreqMult * bluffMult, 0.16, 0.72);
      else betFreq = clamp(0.22 * p.betFreqMult * bluffMult, 0.1, 0.58);
    } else {
      if (strength > 0.68) betFreq = clamp(0.48 * p.betFreqMult, 0.18, 0.82);
      else if (strength > 0.42) betFreq = clamp(0.28 * p.betFreqMult, 0.12, 0.58);
      else if (strength > 0.22) betFreq = clamp(0.34 * p.betFreqMult * bluffMult, 0.14, 0.65);
      else betFreq = clamp(0.18 * p.betFreqMult * bluffMult, 0.08, 0.52);
    }
    return r < betFreq ? 'bet' : 'check';
  }

  function betSizeBB(potBB, profile, rnd, opts) {
    opts = opts || {};
    const mult = (profile.postflop && profile.postflop.betSizeMult) || 1;
    const r = rnd != null ? rnd : Math.random();
    let frac = 0.5 * mult;
    if (mult >= 1.2 && r < 0.28) frac = clamp(0.72 * mult, 0.55, 1.05);
    else if (mult <= 0.85) frac = clamp(0.38 * mult, 0.28, 0.55);
    else if (r < 0.22) frac = clamp(0.66 * mult, 0.45, 0.9);
    if (opts.street === 'river' && (opts.strength || 0) < 0.55) {
      frac = clamp(frac * 0.55, 0.25, 0.5);
    }
    return Math.round(potBB * frac * 100) / 100;
  }

  function adjustFoldProb(base, profile) {
    const pf = profile.preflop || {};
    const foldMult = profile.postflop ? profile.postflop.foldMult : 1;
    return clamp(base + (pf.foldBias || 0) + (foldMult - 1) * 0.06, 0.06, 0.88);
  }

  function adjustThreeBetProb(base, profile) {
    const pf = profile.preflop || {};
    return clamp(base + (pf.threeBetBias || 0), 0.02, 0.42);
  }

  function adjustFourBetProb(base, profile) {
    const pf = profile.preflop || {};
    return clamp(base + (pf.fourBetBias || 0), 0.01, 0.28);
  }

  function adjustCallProb(base, profile) {
    const pf = profile.preflop || {};
    const mult = profile.postflop ? profile.postflop.callMult : 1;
    return clamp(base * mult + (pf.callBias || 0), 0.08, 0.92);
  }

  global.GTOVillainProfiles = {
    PROFILES, DEFAULT, pickRandom, getProfile, profileForHand, assignTableProfiles,
    postflopFacingBet, postflopLead, betSizeBB,
    adjustFoldProb, adjustThreeBetProb, adjustFourBetProb, adjustCallProb
  };
})(window);
