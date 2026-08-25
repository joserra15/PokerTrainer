/*
 * action-line.js — Línea de acción previa del entrenador.
 *
 * El motor graba en `hand.actionLine` cada acción visible de la mesa (marcas de
 * calle incluidas). Aquí se convierte ese historial en filas legibles por calle
 * —con posiciones, verbos y tamaños de apuesta— para pintarlas junto a la mesa,
 * igual que la "línea completa" de la Escuela de Póker.
 */
(function (global) {
  'use strict';

  var STREETS = ['preflop', 'flop', 'turn', 'river'];
  var SUIT_SYMBOL = { s: '\u2660', h: '\u2665', d: '\u2666', c: '\u2663' };
  var SIZE_RE = /(\d+(?:[.,]\d+)?\s*bb|\d+\s*%\s*(?:bote|pot))/g;

  var LABELS = {
    es: {
      preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River',
      open: 'open', limp: 'limp', call: 'call', check: 'check', fold: 'fold',
      bet: 'bet', cbet: 'c-bet', raise: 'raise a', allin: 'all-in',
      raises: ['open', '3-bet', '4-bet', '5-bet'],
      pot: 'bote', hero: 'Tú'
    },
    en: {
      preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River',
      open: 'open', limp: 'limp', call: 'call', check: 'check', fold: 'fold',
      bet: 'bet', cbet: 'c-bet', raise: 'raise to', allin: 'all-in',
      raises: ['open', '3-bet', '4-bet', '5-bet'],
      pot: 'pot', hero: 'You'
    }
  };

  function labels(lang) {
    return LABELS[lang] || LABELS.es;
  }

  /** Tamaño compacto: 2.5 / 12.99 / 23 (sin ceros de relleno). */
  function fmtBB(x) {
    if (x == null) return '';
    return String(Math.round(x * 100) / 100);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cardText(code) {
    if (!code || code.length < 2) return '';
    var rank = code[0] === 'T' ? '10' : code[0];
    return rank + (SUIT_SYMBOL[code[code.length - 1]] || '');
  }

  function cardHtml(code) {
    if (!code || code.length < 2) return '';
    var suit = code[code.length - 1];
    var red = suit === 'h' || suit === 'd';
    return '<span class="action-line-card' + (red ? ' is-red' : '') + '">' +
      esc(cardText(code)) + '</span>';
  }

  /** Agrupa el historial por calle, con el board revelado y el bote inicial. */
  function groupByStreet(hand) {
    var entries = (hand && hand.actionLine) || [];
    var out = [];
    var byStreet = {};
    var seenBoard = 0;
    entries.forEach(function (e) {
      if (!e) return;
      var street = e.street || 'preflop';
      var group = byStreet[street];
      if (!group) {
        group = byStreet[street] = { street: street, cards: [], potStart: null, acts: [] };
        out.push(group);
      }
      if (e.kind === 'street') {
        var board = e.board || [];
        group.cards = board.slice(seenBoard);
        seenBoard = board.length;
        if (group.potStart == null) group.potStart = e.potBB;
        return;
      }
      // Los folds preflop son ruido: el motor solo registra los posteriores al
      // héroe, así que mostrarlos daría una lista a medias. Postflop sí importan
      // porque cambian quién sigue en el bote.
      if (street === 'preflop' && e.type === 'fold') return;
      group.acts.push(e);
    });
    return out;
  }

  /** Última posición agresiva del preflop: quien lleva la iniciativa al flop. */
  function preflopAggressor(hand) {
    var pos = null;
    ((hand && hand.actionLine) || []).forEach(function (e) {
      if (!e || e.kind === 'street' || e.street !== 'preflop') return;
      if (e.type === 'open' || e.type === 'raise' || e.type === 'bet' || e.type === 'allin') pos = e.pos;
    });
    return pos;
  }

  function preflopText(act, ctx, L) {
    var amt = act.amount;
    if (act.type === 'fold') return L.fold;
    if (act.type === 'check') return L.check;
    if (act.type === 'call') {
      // Igualar la ciega grande es un limp, no un call a una subida.
      return (amt != null && amt <= 1.01) ? L.limp : L.call;
    }
    if (act.type === 'allin') return L.allin + (amt != null ? ' ' + fmtBB(amt) + ' bb' : '');
    var verb = L.raises[Math.min(ctx.raises, L.raises.length - 1)];
    ctx.raises += 1;
    return verb + (amt != null ? ' ' + fmtBB(amt) + ' bb' : '');
  }

  function postflopText(act, ctx, L) {
    var amt = act.amount;
    if (act.type === 'fold') return L.fold;
    if (act.type === 'check') return L.check;
    if (act.type === 'call') return L.call;
    if (act.type === 'raise' || act.type === 'allin') {
      ctx.aggressive += 1;
      var verb = act.type === 'allin' ? L.allin : L.raise;
      return verb + (amt != null ? ' ' + fmtBB(amt) + ' bb' : '');
    }
    var first = ctx.aggressive === 0;
    ctx.aggressive += 1;
    // El % de bote solo es exacto para la primera apuesta de la calle.
    var pct = (first && ctx.potStart > 0 && amt != null)
      ? Math.round((amt / ctx.potStart) * 100)
      : null;
    var lead = (first && ctx.street === 'flop' && act.pos === ctx.aggressor) ? L.cbet : L.bet;
    return lead + (amt != null ? ' ' + fmtBB(amt) + ' bb' : '') +
      (pct != null ? ' (' + pct + '% ' + L.pot + ')' : '');
  }

  /**
   * Filas de la línea. `opts.throughStreet` limita hasta qué calle (incluida)
   * se describe, para no adelantar la acción que el héroe aún está viendo.
   */
  function build(hand, opts) {
    opts = opts || {};
    var L = labels(opts.lang);
    var limit = opts.throughStreet ? STREETS.indexOf(opts.throughStreet) : STREETS.length - 1;
    if (limit < 0) limit = STREETS.length - 1;
    var aggressor = preflopAggressor(hand);
    var preflopCtx = { raises: 0 };
    var rows = [];
    groupByStreet(hand).forEach(function (group) {
      var idx = STREETS.indexOf(group.street);
      if (idx < 0 || idx > limit) return;
      var ctx = {
        street: group.street,
        potStart: group.potStart,
        aggressor: aggressor,
        aggressive: 0
      };
      var actions = group.acts.map(function (act) {
        return {
          pos: act.pos,
          isHero: !!act.isHero,
          text: group.street === 'preflop'
            ? preflopText(act, preflopCtx, L)
            : postflopText(act, ctx, L)
        };
      });
      if (!actions.length) return;
      rows.push({
        street: group.street,
        label: L[group.street] || group.street,
        cards: group.cards.slice(),
        actions: actions
      });
    });
    return rows;
  }

  function rowText(row) {
    var acts = row.actions.map(function (a) { return a.pos + ' ' + a.text; }).join(' \u2192 ');
    var cards = row.cards.map(cardText).join(' ');
    return row.label + ': ' + (cards ? cards + ' \u2014 ' : '') + acts;
  }

  /** Versión en texto plano (tests, compartir, depuración). */
  function text(handOrRows, opts) {
    var rows = Array.isArray(handOrRows) ? handOrRows : build(handOrRows, opts);
    return rows.map(rowText).join(' | ');
  }

  function highlightSizes(str) {
    return esc(str).replace(SIZE_RE, '<span class="action-line-size">$1</span>');
  }

  function actionHtml(act, L) {
    var pos = '<span class="action-line-pos' + (act.isHero ? ' is-hero' : '') + '"' +
      (act.isHero ? ' title="' + esc(L.hero) + '"' : '') + '>' + esc(act.pos) + '</span>';
    return '<span class="action-line-act">' + pos + ' ' + highlightSizes(act.text) + '</span>';
  }

  function html(handOrRows, opts) {
    var L = labels(opts && opts.lang);
    var rows = Array.isArray(handOrRows) ? handOrRows : build(handOrRows, opts);
    if (!rows.length) return '';
    var items = rows.map(function (row) {
      var cards = row.cards.length
        ? '<span class="action-line-cards">' + row.cards.map(cardHtml).join('') + '</span>'
        : '';
      var acts = row.actions.map(function (a) { return actionHtml(a, L); })
        .join('<span class="action-line-arrow" aria-hidden="true">\u2192</span>');
      return '<li class="action-line-row">' +
        '<span class="action-line-street">' + esc(row.label) + '</span>' +
        cards +
        '<span class="action-line-acts">' + acts + '</span>' +
        '</li>';
    }).join('');
    return '<ul class="action-line-rows">' + items + '</ul>';
  }

  /** Calle inmediatamente anterior a `street` (null si no hay acción previa). */
  function previousStreet(street) {
    var idx = STREETS.indexOf(street);
    if (idx <= 0) return null;
    return STREETS[idx - 1];
  }

  /* Preferencia de ocultar: vale para cualquier calle de práctica y formato.
     La línea sale en cuanto la mano llega al flop, aunque la sesión arranque en
     preflop (lo normal en torneos y spins), así que siempre se puede quitar. */
  var HIDE_KEY = 'pt_hide_action_line_v1';

  function loadHidePreference() {
    try {
      return localStorage.getItem(HIDE_KEY) === '1';
    } catch (e) { return false; }
  }

  function saveHidePreference(on) {
    try { localStorage.setItem(HIDE_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  global.PTActionLine = {
    STREETS: STREETS,
    build: build,
    html: html,
    text: text,
    previousStreet: previousStreet,
    preflopAggressor: preflopAggressor,
    loadHidePreference: loadHidePreference,
    saveHidePreference: saveHidePreference
  };
})(window);
