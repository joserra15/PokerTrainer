/*
 * villainTracking.js — Estima cómo se estrecha el rango del villano según sus acciones.
 */
(function (global) {
  'use strict';

  const ACTION_LABELS = {
    fold: 'se retira',
    check: 'pasa',
    call: 'iguala',
    bet: 'apuesta',
    raise: 'sube',
    open: 'abre'
  };

  function isRiver(street) { return street === 'river'; }

  function describeRangeChange(action, street, amountBB, prevNote, ctx) {
    ctx = ctx || {};
    const amt = amountBB != null ? ` (${amountBB}bb)` : '';
    const st = street || 'flop';

    switch (action) {
      case 'fold':
        return { note: 'Rango eliminado — el villano no tiene cartas en juego.', tag: 'fold', summary: `${cap(st)}: fold → fuera de mano.` };
      case 'check':
        return {
          note: isRiver(st)
            ? 'River check OOP en board pareado/texturizado: rango capado en valor plano (bluff-catchers) pero incluye traps (full house, quads) que buscan check-raise o check-call. No es solo rango pasivo.'
            : 'Rango acotado: se quitan muchos faroles puros que apostarían. Persisten manos medias, proyectos y algunas fuertes en check.',
          tag: 'passive',
          summary: isRiver(st)
            ? `${cap(st)}: check → capado + traps (full house); línea check-call / check-raise.`
            : `${cap(st)}: check → rango más acotado (menos faroles puros).`
        };
      case 'call':
        if (isRiver(st) && ctx.board && global.GTOVillainCallAudit) {
          const audit = global.GTOVillainCallAudit.auditVillainCall({
            action: 'call',
            street: st,
            board: ctx.board,
            betBB: amountBB,
            potBeforeBB: ctx.potBeforeBB,
            heroCards: ctx.heroCards,
            defenderRange: ctx.defenderRange
          });
          if (audit && audit.severity === 'critical') {
            return {
              note: audit.note,
              tag: 'station_call',
              summary: audit.summary,
              audit
            };
          }
        }
        return {
          note: isRiver(st)
            ? 'Rango de bluff-catch y valor fino: manos que buscan showdown. Sin proyectos (river).'
            : 'Rango de continuar: parejas, proyectos con equity y algunas manos fuertes de trampa.',
          tag: 'continue',
          summary: isRiver(st)
            ? `${cap(st)}: call${amt} → bluff-catch / valor fino (sin draws).`
            : `${cap(st)}: call${amt} → rango de defensa (parejas, draws, algunas fuertes).`
        };
      case 'bet':
        return {
          note: isRiver(st)
            ? 'Rango polarizado en river: valor nutted + faroles puros / missed draws. No hay semibluffs (sin outs pendientes).'
            : 'Rango polarizado o mergeado según sizing: value fuerte + semibluffs/draws en flop/turn.',
          tag: 'aggressive',
          summary: isRiver(st)
            ? `${cap(st)}: bet${amt} → polar (valor + faroles puros / missed draws).`
            : `${cap(st)}: bet${amt} → polar (valor + semibluffs/draws).`
        };
      case 'raise':
        return {
          note: isRiver(st)
            ? 'Rango muy polar en river: nuts o faroles puros balanceados. Sin raises de proyecto.'
            : 'Rango muy fuerte y polar: sets, dos parejas+, draws fuertes y bluffs selectos.',
          tag: 'polar',
          summary: isRiver(st)
            ? `${cap(st)}: raise${amt} → nuts o faroles puros.`
            : `${cap(st)}: raise${amt} → rango fuerte/polar (valor + bluffs selectos).`
        };
      case 'open':
        return {
          note: 'Rango de apertura preflop: mezcla lineal de manos jugables según posición.',
          tag: 'open',
          summary: `Preflop: open${amt} → rango de apertura estándar de su posición.`
        };
      default:
        return { note: prevNote || 'Sin cambio estimado.', tag: 'unknown', summary: '' };
    }
  }

  function cap(s) { return (s || '').charAt(0).toUpperCase() + (s || '').slice(1); }

  function initTracker(rangeStr, pos) {
    return {
      startRange: rangeStr || 'desconocido',
      pos: pos || '?',
      currentNote: `Rango inicial estimado (${pos || '?'}): ${shortRange(rangeStr)}.`,
      log: [],
      tags: []
    };
  }

  function shortRange(str) {
    if (!str) return 'amplio';
    if (str.length > 60) return str.slice(0, 57) + '…';
    return str;
  }

  function recordAction(tracker, action, street, amountBB, ctx) {
    if (!tracker) return tracker;
    const ch = describeRangeChange(action.type || action, street, amountBB, tracker.currentNote, ctx);
    tracker.currentNote = ch.note;
    tracker.tags.push(ch.tag);
    tracker.log.push({
      street,
      action: action.type || action,
      amountBB: amountBB != null ? amountBB : null,
      label: ACTION_LABELS[action.type || action] || (action.type || action),
      summary: ch.summary,
      note: ch.note
    });
    return tracker;
  }

  function buildHandSummary(tracker) {
    if (!tracker || !tracker.log.length) return 'No hubo acciones del villano visibles para inferir su rango.';
    const lines = [];
    const seen = new Set();
    tracker.log.forEach((e) => {
      if (e.summary && !seen.has(e.summary)) {
        seen.add(e.summary);
        lines.push(e.summary);
      }
    });
    const final = tracker.currentNote;
    if (final && !seen.has(final) && !lines.some((l) => l.indexOf(final.slice(0, 30)) >= 0)) {
      lines.push(`Lectura final: ${final}`);
    }
    return lines.join(' ');
  }

  /**
   * Estima rango activo del villano según línea de agresión (range narrowing).
   * @param {Object} ctx — { baseRange, street, lastAction, betBB, potBeforeBB, board, tags }
   */
  function estimateActiveRange(ctx) {
    const D = global.GTORangesData;
    if (!D) return ctx.baseRange || D.BROAD_CONTINUE;
    const base = ctx.baseRange || D.BROAD_CONTINUE;
    const street = ctx.street || 'flop';
    const bet = ctx.betBB || 0;
    const potBefore = Math.max(ctx.potBeforeBB || 1, 0.1);
    const betRatio = bet / potBefore;
    const action = ctx.lastAction || 'check';
    const tags = ctx.tags || [];

    if (tags.indexOf('fold') >= 0) return base;

    const wet = ctx.board && ctx.board.length >= 3 && global.GTOBoardCluster
      ? global.GTOBoardCluster.boardTexture(ctx.board).wet : false;

    if (action === 'raise' || betRatio >= 1.0) {
      if (street === 'river') {
        const RS = global.GTORiverShoveNode;
        if (bet >= 50 || betRatio >= 0.55) {
          if (RS) {
            const pairInfo = ctx.board ? RS.boardPairRank(ctx.board) : { paired: false };
            return RS.microstakesRiverShoveRange(ctx.board, pairInfo);
          }
          return D.RANGE_FACING_RIVER_3BET_SHOVE || D.RANGE_FACING_RIVER_SHOVE;
        }
        return D.RANGE_FACING_RIVER_SHOVE;
      }
      if (street === 'turn') return D.RANGE_FACING_TURN_RAISE;
      return D.RANGE_FACING_LARGE_BET;
    }

    if (action === 'bet') {
      if (betRatio >= 0.65) {
        if (street === 'river') return D.RANGE_FACING_RIVER_SHOVE;
        if (street === 'turn') return D.RANGE_FACING_TURN_RAISE;
        return wet ? D.RANGE_FACING_LARGE_BET_WET : D.RANGE_FACING_LARGE_BET;
      }
      if (betRatio >= 0.35) return wet ? D.RANGE_FACING_LARGE_BET_WET : D.RANGE_FACING_LARGE_BET;
      return D.RANGE_FACING_SMALL_BET;
    }

    if (action === 'call') return D.RANGE_FACING_CALL_LINE;

    if (wet && street === 'turn') return D.RANGE_FACING_CALL_LINE;
    return base;
  }

  /** Inferir rango desde historial de acciones del importador (sin tracker). */
  function estimateRangeFromActions(streetActs, heroName, bb, potBeforeBB, board, baseRange) {
    const D = global.GTORangesData;
    let lastVillain = null;
    let potBefore = potBeforeBB;
    (streetActs || []).forEach((a) => {
      if (a.player === heroName) return;
      if (a.type === 'bet') {
        lastVillain = { action: 'bet', betBB: a.amount / bb, potBeforeBB: potBefore };
        potBefore += a.amount / bb;
      } else if (a.type === 'raise') {
        lastVillain = { action: 'raise', betBB: a.to / bb, potBeforeBB: potBefore };
        potBefore += a.to / bb;
      } else if (a.type === 'call') {
        lastVillain = { action: 'call', betBB: 0, potBeforeBB: potBefore };
      }
    });
    if (!lastVillain) return baseRange || D.BROAD_CONTINUE;
    return estimateActiveRange({
      baseRange: baseRange || D.BROAD_CONTINUE,
      street: board && board.length >= 5 ? 'river' : board && board.length === 4 ? 'turn' : 'flop',
      lastAction: lastVillain.action,
      betBB: lastVillain.betBB,
      potBeforeBB: Math.max(lastVillain.potBeforeBB || potBefore, 0.1),
      board,
      tags: []
    });
  }

  global.GTOVillainTracking = {
    initTracker, recordAction, buildHandSummary, describeRangeChange,
    estimateActiveRange, estimateRangeFromActions
  };
})(window);
