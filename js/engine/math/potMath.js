/*
 * potMath.js — Aritmética de bote sin errores de coma flotante.
 * Trabaja en centavos (enteros) cuando hay moneda; expone helpers en bb.
 */
(function (global) {
  'use strict';

  function roundBB(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  /** Muestra bb limpio: "37.00" en lugar de "62.39999999999999". */
  function formatBB(x) {
    return roundBB(x).toFixed(2);
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
    roundBB, formatBB, euroToBB, bbToCents, centsToBB, potBBFromEuro, potOdds
  };
})(window);
