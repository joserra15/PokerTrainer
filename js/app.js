/*
 * app.js
 * Controlador de la interfaz: orquesta Engine + Store y pinta la mesa.
 */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const fmtBB = (x) => (window.GTOPotMath ? window.GTOPotMath.formatBB(x) : String(Math.round((Number(x) || 0) * 100) / 100));

  /** Incrementar en cada despliegue para comprobar recarga del navegador. */
  const APP_VERSION = window.PT_BUILD || '1.5.2';

  const POS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
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
  const SEAT_COORDS_9 = [
    { top: 96, left: 50 },
    { top: 84, left: 14 },
    { top: 66, left: 3 },
    { top: 42, left: 2 },
    { top: 16, left: 14 },
    { top: 4, left: 34 },
    { top: 4, left: 66 },
    { top: 16, left: 86 },
    { top: 42, left: 98 }
  ];
  const SEAT_COORDS_MOBILE = [
    { top: 94, left: 50 },
    { top: 72, left: 6 },
    { top: 34, left: 4 },
    { top: 6, left: 28 },
    { top: 6, left: 72 },
    { top: 34, left: 96 }
  ];
  const SEAT_COORDS_MOBILE_9 = [
    { top: 93, left: 50 },
    { top: 78, left: 10 },
    { top: 58, left: 3 },
    { top: 36, left: 3 },
    { top: 14, left: 16 },
    { top: 5, left: 36 },
    { top: 5, left: 64 },
    { top: 14, left: 84 },
    { top: 36, left: 97 }
  ];

  let hand = null;
  let pendingForce = null;       // escenario forzado (repaso de errores)
  let repeatErrorsMode = false;
  let leakReplayQueue = [];
  let latestTrainerStatsLeaks = [];
  let latestSessionStatsLeaks = [];

  function emptyByStreet() {
    return {
      preflop: { n: 0, good: 0 },
      flop: { n: 0, good: 0 },
      turn: { n: 0, good: 0 },
      river: { n: 0, good: 0 }
    };
  }

  let session = { hands: 0, net: 0, evLossBB: 0, decisions: 0, good: 0, byStreet: emptyByStreet() };
  let homeBootDone = false;
  const HOME_BOOT_MAX_MS = 8000;

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

  function showPlaySetup() {
    const setup = $('#play-setup');
    const active = $('#play-active');
    if (setup) setup.classList.remove('hidden');
    if (active) active.classList.add('hidden');
  }

  function showPlayTable() {
    const setup = $('#play-setup');
    const active = $('#play-active');
    if (setup) setup.classList.add('hidden');
    if (active) active.classList.remove('hidden');
    const cfg = (hand && hand.playConfig) || playSessionConfig;
    applyTableTheme((cfg && cfg.tableTheme) || loadTableTheme());
  }

  function scrollPlayToTop() {
    const target = $('#tab-play') || $('#play-active') || $('#play-setup');
    if (target && target.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function readPlayConfig() {
    const PC = window.PTPlayConfig;
    if (!PC) return null;
    const gtEl = $('#setup-game-type .setup-chip.active');
    const sdEl = $('#setup-stack-depth .setup-chip.active');
    const scEl = $('#setup-scenario .setup-chip.active');
    const posEl = $('#setup-hero-pos .setup-chip.active');
    const hrEl = $('#setup-hand-range .setup-chip.active');
    const vlEl = $('#setup-villain-level .setup-chip.active');
    const stEl = $('#setup-practice-street .setup-chip.active');
    const thEl = $('#setup-table-theme .setup-chip.active');
    const laEl = $('#setup-live-advisor');
    return PC.normalize({
      gameType: gtEl ? gtEl.dataset.val : 'cash6',
      stackDepth: sdEl ? sdEl.dataset.val : 'bb100',
      scenario: scEl ? scEl.dataset.val : 'random',
      heroPos: posEl ? posEl.dataset.val : 'random',
      handRange: hrEl ? hrEl.dataset.val : 'playable',
      villainLevel: vlEl ? vlEl.dataset.val : 'fish',
      practiceStreet: stEl ? stEl.dataset.val : 'random',
      tableTheme: thEl ? thEl.dataset.val : loadTableTheme(),
      liveAdvisor: laEl ? laEl.checked : false
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
    const t = (theme === 'midnight' || theme === 'crimson') ? theme : 'emerald';
    document.querySelectorAll('#play-active .table-felt, .session-replay-table .table-felt').forEach((felt) => {
      felt.setAttribute('data-theme', t);
    });
  }

  function tableWatermarkHTML() {
    return '<div class="table-watermark" aria-hidden="true">' +
      '<span class="table-watermark-mark"></span>' +
      '<span class="table-watermark-text">PokerForgeAI</span></div>';
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
    window.PTLiveAdvisor.update($('#live-advisor-panel'), hand, isLiveAdvisorOn());
  }

  function bindChipGroup(sel, onChange) {
    const box = $(sel);
    if (!box) return;
    box.addEventListener('click', (e) => {
      const chip = e.target.closest('.setup-chip');
      if (!chip || !box.contains(chip)) return;
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

  function applyPlaySetupConfig(partial) {
    const PC = window.PTPlayConfig;
    if (!PC) return null;
    const cfg = PC.normalize(Object.assign({}, PC.DEFAULT, partial || {}));
    function activate(sel, val) {
      const box = $(sel);
      if (!box || val == null) return;
      let found = false;
      box.querySelectorAll('.setup-chip').forEach((c) => {
        const on = c.dataset.val === String(val);
        c.classList.toggle('active', on);
        if (on) found = true;
      });
      return found;
    }
    activate('#setup-game-type', cfg.gameType);
    activate('#setup-stack-depth', cfg.stackDepth);
    activate('#setup-scenario', cfg.scenario);
    renderHeroPosChips();
    activate('#setup-hero-pos', cfg.heroPos);
    activate('#setup-hand-range', cfg.handRange);
    activate('#setup-villain-level', cfg.villainLevel);
    activate('#setup-practice-street', cfg.practiceStreet);
    if (cfg.tableTheme) {
      activate('#setup-table-theme', cfg.tableTheme);
      saveTableTheme(cfg.tableTheme);
    }
    const laEl = $('#setup-live-advisor');
    if (laEl && typeof cfg.liveAdvisor === 'boolean') laEl.checked = cfg.liveAdvisor;
    return readPlayConfig();
  }

  async function startGuidedTraining(partial) {
    const cfg = applyPlaySetupConfig(partial || {});
    if (!cfg) {
      goToTab('play', { setup: true });
      return;
    }
    playSessionConfig = cfg;
    if (window.PTLiveAdvisor && playSessionConfig) {
      PTLiveAdvisor.savePreference(!!playSessionConfig.liveAdvisor);
    }
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
    bindChipGroup('#setup-game-type', renderHeroPosChips);
    bindChipGroup('#setup-stack-depth');
    bindChipGroup('#setup-scenario', renderHeroPosChips);
    bindChipGroup('#setup-hand-range');
    bindChipGroup('#setup-villain-level');
    bindChipGroup('#setup-practice-street');
    bindChipGroup('#setup-table-theme', () => {
      const thEl = $('#setup-table-theme .setup-chip.active');
      const theme = thEl ? thEl.dataset.val : 'emerald';
      saveTableTheme(theme);
      applyTableTheme(theme);
    });
    restoreTableThemeChip();
    const laEl = $('#setup-live-advisor');
    if (laEl && window.PTLiveAdvisor) {
      laEl.checked = PTLiveAdvisor.loadPreference();
      laEl.addEventListener('change', function () {
        PTLiveAdvisor.savePreference(laEl.checked);
      });
    }
    const startBtn = $('#play-start');
    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        playSessionConfig = readPlayConfig();
        if (window.PTLiveAdvisor && playSessionConfig) {
          PTLiveAdvisor.savePreference(!!playSessionConfig.liveAdvisor);
        }
        resetPlaySession(false);
        showPlayTable();
        scrollPlayToTop();
        await yieldToPaint();
        scrollPlayToTop();
        void startNewHand();
      });
    }
    renderHeroPosChips();
  }

  function init() {
    scheduleHomeBootFallback();
    bindTabs();
    bindMobileNav();
    bindControls();
    bindPlaySetup();
    bindRangesFilters();
    bindHome();
    if (window.PTDisclaimer) {
      PTDisclaimer.mount('#app-disclaimer', 'foot');
    }
    window.addEventListener('pt-go-tab', (e) => {
      const d = e.detail || {};
      if (d.tab === 'play') goToTab('play', { setup: !!d.setup, table: !!d.table });
      else if (d.tab) goToTab(d.tab);
    });
    if (window.PTBilling) {
      window.PTBilling.bindPaywall();
      window.PTBilling.handleCheckoutReturn();
    }
    if (window.PTEntitlements && window.PTEntitlements.ensureLoaded) {
      window.PTEntitlements.ensureLoaded();
    }
    window.addEventListener('pt-auth-ready', function () {
      if (window.PTEntitlements && window.PTEntitlements.refresh) window.PTEntitlements.refresh();
    });
    window.addEventListener('pt-plan-changed', function () {
      renderPricing();
    });
    window.runCloudSync = runCloudSync;
    const verEl = $('#app-version');
    if (verEl) verEl.textContent = 'v' + APP_VERSION;
    try {
      if (!window.Engine) throw new Error('Motor no cargado');
      setPlayBoot(false);
      showPlaySetup();
      goToTab('home');
    } catch (e) {
      console.error('[Play] init failed', e);
      setPlayBoot(true, 'Error al cargar. Recarga la página.');
      finishHomeBoot();
    }
    refreshSessionUI();
  }

  function firstNameFromUser(user) {
    if (!user || !user.name) return '';
    const n = String(user.name).trim();
    if (!n) return '';
    return n.split(/\s+/)[0];
  }

  const DEFAULT_HOME_LEAD =
    'Practica spots reales, consulta rangos solver, repasa tus errores y resuelve dudas con el <strong>IA Coach</strong>.';

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

  function loadHomeGreeting(leadEl) {
    if (!leadEl) return;
    const reqId = ++homeGreetingRequest;
    leadEl.classList.add('home-lead--loading');
    leadEl.textContent = 'Preparando tu plan de entrenamiento…';
    if (!window.PTAIReport || !PTAIReport.fetchHomeGreeting) {
      leadEl.classList.remove('home-lead--loading');
      leadEl.innerHTML = DEFAULT_HOME_LEAD;
      return;
    }
    PTAIReport.fetchHomeGreeting(buildHomeStatsBundle)
      .then(function (text) {
        if (reqId !== homeGreetingRequest) return;
        const homeTab = $('#tab-home');
        if (!homeTab || !homeTab.classList.contains('active')) return;
        leadEl.classList.remove('home-lead--loading');
        if (text) {
          leadEl.textContent = text;
        } else {
          leadEl.innerHTML = DEFAULT_HOME_LEAD;
        }
      })
      .catch(function () {
        if (reqId !== homeGreetingRequest) return;
        leadEl.classList.remove('home-lead--loading');
        leadEl.innerHTML = DEFAULT_HOME_LEAD;
      });
  }

  function renderHome() {
    const greetEl = $('#home-greeting');
    const statsEl = $('#home-stats');
    if (!greetEl || !statsEl) {
      finishHomeBoot();
      return;
    }

    const user = window.PT_AUTH_USER;
    const first = firstNameFromUser(user);
    greetEl.textContent = first ? ('¡Hola, ' + first + '!') : 'Bienvenido al felt';

    const leadEl = $('.home-lead');
    if (leadEl) loadHomeGreeting(leadEl);

    const coachCard = document.querySelector('#home-grid [data-scroll-coach]');
    if (coachCard) coachCard.classList.toggle('hidden', !!user);

    const st = Store.getStats();
    const errs = Store.getErrors();
    const hist = Store.getHistory();
    const decisions = st.decisions || 0;
    const accuracy = decisions
      ? Math.round((((st.optima || 0) + (st.aceptable || 0)) / decisions) * 100)
      : null;

    statsEl.innerHTML = [
      { val: st.handsPlayed || 0, lbl: 'Manos entrenadas', cls: '' },
      { val: accuracy != null ? accuracy + '%' : '—', lbl: 'Acierto global', cls: 'accent' },
      { val: errs.length, lbl: 'Errores a repasar', cls: errs.length ? 'warn' : '' },
      { val: hist.length, lbl: 'En histórico', cls: '' }
    ].map((s) =>
      '<div class="home-stat ' + s.cls + '"><span class="val">' + escapeHtml(String(s.val)) + '</span><span class="lbl">' + escapeHtml(s.lbl) + '</span></div>'
    ).join('');

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
    if (coachMount && window.PTAIReport && PTAIReport.mountWelcome) {
      PTAIReport.mountWelcome(coachMount, {
        userName: firstNameFromUser(window.PT_AUTH_USER),
        onTrain: () => goToTab('play', { setup: true })
      });
    }

    finishHomeBoot();
    if (window.PTUsageUI && PTUsageUI.refreshHost) PTUsageUI.refreshHost($('#home-usage'));
    if (window.PTBilling && PTBilling.mountAnnualUpsell) {
      var ent = window.PTEntitlements && PTEntitlements.get ? PTEntitlements.get() : null;
      PTBilling.mountAnnualUpsell($('#home-annual-upsell'), ent);
    }
    if (window.PTReEngage && PTReEngage.renderBanner) PTReEngage.renderBanner();
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
      });
    }

    window.addEventListener('pt-auth-bootstrap', () => renderHome());
    window.addEventListener('pt-auth-ready', () => renderHome());
    window.addEventListener('pt-cloud-synced', () => {
      if ($('#tab-home') && $('#tab-home').classList.contains('active')) renderHome();
    });
  }

  function goToTab(tabId, opts) {
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
    if (tabId === 'learn') {
      if (window.PTBeginnerGuide && PTBeginnerGuide.render) {
        PTBeginnerGuide.render($('#learn-content'));
      }
    }
    if (tabId === 'analysis') {
      if (window.PTHandAnalysis && PTHandAnalysis.render) {
        PTHandAnalysis.render($('#analysis-content'));
      }
    }
    if (tabId === 'history') renderHistory();
    if (tabId === 'errors') renderErrors();
    if (tabId === 'stats') renderStats();
    if (tabId === 'contact') {
      if (window.PTContact && PTContact.render) PTContact.render();
      if (window.PTContact && PTContact.refreshBadge) PTContact.refreshBadge();
    }
    if (tabId === 'play' && window.PTUsageUI && PTUsageUI.refreshHost) {
      PTUsageUI.refreshHost($('#play-usage'));
    }
    if (tabId === 'ranges') renderRangesExplorer();
    if (tabId === 'pricing') renderPricing();
    if (tabId === 'sessions') {
      if (window.PTUsageUI && PTUsageUI.refreshHost) PTUsageUI.refreshHost($('#sessions-usage'));
      if (opts.openSessionId) {
        showSessionLoading('Cargando sesión…');
        void openSession(opts.openSessionId);
        refreshSessionsFromCloud();
        return;
      }
      showSessionsView('home');
      renderSessionsList();
      refreshSessionsFromCloud();
    }
    if (tabId === 'admin') {
      var adminUser = window.PTAuth && window.PTAuth.getUser ? window.PTAuth.getUser() : null;
      var demoOn = window.PTDemo && window.PTDemo.isActive && window.PTDemo.isActive();
      if (!adminUser || !adminUser.isAdmin || demoOn) {
        goToTab('home');
        return;
      }
      if (window.PTAdmin && window.PTAdmin.render) window.PTAdmin.render();
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

  function isMobileLayout() {
    return window.matchMedia('(max-width: 680px)').matches;
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
      if (hand) renderTable();
    });
  }

  function bindTabs() {
    $$('.tab').forEach((t) => t.addEventListener('click', () => {
      const tabId = t.dataset.tab;
      if (tabId === 'play') goToTab('play', { table: $('#play-active') && !$('#play-active').classList.contains('hidden') });
      else goToTab(tabId);
    }));
  }

  function bindControls() {
    $('#new-hand').addEventListener('click', () => { pendingForce = null; leakReplayQueue = []; void startNewHand(); });
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
    $('#export-data').addEventListener('click', exportData);
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
    const rmm = $('#range-matrix-modal');
    if (rmm) {
      rmm.addEventListener('click', (e) => {
        if (e.target.id === 'range-matrix-modal' || e.target.closest('[data-close-matrix]')) closeRangeMatrixModal();
      });
    }
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-range-matrix]');
      if (!btn) return;
      const source = btn.dataset.matrixSource || 'session';
      const h = source === 'trainer' ? hand : currentHand;
      if (!h || !h.decisions) return;
      const idx = parseInt(btn.dataset.matrixDecisionIdx, 10);
      if (isNaN(idx) || !h.decisions[idx]) return;
      e.preventDefault();
      const kind = btn.dataset.matrixKind || 'gto';
      if (kind === 'villain') openVillainMatrixModal(h, h.decisions[idx], source);
      else openRangeMatrixModal(h, h.decisions[idx], source);
    });

    // sesiones
    $('#session-file').addEventListener('change', (e) => {
      $('#process-session').disabled = !e.target.files.length;
      $('#import-status').textContent = e.target.files.length ? `Listo para procesar: ${e.target.files[0].name}` : '';
    });
    $('#process-session').addEventListener('click', processSessionFile);
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
    session = { hands: 0, net: 0, evLossBB: 0, decisions: 0, good: 0, byStreet: emptyByStreet() };
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
    startingHand = true;
    setPlayTableLoading(true);
    setPlayHandButtonsDisabled(true);
    $('#feedback').classList.add('hidden');
    await yieldToPaint();
    try {
      const Ent = window.PTEntitlements;
      if (Ent && Ent.ensureLoaded) {
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

      let force = pendingForce;
      const cfg = force ? (replayPlayConfig || playSessionConfig) : playSessionConfig;
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
      const needsStreetFastForward = streetTarget && streetTarget !== 'random' && streetTarget !== 'preflop' && Engine.fastForwardToStreet;
      if (needsStreetFastForward) {
        let tries = 0;
        while (tries < 12) {
          hand = Engine.newHand(force || undefined, cfg);
          Engine.fastForwardToStreet(hand, streetTarget);
          if (!hand.result && hand.current && hand.stage === streetTarget) break;
          tries++;
        }
      } else {
        hand = Engine.newHand(force || undefined, cfg);
      }
      pendingForce = null;
      if (window.PTLog && PTLog.event && hand) {
        PTLog.event('hand_start', {
          scenario: (hand.scenario && hand.scenario.type) || 'unknown',
          range: (cfg && cfg.handRange) || 'playable',
          villain: (cfg && cfg.villainLevel) || 'fish',
          replay: !!force
        });
      }
      $('#hand-log').innerHTML = '';
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
    replayPlayConfig = (snap && snap.playConfig) || rec.playConfig || playSessionConfig || null;

    const disp = (snap && snap.displayHeroPos) || rec.displayHeroPos;
    if (disp && !pendingForce.heroPos) pendingForce.displayHeroPos = disp;
    return true;
  }

  function replayFromStored(rec) {
    if (!prepareReplayFromStored(rec)) return false;
    goToPlay();
    void startNewHand();
    return true;
  }

  // Juega en el entrenador una mano guardada de "Análisis de manos": mismas cartas
  // (héroe, villano y comunitarias) pero la app juega las acciones de los villanos.
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
    if (Importer.ensureHandSummary) Importer.ensureHandSummary(currentHand);
    if (Importer.ensureFullTimeline) Importer.ensureFullTimeline(currentHand);
    try {
      if (Importer.recomputeHandDecisions) Importer.recomputeHandDecisions(currentHand);
    } catch (e) {
      console.error('[Analysis] recompute failed', e);
    }
    goToTab('sessions');
    showSessionsView('review');
    if (mode === 'replay') startInteractiveReplay();
    else renderTimelineReview();
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

  // Repite la mano actual con la MISMA semilla (mismas cartas y board si juegas igual)
  function replayCurrentHand() {
    if (!hand) return;
    replayFromStored({
      seed: hand.seed,
      scenarioRaw: hand.scenario,
      playConfig: hand.playConfig,
      displayHeroPos: hand.displayHeroPos,
      replaySnapshot: hand.replaySnapshot
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
    if (hand && Engine.syncTableInvested) Engine.syncTableInvested(hand);
    const fmt = window.GTOPotMath ? window.GTOPotMath.formatBB : (x) => String(x);
    const pot = hand.current ? hand.current.potBB : hand.potBB;
    $('#hero-pos').textContent = hand.displayHeroPos || hand.hero.pos;
    $('#pot').innerHTML = '<span class="pot-chips"><span class="chip-ico"></span></span> Bote: ' + (pot != null ? fmt(pot) : '-') + ' bb';
    $('#hero-cards').innerHTML = hand.hero.cards.map(Cards.cardToHTML).join('');
    $('#hero-handname').textContent = handNameOnBoard();
    $('#hero-action').innerHTML = actionBadgeHTML(hand.heroAction);
    const heroTbl = hand.table || {};
    const heroStreet = (heroTbl.streetBet && hand.hero.pos) ? (heroTbl.streetBet[hand.hero.pos] || 0) : 0;
    const heroInv = hand.heroInvested || 0;
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
    const mobile = isMobileLayout();
    if (vBar) {
      const showBar = mobile && hand.villainAction;
      vBar.innerHTML = showBar ? actionBadgeHTML(hand.villainAction) : '';
      vBar.setAttribute('aria-hidden', showBar ? 'false' : 'true');
      vBar.classList.toggle('is-visible', !!showBar);
    }
    const boardArea = document.querySelector('.board-area');
    if (boardArea) boardArea.classList.toggle('has-villain-bar', !!(mobile && hand.villainAction));
    const felt = document.querySelector('#play-active .table-felt');
    if (felt) felt.classList.toggle('table-9max', is9MaxTable());
    const cfg = (hand && hand.playConfig) || playSessionConfig;
    applyTableTheme((cfg && cfg.tableTheme) || loadTableTheme());
    const heroSeatPos = hand.displayHeroPos || hand.hero.pos;
    const heroDealerEl = $('#hero-dealer');
    if (heroDealerEl) heroDealerEl.classList.toggle('hidden', heroSeatPos !== 'BTN');
    renderBoard();
    renderSeats();
    $('#spot-context').textContent = hand.current ? hand.current.context : (hand.result ? hand.result.reason : '');
    updateLiveAdvisor();
  }

  // Genera el HTML de una "burbuja" de acción (Check / Fold / fichas + bb)
  function actionBadgeHTML(action) {
    if (!action) return '';
    const t = action.type;
    if (t === 'check') return '<span class="seat-act check">Check</span>';
    if (t === 'fold') return '<span class="seat-act fold">Fold</span>';
    const labels = { open: 'Abre', bet: 'Apuesta', call: 'Iguala', raise: 'Sube', allin: 'All-in' };
    const lbl = labels[t] || t;
    const amt = action.amount != null ? `${action.amount} bb` : '';
    return `<span class="seat-act bet"><span class="chip-ico"></span>${lbl}${amt ? ' · ' + amt : ''}</span>`;
  }

  function handNameOnBoard() {
    if (!hand.board.length) return '';
    try {
      const ev = Cards.evaluate(hand.hero.cards.concat(hand.board));
      return 'Tu mano: ' + ev.name;
    } catch (e) { return ''; }
  }

  function renderBoard() {
    const complete = hand.stage === 'complete';
    let html = hand.board.map(Cards.cardToHTML).join('');
    $('#board').innerHTML = html || '<span style="color:rgba(255,255,255,.3)">— preflop —</span>';
  }

  const SEAT_AVATAR_SVG = '<svg viewBox="0 0 24 24" class="seat-avatar-svg" aria-hidden="true"><circle cx="12" cy="8.2" r="4.2"/><path d="M3.5 20.5c0-4.4 3.8-7.6 8.5-7.6s8.5 3.2 8.5 7.6"/></svg>';

  function renderSeatChips(totalBB, streetBB) {
    const fmt = window.GTOPotMath ? window.GTOPotMath.formatBB : (x) => String(x);
    if (streetBB > 0) {
      return `<div class="seat-chips"><span class="seat-chips-street" title="Apuesta en la calle"><span class="chip-ico"></span>${fmt(streetBB)} bb</span></div>`;
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
    return `<div class="seat-bet ${placement || 'bet-below'}" title="Fichas en juego"><span class="chip-ico"></span><span class="seat-bet-amt">${fmt(inFrontBB)} bb</span></div>`;
  }

  function is9MaxTable() {
    const cfg = (hand && hand.playConfig) || playSessionConfig;
    return !!(window.PTPlayConfig && cfg && PTPlayConfig.is9Max(cfg));
  }

  function tablePosRing() {
    return is9MaxTable() ? POS_9 : POS;
  }

  function seatCoordsForTable() {
    const mobile = isMobileLayout();
    if (is9MaxTable()) return mobile ? SEAT_COORDS_MOBILE_9 : SEAT_COORDS_9;
    return mobile ? SEAT_COORDS_MOBILE : SEAT_COORDS;
  }

  function heroSeatOnTable() {
    if (!hand) return null;
    return hand.displayHeroPos || hand.hero.pos;
  }

  function villainSeatOnTable() {
    if (!hand || !hand.villain || !hand.villain.pos) return null;
    if (window.PTPlayConfig && hand.playConfig && PTPlayConfig.is9Max(hand.playConfig)) {
      return PTPlayConfig.villainTableSeat(hand) || hand.villain.pos;
    }
    return hand.villain.pos;
  }

  function renderSeatStack(hand, pos) {
    const stacks = window.PTStacks;
    if (!stacks || !hand || !hand.stacks || !hand.stacks[pos]) return '';
    const fmt = window.GTOPotMath ? window.GTOPotMath.formatBB : (x) => String(x);
    const rem = stacks.remaining(hand, pos);
    return `<div class="seat-stack" title="Stack restante">${fmt(rem)} bb</div>`;
  }

  function renderSeats() {
    const mobile = isMobileLayout();
    const coords = seatCoordsForTable();
    const ring = ringFromHero(heroSeatOnTable());
    const villainPos = villainSeatOnTable();
    const tbl = hand.table || {};
    const folded = tbl.folded || {};
    const invested = tbl.invested || {};
    const streetBet = tbl.streetBet || {};
    const inHand = tbl.inHand instanceof Set ? tbl.inHand : new Set(tbl.inHand || []);
    const showdown = hand.stage === 'complete' && hand.result && hand.result.showdown;
    const holeCards = tbl.holeCards || {};
    let html = '';
    ring.forEach((pos, i) => {
      const c = coords[i];
      const isHero = pos === heroSeatOnTable();
      const isVillain = villainPos && pos === villainPos;
      const isCaller = hand.scenario && hand.scenario.callerPos === pos;
      const inPot = inHand.has(pos) && !folded[pos] && !isHero;
      const cls = ['seat'];
      if (isHero) cls.push('hero');
      if (isVillain) cls.push('villain');
      if (isCaller) cls.push('caller');
      if (pos === 'BTN') cls.push('dealer');
      if (c.top < 20) cls.push('seat-top');
      if (c.top > 70) cls.push('seat-bottom');
      if (c.left < 22) cls.push('seat-edge-left');
      else if (c.left > 78) cls.push('seat-edge-right');
      if (c.top < 12) cls.push('seat-edge-top');
      if (folded[pos]) cls.push('folded');

      let role = isHero ? 'Héroe' : (isVillain ? 'Villano' : (isCaller ? 'Pagador' : ''));
      const seatActs = hand.seatActions || {};
      let actHtml = '';
      if (!folded[pos]) {
        const skipSeatAct = mobile && isVillain && hand.villainAction;
        if (!skipSeatAct && isVillain && hand.villainAction) actHtml = actionBadgeHTML(hand.villainAction);
        else if (seatActs[pos]) actHtml = actionBadgeHTML(seatActs[pos]);
      }

      const showCards = inPot && holeCards[pos] && holeCards[pos].length >= 2;
      let cardsHtml = '';
      if (showCards) {
        if (showdown) {
          cardsHtml = '<div class="seat-cards showdown">' + holeCards[pos].map(Cards.cardToHTML).join('') + '</div>';
        } else {
          cardsHtml = '<div class="seat-cards">' + Cards.cardBackHTML() + Cards.cardBackHTML() + '</div>';
        }
      }

      const totalInv = invested[pos] || 0;
      const stBet = streetBet[pos] || 0;
      const inFront = folded[pos] ? 0 : (stBet > 0 ? stBet : (hand.stage === 'preflop' ? totalInv : 0));
      const showFullSeat = !mobile || isVillain || isCaller || stBet > 0 || showCards;
      if (mobile && !showFullSeat && !isHero) cls.push('seat-mini');
      const stackHtml = showFullSeat ? renderSeatStack(hand, pos) : '';
      const betHtml = renderSeatBet(inFront, seatBetPlacement(c));

      html += `<div class="${cls.join(' ')}" style="top:${c.top}%;left:${c.left}%">
        <div class="seat-body">
          <span class="seat-avatar">${SEAT_AVATAR_SVG}</span>
          ${cardsHtml}
          <div class="seat-pos">${pos}</div>
          <div class="seat-role">${role}</div>
          ${stackHtml}
          ${actHtml ? `<div class="seat-act-wrap">${actHtml}</div>` : ''}
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
  function renderActions() {
    const node = hand.current;
    const box = $('#actions');
    if (!node) { box.innerHTML = ''; box.className = 'actions'; return; }
    const n = node.options.length;
    box.className = 'actions' + (n >= 2 && n <= 4 ? ' actions-grid' : '');
    box.innerHTML = node.options.map((o) =>
      `<button class="btn btn-${btnClassForAction(o.id)}" data-action="${o.id}">${o.label}</button>`
    ).join('');
    $$('#actions button').forEach((b) =>
      b.addEventListener('click', () => onAction(b.dataset.action)));
    updateLiveAdvisor();
  }

  function btnClassForAction(id) {
    if (!id) return 'fold';
    if (id.indexOf('bet_') === 0 || id === 'bet') return 'bet';
    return id.split('_')[0];
  }

  function onAction(actionId) {
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
    showVerdictToast(d);
    $('#feedback').classList.add('hidden');
    renderTable();

    if (hand.stage === 'complete') {
      finishHand();
    } else {
      renderActions();
    }
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
      if (mp.deltaEV > 0) parts.push(`ΔEV ${mp.deltaEV}bb`);
    } else if (d.heroEquity != null) {
      parts.push(`Equity ${d.heroEquity}%`);
    }
    if (!parts.length) return '';
    return `<div class="dec-math muted-text">${parts.join(' · ')}</div>`;
  }

  function renderHandDecisionsSummary(decisions, matrixSource) {
    if (!decisions || !decisions.length) return '';
    let html = '<div class="card-box" style="margin-top:14px"><h3>Evaluación GTO de la mano</h3>';
    decisions.forEach((d, i) => {
      html += `<div class="dec-review">
        <div class="dec-head"><strong>${cap(d.street)}</strong> · ${escapeHtml(d.label || d.chosen || d.action || '')}
          <span class="verdict ${d.class}">${verdictWord(d.class)}</span>
          ${renderConfidenceBadge(d)}
          ${decisionEvLossHtml(d)}
        </div>`;
      html += renderDecisionMath(d);
      if (d.context) html += `<div class="dec-expl muted-text">${escapeHtml(d.context)}</div>`;
      if (d.explanation) html += `<div class="dec-expl">${escapeHtml(d.explanation)}</div>`;
      if (d.renderAlert) html += `<div class="dec-expl" style="color:var(--orange)">${escapeHtml(d.renderAlert)}</div>`;
      if (d.optionBreakdown && d.optionBreakdown.length) {
        html += renderOptionGrid(d.optionBreakdown, d.action || d.chosen, d.best);
      } else if (d.gto) {
        html += renderGtoBars(d.gto);
      }
      if (matrixSource && window.PTRangeMatrix) {
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

  function showVerdictToast(d) {
    const toast = $('#verdict-toast');
    if (!toast) return;
    const pct = Math.round((d.frequency || 0) * 100);
    toast.className = 'verdict-toast visible ' + d.class;
    toast.innerHTML = `<div class="vt-verdict">${verdictWord(d.class)}</div>
      <div class="vt-freq">${pct}% GTO</div>
      ${d.evLoss > 0 ? `<div class="vt-ev">-${fmtBB(d.evLoss)} bb</div>` : ''}`;
    clearTimeout(showVerdictToast._t);
    showVerdictToast._t = setTimeout(() => { toast.classList.remove('visible'); }, 1100);
  }

  function renderOptionGrid(breakdown, chosenId, bestId) {
    if (!breakdown || !breakdown.length) return '';
    const best = bestId || (breakdown[0] && breakdown[0].id);
    let html = '<div class="opt-grid">';
    breakdown.forEach((o) => {
      const isChosen = o.id === chosenId;
      const isBest = o.id === best;
      html += `<div class="opt-pill ${isChosen ? 'chosen' : ''} ${isBest ? 'best' : ''}">
        <span class="opt-lbl">${escapeHtml(o.label)}</span>
        <span class="opt-pct">${o.pct}%</span>
      </div>`;
    });
    return html + '</div>';
  }

  let matrixJob = 0;
  let rangesState = { spot: 'RFI', heroPos: 'UTG', villainPos: 'UTG', callerPos: 'HJ', gameType: 'cash6', stackDepth: 'standard' };

  function readRangesContext() {
    const gtEl = $('#ranges-game-type .setup-chip.active');
    const sdEl = $('#ranges-stack-depth .setup-chip.active');
    return {
      gameType: gtEl ? gtEl.dataset.val : rangesState.gameType,
      stackDepth: sdEl ? sdEl.dataset.val : rangesState.stackDepth
    };
  }

  function bindRangesFilters() {
    bindChipGroup('#ranges-game-type', function () {
      rangesState.gameType = readRangesContext().gameType;
      renderRangesExplorer();
    });
    bindChipGroup('#ranges-stack-depth', function () {
      rangesState.stackDepth = readRangesContext().stackDepth;
      renderRangesExplorer();
    });
  }

  function matrixStreetBtn(street, decisionIdx, source) {
    if (street === 'preflop') {
      return `<button type="button" class="btn btn-ghost btn-matrix" data-range-matrix="1" data-matrix-kind="gto" data-matrix-street="${street}" data-matrix-decision-idx="${decisionIdx}" data-matrix-source="${source}">Matriz GTO</button>`;
    }
    return `<button type="button" class="btn btn-ghost btn-matrix" data-range-matrix="1" data-matrix-kind="villain" data-matrix-street="${street}" data-matrix-decision-idx="${decisionIdx}" data-matrix-source="${source}">Matriz villano</button>`;
  }

  function closeRangeMatrixModal() {
    matrixJob++;
    const modal = $('#range-matrix-modal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('range-matrix-open');
  }

  function renderRangeMatrixGrid(result, heroCode, mode, villainCode) {
    const ranks = result.ranks;
    let html = '<div class="range-matrix-wrap"><div class="range-matrix-grid">';
    html += '<div class="rm-corner"></div>';
    ranks.forEach((r) => { html += `<div class="rm-label">${r}</div>`; });
    for (let row = 0; row < 13; row++) {
      html += `<div class="rm-label">${ranks[row]}</div>`;
      for (let col = 0; col < 13; col++) {
        const cell = result.cells[row][col];
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

    const ctx = readRangesContext();
    rangesState.gameType = ctx.gameType;
    rangesState.stackDepth = ctx.stackDepth;
    if (contextLabel && RR) contextLabel.textContent = RR.contextLabel(ctx);

    const spot = RM.EXPLORER_SPOTS[rangesState.spot] || RM.EXPLORER_SPOTS.RFI;
    const vsPairs = RM.validVsRfiPairs(ctx);
    const vs3Pairs = RM.validVs3betPairs ? RM.validVs3betPairs(ctx) : {};

    spotRow.innerHTML = Object.keys(RM.EXPLORER_SPOTS).map((id) =>
      `<button type="button" class="ranges-spot-btn${rangesState.spot === id ? ' active' : ''}" data-ranges-spot="${id}">${RM.EXPLORER_SPOTS[id].label}</button>`
    ).join('');

    let heroPositions = RM.heroPositionsForSpot(rangesState.spot, ctx);
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
    if (heroPositions.indexOf(rangesState.heroPos) < 0) rangesState.heroPos = heroPositions[0];

    heroRow.innerHTML = heroPositions.map((p) =>
      `<button type="button" class="ranges-pos-btn${rangesState.heroPos === p ? ' hero-active' : ''}" data-ranges-hero="${p}">${p}</button>`
    ).join('');

    const needsVillain = spot.villainPositions && spot.villainPositions.length > 0;
    const isSqueeze = rangesState.spot === 'squeeze';
    if (villainBlock) villainBlock.classList.toggle('hidden', !needsVillain);
    if (callerBlock) callerBlock.classList.toggle('hidden', !isSqueeze);
    if (needsVillain) {
      let villainPositions = RM.villainPositionsForSpot(rangesState.spot, ctx);
      if (rangesState.spot === '3bet') {
        villainPositions = vsPairs[rangesState.heroPos] || villainPositions;
        if (villainPositions.indexOf(rangesState.villainPos) < 0) rangesState.villainPos = villainPositions[0];
      } else if (rangesState.spot === '4bet') {
        villainPositions = vs3Pairs[rangesState.heroPos] || villainPositions;
        if (villainPositions.indexOf(rangesState.villainPos) < 0) rangesState.villainPos = villainPositions[0];
      } else if (isSqueeze && RM.validSqueezeOpeners) {
        villainPositions = RM.validSqueezeOpeners(rangesState.heroPos);
        if (!villainPositions.length) villainPositions = spot.villainPositions.slice();
        if (villainPositions.indexOf(rangesState.villainPos) < 0) rangesState.villainPos = villainPositions[0];
      } else if (villainPositions.indexOf(rangesState.villainPos) < 0) {
        rangesState.villainPos = villainPositions[0];
      }
      if (villainLabel) villainLabel.textContent = spot.villainLabel || 'Villano:';
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
    const input = RM.buildExplorerInput(
      rangesState.spot,
      rangesState.heroPos,
      needsVillain ? rangesState.villainPos : null,
      ctx,
      squeezeCaller
    );
    if (titleEl) {
      titleEl.textContent = isSqueeze
        ? RM.explorerTitle(rangesState.spot, rangesState.heroPos, rangesState.villainPos, squeezeCaller)
        : RM.explorerTitle(rangesState.spot, rangesState.heroPos, rangesState.villainPos);
    }

    if (!input) {
      host.innerHTML = '<p class="muted-text">Combinación de posiciones no disponible en las tablas.</p>';
      return;
    }

    host.innerHTML = '<div class="range-matrix-progress">Calculando…</div>';
    RM.computeGtoMatrixAsync(input, function (done, total) {
      const prog = host.querySelector('.range-matrix-progress');
      if (prog) prog.textContent = `Calculando… ${Math.round((done / total) * 100)}%`;
    }).then(function (result) {
      host.innerHTML = renderRangeMatrixGrid(result, null, 'gto');
    }).catch(function (e) {
      host.innerHTML = '<p class="muted-text">Error: ' + escapeHtml(e.message || 'fallo') + '</p>';
    });

    spotRow.querySelectorAll('[data-ranges-spot]').forEach((b) => {
      b.onclick = function () {
        rangesState.spot = b.dataset.rangesSpot;
        renderRangesExplorer();
      };
    });
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
      if (ent.usage && ent.limits) {
        if (ent.limits.trainer_hands_per_day != null) {
          line += ' · Entrenador hoy: ' + ent.usage.trainer_hands_today + '/' + ent.limits.trainer_hands_per_day;
        }
        if (ent.limits.import_sessions_per_month != null) {
          line += ' · Imports mes: ' + (Number(ent.usage.import_sessions_month) || 0) + '/' + ent.limits.import_sessions_per_month;
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
        id: 'free', title: 'Gratis', price: '0 €', period: '/mes', featured: false,
        features: ['15 manos entrenador/día', '1 sesión import/mes (máx. 200 manos)', 'IA solo con bono', 'Histórico 30 días'],
        cta: null
      },
      {
        id: 'pro', title: plans.pro ? plans.pro.label : 'Study',
        price: (plans.pro ? plans.pro.monthly : '14,99') + ' €', period: '/mes', featured: false,
        features: ['Entrenador ilimitado', 'Import ilimitado', '5 consultas IA Coach/mes', 'Sync, estadísticas y repaso'],
        cta: 'pro'
      },
      {
        id: 'premium', title: plans.premium ? plans.premium.label : 'Coach',
        price: (plans.premium ? plans.premium.monthly : '34,99') + ' €', period: '/mes', featured: false,
        features: ['Todo Study', '35 consultas IA Coach/mes', 'Informes y preguntas sobre manos y sesiones', 'Soporte prioritario'],
        cta: 'premium'
      }
    ];

    const Billing = window.PTBilling;
    const billingOn = !!(Billing && Billing.enabled && Billing.enabled());
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
      if (!isPaidSub) {
        // Usuario Gratis: alta normal por checkout.
        if (c.cta && !isCurrent) {
          btns = '<button type="button" class="btn btn-primary" data-checkout="' + c.cta + '" data-interval="month">Mensual</button>';
          if (billingOn) {
            btns += '<button type="button" class="btn btn-ghost" data-checkout="' + c.cta + '" data-interval="year">Anual</button>';
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
        if (billingOn && curInterval === 'month') {
          btns += '<button type="button" class="btn btn-ghost btn-sm" data-plan-change="' + c.id + '" data-interval="year">Cambiar a anual</button>';
        } else if (billingOn && curInterval === 'year') {
          btns += '<button type="button" class="btn btn-ghost btn-sm" data-plan-change="' + c.id + '" data-interval="month">Cambiar a mensual</button>';
        }
        if (canceling && billingOn) {
          btns += '<button type="button" class="btn btn-primary btn-sm" data-plan-portal="1">Reactivar</button>';
        }
      } else if (billingOn) {
        // Otro plan de pago: upgrade o downgrade.
        const verb = c.id === 'premium' ? 'Mejorar a ' : 'Cambiar a ';
        btns = '<button type="button" class="btn btn-primary" data-plan-change="' + c.id + '" data-interval="' + (curInterval || 'month') + '">' + escapeHtml(verb + c.title) + '</button>';
      }
      return '<div class="pricing-card' + (isCurrent ? ' featured' : '') + '">' +
        '<h3>' + escapeHtml(c.title) + '</h3>' +
        '<div class="pricing-price">' + escapeHtml(c.price) + '<small>' + escapeHtml(c.period) + '</small></div>' +
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
      if (isPaidSub) {
        changeNote.innerHTML = 'Gestiona tu suscripción (cambio de plan, facturación anual o cancelación) en el portal seguro de Stripe. Pulsa <strong>«Actualiza la suscripción»</strong> dentro del portal.';
        changeNote.classList.remove('hidden');
      } else {
        changeNote.innerHTML = '';
        changeNote.classList.add('hidden');
      }
    }

    if (Billing && Billing.mountAnnualUpsell) {
      Billing.mountAnnualUpsell($('#pricing-annual-upsell'), ent);
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
    var tier = (window.PTBilling.bonusTierForPlan)
      ? window.PTBilling.bonusTierForPlan(ent.plan || 'free')
      : 'free';
    var prices = (bonus.prices && bonus.prices[tier]) || bonus.prices.free;
    var tierLabel = { free: 'Gratis', study: 'Study', coach: 'Coach' }[tier] || tier;
    var packs = ['s', 'm', 'l'];
    var rows = packs.map(function (pk) {
      var def = bonus.packs[pk];
      var price = prices[pk] || '—';
      return '<div class="bonus-pack-card">' +
        '<div class="bonus-pack-main">' +
        '<strong>' + escapeHtml(def.label) + '</strong>' +
        '<span class="muted-text">' + def.credits + ' consultas</span>' +
        '</div>' +
        '<div class="bonus-pack-price">' + escapeHtml(price) + ' €</div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-bonus-pack="' + pk + '">Comprar</button>' +
        '</div>';
    }).join('');
    host.innerHTML = '<div class="pricing-bonus-panel card-box">' +
      '<h3>Bono de consultas IA</h3>' +
      '<p class="muted-text">Precio para tu plan <strong>' + escapeHtml(tierLabel) + '</strong>. ' +
      'Los bonos tienen <strong>mejores precios en los planes superiores</strong> (Study y Coach). ' +
      'Válido 12 meses. Se consumen después de las consultas incluidas en tu plan.</p>' +
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
    const fb = $('#feedback');
    fb.classList.remove('hidden');
    const verdict = verdictWord(d.class);
    const bestLabel = actionName(d.best);
    let html = `<h3>Decisión en ${d.street}: <span class="verdict ${d.class}">${verdict}</span>`;
    if (d.score != null) html += ` <span class="muted-text">· Puntuación ${d.score}/100</span>`;
    html += `</h3>`;
    html += `<div>Elegiste <strong>${escapeHtml(d.label)}</strong>. `;
    if (d.class === 'optima') html += `Es la jugada GTO principal.`;
    else html += `La jugada de mayor frecuencia GTO era <strong>${bestLabel}</strong> (${Math.round((d.gto[d.best] || 0) * 100)}%).`;
    html += `</div>`;
    if (d.frequency != null) html += `<div class="muted-text" style="margin-top:4px">Frecuencia GTO de tu acción: ${Math.round(d.frequency * 100)}%</div>`;
    html += renderDecisionMath(d);
    html += `<div class="result-line" style="border:none;padding-top:6px">EV perdido: <span class="${d.evLoss > 0 ? 'net-neg' : 'net-pos'}">${d.evLoss > 0 ? '-' + fmtBB(d.evLoss) : '0'} bb</span>${d.evLossTier ? ` (${d.evLossTier})` : ''}</div>`;
    if (d.explanation) html += `<div class="spot-context" style="margin-top:8px;font-size:13px">${escapeHtml(d.explanation)}</div>`;
    if (d.errors && d.errors.length) html += `<div class="result-line" style="border-color:var(--red)">${d.errors.map((e) => escapeHtml(e.msg)).join(' · ')}</div>`;
    html += renderOptionGrid(d.optionBreakdown, d.action, d.best);
    fb.innerHTML = html;
  }

  function renderGtoBars(gto) {
    if (!gto) return '';
    let html = '<div class="gto-bars"><div style="color:var(--muted);font-size:12px;margin-bottom:4px">Estrategia GTO (frecuencias):</div>';
    Object.keys(gto).forEach((a) => {
      const pct = Math.round(gto[a] * 100);
      html += `<div class="gto-bar"><span class="lbl">${actionName(a)}</span>
        <span class="track"><span class="fill" style="width:${pct}%"></span></span>
        <span class="pct">${pct}%</span></div>`;
    });
    return html + '</div>';
  }

  function finishHand() {
    if (!hand || hand._finishHandled) return;
    hand._finishHandled = true;
    $('#actions').innerHTML = `<button class="btn btn-primary" id="next-after">Siguiente mano &raquo;</button>
      <button class="btn btn-ghost" id="replay-after">&#8635; Repetir esta mano</button>
      <button class="btn btn-ghost" id="new-session-after">Nueva sesión</button>`;
    $('#next-after').addEventListener('click', () => { continueLeakReplayOrNext(); });
    $('#replay-after').addEventListener('click', () => replayCurrentHand());
    $('#new-session-after').addEventListener('click', () => resetPlaySession());

    const r = hand.result;
    session.hands++;
    session.net += r.heroNet || 0;
    Store.saveHand(hand);
    if (window.PTReEngage && PTReEngage.touchTrain) PTReEngage.touchTrain();
    if (window.PTAnalytics && PTAnalytics.trackPlayHand) {
      PTAnalytics.trackPlayHand({ decisions: (hand.decisions || []).length, evLoss: r.totalEvLoss || 0 });
    }
    refreshSessionUI();

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

    html += '<div id="ai-report-trainer"></div>';

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

    fb.innerHTML = html;
    if (window.PTAIReport) {
      window.PTAIReport.mount($('#ai-report-trainer'), {
        source: 'trainer',
        getHand: () => hand,
        persist: { kind: 'history', getHandId: () => hand && hand.id },
        onThreadUpdate: (thread) => { if (hand) hand.coachThread = thread; }
      });
    }
    renderTable();
    $('#hero-handname').textContent = r.heroHandName ? 'Tu mano: ' + r.heroHandName : handNameOnBoard();
  }

  function refreshSessionUI() {
    $('#s-hands').textContent = session.hands;
    const net = roundSession(session.net);
    const evLost = roundSession(session.evLossBB);
    const expected = roundSession(net - evLost);
    const netEl = $('#s-net');
    if (netEl) {
      netEl.textContent = (net >= 0 ? '+' : '') + fmtBB(net);
      netEl.className = net >= 0 ? 'net-pos' : 'net-neg';
    }
    const evLostEl = $('#s-ev-lost');
    if (evLostEl) evLostEl.textContent = '-' + fmtBB(evLost);
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
        sessLbl.textContent = PTPlayConfig.labelFor(playSessionConfig);
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
    if (suffix === '%') return `${raw}%`;
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
    if (!leaks || !leaks.length) return '<div class="stats-carousel-empty muted-text">Sin fugas destacables.</div>';
    return `<div class="stats-leak-list">` + leaks.map((l, i) => {
      const action = mode === 'trainer'
        ? `<button type="button" class="btn btn-primary btn-sm" data-stats-train-leak="${escapeHtml(l.key)}">Repetir</button>`
        : (l.sessionId ? `<button type="button" class="btn btn-ghost btn-sm" data-stats-open-session="${escapeHtml(l.sessionId)}">Ir a la sesión</button>` : '');
      return `<div class="stats-leak-row">
        <div class="stats-leak-rank">#${i + 1}</div>
        <div class="stats-leak-main">
          <div class="stats-leak-title">${escapeHtml(l.label)}</div>
          <div class="stats-leak-sub muted-text">${l.count} error${l.count === 1 ? '' : 'es'} · EV perdido -${fmtBB(l.evLoss)} bb</div>
        </div>
        ${action}
      </div>`;
    }).join('') + `</div>`;
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

  let statsResizeTimer = null;

  function bindStatsView() {
    $$('[data-stats-prev]').forEach((btn) => {
      btn.onclick = () => {
        const sectionId = btn.getAttribute('data-stats-prev');
        const root = document.querySelector(`[data-stats-carousel="${sectionId}"]`);
        const idx = Number((root && root.dataset.index) || 0);
        setStatsCarousel(sectionId, idx - 1);
      };
    });
    $$('[data-stats-next]').forEach((btn) => {
      btn.onclick = () => {
        const sectionId = btn.getAttribute('data-stats-next');
        const root = document.querySelector(`[data-stats-carousel="${sectionId}"]`);
        const idx = Number((root && root.dataset.index) || 0);
        setStatsCarousel(sectionId, idx + 1);
      };
    });
    $$('[data-stats-dot]').forEach((btn) => {
      btn.onclick = () => {
        const raw = btn.getAttribute('data-stats-dot') || '';
        const parts = raw.split(':');
        setStatsCarousel(parts[0], Number(parts[1] || 0));
      };
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

    if (!window._ptStatsResizeBound) {
      window._ptStatsResizeBound = true;
      const onStatsLayoutChange = () => {
        const tab = $('#tab-stats');
        if (!tab || !tab.classList.contains('active')) return;
        clearTimeout(statsResizeTimer);
        statsResizeTimer = setTimeout(() => {
          const indices = getStatsCarouselIndices();
          renderStats();
          restoreStatsCarouselIndices(indices);
        }, 180);
      };
      window.addEventListener('resize', onStatsLayoutChange);
      window.addEventListener('orientationchange', onStatsLayoutChange);
    }
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
      return `<div class="record">
        <div class="rec-cards">${h.heroCards.map(Cards.cardToHTML).join('')}</div>
        <div class="rec-main">
          <div class="rec-scenario">${escapeHtml(h.scenario)} <span class="badge ${worst}">${verdictWord(worst)}</span></div>
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
        <div class="rec-sub">${e.heroCode} · ${e.street} · elegiste <strong>${escapeHtml(e.chosen)}</strong>, mejor: <strong>${actionName(e.best)}</strong> · -${e.evLoss}bb</div>
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
    replayFromStored(errs[0]);
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
          const indices = getStatsCarouselIndices();
          if ($('#tab-stats') && $('#tab-stats').classList.contains('active')) {
            renderStats();
            restoreStatsCarouselIndices(indices);
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
    if ($('#progress-dashboard')) $('#progress-dashboard').innerHTML = '';
    if ($('#leaks-panel')) $('#leaks-panel').innerHTML = '';
    const st = Store.getStats();
    const sessions = Store.getSessions ? Store.getSessions() : [];
    if (window.PTStatsAggregate) {
      const withHands = sessionsWithHandsForLeaks(sessions);
      const leakCountBefore = PTStatsAggregate.sessionTopLeaks(st, 5).length;
      if (withHands.length) PTStatsAggregate.refreshSessionLeaks(st, withHands);
      if (PTStatsAggregate.sessionTopLeaks(st, 5).length > leakCountBefore) Store.persistStats(st);
    }
    const sessTot = window.PTStatsAggregate ? PTStatsAggregate.sessionsTotal(st) : null;
    const trainerWeekly = window.PTStatsAggregate ? PTStatsAggregate.trainerWeeklySeries(st, 8) : [];
    const sessionWeekly = window.PTStatsAggregate ? PTStatsAggregate.sessionWeeklySeries(st, 8) : [];
    const trainerLeaks = trainerLeaksForStats(st);
    const sessionLeaks = window.PTStatsAggregate ? PTStatsAggregate.sessionTopLeaks(st, 5) : [];
    const sessionDerived = buildSessionDerivedStats(sessions);
    const box = $('#stats-content');
    const total = st.decisions || 1;
    const accuracy = st.decisions ? Math.round(((st.optima + st.aceptable) / st.decisions) * 100) : 0;
    const byStreet = st.byStreet || emptyByStreet();
    const actualNet = roundSession(st.totalNet || 0);
    const evLost = roundSession(st.totalEvLoss || 0);
    const netEv = (window.GTOEvLoss && window.GTOEvLoss.computeNetEvStats)
      ? window.GTOEvLoss.computeNetEvStats(actualNet, evLost)
      : { expectedNet: roundSession(actualNet - evLost), varianceAdj: roundSession(evLost) };
    const expectedNet = roundSession(netEv.expectedNet);
    const varianceAdj = roundSession(netEv.varianceAdj);
    latestTrainerStatsLeaks = trainerLeaks.slice();
    latestSessionStatsLeaks = sessionLeaks.slice();

    const trainerSlides = [
      {
        title: 'Resumen general',
        body: `<div class="stats-overview-grid">
          <div class="stat-card"><div class="big">${st.handsPlayed}</div><div class="lbl">Manos</div></div>
          <div class="stat-card"><div class="big">${accuracy}%</div><div class="lbl">Acierto</div></div>
          <div class="stat-card"><div class="big ${actualNet >= 0 ? 'net-pos' : 'net-neg'}">${actualNet >= 0 ? '+' : ''}${fmtBB(actualNet)}</div><div class="lbl">Resultado real</div></div>
          <div class="stat-card"><div class="big net-neg">-${fmtBB(evLost)}</div><div class="lbl">EV perdido</div></div>
          <div class="stat-card"><div class="big ${expectedNet >= 0 ? 'net-pos' : 'net-neg'}">${expectedNet >= 0 ? '+' : ''}${fmtBB(expectedNet)}</div><div class="lbl">EV esperado</div></div>
          <div class="stat-card"><div class="big ${varianceAdj >= 0 ? 'net-pos' : 'net-neg'}">${varianceAdj >= 0 ? '+' : ''}${fmtBB(varianceAdj)}</div><div class="lbl">Varianza</div></div>
        </div>
        <p class="muted-text stats-section-note">EV esperado = resultado real sin fugas. Varianza = diferencia entre resultado real y EV esperado.</p>`
      },
      { title: 'Progreso semanal · Acierto', body: statsBarChart('Acierto semanal', trainerWeekly, 'accuracy', '%', '--green') },
      { title: 'Progreso semanal · EV perdido', body: statsBarChart('EV perdido semanal', trainerWeekly, 'evLoss', ' bb', '--red') },
      { title: 'Progreso semanal · Volumen', body: statsBarChart('Manos por semana', trainerWeekly, 'hands', '', '--gold') },
      {
        title: 'Acierto por calle',
        body: `<div class="street-acc stats-street-grid">${renderStreetAccBars(byStreet)}</div>
          <div class="stats-section-note">${renderDecisionDistribution({ optima: st.optima, aceptable: st.aceptable, imprecisa: st.imprecisa, error: st.error }, st.decisions)}</div>`
      },
      { title: 'Leaks del entrenador', body: renderLeakList(trainerLeaks, 'trainer') }
    ];

    const sessionAccuracy = sessTot && sessTot.decisions ? Math.round((sessTot.good / sessTot.decisions) * 100) : null;
    const sessionStreetBars = renderStreetAccBarsFromPct(sessionDerived.accByStreet);
    const sessionGradeSeries = buildSessionGradeSeries(sessions);
    const sessionSlides = [
      {
        title: 'Resumen general',
        body: `<div class="stats-overview-grid">
          <div class="stat-card"><div class="big">${sessTot ? sessTot.sessions : 0}</div><div class="lbl">Sesiones</div></div>
          <div class="stat-card"><div class="big">${sessTot ? sessTot.hands : 0}</div><div class="lbl">Manos</div></div>
          <div class="stat-card"><div class="big">${sessionAccuracy == null ? '—' : sessionAccuracy + '%'}</div><div class="lbl">Acierto</div></div>
          <div class="stat-card"><div class="big ${sessTot && sessTot.netBB >= 0 ? 'net-pos' : 'net-neg'}">${sessTot ? (sessTot.netBB >= 0 ? '+' : '') + fmtBB(sessTot.netBB) : '—'}</div><div class="lbl">Resultado real</div></div>
          <div class="stat-card"><div class="big net-neg">${sessTot ? '-' + fmtBB(sessTot.evLoss) : '—'}</div><div class="lbl">EV perdido</div></div>
        </div>
        <p class="muted-text stats-section-note">Las métricas acumuladas incluyen sesiones importadas persistentes. Los accesos directos a fugas solo aparecen si la sesión sigue disponible.</p>`
      },
      { title: 'Evolución de notas', body: statsGradeLineChart('Nota por sesión (0–10)', sessionGradeSeries) },
      { title: 'Progreso semanal · Acierto', body: statsBarChart('Acierto semanal', sessionWeekly, 'accuracy', '%', '--green') },
      { title: 'Progreso semanal · EV perdido', body: statsBarChart('EV perdido semanal', sessionWeekly, 'evLoss', ' bb', '--red') },
      { title: 'Progreso semanal · Resultado real', body: statsBarChart('Resultado real semanal', sessionWeekly, 'netBB', ' bb', '--accent') },
      { title: 'Progreso semanal · Volumen', body: statsBarChart('Manos por semana', sessionWeekly, 'hands', '', '--gold') },
      {
        title: 'Acierto por calle',
        body: `<div class="street-acc stats-street-grid">${sessionStreetBars}</div>
          <div class="stats-section-note">${renderDecisionDistribution(sessionDerived.dist, Object.values(sessionDerived.dist).reduce((sum, n) => sum + n, 0))}</div>`
      },
      { title: 'Leaks de sesiones', body: renderLeakList(sessionLeaks, 'sessions') }
    ];

    box.innerHTML = `
      <div class="stats-redesign">
        ${renderStatsCarousel('trainer', 'Entrenador', 'Tus manos jugadas en el entrenador, separadas del análisis de sesiones importadas.', trainerSlides)}
        ${renderStatsCarousel('sessions', 'Sesiones importadas', 'Resultados y fugas de manos reales importadas, con acceso a la sesión cuando siga disponible.', sessionSlides)}
      </div>`;
    bindStatsView();

    const coachHost = $('#stats-coach');
    if (coachHost && window.PTAIReport) {
      coachHost.innerHTML = '';
      window.PTAIReport.mount(coachHost, {
        scope: 'statsGlobal',
        getData: () => {
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
    errors: { class: '', pos: '', dateFrom: '', dateTo: '', expOp: '', expVal: '', realOp: '', realVal: '' },
    sessionHands: { class: '', pos: '', expOp: '', expVal: '', realOp: '', realVal: '' }
  };

  function emptyHandFilters() {
    return { class: '', pos: '', dateFrom: '', dateTo: '', expOp: '', expVal: '', realOp: '', realVal: '' };
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
    return `
      <label>Clase<select data-filter-scope="${scope}" data-filter="class">${classOpts}</select></label>
      <label>Posición héroe<select data-filter-scope="${scope}" data-filter="pos">${posOpts}</select></label>
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
          handListFilters[scope][el.getAttribute('data-filter')] = el.value;
          if (typeof onChange === 'function') onChange();
        };
        el.addEventListener('change', handler);
        if (el.tagName === 'INPUT') el.addEventListener('input', handler);
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
    if (!passesDateRange(e.createdAt, f.dateFrom, f.dateTo)) return false;
    const evLoss = Number(e.evLoss) || 0;
    if (!passesEvCompare(evLoss, f.expOp, f.expVal)) return false;
    if (!passesEvCompare(evLoss, f.realOp, f.realVal)) return false;
    return true;
  }

  function passesSessionHandFilters(h, f) {
    if (f.class && h.worstClass !== f.class) return false;
    if (f.pos && h.heroPos !== f.pos) return false;
    const realNet = roundSession(h.heroNetBB || 0);
    const expNet = roundSession(realNet - (h.totalEvLoss || 0));
    if (!passesEvCompare(expNet, f.expOp, f.expVal)) return false;
    if (!passesEvCompare(realNet, f.realOp, f.realVal)) return false;
    return true;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function closeModal() { $('#modal').classList.add('hidden'); }

  // ============================================================
  //  SESIONES (importar, estadísticas y revisión de manos)
  // ============================================================
  let currentSession = null;
  let currentHand = null;
  let replayState = null;
  let analysisReviewReturn = false;

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
    if (!input.files.length) return;
    const file = input.files[0];
    const status = $('#import-status');
    const progWrap = $('#import-progress');
    const progFill = $('#import-progress-fill');
    const progLabel = $('#import-progress-label');
    const reader = new FileReader();

    function setProgress(done, total, phase) {
      const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
      if (progWrap) progWrap.classList.remove('hidden');
      if (progFill) progFill.style.width = pct + '%';
      const phaseLbl = phase === 'parse' ? 'Parseando' : 'Analizando';
      if (progLabel) progLabel.textContent = phaseLbl + ' ' + done.toLocaleString('es-ES') + ' / ' + total.toLocaleString('es-ES') + ' (' + pct + '%)';
      if (status) status.textContent = progLabel ? progLabel.textContent : '';
    }

    function hideProgress() {
      if (progWrap) progWrap.classList.add('hidden');
      if (progFill) progFill.style.width = '0%';
    }

    reader.onload = async () => {
      try {
        status.textContent = 'Leyendo historial...';
        const text = reader.result;
        const fmtMeta = Importer.detectSessionFormat ? Importer.detectSessionFormat(text) : null;
        const parseFn = Importer.parseSessionAsync || function (t, n, cb) {
          return Promise.resolve(Importer.parseSession(t, n));
        };
        const parsed = await parseFn(text, file.name, function (done, total, phase) {
          setProgress(done, total, phase || 'parse');
        });
        if (!parsed.hero || !parsed.hands.length) {
          hideProgress();
          status.innerHTML = '<span style="color:var(--red)">No se reconocieron manos de cash NL en el fichero. Comprueba que sea un historial de PokerStars o Winamax.</span>';
          return;
        }
        const fmtLabel = (parsed.format || fmtMeta)
          ? ((parsed.format || fmtMeta).platformLabel + ' · ' + (parsed.format || fmtMeta).localeLabel)
          : null;
        if (fmtLabel) status.textContent = 'Formato: ' + fmtLabel + ' · ' + parsed.hands.length.toLocaleString('es-ES') + ' manos detectadas';
        const Ent = window.PTEntitlements;
        if (Ent && Ent.ensureLoaded) {
          const ent = await Ent.ensureLoaded();
          const check = Ent.canImportSession(parsed.hands.length, ent);
          if (!check.ok) {
            hideProgress();
            if (window.PTBilling) window.PTBilling.showPaywall(check.reason);
            return;
          }
        }
        const onProgress = (done, total, phase) => {
          setProgress(done, total, phase || 'analyze');
        };
        const finishSession = async (session) => {
          hideProgress();
          const Ent = window.PTEntitlements;
          if (Ent && Ent.recordImportSession) {
            const rec = await Ent.recordImportSession(session.hands.length);
            if (rec && rec.ok === false) {
              if (window.PTBilling) window.PTBilling.showPaywall(rec.error);
              return;
            }
          }
          const saveResult = await Store.saveSession(session);
          const saved = saveResult && saveResult.ok !== false;
          const finalSession = (saveResult && saveResult.session) ? saveResult.session : session;
          if (!saved) {
            status.innerHTML = `<span style="color:var(--yellow)">Análisis completado pero no se pudo guardar (${escapeHtml((saveResult && saveResult.error) || 'error de almacenamiento')}). Se muestra sin persistir.</span>`;
          } else if (saveResult.cloudOnly) {
            status.innerHTML = `<span style="color:var(--green)">Sesión guardada en la nube: ${finalSession.hands.length} manos analizadas (de ${finalSession.nTotal} cash${finalSession.nDiscarded ? `, ${finalSession.nDiscarded} sin cartas del héroe` : ''}).</span>`;
          } else {
            const fmt = finalSession.format ? ' · ' + finalSession.format.platformLabel + ' ' + finalSession.format.localeLabel : '';
            status.innerHTML = `<span style="color:var(--green)">Sesión procesada${fmt}: ${finalSession.hands.length} manos analizadas (de ${finalSession.nTotal} cash${finalSession.nDiscarded ? `, ${finalSession.nDiscarded} sin cartas del héroe` : ''}).</span>`;
          }
          input.value = '';
          $('#process-session').disabled = true;
          if (window.PTAnalytics && PTAnalytics.trackImportSession) {
            PTAnalytics.trackImportSession({
              hands: finalSession.hands.length,
              platform: finalSession.format && finalSession.format.platform
            });
          }
          renderSessionsList();
          openSession(finalSession.id, finalSession);
        };
        const build = Importer.buildSessionAsync
          ? Importer.buildSessionAsync(parsed, file.name, onProgress)
          : Promise.resolve(Importer.buildSession(parsed, file.name));
        build.then(finishSession).catch((err) => {
          hideProgress();
          status.innerHTML = '<span style="color:var(--red)">Error al procesar: ' + escapeHtml(err.message || String(err)) + '</span>';
          console.error('[Sessions] process failed', err);
        });
      } catch (err) {
        hideProgress();
        status.innerHTML = '<span style="color:var(--red)">Error al procesar: ' + escapeHtml(err.message) + '</span>';
        console.error('[Sessions] parse failed', err);
      }
    };
    status.textContent = 'Leyendo fichero...';
    reader.onerror = () => { status.textContent = 'No se pudo leer el fichero.'; };
    reader.readAsText(file, 'utf-8');
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
    if (!sessions.length) { box.innerHTML = '<div class="empty">No hay sesiones. Añade un fichero .txt arriba.</div>'; return; }
    box.innerHTML = sessions.map((s) => {
      const st = s.stats;
      const netCls = st.netBB >= 0 ? 'net-pos' : 'net-neg';
      const sampleBadge = isSample(s) ? '<span class="session-sample-badge">Ejemplo</span>' : '';
      return `<div class="record session-card">
        <div class="rec-main">
          <div class="rec-scenario">${escapeHtml(s.fileName)}${sampleBadge} <span class="badge grade-${st.grade.letter[0]}">Nota ${st.grade.letter}</span></div>
          <div class="rec-sub">Héroe: <strong>${escapeHtml(s.hero)}</strong> · ${st.nHands} manos · ${fmtDate(s.createdAt)}</div>
          <div class="rec-sub">Acierto ${st.accuracy}% · <span class="${netCls}">${st.netBB >= 0 ? '+' : ''}${fmtBB(st.netBB)} bb</span> · EV perdido -${fmtBB(st.evLossBB)} bb</div>
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

  async function openSession(id, sessionObj) {
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
    const needsRecompute = Importer.recomputeHandDecisions && Importer.computeStats
      && currentSession.analysisVersion !== buildVer;
    if (needsRecompute) {
      currentSession.hands.forEach((h) => Importer.recomputeHandDecisions(h));
      currentSession.stats = Importer.computeStats(currentSession.hands);
      currentSession.analysisVersion = buildVer;
      await Store.saveSession(currentSession);
    }
    renderSessionDetail('evLoss');
    showSessionsView('detail');
  }

  function renderSessionDetail(sortBy) {
    const s = currentSession;
    if (!s || !s.stats) {
      $('#session-detail-content').innerHTML = '<p class="muted-text">No hay datos de sesión para mostrar.</p>';
      return;
    }
    const st = s.stats;
    const netCls = st.netBB >= 0 ? 'net-pos' : 'net-neg';
    const accSt = st.accByStreet;
    const box = $('#session-detail-content');

    const statHtml = `
      <h2>${escapeHtml(s.fileName)} <span class="badge grade-${st.grade.letter[0]}">Nota ${st.grade.letter} · ${st.grade.score}/10</span></h2>
      <p class="muted-text">${escapeHtml(st.grade.verdict)}</p>
      <div class="stats-content">
        <div class="stat-card"><div class="big">${st.nHands}</div><div class="lbl">Manos jugadas</div></div>
        <div class="stat-card"><div class="big ${netCls}">${st.netBB >= 0 ? '+' : ''}${fmtBB(st.netBB)}</div><div class="lbl">bb ganadas/perdidas</div></div>
        <div class="stat-card"><div class="big">${st.accuracy}%</div><div class="lbl">Acierto global</div></div>
        <div class="stat-card"><div class="big net-neg">-${fmtBB(st.evLossBB)}</div><div class="lbl">EV perdido total (bb)</div></div>
      </div>
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
        <div>
          <label class="muted-text" style="font-size:13px">Ordenar:
            <select id="hand-sort">
              <option value="evLoss" ${sortBy === 'evLoss' ? 'selected' : ''}>Mayor EV perdido</option>
              <option value="evLossAsc" ${sortBy === 'evLossAsc' ? 'selected' : ''}>Menor EV perdido</option>
              <option value="accAsc" ${sortBy === 'accAsc' ? 'selected' : ''}>Menor acierto</option>
              <option value="accDesc" ${sortBy === 'accDesc' ? 'selected' : ''}>Mayor acierto</option>
              <option value="netAsc" ${sortBy === 'netAsc' ? 'selected' : ''}>Más bb perdidas</option>
              <option value="netDesc" ${sortBy === 'netDesc' ? 'selected' : ''}>Más bb ganadas</option>
            </select>
          </label>
        </div>
      </div>
      <div id="session-hands-filters" class="hand-filters"></div>
      <div id="session-hands" class="record-list"></div>`;

    box.innerHTML = statHtml + sortHtml;
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
      return `<div class="mini-hand">
        <div class="mini-hand-row">
          <span class="rec-cards">${(h.heroCards || []).map(Cards.cardToHTML).join('')}</span>
          <span>${h.heroCode} ${h.heroPos}</span>
          <span class="${netCls}">${h.heroNetBB >= 0 ? '+' : ''}${fmtBB(h.heroNetBB)}bb</span>
          <span class="badge ${h.worstClass}">${verdictWord(h.worstClass)}</span>
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
      netDesc: (a, b) => b.heroNetBB - a.heroNetBB
    };
    hands.sort(sorters[sortBy] || sorters.evLoss);
    const box = $('#session-hands');
    if (!box) return;
    if (!hands.length) {
      box.innerHTML = '<div class="empty">No hay manos que coincidan con los filtros.</div>';
      return;
    }
    box.innerHTML = hands.map((h) => {
      const netCls = h.heroNetBB >= 0 ? 'net-pos' : 'net-neg';
      return `<div class="record">
        <div class="rec-cards">${(h.heroCards || []).map(Cards.cardToHTML).join('')}</div>
        <div class="rec-main">
          <div class="rec-scenario">${h.heroCode} <span style="color:var(--muted)">(${h.heroPos})</span> <span class="badge ${h.worstClass}">${verdictWord(h.worstClass)}</span></div>
          <div class="rec-sub">Board: ${(h.board || []).map(Cards.cardToHTML).join('') || '—'} · ${h.nDecisions} decisiones · acierto ${h.accuracy}%</div>
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
  }

  function findHand(id) {
    if (!currentSession || !currentSession.hands) return null;
    return currentSession.hands.find((h) => String(h.id) === String(id)) || null;
  }

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

    let html = `<div class="review-head">
      <div class="rec-cards big-cards">${(h.heroCards || []).map(Cards.cardToHTML).join('')}</div>
      <div>
        <h2>${h.heroCode} · ${h.heroPos}</h2>
        <div class="muted-text">Mano #${h.id} · Resultado real: <span class="${h.heroNetBB >= 0 ? 'net-pos' : 'net-neg'}">${h.heroNetBB >= 0 ? '+' : ''}${fmtBB(h.heroNetBB)} bb</span> · EV perdido: -${fmtBB(h.totalEvLoss)} bb</div>
      </div>
    </div>`;

    html += sessionReplayThemeHTML();
    html += renderShowdownTableHTML(h);

    html += '<div class="timeline">';
    summary.forEach((item) => {
      if (item.kind === 'street') {
        const decIdx = window.PTRangeMatrix ? window.PTRangeMatrix.findDecisionIndex(h, item.street) : -1;
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
            else if (heroDec.class !== 'optima') line += ` <span class="tl-eval muted-text">mejor: ${actionName(heroDec.best)}</span>`;
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
            html += renderOptionGrid(heroDec.optionBreakdown, heroDec.chosen, heroDec.best);
          }
          html += '</div>';
        }
      }
    });
    html += '</div>';

    html += renderHandDecisionsSummary(h.decisions, 'session');

    html += '<div id="ai-report-session"></div>';

    // cartas del villano si se mostraron
    const shows = Object.keys(h.villainShows || {}).filter((n) => n !== currentSession.hero);
    if (shows.length) {
      html += '<div class="card-box"><h3>Cartas mostradas</h3>' + shows.map((n) =>
        `<div class="tl-action"><span class="tl-player">${escapeHtml(n)}</span> <span class="rec-cards">${h.villainShows[n].map(Cards.cardToHTML).join('')}</span></div>`
      ).join('') + '</div>';
    }

    html += `<button class="btn btn-primary" id="to-replay" style="margin-top:14px">Volver a jugar esta mano con GTO &raquo;</button>`;
    box.innerHTML = html;
    bindSessionReplayTheme();
    applyTableTheme(loadTableTheme());
    scrollSessionReviewToTop();
    if (window.PTAIReport) {
      const isAnalysis = !!(currentSession && currentSession.analysis);
      const persist = isAnalysis
        ? { kind: 'analysis', getHandId: () => currentHand && currentHand.id }
        : {
          kind: 'sessionHand',
          getSessionId: () => currentSession && currentSession.id,
          getHandId: () => currentHand && currentHand.id
        };
      window.PTAIReport.mount($('#ai-report-session'), {
        scope: 'session',
        getHand: () => currentHand,
        persist: persist,
        onThreadUpdate: (thread) => {
          if (currentHand) {
            currentHand.coachThread = thread;
            if (isAnalysis && window.Store && Store.updateAnalysisHand) Store.updateAnalysisHand(currentHand);
          }
        }
      });
    }
    $('#to-replay').addEventListener('click', () => startInteractiveReplay());
  }

  function handNeedsShowdownStep(h) {
    return !!(h.board && h.board.length >= 5);
  }

  function villainShowInfo(h) {
    const hero = currentSession && currentSession.hero;
    const shows = h.villainShows || {};
    const names = Object.keys(shows).filter((n) => n !== hero);
    if (!names.length) return null;
    const name = names[0];
    let pos = '';
    (h.summary || []).forEach((item) => {
      if ((item.kind === 'action' || item.kind === 'show') && item.player === name && item.pos) pos = item.pos;
    });
    if (!pos && h.decisions && h.decisions.length) {
      const last = h.decisions[h.decisions.length - 1];
      if (last.vsPosition) pos = last.vsPosition;
    }
    return { name: name, pos: pos, cards: shows[name] };
  }

  function renderShowdownTableHTML(h) {
    const is9 = sessionTableIs9Max(h);
    const mobile = isMobileLayout();
    const coords = is9 ? (mobile ? SEAT_COORDS_MOBILE_9 : SEAT_COORDS_9) : (mobile ? SEAT_COORDS_MOBILE : SEAT_COORDS);
    const posList = is9 ? POS_9 : POS;
    const posRing = ringFromHeroPos(h.heroPos, posList);
    const board = h.board || [];
    const villain = villainShowInfo(h);
    const villainPos = villain && villain.pos ? villain.pos : null;
    const potBB = h.decisions && h.decisions.length
      ? h.decisions[h.decisions.length - 1].potBB
      : null;

    let seatsHtml = '';
    posRing.forEach((pos, i) => {
      const c = coords[i];
      const isHero = pos === h.heroPos;
      const isVillain = villainPos && pos === villainPos;
      const cls = ['seat'];
      if (isHero) cls.push('hero');
      if (isVillain) cls.push('villain');
      if (c.top < 20) cls.push('seat-top');
      if (c.top > 70) cls.push('seat-bottom');
      if (c.left < 22) cls.push('seat-edge-left');
      else if (c.left > 78) cls.push('seat-edge-right');
      if (c.top < 12) cls.push('seat-edge-top');
      const role = isHero ? 'Héroe' : (isVillain ? 'Villano' : '');
      let cardsHtml = '';
      if (isVillain && villain && villain.cards && villain.cards.length >= 2) {
        cardsHtml = '<div class="seat-cards showdown">' + villain.cards.map(Cards.cardToHTML).join('') + '</div>';
      }
      seatsHtml += `<div class="${cls.join(' ')}" style="top:${c.top}%;left:${c.left}%">
        ${cardsHtml}
        <div class="seat-pos">${pos}</div>
        ${role ? `<div class="seat-role">${role}</div>` : ''}
      </div>`;
    });

    const heroCards = h.heroCards || [];
    const heroCardsHtml = heroCards.length >= 2
      ? '<div class="hero-cards">' + heroCards.map(Cards.cardToHTML).join('') + '</div>'
      : '';

    return `<div class="poker-table session-replay-table"><div class="table-felt${is9 ? ' table-9max' : ''}" data-theme="${loadTableTheme()}">
      ${tableWatermarkHTML()}
      <div class="seats">${seatsHtml}</div>
      <div class="board-area"><div class="pot"><span class="pot-chips"><span class="chip-ico"></span></span> Bote: ${potBB != null ? fmtBB(potBB) : '—'} bb</div>
      <div class="board">${board.map(Cards.cardToHTML).join('')}</div></div>
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
    const villain = villainShowInfo(h);
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
    if (villain) {
      html += `<div class="result-line">Cartas de ${escapeHtml(villain.name)}${villain.pos ? ' (' + escapeHtml(villain.pos) + ')' : ''}: ${villain.cards.map(Cards.cardToHTML).join(' ')}</div>`;
    }
    html += `<div class="result-line" style="border:none">Board: ${(h.board || []).map(Cards.cardToHTML).join(' ')}</div>`;
    html += `<button class="btn btn-primary" id="replay-to-summary" style="margin-top:14px">Ver resumen de la repetición »</button>`;
    box.innerHTML = html;
    bindSessionReplayTheme();
    applyTableTheme(loadTableTheme());
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
    const is9 = sessionTableIs9Max(h);
    const mobile = isMobileLayout();
    const coords = is9 ? (mobile ? SEAT_COORDS_MOBILE_9 : SEAT_COORDS_9) : (mobile ? SEAT_COORDS_MOBILE : SEAT_COORDS);
    const posList = is9 ? POS_9 : POS;
    const posRing = ringFromHeroPos(h.heroPos, posList);
    const board = boardForStreet(h, d.street);
    const villainPos = state.villainPos;

    let seatsHtml = '';
    posRing.forEach((pos, i) => {
      const c = coords[i];
      const isHero = pos === h.heroPos;
      const isVillain = villainPos && pos === villainPos;
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

      seatsHtml += `<div class="${cls.join(' ')}" style="top:${c.top}%;left:${c.left}%">
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
      ? '<div class="hero-cards">' + heroCards.map(Cards.cardToHTML).join('') + '</div>'
      : '';
    const heroAreaHtml =
      '<div class="hero-area">' +
      (heroChipsHtml ? '<div class="hero-chips">' + heroChipsHtml + '</div>' : '') +
      '<div class="hero-label">HÉROE · <span>' + escapeHtml(heroPos) + '</span></div>' +
      heroCardsHtml +
      '</div>';

    const potDisplay = d.potBB;

    return `<div class="poker-table session-replay-table"><div class="table-felt${is9 ? ' table-9max' : ''}" data-theme="${loadTableTheme()}">
      ${tableWatermarkHTML()}
      <div class="seats">${seatsHtml}</div>
      <div class="board-area"><div class="pot"><span class="pot-chips"><span class="chip-ico"></span></span> Bote: ${fmtBB(potDisplay)} bb</div>
      <div class="board">${board.map(Cards.cardToHTML).join('') || '<span style="color:rgba(255,255,255,.3)">— preflop —</span>'}</div></div>
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
      <div class="muted-text" style="margin-top:6px">En la mano real: acierto ${h.accuracy}% · EV perdido -${fmtBB(h.totalEvLoss)} bb · resultado ${h.heroNetBB >= 0 ? '+' : ''}${fmtBB(h.heroNetBB)} bb.</div>`;
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
      return `Bet ${fmtBB(size)}bb (${pct})`;
    }
    return actionName(a);
  }

  function actionWord(item) {
    switch (item.type) {
      case 'fold': return 'se retira';
      case 'check': return 'pasa';
      case 'call': return 'iguala ' + (item.amount || 0) + '€';
      case 'bet': return 'apuesta ' + (item.amount || 0) + '€' + (item.allin ? ' (all-in)' : '');
      case 'raise': return 'sube a ' + (item.to || 0) + '€' + (item.allin ? ' (all-in)' : '');
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
