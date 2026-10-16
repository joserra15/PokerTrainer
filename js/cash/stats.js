/*
 * cash/stats.js — Stats ligeras de sesión cash (bb/100, manos).
 */
(function (global) {
  'use strict';

  function r2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  function onHandComplete(state, hand, heroId) {
    if (!state || !hand) return;
    state.stats = state.stats || {};
    state.stats.handsPlayed = (Number(state.stats.handsPlayed) || 0) + 1;
    var heroSeat = (hand.seats || []).find(function (s) {
      return s && (s.isHero || s.id === heroId);
    });
    if (!heroSeat) return;
    var invested = Number(heroSeat.invested) || 0;
    var bb = Math.max(1, Number(hand.bb) || 20);
    if (invested > bb * 0.5) {
      state.stats.vpipHands = (Number(state.stats.vpipHands) || 0) + 1;
    }
    var log = hand.log || [];
    var heroPfr = log.some(function (e) {
      return e && e.actorId === heroSeat.id &&
        (e.action === 'raise' || e.action === 'bet' || e.action === 'allin') &&
        e.street === 'preflop';
    });
    if (heroPfr) state.stats.pfrHands = (Number(state.stats.pfrHands) || 0) + 1;
    if (hand.result && hand.result.showdown) {
      state.stats.wentToShowdown = (Number(state.stats.wentToShowdown) || 0) + 1;
    }
    var net = hand.result ? Number(hand.result.heroNet) || 0 : 0;
    if (net > 0) state.stats.wonHands = (Number(state.stats.wonHands) || 0) + 1;
  }

  function sessionBbWon(state) {
    var cfg = state && state.config;
    var Cfg = global.PTCashConfig;
    var start = (cfg && cfg.startingStack) || (Cfg && Cfg.STARTING_STACK) || 2000;
    var bb = (cfg && cfg.bb) || (Cfg && Cfg.BB_CHIPS) || 20;
    var hero = global.PTCashState && global.PTCashState.hero(state);
    var stack = hero ? Number(hero.stack) || 0 : 0;
    var buyIns = Math.max(1, Number(state.buyInsPaid) || 1);
    var investedChips = start * buyIns;
    return r2((stack - investedChips) / bb);
  }

  function bbPer100(state) {
    var hands = Number(state && state.stats && state.stats.handsPlayed) || 0;
    if (hands <= 0) return 0;
    return r2(sessionBbWon(state) / hands * 100);
  }

  function summary(state) {
    var hands = Number(state && state.stats && state.stats.handsPlayed) || 0;
    var vpip = hands ? Math.round((Number(state.stats.vpipHands) || 0) / hands * 1000) / 10 : 0;
    var pfr = hands ? Math.round((Number(state.stats.pfrHands) || 0) / hands * 1000) / 10 : 0;
    return {
      hands: hands,
      vpip: vpip,
      pfr: pfr,
      bbWon: sessionBbWon(state),
      bbPer100: bbPer100(state),
      rakePaid: r2(state && state.stats && state.stats.rakePaid)
    };
  }

  global.PTCashStats = {
    onHandComplete: onHandComplete,
    sessionBbWon: sessionBbWon,
    bbPer100: bbPer100,
    summary: summary
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
