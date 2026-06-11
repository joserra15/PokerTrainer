/*
 * evaluateSpot.js — API central de evaluación GTO.
 * Toda decisión debe pasar por aquí.
 */
(function (global) {
  'use strict';

  let activeProvider = global.LocalSolverProvider;

  function setSolverProvider(provider) {
    activeProvider = provider;
    global.GTO.Solver = provider;
  }

  function evaluateSpot(input) {
    return activeProvider.evaluateSpot(input);
  }

  function getStrategy(input) {
    return activeProvider.getStrategy(input);
  }

  function getEV(input, action) {
    return activeProvider.getEV(input, action);
  }

  global.GTO = Object.assign(global.GTO || {}, {
    evaluateSpot, getStrategy, getEV, setSolverProvider,
    Cache: global.GTOCache,
    Ranges: {
      notation: global.GTORangesNotation,
      data: global.GTORangesData,
      weights: global.GTORangesWeights
    },
    Equity: Object.assign({}, global.GTOEquity, global.GTOEquityMadeHand),
    BoardCluster: global.GTOBoardCluster,
    SpotKey: global.GTOSpotKey,
    Strategy: global.GTOStrategyTables,
    Classifier: global.GTOClassifier,
    EvLoss: global.GTOEvLoss,
    Scoring: global.GTOScoring,
    Errors: global.GTOErrors,
    Explanations: global.GTOExplanations,
    HandStrength: global.GTOHandStrength,
    VillainTracking: global.GTOVillainTracking
  });
})(window);
