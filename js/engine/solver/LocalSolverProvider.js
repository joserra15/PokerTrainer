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
        shoveNode: !!out.riverShove,
        // Sizing afrontado: fija la cuota de faroles del rango de apuesta villano.
        betBB: out.toCallBB || 0,
        potBeforeBB: out.potBeforeBB,
        villainLastAction: out.villainLastAction || null
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

      out.equityOpts = eqOpts;

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
    let strategy = Classifier.filterStrategy(raw, enriched.availableActions);
    const Exploit = global.GTOHeroExploitAdjust;
    if (Exploit && Exploit.shouldApply(enriched)) {
      const adj = Exploit.adjustStrategy(strategy, enriched);
      strategy = adj.strategy;
    }
    return strategy;
  }

  function getEV(input, action) {
    const enriched = enrichInput(input);
    enriched.spotKind = resolveSpotKind(enriched);
    const strategy = getStrategy(enriched);
    return Strat.actionEV(action, strategy, enriched);
  }

  function normalizeChosenAction(chosen, availableActions) {
    if (!chosen) return chosen;
    const acts = availableActions || [];
    if (chosen === 'allin') {
      if (acts.indexOf('allin') >= 0) return 'allin';
      if (acts.indexOf('raise') >= 0) return 'raise';
      if (acts.indexOf('bet') >= 0) return 'bet';
      if (acts.indexOf('bet_100') >= 0) return 'bet_100';
      if (acts.indexOf('bet_66') >= 0) return 'bet_66';
    }
    return chosen;
  }

  function evaluateSpot(input) {
    const enriched = enrichInput(input);
    enriched.spotKind = resolveSpotKind(enriched);
    const spotKey = SpotKey.buildSpotKey(enriched);
    const rawStrategy = Strat.getStrategy(enriched, spotKey);
    let strategy = Classifier.adjustStrategyForHand
      ? Classifier.adjustStrategyForHand(
        Classifier.filterStrategy(rawStrategy, enriched.availableActions),
        enriched
      )
      : Classifier.filterStrategy(rawStrategy, enriched.availableActions);

    const gtoStrategy = strategy;
    let exploitMeta = null;
    const Exploit = global.GTOHeroExploitAdjust;
    if (Exploit && enriched.scoreMode === 'exploit') {
      exploitMeta = Exploit.adjustStrategy(strategy, enriched);
      strategy = exploitMeta.strategy;
    }

    const boardType = spotKey.boardType;
    const chosenAction = normalizeChosenAction(input.chosenAction, enriched.availableActions);

    const result = {
      strategy,
      gtoStrategy: gtoStrategy,
      rawStrategy,
      spotKey,
      boardType,
      handRank: enriched.handRank || null,
      heroEquity: enriched.heroEquity,
      explanation: null,
      evaluation: null,
      optionBreakdown: buildOptionBreakdown(strategy, enriched.availableActions),
      scoreMode: enriched.scoreMode || 'gto',
      villainType: enriched.villainType || null,
      exploitApplied: !!(exploitMeta && exploitMeta.applied),
      exploitReasons: (exploitMeta && exploitMeta.reasons) || [],
      explainDelta: (exploitMeta && exploitMeta.explainDelta) || []
    };

    if (chosenAction != null) {
      const cls = Classifier.classify(strategy, chosenAction, enriched.availableActions);
      const evResult = EvLoss.computeEvLoss(
        enriched.street || 'preflop', cls.cls, chosenAction,
        enriched.handCode, strategy, enriched.potBB, enriched
      );
      const reconciled = Classifier.reconcileWithEv(
        cls.cls, chosenAction, cls.best, evResult,
        {
          freq: cls.freq,
          maxFreq: cls.maxFreq,
          legalStrategy: cls.legalStrategy,
          equity: enriched.heroEquity,
          band: enriched.handRank && enriched.handRank.band,
          madeHandInfo: enriched.madeHandInfo,
          madeCategory: enriched.madeHandInfo && (
            (enriched.madeHandInfo.ev && enriched.madeHandInfo.ev.category)
            || enriched.madeHandInfo.category
          )
        }
      );
      const finalCls = reconciled.cls;
      const finalBest = reconciled.best;
      const stratErrors = Errors.detectErrors(Object.assign({}, enriched, { strategy, chosenAction }));

      let evLoss = evResult.evLoss;
      let evErroneous = evResult.evErroneous;
      let evErrorReasons = (evResult.evErrorReasons || []).slice();
      let mathParams = evResult.mathParams ? Object.assign({}, evResult.mathParams) : null;
      const evGap = Math.max(0, (evResult.bestEV || 0) - (evResult.actionEV || 0));
      const EV_TIE = 0.15;
      if (!evErroneous && evGap >= EV_TIE && finalCls === 'error'
        && chosenAction !== finalBest) {
        evLoss = EvLoss.round2(evGap);
        evErroneous = true;
        evErrorReasons.push({
          type: 'suboptimal_ev',
          msg: 'Acción con EV inferior a la óptima (ΔEV ' + evLoss + ' bb).'
        });
        if (mathParams) mathParams.deltaEV = evLoss;
      }

      // ICM: escalar ΔEV en spins / MTT late (chipEV → presión $EV).
      const Icm = global.GTOIcmEv;
      let icmMult = 1;
      const chipEvLoss = evLoss;
      if (Icm && Icm.shouldApply(enriched) && evLoss > 0) {
        icmMult = Icm.riskMultiplier(Object.assign({}, enriched, { chosenAction }));
        evLoss = Icm.adjustEvLoss(evLoss, Object.assign({}, enriched, { chosenAction }));
      }

      const scoring = Scoring.scoreDecision({
        strategy, chosenAction, classification: finalCls,
        evLoss: evLoss, betSizeBB: input.betSizeBB, potBB: enriched.potBB,
        boardWet: enriched.boardWet, sizingError: stratErrors.some((e) => e.type === 'sizing_incoherente')
      });

      const bbEuro = enriched.bbSizeEuro || enriched.bbEuro || 0;
      let stratMaxFreq = 0;
      for (const a in strategy) if (strategy[a] > stratMaxFreq) stratMaxFreq = strategy[a];
      const eqIters = enriched._equityIters || (enriched.riverShove ? 500 : (enriched.street === 'preflop' ? 0 : 400));
      const confTier = Scoring.confidenceTier({
        street: enriched.street,
        stratMaxFreq: stratMaxFreq,
        equityIters: eqIters,
        riverShove: !!enriched.riverShove,
        multiway: !!enriched.multiway
      });

      const Bluff = global.GTOBluffSpotDetector;
      const bluffInfo = Bluff && enriched.street && enriched.street !== 'preflop'
        ? Bluff.scoreForIntent(Object.assign({}, enriched, { strategy: strategy }), enriched.practiceIntent || 'mixed')
        : null;

      result.evaluation = {
        class: finalCls,
        best: finalBest,
        frequency: cls.freq,
        confidence: Scoring.confidence(strategy, chosenAction),
        confidenceTier: confTier.tier,
        confidenceLabel: confTier.label,
        confidenceTitle: confTier.title,
        confidenceReasons: confTier.reasons,
        actionEV: evResult.actionEV,
        bestEV: evResult.bestEV,
        bestAction: evResult.bestAction,
        evLoss: evLoss,
        chipEvLoss: chipEvLoss,
        evLossEuro: bbEuro > 0 ? EvLoss.round2(evLoss * bbEuro) : 0,
        evErroneous: evErroneous,
        evErrorReasons: evErrorReasons,
        mathParams: mathParams,
        evLossTier: evResult.tier,
        score: scoring.score,
        scoreBreakdown: scoring.breakdown,
        errors: stratErrors,
        legalStrategy: cls.legalStrategy,
        icmMultiplier: icmMult,
        bluffSpot: bluffInfo
      };
      if (Icm && Icm.shouldApply(enriched)) {
        Icm.annotateDecision(result.evaluation, enriched);
      }
      const Tax = global.PTFormatTaxonomy;
      const hub = enriched.formatHub
        || (Tax && Tax.hubFromGameType ? Tax.hubFromGameType(enriched.gameType) : null);
      if (hub === 'spin' || hub === 'mtt') {
        const phase = enriched.mttPhase || enriched.resolvedPhase || null;
        result.evaluation.formatHub = hub;
        result.evaluation.mttPhase = phase;
        result.evaluation.phaseNote = phase
          ? ('Rango/evaluación según fase «' + phase + '»'
            + (enriched.stackDepth || enriched.heroStackBB
              ? (' · ' + (enriched.heroStackBB != null ? enriched.heroStackBB + 'bb' : String(enriched.stackDepth)))
              : '')
            + '.')
          : (hub === 'spin'
            ? 'Rango/evaluación de Spin (stack-aware).'
            : 'Rango/evaluación de torneo.');
        if (result.evaluation.icmLite && chipEvLoss > 0
          && Math.abs((result.evaluation.evLoss || 0) - chipEvLoss) >= 0.01) {
          result.evaluation.icmChangedEv = true;
          result.evaluation.icmNote = (result.evaluation.icmNote ? result.evaluation.icmNote + ' ' : '')
            + 'EV en fichas −' + chipEvLoss + ' bb → con ICM −'
            + (result.evaluation.evLoss || 0) + ' bb (×'
            + (result.evaluation.icmMultiplier != null ? result.evaluation.icmMultiplier : icmMult)
            + ').';
        }
      }
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
