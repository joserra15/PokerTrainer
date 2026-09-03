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
      shortLabel: 'Pro (GTO+)',
      preflop: { foldBias: 0.02, threeBetBias: 0.05, fourBetBias: 0.03, callBias: -0.02 },
      postflop: {
        betFreqMult: 1.14,
        bluffFreqMult: 0.92,
        raiseFreqMult: 1.28,
        callMult: 0.98,
        foldMult: 1.06,
        betSizeMult: 1.06,
        overbetWeight: 1.2,
        xrFlopMult: 1.35,
        riverPolarMult: 1.25
      }
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

  function applyDifficulty(profile, level, opts) {
    opts = opts || {};
    const lvl = normalizeDifficulty(level);
    const base = getProfile(profile);
    const forcedKeep = !!(opts.forced || opts.keepArchetype);

    // Nivel pro sin arquetipo forzado → perfil Pro (GTO+).
    if (lvl === 'pro' && !forcedKeep) {
      const proBase = byId.pro || DEFAULT;
      return Object.assign({}, proBase, {
        id: 'pro',
        label: 'Pro',
        shortLabel: 'Pro (GTO+)',
        difficultyLevel: 'pro',
        preflopStrict: 1,
        leakRate: 0,
        proStyle: 'exploit_pool'
      });
    }

    const diff = DIFFICULTY[lvl] || DIFFICULTY.fish;
    // Con tipo forzado + level pro: leak muy sutil (biasScale de pro).
    const s = (lvl === 'pro' && forcedKeep) ? (DIFFICULTY.pro.biasScale || 0.06) : diff.biasScale;
    const b = (lvl === 'pro' && forcedKeep) ? 1 : diff.aggroBoost;
    const pf = base.preflop || {};
    const po = base.postflop || {};
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
    const strict = (lvl === 'pro' && forcedKeep) ? 0.92 : diff.preflopStrict;
    const leak = (lvl === 'pro' && forcedKeep) ? 0.01 : diff.leakRate;
    return Object.assign({}, scaled, {
      difficultyLevel: lvl,
      preflopStrict: strict,
      leakRate: leak
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
    const forced = !!(hand.table && hand.table.forcedVillainType);
    return applyDifficulty(getProfile(prof), level, { forced: forced, keepArchetype: forced });
  }

  function resolveForcedType(hand) {
    const cfg = hand && hand.playConfig;
    if (!cfg) return null;
    const raw = cfg.villainType;
    if (!raw || raw === 'random') return null;
    const id = String(raw).toLowerCase();
    return byId[id] ? id : null;
  }

  function assignTableProfiles(hand, positions, heroPos, difficulty) {
    if (!hand.table) return;
    const level = normalizeDifficulty(difficulty || (hand.playConfig && hand.playConfig.villainLevel) || 'fish');
    const diff = DIFFICULTY[level] || DIFFICULTY.fish;
    hand.table.villainLevel = level;
    hand.table.profiles = hand.table.profiles || {};

    const villains = (positions || []).filter(function (pos) { return pos !== heroPos; });
    const assigned = {};
    const forced = resolveForcedType(hand);

    if (forced) {
      // Tipo fijado desde config/Escuela: todos los villanos comparten el arquetipo.
      villains.forEach(function (pos) { assigned[pos] = forced; });
      hand.table.forcedVillainType = forced;
    } else if (level === 'pro') {
      villains.forEach(function (pos) { assigned[pos] = 'pro'; });
      hand.table.forcedVillainType = null;
    } else {
      hand.table.forcedVillainType = null;
      villains.forEach(function (pos) {
        assigned[pos] = pickForDifficulty(level).id;
      });

      let strongCount = villains.filter(function (pos) {
        return STRONG_IDS.indexOf(assigned[pos]) >= 0;
      }).length;

      while (strongCount < diff.minStrong && villains.length) {
        const weakPos = villains.find(function (pos) {
          return STRONG_IDS.indexOf(assigned[pos]) < 0;
        });
        if (!weakPos) break;
        assigned[weakPos] = pickForDifficulty('pro').id;
        strongCount++;
      }
    }

    villains.forEach(function (pos) {
      hand.table.profiles[pos] = assigned[pos];
    });
  }

  function multiwayFacingScale(opts, profile) {
    if (!opts || !opts.multiway) return { call: 1, raise: 1, bluff: 1 };
    const MW = global.GTOMultiway;
    const m = MW && MW.multiwayPolicyMult ? MW.multiwayPolicyMult(profile) : { call: 0.88, raise: 0.7, bluff: 0.5 };
    return { call: m.call, raise: m.raise, bluff: m.bluff };
  }

  function multiwayLeadScale(opts, profile) {
    if (!opts || !opts.multiway) return { cbet: 1, bluff: 1 };
    const MW = global.GTOMultiway;
    const m = MW && MW.multiwayPolicyMult ? MW.multiwayPolicyMult(profile) : { cbet: 0.7, bluff: 0.5 };
    return { cbet: m.cbet, bluff: m.bluff };
  }

  /** Fish / hiper-agresivo: agresión solo con buenas cartas o manos medias, nunca basura. */
  function isLooseSpewyProfile(profile) {
    return !!(profile && (profile.id === 'fish' || profile.id === 'maniac'));
  }

  function canAggressWithoutTrash(strength, opts, profile) {
    if (!isLooseSpewyProfile(profile)) return true;
    const tier = (opts && opts.tier) || 'medium';
    if (tier === 'strong' || tier === 'medium' || tier === 'weak') return true;
    if (strength > 0.42) return true;
    const hole = opts && opts.holeStrength;
    // Buenas cartas (p. ej. broadways/premium) pueden cbet aunque fallen el flop.
    if (hole != null && hole >= 0.55) return true;
    return false;
  }

  /** Acción postflop cuando el villano afronta apuesta/raise del héroe. */
  function postflopFacingBet(strength, potOdds, profile, rnd, opts) {
    opts = opts || {};
    const street = opts.street || 'flop';
    const tier = opts.tier || 'medium';
    const madeCat = opts.madeCategory != null ? opts.madeCategory : 0;
    const r = rnd != null ? rnd : Math.random();
    const strict = profile.preflopStrict != null && profile.preflopStrict >= 0.99;
    const mwFace = multiwayFacingScale(opts, profile);

    if (opts.neverFold) {
      if (r < 0.18) return 'raise';
      return 'call';
    }

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
    let bluffRaise = clamp(0.1 * p.raiseFreqMult * p.bluffFreqMult * mwFace.bluff, 0.02, 0.48);
    let valueRaise = clamp(0.22 * p.raiseFreqMult * mwFace.raise, 0.06, 0.5);

    if (street === 'river') {
      bluffRaise = clamp(bluffRaise * 0.45, 0.01, 0.18);
      if ((tier === 'weak' || strength < 0.35) && strength <= potOdds + 0.05) {
        if (!canAggressWithoutTrash(strength, opts, profile)) return 'fold';
        return r < bluffRaise ? 'raise' : 'fold';
      }
    }

    if (strength > 0.72) return r < valueRaise ? 'raise' : 'call';
    if (strength > potOdds + 0.08) {
      return r < clamp(0.82 * p.callMult * mwFace.call, 0.28, 0.96) ? 'call' : 'fold';
    }
    if (strength > potOdds - 0.05) {
      return r < clamp(0.48 * p.callMult * mwFace.call, 0.14, 0.82) ? 'call' : 'fold';
    }
    if (canAggressWithoutTrash(strength, opts, profile) && r < bluffRaise) return 'raise';
    return r < clamp(0.14 * p.callMult * mwFace.call, 0.03, 0.38) ? 'call' : 'fold';
  }

  /** Acción postflop cuando el villano puede apostar o pasar (lead / probe). */
  function postflopLead(strength, profile, villainIsAgg, rnd, opts) {
    opts = opts || {};
    const street = opts.street || 'flop';
    const tier = opts.tier || 'medium';
    const madeCat = opts.madeCategory != null ? opts.madeCategory : 0;
    const r = rnd != null ? rnd : Math.random();
    const strict = profile.preflopStrict != null && profile.preflopStrict >= 0.99;
    const mwLead = multiwayLeadScale(opts, profile);

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

    if (!canAggressWithoutTrash(strength, opts, profile)) {
      return 'check';
    }

    if (street === 'river') {
      if (tier === 'weak' || strength < 0.32) {
        return r < clamp(0.04 * p.bluffFreqMult, 0.01, 0.1) ? 'bet' : 'check';
      }
      if (tier === 'medium' && strength < 0.48) {
        return r < clamp(0.07 * p.betFreqMult, 0.02, 0.18) ? 'bet' : 'check';
      }
    }

    const bluffMult = (strength <= 0.28 ? p.bluffFreqMult : (strength <= 0.42 ? p.bluffFreqMult * 0.75 : 1)) * mwLead.bluff;
    let betFreq;
    if (villainIsAgg) {
      if (strength > 0.68) betFreq = clamp(0.58 * p.betFreqMult * mwLead.cbet, 0.18, 0.92);
      else if (strength > 0.42) betFreq = clamp(0.34 * p.betFreqMult * mwLead.cbet, 0.1, 0.68);
      else if (strength > 0.22) betFreq = clamp(0.38 * p.betFreqMult * bluffMult, 0.1, 0.72);
      else betFreq = clamp(0.22 * p.betFreqMult * bluffMult, 0.06, 0.58);
    } else {
      if (strength > 0.68) betFreq = clamp(0.48 * p.betFreqMult * mwLead.cbet, 0.14, 0.82);
      else if (strength > 0.42) betFreq = clamp(0.28 * p.betFreqMult * mwLead.cbet, 0.08, 0.58);
      else if (strength > 0.22) betFreq = clamp(0.34 * p.betFreqMult * bluffMult, 0.08, 0.65);
      else betFreq = clamp(0.18 * p.betFreqMult * bluffMult, 0.05, 0.52);
    }
    return r < betFreq ? 'bet' : 'check';
  }

  function betSizeBB(potBB, profile, rnd, opts) {
    opts = opts || {};
    const pot = Math.max(potBB || 1, 0.1);

    // Override desde strategy size key / fracción muestreada
    if (opts.frac != null && opts.frac > 0) {
      return Math.round(pot * opts.frac * 100) / 100;
    }
    if (opts.sizeKey) {
      const VS = global.GTOVillainSizing;
      if (VS && VS.amountFromKey) {
        return VS.amountFromKey(pot, opts.sizeKey, null, profile, rnd, opts);
      }
      const map = { bet_33: 0.33, bet_66: 0.66, bet_100: 1, bet_125: 1.25, overbet: 1.5, bet: 0.5 };
      if (map[opts.sizeKey] != null) return Math.round(pot * map[opts.sizeKey] * 100) / 100;
    }

    const mult = (profile.postflop && profile.postflop.betSizeMult) || 1;
    const r = rnd != null ? rnd : Math.random();
    let frac = 0.5 * mult;
    if (mult >= 1.2 && r < 0.28) frac = clamp(0.72 * mult, 0.55, 1.05);
    else if (mult <= 0.85) frac = clamp(0.38 * mult, 0.28, 0.55);
    else if (r < 0.22) frac = clamp(0.66 * mult, 0.45, 0.9);

    // Pros: ocasionalmente sizing polar / overbet en river
    const isPro = profile.preflopStrict >= 0.99 || profile.id === 'pro';
    if (isPro && opts.street === 'river') {
      const LP = global.GTOVillainLinePolicy;
      const strength = opts.strength || 0;
      if (LP && LP.overbetEligible && LP.overbetEligible({
        street: 'river',
        strength: strength,
        band: strength > 0.78 ? 'value' : (strength < 0.3 ? 'air' : 'merge'),
        spr: opts.spr,
        stackBB: opts.stackBB,
        formatHub: opts.formatHub,
        gameType: opts.gameType,
        polarization: strength > 0.75 || strength < 0.3 ? 0.6 : 0.35
      }) && r < 0.18 * ((profile.postflop && profile.postflop.overbetWeight) || 1)) {
        frac = clamp(1.35 + r * 0.35, 1.25, 1.7);
      }
    }

    if (opts.street === 'river' && (opts.strength || 0) < 0.55 && frac <= 1.05) {
      frac = clamp(frac * 0.55, 0.25, 0.5);
    }
    return Math.round(pot * frac * 100) / 100;
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
