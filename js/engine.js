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
  const VP = global.GTOVillainProfiles;
  const VPF = global.GTOVillainPreflop;
  const ST = function () { return global.PTStacks; };

  // --- Parámetros de juego (en ciegas grandes) ---
  const SB = 0.5, BBET = 1, EFF = 100;
  const OPEN = 2.5, SB_OPEN = 3.0;        // tamaño de apertura
  const POSTFLOP_ORDER = ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];
  const DEAL_ORDER = ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];
  const PREFLOP_ACTION = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

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
    const keys = Object.keys(holeCards || {});
    return {
      holeCards: Object.assign({}, holeCards),
      folded: {},
      invested: { SB: SB, BB: BBET },
      streetBet: {},
      inHand: new Set(keys.length ? keys : DEAL_ORDER)
    };
  }

  function is9MaxHand(hand) {
    const PC = global.PTPlayConfig;
    return !!(hand.playConfig && PC && PC.is9Max(hand.playConfig));
  }

  function rangeCtx(hand) {
    const RR = global.GTORangesRegistry;
    if (!RR) return null;
    if (hand.playConfig) return RR.normalize(hand.playConfig);
    if (hand.rangeContext) return RR.normalize(hand.rangeContext);
    return RR.normalize({});
  }

  function effStackForHand(hand) {
    const stacks = ST();
    if (hand && hand.stacks && stacks) return stacks.effectiveForHero(hand);
    const PC = global.PTPlayConfig;
    if (hand.playConfig && PC) return PC.stackBB(hand.playConfig);
    const RR = global.GTORangesRegistry;
    if (hand.rangeContext && RR) return RR.stackBB(hand.rangeContext);
    return EFF;
  }

  function heroRemainingBB(hand) {
    const stacks = ST();
    if (stacks && hand && hand.stacks && hand.hero.pos) {
      return stacks.remaining(hand, hand.displayHeroPos || hand.hero.pos);
    }
    return round2(effStackForHand(hand) - (hand.heroInvested || 0));
  }

  function capBetForSeat(hand, pos, amount) {
    const stacks = ST();
    if (!stacks || !hand.stacks) return amount;
    return stacks.capToRemaining(hand, pos, amount);
  }

  function initHandStacks(hand) {
    const stacks = ST();
    const PC = global.PTPlayConfig;
    if (!stacks || !hand) return;
    const heroBB = hand.playConfig && PC ? PC.stackBB(hand.playConfig) : EFF;
    const positions = is9MaxHand(hand) && PC ? PC.POS_9 : DEAL_ORDER;
    const heroSeat = hand.displayHeroPos || hand.hero.pos;
    stacks.initHandStacks(hand, positions, heroSeat, heroBB, function () { return C.rng.random(); });
    hand.effStack = heroBB;
  }

  function openRangeStr(pos, hand) {
    const RR = global.GTORangesRegistry;
    const ctx = rangeCtx(hand);
    if (RR && ctx) return RR.openRangeStr(pos, ctx);
    const row = R.OPEN_RAISE[pos];
    return row ? row.raise + ', ' + row.mix : '';
  }

  function threeBetRangeStr(defender, opener, hand) {
    const RR = global.GTORangesRegistry;
    const ctx = rangeCtx(hand);
    const vsKey = defender + '_vs_' + opener;
    const d = RR && ctx ? RR.getVsRfiRow(defender, opener, ctx) : R.VS_RFI[vsKey];
    if (d) return d.threeBet + (d.threeBetMix ? ', ' + d.threeBetMix : '');
    return 'QQ+, AKs, AKo';
  }

  function heroTableSeat(hand) {
    return hand.displayHeroPos || hand.hero.pos;
  }

  function villainTableSeat(hand) {
    const PC = global.PTPlayConfig;
    if (is9MaxHand(hand) && PC) return PC.villainTableSeat(hand) || hand.villain.pos;
    return hand.villain.pos;
  }

  function tablePositionsForHand(hand) {
    const PC = global.PTPlayConfig;
    if (is9MaxHand(hand) && PC) return PC.POS_9;
    return DEAL_ORDER;
  }

  function preflopOrderForHand(hand) {
    const PC = global.PTPlayConfig;
    if (is9MaxHand(hand) && PC) return PC.PREFLOP_ACTION_9;
    return PREFLOP_ACTION;
  }

  function villainHoleCards(hand) {
    if (!hand.villain || !hand.villain.pos) return null;
    const seat = villainTableSeat(hand);
    if (hand.table && hand.table.holeCards) return hand.table.holeCards[seat] || hand.table.holeCards[hand.villain.pos];
    return hand._predeal && hand._predeal.villainCards ? hand._predeal.villainCards : null;
  }

  function assignHeroFromTable(hand) {
    if (!hand.table || !hand.hero.pos) return;
    const seat = heroTableSeat(hand);
    const hc = hand.table.holeCards[seat] || hand.table.holeCards[hand.hero.pos];
    if (!hc) return;
    hand.hero.cards = hc.slice();
    hand.hero.code = R.handCode(hand.hero.cards[0], hand.hero.cards[1]);
  }

  function markFolded(hand, pos) {
    if (!hand.table || !pos) return;
    hand.table.folded[pos] = true;
    hand.table.inHand.delete(pos);
    hand.table.streetBet[pos] = 0;
    if (hand.seatActions) delete hand.seatActions[pos];
  }

  function collapseOthersToHU(hand, villainPos, extraAlive) {
    if (!hand.table) return;
    const alive = new Set([hand.hero.pos, villainPos].concat(extraAlive || []));
    DEAL_ORDER.forEach(function (pos) {
      if (!alive.has(pos)) markFolded(hand, pos);
    });
  }

  /** Pliega implícitamente quien ya actuó; mantiene vivos al héroe, villano(s) y quien aún no ha hablado. */
  function markPreflopFoldsForFacingAction(hand, primaryVillainPos, extraInPot) {
    if (!hand.table || !primaryVillainPos || !hand.hero.pos) return;
    const order = preflopOrderForHand(hand);
    const villainSeat = villainTableSeat(hand) || primaryVillainPos;
    const heroSeat = heroTableSeat(hand);
    const extraSeats = (extraInPot || []).map(function (p) {
      if (!is9MaxHand(hand)) return p;
      const PC = global.PTPlayConfig;
      if (PC && PC.POS_9.indexOf(p) >= 0) return p;
      return PC ? PC.displaySeatForEngine(p, [heroSeat, villainSeat].concat(extraInPot || [])) : p;
    });
    const alive = new Set([heroSeat, villainSeat].concat(extraSeats));
    const villainIdx = order.indexOf(villainSeat);
    const heroIdx = order.indexOf(heroSeat);
    if (villainIdx < 0 || heroIdx < 0) return;
    order.forEach(function (pos, i) {
      if (alive.has(pos)) return;
      if (i < villainIdx) { markFolded(hand, pos); return; }
      if (i > heroIdx) return;
      if (i > villainIdx && i < heroIdx) markFolded(hand, pos);
    });
  }

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function tableSeatForEnginePos(hand, engPos) {
    const PC = global.PTPlayConfig;
    if (!PC || !hand.scenario || !hand.playConfig) return engPos;
    const st = hand.scenario.type;
    if (st !== 'vsRFI' && st !== 'face4bet') return engPos;
    const pk = parseVsKey(hand.scenario.key);
    if (engPos === pk.opener) return PC.openerDealSeat(hand.scenario, hand.playConfig) || engPos;
    if (engPos === pk.hero) return PC.heroDealSeat(hand.scenario, hand.playConfig) || engPos;
    return engPos;
  }

  function seatHoleCode(hand, pos) {
    if (!hand.table || !hand.table.holeCards || !pos) return null;
    const seat = tableSeatForEnginePos(hand, pos);
    let hc = hand.table.holeCards[seat] || hand.table.holeCards[pos];
    if ((!hc || hc.length < 2) && hand.villain && pos === hand.villain.pos) {
      const vs = villainTableSeat(hand);
      if (vs) hc = hand.table.holeCards[vs];
    }
    if (!hc || hc.length < 2) return null;
    return R.handCode(hc[0], hc[1]);
  }

  function strengthAtPos(hand, pos) {
    const code = seatHoleCode(hand, pos);
    return code ? handStrength01(code) : 0.35;
  }

  function profileFor(hand, pos) {
    return VP ? VP.profileForHand(hand, pos) : { postflop: {}, preflop: {}, id: 'tag', label: 'TAG', shortLabel: 'Tight-agresivo' };
  }

  function assignSeatProfiles(hand) {
    if (!VP || !hand.table) return;
    const level = (hand.playConfig && hand.playConfig.villainLevel) || 'fish';
    VP.assignTableProfiles(hand, tablePositionsForHand(hand), heroTableSeat(hand), level);
  }

  function syncVillainMeta(hand) {
    if (!hand.villain || !hand.villain.pos) return;
    const prof = profileFor(hand, hand.villain.pos);
    hand.villain.profileId = prof.id;
    hand.villain.profileLabel = prof.label;
    hand.villain.profileShort = prof.shortLabel;
  }

  function villainBetAmount(hand) {
    const prof = profileFor(hand, hand.villain.pos);
    const info = hand.villain.cards ? classifyMadeHand(hand.villain.cards, hand.board) : null;
    const eq = villainEquity01(hand);
    const strength = eq != null ? eq : (info ? ({ strong: 0.78, medium: 0.52, weak: 0.34, air: 0.14 }[info.tier] || 0.3) : 0.3);
    let size = VP ? VP.betSizeBB(hand.potBB, prof, C.rng.random(), { street: hand.stage, strength }) : round2(hand.potBB * 0.5);
    const vSeat = villainTableSeat(hand) || hand.villain.pos;
    return capBetForSeat(hand, vSeat, size);
  }

  /** Deja en mesa solo héroe y villano activo (oculta ciegas y resto en UI). */
  function syncTableToActivePot(hand) {
    if (!hand.table || !hand.hero.pos) return;
    const heroSeat = heroTableSeat(hand);
    const vSeat = villainTableSeat(hand);
    const alive = new Set([heroSeat]);
    if (vSeat && !hand.table.folded[vSeat]) alive.add(vSeat);
    tablePositionsForHand(hand).forEach(function (pos) {
      if (!alive.has(pos)) markFolded(hand, pos);
    });
  }

  function resolvePendingAfterHero(hand) {
    const order = preflopOrderForHand(hand);
    const heroSeat = heroTableSeat(hand);
    const vSeat = villainTableSeat(hand);
    const heroIdx = order.indexOf(heroSeat);
    if (heroIdx < 0 || !hand.table) return;
    order.forEach(function (pos, i) {
      if (i <= heroIdx || pos === heroSeat || pos === vSeat) return;
      if (hand.table.inHand.has(pos)) markFolded(hand, pos);
    });
    syncTableToActivePot(hand);
  }

  function bbDefendVsOpen(hand, openSize) {
    const profile = profileFor(hand, 'BB');
    const code = seatHoleCode(hand, 'BB');
    if (VPF && code && hand.hero.pos) {
      return VPF.defendVsOpen(code, profile, C.rng.random(), 'BB', hand.hero.pos, rangeCtx(hand));
    }
    const level = (hand.playConfig && hand.playConfig.villainLevel) || 'fish';
    if (level === 'pro' || level === 'intermediate') return 'fold';
    const s = strengthAtPos(hand, 'BB');
    const r = C.rng.random();
    let foldProb = VP ? VP.adjustFoldProb(clamp(0.48 - s * 0.42, 0.10, 0.58), profile)
      : clamp(0.48 - s * 0.42, 0.10, 0.58);
    let threeBetProb = VP ? VP.adjustThreeBetProb(clamp((s - 0.58) * 0.45, 0.03, 0.20), profile)
      : clamp((s - 0.58) * 0.45, 0.03, 0.20);
    if (r < foldProb) return 'fold';
    if (r < foldProb + threeBetProb) return '3bet';
    return 'call';
  }

  function seatToCall(hand, pos, targetSize) {
    const inv = (hand.table && hand.table.invested[pos]) || 0;
    return round2(Math.max(targetSize - inv, 0));
  }

  function recalcPot(hand) {
    if (!hand.table) return;
    let pot = 0;
    DEAL_ORDER.forEach(function (pos) {
      pot += hand.table.invested[pos] || 0;
    });
    hand.potBB = round2(pot);
  }

  function blindDefendVsOpen(hand, pos, openSize) {
    const profile = profileFor(hand, pos);
    const code = seatHoleCode(hand, pos);
    if (VPF && code && hand.hero.pos) {
      return VPF.defendVsOpen(code, profile, C.rng.random(), pos, hand.hero.pos, rangeCtx(hand));
    }
    const level = (hand.playConfig && hand.playConfig.villainLevel) || 'fish';
    if (level === 'pro' || level === 'intermediate') return 'fold';
    const s = strengthAtPos(hand, pos);
    const toCall = seatToCall(hand, pos, openSize);
    const r = C.rng.random();
    const posBias = pos === 'SB' ? 0.07 : 0;
    let foldProb = clamp(0.50 - s * 0.42 + posBias + toCall * 0.012, 0.06, 0.72);
    if (VP) foldProb = VP.adjustFoldProb(foldProb, profile);
    let threeBetProb = clamp((s - 0.58) * 0.38, 0.02, 0.18);
    if (VP) threeBetProb = VP.adjustThreeBetProb(threeBetProb, profile);
    if (r < foldProb) return 'fold';
    if (r < foldProb + threeBetProb) return '3bet';
    return 'call';
  }

  function respondersAfterHero(hand) {
    const heroIdx = PREFLOP_ACTION.indexOf(hand.hero.pos);
    const out = [];
    for (let i = heroIdx + 1; i < PREFLOP_ACTION.length; i++) {
      const pos = PREFLOP_ACTION[i];
      if (hand.table.inHand.has(pos) && !hand.table.folded[pos]) out.push(pos);
    }
    return out;
  }

  /** Tras un open del héroe: SB/BB (y quien quede) defienden con su mano y perfil. */
  function resolveBlindsAfterHeroOpen(hand, openSize) {
    const responders = respondersAfterHero(hand);
    let threeBettor = null;
    let threeBetSize = 0;
    const callers = [];

    for (let ri = 0; ri < responders.length; ri++) {
      const pos = responders[ri];
      if (sessionStrict(hand)) ensureDefenderHand(hand, pos, hand.hero.pos);
      const act = blindDefendVsOpen(hand, pos, openSize);
      if (act === 'fold') {
        markFolded(hand, pos);
        setSeatAction(hand, pos, 'fold', null);
        continue;
      }
      if (act === '3bet') {
        threeBetSize = round2(openSize * (pos === 'SB' ? 3.6 : 3.4));
        threeBettor = pos;
        setSeatAction(hand, pos, 'raise', threeBetSize);
        const add = seatToCall(hand, pos, threeBetSize);
        if (add > 0) addInvest(hand, pos, add);
        setPreflopSeatBet(hand, pos, threeBetSize);
        recalcPot(hand);
        break;
      }
      const add = seatToCall(hand, pos, openSize);
      if (add > 0) addInvest(hand, pos, add);
      setPreflopSeatBet(hand, pos, openSize);
      setSeatAction(hand, pos, 'call', openSize);
      callers.push(pos);
    }

    if (threeBettor) {
      ensureThreeBetHand(hand, threeBettor, hand.hero.pos);
      hand.villain.pos = threeBettor;
      hand.villain.cards = villainHoleCards(hand);
      hand.villain.rangeStr = bb3betRange(hand.hero.pos, hand);
      syncVillainMeta(hand);
      initVillainTracker(hand);
      hand.villainInvested = threeBetSize;
      recalcPot(hand);
      setVillainAct(hand, 'raise', threeBetSize);
      return { type: 'face3bet', size: threeBetSize };
    }

    if (!callers.length) return { type: 'allFold' };

    const villainPos = callers.indexOf('BB') >= 0 ? 'BB' : callers[callers.length - 1];
    hand.villain.pos = villainPos;
    hand.villain.cards = villainHoleCards(hand);
    hand.villain.rangeStr = bbCallRange(hand.hero.pos, hand);
    syncVillainMeta(hand);
    initVillainTracker(hand);
    hand.villainInvested = openSize;
    hand.heroInvested = openSize;
    hand._callersAtFlop = callers.filter(function (c) { return c !== villainPos; });
    recalcPot(hand);
    hand.heroInPosition = inPos(hand.hero.pos, villainPos);
    setVillainAct(hand, 'call', openSize);
    return { type: 'goFlop' };
  }

  function limperDefendVsIso(hand, limperPos, isoSize) {
    const profile = profileFor(hand, limperPos);
    const code = seatHoleCode(hand, limperPos);
    if (VPF && code) {
      return VPF.limperVsIsoAction(code, profile, C.rng.random());
    }
    const level = (hand.playConfig && hand.playConfig.villainLevel) || 'fish';
    if (level === 'pro' || level === 'intermediate') return 'fold';
    const s = strengthAtPos(hand, limperPos);
    let callProb = clamp(0.18 + s * 0.62 - isoSize * 0.02, 0.12, 0.78);
    if (VP) callProb = VP.adjustCallProb(callProb, profile);
    return C.rng.random() < callProb ? 'call' : 'fold';
  }

  function sessionStrict(hand) {
    const level = (hand.playConfig && hand.playConfig.villainLevel) || 'fish';
    return level === 'pro' || level === 'intermediate';
  }

  function ensureSeatHand(hand, pos, validateFn, weightsFn) {
    if (!sessionStrict(hand) || !VPF) return;
    const ctx = rangeCtx(hand);
    for (let i = 0; i < 14; i++) {
      const code = seatHoleCode(hand, pos);
      if (code && validateFn(code, ctx, pos)) return;
      resampleSeatFromWeights(hand, pos, weightsFn);
    }
    for (let j = 0; j < 10; j++) {
      resampleSeatFromWeights(hand, pos, weightsFn);
      const code = seatHoleCode(hand, pos);
      if (code && validateFn(code, ctx, pos)) return;
    }
  }

  function ensureOpenerOpenHand(hand, opener) {
    ensureSeatHand(hand, opener, function (code, ctx) {
      return VPF.isInOpenRange(code, opener, ctx);
    }, function (cfg) {
      return global.PTPlayConfig.sampleVillainWeights(hand.scenario, cfg);
    });
  }

  function ensureLimperHand(hand, limper) {
    ensureSeatHand(hand, limper, function (code) {
      return VPF.isInLimpRange(code);
    }, function (cfg) {
      return global.PTPlayConfig.sampleLimpWeights(cfg);
    });
  }

  function ensureDefenderHand(hand, defender, opener) {
    ensureSeatHand(hand, defender, function (code, ctx) {
      return VPF.isInDefendRange(code, defender, opener, ctx);
    }, function (cfg) {
      const PC = global.PTPlayConfig;
      const heroEng = hand.hero.pos;
      if (!PC || !heroEng) return {};
      const key = defender + '_vs_' + heroEng;
      const d = PC.vsRfiTable(cfg)[key];
      if (!d) return PC.sampleRfiDefenderWeights(hand.scenario, cfg);
      return global.GTORangesWeights.fromSets({
        threeBet: d.threeBet,
        threeBetMix: d.threeBetMix,
        call: d.call,
        callMix: d.callMix
      });
    });
  }

  function ensureThreeBetHand(hand, defender, opener) {
    ensureSeatHand(hand, defender, function (code, ctx) {
      return VPF.isInThreeBetRange(code, defender, opener, ctx);
    }, function (cfg) {
      const PC = global.PTPlayConfig;
      const key = defender + '_vs_' + opener;
      const d = PC.vsRfiTable(cfg)[key];
      if (!d || !global.GTORangesWeights) return {};
      return global.GTORangesWeights.fromSets({
        threeBet: d.threeBet,
        threeBetMix: d.threeBetMix
      });
    });
  }

  function ensureOpenerFourBetHand(hand, opener) {
    ensureSeatHand(hand, opener, function (code, ctx) {
      return VPF.isInFourBetRange(code, ctx);
    }, function (cfg) {
      return global.PTPlayConfig.sampleFace4betVillainWeights(cfg);
    });
  }

  function resampleSeatFromWeights(hand, pos, weightsFn) {
    const PC = global.PTPlayConfig;
    if (!PC || !hand.playConfig || !hand.table) return;
    const seat = tableSeatForEnginePos(hand, pos);
    const dead = [];
    Object.keys(hand.table.holeCards || {}).forEach(function (p) {
      if (p !== seat && p !== pos && hand.table.holeCards[p]) dead.push.apply(dead, hand.table.holeCards[p]);
    });
    const weights = weightsFn(hand.playConfig);
    const cards = PC.sampleFromWeights(weights, dead, C.rng.random);
    if (cards) {
      hand.table.holeCards[seat] = cards;
      if (seat !== pos) hand.table.holeCards[pos] = cards;
      const vSeat = villainTableSeat(hand);
      if (seat === vSeat || pos === vSeat || pos === hand.villain.pos) hand.villain.cards = cards;
    }
  }

  function forceValidOpenerFourBetHand(hand, opener) {
    if (!VPF) return;
    ensureOpenerFourBetHand(hand, opener);
    const ctx = rangeCtx(hand);
    let code = seatHoleCode(hand, opener);
    if (code && VPF.isInFourBetRange(code, ctx)) {
      hand.villain.cards = villainHoleCards(hand);
      return;
    }
    const PC = global.PTPlayConfig;
    const seat = tableSeatForEnginePos(hand, opener);
    const rangeStr = PC ? PC.face4betVillainRangeStr(hand.playConfig) : R.VS_3BET.fourBet;
    const sample = GTO && GTO.Equity;
    for (let i = 0; i < 40; i++) {
      const dead = [];
      Object.keys(hand.table.holeCards || {}).forEach(function (p) {
        if (p !== seat && p !== opener && hand.table.holeCards[p]) {
          dead.push.apply(dead, hand.table.holeCards[p]);
        }
      });
      let cards = PC ? PC.sampleFromWeights(PC.sampleFace4betVillainWeights(hand.playConfig), dead, C.rng.random) : null;
      if (!cards && sample && sample.sampleHandFromRange) {
        cards = sample.sampleHandFromRange(rangeStr, dead, C.rng.random);
      }
      if (!cards) continue;
      hand.table.holeCards[seat] = cards;
      if (seat !== opener) hand.table.holeCards[opener] = cards;
      const vSeat = villainTableSeat(hand);
      if (seat === vSeat || opener === hand.villain.pos) hand.villain.cards = cards;
      code = R.handCode(cards[0], cards[1]);
      if (VPF.isInFourBetRange(code, ctx)) return;
    }
  }

  function openerVs3Bet(hand, opener, threeBetSize) {
    const profile = profileFor(hand, opener);
    const code = seatHoleCode(hand, opener);
    if (VPF && code) {
      return VPF.openerVs3BetAction(code, profile, C.rng.random(), rangeCtx(hand));
    }
    const level = (hand.playConfig && hand.playConfig.villainLevel) || 'fish';
    if (level === 'pro' || level === 'intermediate') return 'fold';
    const s = strengthAtPos(hand, opener);
    let foldProb = clamp(0.58 - s * 0.48, 0.14, 0.70);
    let fourBetProb = clamp((s - 0.68) * 0.38, 0.02, 0.16);
    if (VP) {
      foldProb = VP.adjustFoldProb(foldProb, profile);
      fourBetProb = VP.adjustFourBetProb(fourBetProb, profile);
    }
    const roll = C.rng.random();
    if (roll < foldProb) return 'fold';
    if (roll > 1 - fourBetProb) return '4bet';
    return 'call';
  }

  function openerVsSqueeze(hand, opener, squeezeSize) {
    const profile = profileFor(hand, opener);
    const code = seatHoleCode(hand, opener);
    if (VPF && code) {
      return VPF.openerVsSqueezeAction(code, profile, C.rng.random(), opener, rangeCtx(hand));
    }
    const level = (hand.playConfig && hand.playConfig.villainLevel) || 'fish';
    if (level === 'pro' || level === 'intermediate') return 'fold';
    const s = strengthAtPos(hand, opener);
    let foldProb = clamp(0.55 - s * 0.44, 0.16, 0.68);
    if (VP) foldProb = VP.adjustFoldProb(foldProb, profile);
    return C.rng.random() < foldProb ? 'fold' : 'call';
  }

  function addInvest(hand, pos, amount) {
    if (!hand.table || !pos || !amount) return;
    hand.table.invested[pos] = round2((hand.table.invested[pos] || 0) + amount);
  }

  function setPreflopSeatBet(hand, pos, amount) {
    if (!hand.table || !pos) return;
    hand.table.streetBet[pos] = round2(amount || 0);
  }

  function setSeatAction(hand, pos, type, amount) {
    hand.seatActions = hand.seatActions || {};
    hand.seatActions[pos] = { type: type, amount: amount != null ? amount : null };
    if (hand.table && amount > 0 && ['bet', 'call', 'raise', 'open'].indexOf(type) >= 0) {
      setPreflopSeatBet(hand, pos, amount);
    }
  }

  function markFoldedBeforeHeroRFI(hand) {
    if (!hand.table || !hand.hero.pos) return;
    const order = preflopOrderForHand(hand);
    const heroSeat = heroTableSeat(hand);
    const idx = order.indexOf(heroSeat);
    if (idx <= 0) return;
    for (let i = 0; i < idx; i++) markFolded(hand, order[i]);
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
      else if (s.type === 'face3bet') spotKind = 'face3bet';
      else if (s.type === 'bbVsSbLimp') spotKind = 'bbVsSbLimp';
      else if (s.type === 'sbLimp') spotKind = 'sbLimp';
      else if (s.type === 'cold4bet') spotKind = 'cold4bet';
    } else {
      spotKind = 'postflop';
    }

    const input = {
      spotKind, position: hand.hero.pos, vsPosition: hand.villain.pos,
      stackDepth: effStackForHand(hand), street: node.street,
      board: hand.board.slice(), heroCards: hand.hero.cards, handCode: hand.hero.code,
      potBB: node.potBB, toCallBB: facingBet(node) ? node.toCallBB : 0,
      potBeforeBB: node.toCallBB > 0 ? Math.max(node.potBB - node.toCallBB, 0.1) : node.potBB,
      initiative: hand.heroIsAggressor ? 'aggressor' : 'caller',
      inPosition: hand.heroInPosition,
      villainRange: villainRangeAtNode(hand, node),
      madeHandInfo: node.info,
      villainLastAction: hand.villainAction ? hand.villainAction.type : null,
      chosenAction: chosenAction,
      availableActions,
      betSizeBB: opt && opt.size != null ? opt.size : (chosenAction === 'raise' ? round2((node.toCallBB || 0) * 3) : 0)
    };
    if (s.type === 'vsRFI' && node.street === 'preflop') {
      input.vsRfiKey = s.key;
      input.vsPosition = parseVsKey(s.key).opener;
    }
    if (s.type === 'face3bet' && node.street === 'preflop') {
      const pk = parseFace3betKey(s.key);
      input.position = pk.opener;
      input.vsPosition = pk.threeBettor;
    }
    if (s.type === 'squeeze' && node.street === 'preflop') {
      input.callerPos = s.callerPos;
      input.vsPosition = s.openerPos;
    }
    if (s.type === 'isoLimp' && node.street === 'preflop') {
      input.vsPosition = s.limperPos;
    }
    if (s.type === 'bbVsSbLimp') input.vsPosition = 'SB';
    if (s.type === 'cold4bet' && node.street === 'preflop') {
      input.vsPosition = s.threeBettorPos || hand.villain.pos;
    }
    const rem = heroRemainingBB(hand);
    input.stackDepth = effStackForHand(hand);
    input.effStack = input.stackDepth;
    input.heroRemainingBB = rem;
    input.spr = node.potBB > 0 ? rem / node.potBB : rem;
    const RR = global.GTORangesRegistry;
    if (RR) RR.attachToInput(input, rangeCtx(hand));
    return input;
  }

  function facingBet(node) {
    return (node.toCallBB || 0) > 0 && (node.options || []).some((o) => o.id === 'fold' || o.id === 'call');
  }

  function strategyForNode(hand, node) {
    return GTO.getStrategy(buildSpotInput(hand, node, null));
  }

  // ---------- Villano postflop ----------
  function villainEquity01(hand) {
    if (!hand.villain.cards || !hand.board.length) return null;
    const range = hand.villain.rangeStr || GTO.Ranges.data.BROAD_CONTINUE;
    return equityVsRange(hand.villain.cards, hand.board, range, 180, { street: hand.stage });
  }

  function villainPostflopStrength(info, eq) {
    const floors = { strong: 0.8, medium: 0.55, weak: 0.32, air: 0.12 };
    let s = eq != null ? eq : (floors[info.tier] || 0.3);
    if (info && info.ev) {
      const cat = info.ev.category;
      if (cat >= 4) s = Math.max(s, 0.88);
      else if (cat >= 3) s = Math.max(s, 0.86);
      else if (cat >= 2) s = Math.max(s, 0.84);
      else if (cat === 1 && info.tier === 'strong') s = Math.max(s, 0.76);
    }
    return s;
  }

  function villainPostflopOpts(hand, info) {
    return {
      street: hand.stage,
      tier: info.tier,
      madeCategory: info.ev ? info.ev.category : 0
    };
  }

  function villainPostflopAction(hand, node) {
    const profile = profileFor(hand, hand.villain.pos);
    const info = classifyMadeHand(hand.villain.cards, hand.board);
    const eq = villainEquity01(hand);
    const strength = villainPostflopStrength(info, eq);
    const rnd = C.rng.random();
    const pfOpts = villainPostflopOpts(hand, info);

    if (profile.preflopStrict >= 0.99 && hand.villain.cards && GTO && GTO.Strategy) {
      const villainToCall = (hand.table && hand.table.streetBet && hand.hero.pos)
        ? (hand.table.streetBet[hand.hero.pos] || 0) : 0;
      const potBefore = Math.max(hand.potBB - villainToCall, 0.1);
      const remV = ST() && hand.stacks
        ? ST().remaining(hand, villainTableSeat(hand) || hand.villain.pos)
        : EFF;
      const spr = hand.potBB > 0 ? remV / hand.potBB : remV;
      const strat = GTO.Strategy.postflopStrategy({
        toCallBB: villainToCall,
        potBB: hand.potBB,
        heroEquity: eq != null ? eq : strength,
        madeHandInfo: info,
        board: hand.board.slice(),
        heroCards: hand.villain.cards,
        initiative: hand.heroIsAggressor ? 'caller' : 'aggressor',
        inPosition: !hand.heroInPosition,
        spr: spr
      });
      if (node.heroLastAction === 'bet' || node.heroLastAction === 'raise') {
        const foldP = strat.fold || 0;
        const raiseP = strat.raise || 0;
        if (rnd < raiseP && villainToCall > 0) return 'raise';
        if (rnd < raiseP + (strat.call || 0)) return 'call';
        return 'fold';
      }
      const betKeys = ['bet_100', 'bet_66', 'bet_33', 'bet'];
      let betP = 0;
      betKeys.forEach(function (k) { betP += strat[k] || 0; });
      return rnd < betP ? 'bet' : 'check';
    }

    if (node.heroLastAction === 'bet' || node.heroLastAction === 'raise') {
      const villainToCall = (hand.table && hand.table.streetBet && hand.hero.pos)
        ? (hand.table.streetBet[hand.hero.pos] || 0) : 0;
      const potBefore = Math.max(hand.potBB - villainToCall, 0.1);
      const potOdds = villainToCall > 0 ? villainToCall / (potBefore + villainToCall) : 0.33;
      if (VP) return VP.postflopFacingBet(strength, potOdds, profile, rnd, pfOpts);
      if (strength > 0.72) return rnd < 0.22 ? 'raise' : 'call';
      if (strength > potOdds + 0.08) return rnd < 0.82 ? 'call' : 'fold';
      if (strength > potOdds - 0.05) return rnd < 0.45 ? 'call' : 'fold';
      return rnd < 0.08 ? 'raise' : 'fold';
    }
    const villainIsAgg = !hand.heroIsAggressor;
    if (VP) return VP.postflopLead(strength, profile, villainIsAgg, rnd, pfOpts);
    if (strength > 0.68) return rnd < 0.58 ? 'bet' : 'check';
    if (strength > 0.42) return rnd < 0.26 ? 'bet' : 'check';
    if (strength > 0.22) return rnd < 0.32 ? 'bet' : 'check';
    return rnd < 0.14 ? 'bet' : 'check';
  }

  // ---------- Definición de escenarios ----------
  const RFI_POS = ['UTG', 'HJ', 'CO', 'BTN', 'SB'];
  const VS_KEYS = Object.keys(R.VS_RFI);
  // Combinaciones de squeeze válidas (opener < caller < héroe en orden preflop)
  function squeezeCombosForEngine() {
    const PC = global.PTPlayConfig;
    if (PC && PC.SQUEEZE_COMBOS && PC.SQUEEZE_COMBOS.length) return PC.SQUEEZE_COMBOS;
    return [
      { heroPos: 'BB', openerPos: 'CO', callerPos: 'BTN' },
      { heroPos: 'BB', openerPos: 'HJ', callerPos: 'CO' },
      { heroPos: 'SB', openerPos: 'UTG', callerPos: 'CO' },
      { heroPos: 'BTN', openerPos: 'UTG', callerPos: 'HJ' },
      { heroPos: 'BTN', openerPos: 'HJ', callerPos: 'CO' }
    ];
  }
  // Combinaciones de aislamiento frente a un limper (héroe nunca en BB aquí)
  const ISO_COMBOS = [
    { heroPos: 'CO', limperPos: 'UTG' },
    { heroPos: 'BTN', limperPos: 'HJ' },
    { heroPos: 'BTN', limperPos: 'CO' },
    { heroPos: 'SB', limperPos: 'CO' }
  ];
  // Rango aproximado con el que un rival hace limp (pasivo/débil)
  const LIMP_RANGE = '22-99, A2s-A9s, K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, ATo-AJo, KJo, QJo, JTo';

  function pickScenario(forceKey, playConfig) {
    const PC = global.PTPlayConfig;
    if (forceKey && forceKey.type) {
      const s = Object.assign({}, forceKey);
      delete s.seed;
      if (PC && playConfig && PC.is9Max(playConfig) && s.heroPos && !s.engineHeroPos) {
        s.engineHeroPos = PC.enginePos(s.heroPos);
      }
      return s;
    }
    if (!forceKey && PC && playConfig) {
      return PC.pickScenario(playConfig, null);
    }
    const roll = Math.random();
    if (roll < 0.32) {
      return { type: 'RFI', heroPos: RFI_POS[Math.floor(Math.random() * RFI_POS.length)] };
    }
    if (roll < 0.66) {
      return { type: 'vsRFI', key: VS_KEYS[Math.floor(Math.random() * VS_KEYS.length)] };
    }
    if (roll < 0.84) {
      return Object.assign({ type: 'squeeze' }, squeezeCombosForEngine()[Math.floor(Math.random() * squeezeCombosForEngine().length)]);
    }
    return Object.assign({ type: 'isoLimp' }, ISO_COMBOS[Math.floor(Math.random() * ISO_COMBOS.length)]);
  }

  function scenarioHeroPos(hand) {
    const s = hand.scenario;
    if (!s) return hand.hero.pos;
    if (s.engineHeroPos) return s.engineHeroPos;
    if (s.type === 'vsRFI' || s.type === 'face4bet') return parseVsKey(s.key).hero;
    if (s.type === 'face3bet') return parseFace3betKey(s.key).opener;
    if (s.type === 'bbVsSbLimp') return 'BB';
    if (s.type === 'sbLimp') return 'SB';
    if (s.type === 'cold4bet') return s.heroPos || 'CO';
    return s.heroPos;
  }

  function dealForPlayConfig(scenario, playConfig) {
    const PC = global.PTPlayConfig;
    const order = PC && PC.is9Max(playConfig) ? PC.DEAL_ORDER_9 : DEAL_ORDER;
    const holeCards = {};
    order.forEach(function (pos) { holeCards[pos] = null; });
    let dead = [];

    const deals = PC ? PC.getScenarioDeals(scenario, playConfig) : [];
    deals.forEach(function (d) {
      if (!d.pos) return;
      const cards = PC.sampleFromWeights(d.weights, dead, C.rng.random);
      if (cards) {
        holeCards[d.pos] = cards;
        dead = dead.concat(cards);
      }
    });

    const heroSeat = PC ? PC.heroDealSeat(scenario, playConfig) : scenario.heroPos;
    const heroEng = scenario.engineHeroPos
      || (scenario.type === 'RFI' ? (PC ? PC.enginePos(scenario.heroPos) : scenario.heroPos) : null)
      || ((scenario.type === 'vsRFI' || scenario.type === 'face4bet') ? parseVsKey(scenario.key).hero : scenario.heroPos);
    if (!holeCards[heroSeat] || holeCards[heroSeat].length < 2) {
      const heroWeights = PC ? PC.sampleHeroWeights(scenario, playConfig) : {};
      let heroCards = PC ? PC.sampleFromWeights(heroWeights, dead, C.rng.random) : null;
      if (!heroCards) heroCards = sampleHandFromRange('22+, A2s+, K9s+, AJo+', dead, C.rng.random);
      holeCards[heroSeat] = heroCards;
      dead = dead.concat(heroCards);
    }

    const deck = C.shuffledDeckExcluding(dead);
    order.forEach(function (pos) {
      if (!holeCards[pos] || holeCards[pos].length < 2) {
        holeCards[pos] = [deck.pop(), deck.pop()];
      }
    });
    const board = [];
    while (board.length < 5 && deck.length) board.push(deck.pop());
    return {
      holeCards: holeCards,
      board: board,
      displayHeroPos: (PC && PC.is9Max(playConfig) && scenario.heroPos) ? scenario.heroPos
        : (scenario.heroPos !== heroEng ? scenario.heroPos : null)
    };
  }

  function parseFace3betKey(key) {
    const parts = key.split('_');
    return { opener: parts[0], threeBettor: parts[2] };
  }

  function parseVsKey(key) {
    const [hero, , opener] = key.split('_'); // HERO_vs_OPENER
    return { hero, opener };
  }

  // ---------- Crear una mano ----------
  function newHand(force, playConfig) {
    const scenario = pickScenario(force, playConfig);
    const seed = (force && force.seed != null) ? (force.seed >>> 0) : (Math.floor(Math.random() * 2147483647) >>> 0);
    C.rng.setSeed(seed);

    const useConfigDeal = playConfig && global.PTPlayConfig;
    const dealt = useConfigDeal ? dealForPlayConfig(scenario, playConfig) : dealFullTable();
    const holeCards = dealt.holeCards;
    const board = dealt.board;

    // rango y posición del villano (mano concreta = reparto de su asiento)
    let vRange, vPos;
    if (scenario.type === 'RFI') {
      const hp = scenario.engineHeroPos
        || (global.PTPlayConfig ? global.PTPlayConfig.enginePos(scenario.heroPos) : scenario.heroPos);
      vPos = 'BB';
      vRange = rfiDefendRange(hp, { playConfig: playConfig });
    } else if (scenario.type === 'squeeze') {
      vPos = scenario.openerPos;
      vRange = openRangeStr(scenario.openerPos, { playConfig: playConfig });
    } else if (scenario.type === 'isoLimp') {
      vPos = scenario.limperPos;
      vRange = LIMP_RANGE;
    } else if (scenario.type === 'face4bet') {
      const pk = parseVsKey(scenario.key);
      vPos = pk.opener;
      vRange = global.PTPlayConfig ? global.PTPlayConfig.face4betVillainRangeStr(playConfig) : R.VS_3BET.fourBet;
    } else if (scenario.type === 'face3bet') {
      const pk = parseFace3betKey(scenario.key);
      vPos = pk.threeBettor;
      const reg = global.GTORangesRegistry;
      const vsKey = pk.threeBettor + '_vs_' + pk.opener;
      const d = R.VS_RFI[vsKey] || (reg ? reg.getVsRfiRow(pk.threeBettor, pk.opener, playConfig || {}) : null);
      vRange = d ? (d.threeBet + ', ' + d.threeBetMix) : 'QQ+, AKs, AKo';
    } else if (scenario.type === 'bbVsSbLimp') {
      vPos = 'SB';
      vRange = LIMP_RANGE;
    } else if (scenario.type === 'sbLimp') {
      vPos = 'BB';
      vRange = bbCallRange('SB', { playConfig: playConfig });
    } else if (scenario.type === 'cold4bet') {
      vPos = scenario.threeBettorPos || 'HJ';
      const vsKey = vPos + '_vs_' + (scenario.openerPos || 'UTG');
      const d = R.VS_RFI[vsKey];
      vRange = d ? (d.threeBet + ', ' + (d.threeBetMix || '')) : 'QQ+, AKs, AKo';
    } else {
      const pk = parseVsKey(scenario.key);
      vPos = pk.opener;
      vRange = openRangeStr(pk.opener, { playConfig: playConfig });
    }

    const stackBB = playConfig && global.PTPlayConfig
      ? global.PTPlayConfig.stackBB(playConfig)
      : EFF;

    const hand = {
      id: 'h' + Date.now() + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      seed: seed,
      scenario: scenario,
      playConfig: playConfig || null,
      displayHeroPos: dealt.displayHeroPos || null,
      hero: { cards: [], code: null, pos: null },
      villain: { cards: null, rangeStr: null, pos: null, profileId: null, profileLabel: null, profileShort: null },
      table: initTableState(holeCards),
      _predeal: { holeCards: holeCards, board: board, villainPos: vPos, villainRange: vRange },
      board: [],
      potBB: 0, heroInvested: 0, villainInvested: 0,
      effStack: stackBB,
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
    else if (scenario.type === 'face4bet') setupFace4betInitial(hand);
    else if (scenario.type === 'face3bet') setupFace3betInitial(hand);
    else if (scenario.type === 'bbVsSbLimp') setupBbVsSbLimp(hand);
    else if (scenario.type === 'sbLimp') setupSbLimp(hand);
    else if (scenario.type === 'cold4bet') setupCold4betInitial(hand);
    else setupVsRFI(hand);
    assignHeroFromTable(hand);
    assignSeatProfiles(hand);
    initHandStacks(hand);
    syncVillainMeta(hand);
    return hand;
  }

  function inPos(a, b) { return POSTFLOP_ORDER.indexOf(a) > POSTFLOP_ORDER.indexOf(b); }

  function setupRFI(hand) {
    const pos = scenarioHeroPos(hand);
    hand.hero.pos = pos;
    const displayPos = hand.displayHeroPos || hand.scenario.heroPos || pos;
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
      context: `Eres ${displayPos}. La acción te llega sin subir (RFI). ¿Abres o te retiras?`
    };
    markFoldedBeforeHeroRFI(hand);
  }

  function setupVsRFI(hand) {
    const { hero, opener } = parseVsKey(hand.scenario.key);
    hand.hero.pos = hero;
    hand.villain.pos = opener;
    ensureOpenerOpenHand(hand, opener);
    hand.villain.rangeStr = openRangeStr(opener, hand);
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
    setPreflopSeatBet(hand, opener, openSize);
    markPreflopFoldsForFacingAction(hand, opener);
  }

  function setupSqueeze(hand) {
    const heroPos = scenarioHeroPos(hand);
    const displayHero = hand.displayHeroPos || hand.scenario.heroPos || heroPos;
    const { openerPos, callerPos } = hand.scenario;
    hand.hero.pos = heroPos;
    hand.villain.pos = openerPos;
    ensureOpenerOpenHand(hand, openerPos);
    hand.villain.rangeStr = openRangeStr(openerPos, hand);
    initVillainTracker(hand);
    const openSize = OPEN;
    // bote: ciegas + open + call del pagador (dinero muerto)
    hand.potBB = round2(SB + BBET + openSize + openSize);
    const heroBlind = heroPos === 'SB' ? SB : (heroPos === 'BB' ? BBET : 0);
    hand.heroInvested = heroBlind;
    hand.toCallBB = round2(openSize - heroBlind);
    const inPosVsOpener = inPos(heroPos, openerPos);
    let squeezeSize = inPosVsOpener ? round2(openSize * 4) : round2(openSize * 5);
    squeezeSize = capBetForSeat(hand, heroPos, squeezeSize);
    if (squeezeSize <= openSize) squeezeSize = round2(openSize + 1);
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
      context: `Eres ${displayHero}. ${openerPos} abre a ${openSize}bb y ${callerPos} paga. ¿Fold, call o squeeze (3-bet)?`
    };
    setVillainAct(hand, 'open', openSize);
    addInvest(hand, openerPos, openSize);
    setPreflopSeatBet(hand, openerPos, openSize);
    setSeatAction(hand, openerPos, 'open', openSize);
    addInvest(hand, callerPos, openSize);
    setPreflopSeatBet(hand, callerPos, openSize);
    setSeatAction(hand, callerPos, 'call', openSize);
    markPreflopFoldsForFacingAction(hand, openerPos, [callerPos]);
  }

  function setupIsoLimp(hand) {
    const { heroPos, limperPos } = hand.scenario;
    hand.hero.pos = heroPos;
    hand.villain.pos = limperPos;
    ensureLimperHand(hand, limperPos);
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
    markPreflopFoldsForFacingAction(hand, limperPos);
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
      evErroneous: ev.evErroneous,
      evErrorReasons: ev.evErrorReasons,
      mathParams: ev.mathParams,
      evLossTier: ev.evLossTier,
      actionEV: ev.actionEV,
      bestEV: ev.bestEV,
      frequency: ev.frequency,
      confidence: ev.confidence,
      confidenceTier: ev.confidenceTier,
      confidenceLabel: ev.confidenceLabel,
      confidenceTitle: ev.confidenceTitle,
      confidenceReasons: ev.confidenceReasons,
      score: ev.score,
      explanation: evalResult.explanation,
      errors: ev.errors,
      heroEquity: evalResult.heroEquity != null ? round2(evalResult.heroEquity * 100) : null,
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
      const squeezeAdd = capBetForSeat(hand, hand.hero.pos, node.squeezeSize - hand.heroInvested);
      hand.heroInvested = round2(hand.heroInvested + squeezeAdd);
      setHeroAct(hand, squeezeAdd >= heroRemainingBB(hand) - 0.01 ? 'allin' : 'raise', node.squeezeSize);
      hand.villain.cards = villainHoleCards(hand);
      const callerPos = hand.scenario.callerPos;
      let callerIn = false;
      if (callerPos && hand.table && !hand.table.folded[callerPos]) {
        const callerCode = seatHoleCode(hand, callerPos);
        const callerProf = profileFor(hand, callerPos);
        const callerAct = VPF && callerCode
          ? VPF.callerVsSqueezeAction(callerCode, callerProf, C.rng.random(), rangeCtx(hand))
          : 'fold';
        if (callerAct === 'call') {
          callerIn = true;
          const callerAdd = capBetForSeat(hand, callerPos, node.squeezeSize - (hand.table.invested[callerPos] || 0));
          if (callerAdd > 0) addInvest(hand, callerPos, callerAdd);
          setSeatAction(hand, callerPos, 'call', node.squeezeSize);
          hand._callersAtFlop = hand._callersAtFlop || [];
          if (hand._callersAtFlop.indexOf(callerPos) < 0) hand._callersAtFlop.push(callerPos);
        } else {
          markFolded(hand, callerPos);
          setSeatAction(hand, callerPos, 'fold', null);
        }
      }
      if (openerVsSqueeze(hand, hand.villain.pos, node.squeezeSize) === 'fold') {
        setVillainAct(hand, 'fold');
        markFolded(hand, hand.villain.pos);
        if (callerIn && callerPos) {
          hand.villain.pos = callerPos;
          hand.villain.cards = villainHoleCards(hand);
          hand.villain.rangeStr = VPF ? VPF.rangeStrForCall3Bet(rangeCtx(hand)) : (R.VS_3BET.call + ', ' + R.VS_3BET.callMix);
          syncVillainMeta(hand);
          initVillainTracker(hand);
          hand.villainInvested = node.squeezeSize;
          hand.heroIsAggressor = true;
          hand.heroInPosition = inPos(hand.hero.pos, callerPos);
          recalcPot(hand);
          return goFlop(hand);
        }
        if (callerPos) markFolded(hand, callerPos);
        return finish(hand, { reason: 'Abridor y pagador se retiran ante tu squeeze.', heroNet: round2(hand.potBB - heroBlind + squeezeAdd) });
      }
      // el abridor paga el squeeze -> flop en bote resubido, hero agresor
      const openerAdd = capBetForSeat(hand, hand.villain.pos, node.squeezeSize - (hand.villainInvested || 0));
      setVillainAct(hand, 'call', node.squeezeSize);
      hand.villainInvested = round2((hand.villainInvested || 0) + openerAdd);
      if (openerAdd > 0) addInvest(hand, hand.villain.pos, openerAdd);
      hand.potBB = round2(hand.potBB + squeezeAdd + openerAdd + (callerIn ? seatToCall(hand, callerPos, node.squeezeSize) : 0));
      hand.heroInPosition = inPos(hand.hero.pos, hand.villain.pos);
      if (callerPos && !callerIn) markFolded(hand, callerPos);
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
        resolvePendingAfterHero(hand);
        return goFlop(hand);
      }
      // aislar con subida
      hand.heroIsAggressor = true;
      hand.heroInvested = node.isoSize;
      setHeroAct(hand, 'raise', node.isoSize);
      resolvePendingAfterHero(hand);
      if (limperDefendVsIso(hand, hand.villain.pos, node.isoSize) === 'fold') {
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
      const foldProb = VP
        ? VP.adjustFoldProb(clamp(0.62 - strengthAtPos(hand, hand.villain.pos) * 0.5, 0.15, 0.72), profileFor(hand, hand.villain.pos))
        : clamp(0.62 - strengthAtPos(hand, hand.villain.pos) * 0.5, 0.15, 0.72);
      const vCode = seatHoleCode(hand, hand.villain.pos);
      const vProf = profileFor(hand, hand.villain.pos);
      let vAct = 'call';
      if (VPF && vCode) {
        vAct = VPF.villainVs4BetAction(vCode, vProf, C.rng.random());
      } else {
        const level = (hand.playConfig && hand.playConfig.villainLevel) || 'fish';
        if (level === 'pro' || level === 'intermediate') vAct = 'fold';
        else if (C.rng.random() < foldProb) vAct = 'fold';
      }
      if (vAct === 'fold') {
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
        hand.heroIsAggressor = false;
        hand.potBB = round2(hand.villainInvested * 2 + SB);
        hand.heroInPosition = inPos(hand.hero.pos, hand.villain.pos);
        return goFlop(hand);
      }
      // all-in (5-bet): el villano decide call/fold antes del showdown
      setHeroAct(hand, 'allin', EFF);
      hand.villain.cards = villainHoleCards(hand);
      const aiCode = seatHoleCode(hand, hand.villain.pos);
      const aiProf = profileFor(hand, hand.villain.pos);
      if (VPF && aiCode && VPF.villainVsAllInAction(aiCode, aiProf, C.rng.random()) === 'fold') {
        setVillainAct(hand, 'fold');
        return finish(hand, {
          reason: 'El villano foldea ante tu all-in.',
          heroNet: round2(hand.potBB + node.toCallBB - (hand.heroInvested || 0))
        });
      }
      setVillainAct(hand, 'call', EFF);
      return allInShowdown(hand);
    }

    if (node.kind === 'RFI') {
      if (actionId === 'fold') {
        return finish(hand, { reason: 'Te retiras antes del flop.', heroNet: -(hand.heroInvested || 0) });
      }
      hand.heroIsAggressor = true;
      const heroAdd = seatToCall(hand, hand.hero.pos, node.openSize);
      if (heroAdd > 0) addInvest(hand, hand.hero.pos, heroAdd);
      hand.heroInvested = node.openSize;
      setHeroAct(hand, 'open', node.openSize);
      setPreflopSeatBet(hand, hand.hero.pos, node.openSize);
      recalcPot(hand);

      const res = resolveBlindsAfterHeroOpen(hand, node.openSize);
      if (res.type === 'allFold') {
        return finish(hand, {
          reason: 'Todos se retiran. Te llevas el bote.',
          heroNet: round2(hand.potBB - node.openSize)
        });
      }
      if (res.type === 'face3bet') return setupFace3Bet(hand, res.size);
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
        addInvest(hand, hero, node.toCallBB);
        hand.potBB = round2(node.openSize * 2 + (hero === 'BB' ? 0 : SB) + (['SB', 'BB'].includes(hero) ? 0 : 0) + (opener === 'SB' ? 0 : 0));
        hand.potBB = round2(node.openSize * 2 + SB); // ciega muerta aprox
        hand.heroInPosition = inPos(hero, opener);
        resolvePendingAfterHero(hand);
        return goFlop(hand);
      }
      // 3-bet
      hand.heroIsAggressor = true;
      hand.heroInvested = node.threeBetSize;
      setHeroAct(hand, 'raise', node.threeBetSize);
      resolvePendingAfterHero(hand);
      let cont = openerVs3Bet(hand, opener, node.threeBetSize);
      if (cont === 'fold') {
        setVillainAct(hand, 'fold');
        return finish(hand, { reason: `${opener} foldea ante tu 3-bet.`, heroNet: round2(hand.potBB) });
      }
      if (cont === '4bet') {
        forceValidOpenerFourBetHand(hand, opener);
        const openerCode = seatHoleCode(hand, opener);
        if (!openerCode || !VPF || !VPF.isInFourBetRange(openerCode, rangeCtx(hand))) {
          cont = 'call';
        }
      }
      if (cont === '4bet') {
        const fbSize = round2(node.threeBetSize * 2.3);
        hand.villainInvested = fbSize;
        hand.potBB = round2(node.threeBetSize + fbSize + SB);
        hand.villain.rangeStr = VPF ? VPF.rangeStrFor4Bet(rangeCtx(hand)) : R.VS_3BET.fourBet;
        setVillainAct(hand, 'raise', fbSize);
        return setupFace4Bet(hand, fbSize);
      }
      hand.villain.rangeStr = VPF ? VPF.rangeStrForCall3Bet(rangeCtx(hand)) : (R.VS_3BET.call + ', ' + R.VS_3BET.callMix);
      // villano iguala el 3bet -> flop en bote resubido, hero agresor
      setVillainAct(hand, 'call', node.threeBetSize);
      hand.villainInvested = node.threeBetSize;
      hand.potBB = round2(node.threeBetSize * 2 + SB);
      hand.heroInPosition = inPos(hero, opener);
      return goFlop(hand);
    }

    if (node.kind === 'cold4bet') {
      const s = hand.scenario;
      const opener = s.openerPos || 'UTG';
      const tb = s.threeBettorPos || hand.villain.pos;
      const hero = hand.hero.pos;
      const heroBlind = hand.heroInvested || 0;

      if (actionId === 'fold') {
        return finish(hand, { reason: 'Te retiras ante el 3-bet.', heroNet: -round2(heroBlind) });
      }

      hand.villain.cards = villainHoleCards(hand);

      if (actionId === 'call') {
        setHeroAct(hand, 'call', node.toCallBB);
        hand.heroIsAggressor = false;
        hand.heroInvested = round2(hand.heroInvested + node.toCallBB);
        addInvest(hand, hero, node.toCallBB);
        hand.potBB = round2(hand.potBB + node.toCallBB);
        hand.heroInPosition = inPos(hero, tb);
        markFolded(hand, opener);
        return goFlop(hand);
      }

      hand.heroIsAggressor = true;
      const cold4 = node.cold4Size;
      const cold4Add = capBetForSeat(hand, hero, cold4 - hand.heroInvested);
      hand.heroInvested = round2(hand.heroInvested + cold4Add);
      addInvest(hand, hero, cold4Add);
      setHeroAct(hand, cold4Add >= heroRemainingBB(hand) - 0.01 ? 'allin' : 'raise', cold4);

      const tbCode = seatHoleCode(hand, tb);
      const tbProf = profileFor(hand, tb);
      let tbAct = 'fold';
      if (VPF && tbCode) {
        tbAct = VPF.villainVs4BetAction(tbCode, tbProf, C.rng.random());
      } else {
        tbAct = C.rng.random() < 0.58 ? 'fold' : 'call';
      }

      markFolded(hand, opener);

      if (tbAct === 'fold') {
        setVillainAct(hand, 'fold');
        recalcPot(hand);
        return finish(hand, {
          reason: tb + ' foldea ante tu cold 4-bet.',
          heroNet: round2(hand.potBB + cold4Add - heroBlind)
        });
      }

      const tbAdd = capBetForSeat(hand, tb, cold4 - (hand.table.invested[tb] || 0));
      setVillainAct(hand, 'call', cold4);
      hand.villainInvested = round2((hand.villainInvested || 0) + tbAdd);
      if (tbAdd > 0) addInvest(hand, tb, tbAdd);
      hand.potBB = round2(hand.potBB + cold4Add + tbAdd);
      hand.heroInPosition = inPos(hero, tb);
      return goFlop(hand);
    }

    if (node.kind === 'bbVsSbLimp') {
      if (actionId === 'call') {
        setHeroAct(hand, 'check');
        hand.heroIsAggressor = false;
        hand.heroInPosition = true;
        return goFlop(hand);
      }
      hand.heroIsAggressor = true;
      hand.heroInvested = node.isoSize;
      addInvest(hand, hand.hero.pos, node.isoSize - (hand.heroInvested || 0));
      setHeroAct(hand, 'raise', node.isoSize);
      hand.villain.cards = villainHoleCards(hand);
      if (limperDefendVsIso(hand, hand.villain.pos, node.isoSize) === 'fold') {
        setVillainAct(hand, 'fold');
        return finish(hand, { reason: 'SB foldea ante tu iso-raise.', heroNet: round2(hand.potBB) });
      }
      setVillainAct(hand, 'call', node.isoSize);
      hand.villainInvested = node.isoSize;
      hand.potBB = round2(node.isoSize * 2 + SB);
      hand.heroInPosition = true;
      return goFlop(hand);
    }

    if (node.kind === 'sbLimp') {
      if (actionId === 'fold') {
        return finish(hand, { reason: 'Te retiras.', heroNet: -(hand.heroInvested || 0) });
      }
      if (actionId === 'call') {
        setHeroAct(hand, 'call', node.toCallBB);
        hand.heroInvested = BBET;
        addInvest(hand, 'SB', node.toCallBB);
        hand.villainInvested = BBET;
        hand.potBB = round2(SB + BBET + BBET);
        hand.heroIsAggressor = false;
        hand.heroInPosition = false;
        return goFlop(hand);
      }
      hand.heroIsAggressor = true;
      hand.heroInvested = node.openSize;
      addInvest(hand, 'SB', node.openSize - SB);
      setHeroAct(hand, 'open', node.openSize);
      const res = resolveBlindsAfterHeroOpen(hand, node.openSize);
      if (res.type === 'allFold') {
        return finish(hand, { reason: 'BB foldea. Te llevas el bote.', heroNet: round2(hand.potBB - node.openSize) });
      }
      if (res.type === 'face3bet') return setupFace3Bet(hand, res.size);
      return goFlop(hand);
    }
  }

  function setupFace3betInitial(hand) {
    const pk = parseFace3betKey(hand.scenario.key);
    const opener = pk.opener;
    const tb = pk.threeBettor;
    hand.hero.pos = opener;
    hand.villain.pos = tb;
    ensureOpenerOpenHand(hand, opener);
    hand.villain.rangeStr = hand._predeal.villainRange || bb3betRange(opener, hand);
    initVillainTracker(hand);
    const openSize = opener === 'SB' ? SB_OPEN : OPEN;
    const threeBetSize = inPos(tb, opener) ? round2(openSize * 3) : round2(openSize * 4);
    hand.heroInvested = openSize;
    hand.villainInvested = threeBetSize;
    hand.potBB = round2(openSize + threeBetSize + SB);
    hand.heroIsAggressor = true;
    setVillainAct(hand, 'raise', threeBetSize);
    addInvest(hand, opener, openSize);
    addInvest(hand, tb, threeBetSize);
    setPreflopSeatBet(hand, opener, openSize);
    setPreflopSeatBet(hand, tb, threeBetSize);
    setSeatAction(hand, opener, 'open', openSize);
    setSeatAction(hand, tb, 'raise', threeBetSize);
    markPreflopFoldsForFacingAction(hand, opener, [tb]);
    setupFace3Bet(hand, threeBetSize);
  }

  function setupBbVsSbLimp(hand) {
    hand.hero.pos = 'BB';
    hand.villain.pos = 'SB';
    ensureLimperHand(hand, 'SB');
    hand.villain.rangeStr = LIMP_RANGE;
    initVillainTracker(hand);
    hand.potBB = round2(SB + BBET + BBET);
    hand.heroInvested = BBET;
    hand.villainInvested = BBET;
    hand.toCallBB = 0;
    const isoSize = round2(BBET * 3.5 + BBET);
    hand.isoSize = isoSize;
    const freqs = strategyForNode(hand, { street: 'preflop', kind: 'bbVsSbLimp', potBB: hand.potBB, toCallBB: 0 });
    hand.current = {
      street: 'preflop', kind: 'bbVsSbLimp', potBB: hand.potBB, toCallBB: 0,
      isoSize,
      options: [
        { id: 'call', label: 'Check (ver flop gratis)' },
        { id: 'raise', label: 'Iso-raise a ' + isoSize + 'bb' }
      ],
      gto: freqs,
      context: 'Eres BB. SB limpea. ¿Check o iso-raise?'
    };
    setVillainAct(hand, 'check', null);
    addInvest(hand, 'SB', BBET);
    markPreflopFoldsForFacingAction(hand, 'SB');
  }

  function setupSbLimp(hand) {
    hand.hero.pos = 'SB';
    hand.villain.pos = 'BB';
    hand.potBB = round2(SB + BBET);
    hand.heroInvested = SB;
    hand.toCallBB = round2(BBET - SB);
    const openSize = SB_OPEN;
    const freqs = strategyForNode(hand, { street: 'preflop', kind: 'sbLimp', potBB: hand.potBB, toCallBB: hand.toCallBB });
    hand.current = {
      street: 'preflop', kind: 'sbLimp', potBB: hand.potBB, toCallBB: hand.toCallBB,
      openSize,
      options: [
        { id: 'fold', label: 'Fold' },
        { id: 'call', label: 'Limp (call ' + hand.toCallBB + 'bb)' },
        { id: 'raise', label: 'Raise a ' + openSize + 'bb' }
      ],
      gto: freqs,
      context: 'Eres SB con acción folded to you. ¿Fold, limp o raise?'
    };
    markPreflopFoldsBeforeHeroRFI(hand);
  }

  function setupCold4betInitial(hand) {
    const s = hand.scenario;
    const hero = s.heroPos || 'CO';
    const opener = s.openerPos || 'UTG';
    const tb = s.threeBettorPos || 'HJ';
    hand.hero.pos = hero;
    hand.villain.pos = tb;
    ensureOpenerOpenHand(hand, opener);
    ensureThreeBetHand(hand, tb, opener);
    hand.villain.rangeStr = threeBetRangeStr(tb, opener, hand);
    initVillainTracker(hand);
    const openSize = opener === 'SB' ? SB_OPEN : OPEN;
    const threeBetSize = inPos(tb, opener) ? round2(openSize * 3) : round2(openSize * 4);
    const cold4Size = round2(threeBetSize * 2.3);
    const heroBlind = hero === 'SB' ? SB : (hero === 'BB' ? BBET : 0);
    hand.heroInvested = heroBlind;
    hand.villainInvested = threeBetSize;
    hand.potBB = round2(openSize + threeBetSize + SB + BBET);
    hand.toCallBB = round2(threeBetSize - heroBlind);
    setSeatAction(hand, opener, 'open', openSize);
    setSeatAction(hand, tb, 'raise', threeBetSize);
    addInvest(hand, opener, openSize);
    addInvest(hand, tb, threeBetSize);
    setPreflopSeatBet(hand, opener, openSize);
    setPreflopSeatBet(hand, tb, threeBetSize);
    setVillainAct(hand, 'raise', threeBetSize);
    markPreflopFoldsForFacingAction(hand, opener, [tb]);
    const freqs = strategyForNode(hand, { street: 'preflop', kind: 'cold4bet', potBB: hand.potBB, toCallBB: hand.toCallBB });
    hand.current = {
      street: 'preflop', kind: 'cold4bet', potBB: hand.potBB, toCallBB: hand.toCallBB,
      cold4Size,
      options: [
        { id: 'fold', label: 'Fold' },
        { id: 'call', label: 'Call (igualar ' + hand.toCallBB + 'bb)' },
        { id: 'raise', label: 'Cold 4-bet a ' + cold4Size + 'bb' }
      ],
      gto: freqs,
      context: opener + ' abre, ' + tb + ' 3-betea. Eres ' + hero + ' en frío. ¿Fold, call o cold 4-bet?'
    };
  }

  function setupFace4betInitial(hand) {
    const { hero, opener } = parseVsKey(hand.scenario.key);
    hand.hero.pos = hero;
    hand.villain.pos = opener;
    forceValidOpenerFourBetHand(hand, opener);
    hand.villain.rangeStr = global.PTPlayConfig
      ? global.PTPlayConfig.face4betVillainRangeStr(hand.playConfig)
      : R.VS_3BET.fourBet;
    initVillainTracker(hand);
    const openSize = opener === 'SB' ? SB_OPEN : OPEN;
    const threeBetSize = inPos(hero, opener) ? round2(openSize * 3) : round2(openSize * 4);
    const fourBetSize = round2(threeBetSize * 2.3);
    const heroBlind = hero === 'SB' ? SB : (hero === 'BB' ? BBET : 0);
    hand.heroInvested = threeBetSize;
    hand.villainInvested = fourBetSize;
    hand.potBB = round2(threeBetSize + fourBetSize + SB);
    hand.heroIsAggressor = true;
    setVillainAct(hand, 'raise', fourBetSize);
    addInvest(hand, opener, fourBetSize);
    setPreflopSeatBet(hand, opener, fourBetSize);
    setSeatAction(hand, hero, 'raise', threeBetSize);
    markPreflopFoldsForFacingAction(hand, opener);
    setupFace4Bet(hand, fourBetSize);
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
      context: `${hand.villain.pos} te hace 3-bet a ${tbSize}bb. ¿Fold, call o 4-bet?`,
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

  function bb3betRange(heroPos, hand) {
    const RR = global.GTORangesRegistry;
    const ctx = hand ? rangeCtx(hand) : null;
    const key = RR && ctx ? RR.vsRfiKey('BB', heroPos, ctx) : 'BB_vs_' + heroPos;
    const d = RR && ctx ? RR.getVsRfiRow('BB', heroPos, ctx) : R.VS_RFI[key];
    if (d) return d.threeBet + ', ' + d.threeBetMix;
    return 'QQ+, AKs, AKo, A5s';
  }
  function bbCallRange(heroPos, hand) {
    const RR = global.GTORangesRegistry;
    const ctx = hand ? rangeCtx(hand) : null;
    const key = RR && ctx ? RR.vsRfiKey('BB', heroPos, ctx) : 'BB_vs_' + heroPos;
    const d = RR && ctx ? RR.getVsRfiRow('BB', heroPos, ctx) : R.VS_RFI[key];
    if (d) return d.call;
    return '22-JJ, A2s-AJs, K9s+, Q9s+, JTs, T9s, 98s, 87s, KQo, QJo';
  }
  function rfiDefendRange(heroPos, hand) {
    return bbCallRange(heroPos, hand) + ', ' + bb3betRange(heroPos, hand);
  }

  function openerContinueVs3Bet(hand, opener, threeBetSize) {
    return openerVs3Bet(hand, opener, threeBetSize);
  }

  function allInShowdown(hand) {
    const heroSeat = hand.displayHeroPos || hand.hero.pos;
    const vSeat = villainTableSeat(hand) || hand.villain.pos;
    const heroAll = ST() && hand.stacks ? ST().remaining(hand, heroSeat) + (hand.heroInvested || 0) : EFF;
    const villAll = ST() && hand.stacks ? ST().remaining(hand, vSeat) + (hand.villainInvested || 0) : EFF;
    const eff = round2(Math.min(heroAll, villAll));
    hand.heroInvested = eff; hand.villainInvested = eff;
    hand.potBB = round2(eff * 2 + SB);
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
    if (type === 'fold' && hand.villain.pos) markFolded(hand, villainTableSeat(hand) || hand.villain.pos);
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
  function clearStreetActions(hand) {
    hand.heroAction = null;
    hand.villainAction = null;
    hand.seatActions = {};
  }

  /** Decisión del villano cuando es el primero en actuar en una calle (lead o check). */
  function villainStreetOpen(hand) {
    const profile = profileFor(hand, hand.villain.pos);
    const info = classifyMadeHand(hand.villain.cards, hand.board);
    const eq = villainEquity01(hand);
    const strength = villainPostflopStrength(info, eq);
    const villainIsAgg = !hand.heroIsAggressor;
    const pfOpts = villainPostflopOpts(hand, info);
    if (VP) return VP.postflopLead(strength, profile, villainIsAgg, C.rng.random(), pfOpts);
    const betFreq = villainIsAgg
      ? clamp(0.12 + strength * 0.55, 0.08, 0.68)
      : clamp(0.04 + strength * 0.28, 0.03, 0.38);
    return C.rng.random() < betFreq ? 'bet' : 'check';
  }

  // ----- Transición a flop / showdown (usa el board pre-repartido) -----
  function goFlop(hand) {
    const vSeat = villainTableSeat(hand) || hand.villain.pos;
    if (hand._callersAtFlop && hand._callersAtFlop.length) {
      // El pagador del squeeze puede pasar a ser el villano si el abridor foldea; no marcarlo fold.
      hand._callersAtFlop.forEach(function (pos) {
        if (pos !== vSeat) markFolded(hand, pos);
      });
      delete hand._callersAtFlop;
    }
    syncTableToActivePot(hand);
    syncVillainMeta(hand);
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
        const vBet = villainBetAmount(hand);
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

  function postflopRaiseLabel(hand, node) {
    const raw = round2(node.toCallBB * 3);
    const capped = capBetForSeat(hand, hand.hero.pos, raw);
    const fmt = global.GTOPotMath ? global.GTOPotMath.formatBB : (x) => String(round2(x));
    if (ST() && hand.stacks && capped >= heroRemainingBB(hand) - 0.01) {
      return `All-in (${fmt(heroRemainingBB(hand))}bb)`;
    }
    return `Raise a ${fmt(capped)}bb`;
  }

  function buildPostflopNode(hand, street, facing) {
    const info = classifyMadeHand(hand.hero.cards, hand.board);
    const texture = boardTexture(hand.board);
    const baseRange = hand.villain.rangeStr || GTO.Ranges.data.BROAD_CONTINUE;
    const villainLastAction = (facing && facing.bet) ? 'bet' : (hand.villainAction ? hand.villainAction.type : null);
    const toCallBB = facing && facing.bet ? facing.bet : 0;
    const potBeforeBB = facing && facing.bet
      ? round2(facing.potBefore != null ? facing.potBefore : Math.max(hand.potBB - toCallBB, 0.1))
      : round2(hand.potBB);
    const villainRange = (VT && VT.estimateActiveRange)
      ? VT.estimateActiveRange({
        baseRange,
        street,
        lastAction: villainLastAction || 'check',
        betBB: toCallBB,
        potBeforeBB,
        board: hand.board,
        tags: []
      })
      : baseRange;
    const heroEquity = GTO.computeHeroEquity
      ? GTO.computeHeroEquity({
        street, board: hand.board.slice(), heroCards: hand.hero.cards,
        villainRange, potBB: hand.potBB, toCallBB, potBeforeBB,
        villainLastAction, madeHandInfo: info,
        initiative: hand.heroIsAggressor ? 'aggressor' : 'caller',
        inPosition: hand.heroInPosition
      })
      : equityVsRange(hand.hero.cards, hand.board, villainRange, 400, {
        street, facingBet: !!toCallBB
      });

    let options, heroLastAction = null, context;
    const fmt = global.GTOPotMath ? global.GTOPotMath.formatBB : (x) => String(round2(x));
    if (facing && facing.bet) {
      // hero afronta una apuesta del villano
      const raiseAmt = capBetForSeat(hand, hand.hero.pos, round2(facing.bet * 3));
      options = [
        { id: 'fold', label: 'Fold' },
        { id: 'call', label: `Call (${fmt(Math.min(facing.bet, heroRemainingBB(hand)))}bb)` },
        { id: 'raise', label: postflopRaiseLabel(hand, { toCallBB: facing.bet, potBB: hand.potBB }) }
      ];
      context = `${capitalize(street)}: el villano apuesta ${fmt(facing.bet)}bb en un bote de ${fmt(facing.potBefore)}bb. Stack efectivo ${fmt(effStackForHand(hand))}bb.`;
    } else {
      const sizes = GTO.Strategy.betSizingOptions(hand.potBB, texture.wet);
      options = [{ id: 'check', label: 'Check (pasar)' }];
      hand._betSizes = {};
      sizes.forEach(function (s) {
        const capped = capBetForSeat(hand, hand.hero.pos, s.size);
        if (capped >= 0.5) {
          const id = s.id;
          options.push({ id: id, label: capped >= heroRemainingBB(hand) - 0.01 ? `All-in (${fmt(capped)}bb)` : s.label.replace(String(s.size), String(capped)) });
          hand._betSizes[id] = capped;
        }
      });
      context = `${capitalize(street)}: bote ${fmt(hand.potBB)}bb · stack ${fmt(effStackForHand(hand))}bb. Eres ${hand.heroIsAggressor ? 'el agresor' : 'el que cierra'} ${hand.heroInPosition ? 'en posición' : 'fuera de posición'}.`;
      if (hand.heroIsAggressor) {
        context += villainLastAction === 'check'
          ? ' El villano pasó: spot de c-bet.'
          : ' Spot de c-bet (eres el agresor preflop).';
      } else if (hand.heroInPosition && villainLastAction === 'check') {
        context += ' El villano pasó: spot de probe.';
      }
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
      let betSize = hand._betSizes && hand._betSizes[actionId] != null
        ? hand._betSizes[actionId]
        : hand._betSize;
      betSize = capBetForSeat(hand, hand.hero.pos, betSize);
      if (betSize <= 0) return finish(hand, { reason: 'Sin stack para apostar.', heroNet: -round2(hand.heroInvested) });
      hand.heroInvested += betSize; hand.potBB = round2(hand.potBB + betSize);
      if (hand.table && hand.hero.pos) addInvest(hand, hand.hero.pos, betSize);
      node.heroLastAction = 'bet';
      setHeroAct(hand, ST() && hand.stacks && betSize >= heroRemainingBB(hand) - 0.01 ? 'allin' : 'bet', betSize);
      const vAct = villainPostflopAction(hand, node);
      if (vAct === 'fold') { setVillainAct(hand, 'fold'); return finish(hand, { reason: `El villano foldea ante tu apuesta en ${node.street}.`, heroNet: round2(hand.potBB - betSize) }); }
      if (vAct === 'raise') {
        let vRaise = capBetForSeat(hand, hand.villain.pos, round2(betSize * 3));
        if (vRaise <= betSize) vRaise = capBetForSeat(hand, hand.villain.pos, heroRemainingBB(hand));
        hand.villainInvested += vRaise; hand.potBB = round2(hand.potBB + vRaise);
        if (hand.table && hand.villain.pos) addInvest(hand, hand.villain.pos, vRaise);
        setVillainAct(hand, 'raise', vRaise);
        return buildPostflopNode(hand, node.street, { bet: round2(vRaise), potBefore: hand.potBB });
      }
      setVillainAct(hand, 'call', betSize);
      hand.villainInvested += betSize; hand.potBB = round2(hand.potBB + betSize);
      if (hand.table && hand.villain.pos) addInvest(hand, hand.villain.pos, betSize);
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
      const vBet = villainBetAmount(hand);
      hand.villainInvested += vBet; hand.potBB = round2(hand.potBB + vBet);
      setVillainAct(hand, 'bet', vBet);
      return buildPostflopNode(hand, node.street, { bet: vBet, potBefore: round2(hand.potBB - vBet) });
    }

    if (actionId === 'call') {
      const heroRem = heroRemainingBB(hand);
      const toCall = Math.min(node.toCallBB, heroRem);
      const isAllIn = toCall >= heroRem - 0.01;
      hand.heroInvested += toCall; hand.potBB = round2(hand.potBB + toCall);
      if (hand.table && hand.hero.pos) addInvest(hand, hand.hero.pos, toCall);
      setHeroAct(hand, isAllIn ? 'allin' : 'call', toCall);
      if (isAllIn) return showdown(hand);
      return nextStreet(hand);
    }

    if (actionId === 'raise') {
      const heroRem = heroRemainingBB(hand);
      let raiseTo = capBetForSeat(hand, hand.hero.pos, round2(node.toCallBB * 3));
      if (raiseTo <= 0) raiseTo = heroRem;
      const isAllIn = raiseTo >= heroRem - 0.01;
      hand.heroInvested += raiseTo; hand.potBB = round2(hand.potBB + raiseTo);
      if (hand.table && hand.hero.pos) addInvest(hand, hand.hero.pos, raiseTo);
      node.heroLastAction = 'raise';
      setHeroAct(hand, isAllIn ? 'allin' : 'raise', raiseTo);
      if (isAllIn) {
        const vAct = villainPostflopAction(hand, node);
        if (vAct === 'fold') { setVillainAct(hand, 'fold'); return finish(hand, { reason: `El villano foldea ante tu all-in en ${node.street}.`, heroNet: round2(hand.potBB - raiseTo) }); }
        const vPay = capBetForSeat(hand, hand.villain.pos, raiseTo);
        setVillainAct(hand, 'call', vPay);
        hand.villainInvested += vPay;
        if (hand.table && hand.villain.pos) addInvest(hand, hand.villain.pos, vPay);
        return showdown(hand);
      }
      const vAct = villainPostflopAction(hand, node);
      if (vAct === 'fold') { setVillainAct(hand, 'fold'); return finish(hand, { reason: `El villano foldea ante tu raise en ${node.street}.`, heroNet: round2(hand.potBB - raiseTo) }); }
      const vCall = capBetForSeat(hand, hand.villain.pos, raiseTo);
      setVillainAct(hand, 'call', vCall);
      hand.villainInvested += vCall; hand.potBB = round2(hand.potBB + (vCall - node.toCallBB));
      if (hand.table && hand.villain.pos) addInvest(hand, hand.villain.pos, vCall);
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

  function erroneousEvLoss(hand) {
    return GTO.EvLoss.totalEvLossFromDecisions(hand.decisions);
  }

  function finish(hand, res) {
    syncTableToActivePot(hand);
    hand.stage = 'complete';
    hand.replaySnapshot = {
      scenario: Object.assign({}, hand.scenario || {}),
      seed: hand.seed,
      playConfig: hand.playConfig ? Object.assign({}, hand.playConfig) : null,
      displayHeroPos: hand.displayHeroPos || null
    };
    const totalEvLoss = erroneousEvLoss(hand);
    const errors = hand.decisions.filter((d) => d.class === 'error' || d.class === 'imprecisa');
    hand.current = null;
    hand.result = Object.assign({
      heroNet: 0, showdown: false, totalEvLoss,
      nErrors: errors.length,
      villainCards: hand.villain.cards,
      villainPos: hand.villain.pos,
      villainProfile: hand.villain.profileLabel,
      villainProfileShort: hand.villain.profileShort,
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

  function passiveDecision(node, actionId) {
    return {
      street: node.street,
      chosen: actionId,
      action: actionId,
      label: labelFor(node, actionId),
      class: 'aceptable',
      best: true,
      evLoss: 0,
      gto: node.gto
    };
  }

  function bestContinuePreflopAction(node) {
    const gto = node.gto || {};
    const opts = node.options || [];
    let best = null;
    let bestVal = -1;
    opts.forEach(function (o) {
      if (o.id === 'fold') return;
      let val = gto[o.id];
      if (val == null && o.id === 'raise') val = gto.raise || gto.open;
      if (val == null) val = 0;
      if (val > bestVal) { bestVal = val; best = o.id; }
    });
    return best;
  }

  function simulatePassiveStreet(hand) {
    let guard = 0;
    while (hand.current && !hand.result && guard++ < 16) {
      const node = hand.current;
      const st = node.street;
      if (node.toCallBB > 0) {
        advance(hand, 'call', passiveDecision(node, 'call'));
      } else if ((node.options || []).some(function (o) { return o.id === 'check'; })) {
        advance(hand, 'check', passiveDecision(node, 'check'));
      } else {
        break;
      }
      if (hand.result) return false;
      if (!hand.current || hand.current.street !== st) return true;
    }
    return !!hand.current && !hand.result;
  }

  function autoAdvancePreflop(hand) {
    while (hand.stage === 'preflop' && !hand.result && hand.current) {
      const action = bestContinuePreflopAction(hand.current);
      if (!action) return false;
      advance(hand, action, passiveDecision(hand.current, action));
    }
    return !hand.result && hand.stage !== 'preflop';
  }

  /** Avanza automáticamente hasta la calle objetivo (flop/turn/river) con línea pasiva. */
  function fastForwardToStreet(hand, target) {
    if (!hand || !target || target === 'random' || target === 'preflop') return hand;
    const order = ['preflop', 'flop', 'turn', 'river'];
    const ti = order.indexOf(target);
    if (ti < 0) return hand;
    if (!autoAdvancePreflop(hand)) return hand;
    if (hand.result) return hand;
    let guard = 0;
    while (order.indexOf(hand.stage) < ti && !hand.result && guard++ < 24) {
      if (!simulatePassiveStreet(hand)) break;
      if (hand.result || hand.stage === 'complete') break;
    }
    return hand;
  }

  /** Consejo en vivo: evalúa opciones sin aplicar la acción. */
  function previewAdvice(hand) {
    const node = hand && hand.current;
    if (!node || !global.GTO || !global.GTO.evaluateSpot) return null;
    const options = node.options || [];
    if (!options.length) return null;
    const availableActions = options.map((o) => o.id);
    const Classifier = global.GTOClassifier;
    const EvMath = global.GTOEvMath;

    const stratResult = GTO.evaluateSpot(buildSpotInput(hand, node, availableActions[0]));
    const strategy = stratResult.strategy;
    if (!strategy) return null;

    const cls = Classifier
      ? Classifier.classify(strategy, availableActions[0], availableActions)
      : { best: availableActions[0] };
    const bestId = cls.best;

    function evForAction(actionId) {
      const input = buildSpotInput(hand, node, actionId);
      const ctx = EvMath.buildActionContext(
        Object.assign({}, input, { chosenAction: actionId }),
        strategy
      );
      return EvMath.actionEVMath(actionId, ctx);
    }

    let maxEv = -Infinity;
    availableActions.forEach((a) => {
      const ev = evForAction(a);
      if (ev > maxEv) maxEv = ev;
    });
    const bestEV = EvMath.round2(maxEv);

    const optionEVs = options.map((o) => ({
      id: o.id,
      label: o.label,
      ev: evForAction(o.id),
      freq: strategy[o.id] || 0
    }));

    const recActionEV = evForAction(bestId);
    const recEval = GTO.evaluateSpot(buildSpotInput(hand, node, bestId));
    const recInput = buildSpotInput(hand, node, bestId);
    const recCtx = EvMath.buildActionContext(
      Object.assign({}, recInput, { chosenAction: bestId }),
      strategy
    );
    const mathParams = EvMath.mathParams(recCtx, {
      actionEV: recActionEV,
      bestEV: bestEV,
      deltaEV: EvMath.deltaEvLoss(bestEV, recActionEV)
    });

    return {
      street: node.street,
      context: node.context,
      potBB: node.potBB,
      toCallBB: node.toCallBB || 0,
      recommended: {
        actionId: bestId,
        label: labelFor(node, bestId),
        freq: strategy[bestId] || 0,
        ev: recActionEV,
        explanation: recEval.explanation || '',
        strategy: strategy,
        mathParams: mathParams
      },
      options: optionEVs
    };
  }

  global.Engine = {
    newHand, act, previewAdvice, syncTableInvested, fastForwardToStreet,
    // utilidades expuestas para UI/tests/importador
    handStrength01, equityVsRange, classifyMadeHand, sampleHandFromRange,
    rfiStrategy, vsRfiStrategy, classify,
    postflopStrategy, boardTexture, preflopEvLoss, postflopEvLoss, round2,
    buildMatrixInput
  };
})(window);
