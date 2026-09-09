/*
 * tournament/seating.js — Asignación de mesas, bust-outs y rebalance / FT.
 *
 * Los rivales de la mesa del Hero se mantienen entre manos. Solo entran
 * jugadores nuevos al liberarse un asiento (eliminación), al fusionar mesas
 * hacia la mesa final, o al equilibrar tamaños entre mesas (p. ej. 9+3 → 6+6).
 * No se baraja el field en cada mano.
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

  function shuffleInPlace(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function nextTableId(tables) {
    var n = 1;
    while (tables.some(function (t) { return t.id === 'T' + n; })) n++;
    return 'T' + n;
  }

  function playerById(alive, id) {
    for (var i = 0; i < alive.length; i++) {
      if (alive[i].id === id) return alive[i];
    }
    return null;
  }

  /** Asigna asiento compacto 0..n-1 preservando el orden relativo actual. */
  function reindexSeats(table, alive) {
    table.seatIds.forEach(function (id, idx) {
      var p = playerById(alive, id);
      if (p) {
        p.tableId = table.id;
        p.seat = idx;
      }
    });
  }

  function seatPlayer(table, player, alive) {
    if (!table || !player) return;
    if (table.seatIds.indexOf(player.id) >= 0) return;
    player.tableId = table.id;
    player.seat = table.seatIds.length;
    table.seatIds.push(player.id);
    reindexSeats(table, alive);
  }

  function detachPlayer(tables, player) {
    if (!player) return;
    tables.forEach(function (tb) {
      tb.seatIds = (tb.seatIds || []).filter(function (id) { return id !== player.id; });
    });
    player.tableId = null;
    player.seat = null;
  }

  /**
   * Tras eliminaciones: quita busteds, fusiona mesas si hace falta, rellena
   * huecos y equilibra tamaños entre mesas. No baraja rivales de la mesa Hero
   * entre manos salvo que haga falta mover fichas para equilibrar (p. ej. 9+3 → 6+6).
   */
  function rebalance(state) {
    var cfg = state.config || {};
    var seats = cfg.seatsPerTable || 6;
    var alive = alivePlayers(state);
    var prevCount = state._lastTableCount || ((state.tables && state.tables.length) || 0);

    if (alive.length <= 1) {
      if (alive.length === 1) {
        var only = alive[0];
        var tid = only.tableId || 'T1';
        only.tableId = tid;
        only.seat = 0;
        state.tables = [{ id: tid, seatIds: [only.id], isHeroTable: !!only.isHero }];
      } else {
        state.tables = [];
      }
      state._lastTableCount = state.tables.length;
      return { merged: false, tables: state.tables.length };
    }

    var needTables = Math.ceil(alive.length / seats);
    var hero = alive.find(function (p) { return p.isHero; });
    var isInitial = !state.tables || !state.tables.length;
    var tables = [];
    var seated = {};

    if (!isInitial) {
      (state.tables || []).forEach(function (tb) {
        var ids = (tb.seatIds || []).filter(function (id) {
          return !!playerById(alive, id);
        });
        if (!ids.length) return;
        var nt = {
          id: tb.id,
          seatIds: ids.slice(),
          isHeroTable: !!tb.isHeroTable
        };
        reindexSeats(nt, alive);
        ids.forEach(function (id) { seated[id] = true; });
        tables.push(nt);
      });
    }

    var orphans = alive.filter(function (p) { return !seated[p.id]; });

    if (isInitial) {
      var others = alive.filter(function (p) { return !p.isHero; });
      shuffleInPlace(others);
      orphans = hero ? [hero].concat(others) : others;
      tables = [];
      for (var t = 0; t < needTables; t++) {
        tables.push({ id: 'T' + (t + 1), seatIds: [], isHeroTable: false });
      }
      orphans.forEach(function (p, idx) {
        seatPlayer(tables[idx % needTables], p, alive);
      });
      orphans = [];
    }

    /* Asegurar que Hero tiene mesa. */
    if (hero && !playerById(alive, hero.id).tableId) {
      var ht0 = tables.find(function (tb) { return tb.isHeroTable; }) || tables[0];
      if (!ht0) {
        ht0 = { id: 'T1', seatIds: [], isHeroTable: true };
        tables.push(ht0);
      }
      seatPlayer(ht0, hero, alive);
      orphans = orphans.filter(function (p) { return p.id !== hero.id; });
    }

    /* Romper mesas sobrantes (nunca la del Hero) hasta needTables. */
    function breakSmallestNonHero() {
      var candidates = tables
        .filter(function (tb) { return !tb.isHeroTable; })
        .sort(function (a, b) {
          if (a.seatIds.length !== b.seatIds.length) return a.seatIds.length - b.seatIds.length;
          return String(a.id).localeCompare(String(b.id));
        });
      var victim = candidates[0];
      if (!victim) return false;
      var moved = victim.seatIds.slice();
      tables = tables.filter(function (tb) { return tb.id !== victim.id; });
      moved.forEach(function (id) {
        var p = playerById(alive, id);
        if (!p) return;
        p.tableId = null;
        p.seat = null;
        orphans.push(p);
        delete seated[id];
      });
      return true;
    }

    while (tables.length > needTables) {
      if (!breakSmallestNonHero()) break;
    }

    while (tables.length < needTables) {
      tables.push({ id: nextTableId(tables), seatIds: [], isHeroTable: false });
    }

    /* Marcar mesa Hero. */
    tables.forEach(function (tb) {
      tb.isHeroTable = !!(hero && tb.seatIds.indexOf(hero.id) >= 0);
    });

    orphans = orphans.filter(function (p) {
      return p && p.alive && p.stack > 0 && !tables.some(function (tb) {
        return tb.seatIds.indexOf(p.id) >= 0;
      });
    });
    orphans.sort(function (a, b) {
      if (!!a.isHero !== !!b.isHero) return a.isHero ? -1 : 1;
      return String(a.id).localeCompare(String(b.id));
    });

    function openSeats(tb) {
      return Math.max(0, seats - (tb.seatIds || []).length);
    }

    function pickTargetTable() {
      var withRoom = tables.filter(function (tb) { return openSeats(tb) > 0; });
      if (!withRoom.length) {
        return tables.slice().sort(function (a, b) {
          return a.seatIds.length - b.seatIds.length;
        })[0] || null;
      }
      withRoom.sort(function (a, b) {
        /* Prioriza rellenar la mesa Hero (sustituir eliminados) y luego equilibrar. */
        if (a.isHeroTable !== b.isHeroTable) return a.isHeroTable ? -1 : 1;
        if (a.seatIds.length !== b.seatIds.length) return a.seatIds.length - b.seatIds.length;
        return String(a.id).localeCompare(String(b.id));
      });
      return withRoom[0];
    }

    orphans.forEach(function (p) {
      var target = pickTargetTable();
      if (!target) return;
      seatPlayer(target, p, alive);
    });

    /* Si alguna mesa sigue con 1 jugador y hay >1 mesa, romperla. */
    var guard = 0;
    while (guard++ < 20) {
      var singleton = tables.find(function (tb) {
        return !tb.isHeroTable && tb.seatIds.length > 0 && tb.seatIds.length < 2;
      });
      if (!singleton || tables.length <= needTables) break;
      if (!breakSmallestNonHero()) break;
      orphans = alive.filter(function (p) {
        return !tables.some(function (tb) { return tb.seatIds.indexOf(p.id) >= 0; });
      });
      orphans.forEach(function (p) {
        var target = pickTargetTable();
        if (target) seatPlayer(target, p, alive);
      });
    }

    tables = tables.filter(function (tb) { return tb.seatIds && tb.seatIds.length; });
    tables.forEach(function (tb) {
      tb.isHeroTable = !!(hero && tb.seatIds.indexOf(hero.id) >= 0);
      reindexSeats(tb, alive);
    });

    /* Si tras limpiezas sobran mesas, fusionar otra vez. */
    while (tables.length > needTables) {
      if (!breakSmallestNonHero()) break;
      orphans = alive.filter(function (p) {
        return !tables.some(function (tb) { return tb.seatIds.indexOf(p.id) >= 0; });
      });
      orphans.forEach(function (p) {
        var target = pickTargetTable();
        if (target) seatPlayer(target, p, alive);
      });
      tables = tables.filter(function (tb) { return tb.seatIds.length; });
      tables.forEach(function (tb) {
        tb.isHeroTable = !!(hero && tb.seatIds.indexOf(hero.id) >= 0);
        reindexSeats(tb, alive);
      });
    }

    /**
     * Equilibra el número de jugadores por mesa (p. ej. 12 vivos → 6+6, no 9+3).
     * Mueve solo no-Hero; prioriza donar desde mesas que no son la del Hero.
     * La frecuencia de rebalance no cambia: solo el criterio de destino.
     */
    function equalizeTableSizes() {
      if (tables.length <= 1) return;
      var eqGuard = 0;
      while (eqGuard++ < 200) {
        tables.forEach(function (tb) {
          tb.isHeroTable = !!(hero && tb.seatIds.indexOf(hero.id) >= 0);
        });

        var sorted = tables.slice().sort(function (a, b) {
          if (a.seatIds.length !== b.seatIds.length) return a.seatIds.length - b.seatIds.length;
          return String(a.id).localeCompare(String(b.id));
        });
        var smallest = sorted[0];
        var largest = sorted[sorted.length - 1];
        if (!smallest || !largest) break;
        if (largest.seatIds.length - smallest.seatIds.length <= 1) break;
        if (openSeats(smallest) <= 0) break;

        var maxLen = largest.seatIds.length;
        var donors = tables
          .filter(function (tb) { return tb.seatIds.length === maxLen && tb.id !== smallest.id; })
          .sort(function (a, b) {
            if (a.isHeroTable !== b.isHeroTable) return a.isHeroTable ? 1 : -1;
            return String(a.id).localeCompare(String(b.id));
          });

        var mover = null;
        var donor = null;
        for (var d = 0; d < donors.length && !mover; d++) {
          var candDonor = donors[d];
          for (var di = 0; di < candDonor.seatIds.length; di++) {
            var candId = candDonor.seatIds[di];
            if (hero && candId === hero.id) continue;
            var p = playerById(alive, candId);
            if (!p) continue;
            donor = candDonor;
            mover = p;
            break;
          }
        }
        if (!mover || !donor) break;

        detachPlayer(tables, mover);
        seatPlayer(smallest, mover, alive);
      }
    }

    equalizeTableSizes();

    tables = tables.filter(function (tb) { return tb.seatIds && tb.seatIds.length; });
    tables.forEach(function (tb) {
      tb.isHeroTable = !!(hero && tb.seatIds.indexOf(hero.id) >= 0);
      reindexSeats(tb, alive);
    });

    state.tables = tables;
    var merged = needTables === 1 && prevCount > 1;
    state._lastTableCount = tables.length;
    if (merged) {
      state.events = state.events || [];
      state.events.push({ type: 'final_table', at: Date.now(), players: alive.length });
    }
    return { merged: merged, tables: tables.length };
  }

  function assignButton(state, tableId) {
    var seats = playersOnTable(state, tableId).sort(function (a, b) {
      return (a.seat || 0) - (b.seat || 0);
    });
    if (!seats.length) return null;
    var idKey = '_btnPlayer_' + tableId;
    var idxKey = '_btn_' + tableId;
    var prevId = state[idKey] || null;
    var prevIdx = -1;
    if (prevId) {
      prevIdx = seats.findIndex(function (p) { return p.id === prevId; });
    }
    /* Fallback legado: índice guardado (puede desalinear tras bust+reindex). */
    if (prevIdx < 0 && state[idxKey] != null) {
      var legacy = Number(state[idxKey]);
      if (isFinite(legacy) && legacy >= 0) prevIdx = Math.min(legacy, seats.length - 1);
    }
    var next = (prevIdx + 1) % seats.length;
    state[idxKey] = next;
    state[idKey] = seats[next].id;
    return seats[next].id;
  }

  function positionsForCount(n) {
    if (n <= 2) return ['SB', 'BB'];
    if (n <= 3) return ['BTN', 'SB', 'BB'];
    if (n <= 6) return ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].slice(6 - n);
    var nine = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    return nine.slice(9 - n);
  }

  /**
   * Orden horario físico desde el botón: BTN → SB → BB → early (UTG…) → CO.
   */
  function seatOrderWithButton(players, buttonPlayerId) {
    var sorted = players.slice().sort(function (a, b) { return (a.seat || 0) - (b.seat || 0); });
    if (!sorted.length) return [];
    var btnIdx = sorted.findIndex(function (p) { return p.id === buttonPlayerId; });
    if (btnIdx < 0) btnIdx = 0;
    var rotated = sorted.slice(btnIdx).concat(sorted.slice(0, btnIdx));
    var n = rotated.length;
    var labels;
    if (n === 2) {
      labels = ['BTN', 'BB'];
    } else {
      labels = new Array(n);
      labels[0] = 'BTN';
      labels[1] = 'SB';
      labels[2] = 'BB';
      var early = positionsForCount(n).filter(function (p) {
        return p !== 'BTN' && p !== 'SB' && p !== 'BB';
      });
      var ei = 0;
      for (var i = 3; i < n; i++) {
        labels[i] = early[ei++] || ('S' + i);
      }
    }
    return rotated.map(function (p, i) {
      return {
        player: p,
        pos: labels[i],
        seatIndex: i,
        physicalSeat: p.seat != null ? p.seat : i
      };
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
