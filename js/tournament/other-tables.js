/*
 * tournament/other-tables.js — Simulación AI-vs-AI de mesas satélite.
 */
(function (global) {
  'use strict';

  function applyDeltas(state, hand) {
    var Seat = global.PTTournamentSeating;
    var deltas = (hand && hand.result && hand.result.deltas) || {};
    var eliminated = [];
    Object.keys(deltas).forEach(function (pid) {
      var p = (state.players || []).find(function (x) { return x.id === pid; });
      if (!p || !p.alive) return;
      p.stack = Math.max(0, Math.round(((Number(p.stack) || 0) + (Number(deltas[pid]) || 0)) * 100) / 100);
      if (p.stack <= 0) {
        Seat.bustPlayer(state, pid);
        eliminated.push({ id: pid, name: p.name, place: p.bustPlace });
      }
    });
    return eliminated;
  }

  /** Simula una ronda en todas las mesas no-Hero con ≥2 vivos. */
  function simulateRound(state, blinds) {
    var Seat = global.PTTournamentSeating;
    var Live = global.PTTournamentLiveHand;
    var eliminated = [];
    var tablesSimulated = 0;
    var tables = (state.tables || []).slice();
    blinds = blinds || { sb: 10, bb: 20, ante: 0 };

    tables.forEach(function (tb) {
      if (!tb || tb.isHeroTable) return;
      var onTable = Seat.playersOnTable(state, tb.id);
      if (onTable.length < 2) return;

      var buttonId = Seat.assignButton(state, tb.id);
      var ordered = Seat.seatOrderWithButton(onTable, buttonId);
      if (ordered.length < 2) return;

      var hand = Live.simulateTable(ordered, blinds);
      tablesSimulated += 1;
      var busted = applyDeltas(state, hand);
      eliminated = eliminated.concat(busted);
    });

    Seat.rebalance(state);
    return { eliminated: eliminated, tablesSimulated: tablesSimulated };
  }

  global.PTTournamentOtherTables = {
    simulateRound: simulateRound,
    applyDeltas: applyDeltas
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
