/*
 * card-picker.js — Selector de cartas en ventana emergente (1 / 2 / 3).
 */
(function (global) {
  'use strict';

  var active = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cardHTML(c) {
    if (global.Cards && global.Cards.cardToHTML) return global.Cards.cardToHTML(c);
    return '<span class="rec-card">' + esc(c) + '</span>';
  }

  function fullDeck() {
    if (global.Cards && global.Cards.fullDeck) return global.Cards.fullDeck();
    var ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    var suits = ['s', 'h', 'd', 'c'];
    var out = [];
    ranks.forEach(function (r) { suits.forEach(function (s) { out.push(r + s); }); });
    return out;
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && active) {
      e.preventDefault();
      close(false);
    }
  }

  function ensureModal() {
    var modal = document.getElementById('card-picker-modal');
    if (modal) {
      if (!modal._ptPickerBound) {
        modal._ptPickerBound = true;
        modal.addEventListener('click', function (e) {
          if (e.target === modal) close(false);
        });
      }
      return modal;
    }
    modal = document.createElement('div');
    modal.id = 'card-picker-modal';
    modal.className = 'modal card-picker-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = '<div class="modal-content card-picker-content" id="card-picker-body"></div>';
    document.body.appendChild(modal);
    modal._ptPickerBound = true;
    modal.addEventListener('click', function (e) {
      if (e.target === modal) close(false);
    });
    return modal;
  }

  function normalizeSelected(list, max) {
    var out = [];
    var seen = {};
    (list || []).forEach(function (c) {
      if (!c || seen[c]) return;
      seen[c] = true;
      out.push(c);
    });
    if (max && out.length > max) out = out.slice(0, max);
    return out;
  }

  function render() {
    if (!active) return;
    var body = document.getElementById('card-picker-body');
    if (!body) return;
    var max = active.max;
    var current = active.selected;
    var blocked = active.blocked || {};
    var exact = !!active.requireExact;
    var hint = exact
      ? ('Elige exactamente ' + max + (max === 1 ? ' carta' : ' cartas'))
      : (max === 1
        ? 'Elige 1 carta'
        : (max === 2 ? 'Elige hasta 2 cartas' : 'Elige hasta ' + max + ' cartas'));
    var canDone = !exact || current.length === max;

    var html = '<div class="ha-picker card-picker-panel" data-card-picker>';
    html += '<div class="ha-picker-head">';
    html += '<span class="ha-picker-title">' + esc(active.title || 'Elegir cartas') + '</span>';
    html += '<span class="ha-picker-count muted-text">' + current.length + ' / ' + max + '</span>';
    html += '<button type="button" class="btn btn-small btn-ghost" data-card-picker-clear>Limpiar</button>';
    html += '<button type="button" class="btn btn-small btn-primary" data-card-picker-done' +
      (canDone ? '' : ' disabled') + '>Listo</button>';
    html += '</div>';
    html += '<p class="muted-text card-picker-hint">' + esc(hint) + '. Toca una carta seleccionada para quitarla.</p>';
    html += '<div class="ha-picker-selected">';
    html += current.length
      ? current.map(cardHTML).join('')
      : '<span class="muted-text">Ninguna carta seleccionada</span>';
    html += '</div>';
    html += '<div class="ha-picker-deck">';
    fullDeck().forEach(function (c) {
      var selected = current.indexOf(c) >= 0;
      var busy = !selected && !!blocked[c];
      var cls = 'ha-pick-card' + (selected ? ' selected' : '') + (busy ? ' busy' : '');
      html += '<button type="button" class="' + cls + '" data-card="' + c + '"' +
        (busy ? ' disabled' : '') + ' aria-pressed="' + (selected ? 'true' : 'false') + '">' +
        cardHTML(c) + '</button>';
    });
    html += '</div></div>';
    body.innerHTML = html;

    body.querySelectorAll('.ha-pick-card[data-card]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        var c = btn.getAttribute('data-card');
        var cur = active.selected.slice();
        var ix = cur.indexOf(c);
        if (ix >= 0) cur.splice(ix, 1);
        else if (cur.length >= max) cur[cur.length - 1] = c;
        else cur.push(c);
        active.selected = cur;
        if (typeof active.onChange === 'function') active.onChange(cur.slice());
        render();
      });
    });
    var clearBtn = body.querySelector('[data-card-picker-clear]');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        active.selected = [];
        if (typeof active.onChange === 'function') active.onChange([]);
        render();
      });
    }
    var doneBtn = body.querySelector('[data-card-picker-done]');
    if (doneBtn) {
      doneBtn.addEventListener('click', function () {
        if (doneBtn.disabled) return;
        close(true);
      });
    }
  }

  function open(opts) {
    opts = opts || {};
    var max = Number(opts.max) || 2;
    if (max < 1) max = 1;
    if (max > 5) max = 5;
    active = {
      title: opts.title || 'Elegir cartas',
      max: max,
      selected: normalizeSelected(opts.selected, max),
      blocked: opts.blocked || {},
      requireExact: !!opts.requireExact,
      onChange: opts.onChange,
      onDone: opts.onDone,
      onCancel: opts.onCancel
    };
    var modal = ensureModal();
    modal.classList.remove('hidden');
    document.body.classList.add('card-picker-open');
    document.addEventListener('keydown', onKeydown);
    render();
    return active;
  }

  function close(commit) {
    document.removeEventListener('keydown', onKeydown);
    if (!active) {
      var m0 = document.getElementById('card-picker-modal');
      if (m0) m0.classList.add('hidden');
      document.body.classList.remove('card-picker-open');
      return;
    }
    var cb = active;
    var cards = cb.selected.slice();
    active = null;
    var modal = document.getElementById('card-picker-modal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('card-picker-open');
    if (commit) {
      if (typeof cb.onDone === 'function') cb.onDone(cards);
    } else if (typeof cb.onCancel === 'function') {
      cb.onCancel(cards);
    }
  }

  function isOpen() { return !!active; }

  function cardsToText(list) {
    return (list || []).join(' ');
  }

  global.PTCardPicker = {
    open: open,
    close: close,
    isOpen: isOpen,
    cardsToText: cardsToText,
    cardHTML: cardHTML,
    fullDeck: fullDeck
  };
})(window);
