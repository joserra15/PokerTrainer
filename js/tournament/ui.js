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
    infoHandlogOpen: false,
    roleModalPlayerId: null,
    bustPrompt: false,
    lobbyFilter: 'all',
    exitPrompt: false,
    resumePrompt: false,
    handDetailOpen: false,
    replayOpen: false,
    replayStep: 0,
    replayHandIndex: null,
    popupClearScheduled: { blind: false, ft: false, itm: false },
    anim: { frame: null, playing: false, skip: false, seq: 0, timer: null }
  };

  /* ---------- Revelado de la acción paso a paso (como en Entrenar) ---------- */
    function heroDisplayName(state) {
    try {
      var h = state && global.PTTournamentState && PTTournamentState.hero
        ? PTTournamentState.hero(state) : null;
      if (h && h.name && h.name !== 'Héroe' && h.name !== 'Hero') return h.name;
    } catch (e0) { /* */ }
    try {
      var u = global.PTAuth && PTAuth.getUser ? PTAuth.getUser() : (global.PT_AUTH_USER || null);
      if (u && u.name) {
        var n = String(u.name).trim().split(/\s+/)[0];
        if (n) return n;
      }
    } catch (e1) { /* */ }
    return 'Jugador';
  }

  function resolveHeroNameOpt() {
    try {
      var u = global.PTAuth && PTAuth.getUser ? PTAuth.getUser() : (global.PT_AUTH_USER || null);
      if (u && u.name) return String(u.name).trim().split(/\s+/)[0] || u.name;
    } catch (e) { /* */ }
    return 'Jugador';
  }

  function confettiPiecesHtml() {
    var shapes = ['rect', 'rect', 'strip', 'strip', 'dot', 'rect', 'strip', 'dot',
      'rect', 'strip', 'dot', 'rect', 'strip', 'rect', 'dot', 'strip',
      'rect', 'strip', 'dot', 'rect', 'strip', 'dot', 'rect', 'strip'];
    return shapes.map(function (sh, idx) {
      return '<i class="trn-confetti-piece is-' + sh + '" style="--i:' + idx + '"></i>';
    }).join('');
  }

  function toastPopupHtml(kind, title, sub, withConfetti) {
    return '<div class="trn-center-popup trn-popup-' + kind + '" data-popup="' + kind + '" role="status">' +
      (withConfetti ? '<div class="trn-confetti" aria-hidden="true">' + confettiPiecesHtml() + '</div>' : '') +
      '<div class="trn-center-popup-card">' +
      '<strong>' + title + '</strong>' +
      (sub ? ('<span>' + sub + '</span>') : '') +
      '</div></div>';
  }

  function schedulePopupClear(flag) {
    try {
      if (!ui.popupClearScheduled) ui.popupClearScheduled = {};
      if (ui.popupClearScheduled[flag]) return;
      ui.popupClearScheduled[flag] = true;
      setTimeout(function () {
        ui.popupClearScheduled[flag] = false;
        if (!ui.state) return;
        if (flag === 'blind') ui.state.blindUpPending = null;
        if (flag === 'ft') ui.state.finalTablePending = null;
        if (flag === 'itm') ui.state.itmPending = null;
        paint();
      }, 2000);
    } catch (e) { /* */ }
  }

function reducedMotion() {
    try {
      return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function frameDelay(f) {
    if (reducedMotion()) return 60;
    if (!f) return 0;
    if (f.kind === 'deal') return 420;
    /* Pausa para ver holes de all-in antes del runout de comunitarias. */
    if (f.kind === 'reveal') return 2000;
    if (f.kind === 'street') return 560;
    var a = String(f.action || '').toLowerCase();
    if (a === 'fold') return 300;
    if (a === 'check') return 380;
    if (a === 'call') return 420;
    return 500;
  }

  /** Mano "de presentación": el estado visible en el fotograma en curso. */
  function animHand(hand) {
    var f = ui.anim && ui.anim.frame;
    if (!hand || !f) return hand;
    var byId = {};
    (f.seats || []).forEach(function (s) { byId[s.id] = s; });
    var seats = (hand.seats || []).map(function (s) {
      var fs = byId[s.id];
      if (!fs) return s;
      return {
        id: s.id,
        name: s.name,
        isHero: s.isHero,
        roleId: s.roleId,
        pos: s.pos,
        seatIndex: s.seatIndex,
        cards: s.cards,
        startStack: s.startStack,
        stack: fs.stack,
        invested: fs.invested,
        streetInvested: fs.streetInvested,
        folded: fs.folded,
        allIn: fs.allIn,
        lastAction: fs.lastAction,
        _acting: f.actorId === s.id
      };
    });
    return {
      seats: seats,
      heroId: hand.heroId,
      sb: hand.sb,
      bb: hand.bb,
      ante: hand.ante,
      board: (f.board || []).slice(),
      street: f.street,
      pot: f.pot,
      currentBet: f.currentBet,
      log: hand.log,
      /* Mientras se anima no hay turno de héroe ni popup de fin de mano. */
      stage: 'playing',
      awaitingHero: false,
      heroOptions: null,
      result: null,
      holesRevealed: !!(f.holesRevealed || hand.holesRevealed || f.kind === 'reveal'),
      _anim: true
    };
  }

  function stopAnim() {
    if (ui.anim.timer && typeof clearTimeout === 'function') clearTimeout(ui.anim.timer);
    ui.anim.timer = null;
    ui.anim.frame = null;
    ui.anim.playing = false;
    ui.anim.skip = false;
    ui.anim.pending = null;
    ui.anim.seq += 1;
  }

  /** Saca los fotogramas pendientes del motor y deja el primero listo para pintar. */
  function takeFrames() {
    var hand = ui.state && ui.state._liveHand;
    var frames = (hand && hand._frames) ? hand._frames.slice() : [];
    if (hand) hand._frames = [];
    if (!frames.length || typeof setTimeout !== 'function') return null;
    ui.anim.seq += 1;
    ui.anim.skip = false;
    ui.anim.playing = true;
    ui.anim.frame = frames[0];
    return frames;
  }

  function playFrames(frames, onDone) {
    if (!frames || !frames.length) {
      stopAnim();
      if (onDone) onDone();
      return;
    }
    var seq = ui.anim.seq;
    var i = 0;
    ui.anim.pending = onDone || paint;
    function step() {
      if (seq !== ui.anim.seq) return;
      if (ui.anim.skip || i >= frames.length) {
        var done = ui.anim.pending || onDone || paint;
        stopAnim();
        done();
        return;
      }
      ui.anim.frame = frames[i];
      i += 1;
      paint();
      ui.anim.timer = setTimeout(step, frameDelay(ui.anim.frame));
    }
    step();
  }

  /** Anima los fotogramas pendientes (si hay) y luego ejecuta `done`. */
  function animateThen(done) {
    var frames = takeFrames();
    if (!frames) {
      stopAnim();
      done();
      return;
    }
    playFrames(frames, done);
  }

  function fmtKoins(n) {
    var Hud = global.PTTournamentHud;
    if (Hud && Hud.fmtKoins) return Hud.fmtKoins(n);
    var x = Number(n) || 0;
    var s = x.toLocaleString('es-ES', {
      minimumFractionDigits: (Math.round(x * 100) % 100) ? 2 : 0,
      maximumFractionDigits: 2
    });
    return s + ' Koins';
  }
  function fmtEur(n) { return fmtKoins(n); }

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

  function persistActive() {
    try {
      if (ui.state && ui.state.status !== 'finished' && global.PTTournamentStore.saveActive) {
        global.PTTournamentStore.saveActive(ui.state);
      }
    } catch (e) { /* ignore */ }
  }

  function clearActive() {
    try {
      if (global.PTTournamentStore.clearActive) global.PTTournamentStore.clearActive();
    } catch (e) { /* ignore */ }
  }

  function resumeActive() {
    var st = global.PTTournamentStore.loadActive && global.PTTournamentStore.loadActive();
    if (!st) return false;
    ui.state = st;
    ui.bustPrompt = st.status === 'busted_pending';
    ui.infoOpen = false;
    ui.infoHandlogOpen = false;
    ui.roleModalPlayerId = null;
    ui.exitPrompt = false;
    ui.resumePrompt = false;
    ui.handDetailOpen = false;
    stopAnim();
    setView(VIEW.table);
    return true;
  }

  function startFromConfig(cfg, opts) {
    opts = opts || {};
    if (!opts.keepActive) clearActive();
    opts.heroName = opts.heroName || resolveHeroNameOpt();
    var buyIn = 0;
    try {
      var cfgObj = typeof cfg === 'string'
        ? (global.PTTournamentConfig.fromPreset ? PTTournamentConfig.fromPreset(cfg) : null)
        : cfg;
      buyIn = Number(cfgObj && cfgObj.buyInEur) || 0;
    } catch (eCfg) { buyIn = 0; }
    try {
      var Wallet = global.PTTournamentWallet;
      if (Wallet) {
        if (!Wallet.canAfford(buyIn)) {
          alert('Saldo insuficiente de Koins (' + Wallet.getBalance() + '). Buy-in: ' + buyIn);
          return;
        }
        Wallet.debit(buyIn, { type: 'buyin' });
      }
    } catch (eW0) { /* */ }
    var Runner = global.PTTournamentRunner;
    ui.state = Runner.create(cfg, opts);
    ui.bustPrompt = false;
    ui.infoOpen = false;
    ui.infoHandlogOpen = false;
    ui.roleModalPlayerId = null;
    ui.exitPrompt = false;
    ui.resumePrompt = false;
    ui.handDetailOpen = false;
    stopAnim();
    Runner.beginHand(ui.state);
    persistActive();
    var frames = takeFrames();
    ui.view = VIEW.table;
    if (frames) playFrames(frames, paint);
    else paint();
  }

  function startPreset(id) {
    var active = global.PTTournamentStore.activeSummary && global.PTTournamentStore.activeSummary();
    if (active) {
      ui.resumePrompt = { presetId: id, active: active };
      paint();
      return;
    }
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

    var activeSum = global.PTTournamentStore.activeSummary && global.PTTournamentStore.activeSummary();
    var isActivePreset = !!(activeSum && (activeSum.presetId === p.id || activeSum.id === p.id));

    return '<button type="button" class="trn-lobby-row' + (isActivePreset ? ' is-active' : '') +
      '" data-preset="' + esc(p.id) +
      '" data-kind="' + esc(p.kind) + '" data-tone="' + esc(tone) + '">' +
      '<div class="trn-lobby-thumb" aria-hidden="true">' +
      '<span class="trn-lobby-thumb-kind">' + esc(kindLabel) + '</span>' +
      '<span class="trn-lobby-thumb-deco">♠</span>' +
      '<span class="trn-lobby-status">' + (isActivePreset ? 'En curso' : 'Gratis') + '</span>' +
      '</div>' +
      '<div class="trn-lobby-main">' +
      '<div class="trn-lobby-title-row">' +
      '<span class="trn-lobby-title">' + esc(p.name) + '</span>' +
      '<span class="trn-lobby-badges">' + badges + '</span>' +
      '</div>' +
      '<div class="trn-lobby-subline">NLHE · Stack ' + p.startingStack +
      ' (' + bb + ' bb) · ' + p.placesPaid + ' paid</div>' +
      '<div class="trn-lobby-stats">' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Entrada*</span>' +
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

    var active = global.PTTournamentStore.activeSummary && global.PTTournamentStore.activeSummary();
    var activeBanner = '';
    if (active) {
      activeBanner = '<div class="trn-active-banner" role="status">' +
        '<div class="trn-active-copy">' +
        '<strong>Torneo en curso</strong>' +
        '<span>' + esc(active.name) + ' · mano ' + (active.handIndex || 0) +
        ' · ' + (active.playersLeft || '?') + '/' + (active.entries || '?') + ' vivos</span>' +
        '</div>' +
        '<div class="trn-active-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="resume-active">Continuar</button>' +
        '<button type="button" class="btn btn-sm" data-act="discard-active">Empezar de nuevo</button>' +
        '</div></div>';
    }

    var resumeModal = '';
    if (ui.resumePrompt && ui.resumePrompt.active) {
      var rp = ui.resumePrompt.active;
      resumeModal = '<div class="trn-modal-backdrop" data-act="close-resume">' +
        '<div class="trn-modal" role="dialog" aria-modal="true" data-act="noop">' +
        '<h3>Ya tienes un torneo en curso</h3>' +
        '<p class="muted">' + esc(rp.name) + ' · mano ' + (rp.handIndex || 0) +
        ' · ' + (rp.playersLeft || '?') + ' jugadores restantes</p>' +
        '<div class="trn-setup-actions">' +
        '<button type="button" class="btn btn-primary" data-act="resume-active">Continuar</button>' +
        '<button type="button" class="btn" data-act="restart-preset" data-preset-id="' +
        esc(ui.resumePrompt.presetId || '') + '">Empezar de nuevo</button>' +
        '<button type="button" class="btn" data-act="close-resume">Cancelar</button>' +
        '</div></div></div>';
    }

    return '<div class="trn-hub trn-lobby">' +
      '<header class="trn-lobby-hero">' +
      '<div class="trn-lobby-hero-bg" aria-hidden="true"></div>' +
      '<div class="trn-lobby-hero-copy">' +
      '<p class="trn-lobby-eyebrow">Lobby · rivales IA</p>' +
      '<h2>TORNEOS</h2>' +
      '<p class="trn-lobby-tagline">Elige un evento, entra a la mesa y caza arquetipos para XP.</p>' +
      '<p class="trn-lobby-free">Torneos gratuitos · la entrada en Koins es ficticia (solo para premios y ROI).</p>' +
      '<div class="trn-wallet-chip">Koins: <strong>' + esc(String((global.PTTournamentWallet && PTTournamentWallet.getBalance) ? PTTournamentWallet.getBalance() : 100)) + '</strong></div>' +
      '</div>' +
      '<div class="trn-lobby-hero-actions">' +
      '<button type="button" class="btn btn-primary" data-act="custom">Personalizado</button>' +
      '<button type="button" class="btn" data-act="history">Histórico</button>' +
      '</div></header>' +
      activeBanner +
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
      (function () {
        var Lb = global.PTTournamentLeaderboard;
        try { if (Lb && Lb.publishHero) Lb.publishHero(); } catch (eLb) { /* */ }
        return (Lb && Lb.legendHtml ? Lb.legendHtml() : '') + (Lb && Lb.renderHtml ? Lb.renderHtml() : '');
      })() +
      '<section class="trn-lobby-recent">' +
      '<h3>Recientes</h3><ul class="trn-hist-list">' + histHtml + '</ul>' +
      '</section>' + resumeModal + '</div>';
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
      '<label class="trn-field">Buy-in Koins<input type="number" data-f="buyInEur" min="0.01" step="0.01" value="' + d.buyInEur + '"></label>' +
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

  function seatLastAct(hand, seat) {
    if (seat && seat.lastAction) return seat.lastAction;
    /* En un fotograma solo vale lo ya revelado: el log completo destriparía
       acciones que aún no han "ocurrido" en pantalla. */
    if (hand && hand._anim) return null;
    return lastLogAct(hand, seat && seat.id);
  }

  function formatActLabel(action, amount, bb) {
    var a = String(action || '').toLowerCase();
    var amt = amount ? (' ' + fmtBb(amount, bb)) : '';
    if (a === 'fold') return 'Fold';
    if (a === 'check') return 'Check';
    if (a === 'call') return 'Call' + amt;
    if (a === 'bet') return 'Bet' + amt;
    if (a === 'raise') return 'Raise' + amt;
    if (a === 'allin' || a === 'all-in') return 'All-in' + amt;
    return (action || '') + amt;
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
    var showdown = hand.stage === 'complete' || !!hand.holesRevealed ||
      !!(ui.anim && ui.anim.frame && (ui.anim.frame.kind === 'reveal' || ui.anim.frame.holesRevealed));
    var html = '';
    ring.forEach(function (s, i) {
      if (s.isHero) return; // héroe va en .hero-area (CSS .seat.hero { display:none })
      var c = coords[Math.min(i, coords.length - 1)] || coords[0];
      var guessed = state.heroGuesses && state.heroGuesses[s.id];
      var cls = ['seat', 'villain'];
      if (s.folded) cls.push('folded');
      if (s._acting) cls.push('acting');
      if (c.top < 20) cls.push('seat-top');
      if (c.top > 70) cls.push('seat-bottom');
      if (c.left < 22) cls.push('seat-edge-left');
      else if (c.left > 78) cls.push('seat-edge-right');
      if (guessed) cls.push('has-guess');

      var last = seatLastAct(hand, s);
      var actHtml = '';
      if (s.folded || (last && last.action === 'fold')) {
        actHtml = '<div class="seat-act-wrap"><span class="seat-act fold' +
          (s._acting ? ' is-acting' : '') + '">Fold</span></div>';
      } else if (last) {
        var actCls = actBadgeClass(last.action);
        var actTxt = formatActLabel(last.action, last.amount, bb);
        actHtml = '<div class="seat-act-wrap"><span class="seat-act ' + actCls +
          (s._acting ? ' is-acting' : '') + '">' + esc(actTxt) + '</span></div>';
      }

      var cardsHtml = '';
      if (s.folded) {
        cardsHtml = '';
      } else if (showdown && s.cards && s.cards[0]) {
        cardsHtml = '<div class="seat-cards showdown">' + s.cards.map(faceCard).join('') + '</div>';
      } else if (!s.folded) {
        cardsHtml = '<div class="seat-cards">' + backCard() + backCard() + '</div>';
      }

      var streetBet = Number(s.streetInvested) || 0;
      var betHtml = streetBet > 0
        ? '<div class="seat-bet ' + betPlacement(c) + '"><span class="seat-bet-amt">' + esc(fmtBb(streetBet, bb)) + '</span></div>'
        : '';

      var villainName = s.name || 'Villano';
      html += '<button type="button" class="' + cls.join(' ') + '" style="top:' + c.top + '%;left:' + c.left +
        '%" data-player="' + esc(s.id) + '" title="' + esc(villainName + ' · ' + (s.pos || '') + ' — adivinar rol') + '">' +
        '<div class="seat-body">' +
        '<div class="seat-hole">' + actHtml + cardsHtml + '</div>' +
        '<div class="seat-name">' + (s.allIn ? '<span class="trn-allin-badge">ALL-IN</span> ' : '') +
        esc(villainName) + (guessed ? ' · ?' : '') + '</div>' +
        '<div class="seat-pos">' + esc(s.pos || '') + '</div>' +
        '<div class="seat-role">' + esc(villainName) + '</div>' +
        '<div class="seat-stack">' + esc(fmtBb(s.stack, bb)) + '</div>' +
        '</div>' + betHtml +
        '</button>';
    });
    return html;
  }

  function renderHeroArea(hand, bb) {
    if (!hand) {
      return '<div class="hero-area">' +
        '<div class="hero-label"><span class="hero-avatar" aria-hidden="true"></span>' + esc(heroDisplayName(ui.state)) + '</div>' +
        '<div class="hero-cards"></div></div>';
    }
    var hero = null;
    for (var i = 0; i < hand.seats.length; i++) {
      if (hand.seats[i].isHero) { hero = hand.seats[i]; break; }
    }
    if (!hero) return '';
    var folded = !!hero.folded;
    var last = seatLastAct(hand, hero);
    var act = (folded || (last && last.action === 'fold'))
      ? '<div class="action-badge-wrap"><span class="seat-act fold">Fold</span></div>'
      : (last
        ? '<div class="action-badge-wrap"><span class="seat-act ' + actBadgeClass(last.action) + '">' +
          esc(formatActLabel(last.action, last.amount, bb)) + '</span></div>'
        : '');
    var cards = folded
      ? ''
      : ((hero.cards && hero.cards[0])
        ? hero.cards.map(faceCard).join('')
        : (backCard() + backCard()));
    return '<div class="hero-area' + (folded ? ' is-folded' : '') + '">' +
      act +
      '<div class="hero-chips"><div class="seat-stack">' + esc(fmtBb(hero.stack, bb)) + '</div></div>' +
      '<div class="hero-label"><span class="hero-avatar" aria-hidden="true"></span>' + esc(heroDisplayName(ui.state)) + ' · <span>' +
      esc(hero.pos || '-') + '</span></div>' +
      (cards ? ('<div class="hero-cards">' + cards + '</div>') : '<div class="hero-cards hero-cards-folded"></div>') +
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
    var hand = animHand(state._liveHand);
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
    if (ui.anim && ui.anim.playing) {
      actions = '<div class="actions actions-grid actions-grid-1 trn-anim-actions">' +
        '<button type="button" class="btn btn-skip-anim" data-act="skip-anim">Saltar acción</button>' +
        '</div>';
    } else if (state.status === 'busted_pending' || ui.bustPrompt) {
      actions = '<div class="trn-bust-prompt">' +
        '<p>Has sido eliminado. ¿Qué quieres hacer?</p>' +
        '<button type="button" class="btn btn-primary" data-act="sim-rest">Simular resto</button>' +
        '<button type="button" class="btn" data-act="end-now">Finalizar ya</button>' +
        '</div>';
    } else if (hand && hand.stage === 'complete') {
      actions = '';
    } else if (hand && hand.awaitingHero && hand.heroOptions && hand.heroOptions.length) {
      var nBtn = hand.heroOptions.length;
      var grid = nBtn <= 2 ? 'actions-grid-2' : (nBtn === 3 ? 'actions-grid-3' : 'actions-grid');
      actions = '<div class="actions actions-grid ' + grid + '">' + hand.heroOptions.map(function (o) {
        var amt = o.suggested != null ? o.suggested : (o.amount != null ? o.amount : '');
        var label = o.label || o.id;
        /* Red de seguridad: si el label aún trae fichas crudas, forzar bb. */
        if (o.id === 'call' && o.amount != null && !/\bbb\b/i.test(label)) {
          label = 'Call ' + fmtBb(o.amount, bb);
        } else if (o.id === 'allin' && o.amount != null && !/\bbb\b/i.test(label)) {
          label = 'All-in ' + fmtBb(o.amount, bb);
        } else if ((o.id === 'bet' || o.id === 'raise') && !/\bbb\b/i.test(label)) {
          var showAmt = o.suggested != null ? o.suggested : o.amount;
          if (showAmt != null) {
            label = (o.id === 'bet' ? 'Apostar ' : 'Subir a ') + fmtBb(showAmt, bb);
          }
        }
        return '<button type="button" class="' + actionBtnClass(o.id) +
          '" data-hero-act="' + esc(o.id) + '" data-amount="' + amt + '">' +
          esc(label) + '</button>';
      }).join('') + '</div>';
    } else if (!hand && state.status === 'running') {
      actions = '<div class="actions actions-grid actions-grid-1">' +
        '<button type="button" class="btn btn-primary" data-act="next-hand">Repartir</button></div>';
    }

    var infoModal = '';
    if (ui.infoOpen) {
      var rows = Hud.infoRows(state).map(function (r) {
        var val = r.value;
        var valHtml = (val && typeof val === 'object' && val.html)
          ? val.content
          : esc(String(val == null ? '' : val));
        return '<div class="trn-info-row"><span class="trn-info-lbl">' + esc(r.label) +
          '</span><span class="trn-info-val">' + valHtml + '</span></div>';
      }).join('');
      var hist = (state.handLog || []).slice().reverse().slice(0, 30);
      var histHtml = hist.length
        ? ('<ul class="trn-info-handlog">' + hist.map(function (h) {
          var heroSeat = (h.seats || []).find(function (s) { return s.isHero; });
          var net = h.result && h.result.heroNet != null
            ? Math.round((Number(h.result.heroNet) / Math.max(1, Number(h.bb) || 1)) * 10) / 10
            : null;
          var netTxt = net == null ? '' : (' · ' + (net >= 0 ? '+' : '') + net + ' bb');
          return '<li><button type="button" class="btn btn-sm trn-info-hand-btn" data-act="review-hand" data-hand="' +
            esc(String(h.handIndex)) + '" title="Ver paso a paso">' +
            '#' + esc(String(h.handIndex)) +
            (heroSeat && heroSeat.pos ? (' · ' + esc(heroSeat.pos)) : '') +
            netTxt +
            (h.showdown ? ' · SD' : '') +
            '</button></li>';
        }).join('') + '</ul>')
        : '<p class="muted">Aún no hay manos</p>';
      infoModal = '<div class="trn-modal-backdrop" data-act="close-info">' +
        '<div class="trn-modal trn-modal-wide trn-info-modal" role="dialog" aria-modal="true" aria-label="Info del torneo" ' +
        'data-act="noop">' +
        '<h3>Info del torneo</h3>' +
        '<div class="trn-info-dl">' + rows + '</div>' +
        '<details class="trn-info-handlog-wrap"' + (ui.infoHandlogOpen ? ' open' : '') + '>' +
        '<summary data-act="toggle-handlog">Histórico de manos' +
        (hist.length ? (' <span class="muted">(' + hist.length + ')</span>') : '') +
        '</summary>' +
        '<p class="trn-info-handlog-hint muted">Pulsa una mano para ver el paso a paso</p>' +
        histHtml +
        '</details>' +
        '<button type="button" class="btn btn-primary" data-act="close-info">Cerrar</button>' +
        '</div></div>';
    }

    var roleModal = '';
    if (ui.roleModalPlayerId) {
      var pid = ui.roleModalPlayerId;
      var pl = state.players.find(function (p) { return p.id === pid; });
      var cur = (state.heroGuesses && state.heroGuesses[pid]) || '';
      var roleIds = global.PTTournamentConfig.ROLE_IDS || [];
      var selectOpts = '<option value="">— Elige tipo de jugador —</option>' + roleIds.map(function (rid) {
        return '<option value="' + esc(rid) + '"' + (cur === rid ? ' selected' : '') + '>' +
          esc(roleLabel(rid)) + '</option>';
      }).join('');
      roleModal = '<div class="trn-modal-backdrop" data-act="close-role">' +
        '<div class="trn-modal" role="dialog" aria-modal="true" data-act="noop">' +
        '<h3>' + esc(pl && pl.name) + '</h3>' +
        '<p class="trn-player-stack-detail">' +
        esc(String(Math.round(Number(pl && pl.stack) || 0))) + ' fichas · ' +
        esc(fmtBb(Number(pl && pl.stack) || 0, bb)) +
        (pl && pl.alive === false ? ' · Eliminado' : '') +
        '</p>' +
        '<p class="muted">Elige su tipo de jugador (el nombre no indica el perfil). Se revela al final; +2 Koins por acierto.</p>' +
        '<label class="trn-role-select-label" for="trn-role-select">Tipo de jugador</label>' +
        '<select id="trn-role-select" class="trn-role-select" data-guess-player="' + esc(pid) + '">' +
        selectOpts + '</select>' +
        '<button type="button" class="btn btn-primary" data-act="save-role-guess" data-guess-player="' + esc(pid) + '">Guardar</button> ' +
        '<button type="button" class="btn" data-act="clear-guess" data-guess-player="' + esc(pid) + '">Quitar guess</button> ' +
        '<button type="button" class="btn" data-act="close-role">Cerrar</button>' +
        '</div></div>';
    }

    var streetLabel = hand ? String(hand.street || '').toUpperCase() : '';
    var heroAlive = St.hero(state);

    var handEndModal = '';
    if (hand && hand.stage === 'complete' && hand.result) {
      handEndModal = renderHandEndModal(hand, state, bb);
    }

    var blindUpBanner = '';
    var ftPopup = '';
    var itmPopup = '';
    if (state.blindUpPending && !(hand && hand.stage === 'complete')) {
      var bu = state.blindUpPending;
      blindUpBanner = toastPopupHtml(
        'blind',
        'Subida de nivel',
        'Nivel ' + esc(String(bu.level)) + ' · ' + esc(String(bu.sb)) + '/' + esc(String(bu.bb)) +
          (bu.ante ? (' ante ' + esc(String(bu.ante))) : ''),
        false
      );
      schedulePopupClear('blind');
    }
    if (state.finalTablePending && !(hand && hand.stage === 'complete')) {
      ftPopup = toastPopupHtml('ft', 'Mesa final', String(state.finalTablePending.players || '') + ' jugadores', true);
      schedulePopupClear('ft');
    }
    if (state.itmPending && !(hand && hand.stage === 'complete')) {
      itmPopup = toastPopupHtml('itm', '¡En el dinero!', 'Has entrado en premios', true);
      schedulePopupClear('itm');
    }

    var exitModal = '';
    if (ui.exitPrompt) {
      exitModal = '<div class="trn-modal-backdrop" data-act="close-exit">' +
        '<div class="trn-modal" role="dialog" aria-modal="true" data-act="noop">' +
        '<h3>Salir del torneo</h3>' +
        '<p class="muted">¿Guardar el avance para continuar más tarde, o borrar el torneo en curso?</p>' +
        '<div class="trn-setup-actions">' +
        '<button type="button" class="btn btn-primary" data-act="exit-save">Salir y guardar</button>' +
        '<button type="button" class="btn" data-act="exit-discard">Salir y borrar</button>' +
        '<button type="button" class="btn" data-act="close-exit">Seguir jugando</button>' +
        '</div></div></div>';
    }

    /* Misma cáscara visual que el entrenador (.play-stage / .poker-table / .table-felt)
       sin montar en #play-active: el motor de torneo (PTTournamentRunner) sigue
       dueño del estado entre manos. */
    return '<div class="trn-table-view trn-play-like">' + blindUpBanner + ftPopup + itmPopup +
      '<div class="trn-play-stage">' +
      '<div class="trn-table-hud">' + chips +
      '<div class="trn-hud-actions">' +
      '<button type="button" class="btn btn-sm trn-info-btn" data-act="info">Info</button>' +
      '<button type="button" class="btn btn-sm" data-act="hub">Salir</button>' +
      '</div></div>' +
      '<div class="poker-table trn-poker-table">' +
      '<div class="table-felt ' + tableClass + '" data-theme="emerald" data-format="' +
      (kind === 'sng' ? 'spin' : 'mtt') + '">' +
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
      actions +
      '</div>' +
      infoModal + roleModal + handEndModal + exitModal +
      '</div>';
  }

  function renderHandEndModal(hand, state, bb) {
    var res = hand.result || {};
    var hero = null;
    hand.seats.forEach(function (s) { if (s.isHero) hero = s; });
    var heroId = hero ? hero.id : null;
    var deltas = res.deltas || {};
    var heroDelta = heroId != null ? (Number(deltas[heroId]) || 0) : 0;
    var won = heroId && (res.winners || []).indexOf(heroId) >= 0;
    var tied = !!res.tied || ((res.winners || []).length > 1 && won);
    var outcomeCls = tied ? 'hand-end-tie'
      : (heroDelta > 0.02 ? 'hand-end-win' : (heroDelta < -0.02 ? 'hand-end-lose' : 'hand-end-tie'));
    var title;
    if (tied && res.showdown) title = 'Empate en el showdown';
    else if (won && heroDelta > 0.02) title = res.showdown ? 'Ganas en showdown' : 'Ganas la mano';
    else if (heroDelta < -0.02) title = res.showdown ? 'Pierdes en showdown' : 'Pierdes la mano';
    else if (won) title = res.showdown ? 'Showdown' : 'Mano terminada';
    else title = 'Mano terminada';

    var analyzed = null;
    try {
      var Bridge = global.PTTournamentSessionBridge;
      if (Bridge && Bridge.handFromTournament) {
        analyzed = Bridge.handFromTournament(hand, {
          tournamentId: state && state.id,
          handIndex: state && state.handIndex,
          heroName: heroDisplayName(state)
        });
      }
    } catch (eA) { analyzed = null; }

    var rich = '';
    try {
      var HEV = global.PTHandEndView;
      if (HEV && HEV.renderHandEndHtml && analyzed) {
        rich = HEV.renderHandEndHtml(analyzed, {
          title: title,
          showDecisions: !!ui.handDetailOpen
        });
      }
    } catch (eH) { rich = ''; }

    if (!rich) {
      /* Fallback compacto si el bridge no está cargado. */
      var boardHtml = (res.board || hand.board || []).map(faceCard).join('');
      var seatsHtml = hand.seats.filter(function (s) {
        return !s.folded || (res.holeCards && res.holeCards[s.id]);
      }).map(function (s) {
        var cards = (res.holeCards && res.holeCards[s.id]) || (s.isHero ? s.cards : null);
        var cardsHtml = cards && cards[0]
          ? cards.map(faceCard).join('')
          : '<span class="muted">—</span>';
        var d = Number(deltas[s.id]) || 0;
        var dCls = d > 0 ? 'net-pos' : (d < 0 ? 'net-neg' : '');
        return '<div class="trn-hand-end-seat' + (s.isHero ? ' is-hero' : '') +
          ((res.winners || []).indexOf(s.id) >= 0 ? ' is-winner' : '') + '">' +
          '<div class="trn-hand-end-name">' + esc(s.isHero ? heroDisplayName(ui.state) : (s.name || s.pos)) +
          ' · ' + esc(s.pos || '') + '</div>' +
          '<div class="trn-hand-end-cards">' + cardsHtml + '</div>' +
          '<div class="trn-hand-end-delta ' + dCls + '">' + (d >= 0 ? '+' : '') + esc(fmtBb(d, bb)) + '</div>' +
          '</div>';
      }).join('');
      rich = '<div class="trn-hand-end-head ' + outcomeCls + '">' +
        '<p class="trn-hand-end-kicker">Resultado de la mano</p>' +
        '<h3>' + esc(title) + '</h3>' +
        '<p class="trn-hand-end-pot">Bote ' + esc(fmtBb(res.pot || hand.pot || 0, bb)) +
        (res.showdown ? ' · Showdown' : '') + '</p></div>' +
        (boardHtml ? ('<div class="trn-hand-end-board"><span class="muted">Board</span><div class="trn-hand-end-cards">' +
          boardHtml + '</div></div>') : '') +
        '<div class="trn-hand-end-seats">' + seatsHtml + '</div>';
      if (ui.handDetailOpen && hand.decisions && hand.decisions.length) {
        var GEval = global.PTTournamentGtoEval;
        var sum = GEval && GEval.summarizeDecisions ? GEval.summarizeDecisions(hand.decisions) : null;
        rich += '<div class="trn-hand-end-detail"><h4>Evaluación GTO (héroe)</h4>';
        if (sum) {
          rich += '<p class="trn-gto-summary">Aciertos ' + sum.hits + '/' + sum.scored +
            ' (' + sum.accuracy + '%) · EV loss ' + sum.totalEvLoss + ' bb' +
            (sum.score != null ? (' · Nota ' + sum.score) : '') + '</p>';
        }
        rich += '<ol class="trn-gto-decisions">' + hand.decisions.map(function (d) {
          return '<li><span class="trn-gto-class trn-gto-' + esc(d.class || 'unscored') + '">' +
            esc(d.class || 'unscored') + '</span> ' + esc(d.street || '') + ' · ' +
            esc(d.label || d.action || '') +
            (d.evLoss ? (' · −' + d.evLoss + ' bb') : '') +
            (d.mttPhase ? (' · <span class="trn-gto-phase">fase ' + esc(d.mttPhase) +
              (d.stackBB != null ? (' · ' + esc(String(d.stackBB)) + ' bb') : '') + '</span>') : '') +
            '</li>';
        }).join('') + '</ol></div>';
      }
    }

    return '<div class="trn-modal-backdrop trn-hand-end-backdrop" data-act="noop">' +
      '<div class="trn-modal trn-hand-end-modal trn-hand-end-modal-rich" role="dialog" aria-modal="true" data-act="noop">' +
      '<div class="trn-hand-end-scroll">' + rich + '</div>' +
      '<div class="trn-hand-end-actions">' +
      '<button type="button" class="btn" data-act="toggle-hand-detail">' +
      (ui.handDetailOpen ? 'Ocultar detalle GTO' : 'Ver detalle GTO') + '</button>' +
      '<button type="button" class="btn" data-act="hand-end-review"' +
      (analyzed && analyzed.id ? (' data-hand-id="' + esc(analyzed.id) + '"') : '') +
      '>Paso a paso</button>' +
      '<button type="button" class="btn btn-primary" data-act="continue-hand">Continuar »</button>' +
      '</div></div></div>';
  }


  function renderReplayModal() {
    if (!ui.replayOpen || !ui.state) return '';
    var log = (ui.state.handLog || []).find(function (h) {
      return Number(h.handIndex) === Number(ui.replayHandIndex);
    });
    if (!log) {
      return '<div class="trn-modal-backdrop" data-act="close-replay">' +
        '<div class="trn-modal" data-act="noop"><p>Mano no encontrada</p>' +
        '<button type="button" class="btn" data-act="close-replay">Cerrar</button></div></div>';
    }
    var bb = Number(log.bb) || 1;
    var actions = log.log || [];
    var step = Math.max(0, Math.min(ui.replayStep || 0, actions.length));
    var visible = actions.slice(0, step);
    var boardCount = 0;
    visible.forEach(function () { /* board from streets */ });
    var streetsSeen = {};
    visible.forEach(function (e) { if (e.street) streetsSeen[e.street] = true; });
    var boardShow = 0;
    if (streetsSeen.flop) boardShow = 3;
    if (streetsSeen.turn) boardShow = 4;
    if (streetsSeen.river || log.showdown) boardShow = 5;
    if (step >= actions.length) boardShow = (log.board || []).length;
    var boardHtml = (log.board || []).slice(0, boardShow).map(faceCard).join('') ||
      '<span class="muted">—</span>';
    var actHtml = visible.map(function (e, idx) {
      return '<li class="' + (idx === step - 1 ? 'is-current' : '') + '">' +
        '<span class="muted">' + esc(e.street || '') + '</span> ' +
        esc(e.name || e.id) + ' · ' + esc(formatActLabel(e.action, e.amount, bb)) + '</li>';
    }).join('') || '<li class="muted">Inicio de la mano</li>';
    var seatsHtml = (log.seats || []).map(function (s) {
      var showCards = step >= actions.length || s.isHero;
      var cards = showCards && s.cards && s.cards[0]
        ? s.cards.map(faceCard).join('')
        : '<span class="muted">??</span>';
      return '<div class="trn-hand-end-seat' + (s.isHero ? ' is-hero' : '') + '">' +
        '<div class="trn-hand-end-name">' + esc(s.isHero ? heroDisplayName(ui.state) : s.name) +
        ' · ' + esc(s.pos || '') + '</div>' +
        '<div class="trn-hand-end-cards">' + cards + '</div></div>';
    }).join('');
    var done = step >= actions.length;
    return '<div class="trn-modal-backdrop" data-act="close-replay">' +
      '<div class="trn-modal trn-modal-wide trn-replay-modal" role="dialog" aria-modal="true" data-act="noop">' +
      '<h3>Replay mano #' + esc(String(log.handIndex)) + ' · paso ' + step + '/' + actions.length + '</h3>' +
      '<div class="trn-hand-end-board"><span class="muted">Board</span><div class="trn-hand-end-cards">' +
      boardHtml + '</div></div>' +
      '<div class="trn-hand-end-seats">' + seatsHtml + '</div>' +
      '<ol class="trn-replay-steps">' + actHtml + '</ol>' +
      '<div class="trn-setup-actions">' +
      '<button type="button" class="btn" data-act="replay-prev"' + (step <= 0 ? ' disabled' : '') + '>Anterior</button>' +
      '<button type="button" class="btn btn-primary" data-act="replay-next">' +
      (done ? 'Reiniciar' : 'Siguiente') + '</button>' +
      '<button type="button" class="btn" data-act="close-replay">Cerrar</button>' +
      '</div></div></div>';
  }


  function openSessionHand(sessionId, handId, mode) {
    mode = mode || 'review';
    if (!sessionId) return;
    try {
      if (typeof global.goToTab === 'function') {
        global.goToTab('sessions', {
          openSessionId: sessionId,
          handId: handId || null,
          reviewMode: mode,
          fromTournament: true
        });
        return;
      }
      if (typeof global.openSession === 'function') {
        Promise.resolve(global.openSession(sessionId, null, {
          handId: handId || null,
          mode: mode,
          fromTournament: true
        })).catch(function () { /* */ });
      }
    } catch (eOpen) { /* */ }
  }

  function openLiveHandReview(handId, mode) {
    mode = mode || 'review';
    var state = ui.state;
    if (!state) return;
    var analyzed = null;
    var Bridge = global.PTTournamentSessionBridge;
    var live = state._liveHand;
    var wantIdx = handId != null && String(handId).match(/^\d+$/) ? Number(handId) : null;

    if (wantIdx != null && state.sessionHands && state.sessionHands.length) {
      analyzed = state.sessionHands.filter(function (h) {
        return h && Number(h.handIndex) === wantIdx;
      })[0] || null;
    }
    if (!analyzed && wantIdx != null && state.handLog && Bridge && Bridge.handFromTournament) {
      try {
        var logEntry = state.handLog.find(function (h) {
          return Number(h.handIndex) === wantIdx;
        });
        if (logEntry) {
          analyzed = Bridge.handFromTournament(logEntry, {
            tournamentId: state.id,
            handIndex: logEntry.handIndex,
            heroName: heroDisplayName(state)
          });
        }
      } catch (eLog) { analyzed = null; }
    }
    if (!analyzed) {
      try {
        if (Bridge && Bridge.handFromTournament && live && live.stage === 'complete') {
          analyzed = Bridge.handFromTournament(live, {
            tournamentId: state.id,
            handIndex: state.handIndex,
            heroName: heroDisplayName(state)
          });
        }
      } catch (e1) { analyzed = null; }
    }
    if (!analyzed && state.sessionHands && state.sessionHands.length) {
      analyzed = state.sessionHands.filter(function (h) {
        return h && (h.id === handId || String(h.handIndex) === String(handId));
      })[0] || state.sessionHands[state.sessionHands.length - 1];
    }
    if (!analyzed) return;
    ui.infoOpen = false;
    try {
      if (typeof global.openTournamentHandReview === 'function') {
        global.openTournamentHandReview(analyzed, mode);
        return;
      }
    } catch (e2) { /* */ }
    /* Fallback: replay modal local */
    ui.replayHandIndex = Number(analyzed.handIndex != null ? analyzed.handIndex : state.handIndex);
    ui.replayOpen = true;
    ui.replayStep = 0;
    paint();
  }

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

    var sessionStats = r.sessionStats || state.sessionStats || null;
    var sessionId = r.sessionId || state.sessionId || null;
    var gto = state.gtoSession || r.gtoSession || {};
    var Cfg = global.PTTournamentConfig;
    var ladder = (Cfg && Cfg.payoutEuros) ? Cfg.payoutEuros(state.config || {}) : [];
    var standings = (state.players || []).slice().sort(function (a, b) {
      if (a.alive && b.alive) return (b.stack || 0) - (a.stack || 0);
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return (a.bustPlace || 999) - (b.bustPlace || 999);
    });
    var standHtml = standings.map(function (pl, i) {
      var place = pl.alive ? (i + 1) : (pl.bustPlace || '—');
      var prize = (place >= 1 && place <= ladder.length) ? (ladder[place - 1] || 0) : 0;
      return '<tr class="' + (pl.isHero ? 'is-hero' : '') + '">' +
        '<td>' + place + 'º</td>' +
        '<td>' + esc(pl.isHero ? heroDisplayName(ui.state) : pl.name) + '</td>' +
        '<td>' + (pl.alive ? (Math.round(pl.stack) + ' f') : 'out') + '</td>' +
        '<td>' + fmtKoins(prize) + '</td></tr>';
    }).join('');

    var statsHtml = '';
    try {
      var HEV = global.PTHandEndView;
      if (HEV && HEV.renderSessionStatsHtml && sessionStats) {
        statsHtml = HEV.renderSessionStatsHtml(sessionStats, { title: 'Estadísticas de sesión' });
      }
    } catch (eS) { statsHtml = ''; }
    if (!statsHtml) {
      var stats = r.stats || {};
      statsHtml = '<div class="trn-result-stats trn-session-like"><div class="trn-stat-grid">' +
        '<div><div class="trn-stat-val">' + (sessionStats && sessionStats.nHands != null ? sessionStats.nHands : (stats.handsPlayed || 0)) + '</div><div class="trn-stat-lbl">Manos</div></div>' +
        '<div><div class="trn-stat-val">' + (sessionStats && sessionStats.vpipPct != null ? sessionStats.vpipPct : (stats.vpip || 0)) + '%</div><div class="trn-stat-lbl">VPIP</div></div>' +
        '<div><div class="trn-stat-val">' + (sessionStats && sessionStats.pfrPct != null ? sessionStats.pfrPct : (stats.pfr || 0)) + '%</div><div class="trn-stat-lbl">PFR</div></div>' +
        '<div><div class="trn-stat-val">' + (sessionStats && sessionStats.accuracy != null ? sessionStats.accuracy : (gto.accuracy || 0)) + '%</div><div class="trn-stat-lbl">Acierto GTO</div></div>' +
        '<div><div class="trn-stat-val">' + (sessionStats && sessionStats.evLossBB != null ? sessionStats.evLossBB : (gto.totalEvLoss || 0)) + '</div><div class="trn-stat-lbl">EV loss</div></div>' +
        '</div></div>';
    }

    var sessionHands = (state.sessionHands && state.sessionHands.length)
      ? state.sessionHands.slice()
      : [];
    var handsHtml;
    if (sessionHands.length) {
      handsHtml = sessionHands.slice().reverse().map(function (h) {
        var net = Number(h.heroNetBB) || 0;
        var netCls = net > 0.02 ? 'net-pos' : (net < -0.02 ? 'net-neg' : '');
        return '<li class="trn-session-hand-row">' +
          '<span class="trn-hand-meta">#' + esc(String(h.handIndex != null ? h.handIndex : '')) +
          ' · ' + esc(h.heroCode || '') + ' ' + esc(h.heroPos || '') +
          ' · <span class="' + netCls + '">' + (net >= 0 ? '+' : '') + esc(String(Math.round(net * 100) / 100)) + ' bb</span>' +
          (h.handScore != null ? (' · nota ' + esc(String(h.handScore))) : '') +
          '</span> ' +
          '<button type="button" class="btn btn-sm" data-act="session-review-hand" data-hand-id="' +
          esc(h.id) + '"' + (sessionId ? (' data-session-id="' + esc(sessionId) + '"') : '') +
          '>Paso a paso</button></li>';
      }).join('');
    } else {
      var hands = (state.handLog || []).slice().reverse();
      handsHtml = hands.length
        ? hands.map(function (h) {
          return '<li><button type="button" class="btn btn-sm" data-act="review-hand" data-hand="' +
            esc(String(h.handIndex)) + '">Mano #' + esc(String(h.handIndex)) +
            '</button> · pot ' + esc(String(Math.round((h.pot || 0) * 10) / 10)) +
            (h.tied ? ' · chop' : '') +
            (h.showdown ? ' · SD' : '') + '</li>';
        }).join('')
        : '<li class="muted">Sin manos guardadas</li>';
    }

    var handsCount = sessionHands.length || (state.handLog || []).length;
    var handsSection = '<details class="trn-hands-fold">' +
      '<summary>Manos jugadas (' + handsCount + ')</summary>' +
      '<ul class="trn-hand-log-list">' + handsHtml + '</ul></details>';

    var placeLabel = r.place != null ? (r.place + 'º') : '—';
    return '<div class="trn-result panel">' +
      '<header class="trn-result-hero">' +
      '<p class="trn-result-kicker">Resultado del torneo</p>' +
      '<h2 class="trn-result-place">' + placeLabel + '</h2>' +
      '<p class="trn-result-prize">Premio ' + fmtKoins(r.prizeEur || 0) + '</p>' +
      '<p class="trn-result-roles">Roles ' + (rs.correct || 0) + '/' + (rs.total || 0) +
      ' (' + (rs.accuracy || 0) + '%) · +' + (r.xpGained || 0) + ' XP' +
      (r.roleKoins ? (' · +' + r.roleKoins + ' Koins por roles') : '') + '</p>' +
      '</header>' +
      statsHtml +
      (sessionId
        ? ('<p class="trn-result-cta"><button type="button" class="btn btn-primary" data-act="open-session" data-session-id="' +
          esc(sessionId) + '">Estadísticas del torneo</button></p>')
        : '') +
      '<h3>Clasificación</h3>' +
      '<div class="trn-hist-table-wrap"><table class="trn-hist-table"><thead><tr>' +
      '<th>#</th><th>Jugador</th><th>Stack</th><th>Premio</th></tr></thead><tbody>' +
      standHtml + '</tbody></table></div>' +
      '<h3>Roles</h3><ul class="trn-role-reveal">' + details + '</ul>' +
      handsSection +
      '<div class="trn-setup-actions">' +
      '<button type="button" class="btn btn-primary" data-act="hub">Hub</button>' +
      '<button type="button" class="btn" data-act="history">Histórico</button>' +
      '</div></div>';
  }

  function renderHistory() {
    var list = global.PTTournamentStore.list() || [];
    var rows = list.length
      ? list.map(function (h) {
        return '<tr>' +
          '<td>' + esc(h.name) + '</td>' +
          '<td>' + esc((h.kind || '').toUpperCase()) + '</td>' +
          '<td>' + (h.place != null ? h.place : '—') + '/' + h.entries + '</td>' +
          '<td>' + fmtKoins(h.prizeEur || 0) + '</td>' +
          '<td>' + (h.roi || 0) + '%</td>' +
          '<td>' + (h.roleAccuracy || 0) + '%</td>' +
          '<td>' + (h.sessionId
            ? ('<button type="button" class="btn btn-sm" data-act="open-session" data-session-id="' +
              esc(h.sessionId) + '">Sesión</button> ')
            : '') +
          '<button type="button" class="btn btn-sm" data-act="remove-hist" data-id="' + esc(h.id) + '">×</button></td>' +
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

  function setTableActiveClass(on) {
    try {
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.toggle('trn-table-active', !!on);
      }
    } catch (e) { /* noop */ }
  }

  function paint() {
    if (!ui.root) return;
    var html = '';
    try {
      if (ui.view === VIEW.setup) html = renderSetup();
      else if (ui.view === VIEW.table) html = renderTable();
      else if (ui.view === VIEW.result) html = renderResult() + renderReplayModal();
      else if (ui.view === VIEW.history) html = renderHistory();
      else html = renderHub();
    } catch (err) {
      console.error('[PTTournamentsUI] paint', err);
      setTableActiveClass(false);
      ui.root.innerHTML =
        '<div class="trn-hub"><p class="muted">Error al pintar Torneos.</p>' +
        '<button type="button" class="btn" data-act="hub">Volver al hub</button></div>';
      try { bind(ui.root); } catch (e2) { /* noop */ }
      return;
    }
    setTableActiveClass(ui.view === VIEW.table);
    ui.root.innerHTML = html;
    bind(ui.root);
  }

  /** Anima lo que acaba de resolver el motor y luego cierra el turno. */
  function afterActionAnimated() {
    animateThen(afterAction);
  }

  function afterAction() {
    var state = ui.state;
    if (!state) { paint(); return; }
    if (state.status === 'finished') {
      clearActive();
      setView(VIEW.result);
      return;
    }
    if (state.status === 'busted_pending') {
      ui.bustPrompt = true;
    }
    persistActive();
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
        if (act === 'noop') {
          ev.stopPropagation();
          return;
        }
        /* Backdrop: solo cerrar si el click es en el fondo, no en el panel. */
        if ((act === 'close-info' || act === 'close-role') &&
            btn.classList.contains('trn-modal-backdrop') &&
            ev.target !== btn) {
          return;
        }
        if (act === 'custom') {
          ui.setupDraft = defaultDraft();
          setView(VIEW.setup);
        } else if (act === 'hub') {
          if (ui.view === VIEW.table && ui.state && ui.state.status !== 'finished') {
            ui.exitPrompt = true;
            paint();
            return;
          }
          ui.state = null;
          ui.exitPrompt = false;
          setView(VIEW.hub);
        } else if (act === 'close-exit') {
          ui.exitPrompt = false;
          paint();
        } else if (act === 'exit-save') {
          persistActive();
          ui.state = null;
          ui.exitPrompt = false;
          setView(VIEW.hub);
        } else if (act === 'exit-discard') {
          clearActive();
          ui.state = null;
          ui.exitPrompt = false;
          setView(VIEW.hub);
        } else if (act === 'resume-active') {
          if (!resumeActive()) paint();
        } else if (act === 'discard-active') {
          clearActive();
          ui.resumePrompt = false;
          paint();
        } else if (act === 'close-resume') {
          ui.resumePrompt = false;
          paint();
        } else if (act === 'restart-preset') {
          var pid = btn.getAttribute('data-preset-id');
          clearActive();
          ui.resumePrompt = false;
          if (pid) startFromConfig(pid, {});
          else paint();
        } else if (act === 'continue-hand') {
          if (ui.state) {
            global.PTTournamentRunner.continueAfterHand(ui.state);
            ui.handDetailOpen = false;
            persistActive();
          }
          afterActionAnimated();
        } else if (act === 'skip-anim') {
          ui.anim.skip = true;
          if (ui.anim.timer && typeof clearTimeout === 'function') clearTimeout(ui.anim.timer);
          ui.anim.timer = null;
          if (ui.anim.pending) {
            var fin = ui.anim.pending;
            ui.anim.pending = null;
            stopAnim();
            fin();
          } else {
            stopAnim();
            paint();
          }
        } else if (act === 'toggle-hand-detail') {
          ui.handDetailOpen = !ui.handDetailOpen;
          paint();
        } else if (act === 'hand-end-review') {
          openLiveHandReview(btn.getAttribute('data-hand-id'), 'review');
        } else if (act === 'open-session') {
          openSessionHand(btn.getAttribute('data-session-id'), null, 'review');
        } else if (act === 'session-review-hand') {
          openSessionHand(btn.getAttribute('data-session-id'), btn.getAttribute('data-hand-id'), 'review');
        } else if (act === 'session-replay-hand') {
          openSessionHand(btn.getAttribute('data-session-id'), btn.getAttribute('data-hand-id'), 'replay');
        } else if (act === 'replay-hand') {
          ui.replayHandIndex = Number(btn.getAttribute('data-hand'));
          ui.replayOpen = true;
          ui.replayStep = 0;
          paint();
        } else if (act === 'review-hand') {
          openLiveHandReview(btn.getAttribute('data-hand'), 'review');
        } else if (act === 'toggle-handlog') {
          ev.preventDefault();
          ui.infoHandlogOpen = !ui.infoHandlogOpen;
          paint();
        } else if (act === 'close-replay') {
          ui.replayOpen = false;
          ui.replayHandIndex = null;
          ui.replayStep = 0;
          paint();
        } else if (act === 'replay-next') {
          var logN = (ui.state && ui.state.handLog || []).find(function (h) {
            return Number(h.handIndex) === Number(ui.replayHandIndex);
          });
          var maxS = logN && logN.log ? logN.log.length : 0;
          if ((ui.replayStep || 0) >= maxS) ui.replayStep = 0;
          else ui.replayStep = (ui.replayStep || 0) + 1;
          paint();
        } else if (act === 'replay-prev') {
          ui.replayStep = Math.max(0, (ui.replayStep || 0) - 1);
          paint();
        } else if (act === 'history') {
          setView(VIEW.history);
        } else if (act === 'start-custom') {
          var cfg = readSetupForm(root);
          startFromConfig(cfg, {});
        } else if (act === 'dismiss-blind-up') {
          if (ui.state) ui.state.blindUpPending = null;
          paint();
        } else if (act === 'info') {
          ui.infoOpen = true;
          ui.infoHandlogOpen = false;
          paint();
        } else if (act === 'close-info') {
          ui.infoOpen = false;
          ui.infoHandlogOpen = false;
          paint();
        } else if (act === 'close-role') {
          ui.roleModalPlayerId = null;
          paint();
        } else if (act === 'clear-guess') {
          global.PTTournamentRoleGuess.clearGuess(ui.state, btn.getAttribute('data-guess-player'));
          ui.roleModalPlayerId = null;
          paint();
        } else if (act === 'save-role-guess') {
          var selRole = root.querySelector('#trn-role-select');
          var rid = selRole && selRole.value;
          var playerId = btn.getAttribute('data-guess-player');
          if (rid && playerId && global.PTTournamentRoleGuess && PTTournamentRoleGuess.setGuess) {
            PTTournamentRoleGuess.setGuess(ui.state, playerId, rid);
          }
          ui.roleModalPlayerId = null;
          paint();
        } else if (act === 'next-hand') {
          if (ui.state && ui.state.status === 'running') {
            global.PTTournamentRunner.continueAfterHand(ui.state);
            persistActive();
          }
          afterActionAnimated();
        } else if (act === 'sim-rest') {
          global.PTTournamentRunner.simulateRest(ui.state);
          clearActive();
          afterAction();
        } else if (act === 'end-now') {
          global.PTTournamentRunner.finish(ui.state, { reason: 'bust' });
          clearActive();
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
        if (ui.anim && ui.anim.playing) return;
        var id = btn.getAttribute('data-hero-act');
        var amtRaw = btn.getAttribute('data-amount');
        var amt = amtRaw === '' || amtRaw == null ? null : Number(amtRaw);
        global.PTTournamentRunner.heroAct(ui.state, id, amt);
        afterActionAnimated();
      });
    });

    /* Backdrop de salida: click fuera cierra el prompt */
    root.querySelectorAll('.trn-modal-backdrop[data-act="close-exit"]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        if (ev.target === el) {
          ui.exitPrompt = false;
          paint();
        }
      });
    });

    root.querySelectorAll('.trn-play-like .seat.villain[data-player]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.roleModalPlayerId = btn.getAttribute('data-player');
        paint();
      });
    });

    root.querySelectorAll('[data-act="save-role-guess"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sel = root.querySelector('#trn-role-select');
        var rid = sel && sel.value;
        var playerId = btn.getAttribute('data-guess-player');
        if (rid && playerId && global.PTTournamentRoleGuess && PTTournamentRoleGuess.setGuess) {
          PTTournamentRoleGuess.setGuess(ui.state, playerId, rid);
        }
        ui.roleModalPlayerId = null;
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
