/*
 * tournament/live-hand.js — Mano de torneo completa (Hero + IA).
 */
(function (global) {
  'use strict';

  var BIAS = {
    fish: { open: 1.35, defend: 1.4, fold: 0.7, bluff: 0.5, call: 1.35 },
    nit: { open: 0.55, defend: 0.5, fold: 1.25, bluff: 0.25, call: 0.55 },
    tag: { open: 0.9, defend: 0.85, fold: 1.05, bluff: 0.7, call: 0.9 },
    lag: { open: 1.25, defend: 1.15, fold: 0.85, bluff: 1.2, call: 1.05 },
    maniac: { open: 1.55, defend: 1.35, fold: 0.6, bluff: 1.6, call: 1.2 },
    pro: { open: 1.0, defend: 1.0, fold: 1.0, bluff: 1.0, call: 1.0 }
  };

  function biasOf(role) { return BIAS[role] || BIAS.tag; }
  function r2(x) { return Math.round((Number(x) || 0) * 100) / 100; }
  /** Etiquetas de acción siempre en big blinds (mesa + botones). */
  function fmtBb(chips, bb) {
    bb = Number(bb) || 1;
    var v = Math.round((Number(chips) || 0) / bb * 10) / 10;
    return (v % 1 ? v.toFixed(1) : String(v)) + ' bb';
  }
  function cardCode(c) {
    if (!c) return '';
    if (typeof c === 'string') return c;
    return c.code || (c.r != null && c.s ? String(c.r) + c.s : '');
  }

  function strength01(hole, board) {
    var C = global.Cards;
    board = board || [];
    if (!hole || hole.length < 2) return 0.1;
    if (C && C.evaluate && board.length >= 3) {
      try {
        var ev = C.evaluate(hole.concat(board));
        if (ev && ev.rank != null) return Math.max(0.05, Math.min(0.98, 1 - (Number(ev.rank) / 7462)));
      } catch (e) { /* ignore */ }
    }
    var ranks = '23456789TJQKA';
    function rv(c) { return Math.max(0, ranks.indexOf(cardCode(c).charAt(0))); }
    var a = rv(hole[0]);
    var b = rv(hole[1]);
    var pair = cardCode(hole[0]).charAt(0) === cardCode(hole[1]).charAt(0);
    var suited = cardCode(hole[0]).charAt(1) === cardCode(hole[1]).charAt(1);
    return Math.max(0.05, Math.min(0.95,
      (Math.max(a, b) / 12) * 0.55 + (Math.min(a, b) / 12) * 0.2 + (pair ? 0.25 : 0) + (suited ? 0.08 : 0)
    ));
  }

  function localDeck() {
    var R = '23456789TJQKA';
    var S = 'cdhs';
    var raw = [];
    for (var ri = 0; ri < R.length; ri++) {
      for (var si = 0; si < S.length; si++) raw.push(R[ri] + S[si]);
    }
    for (var x = raw.length - 1; x > 0; x--) {
      var y = Math.floor(Math.random() * (x + 1));
      var t = raw[x]; raw[x] = raw[y]; raw[y] = t;
    }
    return raw;
  }

  /**
   * Baraja de 52 cartas distintas, barajada de nuevo en cada mano.
   * Se re-siembra el RNG con semilla del entrenador para que dos manos de torneo
   * no compartan secuencia (el entrenador siembra la suya en cada mano, así que
   * esto no altera sus repartos reproducibles).
   */
  function freshDeck() {
    var C = global.Cards;
    if (C && C.rng && typeof C.rng.setSeed === 'function') {
      try { C.rng.setSeed((Math.floor(Math.random() * 4294967295) >>> 0) || 1); } catch (e) { /* ignore */ }
    }
    var deck = null;
    if (C && typeof C.shuffledDeckExcluding === 'function') {
      try { deck = C.shuffledDeckExcluding([]); } catch (e2) { deck = null; }
    }
    if ((!deck || deck.length !== 52) && C && C.shuffle && (C.fullDeck || C.freshDeck)) {
      try {
        var base = C.fullDeck ? C.fullDeck() : C.freshDeck();
        deck = C.shuffle(base.slice ? base.slice() : base);
      } catch (e3) { deck = null; }
    }
    if (!deck || deck.length !== 52) deck = localDeck();
    return deck;
  }

  /** Reparto real: dos rondas de una carta por asiento y luego el board. */
  function dealCards(n) {
    var deck = freshDeck();
    var holes = [];
    var i;
    for (i = 0; i < n; i++) holes.push([]);
    var next = 0;
    for (var round = 0; round < 2; round++) {
      for (i = 0; i < n; i++) holes[i].push(deck[next++]);
    }
    return { holes: holes, board: deck.slice(next, next + 5) };
  }

  /** Todas las cartas repartidas (manos + board): sirve para validar el mazo. */
  function allDealtCards(hand) {
    var out = [];
    (hand && hand.seats ? hand.seats : []).forEach(function (s) {
      (s.cards || []).forEach(function (c) { out.push(cardCode(c)); });
    });
    (hand && hand.boardDeck ? hand.boardDeck : []).forEach(function (c) { out.push(cardCode(c)); });
    return out;
  }

  /** true si alguna carta está repetida entre manos y board. */
  function hasDuplicateCards(hand) {
    var seen = {};
    var all = allDealtCards(hand);
    for (var i = 0; i < all.length; i++) {
      if (!all[i] || seen[all[i]]) return true;
      seen[all[i]] = true;
    }
    return false;
  }

  function handCode(cards) {
    if (!cards || cards.length < 2) return null;
    var C = global.Cards;
    if (C && C.handCode) {
      try { return C.handCode(cards[0], cards[1]); } catch (e) { /* */ }
    }
    var a = cardCode(cards[0]);
    var b = cardCode(cards[1]);
    if (!a || !b) return null;
    var order = '23456789TJQKA';
    var ra = order.indexOf(a[0]);
    var rb = order.indexOf(b[0]);
    var hi = ra >= rb ? a : b;
    var lo = ra >= rb ? b : a;
    if (hi[0] === lo[0]) return hi[0] + lo[0];
    return hi[0] + lo[0] + (hi[1] === lo[1] ? 's' : 'o');
  }

  function shouldOpen(seat, hand) {
    var D = global.PTTournamentVillainDecide;
    if (D && D.decide) {
      var probe = {
        street: 'preflop',
        bb: hand.bb,
        pot: hand.pot,
        currentBet: hand.currentBet,
        minRaise: hand.minRaise,
        openerId: null,
        openerPos: null,
        log: hand.log,
        board: [],
        seats: hand.seats
      };
      var a = D.decide(probe, seat);
      return !!(a && a.id === 'raise');
    }
    return strength01(seat.cards, []) > 0.62;
  }

  function defendDecision(seat, hand) {
    var D = global.PTTournamentVillainDecide;
    if (D && D.decide) {
      var a = D.decide(hand, seat);
      if (!a) return 'fold';
      if (a.id === 'raise' || a.id === 'bet') return 'raise';
      if (a.id === 'call') return 'call';
      if (a.id === 'check') return 'check';
      return 'fold';
    }
    return 'fold';
  }

  function postflopDecision(seat, hand, tc) {
    var D = global.PTTournamentVillainDecide;
    if (D && D.decide) {
      var a = D.decide(hand, seat);
      if (!a) return tc > 0 ? 'fold' : 'check';
      if (a.id === 'raise') return 'raise';
      if (a.id === 'bet') return 'bet';
      if (a.id === 'call') return 'call';
      if (a.id === 'check') return 'check';
      return 'fold';
    }
    return tc > 0 ? 'fold' : 'check';
  }

  function createHand(tableSeats, blinds, heroId) {
    var dealt = dealCards(tableSeats.length);
    var seats = tableSeats.map(function (ts, i) {
      var stack = Number(ts.player.stack) || 0;
      return {
        id: ts.player.id,
        name: ts.player.name,
        isHero: !!(ts.player.isHero || ts.player.id === heroId),
        roleId: ts.player.roleId,
        proStyle: ts.player.proStyle || null,
        pos: ts.pos,
        seatIndex: ts.seatIndex != null ? ts.seatIndex : i,
        physicalSeat: ts.physicalSeat != null
          ? ts.physicalSeat
          : (ts.player && ts.player.seat != null ? ts.player.seat : i),
        cards: dealt.holes[i],
        startStack: stack,
        stack: stack,
        invested: 0,
        streetInvested: 0,
        folded: false,
        allIn: false
      };
    });

    var hand = {
      seats: seats,
      heroId: heroId || null,
      sb: Number(blinds.sb) || 10,
      bb: Number(blinds.bb) || 20,
      ante: Number(blinds.ante) || 0,
      boardDeck: dealt.board,
      board: [],
      street: 'preflop',
      pot: 0,
      currentBet: 0,
      minRaise: Number(blinds.bb) || 20,
      openerId: null,
      openerPos: null,
      lastAggressorId: null,
      acted: {},
      log: [],
      stage: 'playing',
      awaitingHero: false,
      heroOptions: null,
      _heroSeatId: null,
      result: null
    };

    if (hand.ante > 0) {
      seats.forEach(function (s) {
        var a = Math.min(s.stack, hand.ante);
        s.stack = r2(s.stack - a);
        s.invested = r2(s.invested + a);
        hand.pot = r2(hand.pot + a);
        if (s.stack <= 0) { s.stack = 0; s.allIn = true; }
      });
    }

    function postBlind(seat, amt) {
      if (!seat) return;
      var a = Math.min(seat.stack, amt);
      seat.stack = r2(seat.stack - a);
      seat.invested = r2(seat.invested + a);
      seat.streetInvested = r2(seat.streetInvested + a);
      hand.pot = r2(hand.pot + a);
      if (seat.stack <= 0) { seat.stack = 0; seat.allIn = true; }
    }

    var sbSeat = seats.find(function (s) {
      return s.pos === 'SB' || (seats.length === 2 && s.pos === 'BTN');
    });
    var bbSeat = seats.find(function (s) { return s.pos === 'BB'; });
    postBlind(sbSeat, hand.sb);
    postBlind(bbSeat, hand.bb);
    hand.currentBet = hand.bb;
    hand.minRaise = hand.bb;
    return hand;
  }

  function alive(hand) { return hand.seats.filter(function (s) { return !s.folded; }); }
  function canAct(s) { return !!(s && !s.folded && !s.allIn && s.stack > 0); }
  function toCall(seat, hand) { return Math.max(0, r2(hand.currentBet - seat.streetInvested)); }

  function putIn(hand, seat, streetTarget) {
    var need = Math.max(0, streetTarget - seat.streetInvested);
    need = Math.min(need, seat.stack);
    seat.stack = r2(seat.stack - need);
    seat.streetInvested = r2(seat.streetInvested + need);
    seat.invested = r2(seat.invested + need);
    hand.pot = r2(hand.pot + need);
    if (seat.stack <= 0.001) { seat.stack = 0; seat.allIn = true; }
  }

  function logAct(hand, seat, action, amount) {
    var entry = {
      id: seat.id,
      name: seat.name,
      action: action,
      amount: amount || 0,
      street: hand.street
    };
    hand.log.push(entry);
    /* Persiste en el asiento para que la mesa muestre la última acción
       aunque cambie de street (si no, solo se ve Fold y la acción del héroe). */
    seat.lastAction = {
      action: action,
      amount: amount || 0,
      street: hand.street
    };
  }

  /* ---------- Fotogramas de presentación ----------
     La mesa se pinta paso a paso (como en Entrenar): cada acción de villano y
     cada street generan un fotograma con el estado visible en ese instante.
     El motor sigue resolviendo la mano de una vez; solo cambia el revelado. */
  function seatSnap(s) {
    return {
      id: s.id,
      stack: s.stack,
      invested: s.invested,
      streetInvested: s.streetInvested,
      folded: !!s.folded,
      allIn: !!s.allIn,
      lastAction: s.lastAction
        ? { action: s.lastAction.action, amount: s.lastAction.amount, street: s.lastAction.street }
        : null
    };
  }

  function pushFrame(hand, meta) {
    if (!hand || hand._noFrames) return null;
    meta = meta || {};
    if (!hand._frames) hand._frames = [];
    var frame = {
      kind: meta.kind || 'act',
      actorId: meta.actorId || null,
      pos: meta.pos || null,
      action: meta.action || null,
      amount: Number(meta.amount) || 0,
      isHero: !!meta.isHero,
      street: hand.street,
      board: (hand.board || []).slice(),
      pot: hand.pot,
      currentBet: hand.currentBet,
      holesRevealed: !!(meta.holesRevealed || hand.holesRevealed),
      seats: hand.seats.map(seatSnap)
    };
    hand._frames.push(frame);
    return frame;
  }

  function pushSeatFrame(hand, seat) {
    var last = seat && seat.lastAction;
    return pushFrame(hand, {
      kind: 'act',
      actorId: seat && seat.id,
      pos: seat && seat.pos,
      action: last && last.action,
      amount: last && last.amount,
      isHero: !!(seat && seat.isHero)
    });
  }

  function doFold(hand, seat) { seat.folded = true; logAct(hand, seat, 'fold'); }
  function doCheck(hand, seat) { logAct(hand, seat, 'check'); }
  function doCall(hand, seat) {
    var tc = toCall(seat, hand);
    putIn(hand, seat, seat.streetInvested + tc);
    logAct(hand, seat, 'call', tc);
  }
  function doRaiseTo(hand, seat, toAmt) {
    var prev = hand.currentBet;
    var target = Math.max(prev + hand.minRaise, Number(toAmt) || 0);
    target = Math.min(target, seat.streetInvested + seat.stack);
    putIn(hand, seat, target);
    hand.minRaise = Math.max(hand.bb, seat.streetInvested - prev);
    hand.currentBet = seat.streetInvested;
    if (!hand.openerId && hand.street === 'preflop') {
      hand.openerId = seat.id;
      hand.openerPos = seat.pos;
    }
    logAct(hand, seat, prev > 0 ? 'raise' : 'bet', seat.streetInvested);
    /* Tras un raise la acción sigue al jugador siguiente al agresor (no
       reinicia en UTG): si no, un limp en CO foldaría antes que la BB. */
    hand.lastAggressorId = seat.id;
    hand.acted = {};
    hand.acted[seat.id] = true;
  }

  /* El array de asientos viene ordenado desde el botón para pintar la mesa, no
     como anillo físico, así que el turno se deriva de la posición: preflop abre
     UTG y cierra la BB; postflop abre la SB y cierra el BTN. */
  var PREFLOP_LABELS = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  var POSTFLOP_LABELS = ['SB', 'BB', 'UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN'];

  function orderByLabels(hand, labels) {
    var rank = {};
    labels.forEach(function (p, i) { rank[p] = i; });
    return hand.seats.slice().sort(function (a, b) {
      var ra = rank[a.pos];
      var rb = rank[b.pos];
      if (ra == null) ra = 100 + (a.seatIndex || 0);
      if (rb == null) rb = 100 + (b.seatIndex || 0);
      return ra - rb;
    });
  }

  /** Heads-up: el botón (que es la SB) abre preflop y la BB abre postflop. */
  function headsUpOrder(hand, bbFirst) {
    return hand.seats.slice().sort(function (a, b) {
      var ka = a.pos === 'BB' ? 1 : 0;
      var kb = b.pos === 'BB' ? 1 : 0;
      return bbFirst ? (kb - ka) : (ka - kb);
    });
  }

  function preflopOrder(hand) {
    if (hand.seats.length === 2) return headsUpOrder(hand, false);
    return orderByLabels(hand, PREFLOP_LABELS);
  }

  function postflopOrder(hand) {
    if (hand.seats.length === 2) return headsUpOrder(hand, true);
    return orderByLabels(hand, POSTFLOP_LABELS);
  }

  function streetDone(hand) {
    var actors = alive(hand).filter(canAct);
    if (!actors.length) return true;
    return actors.every(function (s) {
      return s.streetInvested >= hand.currentBet - 0.001 && hand.acted[s.id];
    });
  }

  function advanceStreet(hand) {
    if (hand.street === 'preflop') {
      hand.street = 'flop';
      hand.board = hand.boardDeck.slice(0, 3);
    } else if (hand.street === 'flop') {
      hand.street = 'turn';
      hand.board = hand.boardDeck.slice(0, 4);
    } else if (hand.street === 'turn') {
      hand.street = 'river';
      hand.board = hand.boardDeck.slice(0, 5);
    } else {
      return 'showdown';
    }
    hand.seats.forEach(function (s) { s.streetInvested = 0; });
    hand.currentBet = 0;
    hand.minRaise = hand.bb;
    hand.acted = {};
    hand.lastAggressorId = null;
    return null;
  }

  function settle(hand, winnerIds, showdown, meta) {
    meta = meta || {};
    var set = {};
    (winnerIds || []).forEach(function (id) { set[id] = true; });
    var n = Math.max(1, (winnerIds || []).length);
    var share = r2(hand.pot / n);
    var deltas = {};
    hand.seats.forEach(function (s) {
      var won = set[s.id] ? share : 0;
      deltas[s.id] = r2(won - s.invested);
      s.stack = r2(s.startStack + deltas[s.id]);
    });
    hand.stage = 'complete';
    hand.awaitingHero = false;
    hand.heroOptions = null;
    var hero = hand.seats.find(function (s) { return s.isHero; });
    var heroId = hero ? hero.id : null;
    var tied = !!(showdown && (winnerIds || []).length > 1);
    hand.result = {
      deltas: deltas,
      winners: (winnerIds || []).slice(),
      showdown: !!showdown,
      tied: tied,
      board: hand.board.slice(),
      pot: hand.pot,
      holeCards: {},
      handNames: meta.handNames || {},
      heroNet: heroId != null ? (deltas[heroId] || 0) : 0
    };
    alive(hand).forEach(function (s) {
      hand.result.holeCards[s.id] = s.cards.slice();
    });
    return hand;
  }

  function cardCodesOf(cards) {
    return (cards || []).map(cardCode).filter(Boolean);
  }

  function finishFoldWin(hand) {
    var w = alive(hand)[0];
    return settle(hand, w ? [w.id] : [], false);
  }

  function finishShowdown(hand) {
    /* All-in / showdown: primero se revelan los hole cards de quienes siguen
       en el bote, pausa corta, y luego el runout de comunitarias. */
    if (hand.board.length < 5) {
      hand.holesRevealed = true;
      pushFrame(hand, { kind: 'reveal', holesRevealed: true });
    }
    while (hand.board.length < 5) {
      hand.board.push(hand.boardDeck[hand.board.length]);
      pushFrame(hand, { kind: 'street', holesRevealed: true });
    }
    var C = global.Cards;
    var cont = alive(hand);
    var boardCodes = cardCodesOf(hand.board);
    cont.forEach(function (s) {
      var hole = cardCodesOf(s.cards);
      var score = null;
      var name = null;
      if (C && C.evaluate) {
        try {
          score = C.evaluate(hole.concat(boardCodes));
          if (score && score.name) name = score.name;
        } catch (e1) {
          try {
            score = C.evaluate(s.cards.concat(hand.board));
            if (score && score.name) name = score.name;
          } catch (e2) { score = null; }
        }
      }
      s._score = score;
      s._handName = name;
    });
    var winners = [];
    var best = null;
    cont.forEach(function (s) {
      if (!s._score) return;
      if (!best) { best = s; winners = [s]; return; }
      var cmp = 0;
      if (C && C.compare) cmp = C.compare(s._score, best._score);
      else {
        var ra = (s._score.rank || []).slice();
        var rb = (best._score.rank || []).slice();
        var len = Math.max(ra.length, rb.length);
        for (var i = 0; i < len; i++) {
          var x = ra[i] || 0, y = rb[i] || 0;
          if (x !== y) { cmp = x - y; break; }
        }
      }
      if (cmp > 0) { best = s; winners = [s]; }
      else if (cmp === 0) winners.push(s);
    });
    if (!winners.length) winners = cont.slice();
    var handNames = {};
    cont.forEach(function (s) {
      if (s._handName) handNames[s.id] = s._handName;
    });
    return settle(hand, winners.map(function (w) { return w.id; }), true, { handNames: handNames });
  }

  function heroOptions(hand, seat) {
    var tc = Math.max(0, hand.currentBet - seat.streetInvested);
    var bb = hand.bb || 1;
    var pot = Math.max(hand.pot || 0, bb);
    var maxTo = seat.streetInvested + seat.stack;
    var opts = [];
    function pushAllIn() {
      if (seat.stack > 0) {
        opts.push({ id: 'allin', label: 'All-in ' + fmtBb(seat.stack, bb), amount: maxTo });
      }
    }
    function pushRaise(mult, label) {
      var minTo = Math.min(maxTo, hand.currentBet + hand.minRaise);
      var raiseTo = Math.min(maxTo, Math.max(minTo, r2(hand.currentBet * mult)));
      if (raiseTo <= hand.currentBet + 0.001) return;
      if (raiseTo >= maxTo - 0.001) return;
      opts.push({
        id: 'raise',
        label: (label ? (label + ' · ') : '') + fmtBb(raiseTo, bb),
        min: minTo,
        max: maxTo,
        suggested: raiseTo,
        amount: raiseTo
      });
    }
    function pushBet(frac, label) {
      var amt = Math.min(maxTo, Math.max(bb, r2(pot * frac)));
      if (amt >= maxTo - 0.001) return;
      opts.push({
        id: 'bet',
        label: (label ? (label + ' · ') : 'Apostar ') + fmtBb(amt, bb),
        min: Math.min(bb, maxTo),
        max: maxTo,
        suggested: amt,
        amount: amt
      });
    }

    if (tc > 0) {
      opts.push({ id: 'fold', label: 'Fold' });
      opts.push({
        id: 'call',
        label: tc >= seat.stack ? ('All-in ' + fmtBb(seat.stack, bb)) : ('Call ' + fmtBb(tc, bb)),
        amount: Math.min(tc, seat.stack)
      });
      if (seat.stack > tc) {
        if (hand.street === 'preflop') {
          var raises = 0;
          (hand.log || []).forEach(function (e) {
            if (e.street === 'preflop' && (e.action === 'raise' || e.action === 'bet')) raises += 1;
          });
          if (!hand.openerId) {
            [2, 2.5, 3].forEach(function (x) {
              var to = Math.min(maxTo, r2(bb * x));
              if (to > hand.currentBet + 0.001 && to < maxTo - 0.001) {
                opts.push({
                  id: 'raise',
                  label: x + ' bb',
                  min: Math.min(maxTo, hand.currentBet + hand.minRaise),
                  max: maxTo,
                  suggested: to,
                  amount: to
                });
              }
            });
          } else {
            var mults = raises >= 2 ? [2.2, 2.6, 3.0] : [2.5, 3.0, 3.5];
            mults.forEach(function (m) {
              pushRaise(m, (raises >= 2 ? '4bet ' : '3bet ') + m + 'x');
            });
          }
        } else {
          pushRaise(2.5, 'Raise 2.5x');
          pushRaise(3.2, 'Raise 3.2x');
          var potRaise = Math.min(maxTo, r2(hand.currentBet + pot));
          if (potRaise > hand.currentBet + hand.minRaise && potRaise < maxTo - 0.001) {
            opts.push({
              id: 'raise',
              label: 'Raise pot',
              min: Math.min(maxTo, hand.currentBet + hand.minRaise),
              max: maxTo,
              suggested: potRaise,
              amount: potRaise
            });
          }
        }
        pushAllIn();
      }
    } else {
      opts.push({ id: 'check', label: 'Check' });
      if (seat.stack > 0) {
        if (hand.street === 'preflop') {
          [2, 2.5, 3].forEach(function (x) {
            var to = Math.min(maxTo, r2(bb * x));
            if (to < maxTo - 0.001) {
              opts.push({
                id: 'raise',
                label: x + ' bb',
                min: Math.min(bb, maxTo),
                max: maxTo,
                suggested: to,
                amount: to
              });
            }
          });
        } else {
          [[0.33, '33%'], [0.66, '66%'], [1.0, '100%'], [1.25, '125%']].forEach(function (pair) {
            pushBet(pair[0], pair[1]);
          });
        }
        pushAllIn();
      }
    }
    return opts;
  }

  function villainAction(hand, seat) {
    var D = global.PTTournamentVillainDecide;
    if (D && typeof D.decide === 'function') {
      try {
        var act = D.decide(hand, seat);
        if (act && act.id) return act;
      } catch (e) { /* fallback */ }
    }
    var tc = Math.max(0, hand.currentBet - seat.streetInvested);
    if (tc > 0) return { id: 'fold' };
    return { id: 'check' };
  }

  function applyAction(hand, seat, action) {
    hand.acted[seat.id] = true;
    var id = action.id;
    if (id === 'fold') doFold(hand, seat);
    else if (id === 'check') doCheck(hand, seat);
    else if (id === 'call') doCall(hand, seat);
    else if (id === 'bet' || id === 'raise' || id === 'allin') {
      var amt = action.amount != null ? action.amount : (seat.streetInvested + seat.stack);
      doRaiseTo(hand, seat, amt);
    }
  }

  function nextToAct(hand) {
    var order = hand.street === 'preflop' ? preflopOrder(hand) : postflopOrder(hand);
    if (!order.length) return null;
    var start = 0;
    if (hand.lastAggressorId) {
      for (var j = 0; j < order.length; j++) {
        if (order[j].id === hand.lastAggressorId) {
          start = (j + 1) % order.length;
          break;
        }
      }
    }
    for (var k = 0; k < order.length; k++) {
      var s = order[(start + k) % order.length];
      if (!canAct(s)) continue;
      if (s.streetInvested < hand.currentBet - 0.001 || !hand.acted[s.id]) return s;
    }
    return null;
  }

  /**
   * Un paso del motor: calle nueva, UNA acción de villano, turno de héroe, o fin.
   * Los villanos deciden aquí (rol + hole + acciones previas), no al repartir.
   */
  function advance(hand) {
    if (!hand || hand.stage !== 'playing') return hand;
    hand._frames = hand._frames || [];

    if (alive(hand).length <= 1) return finishFoldWin(hand);

    if (streetDone(hand)) {
      var canStill = alive(hand).filter(canAct);
      if (canStill.length <= 1 && alive(hand).length >= 2) return finishShowdown(hand);
      if (hand.street === 'river') return finishShowdown(hand);
      if (advanceStreet(hand) === 'showdown') return finishShowdown(hand);
      pushFrame(hand, { kind: 'street' });
      return hand;
    }

    var seat = nextToAct(hand);
    if (!seat) {
      alive(hand).forEach(function (s) { if (canAct(s)) hand.acted[s.id] = true; });
      return hand;
    }

    if (seat.isHero) {
      hand.awaitingHero = true;
      hand._heroSeatId = seat.id;
      hand.heroOptions = heroOptions(hand, seat);
      return hand;
    }

    applyAction(hand, seat, villainAction(hand, seat));
    pushSeatFrame(hand, seat);
    return hand;
  }

  /** Avanza hasta héroe, fin de mano, o un máximo de pasos (simulación / skip). */
  function run(hand, opts) {
    opts = opts || {};
    var maxSteps = opts.maxSteps != null ? opts.maxSteps : 250;
    var stopOnFrame = !!opts.stopOnFrame;
    var guard = 0;
    while (hand.stage === 'playing' && !hand.awaitingHero && guard++ < maxSteps) {
      var framesBefore = (hand._frames && hand._frames.length) || 0;
      advance(hand);
      if (stopOnFrame && hand._frames && hand._frames.length > framesBefore) break;
      if (hand.awaitingHero || hand.stage === 'complete') break;
    }
    if (hand.stage === 'playing' && !hand.awaitingHero && guard >= maxSteps) {
      finishShowdown(hand);
    }
    return hand;
  }

  function start(tableSeats, blinds, heroId) {
    var hand = createHand(tableSeats, blinds, heroId);
    hand.decisions = [];
    /* Primer fotograma: cartas y ciegas; la IA aún no ha decidido. */
    pushFrame(hand, { kind: 'deal' });
    /* Un solo paso de presentación; el resto lo pide la UI con advance/run. */
    return hand;
  }

  /** Tras el deal: avanza un paso (villano/calle) dejando frames nuevos. */
  function step(hand) {
    if (!hand) return hand;
    if (hand.stage === 'complete') return hand;
    if (hand.awaitingHero) return hand;
    hand._frames = [];
    return advance(hand);
  }

  /** Draga pasos hasta héroe o fin (saltar animación / mesas satélite). */
  function runToHeroOrEnd(hand) {
    if (!hand) return hand;
    /* Conserva fotogramas previos (p.ej. deal) y añade acciones hasta el héroe. */
    return run(hand, { maxSteps: 250, stopOnFrame: false });
  }

  function heroAct(hand, actionId, amount) {
    if (!hand || hand.stage !== 'playing' || !hand.awaitingHero) return hand;
    hand._frames = [];
    var seat = hand.seats.find(function (s) { return s.id === hand._heroSeatId; });
    if (!seat) return hand;
    var action = { id: actionId, amount: amount };
    if ((actionId === 'bet' || actionId === 'raise') && amount == null && hand.heroOptions) {
      hand.heroOptions.forEach(function (o) {
        if (o.id === actionId && o.suggested != null) action.amount = o.suggested;
      });
    }
    if (actionId === 'allin') action.amount = seat.streetInvested + seat.stack;

    /* Evaluación GTO de la decisión del héroe (como en Entrenar). */
    try {
      var GEval = global.PTTournamentGtoEval;
      if (GEval && typeof GEval.evaluateHeroAction === 'function') {
        var decision = GEval.evaluateHeroAction(hand, seat, action);
        hand.decisions = hand.decisions || [];
        if (decision) hand.decisions.push(decision);
      }
    } catch (eEval) { /* no bloquear la mano */ }

    hand.awaitingHero = false;
    hand.heroOptions = null;
    applyAction(hand, seat, action);
    pushSeatFrame(hand, seat);
    /* Continúa hasta el próximo turno de héroe o el fin (villanos deciden al actuar). */
    return runToHeroOrEnd(hand);
  }

  function simulateTable(tableSeats, blinds) {
    var hand = createHand(tableSeats, blinds, null);
    hand.seats.forEach(function (s) { s.isHero = false; });
    hand.heroId = null;
    hand._noFrames = true;
    hand.decisions = [];
    pushFrame(hand, { kind: 'deal' });
    runToHeroOrEnd(hand);
    hand._frames = [];
    return hand;
  }


  global.PTTournamentLiveHand = {
    start: start,
    step: step,
    advance: advance,
    run: run,
    runToHeroOrEnd: runToHeroOrEnd,
    heroAct: heroAct,
    simulateTable: simulateTable,
    strength01: strength01,
    allDealtCards: allDealtCards,
    hasDuplicateCards: hasDuplicateCards
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
