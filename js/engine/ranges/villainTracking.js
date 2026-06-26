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

  function handMadeInfoOnBoard(code, board) {
    const Eq = global.GTO && global.GTO.Equity;
    const Made = global.GTOEquityMadeHand;
    if (!Eq || !Eq.concreteCombos || !board || board.length < 3) return null;
    const combos = Eq.concreteCombos(code, board);
    if (!combos.length) return null;
    return Made ? Made.classifyMadeHand(combos[0], board) : null;
  }

  function lineAggressionSummary(actionLine) {
    let bets = 0;
    let raises = 0;
    let calls = 0;
    let checks = 0;
    (actionLine || []).forEach(function (a) {
      if (a.action === 'bet') bets++;
      else if (a.action === 'raise') raises++;
      else if (a.action === 'call') calls++;
      else if (a.action === 'check') checks++;
    });
    return {
      bets: bets,
      raises: raises,
      calls: calls,
      checks: checks,
      aggressive: bets > 0 || raises > 0,
      passive: (calls > 0 || checks > 0) && bets === 0 && raises === 0,
      polar: raises > 0 || bets >= 2
    };
  }

  function preflopBorderlineRange(villainPos) {
    const D = global.GTORangesData;
    if (!villainPos || !D.OPEN_RAISE[villainPos]) return '';
    return D.OPEN_RAISE[villainPos].mix || '';
  }

  function villainPosFromHand(hand, heroName, decision) {
    if (decision && decision.vsPosition) return decision.vsPosition;
    if (!hand || !hand.positions || !hand.streets || !hand.streets.preflop) return null;
    let lastVillain = null;
    hand.streets.preflop.forEach(function (a) {
      if (a.type === 'raise' && a.player !== heroName) lastVillain = a.player;
    });
    return lastVillain && hand.positions[lastVillain] ? hand.positions[lastVillain] : null;
  }

  function fitsSemibluffLine(code, board, actionLine, street) {
    if (street === 'river') return false;
    if (!actionLine || !actionLine.some(function (a) { return a.action === 'bet' || a.action === 'raise'; })) {
      return false;
    }
    const info = handMadeInfoOnBoard(code, board);
    if (!info) return false;
    if (info.tier === 'strong' || (info.ev && info.ev.category >= 3)) return false;
    return !!(info.flushDraw || info.oesd || (info.gutshot && street === 'flop'));
  }

  function fitsBluffLine(code, board, actionLine, street) {
    if (!actionLine || !actionLine.some(function (a) { return a.action === 'bet' || a.action === 'raise'; })) {
      return false;
    }
    const HS = global.GTOHandStrength;
    const strength = HS ? HS.handStrength01(code) : 0.5;
    if (strength > 0.42) return false;
    const info = handMadeInfoOnBoard(code, board);
    if (info && info.tier === 'medium' && info.ev && info.ev.category >= 2) return false;
    if (street === 'river') return !info || info.tier === 'air' || info.tier === 'weak';
    return !handConnectsWithBoard(code, board) || (info && info.tier === 'air');
  }

  function profileHasCode(profile, code) {
    return (profile.coreSet && profile.coreSet.has(code))
      || (profile.borderlineSet && profile.borderlineSet.has(code))
      || (profile.widenSet && profile.widenSet.has(code))
      || (profile.valueSet && profile.valueSet.has(code))
      || (profile.semibluffSet && profile.semibluffSet.has(code))
      || (profile.bluffSet && profile.bluffSet.has(code));
  }

  function cellActionForProfile(code, profile) {
    if (profile.blockedSet && profile.blockedSet.has(code) && profileHasCode(profile, code)) {
      return 'capped';
    }
    if (profile.valueSet && profile.valueSet.has(code)) return 'value';
    if (profile.semibluffSet && profile.semibluffSet.has(code)) return 'semibluff';
    if (profile.bluffSet && profile.bluffSet.has(code)) return 'bluff';
    if (profile.coreSet && profile.coreSet.has(code)) return 'inrange';
    if (profile.borderlineSet && profile.borderlineSet.has(code)) return 'borderline';
    if (profile.widenSet && profile.widenSet.has(code)) {
      return profile.cappedSet && profile.cappedSet.has(code) ? 'capped' : 'semibluff';
    }
    return 'out';
  }

  function cellTitleForProfile(code, profile) {
    const parts = [code];
    const act = cellActionForProfile(code, profile);
    const labels = {
      value: 'valor fuerte en esta línea',
      semibluff: 'semibluff / proyecto agresivo',
      bluff: 'farol plausible en línea polar',
      inrange: 'núcleo GTO por acción',
      borderline: 'borderline preflop que encaja con la línea',
      capped: 'capado o bloqueado por board/tu mano',
      out: 'descartado por la historia'
    };
    parts.push(labels[act] || act);
    if (profile.blockedSet && profile.blockedSet.has(code)) parts.push('combo bloqueado por tus cartas');
    if (profile.villainCode && profile.villainCode === code) parts.push('mano real del villano');
    if (profile.heroCode && profile.heroCode === code) parts.push('tu mano');
    return parts.join(' · ');
  }

  function buildLineNarrative(ctx, lineSummary) {
    const parts = [];
    if (lineSummary.aggressive) parts.push('línea agresiva');
    else if (lineSummary.passive) parts.push('línea pasiva');
    if (lineSummary.polar) parts.push('polarizada (valor + faroles)');
    const st = ctx.street || 'flop';
    if (st === 'river' && lineSummary.aggressive) parts.push('sin semibluffs en river');
    if (ctx.betBB && ctx.potBeforeBB) {
      const ratio = Math.round((ctx.betBB / ctx.potBeforeBB) * 100);
      if (ratio >= 65) parts.push('sizing grande (' + ratio + '% bote)');
      else if (ratio >= 30) parts.push('sizing medio (' + ratio + '% bote)');
    }
    return parts.length ? parts.join(' · ') : 'sin agresión villana previa en la calle';
  }

  /**
   * Perfil para matriz villano: núcleo GTO + borderline preflop + valor/semibluff/farol según línea y board.
   */
  function buildVillainMatrixProfile(ctx) {
    const D = global.GTORangesData;
    const preflopRange = ctx.preflopRange || ctx.baseRange || D.BROAD_CONTINUE;
    const street = ctx.street || 'flop';
    const board = ctx.board || [];
    const actionLine = ctx.actionLine || [];
    const lineSummary = lineAggressionSummary(actionLine);
    const gtoRange = estimateGtoNarrowRange(ctx);
    const preflopSet = rangeToSet(preflopRange);
    const gtoSet = rangeToSet(gtoRange);
    const mixSet = ctx.villainPos ? rangeToSet(preflopBorderlineRange(ctx.villainPos)) : new Set();

    const coreSet = new Set();
    gtoSet.forEach(function (code) {
      if (preflopSet.has(code)) coreSet.add(code);
    });

    const borderlineSet = new Set();
    const valueSet = new Set();
    const semibluffSet = new Set();
    const bluffSet = new Set();
    const widenSet = new Set();

    preflopSet.forEach(function (code) {
      if (coreSet.has(code)) return;
      const info = handMadeInfoOnBoard(code, board);
      if (info && (info.tier === 'strong' || (info.ev && info.ev.category >= 2))
        && (lineSummary.aggressive || lineSummary.calls > 0)) {
        valueSet.add(code);
        return;
      }
      if (fitsSemibluffLine(code, board, actionLine, street)) {
        semibluffSet.add(code);
        return;
      }
      if (fitsBluffLine(code, board, actionLine, street)) {
        bluffSet.add(code);
        return;
      }
      if (mixSet.has(code) || (board.length < 3 && mixSet.has(code))) {
        if (lineSummary.aggressive || lineSummary.calls > 0 || street === 'flop') {
          borderlineSet.add(code);
        }
        return;
      }
      if (street !== 'preflop' && fitsWideLineForActions(code, board, actionLine)) {
        widenSet.add(code);
        return;
      }
      if (!coreSet.has(code) && mixSet.has(code) && handConnectsWithBoard(code, board)) {
        borderlineSet.add(code);
      }
    });

    coreSet.forEach(function (code) {
      const info = handMadeInfoOnBoard(code, board);
      if (info && info.tier === 'strong' && board.length >= 3) valueSet.add(code);
      else if (fitsSemibluffLine(code, board, actionLine, street)) semibluffSet.add(code);
    });

    const cappedSet = new Set();
    widenSet.forEach(function (code) {
      if (isCappedForLine(code, board, actionLine)) cappedSet.add(code);
    });
    const borderlineRemove = [];
    borderlineSet.forEach(function (code) {
      if (lineSummary.passive && board.length >= 3 && !handConnectsWithBoard(code, board)) {
        borderlineRemove.push(code);
      }
    });
    borderlineRemove.forEach(function (c) { borderlineSet.delete(c); });

    const blockedSet = new Set();
    const heroCards = ctx.heroCards || [];
    preflopSet.forEach(function (code) {
      if (heroBlocksHand(code, heroCards, board) && profileHasCode({
        coreSet: coreSet, borderlineSet: borderlineSet, widenSet: widenSet,
        valueSet: valueSet, semibluffSet: semibluffSet, bluffSet: bluffSet
      }, code)) {
        blockedSet.add(code);
      }
    });

    const allIn = new Set();
    [coreSet, borderlineSet, widenSet, valueSet, semibluffSet, bluffSet].forEach(function (s) {
      s.forEach(function (c) { allIn.add(c); });
    });

    const profile = {
      coreSet: coreSet,
      borderlineSet: borderlineSet,
      widenSet: widenSet,
      valueSet: valueSet,
      semibluffSet: semibluffSet,
      bluffSet: bluffSet,
      cappedSet: cappedSet,
      blockedSet: blockedSet,
      coreStr: setToRangeStr(coreSet),
      widenStr: setToRangeStr(widenSet),
      rangeStr: setToRangeStr(allIn) || gtoRange,
      gtoStr: gtoRange,
      preflopStr: preflopRange,
      lineNarrative: buildLineNarrative(ctx, lineSummary),
      lineSummary: lineSummary,
      villainCode: ctx.villainCode || null,
      heroCode: ctx.heroCode || null,
      cellAction: function (code) { return cellActionForProfile(code, this); },
      cellTitle: function (code) { return cellTitleForProfile(code, this); }
    };

    if (ctx.villainCode && preflopSet.has(ctx.villainCode) && cellActionForProfile(ctx.villainCode, profile) === 'out') {
      const vInfo = handMadeInfoOnBoard(ctx.villainCode, board);
      if (vInfo && (vInfo.tier === 'strong' || (vInfo.ev && vInfo.ev.category >= 2))) {
        profile.valueSet.add(ctx.villainCode);
      } else if (lineSummary.aggressive) {
        profile.semibluffSet.add(ctx.villainCode);
      } else {
        profile.borderlineSet.add(ctx.villainCode);
      }
      const merged = new Set();
      [profile.coreSet, profile.borderlineSet, profile.widenSet, profile.valueSet,
        profile.semibluffSet, profile.bluffSet].forEach(function (s) {
        s.forEach(function (c) { merged.add(c); });
      });
      profile.rangeStr = setToRangeStr(merged) || profile.rangeStr;
    }

    return profile;
  }

  function inferVillainLineContext(opts) {
    opts = opts || {};
    const hand = opts.hand;
    const hero = opts.hero;
    const street = opts.street;
    const heroActIndex = opts.heroActIndex != null ? opts.heroActIndex : 0;
    const boardSoFar = opts.boardSoFar || [];
    const villainBase = opts.villainBase;
    const priorPotBB = opts.priorPotBB;
    const D = global.GTORangesData;
    if (!hand || !hand.streets || !priorPotBB) {
      return { villainRange: villainBase || D.BROAD_CONTINUE, villainLastAction: null, villainBetRatio: null };
    }
    const bb = hand.bb || 0.05;
    const acts = hand.streets[street] || [];
    const priorOnStreet = acts.slice(0, heroActIndex);

    function boardSlice(st) {
      const n = { flop: 3, turn: 4, river: 5 }[st];
      return n ? boardSoFar.slice(0, n) : boardSoFar.slice();
    }

    let range = estimateRangeFromActions(
      priorOnStreet, hero, bb, priorPotBB(hand, street), boardSoFar, villainBase
    );
    let lastAction = null;
    let betRatio = null;

    function applyLastFromActs(actList, potBefore) {
      for (let i = actList.length - 1; i >= 0; i--) {
        const a = actList[i];
        if (a.player === hero) continue;
        if (a.type === 'bet' || a.type === 'raise' || a.type === 'check' || a.type === 'call') {
          lastAction = a.type;
          if (a.type === 'bet') betRatio = Math.round((a.amount / bb / Math.max(potBefore, 0.1)) * 100) / 100;
          else if (a.type === 'raise') betRatio = Math.round((a.to / bb / Math.max(potBefore, 0.1)) * 100) / 100;
          return;
        }
      }
    }

    applyLastFromActs(priorOnStreet, priorPotBB(hand, street));

    const hasVillainAgg = priorOnStreet.some(
      (a) => a.player !== hero && (a.type === 'bet' || a.type === 'raise')
    );
    if (!hasVillainAgg && street !== 'flop') {
      const order = ['flop', 'turn', 'river'];
      const idx = order.indexOf(street);
      for (let i = idx - 1; i >= 0; i--) {
        const st = order[i];
        const stActs = hand.streets[st] || [];
        if (!stActs.length) continue;
        const potSt = priorPotBB(hand, st);
        const bSt = boardSlice(st);
        const r = estimateRangeFromActions(stActs, hero, bb, potSt, bSt, villainBase);
        const villBet = stActs.some((a) => a.player !== hero && (a.type === 'bet' || a.type === 'raise'));
        if (villBet || (r !== villainBase && r !== D.BROAD_CONTINUE)) {
          range = r;
          applyLastFromActs(stActs, potSt);
          break;
        }
      }
    }

    return { villainRange: range, villainLastAction: lastAction, villainBetRatio: betRatio };
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
    estimateActiveRange, estimateGtoNarrowRange, estimateRangeFromActions, inferVillainLineContext,
    preflopRangeFromHand, buildVillainMatrixProfile, villainPosFromHand,
    lineAggressionSummary, buildLineNarrative,
    rangeToSet, setToRangeStr, handConnectsWithBoard, heroBlocksHand
  };
})(window);
