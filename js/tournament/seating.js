/*
 * tournament/seating.js — Asignación de mesas, bust-outs y rebalance / FT.
 */
(function (global) {
  'use strict';

  function alivePlayers(state) {
    return (state.players || []).filter(function (p) { return p.alive && p.stack > 0; });
  }

  function playersOnTable(state, tableId) {
    return alivePlayers(state).filter(function (p) { return p.tableId === tableId; });
  }

  function rankByStack(state) {
    var alive = alivePlayers(state).slice().sort(function (a, b) {
      if (b.stack !== a.stack) return b.stack - a.stack;
      return String(a.id).localeCompare(String(b.id));
    });
    var map = {};
    alive.forEach(function (p, i) { map[p.id] = i + 1; });
    return map;
  }

  function heroFieldRank(state) {
    var hero = (state.players || []).find(function (p) { return p.isHero; });
    if (!hero || !hero.alive) return null;
    return rankByStack(state)[hero.id] || null;
  }

  function averageStack(state) {
    var alive = alivePlayers(state);
    if (!alive.length) return 0;
    var sum = 0;
    alive.forEach(function (p) { sum += p.stack; });
    return Math.round(sum / alive.length);
  }

  function bustPlayer(state, playerId, place) {
    var p = (state.players || []).find(function (x) { return x.id === playerId; });
    if (!p || !p.alive) return;
    p.alive = false;
    p.stack = 0;
    p.bustPlace = place != null ? place : (alivePlayers(state).length + 1);
    p.tableId = null;
    p.seat = null;
    state.events = state.events || [];
    state.events.push({
      type: 'bust',
      at: Date.now(),
      playerId: playerId,
      name: p.name,
      place: p.bustPlace
    });
  }

  /** Tras eliminaciones: compacta mesas y fusiona a FT si cabe en una. */
  function rebalance(state) {
    var cfg = state.config;
    var seats = cfg.seatsPerTable || 6;
    var alive = alivePlayers(state);
    if (alive.length <= 1) return { merged: false, tables: 1 };

    var needTables = Math.ceil(alive.length / seats);
    // Reparte en mesas 0..needTables-1 lo más equilibrado posible
    var tables = [];
    for (var t = 0; t < needTables; t++) {
      tables.push({ id: 'T' + (t + 1), seatIds: [], isHeroTable: false });
    }
    // Mantener Hero en mesa 1 si posible
    var hero = alive.find(function (p) { return p.isHero; });
    var others = alive.filter(function (p) { return !p.isHero; });
    // Shuffle ligero de others para variedad
    for (var i = others.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = others[i];
      others[i] = others[j];
      others[j] = tmp;
    }
    var ordered = hero ? [hero].concat(others) : others;
    ordered.forEach(function (p, idx) {
      var ti = idx % needTables;
      var seat = tables[ti].seatIds.length;
      p.tableId = tables[ti].id;
      p.seat = seat;
      tables[ti].seatIds.push(p.id);
    });
    if (hero) {
      var ht = tables.find(function (tb) { return tb.seatIds.indexOf(hero.id) >= 0; });
      if (ht) ht.isHeroTable = true;
    } else if (tables[0]) {
      tables[0].isHeroTable = true;
    }
    state.tables = tables;
    var merged = needTables === 1 && (state._lastTableCount || 0) > 1;
    state._lastTableCount = needTables;
    if (merged) {
      state.events.push({ type: 'final_table', at: Date.now(), players: alive.length });
    }
    return { merged: merged, tables: needTables };
  }

  function assignButton(state, tableId) {
    var seats = playersOnTable(state, tableId).sort(function (a, b) {
      return (a.seat || 0) - (b.seat || 0);
    });
    if (!seats.length) return null;
    var key = '_btn_' + tableId;
    var prev = state[key] != null ? state[key] : -1;
    var next = (prev + 1) % seats.length;
    state[key] = next;
    return seats[next].id;
  }

  function positionsForCount(n) {
    if (n <= 2) return ['SB', 'BB'];
    if (n <= 3) return ['BTN', 'SB', 'BB'];
    if (n <= 6) return ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].slice(6 - n);
    // 7–9
    var nine = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    return nine.slice(9 - n);
  }

  /** Ordena jugadores de una mesa con botón en `buttonPlayerId` y asigna labels de posición. */
  function seatOrderWithButton(players, buttonPlayerId) {
    var sorted = players.slice().sort(function (a, b) { return (a.seat || 0) - (b.seat || 0); });
    if (!sorted.length) return [];
    var btnIdx = sorted.findIndex(function (p) { return p.id === buttonPlayerId; });
    if (btnIdx < 0) btnIdx = 0;
    var rotated = sorted.slice(btnIdx).concat(sorted.slice(0, btnIdx));
    // En heads-up: BTN = SB
    var n = rotated.length;
    var labels;
    if (n === 2) {
      labels = ['BTN', 'BB'];
    } else {
      // rotated[0] = BTN; SB y BB son los dos últimos
      labels = new Array(n);
      labels[0] = 'BTN';
      labels[n - 2] = 'SB';
      labels[n - 1] = 'BB';
      var early = positionsForCount(n).filter(function (p) {
        return p !== 'BTN' && p !== 'SB' && p !== 'BB';
      });
      var ei = 0;
      for (var i = 1; i < n - 2; i++) {
        labels[i] = early[ei++] || ('S' + i);
      }
    }
    return rotated.map(function (p, i) {
      return { player: p, pos: labels[i], seatIndex: i };
    });
  }

  global.PTTournamentSeating = {
    alivePlayers: alivePlayers,
    playersOnTable: playersOnTable,
    rankByStack: rankByStack,
    heroFieldRank: heroFieldRank,
    averageStack: averageStack,
    bustPlayer: bustPlayer,
    rebalance: rebalance,
    assignButton: assignButton,
    positionsForCount: positionsForCount,
    seatOrderWithButton: seatOrderWithButton
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
