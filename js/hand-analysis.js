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

  var S = { view: 'list', container: null, format: '6max' };

  // ---------- utilidades ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function round2(x) { return Math.round(x * 100) / 100; }
  function ringFor(fmt) { return fmt === '9max' ? RING_9.slice() : RING_6.slice(); }

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
    ['preflop', 'flop', 'turn', 'river'].forEach(function (st) {
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
      id: 'ah_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
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
    analyzed.spec = spec;
    analyzed.boardAll = (raw.boardAll || analyzed.board || []).slice();
    analyzed.source = source || spec._source || 'manual';
    analyzed.createdAt = new Date().toISOString();
    analyzed.savedName = spec._name || null;
    return analyzed;
  }

  // ---------- validación de spec ----------
  function validateSpec(spec) {
    var errs = [];
    if (!spec.heroPos) errs.push('Elige la posición del héroe.');
    if (!spec.heroCards || spec.heroCards.length !== 2) errs.push('Introduce las 2 cartas del héroe (ej.: As Kd).');
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
      // Escenarios complejos (squeeze/3bet/…): se aproxima a un vsRFI jugable.
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
        if (v === 'manual') { S.view = 'manual'; render(); }
        else { S.view = 'text'; render(); }
      });
    });
    root.querySelectorAll('[data-ha-review]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var h = global.Store.getAnalysisHand(btn.dataset.haReview);
        if (h && global.openAnalysisHandReview) global.openAnalysisHandReview(h, 'review');
      });
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

  // ---------- render: formulario manual ----------
  function posOptions(fmt, selected) {
    return ringFor(fmt).map(function (p) {
      return '<option value="' + p + '"' + (p === selected ? ' selected' : '') + '>' + p + '</option>';
    }).join('');
  }

  function actionRowHTML(street, fmt) {
    var html = '<div class="ha-action-row" data-street="' + street + '">';
    html += '<select class="ha-apos">' + posOptions(fmt, null) + '</select>';
    html += '<select class="ha-aact">';
    Object.keys(ACTION_LABELS).forEach(function (k) {
      html += '<option value="' + k + '">' + esc(ACTION_LABELS[k]) + '</option>';
    });
    html += '</select>';
    html += '<input class="ha-aamt" type="number" min="0" step="0.5" placeholder="bb" />';
    html += '<button type="button" class="ha-row-del" data-ha-del-row aria-label="Quitar">&times;</button>';
    html += '</div>';
    return html;
  }

  function villainRowHTML(fmt) {
    var html = '<div class="ha-villain-row">';
    html += '<select class="ha-vpos">' + posOptions(fmt, 'BTN') + '</select>';
    html += '<input class="ha-vcards" type="text" placeholder="Cartas (opcional) ej.: Qs Qd" />';
    html += '<button type="button" class="ha-row-del" data-ha-del-vrow aria-label="Quitar">&times;</button>';
    html += '</div>';
    return html;
  }

  function renderManual() {
    var root = S.container;
    var fmt = S.format;
    var html = '';
    html += '<button class="btn btn-ghost back-btn" data-ha-back>&laquo; Volver a mis manos</button>';
    html += '<h2 class="ha-title">Añadir mano manualmente</h2>';
    html += '<p class="muted-text">El análisis manual está incluido gratis. Introduce las posiciones, las cartas y las acciones por calle.</p>';

    html += '<div class="ha-form">';

    html += '<div class="ha-field"><label>Formato de mesa</label><div class="ha-chips ha-format">';
    [['6max', '6-max'], ['9max', '9-max']].forEach(function (f) {
      html += '<button type="button" class="ha-chip' + (f[0] === fmt ? ' active' : '') + '" data-val="' + f[0] + '">' + f[1] + '</button>';
    });
    html += '</div></div>';

    html += '<div class="ha-field"><label>Posición del héroe</label><div class="ha-chips ha-hero-pos">';
    ringFor(fmt).forEach(function (p, i) {
      html += '<button type="button" class="ha-chip' + (i === 0 ? ' active' : '') + '" data-val="' + p + '">' + p + '</button>';
    });
    html += '</div></div>';

    html += '<div class="ha-field"><label>Cartas del héroe</label>';
    html += '<input class="ha-hero-cards" type="text" placeholder="Ej.: As Kd" /></div>';

    html += '<div class="ha-field"><label>Villanos (posición y cartas si se conocen)</label>';
    html += '<div class="ha-villains">' + villainRowHTML(fmt) + '</div>';
    html += '<button type="button" class="btn btn-small btn-ghost" data-ha-add-villain>+ Añadir villano</button></div>';

    html += '<div class="ha-field ha-board-field"><label>Cartas comunitarias</label>';
    html += '<div class="ha-board-inputs">';
    html += '<input class="ha-flop" type="text" placeholder="Flop (ej.: 9c Tc 8c)" />';
    html += '<input class="ha-turn" type="text" placeholder="Turn" />';
    html += '<input class="ha-river" type="text" placeholder="River" />';
    html += '</div></div>';

    ['preflop', 'flop', 'turn', 'river'].forEach(function (st) {
      var label = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' }[st];
      html += '<div class="ha-field ha-street-field"><label>Acciones · ' + label + '</label>';
      html += '<div class="ha-actions-list" data-street-list="' + st + '">';
      if (st === 'preflop') html += actionRowHTML(st, fmt);
      html += '</div>';
      html += '<button type="button" class="btn btn-small btn-ghost" data-ha-add-action="' + st + '">+ Acción</button></div>';
    });

    html += '<div class="ha-form-errors" data-ha-errors></div>';
    html += '<div class="ha-form-buttons">';
    html += '<button class="btn btn-primary" data-ha-manual-save>Analizar y guardar</button>';
    html += '</div>';

    html += '</div>';
    root.innerHTML = html;
    bindManual();
  }

  function activeChipVal(scopeEl, sel) {
    var el = scopeEl.querySelector(sel + ' .ha-chip.active');
    return el ? el.dataset.val : null;
  }

  function bindManual() {
    var root = S.container;
    root.querySelector('[data-ha-back]').addEventListener('click', function () { S.view = 'list'; render(); });

    // chip groups
    root.querySelectorAll('.ha-chips').forEach(function (group) {
      group.addEventListener('click', function (e) {
        var chip = e.target.closest('.ha-chip');
        if (!chip) return;
        group.querySelectorAll('.ha-chip').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        if (group.classList.contains('ha-format')) {
          S.format = chip.dataset.val;
          renderManual();
        }
      });
    });

    root.querySelector('[data-ha-add-villain]').addEventListener('click', function () {
      var box = root.querySelector('.ha-villains');
      box.insertAdjacentHTML('beforeend', villainRowHTML(S.format));
    });
    root.querySelectorAll('[data-ha-add-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var st = btn.dataset.haAddAction;
        var list = root.querySelector('[data-street-list="' + st + '"]');
        list.insertAdjacentHTML('beforeend', actionRowHTML(st, S.format));
      });
    });
    root.addEventListener('click', function (e) {
      var delRow = e.target.closest('[data-ha-del-row]');
      if (delRow) { delRow.closest('.ha-action-row').remove(); return; }
      var delV = e.target.closest('[data-ha-del-vrow]');
      if (delV) { delV.closest('.ha-villain-row').remove(); return; }
    });

    root.querySelector('[data-ha-manual-save]').addEventListener('click', onManualSave);
  }

  function readManualSpec() {
    var root = S.container;
    var fmt = activeChipVal(root, '.ha-format') || '6max';
    var spec = {
      format: fmt,
      heroPos: activeChipVal(root, '.ha-hero-pos'),
      heroCards: parseCardList(root.querySelector('.ha-hero-cards').value),
      villains: [],
      board: [],
      actions: { preflop: [], flop: [], turn: [], river: [] },
      _source: 'manual'
    };
    root.querySelectorAll('.ha-villain-row').forEach(function (row) {
      var pos = row.querySelector('.ha-vpos').value;
      var cards = parseCardList(row.querySelector('.ha-vcards').value);
      if (pos) spec.villains.push({ pos: pos, cards: cards.length === 2 ? cards : [] });
    });
    spec.board = parseCardList(root.querySelector('.ha-flop').value)
      .concat(parseCardList(root.querySelector('.ha-turn').value))
      .concat(parseCardList(root.querySelector('.ha-river').value));
    ['preflop', 'flop', 'turn', 'river'].forEach(function (st) {
      root.querySelectorAll('.ha-action-row[data-street="' + st + '"]').forEach(function (row) {
        var pos = row.querySelector('.ha-apos').value;
        var action = row.querySelector('.ha-aact').value;
        var amt = parseFloat(row.querySelector('.ha-aamt').value);
        if (pos && action) spec.actions[st].push({ pos: pos, action: action, amountBB: isFinite(amt) ? amt : null });
      });
    });
    return spec;
  }

  function showErrors(errs) {
    var box = S.container.querySelector('[data-ha-errors]');
    if (!box) return;
    if (!errs.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<ul>' + errs.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>';
  }

  function onManualSave() {
    var spec = readManualSpec();
    var errs = validateSpec(spec);
    if (errs.length) { showErrors(errs); return; }
    showErrors([]);
    var check = canSave();
    if (!check.ok) {
      showErrors(['Has alcanzado el límite de manos guardadas de tu plan (' + check.limit + '). Borra alguna o mejora tu plan.']);
      return;
    }
    var analyzed;
    try {
      analyzed = buildAnalyzedHand(spec, 'manual');
    } catch (e) {
      showErrors(['No se pudo analizar la mano: ' + (e.message || e)]);
      return;
    }
    var res = saveHand(analyzed);
    if (!res.ok) {
      showErrors(['No se pudo guardar: ' + (res.error === 'analysis_limit' ? 'límite del plan alcanzado.' : (res.error || ''))]);
      return;
    }
    S.view = 'list';
    render();
    if (global.openAnalysisHandReview) global.openAnalysisHandReview(res.hand || analyzed, 'review');
  }

  // ---------- render: texto / IA ----------
  function renderText() {
    var root = S.container;
    var html = '';
    html += '<button class="btn btn-ghost back-btn" data-ha-back>&laquo; Volver a mis manos</button>';
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
    ['preflop', 'flop', 'turn', 'river'].forEach(function (st) {
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
    toTrainerConfig: toTrainerConfig
  };
})(window);
