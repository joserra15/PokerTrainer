/*
 * icmEv.js — ICM aproximado para grading del entrenador (spins / MTT late).
 * Harville simplificado; no sustituye un solver ICM completo.
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
    for (let i = 0; i < n; i++) {
      eq[i] = (pFirst[i] || 0) * (pays[0] || 0) + (pSecond[i] || 0) * (pays[1] || 0);
      if (pays[2]) {
        const pThird = Math.max(0, 1 - (pFirst[i] || 0) - (pSecond[i] || 0));
        eq[i] += pThird * pays[2];
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

  function resolvePayouts(input) {
    const Taxo = Tax();
    if (input.icmPayouts && input.icmPayouts.length) return input.icmPayouts.slice();
    if (Taxo && input.spinPayout && Taxo.spinPayouts) return Taxo.spinPayouts(input.spinPayout);
    if (input.gameType === 'spin3' || (input.formatHub === 'spin')) {
      return (Taxo && Taxo.spinPayouts) ? Taxo.spinPayouts('2x') : [0.65, 0.35, 0];
    }
    // MTT bubble simplificada: top-heavy 3 pays
    return [0.5, 0.3, 0.2];
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
    const payouts = resolvePayouts(input);
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

  function annotateDecision(decision, input) {
    if (!decision || !shouldApply(input)) return decision;
    const stacks = input.icmStacksBB || defaultStacks(input);
    const payouts = resolvePayouts(input);
    const pressure = icmPressure(stacks, payouts);
    const heroIdx = input.icmHeroIdx != null ? input.icmHeroIdx : 0;
    const pHero = pressure ? (pressure[heroIdx] || 0) : 0;
    const bf = bubbleFactor(stacks, heroIdx, input.icmVillainIdx != null ? input.icmVillainIdx : 1, payouts);
    decision.icmLite = true;
    decision.icmPressure = pHero;
    decision.bubbleFactor = bf;
    decision.icmNote = pHero > 0.05
      ? 'ICM: stack sobrevalorado en chips → prioriza $EV (menos spew / calls ligeros).'
      : (pHero < -0.05
        ? 'ICM: puedes aplicar presión; chipEV puro te infravalora.'
        : 'ICM: presión moderada; chipEV ≈ $EV.');
    return decision;
  }

  function contextForHand(hand, playConfig) {
    const cfg = playConfig || (hand && hand.playConfig) || {};
    const Taxo = Tax();
    const hub = Taxo
      ? Taxo.normalizeHub(cfg.formatHub || Taxo.hubFromGameType(cfg.gameType))
      : 'cash';
    if (hub === 'cash') return null;
    const heroBB = hand && hand.stacks && hand.stacks.hero != null
      ? hand.stacks.hero
      : (hand && hand.effStack) || 25;
    const villainBB = hand && hand.stacks && hand.stacks.villain != null
      ? hand.stacks.villain
      : heroBB;
    const tableMax = hub === 'spin' ? 3 : (cfg.gameType === 'cash9' || cfg.gameType === 'mtt' ? 9 : 3);
    const stacks = [heroBB, villainBB];
    if (tableMax >= 3) stacks.push(Math.max(8, Math.round((heroBB + villainBB) / 2)));
    const payouts = hub === 'spin'
      ? ((Taxo && Taxo.spinPayouts) ? Taxo.spinPayouts(cfg.spinPayout || '2x') : [0.65, 0.35, 0])
      : [0.5, 0.3, 0.2];
    return {
      formatHub: hub,
      gameType: cfg.gameType,
      mttPhase: cfg.mttPhase,
      spinPayout: cfg.spinPayout || '2x',
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
    resolvePayouts: resolvePayouts
  };
})(typeof window !== 'undefined' ? window : globalThis);
