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
    history: 'history',
    generalStats: 'generalStats'
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
    upgradePrompt: null,
    handDetailOpen: false,
    replayOpen: false,
    replayStep: 0,
    replayHandIndex: null,
    aliasEditorOpen: false,
    popupClearScheduled: { blind: false, ft: false, itm: false, start: false, congrats: false },
    anim: { frame: null, playing: false, skip: false, seq: 0, timer: null },
    heldFrames: null,
    heldFramesDone: null
  };

  function displayKoins() {
    try {
      var W = global.PTTournamentWallet;
      if (!W) return 0;
      if (W.peek) {
        var p = W.peek();
        if (p && typeof p.balance === 'number') return p.balance;
      }
      if (W.snapshot) {
        var s = W.snapshot();
        if (s && typeof s.balance === 'number') return s.balance;
      }
      if (W.getBalance) return W.getBalance();
    } catch (e) { /* */ }
    return 0;
  }

  function flushTournamentCloud() {
    try {
      if (global.PTCloud && typeof global.PTCloud.flushPush === 'function') {
        global.PTCloud.flushPush();
      }
    } catch (e) { /* */ }
  }

  function onCloudSynced(ev) {
    try {
      if (!ui.root) return;
      /* Si el sync trae un torneo más avanzado y estamos en lobby, refrescar. */
      if (ui.view === VIEW.hub || ui.view === VIEW.history || ui.view === VIEW.generalStats) {
        /* Evitar quedarnos con un resumePrompt o state de mesa obsoleto en hub. */
        if (ui.view === VIEW.hub) {
          ui.resumePrompt = false;
          refreshHubLeaderboard(true);
          if (ui.state && ui.state.status !== 'finished') {
            var latest = global.PTTournamentStore && PTTournamentStore.loadActive
              ? PTTournamentStore.loadActive()
              : null;
            if (latest && (!ui.state.id || latest.id !== ui.state.id ||
                (Number(latest.handIndex) || 0) > (Number(ui.state.handIndex) || 0) ||
                (Number(latest._progressRev) || 0) > (Number(ui.state._progressRev) || 0))) {
              ui.state = latest;
            }
          }
        }
        paint();
        return;
      }
      /* En mesa: si el cloud trae el mismo torneo más avanzado y aún no hay acción
         a medias del héroe, adoptar (p.ej. reabrir tras sync). */
      if (ui.view === VIEW.table && ui.state && !ui.anim.playing) {
        var remote = global.PTTournamentStore && PTTournamentStore.loadActive
          ? PTTournamentStore.loadActive()
          : null;
        if (remote && remote.id === ui.state.id &&
            global.PTTournamentStore.isPreferableActive &&
            PTTournamentStore.isPreferableActive(remote, ui.state) &&
            !(ui.state._liveHand && ui.state._liveHand.awaitingHero)) {
          ui.state = remote;
          paint();
        }
      }
    } catch (e) { /* */ }
  }

  function onLeaderboardUpdated() {
    try {
      if (!ui.root || ui.view !== VIEW.hub) return;
      /* Solo refrescar el bloque de clasificación: evita reset de scroll del lobby
         y no vuelve a disparar refreshFromCloud (renderHtml skipRefresh). */
      var host = ui.root.querySelector('.trn-leaderboard');
      var Lb = global.PTTournamentLeaderboard;
      if (host && Lb && typeof Lb.renderHtml === 'function') {
        var wrap = document.createElement('div');
        wrap.innerHTML = Lb.renderHtml({ skipRefresh: true });
        var next = wrap.querySelector('.trn-leaderboard');
        if (next) {
          host.replaceWith(next);
          return;
        }
      }
      paint();
    } catch (e) { /* */ }
  }

  function refreshHubLeaderboard(force) {
    try {
      if (!ui.root || ui.view !== VIEW.hub) return;
      if (global.PTTournamentLeaderboard && PTTournamentLeaderboard.refreshFromCloud) {
        PTTournamentLeaderboard.refreshFromCloud({ force: !!force });
      }
    } catch (eRef) { /* */ }
  }

  try {
    if (typeof global.addEventListener === 'function') {
      global.addEventListener('pt-cloud-synced', onCloudSynced);
      global.addEventListener('pt-tournament-leaderboard-updated', onLeaderboardUpdated);
      /* Auth / sync suelen terminar ANTES de cargar el chunk en PWA móvil. */
      global.addEventListener('pt-auth-ready', function () { refreshHubLeaderboard(true); });
      global.addEventListener('pt-auth-boot-done', function () { refreshHubLeaderboard(true); });
      global.addEventListener('pt-entitlements-updated', function () { refreshHubLeaderboard(false); });
      global.addEventListener('pt-tournament-alias-changed', function (ev) {
        var alias = ev && ev.detail ? ev.detail.alias : null;
        applyAliasToActiveHero(alias);
        try {
          if (global.PTTournamentLeaderboard && PTTournamentLeaderboard.publishHero) {
            PTTournamentLeaderboard.publishHero({ forceCloud: true });
          }
        } catch (eLb) { /* */ }
        if (ui.root && (ui.view === VIEW.hub || ui.view === VIEW.table || ui.view === VIEW.result)) {
          paint();
        }
      });
      /* Chunk lazy: si la sesión ya estaba lista, no llegará otro pt-auth-ready. */
      if (global.PT_AUTH_BOOT_DONE ||
          (global.PTAuth && PTAuth.getUser && PTAuth.getUser()) ||
          global.PT_AUTH_USER) {
        setTimeout(function () { refreshHubLeaderboard(true); }, 0);
      }
    }
  } catch (eBind) { /* */ }

  function applyAliasToActiveHero(alias) {
    try {
      if (!ui.state || !ui.state.players) return;
      var name = alias || resolveHeroNameOpt();
      var lower = String(name || '').trim().toLowerCase();
      ui.state.players.forEach(function (p) {
        if (!p) return;
        if (p.isHero) {
          p.name = name;
          return;
        }
        /* Evitar colisión con un bot que ya lleve el alias (pool FoldFam, etc.). */
        if (lower && p.name && String(p.name).trim().toLowerCase() === lower) {
          p.name = String(p.name) + '_' + String(p.id || 'v').replace(/^v/, '');
        }
      });
      var live = ui.state._liveHand;
      if (live && live.seats) {
        live.seats.forEach(function (s) {
          if (!s) return;
          if (s.isHero) {
            s.name = name;
            return;
          }
          if (lower && s.name && String(s.name).trim().toLowerCase() === lower) {
            s.name = String(s.name) + '_' + String(s.id || 'v').replace(/^v/, '');
          }
        });
      }
    } catch (e) { /* */ }
  }

  function currentAliasValue() {
    try {
      if (global.PTProfile && PTProfile.getTournamentAlias) {
        return PTProfile.getTournamentAlias() || '';
      }
    } catch (e) { /* */ }
    return '';
  }

  function aliasChipHtml() {
    var alias = currentAliasValue();
    var label = alias || 'Sin alias (se usa tu nombre)';
    if (ui.aliasEditorOpen) {
      return '<div class="trn-alias-editor" id="trn-alias-editor">' +
        '<label class="trn-alias-label" for="trn-alias-input">Alias en clasificación y mesa</label>' +
        '<div class="trn-alias-row">' +
        '<input type="text" id="trn-alias-input" class="trn-alias-input" maxlength="20" ' +
        'autocomplete="off" spellcheck="false" placeholder="Ej. RiverRat" value="' + esc(alias) + '" />' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="save-alias">Guardar</button>' +
        '<button type="button" class="btn btn-sm" data-act="cancel-alias">Cancelar</button>' +
        '</div>' +
        '<p class="trn-alias-hint muted">Único · 3–20 caracteres · letras, números, _ o -</p>' +
        '<p class="trn-alias-status muted" id="trn-alias-status" role="status"></p>' +
        '</div>';
    }
    return '<div class="trn-alias-chip">' +
      '<span>Alias: <strong>' + esc(label) + '</strong></span>' +
      '<button type="button" class="btn btn-sm" data-act="edit-alias">' +
      (alias ? 'Cambiar' : 'Elegir alias') + '</button>' +
      '</div>';
  }

  function saveLobbyAlias(btn) {
    var input = ui.root && ui.root.querySelector('#trn-alias-input');
    var status = ui.root && ui.root.querySelector('#trn-alias-status');
    var raw = input ? input.value : '';
    if (!global.PTProfile || !global.PTProfile.setTournamentAlias) {
      if (status) status.textContent = 'Inicia sesión para guardar el alias.';
      return;
    }
    if (btn) btn.disabled = true;
    if (status) status.textContent = 'Guardando…';
    global.PTProfile.setTournamentAlias(raw).then(function (res) {
      if (btn) btn.disabled = false;
      if (!res || !res.ok) {
        if (status) status.textContent = (res && res.message) || 'No se pudo guardar.';
        return;
      }
      ui.aliasEditorOpen = false;
      paint();
    }).catch(function (e) {
      if (btn) btn.disabled = false;
      if (status) status.textContent = (e && e.message) || 'No se pudo guardar.';
    });
  }

  /**
   * En móvil Safari/Chrome el proceso muere al cambiar de app; sin pagehide
   * el progreso solo vivía en memoria y «Salir y guardar» a veces no llegaba.
   */
  function onLifecyclePersist(opts) {
    opts = opts || {};
    try {
      if (!ui.state || ui.state.status === 'finished') return;
      if (ui.view !== VIEW.table) return;
      /* pagehide/unload: aplicar mano completa pendiente. visibility: solo snapshot
         (el usuario puede volver al popup de fin de mano). */
      if (opts.commit) commitProgressBeforeExit();
      persistActive({ quotaLevel: 1 });
    } catch (eLife) { /* */ }
  }

  try {
    if (typeof global.addEventListener === 'function') {
      global.addEventListener('pagehide', function () { onLifecyclePersist({ commit: true }); });
      global.addEventListener('beforeunload', function () { onLifecyclePersist({ commit: true }); });
      global.addEventListener('visibilitychange', function () {
        try {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
            onLifecyclePersist({ commit: false });
          }
        } catch (eVis) { /* */ }
      });
    }
  } catch (eLifeBind) { /* */ }

  function heroDisplayName(state) {
    try {
      if (global.PTProfile && PTProfile.getTournamentAlias) {
        var alias = PTProfile.getTournamentAlias();
        if (alias) return alias;
      }
    } catch (eAlias) { /* */ }
    try {
      var h = state && global.PTTournamentState && PTTournamentState.hero
        ? PTTournamentState.hero(state) : null;
      if (h && h.name && h.name !== 'Héroe' && h.name !== 'Hero') return h.name;
    } catch (e0) { /* */ }
    try {
      if (global.PTProfile && PTProfile.getTournamentDisplayName) {
        return PTProfile.getTournamentDisplayName({ firstTokenOnly: true, fallback: 'Jugador' });
      }
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
      if (global.PTProfile && PTProfile.getTournamentDisplayName) {
        return PTProfile.getTournamentDisplayName({ firstTokenOnly: true, fallback: 'Jugador' });
      }
      var u = global.PTAuth && PTAuth.getUser ? PTAuth.getUser() : (global.PT_AUTH_USER || null);
      if (u && u.name) return String(u.name).trim().split(/\s+/)[0] || u.name;
    } catch (e) { /* */ }
    return 'Jugador';
  }

  function toastPopupHtml(kind, title, sub) {
    return '<div class="trn-center-popup trn-popup-' + kind + '" data-popup="' + kind + '" role="status">' +
      '<div class="trn-center-popup-card">' +
      '<strong>' + title + '</strong>' +
      (sub ? ('<span>' + sub + '</span>') : '') +
      '</div></div>';
  }

  /** Cartel llamativo de mesa final (sin confeti); se oculta solo. */
  function finalTableBannerHtml(players) {
    var n = Number(players) || 0;
    return '<div class="trn-ft-banner" data-popup="ft" role="status" aria-live="polite">' +
      '<div class="trn-ft-banner-card">' +
      '<p class="trn-ft-banner-kicker">Torneo</p>' +
      '<strong class="trn-ft-banner-title">MESA FINAL</strong>' +
      (n ? ('<span class="trn-ft-banner-sub">' + n + ' jugadores</span>') : '') +
      '</div></div>';
  }

  /** Carteles que congelan la acción de la mesa hasta ocultarse. */
  function isBannerBlocking() {
    var s = ui.state;
    if (!s) return false;
    return !!(s.startBannerPending || s.congratsPending || s.blindUpPending
      || s.finalTablePending || s.itmPending);
  }

  function bannerDurationMs(flag) {
    if (flag === 'start' || flag === 'congrats') return 5000;
    if (flag === 'ft') return 3000;
    return 2000;
  }

  function clearBannerFlag(flag) {
    if (!ui.state) return;
    if (flag === 'blind') ui.state.blindUpPending = null;
    if (flag === 'ft') ui.state.finalTablePending = null;
    if (flag === 'itm') ui.state.itmPending = null;
    if (flag === 'start') ui.state.startBannerPending = null;
    if (flag === 'congrats') ui.state.congratsPending = null;
  }

  function resumeAfterBanner() {
    if (isBannerBlocking()) {
      ensureBannerTimers();
      paint();
      return;
    }
    if (ui.heldFrames && ui.heldFrames.length) {
      var frames = ui.heldFrames;
      var done = ui.heldFramesDone;
      ui.heldFrames = null;
      ui.heldFramesDone = null;
      playFrames(frames, done || paint);
      return;
    }
    if (ui.state && ui.state.status === 'finished' && !ui.state.congratsPending) {
      clearActive();
      setView(VIEW.result);
      return;
    }
    paint();
  }

  function ensureBannerTimers() {
    var s = ui.state;
    if (!s) return;
    if (s.startBannerPending) schedulePopupClear('start', bannerDurationMs('start'));
    if (s.congratsPending) schedulePopupClear('congrats', bannerDurationMs('congrats'));
    if (s.blindUpPending) schedulePopupClear('blind', bannerDurationMs('blind'));
    if (s.finalTablePending) schedulePopupClear('ft', bannerDurationMs('ft'));
    if (s.itmPending) schedulePopupClear('itm', bannerDurationMs('itm'));
  }

  function schedulePopupClear(flag, ms) {
    try {
      if (!ui.popupClearTimers) ui.popupClearTimers = {};
      if (ui.popupClearTimers[flag]) return;
      var delay = ms != null ? ms : bannerDurationMs(flag);
      ui.popupClearTimers[flag] = setTimeout(function () {
        ui.popupClearTimers[flag] = null;
        clearBannerFlag(flag);
        resumeAfterBanner();
      }, delay);
    } catch (e) { /* */ }
  }

  function shouldShowCongrats(state) {
    if (!state || !state.result) return false;
    if (state.result.reason === 'won') return true;
    var place = Number(state.result.place);
    var paid = Number(state.config && state.config.placesPaid) || 0;
    if (!(place > 0)) return false;
    if (paid > 0 && place <= paid) return true;
    return (Number(state.result.prizeEur) || 0) > 0;
  }

  function congratsCopy(state) {
    if (state && state.result && state.result.reason === 'won') {
      return {
        title: '¡Enhorabuena!',
        sub: 'Has ganado el torneo'
      };
    }
    var place = state && state.result ? state.result.place : null;
    return {
      title: '¡Enhorabuena!',
      sub: place != null
        ? ('Has quedado ' + place + 'º · en el dinero')
        : 'Has entrado en premios'
    };
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
        /* Conservar asiento físico: sin él el anillo reordena en animación. */
        physicalSeat: s.physicalSeat != null
          ? s.physicalSeat
          : (fs.physicalSeat != null ? fs.physicalSeat : s.seat),
        seat: s.seat != null
          ? s.seat
          : (fs.seat != null ? fs.seat : s.physicalSeat),
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
      antePot: hand.antePot,
      antePaidCount: hand.antePaidCount,
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
      /* Solo el fotograma manda: hand.holesRevealed ya es true al acabar el
         motor (finishShowdown), y si se OR-ea aquí se ven cartas de all-in
         antes del call de otro villano. */
      holesRevealed: !!(f.holesRevealed || f.kind === 'reveal'),
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
    if (isBannerBlocking()) {
      ui.heldFrames = frames;
      ui.heldFramesDone = done;
      ensureBannerTimers();
      paint();
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

  function planBadgeMeta(plan) {
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') {
      return { t: 'Coach', k: 'plan-coach', plan: 'premium' };
    }
    if (p === 'pro' || p === 'study') {
      return { t: 'Study', k: 'plan-study', plan: 'pro' };
    }
    return { t: 'Gratis', k: 'plan-free', plan: 'free' };
  }

  function lobbyBadges(cfg) {
    var badges = [];
    var kindLabel = cfg.kind === 'sng' ? 'SNG'
      : (cfg.kind === 'spin' ? 'SPIN'
        : (cfg.kind === 'hu' ? 'HU' : 'MTT'));
    badges.push({ t: kindLabel, k: 'kind' });
    badges.push({ t: cfg.seatsPerTable + '-MAX', k: 'max' });
    badges.push({ t: "HOLD'EM NL", k: 'game' });
    if (cfg.kind === 'hu') badges.push({ t: 'x2 ENTRADA', k: 'prize' });
    if (cfg.kind !== 'spin' && cfg.kind !== 'hu' && startingBb(cfg) >= 100) badges.push({ t: 'DEEP', k: 'deep' });
    if (cfg.id === 'easy' || cfg.id === 'spinEasy' || cfg.id === 'huEasy') badges.push({ t: 'FÁCIL', k: 'diff' });
    if (cfg.id === 'medium' || cfg.id === 'spinMedium' || cfg.id === 'huMedium') badges.push({ t: 'MEDIO', k: 'diff' });
    if (cfg.id === 'hard' || cfg.id === 'spinHard' || cfg.id === 'huHard') badges.push({ t: 'DIFÍCIL', k: 'diff' });
    if (cfg.id === 'mttPro' || cfg.id === 'sngPro' || cfg.id === 'spinPro' || cfg.id === 'huPro') {
      badges.push({ t: 'PRO', k: 'diff' });
    }
    var minPlan = cfg.minPlan ||
      (global.PTTournaments && PTTournaments.requiredPlanForPreset
        ? PTTournaments.requiredPlanForPreset(cfg.id)
        : null);
    if (minPlan) badges.push(planBadgeMeta(minPlan));
    return badges;
  }

  function lobbyTone(cfg) {
    if (cfg.id === 'hard' || cfg.id === 'spinHard' || cfg.id === 'huHard' ||
        cfg.id === 'mttPro' || cfg.id === 'sngPro' || cfg.id === 'spinPro' || cfg.id === 'huPro') return 'hard';
    if (cfg.id === 'medium' || cfg.id === 'spinMedium' || cfg.id === 'huMedium') return 'mid';
    if (cfg.id === 'easy' || cfg.id === 'spinEasy' || cfg.id === 'huEasy') return 'easy';
    if (cfg.kind === 'spin') return 'spin';
    if (cfg.kind === 'sng') return 'sng';
    if (cfg.kind === 'hu') return 'sng';
    return 'mtt';
  }

  function gateForPreset(id) {
    if (global.PTTournaments && typeof global.PTTournaments.canPlayPreset === 'function') {
      return global.PTTournaments.canPlayPreset(id);
    }
    return { ok: true };
  }

  function showUpgradePrompt(gate, presetId) {
    ui.upgradePrompt = {
      presetId: presetId || null,
      requiredPlan: gate && gate.requiredPlan,
      requiredPlanLabel: (gate && gate.requiredPlanLabel) ||
        (global.PTTournaments && PTTournaments.planLabel
          ? PTTournaments.planLabel(gate && gate.requiredPlan)
          : 'superior'),
      message: (gate && gate.message) || 'Este torneo requiere un plan superior.'
    };
    paint();
  }

  function openUpgradePlans() {
    ui.upgradePrompt = null;
    if (global.PTBilling && typeof global.PTBilling.showPaywall === 'function') {
      global.PTBilling.showPaywall(
        'tournament_plan',
        'Mejora tu plan para jugar más torneos IA (Study desbloquea la mayoría; Coach incluye difíciles y pro).'
      );
      return;
    }
    if (typeof global.goToTab === 'function') global.goToTab('pricing');
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
    var rank = code.charAt(0) === 'T' ? '10' : code.charAt(0);
    var suit = code.charAt(1);
    var red = suit === 'h' || suit === 'd';
    var suitSym = { c: '♣', d: '♦', h: '♥', s: '♠' }[suit] || suit;
    var sc = (global.Cards && global.Cards.suitClass) ? global.Cards.suitClass(suit) : ('suit-' + suit);
    return '<span class="card' + (red ? ' card-red' : ' card-black') + (sc ? ' ' + sc : '') + '">' +
      '<span class="card-rank">' + esc(rank) + '</span>' +
      '<span class="card-suit">' + suitSym + '</span></span>';
  }

  function roleLabel(id) {
    var L = global.PTTournamentRoleGuess && global.PTTournamentRoleGuess.ROLE_LABELS;
    return (L && L[id]) || id || '—';
  }

  function roleShort(id) {
    var RG = global.PTTournamentRoleGuess;
    if (RG && RG.shortLabel) return RG.shortLabel(id);
    if (RG && RG.ROLE_SHORT && RG.ROLE_SHORT[id]) return RG.ROLE_SHORT[id];
    return roleLabel(id);
  }

  function roleColor(id) {
    var RG = global.PTTournamentRoleGuess;
    if (RG && RG.color) return RG.color(id);
    if (RG && RG.ROLE_COLORS && RG.ROLE_COLORS[id]) return RG.ROLE_COLORS[id];
    return '#6b7280';
  }

  /** Etiqueta de color del tipo de rival (guess o revelado). */
  function roleChipHtml(roleId, opts) {
    opts = opts || {};
    if (!roleId) return '';
    var short = roleShort(roleId);
    var full = roleLabel(roleId);
    var bg = roleColor(roleId);
    var extra = opts.className ? (' ' + opts.className) : '';
    return '<span class="trn-role-chip' + extra + '" data-role="' + esc(roleId) +
      '" style="--trn-role-bg:' + esc(bg) + '" title="' + esc(full) + '">' +
      esc(short) + '</span>';
  }

  function roleLegendHtml() {
    var ids = (global.PTTournamentConfig && global.PTTournamentConfig.ROLE_IDS) ||
      Object.keys((global.PTTournamentRoleGuess && global.PTTournamentRoleGuess.ROLE_LABELS) || {});
    var items = ids.map(function (rid) {
      return '<li class="trn-role-legend-item">' + roleChipHtml(rid) +
        '<span class="trn-role-legend-desc">' + esc(roleLabel(rid)) + '</span></li>';
    }).join('');
    return '<section class="trn-role-legend" aria-label="Leyenda de tipos de rival">' +
      '<h4>Tipos de rival</h4>' +
      '<p class="muted trn-role-legend-hint">Al asignar un tipo a un rival, verás su etiqueta de color en la mesa.</p>' +
      '<ul class="trn-role-legend-list">' + items + '</ul></section>';
  }

  function setView(v) {
    ui.view = v;
    paint();
  }

  function persistActive(opts) {
    opts = opts || {};
    try {
      if (!ui.state) return { ok: false, reason: 'no_state' };
      if (ui.state.status === 'finished') {
        clearActive();
        return { ok: false, reason: 'finished' };
      }
      if (!global.PTTournamentStore || !global.PTTournamentStore.saveActive) {
        return { ok: false, reason: 'no_store' };
      }
      /* Revisión monotónica: gana ante merges cloud con el mismo handIndex. */
      ui.state._progressRev = (Number(ui.state._progressRev) || 0) + 1;
      var wantHand = Number(ui.state.handIndex) || 0;
      var wantRev = ui.state._progressRev;
      var wantId = ui.state.id;
      var res = global.PTTournamentStore.saveActive(ui.state, opts);
      if (!res || !res.ok) {
        res = global.PTTournamentStore.saveActive(ui.state, Object.assign({}, opts, { quotaLevel: 2 }));
      }
      var loaded = global.PTTournamentStore.loadActive && global.PTTournamentStore.loadActive();
      var ok = !!(loaded && loaded.id === wantId &&
        (Number(loaded.handIndex) || 0) >= wantHand &&
        (Number(loaded._progressRev) || 0) >= wantRev);
      if (!ok) {
        try {
          console.warn('[Tournaments] persistActive verify failed, retry', {
            wantHand: wantHand, wantRev: wantRev,
            gotHand: loaded && loaded.handIndex, gotRev: loaded && loaded._progressRev
          });
        } catch (eW) { /* */ }
        res = global.PTTournamentStore.saveActive(ui.state, Object.assign({}, opts, { quotaLevel: 3 }));
        loaded = global.PTTournamentStore.loadActive && global.PTTournamentStore.loadActive();
        ok = !!(loaded && loaded.id === wantId &&
          (Number(loaded.handIndex) || 0) >= wantHand);
      }
      return Object.assign({}, res || { ok: false }, { verified: ok });
    } catch (e) {
      try { console.warn('[Tournaments] persistActive', e); } catch (e2) { /* */ }
      return { ok: false, reason: 'error' };
    }
  }

  /**
   * Antes de salir: si la mano ya terminó (popup de fin) pero el usuario no pulsó
   * Continuar, aplica fichas/handIndex para no perder esa mano al reanudar.
   * No reparte la siguiente mano.
   */
  function commitProgressBeforeExit() {
    var state = ui.state;
    if (!state || state.status === 'finished') return state;
    var hand = state._liveHand;
    if (!hand || hand.stage !== 'complete' || !hand.result) return state;
    try {
      var Runner = global.PTTournamentRunner;
      if (Runner && typeof Runner.applyResults === 'function') {
        Runner.applyResults(state, hand);
        state._liveHand = null;
      }
    } catch (e) {
      try { console.warn('[Tournaments] commitProgressBeforeExit', e); } catch (e2) { /* */ }
    }
    return state;
  }

  function clearActive() {
    try {
      if (global.PTTournamentStore.clearActive) global.PTTournamentStore.clearActive();
    } catch (e) { /* ignore */ }
  }

  function clearPopupTimers() {
    if (!ui.popupClearTimers) return;
    Object.keys(ui.popupClearTimers).forEach(function (k) {
      try {
        if (ui.popupClearTimers[k] && typeof clearTimeout === 'function') {
          clearTimeout(ui.popupClearTimers[k]);
        }
      } catch (eT) { /* */ }
      ui.popupClearTimers[k] = null;
    });
  }

  function resumeActive() {
    var st = global.PTTournamentStore.loadActive && global.PTTournamentStore.loadActive();
    if (!st) return false;
    ui.state = st;
    ui.bustPrompt = false;
    ui.infoOpen = false;
    ui.infoHandlogOpen = false;
    ui.roleModalPlayerId = null;
    ui.exitPrompt = false;
    ui.resumePrompt = false;
    ui.handDetailOpen = false;
    ui.heldFrames = null;
    ui.heldFramesDone = null;
    stopAnim();
    clearPopupTimers();
    /* Si la partida guardada acabó (apply al salir), mostrar resultado. */
    if (st.status === 'finished') {
      clearActive();
      setView(VIEW.result);
      return true;
    }
    /* Continuar no es un arranque: quitar cartel de inicio que bloquearía acciones. */
    if (st.startBannerPending) st.startBannerPending = null;
    /* Tras salir-guardar _liveHand es null; reparte o rehidrata stub roto. */
    try {
      var Runner = global.PTTournamentRunner;
      if (Runner && typeof Runner.ensureLiveHand === 'function') {
        Runner.ensureLiveHand(st);
      } else if (Runner && typeof Runner.beginHand === 'function' && !st._liveHand) {
        Runner.beginHand(st);
      }
    } catch (eResume) {
      try { console.warn('[Tournaments] resume ensureLiveHand', eResume); } catch (e2) { /* */ }
    }
    persistActive();
    var frames = takeFrames();
    ui.view = VIEW.table;
    if (frames) {
      /* Continuar no deja cartel de inicio: animar ya (como animateThen).
         Si solo se aparcan en heldFrames, queda «Saltar acción» sin autoplay. */
      if (isBannerBlocking()) {
        ui.heldFrames = frames;
        ui.heldFramesDone = paint;
        ensureBannerTimers();
        paint();
      } else {
        playFrames(frames, paint);
      }
    } else {
      ensureBannerTimers();
      paint();
    }
    return true;
  }

  function resolveBuyIn(cfg) {
    try {
      var cfgObj = typeof cfg === 'string'
        ? (global.PTTournamentConfig.fromPreset ? PTTournamentConfig.fromPreset(cfg) : null)
        : cfg;
      return Math.round((Number(cfgObj && cfgObj.buyInEur) || 0) * 100) / 100;
    } catch (eCfg) {
      return 0;
    }
  }

  /** Cobra el buy-in o explica que hacen falta Koins suficientes. No arranca el torneo si falla. */
  function chargeBuyInOrExplain(buyIn) {
    var Wallet = global.PTTournamentWallet;
    if (!Wallet || typeof Wallet.canAfford !== 'function' || typeof Wallet.debit !== 'function') {
      try {
        alert('No se pudo comprobar el saldo de Koins. Inténtalo de nuevo.');
      } catch (eA0) { /* */ }
      return false;
    }
    buyIn = Math.round((Number(buyIn) || 0) * 100) / 100;
    if (buyIn <= 0) return true;
    var bal = typeof Wallet.getBalance === 'function' ? Wallet.getBalance() : 0;
    if (!Wallet.canAfford(buyIn)) {
      try {
        alert(
          'Necesitas Koins suficientes para pagar el buy-in. ' +
          'Tienes ' + bal + ' · buy-in ' + buyIn + '.'
        );
      } catch (eA1) { /* */ }
      return false;
    }
    var deb = Wallet.debit(buyIn, { type: 'buyin' });
    if (!deb || !deb.ok) {
      try {
        alert(
          'Necesitas Koins suficientes para pagar el buy-in. ' +
          'Tienes ' + (deb && deb.balance != null ? deb.balance : bal) +
          ' · buy-in ' + buyIn + '.'
        );
      } catch (eA2) { /* */ }
      return false;
    }
    return true;
  }

  function startFromConfig(cfg, opts) {
    opts = opts || {};
    opts.heroName = opts.heroName || resolveHeroNameOpt();
    var presetId = typeof cfg === 'string' ? cfg : (cfg && cfg.id);
    var gate = gateForPreset(presetId || 'custom');
    if (!gate.ok) {
      if (gate.upgrade) showUpgradePrompt(gate, presetId);
      else if (gate.reason === 'custom_role') {
        showUpgradePrompt({
          message: gate.message,
          requiredPlanLabel: 'Coach',
          upgrade: false
        }, presetId);
      }
      return;
    }
    /* Comprobar saldo ANTES de borrar un torneo guardado / arrancar. */
    var buyIn = resolveBuyIn(cfg);
    if (!chargeBuyInOrExplain(buyIn)) return;
    if (!opts.keepActive) clearActive();
    var Runner = global.PTTournamentRunner;
    ui.state = Runner.create(cfg, opts);
    ui.state.startBannerPending = { at: Date.now() };
    ui.bustPrompt = false;
    ui.infoOpen = false;
    ui.infoHandlogOpen = false;
    ui.roleModalPlayerId = null;
    ui.exitPrompt = false;
    ui.resumePrompt = false;
    ui.upgradePrompt = null;
    ui.handDetailOpen = false;
    ui.heldFrames = null;
    ui.heldFramesDone = null;
    stopAnim();
    Runner.beginHand(ui.state);
    persistActive();
    var frames = takeFrames();
    ui.view = VIEW.table;
    if (frames) {
      ui.heldFrames = frames;
      ui.heldFramesDone = paint;
      ensureBannerTimers();
      paint();
    } else {
      ensureBannerTimers();
      paint();
    }
  }

  function startPreset(id) {
    var gate = gateForPreset(id);
    if (!gate.ok) {
      if (gate.upgrade || gate.reason === 'plan') showUpgradePrompt(gate, id);
      else showUpgradePrompt(gate, id);
      return;
    }
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
    var kindLabel = p.kind === 'sng' ? 'SNG'
      : (p.kind === 'spin' ? 'SPIN'
        : (p.kind === 'hu' ? 'HU' : 'MTT'));

    var activeSum = global.PTTournamentStore.activeSummary && global.PTTournamentStore.activeSummary();
    var isActivePreset = !!(activeSum && (activeSum.presetId === p.id || activeSum.id === p.id));
    var gate = gateForPreset(p.id);
    var locked = !gate.ok && !!gate.upgrade;
    var planMeta = planBadgeMeta(p.minPlan || (gate && gate.requiredPlan) || 'free');
    var statusTxt = isActivePreset ? 'En curso' : (locked ? planMeta.t : 'Abierto');
    var lockHint = locked
      ? ('<span class="trn-lobby-lock" title="' + esc(gate.message || '') + '">Requiere ' +
        esc(planMeta.t) + '</span>')
      : '';

    return '<button type="button" class="trn-lobby-row' +
      (isActivePreset ? ' is-active' : '') +
      (locked ? ' is-locked' : '') +
      '" data-preset="' + esc(p.id) +
      '" data-kind="' + esc(p.kind) + '" data-tone="' + esc(tone) + '"' +
      (locked ? ' data-locked="1" aria-description="' + esc(gate.message || '') + '"' : '') + '>' +
      '<div class="trn-lobby-thumb" aria-hidden="true">' +
      '<span class="trn-lobby-thumb-kind">' + esc(kindLabel) + '</span>' +
      '<span class="trn-lobby-thumb-deco">♠</span>' +
      '<span class="trn-lobby-status">' + esc(statusTxt) + '</span>' +
      '</div>' +
      '<div class="trn-lobby-main">' +
      '<div class="trn-lobby-title-row">' +
      '<span class="trn-lobby-title">' + esc(p.name) + '</span>' +
      '<span class="trn-lobby-badges">' + badges + lockHint + '</span>' +
      '</div>' +
      '<div class="trn-lobby-subline">NLHE · Stack ' + p.startingStack +
      ' (' + bb + ' bb) · ' + p.placesPaid + ' paid' +
      (locked ? (' · Requiere ' + esc(planMeta.t)) : '') + '</div>' +
      '<div class="trn-lobby-stats">' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Entrada*</span>' +
      '<span class="trn-stat-val">' + esc(fmtEur(p.buyInEur)) + '</span></div>' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Jugadores</span>' +
      '<span class="trn-stat-val">' + p.entries + '</span></div>' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Premio</span>' +
      '<span class="trn-stat-val trn-stat-prize">' + esc(fmtEur(pool)) + '</span></div>' +
      '</div></div>' +
      '<div class="trn-lobby-desk" aria-hidden="true">' +
      '<span class="trn-desk-start"><strong>' + (locked ? 'Plan' : 'Ahora') +
      '</strong><small>' + (locked ? esc(planMeta.t) : 'al instante') + '</small></span>' +
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
      if (filter === 'spin') return p.kind === 'spin';
      if (filter === 'hu') return p.kind === 'hu';
      return true;
    });
    var hist = (global.PTTournamentStore.list() || []).slice(0, 5);
    var rows = filtered.map(renderLobbyRow).join('');
    if (!rows) {
      rows = '<p class="trn-lobby-empty muted">No hay torneos en este filtro.</p>';
    }

    var histHtml = hist.length
      ? hist.map(function (h) {
        var diff = (h.name || '').split('·')[0].trim() || (h.kind || '').toUpperCase();
        return '<li class="trn-recent-card">' +
          '<span class="trn-recent-name">' + esc(h.name || 'Torneo') + '</span>' +
          '<div class="trn-recent-vals">' +
          '<span class="trn-recent-chip"><strong>' + esc(diff) + '</strong><span>Tipo</span></span>' +
          '<span class="trn-recent-chip"><strong>' + (h.place != null ? (h.place + 'º') : '—') + '</strong><span>Puesto</span></span>' +
          '<span class="trn-recent-chip"><strong>' + esc(fmtEur(h.prizeEur || 0)) + '</strong><span>Premio</span></span>' +
          '<span class="trn-recent-chip"><strong>' + esc(String(h.roi != null ? h.roi : 0)) + '%</strong><span>ROI</span></span>' +
          '</div></li>';
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

    var upgradeModal = '';
    if (ui.upgradePrompt) {
      var up = ui.upgradePrompt;
      var planName = up.requiredPlanLabel || 'superior';
      upgradeModal = '<div class="trn-modal-backdrop trn-upgrade-backdrop" data-act="close-upgrade">' +
        '<div class="trn-modal trn-upgrade-modal" role="dialog" aria-modal="true" data-act="noop">' +
        '<p class="trn-upgrade-kicker">Plan ' + esc(planName) + '</p>' +
        '<h3>Desbloquea este torneo</h3>' +
        '<p class="trn-upgrade-msg">' + esc(up.message) + '</p>' +
        '<ul class="trn-upgrade-perks">' +
        '<li><strong>Gratis</strong> — Spin fácil y HU fácil</li>' +
        '<li><strong>Study</strong> — MTT/SNG/Spins/HU fáciles–medios–difíciles</li>' +
        '<li><strong>Coach</strong> — Difíciles y Pro</li>' +
        '</ul>' +
        '<div class="trn-setup-actions">' +
        '<button type="button" class="btn btn-primary" data-act="upgrade-plans">Ver planes</button>' +
        '<button type="button" class="btn" data-act="close-upgrade">Seguir mirando</button>' +
        '</div></div></div>';
    }

    var canCustom = !(global.PTTournaments && typeof global.PTTournaments.canUseCustom === 'function') ||
      global.PTTournaments.canUseCustom();
    var customBtn = canCustom
      ? '<button type="button" class="btn btn-primary" data-act="custom">Personalizado</button>'
      : '';
    var planBypass = global.PTTournaments && global.PTTournaments.communityPlanBypass &&
      global.PTTournaments.communityPlanBypass();
    var planHint = planBypass
      ? '<p class="trn-lobby-plan-hint">Comunidad · todos los torneos desbloqueados para miembros.</p>'
      : '<p class="trn-lobby-plan-hint">' +
        '<span class="trn-badge trn-badge-plan-free">Gratis</span> Spin/HU fácil · ' +
        '<span class="trn-badge trn-badge-plan-study">Study</span> fáciles, medios y HU difícil · ' +
        '<span class="trn-badge trn-badge-plan-coach">Coach</span> difíciles y pro' +
        '</p>';

    return '<div class="trn-hub trn-lobby">' +
      '<header class="trn-lobby-hero">' +
      '<div class="trn-lobby-hero-bg" aria-hidden="true"></div>' +
      '<div class="trn-lobby-hero-copy">' +
      '<p class="trn-lobby-eyebrow">Lobby · rivales IA</p>' +
      '<h2>TORNEOS</h2>' +
      '<p class="trn-lobby-tagline">Elige un evento, entra a la mesa y caza arquetipos para XP.</p>' +
      '<p class="trn-lobby-free">Torneos gratuitos · la entrada en Koins es ficticia (solo para premios y ROI).</p>' +
      planHint +
      '<div class="trn-wallet-chip">Koins: <strong>' + esc(String(displayKoins())) + '</strong></div>' +
      aliasChipHtml() +
      '</div>' +
      '<div class="trn-lobby-hero-actions">' +
      customBtn +
      '<button type="button" class="btn" data-act="history">Histórico</button>' +
      '<button type="button" class="btn" data-act="general-stats">Estadísticas generales</button>' +
      '</div></header>' +
      activeBanner +
      '<div class="trn-lobby-toolbar">' +
      '<div class="trn-lobby-filters" role="tablist" aria-label="Filtro de torneos">' +
      filterBtn('all', 'Todos') +
      filterBtn('mtt', 'MTT') +
      filterBtn('sng', 'SNG') +
      filterBtn('spin', 'Spins') +
      filterBtn('hu', 'Heads-Up') +
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
      '<h3>Recientes</h3><ul class="trn-lobby-recent-grid">' + histHtml + '</ul>' +
      '</section>' + resumeModal + upgradeModal + '</div>';
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
      onBust: 'simulate',
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
      '<label class="trn-field">Jugadores<input type="number" data-f="entries" min="2" max="180" value="' + d.entries + '"></label>' +
      '<label class="trn-field">Asientos/mesa<select data-f="seatsPerTable">' +
      '<option value="6"' + (d.seatsPerTable === 6 ? ' selected' : '') + '>6</option>' +
      '<option value="9"' + (d.seatsPerTable === 9 ? ' selected' : '') + '>9</option></select></label>' +
      '<label class="trn-field">Formato bounty<select data-f="tournamentType">' +
      '<option value="vanilla"' + (d.tournamentType === 'vanilla' ? ' selected' : '') + '>Vanilla</option>' +
      '<option value="pko"' + (d.tournamentType === 'pko' ? ' selected' : '') + '>PKO</option>' +
      '<option value="mystery"' + (d.tournamentType === 'mystery' ? ' selected' : '') + '>Mystery</option>' +
      '<option value="unknown"' + (!d.tournamentType || d.tournamentType === 'unknown' ? ' selected' : '') + '>No sé</option></select></label>' +
      '<label class="trn-field">Buy-in Koins<input type="number" data-f="buyInEur" min="0.01" step="0.01" value="' + d.buyInEur + '"></label>' +
      '<label class="trn-field">Stack inicial<input type="number" data-f="startingStack" min="100" value="' + d.startingStack + '"></label>' +
      '<label class="trn-field">Puestos pagados<input type="number" data-f="placesPaid" min="1" value="' + d.placesPaid + '"></label>' +
      '<label class="trn-field">Ladder<select data-f="payoutLadder">' +
      ['standard', 'flat', 'topheavy'].map(function (x) {
        return '<option value="' + x + '"' + (d.payoutLadder === x ? ' selected' : '') + '>' + x + '</option>';
      }).join('') + '</select></label>' +
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
    /* 7-handed (común en 9-max tras eliminaciones) necesita 7 slots: con la
       tabla de 6, Math.min(i, 5) apilaba dos villanos en la misma coordenada. */
    if (n <= 3) return mobile ? SEAT_COORDS_MOBILE_3 : SEAT_COORDS_3;
    if (n <= 6) return mobile ? SEAT_COORDS_MOBILE_6 : SEAT_COORDS_6;
    return mobile ? SEAT_COORDS_MOBILE_9 : SEAT_COORDS_9;
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

  function cardCodeOf(c) {
    if (!c) return '';
    if (typeof c === 'string') return c;
    return c.code || (c.r != null && c.s ? String(c.r) + c.s : '');
  }

  function cardCodesOf(cards) {
    return (cards || []).map(cardCodeOf).filter(Boolean);
  }

  /**
   * Equity de una mano concreta vs otras manos conocidas (MC o exacto en river).
   * Misma idea que GTOMultiway.equityVsFixedHands — local para no acoplar el chunk.
   */
  function equityVsFixedHandsLocal(heroCards, board, villainHands, iters) {
    var C = global.Cards;
    if (!C || !C.evaluate || !C.compare) return 0.5;
    var boardArr = board || [];
    var need = Math.max(0, 5 - boardArr.length);
    var dead0 = heroCards.concat(boardArr);
    (villainHands || []).forEach(function (vh) {
      if (vh && vh[0]) dead0.push(vh[0]);
      if (vh && vh[1]) dead0.push(vh[1]);
    });
    var win = 0;
    var tie = 0;
    var n = 0;
    var mc = (C.rng && C.rng.random) ? C.rng.random.bind(C.rng) : Math.random;
    var loops = need === 0 ? 1 : (iters || 120);
    for (var k = 0; k < loops; k++) {
      var full = boardArr;
      if (need > 0) {
        if (!C.shuffledDeckExcluding) break;
        var deck = C.shuffledDeckExcluding(dead0, mc);
        full = boardArr.concat(deck.slice(0, need));
      }
      var hScore = C.evaluate(heroCards.concat(full));
      var bestCmp = 1;
      var ties = 0;
      for (var i = 0; i < villainHands.length; i++) {
        var vScore = C.evaluate(villainHands[i].concat(full));
        var cmp = C.compare(hScore, vScore);
        if (cmp < 0) { bestCmp = -1; break; }
        if (cmp === 0) ties++;
      }
      if (bestCmp >= 0) {
        if (ties > 0) tie += 1 / (ties + 1);
        else win++;
      }
      n++;
    }
    return n ? (win + tie) / n : 0.5;
  }

  /**
   * % de ganar para cada jugador del all-in / showdown (holes revelados).
   * Incluye a todos los contendientes vivos (all-in o con fichas detrás).
   * Se recalcula al crecer el board (reveal → flop → turn → river).
   */
  function allInEquityBySeat(hand) {
    if (!hand || !hand.holesRevealed) return null;
    var contenders = (hand.seats || []).filter(function (s) {
      return s && !s.folded && s.cards && s.cards.length >= 2;
    });
    /* Equity para CADA contendiente del showdown, no solo el héroe. */
    var pool = contenders.length >= 2 ? contenders : [];
    if (pool.length < 2) return null;

    var board = cardCodesOf(hand.board);
    var key = board.join(',') + '|' + pool.map(function (s) { return s.id; }).join(',');
    if (hand._eqCache && hand._eqCache.key === key) return hand._eqCache.map;

    var MW = global.GTOMultiway;
    var iters = board.length >= 5 ? 1 : (board.length >= 4 ? 100 : (board.length >= 3 ? 140 : 100));
    var map = {};
    pool.forEach(function (seat) {
      var hole = cardCodesOf(seat.cards);
      var others = pool.filter(function (o) { return o.id !== seat.id; })
        .map(function (o) { return cardCodesOf(o.cards); });
      var eq;
      if (MW && typeof MW.equityVsFixedHands === 'function') {
        eq = MW.equityVsFixedHands(hole, board, others, iters);
      } else {
        eq = equityVsFixedHandsLocal(hole, board, others, iters);
      }
      map[seat.id] = Math.round((Number(eq) || 0) * 100);
    });
    hand._eqCache = { key: key, map: map };
    return map;
  }

  function equityBadgeHtml(pct) {
    if (pct == null || isNaN(pct)) return '';
    var cls = 'trn-equity-pct';
    if (pct >= 60) cls += ' is-high';
    else if (pct <= 35) cls += ' is-low';
    return '<span class="' + cls + '" title="Probabilidad de ganar">' + esc(String(pct)) + '%</span>';
  }

  /** Badge visible junto a las cartas (no dentro del nombre truncado del asiento). */
  function equityBesideCardsHtml(pct) {
    var badge = equityBadgeHtml(pct);
    if (!badge) return '';
    return '<div class="trn-seat-equity" aria-label="Probabilidad de ganar">' + badge + '</div>';
  }

  function chipTier(bbAmt) {
    if (bbAmt < 1) return 'w';
    if (bbAmt < 3) return 'r';
    if (bbAmt < 8) return 'g';
    if (bbAmt < 20) return 'b';
    if (bbAmt < 50) return 'k';
    return 'p';
  }

  function chipStackHTML(bbAmt) {
    var n = bbAmt < 1 ? 1 : (bbAmt < 3 ? 2 : (bbAmt < 10 ? 3 : 4));
    var tier = chipTier(bbAmt);
    var discs = '';
    for (var i = 0; i < n; i++) discs += '<span class="chip chip-' + tier + '"></span>';
    return '<span class="chip-stack" aria-hidden="true">' + discs + '</span>';
  }

  function chipsToBb(chips, bb) {
    bb = Number(bb) || 1;
    return (Number(chips) || 0) / bb;
  }

  /** Fichas delante del asiento (misma markup que Entrenar). */
  function renderSeatBetHtml(chips, bb, placement) {
    var bbAmt = chipsToBb(chips, bb);
    if (!(bbAmt > 0)) return '';
    return '<div class="seat-bet ' + (placement || 'bet-below') + '" title="Fichas en juego">' +
      chipStackHTML(bbAmt) +
      '<span class="seat-bet-amt">' + esc(fmtBb(chips, bb)) + '</span></div>';
  }

  function renderHeroStreetChipsHtml(chips, bb) {
    var bbAmt = chipsToBb(chips, bb);
    if (!(bbAmt > 0)) return '';
    return '<div class="seat-chips"><span class="seat-chips-street" title="Apuesta en la calle">' +
      chipStackHTML(bbAmt) + esc(fmtBb(chips, bb)) + '</span></div>';
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

  /** Anillo visual por asiento físico (no por rotación del botón). */
  function ringByPhysicalSeat(seats) {
    var list = (seats || []).slice().sort(function (a, b) {
      var pa = a.physicalSeat != null ? a.physicalSeat : (a.seat != null ? a.seat : 999);
      var pb = b.physicalSeat != null ? b.physicalSeat : (b.seat != null ? b.seat : 999);
      if (pa !== pb) return pa - pb;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
    return rotateHeroFirst(list);
  }

  function renderTrainerSeats(hand, state, bb) {
    if (!hand || !hand.seats || !hand.seats.length) return '';
    var ring = ringByPhysicalSeat(hand.seats);
    var coords = seatCoordsFor(ring.length);
    var showdown = hand.stage === 'complete' || !!hand.holesRevealed ||
      !!(ui.anim && ui.anim.frame && (ui.anim.frame.kind === 'reveal' || ui.anim.frame.holesRevealed));
    var equityMap = allInEquityBySeat(hand);
    var html = '';
    ring.forEach(function (s, i) {
      if (s.isHero) return; // héroe va en .hero-area (CSS .seat.hero { display:none })
      var c = coords[Math.min(i, coords.length - 1)] || coords[0];
      var guessed = state.heroGuesses && state.heroGuesses[s.id];
      var cls = ['seat', 'villain'];
      if (s.pos === 'BTN') cls.push('dealer');
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

      /* Solo streetInvested (ciegas/apuestas). El ante va en etiqueta del bote. */
      var betHtml = renderSeatBetHtml(Number(s.streetInvested) || 0, bb, betPlacement(c));

      var eqPct = equityMap && equityMap[s.id] != null ? equityMap[s.id] : null;
      var eqHtml = (showdown && eqPct != null) ? equityBesideCardsHtml(eqPct) : '';
      var villainName = s.name || 'Villano';
      var guessChip = guessed ? ('<div class="seat-role-guess">' + roleChipHtml(guessed) + '</div>') : '';
      var seatStyle = 'top:' + c.top + '%;left:' + c.left + '%';
      if (guessed) seatStyle += ';--trn-role-bg:' + roleColor(guessed);
      html += '<button type="button" class="' + cls.join(' ') + '" style="' + seatStyle +
        '" data-player="' + esc(s.id) + '"' +
        (guessed ? (' data-role-guess="' + esc(guessed) + '"') : '') +
        ' title="' + esc(villainName + ' · ' + (s.pos || '') +
          (eqPct != null ? (' · ' + eqPct + '%') : '') +
          (guessed ? (' · ' + roleLabel(guessed)) : ' — adivinar rol')) + '">' +
        '<div class="seat-body">' +
        '<div class="seat-hole">' + actHtml + cardsHtml + eqHtml + '</div>' +
        '<div class="seat-name">' + (s.allIn ? '<span class="trn-allin-badge">ALL-IN</span> ' : '') +
        esc(villainName) + '</div>' +
        '<div class="seat-pos">' + esc(s.pos || '') + '</div>' +
        guessChip +
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
    var dealerHidden = hero.pos === 'BTN' ? '' : ' hidden';
    /* Solo streetInvested: el ante no se pinta delante del héroe. */
    var streetChips = renderHeroStreetChipsHtml(Number(hero.streetInvested) || 0, bb);
    var equityMap = allInEquityBySeat(hand);
    var heroShowdown = !folded && (hand.stage === 'complete' || !!hand.holesRevealed ||
      !!(ui.anim && ui.anim.frame && (ui.anim.frame.kind === 'reveal' || ui.anim.frame.holesRevealed)));
    var eqPct = equityMap && equityMap[hero.id] != null ? equityMap[hero.id] : null;
    var eqHtml = (heroShowdown && eqPct != null) ? equityBesideCardsHtml(eqPct) : '';
    return '<div class="hero-area' + (folded ? ' is-folded' : '') + '">' +
      act +
      '<div class="hero-chips">' + streetChips +
      '<div class="seat-stack">' + esc(fmtBb(hero.stack, bb)) + '</div></div>' +
      '<div class="hero-label"><span class="hero-avatar" aria-hidden="true"></span>' + esc(heroDisplayName(ui.state)) +
      ' · <span>' + esc(hero.pos || '-') + '</span>' +
      (hero.allIn ? ' <span class="trn-allin-badge">ALL-IN</span>' : '') +
      '<span class="hero-dealer' + dealerHidden + '" title="Dealer">D</span></div>' +
      (cards
        ? ('<div class="hero-cards">' + cards + '</div>' + eqHtml)
        : '<div class="hero-cards hero-cards-folded"></div>') +
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
    var formatLabel = kind === 'sng' ? 'SNG' : (kind === 'spin' ? 'SPIN' : (kind === 'hu' ? 'HU' : 'MTT'));

    var chips = Hud.compactChips(state).map(function (c) {
      return '<span class="' + esc(c.cls) + '" title="' + esc(c.title) + '">' + esc(c.text) + '</span>';
    }).join('');

    var potBb = hand ? fmtBb(hand.pot, bb) : '0 bb';
    var potChipsHtml = '';
    if (hand && Number(hand.pot) > 0) {
      potChipsHtml = '<span class="pot-chips">' + chipStackHTML(chipsToBb(hand.pot, bb)) + '</span>';
    }
    var anteLabelHtml = '';
    if (hand && Number(hand.ante) > 0) {
      var anteSum = Number(hand.antePot);
      if (!(anteSum > 0)) {
        var nAnte = Number(hand.antePaidCount) || (hand.seats ? hand.seats.length : 0);
        anteSum = Math.round(Number(hand.ante) * nAnte * 100) / 100;
      }
      if (anteSum > 0) {
        anteLabelHtml = '<div class="trn-ante-label" title="Antes en el bote">' +
          '<span class="trn-ante-tag">Ante</span> ' +
          '<strong>' + esc(fmtBb(anteSum, bb)) + '</strong></div>';
      }
    }
    var boardHtml = (hand && hand.board && hand.board.length)
      ? hand.board.map(faceCard).join('')
      : '';

    var nSeats = hand && hand.seats ? hand.seats.length
      : (state.config && state.config.seatsPerTable) || 6;
    var tableClass = nSeats <= 3 ? 'table-3max' : (nSeats >= 8 ? 'table-9max' : 'table-6max');

    var seatsHtml = hand
      ? renderTrainerSeats(hand, state, bb)
      : '';

    // Sin mano activa: asientos desde seating del torneo (orden físico estable)
    if (!hand && state.status === 'running') {
      var tableId = (state.tables.find(function (t) { return t.isHeroTable; }) || {}).id;
      var onTable = tableId ? Seat.playersOnTable(state, tableId) : [];
      onTable = onTable.slice().sort(function (a, b) {
        return (a.seat || 0) - (b.seat || 0);
      });
      var fake = onTable.map(function (p) {
        return {
          id: p.id,
          name: p.name,
          isHero: !!p.isHero,
          pos: '',
          physicalSeat: p.seat != null ? p.seat : 0,
          stack: p.stack,
          streetInvested: 0,
          folded: false,
          cards: null
        };
      });
      seatsHtml = renderTrainerSeats({ seats: fake, stage: 'waiting', street: 'preflop', log: [] }, state, bb);
    }

    var actions = '';
    if (isBannerBlocking()) {
      actions = '';
    } else if (ui.anim && ui.anim.playing) {
      actions = '<div class="actions actions-grid actions-grid-1 trn-anim-actions">' +
        '<button type="button" class="btn btn-skip-anim" data-act="skip-anim">Saltar acción</button>' +
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
        roleLegendHtml() +
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
      var roleBtns = roleIds.map(function (rid) {
        return '<button type="button" class="trn-role-opt' + (cur === rid ? ' is-selected' : '') +
          '" data-guess-role="' + esc(rid) + '" data-guess-player="' + esc(pid) +
          '" data-role="' + esc(rid) + '" style="--trn-role-bg:' + esc(roleColor(rid)) + '">' +
          '<span class="trn-role-opt-chip" aria-hidden="true"></span>' +
          '<span class="trn-role-opt-text">' + esc(roleShort(rid)) + '</span>' +
          '<span class="trn-role-opt-sub">' + esc(roleLabel(rid)) + '</span>' +
          '</button>';
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
        (cur ? ('<p class="trn-role-current">Actual: ' + roleChipHtml(cur) + '</p>') : '') +
        '<div class="trn-role-grid" role="group" aria-label="Tipo de rival">' + roleBtns + '</div>' +
        '<button type="button" class="btn" data-act="clear-guess" data-guess-player="' + esc(pid) + '">Quitar guess</button> ' +
        '<button type="button" class="btn" data-act="close-role">Cerrar</button>' +
        '</div></div>';
    }

    var streetLabel = hand ? String(hand.street || '').toUpperCase() : '';
    var heroAlive = St.hero(state);

    var handEndModal = '';
    if (hand && hand.stage === 'complete' && hand.result) {
      try {
        var OtherBg = global.PTTournamentOtherTables;
        if (OtherBg && OtherBg.boostPriority) OtherBg.boostPriority(state);
      } catch (eBoost) { /* */ }
      handEndModal = renderHandEndModal(hand, state, bb);
    }

    var startBanner = '';
    var congratsBanner = '';
    var blindUpBanner = '';
    var ftPopup = '';
    var itmPopup = '';
    if (state.startBannerPending) {
      startBanner = toastPopupHtml(
        'start',
        '¡Comienza el torneo!',
        'Buena suerte, ' + esc(heroDisplayName(state))
      );
    }
    if (state.congratsPending) {
      congratsBanner = toastPopupHtml(
        'congrats',
        esc(state.congratsPending.title || '¡Enhorabuena!'),
        esc(state.congratsPending.sub || '')
      );
    }
    if (state.blindUpPending && !(hand && hand.stage === 'complete') && !state.congratsPending) {
      var bu = state.blindUpPending;
      blindUpBanner = toastPopupHtml(
        'blind',
        'Subida de nivel',
        'Nivel ' + esc(String(bu.level)) + ' · ' + esc(String(bu.sb)) + '/' + esc(String(bu.bb)) +
          (bu.ante ? (' ante ' + esc(String(bu.ante))) : '')
      );
    }
    if (state.finalTablePending && !(hand && hand.stage === 'complete') && !state.congratsPending) {
      ftPopup = finalTableBannerHtml(state.finalTablePending.players);
    }
    if (state.itmPending && !(hand && hand.stage === 'complete') && !state.congratsPending) {
      itmPopup = toastPopupHtml('itm', '¡En el dinero!', 'Has entrado en premios');
    }
    ensureBannerTimers();

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
    return '<div class="trn-table-view trn-play-like' + (isBannerBlocking() ? ' trn-banner-freeze' : '') + '">' +
      startBanner + congratsBanner + blindUpBanner + ftPopup + itmPopup +
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
      anteLabelHtml +
      '<div class="pot">' + potChipsHtml + 'Bote: <strong class="pot-amt">' + esc(potBb) + '</strong></div>' +
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
    var winnerSeats = (hand.seats || []).filter(function (s) {
      return (res.winners || []).indexOf(s.id) >= 0;
    });
    var winnerLabel = winnerSeats.map(function (s) {
      return s.isHero ? heroDisplayName(state) : (s.name || s.pos || s.id);
    }).join(', ');
    if (tied && res.showdown) title = 'Empate en el showdown';
    else if (won && heroDelta > 0.02) title = res.showdown ? 'Ganas en showdown' : 'Ganas la mano';
    else if (!won && winnerLabel) title = winnerLabel + ' gana el bote';
    else if (heroDelta < -0.02) title = res.showdown ? 'Pierdes en showdown' : 'Pierdes la mano';
    else if (won) title = res.showdown ? 'Showdown' : 'Mano terminada';
    else title = 'Mano terminada';

    var analyzed = null;
    try {
      var Bridge = global.PTTournamentSessionBridge;
      if (Bridge && Bridge.handFromTournament) {
        analyzed = Bridge.handFromTournament(hand, Bridge.metaFromState
          ? Bridge.metaFromState(state, {
            handIndex: state && state.handIndex,
            heroName: heroDisplayName(state)
          })
          : {
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
        return !s.folded || (res.holeCards && res.holeCards[s.id]) ||
          (res.winners || []).indexOf(s.id) >= 0 ||
          ((Number(s.stack) || 0) <= 0.02);
      }).map(function (s) {
        var cards = (res.holeCards && res.holeCards[s.id]) || (s.isHero ? s.cards : null);
        var cardsHtml = cards && cards[0]
          ? cards.map(faceCard).join('')
          : '<span class="muted">—</span>';
        var d = Number(deltas[s.id]) || 0;
        var dCls = d > 0 ? 'net-pos' : (d < 0 ? 'net-neg' : '');
        var endStack = s.stack != null ? Number(s.stack)
          : ((Number(s.startStack) || 0) + d);
        var eliminated = endStack <= 0.02;
        var isWin = (res.winners || []).indexOf(s.id) >= 0;
        return '<div class="trn-hand-end-seat' + (s.isHero ? ' is-hero' : '') +
          (isWin ? ' is-winner' : '') +
          (eliminated ? ' is-eliminated' : '') + '">' +
          '<div class="trn-hand-end-name">' + esc(s.isHero ? heroDisplayName(ui.state) : (s.name || s.pos)) +
          ' · ' + esc(s.pos || '') + (isWin ? ' · Gana' : '') + '</div>' +
          '<div class="trn-hand-end-cards">' + cardsHtml + '</div>' +
          '<div class="trn-hand-end-delta ' + dCls + '">' + (d >= 0 ? '+' : '') + esc(fmtBb(d, bb)) + '</div>' +
          (eliminated ? '<div class="hand-end-eliminated">Eliminado</div>' : '') +
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
        rich += '<div class="trn-hand-end-detail hand-end-decisions"><h4>Evaluación GTO (héroe)</h4>';
        if (sum) {
          rich += '<p class="trn-gto-summary">Aciertos ' + sum.hits + '/' + sum.scored +
            ' (' + sum.accuracy + '%) · EV loss ' + sum.totalEvLoss + ' bb' +
            (sum.score != null ? (' · Nota ' + sum.score) : '') + '</p>';
        }
        var HEV2 = global.PTHandEndView;
        if (HEV2 && HEV2.renderDecisionsHtml) {
          rich += HEV2.renderDecisionsHtml(hand.decisions);
        } else {
          rich += '<ol class="trn-gto-decisions">' + hand.decisions.map(function (d) {
            return '<li><span class="trn-gto-class trn-gto-' + esc(d.class || 'unscored') + '">' +
              esc(d.class || 'unscored') + '</span> ' + esc(d.street || '') + ' · ' +
              esc(d.label || d.action || '') +
              (d.evLoss ? (' · −' + d.evLoss + ' bb') : '') +
              (d.mttPhase ? (' · <span class="trn-gto-phase">fase ' + esc(d.mttPhase) +
                (d.stackBB != null ? (' · ' + esc(String(d.stackBB)) + ' bb') : '') + '</span>') : '') +
              '</li>';
          }).join('') + '</ol>';
        }
        rich += '</div>';
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
    var sessionObj = null;
    try {
      if (ui.state && ui.state._savedSession && String(ui.state._savedSession.id) === String(sessionId)) {
        sessionObj = ui.state._savedSession;
      } else if (ui.state && ui.state.sessionId && String(ui.state.sessionId) === String(sessionId) && ui.state.sessionStats) {
        /* Fallback mínimo si aún no hay objeto completo en memoria. */
        sessionObj = null;
      }
    } catch (eSess) { sessionObj = null; }
    try {
      if (typeof global.goToTab === 'function') {
        global.goToTab('sessions', {
          openSessionId: sessionId,
          sessionObj: sessionObj,
          handId: handId || null,
          reviewMode: mode,
          fromTournament: true
        });
        return;
      }
      if (typeof global.openSession === 'function') {
        Promise.resolve(global.openSession(sessionId, sessionObj, {
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
          analyzed = Bridge.handFromTournament(logEntry, Bridge.metaFromState
            ? Bridge.metaFromState(state, {
              handIndex: logEntry.handIndex,
              heroName: heroDisplayName(state)
            })
            : {
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
          analyzed = Bridge.handFromTournament(live, Bridge.metaFromState
            ? Bridge.metaFromState(state, {
              handIndex: state.handIndex,
              heroName: heroDisplayName(state)
            })
            : {
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
        esc(d.name) + ' · real ' + roleChipHtml(d.actual) + ' · guess ' +
        roleChipHtml(d.guess) + (d.ok ? ' ✓' : ' ✗') + '</li>';
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

    var report = r.improvementReport || null;
    if (!report) {
      try {
        var LB = global.PTTournamentLeaksBridge;
        if (LB && LB.buildReport) report = LB.buildReport(state);
      } catch (eRep) { report = null; }
    }
    var improveHtml = renderImprovementReport(report, sessionId);

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
      improveHtml +
      '<div id="ai-coach-tournament" class="trn-result-coach"></div>' +
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

  function renderImprovementReport(report, sessionId) {
    if (!report || (!report.errorCount && !(report.worstHands && report.worstHands.length))) {
      return '<section class="trn-improve panel-inset">' +
        '<h3>Mejora tu juego</h3>' +
        '<p class="muted">Sin errores graves detectados en este torneo. Sigue así.</p>' +
        '</section>';
    }
    var worst = (report.worstHands || []).map(function (h, i) {
      return '<li class="trn-improve-hand">' +
        '<span class="trn-improve-rank">#' + (i + 1) + '</span>' +
        '<span class="trn-improve-hand-main">' +
        '<strong>Mano #' + esc(String(h.handIndex != null ? h.handIndex : '—')) + '</strong>' +
        ' · ' + esc(h.heroCode || '') + ' ' + esc(h.heroPos || '') +
        (h.worstLabel ? (' · ' + esc(h.worstLabel)) : '') +
        (h.worstStreet ? (' · ' + esc(h.worstStreet)) : '') +
        ' · <span class="net-neg">−' + esc(String(h.totalEvLoss)) + ' bb</span>' +
        (h.phaseBucket ? (' · <span class="trn-phase-chip">' + esc(
          (global.PTTournamentLeaksBridge && PTTournamentLeaksBridge.PHASE_BUCKET_LABELS[h.phaseBucket])
            || h.phaseBucket
        ) + '</span>') : '') +
        '</span>' +
        (h.handId
          ? (' <button type="button" class="btn btn-sm" data-act="session-review-hand" data-hand-id="' +
            esc(h.handId) + '"' +
            (sessionId ? (' data-session-id="' + esc(sessionId) + '"') : '') +
            '>Revisar</button>')
          : '') +
        '</li>';
    }).join('') || '<li class="muted">Sin manos destacadas</li>';

    var phase = report.phase && report.phase.dominant;
    var phaseHtml = '';
    if (phase) {
      phaseHtml = '<div class="trn-improve-phase">' +
        '<div class="trn-improve-phase-label">Leak dominante por fase</div>' +
        '<div class="trn-improve-phase-val">' +
        '<span class="trn-phase-chip">' + esc(phase.label) + '</span> · ' +
        esc(String(phase.count)) + ' error' + (phase.count === 1 ? '' : 'es') +
        ' · −' + esc(String(phase.evLoss)) + ' bb' +
        (phase.topLeak
          ? (' · <strong>' + esc(phase.topLeak.label) + '</strong>')
          : '') +
        '</div></div>';
    } else if (report.phase && report.phase.byPhase && report.phase.byPhase.length) {
      phaseHtml = '<ul class="trn-improve-phase-list">' +
        report.phase.byPhase.map(function (p) {
          return '<li><span class="trn-phase-chip">' + esc(p.label) + '</span> · ' +
            p.count + ' · −' + p.evLoss + ' bb' +
            (p.topLeak ? (' · ' + esc(p.topLeak.label)) : '') + '</li>';
        }).join('') + '</ul>';
    }

    var drills = (report.drills || []).map(function (d, i) {
      return '<li class="trn-improve-drill">' +
        '<span>' + esc(d.label) +
        (d.mttPhase ? (' · fase ' + esc(d.mttPhase)) : '') +
        ' · ' + esc(String(d.hands || 25)) + ' manos</span>' +
        '<button type="button" class="btn btn-sm btn-primary" data-act="train-drill" data-drill-idx="' +
        i + '">Entrenar</button></li>';
    }).join('');

    var drillsBlock = drills
      ? ('<div class="trn-improve-drills"><div class="trn-improve-phase-label">Drills recomendados</div>' +
        '<ul class="trn-improve-drill-list">' + drills + '</ul></div>')
      : '';

    return '<section class="trn-improve panel-inset" data-trn-report="1">' +
      '<h3>Mejora tu juego</h3>' +
      '<p class="muted">' + esc(String(report.errorCount || 0)) + ' decisión' +
      ((report.errorCount === 1) ? '' : 'es') + ' imprecisa/error · ' +
      esc(String(report.leakCount || 0)) + ' leak' +
      ((report.leakCount === 1) ? '' : 's') + ' detectado' +
      ((report.leakCount === 1) ? '' : 's') + '</p>' +
      '<div class="trn-improve-block">' +
      '<div class="trn-improve-phase-label">Top peores manos (EV loss)</div>' +
      '<ul class="trn-improve-hands">' + worst + '</ul></div>' +
      phaseHtml +
      drillsBlock +
      '<p class="trn-result-cta trn-improve-cta">' +
      '<button type="button" class="btn btn-primary" data-act="train-tournament-leaks">' +
      'Entrenar mis leaks de este torneo</button></p>' +
      '</section>';
  }

  function loadSessionsForGeneralStats(historyList) {
    var Store = global.Store;
    if (!Store) return [];
    var byId = {};
    var hist = historyList || [];
    hist.forEach(function (h) {
      if (!h || !h.sessionId) return;
      var sid = String(h.sessionId);
      var full = null;
      try {
        full = Store.getSession ? Store.getSession(sid) : null;
      } catch (eGet) { full = null; }
      if (full) byId[sid] = full;
    });
    var all = [];
    try {
      all = Store.getSessions ? Store.getSessions() : [];
    } catch (eList) { all = []; }
    all.forEach(function (stub) {
      if (!stub || !stub.id) return;
      var sid = String(stub.id);
      if (byId[sid]) return;
      var isAi = stub.source === 'tournamentAi' || stub.tournamentAi ||
        (stub.stats && stub.stats.source === 'tournamentAi');
      if (!isAi) return;
      var full = stub;
      try {
        if (Store.getSession) full = Store.getSession(sid) || stub;
      } catch (eFull) { full = stub; }
      byId[sid] = full;
    });
    return Object.keys(byId).map(function (k) { return byId[k]; });
  }

  function fmtHudPct(v) {
    if (v == null || !isFinite(Number(v))) return '—';
    return String(Number(v)) + '%';
  }

  function fmtHudNum(v) {
    if (v == null || !isFinite(Number(v))) return '—';
    return String(Number(v));
  }

  function fmtBbVal(v) {
    if (v == null || !isFinite(Number(v))) return '—';
    var n = Math.round(Number(v) * 100) / 100;
    return String(n);
  }

  function renderGstatStreetBars(accByStreet) {
    var labels = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
    return ['preflop', 'flop', 'turn', 'river'].map(function (st) {
      var pct = accByStreet ? accByStreet[st] : null;
      if (pct == null) {
        return '<div class="street-acc-row"><span class="lbl">' + labels[st] +
          '</span><span class="muted">sin decisiones</span></div>';
      }
      var color = pct >= 75 ? 'var(--green)' : (pct >= 55 ? 'var(--yellow)' : 'var(--red)');
      return '<div class="street-acc-row"><span class="lbl">' + labels[st] + '</span>' +
        '<span class="track"><span class="fill" style="width:' + pct + '%;background:' + color +
        '"></span></span><span class="pct">' + pct + '%</span></div>';
    }).join('');
  }

  function renderGstatDecisionDist(dist, total) {
    total = total || 0;
    function pct(n) { return total ? Math.round((n / total) * 100) : 0; }
    var o = dist || {};
    return '<div class="stats-distribution trn-gstat-dist">' +
      '<div class="dist-bar">' +
      '<span style="width:' + pct(o.optima || 0) + '%;background:var(--green)">' + pct(o.optima || 0) + '%</span>' +
      '<span style="width:' + pct(o.aceptable || 0) + '%;background:var(--yellow)">' + pct(o.aceptable || 0) + '%</span>' +
      '<span style="width:' + pct(o.imprecisa || 0) + '%;background:var(--orange)">' + pct(o.imprecisa || 0) + '%</span>' +
      '<span style="width:' + pct(o.error || 0) + '%;background:var(--red)">' + pct(o.error || 0) + '%</span>' +
      '</div>' +
      '<div class="stats-distribution-legend">' +
      '<span style="color:var(--green)">■ Óptima ' + (o.optima || 0) + '</span>' +
      '<span style="color:var(--yellow)">■ Aceptable ' + (o.aceptable || 0) + '</span>' +
      '<span style="color:var(--orange)">■ Imprecisa ' + (o.imprecisa || 0) + '</span>' +
      '<span style="color:var(--red)">■ Error ' + (o.error || 0) + '</span>' +
      '</div></div>';
  }

  function renderGstatLeaks(leaks) {
    if (!leaks || !leaks.length) {
      return '<p class="muted trn-gstat-empty">Sin fugas destacables en las sesiones de torneo.</p>';
    }
    return '<div class="trn-gstat-leaks">' + leaks.map(function (l, i) {
      var action = l.sessionId
        ? ('<button type="button" class="btn btn-sm" data-act="open-session" data-session-id="' +
          esc(l.sessionId) + '">Ir a la sesión</button>')
        : '';
      return '<div class="trn-gstat-leak-row">' +
        '<div class="trn-gstat-leak-rank">#' + (i + 1) + '</div>' +
        '<div class="trn-gstat-leak-main">' +
        '<div class="trn-gstat-leak-title">' + esc(l.label || l.key) + '</div>' +
        '<div class="muted">' + (l.count || 0) + ' error' + ((l.count === 1) ? '' : 'es') + '</div>' +
        '</div>' +
        (action ? ('<div class="trn-gstat-leak-actions">' + action + '</div>') : '') +
        '</div>';
    }).join('') + '</div>';
  }

  function renderGeneralStats() {
    var list = global.PTTournamentStore.list() || [];
    var Stats = global.PTTournamentStats;
    var sessions = loadSessionsForGeneralStats(list);
    var agg = Stats && Stats.aggregateWithSessionStats
      ? Stats.aggregateWithSessionStats(list, sessions)
      : (Stats && Stats.aggregateFromHistory
        ? Object.assign(Stats.aggregateFromHistory(list), { hasHandStats: false })
        : { n: 0, hasHandStats: false });
    function cell(val, lbl, extraCls) {
      return '<div class="trn-gstat-cell"><div class="trn-gstat-val' +
        (extraCls ? (' ' + extraCls) : '') + '">' + esc(String(val)) +
        '</div><div class="trn-gstat-lbl">' + esc(lbl) + '</div></div>';
    }
    var profitCls = (Number(agg.totalProfit) || 0) >= 0 ? 'net-pos' : 'net-neg';
    var profitStr = ((Number(agg.totalProfit) || 0) >= 0 ? '+' : '') + fmtKoins(agg.totalProfit || 0);
    var kindBits = Object.keys(agg.byKind || {}).map(function (k) {
      return esc(k.toUpperCase()) + ' ' + agg.byKind[k];
    }).join(' · ') || '—';
    var hs = agg.handStats || {};
    var derived = agg.derived || {};
    var dist = derived.dist || {};
    var distTotal = (dist.optima || 0) + (dist.aceptable || 0) + (dist.imprecisa || 0) + (dist.error || 0);
    var netCls = (Number(hs.netBB) || 0) >= 0 ? 'net-pos' : 'net-neg';
    var netStr = hs.netBB != null
      ? (((Number(hs.netBB) || 0) >= 0 ? '+' : '') + fmtBbVal(hs.netBB) + ' bb')
      : '—';
    var gtoHtml;
    if (agg.hasHandStats) {
      gtoHtml =
        '<section class="trn-gstat-section">' +
        '<h3>Resumen GTO</h3>' +
        '<p class="muted">Criterios alineados con Estadísticas → Sesiones (torneos IA).</p>' +
        '<div class="trn-gstat-grid trn-gstat-grid-gto">' +
        cell(hs.accuracy != null ? (hs.accuracy + '%') : '—', 'Acierto') +
        cell(String(hs.sessions || 0), 'Sesiones') +
        cell(String(hs.hands || 0), 'Manos') +
        cell(fmtHudNum(hs.bbPer100), 'bb/100') +
        '</div></section>' +
        '<section class="trn-gstat-section">' +
        '<h3>Acierto por calle</h3>' +
        '<div class="street-acc trn-gstat-streets">' + renderGstatStreetBars(derived.accByStreet) + '</div>' +
        renderGstatDecisionDist(dist, distTotal) +
        '</section>' +
        '<section class="trn-gstat-section">' +
        '<h3>HUD</h3>' +
        '<div class="trn-gstat-grid trn-gstat-grid-hud">' +
        cell(fmtHudPct(hs.vpipPct), 'VPIP') +
        cell(fmtHudPct(hs.pfrPct), 'PFR') +
        cell(fmtHudPct(hs.threeBetPct), '3-Bet') +
        cell(fmtHudPct(hs.cbetFlopPct), 'C-Bet flop') +
        cell(fmtHudPct(hs.wtsdPct), 'WTSD') +
        cell(netStr, 'Resultado real', netCls) +
        cell(hs.evLoss != null ? ('-' + fmtBbVal(hs.evLoss) + ' bb') : '—', 'EV perdido', 'net-neg') +
        '</div></section>' +
        '<section class="trn-gstat-section">' +
        '<h3>Top 5 fugas</h3>' +
        '<p class="muted">Spots con más errores en torneos IA. Abre la sesión para revisar.</p>' +
        renderGstatLeaks(agg.leaks) +
        '</section>';
    } else {
      gtoHtml =
        '<section class="trn-gstat-section">' +
        '<h3>Estadísticas de manos</h3>' +
        '<p class="muted">Aún no hay sesiones GTO vinculadas a estos torneos. ' +
        'Juega un torneo IA hasta el final para ver acierto, HUD y fugas aquí.</p>' +
        '</section>';
    }
    return '<div class="trn-general-stats panel">' +
      '<h2>Estadísticas generales de torneos</h2>' +
      '<p class="muted">Resumen de todos los torneos IA guardados en el histórico.</p>' +
      '<section class="trn-gstat-section">' +
      '<h3>Resultados de torneo</h3>' +
      '<div class="trn-gstat-grid">' +
      cell(agg.n || 0, 'Torneos') +
      cell((agg.winPct != null ? agg.winPct : 0) + '%', 'Victorias') +
      cell((agg.itmPct != null ? agg.itmPct : 0) + '%', 'ITM') +
      cell(agg.avgPlace != null ? agg.avgPlace : '—', 'Puesto medio') +
      '<div class="trn-gstat-cell"><div class="trn-gstat-val ' + profitCls + '">' + profitStr +
      '</div><div class="trn-gstat-lbl">Profit total</div></div>' +
      cell((agg.roiPct != null ? agg.roiPct : 0) + '%', 'ROI global') +
      cell((agg.avgRoleAccuracy != null ? agg.avgRoleAccuracy : 0) + '%', 'Roles (media)') +
      cell(fmtKoins(agg.totalBuyIn || 0), 'Buy-ins') +
      '</div>' +
      '<p class="trn-gstat-kinds muted">Por tipo: ' + kindBits + '</p>' +
      '</section>' +
      gtoHtml +
      '<div class="trn-setup-actions">' +
      '<button type="button" class="btn" data-act="hub">Volver</button>' +
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

  function mountTournamentCoach() {
    if (ui.view !== VIEW.result || !ui.root || !ui.state) return;
    var host = ui.root.querySelector('#ai-coach-tournament');
    if (!host) return;
    var session = null;
    try {
      if (ui.state._savedSession) session = ui.state._savedSession;
      else if (global.PTTournamentSessionBridge && PTTournamentSessionBridge.buildSessionFromTournament) {
        session = PTTournamentSessionBridge.buildSessionFromTournament(ui.state, {
          sessionId: (ui.state.result && ui.state.result.sessionId) || ui.state.sessionId,
          tournamentMeta: {
            place: ui.state.result && ui.state.result.place,
            prizeEur: ui.state.result && ui.state.result.prizeEur,
            stats: ui.state.result && ui.state.result.stats
          }
        });
      }
    } catch (eS) { session = null; }
    if (!session || !(session.hands && session.hands.length)) {
      host.innerHTML = '<p class="muted">ForgeCoach estará disponible cuando haya manos analizadas de este torneo.</p>';
      return;
    }
    if (!global.PTAIReport || typeof global.PTAIReport.mount !== 'function') {
      host.innerHTML = '';
      return;
    }
    try {
      global.PTAIReport.mount(host, {
        scope: 'tournament',
        getHand: function () { return session; },
        getData: function () { return session; },
        persist: {
          kind: 'tournamentSession',
          getSessionId: function () { return session.id; }
        }
      });
    } catch (eM) {
      try { console.warn('[PTTournamentsUI] coach mount', eM); } catch (e2) { /* */ }
    }
  }

  function paint() {
    if (!ui.root) return;
    if (ui.view === VIEW.setup && global.PTTournaments &&
        typeof global.PTTournaments.canUseCustom === 'function' &&
        !global.PTTournaments.canUseCustom()) {
      ui.view = VIEW.hub;
      ui.setupDraft = null;
    }
    var html = '';
    try {
      if (ui.view === VIEW.setup) html = renderSetup();
      else if (ui.view === VIEW.table) html = renderTable();
      else if (ui.view === VIEW.result) html = renderResult() + renderReplayModal();
      else if (ui.view === VIEW.history) html = renderHistory();
      else if (ui.view === VIEW.generalStats) html = renderGeneralStats();
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
    if (ui.view === VIEW.result) mountTournamentCoach();
  }

  /** Anima lo que acaba de resolver el motor y luego cierra el turno. */
  function afterActionAnimated() {
    animateThen(afterAction);
  }

  function afterAction() {
    var state = ui.state;
    if (!state) { paint(); return; }
    if (state.status === 'finished') {
      if (!state.congratsShown && shouldShowCongrats(state)) {
        state.congratsShown = true;
        state.congratsPending = Object.assign({ at: Date.now() }, congratsCopy(state));
        ui.heldFrames = null;
        ui.heldFramesDone = null;
        ensureBannerTimers();
        paint();
        return;
      }
      clearActive();
      setView(VIEW.result);
      return;
    }
    /* Checkpoint al subir de nivel (y FT/ITM): forzar slim+flush para no
       depender solo del «Salir y guardar» en móvil. */
    var milestone = !!(state.blindUpPending || state.finalTablePending || state.itmPending);
    persistActive(milestone ? { quotaLevel: 1 } : {});
    if (milestone) flushTournamentCloud();
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
          if (global.PTTournaments && typeof global.PTTournaments.canUseCustom === 'function' &&
              !global.PTTournaments.canUseCustom()) {
            showUpgradePrompt({
              message: 'Los torneos personalizados solo están disponibles para administradores y managers de comunidad.',
              requiredPlanLabel: 'admin'
            }, 'custom');
            return;
          }
          ui.setupDraft = defaultDraft();
          setView(VIEW.setup);
        } else if (act === 'edit-alias') {
          ui.aliasEditorOpen = true;
          paint();
          var inpEdit = ui.root && ui.root.querySelector('#trn-alias-input');
          if (inpEdit && typeof inpEdit.focus === 'function') {
            try { inpEdit.focus(); inpEdit.select(); } catch (eF) { /* */ }
          }
        } else if (act === 'cancel-alias') {
          ui.aliasEditorOpen = false;
          paint();
        } else if (act === 'save-alias') {
          saveLobbyAlias(btn);
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
          commitProgressBeforeExit();
          var saved = persistActive({ quotaLevel: 1 });
          if (!saved || !saved.ok || saved.verified === false) {
            /* No abandonar la mesa si el snapshot no quedó: en móvil QuotaExceeded
               dejaba el torneo viejo (mano 0) y se perdía el progreso en memoria. */
            try {
              alert(
                'No se pudo guardar el torneo (almacenamiento lleno o error). ' +
                'Sigue en la mesa: libera espacio o inténtalo de nuevo.'
              );
            } catch (eAlert) { /* */ }
            ui.exitPrompt = false;
            paint();
            return;
          }
          flushTournamentCloud();
          clearPopupTimers();
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
        } else if (act === 'close-upgrade') {
          ui.upgradePrompt = null;
          paint();
        } else if (act === 'upgrade-plans') {
          openUpgradePlans();
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
        } else if (act === 'train-tournament-leaks') {
          var repTrain = (ui.state && ui.state.result && ui.state.result.improvementReport) || null;
          if (!repTrain && ui.state && global.PTTournamentLeaksBridge) {
            try { repTrain = PTTournamentLeaksBridge.buildReport(ui.state); } catch (eT) { repTrain = null; }
          }
          if (global.PTTournamentLeaksBridge && PTTournamentLeaksBridge.trainTournamentLeaks) {
            PTTournamentLeaksBridge.trainTournamentLeaks(repTrain || {});
          }
        } else if (act === 'train-drill') {
          var dIdx = Number(btn.getAttribute('data-drill-idx'));
          var repD = (ui.state && ui.state.result && ui.state.result.improvementReport) || null;
          if (!repD && ui.state && global.PTTournamentLeaksBridge) {
            try { repD = PTTournamentLeaksBridge.buildReport(ui.state); } catch (eD) { repD = null; }
          }
          var drill = repD && repD.drills && repD.drills[dIdx];
          if (drill && global.PTTournamentLeaksBridge && PTTournamentLeaksBridge.trainLeak) {
            PTTournamentLeaksBridge.trainLeak(drill);
          } else if (global.PTTournamentLeaksBridge && PTTournamentLeaksBridge.trainTournamentLeaks) {
            PTTournamentLeaksBridge.trainTournamentLeaks(repD || {});
          }
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
        } else if (act === 'general-stats') {
          setView(VIEW.generalStats);
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
        if (isBannerBlocking()) return;
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
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var pid = btn.getAttribute('data-player');
        if (!pid) return;
        ui.roleModalPlayerId = pid;
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
    refresh: function () {
      try {
        if (ui.view === VIEW.hub || ui.view === VIEW.history || ui.view === VIEW.generalStats) {
          ui.resumePrompt = false;
          var latest = global.PTTournamentStore && PTTournamentStore.loadActive
            ? PTTournamentStore.loadActive()
            : null;
          if (latest) ui.state = latest;
        }
        if (ui.root) paint();
      } catch (eR) { /* */ }
    },
    getState: function () { return ui.state; },
    /* Expuesto para tests de estabilidad del anillo visual. */
    ringByPhysicalSeat: ringByPhysicalSeat,
    animHand: animHand,
    setAnimFrame: function (frame) {
      ui.anim = ui.anim || {};
      ui.anim.frame = frame || null;
    },
    /* Fichas de mesa (misma escala que Entrenar) — tests. */
    chipTier: chipTier,
    chipStackHTML: chipStackHTML,
    renderSeatBetHtml: renderSeatBetHtml,
    allInEquityBySeat: allInEquityBySeat,
    equityBadgeHtml: equityBadgeHtml,
    equityBesideCardsHtml: equityBesideCardsHtml,
    renderTrainerSeats: renderTrainerSeats,
    renderHeroArea: renderHeroArea
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
