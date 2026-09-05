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

  /* ---------- Table ---------- */
  function seatAngles(n) {
    var out = [];
    // Hero abajo (270° en CSS: bottom center). Distribuir resto.
    for (var i = 0; i < n; i++) {
      var ang = -90 + (360 * i) / n;
      out.push(ang);
    }
    return out;
  }

  function renderTable() {
    var state = ui.state;
    if (!state) return '<p>Sin torneo activo.</p>';
    var hand = state._liveHand;
    var St = global.PTTournamentState;
    var Seat = global.PTTournamentSeating;
    var Hud = global.PTTournamentHud;
    var hero = St.hero(state);
    var chips = Hud.compactChips(state).map(function (c) {
      return '<span class="' + esc(c.cls) + '" title="' + esc(c.title) + '">' + esc(c.text) + '</span>';
    }).join('');

    var tableId = (state.tables.find(function (t) { return t.isHeroTable; }) || {}).id;
    var onTable = tableId ? Seat.playersOnTable(state, tableId) : [];
    var ordered = hand
      ? hand.seats.map(function (s) {
        return {
          player: state.players.find(function (p) { return p.id === s.id; }) || s,
          pos: s.pos,
          seat: s
        };
      })
      : onTable.map(function (p, i) { return { player: p, pos: 'S' + i, seat: null }; });

    var n = ordered.length || 1;
    var angles = seatAngles(n);
    var seatsHtml = ordered.map(function (o, i) {
      var p = o.player;
      var s = o.seat;
      var ang = angles[i];
      var rad = (ang * Math.PI) / 180;
      var x = 50 + Math.cos(rad) * 42;
      var y = 50 + Math.sin(rad) * 38;
      var isHero = !!(p && p.isHero);
      var stack = s ? s.stack : (p && p.stack);
      var bb = hand ? hand.bb : (Hud.currentBlinds(state).bb || 20);
      var stackBb = Math.round((Number(stack) || 0) / bb * 10) / 10;
      var folded = s && s.folded;
      var guessed = state.heroGuesses && state.heroGuesses[p.id];
      var cards = '';
      if (isHero && s && s.cards) {
        cards = '<div class="trn-seat-cards">' + s.cards.map(cardHtml).join('') + '</div>';
      } else if (s && !s.folded && hand && hand.stage === 'complete' && hand.result && hand.result.holeCards && hand.result.holeCards[p.id]) {
        cards = '<div class="trn-seat-cards">' + hand.result.holeCards[p.id].map(cardHtml).join('') + '</div>';
      }
      var lastAct = '';
      if (hand && hand.log && hand.log.length) {
        for (var li = hand.log.length - 1; li >= 0; li--) {
          if (hand.log[li].id === p.id) {
            lastAct = hand.log[li].action + (hand.log[li].amount ? ' ' + hand.log[li].amount : '');
            break;
          }
        }
      }
      return '<button type="button" class="trn-seat' + (isHero ? ' is-hero' : ' is-villain') +
        (folded ? ' is-folded' : '') + (guessed ? ' has-guess' : '') +
        '" style="left:' + x + '%;top:' + y + '%" data-player="' + esc(p.id) + '"' +
        (isHero ? ' disabled' : '') + '>' +
        '<div class="trn-seat-name">' + esc(p.name || (isHero ? 'Héroe' : 'Villano')) + '</div>' +
        '<div class="trn-seat-meta">' + esc(o.pos) + ' · ' + stackBb + ' bb</div>' +
        (lastAct ? '<div class="trn-seat-act">' + esc(lastAct) + '</div>' : '') +
        cards +
        '</button>';
    }).join('');

    var board = (hand && hand.board) ? hand.board.map(cardHtml).join('') : '';
    var pot = hand ? hand.pot : 0;

    var actions = '';
    if (state.status === 'busted_pending' || ui.bustPrompt) {
      actions = '<div class="trn-bust-prompt">' +
        '<p>Has sido eliminado. ¿Qué quieres hacer?</p>' +
        '<button type="button" class="btn btn-primary" data-act="sim-rest">Simular resto</button>' +
        '<button type="button" class="btn" data-act="end-now">Finalizar ya</button>' +
        '</div>';
    } else if (hand && hand.stage === 'complete') {
      actions = '<button type="button" class="btn btn-primary" data-act="next-hand">Siguiente mano</button>';
    } else if (hand && hand.awaitingHero && hand.heroOptions) {
      actions = '<div class="trn-actions">' + hand.heroOptions.map(function (o) {
        return '<button type="button" class="btn' + (o.id === 'fold' ? '' : ' btn-primary') +
          '" data-hero-act="' + esc(o.id) + '" data-amount="' + (o.suggested != null ? o.suggested : (o.amount != null ? o.amount : '')) + '">' +
          esc(o.label) + '</button>';
      }).join('') + '</div>';
    } else if (!hand && state.status === 'running') {
      actions = '<button type="button" class="btn btn-primary" data-act="next-hand">Repartir</button>';
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

    return '<div class="trn-table-view">' +
      '<div class="trn-table-hud">' + chips +
      '<button type="button" class="btn btn-sm trn-info-btn" data-act="info">Info</button>' +
      '<button type="button" class="btn btn-sm" data-act="hub">Salir</button>' +
      '</div>' +
      '<div class="trn-felt-wrap">' +
      '<div class="trn-felt" data-format="' + esc((state.config && state.config.kind) || 'mtt') + '">' +
      '<div class="trn-felt-mark">MODO TORNEO</div>' +
      '<div class="trn-board">' + board + '</div>' +
      '<div class="trn-pot">Pot ' + pot + '</div>' +
      seatsHtml +
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

    root.querySelectorAll('.trn-seat.is-villain').forEach(function (btn) {
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
