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

  function describeRangeChange(action, street, amountBB, prevNote) {
    const amt = amountBB != null ? ` (${amountBB}bb)` : '';
    const st = street || 'flop';

    switch (action) {
      case 'fold':
        return { note: 'Rango eliminado — el villano no tiene cartas en juego.', tag: 'fold', summary: `${cap(st)}: fold → fuera de mano.` };
      case 'check':
        return {
          note: isRiver(st)
            ? 'Rango acotado en river: checks muestran bluff-catchers y traps; desaparecen faroles puros que apostarían.'
            : 'Rango acotado: se quitan muchos faroles puros que apostarían. Persisten manos medias, proyectos y algunas fuertes en check.',
          tag: 'passive',
          summary: `${cap(st)}: check → rango más pasivo/capado.`
        };
      case 'call':
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

  function recordAction(tracker, action, street, amountBB) {
    if (!tracker) return tracker;
    const ch = describeRangeChange(action.type || action, street, amountBB, tracker.currentNote);
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

  global.GTOVillainTracking = { initTracker, recordAction, buildHandSummary, describeRangeChange };
})(window);
