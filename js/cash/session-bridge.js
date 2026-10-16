/*
 * cash/session-bridge.js — Manos cash → shape de sesión analizada (formatHub cash).
 * Reutiliza el bridge de torneos y fuerza hub cash.
 */
(function (global) {
  'use strict';

  function metaFromState(state, extra) {
    extra = extra || {};
    var Tourney = global.PTTournamentSessionBridge;
    var base = {};
    if (Tourney && typeof Tourney.metaFromState === 'function') {
      try { base = Tourney.metaFromState(state, extra) || {}; } catch (e) { base = {}; }
    }
    var cfg = (state && state.config) || {};
    base.formatHub = 'cash';
    base.gameType = 'cash6';
    base.kind = 'cash';
    base.isTournament = false;
    base.tournamentId = state && state.id;
    base.stakeLabel = cfg.stakeLabel || cfg.id;
    base.stakeNl = cfg.stakeNl;
    base.buyIn = cfg.buyInEur;
    if (extra.handIndex != null) base.handIndex = extra.handIndex;
    if (extra.heroName) base.heroName = extra.heroName;
    return base;
  }

  function handFromTournament(entry, meta) {
    var Tourney = global.PTTournamentSessionBridge;
    if (!Tourney || typeof Tourney.handFromTournament !== 'function') return null;
    meta = Object.assign({}, meta || {}, { formatHub: 'cash', gameType: 'cash6', kind: 'cash' });
    var hand = Tourney.handFromTournament(entry, meta);
    if (!hand) return null;
    hand.formatHub = 'cash';
    hand.gameType = hand.gameType || 'cash6';
    hand.kind = 'cash';
    return hand;
  }

  global.PTCashSessionBridge = {
    metaFromState: metaFromState,
    handFromTournament: handFromTournament
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
