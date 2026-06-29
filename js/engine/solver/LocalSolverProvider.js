/*
 * LocalSolverProvider.js — Solver local EV-based (Fase 1/2).
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
  const HandRank = global.GTOHandRank;
  const VT = global.GTOVillainTracking;
  const RS = global.GTORiverShoveNode;

  function enrichInput(input) {
    const out = Object.assign({}, input);
    if (!out.handCode && out.heroCards && out.heroCards.length === 2) {
      out.handCode = global.GTORangesNotation.handCode(out.heroCards[0], out.heroCards[1]);
    }

    if (out.street !== 'preflop' && out.board && out.board.length >= 3) {
      if (!out.madeHandInfo) out.madeHandInfo = Made.classifyMadeHand(out.heroCards, out.board);

      const facingBet = (out.toCallBB || 0) > 0;
      const potBefore = Math.max((out.potBB || 1) - (out.toCallBB || 0), 0.1);
      out.potBeforeBB = out.potBeforeBB != null ? out.potBeforeBB : potBefore;

      if (RS && out.street === 'river' && facingBet) {
        out.facingNode = RS.classifyFacingNode(out.toCallBB, potBefore, out.street, out.villainLastAction);
        out.riverShove = out.facingNode === 'shove' || out.facingNode === 'overbet';
      }

      if (!out.villainRange && VT && out.villainLastAction) {
        out.villainRange = VT.estimateActiveRange({
          baseRange: D.BROAD_CONTINUE,
          street: out.street,
          lastAction: out.villainLastAction,
          betBB: out.toCallBB || 0,
          potBeforeBB: potBefore,
          board: out.board,
          tags: out.villainTags || []
        });
      }
      if (!out.villainRange) out.villainRange = D.BROAD_CONTINUE;

      const eqOpts = {
        street: out.street,
        facingBet: facingBet && !out.riverShove,
        riverShove: !!out.riverShove,
        shoveNode: !!out.riverShove
      };

      const eqIters = out._equityIters || (out.riverShove ? 500 : 400);
      if (out.heroEquity == null) {
        out.heroEquity = Eq.equityVsRange(out.heroCards, out.board, out.villainRange, eqIters, eqOpts);
      }

      if (RS && out.riverShove && out.heroCards) {
        const deval = RS.pairedBoardFlushDevaluation(out.heroCards, out.board);
        if (deval.vulnerable) {
          out.heroEquity = Math.min(out.heroEquity, deval.capEquity);
        }
      }

      if (HandRank) {
        out.handRank = HandRank.computeHandRank(out);
        if (out.madeHandInfo && out.handRank.tier) {
          out.madeHandInfo = Object.assign({}, out.madeHandInfo, { tier: out.handRank.tier });
        }
      }

      const tex = Board.boardTexture(out.board);
      out.boardWet = tex.wet;

      if (facingBet && out.toCallBB > 0) {
        const potBefore = Math.max((out.potBB || 1) - out.toCallBB, 0.1);
        out.villainBetRatio = out.villainBetRatio != null ? out.villainBetRatio : out.toCallBB / potBefore;
      }
    }

    if (!out.heroRange && HandRank && out.street !== 'preflop') {
      out.heroRange = HandRank.inferHeroRange(out);
    }

    return out;
  }

  /** Equity unificada (misma lógica que evaluateSpot) para Jugar e importación. */
  function computeHeroEquity(input) {
    return enrichInput(Object.assign({}, input, { heroEquity: null, chosenAction: null })).heroEquity;
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
    const strategy = Classifier.adjustStrategyForHand
      ? Classifier.adjustStrategyForHand(
        Classifier.filterStrategy(rawStrategy, enriched.availableActions),
        enriched
      )
      : Classifier.filterStrategy(rawStrategy, enriched.availableActions);
    const boardType = spotKey.boardType;

    const result = {
      strategy,
      rawStrategy,
      spotKey,
      boardType,
      handRank: enriched.handRank || null,
      heroEquity: enriched.heroEquity,
      explanation: null,
      evaluation: null,
      optionBreakdown: buildOptionBreakdown(strategy, enriched.availableActions)
    };

    if (input.chosenAction != null) {
      const cls = Classifier.classify(strategy, input.chosenAction, enriched.availableActions);
      const evResult = EvLoss.computeEvLoss(
        enriched.street || 'preflop', cls.cls, input.chosenAction,
        enriched.handCode, strategy, enriched.potBB, enriched
      );
      const reconciled = Classifier.reconcileWithEv(
        cls.cls, input.chosenAction, cls.best, evResult,
        {
          freq: cls.freq,
          equity: enriched.heroEquity,
          band: enriched.handRank && enriched.handRank.band
        }
      );
      const finalCls = reconciled.cls;
      const finalBest = reconciled.best;
      const stratErrors = Errors.detectErrors(Object.assign({}, enriched, { strategy, chosenAction: input.chosenAction }));
      const scoring = Scoring.scoreDecision({
        strategy, chosenAction: input.chosenAction, classification: finalCls,
        evLoss: evResult.evLoss, betSizeBB: input.betSizeBB, potBB: enriched.potBB,
        boardWet: enriched.boardWet, sizingError: stratErrors.some((e) => e.type === 'sizing_incoherente')
      });

      result.evaluation = {
        class: finalCls,
        best: finalBest,
        frequency: cls.freq,
        confidence: Scoring.confidence(strategy, input.chosenAction),
        actionEV: evResult.actionEV,
        bestEV: evResult.bestEV,
        bestAction: evResult.bestAction,
        evLoss: evResult.evLoss,
        evLossEuro: evResult.evLossEuro,
        evErroneous: evResult.evErroneous,
        evErrorReasons: evResult.evErrorReasons,
        mathParams: evResult.mathParams,
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

  const LocalSolverProvider = { evaluateSpot, getStrategy, getEV, computeHeroEquity, name: 'local' };

  global.LocalSolverProvider = LocalSolverProvider;
  global.GTO = global.GTO || {};
  global.GTO.Solver = LocalSolverProvider;
  global.GTO.evaluateSpot = evaluateSpot;
  global.GTO.computeHeroEquity = computeHeroEquity;
})(window);
