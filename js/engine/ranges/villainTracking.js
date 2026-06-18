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
   * Estima rango GTO estrecho según línea de agresión (tablas facing bet).
   * @param {Object} ctx — { baseRange, street, lastAction, betBB, potBeforeBB, board, tags }
   */
  function estimateGtoNarrowRange(ctx) {
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

  function estimateActiveRange(ctx) {
    return estimateGtoNarrowRange(ctx);
  }

  function rangeToSet(rangeStr) {
    const N = global.GTORangesNotation;
    if (!N || !rangeStr) return new Set();
    return N.toSet(rangeStr);
  }

  function setToRangeStr(set) {
    if (!set || !set.size) return '';
    const order = global.GTORangesNotation && global.GTORangesNotation.ORDER
      ? global.GTORangesNotation.ORDER : [];
    const codes = Array.from(set);
    codes.sort(function (a, b) {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      if (ia !== ib) return ia - ib;
      return a.localeCompare(b);
    });
    return codes.join(', ');
  }

  /** Rango de apertura preflop del villano según posición y línea (raise+mix). */
  function preflopRangeFromHand(hand, hero) {
    const D = global.GTORangesData;
    if (!D || !hand || !hand.streets || !hand.streets.preflop) return D.BROAD_CONTINUE;

    let raiseCount = 0;
    let lastVillainRaiser = null;
    let heroRaised = false;
    hand.streets.preflop.forEach(function (a) {
      if (a.type === 'raise') {
        raiseCount++;
        if (a.player !== hero) lastVillainRaiser = a.player;
        if (a.player === hero) heroRaised = true;
      }
    });

    if (raiseCount >= 2 && heroRaised) {
      return 'TT+, AQs+, AJs, KQs, AKo, AQo, 99, 88';
    }

    const vPos = lastVillainRaiser && hand.positions
      ? hand.positions[lastVillainRaiser]
      : null;
    if (vPos && D.OPEN_RAISE[vPos]) {
      const data = D.OPEN_RAISE[vPos];
      return data.raise + (data.mix ? ', ' + data.mix : '');
    }

    if (raiseCount >= 1) return D.BROAD_CONTINUE;
    return D.BROAD_CONTINUE;
  }

  function handConnectsWithBoard(code, board) {
    const Eq = global.GTO && global.GTO.Equity;
    const Made = global.GTOEquityMadeHand;
    if (!Eq || !Eq.concreteCombos || !board || board.length < 3) return false;
    const combos = Eq.concreteCombos(code, board);
    if (!combos.length) return false;
    const vh = combos[0];
    if (Made) {
      const info = Made.classifyMadeHand(vh, board);
      if (info.ev && info.ev.category >= 1) return true;
      if (info.flushDraw || info.oesd || info.gutshot) return true;
      if (info.tier && info.tier !== 'air') return true;
    }
    const C = global.Cards;
    if (C) {
      const ev = C.evaluate(vh.concat(board));
      if (ev.category >= 1) return true;
    }
    return false;
  }

  function fitsWideLineForActions(code, board, actionLine) {
    if (!actionLine || !actionLine.length) return false;
    if (!handConnectsWithBoard(code, board)) return false;
    const HS = global.GTOHandStrength;
    const strength = HS ? HS.handStrength01(code) : 0.5;
    if (strength < 0.38) return false;
    const aggressive = actionLine.some(function (a) {
      return a.action === 'bet' || a.action === 'raise';
    });
    const passive = actionLine.some(function (a) {
      return a.action === 'call' || a.action === 'check';
    });
    if (aggressive && strength >= 0.52) return true;
    if (passive && strength >= 0.42) return true;
    return false;
  }

  function isCappedForLine(code, board, actionLine) {
    const Eq = global.GTO && global.GTO.Equity;
    const Made = global.GTOEquityMadeHand;
    if (!Eq || !Eq.concreteCombos || !board || board.length < 3) return true;
    const combos = Eq.concreteCombos(code, board);
    if (!combos.length) return true;
    const info = Made ? Made.classifyMadeHand(combos[0], board) : null;
    if (info && info.ev && info.ev.category >= 3) {
      const raised = actionLine && actionLine.some(function (a) { return a.action === 'raise'; });
      if (!raised) return false;
    }
    if (info && info.tier === 'strong' && info.ev && info.ev.category >= 2) return false;
    return true;
  }

  function heroBlocksHand(code, heroCards, board) {
    const Eq = global.GTO && global.GTO.Equity;
    if (!Eq || !Eq.concreteCombos || !heroCards || heroCards.length < 2) return false;
    const withoutHero = Eq.concreteCombos(code, board || []);
    const withHero = Eq.concreteCombos(code, (board || []).concat(heroCards));
    if (!withoutHero.length) return false;
    return withHero.length < withoutHero.length;
  }

  function cellActionForProfile(code, profile) {
    if (profile.blockedSet && profile.blockedSet.has(code)
      && ((profile.coreSet && profile.coreSet.has(code))
        || (profile.widenSet && profile.widenSet.has(code)))) {
      return 'capped';
    }
    if (profile.coreSet && profile.coreSet.has(code)) return 'inrange';
    if (profile.widenSet && profile.widenSet.has(code)) return 'capped';
    return 'out';
  }

  function cellTitleForProfile(code, profile) {
    const parts = [code];
    if (profile.coreSet && profile.coreSet.has(code)) parts.push('en rango GTO');
    if (profile.widenSet && profile.widenSet.has(code)) {
      parts.push(profile.cappedSet && profile.cappedSet.has(code) ? 'capado por línea' : 'ampliable por línea');
    }
    if (profile.blockedSet && profile.blockedSet.has(code)) parts.push('bloqueado por tu mano');
    if (parts.length === 1) parts.push('descartado');
    return parts.join(' · ');
  }

  /**
   * Perfil para matriz villano: core (verde), capped/bloqueos (azul), fuera (gris).
   * En flop solo core GTO∩preflop; en turn/river amplía según línea de acción.
   */
  function buildVillainMatrixProfile(ctx) {
    const D = global.GTORangesData;
    const preflopRange = ctx.preflopRange || ctx.baseRange || D.BROAD_CONTINUE;
    const street = ctx.street || 'flop';
    const board = ctx.board || [];
    const gtoRange = estimateGtoNarrowRange(ctx);
    const preflopSet = rangeToSet(preflopRange);
    const gtoSet = rangeToSet(gtoRange);

    const coreSet = new Set();
    gtoSet.forEach(function (code) {
      if (preflopSet.has(code)) coreSet.add(code);
    });

    const widenSet = new Set();
    if (street === 'turn' || street === 'river') {
      preflopSet.forEach(function (code) {
        if (coreSet.has(code)) return;
        if (fitsWideLineForActions(code, board, ctx.actionLine)) widenSet.add(code);
      });
    }

    const cappedSet = new Set();
    widenSet.forEach(function (code) {
      if (isCappedForLine(code, board, ctx.actionLine)) cappedSet.add(code);
    });

    const blockedSet = new Set();
    const heroCards = ctx.heroCards || [];
    preflopSet.forEach(function (code) {
      if (heroBlocksHand(code, heroCards, board)
        && (coreSet.has(code) || widenSet.has(code))) {
        blockedSet.add(code);
      }
    });

    const allIn = new Set();
    coreSet.forEach(function (c) { allIn.add(c); });
    widenSet.forEach(function (c) { allIn.add(c); });

    return {
      coreSet: coreSet,
      widenSet: widenSet,
      cappedSet: cappedSet,
      blockedSet: blockedSet,
      coreStr: setToRangeStr(coreSet),
      widenStr: setToRangeStr(widenSet),
      rangeStr: setToRangeStr(allIn) || gtoRange,
      gtoStr: gtoRange,
      preflopStr: preflopRange,
      cellAction: function (code) { return cellActionForProfile(code, this); },
      cellTitle: function (code) { return cellTitleForProfile(code, this); }
    };
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
    estimateActiveRange, estimateGtoNarrowRange, estimateRangeFromActions,
    preflopRangeFromHand, buildVillainMatrixProfile,
    rangeToSet, setToRangeStr, handConnectsWithBoard, heroBlocksHand
  };
})(window);
