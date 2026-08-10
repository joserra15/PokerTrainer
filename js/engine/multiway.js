/*
 * multiway.js — Utilidades para botes multiway en el entrenador.
 * Side pots, seats vivas, equity N-way y tipado de pot.
 */
(function (global) {
  'use strict';

  const POSTFLOP_ORDER_6 = ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];
  const POSTFLOP_ORDER_9 = ['SB', 'BB', 'UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN'];
  const POSTFLOP_ORDER_SPIN = ['SB', 'BB', 'BTN'];

  function round2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  function postflopOrderFor(hand) {
    const PC = global.PTPlayConfig;
    if (hand && hand.playConfig && PC) {
      if (PC.isSpin && PC.isSpin(hand.playConfig)) return POSTFLOP_ORDER_SPIN.slice();
      if (PC.is9Max && PC.is9Max(hand.playConfig)) return POSTFLOP_ORDER_9.slice();
    }
    return POSTFLOP_ORDER_6.slice();
  }

  function allowMultiway(hand) {
    if (!hand) return false;
    const cfg = hand.playConfig || {};
    if (cfg.allowMultiway === false) return false;
    const st = hand.scenario && hand.scenario.type;
    if (st === 'srp3way' || st === 'srp4way' || st === 'limpPot' || st === 'squeezeMulti') return true;
    if (cfg.scenario === 'multiway') return true;
    if (cfg.allowMultiway === true) return true;
    // Random (y escenarios con multi-call orgánico): on por defecto salvo spins cortos
    if (cfg.scenario === 'random' || !cfg.scenario) {
      if (PCIsSpin(cfg) && (cfg.stackBB || 25) <= 12) return false;
      return true;
    }
    return true;
  }

  function PCIsSpin(cfg) {
    const PC = global.PTPlayConfig;
    return !!(PC && PC.isSpin && PC.isSpin(cfg));
  }

  function aliveSeats(hand) {
    if (!hand || !hand.table || !hand.table.inHand) return [];
    const order = postflopOrderFor(hand);
    const out = [];
    order.forEach(function (pos) {
      if (hand.table.inHand.has(pos) && !hand.table.folded[pos]) out.push(pos);
    });
    // seats no en order canónico
    hand.table.inHand.forEach(function (pos) {
      if (out.indexOf(pos) < 0 && !hand.table.folded[pos]) out.push(pos);
    });
    return out;
  }

  function aliveCount(hand) {
    return aliveSeats(hand).length;
  }

  function isMultiway(hand) {
    return !!(hand && (hand.multiway || aliveCount(hand) >= 3));
  }

  function potTypeFromAlive(n, forced) {
    if (forced) return forced;
    if (n >= 4) return 'srp4way';
    if (n === 3) return 'srp3way';
    return 'hu';
  }

  function buildOpponents(hand) {
    const hero = hand.hero && hand.hero.pos;
    return aliveSeats(hand).filter(function (p) { return p !== hero; }).map(function (pos) {
      const hc = hand.table.holeCards[pos];
      const prof = global.GTOVillainProfiles
        ? global.GTOVillainProfiles.profileForHand(hand, pos)
        : { id: 'tag', label: 'TAG', shortLabel: 'Tight-agresivo' };
      return {
        pos: pos,
        cards: hc && hc.length >= 2 ? hc.slice() : null,
        rangeStr: (hand.villain && hand.villain.pos === pos) ? hand.villain.rangeStr : null,
        profileId: prof.id,
        profileLabel: prof.label,
        profileShort: prof.shortLabel,
        invested: round2((hand.table.invested && hand.table.invested[pos]) || 0)
      };
    });
  }

  function syncOpponents(hand) {
    hand.opponents = buildOpponents(hand);
    const n = aliveCount(hand);
    hand.multiway = n >= 3;
    if (hand.multiway && !hand.potType) {
      hand.potType = potTypeFromAlive(n, hand.scenario && hand.scenario.potType);
    }
    if (!hand.multiway && hand.potType !== 'limpPot') hand.potType = 'hu';
    return hand.opponents;
  }

  /** Mantiene vivos héroe + todos los callers/oponentes listados. */
  function syncTableToMultiwayPot(hand, extraAlive) {
    if (!hand || !hand.table || !hand.hero || !hand.hero.pos) return;
    const alive = new Set([hand.hero.pos]);
    if (hand.villain && hand.villain.pos) alive.add(hand.villain.pos);
    (extraAlive || []).forEach(function (p) { if (p) alive.add(p); });
    (hand._callersAtFlop || []).forEach(function (p) { if (p) alive.add(p); });
    if (hand.opponents) {
      hand.opponents.forEach(function (o) { if (o && o.pos) alive.add(o.pos); });
    }
    // No foldear seats ya marcadas inHand que están en alive; sí foldear el resto
    const positions = [];
    if (hand.table.inHand) {
      hand.table.inHand.forEach(function (p) { positions.push(p); });
    }
    Object.keys(hand.table.holeCards || {}).forEach(function (p) {
      if (positions.indexOf(p) < 0) positions.push(p);
    });
    positions.forEach(function (pos) {
      if (!alive.has(pos) && hand.table.inHand.has(pos)) {
        hand.table.folded[pos] = true;
        hand.table.inHand.delete(pos);
      }
    });
    // Asegurar alive en inHand
    alive.forEach(function (pos) {
      if (hand.table.holeCards[pos] || pos === hand.hero.pos) {
        hand.table.folded[pos] = false;
        hand.table.inHand.add(pos);
      }
    });
    syncOpponents(hand);
  }

  function markMultiwayHand(hand, potType, callers) {
    hand.multiway = true;
    hand.potType = potType || potTypeFromAlive((callers || []).length + 2);
    hand._callersAtFlop = (callers || []).slice();
    syncOpponents(hand);
  }

  /**
   * Side pots a partir de inversiones por seat.
   * Devuelve [{amount, eligible: [pos,...]}, ...] ordenados de main a side.
   */
  function computeSidePots(investedByPos, alivePositions) {
    const alive = (alivePositions || []).slice();
    const levels = alive
      .map(function (p) { return round2(investedByPos[p] || 0); })
      .filter(function (x) { return x > 0; })
      .sort(function (a, b) { return a - b; });
    const uniq = [];
    levels.forEach(function (lv) {
      if (!uniq.length || uniq[uniq.length - 1] !== lv) uniq.push(lv);
    });
    const pots = [];
    let prev = 0;
    uniq.forEach(function (lv) {
      const layer = round2(lv - prev);
      if (layer <= 0) return;
      const eligible = alive.filter(function (p) {
        return round2(investedByPos[p] || 0) >= lv - 0.001;
      });
      // Incluir dead money de folded que pagaron hasta este nivel
      let dead = 0;
      Object.keys(investedByPos || {}).forEach(function (p) {
        if (alive.indexOf(p) >= 0) return;
        const inv = round2(investedByPos[p] || 0);
        if (inv > prev) dead += Math.min(layer, round2(inv - prev));
      });
      const contrib = round2(layer * eligible.length + dead);
      // También contar contribuciones parciales de folded ya en dead;
      // y de alive el layer completo.
      if (contrib > 0 && eligible.length) {
        pots.push({ amount: contrib, eligible: eligible.slice() });
      }
      prev = lv;
    });
    // Dinero de folded por encima del max alive ya cubierto en dead layers via min
    return pots;
  }

  /**
   * Showdown multiway con side pots.
   * Retorna { heroNet, winnersByPot, handNames, reason }.
   */
  function resolveShowdown(hand, Cards) {
    const C = Cards || global.Cards;
    const alive = aliveSeats(hand);
    const invested = Object.assign({}, (hand.table && hand.table.invested) || {});
    // Completar board
    let bi = hand._boardIdx || hand.board.length;
    while (hand.board.length < 5 && hand._predeal && bi < hand._predeal.board.length) {
      hand.board.push(hand._predeal.board[bi++]);
    }
    hand._boardIdx = bi;

    const scores = {};
    const names = {};
    alive.forEach(function (pos) {
      const hole = pos === hand.hero.pos
        ? hand.hero.cards
        : (hand.table.holeCards[pos] || (hand.villain && hand.villain.pos === pos ? hand.villain.cards : null));
      if (!hole || hole.length < 2) {
        scores[pos] = null;
        return;
      }
      const sc = C.evaluate(hole.concat(hand.board));
      scores[pos] = sc;
      names[pos] = sc.name;
    });

    const pots = computeSidePots(invested, alive.filter(function (p) { return scores[p]; }));
    // Fallback: un solo pot = hand.potBB si compute falló
    if (!pots.length) {
      pots.push({
        amount: round2(hand.potBB || 0),
        eligible: alive.filter(function (p) { return scores[p]; })
      });
    }

    const wonByPos = {};
    alive.forEach(function (p) { wonByPos[p] = 0; });
    const winnersByPot = [];

    pots.forEach(function (pot) {
      let best = null;
      const contenders = pot.eligible.filter(function (p) { return scores[p]; });
      contenders.forEach(function (p) {
        if (!best || C.compare(scores[p], scores[best]) > 0) best = p;
      });
      if (!best) return;
      const winners = contenders.filter(function (p) {
        return C.compare(scores[p], scores[best]) === 0;
      });
      const share = round2(pot.amount / winners.length);
      winners.forEach(function (w) { wonByPos[w] = round2((wonByPos[w] || 0) + share); });
      winnersByPot.push({ amount: pot.amount, winners: winners.slice() });
    });

    const heroPos = hand.hero.pos;
    const heroInvested = round2(hand.heroInvested != null ? hand.heroInvested : (invested[heroPos] || 0));
    const heroWon = round2(wonByPos[heroPos] || 0);
    const heroNet = round2(heroWon - heroInvested);

    let reason;
    if (heroWon <= 0.001) reason = 'Pierdes el showdown multiway.';
    else if (heroNet > 0) reason = alive.length >= 4 ? 'Ganas el showdown (4-way+).' : 'Ganas el showdown multiway.';
    else if (heroNet < 0) reason = 'Pierdes el showdown multiway.';
    else reason = 'Empate en el showdown multiway.';

    return {
      heroNet: heroNet,
      showdown: true,
      reason: reason,
      heroHandName: names[heroPos] || null,
      villainHandName: hand.villain && names[hand.villain.pos] ? names[hand.villain.pos] : null,
      winnersByPot: winnersByPot,
      handNames: names,
      opponentCards: buildOpponents(hand).map(function (o) {
        return { pos: o.pos, cards: o.cards, handName: names[o.pos] || null, won: wonByPos[o.pos] || 0 };
      }),
      multiway: true,
      potType: hand.potType || potTypeFromAlive(alive.length)
    };
  }

  /**
   * Equity del héroe vs N oponentes (cartas fijas o rangos).
   * opponents: [{cards}|{rangeStr}]
   */
  function equityVsN(heroCards, board, opponents, iters, opts) {
    const Eq = global.GTOEquity;
    const C = global.Cards;
    if (!Eq || !C || !heroCards || !opponents || !opponents.length) return 0.5;
    if (opponents.length === 1) {
      const o = opponents[0];
      if (o.cards && o.cards.length >= 2) {
        // vs mano concreta: usar rango de 1 combo aproximando con MC rápido
        return equityVsFixedHands(heroCards, board, [o.cards], iters || 200);
      }
      return Eq.equityVsRange(heroCards, board, o.rangeStr || '22+, A2s+, K9s+, AJo+', iters || 300, opts || {});
    }
    const fixed = [];
    const ranged = [];
    opponents.forEach(function (o) {
      if (o.cards && o.cards.length >= 2) fixed.push(o.cards);
      else ranged.push(o.rangeStr || '22+, A2s+, K9s+, AJo+');
    });
    if (!ranged.length) return equityVsFixedHands(heroCards, board, fixed, iters || 250);
    // Aprox: equity vs cada rival y combinar como producto de (no perder vs todos) — sesgado pero estable
    // Mejor: MC conjunto muestreando cada rango
    return equityVsMixed(heroCards, board, fixed, ranged, iters || 220, opts || {});
  }

  function equityVsFixedHands(heroCards, board, villainHands, iters) {
    const C = global.Cards;
    const boardArr = board || [];
    const need = Math.max(0, 5 - boardArr.length);
    const dead0 = heroCards.concat(boardArr);
    villainHands.forEach(function (vh) { dead0.push(vh[0], vh[1]); });
    let win = 0, tie = 0, n = 0;
    const mc = (C.rng && C.rng.random) ? C.rng.random.bind(C.rng) : Math.random;
    const loops = need === 0 ? 1 : (iters || 200);
    for (let k = 0; k < loops; k++) {
      const deck = C.shuffledDeckExcluding(dead0, mc);
      const full = boardArr.concat(deck.slice(0, need));
      const hScore = C.evaluate(heroCards.concat(full));
      let bestCmp = 1;
      let ties = 0;
      for (let i = 0; i < villainHands.length; i++) {
        const vScore = C.evaluate(villainHands[i].concat(full));
        const cmp = C.compare(hScore, vScore);
        if (cmp < 0) { bestCmp = -1; break; }
        if (cmp === 0) ties++;
      }
      if (bestCmp < 0) { /* loss */ }
      else if (ties > 0) tie += 1 / (ties + 1);
      else win++;
      n++;
    }
    return n ? (win + tie) / n : 0.5;
  }

  function equityVsMixed(heroCards, board, fixedHands, rangeStrs, iters, opts) {
    const C = global.Cards;
    const Eq = global.GTOEquity;
    const boardArr = board || [];
    const need = Math.max(0, 5 - boardArr.length);
    const mc = (C.rng && C.rng.random) ? C.rng.random.bind(C.rng) : Math.random;
    let win = 0, tieShare = 0, n = 0;
    for (let k = 0; k < (iters || 220); k++) {
      const dead = heroCards.concat(boardArr);
      const villains = fixedHands.map(function (h) { return h.slice(); });
      let ok = true;
      for (let r = 0; r < rangeStrs.length; r++) {
        const vh = Eq.sampleHandFromRange(rangeStrs[r], dead, mc);
        if (!vh) { ok = false; break; }
        villains.push(vh);
        dead.push(vh[0], vh[1]);
      }
      if (!ok) continue;
      const deck = C.shuffledDeckExcluding(dead, mc);
      const full = boardArr.concat(deck.slice(0, need));
      const hScore = C.evaluate(heroCards.concat(full));
      let lost = false;
      let ties = 0;
      for (let i = 0; i < villains.length; i++) {
        const cmp = C.compare(hScore, C.evaluate(villains[i].concat(full)));
        if (cmp < 0) { lost = true; break; }
        if (cmp === 0) ties++;
      }
      if (!lost) {
        if (ties > 0) tieShare += 1 / (ties + 1);
        else win++;
      }
      n++;
    }
    return n ? (win + tieShare) / n : 0.5;
  }

  /** Multiplicadores de política postflop en multiway. */
  function multiwayPolicyMult(profile) {
    const id = (profile && profile.id) || 'tag';
    const base = {
      tag: { cbet: 0.72, bluff: 0.5, call: 0.88, raise: 0.7 },
      lag: { cbet: 0.9, bluff: 0.85, call: 1.05, raise: 0.95 },
      nit: { cbet: 0.45, bluff: 0.25, call: 0.7, raise: 0.4 },
      fish: { cbet: 0.65, bluff: 0.4, call: 1.35, raise: 0.45 },
      maniac: { cbet: 1.05, bluff: 1.2, call: 1.1, raise: 1.15 },
      pro: { cbet: 0.68, bluff: 0.42, call: 0.82, raise: 0.65 }
    };
    return base[id] || base.tag;
  }

  global.GTOMultiway = {
    allowMultiway,
    aliveSeats,
    aliveCount,
    isMultiway,
    potTypeFromAlive,
    buildOpponents,
    syncOpponents,
    syncTableToMultiwayPot,
    markMultiwayHand,
    computeSidePots,
    resolveShowdown,
    equityVsN,
    equityVsFixedHands,
    multiwayPolicyMult,
    postflopOrderFor,
    POSTFLOP_ORDER_6,
    POSTFLOP_ORDER_9
  };
})(window);
