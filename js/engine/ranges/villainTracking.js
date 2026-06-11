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

  function describeRangeChange(action, street, amountBB, prevNote) {
    const amt = amountBB != null ? ` (${amountBB}bb)` : '';
    switch (action) {
      case 'fold':
        return { note: 'Rango eliminado — el villano no tiene cartas en juego.', tag: 'fold', summary: `${cap(street)}: fold → fuera de mano.` };
      case 'check':
        return {
          note: 'Rango acotado: se quitan muchos faroles puros que apostarían. Persisten manos medias, proyectos y algunas fuertes en check.',
          tag: 'passive',
          summary: `${cap(street)}: check → rango más pasivo/capado, menos bluffs puros.`
        };
      case 'call':
        return {
          note: 'Rango de continuar: parejas, proyectos con equity y algunas manos fuertes de trampa. Desaparecen las manos más débiles que foldean.',
          tag: 'continue',
          summary: `${cap(street)}: call${amt} → rango de defensa/continuar (parejas, draws, algunas fuertes).`
        };
      case 'bet':
        return {
          note: 'Rango polarizado o mergeado según sizing: value fuerte + semibluffs/draws. Las manos muy débiles que solo check-fold desaparecen.',
          tag: 'aggressive',
          summary: `${cap(street)}: bet${amt} → rango polar (valor + semibluffs), menos basura.`
        };
      case 'raise':
        return {
          note: 'Rango muy fuerte y polar: sets, dos parejas+, draws fuertes y algunos bluffs balanceados. El rango de call plano se reduce mucho.',
          tag: 'polar',
          summary: `${cap(street)}: raise${amt} → rango fuerte/polar (valor + bluffs selectos).`
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

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

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
    const lines = tracker.log.map((e) => e.summary).filter(Boolean);
    lines.push(`Lectura final: ${tracker.currentNote}`);
    return lines.join(' ');
  }

  global.GTOVillainTracking = { initTracker, recordAction, buildHandSummary, describeRangeChange };
})(window);
