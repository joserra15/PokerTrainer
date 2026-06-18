/*
 * engine.js
 * Motor del entrenador: genera spots, evalúa decisiones contra GTO (aprox.),
 * estima EV perdido, modela al villano y juega la mano calle a calle.
 * Expuesto como `Engine`.
 */
(function (global) {
  'use strict';

  const C = global.Cards;
  const R = global.Ranges;
  const GTO = global.GTO;
  const VT = global.GTOVillainTracking;

  // --- Parámetros de juego (en ciegas grandes) ---
  const SB = 0.5, BBET = 1, EFF = 100;
  const OPEN = 2.5, SB_OPEN = 3.0;        // tamaño de apertura
  const POSTFLOP_ORDER = ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];
  const DEAL_ORDER = ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];

  function dealFullTable() {
    const deck = C.shuffledDeckExcluding([]);
    const holeCards = {};
    DEAL_ORDER.forEach(function (pos) {
      holeCards[pos] = [deck.pop(), deck.pop()];
    });
    const board = [];
    while (board.length < 5 && deck.length) board.push(deck.pop());
    return { holeCards: holeCards, board: board };
  }

  function initTableState(holeCards) {
    return {
      holeCards: Object.assign({}, holeCards),
      folded: {},
      invested: { SB: SB, BB: BBET },
      streetBet: {},
      inHand: new Set(DEAL_ORDER)
    };
  }

  function villainHoleCards(hand) {
    if (!hand.villain || !hand.villain.pos) return null;
    if (hand.table && hand.table.holeCards) return hand.table.holeCards[hand.villain.pos];
    return hand._predeal && hand._predeal.villainCards ? hand._predeal.villainCards : null;
  }

  function assignHeroFromTable(hand) {
    if (!hand.table || !hand.hero.pos) return;
    const hc = hand.table.holeCards[hand.hero.pos];
    if (!hc) return;
    hand.hero.cards = hc.slice();
    hand.hero.code = R.handCode(hand.hero.cards[0], hand.hero.cards[1]);
  }

  function markFolded(hand, pos) {
    if (!hand.table || !pos) return;
    hand.table.folded[pos] = true;
    hand.table.inHand.delete(pos);
    hand.table.streetBet[pos] = 0;
  }

  function collapseOthersToHU(hand, villainPos, extraAlive) {
    if (!hand.table) return;
    const alive = new Set([hand.hero.pos, villainPos].concat(extraAlive || []));
    DEAL_ORDER.forEach(function (pos) {
      if (!alive.has(pos)) markFolded(hand, pos);
    });
  }

  function addInvest(hand, pos, amount) {
    if (!hand.table || !pos || !amount) return;
    hand.table.invested[pos] = round2((hand.table.invested[pos] || 0) + amount);
    hand.table.streetBet[pos] = round2((hand.table.streetBet[pos] || 0) + amount);
  }

  function resetStreetBets(hand) {
    if (hand.table) hand.table.streetBet = {};
  }

  // ---------- Delegación al motor GTO ----------
  function handStrength01(code) { return GTO.HandStrength.handStrength01(code); }
  function sampleHandFromRange(rangeStr, excluded, rnd) { return GTO.Equity.sampleHandFromRange(rangeStr, excluded, rnd); }
  function rfiStrategy(pos, code) { return GTO.Strategy.rfiStrategy(pos, code); }
  function vsRfiStrategy(key, code) { return GTO.Strategy.vsRfiStrategy(key, code); }
  function squeezeStrategy(code) { return GTO.Strategy.squeezeStrategy(code); }
  function isoStrategy(code) { return GTO.Strategy.isoStrategy(code); }
  function classify(freqs, chosen) { return GTO.Classifier.classify(freqs, chosen); }
  function round2(x) { return GTO.EvLoss.round2(x); }
  function preflopEvLoss(cls, chosen, code, freqs) {
    return GTO.EvLoss.preflopEvLoss(cls, chosen, code, freqs).evLoss;
  }
  function postflopEvLoss(cls, chosen, freqs, potBB) {
    return GTO.EvLoss.postflopEvLoss(cls, chosen, freqs, potBB).evLoss;
  }
  function equityVsRange(heroCards, board, villainRangeStr, iters, opts) {
    return GTO.Equity.equityVsRange(heroCards, board, villainRangeStr, iters, opts);
  }
  function classifyMadeHand(holeCards, board) { return GTO.Equity.classifyMadeHand(holeCards, board); }
  function boardTexture(board) { return GTO.BoardCluster.boardTexture(board); }
  function postflopStrategy(node, info, texture) {
    return GTO.Strategy.postflopStrategy({
      toCallBB: node.toCallBB, potBB: node.potBB, heroEquity: node.heroEquity,
      madeHandInfo: info, board: node.board || [], heroCards: node.heroCards || [],
      initiative: node.initiative, inPosition: node.inPosition, spr: node.spr
    });
  }

  /** Construye input para evaluateSpot desde el estado de la mano. */
  function buildSpotInput(hand, node, chosenAction) {
    const s = hand.scenario || {};
    const availableActions = (node.options || []).map((o) => o.id);
    const opt = (node.options || []).find((o) => o.id === chosenAction);
    let spotKind = node.kind || 'postflop';

    if (node.street === 'preflop') {
      if (node.kind === 'face3bet') spotKind = 'face3bet';
      else if (node.kind === 'face4bet') spotKind = 'face4bet';
      else if (s.type === 'RFI') spotKind = 'RFI';
      else if (s.type === 'vsRFI') spotKind = 'vsRFI';
      else if (s.type === 'squeeze') spotKind = 'squeeze';
      else if (s.type === 'isoLimp') spotKind = 'isoLimp';
    } else {
      spotKind = 'postflop';
    }

    const input = {
      spotKind, position: hand.hero.pos, vsPosition: hand.villain.pos,
      stackDepth: hand.effStack || EFF, street: node.street,
      board: hand.board.slice(), heroCards: hand.hero.cards, handCode: hand.hero.code,
      potBB: node.potBB, toCallBB: facingBet(node) ? node.toCallBB : 0,
      initiative: hand.heroIsAggressor ? 'aggressor' : 'caller',
      inPosition: hand.heroInPosition, villainRange: hand.villain.rangeStr,
      heroEquity: node.heroEquity, madeHandInfo: node.info,
      chosenAction: chosenAction,
      availableActions,
      betSizeBB: opt && opt.size != null ? opt.size : (chosenAction === 'raise' ? round2((node.toCallBB || 0) * 3) : 0)
    };
    if (s.type === 'vsRFI' && node.street === 'preflop') {
      input.vsRfiKey = s.key;
      input.vsPosition = parseVsKey(s.key).opener;
    }
    const rem = (hand.effStack || EFF) - (hand.heroInvested || 0);
    input.spr = node.potBB > 0 ? rem / node.potBB : rem;
    return input;
  }

  function facingBet(node) {
    return (node.toCallBB || 0) > 0 && (node.options || []).some((o) => o.id === 'fold' || o.id === 'call');
  }

  function strategyForNode(hand, node) {
    return GTO.getStrategy(buildSpotInput(hand, node, null));
  }

  // ---------- Villano postflop ----------
  function villainPostflopAction(hand, node) {
    // villano decide con su mano concreta y la textura
    const info = classifyMadeHand(hand.villain.cards, hand.board);
    const r = C.rng.random();
    if (node.heroLastAction === 'bet' || node.heroLastAction === 'raise') {
      // villano afronta apuesta de hero
      if (info.tier === 'strong') return r < 0.25 ? 'raise' : 'call';
      if (info.tier === 'medium') return r < 0.6 ? 'call' : 'fold';
      if (info.tier === 'weak') return r < 0.5 ? 'call' : 'fold';
      return r < 0.2 ? 'raise' : 'fold'; // air: a veces farol-raise, casi siempre fold
    } else {
      // hero ha pasado (check): villano puede apostar o pasar
      if (info.tier === 'strong') return r < 0.8 ? 'bet' : 'check';
      if (info.tier === 'medium') return r < 0.35 ? 'bet' : 'check';
      if (info.tier === 'weak') return r < 0.55 ? 'bet' : 'check';
      return r < 0.4 ? 'bet' : 'check'; // air: farol a veces
    }
  }

  // ---------- Definición de escenarios ----------
  const RFI_POS = ['UTG', 'HJ', 'CO', 'BTN', 'SB'];
  const VS_KEYS = Object.keys(R.VS_RFI);
  // Combinaciones de squeeze (abridor + pagador antes que el héroe)
  const SQUEEZE_COMBOS = [
    { heroPos: 'BB', openerPos: 'CO', callerPos: 'BTN' },
    { heroPos: 'BB', openerPos: 'HJ', callerPos: 'CO' },
    { heroPos: 'SB', openerPos: 'UTG', callerPos: 'CO' },
    { heroPos: 'BTN', openerPos: 'UTG', callerPos: 'HJ' },
    { heroPos: 'BTN', openerPos: 'HJ', callerPos: 'CO' }
  ];
  // Combinaciones de aislamiento frente a un limper (héroe nunca en BB aquí)
  const ISO_COMBOS = [
    { heroPos: 'CO', limperPos: 'UTG' },
    { heroPos: 'BTN', limperPos: 'HJ' },
    { heroPos: 'BTN', limperPos: 'CO' },
    { heroPos: 'SB', limperPos: 'CO' }
  ];
  // Rango aproximado con el que un rival hace limp (pasivo/débil)
  const LIMP_RANGE = '22-99, A2s-A9s, K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, ATo-AJo, KJo, QJo, JTo';

  function pickScenario(forceKey) {
    if (forceKey && forceKey.type === 'vsRFI') return { type: 'vsRFI', key: forceKey.key };
    if (forceKey && forceKey.type === 'RFI') return { type: 'RFI', heroPos: forceKey.heroPos };
    if (forceKey && forceKey.type === 'squeeze') return { type: 'squeeze', heroPos: forceKey.heroPos, openerPos: forceKey.openerPos, callerPos: forceKey.callerPos };
    if (forceKey && forceKey.type === 'isoLimp') return { type: 'isoLimp', heroPos: forceKey.heroPos, limperPos: forceKey.limperPos };
    const roll = Math.random();
    if (roll < 0.32) {
      return { type: 'RFI', heroPos: RFI_POS[Math.floor(Math.random() * RFI_POS.length)] };
    }
    if (roll < 0.66) {
      return { type: 'vsRFI', key: VS_KEYS[Math.floor(Math.random() * VS_KEYS.length)] };
    }
    if (roll < 0.84) {
      return Object.assign({ type: 'squeeze' }, SQUEEZE_COMBOS[Math.floor(Math.random() * SQUEEZE_COMBOS.length)]);
    }
    return Object.assign({ type: 'isoLimp' }, ISO_COMBOS[Math.floor(Math.random() * ISO_COMBOS.length)]);
  }

  function parseVsKey(key) {
    const [hero, , opener] = key.split('_'); // HERO_vs_OPENER
    return { hero, opener };
  }

  // ---------- Crear una mano ----------
  function newHand(force) {
    const scenario = pickScenario(force);
    // semilla: si viene en `force` se reproduce la misma mano; si no, una nueva
    const seed = (force && force.seed != null) ? (force.seed >>> 0) : (Math.floor(Math.random() * 2147483647) >>> 0);
    C.rng.setSeed(seed);

    const dealt = dealFullTable();
    const holeCards = dealt.holeCards;
    const board = dealt.board;

    // rango y posición del villano (mano concreta = reparto de su asiento)
    let vRange, vPos;
    if (scenario.type === 'RFI') {
      vPos = 'BB';
      vRange = rfiDefendRange(scenario.heroPos);
    } else if (scenario.type === 'squeeze') {
      vPos = scenario.openerPos;
      vRange = R.OPEN_RAISE[scenario.openerPos].raise + ', ' + R.OPEN_RAISE[scenario.openerPos].mix;
    } else if (scenario.type === 'isoLimp') {
      vPos = scenario.limperPos;
      vRange = LIMP_RANGE;
    } else {
      const pk = parseVsKey(scenario.key);
      vPos = pk.opener;
      vRange = R.OPEN_RAISE[pk.opener].raise + ', ' + R.OPEN_RAISE[pk.opener].mix;
    }

    const hand = {
      id: 'h' + Date.now() + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      seed,
      scenario,
      hero: { cards: [], code: null, pos: null },
      villain: { cards: null, rangeStr: null, pos: null },
      table: initTableState(holeCards),
      _predeal: { holeCards: holeCards, board: board, villainPos: vPos, villainRange: vRange },
      board: [],
      potBB: 0, heroInvested: 0, villainInvested: 0,
      effStack: EFF,
      stage: 'preflop',
      decisions: [],
      log: [],
      current: null,
      result: null,
      heroIsAggressor: false,
      heroInPosition: false,
      heroAction: null,
      villainAction: null
    };

    if (scenario.type === 'RFI') setupRFI(hand);
    else if (scenario.type === 'squeeze') setupSqueeze(hand);
    else if (scenario.type === 'isoLimp') setupIsoLimp(hand);
    else setupVsRFI(hand);
    assignHeroFromTable(hand);
    return hand;
  }

  function inPos(a, b) { return POSTFLOP_ORDER.indexOf(a) > POSTFLOP_ORDER.indexOf(b); }

  function setupRFI(hand) {
    const pos = hand.scenario.heroPos;
    hand.hero.pos = pos;
    const openSize = pos === 'SB' ? SB_OPEN : OPEN;
    // pot inicial con ciegas
    hand.potBB = SB + BBET;
    // hero abrirá o foldeará
    const freqs = strategyForNode(hand, { street: 'preflop', kind: 'RFI', potBB: hand.potBB, toCallBB: 0 });
    hand.current = {
      street: 'preflop',
      kind: 'RFI',
      potBB: hand.potBB,
      toCallBB: 0,
      openSize,
      options: [
        { id: 'fold', label: 'Fold (retirarse)' },
        { id: 'raise', label: `Subir a ${openSize}bb` }
      ],
      gto: freqs,
      context: `Eres ${pos}. La acción te llega sin subir (RFI). ¿Abres o te retiras?`
    };
  }

  function setupVsRFI(hand) {
    const { hero, opener } = parseVsKey(hand.scenario.key);
    hand.hero.pos = hero;
    hand.villain.pos = opener;
    hand.villain.rangeStr = R.OPEN_RAISE[opener].raise + ', ' + R.OPEN_RAISE[opener].mix;
    initVillainTracker(hand);
    const openSize = opener === 'SB' ? SB_OPEN : OPEN;

    // contribuciones: villano abrió a openSize; ciegas puestas
    const heroBlind = hero === 'SB' ? SB : (hero === 'BB' ? BBET : 0);
    hand.heroInvested = heroBlind;
    hand.villainInvested = openSize;
    hand.potBB = SB + BBET + (openSize - (opener === 'SB' ? SB : (opener === 'BB' ? BBET : 0)));
    // simplificación de pot: ciegas + open
    hand.potBB = round2(SB + BBET + openSize - (opener === 'SB' ? SB : 0) - (hero === 'SB' ? 0 : 0));
    hand.potBB = round2(openSize + (hero === 'BB' ? 0 : 0) + (SB + BBET) - (opener === 'SB' ? SB : 0));
    // recomputo limpio:
    let pot = 0;
    const blinds = { SB: SB, BB: BBET };
    pot += (blinds[opener] || 0); // lo que tenía puesto el villano se reemplaza por su open
    pot = SB + BBET; // ciegas
    if (opener === 'SB') pot += (openSize - SB); else if (opener === 'BB') pot += (openSize - BBET); else pot += openSize;
    hand.potBB = round2(pot);
    hand.toCallBB = round2(openSize - heroBlind);

    const threeBetSize = inPos(hero, opener) ? round2(openSize * 3) : round2(openSize * 4);
    const freqs = strategyForNode(hand, { street: 'preflop', kind: 'vsRFI', potBB: hand.potBB, toCallBB: hand.toCallBB });
    hand.current = {
      street: 'preflop',
      kind: 'vsRFI',
      potBB: hand.potBB,
      toCallBB: hand.toCallBB,
      openSize,
      threeBetSize,
      options: [
        { id: 'fold', label: 'Fold (retirarse)' },
        { id: 'call', label: `Call (igualar ${hand.toCallBB}bb)` },
        { id: 'raise', label: `3-Bet a ${threeBetSize}bb` }
      ],
      gto: freqs,
      context: `Eres ${hero}. ${opener} abre a ${openSize}bb y te llega la acción. ¿Fold, call o 3-bet?`
    };
    setVillainAct(hand, 'open', openSize);
    addInvest(hand, opener, openSize);
    collapseOthersToHU(hand, opener);
  }

  function setupSqueeze(hand) {
    const { heroPos, openerPos, callerPos } = hand.scenario;
    hand.hero.pos = heroPos;
    hand.villain.pos = openerPos;
    hand.villain.rangeStr = R.OPEN_RAISE[openerPos].raise + ', ' + R.OPEN_RAISE[openerPos].mix;
    initVillainTracker(hand);
    const openSize = OPEN;
    // bote: ciegas + open + call del pagador (dinero muerto)
    hand.potBB = round2(SB + BBET + openSize + openSize);
    const heroBlind = heroPos === 'SB' ? SB : (heroPos === 'BB' ? BBET : 0);
    hand.heroInvested = heroBlind;
    hand.toCallBB = round2(openSize - heroBlind);
    const inPosVsOpener = inPos(heroPos, openerPos);
    const squeezeSize = inPosVsOpener ? round2(openSize * 4) : round2(openSize * 5);
    hand.squeezeSize = squeezeSize;
    const freqs = strategyForNode(hand, { street: 'preflop', kind: 'squeeze', potBB: hand.potBB, toCallBB: hand.toCallBB });
    hand.current = {
      street: 'preflop', kind: 'squeeze', potBB: hand.potBB, toCallBB: hand.toCallBB,
      openSize, squeezeSize,
      options: [
        { id: 'fold', label: 'Fold (retirarse)' },
        { id: 'call', label: `Call (igualar ${hand.toCallBB}bb)` },
        { id: 'raise', label: `Squeeze a ${squeezeSize}bb` }
      ],
      gto: freqs,
      context: `Eres ${heroPos}. ${openerPos} abre a ${openSize}bb y ${callerPos} paga. ¿Fold, call o squeeze (3-bet)?`
    };
    setVillainAct(hand, 'open', openSize);
    addInvest(hand, openerPos, openSize);
    addInvest(hand, hand.scenario.callerPos, openSize);
    collapseOthersToHU(hand, openerPos, [hand.scenario.callerPos]);
  }

  function setupIsoLimp(hand) {
    const { heroPos, limperPos } = hand.scenario;
    hand.hero.pos = heroPos;
    hand.villain.pos = limperPos;
    hand.villain.rangeStr = LIMP_RANGE;
    initVillainTracker(hand);
    // bote: ciegas + limp (1bb)
    hand.potBB = round2(SB + BBET + BBET);
    const heroBlind = heroPos === 'SB' ? SB : 0;
    hand.heroInvested = heroBlind;
    hand.toCallBB = round2(BBET - heroBlind); // completar el limp
    const isoSize = round2(BBET * 3.5 + BBET); // 3.5x + 1bb por el limper
    hand.isoSize = isoSize;
    const freqs = strategyForNode(hand, { street: 'preflop', kind: 'isoLimp', potBB: hand.potBB, toCallBB: hand.toCallBB });
    hand.current = {
      street: 'preflop', kind: 'isoLimp', potBB: hand.potBB, toCallBB: hand.toCallBB,
      isoSize,
      options: [
        { id: 'fold', label: 'Fold (retirarse)' },
        { id: 'call', label: `Call (over-limp ${hand.toCallBB}bb)` },
        { id: 'raise', label: `Aislar a ${isoSize}bb` }
      ],
      gto: freqs,
      context: `Eres ${heroPos}. ${limperPos} hace limp. ¿Fold, over-limp o aislar con una subida?`
    };
    setVillainAct(hand, 'check', null);
    addInvest(hand, limperPos, BBET);
    collapseOthersToHU(hand, limperPos);
  }

  // ---------- Aplicar una acción ----------
  function act(hand, actionId) {
    const node = hand.current;
    const evalResult = GTO.evaluateSpot(buildSpotInput(hand, node, actionId));
    const freqs = evalResult.strategy;
    const ev = evalResult.evaluation;

    const decision = {
      street: node.street,
      kind: node.kind,
      action: actionId,
      label: labelFor(node, actionId),
      class: ev.class,
      best: ev.best,
      gto: evalResult.strategy,
      optionBreakdown: evalResult.optionBreakdown,
      evLoss: ev.evLoss,
      evLossTier: ev.evLossTier,
      actionEV: ev.actionEV,
      bestEV: ev.bestEV,
      frequency: ev.frequency,
      confidence: ev.confidence,
      score: ev.score,
      explanation: evalResult.explanation,
      errors: ev.errors,
      potBB: node.potBB,
      toCallBB: node.toCallBB || 0,
      availableActions: (node.options || []).map((o) => o.id),
      board: hand.board.slice(),
      villainRange: node.street !== 'preflop' ? villainRangeAtNode(hand, node) : null,
      villainLastAction: hand.villainAction ? hand.villainAction.type : null,
      potBeforeBB: node.toCallBB > 0 ? Math.max(node.potBB - node.toCallBB, 0.1) : node.potBB,
      context: node.context
    };
    hand.decisions.push(decision);
    hand.log.push(describeDecision(hand, decision));

    // Avanza el estado según la acción
    advance(hand, actionId, decision);
    return { decision, hand };
  }

  function labelFor(node, actionId) {
    const o = node.options.find((x) => x.id === actionId);
    return o ? o.label : actionId;
  }

  function describeDecision(hand, d) {
    return `${d.street.toUpperCase()} (${hand.hero.pos}): ${d.label} [${d.class}]`;
  }

  function advance(hand, actionId, decision) {
    if (hand.stage === 'preflop') return advancePreflop(hand, actionId, decision);
    return advancePostflop(hand, actionId, decision);
  }

  // ----- Transiciones preflop -----
  function advancePreflop(hand, actionId, decision) {
    const node = hand.current;

    if (node.kind === 'squeeze') {
      const heroBlind = hand.heroInvested; // ciega puesta antes de actuar
      if (actionId === 'fold') {
        return finish(hand, { reason: 'Te retiras ante la subida.', heroNet: -round2(heroBlind) });
      }
      hand.villain.cards = villainHoleCards(hand);
      if (actionId === 'call') {
        setHeroAct(hand, 'call', node.toCallBB);
        hand.heroIsAggressor = false; // el abridor es el agresor
        hand.heroInvested = node.openSize;
        hand.villainInvested = node.openSize;
        hand.potBB = round2(node.openSize * 2 + node.openSize + SB); // + dinero muerto del pagador
        hand.heroInPosition = inPos(hand.hero.pos, hand.villain.pos);
        if (hand.scenario.callerPos) markFolded(hand, hand.scenario.callerPos);
        return goFlop(hand);
      }
      // squeeze (3-bet)
      hand.heroIsAggressor = true;
      hand.heroInvested = node.squeezeSize;
      setHeroAct(hand, 'raise', node.squeezeSize);
      const roll = C.rng.random();
      if (roll < 0.62) {
        setVillainAct(hand, 'fold');
        if (hand.scenario.callerPos) markFolded(hand, hand.scenario.callerPos);
        return finish(hand, { reason: 'Abridor y pagador se retiran ante tu squeeze.', heroNet: round2(hand.potBB - heroBlind) });
      }
      // el abridor paga el squeeze -> flop en bote resubido, hero agresor
      setVillainAct(hand, 'call', node.squeezeSize);
      hand.villainInvested = node.squeezeSize;
      hand.potBB = round2(node.squeezeSize * 2 + node.openSize + SB);
      hand.heroInPosition = inPos(hand.hero.pos, hand.villain.pos);
      return goFlop(hand);
    }

    if (node.kind === 'isoLimp') {
      const heroBlind = hand.heroInvested;
      if (actionId === 'fold') {
        return finish(hand, { reason: 'Te retiras.', heroNet: -round2(heroBlind) });
      }
      hand.villain.cards = villainHoleCards(hand);
      if (actionId === 'call') {
        // over-limp: bote multivía sin agresor, se simplifica a HU vs limper
        setHeroAct(hand, 'call', node.toCallBB);
        hand.heroIsAggressor = false;
        hand.heroInvested = BBET;
        hand.villainInvested = BBET;
        hand.potBB = round2(BBET * 2 + SB);
        hand.heroInPosition = inPos(hand.hero.pos, hand.villain.pos);
        return goFlop(hand);
      }
      // aislar con subida
      hand.heroIsAggressor = true;
      hand.heroInvested = node.isoSize;
      setHeroAct(hand, 'raise', node.isoSize);
      const roll = C.rng.random();
      if (roll < 0.58) {
        setVillainAct(hand, 'fold');
        return finish(hand, { reason: 'El limper se retira ante tu aislamiento.', heroNet: round2(hand.potBB - heroBlind) });
      }
      setVillainAct(hand, 'call', node.isoSize);
      hand.villainInvested = node.isoSize;
      hand.potBB = round2(node.isoSize * 2 + SB);
      hand.heroInPosition = inPos(hand.hero.pos, hand.villain.pos);
      return goFlop(hand);
    }

    if (node.kind === 'face3bet') {
      if (actionId === 'fold') {
        return finish(hand, { reason: 'Foldeas ante el 3-bet.', heroNet: -round2(hand.heroInvested) });
      }
      if (actionId === 'call') {
        setHeroAct(hand, 'call', node.toCallBB);
        // hero iguala el 3bet -> villano (3bettor) es el agresor
        hand.heroInvested = hand.villainInvested;
        hand.heroIsAggressor = false;
        hand.potBB = round2(hand.villainInvested * 2 + SB);
        hand.heroInPosition = inPos(hand.hero.pos, hand.villain.pos);
        return goFlop(hand);
      }
      // 4-bet del hero
      hand.heroIsAggressor = true;
      const fourBet = node.fourBet;
      hand.heroInvested = fourBet;
      setHeroAct(hand, 'raise', fourBet);
      const roll = C.rng.random();
      if (roll < 0.62) {
        setVillainAct(hand, 'fold');
        return finish(hand, { reason: 'El villano foldea ante tu 4-bet.', heroNet: round2(hand.villainInvested + SB) });
      }
      // villano paga el 4bet -> flop, hero agresor
      setVillainAct(hand, 'call', fourBet);
      hand.villainInvested = fourBet;
      hand.potBB = round2(fourBet * 2 + SB);
      hand.heroInPosition = inPos(hand.hero.pos, hand.villain.pos);
      return goFlop(hand);
    }

    if (node.kind === 'face4bet') {
      if (actionId === 'fold') {
        return finish(hand, { reason: 'Foldeas ante el 4-bet.', heroNet: -round2(hand.heroInvested) });
      }
      if (actionId === 'call') {
        setHeroAct(hand, 'call', node.toCallBB);
        hand.heroInvested = hand.villainInvested;
        hand.heroIsAggressor = true;
        hand.potBB = round2(hand.villainInvested * 2 + SB);
        hand.heroInPosition = inPos(hand.hero.pos, hand.villain.pos);
        return goFlop(hand);
      }
      // all-in (5-bet): resolución directa al showdown
      setHeroAct(hand, 'allin', EFF);
      return allInShowdown(hand);
    }

    if (node.kind === 'RFI') {
      if (actionId === 'fold') {
        return finish(hand, { reason: 'Te retiras antes del flop.', heroNet: -(hand.heroInvested || 0) });
      }
      // hero abre
      hand.heroIsAggressor = true;
      hand.heroInvested = node.openSize;
      setHeroAct(hand, 'open', node.openSize);
      // reacción del villano (BB defiende, a veces 3bet, a veces fold)
      const roll = C.rng.random();
      if (roll < 0.34) {
        // todos foldean: hero gana las ciegas
        return finish(hand, { reason: 'Todos se retiran. Te llevas las ciegas.', heroNet: round2(SB + BBET) });
      }
      // el villano es la BB
      hand.villain.pos = 'BB';
      if (roll < 0.46) {
        // BB hace 3bet -> hero afronta 3bet
        const tbSize = round2(node.openSize * 3.5);
        hand.villain.rangeStr = bb3betRange(hand.hero.pos);
        hand.villain.cards = villainHoleCards(hand);
        hand.villainInvested = tbSize;
        hand.potBB = round2(node.openSize + tbSize + SB);
        setVillainAct(hand, 'raise', tbSize);
        return setupFace3Bet(hand, tbSize);
      }
      // BB iguala -> al flop, hero es agresor y va en posición
      hand.villain.pos = 'BB';
      hand.villain.rangeStr = bbCallRange(hand.hero.pos);
      hand.villain.cards = villainHoleCards(hand);
      hand.heroInvested = node.openSize; hand.villainInvested = node.openSize;
      hand.potBB = round2(node.openSize * 2 + SB);
      hand.heroInPosition = inPos(hand.hero.pos, 'BB');
      collapseOthersToHU(hand, 'BB');
      return goFlop(hand);
    }

    if (node.kind === 'vsRFI') {
      const { hero, opener } = parseVsKey(hand.scenario.key);
      if (actionId === 'fold') {
        return finish(hand, { reason: 'Te retiras ante la subida.', heroNet: -(hand.heroInvested || 0) });
      }
      hand.villain.cards = villainHoleCards(hand);
      if (actionId === 'call') {
        setHeroAct(hand, 'call', node.toCallBB);
        hand.heroIsAggressor = false; // el villano (abridor) es el agresor
        hand.heroInvested = node.openSize;
        hand.villainInvested = node.openSize;
        hand.potBB = round2(node.openSize * 2 + (hero === 'BB' ? 0 : SB) + (['SB', 'BB'].includes(hero) ? 0 : 0) + (opener === 'SB' ? 0 : 0));
        hand.potBB = round2(node.openSize * 2 + SB); // ciega muerta aprox
        hand.heroInPosition = inPos(hero, opener);
        return goFlop(hand);
      }
      // 3-bet
      hand.heroIsAggressor = true;
      hand.heroInvested = node.threeBetSize;
      setHeroAct(hand, 'raise', node.threeBetSize);
      // reacción del abridor frente al 3bet
      const roll = C.rng.random();
      const cont = openerContinueVs3Bet(opener, hand.villain.cards, hand.board);
      if (roll < cont.foldProb) {
        setVillainAct(hand, 'fold');
        return finish(hand, { reason: `${opener} foldea ante tu 3-bet.`, heroNet: round2(hand.potBB) });
      }
      if (roll > 1 - cont.fourBetProb) {
        // 4-bet del villano -> hero afronta 4bet
        const fbSize = round2(node.threeBetSize * 2.3);
        hand.villainInvested = fbSize;
        hand.potBB = round2(node.threeBetSize + fbSize + SB);
        setVillainAct(hand, 'raise', fbSize);
        return setupFace4Bet(hand, fbSize);
      }
      // villano iguala el 3bet -> flop en bote resubido, hero agresor
      setVillainAct(hand, 'call', node.threeBetSize);
      hand.villainInvested = node.threeBetSize;
      hand.potBB = round2(node.threeBetSize * 2 + SB);
      hand.heroInPosition = inPos(hero, opener);
      return goFlop(hand);
    }
  }

  function setupFace3Bet(hand, tbSize) {
    hand.stage = 'preflop';
    const toCall = round2(tbSize - hand.heroInvested);
    const fourBet = round2(tbSize * 2.3);
    const node = {
      street: 'preflop', kind: 'face3bet', potBB: hand.potBB, toCallBB: toCall,
      options: [
        { id: 'fold', label: 'Fold' },
        { id: 'call', label: `Call (igualar ${toCall}bb)` },
        { id: 'raise', label: `4-Bet a ${fourBet}bb` }
      ],
      context: `La BB te hace 3-bet a ${tbSize}bb. ¿Fold, call o 4-bet?`,
      fourBet
    };
    node.gto = strategyForNode(hand, node);
    hand.current = node;
  }

  function setupFace4Bet(hand, fbSize) {
    const toCall = round2(fbSize - hand.heroInvested);
    const node = {
      street: 'preflop', kind: 'face4bet', potBB: hand.potBB, toCallBB: toCall,
      options: [
        { id: 'fold', label: 'Fold' },
        { id: 'call', label: `Call (igualar ${toCall}bb)` },
        { id: 'raise', label: 'All-in (5-bet)' }
      ],
      context: `El villano te 4-betea a ${fbSize}bb. ¿Fold, call o all-in?`
    };
    node.gto = strategyForNode(hand, node);
    hand.current = node;
  }

  function bb3betRange(heroPos) {
    const key = 'BB_vs_' + heroPos;
    const d = R.VS_RFI[key];
    if (d) return d.threeBet + ', ' + d.threeBetMix;
    return 'QQ+, AKs, AKo, A5s';
  }
  function bbCallRange(heroPos) {
    const key = 'BB_vs_' + heroPos;
    const d = R.VS_RFI[key];
    if (d) return d.call;
    return '22-JJ, A2s-AJs, K9s+, Q9s+, JTs, T9s, 98s, 87s, KQo, QJo';
  }
  function rfiDefendRange(heroPos) {
    return bbCallRange(heroPos) + ', ' + bb3betRange(heroPos);
  }

  function openerContinueVs3Bet(opener, villainCards, board) {
    // probabilidades aproximadas de reacción del abridor frente a un 3bet
    return { foldProb: 0.5, fourBetProb: 0.12 };
  }

  function allInShowdown(hand) {
    hand.heroInvested = EFF; hand.villainInvested = EFF;
    hand.potBB = round2(EFF * 2 + SB);
    hand.villain.cards = villainHoleCards(hand);
    hand.board = hand._predeal.board.slice();
    hand._boardIdx = 5;
    hand.stage = 'river';
    return showdown(hand);
  }

  // ----- Acciones visibles (para la UI) -----
  function setHeroAct(hand, type, amount) {
    hand.heroAction = { type, amount: amount != null ? amount : null };
    if (hand.table && hand.hero.pos && amount > 0 && ['bet', 'call', 'raise', 'open'].indexOf(type) >= 0) {
      hand.table.streetBet[hand.hero.pos] = round2((hand.table.streetBet[hand.hero.pos] || 0) + amount);
    }
  }
  function setVillainAct(hand, type, amount) {
    hand.villainAction = { type, amount: amount != null ? amount : null };
    if (type === 'fold' && hand.villain.pos) markFolded(hand, hand.villain.pos);
    if (hand.table && hand.villain.pos && amount > 0 && ['bet', 'call', 'raise', 'open'].indexOf(type) >= 0) {
      hand.table.streetBet[hand.villain.pos] = round2((hand.table.streetBet[hand.villain.pos] || 0) + amount);
    }
    if (VT && hand.villainRangeTracker && type && type !== 'fold') {
      VT.recordAction(hand.villainRangeTracker, type, hand.stage, amount);
    } else if (VT && hand.villainRangeTracker && type === 'fold') {
      VT.recordAction(hand.villainRangeTracker, 'fold', hand.stage, amount);
    }
  }
  function initVillainTracker(hand) {
    if (VT) hand.villainRangeTracker = VT.initTracker(hand.villain.rangeStr, hand.villain.pos);
  }
  function clearStreetActions(hand) { hand.heroAction = null; hand.villainAction = null; }

  /** Decisión del villano cuando es el primero en actuar en una calle (lead o check). */
  function villainStreetOpen(hand) {
    const info = classifyMadeHand(hand.villain.cards, hand.board);
    const villainIsAgg = !hand.heroIsAggressor;
    const t = villainIsAgg
      ? { strong: 0.8, medium: 0.5, weak: 0.6, air: 0.45 }
      : { strong: 0.3, medium: 0.1, weak: 0.22, air: 0.08 };
    return C.rng.random() < (t[info.tier] || 0.2) ? 'bet' : 'check';
  }

  // ----- Transición a flop / showdown (usa el board pre-repartido) -----
  function goFlop(hand) {
    hand.stage = 'flop';
    hand.villain.cards = villainHoleCards(hand);
    if (!hand.villainRangeTracker) initVillainTracker(hand);
    resetStreetBets(hand);
    hand.board = hand._predeal.board.slice(0, 3);
    hand._boardIdx = 3;
    return enterStreet(hand);
  }

  function nextStreet(hand) {
    const map = { flop: 'turn', turn: 'river' };
    const ns = map[hand.stage];
    if (!ns) return showdown(hand);
    hand.stage = ns;
    resetStreetBets(hand);
    hand.board.push(hand._predeal.board[hand._boardIdx++]);
    return enterStreet(hand);
  }

  /**
   * Entrada a una calle postflop. Si el héroe está en posición, el villano
   * actúa primero (su check/apuesta queda visible antes de la decisión del héroe).
   */
  function enterStreet(hand) {
    clearStreetActions(hand);
    if (hand.heroInPosition && hand.villain.cards) {
      const vAct = villainStreetOpen(hand);
      if (vAct === 'bet') {
        const vBet = round2(hand.potBB * 0.5);
        hand.villainInvested += vBet; hand.potBB = round2(hand.potBB + vBet);
        setVillainAct(hand, 'bet', vBet);
        return buildPostflopNode(hand, hand.stage, { bet: vBet, potBefore: round2(hand.potBB - vBet) });
      }
      // el villano pasa: su Check queda visible y el héroe decide check/bet
      setVillainAct(hand, 'check');
      const h = buildPostflopNode(hand, hand.stage);
      hand.current.heroClosesOnCheck = true; // si el héroe pasa, la calle se cierra
      return h;
    }
    // héroe fuera de posición: actúa primero
    return buildPostflopNode(hand, hand.stage);
  }

  function buildPostflopNode(hand, street, facing) {
    const info = classifyMadeHand(hand.hero.cards, hand.board);
    const texture = boardTexture(hand.board);
    const baseRange = hand.villain.rangeStr || GTO.Ranges.data.BROAD_CONTINUE;
    let villainRange = baseRange;
    if (VT && VT.estimateActiveRange) {
      const va = hand.villainAction;
      villainRange = VT.estimateActiveRange({
        baseRange,
        street,
        lastAction: facing && facing.bet ? 'bet' : (va ? va.type : 'check'),
        betBB: facing && facing.bet ? facing.bet : (va && va.amount ? va.amount : 0),
        potBeforeBB: facing && facing.potBefore != null ? facing.potBefore : hand.potBB,
        board: hand.board,
        tags: []
      });
    }
    const heroEquity = equityVsRange(hand.hero.cards, hand.board, villainRange, 400, {
      street, facingBet: !!(facing && facing.bet)
    });

    let toCallBB = 0, options, heroLastAction = null, context;
    const fmt = global.GTOPotMath ? global.GTOPotMath.formatBB : (x) => String(round2(x));
    if (facing && facing.bet) {
      // hero afronta una apuesta del villano
      toCallBB = facing.bet;
      options = [
        { id: 'fold', label: 'Fold' },
        { id: 'call', label: `Call (${fmt(facing.bet)}bb)` },
        { id: 'raise', label: `Raise a ${fmt(round2(facing.bet * 3))}bb` }
      ];
      context = `${capitalize(street)}: el villano apuesta ${fmt(facing.bet)}bb en un bote de ${fmt(facing.potBefore)}bb.`;
    } else {
      const sizes = GTO.Strategy.betSizingOptions(hand.potBB, texture.wet);
      options = [{ id: 'check', label: 'Check (pasar)' }].concat(sizes);
      hand._betSizes = {};
      sizes.forEach((s) => { hand._betSizes[s.id] = s.size; });
      context = `${capitalize(street)}: bote ${fmt(hand.potBB)}bb. Eres ${hand.heroIsAggressor ? 'el agresor' : 'el que cierra'} ${hand.heroInPosition ? 'en posición' : 'fuera de posición'}.`;
    }

    const node = {
      street, kind: 'postflop',
      potBB: hand.potBB, toCallBB,
      heroEquity,
      options,
      context,
      info, texture,
      board: hand.board.slice(),
      heroCards: hand.hero.cards,
      initiative: hand.heroIsAggressor ? 'aggressor' : 'caller',
      inPosition: hand.heroInPosition
    };
    node.gto = strategyForNode(hand, node);
    hand.current = node;
    return hand;
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ----- Transiciones postflop -----
  function advancePostflop(hand, actionId, decision) {
    const node = hand.current;

    if (actionId === 'fold') {
      setHeroAct(hand, 'fold');
      return finish(hand, { reason: `Foldeas en ${node.street}.`, heroNet: -round2(hand.heroInvested) });
    }

    if (actionId === 'bet' || (actionId && actionId.indexOf('bet_') === 0)) {
      const betSize = hand._betSizes && hand._betSizes[actionId] != null
        ? hand._betSizes[actionId]
        : hand._betSize;
      hand.heroInvested += betSize; hand.potBB = round2(hand.potBB + betSize);
      node.heroLastAction = 'bet';
      setHeroAct(hand, 'bet', betSize);
      const vAct = villainPostflopAction(hand, node);
      if (vAct === 'fold') { setVillainAct(hand, 'fold'); return finish(hand, { reason: `El villano foldea ante tu apuesta en ${node.street}.`, heroNet: round2(hand.potBB - betSize) }); }
      if (vAct === 'raise') {
        const vRaise = round2(betSize * 3);
        hand.villainInvested += vRaise; hand.potBB = round2(hand.potBB + vRaise);
        setVillainAct(hand, 'raise', vRaise);
        return buildPostflopNode(hand, node.street, { bet: round2(vRaise - betSize), potBefore: hand.potBB });
      }
      setVillainAct(hand, 'call', betSize);
      hand.villainInvested += betSize; hand.potBB = round2(hand.potBB + betSize);
      return nextStreet(hand);
    }

    if (actionId === 'check') {
      setHeroAct(hand, 'check');
      // si el villano ya había pasado (héroe en posición cerrando), la calle termina
      if (node.heroClosesOnCheck) return nextStreet(hand);
      node.heroLastAction = 'check';
      const vAct = villainPostflopAction(hand, node);
      if (vAct === 'check') { setVillainAct(hand, 'check'); return nextStreet(hand); }
      // villano apuesta -> hero afronta apuesta
      const vBet = round2(hand.potBB * 0.5);
      hand.villainInvested += vBet; hand.potBB = round2(hand.potBB + vBet);
      setVillainAct(hand, 'bet', vBet);
      return buildPostflopNode(hand, node.street, { bet: vBet, potBefore: round2(hand.potBB - vBet) });
    }

    if (actionId === 'call') {
      const toCall = node.toCallBB;
      hand.heroInvested += toCall; hand.potBB = round2(hand.potBB + toCall);
      setHeroAct(hand, 'call', toCall);
      return nextStreet(hand);
    }

    if (actionId === 'raise') {
      const raiseTo = round2(node.toCallBB * 3);
      hand.heroInvested += raiseTo; hand.potBB = round2(hand.potBB + raiseTo);
      node.heroLastAction = 'raise';
      setHeroAct(hand, 'raise', raiseTo);
      const vAct = villainPostflopAction(hand, node);
      if (vAct === 'fold') { setVillainAct(hand, 'fold'); return finish(hand, { reason: `El villano foldea ante tu raise en ${node.street}.`, heroNet: round2(hand.potBB - raiseTo) }); }
      setVillainAct(hand, 'call', raiseTo);
      hand.villainInvested += raiseTo; hand.potBB = round2(hand.potBB + (raiseTo - node.toCallBB));
      return nextStreet(hand);
    }

    return finish(hand, { reason: 'Mano terminada.', heroNet: 0 });
  }

  // ----- Showdown -----
  function showdown(hand) {
    if (!hand.villain.cards) {
      return finish(hand, { reason: 'Mano terminada sin showdown.', heroNet: round2(hand.potBB / 2) });
    }
    // completar board a 5 desde el pre-reparto si hiciera falta
    let bi = hand._boardIdx || hand.board.length;
    while (hand.board.length < 5 && bi < hand._predeal.board.length) hand.board.push(hand._predeal.board[bi++]);
    hand._boardIdx = bi;
    const hScore = C.evaluate(hand.hero.cards.concat(hand.board));
    const vScore = C.evaluate(hand.villain.cards.concat(hand.board));
    const cmp = C.compare(hScore, vScore);
    let net;
    const won = hand.potBB - hand.heroInvested; // lo que ganaría además de lo invertido
    if (cmp > 0) net = round2(hand.potBB - hand.heroInvested);
    else if (cmp < 0) net = -round2(hand.heroInvested);
    else net = round2((hand.potBB / 2) - hand.heroInvested);
    return finish(hand, {
      reason: cmp > 0 ? 'Ganas el showdown.' : (cmp < 0 ? 'Pierdes el showdown.' : 'Empate en el showdown.'),
      heroNet: net, showdown: true,
      heroHandName: hScore.name, villainHandName: vScore.name
    });
  }

  function finish(hand, res) {
    hand.stage = 'complete';
    const totalEvLoss = round2(hand.decisions.reduce((s, d) => s + d.evLoss, 0));
    const errors = hand.decisions.filter((d) => d.class === 'error' || d.class === 'imprecisa');
    hand.current = null;
    hand.result = Object.assign({
      heroNet: 0, showdown: false, totalEvLoss,
      nErrors: errors.length,
      villainCards: hand.villain.cards,
      villainPos: hand.villain.pos,
      board: hand.board.slice(),
      villainRangeSummary: VT ? VT.buildHandSummary(hand.villainRangeTracker) : null,
      villainRangeLog: hand.villainRangeTracker ? hand.villainRangeTracker.log.slice() : []
    }, res);
    return hand;
  }

  function boardSliceForStreet(hand, street) {
    const n = { preflop: 0, flop: 3, turn: 4, river: 5 }[street] || 0;
    return hand.board.slice(0, n);
  }

  function inferDecisionOptions(d) {
    if (d.availableActions && d.availableActions.length) return d.availableActions;
    const gto = d.gto || {};
    const order = ['fold', 'check', 'call', 'bet_33', 'bet_66', 'bet_100', 'bet', 'raise'];
    return order.filter((a) => gto[a] != null);
  }

  /** Input GTO del spot (sin mano concreta) para matriz 13×13 en repaso. */
  function buildMatrixInput(hand, d) {
    const board = d.board != null ? d.board.slice() : boardSliceForStreet(hand, d.street);
    const opts = inferDecisionOptions(d);
    const node = {
      street: d.street,
      kind: d.kind,
      potBB: d.potBB,
      toCallBB: d.toCallBB != null ? d.toCallBB : 0,
      options: opts.map((id) => ({ id })),
      heroEquity: d.heroEquity,
      info: d.madeHandInfo
    };
    const input = buildSpotInput(hand, node, null);
    delete input.chosenAction;
    delete input.heroCards;
    delete input.handCode;
    input.board = board;
    return input;
  }

  function villainRangeAtNode(hand, node) {
    const D = GTO.Ranges && GTO.Ranges.data ? GTO.Ranges.data : (global.GTORangesData || {});
    const baseRange = hand.villain.rangeStr || D.BROAD_CONTINUE || '22+, A2s+';
    if (!VT || !VT.estimateActiveRange) return baseRange;
    const facingBet = (node.toCallBB || 0) > 0;
    const va = hand.villainAction;
    return VT.estimateActiveRange({
      baseRange,
      street: node.street,
      lastAction: facingBet ? 'bet' : (va ? va.type : 'check'),
      betBB: facingBet ? node.toCallBB : (va && va.amount ? va.amount : 0),
      potBeforeBB: facingBet ? Math.max(node.potBB - node.toCallBB, 0.1) : node.potBB,
      board: hand.board.slice(),
      tags: hand.villainRangeTracker ? hand.villainRangeTracker.tags : []
    });
  }

  function syncTableInvested(hand) {
    if (!hand.table) return;
    if (hand.hero.pos) hand.table.invested[hand.hero.pos] = round2(hand.heroInvested || hand.table.invested[hand.hero.pos] || 0);
    if (hand.villain.pos) hand.table.invested[hand.villain.pos] = round2(hand.villainInvested || hand.table.invested[hand.villain.pos] || 0);
  }

  global.Engine = {
    newHand, act, syncTableInvested,
    // utilidades expuestas para UI/tests/importador
    handStrength01, equityVsRange, classifyMadeHand, sampleHandFromRange,
    rfiStrategy, vsRfiStrategy, classify,
    postflopStrategy, boardTexture, preflopEvLoss, postflopEvLoss, round2,
    buildMatrixInput
  };
})(window);
