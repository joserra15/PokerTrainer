/*
 * SolverProvider.js — Interfaz abstracta para solver (local o remoto futuro).
 *
 * interface SolverProvider {
 *   evaluateSpot(input): { strategy, spotKey, evaluation? }
 *   getStrategy(input): frequencies map
 *   getEV(input, action): number
 * }
 */
(function (global) {
  'use strict';

  function createStub() {
    return {
      evaluateSpot() { throw new Error('SolverProvider no implementado'); },
      getStrategy() { throw new Error('SolverProvider no implementado'); },
      getEV() { throw new Error('SolverProvider no implementado'); }
    };
  }

  global.SolverProviderInterface = { createStub };
})(window);
