/*
 * potMath.js — Aritmética de bote sin errores de coma flotante.
 * Trabaja en centavos (enteros) cuando hay moneda; expone helpers en bb.
 */
(function (global) {
  'use strict';

  /** Mínimo legal de apuesta abierta (bet, no raise) en NLHE = 1bb. */
  const MIN_OPEN_BET_BB = 1;

  function roundBB(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  /** Muestra bb limpio: "37.00" en lugar de "62.39999999999999". */
  function formatBB(x) {
    return roundBB(x).toFixed(2);
  }

  /**
   * Suelo de apuesta abierta postflop: nunca < 1bb.
   * El all-in corto (<1bb) se aplica después con el cap de stack restante.
   */
  function floorOpenBetBB(sizeBB) {
    const s = roundBB(sizeBB);
    if (!(s > 0)) return 0;
    return Math.max(MIN_OPEN_BET_BB, s);
  }

  /** Tamaño de lead = max(1bb, pot × fracción). */
  function openBetSizeBB(potBB, frac) {
    const pot = Math.max(Number(potBB) || 0, 0.1);
    const f = Math.max(Number(frac) || 0, 0);
    if (!(f > 0)) return 0;
    return floorOpenBetBB(pot * f);
  }

  function euroToBB(euro, bb) {
    if (!bb || bb <= 0) return 0;
    return roundBB(euro / bb);
  }

  function bbToCents(bb, bbSize) {
    return Math.round(roundBB(bb) * Math.round(bbSize * 100));
  }

  function centsToBB(cents, bbCents) {
    if (!bbCents) return 0;
    return roundBB(cents / bbCents);
  }

  /** Suma contribuciones en € y convierte a bb. */
  function potBBFromEuro(priorPotBB, streetEuroTotal, bb) {
    return roundBB(priorPotBB + euroToBB(streetEuroTotal, bb));
  }

  /** Pot odds: bet / (potBeforeBet + bet + call). */
  function potOdds(potBeforeBetBB, betSizeBB) {
    const pot = Math.max(potBeforeBetBB || 0, 0.1);
    const bet = Math.max(betSizeBB || 0, 0);
    if (bet <= 0) return 0;
    return bet / (pot + bet + bet);
  }

  global.GTOPotMath = {
    MIN_OPEN_BET_BB,
    roundBB,
    formatBB,
    floorOpenBetBB,
    openBetSizeBB,
    euroToBB,
    bbToCents,
    centsToBB,
    potBBFromEuro,
    potOdds
  };
})(window);
