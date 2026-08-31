/*
 * villainSizing.js — Sampling de bet/raise size para villanos pro
 * desde keys de estrategia (bet_33/66/100/overbet) + raises contextuales.
 */
(function (global) {
  'use strict';

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function round2(x) { return Math.round(x * 100) / 100; }

  const SIZE_KEYS = [
    { key: 'bet_33', frac: 0.33 },
    { key: 'bet_66', frac: 0.66 },
    { key: 'bet_100', frac: 1.0 },
    { key: 'bet_125', frac: 1.25 },
    { key: 'overbet', frac: 1.5 }
  ];

  function fracForKey(key) {
    for (let i = 0; i < SIZE_KEYS.length; i++) {
      if (SIZE_KEYS[i].key === key) return SIZE_KEYS[i].frac;
    }
    if (key === 'bet') return 0.5;
    return null;
  }

  /**
   * Inyecta peso overbet en un mapa lead si el spot es elegible.
   */
  function injectOverbet(strat, ctx) {
    const LP = global.GTOVillainLinePolicy;
    const out = Object.assign({}, strat || {});
    const w = LP && LP.overbetWeight ? LP.overbetWeight(ctx) : 0;
    if (w <= 0.01) return out;

    const from100 = out.bet_100 || 0;
    const from66 = out.bet_66 || 0;
    const take = Math.min(w, from100 * 0.7 + from66 * 0.25);
    if (take <= 0) {
      out.overbet = (out.overbet || 0) + w * 0.5;
      if (out.check != null) out.check = Math.max(0, out.check - w * 0.5);
      return out;
    }
    let rem = take;
    const t100 = Math.min(from100 * 0.75, rem);
    out.bet_100 = from100 - t100;
    rem -= t100;
    if (rem > 0) {
      const t66 = Math.min(from66 * 0.35, rem);
      out.bet_66 = from66 - t66;
      rem -= t66;
    }
    out.overbet = (out.overbet || 0) + take;
    return out;
  }

  /**
   * Muestrea acción de lead + size key desde strategy freqs.
   * Retorna { action: 'bet'|'check', sizeKey, frac, amountBB }
   */
  function sampleLeadFromStrategy(strat, potBB, ctx, rnd) {
    ctx = ctx || {};
    rnd = rnd != null ? rnd : Math.random();
    potBB = Math.max(potBB || 1, 0.1);

    let freqs = Object.assign({}, strat || {});
    if (ctx.preferSizeKey === 'overbet' || (ctx.street === 'river')) {
      freqs = injectOverbet(freqs, ctx);
    }

    // Preferencia forzada de size (line policy)
    if (ctx.preferSizeKey && fracForKey(ctx.preferSizeKey) != null) {
      const pk = ctx.preferSizeKey;
      let betP = 0;
      SIZE_KEYS.forEach(function (s) { betP += freqs[s.key] || 0; });
      betP += freqs.bet || 0;
      const checkP = freqs.check != null ? freqs.check : Math.max(0, 1 - betP);
      if (rnd < checkP && ctx.actionHint !== 'bet') {
        return { action: 'check', sizeKey: null, frac: 0, amountBB: 0 };
      }
      const frac = fracForKey(pk);
      return {
        action: 'bet',
        sizeKey: pk,
        frac: frac,
        amountBB: round2(potBB * frac)
      };
    }

    const entries = [{ key: 'check', p: freqs.check || 0, frac: 0 }];
    SIZE_KEYS.forEach(function (s) {
      entries.push({ key: s.key, p: freqs[s.key] || 0, frac: s.frac });
    });
    if (freqs.bet) entries.push({ key: 'bet', p: freqs.bet, frac: 0.5 });

    let sum = 0;
    entries.forEach(function (e) { sum += e.p; });
    if (sum <= 0) return { action: 'check', sizeKey: null, frac: 0, amountBB: 0 };

    let acc = 0;
    const roll = rnd * sum;
    for (let i = 0; i < entries.length; i++) {
      acc += entries[i].p;
      if (roll <= acc) {
        const e = entries[i];
        if (e.key === 'check') return { action: 'check', sizeKey: null, frac: 0, amountBB: 0 };
        let frac = e.frac;
        // Variación ligera en overbet 1.25–1.75
        if (e.key === 'overbet' || e.key === 'bet_125') {
          const r2 = (rnd * 7) % 1;
          frac = e.key === 'bet_125' ? 1.25 : clamp(1.35 + r2 * 0.4, 1.25, 1.75);
        }
        return {
          action: 'bet',
          sizeKey: e.key,
          frac: frac,
          amountBB: round2(potBB * frac)
        };
      }
    }
    return { action: 'check', sizeKey: null, frac: 0, amountBB: 0 };
  }

  /**
   * Tamaño de raise contextual (sustituye bet×3 fijo).
   * facingBetBB = tamaño de la apuesta a la que se enfrenta (to-call target / street bet).
   */
  function raiseSizeBB(potBeforeBB, facingBetBB, ctx, rnd) {
    ctx = ctx || {};
    rnd = rnd != null ? rnd : Math.random();
    const pot = Math.max(potBeforeBB || 1, 0.1);
    const face = Math.max(facingBetBB || 0, 0.01);
    const street = ctx.street || 'flop';
    const spr = ctx.spr != null ? ctx.spr : 8;
    const rem = ctx.remainingBB != null ? ctx.remainingBB : pot * spr;
    const FA = global.GTOVillainFormatAdjust;
    const m = FA && FA.multipliers ? FA.multipliers(ctx) : { jamBias: 1, overbet: 1, sizeSimple: false };
    const LP = global.GTOVillainLinePolicy;
    const preferOver = !!(ctx.preferOverbetRaise || (LP && LP.overbetEligible && LP.overbetEligible(ctx)));

    // Stack corto: jam
    const commitThresh = pot * clamp(2.2 / Math.max(m.jamBias, 0.8), 1.4, 2.8);
    if (rem <= commitThresh || (m.jamBias > 1.3 && rem <= pot * 3.2 && street !== 'flop')) {
      return round2(face + rem);
    }

    let mult;
    if (street === 'river' && preferOver && m.overbet > 0.4) {
      // Raise a overbet del pot final aproximado
      const targetPotFrac = clamp(1.25 + rnd * 0.45, 1.2, 1.8);
      const raiseTo = round2(pot + face + (pot + face) * (targetPotFrac - 1) * 0.5 + face * 1.2);
      // Más simple: raise to ~1.5× pot after call geometry → raiseSize ≈ face + pot*1.2
      const geo = round2(face + Math.max(pot * targetPotFrac, face * 2.8));
      return Math.max(geo, raiseTo, round2(face * 2.5));
    }

    if (street === 'flop') {
      // XR flop: 2.5–3.5× o ~70–100% pot
      if (ctx.lineIntent === 'checkRaise') {
        if (rnd < 0.45) {
          const potRaise = round2(face + pot * (0.7 + rnd * 0.3));
          return Math.max(potRaise, round2(face * 2.6));
        }
        mult = 2.6 + rnd * 0.9;
      } else {
        mult = 2.5 + rnd * 0.8;
      }
    } else if (street === 'turn') {
      mult = 2.4 + rnd * 0.7;
    } else {
      // River merge raises más pequeños en cash deep
      if ((ctx.hub === 'cash' || !ctx.hub) && (ctx.stackBB == null || ctx.stackBB >= 80)
        && ctx.strength != null && ctx.strength > 0.45 && ctx.strength < 0.75) {
        mult = 2.2 + rnd * 0.6;
      } else {
        mult = 2.5 + rnd * 0.9;
      }
    }

    if (m.sizeSimple) mult = clamp(mult, 2.2, 2.8);

    let raiseTo = round2(face * mult);
    // Asegura raise mínimo legal ~2× face en la mayoría de spots
    if (raiseTo < face * 2) raiseTo = round2(face * 2);
    // Cap a stack
    if (raiseTo - face > rem) raiseTo = round2(face + rem);
    return raiseTo;
  }

  /** amountBB desde sizeKey/frac o fallback perfil. */
  function amountFromKey(potBB, sizeKey, frac, profile, rnd, opts) {
    potBB = Math.max(potBB || 1, 0.1);
    if (frac != null && frac > 0) return round2(potBB * frac);
    const f = fracForKey(sizeKey);
    if (f != null) {
      let use = f;
      if (sizeKey === 'overbet') use = clamp(1.35 + ((rnd != null ? rnd : Math.random()) * 0.4), 1.25, 1.75);
      return round2(potBB * use);
    }
    const VP = global.GTOVillainProfiles;
    if (VP && VP.betSizeBB) return VP.betSizeBB(potBB, profile, rnd, opts);
    return round2(potBB * 0.5);
  }

  global.GTOVillainSizing = {
    SIZE_KEYS: SIZE_KEYS,
    fracForKey: fracForKey,
    injectOverbet: injectOverbet,
    sampleLeadFromStrategy: sampleLeadFromStrategy,
    raiseSizeBB: raiseSizeBB,
    amountFromKey: amountFromKey
  };
})(typeof window !== 'undefined' ? window : global);
