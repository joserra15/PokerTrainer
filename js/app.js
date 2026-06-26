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
  }

  function readPlayConfig() {
    const PC = window.PTPlayConfig;
    if (!PC) return null;
    const gtEl = $('#setup-game-type .setup-chip.active');
    const scEl = $('#setup-scenario .setup-chip.active');
    const posEl = $('#setup-hero-pos .setup-chip.active');
    const hrEl = $('#setup-hand-range .setup-chip.active');
    return PC.normalize({
      gameType: gtEl ? gtEl.dataset.val : 'cash6',
      scenario: scEl ? scEl.dataset.val : 'random',
      heroPos: posEl ? posEl.dataset.val : 'random',
      handRange: hrEl ? hrEl.dataset.val : 'playable'
    });
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

  function bindPlaySetup() {
    bindChipGroup('#setup-game-type', renderHeroPosChips);
    bindChipGroup('#setup-scenario', renderHeroPosChips);
    bindChipGroup('#setup-hand-range');
    const startBtn = $('#play-start');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        playSessionConfig = readPlayConfig();
        resetPlaySession(false);
        showPlayTable();
        startNewHand();
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
    bindHome();
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
    if (tabId === 'history') renderHistory();
    if (tabId === 'errors') renderErrors();
    if (tabId === 'stats') renderStats();
    if (tabId === 'ranges') renderRangesExplorer();
    if (tabId === 'sessions') { showSessionsView('home'); renderSessionsList(); }
    if (tabId === 'admin') {
      var adminUser = window.PTAuth && window.PTAuth.getUser ? window.PTAuth.getUser() : null;
      if (!adminUser || !adminUser.isAdmin) {
        goToTab('home');
        return;
      }
      if (window.PTAdmin && window.PTAdmin.render) window.PTAdmin.render();
    }
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
    $('#new-hand').addEventListener('click', () => { pendingForce = null; startNewHand(); });
    $('#replay-hand').addEventListener('click', () => replayCurrentHand());
    $('#new-session').addEventListener('click', () => resetPlaySession());
    $('#repeat-errors').addEventListener('change', (e) => { repeatErrorsMode = e.target.checked; });
    const syncBtn = $('#sync-cloud');
    if (syncBtn) syncBtn.addEventListener('click', () => runCloudSync(syncBtn));
    window.addEventListener('pt-cloud-synced', () => {
      renderHistory();
      renderErrors();
      renderStats();
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
    $('#back-to-sessions').addEventListener('click', () => { showSessionsView('home'); renderSessionsList(); });
    $('#back-to-detail').addEventListener('click', () => { showSessionsView('detail'); });

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
      showPlaySetup();
      hand = null;
      goToTab('home');
    }
  }

  // ---------- Nueva mano ----------
  function startNewHand() {
    let force = pendingForce;
    if (!force && repeatErrorsMode) {
      const errs = Store.getErrors();
      if (errs.length) {
        const e = errs[Math.floor(Math.random() * errs.length)];
        if (replayFromStored(e)) return;
      }
    }
    const cfg = force ? (replayPlayConfig || playSessionConfig) : playSessionConfig;
    replayPlayConfig = null;
    hand = Engine.newHand(force || undefined, cfg);
    pendingForce = null;
    $('#feedback').classList.add('hidden');
    $('#hand-log').innerHTML = '';
    renderTable();
    renderActions();
  }

  // Repite una mano guardada (histórico, errores o mano actual) con semilla y config originales
  function replayFromStored(rec) {
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

    goToPlay();
    startNewHand();
    return true;
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
      heroChipsEl.innerHTML = (heroInv > 0 || heroStreet > 0) ? renderSeatChips(heroInv, heroStreet) : '';
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
    const felt = document.querySelector('.table-felt');
    if (felt) felt.classList.toggle('table-9max', is9MaxTable());
    renderBoard();
    renderSeats();
    $('#spot-context').textContent = hand.current ? hand.current.context : (hand.result ? hand.result.reason : '');
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
      const hero = hand.hero.cards;
      const board = hand.board;
      const ev = Cards.evaluate(hero.concat(board));
      let label = ev.name;
      if (board.length >= 5 && ev.category < 5) {
        const counts = { s: 0, h: 0, d: 0, c: 0 };
        board.forEach((c) => { counts[c[1]] = (counts[c[1]] || 0) + 1; });
        const suitNames = { c: 'tréboles', h: 'corazones', d: 'diamantes', s: 'picas' };
        for (const s of ['s', 'h', 'd', 'c']) {
          if (counts[s] < 3) continue;
          const heroSuit = hero.filter((c) => c[1] === s).length;
          const total = counts[s] + heroSuit;
          if (total >= 4 && total < 5) {
            label += ' (' + total + ' ' + suitNames[s] + ' en total, sin color; hacen falta 5)';
            break;
          }
          if (counts[s] >= 4 && heroSuit === 0) {
            label += ' (4 ' + suitNames[s] + ' en mesa; vulnerable a color)';
            break;
          }
        }
      }
      return 'Tu mano: ' + label;
    } catch (e) { return ''; }
  }

  function renderBoard() {
    const complete = hand.stage === 'complete';
    let html = hand.board.map(Cards.cardToHTML).join('');
    $('#board').innerHTML = html || '<span style="color:rgba(255,255,255,.3)">— preflop —</span>';
  }

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
      const showFullSeat = !mobile || isVillain || isCaller || stBet > 0 || showCards;
      if (mobile && !showFullSeat && !isHero) cls.push('seat-mini');
      const chipsHtml = showFullSeat ? renderSeatChips(totalInv, stBet) : '';

      html += `<div class="${cls.join(' ')}" style="top:${c.top}%;left:${c.left}%">
        ${cardsHtml}
        <div class="seat-pos">${pos}</div>
        <div class="seat-role">${role}</div>
        ${chipsHtml}
        ${actHtml ? `<div class="seat-act-wrap">${actHtml}</div>` : ''}
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
          ${decisionEvLossHtml(d)}
        </div>`;
      html += renderDecisionMath(d);
      if (d.context) html += `<div class="dec-expl muted-text">${escapeHtml(d.context)}</div>`;
      if (d.explanation) html += `<div class="dec-expl">${escapeHtml(d.explanation)}</div>`;
      if (d.renderAlert) html += `<div class="dec-expl" style="color:var(--orange)">${escapeHtml(d.renderAlert)}</div>`;
      if (d.optionBreakdown && d.optionBreakdown.length) {
        html += renderOptionGrid(d.optionBreakdown, d.action || d.chosen);
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

  function renderOptionGrid(breakdown, chosenId) {
    if (!breakdown || !breakdown.length) return '';
    let html = '<div class="opt-grid">';
    breakdown.forEach((o) => {
      const isChosen = o.id === chosenId;
      const isBest = breakdown[0] && breakdown[0].id === o.id;
      html += `<div class="opt-pill ${isChosen ? 'chosen' : ''} ${isBest ? 'best' : ''}">
        <span class="opt-lbl">${escapeHtml(o.label)}</span>
        <span class="opt-pct">${o.pct}%</span>
      </div>`;
    });
    return html + '</div>';
  }

  let matrixJob = 0;
  let rangesState = { spot: 'RFI', heroPos: 'UTG', villainPos: 'UTG' };

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
          html += `<div class="${cls}" title="${cell.label}: R${Math.round(cell.freqs.raise * 100)}% C${Math.round(cell.freqs.call * 100)}% F${Math.round(cell.freqs.fold * 100)}%">${cell.label}</div>`;
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
    if (!RM) return;
    const spotRow = $('#ranges-spot-row');
    const heroRow = $('#ranges-hero-pos');
    const villainRow = $('#ranges-villain-pos');
    const villainBlock = $('#ranges-villain-block');
    const villainLabel = $('#ranges-villain-label');
    const titleEl = $('#ranges-spot-title');
    const host = $('#ranges-matrix-host');
    if (!spotRow || !heroRow || !host) return;

    const spot = RM.EXPLORER_SPOTS[rangesState.spot] || RM.EXPLORER_SPOTS.RFI;
    const vsPairs = RM.validVsRfiPairs();

    spotRow.innerHTML = Object.keys(RM.EXPLORER_SPOTS).map((id) =>
      `<button type="button" class="ranges-spot-btn${rangesState.spot === id ? ' active' : ''}" data-ranges-spot="${id}">${RM.EXPLORER_SPOTS[id].label}</button>`
    ).join('');

    let heroPositions = spot.heroPositions.slice();
    if (rangesState.spot === '3bet' && vsPairs[rangesState.heroPos]) {
      /* ok */
    } else if (rangesState.spot === '3bet') {
      rangesState.heroPos = heroPositions[0];
    }
    if (heroPositions.indexOf(rangesState.heroPos) < 0) rangesState.heroPos = heroPositions[0];

    heroRow.innerHTML = heroPositions.map((p) =>
      `<button type="button" class="ranges-pos-btn${rangesState.heroPos === p ? ' hero-active' : ''}" data-ranges-hero="${p}">${p}</button>`
    ).join('');

    const needsVillain = spot.villainPositions && spot.villainPositions.length > 0;
    if (villainBlock) villainBlock.classList.toggle('hidden', !needsVillain);
    if (needsVillain) {
      let villainPositions = spot.villainPositions.slice();
      if (rangesState.spot === '3bet') {
        villainPositions = vsPairs[rangesState.heroPos] || villainPositions;
        if (villainPositions.indexOf(rangesState.villainPos) < 0) rangesState.villainPos = villainPositions[0];
      } else if (villainPositions.indexOf(rangesState.villainPos) < 0) {
        rangesState.villainPos = villainPositions[0];
      }
      if (villainLabel) villainLabel.textContent = spot.villainLabel || 'Villano:';
      villainRow.innerHTML = villainPositions.map((p) =>
        `<button type="button" class="ranges-pos-btn${rangesState.villainPos === p ? ' villain-active' : ''}" data-ranges-villain="${p}">${p}</button>`
      ).join('');
    }

    const input = RM.buildExplorerInput(rangesState.spot, rangesState.heroPos, needsVillain ? rangesState.villainPos : null);
    if (titleEl) titleEl.textContent = RM.explorerTitle(rangesState.spot, rangesState.heroPos, rangesState.villainPos);

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
    if (d.frequency != null) html += `<div class="muted-text" style="margin-top:4px">Frecuencia GTO de tu acción: ${Math.round(d.frequency * 100)}% · Confianza: ${Math.round((d.confidence || 0) * 100)}%</div>`;
    html += renderDecisionMath(d);
    html += `<div class="result-line" style="border:none;padding-top:6px">EV perdido: <span class="${d.evLoss > 0 ? 'net-neg' : 'net-pos'}">${d.evLoss > 0 ? '-' + fmtBB(d.evLoss) : '0'} bb</span>${d.evLossTier ? ` (${d.evLossTier})` : ''}</div>`;
    if (d.explanation) html += `<div class="spot-context" style="margin-top:8px;font-size:13px">${escapeHtml(d.explanation)}</div>`;
    if (d.errors && d.errors.length) html += `<div class="result-line" style="border-color:var(--red)">${d.errors.map((e) => escapeHtml(e.msg)).join(' · ')}</div>`;
    html += renderOptionGrid(d.optionBreakdown, d.action);
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
    $('#next-after').addEventListener('click', () => { pendingForce = null; startNewHand(); });
    $('#replay-after').addEventListener('click', () => replayCurrentHand());
    $('#new-session-after').addEventListener('click', () => resetPlaySession());

    const r = hand.result;
    session.hands++;
    session.net += r.heroNet || 0;
    Store.saveHand(hand);
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
      window.PTAIReport.mount($('#ai-report-trainer'), { source: 'trainer', getHand: () => hand });
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

  // ---------- Histórico ----------
  function renderHistory() {
    const hist = Store.getHistory();
    const box = $('#history-list');
    if (!hist.length) { box.innerHTML = '<div class="empty">Aún no hay manos jugadas.</div>'; return; }
    box.innerHTML = hist.map((h) => {
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
    const errs = Store.getErrors();
    const box = $('#errors-list');
    if (!errs.length) { box.innerHTML = '<div class="empty">Sin errores registrados. ¡Buen trabajo!</div>'; return; }
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

  // ---------- Estadísticas ----------
  function renderStats() {
    const st = Store.getStats();
    const box = $('#stats-content');
    const total = st.decisions || 1;
    const pct = (n) => Math.round((n / total) * 100);
    const accuracy = st.decisions ? Math.round(((st.optima + st.aceptable) / st.decisions) * 100) : 0;
    const byStreet = st.byStreet || emptyByStreet();
    const actualNet = roundSession(st.totalNet || 0);
    const evLost = roundSession(st.totalEvLoss || 0);
    const netEv = (window.GTOEvLoss && window.GTOEvLoss.computeNetEvStats)
      ? window.GTOEvLoss.computeNetEvStats(actualNet, evLost)
      : { expectedNet: roundSession(actualNet - evLost), varianceAdj: roundSession(evLost) };
    const expectedNet = roundSession(netEv.expectedNet);
    const varianceAdj = roundSession(netEv.varianceAdj);
    box.innerHTML = `
      <div class="stat-card"><div class="big">${st.handsPlayed}</div><div class="lbl">Manos jugadas</div></div>
      <div class="stat-card"><div class="big">${accuracy}%</div><div class="lbl">Acierto (óptima+aceptable)</div></div>
      <div class="stat-card"><div class="big ${actualNet >= 0 ? 'net-pos' : 'net-neg'}">${actualNet >= 0 ? '+' : ''}${fmtBB(actualNet)}</div><div class="lbl">Resultado total (bb)</div></div>
      <div class="stat-card"><div class="big net-neg">-${fmtBB(evLost)}</div><div class="lbl">EV perdido total (bb)</div></div>
      <div class="stat-card" style="grid-column:1/-1;text-align:left">
        <div class="lbl" style="margin-bottom:8px">EV esperado vs resultado real</div>
        <div class="stats-content" style="margin-bottom:8px">
          <div class="stat-card"><div class="big ${expectedNet >= 0 ? 'net-pos' : 'net-neg'}">${expectedNet >= 0 ? '+' : ''}${fmtBB(expectedNet)}</div><div class="lbl">EV esperado (sin fugas)</div></div>
          <div class="stat-card"><div class="big ${actualNet >= 0 ? 'net-pos' : 'net-neg'}">${actualNet >= 0 ? '+' : ''}${fmtBB(actualNet)}</div><div class="lbl">Resultado real</div></div>
          <div class="stat-card"><div class="big ${varianceAdj >= 0 ? 'net-pos' : 'net-neg'}">${varianceAdj >= 0 ? '+' : ''}${fmtBB(varianceAdj)}</div><div class="lbl">Varianza / suerte</div></div>
        </div>
        <div class="muted-text">EV perdido por errores: <strong>-${fmtBB(evLost)} bb</strong>. EV esperado = resultado real − fugas.</div>
      </div>
      <div class="stat-card" style="grid-column:1/-1;text-align:left">
        <div class="lbl" style="margin-bottom:8px">Acierto por calle</div>
        <div class="street-acc">${renderStreetAccBars(byStreet)}</div>
      </div>
      <div class="stat-card" style="grid-column:1/-1;text-align:left">
        <div class="lbl" style="margin-bottom:6px">Distribución de decisiones (${st.decisions})</div>
        <div class="dist-bar">
          <span style="width:${pct(st.optima)}%;background:var(--green)">${pct(st.optima)}%</span>
          <span style="width:${pct(st.aceptable)}%;background:var(--yellow)">${pct(st.aceptable)}%</span>
          <span style="width:${pct(st.imprecisa)}%;background:var(--orange)">${pct(st.imprecisa)}%</span>
          <span style="width:${pct(st.error)}%;background:var(--red)">${pct(st.error)}%</span>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:8px">
          <span style="color:var(--green)">&#9632; Óptima ${st.optima}</span> &nbsp;
          <span style="color:var(--yellow)">&#9632; Aceptable ${st.aceptable}</span> &nbsp;
          <span style="color:var(--orange)">&#9632; Imprecisa ${st.imprecisa}</span> &nbsp;
          <span style="color:var(--red)">&#9632; Error ${st.error}</span>
        </div>
      </div>`;
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

  function showSessionsView(which) {
    $('#sessions-home').classList.toggle('hidden', which !== 'home');
    $('#session-detail').classList.toggle('hidden', which !== 'detail');
    $('#hand-review').classList.toggle('hidden', which !== 'review');
  }

  function processSessionFile() {
    const input = $('#session-file');
    if (!input.files.length) return;
    const file = input.files[0];
    const status = $('#import-status');
    status.textContent = 'Leyendo fichero...';
    const reader = new FileReader();
    reader.onload = () => {
      try {
        status.textContent = 'Parseando historial...';
        const parsed = Importer.parseSession(reader.result, file.name);
        if (!parsed.hero || !parsed.hands.length) {
          status.innerHTML = '<span style="color:var(--red)">No se reconocieron manos de cash NL en el fichero.</span>';
          return;
        }
        const onProgress = (done, total) => {
          status.textContent = `Analizando manos ${done}/${total}...`;
        };
        const finishSession = (session) => {
          const saveResult = Store.saveSession(session);
          const saved = saveResult && saveResult.ok !== false;
          const finalSession = (saveResult && saveResult.session) ? saveResult.session : session;
          if (!saved) {
            status.innerHTML = `<span style="color:var(--yellow)">Análisis completado pero no se pudo guardar (${escapeHtml((saveResult && saveResult.error) || 'almacenamiento local')}). Se muestra sin persistir.</span>`;
          } else {
            status.innerHTML = `<span style="color:var(--green)">Sesión procesada: ${finalSession.hands.length} manos analizadas (de ${finalSession.nTotal} cash${finalSession.nDiscarded ? `, ${finalSession.nDiscarded} sin cartas del héroe` : ''}).</span>`;
          }
          input.value = '';
          $('#process-session').disabled = true;
          renderSessionsList();
          openSession(finalSession.id, finalSession);
        };
        const build = Importer.buildSessionAsync
          ? Importer.buildSessionAsync(parsed, file.name, onProgress)
          : Promise.resolve(Importer.buildSession(parsed, file.name));
        build.then(finishSession).catch((err) => {
          status.innerHTML = '<span style="color:var(--red)">Error al procesar: ' + escapeHtml(err.message || String(err)) + '</span>';
          console.error('[Sessions] process failed', err);
        });
      } catch (err) {
        status.innerHTML = '<span style="color:var(--red)">Error al procesar: ' + escapeHtml(err.message) + '</span>';
        console.error('[Sessions] parse failed', err);
      }
    };
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

  function renderSessionsList() {
    const sessions = Store.getSessions();
    const box = $('#sessions-list');
    if (!sessions.length) { box.innerHTML = '<div class="empty">No hay sesiones. Añade un fichero .txt arriba.</div>'; return; }
    box.innerHTML = sessions.map((s) => {
      const st = s.stats;
      const netCls = st.netBB >= 0 ? 'net-pos' : 'net-neg';
      return `<div class="record session-card">
        <div class="rec-main">
          <div class="rec-scenario">${escapeHtml(s.fileName)} <span class="badge grade-${st.grade.letter[0]}">Nota ${st.grade.letter}</span></div>
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
    $$('#sessions-list [data-delses]').forEach((b) => b.addEventListener('click', () => {
      if (confirm('¿Borrar la sesión completa? Esta acción no se puede deshacer.')) { Store.removeSession(b.dataset.delses); renderSessionsList(); }
    }));
  }

  function openSession(id, sessionObj) {
    currentSession = sessionObj || Store.getSession(id);
    if (!currentSession) {
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
      Store.saveSession(currentSession);
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
        <h3>Manos de la sesión (${s.hands.length})</h3>
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
      <div id="session-hands" class="record-list"></div>`;

    box.innerHTML = statHtml + sortHtml;
    $('#hand-sort').addEventListener('change', (e) => renderSessionDetail(e.target.value));
    renderSessionHands(sortBy);
    if (window.PTAIReport) {
      window.PTAIReport.mount($('#ai-coach-session'), {
        scope: 'sessionGlobal',
        getData: () => currentSession
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
    const hands = currentSession.hands.slice();
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
            html += renderOptionGrid(heroDec.optionBreakdown, heroDec.chosen);
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
    if (window.PTAIReport) {
      window.PTAIReport.mount($('#ai-report-session'), { scope: 'session', getHand: () => currentHand });
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

    return `<div class="poker-table session-replay-table"><div class="table-felt${is9 ? ' table-9max' : ''}">
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
    html += renderShowdownTableHTML(h);
    html += '<div class="session-street-log"><strong>River:</strong> board completo</div>';
    if (villain) {
      html += `<div class="result-line">Cartas de ${escapeHtml(villain.name)}${villain.pos ? ' (' + escapeHtml(villain.pos) + ')' : ''}: ${villain.cards.map(Cards.cardToHTML).join(' ')}</div>`;
    }
    html += `<div class="result-line" style="border:none">Board: ${(h.board || []).map(Cards.cardToHTML).join(' ')}</div>`;
    html += `<button class="btn btn-primary" id="replay-to-summary" style="margin-top:14px">Ver resumen de la repetición »</button>`;
    box.innerHTML = html;
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

    function euroToBB(x) { return bb ? Math.round((x / bb) * 100) / 100 : x; }
    function resetStreetState() {
      Object.keys(streetBetBB).forEach((k) => { delete streetBetBB[k]; });
      Object.keys(streetCommittedEuro).forEach((k) => { delete streetCommittedEuro[k]; });
      Object.keys(lastAction).forEach((k) => { delete lastAction[k]; });
      toMatchEuro = 0;
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
      const isVoluntary = isVoluntaryHeroAction(item.type);
      if (isHero && isVoluntary && heroDecIdx === decisionIdx) break;
      if (street === targetStreet) streetLog.push(item);
      recordAction(item);
      if (isHero && isVoluntary) heroDecIdx++;
    }

    let villainPos = target.vsPosition || null;
    if (!villainPos && lastAggressorPos && lastAggressorPos !== heroPos) villainPos = lastAggressorPos;
    if (!villainPos) {
      for (let j = streetLog.length - 1; j >= 0; j--) {
        const a = streetLog[j];
        if (a.pos && a.pos !== heroPos && a.type !== 'fold') { villainPos = a.pos; break; }
      }
    }

    return { folded, streetBetBB, totalInvBB, lastAction, streetLog, villainPos, heroPos, targetStreet };
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

    return `<div class="poker-table session-replay-table"><div class="table-felt${is9 ? ' table-9max' : ''}">
      <div class="seats">${seatsHtml}</div>
      <div class="board-area"><div class="pot"><span class="pot-chips"><span class="chip-ico"></span></span> Bote: ${fmtBB(d.potBB)} bb</div>
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
    html += renderSessionReplayTableHTML(h, d, replayState.idx, replayStateTable);
    html += renderSessionStreetLogHTML(h, replayStateTable);
    html += `<div class="session-spot-head"><strong>${escapeHtml(d.spot || '')}</strong>`;
    if (d.context) html += `<div class="spot-context">${escapeHtml(d.context)}</div>`;
    html += '</div>';
    const opts = d.options || optionsFor(d.gto);
    html += `<div class="actions" id="replay-actions">` + opts.map((a) =>
      `<button class="btn btn-${btnClassForAction(a)}" data-act="${a}">${escapeHtml(replayActionLabel(a, d))}</button>`
    ).join('') + `</div>`;
    html += `<div id="replay-feedback"></div>`;
    box.innerHTML = html;
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
    const evalResult = GTO.evaluateSpot(buildReplayEvalInput(h, d, action, board));
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
    html += renderOptionGrid(evalResult.optionBreakdown, action);
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

  function replayActionLabel(a, d) {
    if (a === 'call' && d.toCallBB > 0) return actionName(a) + ' ' + d.toCallBB + 'bb';
    if (a.indexOf('bet_') === 0) {
      const mult = a === 'bet_33' ? 0.33 : (a === 'bet_66' ? 0.66 : 1);
      const pct = a === 'bet_33' ? '33%' : (a === 'bet_66' ? '66%' : 'pot');
      const size = round2(Math.max(1, (d.potBB || 1) * mult));
      return `Bet ${size}bb (${pct})`;
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
