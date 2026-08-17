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
  const MW = function () { return global.GTOMultiway; };
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

  /** Stack del héroe (no min vs villano): guía modo steal/push y charts de apertura. */
  function heroStackForMode(hand) {
    const stacks = ST();
    if (stacks && hand && hand.stacks) {
      const heroSeat = hand.displayHeroPos || (hand.hero && hand.hero.pos);
      if (heroSeat && hand.stacks[heroSeat] != null) {
        return round2(hand.stacks[heroSeat]);
      }
      if (hand.heroStackStart != null) return round2(hand.heroStackStart);
    }
    const PC = global.PTPlayConfig;
    if (hand && hand.playConfig && PC) return PC.stackBB(hand.playConfig);
    return effStackForHand(hand);
  }

  /** standard | steal | stealDefense | push — tamaños preflop según temática del spot. */
  function preflopSizingMode(hand) {
    const cfg = hand.playConfig || {};
    const s = hand.scenario || {};
    // Usar stack del héroe: un short random en la mesa no debe pasar steal 25bb → push.
    const stack = heroStackForMode(hand);
    const sc = cfg.scenario || 'rfi';
    const PF = global.GTOPushFold;
    if (sc === 'push' || cfg.resolvedPhase === 'push' || s.pushFold) {
      if (stack <= 14 || sc === 'push') return 'push';
    }
    if (PF && PF.isPushPhase(Object.assign({}, cfg, { stackBB: stack, effStack: stack })) && sc !== 'steal') {
      return 'push';
    }
    if (sc === 'steal' && stack >= 14 && stack <= 25) return 'steal';
    if (sc === '3bet' && stack >= 14 && stack <= 25 && (cfg.formatHub === 'spin' || cfg.formatHub === 'mtt')) {
      return 'stealDefense';
    }
    return 'standard';
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

  function villainRemainingBB(hand) {
    const stacks = ST();
    const vSeat = villainTableSeat(hand) || hand.villain.pos;
    if (stacks && hand.stacks && vSeat) return stacks.remaining(hand, vSeat);
    return round2(effStackForHand(hand) - (hand.villainInvested || 0));
  }

  /** Apuesta > 0; evita bucles cuando capToRemaining devuelve 0 (villano sin stack). */
  function isMeaningfulBet(amount) {
    return amount != null && amount > 0.01;
  }

  /** true si ya no hay acción de apuesta posible (alguien all-in / sin stack). */
  function noMoreBetting(hand) {
    return heroRemainingBB(hand) <= 0.01 || villainRemainingBB(hand) <= 0.01;
  }

  /**
   * All-in: reparte el board restante en pasos (runout) para que la UI anime calle a calle.
   * Si no quedan cartas, va directo a showdown.
   */
  function prepareAllInRunout(hand) {
    if (!hand.villain.cards) hand.villain.cards = villainHoleCards(hand);
    syncTableToActivePot(hand);
    hand.current = null;
    if (hand.board.length < 3 && hand._predeal && hand._predeal.board) {
      hand.board = hand._predeal.board.slice(0, 3);
      hand._boardIdx = 3;
      hand.stage = 'flop';
      resetStreetBets(hand);
    }
    hand.runoutQueue = [];
    var bi = Math.max(hand._boardIdx || 0, hand.board.length);
    var pre = (hand._predeal && hand._predeal.board) || [];
    while (hand.board.length + hand.runoutQueue.length < 5 && bi < pre.length) {
      hand.runoutQueue.push(pre[bi++]);
    }
    hand._boardIdx = bi;
    if (!hand.runoutQueue.length) {
      hand.runoutPending = false;
      return showdown(hand);
    }
    hand.runoutPending = true;
    return hand;
  }

  function advanceRunout(hand) {
    if (!hand || !hand.runoutPending) return showdown(hand);
    if (!hand.runoutQueue || !hand.runoutQueue.length) {
      hand.runoutPending = false;
      return showdown(hand);
    }
    hand.board.push(hand.runoutQueue.shift());
    if (hand.board.length === 4) hand.stage = 'turn';
    if (hand.board.length >= 5) hand.stage = 'river';
    if (!hand.runoutQueue.length) {
      hand.runoutPending = false;
      return showdown(hand);
    }
    return hand;
  }

  function initHandStacks(hand) {
    const stacks = ST();
    const PC = global.PTPlayConfig;
    if (!stacks || !hand) return;
    const heroBB = hand.playConfig && PC ? PC.stackBB(hand.playConfig) : EFF;
    const positions = PC && hand.playConfig && PC.tablePositions
      ? PC.tablePositions(hand.playConfig)
      : (is9MaxHand(hand) && PC ? PC.POS_9 : DEAL_ORDER);
    const heroSeat = hand.displayHeroPos || hand.hero.pos;
    stacks.initHandStacks(hand, positions, heroSeat, heroBB, function () { return C.rng.random(); }, hand.playConfig);
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

  function isValidPair(cards) {
    return !!(cards && cards.length === 2 && cards[0] && cards[1] && cards[0] !== cards[1]);
  }

  function cloneForceDeal(fd) {
    if (!fd) return null;
    return {
      heroCards: isValidPair(fd.heroCards) ? fd.heroCards.slice() : null,
      villainCards: isValidPair(fd.villainCards) ? fd.villainCards.slice() : null,
      board: (fd.board || []).filter(Boolean).slice(0, 5),
      villainPos: fd.villainPos || null
    };
  }

  function cloneForceScript(fs) {
    if (!fs || !Array.isArray(fs.actions)) return null;
    return {
      heroPos: fs.heroPos || null,
      villainPos: fs.villainPos || null,
      actions: fs.actions.map(function (a) {
        return {
          street: a.street || null,
          pos: a.pos,
          action: a.action,
          amountBB: a.amountBB != null ? a.amountBB : null
        };
      })
    };
  }

  function markForcedSeat(hand, seat, cards) {
    if (!seat || !isValidPair(cards)) return;
    hand._forcedHole = hand._forcedHole || {};
    hand._forcedHole[seat] = cards.slice();
  }

  function isForcedSeat(hand, pos) {
    if (!hand || !hand._forcedHole || !pos) return false;
    if (hand._forcedHole[pos]) return true;
    const seat = tableSeatForEnginePos(hand, pos);
    return !!(seat && hand._forcedHole[seat]);
  }

  /**
   * Inyecta cartas fijas (héroe, villano y comunitarias) manteniendo el resto de
   * la mano coherente. Usado al "jugar en el entrenador" una mano de análisis:
   * las cartas se bloquean (no se remuestrean) y el villano sigue la línea real
   * hasta que el héroe se desvíe.
   */
  function applyForcedHand(hand, fd) {
    if (!fd || !hand.table || !hand.table.holeCards) return;
    const heroCards = isValidPair(fd.heroCards) ? fd.heroCards.slice() : null;
    const villainCards = isValidPair(fd.villainCards) ? fd.villainCards.slice() : null;
    const board = (fd.board || []).filter(Boolean).slice(0, 5);
    const heroSeat = heroTableSeat(hand);
    const vSeat = fd.villainPos
      || villainTableSeat(hand)
      || (hand._predeal && hand._predeal.villainPos)
      || (hand.villain && hand.villain.pos);
    if (vSeat && hand.villain) hand.villain.pos = vSeat;
    if (vSeat && hand._predeal) hand._predeal.villainPos = vSeat;
    const hc = hand.table.holeCards;
    const forcedDead = [].concat(heroCards || [], villainCards || [], board);
    const kept = [];
    const redeal = [];
    Object.keys(hc).forEach(function (pos) {
      if (pos === heroSeat && heroCards) return;
      if (pos === vSeat && villainCards) return;
      const cur = hc[pos];
      if (cur && cur.length === 2 && !cur.some(function (c) { return forcedDead.indexOf(c) >= 0; })) {
        kept.push(cur[0], cur[1]);
      } else {
        redeal.push(pos);
      }
    });
    const deck = C.shuffledDeckExcluding(forcedDead.concat(kept));
    redeal.forEach(function (pos) {
      if (deck.length >= 2) hc[pos] = [deck.pop(), deck.pop()];
    });
    if (heroCards) {
      hc[heroSeat] = heroCards.slice();
      hand.hero.cards = heroCards.slice();
      hand.hero.code = R.handCode(heroCards[0], heroCards[1]);
      markForcedSeat(hand, heroSeat, heroCards);
    }
    if (villainCards && vSeat) {
      hc[vSeat] = villainCards.slice();
      if (hand.villain) {
        hand.villain.cards = villainCards.slice();
        if (!hand.villain.pos) hand.villain.pos = vSeat;
      }
      if (hand._predeal) hand._predeal.villainCards = villainCards.slice();
      markForcedSeat(hand, vSeat, villainCards);
    }
    if (board.length) {
      let full = board.slice();
      while (full.length < 5 && deck.length) full.push(deck.pop());
      hand._predeal.board = full;
    }
  }

  // ----- Guion de la mano real (análisis → entrenador) -----
  function scriptNormAction(action) {
    if (!action) return '';
    const a = String(action);
    if (a.indexOf('bet_') === 0 || a === 'bet') return 'bet';
    if (a === 'open' || a === 'allin' || a === '3bet' || a === '4bet') return 'raise';
    return a;
  }

  function scriptActions(hand) {
    return (hand.forceScript && hand.forceScript.actions) || [];
  }

  function scriptActive(hand) {
    return !!(hand && hand._script && hand._script.active);
  }

  function scriptDeactivate(hand) {
    if (hand && hand._script) hand._script.active = false;
  }

  function initForceScript(hand, script) {
    const fs = cloneForceScript(script);
    if (!fs || !fs.actions.length) return;
    hand.forceScript = fs;
    hand._script = {
      active: true,
      idx: 0,
      heroPos: fs.heroPos || hand.hero.pos || null,
      villainPos: fs.villainPos || (hand.villain && hand.villain.pos) || null
    };
    // Las acciones previas al primer acto del héroe ya están aplicadas en el setup.
    scriptSkipUntilHero(hand);
  }

  function scriptSkipUntilHero(hand) {
    const s = hand._script;
    if (!s || !s.active || !s.heroPos) return;
    const acts = scriptActions(hand);
    while (s.idx < acts.length && acts[s.idx].pos !== s.heroPos) s.idx++;
  }

  function scriptFindNext(hand, pos, fromIdx) {
    const acts = scriptActions(hand);
    let i = fromIdx != null ? fromIdx : (hand._script ? hand._script.idx : 0);
    while (i < acts.length) {
      if (!pos || acts[i].pos === pos) return { action: acts[i], index: i };
      i++;
    }
    return null;
  }

  function scriptConsumeThrough(hand, index) {
    const s = hand._script;
    if (!s) return;
    if (index >= s.idx) s.idx = index + 1;
  }

  function scriptHeroExpected(hand) {
    if (!scriptActive(hand) || !hand._script.heroPos) return null;
    return scriptFindNext(hand, hand._script.heroPos, hand._script.idx);
  }

  function scriptConsumeHero(hand, actionId) {
    if (!scriptActive(hand)) return;
    const expected = scriptHeroExpected(hand);
    if (!expected) {
      if (!(hand.playConfig && hand.playConfig.guestTrap)) scriptDeactivate(hand);
      return;
    }
    if (scriptNormAction(expected.action.action) !== scriptNormAction(actionId)) {
      scriptDeactivate(hand);
      return;
    }
    scriptConsumeThrough(hand, expected.index);
  }

  /**
   * Próxima acción forzada del asiento `pos` en el guion, sin pasar por una
   * decisión del héroe. Si el héroe actúa antes en el guion, no hay forzado.
   */
  function scriptPeekSeatAction(hand, pos) {
    if (!scriptActive(hand) || !pos) return null;
    const s = hand._script;
    const acts = scriptActions(hand);
    let i = s.idx;
    while (i < acts.length) {
      const a = acts[i];
      if (a.pos === s.heroPos) return null;
      if (a.pos === pos) return { action: a, index: i };
      i++;
    }
    return null;
  }

  function scriptTakeSeatAction(hand, pos) {
    const peeked = scriptPeekSeatAction(hand, pos);
    if (!peeked) return null;
    scriptConsumeThrough(hand, peeked.index);
    return peeked.action;
  }

  /** Defensa preflop vs open: fold | call | 3bet */
  function scriptForcedDefend(hand, pos) {
    const a = scriptTakeSeatAction(hand, pos);
    if (!a) return null;
    const n = scriptNormAction(a.action);
    if (n === 'fold') return 'fold';
    if (n === 'raise' || n === 'bet') return '3bet';
    if (n === 'call' || n === 'check') return 'call';
    return null;
  }

  /** Respuesta del abridor a 3-bet: fold | call | 4bet */
  function scriptForcedVs3Bet(hand, pos) {
    const a = scriptTakeSeatAction(hand, pos);
    if (!a) return null;
    const n = scriptNormAction(a.action);
    if (n === 'fold') return 'fold';
    if (n === 'raise') return '4bet';
    if (n === 'call' || n === 'check') return 'call';
    return null;
  }

  /** Lead postflop: bet | check */
  function scriptForcedLead(hand) {
    const pos = (hand.villain && hand.villain.pos) || (hand._script && hand._script.villainPos);
    const peeked = scriptPeekSeatAction(hand, pos);
    if (!peeked) return null;
    if (peeked.action.street && hand.stage && peeked.action.street !== hand.stage) return null;
    scriptConsumeThrough(hand, peeked.index);
    const n = scriptNormAction(peeked.action.action);
    if (n === 'bet' || n === 'raise') return { type: 'bet', amountBB: peeked.action.amountBB };
    if (n === 'check' || n === 'call' || n === 'fold') return { type: 'check' };
    return null;
  }

  /** Respuesta postflop ante bet/raise/check del héroe */
  function scriptForcedPostflop(hand, node) {
    const pos = (hand.villain && hand.villain.pos) || (hand._script && hand._script.villainPos);
    const peeked = scriptPeekSeatAction(hand, pos);
    const facing = node && (node.heroLastAction === 'bet' || node.heroLastAction === 'raise');
    if (!peeked || (peeked.action.street && hand.stage && peeked.action.street !== hand.stage)) {
      if (facing && guestNeverFoldVillain(hand)) return 'call';
      return null;
    }
    scriptConsumeThrough(hand, peeked.index);
    hand._scriptedVillainAmountBB = peeked.action.amountBB;
    const n = scriptNormAction(peeked.action.action);
    if (facing) {
      if (n === 'fold') return 'fold';
      if (n === 'raise') return 'raise';
      if (n === 'call' || n === 'check') return 'call';
      if (n === 'bet') return 'raise';
      return null;
    }
    if (n === 'bet' || n === 'raise') return 'bet';
    if (n === 'check' || n === 'call' || n === 'fold') return 'check';
    return null;
  }

  function guestNeverFoldVillain(hand) {
    return !!(hand && hand.playConfig && hand.playConfig.guestTrap && hand.playConfig.guestNeverFold);
  }

  function scriptBetAmount(hand, amountBB) {
    if (amountBB != null && amountBB > 0) {
      const vSeat = villainTableSeat(hand) || hand.villain.pos;
      return capBetForSeat(hand, vSeat, round2(amountBB));
    }
    return villainBetAmount(hand);
  }

  function takeScriptedOrDefaultBet(hand, fallback) {
    const amt = hand._scriptedVillainAmountBB;
    hand._scriptedVillainAmountBB = null;
    if (amt != null && amt > 0) return scriptBetAmount(hand, amt);
    return fallback != null ? fallback : villainBetAmount(hand);
  }

  /** fold | call ante 4-bet / all-in (guion). */
  function scriptForcedVs4Bet(hand, pos) {
    const a = scriptTakeSeatAction(hand, pos);
    if (!a) return null;
    const n = scriptNormAction(a.action);
    if (n === 'fold') return 'fold';
    if (n === 'call' || n === 'raise' || n === 'check' || n === 'bet') return 'call';
    return null;
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

  /** Foldea (y registra) a quien queda por hablar tras un raise, hasta closerPos (wrap UTG). */
  function foldSeatsAfterRaiseUntil(hand, fromPos, closerPos, except) {
    if (!hand || !hand.table || !fromPos || !closerPos) return;
    const order = actionOrderForHand(hand);
    const skip = {};
    (except || []).forEach(function (p) { if (p) skip[p] = true; });
    skip[fromPos] = true;
    skip[closerPos] = true;
    const a = order.indexOf(fromPos);
    if (a < 0) return;
    for (let i = 1; i < order.length; i++) {
      const pos = order[(a + i) % order.length];
      if (pos === closerPos) break;
      if (skip[pos]) continue;
      if (hand.table.folded && hand.table.folded[pos]) continue;
      markFolded(hand, pos);
      setSeatAction(hand, pos, 'fold', null);
    }
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
    const level = (hand.playConfig && hand.playConfig.villainLevel) || 'pro';
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
    if (hand.multiway && MW() && MW().allowMultiway(hand)) {
      MW().syncTableToMultiwayPot(hand, hand._callersAtFlop || []);
      return;
    }
    const heroSeat = heroTableSeat(hand);
    const vSeat = villainTableSeat(hand);
    const alive = new Set([heroSeat]);
    if (vSeat && !hand.table.folded[vSeat]) alive.add(vSeat);
    tablePositionsForHand(hand).forEach(function (pos) {
      if (!alive.has(pos)) markFolded(hand, pos);
    });
  }

  function resolvePendingAfterHero(hand) {
    if (hand.multiway && MW() && MW().allowMultiway(hand)) {
      MW().syncTableToMultiwayPot(hand, hand._callersAtFlop || []);
      return;
    }
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
    const level = (hand.playConfig && hand.playConfig.villainLevel) || 'pro';
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
    const positions = tablePositionsForHand(hand);
    positions.forEach(function (pos) {
      pot += hand.table.invested[pos] || 0;
    });
    // Por si hay seats fuera del anillo canónico
    Object.keys(hand.table.invested || {}).forEach(function (pos) {
      if (positions.indexOf(pos) < 0) pot += hand.table.invested[pos] || 0;
    });
    hand.potBB = round2(pot);
  }

  /** Foldea a quien no participa en el bote multiway. */
  function foldSeatsExcept(hand, aliveList) {
    const alive = new Set(aliveList || []);
    tablePositionsForHand(hand).forEach(function (pos) {
      if (!alive.has(pos)) markFolded(hand, pos);
    });
  }

  /**
   * Asientos que aún deben hablar preflop después del héroe (p.ej. BB tras SB).
   * No se pueden marcar folded: actúan después de la decisión del héroe.
   */
  function seatsYetToActPreflop(hand, heroPos) {
    const order = preflopOrderForHand(hand);
    const heroIdx = order.indexOf(heroPos || (hand.hero && hand.hero.pos));
    if (heroIdx < 0) return [];
    const out = [];
    for (let i = heroIdx + 1; i < order.length; i++) out.push(order[i]);
    return out;
  }

  function withYetToActParticipants(hand, baseList, heroPos) {
    const out = (baseList || []).slice();
    seatsYetToActPreflop(hand, heroPos).forEach(function (p) {
      if (out.indexOf(p) < 0) out.push(p);
    });
    return out;
  }

  /**
   * Tras call del héroe ante open (multiway): seats posteriores (BB…) fold/call/3bet.
   */
  function resolveSeatsAfterHeroCallOpen(hand, openSize) {
    const responders = respondersAfterHero(hand);
    let threeBettor = null;
    let threeBetSize = 0;
    const callers = [];

    for (let ri = 0; ri < responders.length; ri++) {
      const pos = responders[ri];
      if (sessionStrict(hand)) ensureDefenderHand(hand, pos, hand.hero.pos);
      const act = scriptForcedDefend(hand, pos) || blindDefendVsOpen(hand, pos, openSize);
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
        ensureThreeBetHand(hand, threeBettor, hand.hero.pos);
        hand.villain.pos = threeBettor;
        hand.villain.cards = villainHoleCards(hand);
        hand.villain.rangeStr = bb3betRange(hand.hero.pos, hand);
        syncVillainMeta(hand);
        initVillainTracker(hand);
        hand.villainInvested = threeBetSize;
        setVillainAct(hand, 'raise', threeBetSize);
        foldSeatsAfterRaiseUntil(hand, threeBettor, hand.hero.pos, [hand.hero.pos, threeBettor]);
        return { type: 'face3bet', size: threeBetSize };
      }
      const addC = seatToCall(hand, pos, openSize);
      if (addC > 0) addInvest(hand, pos, addC);
      setPreflopSeatBet(hand, pos, openSize);
      setSeatAction(hand, pos, 'call', openSize);
      callers.push(pos);
    }
    return { type: 'continue', callers: callers };
  }

  /** Garantiza que cada caller pagó openSize y recalcula el bote. */
  function ensureCallersPaidOpen(hand, callers, openSize) {
    (callers || []).forEach(function (cPos) {
      if (!cPos || cPos === hand.hero.pos) return;
      if (hand.table.folded[cPos]) hand.table.folded[cPos] = false;
      hand.table.inHand.add(cPos);
      const add = seatToCall(hand, cPos, openSize);
      if (add > 0) addInvest(hand, cPos, add);
      if (!hand.table.streetBet || !hand.table.streetBet[cPos]) {
        setPreflopSeatBet(hand, cPos, openSize);
      }
      if (!hand.seatActions || !hand.seatActions[cPos]) {
        setSeatAction(hand, cPos, 'call', openSize);
      }
    });
    recalcPot(hand);
  }

  function blindDefendVsOpen(hand, pos, openSize) {
    const profile = profileFor(hand, pos);
    const code = seatHoleCode(hand, pos);
    if (VPF && code && hand.hero.pos) {
      return VPF.defendVsOpen(code, profile, C.rng.random(), pos, hand.hero.pos, rangeCtx(hand));
    }
    const level = (hand.playConfig && hand.playConfig.villainLevel) || 'pro';
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
    const order = preflopOrderForHand(hand);
    const heroSeat = heroTableSeat(hand) || (hand.hero && hand.hero.pos);
    const heroIdx = order.indexOf(heroSeat);
    const out = [];
    if (heroIdx < 0) return out;
    for (let i = heroIdx + 1; i < order.length; i++) {
      const pos = order[i];
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
    // Si el héroe ya metió all-in (push/fold shove), no existe 3-bet: solo fold/call.
    const heroAllIn = heroRemainingBB(hand) <= 0.01;

    for (let ri = 0; ri < responders.length; ri++) {
      const pos = responders[ri];
      if (sessionStrict(hand)) ensureDefenderHand(hand, pos, hand.hero.pos);
      let act = scriptForcedDefend(hand, pos);
      if (!act) {
        if (heroAllIn) {
          const profile = profileFor(hand, pos);
          const code = seatHoleCode(hand, pos);
          if (VPF && code) {
            act = VPF.villainVsAllInAction(code, profile, C.rng.random()) === 'fold' ? 'fold' : 'call';
          } else {
            const raw = blindDefendVsOpen(hand, pos, openSize);
            act = raw === 'fold' ? 'fold' : 'call';
          }
        } else {
          act = blindDefendVsOpen(hand, pos, openSize);
        }
      }
      // Forzar 3bet ante shove del héroe = call (no se puede resubir a alguien all-in).
      if (heroAllIn && act === '3bet') act = 'call';

      if (act === 'fold') {
        markFolded(hand, pos);
        setSeatAction(hand, pos, 'fold', null);
        continue;
      }
      if (act === '3bet' && !heroAllIn) {
        threeBetSize = round2(openSize * (pos === 'SB' ? 3.6 : 3.4));
        threeBettor = pos;
        setSeatAction(hand, pos, 'raise', threeBetSize);
        const add = seatToCall(hand, pos, threeBetSize);
        if (add > 0) addInvest(hand, pos, add);
        setPreflopSeatBet(hand, pos, threeBetSize);
        recalcPot(hand);
        break;
      }
      // Call (o call del shove): no invertir más que el stack del asiento.
      const payTo = (ST() && hand.stacks)
        ? ST().capTotalInvest(hand, pos, openSize)
        : openSize;
      const add = seatToCall(hand, pos, payTo);
      if (add > 0) addInvest(hand, pos, add);
      setPreflopSeatBet(hand, pos, payTo);
      const callerAllIn = ST() && hand.stacks && ST().remaining(hand, pos) <= 0.01;
      setSeatAction(hand, pos, callerAllIn ? 'allin' : 'call', payTo);
      callers.push(pos);
    }

    if (threeBettor && !heroAllIn) {
      ensureThreeBetHand(hand, threeBettor, hand.hero.pos);
      hand.villain.pos = threeBettor;
      hand.villain.cards = villainHoleCards(hand);
      hand.villain.rangeStr = bb3betRange(hand.hero.pos, hand);
      syncVillainMeta(hand);
      initVillainTracker(hand);
      hand.villainInvested = threeBetSize;
      recalcPot(hand);
      setVillainAct(hand, 'raise', threeBetSize);
      foldSeatsAfterRaiseUntil(hand, threeBettor, hand.hero.pos, [hand.hero.pos, threeBettor]);
      return { type: 'face3bet', size: threeBetSize };
    }

    if (!callers.length) return { type: 'allFold' };

    const villainPos = callers.indexOf('BB') >= 0 ? 'BB' : callers[callers.length - 1];
    hand.villain.pos = villainPos;
    hand.villain.cards = villainHoleCards(hand);
    hand.villain.rangeStr = bbCallRange(hand.hero.pos, hand);
    syncVillainMeta(hand);
    initVillainTracker(hand);
    hand.villainInvested = (hand.table && hand.table.invested[villainPos]) || openSize;
    hand.heroInvested = openSize;
    const extras = callers.filter(function (c) { return c !== villainPos; });
    hand._callersAtFlop = extras;
    if (MW() && MW().allowMultiway(hand) && callers.length >= 2) {
      const participants = [hand.hero.pos, villainPos].concat(extras);
      foldSeatsExcept(hand, participants);
      MW().markMultiwayHand(hand, callers.length >= 3 ? 'srp4way' : 'srp3way', extras);
      MW().syncTableToMultiwayPot(hand, extras);
    }
    recalcPot(hand);
    hand.heroInPosition = heroIpMultiway(hand);
    setVillainAct(hand, 'call', hand.villainInvested);
    return { type: 'goFlop' };
  }

  function heroIpMultiway(hand) {
    if (!MW() || !hand.multiway) {
      return hand.villain && hand.villain.pos ? inPos(hand.hero.pos, hand.villain.pos) : false;
    }
    const order = MW().postflopOrderFor(hand);
    const alive = MW().aliveSeats(hand);
    let last = null;
    order.forEach(function (p) {
      if (alive.indexOf(p) >= 0) last = p;
    });
    return last === hand.hero.pos;
  }

  function limperDefendVsIso(hand, limperPos, isoSize) {
    const forced = scriptForcedDefend(hand, limperPos);
    if (forced === 'fold' || forced === 'call') return forced;
    if (forced === '3bet') return 'call';
    const profile = profileFor(hand, limperPos);
    const code = seatHoleCode(hand, limperPos);
    if (VPF && code) {
      return VPF.limperVsIsoAction(code, profile, C.rng.random());
    }
    const level = (hand.playConfig && hand.playConfig.villainLevel) || 'pro';
    if (level === 'pro' || level === 'intermediate') return 'fold';
    const s = strengthAtPos(hand, limperPos);
    let callProb = clamp(0.18 + s * 0.62 - isoSize * 0.02, 0.12, 0.78);
    if (VP) callProb = VP.adjustCallProb(callProb, profile);
    return C.rng.random() < callProb ? 'call' : 'fold';
  }

  function sessionStrict(hand) {
    const level = (hand.playConfig && hand.playConfig.villainLevel) || 'pro';
    return level === 'pro' || level === 'intermediate';
  }

  function ensureSeatHand(hand, pos, validateFn, weightsFn) {
    if (isForcedSeat(hand, pos)) return;
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
    if (isForcedSeat(hand, pos)) return;
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
    if (isForcedSeat(hand, opener)) {
      hand.villain.cards = villainHoleCards(hand);
      return;
    }
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
    const forced = scriptForcedVs3Bet(hand, opener);
    if (forced) return forced;
    if (guestNeverFoldVillain(hand)) return 'call';
    const profile = profileFor(hand, opener);
    const code = seatHoleCode(hand, opener);
    if (VPF && code) {
      return VPF.openerVs3BetAction(code, profile, C.rng.random(), rangeCtx(hand));
    }
    const level = (hand.playConfig && hand.playConfig.villainLevel) || 'pro';
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
    const forced = scriptForcedVs3Bet(hand, opener);
    if (forced === 'fold' || forced === 'call') return forced;
    if (forced === '4bet') return 'call';
    const profile = profileFor(hand, opener);
    const code = seatHoleCode(hand, opener);
    if (VPF && code) {
      return VPF.openerVsSqueezeAction(code, profile, C.rng.random(), opener, rangeCtx(hand));
    }
    const level = (hand.playConfig && hand.playConfig.villainLevel) || 'pro';
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
    recordVisibleAction(hand, pos, type, amount);
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
      initiative: node.initiative, inPosition: node.inPosition, spr: node.spr,
      street: node.street, potBeforeBB: node.potBeforeBB, villainLastAction: node.villainLastAction
    });
  }

  /** True si el héroe ya bet/raise en una calle postflop anterior. */
  function heroLedOnPriorStreets(hand, street) {
    const prior = street === 'turn' ? ['flop']
      : (street === 'river' ? ['flop', 'turn'] : []);
    if (!prior.length) return false;
    return (hand.decisions || []).some((d) => {
      if (prior.indexOf(d.street) < 0) return false;
      const a = d.action || d.chosen || '';
      return a === 'bet' || a === 'raise' || (typeof a === 'string' && a.indexOf('bet_') === 0);
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

    let potBB = node.potBB;
    let potBeforeBB = node.toCallBB > 0 ? Math.max(node.potBB - node.toCallBB, 0.1) : node.potBB;
    const PC = global.PTPlayConfig;
    if (PC && hand.playConfig && hand.playConfig.rakeMode && hand.playConfig.rakeMode !== 'none') {
      potBB = PC.potAfterRakeBB(potBB, hand.playConfig);
      potBeforeBB = PC.potAfterRakeBB(potBeforeBB, hand.playConfig);
    }

    const isAgg = !!hand.heroIsAggressor;
    const priorAggressorBet = isAgg ? heroLedOnPriorStreets(hand, node.street) : false;
    const input = {
      spotKind, position: hand.hero.pos, vsPosition: hand.villain.pos,
      stackDepth: effStackForHand(hand), street: node.street,
      board: hand.board.slice(), heroCards: hand.hero.cards, handCode: hand.hero.code,
      potBB: potBB, toCallBB: facingBet(node) ? node.toCallBB : 0,
      potBeforeBB: potBeforeBB,
      initiative: isAgg ? 'aggressor' : 'caller',
      inPosition: hand.heroInPosition,
      priorAggressorBet,
      villainRange: villainRangeAtNode(hand, node),
      madeHandInfo: node.info,
      villainLastAction: hand.villainAction ? hand.villainAction.type : null,
      chosenAction: chosenAction,
      availableActions,
      betSizeBB: opt && opt.size != null ? opt.size : (chosenAction === 'raise' ? round2((node.toCallBB || 0) * 3) : 0)
    };
    if (hand.multiway || (MW() && MW().aliveCount(hand) >= 3)) {
      input.multiway = true;
      input.potType = hand.potType || 'srp3way';
      input.aliveCount = MW() ? MW().aliveCount(hand) : 3;
    }
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
    // Charts / modo: stack del héroe. Efectivo real (min vs villano) aparte para ICM/all-in.
    input.stackDepth = heroStackForMode(hand);
    input.effStack = effStackForHand(hand);
    input.heroRemainingBB = rem;
    input.spr = node.potBB > 0 ? rem / node.potBB : rem;
    const cfg = hand.playConfig || {};
    input.formatHub = cfg.formatHub || null;
    input.practiceIntent = cfg.practiceIntent || 'mixed';
    input.mttPhase = cfg.resolvedPhase || cfg.mttPhase || null;
    input.spinPayout = cfg.spinPayout || '2x';
    input.anteBB = cfg.anteBB || 0;
    input.preflopMode = preflopSizingMode(hand);
    input.pushFold = input.preflopMode === 'push';
    input.stealMode = input.preflopMode === 'steal' || input.preflopMode === 'stealDefense';
    const heroSeatForStack = hand.displayHeroPos || (hand.hero && hand.hero.pos);
    const villainSeatForStack = villainTableSeat(hand) || (hand.villain && hand.villain.pos);
    input.heroStackBB = (hand.stacks && heroSeatForStack && hand.stacks[heroSeatForStack] != null)
      ? hand.stacks[heroSeatForStack]
      : (hand.stacks && hand.stacks.hero != null ? hand.stacks.hero : input.effStack);
    input.villainStackBB = (hand.stacks && villainSeatForStack && hand.stacks[villainSeatForStack] != null)
      ? hand.stacks[villainSeatForStack]
      : (hand.stacks && hand.stacks.villain != null ? hand.stacks.villain : input.effStack);
    const Icm = global.GTOIcmEv;
    if (Icm && Icm.contextForHand) {
      const icmCtx = Icm.contextForHand(hand, cfg);
      if (icmCtx) Object.assign(input, icmCtx);
    }
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

  function villainPostflopOpts(hand, info, cards) {
    let holeStrength = null;
    const hc = cards || (hand.villain && hand.villain.cards);
    if (hc && hc.length >= 2 && R && typeof R.handCode === 'function') {
      try {
        holeStrength = handStrength01(R.handCode(hc[0], hc[1]));
      } catch (e) { /* ignore */ }
    }
    const RSNuts = global.GTORiverShoveNode;
    const neverFold = !!(RSNuts && RSNuts.isAbsoluteNuts && hc && hand.board
      && RSNuts.isAbsoluteNuts(hc, hand.board)) || guestNeverFoldVillain(hand);
    return {
      street: hand.stage,
      tier: info.tier,
      madeCategory: info.ev ? info.ev.category : 0,
      multiway: !!(hand.multiway || (MW() && MW().aliveCount(hand) >= 3)),
      holeStrength: holeStrength,
      neverFold: neverFold
    };
  }

  /** Respuesta de un oponente concreto (multiway) ante apuesta del héroe. */
  function opponentFacingHeroBet(hand, pos, toCallBB) {
    const profile = profileFor(hand, pos);
    const cards = (hand.table.holeCards[pos]) || null;
    const info = cards ? classifyMadeHand(cards, hand.board) : { tier: 'weak', ev: { category: 0 } };
    const eq = cards
      ? equityVsRange(cards, hand.board, hand.villain.rangeStr || GTO.Ranges.data.BROAD_CONTINUE, 120, { street: hand.stage })
      : null;
    const strength = villainPostflopStrength(info, eq);
    const potBefore = Math.max(hand.potBB - toCallBB, 0.1);
    const potOdds = toCallBB > 0 ? toCallBB / (potBefore + toCallBB) : 0.33;
    const rnd = C.rng.random();
    const pfOpts = villainPostflopOpts(hand, info, cards);
    if (pfOpts.neverFold) return rnd < 0.18 ? 'raise' : 'call';
    if (VP) return VP.postflopFacingBet(strength, potOdds, profile, rnd, pfOpts);
    if (strength > potOdds + 0.08) return 'call';
    return strength > potOdds - 0.05 ? (rnd < 0.45 ? 'call' : 'fold') : 'fold';
  }

  /**
   * Tras apuesta del héroe en multiway: cada oponente vivo actúa en orden.
   * Retorna { type: 'foldWin'|'raise'|'called'|'allFolded' , raiser?, raiseSize? }
   */
  function resolveMultiwayFacingHeroBet(hand, betSize) {
    const order = MW() ? MW().postflopOrderFor(hand) : POSTFLOP_ORDER;
    const hero = hand.hero.pos;
    const alive = MW() ? MW().aliveSeats(hand).filter(function (p) { return p !== hero; }) : [hand.villain.pos];
    let callers = 0;
    let raiser = null;
    let raiseSize = 0;
    for (let i = 0; i < order.length; i++) {
      const pos = order[i];
      if (alive.indexOf(pos) < 0) continue;
      if (raiser) break;
      if (hand.table.folded[pos] || !hand.table.inHand.has(pos)) continue;
      const act = opponentFacingHeroBet(hand, pos, betSize);
      if (act === 'fold') {
        markFolded(hand, pos);
        setSeatAction(hand, pos, 'fold', null);
        continue;
      }
      if (act === 'raise') {
        raiseSize = capBetForSeat(hand, pos, round2(betSize * 3));
        if (raiseSize <= betSize) raiseSize = capBetForSeat(hand, pos, betSize);
        const add = seatToCall(hand, pos, raiseSize);
        if (add > 0) addInvest(hand, pos, add);
        hand.potBB = round2(hand.potBB + add);
        setSeatAction(hand, pos, 'raise', raiseSize);
        if (hand.table) hand.table.streetBet[pos] = raiseSize;
        if (pos === hand.villain.pos) {
          hand.villainInvested = round2((hand.villainInvested || 0) + add);
          setVillainAct(hand, 'raise', raiseSize);
        }
        raiser = pos;
        break;
      }
      const pay = capBetForSeat(hand, pos, betSize);
      const addC = seatToCall(hand, pos, pay);
      if (addC > 0) addInvest(hand, pos, addC);
      hand.potBB = round2(hand.potBB + addC);
      setSeatAction(hand, pos, 'call', pay);
      if (hand.table) hand.table.streetBet[pos] = pay;
      if (pos === hand.villain.pos) {
        hand.villainInvested = round2((hand.villainInvested || 0) + addC);
        setVillainAct(hand, 'call', pay);
      }
      callers++;
    }
    if (MW()) MW().syncOpponents(hand);
    const left = MW() ? MW().aliveSeats(hand).filter(function (p) { return p !== hero; }) : [];
    if (raiser) return { type: 'raise', raiser: raiser, raiseSize: raiseSize };
    if (!left.length) return { type: 'foldWin' };
    return { type: 'called', callers: callers };
  }

  function isMultiwayLive(hand) {
    return !!(hand && hand.multiway && MW() && MW().aliveCount(hand) >= 3);
  }

  function multiwayAliveOrder(hand) {
    const order = MW() ? MW().postflopOrderFor(hand) : POSTFLOP_ORDER;
    const alive = MW() ? MW().aliveSeats(hand) : [];
    return order.filter(function (p) { return alive.indexOf(p) >= 0; });
  }

  function seatStillIn(hand, pos) {
    return !!(hand.table && hand.table.inHand.has(pos) && !hand.table.folded[pos]);
  }

  function focusVillainSeat(hand, pos) {
    if (!pos || !hand.villain) return;
    hand.villain.pos = pos;
    hand.villain.cards = villainHoleCards(hand);
    syncVillainMeta(hand);
  }

  function seatBetAmount(hand, pos) {
    const prev = hand.villain && hand.villain.pos;
    if (hand.villain) hand.villain.pos = pos;
    let size = villainBetAmount(hand);
    if (hand.villain && prev) hand.villain.pos = prev;
    if (hand.multiway) size = round2(size * 0.85);
    return capBetForSeat(hand, pos, size);
  }

  function opponentLeadAction(hand, pos) {
    const profile = profileFor(hand, pos);
    const cards = hand.table.holeCards[pos] || null;
    const info = cards ? classifyMadeHand(cards, hand.board) : { tier: 'air', ev: { category: 0 } };
    const eq = cards
      ? equityVsRange(cards, hand.board, GTO.Ranges.data.BROAD_CONTINUE, 100, { street: hand.stage })
      : null;
    const strength = villainPostflopStrength(info, eq);
    const villainIsAgg = !hand.heroIsAggressor && pos === (hand._predeal && hand._predeal.villainPos);
    const pfOpts = villainPostflopOpts(hand, info, cards);
    if (VP) return VP.postflopLead(strength, profile, !!villainIsAgg, C.rng.random(), pfOpts);
    return C.rng.random() < (0.1 + strength * 0.4) ? 'bet' : 'check';
  }

  function applySeatBet(hand, pos, amount) {
    const already = (hand.table.streetBet && hand.table.streetBet[pos]) || 0;
    const need = round2(Math.max(amount - already, 0));
    if (need > 0) addInvest(hand, pos, need);
    hand.potBB = round2(hand.potBB + need);
    if (hand.table) hand.table.streetBet[pos] = amount;
    hand.seatActions = hand.seatActions || {};
    hand.seatActions[pos] = { type: 'bet', amount: amount };
    hand.villainInvested = round2((hand.villainInvested || 0) + need);
    focusVillainSeat(hand, pos);
    hand.villainAction = { type: 'bet', amount: amount };
  }

  function resolveSeatFacingBet(hand, pos, betSize) {
    const act = opponentFacingHeroBet(hand, pos, betSize);
    if (act === 'fold') {
      markFolded(hand, pos);
      setSeatAction(hand, pos, 'fold', null);
      return { type: 'fold' };
    }
    if (act === 'raise') {
      let raiseSize = capBetForSeat(hand, pos, round2(betSize * 3));
      if (raiseSize <= betSize) raiseSize = capBetForSeat(hand, pos, betSize);
      const already = (hand.table.streetBet && hand.table.streetBet[pos]) || 0;
      const need = round2(Math.max(raiseSize - already, 0));
      if (need > 0) addInvest(hand, pos, need);
      hand.potBB = round2(hand.potBB + need);
      if (hand.table) hand.table.streetBet[pos] = raiseSize;
      setSeatAction(hand, pos, 'raise', raiseSize);
      focusVillainSeat(hand, pos);
      hand.villainAction = { type: 'raise', amount: raiseSize };
      return { type: 'raise', raiseSize: raiseSize };
    }
    const already = (hand.table.streetBet && hand.table.streetBet[pos]) || 0;
    const need = round2(Math.max(betSize - already, 0));
    if (need > 0) addInvest(hand, pos, need);
    hand.potBB = round2(hand.potBB + need);
    if (hand.table) hand.table.streetBet[pos] = betSize;
    setSeatAction(hand, pos, 'call', betSize);
    return { type: 'call' };
  }

  /** Asientos vivos entre aggressor y héroe en orden circular postflop (sin incluir hero). */
  function seatsUntilHero(hand, aggressorPos) {
    const order = multiwayAliveOrder(hand);
    const hero = hand.hero.pos;
    const fromIdx = order.indexOf(aggressorPos);
    if (fromIdx < 0 || !hero) return [];
    const out = [];
    for (let k = 1; k < order.length; k++) {
      const p = order[(fromIdx + k) % order.length];
      if (p === hero) break;
      out.push(p);
    }
    return out;
  }

  /**
   * Tras bet/raise de un villano: todos los asientos hasta el héroe deben
   * fold/call/raise (incluye wrap SB tras bet de CO cuando héroe es BB).
   */
  function resolveFacingUntilHero(hand, aggressorPos, betSize) {
    let currentBet = betSize;
    let currentAgg = aggressorPos;
    let guard = 0;
    while (guard++ < 24) {
      const queue = seatsUntilHero(hand, currentAgg);
      let raised = false;
      for (let i = 0; i < queue.length; i++) {
        const r = queue[i];
        if (!seatStillIn(hand, r)) continue;
        const already = (hand.table.streetBet && hand.table.streetBet[r]) || 0;
        if (already + 0.01 >= currentBet) continue;
        const face = resolveSeatFacingBet(hand, r, currentBet);
        if (face.type === 'raise') {
          currentBet = face.raiseSize;
          currentAgg = r;
          raised = true;
          break;
        }
      }
      if (!raised) break;
    }
    if (MW()) MW().syncOpponents(hand);
    return { bet: currentBet, aggressor: currentAgg };
  }

  function heroFacesBetNode(hand, betSize) {
    if (heroRemainingBB(hand) <= 0.01) return prepareAllInRunout(hand);
    return buildPostflopNode(hand, hand.stage, {
      bet: betSize,
      potBefore: round2(Math.max(hand.potBB - betSize, 0.1))
    });
  }

  /**
   * Tras check del héroe en multiway: rivales detrás actúan en orden.
   * Si alguien apuesta, los asientos hasta el héroe (con wrap) responden.
   */
  function resolveMultiwayAfterHeroCheck(hand) {
    const order = multiwayAliveOrder(hand);
    const hero = hand.hero.pos;
    const heroIdx = order.indexOf(hero);
    const after = order.slice(heroIdx + 1);

    for (let i = 0; i < after.length; i++) {
      const pos = after[i];
      if (!seatStillIn(hand, pos)) continue;
      const act = opponentLeadAction(hand, pos);
      if (act !== 'bet') {
        setSeatAction(hand, pos, 'check', null);
        if (pos === hand.villain.pos) setVillainAct(hand, 'check');
        continue;
      }
      const vBet = seatBetAmount(hand, pos);
      if (!isMeaningfulBet(vBet)) {
        setSeatAction(hand, pos, 'check', null);
        continue;
      }
      applySeatBet(hand, pos, vBet);
      const faced = resolveFacingUntilHero(hand, pos, vBet);
      return heroFacesBetNode(hand, faced.bet);
    }
    if (MW()) MW().syncOpponents(hand);
    return nextStreet(hand);
  }

  /**
   * Entrada multiway: jugadores antes del héroe actúan; si alguien apuesta,
   * los intermedios (y wrap si hay raise) responden y el héroe afronta.
   */
  function enterStreetMultiway(hand) {
    const order = multiwayAliveOrder(hand);
    const hero = hand.hero.pos;
    const heroIdx = order.indexOf(hero);
    const before = order.slice(0, heroIdx);

    for (let i = 0; i < before.length; i++) {
      const pos = before[i];
      if (!seatStillIn(hand, pos)) continue;
      const act = opponentLeadAction(hand, pos);
      if (act !== 'bet') {
        setSeatAction(hand, pos, 'check', null);
        if (pos === hand.villain.pos) setVillainAct(hand, 'check');
        continue;
      }
      const vBet = seatBetAmount(hand, pos);
      if (!isMeaningfulBet(vBet)) {
        setSeatAction(hand, pos, 'check', null);
        continue;
      }
      applySeatBet(hand, pos, vBet);
      const faced = resolveFacingUntilHero(hand, pos, vBet);
      return heroFacesBetNode(hand, faced.bet);
    }

    if (heroRemainingBB(hand) <= 0.01) return prepareAllInRunout(hand);
    const h = buildPostflopNode(hand, hand.stage);
    // Solo cierra la calle con check si el héroe es el último en hablar
    hand.current.heroClosesOnCheck = heroIdx >= order.length - 1;
    return h;
  }

  /** Muestrea fold/call/raise. Nunca foldea las nuts absolutas. */
  function sampleVillainFacingFromStrategy(strat, rnd, opts) {
    opts = opts || {};
    let raiseP = strat.raise || 0;
    let callP = strat.call || 0;
    if (opts.neverFold) {
      const rest = raiseP + callP;
      if (rest <= 0) return 'call';
      raiseP /= rest;
      callP /= rest;
    }
    if (opts.canRaise !== false && rnd < raiseP) return 'raise';
    if (rnd < raiseP + callP) return 'call';
    return opts.neverFold ? 'call' : 'fold';
  }

  function villainPostflopAction(hand, node) {
    const forced = scriptForcedPostflop(hand, node);
    if (forced) return forced;
    const profile = profileFor(hand, hand.villain.pos);
    const info = classifyMadeHand(hand.villain.cards, hand.board);
    const eq = villainEquity01(hand);
    const strength = villainPostflopStrength(info, eq);
    const rnd = C.rng.random();
    const pfOpts = villainPostflopOpts(hand, info, hand.villain.cards);

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
        potBeforeBB: potBefore,
        heroEquity: eq != null ? eq : strength,
        madeHandInfo: info,
        board: hand.board.slice(),
        heroCards: hand.villain.cards,
        initiative: hand.heroIsAggressor ? 'caller' : 'aggressor',
        inPosition: !hand.heroInPosition,
        spr: spr,
        street: hand.stage,
        villainLastAction: node.heroLastAction || (hand.heroAction && hand.heroAction.type) || null
      });
      if (node.heroLastAction === 'bet' || node.heroLastAction === 'raise') {
        return sampleVillainFacingFromStrategy(strat, rnd, {
          neverFold: !!pfOpts.neverFold,
          canRaise: villainToCall > 0
        });
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
      if (pfOpts.neverFold) return rnd < 0.18 ? 'raise' : 'call';
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
  // Rango aproximado con el que un rival limpea (pasivo/débil)
  const LIMP_RANGE = '22-99, A2s-A9s, K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, ATo-AJo, KJo, QJo, JTo';

  function pickScenario(forceKey, playConfig) {
    const PC = global.PTPlayConfig;
    if (forceKey && forceKey.type) {
      const s = Object.assign({}, forceKey);
      delete s.seed;
      delete s.forceDeal;
      delete s.forceScript;
      if (PC && playConfig && PC.is9Max(playConfig) && s.heroPos && !s.engineHeroPos) {
        s.engineHeroPos = PC.enginePos(s.heroPos);
      }
      return s;
    }
    // force solo con seed/forceDeal/forceScript: respetar playConfig (hubs v2).
    if (PC && playConfig) {
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
    if (s.type === 'srp3way' || s.type === 'srp4way' || s.type === 'limpPot') return s.heroPos || 'BB';
    return s.heroPos;
  }

  function dealForPlayConfig(scenario, playConfig) {
    const PC = global.PTPlayConfig;
    const order = PC && PC.dealOrder
      ? PC.dealOrder(playConfig)
      : (PC && PC.is9Max(playConfig) ? PC.DEAL_ORDER_9 : DEAL_ORDER);
    const holeCards = {};
    order.forEach(function (pos) { holeCards[pos] = null; });
    let dead = [];

    const heroMode = (playConfig && (playConfig.handRange === 'all' ? 'random' : playConfig.handRange)) || 'playable';
    const fullRandom = heroMode === 'random';

    const heroSeat = PC ? PC.heroDealSeat(scenario, playConfig) : scenario.heroPos;
    const heroEng = scenario.engineHeroPos
      || (scenario.type === 'RFI' ? (PC ? PC.enginePos(scenario.heroPos) : scenario.heroPos) : null)
      || ((scenario.type === 'vsRFI' || scenario.type === 'face4bet') ? parseVsKey(scenario.key).hero : scenario.heroPos);

    if (!fullRandom) {
      // Villanos reparten desde su rango del spot; el héroe se reparte según el modo.
      const deals = PC ? PC.getScenarioDeals(scenario, playConfig) : [];
      deals.forEach(function (d) {
        if (!d.pos || d.role === 'hero') return;
        const cards = PC.sampleFromWeights(d.weights, dead, C.rng.random);
        if (cards) {
          holeCards[d.pos] = cards;
          dead = dead.concat(cards);
        }
      });

      if (!holeCards[heroSeat] || holeCards[heroSeat].length < 2) {
        let heroCards = PC && PC.sampleHeroHand ? PC.sampleHeroHand(scenario, playConfig, dead, C.rng.random) : null;
        if (!heroCards) {
          const heroWeights = PC ? PC.sampleHeroWeights(scenario, playConfig) : {};
          heroCards = PC ? PC.sampleFromWeights(heroWeights, dead, C.rng.random) : null;
        }
        if (!heroCards) heroCards = sampleHandFromRange('22+, A2s+, K9s+, AJo+', dead, C.rng.random);
        holeCards[heroSeat] = heroCards;
        dead = dead.concat(heroCards);
      }
    }
    // fullRandom: todos los asientos quedan null y se rellenan del mazo (aleatorio total).

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
    } else if (scenario.type === 'srp3way' || scenario.type === 'srp4way' || scenario.type === 'limpPot') {
      vPos = scenario.openerPos || scenario.limperPos || 'CO';
      vRange = scenario.type === 'limpPot'
        ? LIMP_RANGE
        : openRangeStr(vPos, { playConfig: playConfig });
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
    else if (scenario.type === 'srp3way' || scenario.type === 'srp4way') setupSrpMultiway(hand);
    else if (scenario.type === 'limpPot') setupLimpMultiway(hand);
    else if (scenario.type === 'squeezeMulti') setupSqueeze(hand);
    else setupVsRFI(hand);
    assignHeroFromTable(hand);
    assignSeatProfiles(hand);
    initHandStacks(hand);
    syncVillainMeta(hand);
    if (force && force.forceDeal) {
      hand.forceDeal = cloneForceDeal(force.forceDeal);
      applyForcedHand(hand, hand.forceDeal);
      assignHeroFromTable(hand);
      if (hand.villain && hand.villain.pos) hand.villain.cards = villainHoleCards(hand);
    }
    if (force && force.forceScript) initForceScript(hand, force.forceScript);
    applyAnteToHand(hand);
    if (hand._autoGoFlop) {
      delete hand._autoGoFlop;
      goFlop(hand);
    } else {
      const schoolStreet = schoolPostflopTarget(hand, force);
      if (schoolStreet) {
        setupSchoolPostflopJump(hand, schoolStreet, force);
      }
    }
    return hand;
  }

  /** Escuela: saltar a flop/turn/river con SRP HU determinista (sin RNG de folds). */
  function schoolPostflopTarget(hand, force) {
    const cfg = hand && hand.playConfig;
    if (!cfg || !cfg.schoolMode) return null;
    const st = cfg.practiceStreet;
    if (!st || st === 'random' || st === 'preflop') return null;
    const board = (force && force.forceDeal && force.forceDeal.board)
      || (hand.forceDeal && hand.forceDeal.board)
      || (hand._predeal && hand._predeal.board);
    if (!board || board.length < 3) return null;
    return st;
  }

  function setupSchoolPostflopJump(hand, target, force) {
    const heroPos = (hand.hero && hand.hero.pos) || scenarioHeroPos(hand);
    let villainPos = (force && force.forceDeal && force.forceDeal.villainPos)
      || (hand.forceDeal && hand.forceDeal.villainPos)
      || (hand.villain && hand.villain.pos)
      || 'BB';
    const facingBet = !!(force && force.facingBet)
      || !!(force && force.forceDeal && force.forceDeal.facingBet);

    if (facingBet) {
      // Remap solo si falta villano o coincide con el héroe. No pisar un BB
      // explícito cuando el héroe está en late (p. ej. vs donk/raise de ciegas).
      if (!villainPos || villainPos === heroPos) {
        villainPos = (heroPos === 'BB' || heroPos === 'SB') ? 'BTN' : 'BB';
      }
      hand.villain.pos = villainPos;
      if (hand._predeal) hand._predeal.villainPos = villainPos;
      const openSize = OPEN;
      foldSeatsExcept(hand, [heroPos, villainPos]);
      hand.table.folded[heroPos] = false;
      hand.table.folded[villainPos] = false;
      hand.table.inHand.add(heroPos);
      hand.table.inHand.add(villainPos);
      hand.table.invested[heroPos] = openSize;
      hand.table.invested[villainPos] = openSize;
      hand.heroInvested = openSize;
      hand.villainInvested = openSize;
      hand.potBB = round2(openSize * 2);
      hand.heroIsAggressor = false;
      hand.heroInPosition = inPos(heroPos, villainPos);
    } else {
      if (!villainPos || villainPos === heroPos) villainPos = (heroPos === 'BB' ? 'BTN' : 'BB');
      hand.villain.pos = villainPos;
      if (hand._predeal) hand._predeal.villainPos = villainPos;
      const openSize = heroPos === 'SB' ? SB_OPEN : OPEN;
      foldSeatsExcept(hand, [heroPos, villainPos]);
      hand.table.folded[heroPos] = false;
      hand.table.folded[villainPos] = false;
      hand.table.inHand.add(heroPos);
      hand.table.inHand.add(villainPos);
      hand.table.invested[heroPos] = openSize;
      hand.table.invested[villainPos] = openSize;
      hand.heroInvested = openSize;
      hand.villainInvested = openSize;
      hand.potBB = round2(openSize * 2);
      hand.heroIsAggressor = true;
      hand.heroInPosition = inPos(heroPos, villainPos);
    }

    hand.villain.cards = villainHoleCards(hand);
    if (!hand.villainRangeTracker) initVillainTracker(hand);
    syncTableToActivePot(hand);
    syncVillainMeta(hand);
    resetStreetBets(hand);

    const full = (hand._predeal && hand._predeal.board) || [];
    if (target === 'turn') {
      hand.stage = 'turn';
      hand.board = full.slice(0, 4);
      hand._boardIdx = 4;
    } else if (target === 'river') {
      hand.stage = 'river';
      hand.board = full.slice(0, 5);
      hand._boardIdx = 5;
    } else {
      hand.stage = 'flop';
      hand.board = full.slice(0, 3);
      hand._boardIdx = 3;
    }
    recalcPot(hand);

    if (facingBet) {
      const vBet = round2(Math.max(0.5, hand.potBB * 0.33));
      hand.villainInvested = round2((hand.villainInvested || 0) + vBet);
      hand.table.invested[villainPos] = hand.villainInvested;
      hand.potBB = round2(hand.potBB + vBet);
      setVillainAct(hand, 'bet', vBet);
      return buildPostflopNode(hand, hand.stage, { bet: vBet, potBefore: round2(hand.potBB - vBet) });
    }
    if (hand.heroInPosition) {
      setVillainAct(hand, 'check');
      const node = buildPostflopNode(hand, hand.stage);
      if (hand.current) hand.current.heroClosesOnCheck = true;
      return node;
    }
    return buildPostflopNode(hand, hand.stage);
  }

  /** Suma ante MTT/spin al bote inicial (aprox. 2–3 jugadores activos). */
  function applyAnteToHand(hand) {
    const cfg = hand && hand.playConfig;
    if (!cfg) return;
    const ante = Number(cfg.anteBB) || 0;
    if (ante <= 0) return;
    const seats = global.PTPlayConfig && global.PTPlayConfig.isSpin && global.PTPlayConfig.isSpin(cfg)
      ? 3
      : (global.PTPlayConfig && global.PTPlayConfig.is9Max && global.PTPlayConfig.is9Max(cfg) ? 9 : 6);
    // Antes típicos: todos pagan; en HU efectivo usamos 2.
    const payers = Math.min(seats, hand.table && hand.table.length ? hand.table.length : seats);
    const add = round2(ante * Math.max(2, Math.min(payers, 3)));
    hand.potBB = round2((hand.potBB || 0) + add);
    hand.anteBB = ante;
    hand.antePotBB = add;
    if (hand.current) hand.current.potBB = hand.potBB;
  }

  /** True si el nodo actual encaja con practiceIntent de faroles. */
  function currentMatchesPracticeIntent(hand) {
    const cfg = hand && hand.playConfig;
    if (!cfg || !cfg.practiceIntent || cfg.practiceIntent === 'mixed') return true;
    const Det = global.GTOBluffSpotDetector;
    if (!Det || !hand.current) return true;
    if (hand.current.street === 'preflop') return cfg.practiceIntent === 'mixed';
    try {
      const input = buildSpotInput(hand, hand.current, null);
      const strat = GTO.getStrategy(input);
      return Det.matchesPracticeIntent(Object.assign({}, input, { strategy: strat }), cfg.practiceIntent);
    } catch (e) {
      return true;
    }
  }

  function inPos(a, b) { return POSTFLOP_ORDER.indexOf(a) > POSTFLOP_ORDER.indexOf(b); }

  /** SRP multiway dedicado: open + cold-call(s) + hero (BB u otra seat). */
  function setupSrpMultiway(hand) {
    const s = hand.scenario;
    const opener = s.openerPos || 'CO';
    const callers = (s.callerPositions || (s.callerPos ? [s.callerPos] : ['BTN'])).slice();
    const heroPos = s.heroPos || s.engineHeroPos || 'BB';
    const openSize = opener === 'SB' ? SB_OPEN : OPEN;
    hand.hero.pos = heroPos;
    hand.villain.pos = opener;
    ensureOpenerOpenHand(hand, opener);
    hand.villain.rangeStr = openRangeStr(opener, hand);
    initVillainTracker(hand);

    let participants = [heroPos, opener].concat(callers).filter(function (p, i, arr) {
      return p && arr.indexOf(p) === i;
    });
    // BB (u otras seats tras el héroe) aún no han hablado: no foldearlas
    participants = withYetToActParticipants(hand, participants, heroPos);
    foldSeatsExcept(hand, participants);
    // Ciega BB visible en mesa si sigue viva
    if (participants.indexOf('BB') >= 0 && !hand.table.folded.BB) {
      hand.table.folded.BB = false;
      hand.table.inHand.add('BB');
      if (!hand.table.streetBet.BB) setPreflopSeatBet(hand, 'BB', BBET);
    }

    setPreflopSeatBet(hand, opener, openSize);
    const openerBlind = opener === 'SB' ? SB : (opener === 'BB' ? BBET : 0);
    // invested arranca con ciegas en initTableState; normalizar open
    hand.table.invested[opener] = openerBlind;
    addInvest(hand, opener, openSize - openerBlind);
    setSeatAction(hand, opener, 'raise', openSize);

    callers.forEach(function (cPos) {
      if (cPos === heroPos || cPos === opener) return;
      hand.table.folded[cPos] = false;
      hand.table.inHand.add(cPos);
      // Limpiar ciega residual si no es SB/BB
      if (cPos !== 'SB' && cPos !== 'BB') hand.table.invested[cPos] = 0;
      const add = seatToCall(hand, cPos, openSize);
      if (add > 0) addInvest(hand, cPos, add);
      setPreflopSeatBet(hand, cPos, openSize);
      setSeatAction(hand, cPos, 'call', openSize);
    });

    const heroBlind = heroPos === 'SB' ? SB : (heroPos === 'BB' ? BBET : 0);
    hand.heroInvested = heroBlind;
    hand.villainInvested = openSize;
    // SB muerto si no participa
    if (participants.indexOf('SB') < 0 && hand.table.invested.SB) {
      /* dead money se queda en invested aunque folded — recalcPot lo suma */
    }
    recalcPot(hand);

    const order = preflopOrderForHand(hand);
    const toCall = round2(openSize - heroBlind);
    const yetToAct = seatsYetToActPreflop(hand, heroPos);
    if (toCall > 0.01 && (heroPos === 'BB' || heroPos === 'SB' || order.indexOf(heroPos) > order.indexOf(callers[callers.length - 1] || opener))) {
      const freqs = strategyForNode(hand, { street: 'preflop', kind: 'vsRFI', potBB: hand.potBB, toCallBB: toCall });
      const yetNote = yetToAct.length ? ` ${yetToAct.join('+')} aún por hablar.` : '';
      hand.current = {
        street: 'preflop',
        kind: 'vsRFI',
        potBB: hand.potBB,
        toCallBB: toCall,
        openSize: openSize,
        threeBetSize: round2(openSize * 3.5),
        options: [
          { id: 'fold', label: 'Fold' },
          { id: 'call', label: `Call (${toCall}bb)` },
          { id: 'raise', label: `3-Bet a ${round2(openSize * 3.5)}bb` }
        ],
        gto: freqs,
        context: `Bote multiway: ${opener} abre, ${callers.join('+')} pagan. Eres ${heroPos}. Bote ${hand.potBB}bb.${yetNote}`
      };
      hand._multiwayPendingCallers = callers.filter(function (c) { return c !== heroPos && c !== opener; });
      hand._multiwayOpenSize = openSize;
      // Marcar multiway ya en preflop para UI (BB visible como vivo)
      hand.multiway = true;
      hand.potType = s.type === 'srp4way' ? 'srp4way' : 'srp3way';
      if (MW()) MW().syncOpponents(hand);
      return;
    }

    // Ya estamos listos para flop (hero ya en pot)
    hand.heroInvested = openSize;
    const heroAdd = seatToCall(hand, heroPos, openSize);
    if (heroAdd > 0) addInvest(hand, heroPos, heroAdd);
    setSeatAction(hand, heroPos, 'call', openSize);
    setPreflopSeatBet(hand, heroPos, openSize);
    recalcPot(hand);
    hand.heroIsAggressor = false;
    const extras = callers.filter(function (c) { return c !== opener && c !== heroPos; });
    if (MW()) {
      MW().markMultiwayHand(hand, s.type === 'srp4way' || extras.length >= 2 ? 'srp4way' : 'srp3way', extras);
      MW().syncTableToMultiwayPot(hand, extras);
    }
    foldSeatsExcept(hand, participants);
    hand.heroInPosition = heroIpMultiway(hand);
    hand.current = {
      street: 'preflop',
      kind: 'multiwayReady',
      potBB: hand.potBB,
      toCallBB: 0,
      options: [{ id: 'call', label: 'Ir al flop' }],
      gto: { call: 1 },
      context: `SRP multiway listo (${MW() ? MW().aliveCount(hand) : participants.length}-way, bote ${hand.potBB}bb).`
    };
    // No auto-skip: el usuario debe confirmar (evita saltar preflop en silencio)
  }

  function setupLimpMultiway(hand) {
    const s = hand.scenario;
    const limpers = (s.limperPositions || (s.limperPos ? [s.limperPos] : ['UTG', 'HJ'])).slice();
    const heroPos = s.heroPos || 'BB';
    hand.hero.pos = heroPos;
    hand.villain.pos = limpers[0];
    hand.villain.rangeStr = LIMP_RANGE;
    initVillainTracker(hand);

    const participants = [heroPos].concat(limpers);
    if (heroPos === 'BB' || limpers.indexOf('BB') >= 0) {
      if (participants.indexOf('BB') < 0) participants.push('BB');
    }
    // SB aún por hablar si héroe no es SB/BB last — en limp pot BB suele cerrar
    foldSeatsExcept(hand, withYetToActParticipants(hand, participants, heroPos));

    limpers.forEach(function (lp) {
      hand.table.folded[lp] = false;
      hand.table.inHand.add(lp);
      if (lp !== 'SB' && lp !== 'BB') hand.table.invested[lp] = 0;
      const add = seatToCall(hand, lp, BBET);
      if (add > 0) addInvest(hand, lp, add);
      setPreflopSeatBet(hand, lp, BBET);
      setSeatAction(hand, lp, 'call', BBET);
    });

    hand.heroInvested = heroPos === 'SB' ? SB : BBET;
    hand.villainInvested = BBET;
    recalcPot(hand);
    const extras = limpers.filter(function (p) { return p !== hand.villain.pos; });
    if (heroPos === 'BB') {
      hand.heroIsAggressor = false;
      hand.table.folded.BB = false;
      hand.table.inHand.add('BB');
      if (!hand.table.streetBet.BB) setPreflopSeatBet(hand, 'BB', BBET);
      if (MW()) {
        MW().markMultiwayHand(hand, 'limpPot', extras);
        MW().syncTableToMultiwayPot(hand, extras);
      }
      foldSeatsExcept(hand, participants.concat(seatsYetToActPreflop(hand, heroPos)));
      hand.heroInPosition = heroIpMultiway(hand);
      // Iso multiway: un poco más grande que HU
      const isoSize = round2(Math.max(BBET * 4, hand.potBB + BBET));
      const freqs = strategyForNode(hand, {
        street: 'preflop', kind: 'bbVsSbLimp', potBB: hand.potBB, toCallBB: 0
      });
      hand.current = {
        street: 'preflop',
        kind: 'limpPotBB',
        potBB: hand.potBB,
        toCallBB: 0,
        isoSize: isoSize,
        options: [
          { id: 'call', label: 'Check (ver flop)' },
          { id: 'raise', label: 'Iso-raise a ' + isoSize + 'bb' }
        ],
        gto: freqs,
        context: `Limp pot multiway (${limpers.join('+')} limp, bote ${hand.potBB}bb). Eres BB. ¿Check o iso-raise?`
      };
      hand._multiwayPendingCallers = limpers.slice();
      hand._multiwayOpenSize = BBET;
      return;
    }
    const toCall = round2(BBET - (heroPos === 'SB' ? SB : 0));
    hand.current = {
      street: 'preflop',
      kind: 'isoLimp',
      potBB: hand.potBB,
      toCallBB: toCall,
      isoSize: round2(BBET * 3.5),
      options: [
        { id: 'fold', label: 'Fold' },
        { id: 'call', label: 'Overlimp' },
        { id: 'raise', label: `Iso a ${round2(BBET * 3.5)}bb` }
      ],
      gto: strategyForNode(hand, { street: 'preflop', kind: 'isoLimp', potBB: hand.potBB, toCallBB: toCall }),
      context: `Varios limps (${limpers.join('+')}). Eres ${heroPos}.`
    };
    hand._multiwayPendingCallers = limpers.slice();
    hand._multiwayOpenSize = BBET;
  }

  function setupRFI(hand) {
    const pos = scenarioHeroPos(hand);
    hand.hero.pos = pos;
    const displayPos = hand.displayHeroPos || hand.scenario.heroPos || pos;
    const openSize = pos === 'SB' ? SB_OPEN : OPEN;
    const mode = preflopSizingMode(hand);
    const stackBB = round2(effStackForHand(hand));
    const fmt = global.GTOPotMath ? global.GTOPotMath.formatBB : (x) => String(round2(x));
    // pot inicial con ciegas
    hand.potBB = SB + BBET;
    const freqs = Object.assign({}, strategyForNode(hand, { street: 'preflop', kind: 'RFI', potBB: hand.potBB, toCallBB: 0 }));
    let options;
    let context;
    if (mode === 'push') {
      options = [
        { id: 'fold', label: 'Fold (retirarse)' },
        { id: 'allin', label: `Shove (${fmt(stackBB)}bb)` }
      ];
      context = `Eres ${displayPos} con ~${fmt(stackBB)}bb. Zona push/fold: ¿shove o fold?`;
    } else if (mode === 'steal') {
      options = [
        { id: 'fold', label: 'Fold (retirarse)' },
        { id: 'raise', label: `Open steal a ${openSize}bb` },
        { id: 'allin', label: `Shove (${fmt(stackBB)}bb)` }
      ];
      context = `Eres ${displayPos} con ~${fmt(stackBB)}bb (steal). Manos fuertes suelen ir shove; medias del rango, open ~${openSize}bb.`;
    } else {
      options = [
        { id: 'fold', label: 'Fold (retirarse)' },
        { id: 'raise', label: `Subir a ${openSize}bb` }
      ];
      context = `Eres ${displayPos}. La acción te llega sin subir (RFI). ¿Abres o te retiras?`;
      if (hand.playConfig && hand.playConfig.guestTrap) {
        const heroBlind = pos === 'SB' ? SB : (pos === 'BB' ? BBET : 0);
        const limpAdd = round2(BBET - heroBlind);
        options.splice(1, 0, {
          id: 'limp',
          label: limpAdd > 0.01 ? `Limp (igualar ${fmt(limpAdd)}bb)` : 'Limp (igualar)'
        });
        freqs.limp = 0;
        context = `Eres ${displayPos}. La acción te llega sin subir (RFI). ¿Abres, limpeas o te retiras?`;
      }
    }
    hand.current = {
      street: 'preflop',
      kind: 'RFI',
      potBB: hand.potBB,
      toCallBB: 0,
      openSize,
      options,
      gto: freqs,
      context
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
    const mode = preflopSizingMode(hand);
    const stackBB = round2(effStackForHand(hand));
    const fmt = global.GTOPotMath ? global.GTOPotMath.formatBB : (x) => String(round2(x));
    let options;
    let context;
    if (mode === 'push') {
      // Villano abre a 2.5/3bb (no shove): fold / call / 3-bet shove — MTT y spins push.
      options = [
        { id: 'fold', label: 'Fold (retirarse)' },
        { id: 'call', label: `Call (igualar ${hand.toCallBB}bb)` },
        { id: 'allin', label: `Shove (${fmt(stackBB)}bb)` }
      ];
      context = `Eres ${hero}. ${opener} abre steal a ${openSize}bb (~${fmt(stackBB)}bb efectivos). ¿Fold, call o shove?`;
    } else if (mode === 'stealDefense') {
      options = [
        { id: 'fold', label: 'Fold (retirarse)' },
        { id: 'call', label: `Call (igualar ${hand.toCallBB}bb)` },
        { id: 'allin', label: `3-bet shove (${fmt(stackBB)}bb)` }
      ];
      context = `Eres ${hero}. ${opener} abre steal a ${openSize}bb con ~${fmt(stackBB)}bb. ¿Fold, call o 3-bet shove?`;
    } else {
      options = [
        { id: 'fold', label: 'Fold (retirarse)' },
        { id: 'call', label: `Call (igualar ${hand.toCallBB}bb)` },
        { id: 'raise', label: `3-Bet a ${threeBetSize}bb` }
      ];
      context = `Eres ${hero}. ${opener} abre a ${openSize}bb y te llega la acción. ¿Fold, call o 3-bet?`;
    }
    hand.current = {
      street: 'preflop',
      kind: 'vsRFI',
      potBB: hand.potBB,
      toCallBB: hand.toCallBB,
      openSize,
      threeBetSize,
      options,
      gto: freqs,
      context
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
      context: `Eres ${heroPos}. ${limperPos} limpea. ¿Fold, over-limp o aislar con una subida?`
    };
    setVillainAct(hand, 'check', null);
    addInvest(hand, limperPos, BBET);
    markPreflopFoldsForFacingAction(hand, limperPos);
  }

  // ---------- Aplicar una acción ----------
  function act(hand, actionId) {
    beginReveal(hand);
    try {
      return actApply(hand, actionId);
    } finally {
      endReveal(hand);
    }
  }

  function actApply(hand, actionId) {
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
      context: node.context,
      bluffSpot: ev.bluffSpot || null,
      icmMultiplier: ev.icmMultiplier != null ? ev.icmMultiplier : null,
      icmPressure: ev.icmPressure != null ? ev.icmPressure : null,
      bubbleFactor: ev.bubbleFactor != null ? ev.bubbleFactor : null,
      icmNote: ev.icmNote || null,
      formatHub: (hand.playConfig && hand.playConfig.formatHub) || null
    };
    hand.decisions.push(decision);
    hand.log.push(describeDecision(hand, decision));

    // Si hay guion de análisis: el villano sigue la línea real solo mientras
    // el héroe no se desvíe de su acción original.
    scriptConsumeHero(hand, actionId);

    // Escuela de Póker: evaluar solo el nodo pedagógico (sin continuar la mano).
    if (hand.playConfig && hand.playConfig.schoolDecisionEnd) {
      finish(hand, {
        reason: 'Escuela de Póker · spot evaluado',
        heroNet: 0,
        school: true
      });
      return { decision, hand };
    }

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

    if (node.kind === 'multiwayReady') {
      setHeroAct(hand, actionId === 'check' ? 'check' : 'call', 0);
      const openSize = hand._multiwayOpenSize || OPEN;
      if (hand._multiwayPendingCallers && hand._multiwayPendingCallers.length) {
        ensureCallersPaidOpen(hand, hand._multiwayPendingCallers, openSize);
      }
      if (hand._multiwayPendingCallers && MW()) {
        MW().markMultiwayHand(hand, hand.potType || hand.scenario.type || 'srp3way', hand._multiwayPendingCallers);
        MW().syncTableToMultiwayPot(hand, hand._multiwayPendingCallers);
      }
      recalcPot(hand);
      delete hand._multiwayPendingCallers;
      delete hand._multiwayOpenSize;
      return goFlop(hand);
    }

    if (node.kind === 'limpPotBB') {
      if (actionId === 'call' || actionId === 'check') {
        setHeroAct(hand, 'check');
        setSeatAction(hand, hand.hero.pos, 'check', null);
        hand.heroIsAggressor = false;
        hand.heroInPosition = heroIpMultiway(hand);
        if (MW() && hand._multiwayPendingCallers) {
          MW().markMultiwayHand(hand, 'limpPot', hand._multiwayPendingCallers);
          MW().syncTableToMultiwayPot(hand, hand._multiwayPendingCallers);
        }
        delete hand._multiwayPendingCallers;
        delete hand._multiwayOpenSize;
        recalcPot(hand);
        return goFlop(hand);
      }
      // Iso-raise vs limpers multiway
      const isoSize = node.isoSize || round2(BBET * 4);
      const heroBlind = hand.table.invested[hand.hero.pos] || BBET;
      const heroAdd = round2(isoSize - heroBlind);
      hand.heroIsAggressor = true;
      hand.heroInvested = isoSize;
      if (heroAdd > 0) addInvest(hand, hand.hero.pos, heroAdd);
      setHeroAct(hand, 'raise', isoSize);
      setPreflopSeatBet(hand, hand.hero.pos, isoSize);
      setSeatAction(hand, hand.hero.pos, 'raise', isoSize);

      const limpers = (hand._multiwayPendingCallers || []).slice();
      const callers = [];
      for (let li = 0; li < limpers.length; li++) {
        const lp = limpers[li];
        if (!seatStillIn(hand, lp)) continue;
        const d = limperDefendVsIso(hand, lp, isoSize);
        if (d === 'fold') {
          markFolded(hand, lp);
          setSeatAction(hand, lp, 'fold', null);
          continue;
        }
        const add = seatToCall(hand, lp, isoSize);
        if (add > 0) addInvest(hand, lp, add);
        setPreflopSeatBet(hand, lp, isoSize);
        setSeatAction(hand, lp, 'call', isoSize);
        callers.push(lp);
      }
      delete hand._multiwayPendingCallers;
      delete hand._multiwayOpenSize;
      recalcPot(hand);
      if (!callers.length) {
        return finish(hand, {
          reason: 'Todos foldean ante tu iso-raise.',
          heroNet: round2(hand.potBB - heroBlind)
        });
      }
      hand.villain.pos = callers[0];
      hand.villain.cards = villainHoleCards(hand);
      hand.villainInvested = isoSize;
      syncVillainMeta(hand);
      const extras = callers.slice(1);
      if (callers.length >= 2 && MW()) {
        MW().markMultiwayHand(hand, 'limpPot', extras);
        MW().syncTableToMultiwayPot(hand, extras);
      } else if (MW()) {
        hand.multiway = false;
        hand.potType = 'hu';
        foldSeatsExcept(hand, [hand.hero.pos, callers[0]]);
      }
      hand.heroInPosition = heroIpMultiway(hand);
      return goFlop(hand);
    }

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
        if (hand.scenario.callerPos && !(MW() && MW().allowMultiway(hand))) {
          markFolded(hand, hand.scenario.callerPos);
        } else if (hand.scenario.callerPos && MW() && MW().allowMultiway(hand)) {
          MW().markMultiwayHand(hand, 'squeezeMulti', [hand.scenario.callerPos]);
        }
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
      if (callerIn && callerPos && MW() && MW().allowMultiway(hand)) {
        MW().markMultiwayHand(hand, 'squeezeMulti', [callerPos]);
      }
      hand.heroInPosition = hand.multiway ? heroIpMultiway(hand) : inPos(hand.hero.pos, hand.villain.pos);
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
        // over-limp: bote multiway pasivo (limper + hero + BB si sigue)
        setHeroAct(hand, 'call', node.toCallBB);
        hand.heroIsAggressor = false;
        hand.heroInvested = BBET;
        hand.villainInvested = BBET;
        hand.potBB = round2(BBET * 2 + SB);
        hand.heroInPosition = inPos(hand.hero.pos, hand.villain.pos);
        if (MW() && MW().allowMultiway(hand) && hand.hero.pos !== 'BB' && hand.table && !hand.table.folded.BB) {
          const extras = ['BB'];
          if (hand.villain.pos !== 'BB') {
            MW().markMultiwayHand(hand, 'limpPot', extras.filter(function (p) { return p !== hand.villain.pos; }));
            addInvest(hand, 'BB', 0); // ya tiene ciega
          }
        } else {
          resolvePendingAfterHero(hand);
        }
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
      let vAct = scriptForcedVs4Bet(hand, hand.villain.pos);
      if (!vAct) {
        vAct = 'call';
        if (VPF && vCode) {
          vAct = VPF.villainVs4BetAction(vCode, vProf, C.rng.random());
        } else {
          const level = (hand.playConfig && hand.playConfig.villainLevel) || 'pro';
          if (level === 'pro' || level === 'intermediate') vAct = 'fold';
          else if (C.rng.random() < foldProb) vAct = 'fold';
        }
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
      const forcedAi = scriptForcedVs4Bet(hand, hand.villain.pos);
      const aiCode = seatHoleCode(hand, hand.villain.pos);
      const aiProf = profileFor(hand, hand.villain.pos);
      const aiFold = forcedAi
        ? forcedAi === 'fold'
        : (VPF && aiCode && VPF.villainVsAllInAction(aiCode, aiProf, C.rng.random()) === 'fold');
      if (aiFold) {
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
      if (actionId === 'limp') {
        const limpTo = BBET;
        const heroAdd = seatToCall(hand, hand.hero.pos, limpTo);
        if (heroAdd > 0) addInvest(hand, hand.hero.pos, heroAdd);
        hand.heroInvested = limpTo;
        hand.heroIsAggressor = false;
        setHeroAct(hand, 'call', limpTo);
        setPreflopSeatBet(hand, hand.hero.pos, limpTo);
        setSeatAction(hand, hand.hero.pos, 'call', limpTo);
        foldSeatsExcept(hand, [hand.hero.pos, 'BB']);
        hand.villain.pos = 'BB';
        hand.villain.cards = villainHoleCards(hand);
        syncVillainMeta(hand);
        setVillainAct(hand, 'check');
        hand.heroInPosition = inPos(hand.hero.pos, 'BB');
        recalcPot(hand);
        return goFlop(hand);
      }
      if (actionId === 'allin') {
        hand.heroIsAggressor = true;
        const shoveTo = round2(effStackForHand(hand));
        const heroAdd = seatToCall(hand, hand.hero.pos, shoveTo);
        if (heroAdd > 0) addInvest(hand, hand.hero.pos, heroAdd);
        hand.heroInvested = shoveTo;
        setHeroAct(hand, 'allin', shoveTo);
        setPreflopSeatBet(hand, hand.hero.pos, shoveTo);
        recalcPot(hand);
        const res = resolveBlindsAfterHeroOpen(hand, shoveTo);
        if (res.type === 'allFold') {
          return finish(hand, {
            reason: 'Todos se retiran ante tu shove. Te llevas el bote.',
            heroNet: round2(hand.potBB - shoveTo)
          });
        }
        // Héroe ya all-in: nunca face3bet (fold/call del shove → runout).
        if (res.type === 'face3bet') return allInShowdown(hand);
        return goFlop(hand);
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
      let hero = hand.hero.pos;
      let opener = hand.villain.pos;
      if (hand.scenario && hand.scenario.key) {
        const pk = parseVsKey(hand.scenario.key);
        hero = pk.hero || hero;
        opener = pk.opener || opener;
      } else if (hand.scenario) {
        hero = hand.scenario.heroPos || hero;
        opener = hand.scenario.openerPos || opener;
      }
      if (actionId === 'fold') {
        return finish(hand, { reason: 'Te retiras ante la subida.', heroNet: -(hand.heroInvested || 0) });
      }
      hand.villain.cards = villainHoleCards(hand);
      if (actionId === 'allin') {
        hand.heroIsAggressor = true;
        const shoveTo = round2(effStackForHand(hand));
        hand.heroInvested = shoveTo;
        addInvest(hand, hero, round2(shoveTo - (hand.table.invested[hero] || 0)));
        setHeroAct(hand, 'allin', shoveTo);
        setPreflopSeatBet(hand, hero, shoveTo);
        resolvePendingAfterHero(hand);
        let cont = openerVs3Bet(hand, opener, shoveTo);
        if (cont === 'fold') {
          setVillainAct(hand, 'fold');
          return finish(hand, { reason: `${opener} foldea ante tu 3-bet shove.`, heroNet: round2(hand.potBB) });
        }
        setVillainAct(hand, 'call', shoveTo);
        hand.villainInvested = shoveTo;
        const callAdd = seatToCall(hand, opener, shoveTo);
        if (callAdd > 0) addInvest(hand, opener, callAdd);
        recalcPot(hand);
        return allInShowdown(hand);
      }
      if (actionId === 'call') {
        setHeroAct(hand, 'call', node.toCallBB);
        hand.heroIsAggressor = false; // el villano (abridor) es el agresor
        hand.heroInvested = node.openSize;
        hand.villainInvested = node.openSize;
        addInvest(hand, hero, node.toCallBB);
        setPreflopSeatBet(hand, hero, node.openSize);
        hand.heroInPosition = inPos(hero, opener);
        if (hand._multiwayPendingCallers && hand._multiwayPendingCallers.length && MW() && MW().allowMultiway(hand)) {
          const openSize = hand._multiwayOpenSize || node.openSize || OPEN;
          const extras = hand._multiwayPendingCallers.filter(function (c) { return c !== opener && c !== hero; });
          ensureCallersPaidOpen(hand, extras.concat([opener]), openSize);
          // Asegurar inversión del opener
          if (seatToCall(hand, opener, openSize) > 0) {
            addInvest(hand, opener, seatToCall(hand, opener, openSize));
          }
          // BB u otras seats tras el héroe deben actuar antes del flop
          seatsYetToActPreflop(hand, hero).forEach(function (p) {
            if (hand.table.folded[p]) {
              hand.table.folded[p] = false;
              hand.table.inHand.add(p);
            }
          });
          const after = resolveSeatsAfterHeroCallOpen(hand, openSize);
          if (after.type === 'face3bet') {
            delete hand._multiwayPendingCallers;
            delete hand._multiwayOpenSize;
            return setupFace3Bet(hand, after.size);
          }
          const bbCallers = after.callers || [];
          const allExtras = extras.concat(bbCallers).filter(function (p, i, arr) {
            return p && p !== opener && p !== hero && arr.indexOf(p) === i && seatStillIn(hand, p);
          });
          const participants = [hero, opener].concat(allExtras);
          foldSeatsExcept(hand, participants);
          MW().markMultiwayHand(hand, allExtras.length >= 2 ? 'srp4way' : 'srp3way', allExtras);
          MW().syncTableToMultiwayPot(hand, allExtras);
          hand.heroInPosition = heroIpMultiway(hand);
          delete hand._multiwayPendingCallers;
          delete hand._multiwayOpenSize;
          recalcPot(hand);
        } else {
          hand.potBB = round2(node.openSize * 2 + SB); // ciega muerta aprox (HU)
          resolvePendingAfterHero(hand);
          recalcPot(hand);
        }
        return goFlop(hand);
      }
      // 3-bet
      hand.heroIsAggressor = true;
      const threeBetSize = node.threeBetSize || round2((node.openSize || OPEN) * 3.5);
      hand.heroInvested = threeBetSize;
      addInvest(hand, hero, round2(threeBetSize - (hand.table.invested[hero] || 0)));
      setHeroAct(hand, 'raise', threeBetSize);
      setPreflopSeatBet(hand, hero, threeBetSize);
      // Seats tras el héroe (BB) enfrentan el 3-bet antes que el opener
      if (hand._multiwayPendingCallers && MW() && MW().allowMultiway(hand)) {
        seatsYetToActPreflop(hand, hero).forEach(function (p) {
          if (hand.table.folded[p]) {
            hand.table.folded[p] = false;
            hand.table.inHand.add(p);
          }
        });
        const behind = respondersAfterHero(hand);
        for (let bi = 0; bi < behind.length; bi++) {
          const bPos = behind[bi];
          const bAct = scriptForcedDefend(hand, bPos) || blindDefendVsOpen(hand, bPos, threeBetSize);
          if (bAct === 'fold' || bAct === '3bet') {
            // ante 3-bet: fold o call (no 4-bet cold aquí)
            if (bAct === 'fold' || C.rng.random() < 0.72) {
              markFolded(hand, bPos);
              setSeatAction(hand, bPos, 'fold', null);
              continue;
            }
          }
          const bAdd = seatToCall(hand, bPos, threeBetSize);
          if (bAdd > 0) addInvest(hand, bPos, bAdd);
          setPreflopSeatBet(hand, bPos, threeBetSize);
          setSeatAction(hand, bPos, 'call', threeBetSize);
        }
      }
      resolvePendingAfterHero(hand);
      let cont = openerVs3Bet(hand, opener, threeBetSize);
      if (cont === 'fold') {
        setVillainAct(hand, 'fold');
        return finish(hand, { reason: `${opener} foldea ante tu 3-bet.`, heroNet: round2(hand.potBB) });
      }
      if (cont === '4bet' && !isForcedSeat(hand, opener)) {
        forceValidOpenerFourBetHand(hand, opener);
        const openerCode = seatHoleCode(hand, opener);
        if (!openerCode || !VPF || !VPF.isInFourBetRange(openerCode, rangeCtx(hand))) {
          cont = 'call';
        }
      }
      if (cont === '4bet') {
        const fbSize = round2(threeBetSize * 2.3);
        hand.villainInvested = fbSize;
        hand.potBB = round2(threeBetSize + fbSize + SB);
        hand.villain.rangeStr = VPF ? VPF.rangeStrFor4Bet(rangeCtx(hand)) : R.VS_3BET.fourBet;
        setVillainAct(hand, 'raise', fbSize);
        return setupFace4Bet(hand, fbSize);
      }
      hand.villain.rangeStr = VPF ? VPF.rangeStrForCall3Bet(rangeCtx(hand)) : (R.VS_3BET.call + ', ' + R.VS_3BET.callMix);
      // villano iguala el 3bet -> flop en bote resubido, hero agresor
      setVillainAct(hand, 'call', threeBetSize);
      hand.villainInvested = threeBetSize;
      const callAdd = seatToCall(hand, opener, threeBetSize);
      if (callAdd > 0) addInvest(hand, opener, callAdd);
      // Cold callers pending también enfrentan el 3-bet
      if (hand._multiwayPendingCallers && hand._multiwayPendingCallers.length) {
        hand._multiwayPendingCallers.forEach(function (cPos) {
          if (!seatStillIn(hand, cPos) || cPos === opener) return;
          const cAct = C.rng.random() < 0.78 ? 'fold' : 'call';
          if (cAct === 'fold') {
            markFolded(hand, cPos);
            setSeatAction(hand, cPos, 'fold', null);
            return;
          }
          const cAdd = seatToCall(hand, cPos, threeBetSize);
          if (cAdd > 0) addInvest(hand, cPos, cAdd);
          setPreflopSeatBet(hand, cPos, threeBetSize);
          setSeatAction(hand, cPos, 'call', threeBetSize);
        });
      }
      recalcPot(hand);
      hand.heroInPosition = heroIpMultiway(hand);
      delete hand._multiwayPendingCallers;
      delete hand._multiwayOpenSize;
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
      let tbAct = scriptForcedVs4Bet(hand, tb);
      if (!tbAct) {
        tbAct = 'fold';
        if (VPF && tbCode) {
          tbAct = VPF.villainVs4BetAction(tbCode, tbProf, C.rng.random());
        } else {
          tbAct = C.rng.random() < 0.58 ? 'fold' : 'call';
        }
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
    foldSeatsAfterRaiseUntil(hand, tb, opener, [opener, tb]);
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
      context: 'Eres SB con acción folded to you. ¿Fold, limpear o raise?'
    };
    markFoldedBeforeHeroRFI(hand);
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
    foldSeatsAfterRaiseUntil(hand, hero, opener, [hero, opener]);
    setupFace4Bet(hand, fourBetSize);
  }

  function setupFace3Bet(hand, tbSize) {
    // Héroe sin fichas: no hay decisión legal (p.ej. shove ya metido).
    if (heroRemainingBB(hand) <= 0.01) return allInShowdown(hand);
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
    return prepareAllInRunout(hand);
  }

  // ----- Acciones visibles (para la UI) -----
  function beginReveal(hand) {
    if (!hand) return;
    hand._reveal = [];
    hand._recordingReveal = true;
  }
  function endReveal(hand) {
    if (!hand) return;
    hand._recordingReveal = false;
  }
  function pushReveal(hand, ev) {
    if (!hand || !hand._recordingReveal || !ev) return;
    hand._reveal = hand._reveal || [];
    hand._reveal.push(ev);
  }
  function recordVisibleAction(hand, pos, type, amount, flags) {
    if (!hand || !hand._recordingReveal || !pos || !type) return;
    const list = hand._reveal || [];
    const last = list[list.length - 1];
    if (last && last.kind === 'act' && last.pos === pos && last.type === type) {
      if (amount != null) last.amount = amount;
      if (hand.table && hand.table.streetBet) last.streetTo = hand.table.streetBet[pos] || last.streetTo;
      if (hand.table && hand.table.invested) last.invested = hand.table.invested[pos];
      last.potBB = hand.potBB;
      if (flags && flags.isHero) last.isHero = true;
      return;
    }
    const ev = {
      kind: 'act',
      pos: pos,
      type: type,
      amount: amount != null ? amount : null,
      isHero: !!(flags && flags.isHero),
      potBB: hand.potBB
    };
    if (hand.table) {
      if (hand.table.streetBet) ev.streetTo = hand.table.streetBet[pos] != null ? hand.table.streetBet[pos] : amount;
      if (hand.table.invested) ev.invested = hand.table.invested[pos];
    }
    pushReveal(hand, ev);
  }
  function recordStreet(hand) {
    if (!hand) return;
    pushReveal(hand, {
      kind: 'street',
      street: hand.stage,
      board: (hand.board || []).slice(),
      potBB: hand.potBB
    });
  }

  function setHeroAct(hand, type, amount) {
    hand.heroAction = { type, amount: amount != null ? amount : null };
    if (hand.table && hand.hero.pos && amount > 0 && ['bet', 'call', 'raise', 'open'].indexOf(type) >= 0) {
      hand.table.streetBet[hand.hero.pos] = round2((hand.table.streetBet[hand.hero.pos] || 0) + amount);
    }
    recordVisibleAction(hand, heroTableSeat(hand) || (hand.hero && hand.hero.pos), type, amount, { isHero: true });
  }
  function setVillainAct(hand, type, amount) {
    hand.villainAction = { type, amount: amount != null ? amount : null };
    if (type === 'fold' && hand.villain.pos) markFolded(hand, villainTableSeat(hand) || hand.villain.pos);
    if (hand.table && hand.villain.pos && amount > 0 && ['bet', 'call', 'raise', 'open'].indexOf(type) >= 0) {
      hand.table.streetBet[hand.villain.pos] = round2((hand.table.streetBet[hand.villain.pos] || 0) + amount);
    }
    recordVisibleAction(hand, villainTableSeat(hand) || (hand.villain && hand.villain.pos), type, amount);
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
    const pfOpts = villainPostflopOpts(hand, info, hand.villain.cards);
    if (VP) return VP.postflopLead(strength, profile, villainIsAgg, C.rng.random(), pfOpts);
    const betFreq = villainIsAgg
      ? clamp(0.12 + strength * 0.55, 0.08, 0.68)
      : clamp(0.04 + strength * 0.28, 0.03, 0.38);
    return C.rng.random() < betFreq ? 'bet' : 'check';
  }

  // ----- Transición a flop / showdown (usa el board pre-repartido) -----
  function goFlop(hand) {
    const vSeat = villainTableSeat(hand) || hand.villain.pos;
    const keepMulti = !!(hand.multiway && MW() && MW().allowMultiway(hand));
    if (hand._callersAtFlop && hand._callersAtFlop.length) {
      if (keepMulti) {
        MW().syncTableToMultiwayPot(hand, hand._callersAtFlop);
      } else {
        // El pagador del squeeze puede pasar a ser el villano si el abridor foldea; no marcarlo fold.
        hand._callersAtFlop.forEach(function (pos) {
          if (pos !== vSeat) markFolded(hand, pos);
        });
      }
      if (!keepMulti) delete hand._callersAtFlop;
    }
    if (keepMulti) {
      MW().syncTableToMultiwayPot(hand, hand._callersAtFlop || []);
      MW().syncOpponents(hand);
    } else {
      syncTableToActivePot(hand);
    }
    syncVillainMeta(hand);
    hand.stage = 'flop';
    hand.villain.cards = villainHoleCards(hand);
    if (!hand.villainRangeTracker) initVillainTracker(hand);
    resetStreetBets(hand);
    hand.board = hand._predeal.board.slice(0, 3);
    hand._boardIdx = 3;
    if (hand.multiway) hand.heroInPosition = heroIpMultiway(hand);
    recalcPot(hand);
    recordStreet(hand);
    return enterStreet(hand);
  }

  function nextStreet(hand) {
    if (noMoreBetting(hand)) return prepareAllInRunout(hand);
    const map = { flop: 'turn', turn: 'river' };
    const ns = map[hand.stage];
    if (!ns) return showdown(hand);
    hand.stage = ns;
    resetStreetBets(hand);
    hand.board.push(hand._predeal.board[hand._boardIdx++]);
    recordStreet(hand);
    return enterStreet(hand);
  }

  /**
   * Entrada a una calle postflop. Si el héroe está en posición, el villano
   * actúa primero (su check/apuesta queda visible antes de la decisión del héroe).
   */
  function enterStreet(hand) {
    clearStreetActions(hand);
    // All-in: no hay más apuestas → runout de comunitarias.
    if (noMoreBetting(hand)) return prepareAllInRunout(hand);
    if (isMultiwayLive(hand)) {
      return enterStreetMultiway(hand);
    }
    if (hand.heroInPosition && hand.villain.cards) {
      if (villainRemainingBB(hand) <= 0.01) {
        return prepareAllInRunout(hand);
      }
      const forcedLead = scriptForcedLead(hand);
      const vAct = forcedLead ? forcedLead.type : villainStreetOpen(hand);
      if (vAct === 'bet') {
        const vBet = forcedLead && forcedLead.amountBB != null
          ? scriptBetAmount(hand, forcedLead.amountBB)
          : villainBetAmount(hand);
        if (!isMeaningfulBet(vBet)) {
          setVillainAct(hand, 'check');
          const h = buildPostflopNode(hand, hand.stage);
          hand.current.heroClosesOnCheck = true;
          return h;
        }
        hand.villainInvested += vBet; hand.potBB = round2(hand.potBB + vBet);
        setVillainAct(hand, 'bet', vBet);
        // Si el héroe ya no tiene stack, no pedir Call(0.00): runout.
        if (heroRemainingBB(hand) <= 0.01) return prepareAllInRunout(hand);
        return buildPostflopNode(hand, hand.stage, { bet: vBet, potBefore: round2(hand.potBB - vBet) });
      }
      // el villano pasa: su Check queda visible y el héroe decide check/bet
      setVillainAct(hand, 'check');
      const h = buildPostflopNode(hand, hand.stage);
      hand.current.heroClosesOnCheck = true; // si el héroe pasa, la calle se cierra
      return h;
    }
    // héroe fuera de posición: actúa primero
    if (heroRemainingBB(hand) <= 0.01) return prepareAllInRunout(hand);
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
    const toCallBB = facing && isMeaningfulBet(facing.bet) ? facing.bet : 0;
    const potBeforeBB = facing && isMeaningfulBet(facing.bet)
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
    const heroEquity = (hand.multiway && MW() && GTO.Equity && GTO.Equity.equityVsN)
      ? GTO.Equity.equityVsN(
        hand.hero.cards,
        hand.board,
        (hand.opponents || MW().buildOpponents(hand)).map(function (o) {
          return o.cards ? { cards: o.cards } : { rangeStr: o.rangeStr || baseRange };
        }),
        220,
        { street: street, facingBet: !!toCallBB }
      )
      : (GTO.computeHeroEquity
      ? GTO.computeHeroEquity({
        street, board: hand.board.slice(), heroCards: hand.hero.cards,
        villainRange, potBB: hand.potBB, toCallBB, potBeforeBB,
        villainLastAction, madeHandInfo: info,
        initiative: hand.heroIsAggressor ? 'aggressor' : 'caller',
        inPosition: hand.heroInPosition
      })
      : equityVsRange(hand.hero.cards, hand.board, villainRange, 400, {
        street, facingBet: !!toCallBB
      }));

    let options, heroLastAction = null, context;
    const fmt = global.GTOPotMath ? global.GTOPotMath.formatBB : (x) => String(round2(x));
    if (facing && isMeaningfulBet(facing.bet)) {
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
      const seenBetKeys = new Set();
      sizes.forEach(function (s) {
        const capped = capBetForSeat(hand, hand.hero.pos, s.size);
        if (capped >= 0.5) {
          const id = s.id;
          const isAllIn = capped >= heroRemainingBB(hand) - 0.01;
          const dedupeKey = isAllIn ? ('allin:' + fmt(capped)) : id;
          if (seenBetKeys.has(dedupeKey)) return;
          seenBetKeys.add(dedupeKey);
          options.push({ id: id, label: isAllIn ? `All-in (${fmt(capped)}bb)` : s.label.replace(String(s.size), String(capped)) });
          hand._betSizes[id] = capped;
        }
      });
      context = `${capitalize(street)}: bote ${fmt(hand.potBB)}bb · stack ${fmt(effStackForHand(hand))}bb. Eres ${hand.heroIsAggressor ? 'el agresor' : 'el que cierra'} ${hand.heroInPosition ? 'en posición' : 'fuera de posición'}.`;
      if (hand.multiway) {
        const n = MW() ? MW().aliveCount(hand) : 3;
        context += ` Bote multiway (${n}-way${hand.potType ? ', ' + hand.potType : ''}): c-bet más selectivo, menos faroles.`;
      }
      if (hand.heroIsAggressor) {
        const priorLead = heroLedOnPriorStreets(hand, street);
        const leadLabel = (global.GTOSpotKey && global.GTOSpotKey.aggressorLeadLabel)
          ? global.GTOSpotKey.aggressorLeadLabel(street, priorLead)
          : (street === 'flop' ? 'c-bet'
            : (priorLead
              ? (street === 'turn' ? 'segundo barrel' : 'tercer barrel')
              : 'delayed c-bet'));
        context += villainLastAction === 'check'
          ? ` El villano pasó: spot de ${leadLabel}.`
          : ` Spot de ${leadLabel} (eres el agresor preflop).`;
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
      const remBefore = heroRemainingBB(hand);
      betSize = capBetForSeat(hand, hand.hero.pos, betSize);
      if (betSize <= 0) return finish(hand, { reason: 'Sin stack para apostar.', heroNet: -round2(hand.heroInvested) });
      const heroShoved = betSize >= remBefore - 0.01;
      hand.heroInvested += betSize; hand.potBB = round2(hand.potBB + betSize);
      if (hand.table && hand.hero.pos) addInvest(hand, hand.hero.pos, betSize);
      node.heroLastAction = 'bet';
      setHeroAct(hand, heroShoved ? 'allin' : 'bet', betSize);
      if (hand.multiway && MW() && MW().aliveCount(hand) >= 3) {
        const mw = resolveMultiwayFacingHeroBet(hand, betSize);
        if (mw.type === 'foldWin') {
          return finish(hand, { reason: `Todos foldean ante tu apuesta en ${node.street} (multiway).`, heroNet: round2(hand.potBB - betSize) });
        }
        if (mw.type === 'raise') {
          hand.villain.pos = mw.raiser;
          hand.villain.cards = villainHoleCards(hand);
          syncVillainMeta(hand);
          if (heroRemainingBB(hand) <= 0.01) return prepareAllInRunout(hand);
          return buildPostflopNode(hand, node.street, { bet: round2(mw.raiseSize), potBefore: hand.potBB });
        }
        if (heroShoved || noMoreBetting(hand)) return prepareAllInRunout(hand);
        return nextStreet(hand);
      }
      const vAct = villainPostflopAction(hand, node);
      if (vAct === 'fold') { setVillainAct(hand, 'fold'); return finish(hand, { reason: `El villano foldea ante tu apuesta en ${node.street}.`, heroNet: round2(hand.potBB - betSize) }); }
      if (vAct === 'raise') {
        let vRaise = takeScriptedOrDefaultBet(hand, capBetForSeat(hand, hand.villain.pos, round2(betSize * 3)));
        if (vRaise <= betSize) vRaise = capBetForSeat(hand, hand.villain.pos, heroRemainingBB(hand));
        hand.villainInvested += vRaise; hand.potBB = round2(hand.potBB + vRaise);
        if (hand.table && hand.villain.pos) addInvest(hand, hand.villain.pos, vRaise);
        setVillainAct(hand, 'raise', vRaise);
        if (heroRemainingBB(hand) <= 0.01) return prepareAllInRunout(hand);
        return buildPostflopNode(hand, node.street, { bet: round2(vRaise), potBefore: hand.potBB });
      }
      hand._scriptedVillainAmountBB = null;
      setVillainAct(hand, 'call', betSize);
      hand.villainInvested += betSize; hand.potBB = round2(hand.potBB + betSize);
      if (hand.table && hand.villain.pos) addInvest(hand, hand.villain.pos, betSize);
      if (heroShoved || noMoreBetting(hand)) return prepareAllInRunout(hand);
      return nextStreet(hand);
    }

    if (actionId === 'check') {
      setHeroAct(hand, 'check');
      setSeatAction(hand, hand.hero.pos, 'check', null);
      // Héroe ya all-in: no hay acción del villano, reparte el resto.
      if (heroRemainingBB(hand) <= 0.01) return prepareAllInRunout(hand);
      // si el villano ya había pasado (héroe en posición cerrando), la calle termina
      if (node.heroClosesOnCheck) return nextStreet(hand);
      node.heroLastAction = 'check';
      if (isMultiwayLive(hand)) {
        return resolveMultiwayAfterHeroCheck(hand);
      }
      if (villainRemainingBB(hand) <= 0.01) {
        setVillainAct(hand, 'check');
        return prepareAllInRunout(hand);
      }
      const vAct = villainPostflopAction(hand, node);
      if (vAct === 'check') { setVillainAct(hand, 'check'); return nextStreet(hand); }
      // villano apuesta -> hero afronta apuesta
      const vBet = takeScriptedOrDefaultBet(hand, villainBetAmount(hand));
      if (!isMeaningfulBet(vBet)) {
        setVillainAct(hand, 'check');
        return nextStreet(hand);
      }
      hand.villainInvested += vBet; hand.potBB = round2(hand.potBB + vBet);
      setVillainAct(hand, 'bet', vBet);
      if (heroRemainingBB(hand) <= 0.01) return prepareAllInRunout(hand);
      return buildPostflopNode(hand, node.street, { bet: vBet, potBefore: round2(hand.potBB - vBet) });
    }

    if (actionId === 'call') {
      const heroRem = heroRemainingBB(hand);
      const toCall = Math.min(node.toCallBB, heroRem);
      const isAllIn = heroRem <= 0.01 || toCall >= heroRem - 0.01;
      hand.heroInvested += toCall; hand.potBB = round2(hand.potBB + toCall);
      if (hand.table && hand.hero.pos) addInvest(hand, hand.hero.pos, toCall);
      setHeroAct(hand, isAllIn ? 'allin' : 'call', toCall);
      if (isAllIn || villainRemainingBB(hand) <= 0.01) return prepareAllInRunout(hand);
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
      if (isMultiwayLive(hand)) {
        const mw = resolveMultiwayFacingHeroBet(hand, raiseTo);
        if (mw.type === 'foldWin') {
          return finish(hand, { reason: `Todos foldean ante tu raise en ${node.street} (multiway).`, heroNet: round2(hand.potBB - raiseTo) });
        }
        if (mw.type === 'raise') {
          hand.villain.pos = mw.raiser;
          hand.villain.cards = villainHoleCards(hand);
          syncVillainMeta(hand);
          if (heroRemainingBB(hand) <= 0.01) return prepareAllInRunout(hand);
          return buildPostflopNode(hand, node.street, { bet: round2(mw.raiseSize), potBefore: hand.potBB });
        }
        if (isAllIn || noMoreBetting(hand)) return prepareAllInRunout(hand);
        return nextStreet(hand);
      }
      if (isAllIn) {
        const vAct = villainPostflopAction(hand, node);
        if (vAct === 'fold') { setVillainAct(hand, 'fold'); return finish(hand, { reason: `El villano foldea ante tu all-in en ${node.street}.`, heroNet: round2(hand.potBB - raiseTo) }); }
        const vPay = capBetForSeat(hand, hand.villain.pos, raiseTo);
        setVillainAct(hand, 'call', vPay);
        hand.villainInvested += vPay;
        if (hand.table && hand.villain.pos) addInvest(hand, hand.villain.pos, vPay);
        return prepareAllInRunout(hand);
      }
      const vAct = villainPostflopAction(hand, node);
      if (vAct === 'fold') { setVillainAct(hand, 'fold'); return finish(hand, { reason: `El villano foldea ante tu raise en ${node.street}.`, heroNet: round2(hand.potBB - raiseTo) }); }
      const vCall = capBetForSeat(hand, hand.villain.pos, raiseTo);
      setVillainAct(hand, 'call', vCall);
      hand.villainInvested += vCall; hand.potBB = round2(hand.potBB + (vCall - node.toCallBB));
      if (hand.table && hand.villain.pos) addInvest(hand, hand.villain.pos, vCall);
      if (noMoreBetting(hand)) return prepareAllInRunout(hand);
      return nextStreet(hand);
    }

    return finish(hand, { reason: 'Mano terminada.', heroNet: 0 });
  }

  // ----- Showdown -----
  function showdown(hand) {
    if (hand.multiway && MW() && MW().aliveCount(hand) >= 3) {
      const res = MW().resolveShowdown(hand, C);
      return finish(hand, res);
    }
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
    if (hand.multiway && MW() && MW().allowMultiway(hand)) {
      MW().syncTableToMultiwayPot(hand, hand._callersAtFlop || []);
    } else {
      syncTableToActivePot(hand);
    }
    hand.stage = 'complete';
    hand.replaySnapshot = {
      scenario: Object.assign({}, hand.scenario || {}),
      seed: hand.seed,
      playConfig: hand.playConfig ? Object.assign({}, hand.playConfig) : null,
      displayHeroPos: hand.displayHeroPos || null,
      forceDeal: cloneForceDeal(hand.forceDeal),
      forceScript: cloneForceScript(hand.forceScript),
      multiway: !!hand.multiway,
      potType: hand.potType || null
    };
    const totalEvLoss = erroneousEvLoss(hand);
    const errors = hand.decisions.filter((d) => d.class === 'error' || d.class === 'imprecisa');
    const handScoreMeta = (global.GTOScoring && global.GTOScoring.scoreHand)
      ? global.GTOScoring.scoreHand(hand.decisions, totalEvLoss)
      : { score: totalEvLoss <= 0.01 && !errors.length ? 10 : 0, allOptimal: !errors.length, allGood: !errors.length };
    hand.current = null;
    if (MW()) MW().syncOpponents(hand);
    hand.result = Object.assign({
      heroNet: 0, showdown: false, totalEvLoss,
      nErrors: errors.length,
      handScore: handScoreMeta.score,
      handScoreMeta: handScoreMeta,
      villainCards: hand.villain.cards,
      villainPos: hand.villain.pos,
      villainProfile: hand.villain.profileLabel,
      villainProfileShort: hand.villain.profileShort,
      board: hand.board.slice(),
      villainRangeSummary: VT ? VT.buildHandSummary(hand.villainRangeTracker) : null,
      villainRangeLog: hand.villainRangeTracker ? hand.villainRangeTracker.log.slice() : [],
      multiway: !!hand.multiway,
      potType: hand.potType || 'hu',
      opponents: hand.opponents || null,
      aliveCount: MW() ? MW().aliveCount(hand) : 2
    }, res);
    hand.handScore = handScoreMeta.score;
    hand.handScoreMeta = handScoreMeta;
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

  function actionOrderForHand(hand) {
    const PC = global.PTPlayConfig;
    if (PC && hand && hand.playConfig && PC.is3Max && PC.is3Max(hand.playConfig)) {
      return ['BTN', 'SB', 'BB'];
    }
    return preflopOrderForHand(hand);
  }

  function scriptSeat(hand, engPos) {
    if (!engPos) return engPos;
    const hero = heroTableSeat(hand);
    const vill = villainTableSeat(hand);
    if (engPos === hero || (hand.hero && engPos === hand.hero.pos)) return hero;
    if (vill && (engPos === vill || (hand.villain && engPos === hand.villain.pos))) return vill;
    const order = actionOrderForHand(hand);
    if (order.indexOf(engPos) >= 0) return engPos;
    const mapped = tableSeatForEnginePos(hand, engPos);
    if (mapped && order.indexOf(mapped) >= 0) return mapped;
    return engPos;
  }

  function scriptEvent(pos, type, amount, extra) {
    const ev = { kind: 'act', pos: pos, type: type, amount: amount != null ? amount : null };
    if (extra) Object.keys(extra).forEach(function (k) { ev[k] = extra[k]; });
    return ev;
  }

  function foldsUntil(order, endPos, except) {
    const skip = {};
    (except || []).forEach(function (p) { if (p) skip[p] = true; });
    const end = order.indexOf(endPos);
    const out = [];
    const last = end < 0 ? order.length : end;
    for (let i = 0; i < last; i++) {
      if (skip[order[i]]) continue;
      out.push(scriptEvent(order[i], 'fold', null));
    }
    return out;
  }

  function foldsBetween(order, fromPos, toPos, except) {
    const skip = {};
    (except || []).forEach(function (p) { if (p) skip[p] = true; });
    const a = order.indexOf(fromPos);
    const b = order.indexOf(toPos);
    const out = [];
    if (a < 0 || b < 0 || b <= a) return out;
    for (let i = a + 1; i < b; i++) {
      if (skip[order[i]]) continue;
      out.push(scriptEvent(order[i], 'fold', null));
    }
    return out;
  }

  /** Folds from the seat after fromPos, wrapping the table, until toPos. */
  function foldsAfterUntil(order, fromPos, toPos, except) {
    const skip = {};
    (except || []).forEach(function (p) { if (p) skip[p] = true; });
    const a = order.indexOf(fromPos);
    const b = order.indexOf(toPos);
    const out = [];
    if (a < 0 || b < 0 || a === b) return out;
    for (let i = 1; i < order.length; i++) {
      const pos = order[(a + i) % order.length];
      if (pos === toPos) break;
      if (skip[pos]) continue;
      out.push(scriptEvent(pos, 'fold', null));
    }
    return out;
  }

  function seatActAmount(hand, pos, fallback) {
    const a = hand.seatActions && hand.seatActions[pos];
    if (a && a.amount != null) return a.amount;
    return fallback;
  }

  /** Guion visual preflop: UTG→héroe, con acciones automáticas del héroe (open/3-bet). */
  function buildOpeningActionScript(hand) {
    if (!hand || !hand.scenario) return [];
    const s = hand.scenario;
    const order = actionOrderForHand(hand);
    const hero = heroTableSeat(hand);
    const events = [];
    if (!hero || order.indexOf(hero) < 0) return events;

    function openSize(pos) {
      return pos === 'SB' ? SB_OPEN : OPEN;
    }

    if (s.type === 'RFI' || s.type === 'sbLimp') {
      return foldsUntil(order, hero);
    }

    if (s.type === 'vsRFI') {
      const opener = scriptSeat(hand, (hand.villain && hand.villain.pos) || parseVsKey(s.key).opener);
      const amt = seatActAmount(hand, opener, openSize(opener));
      events.push.apply(events, foldsUntil(order, opener));
      events.push(scriptEvent(opener, 'open', amt));
      events.push.apply(events, foldsBetween(order, opener, hero));
      return events;
    }

    if (s.type === 'face3bet') {
      const pk = parseFace3betKey(s.key);
      const opener = scriptSeat(hand, pk.opener || hero);
      const tb = scriptSeat(hand, (hand.villain && hand.villain.pos) || pk.threeBettor);
      const oAmt = seatActAmount(hand, opener, openSize(opener)) || hand.heroInvested || OPEN;
      const tbAmt = seatActAmount(hand, tb, hand.villainInvested);
      events.push.apply(events, foldsUntil(order, opener));
      events.push(scriptEvent(opener, 'open', oAmt, { autoHero: opener === hero }));
      events.push.apply(events, foldsBetween(order, opener, tb, [hero]));
      events.push(scriptEvent(tb, 'raise', tbAmt));
      const acted = events.map(function (e) { return e.pos; }).concat([hero, tb, opener]);
      events.push.apply(events, foldsAfterUntil(order, tb, opener, acted));
      return events;
    }

    if (s.type === 'face4bet') {
      const pk = parseVsKey(s.key);
      const opener = scriptSeat(hand, (hand.villain && hand.villain.pos) || pk.opener);
      const oAmt = openSize(opener);
      const tbAmt = hand.heroInvested;
      const fbAmt = hand.villainInvested;
      events.push.apply(events, foldsUntil(order, opener));
      events.push(scriptEvent(opener, 'open', oAmt));
      events.push.apply(events, foldsBetween(order, opener, hero));
      events.push(scriptEvent(hero, 'raise', tbAmt, { autoHero: true }));
      const acted4 = events.map(function (e) { return e.pos; }).concat([hero, opener]);
      events.push.apply(events, foldsAfterUntil(order, hero, opener, acted4));
      events.push(scriptEvent(opener, 'raise', fbAmt));
      return events;
    }

    if (s.type === 'squeeze' || s.type === 'squeezeMulti') {
      const opener = scriptSeat(hand, s.openerPos || (hand.villain && hand.villain.pos));
      const caller = scriptSeat(hand, s.callerPos);
      const oAmt = seatActAmount(hand, opener, OPEN);
      const cAmt = seatActAmount(hand, caller, oAmt);
      events.push.apply(events, foldsUntil(order, opener));
      events.push(scriptEvent(opener, 'open', oAmt));
      events.push.apply(events, foldsBetween(order, opener, caller));
      events.push(scriptEvent(caller, 'call', cAmt));
      events.push.apply(events, foldsBetween(order, caller, hero));
      return events;
    }

    if (s.type === 'isoLimp') {
      const limper = scriptSeat(hand, s.limperPos || (hand.villain && hand.villain.pos));
      events.push.apply(events, foldsUntil(order, limper));
      events.push(scriptEvent(limper, 'call', BBET));
      events.push.apply(events, foldsBetween(order, limper, hero));
      return events;
    }

    if (s.type === 'bbVsSbLimp') {
      events.push.apply(events, foldsUntil(order, 'SB'));
      events.push(scriptEvent('SB', 'call', BBET));
      return events;
    }

    if (s.type === 'cold4bet') {
      const opener = scriptSeat(hand, s.openerPos);
      const tb = scriptSeat(hand, s.threeBettorPos || (hand.villain && hand.villain.pos));
      const oAmt = seatActAmount(hand, opener, OPEN);
      const tbAmt = seatActAmount(hand, tb, hand.villainInvested);
      events.push.apply(events, foldsUntil(order, opener));
      events.push(scriptEvent(opener, 'open', oAmt));
      events.push.apply(events, foldsBetween(order, opener, tb));
      events.push(scriptEvent(tb, 'raise', tbAmt));
      events.push.apply(events, foldsBetween(order, tb, hero));
      return events;
    }

    if (s.type === 'srp3way' || s.type === 'srp4way') {
      const opener = scriptSeat(hand, s.openerPos || (hand.villain && hand.villain.pos));
      const callers = (s.callerPositions || (s.callerPos ? [s.callerPos] : [])).map(function (p) {
        return scriptSeat(hand, p);
      }).filter(function (p) { return p && p !== opener && p !== hero; });
      const oAmt = seatActAmount(hand, opener, openSize(opener));
      events.push.apply(events, foldsUntil(order, opener));
      events.push(scriptEvent(opener, 'open', oAmt));
      let prev = opener;
      callers.forEach(function (cPos) {
        events.push.apply(events, foldsBetween(order, prev, cPos));
        events.push(scriptEvent(cPos, 'call', oAmt));
        prev = cPos;
      });
      events.push.apply(events, foldsBetween(order, prev, hero));
      return events;
    }

    if (s.type === 'limpPot') {
      const limpers = (s.limperPositions || (s.limperPos ? [s.limperPos] : [])).map(function (p) {
        return scriptSeat(hand, p);
      }).filter(Boolean);
      let prev = null;
      limpers.forEach(function (lp) {
        if (prev) events.push.apply(events, foldsBetween(order, prev, lp));
        else events.push.apply(events, foldsUntil(order, lp));
        events.push(scriptEvent(lp, 'call', BBET));
        prev = lp;
      });
      if (prev) events.push.apply(events, foldsBetween(order, prev, hero));
      return events;
    }

    return events;
  }

  function postflopOrderForScript(hand) {
    if (MW() && MW().postflopOrderFor) return MW().postflopOrderFor(hand);
    const PC = global.PTPlayConfig;
    if (PC && hand.playConfig && PC.is3Max && PC.is3Max(hand.playConfig)) return ['SB', 'BB', 'BTN'];
    if (is9MaxHand(hand) && PC) return ['SB', 'BB', 'UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN'];
    return POSTFLOP_ORDER.slice();
  }

  /** Acciones ya aplicadas en la calle actual antes de la decisión del héroe. */
  function buildStreetIntroScript(hand) {
    if (!hand || hand.stage === 'preflop' || hand.stage === 'complete') return [];
    const events = [];
    events.push({
      kind: 'street',
      street: hand.stage,
      board: (hand.board || []).slice(),
      potBB: hand.potBB
    });
    const order = postflopOrderForScript(hand);
    const hero = heroTableSeat(hand);
    const heroIdx = order.indexOf(hero);
    const before = heroIdx >= 0 ? order.slice(0, heroIdx) : order;
    const villSeat = villainTableSeat(hand) || (hand.villain && hand.villain.pos);
    before.forEach(function (pos) {
      if (hand.table && hand.table.folded && hand.table.folded[pos]) return;
      const act = (hand.seatActions && hand.seatActions[pos])
        || (pos === villSeat && hand.villainAction ? hand.villainAction : null);
      if (act && act.type) {
        events.push({
          kind: 'act',
          pos: pos,
          type: act.type,
          amount: act.amount != null ? act.amount : null,
          streetTo: act.amount,
          potBB: hand.potBB,
          invested: hand.table && hand.table.invested ? hand.table.invested[pos] : 0
        });
      }
    });
    return events;
  }

  global.Engine = {
    newHand, act, previewAdvice, syncTableInvested, fastForwardToStreet,
    advanceRunout, prepareAllInRunout, currentMatchesPracticeIntent,
    applyAnteToHand, buildSpotInput,
    buildOpeningActionScript, buildStreetIntroScript,

    // utilidades expuestas para UI/tests/importador
    handStrength01, equityVsRange, classifyMadeHand, sampleHandFromRange,
    rfiStrategy, vsRfiStrategy, classify,
    postflopStrategy, boardTexture, preflopEvLoss, postflopEvLoss, round2,
    buildMatrixInput,
    // multiway
    goFlopForTest: goFlop,
    multiwayAliveCount: function (hand) { return MW() ? MW().aliveCount(hand) : 0; },
    allowMultiway: function (hand) { return MW() ? MW().allowMultiway(hand) : false; }
  };
})(window);
