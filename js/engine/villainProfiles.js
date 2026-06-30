/*
 * villainProfiles.js — Perfiles de rivales 6-max (5 villanos + héroe).
 * Cada asiento recibe un arquetipo por mano; modula agresión, bluffs y calls.
 * Nivel de sesión (fish / intermediate / pro) ajusta distribución y cercanía a GTO.
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
    },
    {
      id: 'pro',
      label: 'Pro',
      shortLabel: 'Pro GTO',
      preflop: { foldBias: 0.02, threeBetBias: 0.05, fourBetBias: 0.03, callBias: -0.02 },
      postflop: { betFreqMult: 1.12, bluffFreqMult: 0.85, raiseFreqMult: 1.15, callMult: 0.98, foldMult: 1.08, betSizeMult: 1.02 }
    }
  ];

  const STRONG_IDS = ['tag', 'lag', 'maniac'];

  const DIFFICULTY = {
    fish: {
      label: 'Fish',
      weights: { tag: 20, lag: 20, nit: 20, fish: 20, maniac: 20 },
      minStrong: 0,
      biasScale: 1,
      preflopStrict: 0,
      leakRate: 0.1,
      aggroBoost: 1
    },
    intermediate: {
      label: 'Intermedio',
      weights: { tag: 50, lag: 35, nit: 10, fish: 5, maniac: 0 },
      minStrong: 2,
      biasScale: 0.22,
      preflopStrict: 0.88,
      leakRate: 0.025,
      aggroBoost: 1.04
    },
    pro: {
      label: 'Pro',
      weights: { pro: 100 },
      minStrong: 0,
      biasScale: 0.06,
      preflopStrict: 1,
      leakRate: 0,
      aggroBoost: 1.14
    }
  };

  const DEFAULT = PROFILES[0];
  const byId = {};
  PROFILES.forEach(function (p) { byId[p.id] = p; });

  function normalizeDifficulty(level) {
    if (level === 'intermediate' || level === 'intermedio') return 'intermediate';
    if (level === 'pro') return 'pro';
    return 'fish';
  }

  function pickWeighted(weights, rnd) {
    const r = rnd != null ? rnd : Math.random();
    let total = 0;
    const entries = [];
    Object.keys(weights || {}).forEach(function (id) {
      const w = weights[id] || 0;
      if (w > 0 && byId[id]) {
        total += w;
        entries.push({ id: id, w: w });
      }
    });
    if (!entries.length) return pickRandom();
    let acc = 0;
    const roll = r * total;
    for (let i = 0; i < entries.length; i++) {
      acc += entries[i].w;
      if (roll <= acc) return byId[entries[i].id];
    }
    return byId[entries[entries.length - 1].id];
  }

  function pickRandom() {
    return PROFILES[Math.floor(Math.random() * PROFILES.length)];
  }

  function pickForDifficulty(level, rnd) {
    const diff = DIFFICULTY[normalizeDifficulty(level)] || DIFFICULTY.fish;
    return pickWeighted(diff.weights, rnd);
  }

  function scaleBias(val, scale) {
    return (val || 0) * scale;
  }

  function scaleMult(val, scale, boost) {
    const base = val != null ? val : 1;
    const towardGto = 1 + (base - 1) * scale;
    return towardGto * boost;
  }

  function applyDifficulty(profile, level) {
    const lvl = normalizeDifficulty(level);
    if (lvl === 'pro') {
      const proBase = byId.pro || DEFAULT;
      return Object.assign({}, proBase, {
        id: 'pro',
        label: 'Pro',
        shortLabel: 'Pro GTO',
        difficultyLevel: 'pro',
        preflopStrict: 1,
        leakRate: 0
      });
    }
    const base = getProfile(profile);
    const diff = DIFFICULTY[lvl] || DIFFICULTY.fish;
    const pf = base.preflop || {};
    const po = base.postflop || {};
    const s = diff.biasScale;
    const b = diff.aggroBoost;
    const scaled = (s >= 0.99 && b <= 1.01) ? base : {
      id: base.id,
      label: base.label,
      shortLabel: base.shortLabel,
      preflop: {
        foldBias: scaleBias(pf.foldBias, s),
        threeBetBias: scaleBias(pf.threeBetBias, s),
        fourBetBias: scaleBias(pf.fourBetBias, s),
        callBias: scaleBias(pf.callBias, s)
      },
      postflop: {
        betFreqMult: scaleMult(po.betFreqMult, s, b),
        bluffFreqMult: scaleMult(po.bluffFreqMult, s, b),
        raiseFreqMult: scaleMult(po.raiseFreqMult, s, b),
        callMult: scaleMult(po.callMult, s, 1),
        foldMult: scaleMult(po.foldMult, s, 1 / Math.sqrt(b)),
        betSizeMult: scaleMult(po.betSizeMult, s, Math.sqrt(b))
      }
    };
    return Object.assign({}, scaled, {
      difficultyLevel: lvl,
      preflopStrict: diff.preflopStrict,
      leakRate: diff.leakRate
    });
  }

  function getProfile(idOrObj) {
    if (!idOrObj) return DEFAULT;
    if (typeof idOrObj === 'object' && idOrObj.id) return idOrObj;
    return byId[idOrObj] || DEFAULT;
  }

  function profileForHand(hand, pos) {
    if (!hand || !pos) return DEFAULT;
    const prof = hand.table && hand.table.profiles && hand.table.profiles[pos];
    const level = (hand.playConfig && hand.playConfig.villainLevel)
      || (hand.table && hand.table.villainLevel)
      || 'fish';
    return applyDifficulty(getProfile(prof), level);
  }

  function assignTableProfiles(hand, positions, heroPos, difficulty) {
    if (!hand.table) return;
    const level = normalizeDifficulty(difficulty || (hand.playConfig && hand.playConfig.villainLevel) || 'fish');
    const diff = DIFFICULTY[level] || DIFFICULTY.fish;
    hand.table.villainLevel = level;
    hand.table.profiles = hand.table.profiles || {};

    const villains = (positions || []).filter(function (pos) { return pos !== heroPos; });
    const assigned = {};

    if (level === 'pro') {
      villains.forEach(function (pos) { assigned[pos] = 'pro'; });
    } else {
      villains.forEach(function (pos) {
        assigned[pos] = pickForDifficulty(level).id;
      });
    }

    let strongCount = villains.filter(function (pos) {
      return STRONG_IDS.indexOf(assigned[pos]) >= 0;
    }).length;

    while (level !== 'pro' && strongCount < diff.minStrong && villains.length) {
      const weakPos = villains.find(function (pos) {
        return STRONG_IDS.indexOf(assigned[pos]) < 0;
      });
      if (!weakPos) break;
      assigned[weakPos] = pickForDifficulty('pro').id;
      strongCount++;
    }

    villains.forEach(function (pos) {
      hand.table.profiles[pos] = assigned[pos];
    });
  }

  /** Acción postflop cuando el villano afronta apuesta/raise del héroe. */
  function postflopFacingBet(strength, potOdds, profile, rnd, opts) {
    opts = opts || {};
    const street = opts.street || 'flop';
    const tier = opts.tier || 'medium';
    const madeCat = opts.madeCategory != null ? opts.madeCategory : 0;
    const r = rnd != null ? rnd : Math.random();
    const strict = profile.preflopStrict != null && profile.preflopStrict >= 0.99;

    if (strict && madeCat >= 2) {
      if (r < 0.14) return 'raise';
      return 'call';
    }

    if (strict) {
      if (street === 'river') {
        if (tier === 'weak' || strength < 0.38) return r < 0.04 ? 'raise' : 'fold';
        if (strength > 0.74) return r < 0.14 ? 'raise' : 'call';
        if (strength > potOdds + 0.1) return r < 0.86 ? 'call' : 'fold';
        if (strength > potOdds - 0.04) return r < 0.42 ? 'call' : 'fold';
        return 'fold';
      }
      if (strength > 0.76) return r < 0.16 ? 'raise' : 'call';
      if (strength > potOdds + 0.1) return r < 0.84 ? 'call' : 'fold';
      if (strength > potOdds - 0.05) return r < 0.38 ? 'call' : 'fold';
      return r < 0.05 ? 'raise' : 'fold';
    }

    const p = profile.postflop;
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
    const madeCat = opts.madeCategory != null ? opts.madeCategory : 0;
    const r = rnd != null ? rnd : Math.random();
    const strict = profile.preflopStrict != null && profile.preflopStrict >= 0.99;

    if (strict && madeCat >= 2) {
      if (villainIsAgg) return r < 0.9 ? 'bet' : 'check';
      return r < 0.72 ? 'bet' : 'check';
    }

    if (strict) {
      if (street === 'river') {
        if (tier === 'weak' || strength < 0.34) return r < 0.02 ? 'bet' : 'check';
        if (strength < 0.5) return r < 0.08 ? 'bet' : 'check';
      }
      if (strength > 0.72) return r < (villainIsAgg ? 0.72 : 0.58) ? 'bet' : 'check';
      if (strength > 0.48) return r < (villainIsAgg ? 0.38 : 0.28) ? 'bet' : 'check';
      if (strength > 0.28) return r < (villainIsAgg ? 0.14 : 0.1) ? 'bet' : 'check';
      return r < 0.04 ? 'bet' : 'check';
    }

    const p = profile.postflop;

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
    const strict = profile.preflopStrict != null ? profile.preflopStrict : 0;
    if (strict >= 0.99) return base;
    const pf = profile.preflop || {};
    const scale = Math.max(0, 1 - strict);
    return clamp(base + (pf.threeBetBias || 0) * scale, 0.02, 0.42);
  }

  function adjustFourBetProb(base, profile) {
    const strict = profile.preflopStrict != null ? profile.preflopStrict : 0;
    if (strict >= 0.99) return base;
    const pf = profile.preflop || {};
    const scale = Math.max(0, 1 - strict);
    return clamp(base + (pf.fourBetBias || 0) * scale, 0.01, 0.28);
  }

  function adjustCallProb(base, profile) {
    const strict = profile.preflopStrict != null ? profile.preflopStrict : 0;
    const pf = profile.preflop || {};
    const mult = profile.postflop ? profile.postflop.callMult : 1;
    const scale = Math.max(0, 1 - strict * 0.85);
    return clamp(base * (1 + (mult - 1) * scale) + (pf.callBias || 0) * scale, 0.08, 0.92);
  }

  global.GTOVillainProfiles = {
    PROFILES, DIFFICULTY, DEFAULT, STRONG_IDS,
    pickRandom, pickForDifficulty, normalizeDifficulty, applyDifficulty,
    getProfile, profileForHand, assignTableProfiles,
    postflopFacingBet, postflopLead, betSizeBB,
    adjustFoldProb, adjustThreeBetProb, adjustFourBetProb, adjustCallProb
  };
})(window);
