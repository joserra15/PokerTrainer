/*
 * LocalSolverProvider.js — Pseudo-solver local por lookup tables.
 */
(function (global) {
  'use strict';

  const SpotKey = global.GTOSpotKey;
  const Strat = global.GTOStrategyTables;
  const Classifier = global.GTOClassifier;
  const EvLoss = global.GTOEvLoss;
  const Scoring = global.GTOScoring;
  const Errors = global.GTOErrors;
  const Explanations = global.GTOExplanations;
  const Made = global.GTOEquityMadeHand;
  const Eq = global.GTOEquity;
  const Board = global.GTOBoardCluster;
  const D = global.GTORangesData;

  function enrichInput(input) {
    const out = Object.assign({}, input);
    if (!out.handCode && out.heroCards && out.heroCards.length === 2) {
      out.handCode = global.GTORangesNotation.handCode(out.heroCards[0], out.heroCards[1]);
    }
    if (out.street !== 'preflop' && out.board && out.board.length >= 3) {
      if (!out.madeHandInfo) out.madeHandInfo = Made.classifyMadeHand(out.heroCards, out.board);
      if (out.heroEquity == null && out.villainRange) {
        out.heroEquity = Eq.equityVsRange(out.heroCards, out.board, out.villainRange, 400, { street: out.street });
      }
      const tex = Board.boardTexture(out.board);
      out.boardWet = tex.wet;
    }
    if (!out.villainRange && out.street !== 'preflop') out.villainRange = D.BROAD_CONTINUE;
    return out;
  }

  function resolveSpotKind(input) {
    if (input.street !== 'preflop' && input.street != null) return 'postflop';
    return input.spotKind || 'postflop';
  }

  function getStrategy(input) {
    const enriched = enrichInput(input);
    enriched.spotKind = resolveSpotKind(enriched);
    const spotKey = SpotKey.buildSpotKey(enriched);
    const raw = Strat.getStrategy(enriched, spotKey);
    return Classifier.filterStrategy(raw, enriched.availableActions);
  }

  function getEV(input, action) {
    const enriched = enrichInput(input);
    enriched.spotKind = resolveSpotKind(enriched);
    const strategy = getStrategy(enriched);
    return Strat.actionEV(action, strategy, enriched);
  }

  function evaluateSpot(input) {
    const enriched = enrichInput(input);
    enriched.spotKind = resolveSpotKind(enriched);
    const spotKey = SpotKey.buildSpotKey(enriched);
    const rawStrategy = Strat.getStrategy(enriched, spotKey);
    const strategy = Classifier.filterStrategy(rawStrategy, enriched.availableActions);
    const boardType = spotKey.boardType;

    const result = {
      strategy,
      rawStrategy,
      spotKey,
      boardType,
      explanation: null,
      evaluation: null,
      optionBreakdown: buildOptionBreakdown(strategy, enriched.availableActions)
    };

    if (input.chosenAction != null) {
      const cls = Classifier.classify(rawStrategy, input.chosenAction, enriched.availableActions);
      const evResult = EvLoss.computeEvLoss(
        enriched.street || 'preflop', cls.cls, input.chosenAction,
        enriched.handCode, strategy, enriched.potBB, enriched
      );
      const stratErrors = Errors.detectErrors(Object.assign({}, enriched, { strategy, chosenAction: input.chosenAction }));
      const scoring = Scoring.scoreDecision({
        strategy, chosenAction: input.chosenAction, classification: cls.cls,
        evLoss: evResult.evLoss, betSizeBB: input.betSizeBB, potBB: enriched.potBB,
        boardWet: enriched.boardWet, sizingError: stratErrors.some((e) => e.type === 'sizing_incoherente')
      });

      result.evaluation = {
        class: cls.cls,
        best: cls.best,
        frequency: cls.freq,
        confidence: Scoring.confidence(strategy, input.chosenAction),
        actionEV: evResult.actionEV,
        bestEV: evResult.bestEV,
        evLoss: evResult.evLoss,
        evLossTier: evResult.tier,
        score: scoring.score,
        scoreBreakdown: scoring.breakdown,
        errors: stratErrors,
        legalStrategy: cls.legalStrategy
      };
      result.explanation = Explanations.generate(enriched, spotKey, strategy, result.evaluation);
    } else {
      result.explanation = Explanations.generate(enriched, spotKey, strategy, null);
    }

    return result;
  }

  function buildOptionBreakdown(strategy, availableActions) {
    const order = availableActions || Object.keys(strategy);
    return order.map((id) => ({
      id,
      label: formatActionLabel(id),
      frequency: strategy[id] || 0,
      pct: Math.round((strategy[id] || 0) * 100)
    })).sort((a, b) => b.frequency - a.frequency);
  }

  function formatActionLabel(id) {
    const map = {
      fold: 'FOLD', check: 'CHECK', call: 'CALL', bet: 'BET', raise: 'RAISE',
      bet_33: 'BET 33%', bet_66: 'BET 66%', bet_100: 'BET POT'
    };
    return map[id] || id.toUpperCase();
  }

  const LocalSolverProvider = { evaluateSpot, getStrategy, getEV, name: 'local' };

  global.LocalSolverProvider = LocalSolverProvider;
  global.GTO = global.GTO || {};
  global.GTO.Solver = LocalSolverProvider;
  global.GTO.evaluateSpot = evaluateSpot;
})(window);
