/*
 * stackCoverage.js — Quién cubre a quién en la mesa y rol de stack por asiento.
 *
 * El rol gobierna la asimetría ICM: el stack que cubre tiene bubble factor bajo
 * (puede presionar) y el cubierto lo tiene alto (sobre-foldea). El stack medio es
 * quien más presión siente; el short, menos de lo que parece.
 */
(function (global) {
  'use strict';

  const ROLE_COVER = 'cover';
  const ROLE_MID = 'mid';
  const ROLE_SHORT = 'short';
  /** Ratio mínimo para que una diferencia de stacks cambie el rol (no el all-in). */
  const MEANINGFUL = 1.25;

  function round2(x) { return Math.round((Number(x) || 0) * 100) / 100; }

  function ST() { return global.PTStacks; }

  function remainingBB(hand, pos) {
    const S = ST();
    if (S && hand && hand.stacks) return S.remaining(hand, pos);
    if (hand && hand.stacks && hand.stacks[pos] != null) return round2(hand.stacks[pos]);
    return 0;
  }

  /** Asientos con fichas: claves de hand.stacks sin los alias hero/villain. */
  function tableSeats(hand) {
    if (!hand || !hand.stacks) return [];
    return Object.keys(hand.stacks).filter(function (k) {
      return k !== 'hero' && k !== 'villain' && Number(hand.stacks[k]) > 0;
    });
  }

  /**
   * Cobertura entre dos asientos.
   * @returns {{ aBB:number, bBB:number, covers:boolean, covered:boolean, ratio:number, effBB:number }}
   *   covers: A cubre a B · covered: A está cubierto por B · ratio: stack de A / stack de B
   */
  function coverageFor(hand, posA, posB) {
    const a = remainingBB(hand, posA);
    const b = remainingBB(hand, posB);
    const ratio = b > 0 ? round2(a / b) : (a > 0 ? 99 : 1);
    return {
      aBB: a,
      bBB: b,
      effBB: round2(Math.min(a, b)),
      // Margen del 2 % para no etiquetar stacks prácticamente iguales.
      covers: a > b * 1.02,
      covered: b > a * 1.02,
      ratio: ratio
    };
  }

  /**
   * Rol de un stack dado el reparto de la mesa.
   * @param {number} bb — stack del asiento
   * @param {number[]} allBB — stacks de todos los asientos vivos (incluido el propio)
   */
  function roleForStack(bb, allBB) {
    const s = Number(bb) || 0;
    const list = (allBB || []).map(Number).filter(function (x) { return x > 0; });
    if (!s || list.length < 2) return null;
    const avg = list.reduce(function (acc, x) { return acc + x; }, 0) / list.length;
    const max = Math.max.apply(null, list);
    const others = Math.max(1, list.length - 1);
    // Para el rol solo cuentan las diferencias que cambian la estrategia (≥25 %):
    // en una mesa plana de 25bb nadie es cover ni short.
    const coversBig = list.filter(function (x) { return s >= x * MEANINGFUL; }).length;
    const coveredByBig = list.filter(function (x) { return x >= s * MEANINGFUL; }).length;

    // Chip lead claro, o cubre a la mayoría con un rival grande como máximo detrás:
    // ese asiento puede presionar aunque no sea el líder (de facto chip lead de la mano).
    if (s >= max - 0.01 && s >= avg * 1.2) return ROLE_COVER;
    if (coversBig / others >= 0.6 && coveredByBig <= 1 && s >= avg * 1.15) return ROLE_COVER;
    // Corto de verdad: push/fold o muy por debajo de la media.
    if (s <= 12 || s <= avg * 0.5 || coveredByBig / others >= 0.85) return ROLE_SHORT;
    return ROLE_MID;
  }

  /**
   * Rol y cobertura de cada asiento de la mesa.
   * @returns {Object<string,{bb:number,role:string,coversCount:number,coveredByCount:number,isChipLead:boolean}>}
   */
  function rolesForTable(hand) {
    const seats = tableSeats(hand);
    const out = {};
    if (seats.length < 2) return out;
    const bbBySeat = {};
    seats.forEach(function (pos) { bbBySeat[pos] = remainingBB(hand, pos); });
    const all = seats.map(function (pos) { return bbBySeat[pos]; });
    const max = Math.max.apply(null, all);
    seats.forEach(function (pos) {
      const bb = bbBySeat[pos];
      out[pos] = {
        bb: bb,
        role: roleForStack(bb, all),
        coversCount: all.filter(function (x) { return bb > x * 1.02; }).length,
        coveredByCount: all.filter(function (x) { return x > bb * 1.02; }).length,
        isChipLead: bb >= max - 0.01
      };
    });
    return out;
  }

  function avgStackBB(hand) {
    const seats = tableSeats(hand);
    if (!seats.length) return null;
    const sum = seats.reduce(function (acc, pos) { return acc + remainingBB(hand, pos); }, 0);
    return round2(sum / seats.length);
  }

  /**
   * Contexto ICM de una pareja de asientos para alimentar las decisiones del villano
   * y la evaluación del héroe: rol propio, cobertura y risk premium de cada lado.
   *
   * @param {object} hand
   * @param {string} selfPos — quien decide
   * @param {string} oppPos — su rival en la mano
   * @param {object} [icmCtx] — { icmStacksBB, icmPayouts, icmHeroIdx, icmVillainIdx }
   */
  function pairContext(hand, selfPos, oppPos, icmCtx) {
    const cov = coverageFor(hand, selfPos, oppPos);
    const roles = rolesForTable(hand);
    const selfRole = (roles[selfPos] && roles[selfPos].role) || null;
    const out = {
      stackRole: selfRole,
      opponentStackRole: (roles[oppPos] && roles[oppPos].role) || null,
      coversOpponent: cov.covers,
      coveredByOpponent: cov.covered,
      coverageRatio: cov.ratio,
      avgStackBB: avgStackBB(hand),
      isChipLead: !!(roles[selfPos] && roles[selfPos].isChipLead),
      ownRiskPremium: null,
      opponentRiskPremium: null,
      bubbleFactor: null
    };

    const Icm = global.GTOIcmEv;
    const stacks = icmCtx && icmCtx.icmStacksBB;
    const payouts = icmCtx && icmCtx.icmPayouts;
    if (Icm && Icm.bubbleFactorPair && stacks && stacks.length >= 2 && payouts && payouts.length) {
      const si = icmCtx.icmHeroIdx != null ? icmCtx.icmHeroIdx : 0;
      const sj = icmCtx.icmVillainIdx != null ? icmCtx.icmVillainIdx : 1;
      const bfSelf = Icm.bubbleFactorPair(stacks, si, sj, payouts);
      const bfOpp = Icm.bubbleFactorPair(stacks, sj, si, payouts);
      out.bubbleFactor = bfSelf;
      out.opponentBubbleFactor = bfOpp;
      out.ownRiskPremium = Icm.riskPremium(bfSelf);
      out.opponentRiskPremium = Icm.riskPremium(bfOpp);
    }
    return out;
  }

  /**
   * Risk premium aproximado por rol cuando no hay stacks/payouts para el cálculo exacto.
   * Sigue la asimetría conocida: medio cubierto > short > quien cubre.
   */
  function riskPremiumFromRole(role, phase, covered) {
    const p = String(phase || '');
    let base;
    if (p === 'bubble') base = 0.14;
    else if (p === 'ft') base = 0.11;
    else if (p === 'mincash' || p === 'ft9') base = 0.08;
    else if (p === 'push' || p === 'short') base = 0.06;
    else if (p === 'itm') base = 0.03;
    else return 0;
    let mult;
    if (role === ROLE_COVER) mult = 0.3;
    else if (role === ROLE_SHORT) mult = 0.7;
    else mult = 1;
    if (covered && role !== ROLE_COVER) mult *= 1.15;
    return Math.round(base * mult * 1000) / 1000;
  }

  global.PTStackCoverage = {
    ROLE_COVER: ROLE_COVER,
    ROLE_MID: ROLE_MID,
    ROLE_SHORT: ROLE_SHORT,
    MEANINGFUL: MEANINGFUL,
    tableSeats: tableSeats,
    coverageFor: coverageFor,
    roleForStack: roleForStack,
    rolesForTable: rolesForTable,
    avgStackBB: avgStackBB,
    pairContext: pairContext,
    riskPremiumFromRole: riskPremiumFromRole
  };
})(typeof window !== 'undefined' ? window : globalThis);
