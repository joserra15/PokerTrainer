/*
 * stacks.js — Stacks de mesa: héroe configurable, villanos cercanos, resto efectivo por asiento.
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

  /** Stack villano aleatorio cercano al del héroe (≈82–118%). */
  function villainStackBB(heroBB, rnd) {
    const r = rnd != null ? rnd : Math.random();
    return round2(heroBB * (0.82 + r * 0.36));
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

  function initHandStacks(hand, positions, heroSeat, heroBB, rngFn) {
    const rnd = rngFn || function () { return Math.random(); };
    hand.stacks = {};
    (positions || []).forEach(function (pos) {
      if (pos === heroSeat) hand.stacks[pos] = round2(heroBB);
      else hand.stacks[pos] = villainStackBB(heroBB, rnd());
    });
    hand.heroStackStart = round2(heroBB);
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
    invested, remaining, effectiveVs, effectiveForHero,
    capToRemaining, capTotalInvest, isAllIn, formatStackBB
  };
})(window);
