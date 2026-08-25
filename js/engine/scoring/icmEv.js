/*
 * icmEv.js — ICM aproximado para grading del entrenador (spins / MTT late).
 * Harville simplificado + estructura MTT lite (buy-in / puestos / field).
 * No sustituye un solver ICM completo.
 */
(function (global) {
  'use strict';

  const Tax = function () { return global.PTFormatTaxonomy; };

  function icmEquities(stacks, payouts) {
    const n = stacks.length;
    if (n < 2 || n > 9) return null;
    const total = stacks.reduce((s, x) => s + Math.max(0, Number(x) || 0), 0);
    if (total <= 0) return null;
    const pays = (payouts && payouts.length) ? payouts.slice(0, n) : null;
    if (!pays) return null;

    const pFirst = stacks.map((s) => Math.max(0, Number(s) || 0) / total);
    const pSecond = new Array(n).fill(0);
    for (let w = 0; w < n; w++) {
      const rem = total - Math.max(0, Number(stacks[w]) || 0);
      if (rem <= 0) continue;
      for (let j = 0; j < n; j++) {
        if (j === w) continue;
        pSecond[j] += pFirst[w] * (Math.max(0, Number(stacks[j]) || 0) / rem);
      }
    }
    const eq = new Array(n).fill(0);
    // Lite: Harville 1º/2º; el 3º absorbe el resto del ladder (puestos 3+).
    let payThirdPlus = 0;
    for (let k = 2; k < pays.length; k++) payThirdPlus += pays[k] || 0;
    for (let i = 0; i < n; i++) {
      eq[i] = (pFirst[i] || 0) * (pays[0] || 0) + (pSecond[i] || 0) * (pays[1] || 0);
      if (payThirdPlus > 0) {
        const pThird = Math.max(0, 1 - (pFirst[i] || 0) - (pSecond[i] || 0));
        eq[i] += pThird * payThirdPlus;
      }
      eq[i] = Math.round(eq[i] * 1000) / 1000;
    }
    return eq;
  }

  function chipEvShare(stacks) {
    const total = stacks.reduce((s, x) => s + Math.max(0, Number(x) || 0), 0);
    if (total <= 0) return stacks.map(() => 0);
    return stacks.map((s) => Math.max(0, Number(s) || 0) / total);
  }

  /** >0 ⇒ stack sobrevalorado en chips (jugar más tight). */
  function icmPressure(stacks, payouts) {
    const eq = icmEquities(stacks, payouts);
    const chip = chipEvShare(stacks);
    if (!eq) return null;
    const prize = (payouts || []).reduce((s, x) => s + x, 0) || 1;
    return eq.map((e, i) => Math.round(((chip[i] || 0) * prize - e) * 1000) / 1000);
  }

  /**
   * Bubble factor aproximado hero vs villain:
   * BF ≈ (ΔchipEV risk) / (Δ$EV risk) — aquí usamos ratio presión.
   */
  function bubbleFactor(stacks, heroIdx, villainIdx, payouts) {
    const pressure = icmPressure(stacks, payouts);
    if (!pressure) return 1;
    const pH = pressure[heroIdx] || 0;
    // Más presión ⇒ BF más alto (llamar/farolear cuesta más en $EV).
    const bf = 1 + Math.max(0, pH) * 4 + Math.max(0, -(pressure[villainIdx] || 0)) * 1.5;
    return Math.round(Math.min(3.5, Math.max(0.7, bf)) * 100) / 100;
  }

  function defaultStacks(input) {
    const hero = Number(input.heroStackBB != null ? input.heroStackBB : input.effStack) || 25;
    const villain = Number(input.villainStackBB != null ? input.villainStackBB : input.effStack) || hero;
    const n = Number(input.tableMax) || (input.gameType === 'spin3' ? 3 : 2);
    const stacks = [hero, villain];
    while (stacks.length < Math.min(n, 3)) {
      stacks.push(Math.max(8, Math.round((hero + villain) / 2)));
    }
    return stacks;
  }

  /**
   * Sintetiza stacks del field para ICM lite.
   * Cap MTT_ICM_STACK_CAP (9): mesa real + fillers; si playersLeft > cap,
   * 1–2 buckets agregados con el stack medio del field lejano.
   */
  function synthesizeFieldStacks(seedStacks, playersLeft, rnd) {
    const Taxo = Tax();
    const cap = (Taxo && Taxo.MTT_ICM_STACK_CAP) || 9;
    const left = Math.max(2, Math.min((Taxo && Taxo.MTT_PLAYERS_LEFT_MAX) || 50, Math.round(Number(playersLeft) || seedStacks.length)));
    const seeds = (seedStacks || []).filter(function (s) { return typeof s === 'number' && s > 0; });
    if (!seeds.length) seeds.push(25);
    const avg = seeds.reduce(function (a, b) { return a + b; }, 0) / seeds.length;
    const rand = typeof rnd === 'function' ? rnd : Math.random;
    const stacks = seeds.slice();

    const targetExplicit = Math.min(left, cap);
    let i = 0;
    while (stacks.length < targetExplicit) {
      // Perfiles rotativos: short / mid / cover alrededor de la media.
      const profile = i % 3;
      let bb;
      if (profile === 0) bb = Math.max(6, Math.round(avg * 0.55));
      else if (profile === 1) bb = Math.max(8, Math.round(avg));
      else bb = Math.max(10, Math.round(avg * 1.35));
      // jitter ±8 %
      const jitter = 1 + (rand() - 0.5) * 0.16;
      stacks.push(Math.max(5, Math.round(bb * jitter)));
      i++;
    }

    if (left > cap) {
      // Agregar field lejano en 1–2 buckets (masa de fichas restante).
      const remote = left - stacks.length;
      if (remote > 0) {
        const bucketAvg = Math.max(8, Math.round(avg * 0.9));
        if (remote === 1) {
          stacks[stacks.length - 1] = Math.max(5, stacks[stacks.length - 1] + bucketAvg);
        } else {
          const half = Math.floor(remote / 2);
          const other = remote - half;
          // Sustituir los dos últimos fillers por buckets ponderados (masa ≈ remote * avg).
          if (stacks.length >= 2) {
            stacks[stacks.length - 2] = Math.max(5, Math.round(bucketAvg * half));
            stacks[stacks.length - 1] = Math.max(5, Math.round(bucketAvg * other * 1.05));
          }
        }
      }
    }

    return stacks.slice(0, cap);
  }

  function resolvePayouts(input) {
    const Taxo = Tax();
    if (input.icmPayouts && input.icmPayouts.length) return input.icmPayouts.slice();
    if (Taxo && input.spinPayout && Taxo.spinPayouts) return Taxo.spinPayouts(input.spinPayout);
    if (input.gameType === 'spin3' || (input.formatHub === 'spin')) {
      return (Taxo && Taxo.spinPayouts) ? Taxo.spinPayouts('2x') : [0.65, 0.35, 0];
    }
    // MTT con estructura lite
    if (Taxo && Taxo.mttPayoutsForStructure && Taxo.hasMttStructure && Taxo.hasMttStructure(input)) {
      return Taxo.mttPayoutsForStructure(input);
    }
    if (Taxo && Taxo.mttPayoutsForStructure && input.placesPaid) {
      return Taxo.mttPayoutsForStructure({
        playersLeft: input.playersLeft || input.placesPaid,
        placesPaid: input.placesPaid,
        mttPayoutPreset: input.mttPayoutPreset || 'standard',
        mttPayouts: input.mttPayouts
      });
    }
    // Fallback legacy: top-heavy 3 pays
    return [0.5, 0.3, 0.2];
  }

  /**
   * Ajusta el vector de premios a nStacks.
   * Conserva ceros de burbuja (unpaid) al final; comprime el ladder pagado en el resto.
   */
  function alignPayoutsToStacks(payouts, nStacks) {
    const n = Math.max(2, Math.round(Number(nStacks) || 2));
    const raw = (payouts || []).map(function (x) { return Math.max(0, Number(x) || 0); });
    if (!raw.length) {
      const fallback = [0.5, 0.3, 0.2];
      while (fallback.length < n) fallback.push(0);
      return fallback.slice(0, n);
    }
    if (raw.length === n) return raw.slice();

    const unpaid = raw.filter(function (p) { return !(p > 0); }).length;
    const paid = raw.filter(function (p) { return p > 0; });
    const keepUnpaid = Math.min(unpaid, Math.max(0, n - 2));
    const paidSlots = n - keepUnpaid;

    let compressed = [];
    if (paid.length <= paidSlots) {
      compressed = paid.slice();
      while (compressed.length < paidSlots) {
        // repartir masa ya normalizada: no inventar premios; pad 0 solo si hace falta
        compressed.push(0);
      }
    } else {
      // Conservar 1º y 2º; fusionar el resto del ladder pagado en los slots medios + último pagado.
      compressed.push(paid[0] || 0);
      if (paidSlots >= 2) compressed.push(paid[1] || 0);
      const rest = paid.slice(2);
      const restSum = rest.reduce(function (s, x) { return s + x; }, 0);
      const midSlots = paidSlots - 2;
      if (midSlots <= 0) {
        // Solo 1–2 slots pagados: volcar resto en el último pagado disponible
        if (compressed.length) compressed[compressed.length - 1] += restSum;
      } else if (midSlots === 1) {
        compressed.push(restSum);
      } else {
        // Distribuir resto en midSlots con pesos decrecientes
        const weights = [];
        for (let i = 0; i < midSlots; i++) weights.push(1 / Math.pow(i + 1, 0.9));
        const wSum = weights.reduce(function (s, x) { return s + x; }, 0) || 1;
        for (let i = 0; i < midSlots; i++) {
          compressed.push(Math.round((restSum * weights[i] / wSum) * 1000) / 1000);
        }
      }
    }

    while (compressed.length < paidSlots) compressed.push(0);
    compressed = compressed.slice(0, paidSlots);
    for (let u = 0; u < keepUnpaid; u++) compressed.push(0);
    while (compressed.length < n) compressed.push(0);
    return compressed.slice(0, n);
  }

  function shouldApply(input) {
    const Taxo = Tax();
    if (input && input.icmEnabled === false) return false;
    if (input && input.icmEnabled === true) return true;
    if (!Taxo || !Taxo.usesIcm) {
      const hub = input && (input.formatHub || (input.gameType === 'spin3' ? 'spin' : null));
      return hub === 'spin' || hub === 'mtt';
    }
    return Taxo.usesIcm(input);
  }

  /**
   * Escala pérdidas EV de faroles/calls spewy cuando hay presión ICM.
   * Devuelve factor >= 1 para castigar spew; < 1 rara vez (short stack applying pressure).
   */
  function riskMultiplier(input) {
    if (!shouldApply(input)) return 1;
    const stacks = input.icmStacksBB || defaultStacks(input);
    const payouts = alignPayoutsToStacks(resolvePayouts(input), stacks.length);
    const heroIdx = input.icmHeroIdx != null ? input.icmHeroIdx : 0;
    const villainIdx = input.icmVillainIdx != null ? input.icmVillainIdx : 1;
    const bf = bubbleFactor(stacks, heroIdx, villainIdx, payouts);
    const pressure = icmPressure(stacks, payouts);
    const pHero = pressure ? (pressure[heroIdx] || 0) : 0;
    let mult = bf;
    // Faroles y calls marginales cuestan más con presión positiva.
    const action = input.chosenAction || '';
    const isAggro = action === 'bet' || action === 'raise' || (action && action.indexOf('bet_') === 0);
    const isCall = action === 'call';
    if (pHero > 0.03 && (isAggro || isCall)) mult *= 1 + Math.min(0.8, pHero * 3);
    if (pHero < -0.05 && action === 'fold') mult *= 0.85;
    return Math.round(Math.min(2.8, Math.max(0.75, mult)) * 1000) / 1000;
  }

  function adjustEvLoss(evLossBB, input) {
    const base = Number(evLossBB) || 0;
    if (base <= 0) return base;
    return Math.round(base * riskMultiplier(input) * 100) / 100;
  }

  function prizePoolEstimate(input) {
    const Taxo = Tax();
    if (Taxo && Taxo.estimatePrizePool) {
      const pool = Taxo.estimatePrizePool(input);
      if (pool != null) return pool;
    }
    const bi = Number(input && input.buyIn);
    const left = Number(input && input.playersLeft);
    const paid = Number(input && input.placesPaid);
    const entries = Number(input && input.entries);
    if (!(bi > 0)) return null;
    const n = Math.max(entries || 0, left || 0, paid || 0, 2);
    return Math.round(bi * n * 100) / 100;
  }

  function annotateDecision(decision, input) {
    if (!decision || !shouldApply(input)) return decision;
    const stacks = input.icmStacksBB || defaultStacks(input);
    const payouts = alignPayoutsToStacks(resolvePayouts(input), stacks.length);
    const pressure = icmPressure(stacks, payouts);
    const heroIdx = input.icmHeroIdx != null ? input.icmHeroIdx : 0;
    const pHero = pressure ? (pressure[heroIdx] || 0) : 0;
    const bf = bubbleFactor(stacks, heroIdx, input.icmVillainIdx != null ? input.icmVillainIdx : 1, payouts);
    const unpaid = payouts.filter(function (p) { return !(p > 0); }).length;
    decision.icmLite = true;
    decision.icmPressure = pHero;
    decision.bubbleFactor = bf;
    if (unpaid > 0 && pHero > 0.02) {
      decision.icmNote = 'Burbuja / pay jump: hay puestos sin premio. Prioriza el valor del min-cash; menos spew y calls ligeros.';
    } else if (pHero > 0.05) {
      decision.icmNote = 'Tienes mucho que perder: prioriza el valor del premio (juega más tight; menos spew y calls ligeros).';
    } else if (pHero < -0.05) {
      decision.icmNote = 'Puedes aplicar presión: en fichas «pareces» peor de lo que vales en premio.';
    } else {
      decision.icmNote = 'Presión moderada: fichas y premio van más o menos alineados.';
    }
    const pool = prizePoolEstimate(input);
    if (pool != null && input.buyIn != null) {
      decision.icmBuyIn = Number(input.buyIn);
      decision.icmPrizePoolEst = pool;
    }
    if (input.playersLeft != null) decision.icmPlayersLeft = Number(input.playersLeft);
    if (input.placesPaid != null) decision.icmPlacesPaid = Number(input.placesPaid);
    return decision;
  }

  function collectSeedStacks(hand, heroBB, villainBB, heroSeat, villainSeat, tableMax) {
    const stacks = [heroBB, villainBB];
    if (hand && hand.stacks && tableMax >= 3) {
      Object.keys(hand.stacks).forEach(function (k) {
        if (k === 'hero' || k === 'villain' || k === heroSeat || k === villainSeat) return;
        const bb = hand.stacks[k];
        if (typeof bb === 'number' && bb > 0 && stacks.length < tableMax) stacks.push(bb);
      });
    }
    while (stacks.length < Math.min(3, tableMax)) {
      stacks.push(Math.max(8, Math.round((heroBB + villainBB) / 2)));
    }
    return stacks;
  }

  function contextForHand(hand, playConfig) {
    const cfg = playConfig || (hand && hand.playConfig) || {};
    const Taxo = Tax();
    const hub = Taxo
      ? Taxo.normalizeHub(cfg.formatHub || Taxo.hubFromGameType(cfg.gameType))
      : 'cash';
    if (hub === 'cash') return null;
    const heroSeat = hand && (hand.displayHeroPos || (hand.hero && hand.hero.pos));
    const villainSeat = hand && hand.villain && hand.villain.pos;
    const heroBB = hand && hand.stacks && heroSeat && hand.stacks[heroSeat] != null
      ? hand.stacks[heroSeat]
      : (hand && hand.stacks && hand.stacks.hero != null
        ? hand.stacks.hero
        : (hand && hand.effStack) || 25);
    const villainBB = hand && hand.stacks && villainSeat && hand.stacks[villainSeat] != null
      ? hand.stacks[villainSeat]
      : (hand && hand.stacks && hand.stacks.villain != null
        ? hand.stacks.villain
        : heroBB);
    const tableMax = hub === 'spin' ? 3 : (cfg.gameType === 'cash9' || cfg.gameType === 'mtt' ? 9 : 3);
    let seedStacks = collectSeedStacks(hand, heroBB, villainBB, heroSeat, villainSeat, tableMax);
    let stacks = seedStacks;
    let payouts;

    if (hub === 'spin') {
      payouts = (Taxo && Taxo.spinPayouts) ? Taxo.spinPayouts(cfg.spinPayout || '2x') : [0.65, 0.35, 0];
    } else {
      // MTT: síntesis de field si hay estructura
      const playersLeft = cfg.playersLeft != null ? Number(cfg.playersLeft) : null;
      if (playersLeft && playersLeft >= 2) {
        stacks = synthesizeFieldStacks(seedStacks, playersLeft);
      } else {
        while (stacks.length < Math.min(3, tableMax)) {
          stacks.push(Math.max(8, Math.round((heroBB + villainBB) / 2)));
        }
      }
      if (Taxo && Taxo.hasMttStructure && Taxo.hasMttStructure(cfg) && Taxo.mttPayoutsForStructure) {
        payouts = Taxo.mttPayoutsForStructure(cfg);
      } else if (cfg.icmPayouts && cfg.icmPayouts.length) {
        payouts = cfg.icmPayouts.slice();
      } else {
        payouts = [0.5, 0.3, 0.2];
      }
      payouts = alignPayoutsToStacks(payouts, stacks.length);
    }

    return {
      formatHub: hub,
      gameType: cfg.gameType,
      mttPhase: cfg.mttPhase,
      spinPayout: cfg.spinPayout || '2x',
      buyIn: cfg.buyIn != null ? cfg.buyIn : null,
      buyInFee: cfg.buyInFee != null ? cfg.buyInFee : null,
      playersLeft: cfg.playersLeft != null ? cfg.playersLeft : null,
      placesPaid: cfg.placesPaid != null ? cfg.placesPaid : null,
      mttPayoutPreset: cfg.mttPayoutPreset || null,
      mttStructureSituation: cfg.mttStructureSituation || null,
      icmEnabled: true,
      icmStacksBB: stacks,
      icmPayouts: payouts,
      icmHeroIdx: 0,
      icmVillainIdx: 1,
      tableMax: tableMax,
      heroStackBB: heroBB,
      villainStackBB: villainBB,
      effStack: hand && hand.effStack
    };
  }

  global.GTOIcmEv = {
    icmEquities: icmEquities,
    icmPressure: icmPressure,
    bubbleFactor: bubbleFactor,
    riskMultiplier: riskMultiplier,
    adjustEvLoss: adjustEvLoss,
    annotateDecision: annotateDecision,
    shouldApply: shouldApply,
    contextForHand: contextForHand,
    resolvePayouts: resolvePayouts,
    synthesizeFieldStacks: synthesizeFieldStacks,
    alignPayoutsToStacks: alignPayoutsToStacks,
    prizePoolEstimate: prizePoolEstimate
  };
})(typeof window !== 'undefined' ? window : globalThis);
