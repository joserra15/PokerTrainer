/*
 * tournament/stats.js — Stats de sesión de torneo (VPIP/PFR lite, ROI…).
 */
(function (global) {
  'use strict';

  function ensureStats(state) {
    if (!state.stats) {
      state.stats = {
        handsPlayed: 0,
        vpipHands: 0,
        pfrHands: 0,
        wonHands: 0,
        wentToShowdown: 0
      };
    }
    return state.stats;
  }

  function heroSeat(hand, heroId) {
    if (!hand || !hand.seats) return null;
    return hand.seats.find(function (s) {
      return s.id === heroId || s.isHero;
    }) || null;
  }

  function heroPutChipsBeyondBlinds(hand, seat) {
    if (!seat || !hand) return false;
    var blindShare = 0;
    if (seat.pos === 'SB' || (hand.seats && hand.seats.length === 2 && seat.pos === 'BTN')) {
      blindShare = Number(hand.sb) || 0;
    } else if (seat.pos === 'BB') {
      blindShare = Number(hand.bb) || 0;
    }
    if (hand.ante > 0) blindShare += Number(hand.ante) || 0;
    return (Number(seat.invested) || 0) > blindShare + 0.001;
  }

  function heroRaisedPreflop(hand, heroId) {
    var log = (hand && hand.log) || [];
    for (var i = 0; i < log.length; i++) {
      var a = log[i];
      if (!a || a.street !== 'preflop') continue;
      if (a.id !== heroId) continue;
      if (a.action === 'raise' || a.action === 'bet') return true;
    }
    return false;
  }

  function onHandComplete(state, handResult, heroId) {
    var st = ensureStats(state);
    st.handsPlayed = (Number(st.handsPlayed) || 0) + 1;

    var hand = handResult;
    var result = hand && hand.result ? hand.result : handResult;
    var seat = heroSeat(hand, heroId);
    if (!seat && hand && hand.seats) {
      seat = hand.seats.find(function (s) { return s.id === heroId; }) || null;
    }

    if (seat && heroPutChipsBeyondBlinds(hand, seat)) {
      st.vpipHands = (Number(st.vpipHands) || 0) + 1;
    }
    if (hand && heroRaisedPreflop(hand, heroId || (seat && seat.id))) {
      st.pfrHands = (Number(st.pfrHands) || 0) + 1;
    }

    var deltas = (result && result.deltas) || {};
    var hid = heroId || (seat && seat.id) || 'hero';
    var delta = Number(deltas[hid]);
    if (isFinite(delta) && delta > 0) {
      st.wonHands = (Number(st.wonHands) || 0) + 1;
    }
    if (result && result.showdown) {
      st.wentToShowdown = (Number(st.wentToShowdown) || 0) + 1;
    }
    return st;
  }

  function pct(num, den) {
    if (!den) return 0;
    return Math.round((num / den) * 1000) / 10;
  }

  function summary(state) {
    var Cfg = global.PTTournamentConfig;
    var Seat = global.PTTournamentSeating;
    var Guess = global.PTTournamentRoleGuess;
    var cfg = state.config || {};
    var buyIn = Number(cfg.buyInEur) || 0;
    var hero = (global.PTTournamentState && global.PTTournamentState.hero)
      ? global.PTTournamentState.hero(state)
      : (state.players || []).find(function (p) { return p.isHero; });

    var place = null;
    if (state.result && state.result.place != null) place = state.result.place;
    else if (hero && !hero.alive && hero.bustPlace != null) place = hero.bustPlace;
    else if (hero && hero.alive) {
      var left = Seat ? Seat.alivePlayers(state).length : 0;
      if (left <= 1) place = 1;
    }

    var prizeEur = 0;
    if (state.result && state.result.prizeEur != null) {
      prizeEur = Number(state.result.prizeEur) || 0;
    } else if (place != null && Cfg && Cfg.payoutEuros) {
      var ladder = Cfg.payoutEuros(cfg);
      if (place >= 1 && place <= ladder.length) prizeEur = ladder[place - 1] || 0;
    }

    var invested = buyIn;
    var profit = Math.round((prizeEur - invested) * 100) / 100;
    var roi = invested > 0 ? Math.round((profit / invested) * 1000) / 10 : 0;

    var st = ensureStats(state);
    var roleScore = Guess && Guess.score ? Guess.score(state) : { accuracy: 0, correct: 0, total: 0 };
    var roleAccuracy = roleScore.accuracy;

    return {
      place: place,
      prizeEur: prizeEur,
      invested: invested,
      profit: profit,
      roi: roi,
      handsPlayed: st.handsPlayed || 0,
      vpip: pct(st.vpipHands || 0, st.handsPlayed || 0),
      pfr: pct(st.pfrHands || 0, st.handsPlayed || 0),
      wonHands: st.wonHands || 0,
      wentToShowdown: st.wentToShowdown || 0,
      roleAccuracy: roleAccuracy,
      roleCorrect: roleScore.correct || 0,
      roleTotal: roleScore.total || 0
    };
  }

  global.PTTournamentStats = {
    onHandComplete: onHandComplete,
    summary: summary,
    ensureStats: ensureStats
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
