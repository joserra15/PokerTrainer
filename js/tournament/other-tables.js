/*
 * tournament/other-tables.js — Simulación AI-vs-AI de mesas satélite.
 * scheduleRound: job en background (idle) durante la mano hero / resumen.
 * commitPending / simulateRound: aplicar resultados al field.
 */
(function (global) {
  'use strict';

  function r2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  function applyDeltas(state, hand) {
    var Seat = global.PTTournamentSeating;
    var deltas = (hand && hand.result && hand.result.deltas) || {};
    var eliminated = [];
    Object.keys(deltas).forEach(function (pid) {
      var p = (state.players || []).find(function (x) { return x.id === pid; });
      if (!p || !p.alive) return;
      p.stack = Math.max(0, r2((Number(p.stack) || 0) + (Number(deltas[pid]) || 0)));
      if (p.stack <= 0) {
        Seat.bustPlayer(state, pid);
        eliminated.push({ id: pid, name: p.name, place: p.bustPlace });
      }
    });
    return eliminated;
  }

  function applyDeltaMap(state, deltas) {
    var Seat = global.PTTournamentSeating;
    var eliminated = [];
    Object.keys(deltas || {}).forEach(function (pid) {
      var p = (state.players || []).find(function (x) { return x.id === pid; });
      if (!p || !p.alive) return;
      p.stack = Math.max(0, r2((Number(p.stack) || 0) + (Number(deltas[pid]) || 0)));
      if (p.stack <= 0) {
        Seat.bustPlayer(state, pid);
        eliminated.push({ id: pid, name: p.name, place: p.bustPlace });
      }
    });
    return eliminated;
  }

  function mergeDeltas(into, from) {
    Object.keys(from || {}).forEach(function (pid) {
      into[pid] = r2((Number(into[pid]) || 0) + (Number(from[pid]) || 0));
    });
    return into;
  }

  /* Timers fuera del state (setTimeout no es JSON-serializable). */
  var TIMERS = Object.create(null);

  function timerKey(state) {
    return (state && state.id) ? String(state.id) : '';
  }

  function cancelTimer(state) {
    var key = timerKey(state);
    var t = key && TIMERS[key];
    if (!t) return;
    if (t.idleId != null && typeof global.cancelIdleCallback === 'function') {
      try { global.cancelIdleCallback(t.idleId); } catch (e) { /* */ }
    }
    if (t.timeoutId != null && typeof global.clearTimeout === 'function') {
      try { global.clearTimeout(t.timeoutId); } catch (e2) { /* */ }
    }
    delete TIMERS[key];
  }

  /** Snapshot de botones de mesas satélite para restaurar si se cancela el pending. */
  function snapshotButtons(state, tableIds) {
    var snap = {};
    (tableIds || []).forEach(function (tid) {
      snap[tid] = {
        id: state['_btnPlayer_' + tid] || null,
        idx: state['_btn_' + tid]
      };
    });
    return snap;
  }

  function restoreButtons(state, snap) {
    if (!state || !snap) return;
    Object.keys(snap).forEach(function (tid) {
      var s = snap[tid] || {};
      if (s.id != null) state['_btnPlayer_' + tid] = s.id;
      else delete state['_btnPlayer_' + tid];
      if (s.idx != null) state['_btn_' + tid] = s.idx;
      else delete state['_btn_' + tid];
    });
  }

  function scheduleIdle(fn, timeoutMs) {
    if (typeof global.requestIdleCallback === 'function') {
      return {
        kind: 'idle',
        id: global.requestIdleCallback(function () { fn(); }, { timeout: timeoutMs || 120 })
      };
    }
    if (typeof global.setTimeout === 'function') {
      return {
        kind: 'timeout',
        id: global.setTimeout(function () { fn(); }, 0)
      };
    }
    /* Sandbox de test / sin timers: ejecutar en sync. */
    fn();
    return { kind: 'sync', id: null };
  }

  function blindsForNextHand(state) {
    var Runner = global.PTTournamentRunner;
    if (!Runner || typeof Runner.blindsFor !== 'function') {
      return { sb: 10, bb: 20, ante: 0, level: 1 };
    }
    var saved = Number(state.handIndex) || 0;
    state.handIndex = saved + 1;
    var blinds = Runner.blindsFor(state);
    state.handIndex = saved;
    return blinds;
  }

  function satelliteTableIds(state) {
    var Seat = global.PTTournamentSeating;
    var ids = [];
    (state.tables || []).forEach(function (tb) {
      if (!tb || tb.isHeroTable) return;
      var onTable = Seat.playersOnTable(state, tb.id);
      if (onTable.length < 2) return;
      ids.push(tb.id);
    });
    return ids;
  }

  function simulateOneTable(state, tableId, blinds) {
    var Seat = global.PTTournamentSeating;
    var Live = global.PTTournamentLiveHand;
    var onTable = Seat.playersOnTable(state, tableId);
    if (onTable.length < 2) return null;
    var buttonId = Seat.assignButton(state, tableId);
    var ordered = Seat.seatOrderWithButton(onTable, buttonId);
    if (ordered.length < 2) return null;
    var hand = Live.simulateTable(ordered, blinds, state);
    return hand;
  }

  function processNext(state) {
    var pending = state && state._satPending;
    if (!pending || pending.cancelled || pending.done) return;
    if (!pending.queue || !pending.queue.length) {
      pending.done = true;
      cancelTimer(pending);
      return;
    }
    var tableId = pending.queue.shift();
    try {
      var hand = simulateOneTable(state, tableId, pending.blinds);
      pending.tablesSimulated += 1;
      if (hand && hand.result && hand.result.deltas) {
        mergeDeltas(pending.deltasByPlayer, hand.result.deltas);
        var Seat = global.PTTournamentSeating;
        Object.keys(hand.result.deltas).forEach(function (pid) {
          var p = (state.players || []).find(function (x) { return x.id === pid; });
          if (!p || !p.alive) return;
          var next = r2((Number(p.stack) || 0) + (Number(hand.result.deltas[pid]) || 0));
          /* No mutar stacks vivos aún: solo anotar busts potenciales sobre stack actual. */
          if (next <= 0) {
            pending.bustIds[pid] = true;
          }
        });
        void Seat;
      }
    } catch (eSim) { /* ignore table failure */ }

    if (!pending.queue.length) {
      pending.done = true;
      cancelTimer(state);
      return;
    }
    /* flushSync/boostPriority recorren el while; no encolar timers. */
    if (pending.flushing) return;
    enqueueContinue(state, !!pending.boost);
  }

  function enqueueContinue(state, boost) {
    var pending = state && state._satPending;
    if (!pending || pending.cancelled || pending.done || pending.flushing) return;
    cancelTimer(state);
    var key = timerKey(state);
    var handle = scheduleIdle(function () {
      if (key) delete TIMERS[key];
      processNext(state);
    }, boost ? 16 : 200);
    if (handle.kind === 'sync' || !key) return;
    TIMERS[key] = handle.kind === 'idle'
      ? { idleId: handle.id, timeoutId: null }
      : { idleId: null, timeoutId: handle.id };
  }

  /**
   * Arranca simulación en background de 1 mano por mesa satélite.
   * Usa blinds del handIndex+1 (mismo reloj que applyResults tras incrementar).
   */
  function scheduleRound(state) {
    if (!state || state.status === 'finished') return null;
    cancelPending(state);
    var queue = satelliteTableIds(state);
    var blinds = blindsForNextHand(state);
    state._satPending = {
      targetHandIndex: (Number(state.handIndex) || 0) + 1,
      blinds: blinds,
      queue: queue.slice(),
      deltasByPlayer: {},
      bustIds: {},
      tablesSimulated: 0,
      done: !queue.length,
      cancelled: false,
      boost: false,
      buttonSnap: snapshotButtons(state, queue)
    };
    if (queue.length) enqueueContinue(state, false);
    return state._satPending;
  }

  /** Vacía la cola con prioridad (p.ej. pantalla de resumen). */
  function boostPriority(state) {
    var pending = state && state._satPending;
    if (!pending || pending.cancelled) return;
    pending.boost = true;
    if (pending.done) return;
    cancelTimer(state);
    pending.flushing = true;
    try {
      while (pending.queue && pending.queue.length && !pending.cancelled) {
        processNext(state);
      }
    } finally {
      pending.flushing = false;
    }
  }

  function flushSync(state) {
    var pending = state && state._satPending;
    if (!pending || pending.cancelled) return pending;
    cancelTimer(state);
    pending.flushing = true;
    try {
      while (pending.queue && pending.queue.length && !pending.cancelled) {
        processNext(state);
      }
    } finally {
      pending.flushing = false;
    }
    pending.done = true;
    return pending;
  }

  function cancelPending(state) {
    if (!state || !state._satPending) return;
    var pending = state._satPending;
    pending.cancelled = true;
    cancelTimer(state);
    /* Si no se llegó a commit, restaurar botones (assignButton ya pudo avanzar). */
    if (!pending.committed) restoreButtons(state, pending.buttonSnap);
    state._satPending = null;
  }

  /**
   * Aplica el pending si corresponde al handIndex actual; si no, simula sync.
   * Devuelve { eliminated, tablesSimulated, fromPending }.
   */
  function commitPending(state, blinds) {
    var Seat = global.PTTournamentSeating;
    var pending = state && state._satPending;
    var handIndex = Number(state.handIndex) || 0;
    if (pending && !pending.cancelled && pending.targetHandIndex === handIndex) {
      flushSync(state);
      pending.committed = true;
      var eliminated = applyDeltaMap(state, pending.deltasByPlayer);
      var tablesSimulated = pending.tablesSimulated || 0;
      state._satPending = null;
      Seat.rebalance(state);
      return { eliminated: eliminated, tablesSimulated: tablesSimulated, fromPending: true };
    }
    cancelPending(state);
    return simulateRound(state, blinds);
  }

  /** Simula una ronda en todas las mesas no-Hero con ≥2 vivos (síncrono). */
  function simulateRound(state, blinds) {
    var Seat = global.PTTournamentSeating;
    var eliminated = [];
    var tablesSimulated = 0;
    var tables = (state.tables || []).slice();
    blinds = blinds || { sb: 10, bb: 20, ante: 0 };

    tables.forEach(function (tb) {
      if (!tb || tb.isHeroTable) return;
      var hand = simulateOneTable(state, tb.id, blinds);
      if (!hand) return;
      tablesSimulated += 1;
      var busted = applyDeltas(state, hand);
      eliminated = eliminated.concat(busted);
    });

    Seat.rebalance(state);
    return { eliminated: eliminated, tablesSimulated: tablesSimulated, fromPending: false };
  }

  global.PTTournamentOtherTables = {
    simulateRound: simulateRound,
    applyDeltas: applyDeltas,
    scheduleRound: scheduleRound,
    boostPriority: boostPriority,
    flushSync: flushSync,
    commitPending: commitPending,
    cancelPending: cancelPending
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
