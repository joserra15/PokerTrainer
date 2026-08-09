/*
 * icmLite.js — ICM aproximado para spins 3-max / burbuja MTT (IMP-39).
 * No sustituye un modelo ICM completo; da presión relativa chip-EV → $EV.
 */
(function (global) {
  'use strict';

  /** Payouts spin aprox. sobre prizepool normalizado a 1 (2× BI típico). */
  const SPIN_PAYOUTS_2X = [0.65, 0.35, 0];

  /**
   * Harville simplificado: P(1º) ∝ stack; P(2º) condicionado.
   * `payouts` suma ~1 (fracciones del prizepool).
   */
  function icmEquities(stacks, payouts) {
    const n = stacks.length;
    if (n < 2 || n > 4) return null;
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

  function annotateHand(hand, decisions) {
    if (!hand || !decisions || !decisions.length) return;
    const kind = hand.gameKind || 'cash';
    if (kind !== 'spin' && kind !== 'mtt' && kind !== 'sng') return;
    const seats = hand.seats || [];
    if (seats.length < 2 || seats.length > 4) return;
    const bb = hand.bb || 1;
    const stacks = seats.map((s) => Math.max(0, (Number(s.stack) || 0) / bb));
    const hero = hand.hero;
    const heroIdx = seats.findIndex((s) => s.name === hero);
    if (heroIdx < 0) return;

    if (kind !== 'spin') {
      const phase = hand.mttPhase || '';
      const stackBB = hand.stackDepthBB;
      if (stackBB != null && stackBB <= 20) {
        decisions.forEach((d) => {
          if (d.street !== 'preflop') return;
          d.icmNote = 'Stack corto en ' + (phase || 'torneo') + ' (~' + Math.round(stackBB)
            + ' bb): prioriza $EV/ICM frente a chipEV puro.';
          d.icmLite = true;
        });
      }
      return;
    }

    const payouts = SPIN_PAYOUTS_2X.slice(0, seats.length);
    while (payouts.length < seats.length) payouts.push(0);
    const pressure = icmPressure(stacks, payouts);
    if (!pressure) return;
    const pHero = pressure[heroIdx];
    const eq = icmEquities(stacks, payouts);
    hand.icmLite = {
      stacksBB: stacks.map((x) => Math.round(x * 10) / 10),
      equities: eq,
      pressure: pressure,
      heroPressure: pHero,
      note: pHero > 0.05
        ? 'ICM lite: tu stack está sobrevalorado en chips → juega más tight (especialmente shove/call).'
        : (pHero < -0.05
          ? 'ICM lite: puedes aplicar más presión; chipEV puro te infravalora.'
          : 'ICM lite: presión moderada; chipEV ≈ $EV en este spot.')
    };
    decisions.forEach((d) => {
      if (d.street !== 'preflop') return;
      d.icmLite = true;
      d.icmNote = hand.icmLite.note;
      d.icmPressure = pHero;
    });
  }

  global.PTIcmLite = {
    icmEquities: icmEquities,
    icmPressure: icmPressure,
    annotateHand: annotateHand,
    SPIN_PAYOUTS_2X: SPIN_PAYOUTS_2X
  };
})(typeof window !== 'undefined' ? window : globalThis);
