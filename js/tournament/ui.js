/*
 * tournament/ui.js — Hub / setup / mesa / resultado / histórico de Torneos IA.
 */
(function (global) {
  'use strict';

  var VIEW = {
    hub: 'hub',
    setup: 'setup',
    table: 'table',
    result: 'result',
    history: 'history'
  };

  var ui = {
    view: VIEW.hub,
    root: null,
    state: null,
    setupDraft: null,
    infoOpen: false,
    roleModalPlayerId: null,
    bustPrompt: false,
    lobbyFilter: 'all'
  };

  function fmtEur(n) {
    var x = Number(n) || 0;
    var s = x.toLocaleString('es-ES', {
      minimumFractionDigits: (Math.round(x * 100) % 100) ? 2 : 0,
      maximumFractionDigits: 2
    });
    return s + ' €';
  }

  function startingBb(cfg) {
    var sch = cfg && cfg.blindSchedule && cfg.blindSchedule[0];
    var bb = sch && sch.bb ? Number(sch.bb) : 20;
    return Math.max(1, Math.round(Number(cfg.startingStack || 0) / bb));
  }

  function lobbyBadges(cfg) {
    var badges = [];
    badges.push({ t: cfg.kind === 'sng' ? 'SNG' : 'MTT', k: 'kind' });
    badges.push({ t: cfg.seatsPerTable + '-MAX', k: 'max' });
    badges.push({ t: "HOLD'EM NL", k: 'game' });
    if (startingBb(cfg) >= 100) badges.push({ t: 'DEEP', k: 'deep' });
    if (cfg.id === 'easy') badges.push({ t: 'FÁCIL', k: 'diff' });
    if (cfg.id === 'medium') badges.push({ t: 'MEDIO', k: 'diff' });
    if (cfg.id === 'hard') badges.push({ t: 'DIFÍCIL', k: 'diff' });
    return badges;
  }

  function lobbyTone(cfg) {
    if (cfg.id === 'hard') return 'hard';
    if (cfg.id === 'medium') return 'mid';
    if (cfg.id === 'easy') return 'easy';
    if (cfg.kind === 'sng') return 'sng';
    return 'mtt';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cardHtml(c) {
    var code = typeof c === 'string' ? c : (c && (c.code || (c.r != null && c.s ? String(c.r) + c.s : ''))) || '';
    if (!code || code.length < 2) return '<span class="card card-back"></span>';
    var rank = code.charAt(0);
    var suit = code.charAt(1);
    var red = suit === 'h' || suit === 'd';
    var suitSym = { c: '♣', d: '♦', h: '♥', s: '♠' }[suit] || suit;
    return '<span class="card' + (red ? ' card-red' : ' card-black') + '">' +
      '<span class="card-rank">' + esc(rank) + '</span>' +
      '<span class="card-suit">' + suitSym + '</span></span>';
  }

  function roleLabel(id) {
    var L = global.PTTournamentRoleGuess && global.PTTournamentRoleGuess.ROLE_LABELS;
    return (L && L[id]) || id || '—';
  }

  function setView(v) {
    ui.view = v;
    paint();
  }

  function startFromConfig(cfg, opts) {
    var Runner = global.PTTournamentRunner;
    ui.state = Runner.create(cfg, opts || {});
    ui.bustPrompt = false;
    ui.infoOpen = false;
    ui.roleModalPlayerId = null;
    Runner.beginHand(ui.state);
    setView(VIEW.table);
  }

  function startPreset(id) {
    startFromConfig(id, {});
  }

  /* ---------- Hub (lobby estilo cliente de póker) ---------- */
  function renderLobbyRow(p) {
    var pool = global.PTTournamentConfig.prizePool
      ? global.PTTournamentConfig.prizePool(p)
      : Math.round(p.buyInEur * p.entries * 100) / 100;
    var tone = lobbyTone(p);
    var badges = lobbyBadges(p).map(function (b) {
      return '<span class="trn-badge trn-badge-' + esc(b.k) + '">' + esc(b.t) + '</span>';
    }).join('');
    var bb = startingBb(p);
    var kindLabel = p.kind === 'sng' ? 'SNG' : 'MTT';

    return '<button type="button" class="trn-lobby-row" data-preset="' + esc(p.id) +
      '" data-kind="' + esc(p.kind) + '" data-tone="' + esc(tone) + '">' +
      '<div class="trn-lobby-thumb" aria-hidden="true">' +
      '<span class="trn-lobby-thumb-kind">' + esc(kindLabel) + '</span>' +
      '<span class="trn-lobby-thumb-deco">♠</span>' +
      '<span class="trn-lobby-status">Entra ya</span>' +
      '</div>' +
      '<div class="trn-lobby-main">' +
      '<div class="trn-lobby-title-row">' +
      '<span class="trn-lobby-title">' + esc(p.name) + '</span>' +
      '<span class="trn-lobby-badges">' + badges + '</span>' +
      '</div>' +
      '<div class="trn-lobby-subline">NLHE · Stack ' + p.startingStack +
      ' (' + bb + ' bb) · ' + p.placesPaid + ' paid</div>' +
      '<div class="trn-lobby-stats">' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Entrada</span>' +
      '<span class="trn-stat-val">' + esc(fmtEur(p.buyInEur)) + '</span></div>' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Jugadores</span>' +
      '<span class="trn-stat-val">' + p.entries + '</span></div>' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Premio</span>' +
      '<span class="trn-stat-val trn-stat-prize">' + esc(fmtEur(pool)) + '</span></div>' +
      '</div></div>' +
      '<div class="trn-lobby-desk" aria-hidden="true">' +
      '<span class="trn-desk-start"><strong>Ahora</strong><small>al instante</small></span>' +
      '<span class="trn-desk-name">' + esc(p.name) + '<small>' + badges + '</small></span>' +
      '<span class="trn-desk-game">NLHE</span>' +
      '<span class="trn-desk-players">' + p.entries + '</span>' +
      '<span class="trn-desk-buyin">' + esc(fmtEur(p.buyInEur)) + '</span>' +
      '<span class="trn-desk-prize">' + esc(fmtEur(pool)) + '</span>' +
      '</div></button>';
  }

  function renderHub() {
    var presets = global.PTTournamentConfig.listPresets();
    var filter = ui.lobbyFilter || 'all';
    var filtered = presets.filter(function (p) {
      if (filter === 'mtt') return p.kind === 'mtt';
      if (filter === 'sng') return p.kind === 'sng';
      return true;
    });
    var hist = (global.PTTournamentStore.list() || []).slice(0, 5);
    var rows = filtered.map(renderLobbyRow).join('');
    if (!rows) {
      rows = '<p class="trn-lobby-empty muted">No hay torneos en este filtro.</p>';
    }

    var histHtml = hist.length
      ? hist.map(function (h) {
        return '<li><strong>' + esc(h.name) + '</strong> · ' +
          (h.place != null ? (h.place + 'º') : '—') +
          ' · ' + esc(fmtEur(h.prizeEur || 0)) +
          ' · ROI ' + (h.roi || 0) + '%</li>';
      }).join('')
      : '<li class="muted">Sin torneos guardados</li>';

    function filterBtn(id, label) {
      return '<button type="button" class="trn-filter' + (filter === id ? ' is-on' : '') +
        '" data-lobby-filter="' + id + '">' + label + '</button>';
    }

    return '<div class="trn-hub trn-lobby">' +
      '<header class="trn-lobby-hero">' +
      '<div class="trn-lobby-hero-bg" aria-hidden="true"></div>' +
      '<div class="trn-lobby-hero-copy">' +
      '<p class="trn-lobby-eyebrow">Lobby · rivales IA</p>' +
      '<h2>TORNEOS</h2>' +
      '<p class="trn-lobby-tagline">Lista estilo cliente de póker: elige un evento, entra a la mesa y caza arquetipos para XP.</p>' +
      '</div>' +
      '<div class="trn-lobby-hero-actions">' +
      '<button type="button" class="btn btn-primary" data-act="custom">Personalizado</button>' +
      '<button type="button" class="btn" data-act="history">Histórico</button>' +
      '</div></header>' +
      '<div class="trn-lobby-toolbar">' +
      '<div class="trn-lobby-filters" role="tablist" aria-label="Filtro de torneos">' +
      filterBtn('all', 'Todos') +
      filterBtn('mtt', 'MTT') +
      filterBtn('sng', 'SNG') +
      '</div>' +
      '<p class="trn-lobby-count">' + filtered.length +
      ' torneo' + (filtered.length === 1 ? '' : 's') + '</p></div>' +
      '<div class="trn-lobby-headrow" aria-hidden="true">' +
      '<span>Comienzo</span><span>Nombre</span><span>Juego</span>' +
      '<span>Jug.</span><span>Buy-in</span><span>Premio</span></div>' +
      '<div class="trn-lobby-list">' + rows + '</div>' +
      '<section class="trn-lobby-recent">' +
      '<h3>Recientes</h3><ul class="trn-hist-list">' + histHtml + '</ul>' +
      '</section></div>';
  }

  /* ---------- Setup ---------- */
  function defaultDraft() {
    return global.PTTournamentConfig.normalize({
      name: 'Torneo personalizado',
      kind: 'mtt',
      entries: 18,
      seatsPerTable: 6,
      buyInEur: 5,
      startingStack: 1500,
      placesPaid: 3,
      payoutLadder: 'standard',
      onBust: 'ask',
      exploitProPct: 0.1,
      roleWeights: { fish: 20, nit: 15, tag: 30, lag: 20, maniac: 5, pro: 10 }
    });
  }

  function renderSetup() {
    var d = ui.setupDraft || defaultDraft();
    ui.setupDraft = d;
    var w = d.roleWeights || {};
    function wInput(id, label) {
      return '<label class="trn-field trn-field-sm">' + esc(label) +
        '<input type="number" min="0" max="100" data-w="' + id + '" value="' + (w[id] || 0) + '"></label>';
    }
    return '<div class="trn-setup panel">' +
      '<h2>Configurar torneo</h2>' +
      '<div class="trn-form">' +
      '<label class="trn-field">Nombre<input type="text" data-f="name" value="' + esc(d.name) + '" maxlength="80"></label>' +
      '<label class="trn-field">Tipo<select data-f="kind">' +
      '<option value="mtt"' + (d.kind === 'mtt' ? ' selected' : '') + '>MTT</option>' +
      '<option value="sng"' + (d.kind === 'sng' ? ' selected' : '') + '>SNG</option></select></label>' +
      '<label class="trn-field">Jugadores<input type="number" data-f="entries" min="2" max="90" value="' + d.entries + '"></label>' +
      '<label class="trn-field">Asientos/mesa<select data-f="seatsPerTable">' +
      '<option value="6"' + (d.seatsPerTable === 6 ? ' selected' : '') + '>6</option>' +
      '<option value="9"' + (d.seatsPerTable === 9 ? ' selected' : '') + '>9</option></select></label>' +
      '<label class="trn-field">Buy-in €<input type="number" data-f="buyInEur" min="0.01" step="0.01" value="' + d.buyInEur + '"></label>' +
      '<label class="trn-field">Stack inicial<input type="number" data-f="startingStack" min="100" value="' + d.startingStack + '"></label>' +
      '<label class="trn-field">Puestos pagados<input type="number" data-f="placesPaid" min="1" value="' + d.placesPaid + '"></label>' +
      '<label class="trn-field">Ladder<select data-f="payoutLadder">' +
      ['standard', 'flat', 'topheavy'].map(function (x) {
        return '<option value="' + x + '"' + (d.payoutLadder === x ? ' selected' : '') + '>' + x + '</option>';
      }).join('') + '</select></label>' +
      '<label class="trn-field">Al bust<select data-f="onBust">' +
      '<option value="ask"' + (d.onBust === 'ask' ? ' selected' : '') + '>Preguntar</option>' +
      '<option value="simulate"' + (d.onBust === 'simulate' ? ' selected' : '') + '>Simular resto</option>' +
      '<option value="end"' + (d.onBust === 'end' ? ' selected' : '') + '>Finalizar</option></select></label>' +
      '<label class="trn-field">% Pros exploit<input type="number" data-f="exploitProPct" min="0" max="1" step="0.05" value="' + d.exploitProPct + '"></label>' +
      '</div>' +
      '<h3>Pesos de roles</h3><div class="trn-weights">' +
      wInput('fish', 'Fish') + wInput('nit', 'Nit') + wInput('tag', 'TAG') +
      wInput('lag', 'LAG') + wInput('maniac', 'Maníaco') + wInput('pro', 'Pro') +
      '</div>' +
      '<div class="trn-setup-actions">' +
      '<button type="button" class="btn" data-act="hub">Cancelar</button>' +
      '<button type="button" class="btn btn-primary" data-act="start-custom">Empezar</button>' +
      '</div></div>';
  }

  function readSetupForm(root) {
    var d = ui.setupDraft || defaultDraft();
    root.querySelectorAll('[data-f]').forEach(function (el) {
      var k = el.getAttribute('data-f');
      var v = el.value;
      if (k === 'entries' || k === 'seatsPerTable' || k === 'startingStack' || k === 'placesPaid') {
        d[k] = Number(v);
      } else if (k === 'buyInEur' || k === 'exploitProPct') {
        d[k] = Number(v);
      } else {
        d[k] = v;
      }
    });
    d.roleWeights = d.roleWeights || {};
    root.querySelectorAll('[data-w]').forEach(function (el) {
      d.roleWeights[el.getAttribute('data-w')] = Number(el.value) || 0;
    });
    ui.setupDraft = global.PTTournamentConfig.normalize(d);
    return ui.setupDraft;
  }

  /* ---------- Table (layout = entrenador) ---------- */
  var SEAT_COORDS_6 = [
    { top: 96, left: 50 },
    { top: 80, left: 8 },
    { top: 30, left: 6 },
    { top: 4, left: 38 },
    { top: 4, left: 70 },
    { top: 80, left: 92 }
  ];
  var SEAT_COORDS_3 = [
    { top: 96, left: 50 },
    { top: 18, left: 14 },
    { top: 18, left: 86 }
  ];
  var SEAT_COORDS_9 = [
    { top: 96, left: 50 },
    { top: 84, left: 16 },
    { top: 58, left: 3 },
    { top: 28, left: 8 },
    { top: 8, left: 34 },
    { top: 8, left: 66 },
    { top: 28, left: 92 },
    { top: 58, left: 97 },
    { top: 84, left: 84 }
  ];
  var SEAT_COORDS_MOBILE_6 = [
    { top: 94, left: 50 },
    { top: 70, left: 3 },
    { top: 32, left: 2 },
    { top: 5, left: 22 },
    { top: 5, left: 78 },
    { top: 32, left: 98 }
  ];
  var SEAT_COORDS_MOBILE_3 = [
    { top: 94, left: 50 },
    { top: 16, left: 10 },
    { top: 16, left: 90 }
  ];
  var SEAT_COORDS_MOBILE_9 = [
    { top: 93, left: 50 },
    { top: 80, left: 14 },
    { top: 57, left: 2 },
    { top: 30, left: 7 },
    { top: 10, left: 32 },
    { top: 10, left: 68 },
    { top: 30, left: 93 },
    { top: 57, left: 98 },
    { top: 80, left: 86 }
  ];

  function isMobileLayout() {
    try { return window.matchMedia && window.matchMedia('(max-width: 680px)').matches; }
    catch (e) { return false; }
  }

  function seatCoordsFor(n) {
    var mobile = isMobileLayout();
    if (n <= 3) return mobile ? SEAT_COORDS_MOBILE_3 : SEAT_COORDS_3;
    if (n >= 8) return mobile ? SEAT_COORDS_MOBILE_9 : SEAT_COORDS_9;
    return mobile ? SEAT_COORDS_MOBILE_6 : SEAT_COORDS_6;
  }

  function faceCard(c) {
    var code = typeof c === 'string' ? c : (c && (c.code || (c.r != null && c.s ? String(c.r) + c.s : ''))) || '';
    if (!code) return backCard();
    if (global.Cards && global.Cards.cardFaceHTML) return global.Cards.cardFaceHTML(code);
    return cardHtml(code);
  }

  function backCard() {
    if (global.Cards && global.Cards.cardBackHTML) return global.Cards.cardBackHTML();
    return '<span class="card card-back"></span>';
  }

  function fmtBb(chips, bb) {
    bb = Number(bb) || 1;
    var v = Math.round((Number(chips) || 0) / bb * 10) / 10;
    return (v % 1 ? v.toFixed(1) : String(v)) + ' bb';
  }

  function lastLogAct(hand, playerId) {
    if (!hand || !hand.log || !hand.log.length) return null;
    for (var i = hand.log.length - 1; i >= 0; i--) {
      if (hand.log[i].id === playerId && hand.log[i].street === hand.street) return hand.log[i];
    }
    return null;
  }

  function actBadgeClass(action) {
    var a = String(action || '').toLowerCase();
    if (a === 'fold') return 'fold';
    if (a === 'check') return 'check';
    if (a === 'call') return 'act-call';
    if (a === 'allin' || a === 'all-in') return 'act-allin';
    if (a === 'bet' || a === 'raise') return 'bet';
    return '';
  }

  function betPlacement(c) {
    if (c.top < 20) return 'bet-below';
    if (c.top > 70) return 'bet-above';
    if (c.left < 25) return 'bet-right';
    if (c.left > 75) return 'bet-left';
    return 'bet-below';
  }

  function rotateHeroFirst(seats) {
    var list = seats.slice();
    var hi = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].isHero) { hi = i; break; }
    }
    return list.slice(hi).concat(list.slice(0, hi));
  }

  function renderTrainerSeats(hand, state, bb) {
    if (!hand || !hand.seats || !hand.seats.length) return '';
    var ring = rotateHeroFirst(hand.seats);
    var coords = seatCoordsFor(ring.length);
    var showdown = hand.stage === 'complete';
    var html = '';
    ring.forEach(function (s, i) {
      if (s.isHero) return; // héroe va en .hero-area (CSS .seat.hero { display:none })
      var c = coords[Math.min(i, coords.length - 1)] || coords[0];
      var guessed = state.heroGuesses && state.heroGuesses[s.id];
      var cls = ['seat', 'villain'];
      if (s.folded) cls.push('folded');
      if (c.top < 20) cls.push('seat-top');
      if (c.top > 70) cls.push('seat-bottom');
      if (c.left < 22) cls.push('seat-edge-left');
      else if (c.left > 78) cls.push('seat-edge-right');
      if (guessed) cls.push('has-guess');

      var last = lastLogAct(hand, s.id);
      var actHtml = '';
      if (last && last.action !== 'fold') {
        var actCls = actBadgeClass(last.action);
        var actTxt = last.action + (last.amount ? (' ' + fmtBb(last.amount, bb)) : '');
        actHtml = '<div class="seat-act-wrap"><span class="seat-act ' + actCls + '">' + esc(actTxt) + '</span></div>';
      } else if (s.folded) {
        actHtml = '<div class="seat-act-wrap"><span class="seat-act fold">Fold</span></div>';
      }

      var cardsHtml = '';
      if (s.folded) {
        cardsHtml = '<div class="seat-cards seat-fold-mark">✕</div>';
      } else if (showdown && s.cards && s.cards[0]) {
        cardsHtml = '<div class="seat-cards showdown">' + s.cards.map(faceCard).join('') + '</div>';
      } else if (!s.folded) {
        cardsHtml = '<div class="seat-cards">' + backCard() + backCard() + '</div>';
      }

      var streetBet = Number(s.streetInvested) || 0;
      var betHtml = streetBet > 0
        ? '<div class="seat-bet ' + betPlacement(c) + '"><span class="seat-bet-amt">' + esc(fmtBb(streetBet, bb)) + '</span></div>'
        : '';

      html += '<button type="button" class="' + cls.join(' ') + '" style="top:' + c.top + '%;left:' + c.left +
        '%" data-player="' + esc(s.id) + '" title="Adivinar rol">' +
        '<div class="seat-body">' +
        '<div class="seat-hole">' + actHtml + cardsHtml + '</div>' +
        '<div class="seat-pos">' + esc(s.pos || '') + '</div>' +
        '<div class="seat-role">' + esc(s.name || 'Villano') + (guessed ? ' · ?' : '') + '</div>' +
        '<div class="seat-stack">' + esc(fmtBb(s.stack, bb)) + '</div>' +
        '</div>' + betHtml +
        '</button>';
    });
    return html;
  }

  function renderHeroArea(hand, bb) {
    if (!hand) {
      return '<div class="hero-area">' +
        '<div class="hero-label"><span class="hero-avatar" aria-hidden="true"></span>HÉROE</div>' +
        '<div class="hero-cards"></div></div>';
    }
    var hero = null;
    for (var i = 0; i < hand.seats.length; i++) {
      if (hand.seats[i].isHero) { hero = hand.seats[i]; break; }
    }
    if (!hero) return '';
    var cards = (hero.cards && hero.cards[0])
      ? hero.cards.map(faceCard).join('')
      : (backCard() + backCard());
    var last = lastLogAct(hand, hero.id);
    var act = last && last.action !== 'fold'
      ? '<div class="action-badge-wrap"><span class="seat-act ' + actBadgeClass(last.action) + '">' +
        esc(last.action + (last.amount ? (' ' + fmtBb(last.amount, bb)) : '')) + '</span></div>'
      : '';
    return '<div class="hero-area">' +
      act +
      '<div class="hero-chips"><div class="seat-stack">' + esc(fmtBb(hero.stack, bb)) + '</div></div>' +
      '<div class="hero-label"><span class="hero-avatar" aria-hidden="true"></span>HÉROE · <span>' +
      esc(hero.pos || '-') + '</span></div>' +
      '<div class="hero-cards">' + cards + '</div>' +
      '</div>';
  }

  function actionBtnClass(id) {
    if (id === 'fold') return 'btn btn-fold';
    if (id === 'check') return 'btn btn-check';
    if (id === 'call') return 'btn btn-call';
    if (id === 'bet' || id === 'raise') return 'btn btn-raise';
    if (id === 'allin') return 'btn btn-allin';
    return 'btn btn-primary';
  }

  function renderTable() {
    var state = ui.state;
    if (!state) return '<p>Sin torneo activo.</p>';
    var hand = state._liveHand;
    var St = global.PTTournamentState;
    var Seat = global.PTTournamentSeating;
    var Hud = global.PTTournamentHud;
    var blinds = Hud.currentBlinds(state);
    var bb = hand ? hand.bb : (blinds.bb || 20);
    var kind = (state.config && state.config.kind) || 'mtt';
    var formatLabel = kind === 'sng' ? 'SNG' : 'MTT';

    var chips = Hud.compactChips(state).map(function (c) {
      return '<span class="' + esc(c.cls) + '" title="' + esc(c.title) + '">' + esc(c.text) + '</span>';
    }).join('');

    var potBb = hand ? fmtBb(hand.pot, bb) : '0 bb';
    var boardHtml = (hand && hand.board && hand.board.length)
      ? hand.board.map(faceCard).join('')
      : '';

    var nSeats = hand && hand.seats ? hand.seats.length
      : (state.config && state.config.seatsPerTable) || 6;
    var tableClass = nSeats <= 3 ? 'table-3max' : (nSeats >= 8 ? 'table-9max' : 'table-6max');

    var seatsHtml = hand
      ? renderTrainerSeats(hand, state, bb)
      : '';

    // Sin mano activa: asientos desde seating del torneo (stacks persistentes)
    if (!hand && state.status === 'running') {
      var tableId = (state.tables.find(function (t) { return t.isHeroTable; }) || {}).id;
      var onTable = tableId ? Seat.playersOnTable(state, tableId) : [];
      var fake = onTable.map(function (p, i) {
        return {
          id: p.id,
          name: p.name,
          isHero: !!p.isHero,
          pos: p.isHero ? 'H' : ('S' + i),
          stack: p.stack,
          streetInvested: 0,
          folded: false,
          cards: null
        };
      });
      seatsHtml = renderTrainerSeats({ seats: fake, stage: 'waiting', street: 'preflop', log: [] }, state, bb);
    }

    var actions = '';
    if (state.status === 'busted_pending' || ui.bustPrompt) {
      actions = '<div class="trn-bust-prompt">' +
        '<p>Has sido eliminado. ¿Qué quieres hacer?</p>' +
        '<button type="button" class="btn btn-primary" data-act="sim-rest">Simular resto</button>' +
        '<button type="button" class="btn" data-act="end-now">Finalizar ya</button>' +
        '</div>';
    } else if (hand && hand.stage === 'complete') {
      actions = '<div class="actions actions-grid actions-grid-1">' +
        '<button type="button" class="btn btn-primary" data-act="next-hand">Siguiente mano</button></div>';
    } else if (hand && hand.awaitingHero && hand.heroOptions && hand.heroOptions.length) {
      var nBtn = hand.heroOptions.length;
      var grid = nBtn <= 2 ? 'actions-grid-2' : (nBtn === 3 ? 'actions-grid-3' : 'actions-grid');
      actions = '<div class="actions actions-grid ' + grid + '">' + hand.heroOptions.map(function (o) {
        var amt = o.suggested != null ? o.suggested : (o.amount != null ? o.amount : '');
        return '<button type="button" class="' + actionBtnClass(o.id) +
          '" data-hero-act="' + esc(o.id) + '" data-amount="' + amt + '">' +
          esc(o.label) + '</button>';
      }).join('') + '</div>';
    } else if (!hand && state.status === 'running') {
      actions = '<div class="actions actions-grid actions-grid-1">' +
        '<button type="button" class="btn btn-primary" data-act="next-hand">Repartir</button></div>';
    }

    var infoModal = '';
    if (ui.infoOpen) {
      var rows = Hud.infoRows(state).map(function (r) {
        return '<div class="trn-info-row"><dt>' + esc(r.label) + '</dt><dd>' + esc(r.value) + '</dd></div>';
      }).join('');
      infoModal = '<div class="trn-modal-backdrop" data-act="close-info">' +
        '<div class="trn-modal" role="dialog">' +
        '<h3>Info del torneo</h3>' +
        '<dl class="trn-info-dl">' + rows + '</dl>' +
        '<button type="button" class="btn" data-act="close-info">Cerrar</button>' +
        '</div></div>';
    }

    var roleModal = '';
    if (ui.roleModalPlayerId) {
      var pid = ui.roleModalPlayerId;
      var pl = state.players.find(function (p) { return p.id === pid; });
      var cur = (state.heroGuesses && state.heroGuesses[pid]) || '';
      var opts = (global.PTTournamentConfig.ROLE_IDS || []).map(function (rid) {
        return '<button type="button" class="trn-role-opt' + (cur === rid ? ' is-selected' : '') +
          '" data-guess-role="' + rid + '" data-guess-player="' + esc(pid) + '">' +
          esc(roleLabel(rid)) + '</button>';
      }).join('');
      roleModal = '<div class="trn-modal-backdrop" data-act="close-role">' +
        '<div class="trn-modal" role="dialog">' +
        '<h3>Rol de ' + esc(pl && pl.name) + '</h3>' +
        '<p class="muted">Tu hipótesis (se revela al final)</p>' +
        '<div class="trn-role-grid">' + opts + '</div>' +
        '<button type="button" class="btn" data-act="clear-guess" data-guess-player="' + esc(pid) + '">Quitar guess</button> ' +
        '<button type="button" class="btn" data-act="close-role">Cerrar</button>' +
        '</div></div>';
    }

    var streetLabel = hand ? String(hand.street || '').toUpperCase() : '';
    var heroAlive = St.hero(state);

    return '<div class="trn-table-view trn-play-like">' +
      '<div class="trn-table-hud">' + chips +
      '<button type="button" class="btn btn-sm trn-info-btn" data-act="info">Info</button>' +
      '<button type="button" class="btn btn-sm" data-act="hub">Salir</button>' +
      '</div>' +
      '<div class="poker-table trn-poker-table">' +
      '<div class="table-felt ' + tableClass + '" data-theme="emerald" data-format="' +
      (kind === 'sng' ? 'spin' : 'mtt') + '">' +
      '<div class="table-train-chrome">' +
      '<div class="table-format-badge">' + esc(formatLabel) + '</div>' +
      '<div class="table-train-hud">' +
      '<span class="table-train-chip">' + esc(streetLabel || 'LISTO') + '</span>' +
      (blinds && blinds.sb != null
        ? ('<span class="table-train-chip">' + blinds.sb + '/' + blinds.bb + '</span>')
        : '') +
      (heroAlive
        ? ('<span class="table-train-chip is-phase">Héroe ' + esc(fmtBb(heroAlive.stack, bb)) + '</span>')
        : '') +
      '</div></div>' +
      '<div class="table-watermark" aria-hidden="true">' +
      '<span class="table-watermark-mark"></span>' +
      '<span class="table-watermark-text">PokerForgeAI</span>' +
      '<span class="table-watermark-sub">Modo torneo</span>' +
      '</div>' +
      '<div class="seats">' + seatsHtml + '</div>' +
      '<div class="board-area">' +
      '<div class="pot">Bote: <strong class="pot-amt">' + esc(potBb) + '</strong></div>' +
      '<div class="board">' + boardHtml + '</div>' +
      '</div>' +
      renderHeroArea(hand, bb) +
      '</div></div>' +
      actions + infoModal + roleModal +
      '</div>';
  }

  /* ---------- Result ---------- */
  function renderResult() {
    var state = ui.state;
    if (!state || !state.result) {
      return '<div class="trn-result"><p>Sin resultado.</p>' +
        '<button type="button" class="btn" data-act="hub">Volver</button></div>';
    }
    var r = state.result;
    var rs = r.roleScore || {};
    var details = (rs.details || []).map(function (d) {
      return '<li class="' + (d.ok ? 'ok' : 'bad') + '">' +
        esc(d.name) + ' · real <strong>' + esc(roleLabel(d.actual)) + '</strong> · guess ' +
        esc(roleLabel(d.guess)) + (d.ok ? ' ✓' : ' ✗') + '</li>';
    }).join('') || '<li class="muted">Sin guesses</li>';

    return '<div class="trn-result panel">' +
      '<h2>Resultado</h2>' +
      '<p class="trn-result-place">' + (r.place != null ? (r.place + 'º') : '—') +
      ' · Premio €' + (r.prizeEur || 0) + '</p>' +
      '<p>Roles: ' + (rs.correct || 0) + '/' + (rs.total || 0) +
      ' (' + (rs.accuracy || 0) + '%) · +' + (r.xpGained || 0) + ' XP</p>' +
      '<ul class="trn-role-reveal">' + details + '</ul>' +
      '<div class="trn-setup-actions">' +
      '<button type="button" class="btn btn-primary" data-act="hub">Hub</button>' +
      '<button type="button" class="btn" data-act="history">Histórico</button>' +
      '</div></div>';
  }

  /* ---------- History ---------- */
  function renderHistory() {
    var list = global.PTTournamentStore.list() || [];
    var rows = list.length
      ? list.map(function (h) {
        return '<tr>' +
          '<td>' + esc(h.name) + '</td>' +
          '<td>' + esc((h.kind || '').toUpperCase()) + '</td>' +
          '<td>' + (h.place != null ? h.place : '—') + '/' + h.entries + '</td>' +
          '<td>€' + (h.prizeEur || 0) + '</td>' +
          '<td>' + (h.roi || 0) + '%</td>' +
          '<td>' + (h.roleAccuracy || 0) + '%</td>' +
          '<td><button type="button" class="btn btn-sm" data-act="remove-hist" data-id="' + esc(h.id) + '">×</button></td>' +
          '</tr>';
      }).join('')
      : '<tr><td colspan="7" class="muted">Vacío</td></tr>';
    return '<div class="trn-history panel">' +
      '<h2>Histórico</h2>' +
      '<div class="trn-setup-actions">' +
      '<button type="button" class="btn" data-act="hub">Volver</button>' +
      '<button type="button" class="btn" data-act="clear-hist">Vaciar</button>' +
      '</div>' +
      '<div class="trn-hist-table-wrap"><table class="trn-hist-table"><thead><tr>' +
      '<th>Torneo</th><th>Tipo</th><th>Puesto</th><th>Premio</th><th>ROI</th><th>Roles</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  function paint() {
    if (!ui.root) return;
    var html = '';
    try {
      if (ui.view === VIEW.setup) html = renderSetup();
      else if (ui.view === VIEW.table) html = renderTable();
      else if (ui.view === VIEW.result) html = renderResult();
      else if (ui.view === VIEW.history) html = renderHistory();
      else html = renderHub();
    } catch (err) {
      console.error('[PTTournamentsUI] paint', err);
      ui.root.innerHTML =
        '<div class="trn-hub"><p class="muted">Error al pintar Torneos.</p>' +
        '<button type="button" class="btn" data-act="hub">Volver al hub</button></div>';
      try { bind(ui.root); } catch (e2) { /* noop */ }
      return;
    }
    ui.root.innerHTML = html;
    bind(ui.root);
  }

  function afterAction() {
    var state = ui.state;
    if (!state) { paint(); return; }
    if (state.status === 'finished') {
      setView(VIEW.result);
      return;
    }
    if (state.status === 'busted_pending') {
      ui.bustPrompt = true;
    }
    paint();
  }

  function bind(root) {
    root.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        startPreset(btn.getAttribute('data-preset'));
      });
    });

    root.querySelectorAll('[data-lobby-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.lobbyFilter = btn.getAttribute('data-lobby-filter') || 'all';
        paint();
      });
    });

    root.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        var act = btn.getAttribute('data-act');
        if (act === 'close-info' || act === 'close-role') {
          if (ev.target === btn || btn.classList.contains('trn-modal')) {
            /* allow */
          }
        }
        if (act === 'custom') {
          ui.setupDraft = defaultDraft();
          setView(VIEW.setup);
        } else if (act === 'hub') {
          ui.state = null;
          setView(VIEW.hub);
        } else if (act === 'history') {
          setView(VIEW.history);
        } else if (act === 'start-custom') {
          var cfg = readSetupForm(root);
          startFromConfig(cfg, {});
        } else if (act === 'info') {
          ui.infoOpen = true;
          paint();
        } else if (act === 'close-info') {
          ui.infoOpen = false;
          paint();
        } else if (act === 'close-role') {
          ui.roleModalPlayerId = null;
          paint();
        } else if (act === 'clear-guess') {
          global.PTTournamentRoleGuess.clearGuess(ui.state, btn.getAttribute('data-guess-player'));
          ui.roleModalPlayerId = null;
          paint();
        } else if (act === 'next-hand') {
          if (ui.state && ui.state.status === 'running') {
            global.PTTournamentRunner.beginHand(ui.state);
          }
          afterAction();
        } else if (act === 'sim-rest') {
          global.PTTournamentRunner.simulateRest(ui.state);
          afterAction();
        } else if (act === 'end-now') {
          global.PTTournamentRunner.finish(ui.state, { reason: 'bust' });
          afterAction();
        } else if (act === 'clear-hist') {
          global.PTTournamentStore.clear();
          paint();
        } else if (act === 'remove-hist') {
          global.PTTournamentStore.remove(btn.getAttribute('data-id'));
          paint();
        }
      });
    });

    root.querySelectorAll('[data-hero-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-hero-act');
        var amtRaw = btn.getAttribute('data-amount');
        var amt = amtRaw === '' || amtRaw == null ? null : Number(amtRaw);
        global.PTTournamentRunner.heroAct(ui.state, id, amt);
        afterAction();
      });
    });

    root.querySelectorAll('.trn-play-like .seat.villain[data-player]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.roleModalPlayerId = btn.getAttribute('data-player');
        paint();
      });
    });

    root.querySelectorAll('[data-guess-role]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        global.PTTournamentRoleGuess.setGuess(
          ui.state,
          btn.getAttribute('data-guess-player'),
          btn.getAttribute('data-guess-role')
        );
        ui.roleModalPlayerId = null;
        paint();
      });
    });

    if (ui.view === VIEW.setup) {
      root.querySelectorAll('[data-f], [data-w]').forEach(function (el) {
        el.addEventListener('change', function () { readSetupForm(root); });
      });
    }
  }

  function render(rootEl) {
    ui.root = rootEl;
    if (!ui.view) ui.view = VIEW.hub;
    paint();
  }

  global.PTTournamentsUI = {
    render: render,
    setView: setView,
    VIEW: VIEW,
    getState: function () { return ui.state; }
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
