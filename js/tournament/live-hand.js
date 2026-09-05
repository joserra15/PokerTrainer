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

  function dealCards(n) {
    var C = global.Cards;
    if (C && C.shuffle && (C.fullDeck || C.freshDeck)) {
      var base = C.fullDeck ? C.fullDeck() : C.freshDeck();
      var deck = C.shuffle(base.slice ? base.slice() : base);
      var holes = [];
      for (var i = 0; i < n; i++) holes.push([deck[i * 2], deck[i * 2 + 1]]);
      return { holes: holes, board: deck.slice(n * 2, n * 2 + 5) };
    }
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
    var holes2 = [];
    for (var k = 0; k < n; k++) holes2.push([raw[k * 2], raw[k * 2 + 1]]);
    return { holes: holes2, board: raw.slice(n * 2, n * 2 + 5) };
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
    var V = global.GTOVillainPreflop;
    var b = biasOf(seat.roleId);
    var hc = handCode(seat.cards);
    var openFn = V && V.isInOpenRange;
    if (openFn && hc) {
      try {
        if (openFn(hc, seat.pos, { formatHub: 'mtt', stackBB: seat.stack / hand.bb })) return true;
      } catch (e) { /* */ }
      return Math.random() < 0.06 * b.open;
    }
    return strength01(seat.cards, []) * b.open > 0.62;
  }

  function defendDecision(seat, hand) {
    var V = global.GTOVillainPreflop;
    var b = biasOf(seat.roleId);
    var hc = handCode(seat.cards);
    var defendFn = V && V.defendVsOpen;
    if (defendFn && hc) {
      try {
        var a = defendFn(hc, { id: seat.roleId || 'tag' }, Math.random(), seat.pos, hand.openerPos || 'CO', {
          formatHub: 'mtt', stackBB: seat.stack / hand.bb
        });
        if (a === '3bet' || a === 'raise') return 'raise';
        if (a === 'call') return 'call';
        return 'fold';
      } catch (e2) { /* */ }
    }
    var s = strength01(seat.cards, []) * b.defend;
    if (s > 0.78) return 'raise';
    if (s > 0.52) return 'call';
    return 'fold';
  }

  function postflopDecision(seat, hand, tc) {
    var b = biasOf(seat.roleId);
    var s = strength01(seat.cards, hand.board) * (tc > 0 ? b.call : 1);
    if (tc > 0) {
      if (tc >= seat.stack) return s > 0.42 ? 'call' : 'fold';
      if (s > 0.82 && Math.random() < 0.3 * b.bluff) return 'raise';
      if (s > 0.48 * b.fold) return 'call';
      return 'fold';
    }
    if (s > 0.72 || (s > 0.38 && Math.random() < 0.2 * b.bluff)) return 'bet';
    return 'check';
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
        pos: ts.pos,
        seatIndex: ts.seatIndex != null ? ts.seatIndex : i,
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
    hand.log.push({ id: seat.id, name: seat.name, action: action, amount: amount || 0, street: hand.street });
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
    hand.acted = {};
    hand.acted[seat.id] = true;
  }

  function preflopOrder(hand) {
    var labels = hand.seats.map(function (s) { return s.pos; });
    var prefs = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN'];
    var start = -1;
    for (var p = 0; p < prefs.length && start < 0; p++) start = labels.indexOf(prefs[p]);
    if (start < 0) start = 0;
    var out = [];
    for (var i = 0; i < hand.seats.length; i++) out.push(hand.seats[(start + i) % hand.seats.length]);
    return out;
  }

  function postflopOrder(hand) {
    return hand.seats.slice().sort(function (a, b) {
      function key(s) {
        if (s.pos === 'SB') return 0;
        if (s.pos === 'BB') return 1;
        return 10 + (s.seatIndex || 0);
      }
      return key(a) - key(b);
    });
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
    return null;
  }

  function settle(hand, winnerIds, showdown) {
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
    hand.result = {
      deltas: deltas,
      winners: (winnerIds || []).slice(),
      showdown: !!showdown,
      board: hand.board.slice(),
      pot: hand.pot,
      holeCards: {}
    };
    alive(hand).forEach(function (s) {
      hand.result.holeCards[s.id] = s.cards.slice();
    });
    return hand;
  }

  function finishFoldWin(hand) {
    var w = alive(hand)[0];
    return settle(hand, w ? [w.id] : [], false);
  }

  function finishShowdown(hand) {
    while (hand.board.length < 5) hand.board.push(hand.boardDeck[hand.board.length]);
    var C = global.Cards;
    var cont = alive(hand);
    var best = null;
    var winners = [];
    cont.forEach(function (s) {
      var score = null;
      try { if (C && C.evaluate) score = C.evaluate(s.cards.concat(hand.board)); } catch (e) { /* */ }
      s._score = score;
      s._str = strength01(s.cards, hand.board);
      if (!best) { best = s; winners = [s]; return; }
      var cmp = 0;
      if (C && C.compare && s._score && best._score) cmp = C.compare(s._score, best._score);
      else cmp = s._str - best._str;
      if (cmp > 0) { best = s; winners = [s]; }
      else if (cmp === 0) winners.push(s);
    });
    return settle(hand, winners.map(function (w) { return w.id; }), true);
  }

  function heroOptions(hand, seat) {
    var tc = toCall(seat, hand);
    var bb = hand.bb || 1;
    var opts = [];
    if (tc > 0) {
      opts.push({ id: 'fold', label: 'Fold' });
      opts.push({
        id: 'call',
        label: tc >= seat.stack ? ('All-in ' + fmtBb(seat.stack, bb)) : ('Call ' + fmtBb(tc, bb)),
        amount: Math.min(tc, seat.stack)
      });
      if (seat.stack > tc) {
        var minTo = Math.min(seat.streetInvested + seat.stack, hand.currentBet + hand.minRaise);
        var maxTo = seat.streetInvested + seat.stack;
        opts.push({
          id: 'raise',
          label: 'Subir',
          min: minTo,
          max: maxTo,
          suggested: Math.min(Math.max(minTo, r2(hand.currentBet * 2.5)), maxTo)
        });
        opts.push({ id: 'allin', label: 'All-in ' + fmtBb(seat.stack, bb), amount: maxTo });
      }
    } else {
      opts.push({ id: 'check', label: 'Check' });
      if (seat.stack > 0) {
        var maxBet = seat.streetInvested + seat.stack;
        var sug = Math.min(maxBet, Math.max(hand.bb, r2(hand.pot * 0.55)));
        opts.push({
          id: 'bet',
          label: 'Apostar',
          min: Math.min(hand.bb, maxBet),
          max: maxBet,
          suggested: sug
        });
        opts.push({ id: 'allin', label: 'All-in ' + fmtBb(seat.stack, bb), amount: maxBet });
      }
    }
    return opts;
  }

  function villainAction(hand, seat) {
    var tc = toCall(seat, hand);
    if (hand.street === 'preflop') {
      if (!hand.openerId) {
        if (seat.pos === 'BB' && tc <= 0) return { id: 'check' };
        if (shouldOpen(seat, hand)) {
          return {
            id: 'raise',
            amount: Math.min(seat.streetInvested + seat.stack, r2(hand.bb * (seat.pos === 'SB' ? 3 : 2.5)))
          };
        }
        return tc > 0 ? { id: 'fold' } : { id: 'check' };
      }
      var d = defendDecision(seat, hand);
      if (d === 'raise') {
        return {
          id: 'raise',
          amount: Math.min(seat.streetInvested + seat.stack,
            Math.max(hand.currentBet + hand.minRaise, hand.currentBet * 2.6))
        };
      }
      if (d === 'call') return { id: 'call' };
      return tc > 0 ? { id: 'fold' } : { id: 'check' };
    }
    var pf = postflopDecision(seat, hand, tc);
    if (pf === 'bet' || pf === 'raise') {
      var to = hand.currentBet > 0
        ? Math.max(hand.currentBet + hand.minRaise, hand.currentBet * 2.2)
        : Math.max(hand.bb, hand.pot * 0.6);
      return {
        id: hand.currentBet > 0 ? 'raise' : 'bet',
        amount: Math.min(seat.streetInvested + seat.stack, r2(to))
      };
    }
    if (pf === 'call') return { id: 'call' };
    if (pf === 'check') return { id: 'check' };
    return { id: 'fold' };
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
    for (var i = 0; i < order.length; i++) {
      var s = order[i];
      if (!canAct(s)) continue;
      if (s.streetInvested < hand.currentBet - 0.001 || !hand.acted[s.id]) return s;
    }
    return null;
  }

  function run(hand) {
    var guard = 0;
    while (hand.stage === 'playing' && guard++ < 250) {
      if (alive(hand).length <= 1) return finishFoldWin(hand);

      if (streetDone(hand)) {
        var canStill = alive(hand).filter(canAct);
        if (canStill.length <= 1 && alive(hand).length >= 2) return finishShowdown(hand);
        if (hand.street === 'river') return finishShowdown(hand);
        if (advanceStreet(hand) === 'showdown') return finishShowdown(hand);
        continue;
      }

      var seat = nextToAct(hand);
      if (!seat) {
        alive(hand).forEach(function (s) { if (canAct(s)) hand.acted[s.id] = true; });
        continue;
      }

      if (seat.isHero) {
        hand.awaitingHero = true;
        hand._heroSeatId = seat.id;
        hand.heroOptions = heroOptions(hand, seat);
        return hand;
      }
      applyAction(hand, seat, villainAction(hand, seat));
    }
    if (hand.stage === 'playing') finishShowdown(hand);
    return hand;
  }

  function start(tableSeats, blinds, heroId) {
    return run(createHand(tableSeats, blinds, heroId));
  }

  function heroAct(hand, actionId, amount) {
    if (!hand || hand.stage !== 'playing' || !hand.awaitingHero) return hand;
    var seat = hand.seats.find(function (s) { return s.id === hand._heroSeatId; });
    if (!seat) return hand;
    var action = { id: actionId, amount: amount };
    if ((actionId === 'bet' || actionId === 'raise') && amount == null && hand.heroOptions) {
      hand.heroOptions.forEach(function (o) {
        if (o.id === actionId && o.suggested != null) action.amount = o.suggested;
      });
    }
    if (actionId === 'allin') action.amount = seat.streetInvested + seat.stack;
    hand.awaitingHero = false;
    hand.heroOptions = null;
    applyAction(hand, seat, action);
    return run(hand);
  }

  function simulateTable(tableSeats, blinds) {
    var hand = createHand(tableSeats, blinds, null);
    hand.seats.forEach(function (s) { s.isHero = false; });
    hand.heroId = null;
    return run(hand);
  }

  global.PTTournamentLiveHand = {
    start: start,
    heroAct: heroAct,
    simulateTable: simulateTable,
    strength01: strength01
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
