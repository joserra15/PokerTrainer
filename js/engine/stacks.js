/*
 * stacks.js — Stacks de mesa: héroe configurable; cash ≈ héroe;
 * torneos/spins: mayoría mid, algunos short, algunos deep.
 */
(function (global) {
  'use strict';

  function round2(x) { return Math.round((Number(x) || 0) * 100) / 100; }

  function heroStackBB(config) {
    const PC = global.PTPlayConfig;
    if (PC && config) return PC.stackBB(config);
    const RR = global.GTORangesRegistry;
    if (RR && config) return RR.stackBB(RR.normalize(config));
    return 100;
  }

  function formatHubOf(config) {
    const Tax = global.PTFormatTaxonomy;
    if (!config) return 'cash';
    if (Tax) {
      return Tax.normalizeHub(config.formatHub || Tax.hubFromGameType(config.gameType));
    }
    if (config.formatHub === 'spin' || config.gameType === 'spin3') return 'spin';
    if (config.formatHub === 'mtt' || config.gameType === 'mtt') return 'mtt';
    return 'cash';
  }

  /**
   * Bandas absolutas de mesa según formato y stack del héroe.
   * Entrenar 10bb no implica mesa de 10bb: mayoría mid, algún short, algún deep.
   */
  function tournamentBands(hub, heroBB) {
    const h = Number(heroBB) || 25;
    if (hub === 'spin') {
      if (h <= 12) {
        return { short: [5, 12], mid: [14, 28], deep: [30, 55] };
      }
      if (h <= 20) {
        return { short: [6, 14], mid: [16, 30], deep: [32, 55] };
      }
      return { short: [8, 16], mid: [18, 32], deep: [35, 55] };
    }
    // MTT
    if (h <= 15) {
      return { short: [5, 14], mid: [18, 40], deep: [45, 100] };
    }
    if (h <= 30) {
      return { short: [8, 18], mid: [20, 42], deep: [48, 95] };
    }
    if (h <= 55) {
      return { short: [12, 28], mid: [30, 55], deep: [60, 120] };
    }
    return { short: [20, 45], mid: [55, 110], deep: [120, 200] };
  }

  function pickBand(rnd) {
    const r = rnd != null ? rnd : Math.random();
    // ~55% mid, ~25% short, ~20% deep
    if (r < 0.55) return 'mid';
    if (r < 0.80) return 'short';
    return 'deep';
  }

  function sampleInRange(lo, hi, rnd) {
    const a = Number(lo);
    const b = Number(hi);
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const t = rnd != null ? rnd : Math.random();
    return round2(min + t * (max - min));
  }

  /** Cash: stack villano cercano al héroe (≈82–118%). */
  function cashVillainStackBB(heroBB, rnd) {
    const r = rnd != null ? rnd : Math.random();
    return round2(heroBB * (0.82 + r * 0.36));
  }

  /**
   * Stack villano. Cash ≈ héroe; spin/mtt → bandas mid/short/deep.
   * @param {number} heroBB
   * @param {number} [rnd] — U(0,1) para la banda o el jitter cash
   * @param {object} [opts] — { formatHub|config, rnd2 } rnd2 = U(0,1) dentro de la banda
   */
  function villainStackBB(heroBB, rnd, opts) {
    const hub = (opts && opts.formatHub) || formatHubOf(opts && opts.config);
    if (hub === 'cash') return cashVillainStackBB(heroBB, rnd);

    const bands = tournamentBands(hub, heroBB);
    const band = pickBand(rnd);
    const range = bands[band] || bands.mid;
    const rnd2 = opts && opts.rnd2 != null ? opts.rnd2 : Math.random();
    // Mínimo jugable para opens ~2.5bb
    return Math.max(4, sampleInRange(range[0], range[1], rnd2));
  }

  function invested(hand, pos) {
    if (!hand || !pos) return 0;
    let inv = (hand.table && hand.table.invested && hand.table.invested[pos]) || 0;
    const heroSeat = hand.displayHeroPos || (hand.hero && hand.hero.pos);
    if (heroSeat === pos && hand.heroInvested != null && hand.heroInvested > inv) inv = hand.heroInvested;
    const vSeat = hand.villain && hand.villain.pos;
    if (vSeat === pos && hand.villainInvested != null && hand.villainInvested > inv) inv = hand.villainInvested;
    return inv;
  }

  function remaining(hand, pos) {
    if (!hand || !pos) return 0;
    const start = (hand.stacks && hand.stacks[pos]) || 0;
    return round2(Math.max(start - invested(hand, pos), 0));
  }

  function effectiveVs(hand, posA, posB) {
    return round2(Math.min(remaining(hand, posA), remaining(hand, posB)));
  }

  function effectiveForHero(hand) {
    if (!hand || !hand.hero || !hand.hero.pos) return heroStackBB(hand && hand.playConfig);
    const heroSeat = hand.displayHeroPos || hand.hero.pos;
    const villainSeat = hand.villain && hand.villain.pos;
    if (!hand.stacks || !villainSeat) {
      return remaining(hand, heroSeat) || heroStackBB(hand.playConfig);
    }
    const vSeat = (global.PTPlayConfig && hand.playConfig && global.PTPlayConfig.villainTableSeat)
      ? (global.PTPlayConfig.villainTableSeat(hand) || villainSeat)
      : villainSeat;
    return effectiveVs(hand, heroSeat, vSeat);
  }

  function initHandStacks(hand, positions, heroSeat, heroBB, rngFn, playConfig) {
    const rnd = rngFn || function () { return Math.random(); };
    const cfg = playConfig || (hand && hand.playConfig) || null;
    const hub = formatHubOf(cfg);
    hand.stacks = {};
    (positions || []).forEach(function (pos) {
      if (pos === heroSeat) hand.stacks[pos] = round2(heroBB);
      else {
        hand.stacks[pos] = villainStackBB(heroBB, rnd(), {
          formatHub: hub,
          config: cfg,
          rnd2: rnd()
        });
      }
    });
    hand.heroStackStart = round2(heroBB);
    // Alias para ICM / scoring (claves por asiento son la fuente de verdad)
    if (heroSeat && hand.stacks[heroSeat] != null) hand.stacks.hero = hand.stacks[heroSeat];
    const vSeat = hand.villain && hand.villain.pos;
    if (vSeat && hand.stacks[vSeat] != null) hand.stacks.villain = hand.stacks[vSeat];
  }

  function capToRemaining(hand, pos, amount) {
    return round2(Math.min(amount, remaining(hand, pos)));
  }

  function capTotalInvest(hand, pos, targetTotal) {
    const start = (hand.stacks && hand.stacks[pos]) || targetTotal;
    return round2(Math.min(targetTotal, start));
  }

  function isAllIn(hand, pos, addAmount) {
    return remaining(hand, pos) <= addAmount + 0.005;
  }

  function formatStackBB(hand, pos) {
    const rem = remaining(hand, pos);
    const fmt = global.GTOPotMath ? global.GTOPotMath.formatBB : String;
    return fmt(rem) + ' bb';
  }

  global.PTStacks = {
    round2, heroStackBB, villainStackBB, initHandStacks,
    tournamentBands, pickBand, formatHubOf,
    invested, remaining, effectiveVs, effectiveForHero,
    capToRemaining, capTotalInvest, isAllIn, formatStackBB
  };
})(window);
