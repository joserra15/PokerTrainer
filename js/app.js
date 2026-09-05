/*
 * app.js
 * Controlador de la interfaz: orquesta Engine + Store y pinta la mesa.
 */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const fmtBB = (x) => (window.GTOPotMath ? window.GTOPotMath.formatBB(x) : String(Math.round((Number(x) || 0) * 100) / 100));
  function tt(key, vars) {
    return (window.PTI18n && window.PTI18n.t) ? window.PTI18n.t(key, vars) : key;
  }

  /** Incrementar en cada despliegue para comprobar recarga del navegador. */
  const APP_VERSION = window.PT_BUILD || '2.6.0';

  function isLegendaryAdminUser() {
    if (window.PTDemo && window.PTDemo.isActive && window.PTDemo.isActive()) return false;
    const u = window.PTAuth && window.PTAuth.getUser ? window.PTAuth.getUser() : null;
    if (u && u.isAdmin) return true;
    const ent = window.PTEntitlements && window.PTEntitlements.get ? window.PTEntitlements.get() : null;
    if (ent && ent.is_admin) return true;
    return false;
  }

  function legendaryMenuVisible() {
    return isLegendaryAdminUser();
  }

  function refreshLegendaryTabVisibility() {
    var communityHide = false;
    try {
      if (window.PTCommunity && PTCommunity.requireMembership && PTCommunity.requireMembership()) {
        communityHide = true;
      } else if (window.PTCommunity && PTCommunity.config) {
        var cfg = PTCommunity.config();
        if (cfg && cfg.menus && cfg.menus.hide && cfg.menus.hide.indexOf('legendary') >= 0) {
          communityHide = true;
        }
      }
    } catch (e) { /* noop */ }
    const show = !communityHide && legendaryMenuVisible();
    const tab = document.querySelector('.tab[data-tab="legendary"]');
    if (tab) tab.classList.toggle('hidden', !show);
    $$('.home-card-legendary').forEach((el) => el.classList.toggle('hidden', !show));
  }

  function tournamentsMenuVisible() {
    if (window.PTTournaments && typeof window.PTTournaments.menuVisible === 'function') {
      return !!window.PTTournaments.menuVisible();
    }
    return isLegendaryAdminUser();
  }

  function refreshTournamentsTabVisibility() {
    var communityHide = false;
    try {
      if (window.PTCommunity && PTCommunity.requireMembership && PTCommunity.requireMembership()) {
        communityHide = true;
      } else if (window.PTCommunity && PTCommunity.config) {
        var cfg = PTCommunity.config();
        if (cfg && cfg.menus && cfg.menus.hide && cfg.menus.hide.indexOf('tournaments') >= 0) {
          communityHide = true;
        }
      }
    } catch (e) { /* noop */ }
    const show = !communityHide && tournamentsMenuVisible();
    const tab = document.querySelector('.tab[data-tab="tournaments"]');
    if (tab) tab.classList.toggle('hidden', !show);
  }

  const POS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const POS_3 = ['BTN', 'SB', 'BB'];
  const POS_9 = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  // coordenadas (top%, left%) de los asientos; el héroe siempre abajo (índice 0)
  const SEAT_COORDS = [
    { top: 96, left: 50 },
    { top: 80, left: 8 },
    { top: 30, left: 6 },
    { top: 4, left: 38 },
    { top: 4, left: 70 },
    { top: 80, left: 92 }
  ];
  /* Spins / 3-max: héroe abajo, rivales simétricos arriba-izquierda / arriba-derecha. */
  const SEAT_COORDS_3 = [
    { top: 96, left: 50 },
    { top: 18, left: 14 },
    { top: 18, left: 86 }
  ];
  /*
   * 9-max: asientos en elipse equiespaciada (héroe abajo, anillo CCW hacia la izquierda).
   * Evita el cluster CO/BTN arriba-derecha del layout anterior.
   */
  const SEAT_COORDS_9 = [
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
  /* Coordenadas para óvalo horizontal en móvil (más aire en laterales). */
  const SEAT_COORDS_MOBILE = [
    { top: 94, left: 50 },
    { top: 70, left: 3 },
    { top: 32, left: 2 },
    { top: 5, left: 22 },
    { top: 5, left: 78 },
    { top: 32, left: 98 }
  ];
  const SEAT_COORDS_MOBILE_3 = [
    { top: 94, left: 50 },
    { top: 16, left: 10 },
    { top: 16, left: 90 }
  ];
  const SEAT_COORDS_MOBILE_9 = [
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

  let hand = null;
  let pendingForce = null;       // escenario forzado (repaso de errores)
  let repeatErrorsMode = false;
  let leakReplayQueue = [];
  let latestTrainerStatsLeaks = [];
  let latestSessionStatsLeaks = [];
  let sessionsListTab = 'cash';
  let autoImportState = { handle: null, timer: null, seen: {} };

  function emptyByStreet() {
    return {
      preflop: { n: 0, good: 0 },
      flop: { n: 0, good: 0 },
      turn: { n: 0, good: 0 },
      river: { n: 0, good: 0 }
    };
  }

  let session = { hands: 0, net: 0, evLossBB: 0, decisions: 0, good: 0, handScoreSum: 0, byStreet: emptyByStreet() };
  let homeBootDone = false;
  let homeBootRendered = false;
  let homeBootCloudSettled = false;
  const HOME_BOOT_MAX_MS = 12000;

  function isHomeBootCloudPending() {
    return document.body.classList.contains('pt-cloud-syncing') && !homeBootCloudSettled;
  }

  function maybeFinishHomeBoot(force) {
    if (homeBootDone) return;
    if (!homeBootRendered) return;
    if (!force && isHomeBootCloudPending()) return;
    finishHomeBoot();
  }

  function scheduleHomeBootFallback() {
    setTimeout(function () {
      if (!homeBootDone) {
        console.warn('[PT] home boot timeout — mostrando inicio');
        finishHomeBoot();
      }
    }, HOME_BOOT_MAX_MS);
  }

  function stopHomeBootTimer() {
    if (window._ptHomeBootTimer) {
      clearInterval(window._ptHomeBootTimer);
      window._ptHomeBootTimer = null;
    }
  }

  function setHomeBoot(visible) {
    const boot = $('#home-boot');
    const page = $('#home-page');
    if (boot) {
      boot.classList.toggle('hidden', !visible);
      boot.setAttribute('aria-busy', visible ? 'true' : 'false');
    }
    if (page) page.classList.toggle('home-page--boot', !!visible);
    document.body.classList.toggle('home-boot-active', !!visible);
    if (!visible) stopHomeBootTimer();
  }

  function finishHomeBoot() {
    if (homeBootDone) return;
    homeBootDone = true;
    setHomeBoot(false);
  }

  // ---------- Inicio ----------
  function setPlayBoot(visible, message) {
    const el = $('#play-boot');
    if (!el) return;
    if (message) {
      const msg = el.querySelector('.play-boot-msg');
      if (msg) msg.textContent = message;
    }
    el.classList.toggle('hidden', !visible);
  }

  let startingHand = false;

  function setPlayTableLoading(visible) {
    const wrap = document.querySelector('#play-active .table-wrap');
    const el = $('#play-table-loading');
    if (wrap) wrap.classList.toggle('is-loading-hand', !!visible);
    if (el) {
      el.classList.toggle('hidden', !visible);
      el.setAttribute('aria-busy', visible ? 'true' : 'false');
    }
  }

  function setPlayHandButtonsDisabled(disabled) {
    ['#new-hand', '#replay-hand', '#new-session', '#play-start', '#next-after', '#replay-after', '#new-session-after']
      .forEach(function (sel) {
        const btn = $(sel);
        if (btn) btn.disabled = !!disabled;
      });
  }

  function yieldToPaint() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () { requestAnimationFrame(resolve); });
    });
  }

  let playSessionConfig = null;
  let replayPlayConfig = null;

  function setPlayTableActiveClass(active) {
    document.body.classList.toggle('play-table-active', !!active);
  }

  function showPlaySetup() {
    const setup = $('#play-setup');
    const active = $('#play-active');
    if (setup) setup.classList.remove('hidden');
    if (active) {
      active.classList.add('hidden');
      active.classList.remove('is-legendary-session');
    }
    setPlayTableActiveClass(false);
  }

  function showPlayTable() {
    const setup = $('#play-setup');
    const active = $('#play-active');
    if (setup) setup.classList.add('hidden');
    if (active) active.classList.remove('hidden');
    setPlayTableActiveClass(true);
    const cfg = (hand && hand.playConfig) || playSessionConfig;
    if (active) {
      active.classList.toggle('is-legendary-session', !!(cfg && cfg.legendaryMode));
    }
    if (!(cfg && cfg.legendaryMode)) {
      applyTableTheme((cfg && cfg.tableTheme) || loadTableTheme());
    }
    requestAnimationFrame(syncPlayMobileStage);
  }

  function scrollPlayToTop() {
    const target = $('#tab-play') || $('#play-active') || $('#play-setup');
    if (target && target.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function activeFormatHub() {
    const el = $('#setup-format-hub .sessions-kind-tab.active, #setup-format-hub .setup-chip.active');
    return el && el.dataset.val ? el.dataset.val : 'cash';
  }

  function syncFormatHubUI(hub) {
    const h = hub || activeFormatHub();
    const hubBox = $('#setup-format-hub');
    if (hubBox) {
      hubBox.querySelectorAll('[data-val]').forEach((btn) => {
        const on = btn.dataset.val === h;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }
    $$('#setup-game-type .setup-chip').forEach((chip) => {
      const chipHub = chip.dataset.hub || 'cash';
      const show = chipHub === h;
      chip.hidden = !show;
      if (!show) chip.classList.remove('active');
    });
    const visibleGt = $$('#setup-game-type .setup-chip').filter((c) => !c.hidden);
    if (visibleGt.length && !visibleGt.some((c) => c.classList.contains('active'))) {
      visibleGt[0].classList.add('active');
    }
    const phaseGroup = $('#setup-group-phase');
    const payoutGroup = $('#setup-group-spin-payout');
    const mttStructGroup = $('#setup-group-mtt-structure');
    const rakeGroup = $('#setup-group-rake');
    if (phaseGroup) phaseGroup.hidden = h === 'cash';
    if (payoutGroup) payoutGroup.hidden = h !== 'spin';
    if (mttStructGroup) mttStructGroup.hidden = h !== 'mtt';
    if (rakeGroup) rakeGroup.hidden = h !== 'cash';
    if (h === 'mtt') syncMttStructureUI();

    $$('#setup-scenario .setup-chip').forEach((chip) => {
      const v = chip.dataset.val;
      let show = true;
      if (chip.hasAttribute('data-sc-spin') || chip.hasAttribute('data-sc-mtt') || chip.hasAttribute('data-sc-cash')) {
        show = (h === 'cash' && chip.hasAttribute('data-sc-cash'))
          || (h === 'spin' && chip.hasAttribute('data-sc-spin'))
          || (h === 'mtt' && chip.hasAttribute('data-sc-mtt'));
        // Common scenarios without exclusivity attrs stay visible
        if (!chip.hasAttribute('data-sc-cash') && !chip.hasAttribute('data-sc-spin') && !chip.hasAttribute('data-sc-mtt')) show = true;
      }
      if (v === 'push' || v === 'steal') show = h === 'spin' || h === 'mtt';
      if (v === '4bet' || v === 'squeeze') show = h !== 'spin';
      if (v === 'iso' || v === 'cold4bet') show = h === 'cash';
      if (v === 'multiway') show = h === 'cash' || h === 'mtt';
      chip.hidden = !show;
      if (!show) chip.classList.remove('active');
    });
    const visSc = $$('#setup-scenario .setup-chip').filter((c) => !c.hidden);
    if (visSc.length && !visSc.some((c) => c.classList.contains('active'))) {
      visSc[0].classList.add('active');
    }
    syncPhaseStackUI(h);
    syncMultiwayTypeUI();
    renderHeroPosChips();
  }

  /** Filtra/ajusta stack del héroe según hub + fase + escenario (push/steal). */
  function syncPhaseStackUI(hub) {
    const h = hub || activeFormatHub();
    const Tax = window.PTFormatTaxonomy;
    const phaseEl = $('#setup-mtt-phase .setup-chip.active');
    const scEl = $('#setup-scenario .setup-chip.active:not([hidden])') || $('#setup-scenario .setup-chip.active');
    const phase = (h !== 'cash' && phaseEl) ? phaseEl.dataset.val : 'auto';
    const scenario = scEl ? scEl.dataset.val : 'random';
    const locked = Tax && Tax.stackSelectionLocked
      ? Tax.stackSelectionLocked(h, phase, scenario)
      : false;
    const allowed = Tax && Tax.allowedStackDepths
      ? Tax.allowedStackDepths(h, phase, scenario)
      : null;

    $$('#setup-stack-depth .setup-chip').forEach((chip) => {
      let show = true;
      if (h === 'cash') {
        show = chip.hasAttribute('data-stack-cash')
          || (!chip.hasAttribute('data-stack-spin') && !chip.hasAttribute('data-stack-mtt'));
      } else if (h === 'spin') {
        show = chip.hasAttribute('data-stack-spin');
      } else if (h === 'mtt') {
        show = chip.hasAttribute('data-stack-mtt')
          || chip.dataset.val === 'bb200'
          || chip.dataset.val === 'bb100'
          || chip.dataset.val === 'bb50';
      }
      if (h === 'cash' && (chip.dataset.val === 'bb40' || chip.dataset.val === 'bb20'
        || chip.dataset.val === 'bb15' || chip.dataset.val === 'bb10' || chip.dataset.val === 'random')) show = false;
      if (h === 'spin' && (chip.dataset.val === 'bb200' || chip.dataset.val === 'bb100'
        || chip.dataset.val === 'bb50' || chip.dataset.val === 'bb40')) show = false;
      if (allowed && show) {
        if (chip.dataset.val === 'random') {
          show = allowed.indexOf('random') >= 0;
        } else {
          show = allowed.indexOf(chip.dataset.val) >= 0;
        }
      }
      chip.hidden = !show;
      chip.disabled = !!(locked && show && allowed && allowed.length <= 1);
      if (!show) chip.classList.remove('active');
    });

    const visStack = $$('#setup-stack-depth .setup-chip').filter((c) => !c.hidden);
    const activeOk = visStack.some((c) => c.classList.contains('active'));
    if (visStack.length && !activeOk) {
      let prefer = h === 'spin' ? 'bb25' : (h === 'mtt' ? 'bb50' : 'bb100');
      if (Tax && Tax.clampStackDepth) {
        const cur = $('#setup-stack-depth .setup-chip.active');
        prefer = Tax.clampStackDepth(h, phase, scenario, cur ? cur.dataset.val : prefer);
      } else if (allowed && allowed.length) {
        prefer = allowed[0];
      }
      const prefChip = visStack.find((c) => c.dataset.val === prefer) || visStack[0];
      $$('#setup-stack-depth .setup-chip').forEach((c) => c.classList.remove('active'));
      prefChip.classList.add('active');
    } else if (visStack.length && locked && Tax && Tax.clampStackDepth) {
      const cur = visStack.find((c) => c.classList.contains('active'));
      const clamped = Tax.clampStackDepth(h, phase, scenario, cur ? cur.dataset.val : null);
      if (!cur || cur.dataset.val !== clamped) {
        const prefChip = visStack.find((c) => c.dataset.val === clamped) || visStack[0];
        $$('#setup-stack-depth .setup-chip').forEach((c) => c.classList.remove('active'));
        prefChip.classList.add('active');
      }
    }

    const stackGroup = $('#setup-group-stack');
    if (stackGroup) {
      const fullyLocked = !!(locked && h !== 'cash' && allowed && allowed.length <= 1);
      stackGroup.classList.toggle('is-stack-locked', fullyLocked);
      stackGroup.setAttribute('aria-disabled', fullyLocked ? 'true' : 'false');
    }
    const hint = $('#setup-stack-hint');
    if (hint) {
      if (h === 'cash') {
        hint.textContent = 'Los villanos reciben un stack aleatorio cercano al tuyo.';
      } else if (scenario === 'push') {
        hint.textContent = 'Push/fold fija el stack en ~10 bb (zona shove/fold).';
      } else if (scenario === 'steal') {
        hint.textContent = 'Steal usa stacks de ~15–25 bb; elige solo dentro de esa banda.';
      } else if (phase && phase !== 'auto') {
        hint.textContent = 'Con fase fija el stack se ajusta solo a esa profundidad (no se configura a mano).';
      } else {
        hint.textContent = 'Con fase Auto eliges el stack o «Aleatorio» (cambia por mano). Early/Mid/Short/Push fijan el stack automáticamente.';
      }
    }
  }

  function syncMultiwayTypeUI() {
    const wrap = $('#setup-multiway-type-wrap');
    if (!wrap) return;
    const scEl = $('#setup-scenario .setup-chip.active:not([hidden])') || $('#setup-scenario .setup-chip.active');
    const isMw = scEl && scEl.dataset.val === 'multiway';
    wrap.hidden = !isMw;
  }

  /** Muestra/oculta campos de estructura MTT y rellena defaults del preset. */
  function syncMttStructureUI(opts) {
    const group = $('#setup-group-mtt-structure');
    if (!group || group.hidden) return;
    const Tax = window.PTFormatTaxonomy;
    const sitEl = $('#setup-mtt-structure .setup-chip.active');
    const sit = sitEl ? sitEl.dataset.val : 'auto';
    const isAuto = sit === 'auto';
    const isCustom = sit === 'custom';
    // Quedan/pagan: al elegir burbuja/ITM/FT/custom. Entradas: siempre (premio ≈ BI × entradas).
    const showIcmFields = !isAuto;
    const entriesWrap = $('#setup-mtt-entries-wrap');
    const leftWrap = $('#setup-mtt-players-left-wrap');
    const paidWrap = $('#setup-mtt-places-paid-wrap');
    const presetBox = $('#setup-mtt-payout-preset');
    if (entriesWrap) entriesWrap.hidden = false;
    if (leftWrap) leftWrap.hidden = !showIcmFields;
    if (paidWrap) paidWrap.hidden = !showIcmFields;
    if (presetBox) presetBox.hidden = !isCustom;

    const fillDefaults = !(opts && opts.skipDefaults);
    if (fillDefaults && Tax && Tax.structureFromSituation && sit !== 'auto' && sit !== 'custom') {
      const biEl = $('#setup-mtt-buyin');
      const biKeep = biEl && biEl.value !== '' ? Number(biEl.value) : undefined;
      const def = Tax.structureFromSituation(sit, biKeep);
      if (def) {
        const leftEl = $('#setup-mtt-players-left');
        const paidEl = $('#setup-mtt-places-paid');
        const entriesEl = $('#setup-mtt-entries');
        if (leftEl && def.playersLeft != null) leftEl.value = String(def.playersLeft);
        if (paidEl && def.placesPaid != null) paidEl.value = String(def.placesPaid);
        if (entriesEl && def.entries != null) entriesEl.value = String(def.entries);
        if (biEl && def.buyIn != null && (biEl.value === '' || (opts && opts.forceBuyIn))) {
          biEl.value = String(def.buyIn);
        }
        const preset = def.mttPayoutPreset || 'standard';
        $$('#setup-mtt-payout-preset .setup-chip').forEach((c) => {
          c.classList.toggle('active', c.dataset.val === preset);
        });
      }
    }

    const hint = $('#setup-mtt-structure-hint');
    if (hint) {
      if (sit === 'auto') {
        hint.textContent = 'Según fase: en Burbuja/Short/Push se aplica ICM lite. Puedes fijar entradas/pagan para estimar el prize pool (buy-in × entradas) sin forzar burbuja.';
      } else if (sit === 'bubble') {
        hint.textContent = 'Burbuja: ajusta quedan/pagan y entradas. Prize pool ≈ buy-in × entradas.';
      } else if (sit === 'mincash') {
        hint.textContent = 'ITM: todos los remaining pagan; edita «pagan» y entradas para simular el prize pool.';
      } else if (sit === 'ft9') {
        hint.textContent = 'Final table lite: 9 left. Edita buy-in/entradas/pagan para estimar premios.';
      } else {
        hint.textContent = 'Personalizado: entradas, quedan, pagan y curva. Buy-in × entradas ≈ prize pool.';
      }
    }
    updateMttPrizeHint();
  }

  function updateMttPrizeHint() {
    const el = $('#setup-mtt-prize-hint');
    if (!el) return;
    const Tax = window.PTFormatTaxonomy;
    const bi = Number(($('#setup-mtt-buyin') || {}).value);
    const entries = Number(($('#setup-mtt-entries') || {}).value);
    const paid = Number(($('#setup-mtt-places-paid') || {}).value);
    const left = Number(($('#setup-mtt-players-left') || {}).value);
    const cfg = {
      buyIn: bi > 0 ? bi : null,
      entries: entries > 0 ? entries : null,
      placesPaid: paid > 0 ? paid : null,
      playersLeft: left > 0 ? left : null,
      mttPayoutPreset: (($('#setup-mtt-payout-preset .setup-chip.active') || {}).dataset || {}).val || 'standard'
    };
    const pool = Tax && Tax.estimatePrizePool ? Tax.estimatePrizePool(cfg) : null;
    const prizes = Tax && Tax.estimatePlacePrizes ? Tax.estimatePlacePrizes(cfg) : null;
    if (pool == null) {
      el.hidden = true;
      return;
    }
    let txt = 'Prize pool est. €' + pool;
    if (prizes && prizes[0]) txt += ' · 1º ≈ €' + prizes[0].amount;
    if (prizes && prizes.length > 1) txt += ' · min-cash ≈ €' + prizes[prizes.length - 1].amount;
    el.textContent = txt;
    el.hidden = false;
  }

  function readMttStructureFromSetup() {
    const group = $('#setup-group-mtt-structure');
    if (!group || group.hidden) {
      return {
        buyIn: null,
        playersLeft: null,
        placesPaid: null,
        entries: null,
        mttPayoutPreset: 'standard',
        mttStructureSituation: null
      };
    }
    const sitEl = $('#setup-mtt-structure .setup-chip.active');
    const sit = sitEl ? sitEl.dataset.val : 'auto';
    const biEl = $('#setup-mtt-buyin');
    const leftEl = $('#setup-mtt-players-left');
    const paidEl = $('#setup-mtt-places-paid');
    const entriesEl = $('#setup-mtt-entries');
    const presetEl = $('#setup-mtt-payout-preset .setup-chip.active');
    const buyIn = biEl && biEl.value !== '' ? Number(biEl.value) : null;
    const left = leftEl && leftEl.value !== '' ? Number(leftEl.value) : null;
    const paid = paidEl && paidEl.value !== '' ? Number(paidEl.value) : null;
    const entries = entriesEl && entriesEl.value !== '' ? Number(entriesEl.value) : null;
    if (sit === 'auto') {
      // Auto: no forzar ICM con defaults del form (left/paid). Entradas sí para prize hint;
      // BI lo resuelve play-config según fase (mid/early sin estructura → sin BI en HUD).
      return {
        mttStructureSituation: 'auto',
        buyIn: null,
        playersLeft: null,
        placesPaid: null,
        entries: entries,
        mttPayoutPreset: null
      };
    }
    // Presets y custom: leer campos editables (pagan/quedan/entradas).
    return {
      mttStructureSituation: sit,
      buyIn: buyIn,
      playersLeft: left,
      placesPaid: paid,
      entries: entries,
      mttPayoutPreset: sit === 'custom'
        ? (presetEl ? presetEl.dataset.val : 'standard')
        : ((window.PTFormatTaxonomy && window.PTFormatTaxonomy.MTT_STRUCTURE_DEFAULTS
          && window.PTFormatTaxonomy.MTT_STRUCTURE_DEFAULTS[sit]
          && window.PTFormatTaxonomy.MTT_STRUCTURE_DEFAULTS[sit].mttPayoutPreset) || 'standard')
    };
  }

  function readPlayConfig() {
    const PC = window.PTPlayConfig;
    if (!PC) return null;
    const hub = activeFormatHub();
    const gtEl = $('#setup-game-type .setup-chip.active:not([hidden])') || $('#setup-game-type .setup-chip.active');
    const sdEl = $('#setup-stack-depth .setup-chip.active:not([hidden])') || $('#setup-stack-depth .setup-chip.active');
    const scEl = $('#setup-scenario .setup-chip.active:not([hidden])') || $('#setup-scenario .setup-chip.active');
    const posEl = $('#setup-hero-pos .setup-chip.active');
    const hrEl = $('#setup-hand-range .setup-chip.active');
    const vlEl = $('#setup-villain-level .setup-chip.active');
    const vtEl = $('#setup-villain-type .setup-chip.active');
    const smEl = $('#setup-score-mode .setup-chip.active');
    const stEl = $('#setup-practice-street .setup-chip.active');
    const phaseEl = $('#setup-mtt-phase .setup-chip.active');
    const payoutEl = $('#setup-spin-payout .setup-chip.active');
    const thEl = $('#setup-table-theme .setup-chip.active');
    const htEl = $('#setup-hands-target .setup-chip.active');
    const mwPotEl = $('#setup-multiway-pot-type .setup-chip.active');
    const openSizeEl = $('#setup-open-size .setup-chip.active');
    const laEl = $('#setup-live-advisor');
    const modeEl = $('#setup-advisor-mode .setup-chip.active');
    const thrEl = $('#setup-serious-threshold');
    const hideAlEl = $('#setup-hide-action-line');
    const rakeEl = $('#setup-rake-mode .setup-chip.active');
    const rakePctEl = $('#setup-rake-pct');
    const rakeCapEl = $('#setup-rake-cap');
    let advisorMode = 'always';
    let seriousEvThreshold = 0.5;
    if (window.PTLiveAdvisor) {
      advisorMode = PTLiveAdvisor.loadMode ? PTLiveAdvisor.loadMode() : 'always';
      seriousEvThreshold = PTLiveAdvisor.loadThreshold ? PTLiveAdvisor.loadThreshold() : 0.5;
    }
    if (modeEl && modeEl.dataset.val) advisorMode = modeEl.dataset.val === 'serious' ? 'serious' : 'always';
    if (thrEl && thrEl.value !== '') seriousEvThreshold = Number(thrEl.value);
    let hideActionLine = false;
    if (hideAlEl) hideActionLine = !!hideAlEl.checked;
    else if (window.PTActionLine && PTActionLine.loadHidePreference) {
      hideActionLine = !!PTActionLine.loadHidePreference();
    }
    let rakeMode = rakeEl ? rakeEl.dataset.val : 'none';
    let rakePct = rakePctEl && rakePctEl.value !== '' ? Number(rakePctEl.value) : 5;
    let rakeCapBB = rakeCapEl && rakeCapEl.value !== '' ? Number(rakeCapEl.value) : 3;
    if (!rakeMode) {
      const prefs = PC.loadRakePrefs ? PC.loadRakePrefs() : null;
      if (prefs) {
        rakeMode = prefs.rakeMode || 'none';
        if (prefs.rakePct != null) rakePct = Number(prefs.rakePct);
        if (prefs.rakeCapBB != null) rakeCapBB = Number(prefs.rakeCapBB);
      }
    }
    const Tax = window.PTFormatTaxonomy;
    let gameType = gtEl ? gtEl.dataset.val : 'cash6';
    if (hub === 'spin') gameType = 'spin3';
    if (hub === 'mtt') gameType = 'mtt';
    if (hub === 'cash' && gameType !== 'cash6' && gameType !== 'cash9') gameType = 'cash6';
    const mttStruct = hub === 'mtt' ? readMttStructureFromSetup() : {
      buyIn: null, playersLeft: null, placesPaid: null, entries: null,
      mttPayoutPreset: 'standard', mttStructureSituation: null
    };
    return PC.normalize({
      formatHub: hub,
      gameType: gameType,
      stackDepth: sdEl ? sdEl.dataset.val : (hub === 'spin' ? 'bb25' : 'bb100'),
      scenario: scEl ? scEl.dataset.val : 'random',
      heroPos: posEl ? posEl.dataset.val : 'random',
      handRange: hrEl ? hrEl.dataset.val : 'random',
      villainLevel: vlEl ? vlEl.dataset.val : 'pro',
      villainType: vtEl ? vtEl.dataset.val : 'random',
      scoreMode: smEl ? smEl.dataset.val : 'gto',
      practiceStreet: stEl ? stEl.dataset.val : 'random',
      // Faroles (hacer/cazar) ocultos en el entrenador: siempre mixed.
      practiceIntent: 'mixed',
      mttPhase: phaseEl ? phaseEl.dataset.val : 'auto',
      spinPayout: payoutEl ? payoutEl.dataset.val : '2x',
      buyIn: mttStruct.buyIn,
      playersLeft: mttStruct.playersLeft,
      placesPaid: mttStruct.placesPaid,
      entries: mttStruct.entries,
      mttPayoutPreset: mttStruct.mttPayoutPreset,
      mttStructureSituation: mttStruct.mttStructureSituation,
      anteBB: Tax && hub !== 'cash' ? null : 0,
      tableTheme: thEl ? thEl.dataset.val : loadTableTheme(),
      handsTarget: htEl ? Number(htEl.dataset.val) || 0 : 0,
      liveAdvisor: laEl ? laEl.checked : false,
      advisorMode: advisorMode,
      seriousEvThreshold: seriousEvThreshold,
      hideActionLine: hideActionLine,
      rakeMode: hub === 'cash' ? (rakeMode || 'none') : 'none',
      rakePct: rakePct,
      rakeCapBB: rakeCapBB,
      allowMultiway: true,
      multiwayPotType: mwPotEl ? mwPotEl.dataset.val : 'any',
      actionMode: readActionModeFromSetup(),
      preflopOpenSize: openSizeEl ? Number(openSizeEl.dataset.val) : 2.5
    });
  }

  const ACTION_MODE_KEY = 'pt_action_mode';
  function loadActionMode() {
    try {
      const v = localStorage.getItem(ACTION_MODE_KEY);
      if (v === 'complete' || v === 'quick') return v;
    } catch (e) { /* ignore */ }
    return 'complete';
  }
  function saveActionMode(mode) {
    const v = mode === 'quick' ? 'quick' : 'complete';
    try { localStorage.setItem(ACTION_MODE_KEY, v); } catch (e) { /* ignore */ }
    return v;
  }
  function readActionModeFromSetup() {
    const el = $('#setup-action-mode .setup-chip.active');
    if (el && el.dataset.val) return el.dataset.val === 'quick' ? 'quick' : 'complete';
    return loadActionMode();
  }
  function currentActionMode() {
    const cfg = (hand && hand.playConfig) || playSessionConfig;
    if (cfg && cfg.actionMode === 'complete') return 'complete';
    if (cfg && cfg.actionMode === 'quick') return 'quick';
    return loadActionMode();
  }
  function restoreActionModeChip() {
    const box = $('#setup-action-mode');
    if (!box) return;
    const saved = loadActionMode();
    box.querySelectorAll('.setup-chip').forEach((c) => {
      c.classList.toggle('active', c.dataset.val === saved);
    });
  }

  const TABLE_THEME_KEY = 'pt_table_theme';
  function loadTableTheme() {
    try {
      const v = localStorage.getItem(TABLE_THEME_KEY);
      if (v === 'emerald' || v === 'midnight' || v === 'crimson') return v;
    } catch (e) { /* ignore */ }
    return 'emerald';
  }
  function saveTableTheme(theme) {
    try { localStorage.setItem(TABLE_THEME_KEY, theme); } catch (e) { /* ignore */ }
  }
  function applyTableTheme(theme) {
    const cfg = (hand && hand.playConfig) || playSessionConfig;
    if (cfg && cfg.legendaryMode) return;
    const t = (theme === 'midnight' || theme === 'crimson') ? theme : 'emerald';
    document.querySelectorAll('#play-active .table-felt, .session-replay-table .table-felt').forEach((felt) => {
      felt.setAttribute('data-theme', t);
      applyTableFormatAttrs(felt, cfg);
    });
  }

  function formatHubOfConfig(cfg) {
    if (!cfg) return 'cash';
    if (cfg.formatHub === 'spin' || cfg.formatHub === 'mtt' || cfg.formatHub === 'cash') return cfg.formatHub;
    const PC = window.PTPlayConfig;
    if (PC) {
      if (PC.isSpin(cfg)) return 'spin';
      if (PC.isMtt(cfg)) return 'mtt';
    }
    const Tax = window.PTFormatTaxonomy;
    if (Tax && Tax.hubFromGameType) return Tax.hubFromGameType(cfg.gameType);
    return 'cash';
  }

  function applyTableFormatAttrs(felt, cfg) {
    if (!felt) return;
    const hub = formatHubOfConfig(cfg);
    felt.setAttribute('data-format', hub);
    let badge = felt.querySelector('.table-format-badge');
    if (!badge && felt.id !== 'play-active') {
      /* replay tables inject badge via HTML */
    }
    if (!badge) badge = felt.querySelector('.table-format-badge');
    const labels = { cash: 'CASH', spin: 'SPIN', mtt: 'MTT' };
    if (badge) {
      badge.textContent = labels[hub] || 'CASH';
      badge.setAttribute('aria-hidden', 'false');
    }
  }

  function tableWatermarkHTML() {
    return '<div class="table-watermark" aria-hidden="true">' +
      '<span class="table-watermark-mark"></span>' +
      '<span class="table-watermark-text">PokerForgeAI</span>' +
      '<span class="table-watermark-sub">Modo entrenamiento</span></div>';
  }

  function tableFormatBadgeHTML(cfg) {
    const hub = formatHubOfConfig(cfg);
    const labels = { cash: 'CASH', spin: 'SPIN', mtt: 'MTT' };
    return '<div class="table-format-badge">' + (labels[hub] || 'CASH') + '</div>';
  }

  function phaseLabelForHud(phase) {
    const Tax = window.PTFormatTaxonomy;
    if (Tax && Tax.PHASE_LABELS && Tax.PHASE_LABELS[phase]) {
      const raw = Tax.PHASE_LABELS[phase];
      if (phase === 'auto') return 'Auto';
      return raw;
    }
    const map = { early: 'Early', mid: 'Mid', short: 'Short', push: 'Push/fold', bubble: 'Burbuja', auto: 'Auto' };
    return map[phase] || phase || '';
  }

  /** Lista completa de filas de config (modal info). */
  function buildSessionConfigRows(cfg, hand) {
    if (!cfg) return [];
    const hub = formatHubOfConfig(cfg);
    const Tax = window.PTFormatTaxonomy;
    const rows = [];
    const hubLabels = { cash: 'Cash', spin: 'Spins', mtt: 'Torneos' };
    rows.push({ label: 'Formato', value: hubLabels[hub] || hub });
    const stackBB = cfg.stackBB != null ? cfg.stackBB : (window.PTPlayConfig && PTPlayConfig.stackBB ? PTPlayConfig.stackBB(cfg) : null);
    if (stackBB != null) rows.push({ label: 'Stack', value: stackBB + ' bb' });
    if (hub !== 'cash') {
      const resolved = cfg.resolvedPhase || cfg.mttPhase || 'auto';
      const phaseTxt = phaseLabelForHud(resolved);
      const autoNote = (cfg.mttPhase === 'auto' || !cfg.mttPhase) ? ' (auto)' : '';
      rows.push({ label: 'Fase', value: phaseTxt + autoNote });
      const blinds = cfg.blindStructure || (Tax && Tax.blindStructureFor ? Tax.blindStructureFor(cfg) : null);
      if (blinds && blinds.label) rows.push({ label: 'Blinds', value: blinds.label });
      if (blinds && blinds.anteLabel) rows.push({ label: 'Ante', value: blinds.anteLabel });
      else if (cfg.anteBB > 0) rows.push({ label: 'Ante', value: cfg.anteBB + ' bb' });
      const icmOn = Tax && Tax.usesIcm ? Tax.usesIcm(cfg) : (hub === 'spin');
      if (icmOn) rows.push({ label: 'ICM', value: 'Lite (estructura)' });
      if (hub === 'spin' && cfg.spinPayout) {
        rows.push({ label: 'Payout', value: String(cfg.spinPayout).toUpperCase() });
      }
      if (hub === 'mtt' && cfg.playersLeft != null && cfg.placesPaid != null) {
        rows.push({ label: 'Quedan / pagan', value: cfg.playersLeft + ' left / ' + cfg.placesPaid + ' paid' });
      }
      if (hub === 'mtt' && cfg.entries != null) {
        rows.push({ label: 'Entradas', value: String(cfg.entries) });
      }
      if (hub === 'mtt' && cfg.buyIn != null && cfg.buyIn > 0) {
        rows.push({ label: 'Buy-in', value: '€' + cfg.buyIn });
      }
      const pool = (Tax && Tax.estimatePrizePool) ? Tax.estimatePrizePool(cfg) : cfg.prizePoolEst;
      if (pool != null) rows.push({ label: 'Prize pool (est.)', value: '€' + pool });
      const prizes = Tax && Tax.estimatePlacePrizes ? Tax.estimatePlacePrizes(cfg) : null;
      if (prizes && prizes.length) {
        const top = prizes.slice(0, 3).map(function (p) {
          return p.place + 'º €' + p.amount;
        }).join(' · ');
        rows.push({ label: 'Top premios', value: top });
      }
      const rank = resolveHeroFieldRank(cfg, hand);
      if (rank != null && cfg.playersLeft != null) {
        rows.push({ label: 'Tu puesto (por stack)', value: '#' + rank + ' / ' + (cfg.playersLeft || '?') });
      }
    }
    if (cfg.preflopOpenSize) rows.push({ label: 'Open', value: cfg.preflopOpenSize + '×' });
    if (hub === 'cash' && cfg.rakeMode && cfg.rakeMode !== 'none') {
      rows.push({ label: 'Rake', value: cfg.rakeMode === 'standard' ? 'Standard' : (cfg.rakePct + '% / ' + cfg.rakeCapBB + 'bb') });
    }
    return rows;
  }

  function resolveHeroFieldRank(cfg, hand) {
    const Tax = window.PTFormatTaxonomy;
    if (!Tax || !Tax.heroStackRank) return cfg && cfg.heroFieldRank != null ? cfg.heroFieldRank : null;
    const Icm = window.GTOIcmEv;
    if (hand && Icm && Icm.contextForHand) {
      const ctx = Icm.contextForHand(hand, cfg || hand.playConfig);
      if (ctx && ctx.icmStacksBB && ctx.icmStacksBB.length) {
        return Tax.heroStackRank(ctx.icmStacksBB, ctx.icmHeroIdx != null ? ctx.icmHeroIdx : 0);
      }
    }
    if (cfg && cfg.icmStacksBB && cfg.icmStacksBB.length) {
      return Tax.heroStackRank(cfg.icmStacksBB, 0);
    }
    return null;
  }

  /** Todos los chips (legado / detalle). */
  function buildTrainHudChips(cfg, hand) {
    if (!cfg) return [];
    const hub = formatHubOfConfig(cfg);
    const chips = [];
    const stackBB = cfg.stackBB != null ? cfg.stackBB : (window.PTPlayConfig && PTPlayConfig.stackBB ? PTPlayConfig.stackBB(cfg) : null);
    if (stackBB != null) chips.push({ text: stackBB + 'bb', cls: '' });
    if (hub !== 'cash') {
      const resolved = cfg.resolvedPhase || cfg.mttPhase || 'auto';
      const phaseTxt = phaseLabelForHud(resolved);
      const autoNote = (cfg.mttPhase === 'auto' || !cfg.mttPhase) ? ' (auto)' : '';
      chips.push({
        text: phaseTxt + autoNote,
        cls: 'is-phase',
        title: cfg.mttPhase === 'auto' ? 'Fase Auto según stack' : 'Fase fija en setup'
      });
      const Tax = window.PTFormatTaxonomy;
      const blinds = cfg.blindStructure || (Tax && Tax.blindStructureFor ? Tax.blindStructureFor(cfg) : null);
      if (cfg.anteBB > 0 && !(blinds && blinds.anteLabel)) {
        chips.push({ text: 'Ante ' + cfg.anteBB + 'bb', cls: '' });
      }
      if (blinds && blinds.label) {
        chips.push({
          text: blinds.label,
          cls: 'is-blinds',
          title: 'Estructura simbólica de blinds (estudio). No es un torneo real de sala.'
        });
      }
      if (blinds && blinds.anteLabel) {
        chips.push({ text: blinds.anteLabel, cls: '' });
      }
      const icmOn = Tax && Tax.usesIcm ? Tax.usesIcm(cfg) : (hub === 'spin');
      if (icmOn) {
        chips.push({
          text: 'ICM lite',
          cls: 'is-icm',
          title: 'ICM activo: el premio importa más que las fichas (estudio lite, no solver de field). Detalle en Info.'
        });
      }
      if (hub === 'spin' && cfg.spinPayout) {
        chips.push({ text: 'Payout ' + String(cfg.spinPayout).toUpperCase(), cls: 'is-icm' });
      }
      if (hub === 'mtt' && cfg.playersLeft != null && cfg.placesPaid != null) {
        chips.push({
          text: cfg.playersLeft + ' left / ' + cfg.placesPaid + ' paid',
          cls: 'is-icm'
        });
      }
      const rank = resolveHeroFieldRank(cfg, hand);
      // Puesto por stack: solo con estructura de field (left/paid); evita Pos. #N de mesa 9-max en early/mid.
      if (hub === 'mtt' && rank != null && cfg.playersLeft != null && cfg.placesPaid != null) {
        chips.push({ text: 'Pos. #' + rank, cls: 'is-phase', title: 'Puesto por stack en el field ICM lite' });
      }
      if (hub === 'mtt' && cfg.buyIn != null && cfg.buyIn > 0
        && cfg.playersLeft != null && cfg.placesPaid != null) {
        chips.push({ text: 'BI €' + cfg.buyIn, cls: '' });
      }
    }
    if (cfg.preflopOpenSize) chips.push({ text: 'Open ' + cfg.preflopOpenSize + '×', cls: '' });
    return chips;
  }

  /**
   * Dos indicadores prioritarios para el chrome compacto.
   * cash: stack + open · spin: stack + payout · mtt: pos/stack + left/paid o fase.
   */
  function pickPrimaryHudChips(cfg, hand) {
    const all = buildTrainHudChips(cfg, hand);
    if (!all.length) return [];
    const hub = formatHubOfConfig(cfg);
    const byText = function (re) {
      return all.find(function (c) { return re.test(c.text); });
    };
    const out = [];
    if (hub === 'cash') {
      const stack = byText(/\dbb/);
      const open = byText(/^Open /);
      if (stack) out.push(stack);
      if (open) out.push(open);
    } else if (hub === 'spin') {
      const stack = byText(/\dbb/);
      const pay = byText(/^Payout /) || byText(/^ICM/);
      if (stack) out.push(stack);
      if (pay) out.push(pay);
    } else {
      const hasStructure = cfg && cfg.playersLeft != null && cfg.placesPaid != null;
      const pos = byText(/^Pos\. #/);
      const field = byText(/left \//);
      const stack = byText(/\dbb/);
      const phase = all.find(function (c) { return c.cls === 'is-phase' && !/^Pos\. #/.test(c.text); });
      // Con estructura: puesto + left/paid. Sin ella: stack + fase (no sustituir stack por Pos. de mesa).
      if (hasStructure && pos) out.push(pos);
      else if (stack) out.push(stack);
      if (field) out.push(field);
      else if (phase) out.push(phase);
      else if (hasStructure && stack && out.indexOf(stack) < 0) out.push(stack);
    }
    // Rellenar hasta 2 con el resto si falta
    for (let i = 0; i < all.length && out.length < 2; i++) {
      if (out.indexOf(all[i]) < 0) out.push(all[i]);
    }
    return out.slice(0, 2);
  }

  function openSessionConfigModal(cfg, hand) {
    const modal = $('#session-config-modal');
    const body = $('#session-config-body');
    if (!modal || !body) return;
    const rows = buildSessionConfigRows(cfg, hand);
    if (!rows.length) {
      body.innerHTML = '<p class="muted-text">Sin datos de configuración.</p>';
    } else {
      body.innerHTML = '<dl class="session-config-dl">' + rows.map(function (r) {
        return '<div class="session-config-row"><dt>' + escapeHtml(r.label) + '</dt><dd>' +
          escapeHtml(r.value) + '</dd></div>';
      }).join('') + '</dl>';
    }
    modal.classList.remove('hidden');
  }

  function closeSessionConfigModal() {
    const modal = $('#session-config-modal');
    if (modal) modal.classList.add('hidden');
  }

  function bindSessionConfigModal() {
    const modal = $('#session-config-modal');
    if (!modal || modal._ptBound) return;
    modal._ptBound = true;
    const closeBtn = $('#session-config-close');
    if (closeBtn) closeBtn.addEventListener('click', closeSessionConfigModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeSessionConfigModal();
    });
    if (!document._ptSessionInfoBound) {
      document._ptSessionInfoBound = true;
      document.addEventListener('click', function (e) {
        const btn = e.target && e.target.closest ? e.target.closest('.table-train-info') : null;
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const host = btn.closest('#table-train-hud, .table-train-hud, .table-train-chrome');
        const pack = (host && host._ptSessionInfo) || (btn._ptSessionInfo) || null;
        const cfg = pack && pack.cfg;
        const handArg = pack && pack.hand;
        openSessionConfigModal(cfg || null, handArg || null);
      });
    }
  }

  function attachSessionInfoTarget(el, cfg, handArg) {
    if (!el) return;
    el._ptSessionInfo = { cfg: cfg || null, hand: handArg || null };
  }

  function renderTrainHud(cfg, handArg) {
    const hud = $('#table-train-hud');
    if (!hud) return;
    if (cfg && cfg.legendaryMode) {
      hud.innerHTML = '';
      hud._ptSessionInfo = null;
      return;
    }
    const liveHand = handArg != null ? handArg : (typeof hand !== 'undefined' ? hand : null);
    const chips = pickPrimaryHudChips(cfg, liveHand);
    hud.innerHTML = chips.map(function (c) {
      return '<span class="table-train-chip' + (c.cls ? ' ' + c.cls : '') + '"' +
        (c.title ? ' title="' + escapeHtml(c.title) + '"' : '') + '>' +
        escapeHtml(c.text) + '</span>';
    }).join('') +
      '<button type="button" class="table-train-info" id="table-train-info-btn" aria-label="Detalle de configuración">Info</button>';
    attachSessionInfoTarget(hud, cfg, liveHand);
  }

  function tableChromeHTML(cfg) {
    const chips = pickPrimaryHudChips(cfg, null);
    return '<div class="table-train-chrome">' +
      tableFormatBadgeHTML(cfg) +
      '<div class="table-train-hud" data-session-info="1">' +
      chips.map(function (c) {
        return '<span class="table-train-chip' + (c.cls ? ' ' + c.cls : '') + '"' +
          (c.title ? ' title="' + escapeHtml(c.title) + '"' : '') + '>' +
          escapeHtml(c.text) + '</span>';
      }).join('') +
      '<button type="button" class="table-train-info" aria-label="Detalle de configuración">Info</button>' +
      '</div></div>' +
      tableWatermarkHTML();
  }

  /** Tras insertar HTML de chrome (replay), enlaza el popup Info. */
  function bindTableChromeSessionInfo(root, cfg, handArg) {
    if (!root) return;
    root.querySelectorAll('.table-train-hud[data-session-info], .table-train-chrome').forEach(function (el) {
      attachSessionInfoTarget(el, cfg, handArg);
    });
  }

  const REPLAY_TABLE_THEMES = [
    { val: 'emerald', label: 'Esmeralda', swatch: 'theme-swatch-emerald' },
    { val: 'midnight', label: 'Medianoche', swatch: 'theme-swatch-midnight' },
    { val: 'crimson', label: 'Burdeos', swatch: 'theme-swatch-crimson' }
  ];

  function sessionReplayThemeHTML() {
    const saved = loadTableTheme();
    const chips = REPLAY_TABLE_THEMES.map((t) =>
      '<button type="button" class="setup-chip theme-chip' + (saved === t.val ? ' active' : '') +
      '" data-val="' + t.val + '"><span class="theme-swatch ' + t.swatch + '" aria-hidden="true"></span>' +
      escapeHtml(t.label) + '</button>'
    ).join('');
    return '<div class="session-replay-theme-wrap"><div class="setup-chips session-replay-theme" id="session-replay-table-theme">' + chips + '</div></div>';
  }

  function bindSessionReplayTheme() {
    const box = $('#session-replay-table-theme');
    if (!box) return;
    box.onclick = (e) => {
      const chip = e.target.closest('.setup-chip');
      if (!chip || !box.contains(chip)) return;
      box.querySelectorAll('.setup-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const theme = chip.dataset.val || 'emerald';
      saveTableTheme(theme);
      applyTableTheme(theme);
    };
  }
  function restoreTableThemeChip() {
    const box = $('#setup-table-theme');
    if (!box) return;
    const saved = loadTableTheme();
    box.querySelectorAll('.setup-chip').forEach((c) => {
      c.classList.toggle('active', c.dataset.val === saved);
    });
  }

  function isLiveAdvisorOn() {
    const cfg = (hand && hand.playConfig) || playSessionConfig;
    return !!(cfg && cfg.liveAdvisor);
  }

  function updateLiveAdvisor() {
    if (!window.PTLiveAdvisor) return;
    if (hand && hand._present && hand._present.active) {
      const panel = $('#live-advisor-panel');
      if (panel) {
        panel.classList.add('hidden');
        panel.innerHTML = '';
      }
      return;
    }
    window.PTLiveAdvisor.update($('#live-advisor-panel'), hand, isLiveAdvisorOn());
  }

  /** Aplica modo/umbral de Configuración a la sesión activa (sin esperar a nueva sesión). */
  function syncAdvisorSettingsToSession(partial) {
    const LA = window.PTLiveAdvisor;
    if (!LA) return;
    const mode = partial && partial.advisorMode != null
      ? (partial.advisorMode === 'serious' ? 'serious' : 'always')
      : (LA.loadMode ? LA.loadMode() : 'always');
    const thr = partial && partial.seriousEvThreshold != null
      ? Number(partial.seriousEvThreshold)
      : (LA.loadThreshold ? LA.loadThreshold() : 0.5);
    const threshold = (!isNaN(thr) && thr >= 0) ? thr : 0.5;
    if (playSessionConfig) {
      playSessionConfig.advisorMode = mode;
      playSessionConfig.seriousEvThreshold = threshold;
    }
    if (hand && hand.playConfig) {
      hand.playConfig.advisorMode = mode;
      hand.playConfig.seriousEvThreshold = threshold;
    }
    const modeChip = $('#setup-advisor-mode');
    if (modeChip) {
      modeChip.querySelectorAll('.setup-chip').forEach((c) => {
        c.classList.toggle('active', c.dataset.val === mode);
      });
    }
    const thrEl = $('#setup-serious-threshold');
    if (thrEl) thrEl.value = String(threshold);
    syncAdvisorModeUI();
    updateLiveAdvisor();
  }

  function disableLiveAdvisorFromPanel() {
    if (playSessionConfig) playSessionConfig.liveAdvisor = false;
    if (hand && hand.playConfig) hand.playConfig.liveAdvisor = false;
    if (window.PTLiveAdvisor) {
      PTLiveAdvisor.savePreference(false);
      if (PTLiveAdvisor.clearPendingAlert) PTLiveAdvisor.clearPendingAlert();
    }
    const laEl = $('#setup-live-advisor');
    if (laEl) laEl.checked = false;
    updateLiveAdvisor();
  }

  /** Oculta la línea de acción previa a mitad de sesión (× del panel), igual que el avisador. */
  function disableActionLineFromPanel() {
    if (playSessionConfig) playSessionConfig.hideActionLine = true;
    if (hand && hand.playConfig) hand.playConfig.hideActionLine = true;
    if (window.PTActionLine && PTActionLine.saveHidePreference) {
      PTActionLine.saveHidePreference(true);
    }
    const el = $('#setup-hide-action-line');
    if (el) el.checked = true;
    renderActionLine();
    syncPlayMobileStage();
    requestAnimationFrame(syncPlayMobileStage);
  }

  /**
   * La opción «Ocultar línea de acción previa» vale para cualquier calle de
   * práctica y formato: aunque la sesión arranque en preflop (lo habitual en
   * torneos y spins), la línea sale en cuanto la mano llega al flop.
   */
  function syncHideActionLineUI() {
    const el = $('#setup-hide-action-line');
    if (!el) return;
    const AL = window.PTActionLine;
    if (AL && AL.loadHidePreference) el.checked = !!AL.loadHidePreference();
  }

  function bindChipGroup(sel, onChange) {
    const box = $(sel);
    if (!box) return;
    box.addEventListener('click', (e) => {
      const chip = e.target.closest('.setup-chip');
      if (!chip || !box.contains(chip) || chip.hidden || chip.disabled) return;
      box.querySelectorAll('.setup-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      if (onChange) onChange();
    });
  }

  function renderHeroPosChips() {
    const box = $('#setup-hero-pos');
    const PC = window.PTPlayConfig;
    if (!box || !PC) return;
    const cfg = readPlayConfig();
    const positions = PC.heroPositions(cfg);
    const current = box.querySelector('.setup-chip.active');
    const curVal = current ? current.dataset.val : 'random';
    let html = '<button type="button" class="setup-chip' + (curVal === 'random' ? ' active' : '') + '" data-val="random">Random</button>';
    positions.forEach((p) => {
      html += '<button type="button" class="setup-chip' + (curVal === p ? ' active' : '') + '" data-val="' + p + '">' + p + '</button>';
    });
    box.innerHTML = html;
    box.querySelectorAll('.setup-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        box.querySelectorAll('.setup-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  }

  const PLAY_PRESETS = {
    custom: null,
    cash6: {
      formatHub: 'cash',
      gameType: 'cash6',
      stackDepth: 'bb100',
      scenario: 'random',
      mttPhase: 'auto',
      villainLevel: 'pro',
      practiceStreet: 'random',
      preflopOpenSize: 2.5,
      heroPos: 'random',
      handRange: 'random'
    },
    spin_grind: {
      formatHub: 'spin',
      gameType: 'spin3',
      stackDepth: 'random',
      scenario: 'random',
      mttPhase: 'auto',
      spinPayout: '3x',
      villainLevel: 'pro',
      practiceStreet: 'preflop',
      preflopOpenSize: 2.5,
      heroPos: 'random',
      handRange: 'random'
    },
    mtt_low: {
      formatHub: 'mtt',
      gameType: 'mtt',
      stackDepth: 'bb25',
      scenario: 'random',
      mttPhase: 'mid',
      villainLevel: 'pro',
      practiceStreet: 'preflop',
      preflopOpenSize: 2.2,
      heroPos: 'random',
      handRange: 'random'
    }
  };

  function applyPlayPreset(presetKey) {
    const key = presetKey || 'custom';
    const box = $('#setup-play-preset');
    if (box) {
      box.querySelectorAll('.setup-chip').forEach((c) => {
        c.classList.toggle('active', c.dataset.val === key);
      });
    }
    clearActiveUserPreset();
    const builtin = PLAY_PRESETS[key];
    if (builtin) {
      applyPlaySetupConfig(builtin);
      return;
    }
    if (key === 'custom') return;
    const user = window.Store && Store.getPlayPreset ? Store.getPlayPreset(key) : null;
    if (user && user.config) {
      applyPlaySetupConfig(user.config);
      markActiveUserPreset(user.id);
    }
  }

  function clearActiveUserPreset() {
    const host = $('#setup-user-presets');
    if (!host) return;
    host.querySelectorAll('.ranges-fav-chip').forEach((c) => c.classList.remove('active'));
  }

  function markActiveUserPreset(id) {
    const host = $('#setup-user-presets');
    if (!host) return;
    host.querySelectorAll('.ranges-fav-chip').forEach((c) => {
      c.classList.toggle('active', c.dataset.presetId === id);
    });
    const box = $('#setup-play-preset');
    if (box) {
      box.querySelectorAll('.setup-chip').forEach((c) => {
        c.classList.toggle('active', c.dataset.val === 'custom');
      });
    }
  }

  function markPresetCustom() {
    const box = $('#setup-play-preset');
    if (box) {
      box.querySelectorAll('.setup-chip').forEach((c) => {
        c.classList.toggle('active', c.dataset.val === 'custom');
      });
    }
    clearActiveUserPreset();
  }

  function renderUserPlayPresets() {
    const host = $('#setup-user-presets');
    if (!host || !window.Store || !Store.getPlayPresets) return;
    const list = Store.getPlayPresets();
    if (!list.length) {
      host.innerHTML = '<p class="muted-text ranges-fav-empty">Sin presets guardados. Configura la sesión y pulsa Guardar.</p>';
      return;
    }
    host.innerHTML = '<div class="ranges-fav-list">' + list.map(function (p) {
      const name = escapeHtml(p.name || 'Preset');
      const id = escapeHtml(p.id || '');
      return '<div class="ranges-fav-chip" data-preset-id="' + id + '">'
        + '<button type="button" class="btn btn-ghost btn-sm ranges-fav-item" data-user-preset="' + id + '">' + name + '</button>'
        + '<button type="button" class="ranges-fav-remove" data-user-preset-remove="' + id + '" title="Borrar preset" aria-label="Borrar preset">×</button>'
        + '</div>';
    }).join('') + '</div>';
    host.querySelectorAll('[data-user-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyPlayPreset(btn.dataset.userPreset);
      });
    });
    host.querySelectorAll('[data-user-preset-remove]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.userPresetRemove;
        const preset = Store.getPlayPreset ? Store.getPlayPreset(id) : null;
        const label = preset && preset.name ? preset.name : 'este preset';
        if (!confirm('¿Borrar el preset «' + label + '»?')) return;
        Store.removePlayPreset(id);
        renderUserPlayPresets();
        markPresetCustom();
      });
    });
  }

  function saveCurrentPlayPreset() {
    if (!window.Store || !Store.savePlayPreset) return;
    const input = $('#setup-preset-name');
    const raw = input ? String(input.value || '').trim() : '';
    const name = raw || window.prompt('Nombre del preset', '');
    if (name == null) return;
    const label = String(name).trim();
    if (!label) {
      if (input) input.focus();
      return;
    }
    const cfg = readPlayConfig();
    if (!cfg) return;
    const res = Store.savePlayPreset(label, cfg);
    if (!res || !res.ok) return;
    if (input) input.value = '';
    renderUserPlayPresets();
    if (res.preset && res.preset.id) markActiveUserPreset(res.preset.id);
  }

  function activateSetupChip(sel, val) {
    const box = $(sel);
    if (!box || val == null) return false;
    let found = false;
    box.querySelectorAll('.setup-chip').forEach((c) => {
      const on = c.dataset.val === String(val);
      c.classList.toggle('active', on);
      if (on) found = true;
    });
    return found;
  }

  function syncVillainTypeScoreModeUI() {
    const typeChip = $('#setup-villain-type .setup-chip.active');
    const type = typeChip ? typeChip.dataset.val : 'random';
    const scoreWrap = $('#setup-group-score-mode');
    const fixed = type && type !== 'random';
    if (scoreWrap) scoreWrap.hidden = !fixed;
    if (!fixed) activateSetupChip('#setup-score-mode', 'gto');
  }

  function applyPlaySetupConfig(partial) {
    const PC = window.PTPlayConfig;
    if (!PC) return null;
    const cfg = PC.normalize(Object.assign({}, PC.DEFAULT, partial || {}));
    function activate(sel, val) {
      return activateSetupChip(sel, val);
    }
    const hub = cfg.formatHub || (window.PTFormatTaxonomy
      ? PTFormatTaxonomy.hubFromGameType(cfg.gameType)
      : 'cash');
    syncFormatHubUI(hub);
    activate('#setup-game-type', cfg.gameType);
    activate('#setup-mtt-phase', cfg.mttPhase || 'auto');
    activate('#setup-scenario', cfg.scenario);
    activate('#setup-stack-depth', cfg.stackDepth);
    activate('#setup-open-size', String(cfg.preflopOpenSize != null ? cfg.preflopOpenSize : 2.5));
    syncPhaseStackUI(hub);
    activate('#setup-practice-intent', 'mixed');
    activate('#setup-spin-payout', cfg.spinPayout || '2x');
    const sit = cfg.mttStructureSituation || 'auto';
    activate('#setup-mtt-structure', sit);
    if (cfg.mttPayoutPreset) activate('#setup-mtt-payout-preset', cfg.mttPayoutPreset);
    const biEl = $('#setup-mtt-buyin');
    if (biEl) {
      biEl.value = cfg.buyIn != null ? String(cfg.buyIn) : (sit === 'auto' ? '' : '11');
    }
    const leftEl = $('#setup-mtt-players-left');
    if (leftEl && cfg.playersLeft != null) leftEl.value = String(cfg.playersLeft);
    const paidEl = $('#setup-mtt-places-paid');
    if (paidEl && cfg.placesPaid != null) paidEl.value = String(cfg.placesPaid);
    const entriesEl = $('#setup-mtt-entries');
    if (entriesEl && cfg.entries != null) entriesEl.value = String(cfg.entries);
    syncMttStructureUI({ skipDefaults: sit === 'custom' || sit === 'auto' });
    if (cfg.multiwayPotType) activate('#setup-multiway-pot-type', cfg.multiwayPotType);
    syncMultiwayTypeUI();
    renderHeroPosChips();
    activate('#setup-hero-pos', cfg.heroPos);
    activate('#setup-hand-range', cfg.handRange);
    activate('#setup-villain-level', cfg.villainLevel);
    activate('#setup-villain-type', cfg.villainType || 'random');
    activate('#setup-score-mode', cfg.scoreMode === 'exploit' ? 'exploit' : 'gto');
    syncVillainTypeScoreModeUI();
    activate('#setup-practice-street', cfg.practiceStreet);
    if (cfg.handsTarget != null) activate('#setup-hands-target', String(cfg.handsTarget || 0));
    activate('#setup-action-mode', cfg.actionMode === 'complete' ? 'complete' : 'quick');
    if (cfg.actionMode) saveActionMode(cfg.actionMode);
    if (cfg.tableTheme) {
      activate('#setup-table-theme', cfg.tableTheme);
      saveTableTheme(cfg.tableTheme);
    }
    const laEl = $('#setup-live-advisor');
    if (laEl && typeof cfg.liveAdvisor === 'boolean') laEl.checked = cfg.liveAdvisor;
    const mode = (cfg.advisorMode === 'serious') ? 'serious' : 'always';
    $$('#setup-advisor-mode .setup-chip').forEach((c) => {
      c.classList.toggle('active', c.dataset.val === mode);
    });
    const thrEl = $('#setup-serious-threshold');
    if (thrEl && cfg.seriousEvThreshold != null) thrEl.value = String(cfg.seriousEvThreshold);
    syncAdvisorModeUI();
    // Solo los presets que llevan la opción la tocan: un preset de formato no
    // debe reactivar la línea a quien la tenga escondida.
    if (partial && typeof partial.hideActionLine === 'boolean' &&
        window.PTActionLine && PTActionLine.saveHidePreference) {
      PTActionLine.saveHidePreference(!!partial.hideActionLine);
    }
    syncHideActionLineUI();
    if (cfg.rakeMode) {
      activate('#setup-rake-mode', cfg.rakeMode);
      const pctEl = $('#setup-rake-pct');
      const capEl = $('#setup-rake-cap');
      if (pctEl && cfg.rakePct != null) pctEl.value = String(cfg.rakePct);
      if (capEl && cfg.rakeCapBB != null) capEl.value = String(cfg.rakeCapBB);
      syncRakeUI();
      if (PC.saveRakePrefs) {
        PC.saveRakePrefs({
          rakeMode: cfg.rakeMode,
          rakePct: cfg.rakePct,
          rakeCapBB: cfg.rakeCapBB
        });
      }
    }
    return readPlayConfig();
  }

  function syncRakeUI() {
    const wrap = $('#setup-rake-custom');
    const modeChip = $('#setup-rake-mode .setup-chip.active');
    const custom = modeChip && modeChip.dataset.val === 'custom';
    if (wrap) {
      wrap.hidden = !custom;
      wrap.classList.toggle('hidden', !custom);
    }
  }

  function syncAdvisorModeUI() {
    const extras = $('#setup-advisor-extras');
    const thrWrap = $('#setup-serious-threshold-wrap');
    const on = !!( $('#setup-live-advisor') && $('#setup-live-advisor').checked );
    const modeChip = $('#setup-advisor-mode .setup-chip.active');
    const serious = modeChip && modeChip.dataset.val === 'serious';
    if (extras) extras.classList.toggle('is-disabled', !on);
    if (thrWrap) thrWrap.classList.toggle('hidden', !serious);
  }

  async function startGuidedTraining(partial) {
    const cfg = applyPlaySetupConfig(partial || {});
    if (!cfg) {
      goToTab('play', { setup: true });
      return;
    }
    // Chips del DOM pueden no tener valores guiados (p.ej. handsTarget 10 del onboarding).
    playSessionConfig = window.PTPlayConfig
      ? PTPlayConfig.normalize(Object.assign({}, cfg, partial || {}))
      : cfg;
    if (window.PTLiveAdvisor && playSessionConfig) {
      PTLiveAdvisor.savePreference(!!playSessionConfig.liveAdvisor);
      if (PTLiveAdvisor.saveMode) PTLiveAdvisor.saveMode(playSessionConfig.advisorMode || 'always');
      if (PTLiveAdvisor.saveThreshold) PTLiveAdvisor.saveThreshold(playSessionConfig.seriousEvThreshold);
    }
    if (window.PTActionLine && PTActionLine.saveHidePreference && playSessionConfig) {
      PTActionLine.saveHidePreference(!!playSessionConfig.hideActionLine);
    }
    if (playSessionConfig && playSessionConfig.actionMode) saveActionMode(playSessionConfig.actionMode);
    resetPlaySession(false);
    goToTab('play', { table: true });
    showPlayTable();
    scrollPlayToTop();
    await yieldToPaint();
    scrollPlayToTop();
    void startNewHand();
  }
  window.startGuidedTraining = startGuidedTraining;
  window.applyPlaySetupConfig = applyPlaySetupConfig;

  function bindPlaySetup() {
    const hubBox = $('#setup-format-hub');
    if (hubBox) {
      hubBox.querySelectorAll('[data-val]').forEach((btn) => {
        btn.addEventListener('click', () => {
          syncFormatHubUI(btn.dataset.val);
        });
      });
    }
    syncFormatHubUI(activeFormatHub());
    bindChipGroup('#setup-game-type', renderHeroPosChips);
    bindChipGroup('#setup-stack-depth');
    bindChipGroup('#setup-scenario', () => {
      markPresetCustom();
      const hub = activeFormatHub();
      const Tax = window.PTFormatTaxonomy;
      const scEl = $('#setup-scenario .setup-chip.active:not([hidden])') || $('#setup-scenario .setup-chip.active');
      const phaseEl = $('#setup-mtt-phase .setup-chip.active');
      const sc = scEl ? scEl.dataset.val : 'random';
      const phase = phaseEl ? phaseEl.dataset.val : 'auto';
      if (Tax && Tax.clampStackDepth && (sc === 'push' || sc === 'steal')) {
        const next = Tax.clampStackDepth(hub, phase, sc, null);
        $$('#setup-stack-depth .setup-chip').forEach((c) => {
          c.classList.toggle('active', c.dataset.val === next);
        });
      }
      syncPhaseStackUI(hub);
      syncMultiwayTypeUI();
      renderHeroPosChips();
    });
    bindChipGroup('#setup-multiway-pot-type');
    bindChipGroup('#setup-practice-intent');
    bindChipGroup('#setup-mtt-phase', () => {
      markPresetCustom();
      const hub = activeFormatHub();
      const Tax = window.PTFormatTaxonomy;
      const phaseEl = $('#setup-mtt-phase .setup-chip.active');
      const scEl = $('#setup-scenario .setup-chip.active:not([hidden])') || $('#setup-scenario .setup-chip.active');
      const phase = phaseEl ? phaseEl.dataset.val : 'auto';
      const sc = scEl ? scEl.dataset.val : 'random';
      if (Tax && Tax.clampStackDepth && phase && phase !== 'auto') {
        const next = Tax.clampStackDepth(hub, phase, sc, Tax.defaultStackDepthForPhase(hub, phase));
        $$('#setup-stack-depth .setup-chip').forEach((c) => {
          c.classList.toggle('active', c.dataset.val === next);
        });
      }
      syncPhaseStackUI(hub);
      syncMttStructureUI({ skipDefaults: true });
    });
    bindChipGroup('#setup-open-size', markPresetCustom);
    bindChipGroup('#setup-play-preset', () => {
      const el = $('#setup-play-preset .setup-chip.active');
      if (el) applyPlayPreset(el.dataset.val);
    });
    renderUserPlayPresets();
    const savePresetBtn = $('#setup-preset-save');
    if (savePresetBtn) {
      savePresetBtn.addEventListener('click', () => saveCurrentPlayPreset());
    }
    const presetNameInput = $('#setup-preset-name');
    if (presetNameInput) {
      presetNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveCurrentPlayPreset();
        }
      });
    }
    const hubBoxForPreset = $('#setup-format-hub');
    if (hubBoxForPreset) {
      hubBoxForPreset.addEventListener('click', () => markPresetCustom());
    }
    bindChipGroup('#setup-spin-payout');
    bindChipGroup('#setup-mtt-structure', () => {
      syncMttStructureUI();
      markPresetCustom();
    });
    bindChipGroup('#setup-mtt-payout-preset', () => {
      markPresetCustom();
      updateMttPrizeHint();
    });
    ['setup-mtt-buyin', 'setup-mtt-players-left', 'setup-mtt-places-paid', 'setup-mtt-entries'].forEach((id) => {
      const el = $('#' + id);
      if (el) {
        el.addEventListener('change', () => { markPresetCustom(); updateMttPrizeHint(); });
        el.addEventListener('input', () => { markPresetCustom(); updateMttPrizeHint(); });
      }
    });
    bindSessionConfigModal();
    bindChipGroup('#setup-hand-range');
    bindChipGroup('#setup-villain-level');
    bindChipGroup('#setup-villain-type', () => { syncVillainTypeScoreModeUI(); });
    bindChipGroup('#setup-score-mode');
    syncVillainTypeScoreModeUI();
    bindChipGroup('#setup-practice-street');
    bindChipGroup('#setup-action-mode', () => {
      const el = $('#setup-action-mode .setup-chip.active');
      saveActionMode(el ? el.dataset.val : 'complete');
    });
    bindChipGroup('#setup-hands-target');
    bindChipGroup('#setup-table-theme', () => {
      const thEl = $('#setup-table-theme .setup-chip.active');
      const theme = thEl ? thEl.dataset.val : 'emerald';
      saveTableTheme(theme);
      applyTableTheme(theme);
    });
    restoreTableThemeChip();
    restoreActionModeChip();
    restoreRakeChips();
    bindChipGroup('#setup-rake-mode', () => {
      syncRakeUI();
      persistRakeFromSetup();
    });
    const rakePctEl = $('#setup-rake-pct');
    const rakeCapEl = $('#setup-rake-cap');
    const persistRake = () => persistRakeFromSetup();
    if (rakePctEl) {
      rakePctEl.addEventListener('change', persistRake);
      rakePctEl.addEventListener('input', persistRake);
    }
    if (rakeCapEl) {
      rakeCapEl.addEventListener('change', persistRake);
      rakeCapEl.addEventListener('input', persistRake);
    }
    syncRakeUI();
    const laEl = $('#setup-live-advisor');
    const thrEl = $('#setup-serious-threshold');
    if (window.PTLiveAdvisor) {
      if (laEl) laEl.checked = PTLiveAdvisor.loadPreference();
      const mode = PTLiveAdvisor.loadMode ? PTLiveAdvisor.loadMode() : 'always';
      $$('#setup-advisor-mode .setup-chip').forEach((c) => {
        c.classList.toggle('active', c.dataset.val === mode);
      });
      if (thrEl && PTLiveAdvisor.loadThreshold) thrEl.value = String(PTLiveAdvisor.loadThreshold());
      syncAdvisorModeUI();
      if (laEl) {
        laEl.addEventListener('change', function () {
          PTLiveAdvisor.savePreference(laEl.checked);
          syncAdvisorModeUI();
        });
      }
      bindChipGroup('#setup-advisor-mode', function () {
        const active = $('#setup-advisor-mode .setup-chip.active');
        const modeVal = active && active.dataset.val === 'serious' ? 'serious' : 'always';
        PTLiveAdvisor.saveMode(modeVal);
        syncAdvisorModeUI();
        syncAdvisorSettingsToSession({ advisorMode: modeVal });
      });
      if (thrEl) {
        const persistThr = function () {
          PTLiveAdvisor.saveThreshold(thrEl.value);
          syncAdvisorSettingsToSession({
            advisorMode: PTLiveAdvisor.loadMode ? PTLiveAdvisor.loadMode() : 'always',
            seriousEvThreshold: PTLiveAdvisor.loadThreshold ? PTLiveAdvisor.loadThreshold() : thrEl.value
          });
        };
        thrEl.addEventListener('change', persistThr);
        thrEl.addEventListener('input', persistThr);
      }
    }
    const hideAlEl = $('#setup-hide-action-line');
    if (hideAlEl) {
      syncHideActionLineUI();
      hideAlEl.addEventListener('change', function () {
        if (window.PTActionLine && PTActionLine.saveHidePreference) {
          PTActionLine.saveHidePreference(!!hideAlEl.checked);
        }
      });
    }
    const startBtn = $('#play-start');
    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        playSessionConfig = readPlayConfig();
        if (window.PTPlayConfig && PTPlayConfig.saveRakePrefs && playSessionConfig) {
          PTPlayConfig.saveRakePrefs({
            rakeMode: playSessionConfig.rakeMode,
            rakePct: playSessionConfig.rakePct,
            rakeCapBB: playSessionConfig.rakeCapBB
          });
        }
        if (window.PTLiveAdvisor && playSessionConfig) {
          PTLiveAdvisor.savePreference(!!playSessionConfig.liveAdvisor);
          if (PTLiveAdvisor.saveMode) PTLiveAdvisor.saveMode(playSessionConfig.advisorMode || 'always');
          if (PTLiveAdvisor.saveThreshold) PTLiveAdvisor.saveThreshold(playSessionConfig.seriousEvThreshold);
        }
        if (window.PTActionLine && PTActionLine.saveHidePreference && playSessionConfig) {
          PTActionLine.saveHidePreference(!!playSessionConfig.hideActionLine);
        }
        if (playSessionConfig && playSessionConfig.actionMode) saveActionMode(playSessionConfig.actionMode);
        resetPlaySession(false);
        goToTab('play', { table: true });
        showPlayTable();
        scrollPlayToTop();
        await yieldToPaint();
        scrollPlayToTop();
        void startNewHand();
      });
    }
    renderHeroPosChips();
  }

  function restoreRakeChips() {
    const PC = window.PTPlayConfig;
    const box = $('#setup-rake-mode');
    if (!box || !PC) return;
    const prefs = PC.loadRakePrefs ? PC.loadRakePrefs() : null;
    const mode = (prefs && prefs.rakeMode) || 'none';
    box.querySelectorAll('.setup-chip').forEach((c) => {
      c.classList.toggle('active', c.dataset.val === mode);
    });
    const pctEl = $('#setup-rake-pct');
    const capEl = $('#setup-rake-cap');
    if (pctEl && prefs && prefs.rakePct != null) pctEl.value = String(prefs.rakePct);
    if (capEl && prefs && prefs.rakeCapBB != null) capEl.value = String(prefs.rakeCapBB);
  }

  function persistRakeFromSetup() {
    const PC = window.PTPlayConfig;
    if (!PC || !PC.saveRakePrefs) return;
    const modeEl = $('#setup-rake-mode .setup-chip.active');
    const pctEl = $('#setup-rake-pct');
    const capEl = $('#setup-rake-cap');
    PC.saveRakePrefs({
      rakeMode: modeEl ? modeEl.dataset.val : 'none',
      rakePct: pctEl ? Number(pctEl.value) : 5,
      rakeCapBB: capEl ? Number(capEl.value) : 3
    });
  }

  function init() {
    scheduleHomeBootFallback();
    bindTabs();
    bindMobileNav();
    bindControls();
    bindPlaySetup();
    bindRangesFilters();
    bindHome();
    if (window.PTHelp && PTHelp.bind) PTHelp.bind();
    if (window.PTHotkeys && PTHotkeys.bind) PTHotkeys.bind();
    if (window.PTDisclaimer) {
      PTDisclaimer.mount('#app-disclaimer', 'foot');
    }
    window.addEventListener('pt-go-tab', (e) => {
      const d = e.detail || {};
      if (d.tab === 'play') goToTab('play', { setup: !!d.setup, table: !!d.table });
      else if (d.tab === 'contact') goToTab('contact', { threadId: d.threadId || null });
      else if (d.tab) goToTab(d.tab);
    });
    if (window.PTBilling) {
      window.PTBilling.bindPaywall();
      window.PTBilling.handleCheckoutReturn();
    }
    if (window.PTEntitlements && window.PTEntitlements.ensureLoaded) {
      window.PTEntitlements.ensureLoaded().finally(function () {
        refreshLegendaryTabVisibility();
        refreshTournamentsTabVisibility();
      });
    }
    window.addEventListener('pt-auth-ready', function () {
      const afterRefresh = function () {
        refreshLegendaryTabVisibility();
        refreshTournamentsTabVisibility();
      };
      if (window.PTEntitlements && window.PTEntitlements.refresh) {
        window.PTEntitlements.refresh().finally(afterRefresh);
      } else {
        afterRefresh();
      }
    });
    window.addEventListener('pt-guest-ready', function () {
      refreshLegendaryTabVisibility();
      refreshTournamentsTabVisibility();
    });
    window.addEventListener('pt-entitlements-updated', function () {
      refreshLegendaryTabVisibility();
      refreshTournamentsTabVisibility();
    });
    window.addEventListener('pt-plan-changed', function () {
      renderPricing();
      refreshLegendaryTabVisibility();
      refreshTournamentsTabVisibility();
    });
    window.runCloudSync = runCloudSync;
    const verEl = $('#app-version');
    if (verEl) verEl.textContent = 'v' + APP_VERSION;
    try {
      if (!window.Engine) throw new Error('Motor no cargado');
      setPlayBoot(false);
      if (window.PTGuest && PTGuest.isActive && PTGuest.isActive()) {
        finishHomeBoot();
        showPlayTable();
        goToTab('play', { table: true });
      } else {
        showPlaySetup();
        goToTab('home');
      }
    } catch (e) {
      console.error('[Play] init failed', e);
      setPlayBoot(true, 'Error al cargar. Recarga la página.');
      finishHomeBoot();
    }
    refreshSessionUI();
    refreshLegendaryTabVisibility();
    refreshTournamentsTabVisibility();
  }

  function firstNameFromUser(user) {
    if (!user || !user.name) return '';
    const n = String(user.name).trim();
    if (!n) return '';
    return n.split(/\s+/)[0];
  }

  const DEFAULT_HOME_LEAD =
    'Practica spots reales, consulta rangos solver, repasa tus errores y resuelve dudas con el <strong>ForgeCoach</strong>.';

  function buildHomeStatsBundle() {
    const stats = Store.getStats();
    const Agg = window.PTStatsAggregate;
    return {
      stats: stats,
      weekly: Agg ? Agg.trainerWeeklySeries(stats, 8) : (window.PTProgress ? PTProgress.buildWeeklySeries(Store.getHistory(), 8) : []),
      weeklySessions: Agg ? Agg.sessionWeeklySeries(stats, 8) : [],
      leaks: window.PTLeaks ? PTLeaks.topLeaks(Store.getErrors(), 5) : [],
      sessionLeaks: Agg ? Agg.sessionTopLeaks(stats, 5) : [],
      sessionsTotal: Agg ? Agg.sessionsTotal(stats) : null
    };
  }

  let homeGreetingRequest = 0;

  function withLazyChunk(chunk, fn) {
    if (!window.PTLoader || !chunk) {
      try { fn(); } catch (e) { console.error('[PTLoader]', e); }
      return Promise.resolve();
    }
    var load = Array.isArray(chunk) ? PTLoader.ensureMany(chunk) : PTLoader.ensure(chunk);
    return load.then(fn).catch(function (e) {
      console.error('[PTLoader]', chunk, e);
      fn();
    });
  }

  function loadHomeGreeting(leadEl) {
    if (!leadEl) return;
    leadEl.classList.remove('home-lead--loading');
    var homeOpts = (window.PTCommunity && PTCommunity.homeOptions) ? PTCommunity.homeOptions() : {};
    if (homeOpts.welcomeFromManager && window.PTCommunity && PTCommunity.requireMembership && PTCommunity.requireMembership()) {
      leadEl.textContent = 'Bienvenido a la comunidad.';
      if (PTCommunity.fetchWelcomeMessage) {
        PTCommunity.fetchWelcomeMessage().then(function (msg) {
          if (msg && String(msg).trim()) leadEl.textContent = String(msg).trim();
        }).catch(function () { /* default */ });
      }
      return;
    }
    leadEl.innerHTML = DEFAULT_HOME_LEAD;
    const guestOn = !!(window.PTAuth && PTAuth.isGuest && PTAuth.isGuest())
      || !!(window.PTGuest && PTGuest.isActive && PTGuest.isActive());
    if (guestOn) return;
    if (!window.PTAIReport || !PTAIReport.fetchHomeGreeting) return;
    const reqId = ++homeGreetingRequest;
    const runFetch = function () {
      PTAIReport.fetchHomeGreeting(buildHomeStatsBundle)
        .then(function (text) {
          if (reqId !== homeGreetingRequest) return;
          const homeTab = $('#tab-home');
          if (!homeTab || !homeTab.classList.contains('active')) return;
          if (text && String(text).trim()) {
            leadEl.textContent = String(text).trim();
          }
        })
        .catch(function () { /* mantener texto por defecto */ });
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(runFetch, { timeout: 4000 });
    } else {
      setTimeout(runFetch, 200);
    }
  }

  function renderHome() {
    const greetEl = $('#home-greeting');
    const statsEl = $('#home-stats');
    if (!greetEl || !statsEl) {
      finishHomeBoot();
      return;
    }

    const user = (window.PTAuth && PTAuth.getUser && PTAuth.getUser()) || window.PT_AUTH_USER;
    const first = firstNameFromUser(user);
    greetEl.textContent = first ? ('¡Hola, ' + first + '!') : 'Bienvenido al felt';

    const leadEl = $('.home-lead');
    if (leadEl) loadHomeGreeting(leadEl);

    const coachCard = document.querySelector('#home-grid [data-scroll-coach]');
    if (coachCard) coachCard.classList.toggle('hidden', !!user);

    const st = Store.getStats();
    const errs = Store.getErrors();
    const decisions = st.decisions || 0;
    const accuracy = decisions
      ? Math.round((((st.optima || 0) + (st.aceptable || 0)) / decisions) * 100)
      : null;

    statsEl.innerHTML = [
      { val: accuracy != null ? accuracy + '%' : '—', lbl: 'Acierto global', cls: 'accent' },
      { val: errs.length, lbl: 'Errores a repasar', cls: errs.length ? 'warn' : '' }
    ].map((s) =>
      '<div class="home-stat ' + s.cls + '"><span class="val">' + escapeHtml(String(s.val)) + '</span><span class="lbl">' + escapeHtml(s.lbl) + '</span></div>'
    ).join('');

    const dailyHost = $('#home-daily-spot');
    const homeOpts = (window.PTCommunity && PTCommunity.homeOptions) ? PTCommunity.homeOptions() : {};
    const communityShell = !!(window.PTCommunity && PTCommunity.requireMembership && PTCommunity.requireMembership());
    if (dailyHost) {
      if (communityShell && homeOpts.hideDailySpot) {
        dailyHost.innerHTML = '';
        dailyHost.classList.add('hidden');
      } else {
        dailyHost.classList.remove('hidden');
        const guestDaily = !!(window.PTAuth && PTAuth.isGuest && PTAuth.isGuest())
          || !!(window.PTGuest && PTGuest.isActive && PTGuest.isActive());
        if (user && !guestDaily) {
          withLazyChunk('school', function () {
            if (window.PTSchool && PTSchool.renderHomeDailySpot) {
              PTSchool.renderHomeDailySpot(dailyHost);
            } else {
              dailyHost.innerHTML = '';
            }
          });
        } else {
          dailyHost.innerHTML = '';
        }
      }
    }

    const quickHead = document.querySelector('#tab-home .home-section-head');
    const homeGrid = $('#home-grid');
    if (communityShell && homeOpts.hideQuickAccess) {
      if (quickHead) quickHead.classList.add('hidden');
      if (homeGrid) homeGrid.classList.add('hidden');
    } else {
      if (quickHead) quickHead.classList.remove('hidden');
      if (homeGrid) homeGrid.classList.remove('hidden');
    }

    const errBadge = document.querySelector('[data-home-badge="errors"]');
    if (errBadge) {
      const existing = errBadge.parentElement.querySelector('.home-card-badge');
      if (existing) existing.remove();
      if (errs.length > 0) {
        const b = document.createElement('span');
        b.className = 'home-card-badge';
        b.textContent = errs.length > 99 ? '99+' : String(errs.length);
        errBadge.parentElement.appendChild(b);
      }
    }

    const coachMount = $('#home-coach-mount');
    const guestOn = !!(window.PTAuth && PTAuth.isGuest && PTAuth.isGuest())
      || !!(window.PTGuest && PTGuest.isActive && PTGuest.isActive());
    const homeOptsCoach = (window.PTCommunity && PTCommunity.homeOptions) ? PTCommunity.homeOptions() : {};
    const communityShellCoach = !!(window.PTCommunity && PTCommunity.requireMembership && PTCommunity.requireMembership());
    if (coachMount && (communityShellCoach && homeOptsCoach.hideCoachMount)) {
      coachMount.innerHTML = '';
      coachMount.classList.add('hidden');
    } else if (coachMount && !guestOn && window.PTAIReport && PTAIReport.mountWelcome) {
      coachMount.classList.remove('hidden');
      PTAIReport.mountWelcome(coachMount, {
        userName: firstNameFromUser(window.PT_AUTH_USER),
        onTrain: () => goToTab('play', { setup: true })
      });
    }

    homeBootRendered = true;
    maybeFinishHomeBoot(false);
    if (window.PTUsageUI && PTUsageUI.refreshHost) PTUsageUI.refreshHost($('#home-usage'));
    if (window.PTBilling && PTBilling.mountAnnualUpsell) {
      if (communityShellCoach && homeOptsCoach.hideAnnualUpsell) {
        var upsell = $('#home-annual-upsell');
        if (upsell) {
          upsell.innerHTML = '';
          upsell.classList.add('hidden');
        }
      } else {
        var ent = window.PTEntitlements && PTEntitlements.get ? PTEntitlements.get() : null;
        PTBilling.mountAnnualUpsell($('#home-annual-upsell'), ent);
      }
    }
    if (window.PTOnboarding) {
      PTOnboarding.bind($('#home-onboarding'));
      PTOnboarding.render($('#home-onboarding'));
    }
    const gameHost = $('#home-gamification');
    if (gameHost) gameHost.innerHTML = '';
    if (window.PTReEngage && PTReEngage.renderBanner) PTReEngage.renderBanner();
    withLazyChunk('contact', function () {
      if (window.PTContact && PTContact.renderHomeNotice) PTContact.renderHomeNotice();
    });
  }

  function playDailySpotFromHome(btn) {
    const host = $('#home-daily-spot');
    if (btn && btn.disabled) {
      withLazyChunk('school', function () {
        if (window.PTSchool && PTSchool.showDailyPlayFlash && host) {
          PTSchool.showDailyPlayFlash(host, 'done');
        }
      });
      return;
    }
    withLazyChunk('school', function () {
      if (!window.PTSchool || !PTSchool.startDailySession) {
        if (window.PTSchool && PTSchool.showDailyPlayFlash && host) {
          PTSchool.showDailyPlayFlash(host, 'missing');
        }
        return;
      }
      const res = PTSchool.startDailySession();
      if (res && !res.ok && PTSchool.showDailyPlayFlash && host) {
        PTSchool.showDailyPlayFlash(host, res.reason);
      }
    });
  }

  window.ptPlayDailySpot = playDailySpotFromHome;

  function bindHomeDailyPlay() {
    if (document._ptDailyPlayDocBound) return;
    document._ptDailyPlayDocBound = true;
    document.addEventListener('click', function (e) {
      const btn = e.target && e.target.closest ? e.target.closest('[data-school-daily-play]') : null;
      if (!btn) return;
      const host = $('#home-daily-spot');
      if (!host || !host.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      playDailySpotFromHome(btn);
    }, true);
  }

  function bindHome() {
    const brand = $('#brand-home');
    if (brand) brand.addEventListener('click', () => goToTab('home'));

    const cta = $('#home-cta-play');
    if (cta) cta.addEventListener('click', () => goToTab('play', { setup: true }));

    const grid = $('#home-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const scrollCoach = e.target.closest('[data-scroll-coach]');
        if (scrollCoach) {
          const el = $('#home-coach');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        const card = e.target.closest('[data-go-tab]');
        if (!card) return;
        const tab = card.dataset.goTab;
        if (tab === 'play') goToTab('play', { setup: true });
        else goToTab(tab);
        if (window.PTOnboarding) {
          if (tab === 'sessions') PTOnboarding.markDone('demo');
          if (tab === 'errors' || tab === 'stats') PTOnboarding.markDone('leaks');
        }
      });
    }

    window.addEventListener('pt-auth-bootstrap', () => renderHome());
    window.addEventListener('pt-auth-ready', () => renderHome());
    window.addEventListener('pt-community-switch', () => {
      if (window.PTCommunity && PTCommunity.invalidateWelcomeCache) PTCommunity.invalidateWelcomeCache();
      if (window.PTCommunity && PTCommunity.applyFormats) PTCommunity.applyFormats();
      renderHome();
      if (window.PTEntitlements && PTEntitlements.refresh) PTEntitlements.refresh();
      if (window.PTCloud && PTCloud.syncNow) {
        try { PTCloud.syncNow(); } catch (e) { /* noop */ }
      }
      /* Forzar refresco de pestañas que leen Store (stats/errores/escuela) */
      try {
        document.dispatchEvent(new CustomEvent('pt-store-community-changed'));
      } catch (e2) { /* noop */ }
    });
    window.addEventListener('pt-community-ready', () => {
      if (window.PTCommunity && PTCommunity.applyFormats) PTCommunity.applyFormats();
      if ($('#tab-home') && $('#tab-home').classList.contains('active')) renderHome();
    });
    window.addEventListener('pt-cloud-synced', () => {
      homeBootCloudSettled = true;
      if ($('#tab-home') && $('#tab-home').classList.contains('active')) renderHome();
      maybeFinishHomeBoot(true);
      if ($('#tab-school') && $('#tab-school').classList.contains('active') && window.PTSchool) {
        if (typeof window.PTSchool.refreshFromCloud === 'function') {
          window.PTSchool.refreshFromCloud();
        } else if (typeof window.PTSchool.render === 'function' &&
            !(window.PTSchool.isSessionActive && window.PTSchool.isSessionActive())) {
          window.PTSchool.render($('#school-content'));
        }
      }
    });
    window.addEventListener('pt-cloud-login-sync-finished', () => {
      homeBootCloudSettled = true;
      maybeFinishHomeBoot(true);
    });
    bindHomeDailyPlay();
  }

  function goToTab(tabId, opts) {
    opts = opts || {};
    if (window.PTGuest && PTGuest.isActive && PTGuest.isActive()) {
      if (tabId !== 'play') {
        if (PTGuest.maybeGate) PTGuest.maybeGate('tab');
        return;
      }
    }
    // Gate síncrono: menús + ACCESS_CACHE. Las RPCs autorizan al cargar datos.
    if (window.PTCommunity && typeof window.PTCommunity.canOpenTab === 'function' &&
        tabId !== 'home' && tabId !== 'account') {
      var access = window.PTCommunity.canOpenTab(tabId);
      if (access && access.allowed === false) {
        if (window.PTCommunity.requireMembership && window.PTCommunity.requireMembership() &&
            window.PTCommunity.hasAccess && !window.PTCommunity.hasAccess()) {
          window.PTCommunity.showAccessDenied();
          return;
        }
        goToTabUnlocked('home', {});
        return;
      }
    }
    // Sin JWT vivo no abrir Entrenador / Escuela / cuenta (evita estado a medias).
    var needsLiveAuth = tabId === 'play' || tabId === 'school' || tabId === 'account' ||
      tabId === 'admin' || tabId === 'manager' || tabId === 'tournaments';
    if (needsLiveAuth && window.PTAuth && typeof window.PTAuth.ensureLiveSession === 'function' &&
        !(window.PTGuest && PTGuest.isActive && PTGuest.isActive())) {
      window.PTAuth.ensureLiveSession().then(function (ok) {
        if (ok) goToTabUnlocked(tabId, opts);
      });
      return;
    }
    goToTabUnlocked(tabId, opts);
  }

  function goToTabUnlocked(tabId, opts) {
    opts = opts || {};
    if (window.PTLog && PTLog.event) PTLog.event('tab_view', { tab: tabId });
    $$('.tab').forEach((x) => x.classList.toggle('active', x.dataset.tab === tabId));
    $$('.tab-panel').forEach((x) => x.classList.remove('active'));
    const panel = $('#tab-' + tabId);
    if (panel) panel.classList.add('active');
    if (isMobileLayout()) closeMobileNav();

    if (tabId === 'home') {
      if (!homeBootDone) setHomeBoot(true);
      renderHome();
    }
    if (tabId === 'play') {
      const active = $('#play-active');
      const inTable = active && !active.classList.contains('hidden') && !opts.setup;
      if (opts.table || inTable) showPlayTable();
      else showPlaySetup();
    }
    if (tabId === 'school') {
      var schoolUser = (window.PTAuth && window.PTAuth.getUser && window.PTAuth.getUser())
        || window.PT_AUTH_USER || null;
      var schoolDemo = window.PTDemo && window.PTDemo.isActive && window.PTDemo.isActive();
      /* GA: cualquier usuario autenticado (no demo). El chunk school confirma con schoolMenuVisible. */
      var canSchool = !!(schoolUser && !schoolDemo);
      if (window.PTSchool && typeof window.PTSchool.schoolMenuVisible === 'function') {
        canSchool = window.PTSchool.schoolMenuVisible();
      }
      if (!canSchool) {
        goToTab('home');
        return;
      }
      withLazyChunk('school', function () {
        var visible = window.PTSchool && typeof window.PTSchool.schoolMenuVisible === 'function'
          ? window.PTSchool.schoolMenuVisible()
          : (window.PTSchool && typeof window.PTSchool.hasAdminAccess === 'function'
            ? window.PTSchool.hasAdminAccess()
            : true);
        if (!visible) {
          goToTab('home');
          return;
        }
        if (window.PTSchool && window.PTSchool.ensureBannerEl) window.PTSchool.ensureBannerEl();
        if (window.PTSchool && window.PTSchool.render) window.PTSchool.render($('#school-content'));
      });
    }
    if (tabId === 'legendary') {
      const legDemo = window.PTDemo && window.PTDemo.isActive && window.PTDemo.isActive();
      let canLegendary = legendaryMenuVisible();
      if (window.PTLegendary && typeof window.PTLegendary.legendaryMenuVisible === 'function') {
        canLegendary = window.PTLegendary.legendaryMenuVisible();
      }
      if (!canLegendary || legDemo) {
        goToTab('home');
        return;
      }
      withLazyChunk('legendary', function () {
        if (window.PTLegendary && window.PTLegendary.legendaryMenuVisible &&
            !window.PTLegendary.legendaryMenuVisible()) {
          goToTab('home');
          return;
        }
        if (window.PTLegendary && window.PTLegendary.render) {
          window.PTLegendary.render($('#legendary-content'));
        }
      });
    }
    if (tabId === 'tournaments') {
      const tDemo = window.PTDemo && window.PTDemo.isActive && window.PTDemo.isActive();
      let canTournaments = tournamentsMenuVisible();
      if (window.PTTournaments && typeof window.PTTournaments.menuVisible === 'function') {
        canTournaments = window.PTTournaments.menuVisible();
      }
      if (!canTournaments || tDemo) {
        goToTab('home');
        return;
      }
      withLazyChunk('tournaments', function () {
        if (window.PTTournaments && window.PTTournaments.menuVisible &&
            !window.PTTournaments.menuVisible()) {
          goToTab('home');
          return;
        }
        if (window.PTTournaments && window.PTTournaments.refreshMenuVisibility) {
          window.PTTournaments.refreshMenuVisibility();
        }
        if (window.PTTournaments && window.PTTournaments.render) {
          window.PTTournaments.render($('#tournaments-content'));
        }
      });
    }
    if (tabId === 'learn') {
      withLazyChunk('learn', function () {
        if (window.PTBeginnerGuide && PTBeginnerGuide.render) {
          PTBeginnerGuide.render($('#learn-content'));
        }
      });
    }
    if (tabId === 'analysis') {
      // sessions: Importer.analyzeHand (requerido por buildAnalyzedHand / IA texto)
      withLazyChunk(['sessions', 'analysis'], function () {
        if (window.PTHandAnalysis && PTHandAnalysis.render) {
          PTHandAnalysis.render($('#analysis-content'));
        }
      });
    }
    if (tabId === 'history') renderHistory();
    if (tabId === 'errors') renderErrors();
    if (tabId === 'stats') renderStats();
    if (tabId === 'contact') {
      withLazyChunk('contact', function () {
        if (window.PTContact && PTContact.render) PTContact.render(opts.threadId || null);
        if (window.PTContact && PTContact.refreshBadge) PTContact.refreshBadge();
        if (window.PTContact && PTContact.renderHomeNotice) PTContact.renderHomeNotice();
      });
    }
    if (tabId === 'play' && window.PTUsageUI && PTUsageUI.refreshHost) {
      PTUsageUI.refreshHost($('#play-usage'));
    }
    if (tabId === 'ranges') {
      withLazyChunk('ranges', function () {
        var pending = window.__ptPendingRanges || null;
        if (pending && typeof applyRangesExplorerState === 'function') {
          try { applyRangesExplorerState(pending); } catch (ePend) { /* ignore */ }
          window.__ptPendingRanges = null;
        }
        renderRangesExplorer();
      });
    }
    if (tabId === 'manager') {
      withLazyChunk('manager', function () {
        if (window.PTManagerPanel && window.PTManagerPanel.render) {
          window.PTManagerPanel.render();
        }
      });
    }
    if (tabId === 'pricing') {
      if (window.PTCommunity && window.PTCommunity.config) {
        var cfgPrice = window.PTCommunity.config();
        if (cfgPrice && cfgPrice.billing && cfgPrice.billing.hidePricing) {
          goToTabUnlocked('home', {});
          return;
        }
      }
      renderPricing();
    }
    if (tabId === 'sessions') {
      if (window.PTUsageUI && PTUsageUI.refreshHost) PTUsageUI.refreshHost($('#sessions-usage'));
      withLazyChunk('sessions', function () {
        if (opts.openSessionId) {
          showSessionLoading('Cargando sesión…');
          void openSession(opts.openSessionId);
          refreshSessionsFromCloud();
          return;
        }
        if (opts.skipDefaultView) return;
        showSessionsView('home');
        renderSessionsList();
        refreshSessionsFromCloud();
      });
    }
    if (tabId === 'admin') {
      var adminUser = window.PTAuth && window.PTAuth.getUser ? window.PTAuth.getUser() : null;
      var demoOn = window.PTDemo && window.PTDemo.isActive && window.PTDemo.isActive();
      var canAdmin = !!(adminUser && adminUser.isAdmin && !demoOn);
      if (window.PTAdmin && typeof window.PTAdmin.hasAccess === 'function') {
        canAdmin = window.PTAdmin.hasAccess();
      }
      if (!canAdmin) {
        if (window.PTAdmin && window.PTAdmin.lockdown) window.PTAdmin.lockdown();
        goToTab('home');
        return;
      }
      withLazyChunk('admin', function () {
        if (window.PTAdmin && window.PTAdmin.hasAccess && !window.PTAdmin.hasAccess()) {
          window.PTAdmin.lockdown();
          goToTab('home');
          return;
        }
        if (window.PTAdmin && window.PTAdmin.render) window.PTAdmin.render();
      });
    }
    if (tabId === 'account') {
      var accountUser = window.PTAuth && window.PTAuth.getUser ? window.PTAuth.getUser() : null;
      if (!accountUser) {
        goToTab('home');
        return;
      }
      if (window.PTAccountSettings && window.PTAccountSettings.render) {
        window.PTAccountSettings.render();
      }
    }
  }

  var accountSettingsBack = $('#account-settings-back');
  if (accountSettingsBack && !accountSettingsBack.dataset.bound) {
    accountSettingsBack.dataset.bound = '1';
    accountSettingsBack.addEventListener('click', function () {
      goToTab('home');
    });
  }

  window.goToTab = goToTab;
  window.goToTabUnlocked = goToTabUnlocked;
  window.refreshLegendaryTabVisibility = refreshLegendaryTabVisibility;
  window.refreshTournamentsTabVisibility = refreshTournamentsTabVisibility;
  window.isLegendaryAdminUser = isLegendaryAdminUser;
  window.openSession = openSession;
  window.syncAdvisorSettingsToSession = syncAdvisorSettingsToSession;
  window.syncFormatHubUI = syncFormatHubUI;

  function isMobileLayout() {
    return window.matchMedia('(max-width: 680px)').matches;
  }

  function isMobilePortraitLayout() {
    return isMobileLayout() && window.matchMedia('(orientation: portrait)').matches;
  }

  /** Mide header/viewport y fija --play-stage-h / --play-actions-h / --play-hud-h para el layout móvil. */
  function syncPlayMobileStage() {
    const root = document.documentElement;
    if (!isMobilePortraitLayout()) {
      root.style.removeProperty('--play-stage-h');
      root.style.removeProperty('--play-actions-h');
      root.style.removeProperty('--play-hud-h');
      return;
    }
    const header = document.querySelector('.header-bar');
    const main = document.querySelector('main');
    const actions = document.querySelector('#play-active .play-stage .actions');
    const actionLine = document.querySelector('#play-active .play-stage #action-line');
    const hud = document.querySelector('#play-active .play-hud');
    const headerH = header ? Math.round(header.getBoundingClientRect().height) : 56;
    let padTop = 10;
    if (main) {
      const cs = getComputedStyle(main);
      padTop = parseFloat(cs.paddingTop) || 0;
    }
    const vv = window.visualViewport;
    const vh = Math.round((vv && vv.height) || window.innerHeight || 0);
    /* Hasta el borde inferior del viewport: sesión/consultas quedan bajo scroll. */
    const stage = Math.max(300, vh - headerH - padTop);
    root.style.setProperty('--play-stage-h', stage + 'px');
    let actionsH = 108;
    if (actions && actions.offsetHeight > 0) {
      actionsH = Math.round(actions.offsetHeight + 10);
    }
    // La línea de acción previa vive entre mesa y botones: reservar su altura
    // para que el grid compacto de 2 filas no quede fuera del viewport.
    if (actionLine && !actionLine.classList.contains('hidden') && actionLine.offsetHeight > 0) {
      actionsH += Math.round(actionLine.offsetHeight + 8);
    }
    root.style.setProperty('--play-actions-h', Math.max(72, actionsH) + 'px');
    let hudH = 48;
    const playActive = document.getElementById('play-active');
    const schoolSession = !!(playActive && playActive.classList.contains('is-school-session'));
    const legendarySession = !!(playActive && playActive.classList.contains('is-legendary-session'));
    if (schoolSession || legendarySession) {
      hudH = 0;
    } else if (hud && hud.offsetHeight > 0) {
      hudH = Math.round(hud.offsetHeight + 8);
      hudH = Math.max(40, hudH);
    }
    root.style.setProperty('--play-hud-h', hudH + 'px');
  }

  function portalMobileNav() {
    if (!isMobileLayout()) return;
    const nav = $('#topbar-nav');
    const backdrop = $('#nav-backdrop');
    if (!nav || !backdrop || nav.parentElement === document.body) return;
    document.body.appendChild(backdrop);
    document.body.appendChild(nav);
    document.body.classList.add('nav-portal');
  }

  function restoreMobileNav() {
    const nav = $('#topbar-nav');
    const backdrop = $('#nav-backdrop');
    const bar = $('.header-bar');
    const shell = $('#app-shell');
    if (!nav || !bar || !shell) return;
    if (nav.parentElement !== bar) bar.appendChild(nav);
    if (backdrop && backdrop.parentElement !== shell) {
      const main = shell.querySelector('main');
      shell.insertBefore(backdrop, main);
    }
    document.body.classList.remove('nav-portal');
    closeMobileNav();
  }

  function closeMobileNav() {
    document.body.classList.remove('nav-open');
    const toggle = $('#nav-toggle');
    const backdrop = $('#nav-backdrop');
    const nav = $('#topbar-nav');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (backdrop) {
      backdrop.classList.add('hidden');
      backdrop.setAttribute('aria-hidden', 'true');
    }
    if (nav) nav.setAttribute('aria-hidden', 'true');
    if (window.PTAuth && window.PTAuth.collapseAccountAccordion) {
      window.PTAuth.collapseAccountAccordion();
    }
  }

  function bindMobileNav() {
    const toggle = $('#nav-toggle');
    const closeBtn = $('#nav-close');
    const backdrop = $('#nav-backdrop');
    const nav = $('#topbar-nav');
    if (!toggle) return;

    if (isMobileLayout()) portalMobileNav();

    function openNav() {
      if (isMobileLayout()) portalMobileNav();
      document.body.classList.add('nav-open');
      toggle.setAttribute('aria-expanded', 'true');
      if (nav) nav.setAttribute('aria-hidden', 'false');
      if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
      }
    }

    toggle.addEventListener('click', () => {
      if (document.body.classList.contains('nav-open')) closeMobileNav();
      else openNav();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeMobileNav);
    if (backdrop) backdrop.addEventListener('click', closeMobileNav);
    window.addEventListener('resize', () => {
      if (isMobileLayout()) portalMobileNav();
      else restoreMobileNav();
      syncPlayMobileStage();
      if (hand) renderTable();
    });
    window.addEventListener('pt:school-session-ui', syncPlayMobileStage);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncPlayMobileStage);
    }
    window.addEventListener('orientationchange', () => {
      setTimeout(syncPlayMobileStage, 120);
    });
    syncPlayMobileStage();
  }

  function bindTabs() {
    $$('.tab').forEach((t) => t.addEventListener('click', () => {
      const tabId = t.dataset.tab;
      if (tabId === 'play') resetPlaySession();
      else goToTab(tabId);
    }));
  }

  function bindControls() {
    $('#new-hand').addEventListener('click', () => {
      if (window.PTGuest && PTGuest.isActive && PTGuest.isActive()) {
        if (PTGuest.remaining && PTGuest.remaining() <= 0) {
          if (PTGuest.showGate) PTGuest.showGate('limit');
          return;
        }
        void startNewHand();
        return;
      }
      pendingForce = null;
      leakReplayQueue = [];
      void startNewHand();
    });
    $('#replay-hand').addEventListener('click', () => replayCurrentHand());
    $('#new-session').addEventListener('click', () => resetPlaySession());
    $('#repeat-errors').addEventListener('change', (e) => { repeatErrorsMode = e.target.checked; });
    const syncBtn = $('#sync-cloud');
    if (syncBtn) syncBtn.addEventListener('click', () => runCloudSync(syncBtn));
    window.addEventListener('pt-cloud-synced', async () => {
      renderHistory();
      renderErrors();
      renderStats();
      const sessionsPanel = $('#tab-sessions');
      if (sessionsPanel && sessionsPanel.classList.contains('active')) {
        if (Store.refreshSessionsIndexFromCloud) {
          try { await Store.refreshSessionsIndexFromCloud(); } catch (e) { /* noop */ }
        }
        renderSessionsList();
      }
    });
    window.addEventListener('pt-sample-session-ready', () => {
      const sessionsPanel = $('#tab-sessions');
      if (sessionsPanel && sessionsPanel.classList.contains('active')) renderSessionsList();
    });
    $('#clear-history').addEventListener('click', () => {
      if (confirm('¿Borrar el histórico de manos? No se modifican errores ni estadísticas globales.')) {
        Store.clearHistory();
        renderHistory();
      }
    });
    $('#clear-errors').addEventListener('click', () => {
      if (confirm('¿Vaciar la lista de errores? No se modifica el histórico ni las estadísticas globales.')) {
        Store.clearErrors();
        renderErrors();
      }
    });
    const clearStatsBtn = $('#clear-stats');
    if (clearStatsBtn) {
      clearStatsBtn.addEventListener('click', () => {
        if (confirm('¿Resetear las estadísticas globales a cero? No se borra el histórico ni la lista de errores.')) {
          Store.clearStats();
          renderStats();
        }
      });
    }
    $('#train-errors').addEventListener('click', () => trainNextError());
    const trainWorst = $('#train-worst-spots');
    if (trainWorst) trainWorst.addEventListener('click', () => startWorstSpotsDrill());
    $('#export-data').addEventListener('click', exportData);
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
    const liveAdvPanel = $('#live-advisor-panel');
    if (liveAdvPanel && !liveAdvPanel._ptDisableBound) {
      liveAdvPanel._ptDisableBound = true;
      liveAdvPanel.addEventListener('click', (e) => {
        if (e.target.closest('[data-dismiss-advisor-alert]')) {
          if (window.PTLiveAdvisor && PTLiveAdvisor.clearPendingAlert) PTLiveAdvisor.clearPendingAlert();
          updateLiveAdvisor();
          return;
        }
        if (!e.target.closest('[data-disable-live-advisor]')) return;
        disableLiveAdvisorFromPanel();
      });
    }
    const actionLineEl = $('#action-line');
    if (actionLineEl && !actionLineEl._ptDisableBound) {
      actionLineEl._ptDisableBound = true;
      actionLineEl.addEventListener('click', (e) => {
        if (!e.target.closest('[data-disable-action-line]')) return;
        disableActionLineFromPanel();
      });
    }
    if (!window._ptLangBound) {
      window._ptLangBound = true;
      window.addEventListener('pt-lang-change', function () {
        if (window.PTI18n && window.PTI18n.apply) window.PTI18n.apply(document);
        if (hand) {
          try { renderTable(); } catch (e) { /* ignore */ }
          try { updateLiveAdvisor(); } catch (e2) { /* ignore */ }
        }
      });
    }
    const rmm = $('#range-matrix-modal');
    if (rmm) {
      rmm.addEventListener('click', (e) => {
        if (e.target.id === 'range-matrix-modal' || e.target.closest('[data-close-matrix]')) closeRangeMatrixModal();
      });
    }
    const rcm = $('#range-cell-modal');
    if (rcm) {
      rcm.addEventListener('click', (e) => {
        if (e.target.id === 'range-cell-modal' || e.target.closest('[data-close-cell-detail]')) {
          closeRangeCellDetail();
        }
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const cellModal = $('#range-cell-modal');
      if (cellModal && !cellModal.classList.contains('hidden')) {
        e.preventDefault();
        closeRangeCellDetail();
        return;
      }
      const matrixModal = $('#range-matrix-modal');
      if (matrixModal && !matrixModal.classList.contains('hidden')) {
        e.preventDefault();
        closeRangeMatrixModal();
      }
    });
    document.addEventListener('click', (e) => {
      const cellBtn = e.target.closest('[data-rm-detail]');
      if (cellBtn) {
        e.preventDefault();
        e.stopPropagation();
        withLazyChunk('ranges', function () {
          openRangeCellDetail(cellBtn.getAttribute('data-rm-detail'));
        });
        return;
      }
      const btn = e.target.closest('[data-range-matrix]');
      if (!btn) return;
      const source = btn.dataset.matrixSource || 'session';
      const h = source === 'trainer' ? hand : currentHand;
      if (!h || !h.decisions) return;
      const idx = parseInt(btn.dataset.matrixDecisionIdx, 10);
      if (isNaN(idx) || !h.decisions[idx]) return;
      e.preventDefault();
      const kind = btn.dataset.matrixKind || 'gto';
      withLazyChunk('ranges', function () {
        if (kind === 'villain') openVillainMatrixModal(h, h.decisions[idx], source);
        else openRangeMatrixModal(h, h.decisions[idx], source);
      });
    });

    // sesiones
    $('#session-file').addEventListener('change', (e) => {
      $('#process-session').disabled = !e.target.files.length;
      $('#import-status').textContent = e.target.files.length ? `Listo para procesar: ${e.target.files[0].name}` : '';
    });
    $('#process-session').addEventListener('click', processSessionFile);
    const autoBtn = $('#auto-import-folder');
    const autoStop = $('#auto-import-stop');
    if (autoBtn) autoBtn.addEventListener('click', () => { void startAutoImportFolder(); });
    if (autoStop) autoStop.addEventListener('click', stopAutoImportFolder);
    $$('.sessions-kind-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        sessionsListTab = btn.getAttribute('data-sessions-tab') || 'cash';
        try { sessionStorage.setItem('pt_sessions_tab', sessionsListTab); } catch (e) { /* ignore */ }
        renderSessionsList();
      });
    });
    try {
      const savedTab = sessionStorage.getItem('pt_sessions_tab');
      if (savedTab === 'cash' || savedTab === 'spin' || savedTab === 'mtt') sessionsListTab = savedTab;
    } catch (e) { /* ignore */ }
    $('#back-to-sessions').addEventListener('click', () => {
      if (analysisReviewReturn) {
        analysisReviewReturn = false;
        restoreSessionReviewBackLabel();
        goToTab('analysis');
        return;
      }
      showSessionsView('home'); renderSessionsList();
    });
    $('#back-to-detail').addEventListener('click', () => {
      if (analysisReviewReturn) {
        analysisReviewReturn = false;
        restoreSessionReviewBackLabel();
        goToTab('analysis');
        return;
      }
      showSessionsView('detail');
    });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-review], [data-replay]');
      if (!btn || !btn.closest('#session-detail-content')) return;
      if (btn.dataset.review) openHandReview(btn.dataset.review, 'review');
      else if (btn.dataset.replay) openHandReview(btn.dataset.replay, 'replay');
    });
  }

  function resetPlaySession(showSetup) {
    closeModal();
    session = {
      hands: 0, net: 0, evLossBB: 0, decisions: 0, good: 0,
      handScoreSum: 0,
      byStreet: emptyByStreet(),
      startedAt: Date.now()
    };
    if (window.PTLiveAdvisor && PTLiveAdvisor.clearPendingAlert) PTLiveAdvisor.clearPendingAlert();
    refreshSessionUI();
    $('#hand-log').innerHTML = '';
    pendingForce = null;
    if (showSetup !== false) {
      playSessionConfig = null;
      hand = null;
      goToTab('play', { setup: true });
    }
  }

  // ---------- Nueva mano ----------
  async function startNewHand() {
    if (startingHand) return;
    actionPlayGen += 1;
    startingHand = true;
    closeModal();
    if (window.PTLiveAdvisor && PTLiveAdvisor.clearPendingAlert) PTLiveAdvisor.clearPendingAlert();
    setPlayTableLoading(true);
    setPlayHandButtonsDisabled(true);
    $('#feedback').classList.add('hidden');
    await yieldToPaint();
    try {
      const guestOn = window.PTGuest && PTGuest.isActive && PTGuest.isActive();
      const Ent = window.PTEntitlements;
      const cfgEarly = pendingForce ? (replayPlayConfig || playSessionConfig) : playSessionConfig;
      const isLegendaryHand = !!(cfgEarly && cfgEarly.legendaryMode);
      const isSchoolHand = !!(cfgEarly && (cfgEarly.schoolMode || cfgEarly.school));
      /* Escuela y Legendary no consumen cupo diario del entrenador. */
      if (!guestOn && !isLegendaryHand && !isSchoolHand && Ent && Ent.ensureLoaded) {
        const ent = await Ent.ensureLoaded();
        const check = Ent.canStartTrainerHand(ent);
        if (!check.ok) {
          if (window.PTBilling) window.PTBilling.showPaywall(check.reason);
          return;
        }
        if (Ent.recordTrainerHand) {
          const rec = await Ent.recordTrainerHand();
          if (rec && rec.ok === false) {
            if (window.PTBilling) window.PTBilling.showPaywall(rec.error || 'trainer_limit');
            return;
          }
        }
      }
      if (guestOn) {
        if (PTGuest.remaining && PTGuest.remaining() <= 0) {
          if (PTGuest.showGate) PTGuest.showGate('limit');
          return;
        }
        const gForce = PTGuest.nextForce && PTGuest.nextForce();
        const gCfg = PTGuest.nextPlayConfig && PTGuest.nextPlayConfig();
        if (gForce) pendingForce = gForce;
        if (gCfg) {
          playSessionConfig = gCfg;
          replayPlayConfig = gCfg;
        }
      }

      let force = pendingForce;
      let cfg = force ? (replayPlayConfig || playSessionConfig) : playSessionConfig;
      if (!force && cfg && window.PTPlayConfig && PTPlayConfig.resolveHandConfig) {
        cfg = PTPlayConfig.resolveHandConfig(cfg, function () {
          return (window.Cards && Cards.rng && Cards.rng.random) ? Cards.rng.random() : Math.random();
        });
      }
      if (!force && repeatErrorsMode) {
        let errs = Store.getErrors();
        const streetFilter = cfg && cfg.practiceStreet;
        if (streetFilter && streetFilter !== 'random') {
          errs = errs.filter((e) => e.street === streetFilter);
        }
        if (errs.length) {
          const e = errs[Math.floor(Math.random() * errs.length)];
          if (prepareReplayFromStored(e)) force = pendingForce;
        }
      }
      replayPlayConfig = null;
      const streetTarget = cfg && cfg.practiceStreet;
      const intent = cfg && cfg.practiceIntent;
      const needsStreetFastForward = streetTarget && streetTarget !== 'random' && streetTarget !== 'preflop' && Engine.fastForwardToStreet;
      const needsBluffFilter = intent && intent !== 'mixed' && !force;
      if (needsStreetFastForward || needsBluffFilter) {
        let tries = 0;
        const maxTries = needsBluffFilter ? 18 : 12;
        while (tries < maxTries) {
          hand = Engine.newHand(force || undefined, cfg);
          if (needsStreetFastForward) Engine.fastForwardToStreet(hand, streetTarget);
          else if (needsBluffFilter && streetTarget === 'random' && Engine.fastForwardToStreet) {
            // Faroles: preferir postflop (river con más peso).
            const target = Math.random() < 0.55 ? 'river' : (Math.random() < 0.5 ? 'turn' : 'flop');
            Engine.fastForwardToStreet(hand, target);
          }
          const streetOk = !needsStreetFastForward
            || (!hand.result && hand.current && hand.stage === streetTarget);
          const intentOk = !needsBluffFilter
            || (Engine.currentMatchesPracticeIntent && Engine.currentMatchesPracticeIntent(hand));
          if (streetOk && intentOk && !hand.result && hand.current) break;
          tries++;
        }
      } else {
        hand = Engine.newHand(force || undefined, cfg);
      }
      pendingForce = null;
      if (window.PTLog && PTLog.event && hand) {
        PTLog.event('hand_start', {
          scenario: (hand.scenario && hand.scenario.type) || 'unknown',
          range: (cfg && cfg.handRange) || 'random',
          villain: (cfg && cfg.villainLevel) || 'pro',
          replay: !!force
        });
      }
      $('#hand-log').innerHTML = '';
      setPlayTableLoading(false);
      const played = await playHandIntro(hand);
      if (!played) return;
      renderTable();
      renderActions();
    } catch (e) {
      console.error('[Play] startNewHand failed', e);
    } finally {
      startingHand = false;
      setPlayTableLoading(false);
      setPlayHandButtonsDisabled(false);
    }
  }

  // Repite una mano guardada (histórico, errores o mano actual) con semilla y config originales
  function prepareReplayFromStored(rec) {
    if (!rec) return false;
    const snap = rec.replaySnapshot;
    let sc = (snap && snap.scenario) || rec.scenarioRaw;
    if (!sc || !sc.type) sc = scenarioFromError(rec);
    if (!sc || !sc.type) return false;

    const seed = rec.seed != null ? rec.seed : (snap && snap.seed);
    pendingForce = Object.assign({}, sc, { seed: seed });
    delete pendingForce.forceDeal;
    delete pendingForce.forceScript;
    replayPlayConfig = (snap && snap.playConfig) || rec.playConfig || playSessionConfig || null;

    const disp = (snap && snap.displayHeroPos) || rec.displayHeroPos;
    if (disp && !pendingForce.heroPos) pendingForce.displayHeroPos = disp;

    // Manos de análisis / cartas forzadas / replay histórico: restaurar deal y guion.
    // Importante: un forceDeal vacío (sin heroCards) NO debe tapar el fallback.
    function forceDealUsable(fd) {
      if (!fd) return false;
      if (fd.heroCards && fd.heroCards.length === 2 && fd.heroCards[0] !== fd.heroCards[1]) return true;
      if (fd.holeCards && typeof fd.holeCards === 'object') {
        const keys = Object.keys(fd.holeCards);
        for (let i = 0; i < keys.length; i++) {
          const c = fd.holeCards[keys[i]];
          if (c && c.length === 2 && c[0] && c[1] && c[0] !== c[1]) return true;
        }
      }
      return false;
    }
    const snapDeal = snap && snap.forceDeal;
    const recDeal = rec.forceDeal;
    const forceDeal = forceDealUsable(snapDeal) ? snapDeal
      : (forceDealUsable(recDeal) ? recDeal
        : (rec.heroCards && rec.heroCards.length === 2 ? {
          heroCards: rec.heroCards.slice(0, 2),
          villainCards: (rec.villainCards && rec.villainCards.length === 2) ? rec.villainCards.slice(0, 2) : null,
          board: (rec.board || []).slice(0, 5),
          villainPos: rec.villainPos || null,
          holeCards: (snapDeal && snapDeal.holeCards) || (recDeal && recDeal.holeCards) || null
        } : null));
    if (forceDeal) pendingForce.forceDeal = forceDeal;
    const forceScript = (snap && snap.forceScript) || rec.forceScript || null;
    if (forceScript) pendingForce.forceScript = forceScript;
    return true;
  }

  function replayFromStored(rec) {
    if (!prepareReplayFromStored(rec)) return false;
    goToPlay();
    void startNewHand();
    return true;
  }

  // Juega en el entrenador una mano de análisis: mismas cartas (héroe, villano y
  // board). El villano sigue las acciones reales hasta que el héroe se desvíe.
  function playAnalysisHand(force, playConfig) {
    if (!force) return false;
    pendingForce = force;
    if (playConfig) playSessionConfig = playConfig;
    replayPlayConfig = playConfig || playSessionConfig || null;
    if (window.PTLiveAdvisor && playSessionConfig) {
      PTLiveAdvisor.savePreference(!!playSessionConfig.liveAdvisor);
    }
    goToPlay();
    void startNewHand();
    return true;
  }
  window.playAnalysisHand = playAnalysisHand;

  function setAnalysisReviewBackLabel() {
    const btn = $('#back-to-detail');
    if (btn) btn.innerHTML = '&laquo; Volver';
  }
  function restoreSessionReviewBackLabel() {
    const btn = $('#back-to-detail');
    if (btn) btn.innerHTML = '&laquo; Volver a la sesión';
  }

  // Abre la revisión paso a paso / repaso GTO de una mano de análisis reutilizando
  // la vista de revisión de sesiones.
  function openAnalysisHandReview(hand, mode) {
    if (!hand) return;
    currentHand = hand;
    currentSession = { id: '__analysis__', analysis: true, hero: hand.hero };
    analysisReviewReturn = true;
    setAnalysisReviewBackLabel();
    goToTab('sessions', { skipDefaultView: true });
    withLazyChunk('sessions', function () {
      if (Importer.ensureHandSummary) Importer.ensureHandSummary(currentHand);
      if (Importer.ensureFullTimeline) Importer.ensureFullTimeline(currentHand);
      try {
        if (Importer.recomputeHandDecisions) Importer.recomputeHandDecisions(currentHand);
      } catch (e) {
        console.error('[Analysis] recompute failed', e);
      }
      showSessionsView('review');
      if (mode === 'replay') startInteractiveReplay();
      else renderTimelineReview();
    });
  }
  window.openAnalysisHandReview = openAnalysisHandReview;

  function trainerLeaksForStats(st) {
    const aggLeaks = window.PTStatsAggregate ? PTStatsAggregate.trainerTopLeaks(st, 5) : [];
    if (!window.PTLeaks || !PTLeaks.aggregate) return aggLeaks;
    const byKey = {};
    PTLeaks.aggregate(Store.getErrors()).forEach(function (l) { byKey[l.key] = l; });
    return aggLeaks.map(function (l) {
      const rich = byKey[l.key] || Object.keys(byKey).map(function (k) { return byKey[k]; })
        .find(function (item) { return leakKeysMatch(l.key, item.key); });
      const merged = rich ? Object.assign({}, l, rich) : l;
      if (!merged.errors || !merged.errors.length) {
        const found = collectReplayRecordsForLeakKey(l.key);
        if (found.length) merged.errors = found;
      }
      return merged;
    });
  }

  function startLeakReplay(leak) {
    if (!leak) return false;
    let errors = leak.errors;
    if ((!errors || !errors.length) && leak.key) {
      errors = collectReplayRecordsForLeakKey(leak.key);
    }
    if (!errors || !errors.length) {
      alert('No hay manos guardadas para repetir este leak.');
      return false;
    }
    leakReplayQueue = errors.slice().sort(function (a, b) {
      return (Number(b.evLoss) || 0) - (Number(a.evLoss) || 0);
    });
    const rec = leakReplayQueue.shift();
    if (!rec) return false;
    return replayFromStored(rec);
  }

  function spotKeyFromStored(rec, street) {
    if (window.PTLeaks && PTLeaks.spotKeyFromRecord) return PTLeaks.spotKeyFromRecord(rec, street);
    const sc = rec.scenarioRaw || rec.scenario || {};
    const type = typeof sc === 'object' ? (sc.type || 'unknown') : 'unknown';
    const pos = rec.displayHeroPos || rec.heroPos || '?';
    return type + '|' + pos + '|' + (street || 'preflop');
  }

  function leakKeysMatch(targetKey, candidateKey) {
    if (window.PTLeaks && PTLeaks.leakKeysMatch) return PTLeaks.leakKeysMatch(targetKey, candidateKey);
    return targetKey === candidateKey;
  }

  function collectReplayRecordsForLeakKey(key) {
    if (!key) return [];
    if (window.PTLeaks && PTLeaks.aggregate) {
      const match = PTLeaks.aggregate(Store.getErrors()).find(function (l) { return leakKeysMatch(key, l.key); });
      if (match && match.errors && match.errors.length) return match.errors.slice();
    }
    const out = [];
    const seen = new Set();
    Store.getErrors().forEach(function (e) {
      const k = e.spotKey || spotKeyFromStored(e, e.street);
      if (!leakKeysMatch(key, k) || seen.has(e.id)) return;
      seen.add(e.id);
      out.push(e);
    });
    Store.getHistory().forEach(function (rec) {
      (rec.decisions || []).forEach(function (d, idx) {
        if (d.class !== 'error' && d.class !== 'imprecisa') return;
        if (!leakKeysMatch(key, spotKeyFromStored(rec, d.street))) return;
        const id = rec.id + '_d' + idx;
        if (seen.has(id)) return;
        seen.add(id);
        out.push({
          id: id,
          seed: rec.seed,
          scenarioRaw: rec.scenarioRaw,
          playConfig: rec.playConfig,
          displayHeroPos: rec.displayHeroPos,
          replaySnapshot: rec.replaySnapshot,
          evLoss: d.evLoss
        });
      });
    });
    return out;
  }

  function continueLeakReplayOrNext() {
    pendingForce = null;
    if (leakReplayQueue.length) {
      const rec = leakReplayQueue.shift();
      if (prepareReplayFromStored(rec)) {
        void startNewHand();
        return;
      }
      leakReplayQueue = [];
    }
    void startNewHand();
  }

  // Repite la mano actual con la MISMA semilla / cartas forzadas
  function replayCurrentHand() {
    if (!hand) return;
    const snap = hand.replaySnapshot || {
      scenario: hand.scenario,
      seed: hand.seed,
      playConfig: hand.playConfig,
      displayHeroPos: hand.displayHeroPos,
      forceDeal: hand.forceDeal || null,
      forceScript: hand.forceScript || null
    };
    replayFromStored({
      seed: hand.seed,
      scenarioRaw: hand.scenario,
      playConfig: hand.playConfig,
      displayHeroPos: hand.displayHeroPos,
      replaySnapshot: snap,
      forceDeal: hand.forceDeal || (snap && snap.forceDeal) || null,
      forceScript: hand.forceScript || (snap && snap.forceScript) || null,
      heroCards: hand.hero && hand.hero.cards,
      villainCards: hand.villain && hand.villain.cards,
      board: (hand._predeal && hand._predeal.board) || hand.board
    });
  }

  function scenarioFromError(err) {
    const s = err.scenario || (err.scenarioRaw);
    if (err.scenarioRaw) return err.scenarioRaw;
    // reconstruye desde label
    if (typeof s === 'string') {
      if (s.startsWith('RFI')) return { type: 'RFI', heroPos: s.split(' ')[1] };
      const parts = s.split(' '); // "BB vs UTG"
      if (parts.length === 3) return { type: 'vsRFI', key: parts.join('_') };
    }
    return null;
  }

  // ---------- Render mesa ----------
  function renderTable() {
    if (hand && Engine.syncTableInvested && !handPresent(hand)) Engine.syncTableInvested(hand);
    const fmt = window.GTOPotMath ? window.GTOPotMath.formatBB : (x) => String(x);
    const view = handPresent(hand);
    const pot = view ? view.potBB : (hand.current ? hand.current.potBB : hand.potBB);
    $('#hero-pos').textContent = hand.displayHeroPos || hand.hero.pos;
    $('#pot').innerHTML = '<span class="pot-chips">' + chipStackHTML(pot || 0) + '</span> '
      + tt('play.pot') + ': <strong class="pot-amt">' + (pot != null ? fmt(pot) : '-') + ' bb</strong>';
    $('#hero-cards').innerHTML = hand.hero.cards.map(Cards.cardFaceHTML).join('');
    $('#hero-handname').textContent = handNameOnBoard();
    $('#hero-action').innerHTML = actionBadgeHTML(view ? view.heroAction : hand.heroAction);
    const heroTbl = hand.table || {};
    const heroSeatKey = hand.displayHeroPos || hand.hero.pos;
    const heroStreet = view
      ? ((view.streetBet && (view.streetBet[hand.hero.pos] || view.streetBet[heroSeatKey])) || 0)
      : ((heroTbl.streetBet && hand.hero.pos) ? (heroTbl.streetBet[hand.hero.pos] || 0) : 0);
    const heroInv = view
      ? ((view.invested && (view.invested[hand.hero.pos] || view.invested[heroSeatKey])) || 0)
      : (hand.heroInvested || 0);
    const heroChipsEl = $('#hero-chips');
    if (heroChipsEl) {
      let heroHtml = '';
      const heroSeat = hand.displayHeroPos || hand.hero.pos;
      if (window.PTStacks && hand.stacks && heroSeat) {
        heroHtml += renderSeatStack(hand, heroSeat);
      }
      if (heroInv > 0 || heroStreet > 0) heroHtml += renderSeatChips(heroInv, heroStreet);
      heroChipsEl.innerHTML = heroHtml;
    }
    const vBar = $('#villain-action-bar');
    if (vBar) {
      vBar.innerHTML = '';
      vBar.setAttribute('aria-hidden', 'true');
      vBar.classList.remove('is-visible');
    }
    const boardArea = document.querySelector('.board-area');
    if (boardArea) boardArea.classList.remove('has-villain-bar');
    const felt = document.querySelector('#play-active .table-felt');
    if (felt) {
      felt.classList.toggle('table-9max', is9MaxTable());
      felt.classList.toggle('table-3max', is3MaxTable());
    }
    const cfg = (hand && hand.playConfig) || playSessionConfig;
    if (!(cfg && cfg.legendaryMode)) {
      applyTableTheme((cfg && cfg.tableTheme) || loadTableTheme());
      renderTrainHud(cfg, hand);
    } else {
      renderTrainHud(null);
    }
    const heroSeatPos = hand.displayHeroPos || hand.hero.pos;
    const heroDealerEl = $('#hero-dealer');
    if (heroDealerEl) heroDealerEl.classList.toggle('hidden', heroSeatPos !== 'BTN');
    renderBoard();
    renderSeats();
    $('#spot-context').textContent = view
      ? tt('play.actionPlaying')
      : (hand.current ? hand.current.context : (hand.result ? hand.result.reason : ''));
    renderActionLine();
    renderBluffSpotBadge();
    updateLiveAdvisor();
    syncPlayMobileStage();
    if (window.PTLegendary && typeof window.PTLegendary.ensureLegendaryChromeFromHand === 'function') {
      window.PTLegendary.ensureLegendaryChromeFromHand(hand);
    }
  }

  /**
   * Línea de acción previa: cómo se ha llegado al board que se está viendo.
   * Solo calles ya cerradas, para no adelantar la acción en curso ni pisar la
   * animación de entrada. En la Escuela ya existe su propio banner de línea.
   * Se puede ocultar con la opción de entrenador (o × del panel), igual que el avisador.
   */
  function renderActionLine() {
    const el = $('#action-line');
    if (!el) return;
    const AL = window.PTActionLine;
    const cfg = (hand && hand.playConfig) || playSessionConfig;
    if (cfg && cfg.hideActionLine) {
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }
    let html = '';
    if (AL && hand && !(cfg && cfg.schoolMode)) {
      const view = handPresent(hand);
      const stage = (view && view.stage) || hand.stage;
      const through = stage === 'complete' ? 'river' : AL.previousStreet(stage);
      if (through) {
        const lang = window.PTI18n && window.PTI18n.getLang ? window.PTI18n.getLang() : 'es';
        html = AL.html(hand, { throughStreet: through, lang: lang });
      }
    }
    if (!html) {
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }
    const hideTitle = tt('play.hideActionLine');
    const head =
      '<div class="action-line-head">' +
      '<p class="action-line-title">' + tt('play.actionLine') + '</p>' +
      '<button type="button" class="action-line-disable" data-disable-action-line title="' +
      escapeHtml(hideTitle) + '" aria-label="' + escapeHtml(hideTitle) + '">×</button>' +
      '</div>';
    el.innerHTML = head + html;
    el.classList.remove('hidden');
  }

  function renderBluffSpotBadge() {
    // Mensajes de farol/cazar faroles ocultos en la mesa del entrenador.
    let el = $('#bluff-spot-badge');
    if (el) {
      el.classList.add('hidden');
      el.textContent = '';
    }
  }

  // Genera el HTML de una "burbuja" de acción (Check / Fold / fichas + bb).
  // `acting` marca la acción que se acaba de producir para destacarla sobre las
  // del resto de asientos, que se mantienen visibles toda la calle.
  /**
   * `compact` omite el importe: se usa cuando el montón de fichas del propio
   * asiento ya lo está mostrando y repetirlo solo ensancha la burbuja.
   */
  function actionBadgeHTML(action, acting, compact) {
    if (!action) return '';
    const t = action.type;
    const live = acting ? ' is-acting' : '';
    if (t === 'check') return `<span class="seat-act check${live}">Check</span>`;
    if (t === 'fold') return `<span class="seat-act fold${live}">Fold</span>`;
    const labels = window.PTI18n && window.PTI18n.getLang && window.PTI18n.getLang() === 'en'
      ? { open: 'Open', bet: 'Bet', call: 'Call', raise: 'Raise', allin: 'All-in' }
      : { open: 'Abre', bet: 'Apuesta', call: 'Iguala', raise: 'Sube', allin: 'All-in' };
    const lbl = labels[t] || t;
    const amt = (!compact && action.amount != null) ? `${action.amount} bb` : '';
    const kind = t === 'call' ? ' act-call' : (t === 'allin' ? ' act-allin' : ' act-raise');
    return `<span class="seat-act bet${kind}${live}"><span class="chip-ico"></span>${lbl}${amt ? ' · ' + amt : ''}</span>`;
  }

  function seatFoldMarkHTML() {
    return '<div class="seat-cards seat-folded-mark" aria-label="Fold"><span class="seat-fold-label">Fold</span></div>';
  }

  function handNameOnBoard() {
    const view = handPresent(hand);
    const board = view && view.board ? view.board : hand.board;
    if (!board.length) return '';
    try {
      const ev = Cards.evaluate(hand.hero.cards.concat(board));
      return tt('play.yourHand') + ': ' + ev.name;
    } catch (e) { return ''; }
  }

  function renderBoard() {
    const view = handPresent(hand);
    const board = view && view.board ? view.board : hand.board;
    const stage = view && view.stage ? view.stage : hand.stage;
    let html = (board || []).map(Cards.cardFaceHTML).join('');
    $('#board').innerHTML = html || (stage === 'preflop' || !stage
      ? '<span style="color:rgba(255,255,255,.3)">— preflop —</span>'
      : '');
  }

  const SEAT_AVATAR_SVG = '<svg viewBox="0 0 24 24" class="seat-avatar-svg" aria-hidden="true"><circle cx="12" cy="8.2" r="4.2"/><path d="M3.5 20.5c0-4.4 3.8-7.6 8.5-7.6s8.5 3.2 8.5 7.6"/></svg>';

  // El color de la ficha codifica la magnitud de la apuesta (blanca < roja <
  // verde < azul < negra < morada), como en las mesas reales: el tamaño se lee
  // antes de fijarse en el número.
  function chipTier(bb) {
    if (bb < 1) return 'w';
    if (bb < 3) return 'r';
    if (bb < 8) return 'g';
    if (bb < 20) return 'b';
    if (bb < 50) return 'k';
    return 'p';
  }

  function chipStackHTML(bb) {
    const tier = chipTier(bb);
    const n = bb < 1 ? 1 : (bb < 3 ? 2 : (bb < 10 ? 3 : 4));
    let discs = '';
    for (let i = 0; i < n; i++) discs += `<span class="chip chip-${tier}"></span>`;
    return `<span class="chip-stack" aria-hidden="true">${discs}</span>`;
  }

  function renderSeatChips(totalBB, streetBB) {
    const fmt = window.GTOPotMath ? window.GTOPotMath.formatBB : (x) => String(x);
    if (streetBB > 0) {
      return `<div class="seat-chips"><span class="seat-chips-street" title="Apuesta en la calle">${chipStackHTML(streetBB)}${fmt(streetBB)} bb</span></div>`;
    }
    if (totalBB > 0) {
      return `<div class="seat-chips"><span class="seat-chips-total" title="Ciega / invertido">${fmt(totalBB)} bb</span></div>`;
    }
    return '';
  }

  // Coloca las fichas hacia el centro de la mesa según la posición del asiento.
  // Una sola colocación por asiento evita solapes/recortes en las esquinas.
  function seatBetPlacement(c) {
    if (c.left < 22) return 'bet-right';
    if (c.left > 78) return 'bet-left';
    if (c.top > 70) return 'bet-above';
    return 'bet-below';
  }

  // Fichas "delante" del jugador (hacia el centro): apuesta de la calle o ciega preflop.
  function renderSeatBet(inFrontBB, placement) {
    if (!(inFrontBB > 0)) return '';
    const fmt = window.GTOPotMath ? window.GTOPotMath.formatBB : (x) => String(x);
    return `<div class="seat-bet ${placement || 'bet-below'}" title="Fichas en juego">`
      + chipStackHTML(inFrontBB)
      + `<span class="seat-bet-amt">${fmt(inFrontBB)} bb</span>`
      + '</div>';
  }

  function playTableConfig() {
    return (hand && hand.playConfig) || playSessionConfig;
  }

  function is9MaxTable() {
    const cfg = playTableConfig();
    return !!(window.PTPlayConfig && cfg && PTPlayConfig.is9Max(cfg));
  }

  function is3MaxTable() {
    const cfg = playTableConfig();
    if (!window.PTPlayConfig || !cfg) return false;
    if (PTPlayConfig.is3Max) return !!PTPlayConfig.is3Max(cfg);
    return !!(PTPlayConfig.isSpin && PTPlayConfig.isSpin(cfg));
  }

  function tablePosRing() {
    const cfg = playTableConfig();
    if (window.PTPlayConfig && cfg && PTPlayConfig.tablePositions) {
      return PTPlayConfig.tablePositions(cfg);
    }
    if (is3MaxTable()) return POS_3;
    return is9MaxTable() ? POS_9 : POS;
  }

  function seatCoordsForTable() {
    const mobile = isMobileLayout();
    if (is3MaxTable()) return mobile ? SEAT_COORDS_MOBILE_3 : SEAT_COORDS_3;
    if (is9MaxTable()) return mobile ? SEAT_COORDS_MOBILE_9 : SEAT_COORDS_9;
    return mobile ? SEAT_COORDS_MOBILE : SEAT_COORDS;
  }

  function heroSeatOnTable() {
    if (!hand) return null;
    return hand.displayHeroPos || hand.hero.pos;
  }

  function villainSeatOnTable() {
    if (!hand || !hand.villain || !hand.villain.pos) return null;
    const tbl = hand.table || {};
    const folded = tbl.folded || {};
    const activePos = hand.villain.pos;
    if (window.PTPlayConfig && hand.playConfig && PTPlayConfig.is9Max(hand.playConfig)) {
      const mapped = PTPlayConfig.villainTableSeat(hand) || activePos;
      if (mapped && folded[mapped] && !folded[activePos]) return activePos;
      return mapped;
    }
    return activePos;
  }

  function renderSeatStack(hand, pos) {
    const stacks = window.PTStacks;
    if (!stacks || !hand || !hand.stacks || !hand.stacks[pos]) return '';
    const fmt = window.GTOPotMath ? window.GTOPotMath.formatBB : (x) => String(x);
    // Durante la animación (_present) el stack debe seguir el invested del snapshot,
    // no el estado final live — si no, bajan fichas antes de verse fold/call/raise.
    const view = handPresent(hand);
    let rem;
    if (view && view.invested) {
      const start = hand.stacks[pos] || 0;
      const inv = view.invested[pos] || 0;
      rem = Math.round(Math.max(start - inv, 0) * 100) / 100;
    } else {
      rem = stacks.remaining(hand, pos);
    }
    return `<div class="seat-stack" title="Stack restante">${fmt(rem)} bb</div>`;
  }

  function renderSeats() {
    const mobile = isMobileLayout();
    const coords = seatCoordsForTable();
    const ring = ringFromHero(heroSeatOnTable());
    const villainPos = villainSeatOnTable();
    const view = handPresent(hand);
    const tbl = hand.table || {};
    const folded = view ? (view.folded || {}) : (tbl.folded || {});
    const invested = view ? (view.invested || {}) : (tbl.invested || {});
    const streetBet = view ? (view.streetBet || {}) : (tbl.streetBet || {});
    const inHandSrc = view ? view.inHand : tbl.inHand;
    const inHand = inHandSrc instanceof Set ? inHandSrc : new Set(inHandSrc || []);
    const actingPos = view && view.actingPos;
    // All-in heads-up: revelar hole cards del villano mientras se reparte el runout.
    const revealHoles = !!(hand.runoutPending
      || (hand.stage === 'complete' && hand.result && hand.result.showdown));
    const holeCards = tbl.holeCards || {};
    let html = '';
    ring.forEach((pos, i) => {
      const c = coords[i];
      const isHero = pos === heroSeatOnTable();
      const isVillain = villainPos && pos === villainPos;
      const isCaller = hand.scenario && (
        hand.scenario.callerPos === pos
        || (hand.scenario.callerPositions && hand.scenario.callerPositions.indexOf(pos) >= 0)
        || (hand.opponents && hand.opponents.some(function (o) { return o.pos === pos; }))
      );
      const isFolded = !!folded[pos];
      const inPot = inHand.has(pos) && !isFolded && !isHero;
      const cls = ['seat'];
      if (isHero) cls.push('hero');
      if (isVillain) cls.push('villain');
      if (isCaller && !isVillain) cls.push('caller');
      if (hand.multiway && inPot) cls.push('multiway-alive');
      if (pos === 'BTN') cls.push('dealer');
      if (c.top < 20) cls.push('seat-top');
      if (c.top > 70) cls.push('seat-bottom');
      if (c.left < 22) cls.push('seat-edge-left');
      else if (c.left > 78) cls.push('seat-edge-right');
      if (c.top < 12) cls.push('seat-edge-top');
      if (isFolded) cls.push('folded');
      if (actingPos && pos === actingPos) cls.push('acting');

      let role = isHero ? 'Héroe' : (isVillain ? 'Villano' : (isCaller ? (hand.multiway ? 'En bote' : 'Pagador') : ''));
      if ((hand.multiway || inPot) && inPot && !isVillain && !isHero) role = role || 'En bote';
      const legCfg = (hand && hand.playConfig) || playSessionConfig;
      const legMap = legCfg && legCfg.legendaryMode && legCfg.legendaryAnonymize && legCfg.legendaryAnonymize.byPos;
      if (legMap && legMap[pos]) {
        role = legMap[pos];
      }
      const seatActs = view ? (view.seatActions || {}) : (hand.seatActions || {});
      const villainAct = view ? view.villainAction : hand.villainAction;
      const isActing = !!(actingPos && pos === actingPos && !isHero);
      // La acción de cada rival se mantiene en su asiento durante toda la calle:
      // antes solo se veía la del villano (o la del asiento que actuaba en la
      // animación) y había que buscar quién había hecho qué.
      const totalInv = invested[pos] || 0;
      const stBet = streetBet[pos] || 0;
      const inFront = isFolded ? 0 : (stBet > 0 ? stBet : (hand.stage === 'preflop' ? totalInv : 0));

      let actHtml = '';
      if (!isHero && !isFolded) {
        // Nunca pintar actividad sobre un FOLD: un reveal mal anclado al opener
        // dejaba Check/Apuesta encima de asientos ya retirados.
        const act = seatActs[pos] || (isVillain ? villainAct : null);
        if (act && act.type !== 'fold') {
          // Si ya hay fichas delante, el importe en la burbuja solo la ensancha
          // (y en laterales se sale del felt). Compacta también en tablet/desktop.
          const nearEdge = c.left < 22 || c.left > 78;
          actHtml = actionBadgeHTML(act, isActing, (inFront > 0) || nearEdge);
        }
      }

      const showCards = inPot && holeCards[pos] && holeCards[pos].length >= 2;
      let cardsHtml = '';
      if (isFolded && !isHero) {
        cardsHtml = seatFoldMarkHTML();
      } else if (showCards) {
        if (revealHoles) {
          cardsHtml = '<div class="seat-cards showdown">' + holeCards[pos].map(Cards.cardFaceHTML).join('') + '</div>';
        } else {
          cardsHtml = '<div class="seat-cards">' + Cards.cardBackHTML() + Cards.cardBackHTML() + '</div>';
        }
      }

      const showFullSeat = !mobile || isVillain || isCaller || inPot || isFolded || isActing
        || !!actHtml || stBet > 0 || inFront > 0 || showCards;
      if (mobile && !showFullSeat && !isHero) cls.push('seat-mini');
      const stackHtml = showFullSeat ? renderSeatStack(hand, pos) : '';
      let placement = seatBetPlacement(c);
      // En pantallas estrechas los asientos laterales apuntarían sus fichas al
      // centro, que es justo donde está el bote y no hay ancho para los dos.
      // Colocadas en vertical se quedan en la columna del propio asiento.
      if (mobile && (placement === 'bet-left' || placement === 'bet-right')) {
        placement = c.top > 50 ? 'bet-above' : 'bet-below';
      }
      // Arco superior: burbuja bajo las cartas. En móvil, si las fichas van
      // arriba del pod, la burbuja también baja (si no, fichas y burbuja se
      // pelean el mismo hueco hacia el bote).
      const actBelowCards = c.top < 20 || (mobile && !!actHtml && placement === 'bet-above');
      if (actBelowCards && actHtml) cls.push('seat-act-below');
      const betHtml = renderSeatBet(inFront, placement);
      const holeHtml = '<div class="seat-hole">'
        + (actHtml ? '<div class="seat-act-wrap">' + actHtml + '</div>' : '')
        + (cardsHtml || (actHtml ? '<div class="seat-cards seat-cards-placeholder"></div>' : ''))
        + '</div>';

      html += `<div class="${cls.join(' ')}" style="top:${c.top}%;left:${c.left}%">
        <div class="seat-body">
          <span class="seat-avatar">${SEAT_AVATAR_SVG}</span>
          ${holeHtml}
          <div class="seat-pos">${pos}</div>
          <div class="seat-role${legMap && legMap[pos] ? ' legendary-anon' : ''}">${role}</div>
          ${stackHtml}
        </div>
        ${betHtml}
      </div>`;
    });
    $('#seats').innerHTML = html;
  }

  function ringFromHero(heroPos) {
    const list = tablePosRing();
    let idx = list.indexOf(heroPos);
    if (idx < 0) idx = 0;
    const ring = [];
    for (let i = 0; i < list.length; i++) ring.push(list[(idx + i) % list.length]);
    return ring;
  }

  // ---------- Acciones ----------
  function formatActionButtonLabel(o) {
    const label = String((o && o.label) || '');
    const id = (o && o.id) || '';
    const isBetSize = id === 'bet' || id === 'overbet' || id.indexOf('bet_') === 0;
    if (!isBetSize) return label;
    const m = label.match(/^([\d.,]+\s*bb)(\s*\([^)]*\))?$/i);
    if (!m) return label;
    return '<span class="action-size">' + m[1] + '</span>'
      + (m[2] ? '<span class="action-size-pct">' + m[2] + '</span>' : '');
  }

  function renderActions() {
    const node = hand.current;
    const box = $('#actions');
    if (!node) { box.innerHTML = ''; box.className = 'actions'; return; }
    const n = node.options.length;
    // Máx. 2 filas: columnas = ceil(n/2). Con 5 opciones → 3+2.
    let gridClass = '';
    if (n >= 2) {
      const cols = Math.min(3, Math.ceil(n / 2));
      gridClass = ' actions-grid actions-grid-' + cols;
    }
    box.className = 'actions' + gridClass;
    const hintFn = window.PTHotkeys && PTHotkeys.hintForAction ? PTHotkeys.hintForAction : null;
    let aggIdx = 0;
    box.innerHTML = node.options.map((o) => {
      let hint = '';
      if (hintFn) {
        if (o.id === 'raise' || o.id === 'bet' || o.id === 'overbet' || (o.id && o.id.indexOf('bet_') === 0)) {
          aggIdx += 1;
          hint = aggIdx <= 3 ? String(aggIdx) : (aggIdx === 1 ? 'R' : '');
          if (aggIdx === 1) hint = 'R/' + aggIdx;
        } else {
          hint = hintFn(o.id);
        }
      }
      const hintHtml = hint
        ? ' <kbd class="action-hotkey" title="Atajo">' + hint + '</kbd>'
        : '';
      return `<button class="btn btn-${btnClassForAction(o.id)}" data-action="${o.id}">${formatActionButtonLabel(o)}${hintHtml}</button>`;
    }).join('');
    $$('#actions button').forEach((b) =>
      b.addEventListener('click', () => onAction(b.dataset.action)));
    updateLiveAdvisor();
    syncPlayMobileStage();
    requestAnimationFrame(syncPlayMobileStage);
  }

  function btnClassForAction(id) {
    if (!id) return 'fold';
    if (id.indexOf('bet_') === 0 || id === 'bet') return 'bet';
    return id.split('_')[0];
  }

  async function onAction(actionId) {
    if (actionBusy || !hand || !hand.current) return;
    actionBusy = true;
    try {
      const snap = snapshotPresent(hand);
      const res = Engine.act(hand, actionId);
      const d = res.decision;

      session.decisions++;
      if (d.class === 'optima' || d.class === 'aceptable') session.good++;
      const st = session.byStreet[d.street];
      if (st) {
        st.n++;
        if (d.class === 'optima' || d.class === 'aceptable') st.good++;
      }
      if (d.evErroneous) session.evLossBB = roundSession(session.evLossBB + (d.evLoss || 0));

      appendLog(d);
      const warn = shouldShowDecisionFeedback(d);
      if (warn) {
        const mode = advisorModeForFeedback();
        if (mode === 'serious' && window.PTLiveAdvisor && PTLiveAdvisor.recordSeriousAlert) {
          PTLiveAdvisor.recordSeriousAlert(d, advisorThresholdForFeedback());
        }
        // Feedback óptima/error primero; al ocultarse sigue la acción en mesa.
        await showVerdictToast(d, mode === 'serious');
      }
      $('#feedback').classList.add('hidden');

      if (window.PTGuest && typeof window.PTGuest.afterTrainerAction === 'function') {
        window.PTGuest.afterTrainerAction(hand, d);
      }
      if (window.PTSchool && typeof window.PTSchool.afterTrainerAction === 'function') {
        if (window.PTSchool.afterTrainerAction(hand, d)) {
          renderTable();
          return;
        }
      }

      const reveal = (hand._reveal || []).slice();
      if (shouldPlayReveal(hand, reveal, d)) {
        hand._present = snap;
        renderTable();
        const ok = await playActionScript(reveal);
        if (!ok) return;
        clearPresent(hand);
      }

      renderTable();
      if (hand.runoutPending) {
        void playAllInRunout();
        return;
      }
      if (hand.stage === 'complete') {
        finishHand();
      } else {
        renderActions();
      }
    } finally {
      actionBusy = false;
    }
  }

  function sleepMs(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  let actionPlayGen = 0;
  let actionBusy = false;

  function handPresent(h) {
    return (h && h._present && h._present.active) ? h._present : null;
  }

  function clearPresent(h) {
    if (h) h._present = null;
  }

  function snapshotPresent(h) {
    const tbl = (h && h.table) || {};
    return {
      active: true,
      folded: Object.assign({}, tbl.folded || {}),
      seatActions: JSON.parse(JSON.stringify(h.seatActions || {})),
      streetBet: Object.assign({}, tbl.streetBet || {}),
      invested: Object.assign({}, tbl.invested || {}),
      inHand: tbl.inHand instanceof Set ? new Set(tbl.inHand) : new Set(tbl.inHand || []),
      potBB: h.current ? h.current.potBB : h.potBB,
      villainAction: h.villainAction ? Object.assign({}, h.villainAction) : null,
      heroAction: h.heroAction ? Object.assign({}, h.heroAction) : null,
      board: (h.board || []).slice(),
      stage: h.stage,
      actingPos: null
    };
  }

  function blankPreflopPresent(h) {
    const invested = { SB: 0.5, BB: 1 };
    const inHand = new Set(tablePosRing());
    return {
      active: true,
      folded: {},
      seatActions: {},
      streetBet: {},
      invested: invested,
      inHand: inHand,
      potBB: 1.5 + (h.antePotBB || 0),
      villainAction: null,
      heroAction: null,
      board: [],
      stage: 'preflop',
      actingPos: null
    };
  }

  function applyPresentEvent(h, ev) {
    const p = h && h._present;
    if (!p || !p.active || !ev) return;
    if (ev.kind === 'street') {
      p.stage = ev.street;
      p.board = (ev.board || []).slice();
      p.seatActions = {};
      p.streetBet = {};
      p.heroAction = null;
      p.villainAction = null;
      p.actingPos = null;
      if (ev.potBB != null) p.potBB = ev.potBB;
      return;
    }
    if (ev.kind !== 'act' || !ev.pos) return;
    // No animar Check/Apuesta sobre un asiento ya en FOLD (reveal mal anclado).
    if (ev.type !== 'fold' && p.folded && p.folded[ev.pos]) return;
    p.actingPos = ev.pos;
    p.seatActions[ev.pos] = { type: ev.type, amount: ev.amount };
    if (ev.type === 'fold') {
      p.folded[ev.pos] = true;
      if (p.inHand && p.inHand.delete) p.inHand.delete(ev.pos);
    } else if (ev.amount != null && ev.amount > 0) {
      const prev = p.invested[ev.pos] || 0;
      if (ev.invested != null) {
        p.invested[ev.pos] = ev.invested;
        if (ev.potBB != null) p.potBB = ev.potBB;
        else p.potBB = Math.round(((p.potBB || 0) + Math.max(ev.invested - prev, 0)) * 100) / 100;
      } else {
        const add = Math.max(ev.amount - prev, 0);
        p.invested[ev.pos] = prev + add;
        p.potBB = Math.round(((p.potBB || 0) + add) * 100) / 100;
      }
      p.streetBet[ev.pos] = ev.streetTo != null ? ev.streetTo : ev.amount;
    }
    const heroSeat = h.displayHeroPos || (h.hero && h.hero.pos);
    const villSeat = villainSeatOnTable();
    if (ev.pos === heroSeat || ev.isHero || ev.autoHero) {
      p.heroAction = { type: ev.type, amount: ev.amount };
    }
    if (villSeat && ev.pos === villSeat) {
      p.villainAction = { type: ev.type, amount: ev.amount };
    }
  }

  function delayForEvent(ev) {
    if (!ev) return 400;
    if (ev.kind === 'street') return 560;
    const t = ev.type;
    if (t === 'fold') return 300;
    if (t === 'check') return 380;
    if (t === 'call') return 420;
    if (t === 'open' || t === 'raise' || t === 'bet' || t === 'allin') return 500;
    return 400;
  }

  function showActionPlayStatus(onSkip) {
    const box = $('#actions');
    if (!box) return;
    box.className = 'actions';
    box.innerHTML = '<div class="action-play-status" role="status">' +
      '<span>' + tt('play.actionPlaying') + '</span>' +
      '<button type="button" class="btn btn-ghost action-play-skip">' + tt('play.actionSkip') + '</button>' +
      '</div>';
    const btn = box.querySelector('.action-play-skip');
    if (btn && onSkip) btn.addEventListener('click', onSkip);
  }

  async function playActionScript(events) {
    const gen = actionPlayGen;
    if (!events || !events.length) return gen === actionPlayGen;
    let skipped = false;
    showActionPlayStatus(function () { skipped = true; });
    await sleepMs(80);
    for (let i = 0; i < events.length; i++) {
      if (gen !== actionPlayGen) return false;
      if (skipped) {
        for (let j = i; j < events.length; j++) applyPresentEvent(hand, events[j]);
        renderTable();
        break;
      }
      applyPresentEvent(hand, events[i]);
      renderTable();
      await sleepMs(delayForEvent(events[i]));
    }
    return gen === actionPlayGen;
  }

  function shouldPlayOpening(h) {
    if (!h || h.result || !h.current) return false;
    if (h.stage !== 'preflop') return false;
    if (h.playConfig && h.playConfig.schoolDecisionEnd) return false;
    return currentActionMode() === 'complete';
  }

  function shouldPlayStreetIntro(h) {
    if (!h || h.result || !h.current) return false;
    if (h.stage === 'preflop' || h.stage === 'complete') return false;
    if (h.playConfig && h.playConfig.schoolDecisionEnd) return false;
    return true;
  }

  function shouldPlayReveal(h, reveal, decision) {
    if (!h || !reveal || !reveal.length) return false;
    if (h.playConfig && h.playConfig.schoolDecisionEnd) return false;
    const hasStreet = reveal.some(function (e) { return e.kind === 'street'; });
    const postflop = (decision && decision.street && decision.street !== 'preflop')
      || (h.stage && h.stage !== 'preflop')
      || hasStreet;
    if (postflop) return true;
    return currentActionMode() === 'complete';
  }

  function prepareStreetIntroPresent(h, intro) {
    h._present = snapshotPresent(h);
    h._present.seatActions = {};
    h._present.villainAction = null;
    h._present.heroAction = null;
    h._present.streetBet = {};
    const first = intro && intro[0];
    if (first && first.kind === 'street') {
      const st = first.street;
      if (st === 'flop') {
        h._present.board = [];
        h._present.stage = 'preflop';
      } else if (st === 'turn') {
        h._present.board = (h.board || []).slice(0, 3);
        h._present.stage = 'flop';
      } else if (st === 'river') {
        h._present.board = (h.board || []).slice(0, 4);
        h._present.stage = 'turn';
      }
    }
  }

  async function playHandIntro(h) {
    if (!h) return true;
    if (shouldPlayOpening(h) && Engine.buildOpeningActionScript) {
      const opening = Engine.buildOpeningActionScript(h) || [];
      if (opening.length) {
        h._present = blankPreflopPresent(h);
        renderTable();
        const ok = await playActionScript(opening);
        clearPresent(h);
        return ok;
      }
    }
    if (shouldPlayStreetIntro(h) && Engine.buildStreetIntroScript) {
      const intro = Engine.buildStreetIntroScript(h) || [];
      if (intro.length > 1 || (intro.length === 1 && intro[0].kind === 'act')) {
        prepareStreetIntroPresent(h, intro);
        renderTable();
        const ok = await playActionScript(intro);
        clearPresent(h);
        return ok;
      }
    }
    return true;
  }

  /** All-in: reparte turn/river con pausa visible antes del resultado. */
  async function playAllInRunout() {
    const box = $('#actions');
    if (box) {
      box.className = 'actions';
      box.innerHTML = '<div class="runout-status" role="status">All-in · repartiendo comunitarias…</div>';
    }
    if (window.PTLiveAdvisor) {
      const panel = $('#live-advisor-panel');
      if (panel) {
        panel.classList.add('hidden');
        panel.innerHTML = '';
      }
    }
    setPlayHandButtonsDisabled(true);
    renderTable();
    while (hand && hand.runoutPending && hand.stage !== 'complete') {
      await sleepMs(1400);
      if (!hand || !Engine.advanceRunout) break;
      Engine.advanceRunout(hand);
      renderTable();
    }
    if (box) box.innerHTML = '';
    setPlayHandButtonsDisabled(false);
    if (hand && hand.stage === 'complete') finishHand();
    else if (hand) renderActions();
  }

  function advisorModeForFeedback() {
    const LA = window.PTLiveAdvisor;
    if (LA && LA.loadMode) return LA.loadMode();
    const cfg = (hand && hand.playConfig) || playSessionConfig || {};
    return (cfg && cfg.advisorMode) || 'always';
  }

  function advisorThresholdForFeedback() {
    const LA = window.PTLiveAdvisor;
    if (LA && LA.loadThreshold) return LA.loadThreshold();
    const cfg = (hand && hand.playConfig) || playSessionConfig || {};
    return (cfg && cfg.seriousEvThreshold != null) ? cfg.seriousEvThreshold : 0.5;
  }

  function shouldShowDecisionFeedback(d) {
    if (!d) return true;
    const LA = window.PTLiveAdvisor;
    if (!LA || !LA.shouldWarn) return true;
    const cfg = (hand && hand.playConfig) || playSessionConfig || {};
    const advisorOn = !!(cfg && cfg.liveAdvisor) || (LA.loadPreference && LA.loadPreference());
    if (!advisorOn) return true;
    const mode = advisorModeForFeedback();
    if (mode !== 'serious') return true;
    const thr = advisorThresholdForFeedback();
    return LA.shouldWarn(d.evLoss, mode, thr);
  }

  function roundSession(x) { return Math.round((Number(x) || 0) * 100) / 100; }

  function decisionEvLossHtml(d) {
    if (!d || !(d.evLoss > 0)) return '';
    return `<span class="net-neg">-${fmtBB(d.evLoss)}bb</span>`;
  }

  function renderConfidenceBadge(d) {
    return '';
  }

  function renderDecisionMath(d) {
    if (!d) return '';
    const mp = d.mathParams;
    const parts = [];
    if (mp) {
      if (mp.equityPct != null) parts.push(`Equity ${mp.equityPct}%`);
      const facing = (d.toCallBB > 0) || d.action === 'call' || d.action === 'fold';
      if (facing && mp.potOddsPct != null) parts.push(`Pot odds ${mp.potOddsPct}%`);
      if (facing && mp.breakEvenPct != null) parts.push(`BE ${mp.breakEvenPct}%`);
      if (mp.potFinalBB != null && (d.action === 'call' || d.chosen === 'call')) {
        parts.push(`Pozo final ${mp.potFinalBB}bb`);
      }
      if (mp.foldEquityPct != null && d.action && String(d.action).startsWith('bet')) {
        parts.push(`Fold equity ${mp.foldEquityPct}%`);
      }
      if (mp.actionEV != null && mp.bestEV != null) {
        parts.push(`EV acción ${mp.actionEV >= 0 ? '+' : ''}${mp.actionEV}bb · óptimo ${mp.bestEV >= 0 ? '+' : ''}${mp.bestEV}bb`);
      }
      // No mostrar ΔEV si la acción ya iguala el EV óptimo (evita contradicción UI)
      if (mp.deltaEV > 0 && !(mp.actionEV != null && mp.bestEV != null && Math.abs(mp.bestEV - mp.actionEV) < 0.05)) {
        parts.push(`ΔEV ${mp.deltaEV}bb`);
      }
    } else if (d.heroEquity != null) {
      parts.push(`Equity ${d.heroEquity}%`);
    }
    if (!parts.length) return '';
    return `<div class="dec-math muted-text">${parts.join(' · ')}</div>`;
  }

  function renderTournamentDecisionImpact(d) {
    if (!d) return '';
    const hub = d.formatHub;
    const isTourney = hub === 'spin' || hub === 'mtt'
      || d.icmLite || d.icmNote || d.phaseNote || d.mttPhase;
    if (!isTourney) return '';
    const lines = [];
    if (d.phaseNote) {
      lines.push('<div><strong>Fase:</strong> ' + escapeHtml(d.phaseNote) + '</div>');
    } else if (d.mttPhase && d.mttPhase !== 'auto') {
      lines.push('<div><strong>Fase:</strong> evaluación con charts de «'
        + escapeHtml(phaseLabelForHud(d.mttPhase)) + '».</div>');
    }
    if (d.icmLite || d.icmNote || d.icmChangedEv) {
      let icm = '<div><strong>ICM (valor del premio):</strong> ';
      if (d.icmNote) {
        icm += escapeHtml(d.icmNote);
      } else if (d.icmChangedEv && d.chipEvLoss != null && d.evLoss != null) {
        icm += 'El coste en fichas (−' + fmtBB(d.chipEvLoss)
          + ' bb) se ajustó a −' + fmtBB(d.evLoss) + ' bb por presión de premio.';
      } else {
        icm += 'Activo: el premio no es proporcional a las fichas.';
      }
      const bits = [];
      if (d.icmPressure != null) {
        const pct = Math.round(Number(d.icmPressure) * 100);
        if (pct > 0) bits.push('stack «vale menos» en premio (+' + pct + '%)');
        else if (pct < 0) bits.push('puedes arriesgar más (−' + Math.abs(pct) + '%)');
      }
      if (d.icmChangedEv) bits.push('EV afectado por ICM');
      if (d.icmMultiplier != null && Number(d.icmMultiplier) !== 1) {
        bits.push('ajuste ×' + Number(d.icmMultiplier).toFixed(2));
      }
      if (bits.length) icm += ' · ' + escapeHtml(bits.join(' · '));
      icm += '</div>';
      lines.push(icm);
    }
    if (!lines.length) return '';
    return '<div class="dec-tourney-impact" style="margin-top:6px;font-size:12px;color:#8ab4ff">'
      + lines.join('') + '</div>';
  }

  function renderHandDecisionsSummary(decisions, matrixSource) {
    if (!decisions || !decisions.length) return '';
    let html = '<div class="card-box" style="margin-top:14px"><h3>' +
      (decisions.some((x) => x && x.exploitApplied) ? 'Evaluación de la mano (explotativa)' : 'Evaluación GTO de la mano') +
      '</h3>';
    decisions.forEach((d, i) => {
      html += `<div class="dec-review">
        <div class="dec-head"><strong>${cap(d.street)}</strong> · ${escapeHtml(d.label || d.chosen || d.action || '')}
          <span class="verdict ${d.class}">${verdictWord(d.class)}</span>
          ${renderConfidenceBadge(d)}
          ${decisionEvLossHtml(d)}
        </div>`;
      html += renderDecisionMath(d);
      html += renderTournamentDecisionImpact(d);
      if (d.context) html += `<div class="dec-expl muted-text">${escapeHtml(d.context)}</div>`;
      if (d.explanation) html += `<div class="dec-expl">${escapeHtml(d.explanation)}</div>`;
      if (d.renderAlert) html += `<div class="dec-expl" style="color:var(--orange)">${escapeHtml(d.renderAlert)}</div>`;
      if (d.optionBreakdown && d.optionBreakdown.length) {
        html += renderOptionGrid(d.optionBreakdown, d.action || d.chosen, d.best);
      } else if (d.gto) {
        html += renderGtoBars(d.gto, { exploit: !!d.exploitApplied });
      }
      html += renderExploitDeltaNote(d);
      // Mostrar siempre con matrixSource: el click carga el chunk ranges bajo demanda.
      if (matrixSource) {
        html += `<div class="dec-matrix-row">${matrixStreetBtn(d.street, i, matrixSource)}</div>`;
      }
      html += '</div>';
    });
    return html + '</div>';
  }

  function appendLog(d) {
    const li = document.createElement('li');
    const verdict = verdictWord(d.class);
    li.innerHTML = `<strong>${d.street}</strong>: ${escapeHtml(d.label)} <span class="verdict ${d.class}">${verdict}</span> ${decisionEvLossHtml(d)}${renderDecisionMath(d)}`;
    $('#hand-log').appendChild(li);
  }

  function hideVerdictToast() {
    const toast = $('#verdict-toast');
    if (!toast) return;
    clearTimeout(showVerdictToast._t);
    toast.classList.remove('visible');
  }

  function showVerdictToast(d, stickySerious) {
    const toast = $('#verdict-toast');
    if (!toast) return Promise.resolve();
    const pct = Math.round((d.frequency || 0) * 100);
    toast.className = 'verdict-toast visible ' + d.class;
    toast.innerHTML = `<div class="vt-verdict">${verdictWord(d.class)}</div>
      <div class="vt-freq">${pct}% GTO</div>
      ${d.evLoss > 0 ? `<div class="vt-ev">-${fmtBB(d.evLoss)} bb</div>` : ''}`;
    clearTimeout(showVerdictToast._t);
    const ms = stickySerious ? 1400 : 550;
    return new Promise(function (resolve) {
      showVerdictToast._t = setTimeout(function () {
        toast.classList.remove('visible');
        resolve();
      }, ms);
    });
  }

  /**
   * Acción que la UI marca como "mejor". Debe coincidir siempre con el mayor %
   * del grid: marcar en verde (o citar en «mejor: X») una opción con menos
   * frecuencia que la líder se lee como una contradicción.
   * También corrige decisiones guardadas por motores antiguos.
   */
  function resolveBestId(breakdown, bestId) {
    if (!breakdown || !breakdown.length) return bestId;
    let top = breakdown[0];
    let current = null;
    breakdown.forEach((o) => {
      if ((o.pct || 0) > (top.pct || 0)) top = o;
      if (o.id === bestId) current = o;
    });
    if (current && (current.pct || 0) >= (top.pct || 0)) return current.id;
    return top ? top.id : bestId;
  }

  /** «mejor: X» solo aporta si X no es la acción que ya jugó el héroe. */
  function betterActionHtml(d) {
    if (!d) return '';
    const best = resolveBestId(d.optionBreakdown, d.best);
    if (!best || best === (d.chosen || d.action)) return '';
    return ` <span class="tl-eval muted-text">mejor: ${actionName(best)}</span>`;
  }

  function renderOptionGrid(breakdown, chosenId, bestId) {
    if (!breakdown || !breakdown.length) return '';
    const best = resolveBestId(breakdown, bestId);
    let html = '<div class="opt-grid">';
    breakdown.forEach((o) => {
      const isChosen = o.id === chosenId;
      const isBest = o.id === best;
      // Si coincide óptima y elegida: solo verde (best). Azul (chosen) solo si difiere.
      const cls = isBest ? 'best' : (isChosen ? 'chosen' : '');
      html += `<div class="opt-pill ${cls}">
        <span class="opt-lbl">${escapeHtml(o.label)}</span>
        <span class="opt-pct">${o.pct}%</span>
      </div>`;
    });
    return html + '</div>';
  }

  function findStreetDecisionIndex(hand, street) {
    if (!hand || !hand.decisions) return -1;
    for (let i = 0; i < hand.decisions.length; i++) {
      if (hand.decisions[i].street === street) return i;
    }
    return -1;
  }

  let matrixJob = 0;
  let rangesState = {
    street: 'preflop',
    spot: 'RFI', heroPos: 'UTG', villainPos: 'UTG', callerPos: 'HJ',
    gameType: 'cash6', stackDepth: 'standard', mttPhase: 'auto', openSize: 2.5,
    icmEnabled: false,
    mttStructureSituation: 'bubble',
    buyIn: 11, entries: 100, playersLeft: 13, placesPaid: 12,
    boards: {
      flop: 'As Kd 7c',
      turn: 'As Kd 7c 2h',
      river: 'As Kd 7c 2h 9s'
    },
    potBB: 6, toCallBB: 0
  };

  /** Aplica preset del explorer (deep-link desde Escuela, etc.). */
  function applyRangesExplorerState(opts) {
    if (!opts || typeof opts !== 'object') return;
    if (opts.street) rangesState.street = opts.street;
    if (opts.spot) rangesState.spot = opts.spot;
    if (opts.heroPos) rangesState.heroPos = opts.heroPos;
    if (opts.villainPos) rangesState.villainPos = opts.villainPos;
    if (opts.callerPos) rangesState.callerPos = opts.callerPos;
    if (opts.gameType) rangesState.gameType = opts.gameType;
    if (opts.stackDepth) rangesState.stackDepth = opts.stackDepth;
    if (opts.mttPhase) rangesState.mttPhase = opts.mttPhase;
    if (opts.openSize != null) rangesState.openSize = opts.openSize;
    if (opts.icmEnabled != null) rangesState.icmEnabled = !!opts.icmEnabled;
    if (opts.mttStructureSituation) rangesState.mttStructureSituation = opts.mttStructureSituation;
    if (opts.buyIn != null) rangesState.buyIn = opts.buyIn;
    if (opts.entries != null) rangesState.entries = opts.entries;
    if (opts.playersLeft != null) rangesState.playersLeft = opts.playersLeft;
    if (opts.placesPaid != null) rangesState.placesPaid = opts.placesPaid;
    if (opts.gameType) {
      $$('#ranges-game-type .setup-chip').forEach((c) => {
        c.classList.toggle('active', c.dataset.val === opts.gameType);
      });
    }
    if (opts.stackDepth) {
      $$('#ranges-stack-depth .setup-chip').forEach((c) => {
        c.classList.toggle('active', c.dataset.val === opts.stackDepth);
      });
    }
    if (opts.mttPhase) {
      $$('#ranges-mtt-phase .setup-chip').forEach((c) => {
        c.classList.toggle('active', c.dataset.val === opts.mttPhase);
      });
    }
    const icmToggle = $('#ranges-icm-enabled');
    if (icmToggle && opts.icmEnabled != null) icmToggle.checked = !!opts.icmEnabled;
    if (opts.mttStructureSituation) {
      $$('#ranges-mtt-structure .setup-chip').forEach((c) => {
        c.classList.toggle('active', c.dataset.val === opts.mttStructureSituation);
      });
    }
    const mapNum = [
      ['ranges-mtt-buyin', 'buyIn'],
      ['ranges-mtt-entries', 'entries'],
      ['ranges-mtt-players-left', 'playersLeft'],
      ['ranges-mtt-places-paid', 'placesPaid']
    ];
    mapNum.forEach(function (pair) {
      const el = $('#' + pair[0]);
      if (el && opts[pair[1]] != null) el.value = String(opts[pair[1]]);
    });
    syncRangesStackPhaseUI(rangesState.gameType);
  }

  /**
   * Abre la pestaña Rangos con contexto opcional.
   * Uso Escuela: openRangesExplorer({ spot:'RFI', heroPos:'BTN' })
   */
  function openRangesExplorer(opts) {
    if (opts) window.__ptPendingRanges = opts;
    if (typeof goToTab === 'function') goToTab('ranges');
  }
  window.openRangesExplorer = openRangesExplorer;
  window.applyRangesExplorerState = applyRangesExplorerState;

  function rangesBoardText() {
    if (rangesState.street === 'preflop') return '';
    return rangesState.boards[rangesState.street] || '';
  }

  function setRangesBoardText(text) {
    if (rangesState.street === 'preflop') return;
    rangesState.boards[rangesState.street] = text || '';
  }

  function rangesHubFromGameType(gameType) {
    const Tax = window.PTFormatTaxonomy;
    if (Tax && Tax.hubFromGameType) return Tax.hubFromGameType(gameType);
    if (gameType === 'spin3' || gameType === 'spin') return 'spin';
    if (gameType === 'mtt') return 'mtt';
    return 'cash';
  }

  /** Muestra stacks 25/20/15/10bb (y 100/50 en MTT) + fase al elegir Spin/MTT. */
  function syncRangesStackPhaseUI(gameType) {
    const hub = rangesHubFromGameType(gameType || rangesState.gameType);
    const phaseGroup = $('#ranges-phase-group');
    if (phaseGroup) phaseGroup.hidden = hub === 'cash';
    const icmGroup = $('#ranges-icm-group');
    if (icmGroup) icmGroup.hidden = hub !== 'mtt';

    $$('#ranges-mtt-phase .setup-chip').forEach((chip) => {
      const hubAttr = chip.getAttribute('data-ranges-hub') || '';
      if (!hubAttr) {
        chip.hidden = false;
        return;
      }
      const show = hubAttr.split(/\s+/).indexOf(hub) >= 0;
      chip.hidden = !show;
      if (!show) chip.classList.remove('active');
    });
    if (hub !== 'cash') {
      const phaseVis = $$('#ranges-mtt-phase .setup-chip').filter((c) => !c.hidden);
      if (phaseVis.length && !phaseVis.some((c) => c.classList.contains('active'))) {
        const autoChip = phaseVis.find((c) => c.dataset.val === 'auto') || phaseVis[0];
        $$('#ranges-mtt-phase .setup-chip').forEach((c) => c.classList.remove('active'));
        autoChip.classList.add('active');
      }
    }

    $$('#ranges-stack-depth .setup-chip').forEach((chip) => {
      const hubs = (chip.getAttribute('data-ranges-hub') || 'cash').split(/\s+/);
      const show = hubs.indexOf(hub) >= 0;
      chip.hidden = !show;
      if (!show) chip.classList.remove('active');
    });
    const vis = $$('#ranges-stack-depth .setup-chip').filter((c) => !c.hidden);
    if (vis.length && !vis.some((c) => c.classList.contains('active'))) {
      let prefer = 'standard';
      if (hub === 'spin') prefer = 'bb25';
      else if (hub === 'mtt') prefer = 'bb50';
      const pref = vis.find((c) => c.dataset.val === prefer) || vis[0];
      $$('#ranges-stack-depth .setup-chip').forEach((c) => c.classList.remove('active'));
      pref.classList.add('active');
    }
    syncRangesIcmFieldsUI();
  }

  function syncRangesIcmFieldsUI() {
    const hub = rangesHubFromGameType(rangesState.gameType);
    const toggle = $('#ranges-icm-enabled');
    const fields = $('#ranges-icm-fields');
    const hint = $('#ranges-icm-hint');
    const on = hub === 'mtt' && toggle && toggle.checked;
    if (fields) fields.hidden = !on;
    if (hint) hint.hidden = !on;
    rangesState.icmEnabled = !!on;
  }

  function readRangesContext() {
    const gtEl = $('#ranges-game-type .setup-chip.active');
    const sdEl = $('#ranges-stack-depth .setup-chip.active:not([hidden])')
      || $('#ranges-stack-depth .setup-chip.active');
    const phaseEl = $('#ranges-mtt-phase .setup-chip.active:not([hidden])')
      || $('#ranges-mtt-phase .setup-chip.active');
    const gameType = gtEl ? gtEl.dataset.val : rangesState.gameType;
    const hub = rangesHubFromGameType(gameType);
    const out = {
      gameType: gameType,
      stackDepth: sdEl ? sdEl.dataset.val : rangesState.stackDepth
    };
    if (hub !== 'cash') {
      out.mttPhase = phaseEl ? phaseEl.dataset.val : (rangesState.mttPhase || 'auto');
    }
    if (hub === 'mtt') {
      const icmOn = !!( $('#ranges-icm-enabled') && $('#ranges-icm-enabled').checked );
      out.icmEnabled = icmOn;
      if (icmOn) {
        const sitEl = $('#ranges-mtt-structure .setup-chip.active');
        out.mttStructureSituation = sitEl ? sitEl.dataset.val : (rangesState.mttStructureSituation || 'bubble');
        const bi = Number(($('#ranges-mtt-buyin') || {}).value);
        const entries = Number(($('#ranges-mtt-entries') || {}).value);
        const left = Number(($('#ranges-mtt-players-left') || {}).value);
        const paid = Number(($('#ranges-mtt-places-paid') || {}).value);
        if (bi > 0) out.buyIn = bi;
        if (entries > 0) out.entries = entries;
        if (left >= 2) out.playersLeft = left;
        if (paid >= 1) out.placesPaid = paid;
        const Tax = window.PTFormatTaxonomy;
        if (Tax && Tax.mttStructureNearMoney && Tax.mttStructureNearMoney(out)) {
          // Forzar fase bubble en capas cuando hay presión de dinero
          if (!out.mttPhase || out.mttPhase === 'auto' || out.mttPhase === 'early' || out.mttPhase === 'mid') {
            out.resolvedPhase = 'bubble';
          }
        }
      }
    }
    return out;
  }

  function bindRangesFilters() {
    bindChipGroup('#ranges-game-type', function () {
      const gt = readRangesContext().gameType;
      rangesState.gameType = gt;
      syncRangesStackPhaseUI(gt);
      const ctx = readRangesContext();
      rangesState.stackDepth = ctx.stackDepth;
      rangesState.mttPhase = ctx.mttPhase || 'auto';
      renderRangesExplorer();
    });
    bindChipGroup('#ranges-stack-depth', function () {
      rangesState.stackDepth = readRangesContext().stackDepth;
      renderRangesExplorer();
    });
    bindChipGroup('#ranges-mtt-phase', function () {
      const ctx = readRangesContext();
      rangesState.mttPhase = ctx.mttPhase || 'auto';
      renderRangesExplorer();
    });
    bindChipGroup('#ranges-mtt-structure', function () {
      const sitEl = $('#ranges-mtt-structure .setup-chip.active');
      rangesState.mttStructureSituation = sitEl ? sitEl.dataset.val : 'bubble';
      const Tax = window.PTFormatTaxonomy;
      if (Tax && Tax.structureFromSituation && rangesState.mttStructureSituation !== 'custom') {
        const def = Tax.structureFromSituation(rangesState.mttStructureSituation);
        if (def) {
          const leftEl = $('#ranges-mtt-players-left');
          const paidEl = $('#ranges-mtt-places-paid');
          const entriesEl = $('#ranges-mtt-entries');
          const biEl = $('#ranges-mtt-buyin');
          if (leftEl && def.playersLeft != null) leftEl.value = String(def.playersLeft);
          if (paidEl && def.placesPaid != null) paidEl.value = String(def.placesPaid);
          if (entriesEl && def.entries != null) entriesEl.value = String(def.entries);
          if (biEl && def.buyIn != null && biEl.value === '') biEl.value = String(def.buyIn);
        }
      }
      renderRangesExplorer();
    });
    const icmToggle = $('#ranges-icm-enabled');
    if (icmToggle && !icmToggle.dataset.bound) {
      icmToggle.dataset.bound = '1';
      icmToggle.addEventListener('change', function () {
        syncRangesIcmFieldsUI();
        renderRangesExplorer();
      });
    }
    ['ranges-mtt-buyin', 'ranges-mtt-entries', 'ranges-mtt-players-left', 'ranges-mtt-places-paid'].forEach(function (id) {
      const el = $('#' + id);
      if (!el || el.dataset.bound) return;
      el.dataset.bound = '1';
      const rerender = function () { renderRangesExplorer(); };
      el.addEventListener('change', rerender);
      el.addEventListener('input', rerender);
    });
    syncRangesStackPhaseUI(rangesState.gameType);
    const streetTabs = $('#ranges-street-tabs');
    if (streetTabs && !streetTabs.dataset.bound) {
      streetTabs.dataset.bound = '1';
      streetTabs.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-ranges-street]');
        if (!btn) return;
        const street = btn.dataset.rangesStreet;
        if (!street || street === rangesState.street) return;
        rangesState.street = street;
        if (street !== 'preflop') {
          rangesState.spot = 'postflop';
          if (['BB', 'SB', 'BTN', 'CO', 'HJ'].indexOf(rangesState.heroPos) < 0) {
            rangesState.heroPos = 'BB';
          }
        } else if (rangesState.spot === 'postflop') {
          rangesState.spot = 'RFI';
          rangesState.heroPos = 'UTG';
        }
        renderRangesExplorer();
      });
    }
  }

  function matrixStreetBtn(street, decisionIdx, source) {
    if (street === 'preflop') {
      return `<button type="button" class="btn btn-matrix" data-range-matrix="1" data-matrix-kind="gto" data-matrix-street="${street}" data-matrix-decision-idx="${decisionIdx}" data-matrix-source="${source}">Matriz GTO</button>`;
    }
    return `<button type="button" class="btn btn-matrix" data-range-matrix="1" data-matrix-kind="villain" data-matrix-street="${street}" data-matrix-decision-idx="${decisionIdx}" data-matrix-source="${source}">Matriz villano</button>`;
  }

  function closeRangeMatrixModal() {
    matrixJob++;
    const modal = $('#range-matrix-modal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('range-matrix-open');
  }

  function renderRangeMatrixGrid(result, heroCode, mode, villainCode) {
    const RM = window.PTRangeMatrix;
    if (RM && typeof RM.renderMatrixGrid === 'function') {
      return RM.renderMatrixGrid(result, {
        heroCode: heroCode || null,
        villainCode: villainCode || null,
        mode: mode || 'gto',
        showLegend: false
      }).replace(' range-matrix-wrap-compact', '');
    }
    const ranks = result.ranks;
    let html = '<div class="range-matrix-wrap"><div class="range-matrix-grid">';
    html += '<div class="rm-corner"></div>';
    ranks.forEach((r) => { html += `<div class="rm-label">${r}</div>`; });
    for (let row = 0; row < 13; row++) {
      html += `<div class="rm-label">${ranks[row]}</div>`;
      for (let col = 0; col < 13; col++) {
        const cell = result.cells[row][col];
        if (RM && RM.renderCellHtml) {
          html += RM.renderCellHtml(cell, {
            mode: mode || 'gto',
            isHero: !!(heroCode && cell.label === heroCode),
            isVillain: !!(villainCode && cell.label === villainCode)
          });
          continue;
        }
        const isHero = heroCode && cell.label === heroCode;
        const isVillain = villainCode && cell.label === villainCode;
        let cls = 'rm-cell ' + cell.action;
        if (isHero) cls += ' hero';
        if (isVillain) cls += ' villain';
        if (mode === 'villain') {
          const title = cell.title || cell.label;
          html += `<div class="${cls}" title="${escapeHtml(title)}">${cell.label}</div>`;
        } else {
          const mixStyle = window.PTRangeMatrix && PTRangeMatrix.cellMixStyle
            ? PTRangeMatrix.cellMixStyle(cell.freqs)
            : '';
          html += `<div class="${cls} rm-cell-mix" style="${mixStyle}" title="${cell.label}: R${Math.round(cell.freqs.raise * 100)}% C${Math.round(cell.freqs.call * 100)}% F${Math.round(cell.freqs.fold * 100)}%">${cell.label}</div>`;
        }
      }
    }
    return html + '</div></div>';
  }

  function closeRangeCellDetail() {
    const modal = $('#range-cell-modal');
    if (modal) modal.classList.add('hidden');
  }

  function openRangeCellDetail(encoded) {
    const RM = window.PTRangeMatrix;
    const modal = $('#range-cell-modal');
    const body = $('#range-cell-body');
    if (!modal || !body || !RM || !RM.decodeCellDetail || !RM.buildCellDetailHtml) return;
    const detail = RM.decodeCellDetail(encoded);
    if (!detail) return;
    body.innerHTML = RM.buildCellDetailHtml(detail);
    modal.classList.remove('hidden');
  }

  function openRangeMatrixModal(handObj, decision, source) {
    const RM = window.PTRangeMatrix;
    const modal = $('#range-matrix-modal');
    const body = $('#range-matrix-body');
    if (!RM || !modal || !body) return;
    if (decision.street !== 'preflop') return;

    const job = ++matrixJob;
    const baseInput = RM.buildBaseInput(handObj, decision, source);
    const heroCards = RM.heroCardsFromHand(handObj);
    const heroCode = (heroCards.length === 2 && window.Ranges)
      ? window.Ranges.handCode(heroCards[0], heroCards[1])
      : (handObj.heroCode || null);
    const board = decision.board && decision.board.length
      ? decision.board
      : RM.boardSliceForStreet(handObj.board || [], decision.street);
    const boardHtml = board.length
      ? board.map(Cards.cardToHTML).join(' ')
      : '<span class="muted-text">—</span>';
    const heroHtml = heroCards.length
      ? heroCards.map(Cards.cardToHTML).join(' ')
      : '<span class="muted-text">—</span>';

    modal.classList.remove('hidden');
    document.body.classList.add('range-matrix-open');
    body.innerHTML = `<div class="range-matrix-head">
      <h3 id="range-matrix-title">Matriz GTO · ${cap(decision.street)}</h3>
      <div class="muted-text">${escapeHtml(decision.context || decision.spot || '')}</div>
      <div class="range-matrix-cards">
        <span><strong>Tu mano:</strong> <span class="rec-cards">${heroHtml}</span> ${heroCode ? `<code>${heroCode}</code>` : ''}</span>
        <span><strong>Board:</strong> <span class="rec-cards">${boardHtml}</span></span>
      </div>
      <div class="range-matrix-legend">
        <span><i class="raise"></i> Raise / Bet</span>
        <span><i class="call"></i> Call / Check</span>
        <span><i class="fold"></i> Fold</span>
      </div>
      <div class="range-matrix-progress">Calculando matriz 13×13… 0%</div>
    </div>`;

    if (!baseInput) {
      body.querySelector('.range-matrix-progress').textContent = 'No se pudo reconstruir el spot.';
      body.innerHTML += '<button type="button" class="btn btn-primary btn-block" data-close-matrix>Cerrar</button>';
      return;
    }

    RM.computeGtoMatrixAsync(baseInput, function (done, total) {
      if (job !== matrixJob) return;
      const prog = body.querySelector('.range-matrix-progress');
      if (prog) prog.textContent = `Calculando matriz 13×13… ${Math.round((done / total) * 100)}%`;
    }).then(function (result) {
      if (job !== matrixJob) return;
      const head = body.querySelector('.range-matrix-head');
      if (!head) return;
      const prog = head.querySelector('.range-matrix-progress');
      if (prog) prog.remove();
      head.insertAdjacentHTML('beforeend', renderRangeMatrixGrid(result, heroCode, 'gto'));
      head.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-primary btn-block" data-close-matrix style="margin-top:4px">Cerrar</button>');
    }).catch(function (err) {
      if (job !== matrixJob) return;
      const prog = body.querySelector('.range-matrix-progress');
      if (prog) prog.textContent = 'Error: ' + (err.message || 'no se pudo generar la matriz');
      body.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-primary btn-block" data-close-matrix>Cerrar</button>');
    });
  }

  function openVillainMatrixModal(handObj, decision, source) {
    const RM = window.PTRangeMatrix;
    const modal = $('#range-matrix-modal');
    const body = $('#range-matrix-body');
    if (!RM || !modal || !body) return;
    if (decision.street === 'preflop') return;

    const heroCards = RM.heroCardsFromHand(handObj);
    const heroCode = (heroCards.length === 2 && window.Ranges)
      ? window.Ranges.handCode(heroCards[0], heroCards[1])
      : (handObj.heroCode || null);
    const villainCards = RM.villainCardsFromHand(handObj);
    const villainCode = RM.villainCodeFromHand(handObj);
    const board = decision.board && decision.board.length
      ? decision.board
      : RM.boardSliceForStreet(handObj.board || [], decision.street);
    const profile = RM.getVillainMatrixProfile(handObj, decision, source);
    const result = RM.computeVillainRangeMatrix(profile);
    const boardHtml = board.length ? board.map(Cards.cardToHTML).join(' ') : '—';
    const heroHtml = heroCards.length ? heroCards.map(Cards.cardToHTML).join(' ') : '—';
    const villainHtml = villainCards.length ? villainCards.map(Cards.cardToHTML).join(' ') : null;
    const inCount = profile.coreSet.size + profile.borderlineSet.size
      + profile.widenSet.size + profile.valueSet.size
      + profile.semibluffSet.size + profile.bluffSet.size;
    const narrative = profile.lineNarrative || '';

    modal.classList.remove('hidden');
    document.body.classList.add('range-matrix-open');
    body.innerHTML = `<div class="range-matrix-head">
      <h3 id="range-matrix-title">Matriz villano · ${cap(decision.street)}</h3>
      <div class="muted-text">${escapeHtml(decision.context || decision.spot || '')}</div>
      ${narrative ? `<div class="muted-text" style="margin-top:6px">${escapeHtml(narrative)}</div>` : ''}
      <div class="range-matrix-cards">
        <span><strong>Tu mano:</strong> <span class="rec-cards">${heroHtml}</span>${heroCode ? ` <code>${heroCode}</code>` : ''}</span>
        ${villainHtml ? `<span><strong>Villano:</strong> <span class="rec-cards">${villainHtml}</span>${villainCode ? ` <code>${villainCode}</code>` : ''}</span>` : ''}
        <span><strong>Board:</strong> <span class="rec-cards">${boardHtml}</span></span>
      </div>
      <div class="muted-text" style="margin:8px 0">Rango estimado (~${inCount} manos): <code>${escapeHtml(RM.shortRange(result.rangeStr))}</code></div>
      <div class="range-matrix-legend">
        <span><i class="value"></i> Valor</span>
        <span><i class="semibluff"></i> Semibluff</span>
        <span><i class="call"></i> Núcleo GTO</span>
        <span><i class="borderline"></i> Borderline</span>
        <span><i class="bluff"></i> Farol</span>
        <span><i class="capped"></i> Capado / bloqueado</span>
        <span><i class="fold"></i> Fuera</span>
        ${heroCode ? '<span><i class="hero-mark"></i> Tu mano</span>' : ''}
        ${villainCode ? '<span><i class="villain-mark"></i> Mano villano</span>' : ''}
      </div>
      ${renderRangeMatrixGrid(result, heroCode, 'villain', villainCode)}
      <button type="button" class="btn btn-primary btn-block" data-close-matrix style="margin-top:12px">Cerrar</button>
    </div>`;
  }

  function renderRangesExplorer() {
    const RM = window.PTRangeMatrix;
    const RR = window.GTORangesRegistry;
    if (!RM) return;
    const spotRow = $('#ranges-spot-row');
    const heroRow = $('#ranges-hero-pos');
    const villainRow = $('#ranges-villain-pos');
    const villainBlock = $('#ranges-villain-block');
    const callerRow = $('#ranges-caller-pos');
    const callerBlock = $('#ranges-caller-block');
    const villainLabel = $('#ranges-villain-label');
    const titleEl = $('#ranges-spot-title');
    const contextLabel = $('#ranges-context-label');
    const host = $('#ranges-matrix-host');
    if (!spotRow || !heroRow || !host) return;

    const gtEl = $('#ranges-game-type .setup-chip.active');
    const gameTypeHint = gtEl ? gtEl.dataset.val : rangesState.gameType;
    syncRangesStackPhaseUI(gameTypeHint);
    const ctx = readRangesContext();
    rangesState.gameType = ctx.gameType;
    rangesState.stackDepth = ctx.stackDepth;
    rangesState.mttPhase = ctx.mttPhase || 'auto';
    if (contextLabel && RR) contextLabel.textContent = RR.contextLabel(ctx);

    const street = rangesState.street || 'preflop';
    const isPostflop = street === 'flop' || street === 'turn' || street === 'river';
    if (isPostflop) rangesState.spot = 'postflop';

    $$('#ranges-street-tabs [data-ranges-street]').forEach((b) => {
      const on = b.dataset.rangesStreet === street;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    const spot = isPostflop
      ? (RM.EXPLORER_SPOTS.postflop || RM.POSTFLOP_EXPLORER)
      : (RM.EXPLORER_SPOTS[rangesState.spot] || RM.EXPLORER_SPOTS.RFI);
    const vsPairs = RM.validVsRfiPairs(ctx);
    const vs3Pairs = RM.validVs3betPairs ? RM.validVs3betPairs(ctx) : {};

    if (isPostflop) {
      spotRow.innerHTML = '';
      spotRow.classList.add('hidden');
    } else {
      spotRow.classList.remove('hidden');
      const preflopIds = Object.keys(RM.EXPLORER_SPOTS).filter((id) => id !== 'postflop');
      spotRow.innerHTML = preflopIds.map((id) =>
        `<button type="button" class="ranges-spot-btn${rangesState.spot === id ? ' active' : ''}" data-ranges-spot="${id}">${RM.EXPLORER_SPOTS[id].label}</button>`
      ).join('');
    }

    let heroPositions = isPostflop
      ? (RM.POSTFLOP_EXPLORER ? RM.POSTFLOP_EXPLORER.heroPositions.slice() : RM.heroPositionsForSpot('postflop', ctx))
      : RM.heroPositionsForSpot(rangesState.spot, ctx);
    if (!isPostflop) {
      if (rangesState.spot === '3bet' && vsPairs[rangesState.heroPos]) {
        /* ok */
      } else if (rangesState.spot === '3bet') {
        rangesState.heroPos = heroPositions[0];
      } else if (rangesState.spot === '4bet' && vs3Pairs[rangesState.heroPos]) {
        /* ok */
      } else if (rangesState.spot === '4bet') {
        rangesState.heroPos = heroPositions[0];
      } else if (rangesState.spot === 'squeeze') {
        const sqHeroes = RM.validSqueezeHeroes ? RM.validSqueezeHeroes() : heroPositions;
        if (sqHeroes.indexOf(rangesState.heroPos) < 0) rangesState.heroPos = sqHeroes[0];
        heroPositions = sqHeroes;
      }
    }
    if (heroPositions.indexOf(rangesState.heroPos) < 0) rangesState.heroPos = heroPositions[0];

    heroRow.innerHTML = heroPositions.map((p) =>
      `<button type="button" class="ranges-pos-btn${rangesState.heroPos === p ? ' hero-active' : ''}" data-ranges-hero="${p}">${p}</button>`
    ).join('');

    const needsVillain = isPostflop || (spot.villainPositions && spot.villainPositions.length > 0);
    const isSqueeze = !isPostflop && rangesState.spot === 'squeeze';
    if (villainBlock) villainBlock.classList.toggle('hidden', !needsVillain);
    if (callerBlock) callerBlock.classList.toggle('hidden', !isSqueeze);
    if (needsVillain) {
      let villainPositions = isPostflop
        ? (RM.POSTFLOP_EXPLORER ? RM.POSTFLOP_EXPLORER.villainPositions.slice() : RM.villainPositionsForSpot('postflop', ctx))
        : RM.villainPositionsForSpot(rangesState.spot, ctx);
      if (!isPostflop && rangesState.spot === '3bet') {
        villainPositions = vsPairs[rangesState.heroPos] || villainPositions;
        if (villainPositions.indexOf(rangesState.villainPos) < 0) rangesState.villainPos = villainPositions[0];
      } else if (!isPostflop && rangesState.spot === '4bet') {
        villainPositions = vs3Pairs[rangesState.heroPos] || villainPositions;
        if (villainPositions.indexOf(rangesState.villainPos) < 0) rangesState.villainPos = villainPositions[0];
      } else if (isSqueeze && RM.validSqueezeOpeners) {
        villainPositions = RM.validSqueezeOpeners(rangesState.heroPos);
        if (!villainPositions.length) villainPositions = spot.villainPositions.slice();
        if (villainPositions.indexOf(rangesState.villainPos) < 0) rangesState.villainPos = villainPositions[0];
      } else if (villainPositions.indexOf(rangesState.villainPos) < 0) {
        rangesState.villainPos = villainPositions[0];
      }
      if (villainLabel) {
        villainLabel.textContent = (isPostflop
          ? ((RM.POSTFLOP_EXPLORER && RM.POSTFLOP_EXPLORER.villainLabel) || 'Villano:')
          : (spot.villainLabel || 'Villano:'));
      }
      villainRow.innerHTML = villainPositions.map((p) =>
        `<button type="button" class="ranges-pos-btn${rangesState.villainPos === p ? ' villain-active' : ''}" data-ranges-villain="${p}">${p}</button>`
      ).join('');
    }
    if (isSqueeze && callerRow && RM.validSqueezeCallers) {
      let callerPositions = RM.validSqueezeCallers(rangesState.heroPos, rangesState.villainPos);
      if (!callerPositions.length && RM.defaultCallerForSqueeze) {
        const dc = RM.defaultCallerForSqueeze(rangesState.heroPos, rangesState.villainPos);
        if (dc) callerPositions = [dc];
      }
      if (callerPositions.indexOf(rangesState.callerPos) < 0) rangesState.callerPos = callerPositions[0] || '';
      callerRow.innerHTML = callerPositions.map((p) =>
        `<button type="button" class="ranges-pos-btn${rangesState.callerPos === p ? ' caller-active' : ''}" data-ranges-caller="${p}">${p}</button>`
      ).join('');
    }

    const squeezeCaller = isSqueeze ? rangesState.callerPos : null;
    const postflopMeta = isPostflop && RM.POSTFLOP_STREETS
      ? (RM.POSTFLOP_STREETS[street] || RM.POSTFLOP_STREETS.flop)
      : null;
    const boardNeed = postflopMeta ? postflopMeta.cards : 3;
    const postflopBlock = $('#ranges-postflop-block');
    if (postflopBlock) postflopBlock.classList.toggle('hidden', !isPostflop);
    if (isPostflop) {
      const boardBtn = $('#ranges-board-pick-btn');
      const boardPreview = $('#ranges-board-preview');
      const boardLabel = $('#ranges-board-label');
      const potIn = $('#ranges-pot-input');
      const callIn = $('#ranges-tocall-input');
      const boardText = rangesBoardText();
      if (boardLabel) boardLabel.textContent = postflopMeta.boardLabel;
      if (boardPreview) {
        const boardCards = RM.parseBoardText
          ? RM.parseBoardText(boardText)
          : String(boardText || '').split(/\s+/).filter(Boolean);
        boardPreview.innerHTML = boardCards.length
          ? boardCards.map(Cards.cardToHTML).join('')
          : '<span class="ranges-board-empty">' + escapeHtml(postflopMeta.emptyHint) + '</span>';
      }
      if (boardBtn) {
        boardBtn.setAttribute('aria-label', postflopMeta.pickTitle);
        boardBtn.onclick = function () {
          if (!window.PTCardPicker) return;
          const selected = RM.parseBoardText
            ? RM.parseBoardText(rangesBoardText())
            : [];
          PTCardPicker.open({
            title: postflopMeta.pickTitle,
            max: boardNeed,
            requireExact: true,
            selected: selected.slice(0, boardNeed),
            onDone: function (cards) {
              if (!cards || cards.length < boardNeed) return;
              setRangesBoardText(PTCardPicker.cardsToText(cards.slice(0, boardNeed)));
              renderRangesExplorer();
            }
          });
        };
      }
      if (potIn) {
        if (!potIn.dataset.bound) {
          potIn.dataset.bound = '1';
          potIn.value = String(rangesState.potBB || 6);
          potIn.addEventListener('change', () => {
            rangesState.potBB = Number(potIn.value) || 6;
            renderRangesExplorer();
          });
        }
        rangesState.potBB = Number(potIn.value) || rangesState.potBB;
      }
      if (callIn) {
        if (!callIn.dataset.bound) {
          callIn.dataset.bound = '1';
          callIn.value = String(rangesState.toCallBB || 0);
          callIn.addEventListener('change', () => {
            rangesState.toCallBB = Number(callIn.value) || 0;
            renderRangesExplorer();
          });
        }
        rangesState.toCallBB = Number(callIn.value) || 0;
      }
    }

    let input = null;
    if (isPostflop && RM.buildPostflopExplorerInput) {
      const c = RM.explorerCtx ? RM.explorerCtx(ctx) : { stackBB: 100 };
      input = RM.buildPostflopExplorerInput({
        street: street,
        heroPos: rangesState.heroPos,
        villainPos: rangesState.villainPos,
        board: rangesBoardText(),
        potBB: rangesState.potBB,
        toCallBB: rangesState.toCallBB,
        stackDepth: c.stackBB || 100,
        inPosition: ['BTN', 'CO', 'HJ'].indexOf(rangesState.heroPos) >= 0
      });
    } else if (!isPostflop) {
      input = RM.buildExplorerInput(
        rangesState.spot,
        rangesState.heroPos,
        needsVillain ? rangesState.villainPos : null,
        ctx,
        squeezeCaller,
        rangesState.openSize
      );
    }
    if (titleEl) {
      let baseTitle;
      if (isPostflop) {
        baseTitle = (postflopMeta.label || street) + ' · ' + rangesState.heroPos + ' vs ' + rangesState.villainPos
          + ' · ' + (rangesBoardText() || '');
      } else if (isSqueeze) {
        baseTitle = RM.explorerTitle(rangesState.spot, rangesState.heroPos, rangesState.villainPos, squeezeCaller);
      } else {
        baseTitle = RM.explorerTitle(rangesState.spot, rangesState.heroPos, rangesState.villainPos);
      }
      const sizingNote = (!isPostflop && (rangesState.spot === '3bet' || rangesState.spot === 'squeeze'))
        ? ` · open ${rangesState.openSize}x`
        : '';
      titleEl.textContent = baseTitle + sizingNote;
    }

    const sizingRow = $('#ranges-sizing-row');
    if (sizingRow) {
      const showSizing = !isPostflop && (rangesState.spot === '3bet' || rangesState.spot === 'squeeze' || rangesState.spot === 'RFI');
      sizingRow.classList.toggle('hidden', !showSizing);
      sizingRow.querySelectorAll('[data-ranges-sizing]').forEach((b) => {
        b.classList.toggle('active', Number(b.dataset.rangesSizing) === Number(rangesState.openSize));
        b.onclick = function () {
          rangesState.openSize = Number(b.dataset.rangesSizing) === 3 ? 3 : 2.5;
          renderRangesExplorer();
        };
      });
    }

    const favBtn = $('#ranges-favorite-btn');
    const favSpot = {
      street: street,
      gameType: rangesState.gameType,
      stackDepth: rangesState.stackDepth,
      mttPhase: rangesState.mttPhase || 'auto',
      spot: isPostflop ? 'postflop' : rangesState.spot,
      heroPos: rangesState.heroPos,
      villainPos: needsVillain ? rangesState.villainPos : '',
      callerPos: isSqueeze ? rangesState.callerPos : '',
      openSize: rangesState.openSize,
      boardText: isPostflop ? rangesBoardText() : '',
      potBB: isPostflop ? rangesState.potBB : undefined,
      toCallBB: isPostflop ? rangesState.toCallBB : undefined,
      label: titleEl ? titleEl.textContent : rangesState.spot
    };
    if (favBtn && Store.isFavoriteSpot) {
      const isFav = Store.isFavoriteSpot(favSpot);
      favBtn.textContent = isFav ? '★ Favorito' : '☆ Guardar spot';
      favBtn.classList.toggle('active', isFav);
      favBtn.onclick = function () {
        Store.toggleFavoriteSpot(favSpot);
        renderRangesExplorer();
      };
    }
    const favHost = $('#ranges-favorites');
    if (favHost && Store.getFavoriteSpots) {
      const favs = Store.getFavoriteSpotsForStreet
        ? Store.getFavoriteSpotsForStreet(street)
        : Store.getFavoriteSpots().filter(function (f) {
          const st = Store.normalizeFavoriteStreet ? Store.normalizeFavoriteStreet(f) : 'preflop';
          return st === street;
        });
      if (!favs.length) {
        favHost.innerHTML = '<p class="muted-text ranges-fav-empty">Sin spots favoritos en esta pestaña.</p>';
      } else {
        favHost.innerHTML = '<div class="ranges-fav-list">' + favs.map((f, i) =>
          `<div class="ranges-fav-chip">`
            + `<button type="button" class="btn btn-ghost btn-sm ranges-fav-item" data-ranges-fav="${i}">${escapeHtml(f.label || (f.spot + ' · ' + f.heroPos))}</button>`
            + `<button type="button" class="ranges-fav-remove" data-ranges-fav-remove="${i}" title="Eliminar favorito" aria-label="Eliminar favorito">×</button>`
            + `</div>`
        ).join('') + '</div>';
        favHost.querySelectorAll('[data-ranges-fav]').forEach((b) => {
          b.onclick = function () {
            const f = favs[Number(b.dataset.rangesFav)];
            if (!f) return;
            const favStreet = Store.normalizeFavoriteStreet ? Store.normalizeFavoriteStreet(f) : (f.street || 'preflop');
            rangesState.street = favStreet;
            rangesState.spot = f.spot || (favStreet === 'preflop' ? 'RFI' : 'postflop');
            rangesState.heroPos = f.heroPos || (favStreet === 'preflop' ? 'UTG' : 'BB');
            rangesState.villainPos = f.villainPos || 'UTG';
            rangesState.callerPos = f.callerPos || 'HJ';
            rangesState.openSize = Number(f.openSize) === 3 ? 3 : 2.5;
            if (favStreet !== 'preflop') {
              rangesState.boards[favStreet] = f.boardText || rangesState.boards[favStreet] || '';
              if (f.potBB != null) rangesState.potBB = Number(f.potBB) || 6;
              if (f.toCallBB != null) rangesState.toCallBB = Number(f.toCallBB) || 0;
              const potIn = $('#ranges-pot-input');
              const callIn = $('#ranges-tocall-input');
              if (potIn) potIn.value = String(rangesState.potBB);
              if (callIn) callIn.value = String(rangesState.toCallBB);
            }
            if (f.gameType) {
              $$('#ranges-game-type .setup-chip').forEach((c) => c.classList.toggle('active', c.dataset.val === f.gameType));
              syncRangesStackPhaseUI(f.gameType);
            }
            if (f.stackDepth) {
              $$('#ranges-stack-depth .setup-chip').forEach((c) => {
                if (!c.hidden) c.classList.toggle('active', c.dataset.val === f.stackDepth);
              });
            }
            if (f.mttPhase) {
              $$('#ranges-mtt-phase .setup-chip').forEach((c) => {
                if (!c.hidden) c.classList.toggle('active', c.dataset.val === f.mttPhase);
              });
            }
            renderRangesExplorer();
          };
        });
        favHost.querySelectorAll('[data-ranges-fav-remove]').forEach((b) => {
          b.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            const f = favs[Number(b.dataset.rangesFavRemove)];
            if (f && Store.removeFavoriteSpot) Store.removeFavoriteSpot(f);
            renderRangesExplorer();
          };
        });
      }
    }

    if (!isPostflop) {
      spotRow.querySelectorAll('[data-ranges-spot]').forEach((b) => {
        b.onclick = function () {
          rangesState.spot = b.dataset.rangesSpot;
          renderRangesExplorer();
        };
      });
    }
    heroRow.querySelectorAll('[data-ranges-hero]').forEach((b) => {
      b.onclick = function () {
        rangesState.heroPos = b.dataset.rangesHero;
        renderRangesExplorer();
      };
    });
    if (needsVillain) {
      villainRow.querySelectorAll('[data-ranges-villain]').forEach((b) => {
        b.onclick = function () {
          rangesState.villainPos = b.dataset.rangesVillain;
          renderRangesExplorer();
        };
      });
    }
    if (isSqueeze && callerRow) {
      callerRow.querySelectorAll('[data-ranges-caller]').forEach((b) => {
        b.onclick = function () {
          rangesState.callerPos = b.dataset.rangesCaller;
          renderRangesExplorer();
        };
      });
    }

    if (!input) {
      host.innerHTML = isPostflop
        ? ('<p class="muted-text">Indica un board de ' + boardNeed + ' cartas.</p>')
        : '<p class="muted-text">Combinación de posiciones no disponible en las tablas.</p>';
      return;
    }

    if (isPostflop) {
      host.innerHTML = '<p class="ranges-postflop-disclaimer muted-text" data-i18n="ranges.postflop.disclaimer">Vista heurística de frecuencias fold/call/raise. No es un solver full-tree.</p><div class="range-matrix-progress">Calculando…</div>';
      RM.computePostflopFreqMatrixAsync(input, function (done, total) {
        const prog = host.querySelector('.range-matrix-progress');
        if (prog) prog.textContent = `Calculando… ${Math.round((done / total) * 100)}%`;
      }).then(function (result) {
        const disc = '<p class="ranges-postflop-disclaimer muted-text">Vista heurística de frecuencias fold/call/raise. No es un solver full-tree.</p>';
        host.innerHTML = disc + renderRangeMatrixGrid(result, null, 'gto');
      }).catch(function (e) {
        host.innerHTML = '<p class="muted-text">Error: ' + escapeHtml(e.message || 'fallo') + '</p>';
      });
    } else {
      host.innerHTML = '<div class="range-matrix-progress">Calculando…</div>';
      RM.computeGtoMatrixAsync(input, function (done, total) {
        const prog = host.querySelector('.range-matrix-progress');
        if (prog) prog.textContent = `Calculando… ${Math.round((done / total) * 100)}%`;
      }).then(function (result) {
        host.innerHTML = renderRangeMatrixGrid(result, null, 'gto');
      }).catch(function (e) {
        host.innerHTML = '<p class="muted-text">Error: ' + escapeHtml(e.message || 'fallo') + '</p>';
      });
    }
  }

  function pricingPriceHtml(planId, fallbackPrice, owned) {
    const P = window.PTPricing;
    if (P) {
      const html = planId === 'free' ? P.freePriceHtml() : P.planPriceHtml(planId, { owned: !!owned });
      if (html) return html;
    }
    return '<span class="price-amount">' + escapeHtml(fallbackPrice) + '&nbsp;€<small>/mes</small></span>';
  }

  function renderPricing() {
    const grid = $('#pricing-grid');
    const current = $('#pricing-current');
    if (!grid) return;

    const plans = (window.PTBilling && window.PTBilling.planInfo) ? window.PTBilling.planInfo() : {};
    const Ent = window.PTEntitlements;
    const ent = Ent && Ent.get ? Ent.get() : { plan: 'free', plan_label: 'Gratis' };

    if (current) {
      let line = 'Tu plan actual: <strong>' + escapeHtml(ent.plan_label || ent.plan) + '</strong>';
      if (ent.subscription_status === 'trialing' && window.PTBilling && PTBilling.trialDaysLeft) {
        var daysLeft = PTBilling.trialDaysLeft(ent);
        if (daysLeft != null) {
          line += ' · <span class="trial-badge">Prueba: ' + daysLeft + ' día' + (daysLeft === 1 ? '' : 's') + ' restantes</span>';
        } else {
          line += ' · <span class="trial-badge">Periodo de prueba</span>';
        }
      }
      if (ent.usage && ent.limits) {
        if (ent.limits.trainer_hands_per_day != null) {
          line += ' · Entrenador hoy: ' + ent.usage.trainer_hands_today + '/' + ent.limits.trainer_hands_per_day;
        }
        if (ent.limits.import_sessions_per_month != null) {
          line += ' · Imports mes: ' + (Number(ent.usage.import_sessions_month) || 0) + '/' + ent.limits.import_sessions_per_month;
        }
        if (Ent && Ent.analysisHandsMax) {
          var aMax = Ent.analysisHandsMax(ent);
          var aUsed = (window.Store && Store.getAnalysisHands) ? Store.getAnalysisHands().length : 0;
          line += ' · Análisis: ' + aUsed + '/' + aMax;
        }
        if (Ent && Ent.aiQuotaSummary) {
          var aiLine = Ent.aiQuotaSummary(ent);
          if (aiLine.unlimited) {
            line += ' · ' + aiLine.label.replace('Consultas IA: ', 'IA: ');
          } else {
            line += ' · ' + escapeHtml(aiLine.label);
          }
        } else if (ent.limits.ai_reports_per_month != null) {
          line += ' · IA mes: ' + (Number(ent.usage.ai_reports_month) || 0) + '/' + ent.limits.ai_reports_per_month;
          if (ent.bonus && Number(ent.bonus.balance) > 0) {
            line += ' · Bono IA: ' + ent.bonus.balance;
          }
        }
      }
      current.innerHTML = line;
    }

    var promoHost = $('#pricing-promo-banner');
    if (promoHost && window.PTBillingPromo && PTBillingPromo.bannerHtml) {
      promoHost.innerHTML = PTBillingPromo.bannerHtml();
    }

    const cards = [
      {
        id: 'free', title: 'Gratis', priceHtml: pricingPriceHtml('free', '0'), featured: false,
        features: [
          '15 manos entrenador/día',
          '1 sesión import/mes (máx. 200 manos)',
          '5 manos en análisis (solo manual)',
          '3 consultas ForgeCoach/mes de prueba',
          'Histórico 30 días'
        ],
        cta: null
      },
      {
        id: 'pro', title: plans.pro ? plans.pro.label : 'Study',
        priceHtml: pricingPriceHtml('pro', plans.pro ? plans.pro.monthly : '14,99', ent.is_founder_study),
        featured: false,
        features: (window.PTBilling && window.PTBilling.purchasesPaused && window.PTBilling.purchasesPaused())
          ? [
            'FOUNDER Study · plazas limitadas por petición',
            'Entrenador e import ilimitados',
            '20 manos en análisis',
            '40 consultas ForgeCoach/mes (añadir manos, análisis y preguntas)',
            'Sync, estadísticas y repaso'
          ]
          : [
            'Prueba 10 días (una vez por cuenta)',
            'Entrenador e import ilimitados',
            '20 manos en análisis',
            '40 consultas ForgeCoach/mes (añadir manos, análisis y preguntas)',
            'Sync, estadísticas y repaso'
          ],
        cta: 'pro'
      },
      {
        id: 'premium', title: plans.premium ? plans.premium.label : 'Coach',
        priceHtml: pricingPriceHtml('premium', plans.premium ? plans.premium.monthly : '34,99', ent.is_founder_coach),
        featured: false,
        features: (window.PTBilling && window.PTBilling.purchasesPaused && window.PTBilling.purchasesPaused())
          ? [
            'FOUNDER Coach · plazas limitadas por petición',
            'Todo Study',
            '100 manos en análisis',
            '150 consultas ForgeCoach/mes',
            'Soporte prioritario'
          ]
          : [
            'Todo Study',
            '100 manos en análisis',
            '150 consultas ForgeCoach/mes',
            'Informes y preguntas sobre manos, análisis y sesiones',
            'Soporte prioritario'
          ],
        cta: 'premium'
      }
    ];

    const Billing = window.PTBilling;
    const billingOn = !!(Billing && Billing.enabled && Billing.enabled());
    const paused = !!(Billing && Billing.purchasesPaused && Billing.purchasesPaused());
    const founder = (Billing && Billing.founderInfo) ? Billing.founderInfo() : (window.PT_BILLING && window.PT_BILLING.founder) || null;
    const isPaidSub = !!ent.paid_active && (ent.plan === 'pro' || ent.plan === 'premium');
    const curInterval = ent.billing_interval === 'year' ? 'year'
      : (ent.billing_interval === 'month' ? 'month' : null);
    const periodEnd = ent.subscription_period_end || null;
    const canceling = !!ent.subscription_cancel_at_period_end || ent.subscription_status === 'canceling';
    const planLabels = {
      free: 'Gratis',
      pro: plans.pro ? plans.pro.label : 'Study',
      premium: plans.premium ? plans.premium.label : 'Coach'
    };

    grid.innerHTML = cards.map(function (c) {
      const isCurrent = ent.plan === c.id;
      let btns = '';
      if (paused && !isPaidSub) {
        if (isCurrent) {
          btns = '<span class="muted-text">Plan actual</span>';
        } else if (c.id === 'pro') {
          btns = '<button type="button" class="btn btn-ghost" disabled aria-disabled="true" title="Compras cerradas hasta FOUNDER">' +
            'Compra ' + escapeHtml((founder && founder.launchLabel) || 'próximamente') + '</button>';
          btns += (window.PTFounderRequest && window.PTFounderRequest.requestButtonHtml)
            ? window.PTFounderRequest.requestButtonHtml('study', 'btn-block')
            : '<button type="button" class="btn btn-primary btn-block" data-founder-request="study">Solicitar plaza FOUNDER Study</button>';
          btns += '<p class="muted-text pricing-cta-note"><strong>Plazas limitadas por petición</strong>. FOUNDER Study · ' +
            escapeHtml((founder && founder.discount) || '40%') +
            ' dto. Se envía un mensaje a soporte automáticamente.</p>';
        } else if (c.id === 'premium') {
          btns = '<button type="button" class="btn btn-ghost" disabled aria-disabled="true" title="Compras cerradas hasta FOUNDER">' +
            'Compra ' + escapeHtml((founder && founder.launchLabel) || 'próximamente') + '</button>';
          btns += (window.PTFounderRequest && window.PTFounderRequest.requestButtonHtml)
            ? window.PTFounderRequest.requestButtonHtml('coach', 'btn-block')
            : '<button type="button" class="btn btn-primary btn-block" data-founder-request="coach">Solicitar plaza FOUNDER Coach</button>';
          btns += '<p class="muted-text pricing-cta-note"><strong>Plazas limitadas por petición</strong>. FOUNDER Coach · ' +
            escapeHtml((founder && founder.discount) || '40%') +
            ' dto. Se envía un mensaje a soporte automáticamente.</p>';
        }
      } else if (!isPaidSub) {
        // Usuario Gratis: alta normal por checkout.
        if (c.cta && !isCurrent) {
          if (c.id === 'pro' && billingOn) {
            const trial = window.PTBilling && PTBilling.trialInfo ? PTBilling.trialInfo() : null;
            const trialLbl = trial ? trial.label : 'Probar Study 10 días';
            btns = '<button type="button" class="btn btn-primary" data-checkout="pro" data-interval="month">' +
              escapeHtml(trialLbl) + '</button>';
            btns += '<button type="button" class="btn btn-ghost" data-checkout="pro" data-interval="year">Anual</button>';
          } else {
            btns = '<button type="button" class="btn btn-primary" data-checkout="' + c.cta + '" data-interval="month">Mensual</button>';
            if (billingOn) {
              btns += '<button type="button" class="btn btn-ghost" data-checkout="' + c.cta + '" data-interval="year">Anual</button>';
            }
          }
        } else if (isCurrent) {
          btns = '<span class="muted-text">Plan actual</span>';
        }
      } else if (c.id === 'free') {
        // Bajar a Gratis = cancelar suscripción.
        if (canceling) {
          btns = '<span class="muted-text">Se cancela al final del periodo</span>';
        } else if (billingOn) {
          btns = '<button type="button" class="btn btn-ghost" data-plan-change="free" data-interval="month">Cancelar suscripción</button>';
        }
      } else if (isCurrent) {
        const intervalNote = curInterval === 'year' ? 'Facturación anual'
          : (curInterval === 'month' ? 'Facturación mensual' : 'Plan actual');
        btns = '<span class="muted-text">Plan actual · ' + escapeHtml(intervalNote) + '</span>';
        if (billingOn && !paused && curInterval === 'month') {
          btns += '<button type="button" class="btn btn-ghost btn-sm" data-plan-change="' + c.id + '" data-interval="year">Cambiar a anual</button>';
        } else if (billingOn && !paused && curInterval === 'year') {
          btns += '<button type="button" class="btn btn-ghost btn-sm" data-plan-change="' + c.id + '" data-interval="month">Cambiar a mensual</button>';
        }
        if (canceling && billingOn) {
          btns += '<button type="button" class="btn btn-primary btn-sm" data-plan-portal="1">Reactivar</button>';
        }
      } else if (billingOn && !paused) {
        // Otro plan de pago: upgrade o downgrade.
        const verb = c.id === 'premium' ? 'Mejorar a ' : 'Cambiar a ';
        btns = '<button type="button" class="btn btn-primary" data-plan-change="' + c.id + '" data-interval="' + (curInterval || 'month') + '">' + escapeHtml(verb + c.title) + '</button>';
      } else if (paused) {
        btns = '<button type="button" class="btn btn-ghost" disabled aria-disabled="true">Cambios de plan cerrados</button>';
      }
      var featured = paused ? (c.id === 'pro') : isCurrent;
      return '<div class="pricing-card' + (featured ? ' featured' : '') + '">' +
        '<h3>' + escapeHtml(c.title) + '</h3>' +
        '<div class="pricing-price">' + c.priceHtml + '</div>' +
        '<ul class="pricing-features">' + c.features.map(function (f) { return '<li>' + escapeHtml(f) + '</li>'; }).join('') + '</ul>' +
        btns + '</div>';
    }).join('');

    grid.querySelectorAll('[data-checkout]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!window.PTBilling || !window.PTBilling.startCheckout) return;
        window.PTBilling.startCheckout(btn.dataset.checkout, btn.dataset.interval).catch(function (e) {
          if (String(e.message) === 'already_subscribed') {
            alert('Ya tienes una suscripción activa. Gestiónala en el portal de Stripe pulsando «Actualiza la suscripción».');
            return;
          }
          alert(e.message || 'No se pudo iniciar el pago.');
        });
      });
    });

    grid.querySelectorAll('[data-founder-request]').forEach(function (btn) {
      if (window.PTFounderRequest && window.PTFounderRequest.bindButton) {
        window.PTFounderRequest.bindButton(btn);
      }
    });

    grid.querySelectorAll('[data-plan-change]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!window.PTBilling || !window.PTBilling.startPlanChange) {
          if (window.PTBilling && window.PTBilling.openPortalWithHint) {
            window.PTBilling.openPortalWithHint();
          } else if (window.PTBilling && window.PTBilling.openPortal) {
            window.PTBilling.openPortal();
          }
          return;
        }
        window.PTBilling.startPlanChange().catch(function (e) {
          alert(e.message || 'No se pudo abrir el portal de suscripción.');
        });
      });
    });

    grid.querySelectorAll('[data-plan-portal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = (window.PTBilling && window.PTBilling.openPortalWithHint)
          ? window.PTBilling.openPortalWithHint.bind(window.PTBilling)
          : (window.PTBilling && window.PTBilling.openPortal
            ? window.PTBilling.openPortal.bind(window.PTBilling) : null);
        if (open) {
          open().catch(function (e) {
            alert(e.message || 'No se pudo abrir el portal de suscripción.');
          });
        }
      });
    });

    const changeNote = $('#pricing-change-note');
    if (changeNote) {
      if (paused && !isPaidSub) {
        changeNote.innerHTML = 'Compras cerradas hasta el <strong>FOUNDER</strong> (' +
          escapeHtml((founder && founder.launchLabel) || 'próximamente') +
          '). <strong>' + escapeHtml((founder && founder.seatsNote) || 'Plazas limitadas por petición') +
          '</strong>. ' + escapeHtml((founder && founder.priorityNote) ||
            'Solicita plaza FOUNDER Study o Coach; revisamos cada petición.') +
          ' Usa el botón en cada plan.';
        changeNote.classList.remove('hidden');
      } else if (isPaidSub) {
        changeNote.innerHTML = 'Gestiona tu suscripción (cambio de plan, facturación anual o cancelación) en el portal seguro de Stripe. Pulsa <strong>«Actualiza la suscripción»</strong> dentro del portal.';
        changeNote.classList.remove('hidden');
      } else {
        changeNote.innerHTML = '';
        changeNote.classList.add('hidden');
      }
    }

    if (Billing && Billing.mountAnnualUpsell && !paused) {
      Billing.mountAnnualUpsell($('#pricing-annual-upsell'), ent);
    } else {
      var upsell = $('#pricing-annual-upsell');
      if (upsell) {
        upsell.innerHTML = '';
        upsell.classList.add('hidden');
      }
    }

    renderBonusPacks(ent);
  }

  function renderBonusPacks(ent) {
    var host = $('#pricing-bonus');
    if (!host) return;
    var bonus = (window.PTBilling && window.PTBilling.bonusInfo) ? window.PTBilling.bonusInfo() : null;
    if (!bonus || !bonus.packs) {
      host.innerHTML = '';
      return;
    }
    var paused = !!(window.PTBilling && window.PTBilling.purchasesPaused && window.PTBilling.purchasesPaused());
    var founder = (window.PTBilling && window.PTBilling.founderInfo)
      ? window.PTBilling.founderInfo()
      : (window.PT_BILLING && window.PT_BILLING.founder) || null;
    var tier = (window.PTBilling.bonusTierForPlan)
      ? window.PTBilling.bonusTierForPlan(ent.plan || 'free')
      : 'free';
    var prices = (bonus.prices && bonus.prices[tier]) || bonus.prices.free;
    var tierLabel = { free: 'Gratis', study: 'Study', coach: 'Coach' }[tier] || tier;
    var packs = ['s', 'm', 'l'];
    var rows = packs.map(function (pk) {
      var def = bonus.packs[pk];
      var price = prices[pk] || '—';
      var buyBtn = paused
        ? '<button type="button" class="btn btn-primary btn-sm" disabled aria-disabled="true">No disponible</button>'
        : '<button type="button" class="btn btn-primary btn-sm" data-bonus-pack="' + pk + '">Comprar</button>';
      return '<div class="bonus-pack-card">' +
        '<div class="bonus-pack-main">' +
        '<strong>' + escapeHtml(def.label) + '</strong>' +
        '<span class="muted-text">' + def.credits + ' consultas</span>' +
        '</div>' +
        '<div class="bonus-pack-price">' + escapeHtml(price) + ' €</div>' +
        buyBtn +
        '</div>';
    }).join('');
    var pausedNote = paused
      ? '<p class="muted-text">Compra de bonos cerrada hasta el <strong>FOUNDER</strong> (' +
        escapeHtml((founder && founder.launchLabel) || 'próximamente') + ').</p>'
      : '';
    host.innerHTML = '<div class="pricing-bonus-panel card-box">' +
      '<h3>Bono de consultas IA</h3>' +
      '<p class="muted-text">Precio para tu plan <strong>' + escapeHtml(tierLabel) + '</strong>. ' +
      'Los bonos tienen <strong>mejores precios en los planes superiores</strong> (Study y Coach). ' +
      'Válido 12 meses. Se consumen después de las consultas incluidas en tu plan.</p>' +
      pausedNote +
      '<div class="bonus-pack-grid">' + rows + '</div>' +
      '<p class="muted-text pricing-foot">Pago único · Sin renovación automática</p>' +
      '</div>';

    host.querySelectorAll('[data-bonus-pack]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!window.PTBilling || !window.PTBilling.startBonusCheckout) return;
        if (!window.PTSupabase || !window.PTSupabase.useAuth || !window.PTSupabase.useAuth()) {
          alert('Inicia sesión para comprar un bono.');
          return;
        }
        if (window.PTAnalytics && PTAnalytics.trackCheckoutStart) {
          PTAnalytics.trackCheckoutStart({ pack: btn.getAttribute('data-bonus-pack') });
        }
        window.PTBilling.startBonusCheckout(btn.getAttribute('data-bonus-pack')).catch(function (e) {
          alert(e.message || 'No se pudo iniciar el pago.');
        });
      });
    });
  }

  function showFeedback(d) {
    if (!shouldShowDecisionFeedback(d)) {
      const fb = $('#feedback');
      if (fb) {
        fb.classList.add('hidden');
        fb.innerHTML = '';
      }
      return;
    }
    const fb = $('#feedback');
    fb.classList.remove('hidden');
    const verdict = verdictWord(d.class);
    const bestId = resolveBestId(d.optionBreakdown, d.best);
    const bestLabel = actionName(bestId);
    const bestPct = Math.round((d.gto[bestId] || 0) * 100);
    let html = `<h3>Decisión en ${d.street}: <span class="verdict ${d.class}">${verdict}</span>`;
    if (d.score != null) html += ` <span class="muted-text">· Puntuación ${d.score}/100</span>`;
    html += `</h3>`;
    html += `<div>Elegiste <strong>${escapeHtml(d.label)}</strong>. `;
    if (d.class === 'optima') {
      html += bestId === d.action
        ? `Es la jugada GTO principal.`
        : `Está dentro de la mezcla GTO principal (la más frecuente es <strong>${bestLabel}</strong>, ${bestPct}%).`;
    } else if (bestId === d.action) html += `Es la jugada de mayor frecuencia GTO (${bestPct}%), pero el EV del spot penaliza esta línea.`;
    else html += `La jugada de mayor frecuencia GTO era <strong>${bestLabel}</strong> (${bestPct}%).`;
    html += `</div>`;
    if (d.frequency != null) html += `<div class="muted-text" style="margin-top:4px">Frecuencia GTO de tu acción: ${Math.round(d.frequency * 100)}%</div>`;
    html += renderDecisionContextLine(d);
    html += renderDecisionMath(d);
    html += `<div class="result-line" style="border:none;padding-top:6px">EV perdido: <span class="${d.evLoss > 0 ? 'net-neg' : 'net-pos'}">${d.evLoss > 0 ? '-' + fmtBB(d.evLoss) : '0'} bb</span>${d.evLossTier ? ` (${d.evLossTier})` : ''}</div>`;
    html += renderTournamentDecisionImpact(d);
    if (d.explanation) html += `<div class="spot-context" style="margin-top:8px;font-size:13px">${escapeHtml(d.explanation)}</div>`;
    if (d.errors && d.errors.length) html += `<div class="result-line" style="border-color:var(--red)">${d.errors.map((e) => escapeHtml(e.msg)).join(' · ')}</div>`;
    html += renderOptionGrid(d.optionBreakdown, d.action, d.best);
    fb.innerHTML = html;
  }

  function renderDecisionContextLine(d) {
    const cfg = (hand && hand.playConfig) || playSessionConfig;
    if (!cfg && !d) return '';
    const parts = [];
    const hub = formatHubOfConfig(cfg || {});
    if (hub === 'spin') parts.push('Spin (estudio por charts + ICM lite)');
    else if (hub === 'mtt') parts.push('MTT (estudio heurístico por fase)');
    else parts.push('Cash');
    if (cfg) {
      if (cfg.resolvedPhase && hub !== 'cash') parts.push('fase ' + phaseLabelForHud(cfg.resolvedPhase));
      if (cfg.stackBB != null) parts.push(cfg.stackBB + 'bb');
      if (cfg.anteBB > 0) parts.push('ante ' + cfg.anteBB);
      if (hub === 'spin' && cfg.spinPayout) parts.push('payout ' + cfg.spinPayout);
      if (hub === 'mtt' && cfg.playersLeft != null && cfg.placesPaid != null) {
        parts.push(cfg.playersLeft + ' left / ' + cfg.placesPaid + ' paid');
      }
      if (hub === 'mtt' && cfg.buyIn != null) parts.push('BI €' + cfg.buyIn);
      if (cfg.preflopOpenSize) parts.push('open ' + cfg.preflopOpenSize + '×');
      if (cfg.villainLevel && cfg.villainLevel !== 'pro') {
        parts.push('rivales ' + cfg.villainLevel + ' (no es GTO puro del villano)');
      }
      if (cfg.villainType && cfg.villainType !== 'random') {
        parts.push('tipo ' + cfg.villainType);
      }
      if (cfg.scoreMode === 'exploit' && cfg.villainType && cfg.villainType !== 'random') {
        parts.push('acierto explotativo vs ' + cfg.villainType);
      }
    }
    if (hand && hand.displayHeroPos && hand.hero && hand.hero.pos && hand.displayHeroPos !== hand.hero.pos) {
      parts.push(hand.displayHeroPos + ' evaluado como ' + hand.hero.pos + ' (mapa 6-max)');
    }
    if (!parts.length) return '';
    return '<div class="muted-text" style="margin-top:6px;font-size:12px">' + escapeHtml(parts.join(' · ')) + '</div>';
  }

  function renderGtoBars(gto, opts) {
    opts = opts || {};
    if (!gto) return '';
    const title = opts.title || (opts.exploit
      ? 'Estrategia explotativa (frecuencias):'
      : 'Estrategia GTO (frecuencias):');
    let html = '<div class="gto-bars"><div style="color:var(--muted);font-size:12px;margin-bottom:4px">' +
      escapeHtml(title) + '</div>';
    Object.keys(gto).forEach((a) => {
      const pct = Math.round(gto[a] * 100);
      html += `<div class="gto-bar"><span class="lbl">${actionName(a)}</span>
        <span class="track"><span class="fill" style="width:${pct}%"></span></span>
        <span class="pct">${pct}%</span></div>`;
    });
    return html + '</div>';
  }

  function renderExploitDeltaNote(d) {
    if (!d || !d.exploitApplied) return '';
    let html = '<div class="exploit-delta-note muted-text" style="margin-top:6px;font-size:12px">';
    html += '<strong>Vs ' + escapeHtml(d.villainType || 'rival') + ':</strong> ';
    const reasons = (d.exploitReasons || []).slice(0, 2);
    if (reasons.length) html += escapeHtml(reasons.join(' '));
    else html += 'Mix desviado del GTO según leaks típicos del arquetipo.';
    if (d.gtoBaseline) {
      html += renderGtoBars(d.gtoBaseline, { title: 'Referencia GTO (sin explotación):' });
    }
    return html + '</div>';
  }

  function finishHand() {
    if (!hand || hand._finishHandled) return;
    hand._finishHandled = true;

    const r = hand.result;
    session.hands++;
    session.net += r.heroNet || 0;
    if (r.handScore != null) {
      session.handScoreSum = roundSession((session.handScoreSum || 0) + Number(r.handScore));
    }
    Store.saveHand(hand);
    if (window.PTGuest && typeof window.PTGuest.afterHandFinished === 'function' &&
        window.PTGuest.isActive && window.PTGuest.isActive()) {
      window.PTGuest.afterHandFinished(hand);
    }
    if (window.PTSchool && typeof window.PTSchool.afterHandFinished === 'function') {
      if (window.PTSchool.afterHandFinished(hand)) {
        renderTable();
        refreshSessionUI();
        return;
      }
    }
    if (window.PTLegendary && typeof window.PTLegendary.afterHandFinished === 'function') {
      if (window.PTLegendary.afterHandFinished(hand)) {
        renderTable();
        refreshSessionUI();
        return;
      }
    }
    if (window.PTReEngage && PTReEngage.touchTrain) PTReEngage.touchTrain();
    if (window.PTAnalytics && PTAnalytics.trackPlayHand) {
      PTAnalytics.trackPlayHand({ decisions: (hand.decisions || []).length, evLoss: r.totalEvLoss || 0 });
    }
    refreshSessionUI();

    const guestOn = window.PTGuest && PTGuest.isActive && PTGuest.isActive();
    const target = playSessionConfig && Number(playSessionConfig.handsTarget);
    const blockDone = !guestOn && target > 0 && session.hands >= target && !leakReplayQueue.length;

    if (guestOn) {
      const left = PTGuest.remaining ? PTGuest.remaining() : 0;
      if (left <= 0) {
        $('#actions').innerHTML =
          '<button class="btn btn-primary" id="guest-see-score">Ver resumen</button>';
        const see = $('#guest-see-score');
        if (see) see.addEventListener('click', () => {
          if (PTGuest.showGate) PTGuest.showGate('limit');
        });
      } else {
        $('#actions').innerHTML =
          '<button class="btn btn-primary" id="next-after">Siguiente mano &raquo;</button>';
        $('#next-after').addEventListener('click', () => { continueLeakReplayOrNext(); });
      }
    } else if (blockDone) {
      $('#actions').innerHTML =
        '<button class="btn btn-primary" id="session-summary-new">Nueva sesión</button>' +
        '<button class="btn btn-ghost" id="session-summary-continue">Seguir entrenando</button>';
      const newBtn = $('#session-summary-new');
      const contBtn = $('#session-summary-continue');
      if (newBtn) newBtn.addEventListener('click', () => resetPlaySession());
      if (contBtn) {
        contBtn.addEventListener('click', () => {
          if (playSessionConfig) playSessionConfig.handsTarget = 0;
          session.startedAt = Date.now();
          void startNewHand();
        });
      }
    } else {
      $('#actions').innerHTML = `<button class="btn btn-primary" id="next-after">Siguiente mano &raquo;</button>
      <button class="btn btn-ghost" id="replay-after">&#8635; Repetir esta mano</button>
      <button class="btn btn-ghost" id="new-session-after">Nueva sesión</button>`;
      $('#next-after').addEventListener('click', () => { continueLeakReplayOrNext(); });
      $('#replay-after').addEventListener('click', () => replayCurrentHand());
      $('#new-session-after').addEventListener('click', () => resetPlaySession());
    }

    // mostrar resultado completo + cartas del villano
    const fb = $('#feedback');
    fb.classList.remove('hidden');
    const netCls = r.heroNet >= 0 ? 'net-pos' : 'net-neg';
    let vill = r.villainCards ? r.villainCards.map(Cards.cardToHTML).join(' ') : '<em>no llegó a enseñar</em>';
    let html = `<h3>Resultado de la mano</h3>`;
    html += `<div>${escapeHtml(r.reason)}</div>`;
    if (r.villainProfile) {
      html += `<div class="result-line">Perfil del rival: <strong>${escapeHtml(r.villainProfile)}</strong>${r.villainProfileShort ? ` <span class="muted-text">(${escapeHtml(r.villainProfileShort)})</span>` : ''}</div>`;
    }
    html += `<div class="result-line">Cartas del villano (${hand.villain.pos || '—'}): ${vill}`;
    if (r.villainHandName) html += ` · ${r.villainHandName}`;
    html += `</div>`;
    if (hand.board.length) html += `<div class="result-line" style="border:none;padding-top:6px">Board: ${hand.board.map(Cards.cardToHTML).join(' ')}</div>`;
    html += `<div class="result-line">Resultado: <span class="${netCls}">${r.heroNet >= 0 ? '+' : ''}${fmtBB(r.heroNet)} bb</span>`;
    html += ` &nbsp;·&nbsp; EV perdido por errores: <span class="${r.totalEvLoss > 0 ? 'net-neg' : 'net-pos'}">-${fmtBB(r.totalEvLoss)} bb</span></div>`;

    const scoreMeta = resolveHandScoreMeta(hand, hand.decisions, r.totalEvLoss);
    if (scoreMeta) {
      html += `<div class="result-line hand-score-line">${handScoreBadgeHtml(scoreMeta)} ${handOptimalBannerHtml(scoreMeta)}`;
      if (scoreMeta.verdict) html += ` <span class="muted-text">${escapeHtml(scoreMeta.verdict)}</span>`;
      html += '</div>';
    }

    const netEv = (window.GTOEvLoss && window.GTOEvLoss.computeNetEvStats)
      ? window.GTOEvLoss.computeNetEvStats(r.heroNet || 0, r.totalEvLoss || 0)
      : { expectedNet: roundSession((r.heroNet || 0) - (r.totalEvLoss || 0)), varianceAdj: roundSession(r.totalEvLoss || 0) };
    const expectedNet = roundSession(netEv.expectedNet);
    const varianceAdj = roundSession(netEv.varianceAdj);

    html += '<div class="card-box" style="margin-top:10px"><h3>EV esperado vs resultado real</h3>';
    html += `<div class="stats-content" style="margin-bottom:0">
      <div class="stat-card"><div class="big ${expectedNet >= 0 ? 'net-pos' : 'net-neg'}">${expectedNet >= 0 ? '+' : ''}${fmtBB(expectedNet)}</div><div class="lbl">EV esperado (sin fugas)</div></div>
      <div class="stat-card"><div class="big ${netCls}">${r.heroNet >= 0 ? '+' : ''}${fmtBB(r.heroNet)}</div><div class="lbl">Resultado real</div></div>
      <div class="stat-card"><div class="big ${varianceAdj >= 0 ? 'net-pos' : 'net-neg'}">${varianceAdj >= 0 ? '+' : ''}${fmtBB(varianceAdj)}</div><div class="lbl">Varianza / suerte</div></div>
    </div></div>`;

    const nErr = hand.decisions.filter((d) => d.class === 'error' || d.class === 'imprecisa').length;
    if (nErr > 0) html += `<div class="result-line" style="border:none;padding-top:6px;color:var(--orange)">${nErr} decisión(es) guardada(s) en "Errores" para repaso.</div>`;

    html += renderHandDecisionsSummary(hand.decisions, 'trainer');

    if (blockDone) {
      html += renderSessionBlockSummary(target);
    }

    if (r.villainRangeLog && r.villainRangeLog.length) {
      html += '<div class="card-box" style="margin-top:14px"><h3>Lectura del rango del villano</h3><ul class="range-log">';
      r.villainRangeLog.forEach((e) => {
        html += `<li><strong>${cap(e.street)}</strong> · ${escapeHtml(e.label)}${e.amountBB != null ? ' ' + e.amountBB + 'bb' : ''}: ${escapeHtml(e.summary || e.note)}</li>`;
      });
      html += '</ul>';
      if (r.villainRangeSummary) {
        const summaryLines = r.villainRangeSummary.split(/\.\s+/).filter(Boolean);
        const uniqueSummary = summaryLines.filter((line, i, arr) => arr.indexOf(line) === i).join('. ');
        if (uniqueSummary) html += `<div class="muted-text" style="margin-top:8px">${escapeHtml(uniqueSummary)}</div>`;
      }
      html += '</div>';
    }

    html += '<button type="button" class="btn btn-ghost btn-share" id="share-hand-trainer">Compartir análisis</button>';
    html += '<div id="ai-report-trainer"></div>';

    fb.innerHTML = html;
    bindShareButton($('#share-hand-trainer'), () => ({
      source: 'trainer',
      hand: hand,
      title: shareHandTitle(hand)
    }));
    if (window.PTAIReport) {
      window.PTAIReport.mount($('#ai-report-trainer'), {
        scope: 'hand',
        getHand: () => hand,
        persist: {
          kind: 'history',
          getHandId: () => hand && hand.id
        },
        onThreadUpdate: (thread) => { if (hand) hand.coachThread = thread; }
      });
    }
    renderTable();
    $('#hero-handname').textContent = r.heroHandName ? tt('play.yourHand') + ': ' + r.heroHandName : handNameOnBoard();

    try {
      openHandEndPopup(r, { blockDone: !!blockDone, handsTarget: target || 0 });
    } catch (e) {
      console.warn('[hand-end-popup]', e);
      if (blockDone) {
        try { openSessionBlockPopup(target); } catch (e2) { console.warn('[session-block]', e2); }
      }
    }
  }

  function handEndOutcome(r) {
    const net = Number(r && r.heroNet) || 0;
    const tied = !!(r && (r.tied || /empate/i.test(String(r.reason || ''))));
    if (r && r.showdown) {
      // Título según el board (cmp), no según el signo del net: un chop con pot
      // desincronizado no debe decir «Pierdes» si reason/tied dicen empate.
      if (tied) return { title: 'Empate en el showdown', cls: 'hand-end-tie', kind: 'tie' };
      if (net > 0.02) return { title: 'Ganas el showdown', cls: 'hand-end-win', kind: 'win' };
      if (net < -0.02) return { title: 'Pierdes el showdown', cls: 'hand-end-lose', kind: 'lose' };
      return { title: 'Empate en el showdown', cls: 'hand-end-tie', kind: 'tie' };
    }
    if (net > 0.02) return { title: 'Ganas la mano', cls: 'hand-end-win', kind: 'win' };
    if (net < -0.02) return { title: 'Pierdes la mano', cls: 'hand-end-lose', kind: 'lose' };
    return { title: 'Mano terminada', cls: 'hand-end-tie', kind: 'tie' };
  }

  function revealHandEndDetails() {
    closeModal();
    const fb = $('#feedback');
    if (fb && !fb.classList.contains('hidden') && fb.scrollIntoView) {
      fb.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function openHandEndPopup(r, opts) {
    const box = $('#modal-content');
    const modal = $('#modal');
    if (!box || !modal || !hand || !r) return;
    const options = opts || {};
    const outcome = handEndOutcome(r);
    const netCls = r.heroNet >= 0 ? 'net-pos' : 'net-neg';
    const heroPos = hand.displayHeroPos || (hand.hero && hand.hero.pos) || '—';
    const villainPos = (hand.villain && hand.villain.pos) || r.villainPos || '—';
    const heroCards = (hand.hero && hand.hero.cards && hand.hero.cards.length)
      ? hand.hero.cards.map(Cards.cardToHTML).join('')
      : '<span class="muted-text">—</span>';
    const villainCards = r.villainCards && r.villainCards.length
      ? r.villainCards.map(Cards.cardToHTML).join('')
      : '<span class="muted-text">no llegó a enseñar</span>';
    const opponents = r.opponentCards || r.opponents || [];
    const multiwaySeats = (r.multiway && opponents.length)
      ? opponents.map(function (o) {
        const cards = o.cards && o.cards.length
          ? o.cards.map(Cards.cardToHTML).join('')
          : '<span class="muted-text">—</span>';
        return '<div class="hand-end-seat">' +
          '<div class="hand-end-seat-label">' + escapeHtml(String(o.pos)) + '</div>' +
          '<div class="hand-end-cards">' + cards + '</div>' +
          (o.handName ? '<div class="hand-end-handname">' + escapeHtml(o.handName) + '</div>' : '') +
        '</div>';
      }).join('')
      : '';
    const boardHtml = hand.board && hand.board.length
      ? hand.board.map(Cards.cardToHTML).join('')
      : '';
    const profile = r.villainProfile
      ? escapeHtml(r.villainProfile) + (r.villainProfileShort ? ' <span class="muted-text">(' + escapeHtml(r.villainProfileShort) + ')</span>' : '')
      : '';
    const reasonNorm = String(r.reason || '').replace(/\.+$/, '').trim().toLowerCase();
    const titleNorm = outcome.title.replace(/\.+$/, '').trim().toLowerCase();
    const reason = r.reason && reasonNorm && reasonNorm !== titleNorm
      ? '<p class="muted-text hand-end-reason">' + escapeHtml(r.reason) + '</p>'
      : '';
    const scoreMeta = resolveHandScoreMeta(hand, hand.decisions, r.totalEvLoss);
    const mwBadge = r.multiway
      ? '<p class="muted-text">Multiway' + (r.potType ? ' · ' + escapeHtml(String(r.potType)) : '') +
        (r.aliveCount ? ' · ' + r.aliveCount + '-way' : '') + '</p>'
      : '';

    hideVerdictToast();
    modal.classList.add('hand-end-modal');
    box.innerHTML = '<div class="hand-end-popup">' +
      '<div class="hand-end-popup-head ' + outcome.cls + '">' +
        '<p class="hand-end-kicker">Resultado de la mano</p>' +
        '<h3>' + escapeHtml(outcome.title) + '</h3>' +
        mwBadge +
        reason +
        handOptimalBannerHtml(scoreMeta) +
      '</div>' +
      '<div class="hand-end-matchup' + (multiwaySeats ? ' hand-end-matchup-multi' : '') + '">' +
        '<div class="hand-end-seat">' +
          '<div class="hand-end-seat-label">Héroe · ' + escapeHtml(heroPos) + '</div>' +
          '<div class="hand-end-cards">' + heroCards + '</div>' +
          (r.heroHandName ? '<div class="hand-end-handname">' + escapeHtml(r.heroHandName) + '</div>' : '') +
        '</div>' +
        (multiwaySeats
          ? multiwaySeats
          : ('<div class="hand-end-vs" aria-hidden="true">vs</div>' +
            '<div class="hand-end-seat">' +
              '<div class="hand-end-seat-label">Villano · ' + escapeHtml(String(villainPos)) + '</div>' +
              '<div class="hand-end-cards">' + villainCards + '</div>' +
              (r.villainHandName ? '<div class="hand-end-handname">' + escapeHtml(r.villainHandName) + '</div>' : '') +
              (profile ? '<div class="hand-end-profile">' + profile + '</div>' : '') +
            '</div>')) +
      '</div>' +
      (boardHtml ? '<div class="hand-end-board"><span class="muted-text">Board</span><div class="hand-end-cards">' + boardHtml + '</div></div>' : '') +
      '<div class="stats-content hand-end-popup-stats">' +
        '<div class="stat-card"><div class="big ' + netCls + '">' + (r.heroNet >= 0 ? '+' : '') + fmtBB(r.heroNet) + '</div><div class="lbl">Resultado real (bb)</div></div>' +
        '<div class="stat-card"><div class="big ' + (r.totalEvLoss > 0 ? 'net-neg' : 'net-pos') + '">-' + fmtBB(r.totalEvLoss || 0) + '</div><div class="lbl">EV perdido por errores</div></div>' +
        handScoreStatCardHtml(scoreMeta) +
      '</div>' +
      (scoreMeta && scoreMeta.verdict
        ? '<p class="muted-text hand-end-score-verdict">' + escapeHtml(scoreMeta.verdict) + '</p>'
        : '') +
      '<div class="hand-end-popup-actions">' +
        '<button type="button" class="btn btn-ghost" id="hand-end-details">Ver detalles</button>' +
        '<button type="button" class="btn btn-primary" id="hand-end-next">Siguiente mano &raquo;</button>' +
        '<button type="button" class="btn btn-ghost" id="hand-end-replay">&#8635; Repetir esta mano</button>' +
        '<button type="button" class="btn btn-ghost" id="hand-end-new-session">Nueva sesión</button>' +
      '</div>' +
    '</div>';

    modal.classList.remove('hidden');

    const detailsBtn = $('#hand-end-details');
    if (detailsBtn) detailsBtn.onclick = () => revealHandEndDetails();

    const nextBtn = $('#hand-end-next');
    if (nextBtn) {
      nextBtn.onclick = () => {
        closeModal();
        if (window.PTGuest && PTGuest.isActive && PTGuest.isActive()) {
          if (PTGuest.remaining && PTGuest.remaining() <= 0) {
            if (PTGuest.showGate) PTGuest.showGate('limit');
            return;
          }
          continueLeakReplayOrNext();
          return;
        }
        if (options.blockDone) {
          try { openSessionBlockPopup(options.handsTarget); } catch (e) { console.warn('[session-block]', e); }
          return;
        }
        continueLeakReplayOrNext();
      };
    }

    const replayBtn = $('#hand-end-replay');
    if (replayBtn) {
      replayBtn.onclick = () => {
        closeModal();
        replayCurrentHand();
      };
    }

    const newBtn = $('#hand-end-new-session');
    if (newBtn) {
      newBtn.onclick = () => {
        closeModal();
        resetPlaySession();
      };
    }
  }

  function renderSessionBlockSummary(target) {
    const acc = session.decisions
      ? Math.round((session.good / session.decisions) * 100)
      : null;
    const elapsedMs = session.startedAt ? (Date.now() - session.startedAt) : 0;
    const mins = Math.max(1, Math.round(elapsedMs / 60000));
    const handsPerHour = elapsedMs > 0
      ? Math.round(session.hands / (elapsedMs / 3600000))
      : null;
    let html = '<div class="card-box session-block-summary" style="margin-top:14px">';
    html += '<h3>Bloque de ' + target + ' manos completado</h3>';
    html += '<div class="stats-content" style="margin-bottom:0">';
    html += '<div class="stat-card"><div class="big">' + session.hands + '</div><div class="lbl">Manos</div></div>';
    html += '<div class="stat-card"><div class="big accent">' + (acc != null ? acc + '%' : '—') + '</div><div class="lbl">Acierto</div></div>';
    html += '<div class="stat-card"><div class="big">' +
      (session.hands ? fmtHandScore((session.handScoreSum || 0) / session.hands) + '<span class="hand-score-over">/10</span>' : '—') +
      '</div><div class="lbl">Nota media</div></div>';
    html += '<div class="stat-card"><div class="big net-neg">-' + fmtBB(roundSession(session.evLossBB)) + '</div><div class="lbl">EV perdido</div></div>';
    html += '<div class="stat-card"><div class="big">' + mins + ' min</div><div class="lbl">Tiempo' +
      (handsPerHour != null ? ' · ~' + handsPerHour + '/h' : '') + '</div></div>';
    html += '</div></div>';
    return html;
  }

  function openSessionBlockPopup(target) {
    const box = $('#modal-content');
    const modal = $('#modal');
    if (!box || !modal) return;
    const acc = session.decisions
      ? Math.round((session.good / session.decisions) * 100)
      : null;
    const elapsedMs = session.startedAt ? (Date.now() - session.startedAt) : 0;
    const mins = Math.max(1, Math.round(elapsedMs / 60000));
    const secs = Math.max(0, Math.round(elapsedMs / 1000) % 60);
    const net = roundSession(session.net);
    const evLost = roundSession(session.evLossBB);
    const expected = roundSession(net - evLost);
    box.innerHTML = `<div class="session-block-popup">
      <div class="session-block-popup-head">
        <h3>¡Bloque completado!</h3>
        <p class="muted-text">${target} manos · ${mins} min ${secs > 0 ? secs + ' s' : ''}</p>
      </div>
      <div class="stats-content session-block-popup-stats">
        <div class="stat-card"><div class="big">${session.hands}</div><div class="lbl">Manos</div></div>
        <div class="stat-card"><div class="big accent">${acc != null ? acc + '%' : '—'}</div><div class="lbl">Acierto</div></div>
        <div class="stat-card"><div class="big">${session.hands ? fmtHandScore((session.handScoreSum || 0) / session.hands) + '<span class="hand-score-over">/10</span>' : '—'}</div><div class="lbl">Nota media</div></div>
        <div class="stat-card"><div class="big ${net >= 0 ? 'net-pos' : 'net-neg'}">${net >= 0 ? '+' : ''}${fmtBB(net)}</div><div class="lbl">Resultado</div></div>
        <div class="stat-card"><div class="big net-neg">-${fmtBB(evLost)}</div><div class="lbl">EV perdido</div></div>
        <div class="stat-card"><div class="big ${expected >= 0 ? 'net-pos' : 'net-neg'}">${expected >= 0 ? '+' : ''}${fmtBB(expected)}</div><div class="lbl">EV esperado</div></div>
      </div>
      <div class="session-block-popup-actions">
        <button type="button" class="btn btn-primary" id="block-popup-new">Nueva sesión</button>
        <button type="button" class="btn btn-ghost" id="block-popup-continue">Seguir entrenando</button>
        <button type="button" class="btn btn-ghost" id="block-popup-close">Cerrar</button>
      </div>
    </div>`;
    modal.classList.remove('hidden');
    const close = () => closeModal();
    const closeBtn = $('#block-popup-close');
    if (closeBtn) closeBtn.onclick = close;
    const newBtn = $('#block-popup-new');
    if (newBtn) {
      newBtn.onclick = () => {
        closeModal();
        resetPlaySession();
      };
    }
    const contBtn = $('#block-popup-continue');
    if (contBtn) {
      contBtn.onclick = () => {
        closeModal();
        if (playSessionConfig) playSessionConfig.handsTarget = 0;
        session.startedAt = Date.now();
        void startNewHand();
      };
    }
  }

  function refreshSessionUI() {
    const handsTarget = playSessionConfig ? (Number(playSessionConfig.handsTarget) || 0) : 0;
    const handsLabel = handsTarget > 0 ? (session.hands + '/' + handsTarget) : String(session.hands);
    const handsEl = $('#s-hands');
    if (handsEl) handsEl.textContent = session.hands;
    const hudHands = $('#hud-hands');
    if (hudHands) hudHands.textContent = handsLabel;
    const net = roundSession(session.net);
    const evLost = roundSession(session.evLossBB);
    const expected = roundSession(net - evLost);
    const netText = (net >= 0 ? '+' : '') + fmtBB(net);
    const netCls = net >= 0 ? 'net-pos' : 'net-neg';
    const netEl = $('#s-net');
    if (netEl) {
      netEl.textContent = netText;
      netEl.className = netCls;
    }
    const hudNet = $('#hud-net');
    if (hudNet) {
      hudNet.textContent = netText;
      hudNet.className = netCls;
    }
    const evLostText = '-' + fmtBB(evLost);
    const evLostEl = $('#s-ev-lost');
    if (evLostEl) evLostEl.textContent = evLostText;
    const hudEv = $('#hud-ev-lost');
    if (hudEv) {
      hudEv.textContent = evLostText;
      hudEv.className = evLost > 0 ? 'net-neg' : 'net-pos';
    }
    const perfectEl = $('#s-ev-perfect');
    if (perfectEl) {
      perfectEl.textContent = (expected >= 0 ? '+' : '') + fmtBB(expected);
      perfectEl.className = expected >= 0 ? 'net-pos' : 'net-neg';
    }
    const acc = session.decisions ? Math.round((session.good / session.decisions) * 100) + '%' : '-';
    $('#s-acc').textContent = acc;
    const streetBox = $('#s-street-acc');
    if (streetBox) streetBox.innerHTML = renderStreetAccBars(session.byStreet);
    const sessLbl = $('#play-session-label');
    if (sessLbl) {
      if (playSessionConfig && window.PTPlayConfig) {
        let lbl = PTPlayConfig.labelFor(playSessionConfig);
        const tgt = Number(playSessionConfig.handsTarget) || 0;
        if (tgt > 0) lbl += ' · ' + session.hands + '/' + tgt;
        sessLbl.textContent = lbl;
        sessLbl.classList.remove('hidden');
      } else {
        sessLbl.classList.add('hidden');
        sessLbl.textContent = '';
      }
    }
  }

  function renderStreetAccBars(byStreet) {
    const labels = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
    return ['preflop', 'flop', 'turn', 'river'].map((st) => {
      const s = byStreet && byStreet[st];
      const pct = s && s.n ? Math.round((s.good / s.n) * 100) : null;
      return streetAccBar(labels[st], pct);
    }).join('');
  }

  function pctSafe(good, total) {
    return total ? Math.round((good / total) * 100) : null;
  }

  function statsPreferRowCharts() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 720px)').matches);
  }

  function formatBarChartVal(raw, num, suffix, isSigned) {
    if (raw == null) return '—';
    if (suffix === '%') {
      const n = Number(raw);
      if (!Number.isNaN(n) && Math.round(n) !== n) return `${n}%`;
      return `${raw}%`;
    }
    if (suffix === ' bb') return `${isSigned && num > 0 ? '+' : ''}${raw}${suffix}`;
    return String(raw);
  }

  function statsBarChartRows(title, series, field, suffix, colorVar) {
    if (!series || !series.length) return `<div class="stats-carousel-empty muted-text">Sin datos suficientes.</div>`;
    const isSigned = field === 'netBB';
    const max = Math.max(1, ...series.map((s) => Math.abs(Number(s[field]) || 0)));
    const rows = series.map((s) => {
      const raw = s[field];
      const num = Number(raw) || 0;
      const val = formatBarChartVal(raw, num, suffix, isSigned);
      const pct = raw == null ? 0 : Math.max(6, Math.round((Math.abs(num) / max) * 100));
      const signedCls = isSigned ? (num < 0 ? ' stats-bar-row-fill-neg' : ' stats-bar-row-fill-pos') : '';
      const varColor = isSigned ? (num < 0 ? '--red' : '--green') : colorVar;
      return `<div class="stats-bar-row" title="${escapeHtml(s.label)}: ${escapeHtml(val)}">
        <span class="stats-bar-row-lbl">${escapeHtml(s.label)}</span>
        <span class="stats-bar-row-track${isSigned ? ' stats-bar-row-track-signed' : ''}">
          ${isSigned ? '<span class="stats-bar-row-zero"></span>' : ''}
          <span class="stats-bar-row-fill${signedCls}" style="width:${pct}%;background:var(${varColor})"></span>
        </span>
        <span class="stats-bar-row-val">${escapeHtml(val)}</span>
      </div>`;
    }).join('');
    return `<div class="stats-carousel-chart stats-carousel-chart--rows"><h4>${escapeHtml(title)}</h4><div class="stats-bar-rows">${rows}</div></div>`;
  }

  function statsBarChart(title, series, field, suffix, colorVar) {
    if (statsPreferRowCharts()) {
      return statsBarChartRows(title, series, field, suffix, colorVar);
    }
    if (!series || !series.length) return `<div class="stats-carousel-empty muted-text">Sin datos suficientes.</div>`;
    const max = Math.max(1, ...series.map((s) => Math.abs(Number(s[field]) || 0)));
    const isSigned = field === 'netBB';
    const bars = series.map((s) => {
      const raw = s[field];
      const num = Number(raw) || 0;
      const val = raw == null ? '—' : formatBarChartVal(raw, num, suffix, isSigned);
      const h = raw == null ? 8 : Math.max(10, Math.round((Math.abs(num) / max) * 100));
      const signedCls = isSigned ? (num < 0 ? ' prog-bar-neg' : ' prog-bar-pos') : '';
      const varColor = isSigned ? (num < 0 ? '--red' : '--green') : colorVar;
      return `<div class="prog-bar-col" title="${escapeHtml(s.label)}: ${escapeHtml(val)}">
        <span class="prog-bar-val">${escapeHtml(val)}</span>
        <div class="prog-bar-track${isSigned ? ' prog-bar-track-signed' : ''}">
          ${isSigned ? '<div class="prog-bar-zero"></div>' : ''}
          <div class="prog-bar${signedCls}" style="height:${h}%;background:var(${varColor})"></div>
        </div>
        <span class="prog-bar-lbl">${escapeHtml(s.label)}</span>
      </div>`;
    }).join('');
    return `<div class="stats-carousel-chart"><h4>${escapeHtml(title)}</h4><div class="prog-bars stats-carousel-bars">${bars}</div></div>`;
  }

  function buildSessionGradeSeries(sessions) {
    return (sessions || [])
      .filter((s) => s && s.stats && s.stats.grade && s.stats.grade.score != null)
      .sort((a, b) => String(a.importedAt || a.createdAt || '').localeCompare(String(b.importedAt || b.createdAt || '')))
      .slice(-24)
      .map((s, i) => {
        const d = s.importedAt || s.createdAt;
        let label = String(i + 1);
        if (d) {
          const dt = new Date(d);
          if (!Number.isNaN(dt.getTime())) {
            label = dt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
          }
        }
        return {
          label,
          score: Number(s.stats.grade.score),
          letter: s.stats.grade.letter,
          fileName: s.fileName || ('Sesión ' + (i + 1))
        };
      });
  }

  function buildSessionHudSeries(sessions) {
    return (sessions || [])
      .filter((s) => s && s.stats && s.stats.vpipPct != null && s.stats.pfrPct != null)
      .sort((a, b) => String(a.importedAt || a.createdAt || '').localeCompare(String(b.importedAt || b.createdAt || '')))
      .slice(-24)
      .map((s, i) => {
        const d = s.importedAt || s.createdAt;
        let label = String(i + 1);
        if (d) {
          const dt = new Date(d);
          if (!Number.isNaN(dt.getTime())) {
            label = dt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
          }
        }
        return {
          label,
          vpipPct: Number(s.stats.vpipPct),
          pfrPct: Number(s.stats.pfrPct),
          fileName: s.fileName || ('Sesión ' + (i + 1))
        };
      });
  }

  function statsHudLineChart(title, series, formatHint) {
    if (!series || !series.length) {
      return '<div class="stats-carousel-empty muted-text">Importa o reabre sesiones para ver la evolución de VPIP/PFR.</div>';
    }
    const format = formatHint || '6max';
    const ideal = idealForStatsFormat(format);
    const formatLabel = formatDisplayLabel(format);
    const w = Math.max(300, series.length * 40);
    const h = 168;
    const pad = { l: 30, r: 12, t: 14, b: 30 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const yMax = 40;
    const yOf = (v) => pad.t + innerH - (Math.max(0, Math.min(yMax, v)) / yMax) * innerH;
    const xOf = (i) => pad.l + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
    const ptsV = series.map((s, i) => ({ x: xOf(i), y: yOf(s.vpipPct), s }));
    const ptsP = series.map((s, i) => ({ x: xOf(i), y: yOf(s.pfrPct), s }));
    const polyV = ptsV.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    const polyP = ptsP.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    const grid = [0, 10, 20, 30, 40].map((v) => {
      const y = yOf(v);
      return `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="var(--border)" stroke-dasharray="2 4" opacity="0.45"/>
        <text x="${pad.l - 6}" y="${y + 3}" text-anchor="end" font-size="8" fill="var(--muted)">${v}</text>`;
    }).join('');
    const dotsV = ptsV.map((p) =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="var(--accent)" stroke="var(--bg)" stroke-width="1">
        <title>${escapeHtml(p.s.fileName)} · VPIP ${p.s.vpipPct}%</title>
      </circle>`
    ).join('');
    const dotsP = ptsP.map((p) =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="var(--gold)" stroke="var(--bg)" stroke-width="1">
        <title>${escapeHtml(p.s.fileName)} · PFR ${p.s.pfrPct}%</title>
      </circle>`
    ).join('');
    const step = Math.max(1, Math.ceil(series.length / 8));
    const labels = ptsV.map((p, i) => (i % step === 0 || i === series.length - 1)
      ? `<text x="${p.x.toFixed(1)}" y="${h - 8}" text-anchor="middle" font-size="9" fill="var(--muted)">${escapeHtml(p.s.label)}</text>`
      : '').join('');
    return `<div class="stats-carousel-chart stats-grade-chart"><h4>${escapeHtml(title)}</h4>
      <div class="stats-hud-legend muted-text"><span class="stats-hud-leg-vpip">VPIP</span> · <span class="stats-hud-leg-pfr">PFR</span> · referencia ${escapeHtml(formatLabel)} ~${ideal.vpipMin || 20}–${ideal.vpipMax || 28}% / ${ideal.pfrMin || 15}–${ideal.pfrMax || 24}%</div>
      <svg viewBox="0 0 ${w} ${h}" class="stats-grade-svg" role="img" aria-label="${escapeHtml(title)}">
        ${grid}
        <line x1="${pad.l}" y1="${pad.t + innerH}" x2="${w - pad.r}" y2="${pad.t + innerH}" stroke="var(--border)"/>
        <polyline points="${polyV}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
        <polyline points="${polyP}" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linejoin="round"/>
        ${dotsV}${dotsP}${labels}
      </svg></div>`;
  }

  function fmtHudPct(v) {
    if (v == null || Number.isNaN(Number(v))) return '—';
    const n = Number(v);
    return (Math.round(n) === n ? String(n) : String(n)) + '%';
  }

  function fmtHudAf(v) {
    if (v == null || Number.isNaN(Number(v))) return '—';
    return String(Number(v));
  }

  function sampleTrustBadge(sample) {
    if (!sample) return '';
    const lvl = sample.level || 'low';
    const cls = lvl === 'high' || lvl === 'good' ? 'hud-trust-good'
      : (lvl === 'ok' ? 'hud-trust-ok' : 'hud-trust-low');
    return `<span class="hud-trust-badge ${cls}" title="n=${sample.n}">${escapeHtml(sample.label || '')}</span>`;
  }

  function resolveStatsFormat(st) {
    if (!st) return '6max';
    if (st.formatKey && window.Importer && Importer.styleIdealForFormat) {
      // Preferir clave canónica si hay ideales asociados
      return st.formatKey;
    }
    return st.format || (st.style && st.style.format) || '6max';
  }

  function formatDisplayLabel(format) {
    return ({
      '6max': 'cash 6-max',
      cash6: 'cash 6-max',
      '9max': 'cash 9-max / full ring',
      cash9: 'cash 9-max / full ring',
      mtt: 'torneo (MTT)',
      mtt6: 'torneo (MTT)',
      mtt9: 'torneo full ring',
      mtt3: 'torneo corto',
      spin: 'Spin & Go',
      spin3: 'Spin & Go',
      shorthand: 'short-handed',
      cash2: 'heads-up',
      cash3: 'cash 3-max'
    })[format] || 'cash 6-max';
  }

  function gameKindBadge(kind) {
    const labels = { cash: 'Cash', spin: 'Spin', mtt: 'MTT', sng: 'SNG', unknown: '?' };
    const k = kind || 'cash';
    return '<span class="badge session-kind session-kind-' + escapeHtml(k) + '">' + escapeHtml(labels[k] || k) + '</span>';
  }

  function tableMaxBadge(tableMax) {
    if (!tableMax) return '';
    return '<span class="badge session-tablemax">Max-' + escapeHtml(String(tableMax)) + '</span>';
  }

  function sessionContextBadgesHtml(session) {
    const ctx = (session && session.context) || {};
    const st = (session && session.stats) || {};
    const kind = ctx.gameKind || st.gameKind || 'cash';
    const tmax = ctx.tableMax != null ? ctx.tableMax : st.tableMax;
    const stakes = ctx.stakesLabel || st.stakesLabel || '';
    let html = gameKindBadge(kind) + ' ' + tableMaxBadge(tmax);
    if (stakes) html += ' <span class="badge session-stakes">' + escapeHtml(stakes) + '</span>';
    if (st.stakeTier) html += ' <span class="badge session-tier">' + escapeHtml(st.stakeTier) + '</span>';
    if (st.mttPhase && (kind === 'mtt' || kind === 'spin' || kind === 'sng')) {
      html += ' <span class="badge session-phase">' + escapeHtml(st.mttPhase) + '</span>';
    }
    const unsupportedN = session && session.hands
      ? session.hands.filter((h) => h && h.analysisUnsupported).length
      : (st.unsupportedHands || 0);
    if (unsupportedN) {
      html += ' <span class="badge session-unsupported" title="Manos importadas sin análisis GTO">Sin GTO ×'
        + unsupportedN + '</span>';
    }
    return html;
  }

  function sessionBucket(session) {
    const kind = (session && session.context && session.context.gameKind)
      || (session && session.stats && session.stats.gameKind)
      || 'cash';
    if (kind === 'spin') return 'spin';
    if (kind === 'mtt' || kind === 'sng') return 'mtt';
    return 'cash';
  }

  function sessionsTabHint(tab) {
    if (tab === 'spin') return 'Spins / Spin & Go / Jackpot SNG.';
    if (tab === 'mtt') return 'Torneos MTT y Sit & Go (no spins).';
    return 'Sesiones de cash NL Hold\'em (y mesas cortas).';
  }

  function importDiscardSummaryHtml(session) {
    const reasons = (session && (session.nDiscardedByReason || (session.context && session.context.nDiscardedByReason))) || {};
    const mix = (session && session.context && session.context.mix) || {};
    const parts = [];
    if (mix.cash) parts.push(mix.cash + ' cash');
    if (mix.spin) parts.push(mix.spin + ' spin');
    if (mix.mtt) parts.push(mix.mtt + ' MTT');
    if (mix.sng) parts.push(mix.sng + ' SNG');
    const dropped = [];
    Object.keys(reasons).forEach((k) => {
      if (reasons[k] > 0 && k !== 'noHeroCards') dropped.push(reasons[k] + ' ' + k);
    });
    if (session && session.nDiscarded) dropped.push(session.nDiscarded + ' sin cartas héroe');
    let html = parts.length ? ('Manos: ' + parts.join(', ')) : '';
    if (dropped.length) html += (html ? ' · ' : '') + 'Descartadas: ' + dropped.join(', ');
    return html;
  }

  function idealForStatsFormat(format) {
    if (window.Importer && Importer.styleIdealForFormat) return Importer.styleIdealForFormat(format);
    return (window.Importer && Importer.STYLE_IDEAL) || {};
  }

  function bandText(min, max, unit) {
    if (min == null || max == null) return '';
    return '~' + min + '–' + max + (unit == null ? '%' : unit);
  }

  /** Glosario de métricas para jugadores que no conocen el HUD. Ideales según formato de la sesión. */
  function buildMetricExplain(key, format) {
    const fmt = format || '6max';
    const I = idealForStatsFormat(fmt);
    const fmtLabel = formatDisplayLabel(fmt);
    const catalog = {
      vpip: {
        title: 'VPIP',
        fullName: 'Voluntarily Put money In Pot',
        what: 'Porcentaje de manos en las que entras al bote de forma voluntaria preflop (limp, call o raise). No cuenta pagar la ciega grande ni hacer check en BB.',
        how: 'Si juegas 25 de cada 100 manos, tu VPIP es 25%.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.vpipMin, I.vpipMax) + '.',
        tip: 'Muy bajo = demasiado tight (dejas valor). Muy alto = demasiadas manos débiles, sobre todo out of position.'
      },
      pfr: {
        title: 'PFR',
        fullName: 'Preflop Raise',
        what: 'Porcentaje de manos en las que subes (raise) al menos una vez preflop. Mide agresión preflop, no solo “jugar manos”.',
        how: 'Si abres o 3-beteas en 18 de cada 100 manos, tu PFR es 18%.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.pfrMin, I.pfrMax) + '.',
        tip: 'Un PFR mucho menor que el VPIP indica muchos limps/calls (pasivo). Idealmente el hueco VPIP−PFR es pequeño.'
      },
      gap: {
        title: 'Hueco VPIP−PFR',
        fullName: 'Diferencia VPIP menos PFR',
        what: 'Cuántos puntos separan las manos que juegas de las que subes. Resume limps y flats preflop.',
        how: 'VPIP 28% y PFR 18% → hueco de 10 puntos (bastante pasivo).',
        ideal: 'Típico en ' + fmtLabel + ': ' + (I.gapMin != null ? (I.gapMin + '–' + I.gapMax + ' pts') : '3–8 pts') + '.',
        tip: 'Hueco >10 suele ser calling-station: value-bea más fino y farolea menos.'
      },
      threeBet: {
        title: '3-Bet',
        fullName: 'Porcentaje de re-raise preflop',
        what: 'De las veces que alguien abre (raise) delante y tú puedes responder, con qué frecuencia vuelves a subir (3-bet), incluido squeeze.',
        how: 'Si enfrentas 50 opens y 3-beteas 4 veces, tu 3-Bet es 8%.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.threeBetMin, I.threeBetMax) + '.',
        tip: 'Muy bajo = solo premiuns. Muy alto = 3-bets light excesivos sin plan postflop.'
      },
      foldToThreeBet: {
        title: 'Fold to 3-Bet',
        fullName: 'Foldeo ante un 3-bet',
        what: 'Cuando tú abriste y te 3-betean, con qué frecuencia tiras la mano en lugar de call o 4-bet.',
        how: 'Si te 3-betean 20 veces y foldeas 12, es 60%.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.foldToThreeBetMin, I.foldToThreeBetMax) + '.',
        tip: 'Muy alto = overfold (te pueden 3-betear light). Muy bajo = defiendes de más OOP.'
      },
      fourBet: {
        title: '4-Bet',
        fullName: 'Porcentaje de 4-bet preflop',
        what: 'Cuando enfrentas un 3-bet (tras haber abierto o 3-beteado), con qué frecuencia vuelves a subir (4-bet).',
        how: 'Si te 3-betean 40 veces y 4-beteas 2, ≈ 5%.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.fourBetMin, I.fourBetMax) + '.',
        tip: 'Mezcla value polarizado + blockers; evita 4-bet light sin plan.'
      },
      limp: {
        title: 'Limp',
        fullName: 'Limp open (entrar pagando sin raise previo)',
        what: 'Cuando nadie ha subido y no hay limpers, con qué frecuencia limpeas (igualas la ciega grande sin subir) en lugar de raise/fold.',
        how: 'Oportunidades = folded-to sin limpers; hits = tus limps.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.limpMin, I.limpMax) + '.',
        tip: 'En mesas de regs, limpear mucho suele ser leak: mejor raise or fold.'
      },
      overlimp: {
        title: 'Overlimp',
        fullName: 'Pagar detrás de limpers',
        what: 'Con limpers por delante, con qué frecuencia pagas también (overlimp) en vez de aislar o foldear.',
        how: 'Oportunidades = spots con ≥1 limper y sin raise; hits = tus calls.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.overlimpMin, I.overlimpMax) + '.',
        tip: 'Overlimp crea pots multiway pasivos; aísla o foldea.'
      },
      isoLimp: {
        title: 'Iso-limp',
        fullName: 'Isolation raise vs limpers',
        what: 'Con limpers por delante, con qué frecuencia aislas (raise) en lugar de call/fold.',
        how: 'Hits = tus raises vs limpers / oportunidades vs limpers.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.isoLimpMin, I.isoLimpMax) + '.',
        tip: 'Iso demasiado wide OOP pierde; demasiado bajo deja valor vs limpers.'
      },
      delayedCbet: {
        title: 'Delayed C-Bet',
        fullName: 'Continuation bet retrasada (turn tras check flop)',
        what: 'Si fuiste agresora preflop, checkeaste flop y el turn llega checked-to-you, con qué frecuencia apuestas el turn (delayed c-bet / probe).',
        how: 'No cuenta barrels tras c-bet flop; solo el lead en turn tras check flop.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.delayedCbetMin, I.delayedCbetMax) + '.',
        tip: 'Útil en boards que mejoran tu rango en turn; evita delayed automático.'
      },
      steal: {
        title: 'Steal',
        fullName: 'Attempt to Steal (robo de ciegas)',
        what: 'Con qué frecuencia abres el bote desde CO, BTN o SB cuando todo el mundo ha foldeado hasta ti.',
        how: 'Si te llega folded-to 40 veces en late y abres 14, steal ≈ 35%.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.stealMin, I.stealMax) + '.',
        tip: 'Poco steal deja dinero en la mesa; demasiado steal te castigan blinds sticky.'
      },
      foldToSteal: {
        title: 'Fold to Steal',
        fullName: 'Foldeo ante robo de ciegas',
        what: 'En BB (o SB vs BTN) frente a un open late, con qué frecuencia foldeas.',
        how: 'Si te roban 30 veces y foldeas 20, es ≈ 67%.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.foldToStealMin, I.foldToStealMax) + '.',
        tip: 'Overfold = target de steals. Defender de más con basura también pierde EV.'
      },
      squeeze: {
        title: 'Squeeze',
        fullName: 'Squeeze (3-bet con callers detrás del open)',
        what: 'Cuando hay open + al menos un call, con qué frecuencia 3-beteas (squeeze) en lugar de call/fold.',
        how: 'Oportunidades = spots open+call; hits = tus squeezes.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.squeezeMin, I.squeezeMax) + '.',
        tip: 'Necesita muestra grande. Úsalo con blockers y fold equity.'
      },
      cbetFlop: {
        title: 'C-Bet flop',
        fullName: 'Continuation bet en el flop',
        what: 'Si fuiste el último en subir preflop (agresora), con qué frecuencia apuestas el flop cuando aún no te han apostado.',
        how: 'Como PFR en flop, si apuestas 6 de 10 oportunidades, C-Bet = 60%.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.cbetFlopMin, I.cbetFlopMax) + '.',
        tip: 'Casi siempre c-betear es predecible; casi nunca c-betear regala pot.'
      },
      cbetTurn: {
        title: 'C-Bet turn',
        fullName: 'Continuation bet en el turn',
        what: 'Tras haber c-beteado el flop, con qué frecuencia vuelves a apostar el turn cuando te dejan (segundo barrel).',
        how: 'Solo cuenta si c-beteaste flop y llegas al turn sin haber enfrentado ya una apuesta.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.cbetTurnMin, I.cbetTurnMax) + '. Interpreta con muestra suficiente.',
        tip: 'Barrela más en boards que favorecen tu rango; checkea más en boards malos.'
      },
      cbetRiver: {
        title: 'C-Bet river',
        fullName: 'Continuation bet en el river',
        what: 'Tras barrelar turn, con qué frecuencia apuestas de nuevo en river (tercer barrel).',
        how: 'Requiere haber c-beteado turn; la muestra suele ser pequeña.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.cbetRiverMin, I.cbetRiverMax) + '. Usa con cautela si n es bajo.',
        tip: 'Mezcla value fino y bluffs con blockers; evita overbarrel sin ventaja de nuts.'
      },
      foldToCbet: {
        title: 'Fold to C-Bet',
        fullName: 'Foldeo ante continuation bet (flop)',
        what: 'Cuando el agresor preflop apuesta el flop, con qué frecuencia foldeas.',
        how: 'Si enfrentas 40 c-bets y foldeas 22, ≈ 55%.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.foldToCbetFlopMin, I.foldToCbetFlopMax) + '.',
        tip: 'Overfold = te farolean barato. Pegajoso = pierdes vs value bets.'
      },
      af: {
        title: 'AF',
        fullName: 'Aggression Factor',
        what: 'Relación postflop entre acciones agresivas (bets+raises) y calls. No cuenta checks en el numerador clásico.',
        how: 'AF = (bets + raises) / calls. Ejemplo: 20 bets y 10 calls → AF 2.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.afMin, I.afMax, '') + '.',
        tip: 'AF bajo = pasivo (mucho call). AF muy alto = maniac / demasiados bluffs.'
      },
      afq: {
        title: 'AFq',
        fullName: 'Aggression Frequency',
        what: 'Porcentaje de tus acciones postflop que son agresivas (bet/raise) sobre el total (bet+raise+call+check).',
        how: 'Si de 100 acciones 40 son bet/raise, AFq = 40%.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.afqMin, I.afqMax) + '.',
        tip: 'Complementa al AF: mide frecuencia, no solo ratio vs calls.'
      },
      wtsd: {
        title: 'WTSD',
        fullName: 'Went To Showdown',
        what: 'De las manos en las que viste el flop, con qué frecuencia llegas a showdown (no foldeas antes).',
        how: 'Si viste 50 flops y 15 terminan en showdown, WTSD = 30%.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.wtsdMin, I.wtsdMax) + '.',
        tip: 'Alto = calling station en calles tardías. Bajo = overfold con equity.'
      },
      wsd: {
        title: 'W$SD',
        fullName: 'Won Money at Showdown',
        what: 'Cuando llegas a showdown, con qué frecuencia ganas el bote.',
        how: 'Si vas a SD 20 veces y ganas 11, W$SD = 55%.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.wsdMin, I.wsdMax) + '.',
        tip: 'Bajo sugiere peores calls o poco value. Alto: puedes value-betear más thin.'
      },
      wwsf: {
        title: 'WWSF',
        fullName: 'Won When Saw Flop',
        what: 'De las manos en las que viste el flop, con qué frecuencia ganas el bote (foldeando al rival o en showdown).',
        how: 'Ganar = resultado positivo en bb en esa mano tras ver flop.',
        ideal: 'Referencia en ' + fmtLabel + ': ' + bandText(I.wwsfMin, I.wwsfMax) + '.',
        tip: 'Resume agresividad y continuidad postflop de forma simple.'
      },
      bbPer100: {
        title: 'bb/100',
        fullName: 'Big blinds ganadas por 100 manos',
        what: 'Tu resultado real normalizado: (bb netas / manos) × 100. Es la métrica clásica de winrate.',
        how: 'Si ganas +40 bb en 200 manos, bb/100 = +20.',
        ideal: 'No hay “ideal GTO” fijo: depende de stakes, rake y edge. Con pocas manos la varianza es enorme.',
        tip: 'Con menos de ~20 000 manos interprétalo con mucha cautela.'
      },
      accuracy: {
        title: 'Acierto global',
        fullName: 'Decisiones óptimas o aceptables',
        what: 'Porcentaje de tus decisiones de la sesión que la app marca como óptimas o aceptables frente a la guía GTO.',
        how: 'Si 80 de 100 decisiones son buenas, acierto = 80%.',
        ideal: 'Cuanto más alto, mejor. Úsalo junto al EV perdido, no solo como nota.',
        tip: 'Puedes tener buen acierto y aun así perder EV en pocos errores graves.'
      },
      evLoss: {
        title: 'EV perdido',
        fullName: 'Expected Value perdido por fugas',
        what: 'Suma (en bb) de lo que te costaron las decisiones peores que la mejor línea estimada.',
        how: 'Cada error suma ΔEV; al final ves el total de la sesión.',
        ideal: 'Ideal → cerca de 0. Prioriza spots con más EV perdido.',
        tip: 'Es más útil que el resultado real para estudiar: mide calidad de decisión, no suerte.'
      },
      netBB: {
        title: 'Resultado real',
        fullName: 'bb ganadas o perdidas en la sesión',
        what: 'Lo que realmente ganaste o perdiste en fichas (normalizado a big blinds), incluyendo varianza.',
        how: 'Suma de heroNetBB de cada mano.',
        ideal: 'A corto plazo no mide skill. Compáralo con EV esperado / fugas.',
        tip: 'Puedes jugar bien y perder, o jugar mal y ganar: por eso existe el desglose fugas vs varianza.'
      },
      nHands: {
        title: 'Manos jugadas',
        fullName: 'Tamaño de muestra de la sesión',
        what: 'Número de manos importadas en las que participaste (con cartas).',
        how: 'Cada mano del historial cuenta 1.',
        ideal: 'Más manos → métricas HUD más fiables (sobre todo 3-bet, WTSD, etc.).',
        tip: 'Mira las insignias de muestra en cada métrica antes de cambiar tu juego.'
      },
      sessions: {
        title: 'Sesiones',
        fullName: 'Sesiones importadas acumuladas',
        what: 'Cuántas sesiones de historial tienes guardadas en el agregado.',
        how: 'Cada importación con stats cuenta como una sesión.',
        ideal: 'Más sesiones suavizan la varianza del agregado.',
        tip: 'Reabre sesiones antiguas si faltan métricas nuevas del HUD.'
      }
    };
    const info = catalog[key];
    if (!info) return null;
    return Object.assign({ key: key, format: fmt, formatLabel: fmtLabel }, info);
  }

  function openMetricExplain(key, format) {
    const info = buildMetricExplain(key, format);
    if (!info) return;
    const box = $('#modal-content');
    if (!box) return;
    box.innerHTML = `<div class="metric-explain">
      <div class="metric-explain-head">
        <h3>${escapeHtml(info.title)}</h3>
        <button type="button" class="btn secondary btn-sm" data-close-metric-explain>Cerrar</button>
      </div>
      <p class="metric-explain-fullname muted-text">${escapeHtml(info.fullName)}</p>
      <p class="metric-explain-format"><span class="badge grade-C">${escapeHtml(info.formatLabel)}</span>
        <span class="muted-text">Ideales según el formato detectado en tus manos.</span></p>
      <h4>Qué mide</h4>
      <p>${escapeHtml(info.what)}</p>
      <h4>Cómo se calcula</h4>
      <p>${escapeHtml(info.how)}</p>
      <h4>Rango de referencia</h4>
      <p>${escapeHtml(info.ideal)}</p>
      <h4>Cómo interpretarlo</h4>
      <p>${escapeHtml(info.tip)}</p>
      <p class="muted-text stats-section-note">Pulsa cualquier cuadrito de métrica para volver a abrir esta guía.</p>
    </div>`;
    const modal = $('#modal');
    if (modal) modal.classList.remove('hidden');
    const closeBtn = box.querySelector('[data-close-metric-explain]');
    if (closeBtn) closeBtn.onclick = () => closeModal();
  }

  function bindMetricExplainClicks(root) {
    if (!root) return;
    root.querySelectorAll('[data-metric-key]').forEach((el) => {
      if (el._ptMetricBound) return;
      el._ptMetricBound = true;
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-style-drill], a, button:not([data-metric-key])')) return;
        const key = el.getAttribute('data-metric-key');
        const format = el.getAttribute('data-metric-format')
          || (root.getAttribute && root.getAttribute('data-style-format'))
          || '6max';
        if (key) openMetricExplain(key, format);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        el.click();
      });
    });
  }

  function explainableStatCard(metricKey, label, valueHtml, format, extraClass, sample, idealHint) {
    const fmt = format || '6max';
    return `<div class="stat-card style-metric-card metric-explainable"
      role="button" tabindex="0"
      data-metric-key="${escapeHtml(metricKey)}"
      data-metric-format="${escapeHtml(fmt)}"
      title="Pulsa para ver qué mide ${escapeHtml(label)}">
      <div class="big ${extraClass || ''}">${valueHtml}</div>
      <div class="lbl">${escapeHtml(label)}${sample ? ' ' + sampleTrustBadge(sample) : ''}
        <span class="metric-info-dot" aria-hidden="true">i</span>
      </div>
      ${idealHint ? `<div class="style-ideal-hint muted-text">${escapeHtml(idealHint)}</div>` : ''}
    </div>`;
  }

  function styleMetricCard(label, valueHtml, sample, idealHint, metricKey, format) {
    if (metricKey) return explainableStatCard(metricKey, label, valueHtml, format, '', sample, idealHint);
    return `<div class="stat-card style-metric-card">
      <div class="big">${valueHtml}</div>
      <div class="lbl">${escapeHtml(label)}${sample ? ' ' + sampleTrustBadge(sample) : ''}</div>
      ${idealHint ? `<div class="style-ideal-hint muted-text">${escapeHtml(idealHint)}</div>` : ''}
    </div>`;
  }

  function styleIdealBar(label, value, min, max, sample) {
    if (value == null || min == null || max == null) return '';
    const span = Math.max(max * 1.4, max + 10, 40);
    const vPct = Math.max(0, Math.min(100, (Number(value) / span) * 100));
    const minPct = Math.max(0, Math.min(100, (min / span) * 100));
    const maxPct = Math.max(0, Math.min(100, (max / span) * 100));
    const width = Math.max(2, maxPct - minPct);
    return `<div class="style-bar-row">
      <div class="style-bar-label">${escapeHtml(label)} <strong>${escapeHtml(String(value))}${label === 'AF' ? '' : '%'}</strong> ${sample ? sampleTrustBadge(sample) : ''}</div>
      <div class="style-bar-track" aria-hidden="true">
        <span class="style-bar-ideal" style="left:${minPct}%;width:${width}%"></span>
        <span class="style-bar-value" style="left:${vPct}%"></span>
      </div>
      <div class="style-bar-scale muted-text">ideal ${min}–${max}${label === 'AF' ? '' : '%'}</div>
    </div>`;
  }

  function byPositionTableHtml(byPos) {
    if (!byPos || !Object.keys(byPos).length) return '';
    const order = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    const keys = order.filter((p) => byPos[p]).concat(Object.keys(byPos).filter((p) => order.indexOf(p) < 0));
    if (!keys.length) return '';
    const rows = keys.map((p) => {
      const b = byPos[p];
      return `<tr>
        <td>${escapeHtml(p)}</td>
        <td>${b.hands || 0}</td>
        <td>${fmtHudPct(b.vpipPct)}</td>
        <td>${fmtHudPct(b.pfrPct)}</td>
        <td>${fmtHudPct(b.threeBetPct)}</td>
        <td>${fmtHudPct(b.stealPct)}</td>
      </tr>`;
    }).join('');
    return `<div class="style-bypos" style="margin-top:14px">
      <h4 class="muted-text" style="margin:0 0 8px">Por posición</h4>
      <div class="table-wrap"><table class="style-pos-table">
        <thead><tr><th>Pos</th><th>Manos</th><th>VPIP</th><th>PFR</th><th>3-Bet</th><th>Steal</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>`;
  }

  function styleDrillsHtml(assess) {
    const drills = (assess && assess.drills) || [];
    if (!drills.length) return '';
    const btns = drills.map((d, i) =>
      `<button type="button" class="btn secondary style-drill-btn" data-style-drill="${i}">${escapeHtml(d.label)}</button>`
    ).join(' ');
    return `<div class="style-drills" style="margin-top:12px" data-style-drills="${encodeURIComponent(JSON.stringify(drills))}">
      <h4 class="muted-text" style="margin:0 0 8px">Entrenar fugas de estilo</h4>
      <div class="style-drill-actions">${btns}</div>
    </div>`;
  }

  function bindStyleDrillButtons(root) {
    if (!root) return;
    root.querySelectorAll('[data-style-drill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const host = btn.closest('[data-style-drills]');
        let drills = [];
        try {
          drills = JSON.parse(decodeURIComponent(host.getAttribute('data-style-drills') || '%5B%5D'));
        } catch (e) { drills = []; }
        const idx = Number(btn.getAttribute('data-style-drill'));
        const d = drills[idx];
        if (!d || typeof window.startGuidedTraining !== 'function') return;
        const gt = d.gameType
          || (window.Importer && Importer.formatKeyToRangeGameType
            ? Importer.formatKeyToRangeGameType(resolveStatsFormat(currentSession && currentSession.stats))
            : null);
        const Tax = window.PTFormatTaxonomy;
        const gtFinal = gt || d.gameType || 'cash6';
        window.startGuidedTraining({
          scenario: d.scenario,
          practiceStreet: d.practiceStreet || 'preflop',
          practiceIntent: d.practiceIntent || 'mixed',
          handRange: d.handRange || 'random',
          villainLevel: d.villainLevel || 'pro',
          liveAdvisor: d.liveAdvisor !== false,
          formatHub: d.formatHub || (Tax ? Tax.hubFromGameType(gtFinal) : undefined),
          gameType: gtFinal
        });
      });
    });
  }

  function sessionStyleProfileHtml(st) {
    const format = resolveStatsFormat(st);
    const ideal = st.styleIdeal || (st.styleAssess && st.styleAssess.ideal)
      || idealForStatsFormat(format);
    const style = st.style || st;
    const assess = st.styleAssess || (window.Importer && Importer.assessStyleStats
      ? Importer.assessStyleStats(Object.assign({}, style, { formatKey: format }), ideal)
      : null);
    const sample = (style && style.sample) || {};
    const formatLabel = formatDisplayLabel(format);
    const cards = [
      styleMetricCard('3-Bet', fmtHudPct(st.threeBetPct != null ? st.threeBetPct : style.threeBetPct), sample.threeBet,
        ideal.threeBetMin != null ? `ideal ${ideal.threeBetMin}–${ideal.threeBetMax}%` : '', 'threeBet', format),
      styleMetricCard('Fold to 3-Bet', fmtHudPct(st.foldToThreeBetPct != null ? st.foldToThreeBetPct : style.foldToThreeBetPct), sample.foldToThreeBet,
        ideal.foldToThreeBetMin != null ? `ideal ${ideal.foldToThreeBetMin}–${ideal.foldToThreeBetMax}%` : '', 'foldToThreeBet', format),
      styleMetricCard('4-Bet', fmtHudPct(st.fourBetPct != null ? st.fourBetPct : style.fourBetPct), sample.fourBet,
        ideal.fourBetMin != null ? `ideal ${ideal.fourBetMin}–${ideal.fourBetMax}%` : '', 'fourBet', format),
      styleMetricCard('Limp', fmtHudPct(st.limpPct != null ? st.limpPct : style.limpPct), sample.limp,
        ideal.limpMin != null ? `ideal ${ideal.limpMin}–${ideal.limpMax}%` : '', 'limp', format),
      styleMetricCard('Overlimp', fmtHudPct(st.overlimpPct != null ? st.overlimpPct : style.overlimpPct), sample.overlimp,
        ideal.overlimpMin != null ? `ideal ${ideal.overlimpMin}–${ideal.overlimpMax}%` : '', 'overlimp', format),
      styleMetricCard('Iso-limp', fmtHudPct(st.isoLimpPct != null ? st.isoLimpPct : style.isoLimpPct), sample.isoLimp,
        ideal.isoLimpMin != null ? `ideal ${ideal.isoLimpMin}–${ideal.isoLimpMax}%` : '', 'isoLimp', format),
      styleMetricCard('Steal', fmtHudPct(st.stealPct != null ? st.stealPct : style.stealPct), sample.steal,
        ideal.stealMin != null ? `ideal ${ideal.stealMin}–${ideal.stealMax}%` : '', 'steal', format),
      styleMetricCard('Fold to Steal', fmtHudPct(st.foldToStealPct != null ? st.foldToStealPct : style.foldToStealPct), sample.foldToSteal,
        ideal.foldToStealMin != null ? `ideal ${ideal.foldToStealMin}–${ideal.foldToStealMax}%` : '', 'foldToSteal', format),
      styleMetricCard('Squeeze', fmtHudPct(st.squeezePct != null ? st.squeezePct : style.squeezePct), sample.squeeze,
        ideal.squeezeMin != null ? `ideal ${ideal.squeezeMin}–${ideal.squeezeMax}%` : '', 'squeeze', format),
      styleMetricCard('C-Bet flop', fmtHudPct(st.cbetFlopPct != null ? st.cbetFlopPct : style.cbetFlopPct), sample.cbetFlop,
        ideal.cbetFlopMin != null ? `ideal ${ideal.cbetFlopMin}–${ideal.cbetFlopMax}%` : '', 'cbetFlop', format),
      styleMetricCard('C-Bet turn', fmtHudPct(st.cbetTurnPct != null ? st.cbetTurnPct : style.cbetTurnPct), sample.cbetTurn,
        ideal.cbetTurnMin != null ? `ideal ${ideal.cbetTurnMin}–${ideal.cbetTurnMax}%` : '', 'cbetTurn', format),
      styleMetricCard('Delayed C-Bet', fmtHudPct(st.delayedCbetPct != null ? st.delayedCbetPct : style.delayedCbetPct), sample.delayedCbet,
        ideal.delayedCbetMin != null ? `ideal ${ideal.delayedCbetMin}–${ideal.delayedCbetMax}%` : '', 'delayedCbet', format),
      styleMetricCard('C-Bet river', fmtHudPct(st.cbetRiverPct != null ? st.cbetRiverPct : style.cbetRiverPct), sample.cbetRiver,
        ideal.cbetRiverMin != null ? `ideal ${ideal.cbetRiverMin}–${ideal.cbetRiverMax}%` : '', 'cbetRiver', format),
      styleMetricCard('Fold to C-Bet', fmtHudPct(st.foldToCbetFlopPct != null ? st.foldToCbetFlopPct : style.foldToCbetFlopPct), sample.foldToCbetFlop,
        ideal.foldToCbetFlopMin != null ? `ideal ${ideal.foldToCbetFlopMin}–${ideal.foldToCbetFlopMax}%` : '', 'foldToCbet', format),
      styleMetricCard('AF', fmtHudAf(st.af != null ? st.af : style.af), sample.af,
        ideal.afMin != null ? `ideal ${ideal.afMin}–${ideal.afMax}` : '', 'af', format),
      styleMetricCard('AFq', fmtHudPct(st.afq != null ? st.afq : style.afq), sample.af,
        ideal.afqMin != null ? `ideal ${ideal.afqMin}–${ideal.afqMax}%` : '', 'afq', format),
      styleMetricCard('WTSD', fmtHudPct(st.wtsdPct != null ? st.wtsdPct : style.wtsdPct), sample.wtsd,
        ideal.wtsdMin != null ? `ideal ${ideal.wtsdMin}–${ideal.wtsdMax}%` : '', 'wtsd', format),
      styleMetricCard('W$SD', fmtHudPct(st.wsdPct != null ? st.wsdPct : style.wsdPct), sample.wsd,
        ideal.wsdMin != null ? `ideal ${ideal.wsdMin}–${ideal.wsdMax}%` : '', 'wsd', format),
      styleMetricCard('WWSF', fmtHudPct(st.wwsfPct != null ? st.wwsfPct : style.wwsfPct), sample.wwsf,
        ideal.wwsfMin != null ? `ideal ${ideal.wwsfMin}–${ideal.wwsfMax}%` : '', 'wwsf', format),
      styleMetricCard('bb/100', fmtHudAf(st.bbPer100 != null ? st.bbPer100 : style.bbPer100), sample.vpip, 'resultado / 100 manos', 'bbPer100', format)
    ].join('');

    const bars = [
      styleIdealBar('VPIP', st.vpipPct != null ? st.vpipPct : style.vpipPct, ideal.vpipMin, ideal.vpipMax, sample.vpip),
      styleIdealBar('PFR', st.pfrPct != null ? st.pfrPct : style.pfrPct, ideal.pfrMin, ideal.pfrMax, sample.pfr),
      styleIdealBar('3-Bet', st.threeBetPct != null ? st.threeBetPct : style.threeBetPct, ideal.threeBetMin, ideal.threeBetMax, sample.threeBet),
      styleIdealBar('C-Bet flop', st.cbetFlopPct != null ? st.cbetFlopPct : style.cbetFlopPct, ideal.cbetFlopMin, ideal.cbetFlopMax, sample.cbetFlop),
      styleIdealBar('AF', st.af != null ? st.af : style.af, ideal.afMin, ideal.afMax, sample.af),
      styleIdealBar('WTSD', st.wtsdPct != null ? st.wtsdPct : style.wtsdPct, ideal.wtsdMin, ideal.wtsdMax, sample.wtsd)
    ].join('');

    const lines = (assess && assess.lines) ? assess.lines.filter((l) => l.text).map((l) => {
      const cls = l.status === 'ok' ? 'style-line-ok'
        : (l.status === 'low_sample' || l.status === 'unknown' ? 'style-line-soft' : 'style-line-warn');
      const badge = sampleTrustBadge(l.sample);
      return `<li class="${cls}"><span class="style-line-text">${escapeHtml(l.text)}</span> ${badge}</li>`;
    }).join('') : '';

    const statusCls = !assess ? 'hud-unknown'
      : (assess.status === 'ok' ? 'hud-ok' : (assess.status === 'low_sample' || assess.status === 'unknown' ? 'hud-unknown' : 'hud-warn'));
    const label = assess ? assess.label : 'Perfil de estilo';
    const cbetSplit = (st.cbetFlopIpPct != null || st.cbetFlopOopPct != null)
      ? `<p class="muted-text stats-section-note" style="margin-top:8px">C-Bet IP ${fmtHudPct(st.cbetFlopIpPct)} · OOP ${fmtHudPct(st.cbetFlopOopPct)} · Turn ${fmtHudPct(st.cbetTurnPct)} · Delayed ${fmtHudPct(st.delayedCbetPct != null ? st.delayedCbetPct : style.delayedCbetPct)} · River ${fmtHudPct(st.cbetRiverPct)}</p>`
      : '';
    const bbNote = (st.bbPer100Note || style.bbPer100Note)
      ? `<p class="muted-text stats-section-note">${escapeHtml(st.bbPer100Note || style.bbPer100Note)}</p>`
      : '';
    const ci = st.bbPer100CI || style.bbPer100CI;
    const ciNote = ci
      ? `<p class="muted-text stats-section-note" title="Intervalo de confianza 95% aproximado (normal)">bb/100 IC95%: <strong>${ci.low >= 0 ? '+' : ''}${ci.low} … ${ci.high >= 0 ? '+' : ''}${ci.high}</strong> (n=${ci.n}, SE=${ci.se})</p>`
      : '';
    const byStakes = st.byStakes || style.byStakes || [];
    const stakesHtml = byStakes.length
      ? `<div class="card-box" style="margin-top:10px"><h4 style="margin:0 0 8px">Winrate por stakes</h4>
          <table class="style-pos-table"><thead><tr><th>Stakes</th><th>Manos</th><th>Net</th><th>bb/100</th></tr></thead>
          <tbody>${byStakes.slice(0, 8).map((r) =>
            `<tr><td>${escapeHtml(r.stakesLabel)}</td><td>${r.hands}</td><td class="${r.netBB >= 0 ? 'net-pos' : 'net-neg'}">${r.netBB >= 0 ? '+' : ''}${fmtBB(r.netBB)}</td><td>${r.bbPer100 == null ? '—' : fmtHudAf(r.bbPer100)}</td></tr>`
          ).join('')}</tbody></table></div>`
      : '';

    return `<div class="card-box session-hud-note session-style-profile ${statusCls}" style="margin-top:14px" data-style-format="${escapeHtml(format)}">
      <h3>Perfil de estilo <span class="badge ${statusCls === 'hud-ok' ? 'grade-A' : (statusCls === 'hud-unknown' ? 'grade-C' : 'grade-D')}">${escapeHtml(label)}</span>
        <span class="badge grade-C">${escapeHtml(formatLabel)}</span></h3>
      <p class="muted-text stats-section-note" style="margin:6px 0 0">Pulsa un cuadrito para ver qué mide esa métrica (adaptado a ${escapeHtml(formatLabel)}).</p>
      <div class="style-bars">${bars}</div>
      <div class="stats-content style-metrics-grid">${cards}</div>
      ${cbetSplit}
      ${bbNote}
      ${ciNote}
      ${stakesHtml}
      ${byPositionTableHtml(st.byPosition || style.byPosition)}
      ${lines ? `<ul class="style-assess-list">${lines}</ul>` : ''}
      ${styleDrillsHtml(assess)}
      <p class="muted-text stats-section-note" style="margin-top:8px">Referencia ${escapeHtml(formatLabel)}. Las insignias indican fiabilidad de la muestra por métrica.</p>
    </div>`;
  }

  function sessionHudCommentHtml(st) {
    const format = resolveStatsFormat(st);
    const ideal = st.styleIdeal || idealForStatsFormat(format);
    const note = st.vpipPfr || (window.Importer && Importer.assessVpipPfr
      ? Importer.assessVpipPfr(st.vpipPct, st.pfrPct, st.nHands, ideal)
      : null);
    const formatLabel = formatDisplayLabel(format);
    const vpipCards = [
      explainableStatCard('vpip', 'VPIP', fmtHudPct(st.vpipPct), format, '', note && note.sample, ideal.vpipMin != null ? `ideal ${ideal.vpipMin}–${ideal.vpipMax}%` : ''),
      explainableStatCard('pfr', 'PFR', fmtHudPct(st.pfrPct), format, '', note && note.sample, ideal.pfrMin != null ? `ideal ${ideal.pfrMin}–${ideal.pfrMax}%` : '')
    ].join('');
    const vpipNote = note ? `<div class="card-box session-hud-note ${note.status === 'ok' ? 'hud-ok' : (note.status === 'unknown' || note.status === 'low_sample' ? 'hud-unknown' : 'hud-warn')}" style="margin-top:14px" data-style-format="${escapeHtml(format)}">
      <h3>VPIP / PFR <span class="badge ${note.status === 'ok' ? 'grade-A' : (note.status === 'unknown' || note.status === 'low_sample' ? 'grade-C' : 'grade-D')}">${escapeHtml(note.label)}</span>
        ${note.sample ? sampleTrustBadge(note.sample) : ''}</h3>
      <div class="stats-content style-metrics-grid" style="margin-top:10px">${vpipCards}</div>
      <p class="muted-text" style="margin:8px 0 0;line-height:1.55">${escapeHtml(note.comment)}</p>
      <p class="muted-text stats-section-note" style="margin-top:8px">Referencia ${escapeHtml(formatLabel)}: VPIP ~${ideal.vpipMin || 20}–${ideal.vpipMax || 28}%, PFR ~${ideal.pfrMin || 15}–${ideal.pfrMax || 24}%, hueco típico ${ideal.gapMin || 3}–${ideal.gapMax || 8} pts.</p>
    </div>` : '';
    return vpipNote + sessionStyleProfileHtml(st);
  }

  function statsGradeLineChart(title, series) {
    if (!series || !series.length) {
      return '<div class="stats-carousel-empty muted-text">Importa sesiones con nota calculada para ver la evolución.</div>';
    }
    const w = Math.max(300, series.length * 40);
    const h = 168;
    const pad = { l: 30, r: 12, t: 14, b: 30 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const pts = series.map((s, i) => {
      const x = pad.l + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
      const y = pad.t + innerH - (Math.max(0, Math.min(10, s.score)) / 10) * innerH;
      return Object.assign({ x, y }, s);
    });
    const poly = pts.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    const grid = [0, 2, 4, 6, 8, 10].map((v) => {
      const y = pad.t + innerH - (v / 10) * innerH;
      return `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="var(--border)" stroke-dasharray="2 4" opacity="0.45"/>
        <text x="${pad.l - 6}" y="${y + 3}" text-anchor="end" font-size="8" fill="var(--muted)">${v}</text>`;
    }).join('');
    const dots = pts.map((p) =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="var(--gold)" stroke="var(--bg)" stroke-width="1">
        <title>${escapeHtml(p.fileName)} · ${escapeHtml(p.label)}: ${escapeHtml(p.letter)} (${p.score}/10)</title>
      </circle>`
    ).join('');
    const step = Math.max(1, Math.ceil(series.length / 8));
    const labels = pts.map((p, i) => (i % step === 0 || i === series.length - 1)
      ? `<text x="${p.x.toFixed(1)}" y="${h - 8}" text-anchor="middle" font-size="9" fill="var(--muted)">${escapeHtml(p.label)}</text>`
      : '').join('');
    return `<div class="stats-carousel-chart stats-grade-chart"><h4>${escapeHtml(title)}</h4>
      <svg viewBox="0 0 ${w} ${h}" class="stats-grade-svg" role="img" aria-label="${escapeHtml(title)}">
        ${grid}
        <line x1="${pad.l}" y1="${pad.t + innerH}" x2="${w - pad.r}" y2="${pad.t + innerH}" stroke="var(--border)"/>
        <polyline points="${poly}" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linejoin="round"/>
        ${dots}${labels}
      </svg></div>`;
  }

  function buildSessionDerivedStats(sessions) {
    const out = {
      availableSessions: 0,
      byStreet: emptyByStreet(),
      accByStreet: { preflop: null, flop: null, turn: null, river: null },
      dist: { optima: 0, aceptable: 0, imprecisa: 0, error: 0 }
    };
    const streetTotals = {
      preflop: { weighted: 0, n: 0 },
      flop: { weighted: 0, n: 0 },
      turn: { weighted: 0, n: 0 },
      river: { weighted: 0, n: 0 }
    };
    (sessions || []).forEach((s) => {
      if (!s) return;
      const stats = s.stats || {};
      if (s.hands && s.hands.length) {
        out.availableSessions += 1;
        s.hands.forEach((h) => {
          (h.decisions || []).forEach((d) => {
            if (out.dist[d.class] != null) out.dist[d.class] += 1;
            const street = out.byStreet[d.street];
            if (street) {
              street.n += 1;
              if (d.class === 'optima' || d.class === 'aceptable') street.good += 1;
            }
          });
        });
        return;
      }
      if (stats && stats.nHands) {
        ['optima', 'aceptable', 'imprecisa', 'error'].forEach((key) => {
          if (out.dist[key] != null) out.dist[key] += Number((stats.dist || {})[key]) || 0;
        });
        ['preflop', 'flop', 'turn', 'river'].forEach((streetKey) => {
          const pct = stats.accByStreet && stats.accByStreet[streetKey];
          const decisions = Number((stats.street || {})[streetKey] && (stats.street || {})[streetKey].n) || 0;
          if (pct == null) return;
          if (decisions > 0) {
            out.byStreet[streetKey].n += decisions;
            out.byStreet[streetKey].good += Math.round((decisions * pct) / 100);
          } else {
            streetTotals[streetKey].weighted += Number(pct) * Math.max(1, Number(stats.nDecisions) || 1);
            streetTotals[streetKey].n += Math.max(1, Number(stats.nDecisions) || 1);
          }
        });
      }
    });
    ['preflop', 'flop', 'turn', 'river'].forEach((streetKey) => {
      if (out.byStreet[streetKey].n > 0) {
        out.accByStreet[streetKey] = Math.round((out.byStreet[streetKey].good / out.byStreet[streetKey].n) * 100);
      } else if (streetTotals[streetKey].n > 0) {
        out.accByStreet[streetKey] = Math.round(streetTotals[streetKey].weighted / streetTotals[streetKey].n);
      }
    });
    return out;
  }

  function renderStreetAccBarsFromPct(accByStreet) {
    const labels = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
    return ['preflop', 'flop', 'turn', 'river'].map((st) => streetAccBar(labels[st], accByStreet ? accByStreet[st] : null)).join('');
  }

  function renderDecisionDistribution(dist, total) {
    total = total || 0;
    const pct = (n) => total ? Math.round((n / total) * 100) : 0;
    return `<div class="stats-distribution">
      <div class="dist-bar">
        <span style="width:${pct(dist.optima || 0)}%;background:var(--green)">${pct(dist.optima || 0)}%</span>
        <span style="width:${pct(dist.aceptable || 0)}%;background:var(--yellow)">${pct(dist.aceptable || 0)}%</span>
        <span style="width:${pct(dist.imprecisa || 0)}%;background:var(--orange)">${pct(dist.imprecisa || 0)}%</span>
        <span style="width:${pct(dist.error || 0)}%;background:var(--red)">${pct(dist.error || 0)}%</span>
      </div>
      <div class="stats-distribution-legend">
        <span style="color:var(--green)">■ Óptima ${dist.optima || 0}</span>
        <span style="color:var(--yellow)">■ Aceptable ${dist.aceptable || 0}</span>
        <span style="color:var(--orange)">■ Imprecisa ${dist.imprecisa || 0}</span>
        <span style="color:var(--red)">■ Error ${dist.error || 0}</span>
      </div>
    </div>`;
  }

  function renderLeakList(leaks, mode) {
    if (window.PTLeaks && typeof PTLeaks.renderLeakList === 'function') {
      return PTLeaks.renderLeakList(leaks, { mode: mode, showEv: false });
    }
    if (!leaks || !leaks.length) return '<div class="stats-carousel-empty muted-text">Sin fugas destacables.</div>';
    return `<div class="stats-leak-list">` + leaks.map((l, i) => {
      const action = mode === 'trainer'
        ? `<button type="button" class="stats-leak-action" data-stats-train-leak="${escapeHtml(l.key)}">Repetir</button>`
        : (l.sessionId ? `<button type="button" class="stats-leak-action" data-stats-open-session="${escapeHtml(l.sessionId)}">Ir a la sesión</button>` : '');
      return `<div class="stats-leak-row">
        <div class="stats-leak-rank">#${i + 1}</div>
        <div class="stats-leak-main">
          <div class="stats-leak-title">${escapeHtml(l.label)}</div>
          <div class="stats-leak-sub muted-text">${l.count} error${l.count === 1 ? '' : 'es'}</div>
        </div>
        ${action ? `<div class="stats-leak-actions">${action}</div>` : ''}
      </div>`;
    }).join('') + `</div>`;
  }

  function getActiveStatsTab() {
    try {
      const stored = sessionStorage.getItem('__ptStatsTab');
      if (stored === 'sessions' || stored === 'trainer') return stored;
    } catch (e) { /* ignore */ }
    return window.__ptStatsTab === 'sessions' ? 'sessions' : 'trainer';
  }

  function setActiveStatsTab(tab) {
    const next = tab === 'sessions' ? 'sessions' : 'trainer';
    window.__ptStatsTab = next;
    try { sessionStorage.setItem('__ptStatsTab', next); } catch (e) { /* ignore */ }
    return next;
  }

  function applyStatsTab(tab) {
    const next = setActiveStatsTab(tab);
    $$('#tab-stats [data-stats-tab]').forEach((btn) => {
      const on = btn.getAttribute('data-stats-tab') === next;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('#tab-stats [data-stats-panel]').forEach((panel) => {
      const on = panel.getAttribute('data-stats-panel') === next;
      panel.classList.toggle('active', on);
      panel.hidden = !on;
    });
  }

  function renderStatsCarousel(sectionId, title, subtitle, slides) {
    return `<section class="stats-section card-box" data-stats-section="${escapeHtml(sectionId)}">
      <div class="stats-section-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p class="muted-text">${escapeHtml(subtitle)}</p>
        </div>
      </div>
      <div class="stats-carousel-stage">
        <div class="stats-carousel" data-stats-carousel="${escapeHtml(sectionId)}">
          ${slides.map((slide, idx) => `<article class="stats-slide${idx === 0 ? ' stats-slide-active' : ''}" data-stats-slide="${idx}">
            <div class="stats-slide-head">
              <h4>${escapeHtml(slide.title)}</h4>
              <span class="muted-text">${idx + 1}/${slides.length}</span>
            </div>
            <div class="stats-slide-body">${slide.body}</div>
          </article>`).join('')}
        </div>
      </div>
      <div class="stats-carousel-nav">
        <button type="button" class="btn btn-ghost stats-carousel-side stats-carousel-side-prev" data-stats-prev="${escapeHtml(sectionId)}" aria-label="Anterior">‹</button>
        <div class="stats-carousel-dots">
          ${slides.map((slide, idx) => `<button type="button" class="stats-carousel-dot${idx === 0 ? ' active' : ''}" data-stats-dot="${escapeHtml(sectionId)}:${idx}" aria-label="${escapeHtml(slide.title)}"></button>`).join('')}
        </div>
        <button type="button" class="btn btn-ghost stats-carousel-side stats-carousel-side-next" data-stats-next="${escapeHtml(sectionId)}" aria-label="Siguiente">›</button>
      </div>
    </section>`;
  }

  function setStatsCarousel(sectionId, nextIndex) {
    const root = document.querySelector(`[data-stats-carousel="${sectionId}"]`);
    if (!root) return;
    const slides = Array.from(root.querySelectorAll('[data-stats-slide]'));
    if (!slides.length) return;
    const total = slides.length;
    const index = ((nextIndex % total) + total) % total;
    slides.forEach((slide, idx) => slide.classList.toggle('stats-slide-active', idx === index));
    $$(`[data-stats-dot^="${sectionId}:"]`).forEach((dot, idx) => dot.classList.toggle('active', idx === index));
    root.dataset.index = String(index);
  }

  function getStatsCarouselIndices() {
    const out = {};
    $$('[data-stats-carousel]').forEach((root) => {
      const id = root.getAttribute('data-stats-carousel');
      if (id) out[id] = Number(root.dataset.index || 0);
    });
    return out;
  }

  function restoreStatsCarouselIndices(indices) {
    Object.keys(indices || {}).forEach((id) => setStatsCarousel(id, indices[id]));
  }

  function bindStatsView() {
    $$('#tab-stats [data-stats-tab]').forEach((btn) => {
      btn.onclick = () => applyStatsTab(btn.getAttribute('data-stats-tab'));
    });
    $$('[data-stats-train-leak]').forEach((btn) => {
      btn.onclick = () => {
        const leak = latestTrainerStatsLeaks.find((item) => item.key === btn.getAttribute('data-stats-train-leak'));
        if (leak) startLeakReplay(leak);
      };
    });
    $$('[data-stats-open-session]').forEach((btn) => {
      btn.onclick = () => {
        const sessionId = btn.getAttribute('data-stats-open-session');
        if (!sessionId) return;
        goToTab('sessions', { openSessionId: sessionId });
      };
    });
    $$('[data-stats-school-lesson]').forEach((btn) => {
      btn.onclick = () => {
        const lessonId = btn.getAttribute('data-stats-school-lesson');
        if (window.PTLeaks && typeof PTLeaks.openSchoolLesson === 'function') {
          PTLeaks.openSchoolLesson(lessonId);
        }
      };
    });
    const sw = $('#share-weekly-leak');
    if (sw) sw.addEventListener('click', shareWeeklyTopLeak);
    const tw = $('#train-worst-spots-stats');
    if (tw) tw.addEventListener('click', startWorstSpotsDrill);
    bindStyleDrillButtons(document.getElementById('stats-box') || document.getElementById('tab-stats') || document);
    bindMetricExplainClicks(document.getElementById('stats-box') || document.getElementById('tab-stats') || document);
  }

  // ---------- Histórico ----------
  function renderHistory() {
    bindHandFilters('#history-filters', 'history', renderHistory);
    let hist = Store.getHistory().filter((h) => passesHistoryFilters(h, handListFilters.history));
    const Ent = window.PTEntitlements;
    let cutoffNote = '';
    if (Ent && Ent.historyCutoffDate) {
      const cutoff = Ent.historyCutoffDate(Ent.get());
      if (cutoff) {
        hist = hist.filter((h) => h.createdAt && h.createdAt >= cutoff);
        cutoffNote = '<p class="muted-text history-cutoff-note">Plan Gratis: mostrando manos de los últimos 30 días.</p>';
      }
    }
    const box = $('#history-list');
    if (!hist.length) {
      box.innerHTML = cutoffNote + '<div class="empty">No hay manos que coincidan con los filtros.</div>';
      return;
    }
    box.innerHTML = cutoffNote + hist.map((h) => {
      const worst = worstClass(h.decisions);
      const netCls = h.heroNet >= 0 ? 'net-pos' : 'net-neg';
      const scoreMeta = resolveHandScoreMeta(h, h.decisions, h.totalEvLoss);
      return `<div class="record">
        <div class="rec-cards">${h.heroCards.map(Cards.cardToHTML).join('')}</div>
        <div class="rec-main">
          <div class="rec-scenario">${escapeHtml(h.scenario)} <span class="badge ${worst}">${verdictWord(worst)}</span> ${handScoreBadgeHtml(scoreMeta)}</div>
          <div class="rec-sub">${h.heroCode} · ${fmtDate(h.createdAt)} · ${escapeHtml(h.reason)}</div>
        </div>
        <div class="rec-right">
          <div class="${netCls}">${h.heroNet >= 0 ? '+' : ''}${h.heroNet} bb</div>
          <div style="color:var(--muted);font-size:12px">EV -${fmtBB(h.totalEvLoss)} bb</div>
          <div style="color:var(--muted);font-size:11px">EV esp. ${roundSession((h.heroNet || 0) - (h.totalEvLoss || 0)) >= 0 ? '+' : ''}${fmtBB(roundSession((h.heroNet || 0) - (h.totalEvLoss || 0)))} bb</div>
          <button class="btn btn-ghost" style="margin-top:6px;padding:4px 10px;font-size:12px" data-replay-id="${escapeHtml(h.id)}">Repetir mano</button>
        </div>
      </div>`;
    }).join('');
    $$('#history-list [data-replay-id]').forEach((b) => b.addEventListener('click', () => {
      const rec = Store.getHistory().find((x) => x.id === b.dataset.replayId);
      if (!rec) return;
      replayFromStored(rec);
    }));
  }

  // ---------- Errores ----------
  function renderErrors() {
    bindHandFilters('#errors-filters', 'errors', renderErrors);
    const errs = Store.getErrors().filter((e) => passesErrorFilters(e, handListFilters.errors));
    const box = $('#errors-list');
    if (!errs.length) { box.innerHTML = '<div class="empty">No hay errores que coincidan con los filtros.</div>'; return; }
    box.innerHTML = errs.map((e) => `<div class="record">
      <div class="rec-cards">${(e.heroCards || []).map(Cards.cardToHTML).join('')}</div>
      <div class="rec-main">
        <div class="rec-scenario">${escapeHtml(typeof e.scenario === 'string' ? e.scenario : '')} <span class="badge ${e.class}">${verdictWord(e.class)}</span></div>
        <div class="rec-sub">${e.heroCode} · ${e.street} · elegiste <strong>${escapeHtml(e.chosen)}</strong>${e.best && e.best !== e.chosenAction ? `, mejor: <strong>${actionName(e.best)}</strong>` : ''} · -${e.evLoss}bb</div>
        <div class="rec-sub">${escapeHtml(e.context || '')}</div>
      </div>
      <div class="rec-right">
        <button class="btn btn-primary" style="padding:6px 12px;font-size:13px" data-train-id="${escapeHtml(e.id)}">Repetir</button>
        <button class="btn btn-ghost" style="margin-top:6px;padding:4px 10px;font-size:12px" data-del="${e.id}">Quitar</button>
      </div>
    </div>`).join('');
    $$('#errors-list [data-train-id]').forEach((b) => b.addEventListener('click', () => {
      const rec = Store.getErrors().find((x) => x.id === b.dataset.trainId);
      if (!rec) return;
      replayFromStored(rec);
    }));
    $$('#errors-list [data-del]').forEach((b) => b.addEventListener('click', () => { Store.removeError(b.dataset.del); renderErrors(); }));
  }

  function trainNextError() {
    const errs = Store.getErrors();
    if (!errs.length) { alert('No hay errores para entrenar.'); return; }
    // Load remaining errors into the queue so "nueva mano" continues sequentially
    leakReplayQueue = errs.slice(1);
    replayFromStored(errs[0]);
  }

  function startWorstSpotsDrill() {
    const PT = window.PTLeaks;
    if (!PT || !PT.worstSpotsQueue) {
      trainNextError();
      return;
    }
    const queue = PT.worstSpotsQueue(Store.getErrors(), 8, 25);
    if (!queue.length) {
      alert('No hay spots débiles con manos para entrenar. Juega más manos o importa una sesión.');
      return;
    }
    startLeakReplay({
      key: 'adaptive',
      label: 'Drill adaptativo · peores spots',
      errors: queue
    });
  }

  function matchErrorLeakFilter(e, filter) {
    if (!filter) return true;
    if (filter.street) {
      const street = e.street || ((e.spotKey || '').split('|')[2]) || 'preflop';
      if (String(street) !== String(filter.street)) return false;
    }
    if (filter.spotType) {
      const sc = e.scenarioRaw && typeof e.scenarioRaw === 'object' ? e.scenarioRaw : {};
      const type = sc.type || (e.spotKey ? String(e.spotKey).split('|')[0] : '') || '';
      if (String(type) !== String(filter.spotType)) return false;
    }
    return true;
  }

  function drillFromLeakFilter(filter) {
    const errs = Store.getErrors().filter((e) => matchErrorLeakFilter(e, filter));
    if (errs.length) {
      const label = filter.street
        ? ('Fugas · ' + (window.PTLeaks && PTLeaks.STREET_LABELS[filter.street] || filter.street))
        : ('Fugas · ' + (window.PTLeaks && PTLeaks.TYPE_LABELS[filter.spotType] || filter.spotType || 'spot'));
      startLeakReplay({ key: 'filter', label: label, errors: errs });
      return;
    }
    handListFilters.errors = handListFilters.errors || emptyHandFilters();
    handListFilters.errors.street = filter.street || '';
    handListFilters.errors.spotType = filter.spotType || '';
    goToTab('errors');
  }

  function applyWhatIfDecision(decIdx, actionId) {
    const h = currentHand;
    if (!h || !h.decisions || !h.decisions[decIdx]) return;
    if (!window.Importer || !Importer.recomputeDecisionGto) {
      alert('What-if no disponible ahora mismo.');
      return;
    }
    const d = h.decisions[decIdx];
    if (d.originalChosen == null) d.originalChosen = d.chosen;
    d.chosen = actionId;
    d.action = actionId;
    try {
      if (window.GTOStreetValidation) GTOStreetValidation.invalidateSolverCache('what-if');
      Importer.recomputeDecisionGto(h, d, actionId);
      if (Importer.recomputeHeroNet) Importer.recomputeHeroNet(h);
      let total = 0;
      h.decisions.forEach((x) => { total += Number(x.evLoss) || 0; });
      h.totalEvLoss = Math.round(total * 100) / 100;
      const nGood = h.decisions.filter((x) => x.class === 'optima' || x.class === 'aceptable').length;
      h.accuracy = h.decisions.length ? Math.round((nGood / h.decisions.length) * 100) : 100;
      if (window.GTOScoring && GTOScoring.ensureHandScore) GTOScoring.ensureHandScore(h);
    } catch (err) {
      console.warn('[what-if]', err);
      alert('No se pudo reevaluar esa acción.');
      return;
    }
    renderTimelineReview();
  }

  function resetWhatIfDecision(decIdx) {
    const h = currentHand;
    if (!h || !h.decisions || !h.decisions[decIdx]) return;
    if (!window.Importer || !Importer.recomputeDecisionGto) return;
    const d = h.decisions[decIdx];
    if (d.originalChosen == null) return;
    const original = d.originalChosen;
    d.chosen = original;
    d.action = original;
    delete d.originalChosen;
    try {
      if (window.GTOStreetValidation) GTOStreetValidation.invalidateSolverCache('what-if');
      Importer.recomputeDecisionGto(h, d, original);
      if (Importer.recomputeHeroNet) Importer.recomputeHeroNet(h);
      let total = 0;
      h.decisions.forEach((x) => { total += Number(x.evLoss) || 0; });
      h.totalEvLoss = Math.round(total * 100) / 100;
      const nGood = h.decisions.filter((x) => x.class === 'optima' || x.class === 'aceptable').length;
      h.accuracy = h.decisions.length ? Math.round((nGood / h.decisions.length) * 100) : 100;
      if (window.GTOScoring && GTOScoring.ensureHandScore) GTOScoring.ensureHandScore(h);
    } catch (err) {
      console.warn('[what-if-reset]', err);
      return;
    }
    renderTimelineReview();
  }

  // What-if del paso a paso de sesiones: oculto por ahora (lógica lista para reactivar).
  const SESSION_WHAT_IF_ENABLED = false;

  function renderWhatIfControls(heroDec, decIdx) {
    if (!SESSION_WHAT_IF_ENABLED) return '';
    if (!heroDec || !heroDec.optionBreakdown || !heroDec.optionBreakdown.length) return '';
    const pills = heroDec.optionBreakdown.map((o) => {
      const active = o.id === heroDec.chosen ? ' active' : '';
      return `<button type="button" class="btn btn-ghost btn-sm whatif-action${active}" data-whatif-dec="${decIdx}" data-whatif-action="${escapeHtml(o.id)}">${escapeHtml(o.label || o.id)} · ${o.pct || 0}%</button>`;
    }).join('');
    const note = heroDec.originalChosen
      ? `<span class="muted-text whatif-note">Original: <strong>${escapeHtml(actionName(heroDec.originalChosen))}</strong></span>
         <button type="button" class="btn btn-ghost btn-sm" data-whatif-reset="${decIdx}">Restaurar</button>`
      : '<span class="muted-text whatif-note">What-if: elige otra acción para reevaluar</span>';
    return `<div class="whatif-row">${note}<div class="whatif-actions">${pills}</div></div>`;
  }

  let statsLeaksRebuildPromise = null;

  function sessionsWithHandsForLeaks(sessions) {
    return (sessions || []).map(function (s) {
      return Store.getSession(s.id);
    }).filter(function (s) {
      return s && s.hands && s.hands.length;
    });
  }

  function scheduleSessionLeaksRebuild(st, sessions) {
    if (statsLeaksRebuildPromise || !window.PTStatsAggregate || !Store.getSessionAsync) return;
    const tot = PTStatsAggregate.sessionsTotal(st);
    if (!tot || !tot.decisions) return;
    if (PTStatsAggregate.sessionTopLeaks(st, 1).length) return;
    const CS = window.PTCloudSessions;
    if (!CS || !CS.isReady || !CS.isReady()) return;
    statsLeaksRebuildPromise = (async function () {
      try {
        let changed = false;
        for (let i = 0; i < Math.min(8, sessions.length); i++) {
          const full = await Store.getSessionAsync(sessions[i].id);
          if (full && full.hands && full.hands.length) {
            PTStatsAggregate.refreshSessionLeaks(st, [full]);
            changed = true;
          }
        }
        if (changed) {
          Store.persistStats(st);
          if ($('#tab-stats') && $('#tab-stats').classList.contains('active')) {
            renderStats();
          }
        }
      } catch (e) {
        console.warn('[Stats] rebuild session leaks', e);
      } finally {
        statsLeaksRebuildPromise = null;
      }
    })();
  }

  // ---------- Estadísticas ----------
  function renderStats() {
    if (window.PTUsageUI && PTUsageUI.refreshHost) PTUsageUI.refreshHost($('#stats-usage'));
    const gameHost = $('#stats-gamification');
    if (gameHost) gameHost.innerHTML = '';
    if ($('#progress-dashboard')) $('#progress-dashboard').innerHTML = '';
    const leaksHost = $('#leaks-panel');
    if (leaksHost) leaksHost.innerHTML = '';
    const st = Store.getStats();
    const sessions = Store.getSessions ? Store.getSessions() : [];
    if (window.PTStatsAggregate) {
      const withHands = sessionsWithHandsForLeaks(sessions);
      const leakCountBefore = PTStatsAggregate.sessionTopLeaks(st, 5).length;
      if (withHands.length) PTStatsAggregate.refreshSessionLeaks(st, withHands);
      if (PTStatsAggregate.sessionTopLeaks(st, 5).length > leakCountBefore) Store.persistStats(st);
    }
    const statsFormatFilter = (window.__ptStatsFormatFilter != null) ? window.__ptStatsFormatFilter : 'all';
    const sessTot = window.PTStatsAggregate ? PTStatsAggregate.sessionsTotal(st, statsFormatFilter) : null;
    const byFormat = window.PTStatsAggregate && PTStatsAggregate.sessionsTotalByFormat
      ? PTStatsAggregate.sessionsTotalByFormat(st)
      : {};
    const trainerWeekly = window.PTStatsAggregate ? PTStatsAggregate.trainerWeeklySeries(st, 8) : [];
    const sessionWeekly = window.PTStatsAggregate ? PTStatsAggregate.sessionWeeklySeries(st, 8) : [];
    const trainerLeaks = trainerLeaksForStats(st);
    const sessionLeaks = window.PTStatsAggregate ? PTStatsAggregate.sessionTopLeaks(st, 5) : [];
    const sessionDerived = buildSessionDerivedStats(sessions);
    const box = $('#stats-content');
    const formatFilterOpts = [
      { v: 'all', l: 'Todo' },
      { v: 'cash6', l: 'Cash 6-max' },
      { v: 'cash9', l: 'Cash 9-max' },
      { v: 'spin', l: 'Spins' },
      { v: 'mtt', l: 'MTT' },
      { v: 'shorthand', l: 'Short-handed' }
    ].map((o) => `<option value="${o.v}"${statsFormatFilter === o.v ? ' selected' : ''}>${o.l}${byFormat[o.v] ? ' (' + byFormat[o.v].hands + ')' : ''}</option>`).join('');
    const formatFilterHtml = `<div class="stats-format-filter">
      <label class="muted-text">Formato
        <select id="stats-format-filter">${formatFilterOpts}</select>
      </label>
    </div>`;
    const byStreet = st.byStreet || emptyByStreet();
    latestTrainerStatsLeaks = trainerLeaks.slice();
    latestSessionStatsLeaks = sessionLeaks.slice();
    const activeTab = getActiveStatsTab();

    const sessionAccuracy = sessTot && sessTot.decisions ? Math.round((sessTot.good / sessTot.decisions) * 100) : null;
    const sessionStreetBars = renderStreetAccBarsFromPct(sessionDerived.accByStreet);
    const sessionGradeSeries = buildSessionGradeSeries(sessions);
    const sessionHudSeries = buildSessionHudSeries(sessions);
    const aggFormat = (sessions || []).map((s) => s && s.stats && resolveStatsFormat(s.stats)).filter(Boolean)[0] || '6max';
    const aggIdeal = idealForStatsFormat(aggFormat);
    const sessionDistTotal = Object.values(sessionDerived.dist).reduce((sum, n) => sum + n, 0);
    const stakesRows = window.PTStatsAggregate && PTStatsAggregate.sessionsByStakes
      ? PTStatsAggregate.sessionsByStakes(st)
      : [];
    const dailySeries = window.PTStatsAggregate && PTStatsAggregate.sessionDailySeries
      ? PTStatsAggregate.sessionDailySeries(st, 14)
      : [];
    const styleHtml = sessTot && (sessTot.threeBetOpps != null || sessTot.vpipPct != null)
      ? sessionStyleProfileHtml(Object.assign({}, sessTot, {
        format: aggFormat,
        styleIdeal: aggIdeal,
        styleAssess: (window.Importer && Importer.assessStyleStats)
          ? Importer.assessStyleStats(sessTot, aggIdeal)
          : null,
        bbPer100Note: sessTot.hands < 20000
          ? 'Varianza alta con menos de 20k manos; interpreta bb/100 con cautela.'
          : null
      }))
      : '<p class="muted-text">Importa o reabre sesiones para ver el perfil de estilo.</p>';
    const stakesHtml = stakesRows.length
      ? `<table class="style-pos-table"><thead><tr><th>Stakes</th><th>Manos</th><th>Net</th><th>bb/100</th></tr></thead><tbody>${
        stakesRows.slice(0, 12).map((r) =>
          `<tr><td>${escapeHtml(r.stakesLabel)}</td><td>${r.hands}</td><td class="${r.netBB >= 0 ? 'net-pos' : 'net-neg'}">${r.netBB >= 0 ? '+' : ''}${fmtBB(r.netBB)}</td><td>${r.bbPer100 == null ? '—' : fmtHudAf(r.bbPer100)}</td></tr>`
        ).join('')
      }</tbody></table>`
      : '<p class="muted-text">Importa sesiones con stakes detectados para ver bb/100 por nivel.</p>';

    const trainerHtml = `<div class="stats-tab-panel${activeTab === 'trainer' ? ' active' : ''}" data-stats-panel="trainer"${activeTab === 'trainer' ? '' : ' hidden'}>
      <section class="stats-block card-box stats-block-hero">
        <h3>Acierto por calle</h3>
        <p class="muted-text">Porcentaje de decisiones óptimas o aceptables en cada calle.</p>
        <div class="street-acc stats-street-grid stats-street-hero">${renderStreetAccBars(byStreet)}</div>
        <div class="stats-dist-inline">${renderDecisionDistribution({ optima: st.optima, aceptable: st.aceptable, imprecisa: st.imprecisa, error: st.error }, st.decisions)}</div>
      </section>
      <section class="stats-block card-box">
        <h3>Acierto semanal</h3>
        ${statsBarChartRows('Últimas 8 semanas', trainerWeekly, 'accuracy', '%', '--green')}
      </section>
      <section class="stats-block card-box">
        <h3>Top 5 fugas</h3>
        <p class="muted-text">Spots del entrenador con más errores. Repite el spot o abre la lección de la escuela.</p>
        ${renderLeakList(trainerLeaks, 'trainer')}
      </section>
      <section class="stats-block card-box stats-actions-block">
        <div class="stats-actions-row">
          <button type="button" class="btn btn-primary" id="train-worst-spots-stats" title="Repasa primero tus peores spots">Drill adaptativo</button>
          <button type="button" class="btn btn-ghost" id="share-weekly-leak">Compartir peor leak de la semana</button>
        </div>
        <p class="muted-text adaptive-drill-help-inline">El drill agrupa tus errores por spot y lanza ~25 manos de tus fugas más caras.</p>
      </section>
    </div>`;

    const sessionsHtml = `<div class="stats-tab-panel${activeTab === 'sessions' ? ' active' : ''}" data-stats-panel="sessions"${activeTab === 'sessions' ? '' : ' hidden'}>
      ${formatFilterHtml}
      <section class="stats-block card-box stats-block-hero">
        <h3>Acierto por calle</h3>
        <p class="muted-text">Acierto GTO en las sesiones importadas, calle a calle.</p>
        <div class="street-acc stats-street-grid stats-street-hero">${sessionStreetBars}</div>
        <div class="stats-dist-inline">${renderDecisionDistribution(sessionDerived.dist, sessionDistTotal)}</div>
      </section>
      <section class="stats-block card-box">
        <h3>Acierto semanal</h3>
        ${statsBarChartRows('Últimas 8 semanas', sessionWeekly, 'accuracy', '%', '--green')}
      </section>
      <section class="stats-block card-box">
        <h3>Resumen</h3>
        <div class="stats-overview-grid stats-overview-compact" data-style-format="${escapeHtml(aggFormat)}">
          ${explainableStatCard('accuracy', 'Acierto', sessionAccuracy == null ? '—' : sessionAccuracy + '%', aggFormat)}
          ${explainableStatCard('sessions', 'Sesiones', String(sessTot ? sessTot.sessions : 0), aggFormat)}
          ${explainableStatCard('nHands', 'Manos', String(sessTot ? sessTot.hands : 0), aggFormat)}
          ${explainableStatCard('bbPer100', 'bb/100', fmtHudAf(sessTot && sessTot.bbPer100), aggFormat)}
        </div>
      </section>
      <section class="stats-block card-box">
        <h3>Top 5 fugas</h3>
        <p class="muted-text">Spots con más errores en sesiones importadas. Abre la sesión para revisar las manos.</p>
        ${renderLeakList(sessionLeaks, 'sessions')}
      </section>
      <details class="stats-block card-box stats-advanced">
        <summary>Detalle avanzado</summary>
        <div class="stats-advanced-body">
          <h4>HUD</h4>
          <div class="stats-overview-grid" data-style-format="${escapeHtml(aggFormat)}">
            ${explainableStatCard('vpip', 'VPIP', fmtHudPct(sessTot && sessTot.vpipPct), aggFormat, '', null, aggIdeal.vpipMin != null ? `ideal ${aggIdeal.vpipMin}–${aggIdeal.vpipMax}%` : '')}
            ${explainableStatCard('pfr', 'PFR', fmtHudPct(sessTot && sessTot.pfrPct), aggFormat, '', null, aggIdeal.pfrMin != null ? `ideal ${aggIdeal.pfrMin}–${aggIdeal.pfrMax}%` : '')}
            ${explainableStatCard('threeBet', '3-Bet', fmtHudPct(sessTot && sessTot.threeBetPct), aggFormat)}
            ${explainableStatCard('cbetFlop', 'C-Bet flop', fmtHudPct(sessTot && sessTot.cbetFlopPct), aggFormat)}
            ${explainableStatCard('wtsd', 'WTSD', fmtHudPct(sessTot && sessTot.wtsdPct), aggFormat)}
            ${explainableStatCard('netBB', 'Resultado real', sessTot ? ((sessTot.netBB >= 0 ? '+' : '') + fmtBB(sessTot.netBB)) : '—', aggFormat, sessTot && sessTot.netBB >= 0 ? 'net-pos' : 'net-neg')}
            ${explainableStatCard('evLoss', 'EV perdido', sessTot ? ('-' + fmtBB(sessTot.evLoss)) : '—', aggFormat, 'net-neg')}
          </div>
          <h4>Distribución de decisiones</h4>
          <p class="muted-text" style="margin:0 0 8px;font-size:12px">Mismo desglose que aparece bajo el acierto por calle de arriba.</p>
          ${renderDecisionDistribution(sessionDerived.dist, sessionDistTotal)}
          <h4>Perfil de estilo</h4>
          ${styleHtml}
          <h4>Evolución</h4>
          ${statsGradeLineChart('Nota por sesión (0–10)', sessionGradeSeries)}
          ${statsHudLineChart('VPIP y PFR por sesión', sessionHudSeries, aggFormat)}
          ${statsBarChartRows('bb/100 diario (14d)', dailySeries, 'bbPer100', '', '--accent')}
          ${statsBarChartRows('VPIP semanal', sessionWeekly, 'vpipPct', '%', '--accent')}
          ${statsBarChartRows('PFR semanal', sessionWeekly, 'pfrPct', '%', '--gold')}
          <h4>Winrate por stakes</h4>
          ${stakesHtml}
        </div>
      </details>
    </div>`;

    box.innerHTML = `
      <div class="stats-redesign">
        <div class="stats-tabs" role="tablist" aria-label="Tipo de estadísticas">
          <button type="button" class="stats-tab${activeTab === 'trainer' ? ' active' : ''}" role="tab" aria-selected="${activeTab === 'trainer' ? 'true' : 'false'}" data-stats-tab="trainer">Entrenador</button>
          <button type="button" class="stats-tab${activeTab === 'sessions' ? ' active' : ''}" role="tab" aria-selected="${activeTab === 'sessions' ? 'true' : 'false'}" data-stats-tab="sessions">Sesiones</button>
        </div>
        ${trainerHtml}
        ${sessionsHtml}
      </div>`;
    bindStatsView();
    applyStatsTab(activeTab);
    const fmtSel = $('#stats-format-filter');
    if (fmtSel && !fmtSel.dataset.bound) {
      fmtSel.dataset.bound = '1';
      fmtSel.addEventListener('change', () => {
        window.__ptStatsFormatFilter = fmtSel.value || 'all';
        setActiveStatsTab('sessions');
        renderStats();
      });
    }

    const coachHost = $('#stats-coach');
    if (coachHost && window.PTAIReport) {
      coachHost.innerHTML = '';
      window.PTAIReport.mount(coachHost, {
        scope: 'statsGlobal',
        getData: () => {
          const stats = Store.getStats();
          const Agg = window.PTStatsAggregate;
          const listed = Store.getSessions ? Store.getSessions() : [];
          return {
            stats: stats,
            weekly: Agg ? Agg.trainerWeeklySeries(stats, 8) : (window.PTProgress ? PTProgress.buildWeeklySeries(Store.getHistory(), 8) : []),
            weeklySessions: Agg ? Agg.sessionWeeklySeries(stats, 8) : [],
            leaks: window.PTLeaks ? PTLeaks.topLeaks(Store.getErrors(), 5) : [],
            sessionLeaks: Agg ? Agg.sessionTopLeaks(stats, 5) : [],
            sessionsTotal: Agg ? Agg.sessionsTotal(stats) : null,
            sessionStreet: buildSessionDerivedStats(listed).accByStreet,
            focus: getActiveStatsTab()
          };
        },
        persist: { kind: 'stats' }
      });
    }
    scheduleSessionLeaksRebuild(st, sessions);
  }

  // ---------- Utilidades ----------
  async function runCloudSync(btn) {
    const cloud = window.PTCloud;
    if (!cloud || !cloud.isReady || !cloud.isReady()) {
      alert('Inicia sesión con Google para sincronizar entre navegadores.');
      return;
    }
    const targets = [btn, $('#account-sync'), $('#sync-cloud')].filter(Boolean);
    targets.forEach((b) => { b.disabled = true; });
    const prevLabel = btn && btn.textContent;
    if (btn) btn.textContent = 'Sincronizando…';
    try {
      const res = await cloud.syncNow();
      if (!res.ok) {
        if (window.PTAuth && PTAuth.isAuthFailureError && PTAuth.isAuthFailureError(res.reason) &&
            PTAuth.handleAuthFailure) {
          PTAuth.handleAuthFailure(res.reason || 'auth_required');
          return;
        }
        alert(res.reason === 'not_ready'
          ? 'Inicia sesión con Google para sincronizar.'
          : ('No se pudo sincronizar: ' + (res.reason || 'error')));
        return;
      }
      renderHistory();
      renderErrors();
      renderStats();
      renderSessionsList();
    } finally {
      targets.forEach((b) => { b.disabled = false; });
      if (btn && prevLabel) btn.textContent = prevLabel;
    }
  }

  function exportData() {
    const data = Store.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'poker-trainer-datos.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function goToPlay() {
    goToTab('play', { table: true });
  }

  function worstClass(decisions) {
    const order = ['optima', 'aceptable', 'imprecisa', 'error'];
    let worst = 'optima';
    (decisions || []).forEach((d) => { if (order.indexOf(d.class) > order.indexOf(worst)) worst = d.class; });
    return worst;
  }

  function verdictWord(cls) {
    return { optima: 'Óptima', aceptable: 'Aceptable', imprecisa: 'Imprecisa', error: 'Error' }[cls] || cls;
  }

  function resolveHandScoreMeta(handOrResult, decisions, totalEvLoss) {
    const src = handOrResult || {};
    if (src.handScoreMeta && src.handScoreMeta.score != null) return src.handScoreMeta;
    if (src.result && src.result.handScoreMeta && src.result.handScoreMeta.score != null) {
      return src.result.handScoreMeta;
    }
    const decs = decisions || src.decisions || (src.result && src.result.decisions) || [];
    const ev = totalEvLoss != null
      ? totalEvLoss
      : (src.totalEvLoss != null ? src.totalEvLoss : (src.result && src.result.totalEvLoss));
    if (window.GTOScoring && GTOScoring.scoreHand) return GTOScoring.scoreHand(decs, ev);
    if (src.handScore != null) {
      return { score: src.handScore, allOptimal: false, letter: 'C', label: 'Nota', verdict: '' };
    }
    return null;
  }

  function fmtHandScore(score) {
    if (score == null || Number.isNaN(Number(score))) return '—';
    const n = Number(score);
    return (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '');
  }

  function handScoreBadgeClass(meta) {
    if (!meta) return 'grade-C';
    const letter = (meta.letter || 'C').charAt(0);
    return 'grade-' + letter;
  }

  function handScoreBadgeHtml(meta, opts) {
    if (!meta || meta.score == null) return '';
    const options = opts || {};
    const scoreTxt = fmtHandScore(meta.score);
    const label = options.showLabel === false
      ? scoreTxt + '/10'
      : ('Nota ' + scoreTxt + '/10');
    return '<span class="badge ' + handScoreBadgeClass(meta) + ' hand-score-badge">' +
      escapeHtml(label) + '</span>';
  }

  function handOptimalBannerHtml(meta) {
    if (!meta) return '';
    if (meta.allOptimal) {
      return '<div class="hand-score-optimal ok">Todas las decisiones han sido óptimas</div>';
    }
    return '<div class="hand-score-optimal no">No todas las decisiones han sido óptimas</div>';
  }

  function handScoreStatCardHtml(meta) {
    if (!meta || meta.score == null) return '';
    const cls = meta.score >= 8 ? 'net-pos' : (meta.score >= 6 ? 'accent' : 'net-neg');
    return '<div class="stat-card hand-score-stat">' +
      '<div class="big ' + cls + '">' + fmtHandScore(meta.score) + '<span class="hand-score-over">/10</span></div>' +
      '<div class="lbl">Puntuación de la mano</div></div>';
  }
  function actionName(a) {
    return {
      fold: 'Fold', call: 'Call', raise: 'Subir/3-bet', bet: 'Apostar', check: 'Check',
      bet_33: 'Bet 33%', bet_66: 'Bet 66%', bet_100: 'Bet pot'
    }[a] || a;
  }
  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  const FILTER_POSITIONS = ['', 'UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const FILTER_CLASSES = ['', 'optima', 'aceptable', 'imprecisa', 'error'];
  const handListFilters = {
    history: { class: '', pos: '', dateFrom: '', dateTo: '', expOp: '', expVal: '', realOp: '', realVal: '' },
    errors: { class: '', pos: '', street: '', spotType: '', dateFrom: '', dateTo: '', expOp: '', expVal: '', realOp: '', realVal: '' },
    sessionHands: { class: '', pos: '', street: '', gameKind: '', stackBin: '', tag: '', graveOnly: '', expOp: '', expVal: '', realOp: '', realVal: '' }
  };

  function emptyHandFilters() {
    return { class: '', pos: '', street: '', spotType: '', gameKind: '', stackBin: '', tag: '', graveOnly: '', dateFrom: '', dateTo: '', expOp: '', expVal: '', realOp: '', realVal: '' };
  }

  function readHandFilters(scope) {
    const base = handListFilters[scope] || emptyHandFilters();
    return Object.assign({}, base);
  }

  function passesEvCompare(val, op, rawThreshold) {
    if (!op || rawThreshold === '' || rawThreshold == null) return true;
    const t = Number(rawThreshold);
    if (Number.isNaN(t)) return true;
    const n = Number(val);
    if (Number.isNaN(n)) return false;
    if (op === 'gte') return n >= t;
    if (op === 'lte') return n <= t;
    return true;
  }

  function passesDateRange(iso, from, to) {
    if (!from && !to) return true;
    if (!iso) return false;
    const day = String(iso).slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  }

  function handFiltersHtml(scope, opts) {
    opts = opts || {};
    const f = handListFilters[scope] || emptyHandFilters();
    const showDate = opts.showDate !== false;
    const classOpts = FILTER_CLASSES.map((c) =>
      `<option value="${c}"${f.class === c ? ' selected' : ''}>${c ? verdictWord(c) : 'Todas las clases'}</option>`
    ).join('');
    const posOpts = FILTER_POSITIONS.map((p) =>
      `<option value="${p}"${f.pos === p ? ' selected' : ''}>${p || 'Todas las posiciones'}</option>`
    ).join('');
    const cmpOpts = (sel, val) =>
      `<option value=""${!val ? ' selected' : ''}>—</option><option value="gte"${val === 'gte' ? ' selected' : ''}>≥</option><option value="lte"${val === 'lte' ? ' selected' : ''}>≤</option>`;
    const streetOpts = scope === 'sessionHands'
      ? ['', 'preflop', 'flop', 'turn', 'river'].map((st) =>
        `<option value="${st}"${f.street === st ? ' selected' : ''}>${st || 'Todas las calles'}</option>`
      ).join('')
      : '';
    const kindOpts = scope === 'sessionHands'
      ? ['', 'cash', 'spin', 'mtt', 'sng'].map((k) =>
        `<option value="${k}"${f.gameKind === k ? ' selected' : ''}>${k || 'Todo tipo'}</option>`
      ).join('')
      : '';
    const stackOpts = scope === 'sessionHands'
      ? ['', 'lt15', '15-25', '25-40', '40-100', 'gt100'].map((k) =>
        `<option value="${k}"${f.stackBin === k ? ' selected' : ''}>${k || 'Todo stack'}</option>`
      ).join('')
      : '';
    const tagSet = {};
    if (scope === 'sessionHands' && currentSession && currentSession.hands) {
      currentSession.hands.forEach((h) => {
        (h.tags || []).forEach((t) => { if (t) tagSet[t] = true; });
      });
    }
    const tagKeys = Object.keys(tagSet).sort();
    const tagOpts = scope === 'sessionHands'
      ? ([''].concat(tagKeys)).map((t) =>
        `<option value="${escapeHtml(t)}"${f.tag === t ? ' selected' : ''}>${t || 'Todos los tags'}</option>`
      ).join('')
      : '';
    const graveOpts = scope === 'sessionHands'
      ? `<label class="session-grave-filter"><input type="checkbox" data-filter-scope="${scope}" data-filter="graveOnly" value="1"${f.graveOnly ? ' checked' : ''}> Solo errores graves</label>`
      : '';
    return `
      <label>Clase<select data-filter-scope="${scope}" data-filter="class">${classOpts}</select></label>
      <label>Posición héroe<select data-filter-scope="${scope}" data-filter="pos">${posOpts}</select></label>
      ${streetOpts ? `<label>Calle peor fuga<select data-filter-scope="${scope}" data-filter="street">${streetOpts}</select></label>` : ''}
      ${kindOpts ? `<label>Tipo<select data-filter-scope="${scope}" data-filter="gameKind">${kindOpts}</select></label>` : ''}
      ${stackOpts ? `<label>Stack<select data-filter-scope="${scope}" data-filter="stackBin">${stackOpts}</select></label>` : ''}
      ${tagOpts ? `<label>Tag<select data-filter-scope="${scope}" data-filter="tag">${tagOpts}</select></label>` : ''}
      ${graveOpts}
      ${showDate ? `<label>Desde<input type="date" data-filter-scope="${scope}" data-filter="dateFrom" value="${escapeHtml(f.dateFrom || '')}"></label>
      <label>Hasta<input type="date" data-filter-scope="${scope}" data-filter="dateTo" value="${escapeHtml(f.dateTo || '')}"></label>` : ''}
      <label>EV esperado<select data-filter-scope="${scope}" data-filter="expOp">${cmpOpts('expOp', f.expOp)}</select>
        <input type="number" step="0.01" placeholder="bb" data-filter-scope="${scope}" data-filter="expVal" value="${escapeHtml(f.expVal != null ? f.expVal : '')}"></label>
      <label>EV real<select data-filter-scope="${scope}" data-filter="realOp">${cmpOpts('realOp', f.realOp)}</select>
        <input type="number" step="0.01" placeholder="bb" data-filter-scope="${scope}" data-filter="realVal" value="${escapeHtml(f.realVal != null ? f.realVal : '')}"></label>`;
  }

  function bindHandFilters(hostId, scope, onChange) {
    const host = $(hostId);
    if (!host) return;
    if (!host.dataset.bound) {
      host.dataset.bound = '1';
      host.innerHTML = handFiltersHtml(scope, { showDate: scope !== 'sessionHands' });
      host.querySelectorAll('[data-filter]').forEach((el) => {
        const handler = () => {
          const key = el.getAttribute('data-filter');
          if (el.type === 'checkbox') handListFilters[scope][key] = el.checked ? '1' : '';
          else handListFilters[scope][key] = el.value;
          if (typeof onChange === 'function') onChange();
        };
        el.addEventListener('change', handler);
        if (el.tagName === 'INPUT' && el.type !== 'checkbox') el.addEventListener('input', handler);
      });
    }
  }

  function passesHistoryFilters(h, f) {
    const worst = worstClass(h.decisions);
    if (f.class && worst !== f.class) return false;
    const pos = h.displayHeroPos || h.heroPos || '';
    if (f.pos && pos !== f.pos) return false;
    if (!passesDateRange(h.createdAt, f.dateFrom, f.dateTo)) return false;
    const realNet = roundSession(h.heroNet || 0);
    const expNet = roundSession(realNet - (h.totalEvLoss || 0));
    if (!passesEvCompare(expNet, f.expOp, f.expVal)) return false;
    if (!passesEvCompare(realNet, f.realOp, f.realVal)) return false;
    return true;
  }

  function passesErrorFilters(e, f) {
    if (f.class && e.class !== f.class) return false;
    const pos = e.displayHeroPos || e.heroPos || '';
    if (f.pos && pos !== f.pos) return false;
    if (!matchErrorLeakFilter(e, { street: f.street, spotType: f.spotType })) return false;
    if (!passesDateRange(e.createdAt, f.dateFrom, f.dateTo)) return false;
    const evLoss = Number(e.evLoss) || 0;
    if (!passesEvCompare(evLoss, f.expOp, f.expVal)) return false;
    if (!passesEvCompare(evLoss, f.realOp, f.realVal)) return false;
    return true;
  }

  function stackBinOfHand(h) {
    const bb = h && h.stackDepthBB;
    if (bb == null || Number.isNaN(Number(bb))) return '';
    const n = Number(bb);
    if (n < 15) return 'lt15';
    if (n < 25) return '15-25';
    if (n < 40) return '25-40';
    if (n <= 100) return '40-100';
    return 'gt100';
  }

  function worstStreetOfHand(h) {
    let worst = null;
    let worstLoss = -1;
    (h.decisions || []).forEach((d) => {
      const loss = Number(d.evLoss) || 0;
      if (loss > worstLoss) { worstLoss = loss; worst = d.street; }
    });
    return worst;
  }

  function handHasGraveError(h) {
    if (!h) return false;
    if (h.worstClass === 'error') return true;
    return (h.decisions || []).some((d) => d && (d.class === 'error' || (Number(d.evLoss) || 0) >= 0.5));
  }

  function passesSessionHandFilters(h, f) {
    if (f.class && h.worstClass !== f.class) return false;
    if (f.pos && h.heroPos !== f.pos) return false;
    if (f.gameKind && (h.gameKind || 'cash') !== f.gameKind) return false;
    if (f.stackBin && stackBinOfHand(h) !== f.stackBin) return false;
    if (f.street && worstStreetOfHand(h) !== f.street) return false;
    if (f.tag && !(h.tags || []).includes(f.tag)) return false;
    if (f.graveOnly && !handHasGraveError(h)) return false;
    const realNet = roundSession(h.heroNetBB || 0);
    const expNet = roundSession(realNet - (h.totalEvLoss || 0));
    if (!passesEvCompare(expNet, f.expOp, f.expVal)) return false;
    if (!passesEvCompare(realNet, f.realOp, f.realVal)) return false;
    return true;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function closeModal() {
    const modal = $('#modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('hand-end-modal');
  }

  // ============================================================
  //  SESIONES (importar, estadísticas y revisión de manos)
  // ============================================================
  let currentSession = null;
  let currentHand = null;
  let replayState = null;
  let analysisReviewReturn = false;
  const SESSION_HANDS_PAGE = 80;
  const HEAVY_OPEN_HANDS = 2000;
  let sessionHandsShown = SESSION_HANDS_PAGE;

  function showSessionsView(which) {
    $('#sessions-home').classList.toggle('hidden', which !== 'home');
    $('#session-detail').classList.toggle('hidden', which !== 'detail');
    $('#hand-review').classList.toggle('hidden', which !== 'review');
    if (which === 'review') scrollSessionReviewToTop();
  }

  function scrollSessionReviewToTop() {
    requestAnimationFrame(function () {
      if (window.scrollTo) window.scrollTo(0, 0);
      const review = $('#hand-review');
      if (review && review.scrollIntoView) review.scrollIntoView({ block: 'start' });
      const content = $('#hand-review-content');
      if (content) content.scrollTop = 0;
    });
  }

  function processSessionFile() {
    const input = $('#session-file');
    if (!input.files || !input.files.length) return;
    const files = Array.prototype.slice.call(input.files);
    const status = $('#import-status');
    const progWrap = $('#import-progress');
    const progFill = $('#import-progress-fill');
    const progLabel = $('#import-progress-label');
    let progressPhase = '';
    let progressPhaseStartedAt = 0;
    let wakeLock = null;

    const PHASE_LABELS = {
      file: 'Archivo',
      parse: 'Cargando manos',
      analyze: 'Analizando',
      stats: 'Estadísticas',
      save: 'Guardando',
      open: 'Abriendo sesión'
    };

    function fmtEta(ms) {
      if (!isFinite(ms) || ms < 0) return '';
      const s = Math.round(ms / 1000);
      if (s < 5) return 'unos segundos';
      if (s < 90) return s + ' s';
      const m = Math.floor(s / 60);
      const r = s % 60;
      if (m < 60) return r ? (m + ' min ' + r + ' s') : (m + ' min');
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return h + ' h ' + mm + ' min';
    }

    function setImportBusy(on) {
      window.PTBusy = window.PTBusy || {};
      window.PTBusy.import = !!on;
      if (window.PTPwa && window.PTPwa.setImportBusy) window.PTPwa.setImportBusy(on);
    }

    async function requestWakeLock() {
      try {
        if (navigator.wakeLock && navigator.wakeLock.request) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (e) { wakeLock = null; }
    }

    async function releaseWakeLock() {
      try { if (wakeLock) await wakeLock.release(); } catch (e) { /* ignore */ }
      wakeLock = null;
    }

    function onImportVisibility() {
      if (document.visibilityState === 'visible' && window.PTBusy && window.PTBusy.import) {
        void requestWakeLock();
      }
    }

    function setProgress(done, total, phase, fileLabel) {
      const now = Date.now();
      if (phase && phase !== progressPhase) {
        progressPhase = phase;
        progressPhaseStartedAt = now;
      }
      const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
      if (progWrap) progWrap.classList.remove('hidden');
      if (progFill) progFill.style.width = pct + '%';
      const phaseLbl = PHASE_LABELS[phase] || 'Procesando';
      const prefix = fileLabel ? (fileLabel + ' · ') : '';
      let counts = '';
      if (total) {
        counts = ' ' + Number(done).toLocaleString('es-ES') + ' / ' + Number(total).toLocaleString('es-ES')
          + ' (' + pct + '%)';
      }
      let etaTxt = '';
      if (total && done > 0 && done < total) {
        const elapsed = now - progressPhaseStartedAt;
        etaTxt = ' · quedan ' + fmtEta((elapsed / done) * (total - done));
      } else if (total && done >= total) {
        etaTxt = ' · un momento…';
      } else {
        etaTxt = ' · calculando tiempo…';
      }
      const line = prefix + phaseLbl + counts + etaTxt;
      if (progLabel) progLabel.textContent = line;
      if (status) status.textContent = line;
    }

    function hideProgress() {
      if (progWrap) progWrap.classList.add('hidden');
      if (progFill) progFill.style.width = '0%';
    }

    function readFileText(file) {
      return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = function () { reject(new Error('No se pudo leer ' + file.name)); };
        reader.readAsText(file, 'utf-8');
      });
    }

    async function processOneFile(file, fileIndex, fileTotal) {
      const fileLabel = fileTotal > 1
        ? ('Archivo ' + (fileIndex + 1) + '/' + fileTotal + ' · ' + file.name)
        : file.name;
      setProgress(0, 1, 'parse', fileLabel);
      status.textContent = 'Leyendo ' + file.name + '…';
      const text = await readFileText(file);
      const fmtMeta = Importer.detectSessionFormat ? Importer.detectSessionFormat(text) : null;
      const parseFn = Importer.parseSessionAsync || function (t, n, cb) {
        return Promise.resolve(Importer.parseSession(t, n));
      };
      const parsed = await parseFn(text, file.name, function (done, total, phase) {
        setProgress(done, total, phase || 'parse', fileLabel);
      });
      const isTournamentSummary = !!(parsed && parsed.source === 'tournamentSummary');
      if (!isTournamentSummary && (!parsed.hero || !parsed.hands.length)) {
        const errMsg = (Importer.importFailureMessage
          ? Importer.importFailureMessage(file.name, text, parsed)
          : ('No se reconocieron manos NLHE (cash/spins/torneo) en «' + file.name
            + '». Comprueba que sea un historial de manos de PokerStars, Winamax, GGPoker, 888poker o CoinPoker.'));
        return { ok: false, error: errMsg };
      }
      if (isTournamentSummary && !parsed.hero) {
        return {
          ok: false,
          error: 'No se pudo leer el héroe en el Tournament History «' + file.name + '».'
        };
      }
      const Ent = window.PTEntitlements;
      if (Ent && Ent.ensureLoaded) {
        const ent = await Ent.ensureLoaded();
        const handCount = isTournamentSummary ? 0 : parsed.hands.length;
        const check = Ent.canImportSession(handCount, ent);
        if (!check.ok) {
          return { ok: false, paywall: check.reason, error: check.reason };
        }
      }
      if (Importer.needsHeroConfirmation && Importer.needsHeroConfirmation(parsed)) {
        const cands = Importer.heroCandidatesFromParsed
          ? Importer.heroCandidatesFromParsed(parsed)
          : (parsed.heroCandidates || []);
        const chosen = await pickImportHero(cands, parsed.hero, file.name);
        if (!chosen) {
          return { ok: false, error: 'Importación cancelada: falta confirmar el nick héroe.' };
        }
        parsed.hero = chosen;
        parsed.heroConfirmed = true;
        parsed.filterHero = true;
      }
      const onProgress = function (done, total, phase) {
        setProgress(done, total, phase || 'analyze', fileLabel);
      };
      let session;
      try {
        session = Importer.buildSessionAsync
          ? await Importer.buildSessionAsync(parsed, file.name, onProgress, text)
          : Importer.buildSession(parsed, file.name, text);
      } catch (analyzeErr) {
        return {
          ok: false,
          error: (analyzeErr && analyzeErr.message) || ('No se pudo analizar «' + file.name + '».')
        };
      }
      const handsImported = (session.hands || []).length
        || (session.stats && session.stats.nHands)
        || 0;
      if (Ent && Ent.recordImportSession && handsImported) {
        const rec = await Ent.recordImportSession(handsImported);
        if (rec && rec.ok === false) {
          return { ok: false, paywall: rec.error, error: rec.error };
        }
      }
      session.freshImport = true;
      setProgress(0, 1, 'save', fileLabel);
      const saveResult = await Store.saveSession(session, onProgress);
      const saved = saveResult && saveResult.ok !== false;
      const finalSession = (saveResult && saveResult.session) ? saveResult.session : session;
      if (window.PTAnalytics && PTAnalytics.trackImportSession) {
        PTAnalytics.trackImportSession({
          hands: (finalSession.hands && finalSession.hands.length) || handsImported,
          platform: finalSession.format && finalSession.format.platform
        });
      }
      return {
        ok: saved,
        saved: saved,
        cloudOnly: !!(saveResult && saveResult.cloudOnly),
        saveError: saveResult && saveResult.error,
        error: (!saved && saveResult && saveResult.error) || null,
        session: finalSession,
        handsImported: (finalSession.hands && finalSession.hands.length) || handsImported,
        sessionParts: 1,
        format: finalSession.format || parsed.format || fmtMeta
      };
    }

    (async function () {
      setImportBusy(true);
      document.addEventListener('visibilitychange', onImportVisibility);
      await requestWakeLock();
      try {
        const results = [];
        let lastOk = null;
        for (let i = 0; i < files.length; i++) {
          setProgress(i, files.length, 'file', files[i].name);
          const res = await processOneFile(files[i], i, files.length);
          results.push(Object.assign({ fileName: files[i].name }, res));
          if (res.ok) lastOk = res.session;
          else if (res.paywall) {
            if (window.PTBilling) window.PTBilling.showPaywall(res.paywall);
            break;
          }
        }
        const ok = results.filter(function (r) { return r.ok; });
        const fail = results.filter(function (r) { return !r.ok && !r.paywall; });
        const hands = ok.reduce(function (n, r) {
          return n + (r.handsImported != null
            ? r.handsImported
            : ((r.session && r.session.hands) || []).length);
        }, 0);
        let msg = '';
        if (ok.length) {
          const partN = ok.reduce(function (n, r) { return n + (r.sessionParts || 1); }, 0);
          msg = '<span style="color:var(--green)">' + ok.length + ' archivo(s) · ' +
            hands.toLocaleString('es-ES') + ' manos analizadas</span>';
          if (partN > ok.length) {
            msg += ' <span class="muted-text">(' + partN + ' sesiones)</span>';
          }
          const mixBits = [];
          ok.forEach(function (r) {
            const mix = r.session && r.session.context && r.session.context.mix;
            if (!mix) return;
            if (mix.cash) mixBits.push(mix.cash + ' cash');
            if (mix.spin) mixBits.push(mix.spin + ' spin');
            if (mix.mtt) mixBits.push(mix.mtt + ' MTT');
            if (mix.sng) mixBits.push(mix.sng + ' SNG');
          });
          if (mixBits.length) {
            msg += ' <span class="muted-text">(' + escapeHtml(mixBits.join(', ')) + ')</span>';
          }
          if (fail.length) {
            msg += ' <span style="color:var(--yellow)">· ' + fail.length + ' con error</span>';
          }
          ok.forEach(function (r) {
            if (r.saveError) {
              msg += ' <span style="color:var(--yellow)">· ' + escapeHtml(r.saveError) + '</span>';
            }
          });
        } else if (fail.length) {
          msg = '<span style="color:var(--red)">' + escapeHtml(fail[0].error || 'No se pudo importar') + '</span>';
        }
        if (fail.length > 1) {
          msg += '<ul class="muted-text" style="margin:8px 0 0;padding-left:18px">' +
            fail.map(function (f) {
              return '<li>' + escapeHtml(f.fileName) + ': ' + escapeHtml(f.error || 'error') + '</li>';
            }).join('') + '</ul>';
        }
        input.value = '';
        $('#process-session').disabled = true;
        if (lastOk) {
          sessionsListTab = sessionBucket(lastOk);
          try { sessionStorage.setItem('pt_sessions_tab', sessionsListTab); } catch (e) { /* ignore */ }
        }
        renderSessionsList();
        if (lastOk) {
          setProgress(0, 1, 'open', lastOk.fileName);
          await openSession(lastOk.id, lastOk, { skipHeavyPrep: true });
        }
        if (status) status.innerHTML = msg || '';
      } catch (err) {
        if (status) {
          status.innerHTML = '<span style="color:var(--red)">Error al procesar: ' +
            escapeHtml(err.message || String(err)) + '</span>';
        }
        console.error('[Sessions] multi import failed', err);
      } finally {
        hideProgress();
        setImportBusy(false);
        document.removeEventListener('visibilitychange', onImportVisibility);
        await releaseWakeLock();
      }
    })();
  }

  function streetAccSummary(accByStreet) {
    if (!accByStreet) return '';
    const labels = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
    return ['preflop', 'flop', 'turn', 'river'].map((st) => {
      const v = accByStreet[st];
      return v != null ? `${labels[st]} ${v}%` : `${labels[st]} —`;
    }).join(' · ');
  }

  async function refreshSessionsFromCloud() {
    const cloud = window.PTCloud;
    if (!cloud || !cloud.isReady || !cloud.isReady()) return;
    const status = $('#import-status');
    const prev = status ? status.textContent : '';
    if (status) status.textContent = 'Sincronizando sesiones…';
    try {
      if (Store.refreshSessionsIndexFromCloud) {
        const res = await Store.refreshSessionsIndexFromCloud();
        if (res && res.ok) renderSessionsList();
        else if (res && res.error) console.warn('[Sessions] cloud list', res.error);
      }
      const res = await cloud.syncNow();
      if (res && res.ok && Store.refreshSessionsIndexFromCloud) {
        await Store.refreshSessionsIndexFromCloud();
        renderSessionsList();
      }
    } catch (e) {
      console.warn('[Sessions] cloud sync', e);
    } finally {
      if (status && !prev) status.textContent = '';
      else if (status) status.textContent = prev;
    }
  }

  function renderSessionsList() {
    const sessions = Store.getSessions();
    const box = $('#sessions-list');
    const isSample = (s) => window.PTSampleSession && window.PTSampleSession.isSampleSession
      ? window.PTSampleSession.isSampleSession(s) : s.id === 'pt_sample_session_v1';
    const counts = { cash: 0, spin: 0, mtt: 0 };
    sessions.forEach((s) => { counts[sessionBucket(s)] = (counts[sessionBucket(s)] || 0) + 1; });
    $$('.sessions-kind-tab').forEach((btn) => {
      const tab = btn.getAttribute('data-sessions-tab');
      const on = tab === sessionsListTab;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('[data-tab-count]').forEach((el) => {
      const k = el.getAttribute('data-tab-count');
      el.textContent = String(counts[k] || 0);
    });
    const hint = $('#sessions-tab-hint');
    if (hint) hint.textContent = sessionsTabHint(sessionsListTab);

    const filtered = sessions.filter((s) => sessionBucket(s) === sessionsListTab);
    if (!sessions.length) {
      box.innerHTML = '<div class="empty">No hay sesiones. Añade un fichero .txt arriba.</div>';
      return;
    }
    if (!filtered.length) {
      box.innerHTML = '<div class="empty">No hay sesiones en «'
        + (sessionsListTab === 'spin' ? 'Spins' : (sessionsListTab === 'mtt' ? 'Torneos' : 'Cash'))
        + '». Importa un historial o cambia de pestaña.</div>';
      return;
    }
    box.innerHTML = filtered.map((s) => {
      const st = s.stats || {};
      const isSummary = s.source === 'tournamentSummary' || st.source === 'tournamentSummary';
      const sampleBadge = isSample(s) ? '<span class="session-sample-badge">Ejemplo</span>' : '';
      if (isSummary) {
        const profit = st.profitEuro != null ? st.profitEuro : 0;
        const pCls = profit >= 0 ? 'net-pos' : 'net-neg';
        const place = st.finishPlace != null ? (st.finishPlace + 'º') : '—';
        const roi = st.roiPct != null ? (' · ROI ' + st.roiPct + '%') : '';
        const bounty = st.bountyCollected ? (' · Bounties +' + Number(st.bountyCollected).toFixed(2) + '€') : '';
        return `<div class="record session-card">
          <div class="rec-main">
            <div class="rec-scenario">${escapeHtml(s.fileName)}${sampleBadge} <span class="badge">Resultados</span> ${sessionContextBadgesHtml(s)}</div>
            <div class="rec-sub">Héroe: <strong>${escapeHtml(s.hero)}</strong> · Puesto ${place} · ${fmtDate(s.createdAt)}</div>
            <div class="rec-sub"><span class="${pCls}">${profit >= 0 ? '+' : ''}${Number(profit).toFixed(2)}€</span>${roi}${bounty}${st.stakesLabel ? ' · ' + escapeHtml(st.stakesLabel) : ''}</div>
            <div class="rec-sub muted-text" style="font-size:12px">Tournament History · sin manos GTO (importa Hand History para revisar decisiones)</div>
          </div>
          <div class="rec-right" style="display:flex;flex-direction:column;gap:6px">
            <button class="btn btn-primary" style="padding:6px 12px;font-size:13px" data-open="${s.id}">Ver resumen</button>
            <button class="btn btn-danger" style="padding:4px 10px;font-size:12px" data-delses="${s.id}">Borrar sesión</button>
          </div>
        </div>`;
      }
      const netCls = (st.netBB || 0) >= 0 ? 'net-pos' : 'net-neg';
      const gradeLetter = st.grade && st.grade.letter ? st.grade.letter[0] : 'C';
      const acc = st.accuracy != null ? st.accuracy + '%' : '—';
      return `<div class="record session-card">
        <div class="rec-main">
          <div class="rec-scenario">${escapeHtml(s.fileName)}${sampleBadge} <span class="badge grade-${gradeLetter}">Nota ${st.grade ? st.grade.letter : '—'}</span> ${sessionContextBadgesHtml(s)}</div>
          <div class="rec-sub">Héroe: <strong>${escapeHtml(s.hero)}</strong> · ${st.nHands || 0} manos · ${fmtDate(s.createdAt)}</div>
          <div class="rec-sub">Acierto ${acc} · <span class="${netCls}">${(st.netBB || 0) >= 0 ? '+' : ''}${fmtBB(st.netBB || 0)} bb</span> · EV perdido -${fmtBB(st.evLossBB || 0)} bb${st.roiPct != null ? ' · ROI ' + st.roiPct + '%' : ''}</div>
          <div class="rec-sub muted-text" style="font-size:12px">${streetAccSummary(st.accByStreet)}</div>
        </div>
        <div class="rec-right" style="display:flex;flex-direction:column;gap:6px">
          <button class="btn btn-primary" style="padding:6px 12px;font-size:13px" data-open="${s.id}">Revisar manos</button>
          <button class="btn btn-danger" style="padding:4px 10px;font-size:12px" data-delses="${s.id}">Borrar sesión</button>
        </div>
      </div>`;
    }).join('');
    $$('#sessions-list [data-open]').forEach((b) => b.addEventListener('click', () => openSession(b.dataset.open)));
    $$('#sessions-list [data-delses]').forEach((b) => b.addEventListener('click', async () => {
      if (confirm('¿Borrar la sesión completa? Esta acción no se puede deshacer.')) {
        await Store.removeSession(b.dataset.delses);
        renderSessionsList();
      }
    }));
  }

  // ---- Auto-import carpeta HH (IMP-38) ----
  function stopAutoImportFolder() {
    if (autoImportState.timer) {
      clearInterval(autoImportState.timer);
      autoImportState.timer = null;
    }
    autoImportState.handle = null;
    const stop = $('#auto-import-stop');
    const start = $('#auto-import-folder');
    if (stop) stop.classList.add('hidden');
    if (start) start.classList.remove('hidden');
    const st = $('#auto-import-status');
    if (st) st.textContent = 'Vigilancia detenida.';
  }

  async function scanAutoImportFolder() {
    const dir = autoImportState.handle;
    if (!dir) return;
    const status = $('#auto-import-status');
    const toImport = [];
    try {
      for await (const [name, handle] of dir.entries()) {
        if (!handle || handle.kind !== 'file') continue;
        if (!/\.txt$/i.test(name)) continue;
        const key = name + ':' + (handle.name || name);
        if (autoImportState.seen[key]) continue;
        const file = await handle.getFile();
        const stamp = file.lastModified + ':' + file.size;
        if (autoImportState.seen[key] === stamp) continue;
        autoImportState.seen[key] = stamp;
        toImport.push(file);
      }
    } catch (e) {
      if (status) status.textContent = 'No se pudo leer la carpeta (permiso revocado?).';
      stopAutoImportFolder();
      return;
    }
    if (!toImport.length) {
      if (status) status.textContent = 'Vigilando «' + (dir.name || 'carpeta') + '»… sin archivos nuevos.';
      return;
    }
    if (status) status.textContent = 'Importando ' + toImport.length + ' archivo(s) nuevos…';
    // Reutilizar processSessionFile vía DataTransfer simulado
    const input = $('#session-file');
    if (!input) return;
    try {
      const dt = new DataTransfer();
      toImport.forEach((f) => dt.items.add(f));
      input.files = dt.files;
      $('#process-session').disabled = false;
      processSessionFile();
    } catch (e) {
      if (status) status.textContent = 'Auto-import: ' + (e.message || 'error al encolar archivos');
    }
  }

  async function startAutoImportFolder() {
    const status = $('#auto-import-status');
    if (!window.showDirectoryPicker) {
      if (status) {
        status.textContent = 'Tu navegador no soporta vigilancia de carpeta (usa Chrome/Edge). Puedes seguir subiendo .txt a mano.';
      }
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      autoImportState.handle = handle;
      autoImportState.seen = {};
      const stop = $('#auto-import-stop');
      const start = $('#auto-import-folder');
      if (stop) stop.classList.remove('hidden');
      if (start) start.classList.add('hidden');
      if (status) status.textContent = 'Vigilando «' + (handle.name || 'carpeta') + '» cada 15s…';
      await scanAutoImportFolder();
      if (autoImportState.timer) clearInterval(autoImportState.timer);
      autoImportState.timer = setInterval(() => { void scanAutoImportFolder(); }, 15000);
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      if (status) status.textContent = 'No se pudo abrir la carpeta.';
    }
  }

  function sessionLoadingHtml(message) {
    return '<div class="session-loading">' +
      '<div class="play-boot-spinner" aria-hidden="true"></div>' +
      '<p class="muted-text">' + escapeHtml(message || 'Cargando sesión…') + '</p>' +
      '</div>';
  }

  function showSessionLoading(message) {
    showSessionsView('detail');
    const detailBox = $('#session-detail-content');
    if (detailBox) detailBox.innerHTML = sessionLoadingHtml(message);
  }

  function pickImportHero(candidates, defaultHero, fileName) {
    return new Promise(function (resolve) {
      const list = (candidates || []).slice();
      if (!list.length) { resolve(defaultHero || null); return; }
      const modal = $('#modal');
      const body = $('#modal-content') || modal;
      if (!modal || !body) {
        const names = list.map((c) => c.name + ' (' + c.hands + ')').join('\n');
        const pick = window.prompt(
          'Varios nicks héroe en «' + (fileName || 'archivo') + '». Escribe el nick:\n' + names,
          defaultHero || list[0].name
        );
        resolve(pick || null);
        return;
      }
      const opts = list.map((c, i) =>
        `<label class="hero-pick-row" style="display:flex;gap:8px;align-items:center;margin:6px 0">
          <input type="radio" name="import-hero" value="${escapeHtml(c.name)}"${(c.name === defaultHero || (!defaultHero && i === 0)) ? ' checked' : ''}>
          <span><strong>${escapeHtml(c.name)}</strong> <span class="muted-text">· ${c.hands} manos</span></span>
        </label>`
      ).join('');
      body.innerHTML = `<h3>Confirmar nick héroe</h3>
        <p class="muted-text">«${escapeHtml(fileName || '')}» tiene varios nicks con cartas hero (HH compartido / equipo). Elige el tuyo:</p>
        <div class="hero-pick-list">${opts}</div>
        <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">
          <button type="button" class="btn secondary" id="hero-pick-cancel">Cancelar</button>
          <button type="button" class="btn btn-primary" id="hero-pick-ok">Analizar</button>
        </div>`;
      modal.classList.remove('hidden');
      const finish = (val) => {
        modal.classList.add('hidden');
        resolve(val);
      };
      const ok = body.querySelector('#hero-pick-ok');
      const cancel = body.querySelector('#hero-pick-cancel');
      if (ok) ok.onclick = () => {
        const sel = body.querySelector('input[name="import-hero"]:checked');
        finish(sel ? sel.value : null);
      };
      if (cancel) cancel.onclick = () => finish(null);
    });
  }

  async function reanalyzeCurrentSession() {
    if (!currentSession || !currentSession.hands || !Importer.recomputeHandDecisions) return;
    showSessionLoading('Reanalizando con motor ' + (window.PT_BUILD || '') + '…');
    const buildVer = window.PT_BUILD || '';
    currentSession.hands.forEach((h) => {
      if (Importer.ensureAnalyzedHandContext) Importer.ensureAnalyzedHandContext(h);
      Importer.recomputeHandDecisions(h);
      if (Importer.buildHandTags) h.tags = Importer.buildHandTags(h);
    });
    currentSession.stats = Importer.computeStats(currentSession.hands);
    if (window.PTHHUtils && PTHHUtils.buildSessionContext) {
      currentSession.context = PTHHUtils.buildSessionContext(
        currentSession.hands,
        currentSession.nDiscardedByReason || null
      );
    }
    currentSession.analysisVersion = buildVer;
    currentSession.pendingReanalyze = false;
    await Store.saveSession(currentSession);
    renderSessionDetail('evLoss');
    showSessionsView('detail');
  }

  async function openSession(id, sessionObj, opts) {
    opts = opts || {};
    showSessionLoading('Cargando sesión…');
    currentSession = sessionObj || await Store.getSessionAsync(id);
    if (!currentSession || !currentSession.hands) {
      const stub = Store.getSession(id);
      if (stub && stub.cloudOnly) {
        showSessionLoading('Cargando sesión desde la nube…');
        currentSession = await Store.getSessionAsync(id);
      }
    }
    if (!currentSession || !currentSession.hands) {
      $('#import-status').innerHTML = '<span style="color:var(--red)">No se encontró la sesión guardada.</span>';
      return;
    }
    const buildVer = window.PT_BUILD || '';
    const isTournamentSummary = currentSession.source === 'tournamentSummary'
      || (currentSession.stats && currentSession.stats.source === 'tournamentSummary');
    const nHands = (currentSession.hands || []).length;
    const skipHeavy = !!(opts.skipHeavyPrep || currentSession.freshImport || nHands > HEAVY_OPEN_HANDS);
    currentSession.freshImport = false;
    if (!isTournamentSummary && Importer.ensureAnalyzedHandContext && !skipHeavy) {
      currentSession.hands.forEach((h) => Importer.ensureAnalyzedHandContext(h));
    }
    const versionMismatch = !isTournamentSummary
      && !!(buildVer && currentSession.analysisVersion && currentSession.analysisVersion !== buildVer);
    currentSession.pendingReanalyze = versionMismatch;
    const needsHudStats = !skipHeavy && !isTournamentSummary && Importer.computeStats
      && (!currentSession.stats || currentSession.stats.vpipPct == null || currentSession.stats.pfrPct == null
        || currentSession.stats.vpipHands == null || currentSession.stats.pfrHands == null
        || currentSession.stats.threeBetOpps == null || currentSession.stats.style == null
        || currentSession.stats.cbetFlopOpps == null || currentSession.stats.afCalls == null
        || currentSession.stats.sawFlopN == null || currentSession.stats.squeezeOpps == null
        || currentSession.stats.cbetTurnOpps == null || currentSession.stats.bbPer100 == null
        || currentSession.stats.formatKey == null || currentSession.stats.fourBetOpps == null
        || currentSession.stats.limpOpps == null || currentSession.stats.delayedCbetOpps == null
        || !currentSession.context);
    // Sesiones guardadas con collected vacío marcaban −stack en wins con side pot.
    let netFixed = false;
    if (!skipHeavy && Importer.recomputeHeroNet) {
      currentSession.hands.forEach((h) => {
        const before = h.heroNetBB;
        const hasCollected = h.collected && Object.keys(h.collected).some((k) => (h.collected[k] || 0) > 0);
        if (hasCollected) return;
        Importer.recomputeHeroNet(h);
        if (h.heroNetBB !== before) netFixed = true;
      });
    }
    // Tags ligeros si faltan (sin re-score GTO)
    let tagsFixed = false;
    if (!skipHeavy && Importer.buildHandTags) {
      currentSession.hands.forEach((h) => {
        if (!h.tags || !h.tags.length) {
          h.tags = Importer.buildHandTags(h);
          tagsFixed = true;
        }
      });
    }
    if ((netFixed || needsHudStats) && Importer.computeStats) {
      currentSession.stats = Importer.computeStats(currentSession.hands);
      if (window.PTHHUtils && PTHHUtils.buildSessionContext) {
        currentSession.context = PTHHUtils.buildSessionContext(
          currentSession.hands,
          currentSession.nDiscardedByReason || null
        );
      }
      await Store.saveSession(currentSession);
    } else if (tagsFixed) {
      await Store.saveSession(currentSession);
    }
    sessionHandsShown = SESSION_HANDS_PAGE;
    renderSessionDetail('evLoss');
    showSessionsView('detail');
  }

  function renderSessionDetail(sortBy) {
    sessionHandsShown = SESSION_HANDS_PAGE;
    const s = currentSession;
    if (!s || !s.stats) {
      $('#session-detail-content').innerHTML = '<p class="muted-text">No hay datos de sesión para mostrar.</p>';
      return;
    }
    const st = s.stats;
    const box = $('#session-detail-content');
    const isSummary = s.source === 'tournamentSummary' || st.source === 'tournamentSummary';
    if (isSummary) {
      const profit = st.profitEuro != null ? st.profitEuro : 0;
      const pCls = profit >= 0 ? 'net-pos' : 'net-neg';
      const t = s.tournament || {};
      box.innerHTML = `
        <h2>${escapeHtml(s.fileName)} <span class="badge">Resultados</span> ${sessionContextBadgesHtml(s)}</h2>
        <p class="muted-text">${escapeHtml((st.grade && st.grade.verdict) || 'Tournament History de PokerStars (sin manos).')}</p>
        <div class="stats-content">
          <div class="stat-card"><div class="big">${st.finishPlace != null ? st.finishPlace + 'º' : '—'}</div><div class="lbl">Puesto</div></div>
          <div class="stat-card"><div class="big ${pCls}">${profit >= 0 ? '+' : ''}${Number(profit).toFixed(2)}€</div><div class="lbl">Profit €</div></div>
          ${st.roiPct != null ? `<div class="stat-card"><div class="big">${st.roiPct}%</div><div class="lbl">ROI</div></div>` : ''}
          <div class="stat-card"><div class="big">${st.avgBuyIn != null ? Number(st.avgBuyIn).toFixed(2) + '€' : '—'}</div><div class="lbl">Buy-in total</div></div>
          <div class="stat-card"><div class="big">${Number(st.cashPrize || 0).toFixed(2)}€</div><div class="lbl">Premio mesa</div></div>
          <div class="stat-card"><div class="big">${Number(st.bountyCollected || 0).toFixed(2)}€</div><div class="lbl">Bounties (${st.bountyCount || 0})</div></div>
          <div class="stat-card"><div class="big">${st.players != null ? st.players : '—'}</div><div class="lbl">Jugadores</div></div>
          <div class="stat-card"><div class="big">${st.prizePool != null ? Number(st.prizePool).toFixed(2) + '€' : '—'}</div><div class="lbl">Prize pool</div></div>
        </div>
        <div class="card-box" style="margin-top:14px">
          <h3>Detalle</h3>
          <p class="muted-text" style="margin:0;font-size:13px">
            Héroe: <strong>${escapeHtml(s.hero)}</strong>
            ${st.tournamentId || t.id ? ' · Torneo #' + escapeHtml(String(st.tournamentId || t.id)) : ''}
            ${st.stakesLabel ? ' · ' + escapeHtml(st.stakesLabel) : ''}
            · ${fmtDate(s.createdAt)}
          </p>
          <p class="muted-text" style="margin:10px 0 0;font-size:12px">
            Este archivo es un resumen de resultados. Para análisis GTO y revisión de manos, exporta el
            <strong>Hand History</strong> del mismo torneo desde PokerStars.
          </p>
        </div>`;
      return;
    }
    const netCls = st.netBB >= 0 ? 'net-pos' : 'net-neg';
    const accSt = st.accByStreet;

    const fmtKey = resolveStatsFormat(st);
    const buildVer = window.PT_BUILD || '';
    const reanalyzeBanner = s.pendingReanalyze
      ? `<div class="card-box session-reanalyze-banner" style="margin-bottom:12px;border-color:var(--yellow)">
          <strong>Motor nuevo disponible</strong>
          <span class="muted-text"> · Analizado con ${escapeHtml(s.analysisVersion || '?')} · actual ${escapeHtml(buildVer)}</span>
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <button type="button" class="btn btn-primary btn-sm" id="btn-reanalyze-session">Reanalizar con motor nuevo</button>
            <span class="muted-text" style="font-size:12px">Rescorea decisiones GTO y stats HUD (puede tardar en sesiones grandes).</span>
          </div>
        </div>`
      : '';
    const graveN = (s.hands || []).filter(handHasGraveError).length;
    const gradeLetter = st.grade && st.grade.letter ? String(st.grade.letter)[0] : 'C';
    const gradeScore = st.grade && st.grade.score != null ? st.grade.score : '—';
    const statHtml = `
      ${reanalyzeBanner}
      <h2>${escapeHtml(s.fileName)} <span class="badge grade-${gradeLetter}">Nota ${st.grade ? st.grade.letter : '—'} · ${gradeScore}/10</span> ${sessionContextBadgesHtml(s)}</h2>
      <p class="muted-text">${escapeHtml(st.grade.verdict)}</p>
      <p class="muted-text" style="font-size:12px">${escapeHtml(importDiscardSummaryHtml(s))} · Formato coaching: <strong>${escapeHtml(formatDisplayLabel(fmtKey))}</strong>${st.shortHandedShare > 20 ? ' · Mesa corta ~' + st.shortHandedShare + '%' : ''}</p>
      <div class="session-export-bar">
        <span class="muted-text" data-i18n="export.session">Exportar informe</span>
        <label class="session-export-errors"><input type="checkbox" id="session-export-errors-only" /> <span data-i18n="export.errorsOnly">Solo manos con fuga</span></label>
        <button type="button" class="btn btn-ghost btn-sm" data-export-session="json" data-i18n="export.json">JSON</button>
        <button type="button" class="btn btn-ghost btn-sm" data-export-session="csv" data-i18n="export.csv">CSV</button>
        <button type="button" class="btn btn-ghost btn-sm" data-export-session="pdf" data-i18n="export.pdf">PDF / Imprimir</button>
      </div>
      <div class="stats-content" data-style-format="${escapeHtml(fmtKey)}">
        ${explainableStatCard('nHands', 'Manos jugadas', String(st.nHands), fmtKey)}
        ${explainableStatCard('netBB', 'bb ganadas/perdidas', `${st.netBB >= 0 ? '+' : ''}${fmtBB(st.netBB)}`, fmtKey, netCls)}
        ${explainableStatCard('accuracy', 'Acierto global', `${st.accuracy}%`, fmtKey)}
        ${explainableStatCard('evLoss', 'EV perdido total (bb)', `-${fmtBB(st.evLossBB)}`, fmtKey, 'net-neg')}
        ${st.avgHandScore != null ? `<div class="stat-card"><div class="big">${fmtHandScore(st.avgHandScore)}<span class="hand-score-over">/10</span></div><div class="lbl">Nota media por mano</div></div>` : ''}
        ${explainableStatCard('vpip', 'VPIP', fmtHudPct(st.vpipPct), fmtKey)}
        ${explainableStatCard('pfr', 'PFR', fmtHudPct(st.pfrPct), fmtKey)}
        ${explainableStatCard('bbPer100', 'bb/100', fmtHudAf(st.bbPer100), fmtKey)}
        ${explainableStatCard('wtsd', 'WTSD', fmtHudPct(st.wtsdPct), fmtKey)}
        ${st.fourBetPct != null ? explainableStatCard('threeBet', '4-Bet', fmtHudPct(st.fourBetPct), fmtKey) : ''}
        ${st.limpPct != null ? explainableStatCard('vpip', 'Limp %', fmtHudPct(st.limpPct), fmtKey) : ''}
        ${st.delayedCbetPct != null ? explainableStatCard('cbetTurn', 'Delayed C-Bet', fmtHudPct(st.delayedCbetPct), fmtKey) : ''}
        ${st.roiPct != null ? `<div class="stat-card"><div class="big">${st.roiPct}%</div><div class="lbl">ROI (aprox.)</div></div>` : ''}
        ${st.profitEuro != null && (st.gameKind === 'spin' || st.gameKind === 'mtt' || st.gameKind === 'sng') ? `<div class="stat-card"><div class="big ${st.profitEuro >= 0 ? 'net-pos' : 'net-neg'}">${st.profitEuro >= 0 ? '+' : ''}${st.profitEuro.toFixed(2)}€</div><div class="lbl">Profit €</div></div>` : ''}
      </div>
      ${(st.bbPer100CI || (st.style && st.style.bbPer100CI)) ? `<p class="muted-text stats-section-note">bb/100 IC95%: ${fmtHudAf((st.bbPer100CI || st.style.bbPer100CI).low)} … ${fmtHudAf((st.bbPer100CI || st.style.bbPer100CI).high)}${st.bbPer100Note ? ' · ' + escapeHtml(st.bbPer100Note) : ''}</p>` : (st.bbPer100Note ? `<p class="muted-text stats-section-note">${escapeHtml(st.bbPer100Note)}</p>` : '')}
      ${sessionHudCommentHtml(st)}
      <div class="card-box" style="margin-top:14px">
        <h3>Acierto por calle</h3>
        <div class="street-acc">
          ${streetAccBar('Preflop', accSt.preflop)}
          ${streetAccBar('Flop', accSt.flop)}
          ${streetAccBar('Turn', accSt.turn)}
          ${streetAccBar('River', accSt.river)}
        </div>
      </div>
      <div class="card-box">
        <h3>EV esperado vs resultado real</h3>
        <div class="stats-content" style="margin-bottom:12px">
          <div class="stat-card"><div class="big ${st.expectedNet >= 0 ? 'net-pos' : 'net-neg'}">${st.expectedNet >= 0 ? '+' : ''}${fmtBB(st.expectedNet != null ? st.expectedNet : (st.actualNet - st.evDecision))}</div><div class="lbl">EV esperado (sin fugas)</div></div>
          <div class="stat-card"><div class="big ${netCls}">${st.actualNet != null ? (st.actualNet >= 0 ? '+' : '') + fmtBB(st.actualNet) : (st.netBB >= 0 ? '+' : '') + fmtBB(st.netBB)}</div><div class="lbl">Resultado real</div></div>
          <div class="stat-card"><div class="big ${st.varianceAdj >= 0 ? 'net-pos' : 'net-neg'}">${st.varianceAdj >= 0 ? '+' : ''}${fmtBB(st.varianceAdj)}</div><div class="lbl">Varianza / suerte</div></div>
        </div>
        <div class="dist-bar">
          <span style="width:${st.pctDecision}%;background:var(--red)">${st.pctDecision}% fugas</span>
          <span style="width:${st.pctVariance}%;background:var(--accent)">${st.pctVariance}% varianza</span>
        </div>
        <div class="muted-text" style="margin-top:8px">
          EV perdido por fugas: <strong>-${fmtBB(st.evDecision)} bb</strong>${st.evLossEuroTotal != null ? ` (${st.evLossEuroTotal.toFixed(2)} €)` : ''}.
          EV esperado (sin fugas): <strong>${st.expectedNet >= 0 ? '+' : ''}${fmtBB(st.expectedNet)} bb</strong>${st.perfectPlayNetEuro != null ? ` (${st.perfectPlayNetEuro >= 0 ? '+' : ''}${st.perfectPlayNetEuro.toFixed(2)} €)` : ''}.
          Varianza/suerte: <strong>${st.varianceAdj >= 0 ? '+' : ''}${fmtBB(st.varianceAdj)} bb</strong>.
        </div>
        <div class="muted-text" style="margin-top:6px;font-size:12px">
          Barra: del resultado real (${fmtBB(st.actualNet != null ? st.actualNet : st.netBB)} bb),
          ~${st.pctDecision}% atribuido a fugas (${fmtBB(st.leakPartBB != null ? st.leakPartBB : st.evDecision)} bb)
          y ~${st.pctVariance}% a varianza (${fmtBB(st.varPartBB != null ? st.varPartBB : Math.abs(st.actualNet != null ? st.actualNet : st.netBB) - st.evDecision)} bb).
        </div>
      </div>
      <div id="ai-coach-session"></div>
      <div class="top-hands">
        <div class="card-box"><h3>5 mejores manos</h3>${topHandsHtml(st.best5)}</div>
        <div class="card-box"><h3>5 peores manos</h3>${topHandsHtml(st.worst5)}</div>
      </div>`;

    const sortHtml = `
      <div class="panel-head" style="margin-top:18px">
        <h3>Manos de la sesión (${currentSession.hands.length})</h3>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button type="button" class="btn secondary btn-sm" id="btn-grave-queue" title="Atajo G">Solo graves (${graveN})</button>
          <label class="muted-text" style="font-size:13px">Ordenar:
            <select id="hand-sort">
              <option value="evLoss" ${sortBy === 'evLoss' ? 'selected' : ''}>Mayor EV perdido</option>
              <option value="evLossAsc" ${sortBy === 'evLossAsc' ? 'selected' : ''}>Menor EV perdido</option>
              <option value="scoreAsc" ${sortBy === 'scoreAsc' ? 'selected' : ''}>Menor nota</option>
              <option value="scoreDesc" ${sortBy === 'scoreDesc' ? 'selected' : ''}>Mayor nota</option>
              <option value="accAsc" ${sortBy === 'accAsc' ? 'selected' : ''}>Menor acierto</option>
              <option value="accDesc" ${sortBy === 'accDesc' ? 'selected' : ''}>Mayor acierto</option>
              <option value="netAsc" ${sortBy === 'netAsc' ? 'selected' : ''}>Más bb perdidas</option>
              <option value="netDesc" ${sortBy === 'netDesc' ? 'selected' : ''}>Más bb ganadas</option>
            </select>
          </label>
        </div>
      </div>
      <div id="session-hands-filters" class="hand-filters"></div>
      <p class="muted-text" style="font-size:12px;margin:6px 0 0">Cola graves: <kbd>G</kbd> filtra · en revisión <kbd>→</kbd>/<kbd>Enter</kbd> siguiente · <kbd>←</kbd> anterior.</p>
      <div id="session-hands" class="record-list"></div>`;

    box.innerHTML = statHtml + sortHtml;
    bindStyleDrillButtons(box);
    bindMetricExplainClicks(box);
    const reBtn = box.querySelector('#btn-reanalyze-session');
    if (reBtn) reBtn.addEventListener('click', () => { void reanalyzeCurrentSession(); });
    const graveBtn = box.querySelector('#btn-grave-queue');
    if (graveBtn) {
      graveBtn.addEventListener('click', () => {
        handListFilters.sessionHands.graveOnly = handListFilters.sessionHands.graveOnly ? '' : '1';
        // reset bound filters host so checkbox reflects state
        const host = $('#session-hands-filters');
        if (host) { host.dataset.bound = ''; host.innerHTML = ''; }
        bindHandFilters('#session-hands-filters', 'sessionHands', () => renderSessionHands(sortBy));
        renderSessionHands(sortBy);
      });
    }
    Array.from(box.querySelectorAll('[data-export-session]')).forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!window.PTSessionExport || !currentSession) {
          alert('Exportación no disponible.');
          return;
        }
        const errorsOnly = !!(box.querySelector('#session-export-errors-only') && box.querySelector('#session-export-errors-only').checked);
        try {
          PTSessionExport.download(currentSession, btn.getAttribute('data-export-session'), { errorsOnly: errorsOnly });
        } catch (e) {
          alert((e && e.message) || 'No se pudo exportar.');
        }
      });
    });
    $('#hand-sort').addEventListener('change', (e) => renderSessionDetail(e.target.value));
    bindHandFilters('#session-hands-filters', 'sessionHands', () => renderSessionHands(sortBy));
    renderSessionHands(sortBy);
    if (window.PTAIReport) {
      window.PTAIReport.mount($('#ai-coach-session'), {
        scope: 'sessionGlobal',
        getData: () => currentSession,
        persist: { kind: 'session', getSessionId: () => currentSession && currentSession.id },
        onThreadUpdate: (thread) => { if (currentSession) currentSession.coachThread = thread; }
      });
    }
  }

  function streetAccBar(label, pct) {
    if (pct == null) return `<div class="street-acc-row"><span class="lbl">${label}</span><span class="muted-text">sin decisiones</span></div>`;
    const color = pct >= 75 ? 'var(--green)' : (pct >= 55 ? 'var(--yellow)' : 'var(--red)');
    return `<div class="street-acc-row"><span class="lbl">${label}</span>
      <span class="track"><span class="fill" style="width:${pct}%;background:${color}"></span></span>
      <span class="pct">${pct}%</span></div>`;
  }

  function topHandsHtml(list) {
    if (!list.length) return '<div class="muted-text">—</div>';
    return list.map((h) => {
      const netCls = h.heroNetBB >= 0 ? 'net-pos' : 'net-neg';
      const scoreMeta = resolveHandScoreMeta(h, h.decisions, h.totalEvLoss);
      return `<div class="mini-hand">
        <div class="mini-hand-row">
          <span class="rec-cards">${(h.heroCards || []).map(Cards.cardToHTML).join('')}</span>
          <span>${h.heroCode} ${h.heroPos}</span>
          <span class="${netCls}">${h.heroNetBB >= 0 ? '+' : ''}${fmtBB(h.heroNetBB)}bb</span>
          <span class="badge ${h.worstClass}">${verdictWord(h.worstClass)}</span>
          ${handScoreBadgeHtml(scoreMeta)}
        </div>
        <div class="mini-hand-actions">
          <button class="btn btn-ghost mini-link" data-review="${h.id}">Paso a paso</button>
          <button class="btn btn-primary mini-link" data-replay="${h.id}">Volver a jugar</button>
        </div>
      </div>`;
    }).join('');
  }

  function renderSessionHands(sortBy) {
    const f = handListFilters.sessionHands;
    const hands = currentSession.hands.filter((h) => passesSessionHandFilters(h, f)).slice();
    const sorters = {
      evLoss: (a, b) => b.totalEvLoss - a.totalEvLoss,
      evLossAsc: (a, b) => a.totalEvLoss - b.totalEvLoss,
      accAsc: (a, b) => a.accuracy - b.accuracy,
      accDesc: (a, b) => b.accuracy - a.accuracy,
      netAsc: (a, b) => a.heroNetBB - b.heroNetBB,
      netDesc: (a, b) => b.heroNetBB - a.heroNetBB,
      scoreAsc: (a, b) => (a.handScore != null ? a.handScore : -1) - (b.handScore != null ? b.handScore : -1),
      scoreDesc: (a, b) => (b.handScore != null ? b.handScore : -1) - (a.handScore != null ? a.handScore : -1)
    };
    hands.sort(sorters[sortBy] || sorters.evLoss);
    const box = $('#session-hands');
    if (!box) return;
    if (!hands.length) {
      box.innerHTML = '<div class="empty">No hay manos que coincidan con los filtros.</div>';
      return;
    }
    const shown = Math.min(sessionHandsShown || SESSION_HANDS_PAGE, hands.length);
    const slice = hands.slice(0, shown);
    box.innerHTML = slice.map((h) => {
      const netCls = h.heroNetBB >= 0 ? 'net-pos' : 'net-neg';
      const scoreMeta = resolveHandScoreMeta(h, h.decisions, h.totalEvLoss);
      const tags = (h.tags || []).filter((t) => t && t.indexOf('pos:') !== 0).slice(0, 4);
      const tagsHtml = tags.length
        ? `<div class="rec-tags" style="margin-top:4px">${tags.map((t) => `<span class="badge grade-C" style="font-size:10px">${escapeHtml(t)}</span>`).join(' ')}</div>`
        : '';
      return `<div class="record">
        <div class="rec-cards">${(h.heroCards || []).map(Cards.cardToHTML).join('')}</div>
        <div class="rec-main">
          <div class="rec-scenario">${h.heroCode} <span style="color:var(--muted)">(${h.heroPos})</span> <span class="badge ${h.worstClass}">${verdictWord(h.worstClass)}</span> ${handScoreBadgeHtml(scoreMeta)}</div>
          <div class="rec-sub">Board: ${(h.board || []).map(Cards.cardToHTML).join('') || '—'} · ${h.nDecisions} decisiones · acierto ${h.accuracy}%</div>
          ${tagsHtml}
        </div>
        <div class="rec-right" style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <div><span class="${netCls}">${h.heroNetBB >= 0 ? '+' : ''}${fmtBB(h.heroNetBB)}bb</span> · <span style="color:var(--red)">EV -${fmtBB(h.totalEvLoss)}bb</span></div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost" style="padding:4px 10px;font-size:12px" data-review="${h.id}">Paso a paso</button>
            <button class="btn btn-primary" style="padding:4px 10px;font-size:12px" data-replay="${h.id}">Volver a jugar</button>
          </div>
        </div>
      </div>`;
    }).join('');
    if (shown < hands.length) {
      box.innerHTML += '<div class="session-hands-more-wrap" style="margin:12px 0 4px;text-align:center">'
        + '<p class="muted-text" style="font-size:12px;margin:0 0 8px">'
        + shown.toLocaleString('es-ES') + ' de ' + hands.length.toLocaleString('es-ES') + ' manos</p>'
        + '<button type="button" class="btn btn-ghost" id="session-hands-more">Mostrar más</button>'
        + '</div>';
      const more = $('#session-hands-more');
      if (more) {
        more.onclick = function () {
          sessionHandsShown = shown + SESSION_HANDS_PAGE;
          renderSessionHands(sortBy);
        };
      }
    }
  }

  function findHand(id) {
    if (!currentSession || !currentSession.hands) return null;
    return currentSession.hands.find((h) => String(h.id) === String(id)) || null;
  }

  function filteredSessionHands(sortBy) {
    const f = handListFilters.sessionHands;
    const hands = (currentSession && currentSession.hands ? currentSession.hands : [])
      .filter((h) => passesSessionHandFilters(h, f)).slice();
    const sorters = {
      evLoss: (a, b) => b.totalEvLoss - a.totalEvLoss,
      evLossAsc: (a, b) => a.totalEvLoss - b.totalEvLoss,
      accAsc: (a, b) => a.accuracy - b.accuracy,
      accDesc: (a, b) => b.accuracy - a.accuracy,
      netAsc: (a, b) => a.heroNetBB - b.heroNetBB,
      netDesc: (a, b) => b.heroNetBB - a.heroNetBB,
      scoreAsc: (a, b) => (a.handScore != null ? a.handScore : -1) - (b.handScore != null ? b.handScore : -1),
      scoreDesc: (a, b) => (b.handScore != null ? b.handScore : -1) - (a.handScore != null ? a.handScore : -1)
    };
    hands.sort(sorters[sortBy] || sorters.evLoss);
    return hands;
  }

  function toggleSessionGraveFilter() {
    const detail = $('#session-detail');
    if (!detail || detail.classList.contains('hidden') || !currentSession) return false;
    handListFilters.sessionHands.graveOnly = handListFilters.sessionHands.graveOnly ? '' : '1';
    const host = $('#session-hands-filters');
    if (host) { host.dataset.bound = ''; host.innerHTML = ''; }
    const sortEl = $('#hand-sort');
    const sortBy = sortEl ? sortEl.value : 'evLoss';
    bindHandFilters('#session-hands-filters', 'sessionHands', () => renderSessionHands(sortBy));
    renderSessionHands(sortBy);
    return true;
  }

  function navigateSessionReviewHand(dir) {
    const review = $('#hand-review');
    if (!review || review.classList.contains('hidden') || !currentSession || !currentHand) return false;
    // Prefer cola filtrada actual (p. ej. solo graves)
    const list = filteredSessionHands('evLoss');
    if (!list.length) return false;
    const idx = list.findIndex((h) => String(h.id) === String(currentHand.id));
    const next = list[idx < 0 ? 0 : idx + (dir < 0 ? -1 : 1)];
    if (!next) return false;
    openHandReview(next.id, 'review');
    return true;
  }

  window.PTSessionStudy = {
    toggleGraveFilter: toggleSessionGraveFilter,
    navigateReview: navigateSessionReviewHand,
    reanalyze: function () { return reanalyzeCurrentSession(); }
  };

  function openHandReview(handId, mode) {
    currentHand = findHand(handId);
    if (!currentHand) return;
    analysisReviewReturn = false;
    restoreSessionReviewBackLabel();
    if (Importer.ensureHandSummary) Importer.ensureHandSummary(currentHand);
    if (Importer.ensureFullTimeline) Importer.ensureFullTimeline(currentHand);
    showSessionsView('review');
    try {
      if (Importer.recomputeHandDecisions) Importer.recomputeHandDecisions(currentHand);
      if (!currentHand.hero && currentSession && currentSession.hero) {
        currentHand.hero = currentSession.hero;
      }
    } catch (e) {
      console.error('[Sessions] GTO recompute failed', e);
    }
    if (mode === 'replay') startInteractiveReplay();
    else renderTimelineReview();
  }

  function boardForStreet(hand, street) {
    const n = { preflop: 0, flop: 3, turn: 4, river: 5 }[street] || 0;
    return (hand.board || []).slice(0, n);
  }

  /** Reconstruye metadatos del spot para re-evaluar sesiones importadas. */
  function inferDecisionMeta(d) {
    let spotKind = d.spotKind;
    let vsPosition = d.vsPosition;
    let vsRfiKey = d.vsRfiKey;
    const spot = d.spot || '';
    if (!spotKind) {
      if (/^RFI /.test(spot)) spotKind = 'RFI';
      else if (/squeeze/.test(spot)) spotKind = 'squeeze';
      else if (/iso/.test(spot)) spotKind = 'isoLimp';
      else if (/3-bet|3bet/i.test(spot)) spotKind = 'face3bet';
      else if (/4-bet|4bet/i.test(spot)) spotKind = 'face4bet';
      else if (/ vs /.test(spot)) {
        spotKind = 'vsRFI';
        const m = spot.match(/^(\S+)\s+vs\s+(\S+)/);
        if (m) { vsPosition = m[2]; vsRfiKey = m[1] + '_vs_' + m[2]; }
      } else spotKind = d.street === 'preflop' ? 'vsRFI' : 'postflop';
    }
    return {
      spotKind,
      vsPosition,
      vsRfiKey,
      initiative: d.initiative || (spotKind === 'RFI' ? 'none' : 'caller')
    };
  }

  function buildReplayEvalInput(h, d, action, board) {
    const input = Importer.buildEvalInputFromDecision(h, d, action);
    if (board && board.length) input.board = board;
    return input;
  }

  // --- Revisión paso a paso (lo que ocurrió realmente + evaluación GTO) ---
  function shareSourceForCurrentReview() {
    if (currentSession && currentSession.analysis) return 'analysis';
    return 'session';
  }

  function shareHandTitle(h) {
    if (!h) return 'Análisis de mano';
    const code = h.heroCode || (h.hero && h.hero.code) || '';
    const pos = h.heroPos || (h.hero && h.hero.pos) || '';
    const parts = [code, pos].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Análisis de mano';
  }

  function normalizeTrainerHandForShare(trainerHand) {
    if (!trainerHand) return null;
    const r = trainerHand.result || {};
    const villainPos = trainerHand.villain && trainerHand.villain.pos ? trainerHand.villain.pos : '';
    const villainName = villainPos || 'Villano';
    const heroPos = (trainerHand.hero && trainerHand.hero.pos) || trainerHand.displayHeroPos || '';
    const villainCards = (trainerHand.villain && trainerHand.villain.cards && trainerHand.villain.cards.length >= 2)
      ? trainerHand.villain.cards.slice()
      : null;
    const h = {
      id: trainerHand.id,
      heroCards: (trainerHand.hero && trainerHand.hero.cards) ? trainerHand.hero.cards.slice() : [],
      heroPos: heroPos,
      heroCode: (trainerHand.hero && trainerHand.hero.code) || '',
      board: (trainerHand.board || []).slice(),
      decisions: trainerHand.decisions || [],
      heroNetBB: r.heroNet || 0,
      totalEvLoss: r.totalEvLoss || 0,
      handScore: r.handScore != null ? r.handScore : trainerHand.handScore,
      handScoreMeta: r.handScoreMeta || trainerHand.handScoreMeta || null,
      bb: null,
      villainShows: {},
      positions: {},
      posts: null,
      summary: null,
      result: r,
      spec: {
        villains: villainPos ? [{ pos: villainPos, cards: villainCards || [] }] : [],
        actions: {}
      },
      _shareTrainer: true
    };
    if (heroPos) h.positions.Héroe = heroPos;
    if (villainCards) {
      h.villainShows[villainName] = villainCards;
      if (villainPos) h.positions[villainName] = villainPos;
    }
    if (window.Importer && Importer.ensureHandSummary) Importer.ensureHandSummary(h);
    return h;
  }

  function shareActionWord(item, h) {
    if (item && item.label) return escapeHtml(item.label);
    if (h && h._shareTrainer) {
      const t = item && item.type;
      if (t === 'fold') return 'Fold';
      if (t === 'check') return 'Check';
      if (t === 'call') return 'Call' + (item.amount != null ? ' ' + fmtBB(item.amount) + 'bb' : '');
      if (t === 'bet') return 'Bet' + (item.amount != null ? ' ' + fmtBB(item.amount) + 'bb' : '');
      if (t === 'raise') return 'Raise' + (item.to != null ? ' a ' + fmtBB(item.to) + 'bb' : (item.amount != null ? ' ' + fmtBB(item.amount) + 'bb' : ''));
      return escapeHtml(t || '');
    }
    return actionWord(item);
  }

  function buildShareReviewBodyHTML(rawHand, opts) {
    const source = (opts && opts.source) || 'session';
    let h = rawHand;
    if (source === 'trainer' && rawHand && rawHand.hero && !rawHand.heroCards) {
      h = normalizeTrainerHandForShare(rawHand);
    }
    if (!h) return '';
    if (window.Importer && Importer.ensureHandSummary) Importer.ensureHandSummary(h);

    const summary = h.summary && h.summary.length ? h.summary : [];
    const heroName = (opts && opts.heroName) ||
      (currentSession && !h._shareTrainer ? currentSession.hero : null) ||
      'Héroe';

    const heroDecQueue = {};
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      heroDecQueue[st] = (h.decisions || []).filter((d) => d.street === st).slice();
    });

    let html = `<div class="review-head">
      <div class="rec-cards big-cards">${(h.heroCards || []).map(Cards.cardToHTML).join('')}</div>
      <div>
        <h2>${escapeHtml(h.heroCode || '')} · ${escapeHtml(h.heroPos || '')} ${handScoreBadgeHtml(resolveHandScoreMeta(h, h.decisions, h.totalEvLoss))}</h2>
        <div class="muted-text">Resultado: <span class="${h.heroNetBB >= 0 ? 'net-pos' : 'net-neg'}">${h.heroNetBB >= 0 ? '+' : ''}${fmtBB(h.heroNetBB)} bb</span> · EV perdido: -${fmtBB(h.totalEvLoss || 0)} bb</div>
        ${handOptimalBannerHtml(resolveHandScoreMeta(h, h.decisions, h.totalEvLoss))}
      </div>
    </div>`;

    html += renderShowdownTableHTML(h);

    if (h._shareTrainer && h.result) {
      const r = h.result;
      html += '<div class="card-box"><h3>Resultado de la mano</h3>';
      if (r.reason) html += `<div>${escapeHtml(r.reason)}</div>`;
      if (r.villainProfile) {
        html += `<div class="result-line">Perfil del rival: <strong>${escapeHtml(r.villainProfile)}</strong></div>`;
      }
      html += '</div>';
    }

    if (summary.length) {
      html += '<div class="timeline">';
      summary.forEach((item) => {
        if (item.kind === 'street') {
          html += `<div class="tl-street"><span>${cap(item.street)}</span> ${item.board && item.board.length ? '<span class="tl-board">' + item.board.map(Cards.cardToHTML).join('') + '</span>' : ''}</div>`;
        } else if (item.kind === 'show') {
          html += `<div class="tl-action showdown"><span class="tl-player">${escapeHtml(item.player)}${item.pos ? ' (' + item.pos + ')' : ''}</span> muestra <span class="rec-cards">${(item.cards || []).map(Cards.cardToHTML).join('')}</span></div>`;
        } else {
          const isHero = item.pos === h.heroPos || item.player === heroName || item.player === 'Héroe';
          let heroDec = null;
          let line = `<div class="tl-action ${isHero ? 'hero' : ''}">
            <span class="tl-player">${escapeHtml(item.player)}${item.pos ? ' (' + item.pos + ')' : ''}</span>
            <span class="tl-move">${shareActionWord(item, h)}</span>`;
          if (isHero && (item.type === 'fold' || item.type === 'call' || item.type === 'raise' || item.type === 'bet' || item.type === 'check' || item.label)) {
            heroDec = heroDecQueue[item.street] && heroDecQueue[item.street].shift();
            if (heroDec) {
              line += ` <span class="badge ${heroDec.class}">${verdictWord(heroDec.class)}</span>`;
              if (heroDec.evLoss > 0) line += ` <span class="tl-eval">${decisionEvLossHtml(heroDec)}</span>`;
              else if (heroDec.class !== 'optima') line += betterActionHtml(heroDec);
            }
          }
          line += '</div>';
          html += line;
          if (heroDec) {
            html += `<div class="tl-expl-block${heroDec.class === 'error' || heroDec.class === 'imprecisa' ? ' ' + heroDec.class : ''}">`;
            html += renderDecisionMath(heroDec);
            if (heroDec.explanation && heroDec.class !== 'optima') {
              html += `<div class="tl-expl">${escapeHtml(heroDec.explanation)}</div>`;
            }
            if (heroDec.renderAlert) html += `<div class="tl-expl" style="color:var(--orange)">${escapeHtml(heroDec.renderAlert)}</div>`;
            if (heroDec.villainAudit && heroDec.villainAudit.severity === 'critical') {
              html += `<div class="tl-expl" style="color:var(--red,#e55)"><strong>Villano:</strong> ${escapeHtml(heroDec.villainAudit.label)}</div>`;
            }
            if (heroDec.optionBreakdown && heroDec.optionBreakdown.length) {
              html += renderOptionGrid(heroDec.optionBreakdown, heroDec.chosen || heroDec.action, heroDec.best);
            }
            html += '</div>';
          }
        }
      });
      html += '</div>';
    }

    html += renderHandDecisionsSummary(h.decisions, null);

    const shows = Object.keys(h.villainShows || {}).filter((n) => n !== heroName);
    if (shows.length) {
      html += '<div class="card-box"><h3>Cartas mostradas</h3>' + shows.map((n) =>
        `<div class="tl-action"><span class="tl-player">${escapeHtml(n)}</span> <span class="rec-cards">${h.villainShows[n].map(Cards.cardToHTML).join('')}</span></div>`
      ).join('') + '</div>';
    }

    if (h._shareTrainer && h.result && h.result.villainRangeLog && h.result.villainRangeLog.length) {
      html += '<div class="card-box"><h3>Lectura del rango del villano</h3><ul class="range-log">';
      h.result.villainRangeLog.forEach((e) => {
        html += `<li><strong>${cap(e.street)}</strong> · ${escapeHtml(e.label)}${e.amountBB != null ? ' ' + e.amountBB + 'bb' : ''}: ${escapeHtml(e.summary || e.note || '')}</li>`;
      });
      html += '</ul></div>';
    }

    return html;
  }

  function bindShareButton(btn, getPayload) {
    if (!btn || !window.PTShareHand || !PTShareHand.shareFromButton) return;
    btn.addEventListener('click', () => {
      PTShareHand.shareFromButton(btn, getPayload);
    });
  }

  function renderTimelineReview() {
    const h = currentHand;
    const box = $('#hand-review-content');
    if (!h) return;
    const summary = h.summary && h.summary.length ? h.summary : [];
    if (!summary.length) {
      box.innerHTML = '<p class="muted-text">No hay línea temporal para esta mano. Reimporta la sesión si el problema persiste.</p>';
      return;
    }
    const decByKey = {};
    (h.decisions || []).forEach((d, i) => { decByKey[d.street + '#' + i] = d; });
    // mapear decisiones del héroe en orden por calle
    const heroDecQueue = {};
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => { heroDecQueue[st] = (h.decisions || []).filter((d) => d.street === st).slice(); });

    const shareSource = shareSourceForCurrentReview();
    const scoreMeta = resolveHandScoreMeta(h, h.decisions, h.totalEvLoss);
    let html = `<div class="review-share-row"><button type="button" class="btn btn-ghost btn-small" id="share-hand-review">Compartir análisis</button></div>`;
    const unsupportedBanner = h.analysisUnsupported
      ? `<div class="card-box" style="margin:10px 0;border-color:var(--yellow)"><strong>Sin análisis GTO</strong>
          <p class="muted-text" style="margin:6px 0 0">${escapeHtml(h.unsupportedReason || 'Variante importada solo para consulta (PLO / Short Deck).')}</p></div>`
      : '';
    const icmBanner = (!h.analysisUnsupported && h.icmLite && h.icmLite.note)
      ? `<div class="card-box" style="margin:10px 0;border-color:rgba(138,180,255,.45)"><strong>ICM lite</strong>
          <p class="muted-text" style="margin:6px 0 0">${escapeHtml(h.icmLite.note)}</p></div>`
      : '';
    html += `<div class="review-head">
      <div class="rec-cards big-cards">${(h.heroCards || []).map(Cards.cardToHTML).join('')}</div>
      <div>
        <h2>${h.heroCode || (h.variant || 'mano')} · ${h.heroPos || '?'} ${handScoreBadgeHtml(scoreMeta)}</h2>
        <div class="muted-text">Mano #${h.id} · Resultado real: <span class="${h.heroNetBB >= 0 ? 'net-pos' : 'net-neg'}">${h.heroNetBB >= 0 ? '+' : ''}${fmtBB(h.heroNetBB)} bb</span> · EV perdido: -${fmtBB(h.totalEvLoss)} bb${h.bb || (h.spec && h.spec.bbEuro) ? ' · BB ' + fmtBB(h.bb || h.spec.bbEuro) + '€' : ''}</div>
        ${handOptimalBannerHtml(scoreMeta)}
      </div>
    </div>`;
    html += unsupportedBanner + icmBanner;

    html += sessionReplayThemeHTML();
    html += renderShowdownTableHTML(h);
    html += renderSwapRolesPanelHTML(h);

    html += '<div class="timeline">';
    summary.forEach((item) => {
      if (item.kind === 'street') {
        const decIdx = findStreetDecisionIndex(h, item.street);
        html += `<div class="tl-street"><span>${cap(item.street)}</span> ${item.board.length ? '<span class="tl-board">' + item.board.map(Cards.cardToHTML).join('') + '</span>' : ''}${decIdx >= 0 ? matrixStreetBtn(item.street, decIdx, 'session') : ''}</div>`;
      } else if (item.kind === 'show') {
        html += `<div class="tl-action showdown"><span class="tl-player">${escapeHtml(item.player)}${item.pos ? ' (' + item.pos + ')' : ''}</span> muestra <span class="rec-cards">${(item.cards || []).map(Cards.cardToHTML).join('')}</span></div>`;
      } else {
        const isHero = item.pos === h.heroPos || item.player === (currentSession && currentSession.hero);
        let heroDec = null;
        let line = `<div class="tl-action ${isHero ? 'hero' : ''}">
          <span class="tl-player">${escapeHtml(item.player)}${item.pos ? ' (' + item.pos + ')' : ''}</span>
          <span class="tl-move">${actionWord(item)}</span>`;
        if (isHero && (item.type === 'fold' || item.type === 'call' || item.type === 'raise' || item.type === 'bet' || item.type === 'check')) {
          heroDec = heroDecQueue[item.street] && heroDecQueue[item.street].shift();
          if (heroDec) {
            line += ` <span class="badge ${heroDec.class}">${verdictWord(heroDec.class)}</span>`;
            if (heroDec.evLoss > 0) line += ` <span class="tl-eval">${decisionEvLossHtml(heroDec)}</span>`;
            else if (heroDec.class !== 'optima') line += betterActionHtml(heroDec);
          }
        }
        line += '</div>';
        html += line;
        if (heroDec) {
          const decIdx = (h.decisions || []).indexOf(heroDec);
          html += `<div class="tl-expl-block${heroDec.class === 'error' || heroDec.class === 'imprecisa' ? ' ' + heroDec.class : ''}">`;
          html += renderDecisionMath(heroDec);
          if (heroDec.explanation && heroDec.class !== 'optima') {
            html += `<div class="tl-expl">${escapeHtml(heroDec.explanation)}</div>`;
          }
          if (heroDec.renderAlert) html += `<div class="tl-expl" style="color:var(--orange)">${escapeHtml(heroDec.renderAlert)}</div>`;
          if (heroDec.icmNote || heroDec.phaseNote || heroDec.icmLite || heroDec.mttPhase) {
            html += renderTournamentDecisionImpact(heroDec);
          }
          if (heroDec.populationCompare && heroDec.populationCompare.note) {
            const ok = heroDec.populationCompare.inGtoRange;
            html += `<div class="tl-expl" style="color:${ok ? 'var(--green)' : 'var(--yellow)'}"><strong>vs GTO genérico:</strong> ${escapeHtml(heroDec.populationCompare.note)}</div>`;
          }
          if (heroDec.villainAudit && heroDec.villainAudit.severity === 'critical') {
            html += `<div class="tl-expl" style="color:var(--red,#e55)"><strong>Villano:</strong> ${escapeHtml(heroDec.villainAudit.label)}</div>`;
          }
          if (heroDec.optionBreakdown && heroDec.optionBreakdown.length) {
            html += renderOptionGrid(heroDec.optionBreakdown, heroDec.chosen, heroDec.best);
          }
          if (decIdx >= 0) html += renderWhatIfControls(heroDec, decIdx);
          html += '</div>';
        }
      }
    });
    html += '</div>';

    html += renderHandDecisionsSummary(h.decisions, 'session');

    const isAnalysisHand = !!(currentSession && currentSession.analysis);
    if (!isAnalysisHand) {
      html += '<div id="ai-report-session"></div>';
    }

    // cartas del villano si se mostraron
    const shows = Object.keys(h.villainShows || {}).filter((n) => n !== currentSession.hero);
    if (shows.length) {
      html += '<div class="card-box"><h3>Cartas mostradas</h3>' + shows.map((n) =>
        `<div class="tl-action"><span class="tl-player">${escapeHtml(n)}</span> <span class="rec-cards">${h.villainShows[n].map(Cards.cardToHTML).join('')}</span></div>`
      ).join('') + '</div>';
    }

    html += `<button class="btn btn-primary" id="to-replay" style="margin-top:14px">Volver a jugar esta mano con GTO &raquo;</button>`;
    if (currentSession && currentSession.analysis && window.PTHandAnalysis && PTHandAnalysis.toTrainerConfig) {
      html += `<button class="btn btn-secondary" id="to-trainer-from-review" style="margin-top:14px;margin-left:8px">Jugar en entrenador (POV actual) &raquo;</button>`;
    }
    box.innerHTML = html;
    bindSessionReplayTheme();
    applyTableTheme(loadTableTheme());
    bindSwapRolesPanel(h);
    bindShareButton($('#share-hand-review'), () => ({
      source: shareSource,
      hand: currentHand,
      title: shareHandTitle(currentHand)
    }));
    $$('[data-whatif-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyWhatIfDecision(Number(btn.getAttribute('data-whatif-dec')), btn.getAttribute('data-whatif-action'));
      });
    });
    $$('[data-whatif-reset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        resetWhatIfDecision(Number(btn.getAttribute('data-whatif-reset')));
      });
    });
    scrollSessionReviewToTop();
    if (!isAnalysisHand && window.PTAIReport) {
      window.PTAIReport.mount($('#ai-report-session'), {
        scope: 'session',
        getHand: () => currentHand,
        persist: {
          kind: 'sessionHand',
          getSessionId: () => currentSession && currentSession.id,
          getHandId: () => currentHand && currentHand.id
        },
        onThreadUpdate: (thread) => { if (currentHand) currentHand.coachThread = thread; }
      });
    }
    $('#to-replay').addEventListener('click', () => startInteractiveReplay());
    const toTrainer = $('#to-trainer-from-review');
    if (toTrainer) {
      toTrainer.addEventListener('click', () => {
        const cfg = PTHandAnalysis.toTrainerConfig(h, 'pro', loadTableTheme());
        if (window.playAnalysisHand) playAnalysisHand(cfg.force, cfg.playConfig);
      });
    }
  }

  window.PTShareHandUI = {
    buildBodyHTML: buildShareReviewBodyHTML,
    buildLeakBodyHTML: buildLeakShareBodyHTML,
    handTitle: shareHandTitle,
    normalizeTrainerHand: normalizeTrainerHandForShare
  };

  function buildLeakShareBodyHTML(leak) {
    if (!leak) return '';
    const fmt = (x) => (window.GTOPotMath ? GTOPotMath.formatBB(x) : String(x));
    const samples = (leak.errors || []).slice(0, 5);
    let html = `<div class="review-head"><div><h2>Peor leak de la semana</h2>
      <div class="muted-text">${escapeHtml(leak.label || '')}</div>
      <div class="muted-text">${leak.count || 0} error${(leak.count || 0) === 1 ? '' : 'es'} · EV perdido -${fmt(leak.evLoss || 0)} bb</div>
    </div></div>`;
    html += '<div class="card-box"><h3>Por qué importa</h3><p class="muted-text">Este spot concentra la mayor pérdida de EV en los últimos 7 días (o en todo el historial si aún no hay datos semanales).</p></div>';
    if (samples.length) {
      html += '<div class="card-box"><h3>Ejemplos</h3><ul class="leak-share-samples">';
      samples.forEach((e) => {
        html += `<li>${escapeHtml(e.heroCode || e.heroPos || 'mano')} · ${escapeHtml(e.street || '')} · elegiste <strong>${escapeHtml(e.chosen || '')}</strong>` +
          (e.best && e.best !== e.chosenAction ? `, mejor <strong>${escapeHtml(actionName(e.best))}</strong>` : '') +
          ` · -${fmt(e.evLoss || 0)} bb</li>`;
      });
      html += '</ul></div>';
    }
    html += '<p class="muted-text">Analizado con PokerForgeAI · estudio GTO heurístico</p>';
    return html;
  }

  async function shareWeeklyTopLeak() {
    const PT = window.PTLeaks;
    if (!PT || !PT.weeklyTopLeak) {
      alert('Leak detector no disponible.');
      return;
    }
    const leak = PT.weeklyTopLeak(Store.getErrors());
    if (!leak) {
      alert('Aún no hay fugas registradas para compartir. Entrena o importa sesiones.');
      return;
    }
    if (!window.PTShareHand || !PTShareHand.create) {
      alert('Compartir no está disponible ahora mismo.');
      return;
    }
    try {
      const result = await PTShareHand.create({
        source: 'leak',
        title: 'Mi peor leak · ' + (leak.label || 'spot'),
        bodyHtml: buildLeakShareBodyHTML(leak),
        hand: { id: 'leak-week', heroCode: leak.label, heroPos: '', heroNetBB: 0, totalEvLoss: leak.evLoss || 0, decisions: [], summary: [] }
      });
      if (result && PTShareHand.openDialog) PTShareHand.openDialog(result);
    } catch (e) {
      alert((e && e.message) || 'No se pudo compartir el leak.');
    }
  }

  function renderSwapRolesPanelHTML(h) {
    if (!window.PTHandAnalysis || !PTHandAnalysis.listSwappableVillains) return '';
    const villains = PTHandAnalysis.listSwappableVillains(h) || [];
    if (!villains.length) {
      return `<div class="ha-swap-panel card-box">
        <h3>Ver desde otro asiento</h3>
        <p class="muted-text">Para intercambiar papeles, el villano debe tener cartas conocidas (añádelas al editar la mano).</p>
      </div>`;
    }
    let html = `<div class="ha-swap-panel card-box">
      <h3>Ver desde otro asiento</h3>
      <p class="muted-text">Genera una nueva mano de análisis con el punto de vista del villano (evalúa sus decisiones y juega esa mano en el entrenador).</p>
      <div class="ha-swap-list">`;
    villains.forEach((v) => {
      html += `<button type="button" class="btn btn-small btn-secondary ha-swap-btn" data-ha-swap-pos="${escapeHtml(v.pos)}">
        <span class="ha-swap-pos">${escapeHtml(v.pos)}</span>
        <span class="rec-cards">${(v.cards || []).map(Cards.cardToHTML).join('')}</span>
        <span>Analizar como ${escapeHtml(v.pos)} &raquo;</span>
      </button>`;
    });
    html += '</div></div>';
    return html;
  }

  function bindSwapRolesPanel(h) {
    $$('[data-ha-swap-pos]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pos = btn.dataset.haSwapPos;
        if (!pos || !window.PTHandAnalysis || !PTHandAnalysis.swapHeroWithVillain) return;
        btn.disabled = true;
        const res = PTHandAnalysis.swapHeroWithVillain(h, pos);
        if (!res || !res.ok) {
          btn.disabled = false;
          let msg = 'No se pudo generar la mano desde ese asiento.';
          if (res && res.error === 'no_cards') msg = 'Ese villano no tiene cartas conocidas.';
          else if (res && res.error === 'analysis_limit') msg = 'Has alcanzado el límite de manos guardadas de tu plan.';
          else if (res && res.details && res.details.length) msg = res.details.join(' ');
          else if (res && res.message) msg = res.message;
          alert(msg);
          return;
        }
        openAnalysisHandReview(res.hand, 'review');
      });
    });
  }

  function handNeedsShowdownStep(h) {
    return !!(h.board && h.board.length >= 5);
  }

  function isTablePosLabel(pos) {
    return POS.indexOf(pos) >= 0 || POS_9.indexOf(pos) >= 0;
  }

  /** Posiciones que participan en la mano (héroe + villanos / quien actúa). */
  function sessionParticipantPosSet(h) {
    const set = {};
    function mark(pos) { if (pos) set[pos] = true; }
    mark(h.heroPos);
    if (h.spec) {
      (h.spec.villains || []).forEach((v) => { if (v && v.pos) mark(v.pos); });
      const acts = (h.spec.actions) || {};
      ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
        (acts[st] || []).forEach((a) => { if (a && a.pos) mark(a.pos); });
      });
      return set;
    }
    if (h.posts && h.positions) {
      Object.keys(h.posts).forEach((player) => mark(h.positions[player]));
    }
    (h.summary || []).forEach((item) => { if (item && item.pos) mark(item.pos); });
    (h.decisions || []).forEach((d) => { if (d && d.vsPosition) mark(d.vsPosition); });
    if (Object.keys(set).length <= 1 && h.positions) {
      Object.keys(h.positions).forEach((player) => mark(h.positions[player]));
    }
    return set;
  }

  /** Cartas conocidas por posición (héroe + villanos mostrados / spec). */
  function sessionHoleCardsByPos(h) {
    const byPos = {};
    if (h.heroPos && h.heroCards && h.heroCards.length >= 2) {
      byPos[h.heroPos] = h.heroCards.slice(0, 2);
    }
    if (h.spec && Array.isArray(h.spec.villains)) {
      h.spec.villains.forEach((v) => {
        if (v && v.pos && v.cards && v.cards.length >= 2) byPos[v.pos] = v.cards.slice(0, 2);
      });
    }
    const heroName = (currentSession && currentSession.hero) || h.hero;
    const shows = h.villainShows || {};
    Object.keys(shows).forEach((name) => {
      if (name === heroName) return;
      if (!shows[name] || shows[name].length < 2) return;
      let pos = (h.positions && h.positions[name]) || '';
      if (!pos && isTablePosLabel(name)) pos = name;
      if (!pos) {
        (h.summary || []).forEach((item) => {
          if ((item.kind === 'action' || item.kind === 'show') && item.player === name && item.pos) pos = item.pos;
        });
      }
      if (pos) byPos[pos] = shows[name].slice(0, 2);
    });
    return byPos;
  }

  function foldedPositionsFromHand(h) {
    const folded = {};
    (h.summary || []).forEach((item) => {
      if (item && item.kind === 'action' && item.type === 'fold' && item.pos) folded[item.pos] = true;
    });
    return folded;
  }

  function seatCardsHTML(cards, faceUp) {
    if (faceUp && cards && cards.length >= 2) {
      return '<div class="seat-cards showdown">' + cards.map(Cards.cardFaceHTML).join('') + '</div>';
    }
    return '<div class="seat-cards">' + Cards.cardBackHTML() + Cards.cardBackHTML() + '</div>';
  }

  function replayFeltConfigFromHand(h) {
    const kind = (h && (h.gameKind || h.formatHub)) || 'cash';
    let formatHub = 'cash';
    if (kind === 'spin' || kind === 'spin3') formatHub = 'spin';
    else if (kind === 'mtt' || kind === 'sng' || kind === 'tournament') formatHub = 'mtt';
    const pc = (h && h.playConfig) || {};
    return {
      formatHub: formatHub,
      gameType: formatHub === 'spin' ? 'spin3' : (formatHub === 'mtt' ? 'mtt' : 'cash6'),
      stackBB: h && h.heroStackBB != null ? h.heroStackBB : (pc.stackBB != null ? pc.stackBB : null),
      mttPhase: (h && h.mttPhase) || pc.mttPhase,
      resolvedPhase: (h && (h.resolvedPhase || h.mttPhase)) || pc.resolvedPhase,
      anteBB: (h && h.anteBB) || pc.anteBB,
      spinPayout: (h && h.spinPayout) || pc.spinPayout,
      preflopOpenSize: (h && h.preflopOpenSize) || pc.preflopOpenSize,
      buyIn: pc.buyIn,
      entries: pc.entries,
      playersLeft: pc.playersLeft,
      placesPaid: pc.placesPaid,
      mttStructureSituation: pc.mttStructureSituation,
      prizePoolEst: pc.prizePoolEst,
      blindStructure: pc.blindStructure,
      icmStacksBB: pc.icmStacksBB || (h && h.icmStacksBB)
    };
  }

  function renderShowdownTableHTML(h) {
    const layout = sessionTableLayout(h);
    const mobile = isMobileLayout();
    const coords = sessionSeatCoords(layout, mobile);
    const posList = sessionPosList(layout);
    const posRing = ringFromHeroPos(h.heroPos, posList);
    const board = h.board || [];
    const participants = sessionParticipantPosSet(h);
    const holeByPos = sessionHoleCardsByPos(h);
    const folded = foldedPositionsFromHand(h);
    const potBB = h.decisions && h.decisions.length
      ? h.decisions[h.decisions.length - 1].potBB
      : null;

    let seatsHtml = '';
    posRing.forEach((pos, i) => {
      const c = coords[i];
      const isHero = pos === h.heroPos;
      const isParticipant = !!(participants[pos]);
      const isVillain = isParticipant && !isHero;
      const cls = ['seat'];
      if (isHero) cls.push('hero');
      if (isVillain) cls.push('villain');
      if (folded[pos]) cls.push('folded');
      if (c.top < 20) cls.push('seat-top');
      if (c.top > 70) cls.push('seat-bottom');
      if (c.left < 22) cls.push('seat-edge-left');
      else if (c.left > 78) cls.push('seat-edge-right');
      if (c.top < 12) cls.push('seat-edge-top');
      const role = isHero ? 'Héroe' : (isVillain ? 'Villano' : '');
      let cardsHtml = '';
      if (isVillain && folded[pos]) {
        cardsHtml = seatFoldMarkHTML();
      } else if (isVillain && !folded[pos]) {
        const known = holeByPos[pos];
        cardsHtml = seatCardsHTML(known, !!(known && known.length >= 2));
      }
      seatsHtml += `<div class="${cls.join(' ')}" style="top:${c.top}%;left:${c.left}%">
        ${cardsHtml}
        <div class="seat-pos">${pos}</div>
        ${role ? `<div class="seat-role">${role}</div>` : ''}
      </div>`;
    });

    const heroCards = h.heroCards || [];
    const heroCardsHtml = heroCards.length >= 2
      ? '<div class="hero-cards">' + heroCards.map(Cards.cardFaceHTML).join('') + '</div>'
      : '';

    const feltCfg = replayFeltConfigFromHand(h);
    const feltClass = layout === '9' ? ' table-9max' : (layout === '3' ? ' table-3max' : '');
    return `<div class="poker-table session-replay-table"><div class="table-felt${feltClass}" data-theme="${loadTableTheme()}" data-format="${feltCfg.formatHub}">
      ${tableChromeHTML(feltCfg)}
      <div class="seats">${seatsHtml}</div>
      <div class="board-area"><div class="pot"><span class="pot-chips">${chipStackHTML(potBB || 0)}</span> Bote: <strong class="pot-amt">${potBB != null ? fmtBB(potBB) : '—'} bb</strong></div>
      <div class="board">${board.map(Cards.cardFaceHTML).join('')}</div></div>
      <div class="hero-area">
        <div class="hero-label">HÉROE · <span>${escapeHtml(h.heroPos || '')}</span></div>
        ${heroCardsHtml}
      </div>
    </div></div>`;
  }

  function renderReplayShowdown() {
    const h = currentHand;
    replayState.showdownDone = true;
    const box = $('#hand-review-content');
    const holeByPos = sessionHoleCardsByPos(h);
    const knownVillains = Object.keys(holeByPos).filter((pos) => pos !== h.heroPos);
    let html = `<div class="review-head">
      <div class="rec-cards big-cards">${(h.heroCards || []).map(Cards.cardToHTML).join('')}</div>
      <div>
        <h2>Showdown · ${h.heroCode} · ${h.heroPos}</h2>
        <div class="muted-text">Resultado real: <span class="${h.heroNetBB >= 0 ? 'net-pos' : 'net-neg'}">${h.heroNetBB >= 0 ? '+' : ''}${fmtBB(h.heroNetBB)} bb</span></div>
      </div>
    </div>`;
    html += sessionReplayThemeHTML();
    html += renderShowdownTableHTML(h);
    html += '<div class="session-street-log"><strong>River:</strong> board completo</div>';
    knownVillains.forEach((pos) => {
      html += `<div class="result-line">Cartas de ${escapeHtml(pos)}: ${holeByPos[pos].map(Cards.cardToHTML).join(' ')}</div>`;
    });
    html += `<div class="result-line" style="border:none">Board: ${(h.board || []).map(Cards.cardToHTML).join(' ')}</div>`;
    html += `<button class="btn btn-primary" id="replay-to-summary" style="margin-top:14px">Ver resumen de la repetición »</button>`;
    box.innerHTML = html;
    bindSessionReplayTheme();
    applyTableTheme(loadTableTheme());
    bindTableChromeSessionInfo(box, replayFeltConfigFromHand(h), h);
    $('#replay-to-summary').addEventListener('click', () => renderReplaySummary());
  }

  // --- Volver a jugar la mano evaluando cada decisión con GTO ---
  function startInteractiveReplay() {
    const h = currentHand;
    replayState = { idx: 0, userEvLoss: 0, good: 0, total: 0, showdownDone: false };
    renderReplayStep();
  }

  function isVoluntaryHeroAction(type) {
    return type === 'fold' || type === 'check' || type === 'call' || type === 'raise' || type === 'bet';
  }

  /** Alinea el contador de replay con h.decisions (preflop check no cuenta). */
  function timelineHeroCountsAsDecision(street, type) {
    if (street === 'preflop') return type === 'fold' || type === 'call' || type === 'raise';
    return isVoluntaryHeroAction(type);
  }

  function sessionTableIs9Max(h) {
    const p9 = ['UTG1', 'UTG2', 'LJ'];
    return (h.summary || []).some((item) => item.pos && p9.indexOf(item.pos) >= 0);
  }

  function sessionTableIs3Max(h) {
    if (!h) return false;
    if (sessionTableIs9Max(h)) return false;
    if (h.tableMax === 3 || h.formatKey === 'spin3' || h.gameKind === 'spin') return true;
    const cfg = h.playConfig;
    if (window.PTPlayConfig && cfg) {
      if (PTPlayConfig.is3Max && PTPlayConfig.is3Max(cfg)) return true;
      if (PTPlayConfig.isSpin && PTPlayConfig.isSpin(cfg)) return true;
    }
    return false;
  }

  /** '3' | '6' | '9' — layout de asientos para replay/showdown de sesión. */
  function sessionTableLayout(h) {
    if (sessionTableIs9Max(h)) return '9';
    if (sessionTableIs3Max(h)) return '3';
    return '6';
  }

  function sessionPosList(layout) {
    if (layout === '9') return POS_9;
    if (layout === '3') return POS_3;
    return POS;
  }

  function sessionSeatCoords(layout, mobile) {
    if (layout === '9') return mobile ? SEAT_COORDS_MOBILE_9 : SEAT_COORDS_9;
    if (layout === '3') return mobile ? SEAT_COORDS_MOBILE_3 : SEAT_COORDS_3;
    return mobile ? SEAT_COORDS_MOBILE : SEAT_COORDS;
  }

  function ringFromHeroPos(heroPos, list) {
    let idx = list.indexOf(heroPos);
    if (idx < 0) idx = 0;
    const ring = [];
    for (let i = 0; i < list.length; i++) ring.push(list[(idx + i) % list.length]);
    return ring;
  }

  /** Estado de mesa en el momento de una decisión del héroe (desde el timeline real). */
  function computeSessionReplayState(h, decisionIdx) {
    if (Importer.ensureHandSummary) Importer.ensureHandSummary(h);
    const heroPos = h.heroPos;
    const bb = h.bb || 0.05;
    const target = h.decisions[decisionIdx];
    const targetStreet = target.street;
    const tl = h.summary || [];

    let heroDecIdx = 0;
    let street = 'preflop';
    const folded = {};
    const streetBetBB = {};
    const totalInvBB = {};
    const lastAction = {};
    const streetCommittedEuro = {};
    const streetLog = [];
    let lastAggressorPos = null;
    let toMatchEuro = 0;

    if (h.posts && h.positions) {
      Object.keys(h.posts).forEach((player) => {
        const pos = h.positions[player];
        if (pos) totalInvBB[pos] = euroToBB(h.posts[player]);
      });
    }

    function euroToBB(x) { return bb ? Math.round((x / bb) * 100) / 100 : x; }
    function resetStreetState() {
      Object.keys(streetBetBB).forEach((k) => { delete streetBetBB[k]; });
      Object.keys(streetCommittedEuro).forEach((k) => { delete streetCommittedEuro[k]; });
      Object.keys(lastAction).forEach((k) => { delete lastAction[k]; });
      toMatchEuro = 0;
      lastAggressorPos = null;
    }

    function recordAction(item) {
      const pos = item.pos;
      if (!pos) return;
      const cur = streetCommittedEuro[pos] || 0;

      if (item.type === 'fold') {
        folded[pos] = true;
        lastAction[pos] = { type: 'fold' };
      } else if (item.type === 'check') {
        lastAction[pos] = { type: 'check' };
      } else if (item.type === 'call') {
        const addedEuro = item.amount != null ? item.amount : Math.max(0, toMatchEuro - cur);
        streetCommittedEuro[pos] = toMatchEuro;
        const addedBB = euroToBB(addedEuro);
        streetBetBB[pos] = euroToBB(toMatchEuro);
        totalInvBB[pos] = (totalInvBB[pos] || 0) + addedBB;
        lastAction[pos] = { type: 'call', amount: addedBB };
      } else if (item.type === 'bet') {
        toMatchEuro = item.amount;
        streetCommittedEuro[pos] = item.amount;
        const bbAmt = euroToBB(item.amount);
        streetBetBB[pos] = bbAmt;
        totalInvBB[pos] = (totalInvBB[pos] || 0) + euroToBB(Math.max(0, item.amount - cur));
        lastAction[pos] = { type: 'bet', amount: bbAmt };
        if (pos !== heroPos) lastAggressorPos = pos;
      } else if (item.type === 'raise') {
        toMatchEuro = item.to;
        streetCommittedEuro[pos] = item.to;
        const bbAmt = euroToBB(item.to);
        streetBetBB[pos] = bbAmt;
        const addedEuro = item.amount != null ? item.amount : Math.max(0, item.to - cur);
        totalInvBB[pos] = (totalInvBB[pos] || 0) + euroToBB(addedEuro);
        lastAction[pos] = { type: 'raise', amount: bbAmt };
        if (pos !== heroPos) lastAggressorPos = pos;
      }
    }

    for (let i = 0; i < tl.length; i++) {
      const item = tl[i];
      if (item.kind === 'street') {
        street = item.street;
        resetStreetState();
        continue;
      }
      const isHero = item.pos === heroPos;
      const countsAsDecision = timelineHeroCountsAsDecision(street, item.type);
      if (isHero && countsAsDecision && heroDecIdx === decisionIdx) break;
      if (street === targetStreet) streetLog.push(item);
      recordAction(item);
      if (isHero && countsAsDecision) heroDecIdx++;
    }

    const heroCommitEuro = streetCommittedEuro[heroPos] || 0;
    const facingBet = toMatchEuro > heroCommitEuro + 0.0001;
    let villainPos = target.vsPosition || null;
    if (!villainPos && facingBet && lastAggressorPos && lastAggressorPos !== heroPos) villainPos = lastAggressorPos;
    if (!villainPos && facingBet) {
      for (let j = streetLog.length - 1; j >= 0; j--) {
        const a = streetLog[j];
        if (a.pos && a.pos !== heroPos && (a.type === 'bet' || a.type === 'raise')) { villainPos = a.pos; break; }
      }
    }

    const toCallBB = euroToBB(Math.max(0, toMatchEuro - heroCommitEuro));
    const potBB = Object.values(totalInvBB).reduce((s, v) => s + (v || 0), 0);

    return {
      folded, streetBetBB, totalInvBB, lastAction, streetLog, villainPos, heroPos, targetStreet,
      potBB, toCallBB, facingBet
    };
  }

  function sessionActionWord(item, bb, committedEuro, toMatchEuro) {
    const toBB = (x) => (bb ? Math.round((x / bb) * 100) / 100 : x);
    const pos = item.pos;
    const cur = (committedEuro && pos) ? (committedEuro[pos] || 0) : 0;
    switch (item.type) {
      case 'fold': return 'fold';
      case 'check': return 'check';
      case 'call': {
        const added = item.amount != null ? item.amount : Math.max(0, (toMatchEuro || 0) - cur);
        return 'call ' + toBB(added) + 'bb';
      }
      case 'bet': return 'bet ' + toBB(item.amount) + 'bb';
      case 'raise': return 'raise a ' + toBB(item.to) + 'bb';
      default: return item.type || '';
    }
  }

  function renderSessionStreetLogHTML(h, state) {
    if (!state.streetLog.length) return '';
    const bb = h.bb || 0.05;
    const capSt = state.targetStreet.charAt(0).toUpperCase() + state.targetStreet.slice(1);
    const committed = {};
    let toMatch = 0;
    const parts = [];
    state.streetLog.forEach((item) => {
      if (!item.pos || item.pos === h.heroPos) return;
      parts.push('<span class="session-street-act">' + escapeHtml(item.pos) + ': ' +
        escapeHtml(sessionActionWord(item, bb, committed, toMatch)) + '</span>');
      if (item.type === 'bet') {
        toMatch = item.amount;
        committed[item.pos] = item.amount;
      } else if (item.type === 'raise') {
        toMatch = item.to;
        committed[item.pos] = item.to;
      } else if (item.type === 'call') {
        committed[item.pos] = toMatch;
      }
    });
    if (!parts.length) return '';
    return `<div class="session-street-log"><strong>${capSt}:</strong> ${parts.join(' · ')}</div>`;
  }

  function renderSessionReplayTableHTML(h, d, decisionIdx, state) {
    state = state || computeSessionReplayState(h, decisionIdx);
    const layout = sessionTableLayout(h);
    const mobile = isMobileLayout();
    const coords = sessionSeatCoords(layout, mobile);
    const posList = sessionPosList(layout);
    const posRing = ringFromHeroPos(h.heroPos, posList);
    const board = boardForStreet(h, d.street);
    const villainPos = state.villainPos;
    const participants = sessionParticipantPosSet(h);

    let seatsHtml = '';
    posRing.forEach((pos, i) => {
      const c = coords[i];
      const isHero = pos === h.heroPos;
      const isParticipant = !!(participants[pos]);
      const isVillain = (villainPos && pos === villainPos) || (isParticipant && !isHero && !state.folded[pos]);
      const cls = ['seat'];
      if (isHero) cls.push('hero');
      if (isVillain) cls.push('villain');
      if (state.folded[pos]) cls.push('folded');
      if (c.top < 20) cls.push('seat-top');
      if (c.top > 70) cls.push('seat-bottom');
      if (c.left < 22) cls.push('seat-edge-left');
      else if (c.left > 78) cls.push('seat-edge-right');
      if (c.top < 12) cls.push('seat-edge-top');

      const role = isHero ? 'Héroe' : (isVillain ? 'Villano' : '');
      const act = (!isHero && state.lastAction[pos]) ? state.lastAction[pos] : null;
      const actHtml = act && !state.folded[pos] ? actionBadgeHTML(act) : '';
      const chipsHtml = renderSeatChips(state.totalInvBB[pos] || 0, state.streetBetBB[pos] || 0);
      let cardsHtml = '';
      if (!isHero && isParticipant && state.folded[pos]) {
        cardsHtml = seatFoldMarkHTML();
      } else if (!isHero && isParticipant && !state.folded[pos]) {
        cardsHtml = seatCardsHTML(null, false);
      }

      seatsHtml += `<div class="${cls.join(' ')}" style="top:${c.top}%;left:${c.left}%">
        ${cardsHtml}
        <div class="seat-pos">${pos}</div>
        ${role ? `<div class="seat-role">${role}</div>` : ''}
        ${chipsHtml}
        ${actHtml ? `<div class="seat-act-wrap">${actHtml}</div>` : ''}
      </div>`;
    });

    const heroCards = h.heroCards || [];
    const heroPos = h.heroPos || '';
    const heroStreet = state.streetBetBB[heroPos] || 0;
    const heroInv = state.totalInvBB[heroPos] || 0;
    const heroChipsHtml = (heroInv > 0 || heroStreet > 0) ? renderSeatChips(heroInv, heroStreet) : '';
    const heroCardsHtml = heroCards.length >= 2
      ? '<div class="hero-cards">' + heroCards.map(Cards.cardFaceHTML).join('') + '</div>'
      : '';
    const heroAreaHtml =
      '<div class="hero-area">' +
      (heroChipsHtml ? '<div class="hero-chips">' + heroChipsHtml + '</div>' : '') +
      '<div class="hero-label">HÉROE · <span>' + escapeHtml(heroPos) + '</span></div>' +
      heroCardsHtml +
      '</div>';

    const potDisplay = d.potBB;
    const feltCfg = replayFeltConfigFromHand(h);
    const feltClass = layout === '9' ? ' table-9max' : (layout === '3' ? ' table-3max' : '');

    return `<div class="poker-table session-replay-table"><div class="table-felt${feltClass}" data-theme="${loadTableTheme()}" data-format="${feltCfg.formatHub}">
      ${tableChromeHTML(feltCfg)}
      <div class="seats">${seatsHtml}</div>
      <div class="board-area"><div class="pot"><span class="pot-chips">${chipStackHTML(potDisplay || 0)}</span> Bote: <strong class="pot-amt">${fmtBB(potDisplay)} bb</strong></div>
      <div class="board">${board.map(Cards.cardFaceHTML).join('') || '<span style="color:rgba(255,255,255,.3)">— preflop —</span>'}</div></div>
      ${heroAreaHtml}
    </div></div>`;
  }

  function renderReplayStep() {
    const h = currentHand;
    const box = $('#hand-review-content');
    if (replayState.idx >= h.decisions.length) {
      if (handNeedsShowdownStep(h) && !replayState.showdownDone) return renderReplayShowdown();
      return renderReplaySummary();
    }
    const d = h.decisions[replayState.idx];
    const replayStateTable = computeSessionReplayState(h, replayState.idx);

    let html = `<div class="review-head">
      <div class="rec-cards big-cards">${(h.heroCards || []).map(Cards.cardToHTML).join('')}</div>
      <div>
        <h2>Volver a jugar: ${h.heroCode} · ${h.heroPos}</h2>
        <div class="muted-text">Decisión ${replayState.idx + 1} de ${h.decisions.length}</div>
      </div>
    </div>`;
    html += sessionReplayThemeHTML();
    html += renderSessionReplayTableHTML(h, d, replayState.idx, replayStateTable);
    html += renderSessionStreetLogHTML(h, replayStateTable);
    html += `<div class="session-spot-head"><strong>${escapeHtml(d.spot || '')}</strong>`;
    if (d.context) html += `<div class="spot-context">${escapeHtml(d.context)}</div>`;
    html += '</div>';
    const opts = d.options || optionsFor(d.gto);
    const replayMetrics = { toCallBB: replayStateTable.toCallBB };
    html += `<div class="actions" id="replay-actions">` + opts.map((a) =>
      `<button class="btn btn-${btnClassForAction(a)}" data-act="${a}">${escapeHtml(replayActionLabel(a, d, replayMetrics))}</button>`
    ).join('') + `</div>`;
    html += `<div id="replay-feedback"></div>`;
    box.innerHTML = html;
    bindSessionReplayTheme();
    applyTableTheme(loadTableTheme());
    bindTableChromeSessionInfo(box, replayFeltConfigFromHand(h), h);
    scrollSessionReviewToTop();
    $$('#replay-actions [data-act]').forEach((b) => b.addEventListener('click', () => submitReplay(b.dataset.act)));
  }

  function optionsFor(gto) {
    const order = ['fold', 'check', 'call', 'bet_33', 'bet_66', 'bet_100', 'bet', 'raise'];
    return order.filter((a) => gto && gto[a] != null);
  }

  function submitReplay(action) {
    const h = currentHand;
    const d = h.decisions[replayState.idx];
    const board = boardForStreet(h, d.street);
    let evalResult;
    try {
      evalResult = GTO.evaluateSpot(buildReplayEvalInput(h, d, action, board));
    } catch (e) {
      console.error('[submitReplay]', e);
      const fb = $('#replay-feedback');
      if (fb) {
        fb.innerHTML = '<div class="feedback" style="display:block"><p class="admin-error">No se pudo evaluar esta decisión. Prueba «Ver paso a paso real».</p></div>';
      }
      return;
    }
    const ev = evalResult.evaluation;
    if (ev.evErroneous) replayState.userEvLoss += ev.evLoss || 0;
    replayState.total++;
    if (ev.class === 'optima' || ev.class === 'aceptable') replayState.good++;

    showVerdictToast({ class: ev.class, frequency: ev.frequency, evLoss: ev.evLoss });

    $$('#replay-actions [data-act]').forEach((b) => { b.disabled = true; });
    const fb = $('#replay-feedback');
    const sameAsReal = action === d.chosen;
    let html = `<div class="feedback" style="display:block">
      <h3>Tu decisión: <span class="verdict ${ev.class}">${verdictWord(ev.class)}</span>${ev.score != null ? ` · ${ev.score}/100` : ''}</h3>
      <div>Elegiste <strong>${actionName(action)}</strong> · EV perdido: <span class="${ev.evLoss > 0 ? 'net-neg' : 'net-pos'}">${ev.evLoss > 0 ? '-' + fmtBB(ev.evLoss) : '0.00'} bb</span>${ev.evLossTier ? ` (${ev.evLossTier})` : ''}</div>`;
    html += renderDecisionMath(Object.assign({}, d, { mathParams: ev.mathParams, heroEquity: evalResult.heroEquity != null ? Math.round(evalResult.heroEquity * 100) : null, toCallBB: d.toCallBB, action: action }));
    if (evalResult.explanation) html += `<div class="spot-context" style="margin-top:6px;font-size:13px">${escapeHtml(evalResult.explanation)}</div>`;
    html += renderOptionGrid(evalResult.optionBreakdown, action, evalResult.evaluation && evalResult.evaluation.best);
    html += `<div class="dec-matrix-row">${matrixStreetBtn(d.street, replayState.idx, 'session')}</div>`;
    html += `<div class="muted-text" style="margin-top:6px">En la mano real elegiste <strong>${actionName(d.chosen)}</strong> (${verdictWord(d.class)}).${sameAsReal ? ' Misma decisión.' : ''}</div>
      <button class="btn btn-primary" id="replay-next" style="margin-top:12px">${replayNextLabel(h)}</button>
    </div>`;
    fb.innerHTML = html;
    $('#replay-next').addEventListener('click', () => {
      const isLast = replayState.idx + 1 >= h.decisions.length;
      if (isLast && handNeedsShowdownStep(h) && !replayState.showdownDone) {
        replayState.showdownDone = true;
        renderReplayShowdown();
        return;
      }
      replayState.idx++;
      renderReplayStep();
    });
  }

  function replayNextLabel(h) {
    const isLast = replayState.idx + 1 >= h.decisions.length;
    if (!isLast) return 'Siguiente decisión »';
    if (handNeedsShowdownStep(h) && !replayState.showdownDone) return 'Ver river y showdown »';
    return 'Ver resumen';
  }

  function renderReplaySummary() {
    const h = currentHand;
    const box = $('#hand-review-content');
    const acc = replayState.total ? Math.round((replayState.good / replayState.total) * 100) : 100;
    const shows = Object.keys(h.villainShows || {}).filter((n) => n !== currentSession.hero);
    let html = `<div class="feedback" style="display:block">
      <h3>Resumen de tu repetición</h3>
      <div>Acierto: <strong>${acc}%</strong> · EV perdido por tus decisiones: <span class="${replayState.userEvLoss > 0 ? 'net-neg' : 'net-pos'}">-${fmtBB(replayState.userEvLoss)} bb</span></div>
      <div class="muted-text" style="margin-top:6px">En la mano real: acierto ${h.accuracy}% · nota ${fmtHandScore((resolveHandScoreMeta(h, h.decisions, h.totalEvLoss) || {}).score)}/10 · EV perdido -${fmtBB(h.totalEvLoss)} bb · resultado ${h.heroNetBB >= 0 ? '+' : ''}${fmtBB(h.heroNetBB)} bb.</div>`;
    if (shows.length) {
      html += '<div class="result-line">Cartas del rival: ' + shows.map((n) => `${escapeHtml(n)} ${h.villainShows[n].map(Cards.cardToHTML).join('')}`).join(' · ') + '</div>';
    }
    html += `<div class="result-line" style="border:none;padding-top:6px">Board final: ${(h.board || []).map(Cards.cardToHTML).join('') || '—'}</div>`;
    html += `<div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-ghost" id="replay-again">Repetir</button>
      <button class="btn btn-primary" id="replay-stepbystep">Ver paso a paso real</button>
    </div></div>`;
    box.innerHTML = html;
    $('#replay-again').addEventListener('click', () => startInteractiveReplay());
    $('#replay-stepbystep').addEventListener('click', () => renderTimelineReview());
  }

  function replayActionLabel(a, d, metrics) {
    const toCallBB = metrics && metrics.toCallBB != null ? metrics.toCallBB : d.toCallBB;
    const potBB = metrics && metrics.potBB != null ? metrics.potBB : d.potBB;
    if (a === 'call' && toCallBB > 0) return actionName(a) + ' ' + fmtBB(toCallBB) + 'bb';
    if (a.indexOf('bet_') === 0) {
      const mult = a === 'bet_33' ? 0.33 : (a === 'bet_66' ? 0.66 : 1);
      const pct = a === 'bet_33' ? '33%' : (a === 'bet_66' ? '66%' : 'pot');
      const size = round2(Math.max(1, (potBB || 1) * mult));
      return `${fmtBB(size)}bb (${pct})`;
    }
    return actionName(a);
  }

  function actionWord(item) {
    function euro(x) {
      const n = Number(x);
      if (!isFinite(n)) return '0.00';
      return (Math.round(n * 100) / 100).toFixed(2);
    }
    switch (item.type) {
      case 'fold': return 'se retira';
      case 'check': return 'pasa';
      case 'call': return 'iguala ' + euro(item.amount) + '€';
      case 'bet': return 'apuesta ' + euro(item.amount) + '€' + (item.allin ? ' (all-in)' : '');
      case 'raise': return 'sube a ' + euro(item.to) + '€' + (item.allin ? ' (all-in)' : '');
      default: return item.type;
    }
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function round2(x) { return Math.round(x * 100) / 100; }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootApp);
  } else {
    bootApp();
  }

  function bootApp() {
    if (window.PTAuth && window.PTAuth.requireAuth) {
      window.PTAuth.requireAuth(init);
    } else {
      init();
    }
  }
})();
