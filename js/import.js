/*
 * import.js
 * Importa y analiza historiales de manos (PokerStars ES/EN, Winamax, GGPoker).
 * - Detección automática de plataforma e idioma (PTHandHistoryFormats).
 * - Parsea cada mano (asientos, posiciones, acciones, board, resultado).
 * - Conserva cash / spins / MTT-SNG NLHE; descarta variantes no soportadas.
 * - Metadata: gameKind, tableMax, formatKey; ideales y rangos por formato.
 * - Analiza todas las manos del héroe con cartas (incl. folds preflop).
 * Expuesto como `Importer`.
 */
(function (global) {
  'use strict';

  const C = global.Cards;
  const R = global.Ranges;
  const E = global.Engine;
  const GTO = global.GTO;
  const D = global.GTORangesData;
  const VT = global.GTOVillainTracking;
  const PM = global.GTOPotMath;

  // ---------- utilidades numéricas ----------
  function num(s) {
    return global.PTHHUtils ? global.PTHHUtils.num(s) : numLocal(s);
  }
  function numLocal(s) {
    if (s == null) return 0;
    s = String(s).trim().replace(/\s|[€$£]/g, '');
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.indexOf(',') >= 0) s = s.replace(',', '.');
    const v = parseFloat(s);
    return isNaN(v) ? 0 : v;
  }
  function cardsFrom(str) {
    return global.PTHHUtils ? global.PTHHUtils.cardsFrom(str) : cardsFromLocal(str);
  }
  function cardsFromLocal(str) {
    const m = str.match(/[2-9TJQKA][shdc]/g) || str.match(/(?:10|[2-9TJQKA])[shdc]/g);
    if (!m) return [];
    return m.map((c) => c.replace('10', 'T'));
  }
  function r2(x) {
    return PM ? PM.roundBB(x) : Math.round(x * 100) / 100;
  }

  // ---------- PARSER (delegado a PTHandHistoryFormats) ----------
  function detectSessionFormat(text) {
    const Formats = global.PTHandHistoryFormats;
    if (!Formats) return null;
    return Formats.describe(text);
  }

  function parseSession(text, fileName) {
    const Formats = global.PTHandHistoryFormats;
    if (!Formats) throw new Error('Módulos de importación no cargados');
    const format = Formats.detectBest(text);
    if (!format || typeof format.parseSession !== 'function') {
      return { fileName: fileName || 'sesion.txt', hero: null, hands: [], format: null };
    }
    return format.parseSession(text, fileName);
  }

  function splitHandBlocks(text) {
    return text.split(/(?=^(?:Mano n\.º |PokerStars (?:Zoom )?Hand #|Poker Hand #|Winamax Poker - ))/m)
      .filter(function (b) {
        var t = b.trim();
        // Poker Hand # = GGPoker; PokerStars Hand # = PokerStars EN
        return /^(Mano n\.º|PokerStars|Poker Hand #|Winamax)/.test(t);
      });
  }

  function analyzeChunkSize(total) {
    if (total > 15000) return 50;
    if (total > 10000) return 40;
    if (total > 5000) return 25;
    if (total > 1000) return 12;
    return 6;
  }

  function parseChunkSize(total) {
    if (total > 10000) return 150;
    if (total > 5000) return 100;
    return 60;
  }

  /** Parsea sesiones grandes en lotes para no bloquear la UI. */
  function parseSessionAsync(text, fileName, onProgress) {
    var blocks = splitHandBlocks(text || '');
    if (blocks.length < 800) {
      return Promise.resolve(parseSession(text, fileName));
    }
    var hands = [];
    var heroCount = {};
    var detectedFormat = null;
    var discardedByReason = global.PTHHUtils && global.PTHHUtils.emptyDiscardCounts
      ? global.PTHHUtils.emptyDiscardCounts()
      : { badParse: 0, unsupportedVariant: 0, noBlinds: 0, unknownGame: 0, noHeroCards: 0 };
    var i = 0;
    var chunk = parseChunkSize(blocks.length);
    return new Promise(function (resolve, reject) {
      function step() {
        try {
          var end = Math.min(i + chunk, blocks.length);
          for (; i < end; i++) {
            var h = parseHand(blocks[i]);
            var keep = global.PTHHUtils && global.PTHHUtils.isKeepableHand
              ? global.PTHHUtils.isKeepableHand(h)
              : { ok: !!(h && h.bb > 0), reason: 'badParse' };
            if (!keep.ok) {
              if (keep.reason && discardedByReason[keep.reason] != null) discardedByReason[keep.reason]++;
              else discardedByReason.badParse++;
              continue;
            }
            if (h.hero) heroCount[h.hero] = (heroCount[h.hero] || 0) + 1;
            hands.push(h);
            if (!detectedFormat && h.platform) {
              detectedFormat = {
                platform: h.platform,
                platformLabel: h.platform === 'ggpoker' ? 'GGPoker'
                  : (h.platform === 'winamax' ? 'Winamax' : 'PokerStars'),
                locale: h.locale || null,
                localeLabel: h.locale === 'es' ? 'Español' : 'English'
              };
            }
          }
          if (onProgress) onProgress(i, blocks.length, 'parse');
          if (i < blocks.length) setTimeout(step, 0);
          else {
            var hero = null;
            var best = -1;
            Object.keys(heroCount).forEach(function (n) {
              if (heroCount[n] > best) { best = heroCount[n]; hero = n; }
            });
            var fmt = detectedFormat;
            if (!fmt) {
              var d = detectSessionFormat(text);
              if (d) fmt = { platform: d.platform, platformLabel: d.platformLabel, locale: d.locale, localeLabel: d.localeLabel };
            }
            resolve({
              fileName: fileName || 'sesion.txt',
              hero: hero,
              hands: hands,
              discardedByReason: discardedByReason,
              format: fmt
            });
          }
        } catch (e) { reject(e); }
      }
      setTimeout(step, 0);
    });
  }

  const BLOCK_TEST_WM = /^Winamax Poker - /;
  const BLOCK_TEST_GG = /^Poker Hand #/;

  function parseHand(block) {
    const text = (block || '').trim();
    const WM = global.PTWinamaxParser;
    const GG = global.PTGGPokerParser;
    const PS = global.PTPokerStarsParser;
    if (WM && BLOCK_TEST_WM.test(text)) return WM.parseHand(block);
    // GGPoker: "Poker Hand #" sin prefijo PokerStars
    if (GG && BLOCK_TEST_GG.test(text) && !/^PokerStars/i.test(text)) {
      return GG.parseHand(block);
    }
    if (PS && typeof PS.parseHand === 'function' && (/^Mano n\.º/i.test(text) || /^PokerStars/i.test(text))) {
      const locale = PS.detectLocale ? PS.detectLocale(block) : null;
      return PS.parseHand(block, locale);
    }
    const Formats = global.PTHandHistoryFormats;
    if (Formats) {
      const fmt = Formats.detectBest(block);
      if (fmt && typeof fmt.parseHand === 'function') return fmt.parseHand(block);
    }
    return null;
  }

  // ---------- ¿analizar esta mano del héroe? ----------
  function heroPlayed(hand) {
    return !!(hand.hero && hand.heroCards && hand.heroCards.length >= 2);
  }

  // ---------- ANALIZADOR GTO (vía evaluateSpot) ----------
  const BROAD_CONTINUE = D.BROAD_CONTINUE;
  const RANGE_3BET_POT = 'TT+, AQs+, AJs, KQs, AKo, AQo, 99, 88';
  const RANGE_SINGLE_RAISED = '99+, AJs+, KQs, QJs, JTs, AQo, AKo, TT';

  function inferVillainBaseRange(hand, hero) {
    const VT = global.GTOVillainTracking;
    if (VT && VT.preflopRangeFromHand) return VT.preflopRangeFromHand(hand, hero);
    let raiseCount = 0;
    let heroRaised = false;
    hand.streets.preflop.forEach((a) => {
      if (a.type === 'raise') {
        raiseCount++;
        if (a.player === hero) heroRaised = true;
      }
    });
    if (raiseCount >= 2 && heroRaised) return RANGE_3BET_POT;
    if (raiseCount >= 1) return RANGE_SINGLE_RAISED;
    return BROAD_CONTINUE;
  }

  // Orden postflop (primero → último). Quien actúa al final está en posición.
  const POSTFLOP_ORDER = ['SB', 'BB', 'UTG', 'UTG1', 'UTG2', 'EP0', 'EP1', 'LJ', 'HJ', 'CO', 'BTN'];

  function postflopOrderIndex(pos) {
    if (!pos) return -1;
    const i = POSTFLOP_ORDER.indexOf(pos);
    if (i >= 0) return i;
    if (String(pos).indexOf('UTG') === 0 || String(pos).indexOf('EP') === 0) return POSTFLOP_ORDER.indexOf('UTG');
    return -1;
  }

  /** Jugadores que llegan al flop (no foldearon preflop). */
  function playersReachedFlop(hand) {
    const folded = new Set();
    ((hand.streets && hand.streets.preflop) || []).forEach((a) => {
      if (a.type === 'fold') folded.add(a.player);
    });
    return Object.keys(hand.positions || {}).filter((p) => !folded.has(p));
  }

  /**
   * Héroe en posición postflop si actúa el último entre los que siguen en el bote.
   * Ej.: BB vs SB heads-up → BB está IP (antes se marcaba OOP por lista fija).
   */
  function heroIsInPositionPostflop(hand, hero) {
    const heroPos = (hand.positions && hand.positions[hero]) || null;
    if (!heroPos) return false;
    const remaining = playersReachedFlop(hand);
    if (remaining.length <= 1) return true;
    const heroIdx = postflopOrderIndex(heroPos);
    if (heroIdx < 0) return false;
    let maxIdx = -1;
    remaining.forEach((p) => {
      const idx = postflopOrderIndex(hand.positions[p]);
      if (idx > maxIdx) maxIdx = idx;
    });
    return heroIdx === maxIdx;
  }

  function inferHeroPostflopContext(hand, hero) {
    let heroRaised = false;
    hand.streets.preflop.forEach((a) => {
      if (a.type === 'raise' && a.player === hero) heroRaised = true;
    });
    return {
      initiative: heroRaised ? 'aggressor' : 'caller',
      inPosition: heroIsInPositionPostflop(hand, hero)
    };
  }

  /** True si el héroe ya bet/raise en una calle postflop anterior a `street`. */
  function heroLedOnPriorStreets(hand, hero, street) {
    const prior = street === 'turn' ? ['flop']
      : (street === 'river' ? ['flop', 'turn'] : []);
    return prior.some((st) => {
      const acts = (hand.streets && hand.streets[st]) || [];
      return acts.some((a) => a.player === hero && (a.type === 'bet' || a.type === 'raise'));
    });
  }

  function attachProbeAlerts(hand, decisions) {
    if (!global.GTOStreetValidation) return;
    decisions.forEach((d) => { delete d.renderAlert; });
    global.GTOStreetValidation.validateHandDecisions(decisions).forEach((alert) => {
      const d = decisions.find((x) => x.street === alert.street);
      if (d) d.renderAlert = alert.alert;
    });
    const boardsByStreet = {
      flop: boardUpTo(hand, 'flop'),
      turn: boardUpTo(hand, 'turn'),
      river: boardUpTo(hand, 'river')
    };
    const sanity = global.GTOStreetValidation.sanityCheckSolver(decisions, boardsByStreet, 1);
    if (!sanity.ok) {
      const rd = decisions.find((x) => x.street === 'river');
      if (rd) rd.renderAlert = (rd.renderAlert ? rd.renderAlert + ' ' : '') + sanity.log;
    }
  }

  function probeBetIdFromSize(betBB, potBB) {
    const pot = Math.max(potBB || 1, 0.1);
    const ratio = (betBB || 0) / pot;
    if (ratio >= 0.85) return 'bet_100';
    if (ratio >= 0.48) return 'bet_66';
    return 'bet_33';
  }

  function resolvePostflopChosen(type, toCallBB, betBB, potBB) {
    const raw = mapPostflopAction(type, toCallBB);
    if (raw === 'bet') return probeBetIdFromSize(betBB, potBB);
    return raw;
  }

  /** Reconstruye input de evaluateSpot desde una decisión guardada (replay / revisión). */
  function boardForAnalyzedHand(hand, d, street) {
    if (d && d.board && d.board.length) return d.board.slice();
    if (hand && hand.board && hand.board.length) {
      const n = { preflop: 0, flop: 3, turn: 4, river: 5 }[street] || 0;
      return hand.board.slice(0, n);
    }
    if (hand && hand.board && hand.board.flop) return boardUpTo(hand, street);
    return [];
  }

  function postflopCtxForDecision(hand, d) {
    if (d && d.initiative) {
      return {
        initiative: d.initiative,
        inPosition: d.inPosition != null ? d.inPosition : true
      };
    }
    if (hand && hand.streets && hand.hero) {
      return inferHeroPostflopContext(hand, hand.hero);
    }
    return { initiative: 'caller', inPosition: true };
  }

  function rebuildStreetsFromSummary(h) {
    const streets = { preflop: [], flop: [], turn: [], river: [] };
    (h.summary || []).forEach((item) => {
      if (item.kind !== 'action' || !streets[item.street]) return;
      streets[item.street].push({
        player: item.player,
        type: item.type,
        amount: item.amount,
        to: item.to,
        allin: item.allin
      });
    });
    return streets;
  }

  function ensureAnalyzedHandContext(h) {
    if (!h) return h;
    const out = h;
    if (!out.streets && out.summary && out.summary.length) {
      out.streets = rebuildStreetsFromSummary(out);
    }
    return out;
  }

  function villainContextForAnalyzedHand(hand, d) {
    hand = ensureAnalyzedHandContext(hand);
    if (!hand.streets || !hand.hero || !VT || !VT.inferVillainLineContext) {
      return {
        villainRange: d.villainRange || BROAD_CONTINUE,
        villainLastAction: d.villainLastAction || null,
        villainBetRatio: d.villainBetRatio != null ? d.villainBetRatio : null
      };
    }
    const street = d.street;
    const acts = hand.streets[street] || [];
    let heroActIndex = d.actionSequenceId;
    if (heroActIndex == null) {
      let n = 0;
      for (let i = 0; i < acts.length; i++) {
        if (acts[i].player === hand.hero) {
          if (n === 0 && d.chosen) { heroActIndex = i; break; }
          n++;
        }
      }
      if (heroActIndex == null) heroActIndex = acts.length;
    }
    const board = boardForAnalyzedHand(hand, d, street);
    const villainBase = inferVillainBaseRange(hand, hand.hero);
    return VT.inferVillainLineContext({
      hand, hero: hand.hero, street, heroActIndex,
      boardSoFar: board, villainBase, priorPotBB
    });
  }

  function handRangeContext(hand) {
    const RR = global.GTORangesRegistry;
    if (!RR) return null;
    if (hand.rangeContext) return RR.normalize(hand.rangeContext);
    return RR.inferFromHand(hand);
  }

  function attachRangeContext(input, hand) {
    const RR = global.GTORangesRegistry;
    const ctx = handRangeContext(hand);
    if (RR && ctx) RR.attachToInput(input, ctx);
    else if (!input.stackDepth) input.stackDepth = 100;
    return input;
  }

  function buildEvalInputFromDecision(hand, d, chosenOverride) {
    const heroPos = (hand.positions && hand.hero && hand.positions[hand.hero]) || hand.heroPos || '??';
    const street = d.street || 'preflop';
    const board = boardForAnalyzedHand(hand, d, street);
    const toCallBB = d.toCallBB || 0;
    const potEvalBB = d.potEvalBB != null ? d.potEvalBB
      : (toCallBB > 0 ? r2((d.potBB || 0) + toCallBB) : r2(d.potBB || 0));
    const potBeforeBB = d.potBeforeBB != null ? d.potBeforeBB
      : (toCallBB > 0 ? r2(Math.max(potEvalBB - toCallBB, 0.1)) : potEvalBB);
    const lineCtx = street !== 'preflop' ? villainContextForAnalyzedHand(hand, d) : null;
    const villainRange = lineCtx ? lineCtx.villainRange : (d.villainRange || BROAD_CONTINUE);
    const villainLastAction = lineCtx ? lineCtx.villainLastAction : d.villainLastAction;
    const villainBetRatio = lineCtx ? lineCtx.villainBetRatio : d.villainBetRatio;
    const RS = global.GTORiverShoveNode;
    const facingNode = d.facingNode || (RS
      ? RS.classifyFacingNode(toCallBB, potBeforeBB, d.street, villainLastAction)
      : 'small');
    const isRiverShove = d.street === 'river' && (facingNode === 'shove' || facingNode === 'overbet');
    const postflopCtx = postflopCtxForDecision(hand, d);

    const chosen = chosenOverride != null ? chosenOverride : d.chosen;
    const chosenAction = chosen === 'bet'
      ? probeBetIdFromSize(d.betSizeBB, potEvalBB)
      : (chosen === 'bet_33' || chosen === 'bet_66' || chosen === 'bet_100' ? chosen : chosen);
    const base = {
      spotKind: d.spotKind || (d.street === 'preflop' ? 'vsRFI' : 'postflop'),
      position: heroPos,
      vsPosition: d.vsPosition,
      vsRfiKey: d.vsRfiKey,
      stackDepth: (handRangeContext(hand) || {}).stackBB || 100,
      street: d.street,
      board,
      priorBoard: d.priorBoard,
      heroCards: hand.heroCards,
      handCode: hand.heroCode || (hand.heroCards.length === 2 ? R.handCode(hand.heroCards[0], hand.heroCards[1]) : null),
      potBB: potEvalBB,
      toCallBB,
      betSizeBB: d.betSizeBB || 0,
      potBeforeBB,
      bbSizeEuro: hand.bb || 0,
      chosenAction,
      initiative: d.initiative || postflopCtx.initiative,
      inPosition: d.inPosition != null ? d.inPosition : postflopCtx.inPosition,
      availableActions: d.options || (toCallBB > 0 ? ['fold', 'call', 'raise'] : ['check', 'bet_33', 'bet_66', 'bet_100'])
    };
    if (d.street === 'preflop') return attachRangeContext(base, hand);

    const initiative = base.initiative;
    let priorAggressorBet = d.priorAggressorBet;
    if (priorAggressorBet == null && initiative === 'aggressor' && hand && hand.hero) {
      priorAggressorBet = heroLedOnPriorStreets(ensureAnalyzedHandContext(hand), hand.hero, street);
    }
    if (priorAggressorBet == null) priorAggressorBet = false;

    return Object.assign(attachRangeContext(base, hand), {
      villainRange,
      heroEquity: d.heroEquity != null ? d.heroEquity / 100 : null,
      villainLastAction,
      villainBetRatio,
      potBeforeBB,
      facingNode,
      actionSequenceId: d.actionSequenceId,
      priorAggressorBet
    });
  }

  function recomputeDecisionGto(hand, d, chosenOverride) {
    if (!GTO || !GTO.evaluateSpot) return d;
    const evalResult = GTO.evaluateSpot(buildEvalInputFromDecision(hand, d, chosenOverride));
    const ev = evalResult.evaluation;
    d.gto = evalResult.strategy;
    d.optionBreakdown = evalResult.optionBreakdown;
    d.best = ev.best;
    d.class = ev.class;
    d.evLoss = ev.evLoss;
    d.evLossEuro = ev.evLossEuro;
    d.evErroneous = ev.evErroneous;
    d.evErrorReasons = ev.evErrorReasons;
    d.mathParams = ev.mathParams;
    d.bestAction = ev.bestAction;
    d.evLossTier = ev.evLossTier;
    d.actionEV = ev.actionEV;
    d.bestEV = ev.bestEV;
    d.frequency = ev.frequency;
    d.confidence = ev.confidence;
    d.confidenceTier = ev.confidenceTier;
    d.confidenceLabel = ev.confidenceLabel;
    d.confidenceTitle = ev.confidenceTitle;
    d.confidenceReasons = ev.confidenceReasons;
    d.score = ev.score;
    d.explanation = evalResult.explanation;
    const inputSnap = buildEvalInputFromDecision(hand, d, chosenOverride);
    d.villainRange = inputSnap.villainRange;
    d.villainLastAction = inputSnap.villainLastAction;
    d.villainBetRatio = inputSnap.villainBetRatio;
    if (evalResult.heroEquity != null) d.heroEquity = Math.round(evalResult.heroEquity * 100);
    return d;
  }

  /** Recalcula GTO de todas las decisiones (sesiones antiguas o tras invalidar caché). */
  function recomputeHandDecisions(hand) {
    if (!hand || !hand.decisions) return hand;
    hand = ensureAnalyzedHandContext(hand);
    try {
      if (global.GTOStreetValidation) global.GTOStreetValidation.invalidateSolverCache('hand refresh');
      hand.decisions.forEach((d) => recomputeDecisionGto(hand, d));
    } catch (e) {
      console.error('[Importer] recomputeHandDecisions failed', e);
      recomputeHeroNet(hand);
      return hand;
    }
    let totalEvLoss = GTO.EvLoss.totalEvLossFromDecisions(hand.decisions);
    const byStreet = {};
    hand.decisions.forEach((d) => {
      byStreet[d.street] = byStreet[d.street] || { n: 0, good: 0 };
      byStreet[d.street].n++;
      if (d.class === 'optima' || d.class === 'aceptable') byStreet[d.street].good++;
    });
    const nGood = hand.decisions.filter((d) => d.class === 'optima' || d.class === 'aceptable').length;
    hand.totalEvLoss = r2(totalEvLoss);
    hand.accuracy = hand.decisions.length ? Math.round((nGood / hand.decisions.length) * 100) : 100;
    hand.accuracyByStreet = byStreet;
    let worst = 'optima';
    const order = ['optima', 'aceptable', 'imprecisa', 'error'];
    hand.decisions.forEach((d) => { if (order.indexOf(d.class) > order.indexOf(worst)) worst = d.class; });
    hand.worstClass = worst;
    if (global.GTOScoring && global.GTOScoring.ensureHandScore) {
      global.GTOScoring.ensureHandScore(hand);
    }
    attachProbeAlerts(hand, hand.decisions);
    recomputeHeroNet(hand);
    return hand;
  }

  function analyzeHand(hand) {
    const RR = global.GTORangesRegistry;
    if (RR) hand.rangeContext = RR.inferFromHand(hand);

    const hero = hand.hero;
    const heroPos = hand.positions[hero] || '??';
    const heroCards = hand.heroCards;
    const code = heroCards.length === 2 ? R.handCode(heroCards[0], heroCards[1]) : null;
    const bb = hand.bb || 0.05;

    if (global.GTOStreetValidation) global.GTOStreetValidation.invalidateSolverCache('new hand analysis');

    const decisions = [];
    // --- PREFLOP ---
    evalPreflop(hand, hero, heroPos, code, decisions);
    // --- POSTFLOP ---
    const villainBase = inferVillainBaseRange(hand, hero);
    const postflopCtx = inferHeroPostflopContext(hand, hero);
    ['flop', 'turn', 'river'].forEach((st) => evalStreet(hand, st, hero, heroCards, bb, decisions, villainBase, postflopCtx));

    if (global.GTOStreetValidation) {
      attachProbeAlerts(hand, decisions);
      const boardsByStreet = {
        flop: boardUpTo(hand, 'flop'),
        turn: boardUpTo(hand, 'turn'),
        river: boardUpTo(hand, 'river')
      };
      const sanity = global.GTOStreetValidation.sanityCheckSolver(decisions, boardsByStreet, 1);
      const facingAlerts = global.GTOStreetValidation.validateHandFacingNodes(decisions);
      if (!sanity.ok || facingAlerts.length) {
        if (!sanity.ok) global.GTOStreetValidation.invalidateSolverCache(sanity.log);
        if (facingAlerts.length) global.GTOStreetValidation.invalidateSolverCache('facing node clone');
        decisions.forEach((d) => recomputeDecisionGto(hand, d));
        attachProbeAlerts(hand, decisions);
      }
    }

    // EV y acierto
    let totalEvLoss = GTO.EvLoss.totalEvLossFromDecisions(decisions);
    const byStreet = {};
    decisions.forEach((d) => {
      byStreet[d.street] = byStreet[d.street] || { n: 0, good: 0 };
      byStreet[d.street].n++;
      if (d.class === 'optima' || d.class === 'aceptable') byStreet[d.street].good++;
    });
    const nGood = decisions.filter((d) => d.class === 'optima' || d.class === 'aceptable').length;
    const accuracy = decisions.length ? Math.round((nGood / decisions.length) * 100) : 100;

    const heroNetEuro = heroNet(hand);
    const heroNetBB = bb ? r2(heroNetEuro / bb) : 0;
    const collected = Object.assign({}, hand.collected || {});
    const uncalledTo = Object.assign({}, hand.uncalledTo || {});

    let worst = 'optima';
    const order = ['optima', 'aceptable', 'imprecisa', 'error'];
    decisions.forEach((d) => { if (order.indexOf(d.class) > order.indexOf(worst)) worst = d.class; });

    const handScoreMeta = (global.GTOScoring && global.GTOScoring.scoreHand)
      ? global.GTOScoring.scoreHand(decisions, totalEvLoss)
      : null;

    const U = global.PTHHUtils;
    const formatKey = hand.formatKey || (U && U.formatKeyFromMeta ? U.formatKeyFromMeta(hand) : 'cash6');
    const seatsCopy = (hand.seats || []).map((s) => ({ seat: s.seat, name: s.name, stack: s.stack }));

    const analyzed = {
      id: hand.id, datetime: hand.datetime,
      heroPos, heroCards, heroCode: code,
      board: hand.boardAll, sb: hand.sb, bb: hand.bb,
      currency: hand.currency || '€',
      hero: hand.hero,
      positions: hand.positions,
      seats: seatsCopy,
      streets: hand.streets,
      posts: hand.posts,
      blinds: hand.blinds,
      villainShows: hand.shows,
      collected,
      uncalledTo,
      rake: hand.rake || 0,
      potTotal: hand.potTotal || 0,
      // Metadata de formato (P0/P1)
      gameKind: hand.gameKind || (hand.isTournament ? 'mtt' : 'cash'),
      isCash: !!hand.isCash,
      isTournament: !!hand.isTournament,
      isZoom: !!hand.isZoom,
      tableMax: hand.tableMax || null,
      playersSeated: hand.playersSeated || seatsCopy.length,
      shortHanded: !!hand.shortHanded,
      variant: hand.variant || 'nlhe',
      platform: hand.platform || null,
      locale: hand.locale || null,
      formatKey: formatKey,
      format: U && U.legacyFormatFromKey ? U.legacyFormatFromKey(formatKey) : '6max',
      stakeTier: hand.stakeTier || null,
      stakesLabel: hand.stakesLabel || '',
      stackDepthBB: hand.stackDepthBB != null ? hand.stackDepthBB : null,
      avgStackBB: hand.avgStackBB != null ? hand.avgStackBB : null,
      mttPhase: hand.mttPhase || null,
      buyIn: hand.buyIn != null ? hand.buyIn : null,
      buyInFee: hand.buyInFee != null ? hand.buyInFee : null,
      multiplier: hand.multiplier != null ? hand.multiplier : null,
      ante: hand.ante || 0,
      straddle: hand.straddle || null,
      rangeContext: hand.rangeContext || null,
      decisions, totalEvLoss: r2(totalEvLoss),
      accuracy, accuracyByStreet: byStreet,
      heroNetBB, worstClass: worst,
      handScore: handScoreMeta ? handScoreMeta.score : null,
      handScoreMeta: handScoreMeta,
      nDecisions: decisions.length,
      summary: buildHandTimeline(hand)
    };
    analyzed.tags = buildHandTags(analyzed);
    return analyzed;
  }

  function playerStreetCommit(hand, player, st) {
    const posts = hand.posts || {};
    const stActs = (hand.streets && hand.streets[st]) || [];
    let committed = (st === 'preflop') ? (posts[player] || 0) : 0;
    stActs.forEach((a) => {
      if (a.player !== player) return;
      if (a.type === 'raise') committed = a.to;
      else if (a.type === 'bet') committed = a.amount;
      else if (a.type === 'call') committed += a.amount;
    });
    return committed;
  }

  function playerInvested(hand, player) {
    let invested = 0;
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      const c = playerStreetCommit(hand, player, st);
      if (st === 'preflop') invested = c;
      else invested += c;
    });
    return r2(invested);
  }

  function boardCardsForShowdown(hand) {
    if (hand.boardAll && hand.boardAll.length) return hand.boardAll.slice();
    if (Array.isArray(hand.board) && hand.board.length && typeof hand.board[0] === 'string') {
      return hand.board.slice();
    }
    if (hand.board && hand.board.flop) {
      return [].concat(hand.board.flop || [], hand.board.turn || [], hand.board.river || []);
    }
    return [];
  }

  function holeCardsByPlayer(hand) {
    const map = Object.assign({}, hand.shows || {}, hand.villainShows || {});
    if (hand.hero && hand.heroCards && hand.heroCards.length >= 2) {
      map[hand.hero] = hand.heroCards.slice(0, 2);
    }
    return map;
  }

  function foldedPlayers(hand) {
    const folded = {};
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      ((hand.streets && hand.streets[st]) || []).forEach((a) => {
        if (a && a.type === 'fold' && a.player) folded[a.player] = true;
      });
    });
    return folded;
  }

  /**
   * Reconstruye collected[] en showdowns cuando el parser no lo rellenó
   * (p. ej. manos antiguas o entrada manual/IA sin premios). Usa side pots
   * estándar; el rake se descuenta del bote disputado (eligible >= 2), no del
   * exceso uncalled.
   */
  function inferCollectedFromShowdown(hand) {
    if (!hand || !C || !C.evaluate || !C.compare) return null;
    const board = boardCardsForShowdown(hand);
    if (board.length < 5) return null;
    const holes = holeCardsByPlayer(hand);
    const folded = foldedPlayers(hand);
    const invested = {};
    const players = {};
    Object.keys(hand.posts || {}).forEach((p) => { players[p] = true; });
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      ((hand.streets && hand.streets[st]) || []).forEach((a) => {
        if (a && a.player) players[a.player] = true;
      });
    });
    Object.keys(holes).forEach((p) => { players[p] = true; });
    Object.keys(players).forEach((p) => {
      const v = playerInvested(hand, p);
      if (v > 0) invested[p] = v;
    });
    const contrib = Object.keys(invested);
    if (!contrib.length) return null;
    if (!contrib.some((p) => !folded[p])) return null;

    const active = contrib.filter((p) => !folded[p]);
    const evalCache = {};
    function evalPlayer(p) {
      if (evalCache[p]) return evalCache[p];
      const hole = holes[p];
      if (!hole || hole.length < 2) return null;
      evalCache[p] = C.evaluate(hole.concat(board));
      return evalCache[p];
    }
    function winnersOf(eligible) {
      const ranked = eligible.map((p) => ({ p, ev: evalPlayer(p) })).filter((x) => x.ev);
      if (!ranked.length) return eligible.slice();
      let best = ranked[0].ev;
      ranked.forEach((x) => { if (C.compare(x.ev, best) > 0) best = x.ev; });
      return ranked.filter((x) => C.compare(x.ev, best) === 0).map((x) => x.p);
    }

    // Bote principal = aportaciones hasta el menor stack activo (+ ciega muerta).
    // Side pots / uncalled = exceso por encima de ese tope.
    const mainCap = Math.min.apply(null, active.map((p) => invested[p]));
    let mainGross = 0;
    contrib.forEach((p) => { mainGross = r2(mainGross + Math.min(invested[p], mainCap)); });
    let mainNet = mainGross;
    if (hand.rake > 0) mainNet = r2(Math.max(0, mainGross - hand.rake));

    const collected = {};
    const mainWinners = winnersOf(active);
    if (mainNet > 0 && mainWinners.length) {
      const share = r2(mainNet / mainWinners.length);
      mainWinners.forEach((w) => { collected[w] = r2((collected[w] || 0) + share); });
    }

    const above = active.filter((p) => invested[p] > mainCap).sort((a, b) => invested[a] - invested[b]);
    let prevCap = mainCap;
    for (let i = 0; i < above.length; i++) {
      const lvl = invested[above[i]];
      const layer = r2(lvl - prevCap);
      if (layer <= 0) continue;
      const eligible = above.filter((p) => invested[p] >= lvl);
      const size = r2(layer * eligible.length);
      if (size <= 0) { prevCap = lvl; continue; }
      const winners = winnersOf(eligible);
      const share = r2(size / winners.length);
      winners.forEach((w) => { collected[w] = r2((collected[w] || 0) + share); });
      prevCap = lvl;
    }

    if (hand.potTotal > 0 && hand.rake <= 0) {
      const awarded = Object.keys(collected).reduce((s, k) => s + collected[k], 0);
      const diff = r2(hand.potTotal - awarded);
      if (Math.abs(diff) >= 0.01 && mainWinners.length) {
        const share = r2(diff / mainWinners.length);
        mainWinners.forEach((w) => { collected[w] = r2((collected[w] || 0) + share); });
      }
    }
    return Object.keys(collected).length ? collected : null;
  }

  function resolveCollected(hand) {
    const collected = hand.collected || {};
    const hero = hand.hero;
    const known = Object.keys(collected).some((k) => (collected[k] || 0) > 0);
    if (known) return collected;
    const inferred = inferCollectedFromShowdown(hand);
    if (inferred) {
      hand.collected = Object.assign({}, collected, inferred);
      return hand.collected;
    }
    return collected;
  }

  function heroNet(hand) {
    const hero = hand.hero;
    if (!hero) return 0;
    const invested = playerInvested(hand, hero);
    const collected = resolveCollected(hand);
    const uncalled = hand.uncalledTo || {};
    const won = (collected[hero] || 0) + (uncalled[hero] || 0);
    return r2(won - invested);
  }

  /** Recalcula heroNetBB (p. ej. sesiones antiguas sin collected). */
  function recomputeHeroNet(hand) {
    if (!hand) return hand;
    hand = ensureAnalyzedHandContext(hand);
    const bb = hand.bb || 0;
    const euro = heroNet(hand);
    hand.heroNetBB = bb ? r2(euro / bb) : 0;
    return hand;
  }

  // Recorre el preflop y evalúa cada decisión voluntaria del héroe.
  // Detecta el tipo de spot: RFI, iso vs limpers, vs open, squeeze,
  // vs 3-bet / vs 4-bet (como abridor) y cold 3-bet+.
  function evalPreflop(hand, hero, heroPos, code, decisions) {
    if (!code) return;
    const RR = global.GTORangesRegistry;
    const ctx = handRangeContext(hand);
    const stackBB = ctx ? ctx.stackBB : 100;
    let raiseCount = 0, lastRaiser = null, potBB = 0, toMatch = hand.bb;
    let limpers = 0, callersAfterRaise = 0, heroHasRaised = false, openRaiser = null;
    const committed = {};
    // Ciegas + antes/straddles desde posts (si existen)
    if (hand.posts && Object.keys(hand.posts).length) {
      Object.keys(hand.posts).forEach((p) => { committed[p] = hand.posts[p] || 0; });
    } else {
      if (hand.blinds && hand.blinds.sb) committed[hand.blinds.sb] = hand.sb;
      if (hand.blinds && hand.blinds.bb) committed[hand.blinds.bb] = hand.bb;
      if (hand.ante && hand.seats && hand.seats.length) {
        hand.seats.forEach((s) => {
          if (!s || !s.name) return;
          committed[s.name] = (committed[s.name] || 0) + hand.ante;
        });
      }
    }
    potBB = Object.values(committed).reduce((s, v) => s + v, 0) / (hand.bb || 1);

    for (const a of hand.streets.preflop) {
      const isHero = a.player === hero;
      const cur = committed[a.player] || 0;

      if (isHero && (a.type === 'fold' || a.type === 'call' || a.type === 'raise')) {
        let facing;
        if (raiseCount === 0) facing = limpers > 0 ? 'vsLimp' : 'RFI';
        else if (raiseCount === 1) facing = callersAfterRaise > 0 ? 'squeeze' : 'vsRFI';
        else if (heroHasRaised && raiseCount === 2) facing = 'vs3bet';
        else if (heroHasRaised && raiseCount >= 3) facing = 'vs4bet';
        else facing = 'cold3bet';

        const openerPos = (openRaiser ? hand.positions[openRaiser] : (lastRaiser ? hand.positions[lastRaiser] : null));
        const toCallBB = Math.max(0, (toMatch - cur) / hand.bb);
        if (!(facing === 'RFI' && heroPos === 'BB' && a.type === 'fold')) {
          const chosen = a.type === 'raise' ? 'raise' : (a.type === 'call' ? 'call' : 'fold');
          const spotKind = mapFacingToKind(facing);
          const opts = facing === 'RFI' ? ['fold', 'raise'] : ['fold', 'call', 'raise'];
          const vsRfiKey = facing === 'vsRFI'
            ? (RR ? RR.vsRfiKey(heroPos, openerPos, ctx) : heroPos + '_vs_' + openerPos)
            : undefined;
          const evalInput = attachRangeContext({
            spotKind, position: heroPos, vsPosition: openerPos,
            stackDepth: stackBB, street: 'preflop', board: [], heroCards: hand.heroCards,
            handCode: code, potBB, toCallBB, chosenAction: chosen,
            vsRfiKey,
            initiative: facing === 'RFI' ? 'none' : 'caller',
            availableActions: opts,
            bbSizeEuro: hand.bb
          }, hand);
          const evalResult = GTO.evaluateSpot(evalInput);
          const ev = evalResult.evaluation;
          const raiseBB = a.type === 'raise' ? r2(a.to / hand.bb) : 0;
          decisions.push({
            street: 'preflop', spot: spotLabel(facing, heroPos, openerPos),
            spotKind, facing, vsPosition: openerPos, vsRfiKey,
            actionType: a.type, chosen, class: ev.class, best: ev.best,
            gto: evalResult.strategy, evLoss: ev.evLoss, evLossEuro: ev.evLossEuro,
            evErroneous: ev.evErroneous, evErrorReasons: ev.evErrorReasons, mathParams: ev.mathParams,
            evLossTier: ev.evLossTier,
            actionEV: ev.actionEV, bestEV: ev.bestEV, frequency: ev.frequency,
            confidence: ev.confidence, confidenceTier: ev.confidenceTier,
            confidenceLabel: ev.confidenceLabel, confidenceTitle: ev.confidenceTitle,
            confidenceReasons: ev.confidenceReasons,
            score: ev.score, explanation: evalResult.explanation,
            optionBreakdown: evalResult.optionBreakdown,
            potBB: r2(potBB), potEvalBB: r2(potBB), toCallBB: r2(toCallBB),
            betSizeBB: raiseBB,
            options: opts,
            context: preflopContext(facing, heroPos, openerPos, toCallBB)
          });
        }
      }

      // actualizar estado
      if (a.type === 'raise') {
        raiseCount++; lastRaiser = a.player; if (raiseCount === 1) openRaiser = a.player;
        if (isHero) heroHasRaised = true;
        callersAfterRaise = 0; toMatch = a.to; committed[a.player] = a.to;
      } else if (a.type === 'bet') { toMatch = a.amount; committed[a.player] = a.amount; }
      else if (a.type === 'call') {
        if (raiseCount === 0) limpers++; else callersAfterRaise++;
        committed[a.player] = toMatch;
      }
      potBB = Object.values(committed).reduce((s, v) => s + v, 0) / hand.bb;
    }
  }

  function mapFacingToKind(facing) {
    const map = { RFI: 'RFI', vsLimp: 'isoLimp', vsRFI: 'vsRFI', squeeze: 'squeeze', vs3bet: 'face3bet', vs4bet: 'face4bet', cold3bet: 'cold3bet' };
    return map[facing] || 'vsRFI';
  }

  function spotLabel(facing, heroPos, openerPos) {
    switch (facing) {
      case 'RFI': return `RFI ${heroPos}`;
      case 'vsLimp': return `${heroPos} iso vs limp`;
      case 'vsRFI': return `${heroPos} vs ${openerPos}`;
      case 'squeeze': return `${heroPos} squeeze vs ${openerPos}`;
      case 'vs3bet': return `${heroPos} abre y afronta 3-bet`;
      case 'vs4bet': return `${heroPos} afronta 4-bet`;
      default: return `${heroPos} vs 3bet+`;
    }
  }

  function preflopContext(facing, heroPos, openerPos, toCallBB) {
    switch (facing) {
      case 'RFI': return `Preflop: eres ${heroPos} y la acción te llega sin subir (RFI).`;
      case 'vsLimp': return `Preflop: eres ${heroPos} con limpers por delante. ¿Aislar (iso-raise), foldear o pagar?`;
      case 'vsRFI': return `Preflop: eres ${heroPos} y ${openerPos} ha abierto. Pagar ${r2(toCallBB)}bb.`;
      case 'squeeze': return `Preflop: eres ${heroPos}, ${openerPos} abre y hay pagador(es). Spot de squeeze. Pagar ${r2(toCallBB)}bb.`;
      case 'vs3bet': return `Preflop: abriste desde ${heroPos} y te hacen 3-bet. ¿Fold, call o 4-bet? Pagar ${r2(toCallBB)}bb.`;
      case 'vs4bet': return `Preflop: te hacen 4-bet. ¿Fold, call o all-in? Pagar ${r2(toCallBB)}bb.`;
      default: return `Preflop: spot de 3-bet en frío o más. Pagar ${r2(toCallBB)}bb.`;
    }
  }

  // Recorre una calle postflop y evalúa cada decisión del héroe
  function evalStreet(hand, st, hero, heroCards, bb, decisions, villainBase, postflopCtx) {
    villainBase = villainBase || BROAD_CONTINUE;
    postflopCtx = postflopCtx || { initiative: 'caller', inPosition: true };
    const ctx = handRangeContext(hand);
    const stackBB = ctx ? ctx.stackBB : 100;
    const acts = hand.streets[st];
    if (!acts.length) return;
    const boardSoFar = boardUpTo(hand, st);
    if (boardSoFar.length < 3 || heroCards.length < 2) return;

    let potBB = priorPotBB(hand, st);
    let toMatch = 0; // apuesta actual de la calle (€)
    const committed = {};
    let pendingVillainAudit = null;

    for (const a of acts) {
      const isHero = a.player === hero;
      const cur = committed[a.player] || 0;

      if (!isHero && a.type === 'call' && global.GTOVillainCallAudit) {
        pendingVillainAudit = global.GTOVillainCallAudit.auditVillainCall({
          action: 'call',
          street: st,
          board: boardSoFar,
          betBB: r2(toMatch / bb),
          potBeforeBB: r2(potBB - (toMatch / bb)),
          heroCards,
          defenderRange: villainBase
        });
      }

      if (isHero && a.type !== 'show') {
        const toCallBB = r2(Math.max(0, (toMatch - cur) / bb));
        const lineCtx = VT && VT.inferVillainLineContext
          ? VT.inferVillainLineContext({
            hand, hero, street: st, heroActIndex: acts.indexOf(a),
            boardSoFar, villainBase, priorPotBB
          })
          : null;
        const villainRange = lineCtx
          ? lineCtx.villainRange
          : (VT && VT.estimateRangeFromActions
            ? VT.estimateRangeFromActions(acts.slice(0, acts.indexOf(a)), hero, bb, priorPotBB(hand, st), boardSoFar, villainBase)
            : villainBase);
        let villainLastAction = lineCtx ? lineCtx.villainLastAction : null;
        let villainBetRatio = lineCtx ? lineCtx.villainBetRatio : null;
        if (!villainLastAction) {
          const priorActs = acts.slice(0, acts.indexOf(a));
          for (let i = priorActs.length - 1; i >= 0; i--) {
            if (priorActs[i].player === hero) break;
            if (priorActs[i].type === 'bet' || priorActs[i].type === 'raise' || priorActs[i].type === 'check' || priorActs[i].type === 'call') {
              villainLastAction = priorActs[i].type;
              if (priorActs[i].type === 'bet') villainBetRatio = r2(priorActs[i].amount / bb / Math.max(potBB - priorActs[i].amount / bb, 0.1));
              else if (priorActs[i].type === 'raise') villainBetRatio = r2(priorActs[i].to / bb / Math.max(potBB - priorActs[i].to / bb, 0.1));
              break;
            }
          }
        }
        const potForEval = r2(potBB);
        const potForDisplay = toCallBB > 0 ? r2(Math.max(potBB - toCallBB, priorPotBB(hand, st))) : potForEval;
        const potBeforeBB = toCallBB > 0 ? potForDisplay : potForEval;
        const RS = global.GTORiverShoveNode;
        const facingNode = RS ? RS.classifyFacingNode(toCallBB, potBeforeBB, st, villainLastAction) : 'small';
        const isRiverShove = st === 'river' && (facingNode === 'shove' || facingNode === 'overbet');
        const heroEquityNow = GTO.Equity.equityVsRange(heroCards, boardSoFar, villainRange, 600, {
          street: st,
          facingBet: toCallBB > 0 && !isRiverShove,
          riverShove: isRiverShove,
          shoveNode: isRiverShove
        });
        let heroEquityAdj = heroEquityNow;
        if (RS && isRiverShove) {
          const deval = RS.pairedBoardFlushDevaluation(heroCards, boardSoFar);
          if (deval.vulnerable) heroEquityAdj = Math.min(heroEquityNow, deval.capEquity);
        }
        const betSizeBB = a.type === 'bet' ? r2(a.amount / bb) : (a.type === 'raise' ? r2(a.to / bb) : 0);
        const chosen = resolvePostflopChosen(a.type, toCallBB, betSizeBB, potForEval);
        const actionType = (a.type === 'raise' && toCallBB <= 0.0001) ? 'bet' : a.type;
        const opts = toCallBB > 0 ? ['fold', 'call', 'raise'] : ['check', 'bet_33', 'bet_66', 'bet_100'];
        const priorBoard = st === 'river' ? boardUpTo(hand, 'turn')
          : (st === 'turn' ? boardUpTo(hand, 'flop') : null);
        const priorAggressorBet = postflopCtx.initiative === 'aggressor'
          ? heroLedOnPriorStreets(hand, hero, st)
          : false;
        const evalResult = GTO.evaluateSpot(attachRangeContext({
          spotKind: 'postflop', position: hand.positions[hero] || '??',
          stackDepth: stackBB, street: st, board: boardSoFar, priorBoard, heroCards,
          handCode: R.handCode(heroCards[0], heroCards[1]),
          potBB: potForEval, toCallBB, chosenAction: chosen,
          villainRange, heroEquity: heroEquityAdj,
          villainLastAction, villainBetRatio,
          potBeforeBB, facingNode, actionSequenceId: acts.indexOf(a),
          initiative: postflopCtx.initiative, inPosition: postflopCtx.inPosition,
          priorAggressorBet,
          availableActions: opts,
          betSizeBB,
          bbSizeEuro: bb
        }, hand));
        const ev = evalResult.evaluation;
        const info = GTO.Equity.classifyMadeHand(heroCards, boardSoFar);
        const handName = info.flush && info.isNutFlush === false
          ? 'Color (sin nuts)'
          : (global.GTOBoardTextureShift && global.GTOBoardTextureShift.isNutStraight(heroCards, boardSoFar)
            ? 'Escalera (nuts)'
            : info.ev.name);
        decisions.push({
          street: st, spot: `${cap(st)} · ${handName}`,
          spotKind: 'postflop', facing: 'postflop',
          actionType, chosen, betSizeBB, class: ev.class, best: ev.best,
          gto: evalResult.strategy, evLoss: ev.evLoss, evLossEuro: ev.evLossEuro,
          evErroneous: ev.evErroneous, evErrorReasons: ev.evErrorReasons, mathParams: ev.mathParams,
          evLossTier: ev.evLossTier,
          actionEV: ev.actionEV, bestEV: ev.bestEV, frequency: ev.frequency,
          confidence: ev.confidence, confidenceTier: ev.confidenceTier,
          confidenceLabel: ev.confidenceLabel, confidenceTitle: ev.confidenceTitle,
          confidenceReasons: ev.confidenceReasons,
          score: ev.score, explanation: evalResult.explanation,
          optionBreakdown: evalResult.optionBreakdown,
          potBB: potForDisplay, potEvalBB: potForEval, potBeforeBB, facingNode,
          toCallBB, villainLastAction, villainBetRatio, villainRange,
          priorBoard, actionSequenceId: acts.indexOf(a),
          initiative: postflopCtx.initiative, inPosition: postflopCtx.inPosition,
          priorAggressorBet,
          board: boardSoFar.slice(),
          heroCards: heroCards.slice(),
          handRank: evalResult.handRank || null,
          madeHandTier: (evalResult.handRank && evalResult.handRank.tier) || info.tier || null,
          options: opts,
          heroEquity: Math.round(heroEquityAdj * 100),
          villainAudit: pendingVillainAudit,
          context: (function () {
            let ctx = `${cap(st)} [${boardSoFar.join(' ')}]: tienes ${handName}. Bote ${potForDisplay}bb${toCallBB > 0 ? `, pagar ${toCallBB}bb` : ''}.`;
            if (toCallBB <= 0 && postflopCtx.initiative === 'aggressor') {
              const lead = (global.GTOSpotKey && global.GTOSpotKey.aggressorLeadLabel)
                ? global.GTOSpotKey.aggressorLeadLabel(st, priorAggressorBet)
                : (st === 'flop' ? 'c-bet'
                  : (priorAggressorBet
                    ? (st === 'turn' ? 'segundo barrel' : 'tercer barrel')
                    : 'delayed c-bet'));
              ctx += villainLastAction === 'check'
                ? ` El villano pasó: spot de ${lead}.`
                : ` Spot de ${lead}.`;
            }
            return ctx;
          })()
        });
        pendingVillainAudit = null;
      }

      if (a.type === 'bet') { toMatch = a.amount; committed[a.player] = a.amount; }
      else if (a.type === 'raise') { toMatch = a.to; committed[a.player] = a.to; }
      else if (a.type === 'call') { committed[a.player] = toMatch; }
      const streetEuro = Object.values(committed).reduce((s, v) => s + v, 0);
      potBB = PM ? PM.potBBFromEuro(priorPotBB(hand, st), streetEuro, bb)
        : r2(priorPotBB(hand, st) + streetEuro / bb);
    }
  }

  function mapPostflopAction(type, toCallBB) {
    if (type === 'fold') return 'fold';
    if (type === 'check') return 'check';
    if (type === 'bet') return 'bet';
    // "Raise" sin apuesta previa = apuesta de apertura (error típico en entrada manual)
    if (type === 'raise') return (toCallBB > 0.0001) ? 'raise' : 'bet';
    if (type === 'call') return (toCallBB > 0.0001) ? 'call' : 'check';
    return type;
  }

  function boardUpTo(hand, st) {
    if (hand.board && Array.isArray(hand.board)) {
      const n = { flop: 3, turn: 4, river: 5 }[st] || 0;
      return hand.board.slice(0, n);
    }
    if (!hand.board || !hand.board.flop) return [];
    if (st === 'flop') return hand.board.flop.slice();
    if (st === 'turn') return hand.board.flop.concat(hand.board.turn);
    return hand.board.flop.concat(hand.board.turn, hand.board.river);
  }
  // pot (en bb) acumulado ANTES de empezar la calle st
  function priorPotBB(hand, st) {
    const bb = hand.bb || 0.05;
    const order = ['preflop', 'flop', 'turn', 'river'];
    const idx = order.indexOf(st);
    if (idx < 0) return 0;
    const upto = order.slice(0, idx);
    let euro = 0;
    upto.forEach((s) => { euro += streetMoney(hand, s); });
    return euro / bb;
  }
  function streetMoney(hand, st) {
    const committed = {};
    const posts = hand.posts || {};
    const acts = (hand.streets && hand.streets[st]) || [];
    if (st === 'preflop') { Object.keys(posts).forEach((p) => { committed[p] = posts[p]; }); }
    let toMatch = st === 'preflop' ? (hand.bb || 0) : 0;
    acts.forEach((a) => {
      if (a.type === 'raise') { toMatch = a.to; committed[a.player] = a.to; }
      else if (a.type === 'bet') { toMatch = a.amount; committed[a.player] = a.amount; }
      else if (a.type === 'call') { committed[a.player] = toMatch; }
    });
    return Object.values(committed).reduce((s, v) => s + v, 0);
  }

  // Timeline legible de la mano real (para revisión paso a paso)
  function buildHandTimeline(hand) {
    const tl = [];
    const streetBoard = { preflop: [], flop: hand.board.flop, turn: hand.board.flop.concat(hand.board.turn), river: hand.boardAll };
    const minBoard = { flop: 3, turn: 4, river: 5 };
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      const acts = hand.streets[st];
      const board = streetBoard[st] || [];
      const hasBoard = st === 'preflop' || board.length >= (minBoard[st] || 0);
      if (st !== 'preflop' && !acts.length && !hasBoard) return;
      if (acts.length || (st !== 'preflop' && hasBoard)) {
        tl.push({ kind: 'street', street: st, board: board.slice() });
      }
      acts.forEach((a) => {
        tl.push({ kind: 'action', street: st, player: a.player, pos: hand.positions[a.player] || '', type: a.type, amount: a.amount, to: a.to, allin: a.allin });
      });
    });
    if (hand.shows) {
      Object.keys(hand.shows).forEach((player) => {
        tl.push({ kind: 'show', street: 'river', player, pos: hand.positions[player] || '', cards: hand.shows[player].slice() });
      });
    }
    return tl;
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- ESTADÍSTICAS DE SESIÓN ----------
  function mergeDiscardCounts(a, b) {
    const out = global.PTHHUtils && global.PTHHUtils.emptyDiscardCounts
      ? global.PTHHUtils.emptyDiscardCounts()
      : { badParse: 0, unsupportedVariant: 0, noBlinds: 0, unknownGame: 0, noHeroCards: 0 };
    [a, b].forEach((src) => {
      if (!src) return;
      Object.keys(out).forEach((k) => { out[k] += src[k] || 0; });
    });
    return out;
  }

  /** Candidatos a héroe (IMP-29): nicks con «Dealt to» en el archivo. */
  function heroCandidatesFromParsed(parsed) {
    if (parsed && Array.isArray(parsed.heroCandidates) && parsed.heroCandidates.length) {
      return parsed.heroCandidates.slice();
    }
    const count = {};
    (parsed && parsed.hands || []).forEach((h) => {
      if (h && h.hero) count[h.hero] = (count[h.hero] || 0) + 1;
    });
    return Object.keys(count).map((n) => ({ name: n, hands: count[n] }))
      .sort((a, b) => b.hands - a.hands);
  }

  /** True si hay ≥2 nicks con manos hero (archivo compartido / equipo). */
  function needsHeroConfirmation(parsed) {
    const cands = heroCandidatesFromParsed(parsed);
    if (cands.length < 2) return false;
    // Segundo nick con al menos 1 mano hero o ≥5% del top
    const top = cands[0].hands || 0;
    const second = cands[1].hands || 0;
    return second >= 1 && (second >= 3 || second / Math.max(1, top) >= 0.05);
  }

  function handDedupeKey(hand) {
    if (!hand) return '';
    const platform = hand.platform || (hand.format && hand.format.platform) || '';
    const id = hand.id != null ? String(hand.id) : '';
    return platform + '|' + id;
  }

  function buildSession(parsed, fileName, rawText) {
    const hero = parsed.hero;
    // Solo filtrar por nick si el usuario confirmó un héroe (IMP-29); si no, conservar todas
    // las manos con cartas hero (HH mixtos / fixtures con varios Dealt to).
    const filterHero = !!(parsed && (parsed.heroConfirmed || parsed.filterHero));
    const kept = [];
    let discarded = 0;
    const discardCounts = mergeDiscardCounts(parsed.discardedByReason, null);
    for (const h of parsed.hands) {
      if (filterHero && hero && h.hero && h.hero !== hero) {
        discarded++;
        continue;
      }
      if (!heroPlayed(h)) {
        discarded++;
        discardCounts.noHeroCards++;
        continue;
      }
      const a = analyzeHand(h);
      kept.push(a);
    }
    const stats = computeStats(kept);
    return sessionPayload(parsed, fileName, hero, kept, discarded, stats, rawText, discardCounts);
  }

  /** Analiza manos en lotes para no bloquear la UI del navegador (10k+ manos). */
  function buildSessionAsync(parsed, fileName, onProgress, rawText) {
    const hero = parsed.hero;
    const filterHero = !!(parsed && (parsed.heroConfirmed || parsed.filterHero));
    const hands = parsed.hands || [];
    const kept = [];
    let discarded = 0;
    const discardCounts = mergeDiscardCounts(parsed.discardedByReason, null);
    let i = 0;
    const CHUNK = analyzeChunkSize(hands.length);
    return new Promise(function (resolve, reject) {
      function step() {
        try {
          const end = Math.min(i + CHUNK, hands.length);
          for (; i < end; i++) {
            const h = hands[i];
            if (filterHero && hero && h.hero && h.hero !== hero) {
              discarded++;
              continue;
            }
            if (!heroPlayed(h)) {
              discarded++;
              discardCounts.noHeroCards++;
              continue;
            }
            kept.push(analyzeHand(h));
          }
          if (onProgress) onProgress(i, hands.length, 'analyze');
          if (i < hands.length) setTimeout(step, 0);
          else resolve(sessionPayload(parsed, fileName, hero, kept, discarded, computeStats(kept), rawText, discardCounts));
        } catch (e) { reject(e); }
      }
      setTimeout(step, 0);
    });
  }

  function sessionPayload(parsed, fileName, hero, kept, discarded, stats, rawText, discardCounts) {
    const txt = rawText != null ? rawText : (parsed && parsed.rawText) || null;
    const U = global.PTHHUtils;
    const context = U && U.buildSessionContext
      ? U.buildSessionContext(kept, discardCounts || parsed.discardedByReason)
      : { gameKind: 'cash', formatKey: 'cash6', format: '6max', mix: {}, nDiscardedByReason: discardCounts || {} };
    if (stats) {
      stats.formatKey = stats.formatKey || context.formatKey;
      stats.format = stats.format || context.format;
      stats.gameKind = stats.gameKind || context.gameKind;
      stats.tableMax = stats.tableMax != null ? stats.tableMax : context.tableMax;
      stats.context = context;
    }
    return {
      id: 's' + Date.now() + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      fileName: fileName || parsed.fileName,
      hero,
      nTotal: (parsed.hands || []).length + (
        discardCounts
          ? Object.keys(discardCounts).reduce((s, k) => s + (k === 'noHeroCards' ? 0 : (discardCounts[k] || 0)), 0)
          : 0
      ),
      nParsed: (parsed.hands || []).length,
      nDiscarded: discarded,
      nDiscardedByReason: context.nDiscardedByReason || discardCounts || {},
      hands: kept,
      stats,
      context,
      format: parsed.format || null,
      analysisVersion: global.PT_BUILD || '1',
      hasTxt: !!txt,
      rawText: txt || null
    };
  }

  /** Rangos ideales 6-max cash NL + umbrales de muestra (STYLE_IDEAL). */
  const STYLE_IDEAL_6MAX = {
    vpipMin: 20, vpipMax: 28,
    pfrMin: 15, pfrMax: 24,
    gapMin: 3, gapMax: 8,
    threeBetMin: 6, threeBetMax: 10,
    foldToThreeBetMin: 45, foldToThreeBetMax: 60,
    fourBetMin: 2, fourBetMax: 4,
    foldToFourBetMin: 45, foldToFourBetMax: 65,
    limpMin: 0, limpMax: 4,
    overlimpMin: 0, overlimpMax: 2,
    isoLimpMin: 40, isoLimpMax: 70,
    stealMin: 30, stealMax: 40,
    foldToStealMin: 55, foldToStealMax: 65,
    squeezeMin: 7, squeezeMax: 9,
    cbetFlopMin: 50, cbetFlopMax: 70,
    foldToCbetFlopMin: 45, foldToCbetFlopMax: 55,
    cbetTurnMin: 40, cbetTurnMax: 60,
    cbetRiverMin: 30, cbetRiverMax: 55,
    delayedCbetMin: 25, delayedCbetMax: 50,
    afMin: 2, afMax: 3.5,
    afqMin: 35, afqMax: 45,
    wtsdMin: 27, wtsdMax: 32,
    wsdMin: 49, wsdMax: 54,
    wwsfMin: 45, wwsfMax: 53,
    sample: {
      vpip: { low: 50, ok: 100, good: 200 },
      pfr: { low: 50, ok: 100, good: 200 },
      threeBet: { low: 30, ok: 100, good: 400 },
      foldToThreeBet: { low: 20, ok: 50, good: 200 },
      fourBet: { low: 15, ok: 40, good: 150 },
      foldToFourBet: { low: 10, ok: 30, good: 100 },
      limp: { low: 30, ok: 80, good: 200 },
      overlimp: { low: 15, ok: 40, good: 120 },
      isoLimp: { low: 15, ok: 40, good: 120 },
      steal: { low: 30, ok: 80, good: 200 },
      foldToSteal: { low: 20, ok: 50, good: 150 },
      squeeze: { low: 20, ok: 50, good: 200 },
      cbetFlop: { low: 20, ok: 50, good: 200 },
      foldToCbetFlop: { low: 20, ok: 50, good: 200 },
      cbetTurn: { low: 15, ok: 40, good: 150 },
      cbetRiver: { low: 10, ok: 30, good: 100 },
      delayedCbet: { low: 15, ok: 40, good: 120 },
      af: { low: 30, ok: 80, good: 200 },
      wtsd: { low: 30, ok: 80, good: 200 },
      wsd: { low: 20, ok: 50, good: 150 },
      wwsf: { low: 30, ok: 80, good: 200 },
      byPos: { low: 20, ok: 50, good: 100 }
    }
  };

  function cloneIdeal(base, overrides) {
    const out = {};
    Object.keys(base).forEach((k) => {
      if (k === 'sample') {
        out.sample = Object.assign({}, base.sample);
        return;
      }
      out[k] = base[k];
    });
    if (overrides) Object.keys(overrides).forEach((k) => { out[k] = overrides[k]; });
    return out;
  }

  const STYLE_IDEAL_BY_FORMAT = {
    '6max': STYLE_IDEAL_6MAX,
    cash6: STYLE_IDEAL_6MAX,
    '9max': cloneIdeal(STYLE_IDEAL_6MAX, {
      vpipMin: 15, vpipMax: 22, pfrMin: 12, pfrMax: 18,
      threeBetMin: 5, threeBetMax: 9, fourBetMin: 1.5, fourBetMax: 3.5,
      stealMin: 25, stealMax: 35
    }),
    cash9: null, // filled below
    shorthand: cloneIdeal(STYLE_IDEAL_6MAX, {
      vpipMin: 28, vpipMax: 42, pfrMin: 22, pfrMax: 36,
      threeBetMin: 8, threeBetMax: 14, stealMin: 40, stealMax: 60,
      foldToStealMin: 45, foldToStealMax: 60
    }),
    cash2: null,
    cash3: null,
    mtt: cloneIdeal(STYLE_IDEAL_6MAX, {
      vpipMin: 18, vpipMax: 28, pfrMin: 14, pfrMax: 24,
      threeBetMin: 5, threeBetMax: 9, fourBetMin: 1.5, fourBetMax: 4,
      stealMin: 28, stealMax: 42,
      foldToStealMin: 50, foldToStealMax: 65
    }),
    mtt6: null,
    mtt9: null,
    mtt3: null,
    spin: cloneIdeal(STYLE_IDEAL_6MAX, {
      vpipMin: 35, vpipMax: 55, pfrMin: 28, pfrMax: 48,
      threeBetMin: 8, threeBetMax: 16, fourBetMin: 2, fourBetMax: 8,
      stealMin: 45, stealMax: 70,
      foldToStealMin: 35, foldToStealMax: 55,
      foldToThreeBetMin: 35, foldToThreeBetMax: 55,
      cbetFlopMin: 45, cbetFlopMax: 75,
      wtsdMin: 22, wtsdMax: 35
    }),
    spin3: null
  };
  STYLE_IDEAL_BY_FORMAT.cash9 = STYLE_IDEAL_BY_FORMAT['9max'];
  STYLE_IDEAL_BY_FORMAT.cash2 = STYLE_IDEAL_BY_FORMAT.shorthand;
  STYLE_IDEAL_BY_FORMAT.cash3 = STYLE_IDEAL_BY_FORMAT.shorthand;
  STYLE_IDEAL_BY_FORMAT.mtt6 = STYLE_IDEAL_BY_FORMAT.mtt;
  STYLE_IDEAL_BY_FORMAT.mtt9 = STYLE_IDEAL_BY_FORMAT.mtt;
  STYLE_IDEAL_BY_FORMAT.mtt3 = STYLE_IDEAL_BY_FORMAT.spin;
  STYLE_IDEAL_BY_FORMAT.spin3 = STYLE_IDEAL_BY_FORMAT.spin;

  /** Alias activo (6-max por defecto); computeStats puede sustituir por formato. */
  let STYLE_IDEAL = STYLE_IDEAL_6MAX;
  const HUD_IDEAL = STYLE_IDEAL_6MAX;

  const STEAL_POS = { CO: true, BTN: true, SB: true };
  const POS_ORDER = ['UTG', 'UTG1', 'UTG2', 'EP0', 'EP1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

  function emptyHeroStyleHud() {
    return {
      vpip: false, pfr: false,
      limpOpp: false, limp: false,
      overlimpOpp: false, overlimp: false,
      isoLimpOpp: false, isoLimp: false,
      threeBetOpp: false, threeBet: false,
      foldToThreeBetOpp: false, foldToThreeBet: false,
      fourBetOpp: false, fourBet: false,
      foldToFourBetOpp: false, foldToFourBet: false,
      stealOpp: false, steal: false,
      foldToStealOpp: false, foldToSteal: false,
      squeezeOpp: false, squeeze: false,
      cbetFlopOpp: false, cbetFlop: false,
      cbetFlopIpOpp: false, cbetFlopIp: false,
      cbetFlopOopOpp: false, cbetFlopOop: false,
      foldToCbetFlopOpp: false, foldToCbetFlop: false,
      cbetTurnOpp: false, cbetTurn: false,
      cbetRiverOpp: false, cbetRiver: false,
      delayedCbetOpp: false, delayedCbet: false,
      sawFlop: false, wentToSd: false, wonAtSd: false, wonWhenSawFlop: false,
      afBets: 0, afRaises: 0, afCalls: 0, afChecks: 0,
      heroPos: null
    };
  }

  function handStreets(hand) {
    hand = ensureAnalyzedHandContext(hand);
    let streets = (hand && hand.streets) || null;
    if ((!streets || !(streets.preflop || []).length) && hand && hand.summary && hand.summary.length) {
      streets = rebuildStreetsFromSummary(hand);
      if (hand && !hand.streets) hand.streets = streets;
    }
    return streets || { preflop: [], flop: [], turn: [], river: [] };
  }

  function heroFoldedStreet(acts, hero) {
    for (let i = 0; i < (acts || []).length; i++) {
      if (acts[i] && acts[i].player === hero && acts[i].type === 'fold') return true;
    }
    return false;
  }

  function heroNeverFolded(streets, hero) {
    return !['preflop', 'flop', 'turn', 'river'].some((st) => heroFoldedStreet(streets[st], hero));
  }

  function detectShowdown(hand, streets, hero) {
    const shows = Object.assign({}, hand.shows || {}, hand.villainShows || {});
    if (Object.keys(shows).length) return true;
    if ((hand.summary || []).some((x) => x && x.kind === 'show')) return true;
    const boardLen = (hand.board && hand.board.length) || 0;
    if (boardLen >= 5 && heroNeverFolded(streets, hero) && ((streets.river || []).length || (streets.turn || []).length)) {
      return true;
    }
    return false;
  }

  function inferSessionFormatKey(hands) {
    let isSpin = false;
    let isMtt = false;
    let maxTable = 0;
    let hasExplicitMeta = false;
    const posSet = {};
    const keyVotes = {};
    (hands || []).forEach((h) => {
      if (!h) return;
      if (h.gameKind || h.formatKey || h.tableMax) hasExplicitMeta = true;
      if (h.gameKind === 'spin' || h.formatKey === 'spin3') isSpin = true;
      if (h.gameKind === 'mtt' || h.gameKind === 'sng' || h.isTournament) isMtt = true;
      const tm = h.tableMax || h.playersSeated || (h.seats && h.seats.length) || 0;
      if (tm > maxTable) maxTable = tm;
      const pos = h.positions || {};
      Object.keys(pos).forEach((p) => { posSet[pos[p]] = true; });
      if (h.heroPos) posSet[h.heroPos] = true;
      if (h.formatKey) keyVotes[h.formatKey] = (keyVotes[h.formatKey] || 0) + 1;
    });
    if (isSpin) return 'spin3';
    if (isMtt) return maxTable >= 8 ? 'mtt9' : (maxTable <= 3 ? 'mtt3' : 'mtt6');
    // Con metadata explícita de mesa, priorizar tableMax
    if (hasExplicitMeta && maxTable >= 8) return 'cash9';
    if (hasExplicitMeta && maxTable > 0 && maxTable <= 3) return maxTable <= 2 ? 'cash2' : 'cash3';
    if (hasExplicitMeta && maxTable > 0 && maxTable <= 6) {
      // aún así, posiciones 9-max ganan si aparecen
      if (posSet.UTG1 || posSet.UTG2 || posSet.LJ) return 'cash9';
      return 'cash6';
    }
    // Heurística clásica por posiciones (sesiones antiguas sin tableMax)
    if (posSet.UTG1 || posSet.UTG2 || posSet.LJ) return 'cash9';
    const nPos = Object.keys(posSet).length;
    if (nPos >= 8 || maxTable >= 8) return 'cash9';
    if (maxTable > 0 && maxTable <= 3) return maxTable <= 2 ? 'cash2' : 'cash3';
    let bestKey = null; let bestN = -1;
    Object.keys(keyVotes).forEach((k) => {
      if (keyVotes[k] > bestN) { bestN = keyVotes[k]; bestKey = k; }
    });
    return bestKey || 'cash6';
  }

  function inferSessionFormat(hands) {
    const U = global.PTHHUtils;
    const key = inferSessionFormatKey(hands);
    return (U && U.legacyFormatFromKey) ? U.legacyFormatFromKey(key) : (
      key.indexOf('spin') === 0 ? 'spin'
        : (key.indexOf('mtt') === 0 ? 'mtt'
          : (key === 'cash9' ? '9max' : (key === 'cash2' || key === 'cash3' ? 'shorthand' : '6max')))
    );
  }

  function styleIdealForFormat(format) {
    if (!format) return STYLE_IDEAL_6MAX;
    if (STYLE_IDEAL_BY_FORMAT[format]) return STYLE_IDEAL_BY_FORMAT[format];
    const U = global.PTHHUtils;
    // Acepta formatKey o legacy
    if (format.indexOf('cash') === 0 || format.indexOf('spin') === 0 || format.indexOf('mtt') === 0) {
      const legacy = U && U.legacyFormatFromKey ? U.legacyFormatFromKey(format) : format;
      return STYLE_IDEAL_BY_FORMAT[legacy] || STYLE_IDEAL_BY_FORMAT[format] || STYLE_IDEAL_6MAX;
    }
    return STYLE_IDEAL_6MAX;
  }

  function formatKeyToRangeGameType(formatKey) {
    const k = formatKey || 'cash6';
    if (k.indexOf('spin') === 0 || k.indexOf('mtt') === 0) return 'mtt';
    if (k === 'cash9') return 'cash9';
    return 'cash6';
  }

  /**
   * HUD de estilo del héroe por mano (Tracker-like).
   * Recorre streets (no solo decisions) para denominadores de oportunidad.
   */
  function heroStyleHud(hand) {
    const out = emptyHeroStyleHud();
    hand = ensureAnalyzedHandContext(hand);
    const hero = hand && hand.hero;
    if (!hero) return out;
    const streets = handStreets(hand);
    const heroPos = (hand.positions && hand.positions[hero]) || hand.heroPos || null;
    out.heroPos = heroPos;
    const preflop = streets.preflop || [];

    let raiseCount = 0;
    let lastRaiser = null;
    let openRaiser = null;
    let openRaiserPos = null;
    let limpers = 0;
    let callersAfterRaise = 0;
    let heroHasRaised = false;

    for (let i = 0; i < preflop.length; i++) {
      const a = preflop[i];
      if (!a) continue;
      if (a.player === hero) {
        if (a.type === 'raise' || a.type === 'bet' || a.type === 'call' || a.type === 'fold' || a.type === 'check') {
          // Limp / overlimp / iso: acción voluntaria preflop sin raise previo (BB check no cuenta)
          if (raiseCount === 0 && !(heroPos === 'BB' && a.type === 'check') && !(heroPos === 'BB' && a.type === 'fold')) {
            if (limpers === 0) {
              out.limpOpp = true;
              if (a.type === 'call') out.limp = true;
            } else {
              out.overlimpOpp = true;
              out.isoLimpOpp = true;
              if (a.type === 'call') out.overlimp = true;
              if (a.type === 'raise' || a.type === 'bet') out.isoLimp = true;
            }
          }
          if (raiseCount === 0 && limpers === 0 && STEAL_POS[heroPos]) {
            out.stealOpp = true;
            if (a.type === 'raise' || a.type === 'bet') out.steal = true;
          }
          if (raiseCount === 1) {
            out.threeBetOpp = true;
            if (a.type === 'raise' || a.type === 'bet') out.threeBet = true;
            if (callersAfterRaise > 0) {
              out.squeezeOpp = true;
              if (a.type === 'raise' || a.type === 'bet') out.squeeze = true;
            }
            const stealFace = openRaiserPos && STEAL_POS[openRaiserPos] && (
              heroPos === 'BB' || (heroPos === 'SB' && openRaiserPos === 'BTN')
            );
            if (stealFace) {
              out.foldToStealOpp = true;
              if (a.type === 'fold') out.foldToSteal = true;
            }
          }
          if (heroHasRaised && raiseCount === 2 && lastRaiser && lastRaiser !== hero) {
            out.foldToThreeBetOpp = true;
            if (a.type === 'fold') out.foldToThreeBet = true;
          }
          // 4-bet opp: facing a 3-bet (open-raiser o cold 4-bet)
          if (raiseCount === 2 && lastRaiser && lastRaiser !== hero) {
            out.fourBetOpp = true;
            if (a.type === 'raise' || a.type === 'bet') out.fourBet = true;
          }
          if (heroHasRaised && raiseCount >= 3 && lastRaiser && lastRaiser !== hero) {
            out.foldToFourBetOpp = true;
            if (a.type === 'fold') out.foldToFourBet = true;
          }
        }
        if (a.type === 'raise' || a.type === 'bet') {
          out.vpip = true;
          out.pfr = true;
        } else if (a.type === 'call') {
          out.vpip = true;
        }
      }

      if (a.type === 'call') {
        if (raiseCount === 0) limpers++;
        else callersAfterRaise++;
      } else if (a.type === 'raise' || a.type === 'bet') {
        raiseCount++;
        lastRaiser = a.player;
        callersAfterRaise = 0;
        if (raiseCount === 1) {
          openRaiser = a.player;
          openRaiserPos = (hand.positions && hand.positions[a.player]) || null;
        }
        if (a.player === hero) heroHasRaised = true;
      }
    }

    const preflopLastRaiser = lastRaiser;
    const flop = streets.flop || [];
    let heroCheckedFlopAsPfr = false;
    if (flop.length && preflopLastRaiser) {
      let facedBet = false;
      let cbetFromPfr = false;
      let heroCbetResolved = false;
      let foldToCbetResolved = false;
      const heroIp = heroIsInPositionPostflop(hand, hero);

      for (let i = 0; i < flop.length; i++) {
        const a = flop[i];
        if (!a) continue;
        if (a.player === hero) {
          if (preflopLastRaiser === hero && !facedBet && !heroCbetResolved) {
            out.cbetFlopOpp = true;
            if (a.type === 'bet' || a.type === 'raise') out.cbetFlop = true;
            if (a.type === 'check') heroCheckedFlopAsPfr = true;
            if (heroIp) {
              out.cbetFlopIpOpp = true;
              if (a.type === 'bet' || a.type === 'raise') out.cbetFlopIp = true;
            } else {
              out.cbetFlopOopOpp = true;
              if (a.type === 'bet' || a.type === 'raise') out.cbetFlopOop = true;
            }
            heroCbetResolved = true;
          }
          if (cbetFromPfr && !foldToCbetResolved) {
            out.foldToCbetFlopOpp = true;
            if (a.type === 'fold') out.foldToCbetFlop = true;
            foldToCbetResolved = true;
          }
        }
        if (a.type === 'bet' || a.type === 'raise') {
          facedBet = true;
          if (a.player === preflopLastRaiser && a.player !== hero) cbetFromPfr = true;
        }
      }
    }

    // Barrel = c-bet en calle previa acertado; delayed = PFR checkeó flop y lidera turn
    function walkBarrel(streetActs, prevCbetHit, oppKey, hitKey) {
      if (!prevCbetHit || !(streetActs || []).length) return;
      let facedBet = false;
      let resolved = false;
      for (let i = 0; i < streetActs.length; i++) {
        const a = streetActs[i];
        if (!a) continue;
        if (a.player === hero && !resolved) {
          if (!facedBet) {
            out[oppKey] = true;
            if (a.type === 'bet' || a.type === 'raise') out[hitKey] = true;
          }
          resolved = true;
        }
        if (a.type === 'bet' || a.type === 'raise') facedBet = true;
      }
    }
    walkBarrel(streets.turn || [], out.cbetFlop, 'cbetTurnOpp', 'cbetTurn');
    walkBarrel(streets.river || [], out.cbetTurn, 'cbetRiverOpp', 'cbetRiver');

    if (heroCheckedFlopAsPfr && preflopLastRaiser === hero && (streets.turn || []).length) {
      let facedBet = false;
      let resolved = false;
      for (let i = 0; i < streets.turn.length; i++) {
        const a = streets.turn[i];
        if (!a) continue;
        if (a.player === hero && !resolved) {
          if (!facedBet) {
            out.delayedCbetOpp = true;
            if (a.type === 'bet' || a.type === 'raise') out.delayedCbet = true;
          }
          resolved = true;
        }
        if (a.type === 'bet' || a.type === 'raise') facedBet = true;
      }
    }

    ['flop', 'turn', 'river'].forEach((stName) => {
      (streets[stName] || []).forEach((a) => {
        if (!a || a.player !== hero) return;
        if (a.type === 'bet') out.afBets++;
        else if (a.type === 'raise') out.afRaises++;
        else if (a.type === 'call') out.afCalls++;
        else if (a.type === 'check') out.afChecks++;
      });
    });

    const foldedPre = heroFoldedStreet(preflop, hero);
    const hasFlop = !!(flop && flop.length) || ((hand.board || []).length >= 3);
    out.sawFlop = !foldedPre && (hasFlop
      || (flop || []).some((a) => a && a.player === hero)
      || (playersReachedFlop(hand).indexOf(hero) >= 0));
    if (out.sawFlop) {
      const sd = detectShowdown(hand, streets, hero) && heroNeverFolded(streets, hero);
      out.wentToSd = sd;
      const won = (hand.heroNetBB != null ? hand.heroNetBB : 0) > 0;
      out.wonWhenSawFlop = won;
      out.wonAtSd = sd && won;
    }

    return out;
  }

  /**
   * VPIP / PFR del héroe en una mano (definición Tracker).
   * Si faltan streets (p. ej. payload slim), se reconstruyen desde summary.
   */
  function heroPreflopHud(hand) {
    const s = heroStyleHud(hand);
    return { vpip: s.vpip, pfr: s.pfr };
  }

  function pctFrom(hits, opps) {
    if (!opps) return null;
    return Math.round((hits / opps) * 1000) / 10;
  }

  function sampleTrust(n, key, ideal) {
    const ideals = ideal || STYLE_IDEAL;
    const th = (ideals.sample && ideals.sample[key]) || { low: 30, ok: 80, good: 200 };
    const count = Number(n) || 0;
    if (count < th.low) return { level: 'low', label: 'Muestra baja', n: count, thresholds: th };
    if (count < th.ok) return { level: 'ok', label: 'Muestra orientativa', n: count, thresholds: th };
    if (count < th.good) return { level: 'good', label: 'Muestra buena', n: count, thresholds: th };
    return { level: 'high', label: 'Muestra sólida', n: count, thresholds: th };
  }

  function bandStatus(value, min, max, trust) {
    if (value == null) return { status: 'unknown', soft: true };
    if (trust && trust.level === 'low') return { status: 'low_sample', soft: true };
    if (value < min) return { status: 'low', soft: false };
    if (value > max) return { status: 'high', soft: false };
    return { status: 'ok', soft: false };
  }

  function assessVpipPfr(vpipPct, pfrPct, handsN, ideal) {
    const I = ideal || STYLE_IDEAL;
    if (vpipPct == null || pfrPct == null) {
      return {
        status: 'unknown',
        label: 'Sin datos',
        comment: 'No hay suficientes acciones preflop del héroe para calcular VPIP/PFR.',
        gap: null,
        ideal: I,
        sample: sampleTrust(handsN || 0, 'vpip', I)
      };
    }
    const gap = Math.max(0, Math.round((vpipPct - pfrPct) * 10) / 10);
    const trust = sampleTrust(handsN != null ? handsN : 999, 'vpip', I);
    const parts = [];
    let status = 'ok';
    const soft = trust.level === 'low';

    if (vpipPct < I.vpipMin) {
      if (!soft) status = 'low';
      parts.push(
        'VPIP bajo (' + vpipPct + '%; ideal ~' + I.vpipMin + '–' + I.vpipMax +
        '%). Estás jugando demasiado tight: abre un poco más desde late (BTN/CO) y revisa folds excesivos vs opens pequeños.'
      );
    } else if (vpipPct > I.vpipMax) {
      if (!soft) status = 'high';
      parts.push(
        'VPIP alto (' + vpipPct + '%; ideal ~' + I.vpipMin + '–' + I.vpipMax +
        '%). Estás entrando en demasiadas manos: recorta limps y calls especulativos out of position; prioriza raises con manos con plan postflop.'
      );
    } else {
      parts.push(
        'VPIP adecuado (' + vpipPct + '% dentro de ~' + I.vpipMin + '–' + I.vpipMax + '%).'
      );
    }

    if (pfrPct < I.pfrMin) {
      if (!soft && status === 'ok') status = 'low';
      parts.push(
        'PFR bajo (' + pfrPct + '%; ideal ~' + I.pfrMin + '–' + I.pfrMax +
        '%). Demasiado pasivo preflop: convierte más limps/calls en opens o 3-bets cuando la mano lo justifica.'
      );
    } else if (pfrPct > I.pfrMax) {
      if (!soft && status === 'ok') status = 'high';
      parts.push(
        'PFR alto (' + pfrPct + '%; ideal ~' + I.pfrMin + '–' + I.pfrMax +
        '%). Estás subiendo de más: reduce opens light UTG/HJ y 3-bets sin equity o sin fold equity clara.'
      );
    } else {
      parts.push(
        'PFR adecuado (' + pfrPct + '% dentro de ~' + I.pfrMin + '–' + I.pfrMax + '%).'
      );
    }

    if (gap > I.gapMax) {
      if (!soft && status === 'ok') status = 'gap';
      parts.push(
        'Hueco VPIP−PFR amplio (' + gap + ' pts; típico ~' + I.gapMin + '–' + I.gapMax +
        '). Indica muchos limps/calls: prioriza raise-or-fold y evita completar SB o flattear manos débiles.'
      );
      if (gap > 10) {
        parts.push('Con más de 10 pts de hueco el perfil es claramente calling-station: value-bet fino y faroles mínimos.');
      }
    } else if (gap < I.gapMin && vpipPct >= I.vpipMin) {
      parts.push(
        'Hueco VPIP−PFR muy estrecho (' + gap + ' pts): casi no flateas. Está bien si es intencional; asegúrate de no overfoldear spots rentables de call (p. ej. BB vs opens pequeños).'
      );
    }

    if (soft) {
      status = 'low_sample';
      parts.unshift('Muestra baja (' + trust.n + ' manos): toma el diagnóstico como orientación, no como veredicto.');
    }

    let label = 'Adecuado';
    if (status === 'low') label = 'Por debajo del ideal';
    else if (status === 'high') label = 'Por encima del ideal';
    else if (status === 'gap') label = 'Desbalance pasivo';
    else if (status === 'low_sample') label = 'Muestra insuficiente';

    return { status, label, comment: parts.join(' '), gap, ideal: I, sample: trust };
  }

  function assessMetricLine(name, pct, min, max, trust, tips) {
    const band = bandStatus(pct, min, max, trust);
    if (pct == null) {
      return { key: name, status: 'unknown', text: null, sample: trust };
    }
    const unit = name === 'AF' ? '' : '%';
    const range = '~' + min + '–' + max + unit;
    let text;
    if (band.status === 'low_sample') {
      text = name + ' ' + pct + unit + ' (ideal ' + range + '; ' + trust.label.toLowerCase() + ', n=' + trust.n + ').';
    } else if (band.status === 'low') {
      text = name + ' bajo (' + pct + unit + '; ideal ' + range + '). ' + (tips.low || '');
    } else if (band.status === 'high') {
      text = name + ' alto (' + pct + unit + '; ideal ' + range + '). ' + (tips.high || '');
    } else {
      text = name + ' adecuado (' + pct + unit + ' dentro de ' + range + ').';
    }
    return { key: name, status: band.status, text: text.trim(), sample: trust, value: pct, idealMin: min, idealMax: max };
  }

  const STYLE_DRILL_MAP = {
    '3-Bet': { low: { scenario: '3bet', practiceStreet: 'preflop', label: 'Practicar 3-bets' }, high: { scenario: '3bet', practiceStreet: 'preflop', label: 'Afinar 3-bets' } },
    'Fold to 3-Bet': { low: { scenario: 'face3bet', practiceStreet: 'preflop', label: 'Defender vs 3-bet' }, high: { scenario: 'face3bet', practiceStreet: 'preflop', label: 'Defender vs 3-bet' } },
    '4-Bet': { low: { scenario: 'face3bet', practiceStreet: 'preflop', label: 'Practicar 4-bets' }, high: { scenario: 'face3bet', practiceStreet: 'preflop', label: 'Afinar 4-bets' } },
    'Fold to 4-Bet': { low: { scenario: 'face3bet', practiceStreet: 'preflop', label: 'vs 4-bet' }, high: { scenario: 'face3bet', practiceStreet: 'preflop', label: 'vs 4-bet' } },
    'Limp': { low: { scenario: 'rfi', practiceStreet: 'preflop', label: 'RFI en vez de limp' }, high: { scenario: 'rfi', practiceStreet: 'preflop', label: 'Raise or fold' } },
    'Overlimp': { low: { scenario: 'rfi', practiceStreet: 'preflop', label: 'Iso vs limpers' }, high: { scenario: 'rfi', practiceStreet: 'preflop', label: 'No overlimpear' } },
    'Iso-limp': { low: { scenario: 'rfi', practiceStreet: 'preflop', label: 'Aislar limpers' }, high: { scenario: 'rfi', practiceStreet: 'preflop', label: 'Iso selectivo' } },
    'Delayed C-Bet': { low: { scenario: 'rfi', practiceStreet: 'flop', label: 'Delayed c-bet' }, high: { scenario: 'rfi', practiceStreet: 'flop', label: 'Delayed selectivo' } },
    'Steal': { low: { scenario: 'rfi', practiceStreet: 'preflop', label: 'Robar blinds (RFI late)' }, high: { scenario: 'rfi', practiceStreet: 'preflop', label: 'RFI más selectivo' } },
    'Fold to Steal': { low: { scenario: '3bet', practiceStreet: 'preflop', label: 'Defensa de blinds' }, high: { scenario: '3bet', practiceStreet: 'preflop', label: 'Defensa de blinds' } },
    'Squeeze': { low: { scenario: 'squeeze', practiceStreet: 'preflop', label: 'Practicar squeezes' }, high: { scenario: 'squeeze', practiceStreet: 'preflop', label: 'Squeezes selectivos' } },
    'C-Bet flop': { low: { scenario: 'rfi', practiceStreet: 'flop', label: 'C-bet y planes de flop' }, high: { scenario: 'rfi', practiceStreet: 'flop', label: 'C-bet selectivo' } },
    'Fold to C-Bet': { low: { scenario: '3bet', practiceStreet: 'flop', label: 'Defensa vs c-bet' }, high: { scenario: '3bet', practiceStreet: 'flop', label: 'Defensa vs c-bet' } },
    'AF': { low: { scenario: 'rfi', practiceStreet: 'flop', label: 'Agresión postflop' }, high: { scenario: 'rfi', practiceStreet: 'flop', label: 'Controlar agresión' } },
    'C-Bet turn': { low: { scenario: 'rfi', practiceStreet: 'flop', label: 'Barrels turn' }, high: { scenario: 'rfi', practiceStreet: 'flop', label: 'Barrels selectivos' } },
    'C-Bet river': { low: { scenario: 'rfi', practiceStreet: 'flop', label: 'River barrels' }, high: { scenario: 'rfi', practiceStreet: 'flop', label: 'River selectivo' } },
    'WTSD': { low: { scenario: 'rfi', practiceStreet: 'flop', label: 'Llegar a showdown' }, high: { scenario: 'rfi', practiceStreet: 'flop', label: 'Foldear peores manos' } }
  };

  function drillsFromAssess(lines, formatKey) {
    const drills = [];
    const seen = {};
    const gameType = formatKeyToRangeGameType(formatKey || (STYLE_IDEAL && STYLE_IDEAL._formatKey) || 'cash6');
    (lines || []).forEach((l) => {
      if (!l || (l.status !== 'low' && l.status !== 'high' && l.status !== 'gap')) return;
      const map = STYLE_DRILL_MAP[l.key];
      if (!map) return;
      const d = map[l.status] || map.low || map.high;
      if (!d || seen[d.label]) return;
      seen[d.label] = true;
      drills.push({
        label: d.label,
        scenario: d.scenario,
        practiceStreet: d.practiceStreet,
        handRange: 'playable',
        villainLevel: 'fish',
        liveAdvisor: true,
        gameType: gameType,
        reason: l.key + ' ' + l.status
      });
    });
    return drills.slice(0, 4);
  }

  function assessStyleStats(style, ideal) {
    const I = ideal || STYLE_IDEAL;
    if (!style) {
      return { status: 'unknown', label: 'Sin datos', comment: 'Sin métricas de estilo.', lines: [], drills: [], sample: {}, ideal: I };
    }
    const formatKey = (style && (style.formatKey || style.format)) || null;
    const lines = [];
    const s = style;
    const samp = s.sample || {};
    lines.push(assessMetricLine('3-Bet', s.threeBetPct, I.threeBetMin, I.threeBetMax, samp.threeBet, {
      low: 'Amplía 3-bets light IP y vs opens late.',
      high: 'Recorta 3-bets sin plan; prioriza valor + bluffs con blockers.'
    }));
    lines.push(assessMetricLine('Fold to 3-Bet', s.foldToThreeBetPct, I.foldToThreeBetMin, I.foldToThreeBetMax, samp.foldToThreeBet, {
      low: 'Estás defendiendo de más vs 3-bets: foldea peores suited connectors OOP.',
      high: 'Overfold vs 3-bet: defiende más IP y 4-betea polarizado.'
    }));
    lines.push(assessMetricLine('4-Bet', s.fourBetPct, I.fourBetMin, I.fourBetMax, samp.fourBet, {
      low: 'Añade 4-bets polarizados (value + blockers) vs 3-bets.',
      high: '4-beteas demasiado light: reduce bluffs sin plan postflop.'
    }));
    lines.push(assessMetricLine('Fold to 4-Bet', s.foldToFourBetPct, I.foldToFourBetMin, I.foldToFourBetMax, samp.foldToFourBet, {
      low: 'Llamas/shippeas de más vs 4-bet: foldea peores bluffcatchers.',
      high: 'Overfold vs 4-bet: defiende más combos de valor.'
    }));
    lines.push(assessMetricLine('Limp', s.limpPct, I.limpMin, I.limpMax, samp.limp, {
      low: 'Casi no limpeas (bien en regs).',
      high: 'Demasiados limps: prefer raise or fold, sobre todo EP/MP.'
    }));
    lines.push(assessMetricLine('Overlimp', s.overlimpPct, I.overlimpMin, I.overlimpMax, samp.overlimp, {
      low: 'Pocos overlimps.',
      high: 'Overlimpeas: aísla o foldea en vez de pagar limps.'
    }));
    lines.push(assessMetricLine('Iso-limp', s.isoLimpPct, I.isoLimpMin, I.isoLimpMax, samp.isoLimp, {
      low: 'Aísla poco vs limpers: añade value + blockers.',
      high: 'Iso demasiado wide: reduce basura OOP.'
    }));
    lines.push(assessMetricLine('Steal', s.stealPct, I.stealMin, I.stealMax, samp.steal, {
      low: 'Roba más desde CO/BTN/SB cuando llega folded to you.',
      high: 'Steals demasiado anchos: reduce basura OOP y vs blinds sticky.'
    }));
    lines.push(assessMetricLine('Fold to Steal', s.foldToStealPct, I.foldToStealMin, I.foldToStealMax, samp.foldToSteal, {
      low: 'Defiendes de más los blinds: recorta calls dominados.',
      high: 'Overfold a steals: amplia defensa BB vs opens late.'
    }));
    lines.push(assessMetricLine('Squeeze', s.squeezePct, I.squeezeMin, I.squeezeMax, samp.squeeze, {
      low: 'Añade squeezes con blockers cuando hay open+call.',
      high: 'Squeezes demasiado light: prioriza manos con equity o fold equity.'
    }));
    lines.push(assessMetricLine('C-Bet flop', s.cbetFlopPct, I.cbetFlopMin, I.cbetFlopMax, samp.cbetFlop, {
      low: 'C-beteas poco: añade polarización en boards favorables.',
      high: 'C-bet demasiado automático: check más en boards malos OOP.'
    }));
    lines.push(assessMetricLine('Fold to C-Bet', s.foldToCbetFlopPct, I.foldToCbetFlopMin, I.foldToCbetFlopMax, samp.foldToCbetFlop, {
      low: 'Pegajoso vs c-bet: foldea peores backdoors OOP.',
      high: 'Overfold al c-bet: defiende más equity y floats IP.'
    }));
    lines.push(assessMetricLine('C-Bet turn', s.cbetTurnPct, I.cbetTurnMin, I.cbetTurnMax, samp.cbetTurn, {
      low: 'Barrelas poco en turn: añade presión en boards buenos.',
      high: 'Demasiados barrels: check más cuando el board no favorece tu rango.'
    }));
    lines.push(assessMetricLine('C-Bet river', s.cbetRiverPct, I.cbetRiverMin, I.cbetRiverMax, samp.cbetRiver, {
      low: 'Pocos rivers como aggressor: value fino + bluffs con blockers.',
      high: 'Overbarrel river: reduce bluffs sin nut advantage.'
    }));
    lines.push(assessMetricLine('Delayed C-Bet', s.delayedCbetPct, I.delayedCbetMin, I.delayedCbetMax, samp.delayedCbet, {
      low: 'Poco delayed tras check flop: añade leads en turn favorables.',
      high: 'Demasiados delayed: elige boards donde el check-raise range del villano sea estrecho.'
    }));
    lines.push(assessMetricLine('AF', s.af, I.afMin, I.afMax, samp.af, {
      low: 'Pasivo postflop: sustituye calls por bets/raises con value y bluffs.',
      high: 'Agresión excesiva: reduce bluffs multi-street sin equity.'
    }));
    if (s.afq != null) {
      lines.push(assessMetricLine('AFq', s.afq, I.afqMin, I.afqMax, samp.af, {
        low: 'Pocas acciones agresivas postflop.',
        high: 'Demasiada frecuencia agresiva postflop.'
      }));
    }
    lines.push(assessMetricLine('WTSD', s.wtsdPct, I.wtsdMin, I.wtsdMax, samp.wtsd, {
      low: 'Llegas poco a showdown: no overfoldees equity realizable.',
      high: 'Calling station en calles tardías: foldea peores manos vs presión.'
    }));
    lines.push(assessMetricLine('W$SD', s.wsdPct, I.wsdMin, I.wsdMax, samp.wsd, {
      low: 'Ganas poco en showdown: value-bea más fino y evita peores calls.',
      high: 'Muy alto W$SD: puedes value-betear más thin.'
    }));
    lines.push(assessMetricLine('WWSF', s.wwsfPct, I.wwsfMin, I.wwsfMax, samp.wwsf, {
      low: 'Ganas pocos botes vistos: más c-bets y value.',
      high: 'Buen winrate en flops vistos.'
    }));

    const hard = lines.filter((l) => l.status === 'low' || l.status === 'high');
    let status = 'ok';
    if (hard.length) status = hard[0].status;
    else if (lines.every((l) => l.status === 'unknown' || l.status === 'low_sample')) status = 'low_sample';

    let label = 'Estilo equilibrado';
    if (status === 'low') label = 'Estilo conservador / pasivo';
    else if (status === 'high') label = 'Estilo agresivo / loose';
    else if (status === 'low_sample') label = 'Muestra insuficiente';

    const commentParts = lines.map((l) => l.text).filter(Boolean);
    const drills = drillsFromAssess(lines.concat(
      style.gap != null && style.gap > (I.gapMax || 8)
        ? [{ key: 'Steal', status: 'low', text: 'gap' }]
        : []
    ), formatKey);
    return {
      status,
      label,
      comment: commentParts.join(' '),
      lines,
      drills,
      ideal: I,
      formatKey: formatKey || null
    };
  }

  function emptyPosBucket() {
    return { hands: 0, vpip: 0, pfr: 0, threeBetOpps: 0, threeBetHits: 0, stealOpps: 0, stealHits: 0 };
  }

  /** IC aproximado 95% para bb/100 (normal, SE = sd/sqrt(n) * 100). */
  function computeBbPer100CI(handNets) {
    const arr = handNets || [];
    const n = arr.length;
    if (n < 30) return null;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += arr[i];
    const mean = sum / n;
    let ss = 0;
    for (let i = 0; i < n; i++) {
      const d = arr[i] - mean;
      ss += d * d;
    }
    const sd = Math.sqrt(ss / Math.max(1, n - 1));
    const se100 = (sd / Math.sqrt(n)) * 100;
    const mean100 = mean * 100;
    const z = 1.96;
    return {
      mean: Math.round(mean100 * 10) / 10,
      se: Math.round(se100 * 10) / 10,
      low: Math.round((mean100 - z * se100) * 10) / 10,
      high: Math.round((mean100 + z * se100) * 10) / 10,
      n: n
    };
  }

  /** Tags ligeros tipo estudio (IMP-26). */
  function buildHandTags(hand, hud) {
    const tags = [];
    const h = hand || {};
    const style = hud || heroStyleHud(h);
    const hero = h.hero;
    const pos = h.heroPos || (h.positions && hero && h.positions[hero]) || null;
    const pre = ((h.streets && h.streets.preflop) || []);
    let raises = 0;
    pre.forEach((a) => { if (a && (a.type === 'raise' || a.type === 'bet')) raises++; });
    const ip = hero ? heroIsInPositionPostflop(h, hero) : null;
    if (raises >= 2) tags.push(ip ? '3bet pot IP' : '3bet pot OOP');
    else if (raises === 1) tags.push(ip ? 'SRP IP' : 'SRP OOP');
    else if (style.limp || style.overlimp) tags.push('limped pot');
    if (style.isoLimp) tags.push('iso limp');
    if (style.squeeze) tags.push('squeeze');
    if (style.cbetFlopOpp && !style.cbetFlop) tags.push('miss cbet flop');
    if (style.foldToCbetFlop) tags.push('fold to cbet');
    if (style.delayedCbet) tags.push('delayed cbet');
    if (style.cbetTurn) tags.push('barrel turn');
    if (h.shortHanded) tags.push('short-handed');
    if (h.gameKind && h.gameKind !== 'cash') tags.push(h.gameKind);
    if (h.mttPhase) tags.push('stack:' + h.mttPhase);
    if (pos) tags.push('pos:' + pos);
    // unique
    const seen = {};
    return tags.filter((t) => { if (seen[t]) return false; seen[t] = true; return true; });
  }

  function computeStats(hands) {
    const n = hands.length;
    const formatKey = inferSessionFormatKey(hands);
    const format = inferSessionFormat(hands);
    let ideal = styleIdealForFormat(formatKey);
    // Short-handed efectivo: afloja bandas cash si muchas manos a mesa incompleta
    const shortN = (hands || []).filter((h) => h && h.shortHanded).length;
    if (shortN > n * 0.5 && (formatKey === 'cash6' || formatKey === 'cash9')) {
      ideal = cloneIdeal(ideal, {
        vpipMin: ideal.vpipMin + 3, vpipMax: ideal.vpipMax + 5,
        pfrMin: ideal.pfrMin + 2, pfrMax: ideal.pfrMax + 4,
        stealMin: (ideal.stealMin || 30) + 5, stealMax: (ideal.stealMax || 40) + 8
      });
    }
    STYLE_IDEAL = ideal;

    const U = global.PTHHUtils;
    const ctx = U && U.buildSessionContext ? U.buildSessionContext(hands, null) : null;
    const gameKind = (ctx && ctx.gameKind) || 'cash';
    const tableMax = ctx && ctx.tableMax;

    let decN = 0, decGood = 0, evLoss = 0, netBB = 0, evLossEuro = 0;
    let handScoreSum = 0, handScoreN = 0;
    let vpipN = 0, pfrN = 0;
    let threeBetOpps = 0, threeBetHits = 0;
    let foldToThreeBetOpps = 0, foldToThreeBetHits = 0;
    let fourBetOpps = 0, fourBetHits = 0;
    let foldToFourBetOpps = 0, foldToFourBetHits = 0;
    let stealOpps = 0, stealHits = 0;
    let foldToStealOpps = 0, foldToStealHits = 0;
    let squeezeOpps = 0, squeezeHits = 0;
    let limpOpps = 0, limpHits = 0;
    let overlimpOpps = 0, overlimpHits = 0;
    let isoLimpOpps = 0, isoLimpHits = 0;
    let delayedCbetOpps = 0, delayedCbetHits = 0;
    let netEuro = 0;
    let buyInTotal = 0;
    let buyInEvents = 0;
    const stakeTierCount = {};
    const phaseCount = {};
    const byStakesMap = {};
    let cbetFlopOpps = 0, cbetFlopHits = 0;
    let cbetFlopIpOpps = 0, cbetFlopIpHits = 0;
    let cbetFlopOopOpps = 0, cbetFlopOopHits = 0;
    let foldToCbetFlopOpps = 0, foldToCbetFlopHits = 0;
    let cbetTurnOpps = 0, cbetTurnHits = 0;
    let cbetRiverOpps = 0, cbetRiverHits = 0;
    let afBets = 0, afRaises = 0, afCalls = 0, afChecks = 0;
    let sawFlopN = 0, wtsdN = 0, wonAtSdN = 0, wonSawFlopN = 0;
    const byPosition = {};
    const handNets = [];
    const bbRef = hands[0] && hands[0].bb ? hands[0].bb : 0.05;
    const street = { preflop: { n: 0, good: 0 }, flop: { n: 0, good: 0 }, turn: { n: 0, good: 0 }, river: { n: 0, good: 0 } };
    const dist = { optima: 0, aceptable: 0, imprecisa: 0, error: 0 };
    hands.forEach((h) => {
      ensureAnalyzedHandContext(h);
      if (global.GTOScoring && global.GTOScoring.ensureHandScore) {
        global.GTOScoring.ensureHandScore(h);
      } else if (h.handScore == null && global.GTOScoring && global.GTOScoring.scoreHand) {
        const graded = global.GTOScoring.scoreHand(h.decisions || [], h.totalEvLoss);
        h.handScore = graded.score;
        h.handScoreMeta = graded;
      }
      if (h.handScore != null) {
        handScoreSum += Number(h.handScore) || 0;
        handScoreN++;
      }
      netBB += h.heroNetBB;
      handNets.push(Number(h.heroNetBB) || 0);
      evLoss += h.totalEvLoss;
      if (h.bb) netEuro += (h.heroNetBB || 0) * h.bb;
      if (h.buyIn != null) {
        buyInTotal += h.buyIn + (h.buyInFee || 0);
        buyInEvents++;
      }
      if (h.stakeTier) stakeTierCount[h.stakeTier] = (stakeTierCount[h.stakeTier] || 0) + 1;
      if (h.mttPhase) phaseCount[h.mttPhase] = (phaseCount[h.mttPhase] || 0) + 1;
      const stakeKey = h.stakesLabel || (h.bb ? ((h.currency || '€') + (h.sb || h.bb / 2) + '/' + (h.currency || '€') + h.bb) : 'unknown');
      if (!byStakesMap[stakeKey]) byStakesMap[stakeKey] = { hands: 0, netBB: 0, stakeTier: h.stakeTier || null };
      byStakesMap[stakeKey].hands++;
      byStakesMap[stakeKey].netBB += Number(h.heroNetBB) || 0;
      const hud = heroStyleHud(h);
      if (hud.vpip) vpipN++;
      if (hud.pfr) pfrN++;
      if (hud.limpOpp) { limpOpps++; if (hud.limp) limpHits++; }
      if (hud.overlimpOpp) { overlimpOpps++; if (hud.overlimp) overlimpHits++; }
      if (hud.isoLimpOpp) { isoLimpOpps++; if (hud.isoLimp) isoLimpHits++; }
      if (hud.threeBetOpp) { threeBetOpps++; if (hud.threeBet) threeBetHits++; }
      if (hud.foldToThreeBetOpp) { foldToThreeBetOpps++; if (hud.foldToThreeBet) foldToThreeBetHits++; }
      if (hud.fourBetOpp) { fourBetOpps++; if (hud.fourBet) fourBetHits++; }
      if (hud.foldToFourBetOpp) { foldToFourBetOpps++; if (hud.foldToFourBet) foldToFourBetHits++; }
      if (hud.stealOpp) { stealOpps++; if (hud.steal) stealHits++; }
      if (hud.foldToStealOpp) { foldToStealOpps++; if (hud.foldToSteal) foldToStealHits++; }
      if (hud.squeezeOpp) { squeezeOpps++; if (hud.squeeze) squeezeHits++; }
      if (hud.cbetFlopOpp) { cbetFlopOpps++; if (hud.cbetFlop) cbetFlopHits++; }
      if (hud.cbetFlopIpOpp) { cbetFlopIpOpps++; if (hud.cbetFlopIp) cbetFlopIpHits++; }
      if (hud.cbetFlopOopOpp) { cbetFlopOopOpps++; if (hud.cbetFlopOop) cbetFlopOopHits++; }
      if (hud.foldToCbetFlopOpp) { foldToCbetFlopOpps++; if (hud.foldToCbetFlop) foldToCbetFlopHits++; }
      if (hud.cbetTurnOpp) { cbetTurnOpps++; if (hud.cbetTurn) cbetTurnHits++; }
      if (hud.cbetRiverOpp) { cbetRiverOpps++; if (hud.cbetRiver) cbetRiverHits++; }
      if (hud.delayedCbetOpp) { delayedCbetOpps++; if (hud.delayedCbet) delayedCbetHits++; }
      afBets += hud.afBets;
      afRaises += hud.afRaises;
      afCalls += hud.afCalls;
      afChecks += hud.afChecks;
      if (hud.sawFlop) {
        sawFlopN++;
        if (hud.wentToSd) {
          wtsdN++;
          if (hud.wonAtSd) wonAtSdN++;
        }
        if (hud.wonWhenSawFlop) wonSawFlopN++;
      }
      const pos = hud.heroPos || h.heroPos || '??';
      if (!byPosition[pos]) byPosition[pos] = emptyPosBucket();
      const pb = byPosition[pos];
      pb.hands++;
      if (hud.vpip) pb.vpip++;
      if (hud.pfr) pb.pfr++;
      if (hud.threeBetOpp) { pb.threeBetOpps++; if (hud.threeBet) pb.threeBetHits++; }
      if (hud.stealOpp) { pb.stealOpps++; if (hud.steal) pb.stealHits++; }
      (h.decisions || []).forEach((d) => {
        if (d.evErroneous) evLossEuro += d.evLossEuro != null ? d.evLossEuro : r2((d.evLoss || 0) * bbRef);
        decN++;
        if (d.class === 'optima' || d.class === 'aceptable') decGood++;
        dist[d.class] = (dist[d.class] || 0) + 1;
        const s = street[d.street]; if (s) { s.n++; if (d.class === 'optima' || d.class === 'aceptable') s.good++; }
      });
    });
    const accuracy = decN ? Math.round((decGood / decN) * 100) : 100;
    const accByStreet = {};
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      accByStreet[st] = street[st].n ? Math.round((street[st].good / street[st].n) * 100) : null;
    });

    const byNet = hands.slice().sort((a, b) => b.heroNetBB - a.heroNetBB);
    const best5 = byNet.slice(0, 5);
    const worst5 = byNet.slice(-5).reverse();

    const evLostBB = r2(evLoss);
    const actualNet = r2(netBB);
    const netEv = GTO.EvLoss.computeNetEvStats(actualNet, evLostBB);
    const expectedNet = netEv.expectedNet;
    const varianceAdj = netEv.varianceAdj;
    const perfectPlayNetBB = expectedNet;
    const perfectPlayNetEuro = r2(perfectPlayNetBB * bbRef);
    const adjustedNet = expectedNet;
    const evLossEuroTotal = r2(evLossEuro || evLostBB * bbRef);
    const leakVar = GTO.EvLoss.computeLeakVariancePct
      ? GTO.EvLoss.computeLeakVariancePct(actualNet, evLostBB)
      : { pctDecision: 50, pctVariance: 50, leakPartBB: evLostBB, varPartBB: 0 };
    const pctDecision = leakVar.pctDecision;
    const pctVariance = leakVar.pctVariance;

    const grade = sessionGrade(accuracy, evLoss, decN, netBB);
    const avgHandScore = handScoreN ? r2(handScoreSum / handScoreN) : null;
    const vpipPct = n ? Math.round((vpipN / n) * 1000) / 10 : null;
    const pfrPct = n ? Math.round((pfrN / n) * 1000) / 10 : null;
    const vpipPfr = assessVpipPfr(vpipPct, pfrPct, n, ideal);

    const limpPct = pctFrom(limpHits, limpOpps);
    const overlimpPct = pctFrom(overlimpHits, overlimpOpps);
    const isoLimpPct = pctFrom(isoLimpHits, isoLimpOpps);
    const threeBetPct = pctFrom(threeBetHits, threeBetOpps);
    const foldToThreeBetPct = pctFrom(foldToThreeBetHits, foldToThreeBetOpps);
    const fourBetPct = pctFrom(fourBetHits, fourBetOpps);
    const foldToFourBetPct = pctFrom(foldToFourBetHits, foldToFourBetOpps);
    const stealPct = pctFrom(stealHits, stealOpps);
    const foldToStealPct = pctFrom(foldToStealHits, foldToStealOpps);
    const squeezePct = pctFrom(squeezeHits, squeezeOpps);
    const cbetFlopPct = pctFrom(cbetFlopHits, cbetFlopOpps);
    const cbetFlopIpPct = pctFrom(cbetFlopIpHits, cbetFlopIpOpps);
    const cbetFlopOopPct = pctFrom(cbetFlopOopHits, cbetFlopOopOpps);
    const foldToCbetFlopPct = pctFrom(foldToCbetFlopHits, foldToCbetFlopOpps);
    const cbetTurnPct = pctFrom(cbetTurnHits, cbetTurnOpps);
    const cbetRiverPct = pctFrom(cbetRiverHits, cbetRiverOpps);
    const delayedCbetPct = pctFrom(delayedCbetHits, delayedCbetOpps);
    const afAgg = afBets + afRaises;
    const afActions = afAgg + afCalls + afChecks;
    const af = afCalls > 0 ? Math.round((afAgg / afCalls) * 100) / 100
      : (afAgg > 0 ? afAgg : null);
    const afq = afActions > 0 ? Math.round((afAgg / afActions) * 1000) / 10 : null;
    const wtsdPct = pctFrom(wtsdN, sawFlopN);
    const wsdPct = pctFrom(wonAtSdN, wtsdN);
    const wwsfPct = pctFrom(wonSawFlopN, sawFlopN);
    const bbPer100 = n ? Math.round((actualNet / n) * 1000) / 10 : null;
    const bbPer100CI = computeBbPer100CI(handNets);
    const bbPer100Note = n < 20000
      ? 'Varianza alta con menos de 20k manos; interpreta bb/100 con cautela.'
        + (bbPer100CI ? (' IC95%: ' + (bbPer100CI.low >= 0 ? '+' : '') + bbPer100CI.low
          + ' … ' + (bbPer100CI.high >= 0 ? '+' : '') + bbPer100CI.high + ' bb/100.') : '')
      : (bbPer100CI ? ('IC95% ≈ ' + (bbPer100CI.low >= 0 ? '+' : '') + bbPer100CI.low
        + ' … ' + (bbPer100CI.high >= 0 ? '+' : '') + bbPer100CI.high + ' bb/100.') : null);
    const evLossPer100 = n ? Math.round((evLostBB / n) * 1000) / 10 : null;
    const byStakes = Object.keys(byStakesMap).map((k) => {
      const b = byStakesMap[k];
      return {
        stakesLabel: k,
        stakeTier: b.stakeTier,
        hands: b.hands,
        netBB: r2(b.netBB),
        bbPer100: b.hands ? Math.round((b.netBB / b.hands) * 1000) / 10 : null
      };
    }).sort((a, b) => b.hands - a.hands);

    const byPositionOut = {};
    POS_ORDER.concat(Object.keys(byPosition)).forEach((pos) => {
      if (!byPosition[pos] || byPositionOut[pos]) return;
      const pb = byPosition[pos];
      byPositionOut[pos] = {
        hands: pb.hands,
        vpipPct: pctFrom(pb.vpip, pb.hands),
        pfrPct: pctFrom(pb.pfr, pb.hands),
        threeBetPct: pctFrom(pb.threeBetHits, pb.threeBetOpps),
        threeBetOpps: pb.threeBetOpps,
        stealPct: pctFrom(pb.stealHits, pb.stealOpps),
        stealOpps: pb.stealOpps,
        sample: sampleTrust(pb.hands, 'byPos', ideal)
      };
    });

    // ROI aproximado (spins/MTT): profit € / buy-ins invertidos
    // Nota: sin ficheros de resultados de torneo, usamos buyIn declarado × manos/estimación débil.
    const avgBuyIn = buyInEvents ? (buyInTotal / buyInEvents) : (ctx && ctx.avgBuyIn) || null;
    let roiPct = null;
    let profitEuro = r2(netEuro);
    if (avgBuyIn && (gameKind === 'spin' || gameKind === 'mtt' || gameKind === 'sng')) {
      // Heurística: 1 buy-in por sesión-archivo si no hay mejor señal; si hay buyIn en manos, usamos suma
      const invested = buyInEvents ? buyInTotal : avgBuyIn;
      if (invested > 0) roiPct = Math.round(((profitEuro) / invested) * 1000) / 10;
    }
    let dominantStakeTier = null;
    let bestTierN = -1;
    Object.keys(stakeTierCount).forEach((k) => {
      if (stakeTierCount[k] > bestTierN) { bestTierN = stakeTierCount[k]; dominantStakeTier = k; }
    });
    let dominantPhase = null;
    let bestPhaseN = -1;
    Object.keys(phaseCount).forEach((k) => {
      if (phaseCount[k] > bestPhaseN) { bestPhaseN = phaseCount[k]; dominantPhase = k; }
    });

    const style = {
      format,
      formatKey,
      gameKind,
      tableMax,
      vpipPct, pfrPct, gap: vpipPct != null && pfrPct != null ? Math.round((vpipPct - pfrPct) * 10) / 10 : null,
      limpPct, limpOpps, limpHits,
      overlimpPct, overlimpOpps, overlimpHits,
      isoLimpPct, isoLimpOpps, isoLimpHits,
      threeBetPct, threeBetOpps, threeBetHits,
      foldToThreeBetPct, foldToThreeBetOpps, foldToThreeBetHits,
      fourBetPct, fourBetOpps, fourBetHits,
      foldToFourBetPct, foldToFourBetOpps, foldToFourBetHits,
      stealPct, stealOpps, stealHits,
      foldToStealPct, foldToStealOpps, foldToStealHits,
      squeezePct, squeezeOpps, squeezeHits,
      cbetFlopPct, cbetFlopOpps, cbetFlopHits,
      cbetFlopIpPct, cbetFlopIpOpps, cbetFlopIpHits,
      cbetFlopOopPct, cbetFlopOopOpps, cbetFlopOopHits,
      foldToCbetFlopPct, foldToCbetFlopOpps, foldToCbetFlopHits,
      cbetTurnPct, cbetTurnOpps, cbetTurnHits,
      cbetRiverPct, cbetRiverOpps, cbetRiverHits,
      delayedCbetPct, delayedCbetOpps, delayedCbetHits,
      af, afq, afBets, afRaises, afCalls, afChecks,
      wtsdPct, wsdPct, wwsfPct, sawFlopN, wtsdN, wonAtSdN, wonSawFlopN,
      bbPer100, bbPer100Note, bbPer100CI, evLossPer100,
      byPosition: byPositionOut,
      byStakes,
      sample: {
        vpip: sampleTrust(n, 'vpip', ideal),
        pfr: sampleTrust(n, 'pfr', ideal),
        limp: sampleTrust(limpOpps, 'limp', ideal),
        overlimp: sampleTrust(overlimpOpps, 'overlimp', ideal),
        isoLimp: sampleTrust(isoLimpOpps, 'isoLimp', ideal),
        threeBet: sampleTrust(threeBetOpps, 'threeBet', ideal),
        foldToThreeBet: sampleTrust(foldToThreeBetOpps, 'foldToThreeBet', ideal),
        fourBet: sampleTrust(fourBetOpps, 'fourBet', ideal),
        foldToFourBet: sampleTrust(foldToFourBetOpps, 'foldToFourBet', ideal),
        steal: sampleTrust(stealOpps, 'steal', ideal),
        foldToSteal: sampleTrust(foldToStealOpps, 'foldToSteal', ideal),
        squeeze: sampleTrust(squeezeOpps, 'squeeze', ideal),
        cbetFlop: sampleTrust(cbetFlopOpps, 'cbetFlop', ideal),
        foldToCbetFlop: sampleTrust(foldToCbetFlopOpps, 'foldToCbetFlop', ideal),
        cbetTurn: sampleTrust(cbetTurnOpps, 'cbetTurn', ideal),
        cbetRiver: sampleTrust(cbetRiverOpps, 'cbetRiver', ideal),
        delayedCbet: sampleTrust(delayedCbetOpps, 'delayedCbet', ideal),
        af: sampleTrust(afActions, 'af', ideal),
        wtsd: sampleTrust(sawFlopN, 'wtsd', ideal),
        wsd: sampleTrust(wtsdN, 'wsd', ideal),
        wwsf: sampleTrust(sawFlopN, 'wwsf', ideal)
      }
    };
    const styleAssess = assessStyleStats(style, ideal);

    return {
      nHands: n, nDecisions: decN, accuracy, accByStreet, dist,
      netBB: actualNet, evLossBB: evLostBB,
      evPerHand: n ? r2(evLoss / n) : 0,
      avgHandScore,
      best5: best5.map(slim), worst5: worst5.map(slim),
      evDecision: evLostBB, expectedNet, actualNet, varianceAdj, adjustedNet,
      perfectPlayNetBB, perfectPlayNetEuro, evLossEuroTotal,
      pctDecision, pctVariance, leakPartBB: leakVar.leakPartBB, varPartBB: leakVar.varPartBB,
      vpipPct, pfrPct, vpipHands: vpipN, pfrHands: pfrN,
      vpipPfrGap: style.gap,
      vpipPfr: vpipPfr,
      limpPct, limpOpps, limpHits,
      overlimpPct, overlimpOpps, overlimpHits,
      isoLimpPct, isoLimpOpps, isoLimpHits,
      threeBetPct, threeBetOpps, threeBetHits,
      foldToThreeBetPct, foldToThreeBetOpps, foldToThreeBetHits,
      fourBetPct, fourBetOpps, fourBetHits,
      foldToFourBetPct, foldToFourBetOpps, foldToFourBetHits,
      stealPct, stealOpps, stealHits,
      foldToStealPct, foldToStealOpps, foldToStealHits,
      squeezePct, squeezeOpps, squeezeHits,
      cbetFlopPct, cbetFlopOpps, cbetFlopHits,
      cbetFlopIpPct, cbetFlopIpOpps, cbetFlopIpHits,
      cbetFlopOopPct, cbetFlopOopOpps, cbetFlopOopHits,
      foldToCbetFlopPct, foldToCbetFlopOpps, foldToCbetFlopHits,
      cbetTurnPct, cbetTurnOpps, cbetTurnHits,
      cbetRiverPct, cbetRiverOpps, cbetRiverHits,
      delayedCbetPct, delayedCbetOpps, delayedCbetHits,
      af, afq, afBets, afRaises, afCalls, afChecks,
      wtsdPct, wsdPct, wwsfPct, sawFlopN, wtsdN, wonAtSdN, wonSawFlopN,
      bbPer100, bbPer100Note, bbPer100CI, evLossPer100,
      byPosition: byPositionOut,
      byStakes,
      format, formatKey, gameKind, tableMax,
      stakesLabel: (ctx && ctx.stakesLabel) || '',
      stakeTier: dominantStakeTier,
      mttPhase: dominantPhase,
      shortHandedShare: ctx ? ctx.shortHandedShare : 0,
      profitEuro, avgBuyIn, roiPct,
      styleIdeal: ideal,
      style, styleAssess,
      grade
    };
  }

  function slim(h) {
    const scoreMeta = (h.handScoreMeta && h.handScore != null)
      ? h.handScoreMeta
      : (global.GTOScoring && global.GTOScoring.scoreHand
        ? global.GTOScoring.scoreHand(h.decisions || [], h.totalEvLoss)
        : null);
    const handScore = h.handScore != null ? h.handScore : (scoreMeta ? scoreMeta.score : null);
    return {
      id: h.id, heroCode: h.heroCode, heroCards: h.heroCards, heroPos: h.heroPos, board: h.board,
      heroNetBB: h.heroNetBB, totalEvLoss: h.totalEvLoss, accuracy: h.accuracy, worstClass: h.worstClass,
      handScore: handScore,
      handScoreMeta: scoreMeta
    };
  }

  function sessionGrade(accuracy, evLoss, decN, netBB) {
    const evPer100 = decN ? (evLoss / decN) * 100 : 0; // bb perdidos cada 100 decisiones
    // puntuación 0..10: acierto pesa, penaliza EV perdido por decisión
    let score = (accuracy / 10) * 0.6 + Math.max(0, 10 - evPer100 / 3) * 0.4;
    score = Math.max(0, Math.min(10, score));
    let letter;
    if (score >= 9) letter = 'A+';
    else if (score >= 8) letter = 'A';
    else if (score >= 7) letter = 'B';
    else if (score >= 6) letter = 'C';
    else if (score >= 4.5) letter = 'D';
    else letter = 'E';
    let verdict;
    if (score >= 8) verdict = 'Sesión muy sólida, decisiones cercanas a GTO.';
    else if (score >= 6.5) verdict = 'Buena sesión con margen de mejora puntual.';
    else if (score >= 5) verdict = 'Sesión regular: revisa los spots con más EV perdido.';
    else verdict = 'Sesión con fugas importantes; repasa los errores marcados.';
    return { score: r2(score), letter, verdict };
  }

  function appendShowdownToTimeline(h, tl) {
    const shows = h.villainShows || {};
    Object.keys(shows).forEach((player) => {
      if (tl.some((x) => x.kind === 'show' && x.player === player)) return;
      const posItem = tl.find((x) => (x.kind === 'action' || x.kind === 'show') && x.player === player && x.pos);
      tl.push({
        kind: 'show', street: 'river', player,
        pos: posItem ? posItem.pos : '',
        cards: shows[player].slice()
      });
    });
  }

  /** Añade river y showdown al timeline si el board está completo (p. ej. all-in en turn). */
  function ensureFullTimeline(h) {
    if (!h) return h;
    const board = h.board || [];
    if (board.length < 5) return h;
    const summary = (h.summary && h.summary.length) ? h.summary.slice() : [];
    const hasRiver = summary.some((x) => x.kind === 'street' && x.street === 'river');
    if (!hasRiver) {
      summary.push({ kind: 'street', street: 'river', board: board.slice() });
    }
    appendShowdownToTimeline(h, summary);
    h.summary = summary;
    return h;
  }

  function ensureHandSummary(h) {
    if (!h) return h;
    if (!h.summary || !h.summary.length) {
      const tl = [];
      let lastStreet = null;
      (h.decisions || []).forEach(function (d) {
        if (d.street !== lastStreet) {
          const n = { preflop: 0, flop: 3, turn: 4, river: 5 }[d.street] || 0;
          tl.push({ kind: 'street', street: d.street, board: (h.board || []).slice(0, n) });
          lastStreet = d.street;
        }
        const raw = d.chosen || d.action || 'check';
        const type = raw.indexOf('bet_') === 0 ? 'bet' : raw.split('_')[0];
        tl.push({
          kind: 'action', street: d.street,
          player: h.heroPos || 'Héroe', pos: h.heroPos,
          type: type, amount: d.betSizeBB, to: null
        });
      });
      h.summary = tl;
    }
    return ensureFullTimeline(h);
  }

  global.Importer = {
    parseSession, parseSessionAsync, parseHand, detectSessionFormat, analyzeHand, buildSession, buildSessionAsync,
    heroPlayed, computeStats, heroPreflopHud, heroStyleHud, assessVpipPfr, assessStyleStats,
    sampleTrust, styleIdealForFormat, inferSessionFormat, inferSessionFormatKey, formatKeyToRangeGameType,
    drillsFromAssess, buildHandTags, computeBbPer100CI,
    heroCandidatesFromParsed, needsHeroConfirmation, handDedupeKey,
    STYLE_IDEAL: STYLE_IDEAL_6MAX, STYLE_IDEAL_6MAX, STYLE_IDEAL_BY_FORMAT, HUD_IDEAL,
    num, cardsFrom,
    buildEvalInputFromDecision, recomputeDecisionGto, recomputeHandDecisions, recomputeHeroNet,
    heroNet, inferCollectedFromShowdown,
    ensureAnalyzedHandContext, ensureHandSummary, ensureFullTimeline
  };
})(window);
