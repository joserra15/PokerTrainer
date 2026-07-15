/*
 * hand-analysis.js — Menú "Análisis de manos".
 * - Entrada manual de una mano (posiciones, cartas, comunitarias y acciones).
 * - Entrada por texto libre con IA Coach (consume consulta): la IA genera la
 *   estructura de la mano + un análisis.
 * - Guarda las manos (límite por plan: 5 / 20 / 100), permite revisarlas paso a
 *   paso (reutiliza la revisión de sesiones) y jugarlas en el entrenador con las
 *   mismas cartas (la app juega a los villanos).
 * Expuesto como `PTHandAnalysis`.
 */
(function (global) {
  'use strict';

  var RING_6 = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  var RING_9 = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  var STREET_ORDER = ['preflop', 'flop', 'turn', 'river'];
  var STREET_LABELS = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
  var ACTION_LABELS = {
    fold: 'Fold', check: 'Pasar', call: 'Igualar', bet: 'Apostar', raise: 'Subir'
  };
  var VILLAIN_LEVELS = [
    { val: 'pro', label: 'GTO Pro' },
    { val: 'intermediate', label: 'Intermedio' },
    { val: 'fish', label: 'Fish' }
  ];
  var THEMES = [
    { val: 'emerald', label: 'Esmeralda' },
    { val: 'midnight', label: 'Medianoche' },
    { val: 'crimson', label: 'Burdeos' }
  ];

  var S = {
    view: 'list',
    container: null,
    format: '6max',
    draft: null,
    editId: null,
    editMeta: null,
    picker: null
  };

  // ---------- utilidades ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function round2(x) { return Math.round(x * 100) / 100; }
  function ringFor(fmt) { return fmt === '9max' ? RING_9.slice() : RING_6.slice(); }
  function posIndex(fmt, pos) {
    var ring = ringFor(fmt);
    var i = ring.indexOf(pos);
    return i < 0 ? 999 : i;
  }
  function sortByRing(fmt, positions) {
    return positions.slice().sort(function (a, b) {
      return posIndex(fmt, a) - posIndex(fmt, b);
    });
  }

  function normalizeCard(raw) {
    if (!raw) return null;
    var s = String(raw).trim().replace(/\s+/g, '');
    if (!s) return null;
    s = s.replace(/10/g, 'T');
    if (s.length !== 2) return null;
    var rank = s[0].toUpperCase();
    var suit = s[1].toLowerCase();
    if ('23456789TJQKA'.indexOf(rank) < 0) return null;
    if ('shdc'.indexOf(suit) < 0) return null;
    return rank + suit;
  }

  function parseCardList(str) {
    if (!str) return [];
    var out = [];
    var tokens = String(str).replace(/,/g, ' ').match(/(?:10|[2-9TJQKAtjqka])[shdcSHDC]/g) || [];
    tokens.forEach(function (t) {
      var c = normalizeCard(t);
      if (c && out.indexOf(c) < 0) out.push(c);
    });
    return out;
  }

  function cardHTML(c) {
    if (global.Cards && global.Cards.cardToHTML) return global.Cards.cardToHTML(c);
    return '<span class="rec-card">' + esc(c) + '</span>';
  }
  function cardsHTML(list) { return (list || []).map(cardHTML).join(''); }

  function fullDeck() {
    if (global.Cards && global.Cards.fullDeck) return global.Cards.fullDeck();
    var ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    var suits = ['s', 'h', 'd', 'c'];
    var out = [];
    ranks.forEach(function (r) { suits.forEach(function (s) { out.push(r + s); }); });
    return out;
  }

  // ---------- construir mano cruda a partir de un "spec" ----------
  function specToRawHand(spec) {
    var bbVal = 1, sbVal = 0.5;
    var fmt = spec.format === '9max' ? '9max' : '6max';
    var ring = ringFor(fmt);
    var positions = {};
    ring.forEach(function (p) { positions[p] = p; });

    var hero = spec.heroPos;
    var heroCards = (spec.heroCards || []).slice(0, 2);

    var shows = {};
    (spec.villains || []).forEach(function (v) {
      if (v && v.pos && v.cards && v.cards.length === 2) shows[v.pos] = v.cards.slice();
    });

    var streets = { preflop: [], flop: [], turn: [], river: [] };
    STREET_ORDER.forEach(function (st) {
      var committed = {};
      var toMatch = 0;
      if (st === 'preflop') { committed.SB = sbVal; committed.BB = bbVal; toMatch = bbVal; }
      var acts = (spec.actions && spec.actions[st]) || [];
      acts.forEach(function (a) {
        if (!a || !a.pos || !a.action) return;
        var player = a.pos;
        var type = a.action;
        var amtBB = Number(a.amountBB);
        if (type === 'raise') {
          var to = (isFinite(amtBB) && amtBB > 0 ? amtBB : (toMatch / bbVal + 2)) * bbVal;
          var inc = round2(to - (committed[player] || 0));
          if (inc < 0) inc = round2(to);
          streets[st].push({ player: player, type: 'raise', amount: inc, to: round2(to), allin: false });
          committed[player] = to; toMatch = to;
        } else if (type === 'bet') {
          var amt = (isFinite(amtBB) && amtBB > 0 ? amtBB : 1) * bbVal;
          streets[st].push({ player: player, type: 'bet', amount: round2(amt), allin: false });
          committed[player] = amt; toMatch = Math.max(toMatch, amt);
        } else if (type === 'call') {
          var callAmt = round2((toMatch || bbVal) - (committed[player] || 0));
          if (callAmt < 0) callAmt = 0;
          streets[st].push({ player: player, type: 'call', amount: callAmt, allin: false });
          committed[player] = toMatch || bbVal;
        } else if (type === 'check') {
          streets[st].push({ player: player, type: 'check' });
        } else if (type === 'fold') {
          streets[st].push({ player: player, type: 'fold' });
        }
      });
    });

    var board = (spec.board || []).filter(Boolean).slice(0, 5);
    return {
      id: spec._id || ('ah_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
      datetime: new Date().toISOString(),
      sb: sbVal, bb: bbVal, currency: 'bb',
      hero: hero, heroCards: heroCards,
      positions: positions,
      blinds: { sb: 'SB', bb: 'BB' },
      posts: { SB: sbVal, BB: bbVal },
      streets: streets,
      board: { flop: board.slice(0, 3), turn: board.slice(3, 4), river: board.slice(4, 5) },
      boardAll: board,
      shows: shows,
      collected: {}, uncalledTo: {}, rake: 0, potTotal: 0,
      isCash: true, isTournament: false, platform: 'manual'
    };
  }

  function buildAnalyzedHand(spec, source) {
    if (!global.Importer || !global.Importer.analyzeHand) {
      throw new Error('Módulo de análisis no cargado.');
    }
    var raw = specToRawHand(spec);
    var analyzed = global.Importer.analyzeHand(raw);
    analyzed.spec = {
      format: spec.format === '9max' ? '9max' : '6max',
      heroPos: spec.heroPos,
      heroCards: (spec.heroCards || []).slice(),
      villains: (spec.villains || []).map(function (v) {
        return { pos: v.pos, cards: (v.cards || []).slice() };
      }),
      board: (spec.board || []).slice(),
      actions: {
        preflop: ((spec.actions && spec.actions.preflop) || []).slice(),
        flop: ((spec.actions && spec.actions.flop) || []).slice(),
        turn: ((spec.actions && spec.actions.turn) || []).slice(),
        river: ((spec.actions && spec.actions.river) || []).slice()
      },
      _source: source || spec._source || 'manual'
    };
    analyzed.boardAll = (raw.boardAll || analyzed.board || []).slice();
    analyzed.source = source || spec._source || 'manual';
    analyzed.createdAt = spec._createdAt || new Date().toISOString();
    analyzed.savedName = spec._name || null;
    if (spec._id) analyzed.id = spec._id;
    return analyzed;
  }

  // ---------- validación de spec ----------
  function validateSpec(spec) {
    var errs = [];
    if (!spec.heroPos) errs.push('Elige la posición del héroe.');
    if (!spec.heroCards || spec.heroCards.length !== 2) errs.push('Elige las 2 cartas del héroe.');
    var seenPos = {};
    seenPos[spec.heroPos] = 'héroe';
    (spec.villains || []).forEach(function (v, i) {
      if (!v || !v.pos) return;
      if (seenPos[v.pos]) {
        errs.push('El asiento ' + v.pos + ' no puede repetirse (' + seenPos[v.pos] + ' y villano).');
      } else {
        seenPos[v.pos] = 'villano ' + (i + 1);
      }
    });
    var all = [].concat(spec.heroCards || []);
    (spec.villains || []).forEach(function (v) { if (v.cards) all = all.concat(v.cards); });
    all = all.concat(spec.board || []);
    var seen = {};
    for (var i = 0; i < all.length; i++) {
      if (seen[all[i]]) { errs.push('Carta repetida: ' + all[i] + '. Cada carta debe ser única.'); break; }
      seen[all[i]] = true;
    }
    var pf = (spec.actions && spec.actions.preflop) || [];
    var heroPf = pf.some(function (a) { return a.pos === spec.heroPos; });
    if (!heroPf) errs.push('Añade al menos una acción del héroe en preflop.');
    return errs;
  }

  // ---------- escenario para "jugar en el entrenador" ----------
  function deriveScenario(hand, fmt) {
    var heroPos = hand.heroPos;
    var firstPf = (hand.decisions || []).filter(function (d) { return d.street === 'preflop'; })[0];
    var out = { type: 'RFI', heroPos: heroPos, _villainPos: heroPos === 'BB' ? 'SB' : 'BB' };
    if (!firstPf) return out;
    var kind = firstPf.spotKind;
    var vs = firstPf.vsPosition;
    if (kind === 'RFI') {
      out = { type: 'RFI', heroPos: heroPos, _villainPos: 'BB' };
    } else if (kind === 'vsRFI' && vs) {
      out = { type: 'vsRFI', key: heroPos + '_vs_' + vs, _villainPos: vs };
    } else if (kind === 'isoLimp' && vs) {
      out = { type: 'isoLimp', heroPos: heroPos, limperPos: vs, _villainPos: vs };
    } else if (vs) {
      out = { type: 'vsRFI', key: heroPos + '_vs_' + vs, _villainPos: vs };
    }
    return out;
  }

  function toTrainerConfig(hand, villainLevel, tableTheme) {
    var spec = hand.spec || {};
    var fmt = spec.format === '9max' ? '9max' : '6max';
    var scenario = deriveScenario(hand, fmt);
    var villainPos = scenario._villainPos;
    var villainCards = null;
    (spec.villains || []).forEach(function (v) {
      if (v && v.pos === villainPos && v.cards && v.cards.length === 2) villainCards = v.cards.slice();
    });
    if (!villainCards) {
      (spec.villains || []).forEach(function (v) {
        if (!villainCards && v && v.cards && v.cards.length === 2) villainCards = v.cards.slice();
      });
    }
    var force = {
      type: scenario.type,
      forceDeal: {
        heroCards: (hand.heroCards || []).slice(0, 2),
        villainCards: villainCards,
        board: (hand.boardAll || hand.board || []).slice(0, 5)
      }
    };
    if (scenario.heroPos) force.heroPos = scenario.heroPos;
    if (scenario.key) force.key = scenario.key;
    if (scenario.limperPos) force.limperPos = scenario.limperPos;

    var playConfig = {
      gameType: fmt === '9max' ? 'cash9' : 'cash6',
      villainLevel: villainLevel || 'pro',
      tableTheme: tableTheme || 'emerald',
      handRange: 'all',
      practiceStreet: 'preflop'
    };
    if (global.PTPlayConfig && global.PTPlayConfig.normalize) {
      playConfig = global.PTPlayConfig.normalize(playConfig);
      playConfig.villainLevel = villainLevel || 'pro';
      playConfig.tableTheme = tableTheme || 'emerald';
    }
    return { force: force, playConfig: playConfig };
  }

  // ---------- persistencia / límites ----------
  function getHands() {
    return (global.Store && global.Store.getAnalysisHands) ? global.Store.getAnalysisHands() : [];
  }
  function handsMax() {
    if (global.PTEntitlements && global.PTEntitlements.analysisHandsMax) {
      return global.PTEntitlements.analysisHandsMax();
    }
    return 5;
  }
  function canSave() {
    var count = getHands().length;
    if (global.PTEntitlements && global.PTEntitlements.canSaveAnalysisHand) {
      return global.PTEntitlements.canSaveAnalysisHand(count);
    }
    return { ok: count < 5, used: count, limit: 5 };
  }

  function saveHand(analyzed) {
    var check = canSave();
    if (!check.ok) {
      return { ok: false, error: 'analysis_limit', limit: check.limit };
    }
    if (global.Store && global.Store.saveAnalysisHand) {
      return global.Store.saveAnalysisHand(analyzed);
    }
    return { ok: false, error: 'no_store' };
  }

  function updateHand(analyzed) {
    if (global.Store && global.Store.updateAnalysisHand) {
      return global.Store.updateAnalysisHand(analyzed);
    }
    return { ok: false, error: 'no_store' };
  }

  // ---------- draft / asientos / acciones ----------
  function emptyActions() {
    return { preflop: [], flop: [], turn: [], river: [] };
  }

  function emptyDraft(fmt) {
    var f = fmt === '9max' ? '9max' : '6max';
    var ring = ringFor(f);
    return {
      format: f,
      heroPos: ring[0],
      heroCards: [],
      villains: [{ pos: '', cards: [] }],
      boardFlop: [],
      boardTurn: [],
      boardRiver: [],
      actions: emptyActions()
    };
  }

  function draftFromSpec(spec) {
    var board = (spec.board || []).slice();
    var d = emptyDraft(spec.format);
    d.heroPos = spec.heroPos || d.heroPos;
    d.heroCards = (spec.heroCards || []).slice(0, 2);
    d.villains = (spec.villains && spec.villains.length)
      ? spec.villains.map(function (v) {
          return { pos: v.pos || '', cards: (v.cards || []).slice(0, 2) };
        })
      : [{ pos: '', cards: [] }];
    d.boardFlop = board.slice(0, 3);
    d.boardTurn = board.slice(3, 4);
    d.boardRiver = board.slice(4, 5);
    d.actions = {
      preflop: ((spec.actions && spec.actions.preflop) || []).map(cloneAct),
      flop: ((spec.actions && spec.actions.flop) || []).map(cloneAct),
      turn: ((spec.actions && spec.actions.turn) || []).map(cloneAct),
      river: ((spec.actions && spec.actions.river) || []).map(cloneAct)
    };
    return d;
  }

  function cloneAct(a) {
    return {
      pos: a.pos,
      action: a.action || 'check',
      amountBB: a.amountBB != null && isFinite(Number(a.amountBB)) ? Number(a.amountBB) : null
    };
  }

  function takenSeats(draft, excludeVillainIdx) {
    var taken = {};
    if (draft.heroPos) taken[draft.heroPos] = 'hero';
    (draft.villains || []).forEach(function (v, i) {
      if (excludeVillainIdx != null && i === excludeVillainIdx) return;
      if (v && v.pos) taken[v.pos] = 'villain';
    });
    return taken;
  }

  function selectedPlayers(draft) {
    var list = [];
    if (draft.heroPos) list.push(draft.heroPos);
    (draft.villains || []).forEach(function (v) {
      if (v && v.pos && list.indexOf(v.pos) < 0) list.push(v.pos);
    });
    return sortByRing(draft.format, list);
  }

  function foldStreetOf(draft, pos) {
    for (var i = 0; i < STREET_ORDER.length; i++) {
      var st = STREET_ORDER[i];
      var acts = (draft.actions && draft.actions[st]) || [];
      for (var j = 0; j < acts.length; j++) {
        if (acts[j].pos === pos && acts[j].action === 'fold') return st;
      }
    }
    return null;
  }

  function streetIndex(st) {
    var i = STREET_ORDER.indexOf(st);
    return i < 0 ? 0 : i;
  }

  /** Jugadores activos en una calle (sin fold en calles anteriores). */
  function activePlayersForStreet(draft, street) {
    var si = streetIndex(street);
    return selectedPlayers(draft).filter(function (pos) {
      var fs = foldStreetOf(draft, pos);
      if (!fs) return true;
      return streetIndex(fs) >= si;
    });
  }

  function defaultActionForStreet(street) {
    // No usar fold por defecto: un fold elimina automáticamente
    // las acciones de esa posición en calles posteriores.
    return street === 'preflop' ? 'call' : 'check';
  }

  /** Sincroniza filas de acción con asientos; fold elimina calles posteriores. */
  function syncActionsFromSeats(draft) {
    var players = selectedPlayers(draft);
    STREET_ORDER.forEach(function (st, sti) {
      var prev = (draft.actions[st] || []).slice();
      var byPos = {};
      prev.forEach(function (a) { if (a && a.pos) byPos[a.pos] = a; });

      var foldedEarlier = {};
      for (var i = 0; i < sti; i++) {
        (draft.actions[STREET_ORDER[i]] || []).forEach(function (a) {
          if (a && a.pos && a.action === 'fold') foldedEarlier[a.pos] = true;
        });
      }

      var next = [];
      players.forEach(function (pos) {
        if (foldedEarlier[pos]) return;
        var old = byPos[pos];
        if (old) next.push(cloneAct(old));
        else next.push({ pos: pos, action: defaultActionForStreet(st), amountBB: null });
      });
      draft.actions[st] = next;
    });

    // Tras folds: limpiar calles siguientes del jugador
    STREET_ORDER.forEach(function (st, sti) {
      (draft.actions[st] || []).forEach(function (a) {
        if (!a || a.action !== 'fold') return;
        for (var j = sti + 1; j < STREET_ORDER.length; j++) {
          draft.actions[STREET_ORDER[j]] = (draft.actions[STREET_ORDER[j]] || []).filter(function (x) {
            return x.pos !== a.pos;
          });
        }
      });
    });
  }

  function usedCardsExcept(draft, exceptKey, exceptVIdx) {
    var used = {};
    function mark(list) {
      (list || []).forEach(function (c) { if (c) used[c] = true; });
    }
    if (exceptKey !== 'hero') mark(draft.heroCards);
    (draft.villains || []).forEach(function (v, i) {
      if (exceptKey === 'villain' && i === exceptVIdx) return;
      mark(v.cards);
    });
    if (exceptKey !== 'flop') mark(draft.boardFlop);
    if (exceptKey !== 'turn') mark(draft.boardTurn);
    if (exceptKey !== 'river') mark(draft.boardRiver);
    return used;
  }

  function allUsedCards(draft) {
    return usedCardsExcept(draft, null, null);
  }

  function draftToSpec(draft) {
    return {
      format: draft.format,
      heroPos: draft.heroPos,
      heroCards: (draft.heroCards || []).slice(0, 2),
      villains: (draft.villains || [])
        .filter(function (v) { return v && v.pos; })
        .map(function (v) {
          return { pos: v.pos, cards: (v.cards || []).slice(0, 2) };
        }),
      board: [].concat(draft.boardFlop || [], draft.boardTurn || [], draft.boardRiver || []),
      actions: {
        preflop: (draft.actions.preflop || []).map(cloneAct),
        flop: (draft.actions.flop || []).map(cloneAct),
        turn: (draft.actions.turn || []).map(cloneAct),
        river: (draft.actions.river || []).map(cloneAct)
      },
      _source: 'manual',
      _id: S.editId || null,
      _createdAt: (S.editMeta && S.editMeta.createdAt) || null,
      _name: (S.editMeta && S.editMeta.savedName) || null
    };
  }

  // ---------- render: lista ----------
  function render(container) {
    if (container) S.container = container;
    if (!S.container) return;
    if (S.view === 'manual') return renderManual();
    if (S.view === 'text') return renderText();
    return renderList();
  }

  function renderList() {
    var root = S.container;
    var hands = getHands();
    var max = handsMax();
    var used = hands.length;
    var html = '';
    html += '<div class="ha-intro">';
    html += '<h2 class="ha-title">Análisis de manos</h2>';
    html += '<p class="muted-text">Introduce una mano a mano o descríbela en texto y deja que la IA la prepare. Revísala paso a paso con GTO y vuelve a jugarla en el entrenador con las mismas cartas.</p>';
    html += '<div class="ha-actions-top">';
    html += '<button class="btn btn-primary" data-ha-new="manual">+ Añadir mano (manual)</button>';
    html += '<button class="btn btn-secondary" data-ha-new="text">Añadir con IA (texto)</button>';
    html += '</div>';
    html += '<div class="ha-limit muted-text">Manos guardadas: <strong>' + used + ' / ' + max + '</strong>' +
      (used >= max ? ' — límite del plan alcanzado. Borra alguna o mejora tu plan.' : '') + '</div>';
    html += '</div>';

    if (!hands.length) {
      html += '<div class="ha-empty"><p class="muted-text">Todavía no has guardado ninguna mano. Empieza añadiendo una.</p></div>';
    } else {
      html += '<div class="ha-list">';
      hands.forEach(function (h) {
        html += renderHandCard(h);
      });
      html += '</div>';
    }
    root.innerHTML = html;
    bindList();
  }

  function handTitle(h) {
    if (h.savedName) return esc(h.savedName);
    return esc((h.heroCode || '') + ' · ' + (h.heroPos || ''));
  }

  function renderHandCard(h) {
    var boardStr = (h.boardAll && h.boardAll.length) ? cardsHTML(h.boardAll) : '<span class="muted-text">Preflop</span>';
    var acc = (typeof h.accuracy === 'number') ? (h.accuracy + '% acierto') : '';
    var src = h.source === 'text' ? 'IA' : 'Manual';
    var when = '';
    try { when = new Date(h.createdAt).toLocaleDateString('es-ES'); } catch (e) { when = ''; }
    var html = '<div class="ha-card" data-ha-id="' + esc(h.id) + '">';
    html += '<div class="ha-card-head">';
    html += '<div class="ha-card-cards">' + cardsHTML(h.heroCards || []) + '</div>';
    html += '<div class="ha-card-info"><div class="ha-card-title">' + handTitle(h) + '</div>';
    html += '<div class="ha-card-sub muted-text">' + esc(src) + (when ? ' · ' + esc(when) : '') + (acc ? ' · ' + esc(acc) : '') + '</div></div>';
    html += '</div>';
    html += '<div class="ha-card-board">' + boardStr + '</div>';
    html += '<div class="ha-card-actions">';
    html += '<button class="btn btn-small btn-secondary" data-ha-review="' + esc(h.id) + '">Ver paso a paso</button>';
    html += '<button class="btn btn-small btn-secondary" data-ha-edit="' + esc(h.id) + '">Editar</button>';
    html += '<button class="btn btn-small btn-primary" data-ha-play="' + esc(h.id) + '">Jugar en entrenador</button>';
    html += '<button class="btn btn-small btn-ghost" data-ha-del="' + esc(h.id) + '">Borrar</button>';
    html += '</div>';
    html += '<div class="ha-play-panel hidden" data-ha-play-panel="' + esc(h.id) + '"></div>';
    html += '</div>';
    return html;
  }

  function bindList() {
    var root = S.container;
    root.querySelectorAll('[data-ha-new]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.dataset.haNew;
        if (v === 'manual') {
          S.editId = null;
          S.editMeta = null;
          S.picker = null;
          S.draft = emptyDraft(S.format);
          syncActionsFromSeats(S.draft);
          S.view = 'manual';
          render();
        } else {
          S.view = 'text';
          render();
        }
      });
    });
    root.querySelectorAll('[data-ha-review]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var h = global.Store.getAnalysisHand(btn.dataset.haReview);
        if (h && global.openAnalysisHandReview) global.openAnalysisHandReview(h, 'review');
      });
    });
    root.querySelectorAll('[data-ha-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { startEditHand(btn.dataset.haEdit); });
    });
    root.querySelectorAll('[data-ha-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('¿Borrar esta mano guardada?')) return;
        global.Store.removeAnalysisHand(btn.dataset.haDel);
        render();
      });
    });
    root.querySelectorAll('[data-ha-play]').forEach(function (btn) {
      btn.addEventListener('click', function () { togglePlayPanel(btn.dataset.haPlay); });
    });
  }

  function startEditHand(id) {
    var h = global.Store.getAnalysisHand(id);
    if (!h) return;
    var spec = h.spec;
    if (!spec) {
      // Fallback mínimo si la mano antigua no guardó spec
      spec = {
        format: '6max',
        heroPos: h.heroPos,
        heroCards: (h.heroCards || []).slice(0, 2),
        villains: Object.keys(h.villainShows || {}).map(function (pos) {
          return { pos: pos, cards: (h.villainShows[pos] || []).slice(0, 2) };
        }),
        board: (h.boardAll || h.board || []).slice(0, 5),
        actions: emptyActions()
      };
      if (!spec.villains.length) spec.villains = [{ pos: '', cards: [] }];
    }
    S.editId = h.id;
    S.editMeta = {
      createdAt: h.createdAt,
      savedName: h.savedName,
      coachThread: h.coachThread,
      aiAnalysis: h.aiAnalysis,
      source: h.source
    };
    S.picker = null;
    S.format = spec.format === '9max' ? '9max' : '6max';
    S.draft = draftFromSpec(spec);
    ensureUniqueSeats(S.draft);
    syncActionsFromSeats(S.draft);
    S.view = 'manual';
    render();
  }

  function ensureUniqueSeats(draft) {
    var seen = {};
    if (draft.heroPos) seen[draft.heroPos] = true;
    (draft.villains || []).forEach(function (v) {
      if (!v || !v.pos) return;
      if (seen[v.pos]) v.pos = '';
      else seen[v.pos] = true;
    });
  }

  function togglePlayPanel(id) {
    var panel = S.container.querySelector('[data-ha-play-panel="' + CSS.escape(id) + '"]');
    if (!panel) return;
    if (!panel.classList.contains('hidden')) { panel.classList.add('hidden'); return; }
    panel.innerHTML = renderPlayPanel(id);
    panel.classList.remove('hidden');
    bindPlayPanel(panel, id);
  }

  function renderPlayPanel(id) {
    var html = '<div class="ha-play-opts">';
    html += '<div class="ha-opt-group"><span class="ha-opt-label">Tipo de villano</span><div class="ha-chips" data-ha-villain>';
    VILLAIN_LEVELS.forEach(function (v, i) {
      html += '<button class="ha-chip' + (i === 0 ? ' active' : '') + '" data-val="' + v.val + '">' + esc(v.label) + '</button>';
    });
    html += '</div></div>';
    html += '<div class="ha-opt-group"><span class="ha-opt-label">Mesa</span><div class="ha-chips" data-ha-theme>';
    THEMES.forEach(function (t, i) {
      html += '<button class="ha-chip' + (i === 0 ? ' active' : '') + '" data-val="' + t.val + '">' + esc(t.label) + '</button>';
    });
    html += '</div></div>';
    html += '<button class="btn btn-primary btn-small" data-ha-play-go="' + esc(id) + '">Jugar esta mano &raquo;</button>';
    html += '</div>';
    return html;
  }

  function bindPlayPanel(panel, id) {
    panel.querySelectorAll('.ha-chips').forEach(function (group) {
      group.querySelectorAll('.ha-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          group.querySelectorAll('.ha-chip').forEach(function (c) { c.classList.remove('active'); });
          chip.classList.add('active');
        });
      });
    });
    var go = panel.querySelector('[data-ha-play-go]');
    if (go) go.addEventListener('click', function () {
      var vl = (panel.querySelector('[data-ha-villain] .ha-chip.active') || {}).dataset;
      var th = (panel.querySelector('[data-ha-theme] .ha-chip.active') || {}).dataset;
      var hand = global.Store.getAnalysisHand(id);
      if (!hand) return;
      var cfg = toTrainerConfig(hand, vl ? vl.val : 'pro', th ? th.val : 'emerald');
      if (global.playAnalysisHand) global.playAnalysisHand(cfg.force, cfg.playConfig);
    });
  }

  // ---------- card picker (imágenes) ----------
  function cardSlotHTML(cards, max, key, vIdx) {
    var html = '<div class="ha-card-slots" data-ha-pick="' + esc(key) + '"' +
      (vIdx != null ? ' data-vidx="' + vIdx + '"' : '') + ' data-max="' + max + '">';
    for (var i = 0; i < max; i++) {
      if (cards[i]) {
        html += '<button type="button" class="ha-card-slot filled" data-slot="' + i + '" aria-label="Carta ' + esc(cards[i]) + '">' +
          cardHTML(cards[i]) + '</button>';
      } else {
        html += '<button type="button" class="ha-card-slot empty" data-slot="' + i + '" aria-label="Elegir carta">+</button>';
      }
    }
    if (cards.length) {
      html += '<button type="button" class="ha-card-clear" data-ha-clear-cards="' + esc(key) + '"' +
        (vIdx != null ? ' data-vidx="' + vIdx + '"' : '') + '>Limpiar</button>';
    }
    html += '</div>';
    return html;
  }

  function pickerPanelHTML(draft) {
    if (!S.picker) return '';
    var key = S.picker.key;
    var vIdx = S.picker.vIdx;
    var max = S.picker.max;
    var current = getPickTargetCards(draft, key, vIdx).slice();
    var usedElsewhere = usedCardsExcept(draft, key, vIdx);
    var title = {
      hero: 'Cartas del héroe',
      villain: 'Cartas del villano',
      flop: 'Flop (3 cartas)',
      turn: 'Turn',
      river: 'River'
    }[key] || 'Elegir cartas';

    var html = '<div class="ha-picker" data-ha-picker>';
    html += '<div class="ha-picker-head"><span class="ha-picker-title">' + esc(title) +
      '</span><span class="ha-picker-count muted-text">' + current.length + ' / ' + max +
      '</span><button type="button" class="btn btn-small btn-ghost" data-ha-picker-close>Listo</button></div>';
    html += '<div class="ha-picker-selected">' +
      (current.length ? cardsHTML(current) : '<span class="muted-text">Toca una carta para seleccionarla</span>') +
      '</div>';
    html += '<div class="ha-picker-deck">';
    fullDeck().forEach(function (c) {
      var selected = current.indexOf(c) >= 0;
      var busy = !selected && !!usedElsewhere[c];
      var cls = 'ha-pick-card' + (selected ? ' selected' : '') + (busy ? ' busy' : '');
      html += '<button type="button" class="' + cls + '" data-card="' + c + '"' +
        (busy ? ' disabled' : '') + '>' + cardHTML(c) + '</button>';
    });
    html += '</div></div>';
    return html;
  }

  function getPickTargetCards(draft, key, vIdx) {
    if (key === 'hero') return draft.heroCards || [];
    if (key === 'villain') {
      var v = draft.villains[vIdx];
      return (v && v.cards) || [];
    }
    if (key === 'flop') return draft.boardFlop || [];
    if (key === 'turn') return draft.boardTurn || [];
    if (key === 'river') return draft.boardRiver || [];
    return [];
  }

  function setPickTargetCards(draft, key, vIdx, cards) {
    if (key === 'hero') draft.heroCards = cards.slice(0, 2);
    else if (key === 'villain' && draft.villains[vIdx]) draft.villains[vIdx].cards = cards.slice(0, 2);
    else if (key === 'flop') draft.boardFlop = cards.slice(0, 3);
    else if (key === 'turn') draft.boardTurn = cards.slice(0, 1);
    else if (key === 'river') draft.boardRiver = cards.slice(0, 1);
  }

  // ---------- render: formulario manual ----------
  function posOptions(fmt, selected, taken) {
    return ringFor(fmt).map(function (p) {
      if (taken && taken[p] && p !== selected) return '';
      return '<option value="' + p + '"' + (p === selected ? ' selected' : '') + '>' + p + '</option>';
    }).join('');
  }

  function actionRowHTML(st, act) {
    var needsAmt = act.action === 'bet' || act.action === 'raise';
    var html = '<div class="ha-action-row" data-street="' + st + '" data-pos="' + esc(act.pos) + '">';
    html += '<span class="ha-apos-label">' + esc(act.pos) + '</span>';
    html += '<select class="ha-aact" data-ha-act="' + esc(act.pos) + '" data-street="' + st + '">';
    Object.keys(ACTION_LABELS).forEach(function (k) {
      html += '<option value="' + k + '"' + (k === act.action ? ' selected' : '') + '>' + esc(ACTION_LABELS[k]) + '</option>';
    });
    html += '</select>';
    html += '<input class="ha-aamt" type="number" min="0" step="0.5" placeholder="bb" data-ha-amt="' + esc(act.pos) + '" data-street="' + st + '"' +
      (needsAmt ? '' : ' disabled') +
      (act.amountBB != null ? ' value="' + esc(String(act.amountBB)) + '"' : '') + ' />';
    html += '</div>';
    return html;
  }

  function villainRowHTML(draft, v, idx) {
    var taken = takenSeats(draft, idx);
    var html = '<div class="ha-villain-row" data-vidx="' + idx + '">';
    html += '<select class="ha-vpos" data-ha-vpos="' + idx + '">';
    html += '<option value="">— asiento —</option>';
    html += posOptions(draft.format, v.pos, taken);
    html += '</select>';
    html += cardSlotHTML(v.cards || [], 2, 'villain', idx);
    html += '<button type="button" class="ha-row-del" data-ha-del-vrow="' + idx + '" aria-label="Quitar">&times;</button>';
    html += '</div>';
    return html;
  }

  function heroPosChipsHTML(draft) {
    var taken = takenSeats(draft, null);
    var html = '';
    ringFor(draft.format).forEach(function (p) {
      if (taken[p] === 'villain' && p !== draft.heroPos) return;
      html += '<button type="button" class="ha-chip' + (p === draft.heroPos ? ' active' : '') +
        '" data-ha-hero-pos="' + p + '">' + p + '</button>';
    });
    return html;
  }

  function renderManual() {
    var root = S.container;
    if (!S.draft) {
      S.draft = emptyDraft(S.format);
      syncActionsFromSeats(S.draft);
    }
    var draft = S.draft;
    var editing = !!S.editId;
    var html = '';
    html += '<button class="btn btn-ghost back-btn" data-ha-back>&laquo; Volver</button>';
    html += '<h2 class="ha-title">' + (editing ? 'Editar mano' : 'Añadir mano manualmente') + '</h2>';
    html += '<p class="muted-text">El análisis manual está incluido gratis. Elige asientos (sin repetir), cartas con el selector visual y las acciones por calle.</p>';

    html += '<div class="ha-form">';

    html += '<div class="ha-field"><label>Formato de mesa</label><div class="ha-chips ha-format">';
    [['6max', '6-max'], ['9max', '9-max']].forEach(function (f) {
      html += '<button type="button" class="ha-chip' + (f[0] === draft.format ? ' active' : '') + '" data-ha-format="' + f[0] + '">' + f[1] + '</button>';
    });
    html += '</div></div>';

    html += '<div class="ha-field"><label>Posición del héroe</label><div class="ha-chips ha-hero-pos">';
    html += heroPosChipsHTML(draft);
    html += '</div></div>';

    html += '<div class="ha-field"><label>Cartas del héroe</label>';
    html += cardSlotHTML(draft.heroCards, 2, 'hero', null);
    html += '</div>';

    html += '<div class="ha-field"><label>Villanos (asiento y cartas si se conocen)</label>';
    html += '<div class="ha-villains">';
    (draft.villains || []).forEach(function (v, i) {
      html += villainRowHTML(draft, v, i);
    });
    html += '</div>';
    html += '<button type="button" class="btn btn-small btn-ghost" data-ha-add-villain>+ Añadir villano</button></div>';

    html += '<div class="ha-field ha-board-field"><label>Cartas comunitarias</label>';
    html += '<div class="ha-board-pickers">';
    html += '<div class="ha-board-group"><span class="ha-board-label">Flop</span>' + cardSlotHTML(draft.boardFlop, 3, 'flop', null) + '</div>';
    html += '<div class="ha-board-group"><span class="ha-board-label">Turn</span>' + cardSlotHTML(draft.boardTurn, 1, 'turn', null) + '</div>';
    html += '<div class="ha-board-group"><span class="ha-board-label">River</span>' + cardSlotHTML(draft.boardRiver, 1, 'river', null) + '</div>';
    html += '</div></div>';

    if (S.picker) html += pickerPanelHTML(draft);

    STREET_ORDER.forEach(function (st) {
      var acts = (draft.actions && draft.actions[st]) || [];
      html += '<div class="ha-field ha-street-field" data-street-field="' + st + '"><label>Acciones · ' + STREET_LABELS[st] + '</label>';
      html += '<div class="ha-actions-list" data-street-list="' + st + '">';
      if (!acts.length) {
        html += '<p class="muted-text ha-street-empty">Selecciona héroe y villanos para cargar sus acciones.</p>';
      } else {
        acts.forEach(function (a) { html += actionRowHTML(st, a); });
      }
      html += '</div></div>';
    });

    html += '<div class="ha-form-errors" data-ha-errors></div>';
    html += '<div class="ha-form-buttons">';
    html += '<button class="btn btn-primary" data-ha-manual-save">' +
      (editing ? 'Reanalizar y guardar' : 'Analizar y guardar') + '</button>';
    html += '</div>';

    html += '</div>';
    root.innerHTML = html;
    bindManual();
  }

  function refreshManualKeepScroll() {
    var y = window.scrollY || 0;
    renderManual();
    if (window.scrollTo) window.scrollTo(0, y);
  }

  function bindManual() {
    var root = S.container;
    var draft = S.draft;

    root.querySelector('[data-ha-back]').addEventListener('click', function () {
      S.view = 'list';
      S.draft = null;
      S.editId = null;
      S.editMeta = null;
      S.picker = null;
      render();
    });

    root.querySelectorAll('[data-ha-format]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fmt = btn.dataset.haFormat;
        if (fmt === draft.format) return;
        draft.format = fmt;
        S.format = fmt;
        var ring = ringFor(fmt);
        if (ring.indexOf(draft.heroPos) < 0) draft.heroPos = ring[0];
        (draft.villains || []).forEach(function (v) {
          if (v.pos && ring.indexOf(v.pos) < 0) v.pos = '';
        });
        ensureUniqueSeats(draft);
        syncActionsFromSeats(draft);
        S.picker = null;
        refreshManualKeepScroll();
      });
    });

    root.querySelectorAll('[data-ha-hero-pos]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pos = btn.dataset.haHeroPos;
        if (pos === draft.heroPos) return;
        // Liberar ese asiento de villanos
        (draft.villains || []).forEach(function (v) {
          if (v.pos === pos) v.pos = '';
        });
        draft.heroPos = pos;
        syncActionsFromSeats(draft);
        refreshManualKeepScroll();
      });
    });

    var addV = root.querySelector('[data-ha-add-villain]');
    if (addV) addV.addEventListener('click', function () {
      draft.villains.push({ pos: '', cards: [] });
      refreshManualKeepScroll();
    });

    root.querySelectorAll('[data-ha-vpos]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var idx = parseInt(sel.dataset.haVpos, 10);
        var pos = sel.value;
        var taken = takenSeats(draft, idx);
        if (pos && taken[pos]) {
          sel.value = draft.villains[idx].pos || '';
          showErrors(['El asiento ' + pos + ' ya está ocupado.']);
          return;
        }
        draft.villains[idx].pos = pos;
        // Si el héroe tenía ese asiento, mover héroe al primer libre
        if (pos && draft.heroPos === pos) {
          var ring = ringFor(draft.format);
          var takenAfter = {};
          draft.villains.forEach(function (v) {
            if (v.pos) takenAfter[v.pos] = true;
          });
          draft.heroPos = ring.find(function (p) { return !takenAfter[p]; }) || ring[0];
        }
        syncActionsFromSeats(draft);
        refreshManualKeepScroll();
      });
    });

    root.querySelectorAll('[data-ha-del-vrow]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.dataset.haDelVrow, 10);
        draft.villains.splice(idx, 1);
        if (!draft.villains.length) draft.villains.push({ pos: '', cards: [] });
        syncActionsFromSeats(draft);
        refreshManualKeepScroll();
      });
    });

    // Abrir picker
    root.querySelectorAll('[data-ha-pick]').forEach(function (slotWrap) {
      slotWrap.addEventListener('click', function (e) {
        if (e.target.closest('[data-ha-clear-cards]')) return;
        var key = slotWrap.dataset.haPick;
        var max = parseInt(slotWrap.dataset.max, 10) || 2;
        var vIdx = slotWrap.dataset.vidx != null ? parseInt(slotWrap.dataset.vidx, 10) : null;
        S.picker = { key: key, max: max, vIdx: isNaN(vIdx) ? null : vIdx };
        refreshManualKeepScroll();
      });
    });

    root.querySelectorAll('[data-ha-clear-cards]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var key = btn.dataset.haClearCards;
        var vIdx = btn.dataset.vidx != null ? parseInt(btn.dataset.vidx, 10) : null;
        setPickTargetCards(draft, key, isNaN(vIdx) ? null : vIdx, []);
        if (S.picker && S.picker.key === key && S.picker.vIdx === vIdx) {
          /* keep open */
        }
        refreshManualKeepScroll();
      });
    });

    if (S.picker) {
      var close = root.querySelector('[data-ha-picker-close]');
      if (close) close.addEventListener('click', function () {
        S.picker = null;
        refreshManualKeepScroll();
      });
      root.querySelectorAll('.ha-pick-card[data-card]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (btn.disabled) return;
          var c = btn.dataset.card;
          var cur = getPickTargetCards(draft, S.picker.key, S.picker.vIdx).slice();
          var ix = cur.indexOf(c);
          if (ix >= 0) cur.splice(ix, 1);
          else {
            if (cur.length >= S.picker.max) {
              // reemplaza la última
              cur[cur.length - 1] = c;
            } else cur.push(c);
          }
          setPickTargetCards(draft, S.picker.key, S.picker.vIdx, cur);
          refreshManualKeepScroll();
        });
      });
    }

    // Acciones: cambio de tipo / cantidad
    root.querySelectorAll('[data-ha-act]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var st = sel.dataset.street;
        var pos = sel.dataset.haAct;
        var acts = draft.actions[st] || [];
        for (var i = 0; i < acts.length; i++) {
          if (acts[i].pos === pos) {
            acts[i].action = sel.value;
            if (sel.value !== 'bet' && sel.value !== 'raise') acts[i].amountBB = null;
            break;
          }
        }
        if (sel.value === 'fold') {
          syncActionsFromSeats(draft);
          refreshManualKeepScroll();
        } else {
          // solo habilitar/deshabilitar amount
          var amt = root.querySelector('[data-ha-amt="' + CSS.escape(pos) + '"][data-street="' + st + '"]');
          if (amt) amt.disabled = !(sel.value === 'bet' || sel.value === 'raise');
        }
      });
    });
    root.querySelectorAll('[data-ha-amt]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var st = inp.dataset.street;
        var pos = inp.dataset.haAmt;
        var acts = draft.actions[st] || [];
        var n = parseFloat(inp.value);
        for (var i = 0; i < acts.length; i++) {
          if (acts[i].pos === pos) {
            acts[i].amountBB = isFinite(n) ? n : null;
            break;
          }
        }
      });
    });

    root.querySelector('[data-ha-manual-save]').addEventListener('click', onManualSave);
  }

  function showErrors(errs) {
    var box = S.container.querySelector('[data-ha-errors]');
    if (!box) return;
    if (!errs.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<ul>' + errs.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>';
  }

  function onManualSave() {
    var draft = S.draft;
    syncActionsFromSeats(draft);
    var spec = draftToSpec(draft);
    var errs = validateSpec(spec);
    if (errs.length) { showErrors(errs); return; }
    showErrors([]);

    var editing = !!S.editId;
    if (!editing) {
      var check = canSave();
      if (!check.ok) {
        showErrors(['Has alcanzado el límite de manos guardadas de tu plan (' + check.limit + '). Borra alguna o mejora tu plan.']);
        return;
      }
    }

    var analyzed;
    try {
      analyzed = buildAnalyzedHand(spec, (S.editMeta && S.editMeta.source) || 'manual');
    } catch (e) {
      showErrors(['No se pudo analizar la mano: ' + (e.message || e)]);
      return;
    }
    if (editing && S.editMeta) {
      if (S.editMeta.coachThread) analyzed.coachThread = S.editMeta.coachThread;
      if (S.editMeta.aiAnalysis) analyzed.aiAnalysis = S.editMeta.aiAnalysis;
      if (S.editMeta.createdAt) analyzed.createdAt = S.editMeta.createdAt;
    }

    var res = editing ? updateHand(analyzed) : saveHand(analyzed);
    if (!res.ok) {
      showErrors(['No se pudo guardar: ' + (res.error === 'analysis_limit' ? 'límite del plan alcanzado.' : (res.error || ''))]);
      return;
    }
    S.view = 'list';
    S.draft = null;
    S.editId = null;
    S.editMeta = null;
    S.picker = null;
    render();
    if (global.openAnalysisHandReview) global.openAnalysisHandReview(res.hand || analyzed, 'review');
  }

  // ---------- render: texto / IA ----------
  function renderText() {
    var root = S.container;
    var html = '';
    html += '<button class="btn btn-ghost back-btn" data-ha-back>&laquo; Volver</button>';
    html += '<h2 class="ha-title">Añadir mano con IA (texto)</h2>';
    html += '<p class="muted-text">Describe la mano en lenguaje natural: posiciones, cartas del héroe y villanos (si se conocen), cartas comunitarias y las acciones. La IA la preparará para el paso a paso e incluirá su análisis. <strong>Esta acción consume una consulta de tu plan o bono.</strong></p>';
    html += '<div class="ha-form">';
    html += '<textarea class="ha-text-input" rows="8" placeholder="Ej.: 6-max. Soy CO con As Kd. UTG se retira, HJ paga, yo subo a 3bb, BTN paga, se retiran las ciegas. Flop 9c Tc 8c: HJ pasa, yo apuesto 5bb, HJ paga. Turn 2h: pasa pasa. River 2s: HJ apuesta 10bb y me lo pienso."></textarea>';
    html += '<div class="ha-form-errors" data-ha-errors></div>';
    html += '<div class="ha-form-buttons">';
    html += '<button class="btn btn-primary" data-ha-text-go>Analizar con IA y guardar</button>';
    html += '</div>';
    html += '<div class="ha-text-status" data-ha-text-status></div>';
    html += '</div>';
    root.innerHTML = html;
    root.querySelector('[data-ha-back]').addEventListener('click', function () { S.view = 'list'; render(); });
    root.querySelector('[data-ha-text-go]').addEventListener('click', onTextAnalyze);
  }

  function normalizeAiSpec(aiHand) {
    var spec = {
      format: aiHand.format === '9max' ? '9max' : '6max',
      heroPos: aiHand.heroPos,
      heroCards: parseCardList((aiHand.heroCards || []).join(' ')),
      villains: [],
      board: parseCardList((aiHand.board || []).join(' ')),
      actions: { preflop: [], flop: [], turn: [], river: [] },
      _source: 'text'
    };
    (aiHand.villains || []).forEach(function (v) {
      if (!v || !v.pos) return;
      var cards = parseCardList((v.cards || []).join(' '));
      spec.villains.push({ pos: v.pos, cards: cards.length === 2 ? cards : [] });
    });
    var acts = aiHand.actions || {};
    STREET_ORDER.forEach(function (st) {
      (acts[st] || []).forEach(function (a) {
        if (!a || !a.pos || !a.action) return;
        var action = String(a.action).toLowerCase();
        if (!ACTION_LABELS[action]) return;
        var amt = Number(a.amountBB);
        spec.actions[st].push({ pos: a.pos, action: action, amountBB: isFinite(amt) ? amt : null });
      });
    });
    return spec;
  }

  function onTextAnalyze() {
    var root = S.container;
    var text = root.querySelector('.ha-text-input').value.trim();
    showErrors([]);
    var status = root.querySelector('[data-ha-text-status]');
    if (!text) { showErrors(['Escribe la descripción de la mano.']); return; }
    var check = canSave();
    if (!check.ok) {
      showErrors(['Has alcanzado el límite de manos guardadas de tu plan (' + check.limit + '). Borra alguna o mejora tu plan.']);
      return;
    }
    if (!global.PTAIReport || !global.PTAIReport.parseHand) {
      showErrors(['El IA Coach no está disponible ahora mismo.']);
      return;
    }
    var btn = root.querySelector('[data-ha-text-go]');
    btn.disabled = true;
    status.innerHTML = '<div class="ha-loading">La IA está leyendo la mano…</div>';

    global.PTAIReport.parseHand(text).then(function (data) {
      if (!data || !data.hand) throw new Error('La IA no devolvió una mano válida.');
      var spec = normalizeAiSpec(data.hand);
      var errs = validateSpec(spec);
      if (errs.length) {
        throw new Error('La IA no pudo estructurar bien la mano (' + errs[0] + '). Revisa la descripción o usa la entrada manual.');
      }
      var analyzed = buildAnalyzedHand(spec, 'text');
      if (data.analysisMarkdown) {
        analyzed.coachThread = [{
          mode: 'report',
          reportMarkdown: data.analysisMarkdown,
          model: 'gemini',
          createdAt: new Date().toISOString(),
          truncated: false
        }];
        analyzed.aiAnalysis = data.analysisMarkdown;
      }
      var res = saveHand(analyzed);
      if (!res.ok) throw new Error(res.error === 'analysis_limit' ? 'límite del plan alcanzado.' : (res.error || 'no se pudo guardar.'));
      btn.disabled = false;
      S.view = 'list';
      render();
      if (global.openAnalysisHandReview) global.openAnalysisHandReview(res.hand || analyzed, 'review');
    }).catch(function (e) {
      btn.disabled = false;
      status.innerHTML = '';
      if (e && e.paywall && global.PTBilling && global.PTBilling.showPaywall) {
        global.PTBilling.showPaywall(e.paywall);
        return;
      }
      showErrors([(e && e.message) ? e.message : 'No se pudo analizar la mano con IA.']);
    });
  }

  global.PTHandAnalysis = {
    render: render,
    specToRawHand: specToRawHand,
    buildAnalyzedHand: buildAnalyzedHand,
    toTrainerConfig: toTrainerConfig,
    syncActionsFromSeats: syncActionsFromSeats,
    activePlayersForStreet: activePlayersForStreet,
    takenSeats: takenSeats,
    emptyDraft: emptyDraft,
    draftFromSpec: draftFromSpec
  };
})(window);
