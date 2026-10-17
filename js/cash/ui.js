/*
 * cash/ui.js — Lobby / mesa / resultado / histórico de mesas Cash vs IA.
 * Paridad de mesa con Torneos: trn-play-like, animación, modal fin de mano,
 * HUD Jugado/Subido/Resubido, fichas y stats de sesión.
 */
(function (global) {
  'use strict';

  var VIEW = {
    hub: 'hub',
    table: 'table',
    result: 'result',
    history: 'history'
  };

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
  /* Inset vs Torneos (left:3/5): translate(-50%) de asientos laterales no corta cartas. */
  var SEAT_COORDS_MOBILE_6 = [
    { top: 94, left: 50 },
    { top: 78, left: 14 },
    { top: 34, left: 15 },
    { top: 8, left: 30 },
    { top: 8, left: 70 },
    { top: 42, left: 85 }
  ];
  var SEAT_COORDS_MOBILE_3 = [
    { top: 94, left: 50 },
    { top: 16, left: 16 },
    { top: 16, left: 84 }
  ];

  var ui = {
    view: VIEW.hub,
    root: null,
    state: null,
    upgradePrompt: null,
    resumePrompt: false,
    exitPrompt: false,
    rebuyPrompt: false,
    actionBusy: false,
    infoOpen: false,
    infoHandlogOpen: false,
    handDetailOpen: false,
    heroDetailOpen: false,
    villainDetailId: null,
    anim: { frame: null, playing: false, skip: false, seq: 0, timer: null, pending: null },
    thinkingSeatId: null
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtKoins(n) {
    n = Math.round((Number(n) || 0) * 100) / 100;
    var s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
    return s + ' Koins';
  }

  function fmtBb(chips, bb) {
    bb = Number(bb) || 1;
    var v = Math.round((Number(chips) || 0) / bb * 10) / 10;
    return (v % 1 ? v.toFixed(1) : String(v)) + ' bb';
  }

  function walletBalance() {
    var W = global.PTTournamentWallet;
    return W && typeof W.getBalance === 'function' ? W.getBalance() : 0;
  }

  function gateForPreset(id) {
    if (global.PTCash && typeof global.PTCash.canPlayPreset === 'function') {
      return global.PTCash.canPlayPreset(id);
    }
    return { ok: true };
  }

  function planBadgeMeta(plan) {
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') return { t: 'Coach', k: 'coach' };
    if (p === 'pro' || p === 'study') return { t: 'Study', k: 'study' };
    return { t: 'Gratis', k: 'free' };
  }

  function faceCard(c) {
    var code = typeof c === 'string' ? c : (c && (c.code || (c.r != null && c.s ? String(c.r) + c.s : ''))) || '';
    if (!code) return backCard();
    if (global.Cards && global.Cards.cardFaceHTML) return global.Cards.cardFaceHTML(code);
    return '<span class="card">' + esc(code) + '</span>';
  }

  function backCard() {
    if (global.Cards && global.Cards.cardBackHTML) return global.Cards.cardBackHTML();
    return '<span class="card card-back"></span>';
  }

  function whenReady(maybePromise, fn) {
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise.then(function () { fn(); }).catch(function () { fn(); });
    } else {
      fn();
    }
  }

  function setView(v) {
    ui.view = v;
    try {
      document.body.classList.toggle('cash-table-active', v === VIEW.table);
      document.body.classList.toggle('trn-table-active', v === VIEW.table);
    } catch (e) { /* */ }
  }

  function persistActive() {
    if (!ui.state) return;
    var Store = global.PTCashStore;
    if (Store && Store.saveActive) Store.saveActive(ui.state);
  }

  function clearActive() {
    var Store = global.PTCashStore;
    if (Store && Store.clearActive) Store.clearActive();
  }

  function heroDisplayName(state) {
    var hero = global.PTCashState && global.PTCashState.hero
      ? global.PTCashState.hero(state)
      : ((state && state.players) || []).find(function (p) { return p && p.isHero; });
    return (hero && hero.name) || 'Héroe';
  }

  function chargeBuyInOrExplain(buyIn) {
    var Wallet = global.PTTournamentWallet;
    buyIn = Number(buyIn) || 0;
    if (buyIn <= 0) return true;
    if (!Wallet || typeof Wallet.canAfford !== 'function') return true;
    if (!Wallet.canAfford(buyIn)) {
      window.alert('No tienes suficientes Koins (' + fmtKoins(buyIn) + ' de buy-in). ' +
        'Gana Koins en la Escuela, el Entrenador o Torneos.');
      return false;
    }
    var deb = Wallet.debit(buyIn, { type: 'cash_buyin' });
    if (!deb || !deb.ok) {
      window.alert('No se pudo cobrar el buy-in.');
      return false;
    }
    return true;
  }

  function startFromPreset(id) {
    var gate = gateForPreset(id);
    if (!gate.ok) {
      if (gate.upgrade) {
        ui.upgradePrompt = gate;
        paint();
      } else if (gate.message) {
        window.alert(gate.message);
      }
      return;
    }
    var Store = global.PTCashStore;
    var active = Store && Store.loadActive && Store.loadActive();
    if (active && active.status === 'running') {
      ui.resumePrompt = { presetId: id, active: Store.activeSummary() };
      paint();
      return;
    }
    reallyStart(id);
  }

  function reallyStart(id) {
    var Cfg = global.PTCashConfig;
    var Runner = global.PTCashRunner;
    var cfg = Cfg.fromPreset(id);
    if (!chargeBuyInOrExplain(cfg.buyInEur)) return;
    ui.state = Runner.create(cfg);
    ui.rebuyPrompt = false;
    ui.exitPrompt = false;
    ui.resumePrompt = false;
    ui.handDetailOpen = false;
    ui.heroDetailOpen = false;
    ui.villainDetailId = null;
    setView(VIEW.table);
    var began = Runner.beginHand(ui.state);
    whenReady(began, function () {
      persistActive();
      animateThen(function () {
        setThinkingFromHand(ui.state && ui.state._liveHand);
        paint();
      });
    });
  }

  function resumeActive() {
    var Store = global.PTCashStore;
    var Runner = global.PTCashRunner;
    var active = Store && Store.loadActive && Store.loadActive();
    if (!active) {
      ui.resumePrompt = false;
      paint();
      return;
    }
    ui.state = active;
    ui.resumePrompt = false;
    setView(VIEW.table);
    var ensured = Runner.ensureLiveHand(ui.state);
    whenReady(ensured, function () {
      if (ui.state && ui.state.pendingHeroRebuy) ui.rebuyPrompt = true;
      persistActive();
      animateThen(function () {
        setThinkingFromHand(ui.state && ui.state._liveHand);
        paint();
      });
    });
  }

  function discardActiveAndMaybeStart(presetId) {
    var Store = global.PTCashStore;
    var active = Store && Store.loadActive && Store.loadActive();
    if (active && active.config) {
      try {
        var Runner = global.PTCashRunner;
        if (Runner && Runner.finish) {
          Runner.finish(active, { reason: 'discard' });
          if (Store.saveFinished) Store.saveFinished(active);
        }
      } catch (e) {
        clearActive();
      }
    } else {
      clearActive();
    }
    ui.state = null;
    ui.resumePrompt = false;
    if (presetId) reallyStart(presetId);
    else {
      setView(VIEW.hub);
      paint();
    }
  }

  /* ---------- Chips / seats ---------- */

  function isMobileLayout() {
    try { return !!(global.matchMedia && global.matchMedia('(max-width: 680px)').matches); }
    catch (e) { return false; }
  }

  function seatCoordsFor(n) {
    var mobile = isMobileLayout();
    if (n <= 3) return mobile ? SEAT_COORDS_MOBILE_3 : SEAT_COORDS_3;
    return mobile ? SEAT_COORDS_MOBILE_6 : SEAT_COORDS_6;
  }

  function chipsToBb(chips, bb) {
    bb = Number(bb) || 1;
    return (Number(chips) || 0) / bb;
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
    var Tourney = global.PTTournamentsUI;
    if (Tourney && typeof Tourney.chipStackHTML === 'function') {
      return Tourney.chipStackHTML(bbAmt);
    }
    var n = bbAmt < 1 ? 1 : (bbAmt < 3 ? 2 : (bbAmt < 10 ? 3 : 4));
    var tier = chipTier(bbAmt);
    var discs = '';
    for (var i = 0; i < n; i++) discs += '<span class="chip chip-' + tier + '"></span>';
    return '<span class="chip-stack" aria-hidden="true">' + discs + '</span>';
  }

  function renderSeatBetHtml(chips, bb, placement) {
    var Tourney = global.PTTournamentsUI;
    if (Tourney && typeof Tourney.renderSeatBetHtml === 'function') {
      return Tourney.renderSeatBetHtml(chips, bb, placement);
    }
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

  function ringByPhysicalSeat(seats) {
    var list = (seats || []).slice().sort(function (a, b) {
      var pa = a.physicalSeat != null ? a.physicalSeat : (a.seat != null ? a.seat : 999);
      var pb = b.physicalSeat != null ? b.physicalSeat : (b.seat != null ? b.seat : 999);
      if (pa !== pb) return pa - pb;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
    return rotateHeroFirst(list);
  }

  function lastLogAct(hand, playerId) {
    if (!hand || !hand.log || !hand.log.length) return null;
    for (var i = hand.log.length - 1; i >= 0; i--) {
      var e = hand.log[i];
      if (!e) continue;
      var eid = e.id != null ? e.id : e.actorId;
      if (eid === playerId && e.street === hand.street) return e;
    }
    return null;
  }

  function seatLastAct(hand, seat) {
    if (seat && seat.lastAction) return seat.lastAction;
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

  function actionBtnClass(id) {
    if (id === 'fold') return 'btn btn-fold';
    if (id === 'check') return 'btn btn-check';
    if (id === 'call') return 'btn btn-call';
    if (id === 'bet' || id === 'raise') return 'btn btn-raise';
    if (id === 'allin' || id === 'all-in') return 'btn btn-allin';
    return 'btn btn-primary';
  }

  /* ---------- Animation ---------- */

  function reducedMotion() {
    try {
      return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function tableSpeedMultiplier() {
    var Speed = global.PTTournamentTableSpeed;
    var speed = (ui.state && ui.state.tableSpeed) || (Speed && Speed.load ? Speed.load() : 'veryFast');
    if (Speed && typeof Speed.multiplier === 'function') return Speed.multiplier(speed);
    return 1;
  }

  function frameDelay(f) {
    if (reducedMotion()) return 60;
    if (!f) return 0;
    var base = 400;
    if (f.kind === 'deal') base = 420;
    else if (f.kind === 'reveal') base = 2000;
    else if (f.kind === 'street') base = 560;
    else {
      var a = String(f.action || '').toLowerCase();
      if (a === 'fold') base = 240;
      else if (a === 'check') base = 300;
      else if (a === 'call') base = 320;
      else base = 400;
    }
    return Math.round(base * tableSpeedMultiplier());
  }

  function animHand(hand) {
    var f = ui.anim && ui.anim.frame;
    if (!hand || !f) {
      if (!hand) return hand;
      if (!ui.thinkingSeatId) return hand;
      return Object.assign({}, hand, {
        seats: (hand.seats || []).map(function (s) {
          return Object.assign({}, s, { _thinking: s.id === ui.thinkingSeatId });
        }),
        awaitingHero: false,
        heroOptions: null,
        _anim: true
      });
    }
    var byId = {};
    (f.seats || []).forEach(function (s) { byId[s.id] = s; });
    var showThinking = !!(ui.thinkingSeatId && !(ui.anim && ui.anim.playing));
    var seats = (hand.seats || []).map(function (s) {
      var fs = byId[s.id];
      if (!fs) {
        return Object.assign({}, s, {
          _thinking: !!(showThinking && s.id === ui.thinkingSeatId)
        });
      }
      return {
        id: s.id,
        name: s.name,
        isHero: s.isHero,
        roleId: s.roleId,
        pos: s.pos,
        seatIndex: s.seatIndex,
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
        _acting: f.actorId === s.id,
        _thinking: !!(showThinking && s.id === ui.thinkingSeatId && f.actorId !== s.id)
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
      stage: 'playing',
      awaitingHero: false,
      heroOptions: null,
      result: null,
      decisions: hand.decisions,
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

  function clearThinking() {
    ui.thinkingSeatId = null;
  }

  function setThinkingFromHand(hand) {
    ui.thinkingSeatId = null;
    if (!hand || hand.stage !== 'playing' || hand.awaitingHero) return;
    var Live = global.PTTournamentLiveHand;
    if (!Live || typeof Live.peekNextActor !== 'function') return;
    var next = Live.peekNextActor(hand);
    if (next && !next.isHero) ui.thinkingSeatId = next.id;
  }

  function takeFrames() {
    var hand = ui.state && ui.state._liveHand;
    var frames = (hand && hand._frames) ? hand._frames.slice() : [];
    if (hand) hand._frames = [];
    if (!frames.length || typeof setTimeout !== 'function') return null;
    ui.anim.seq += 1;
    ui.anim.skip = false;
    ui.anim.playing = true;
    ui.anim.frame = frames[0];
    clearThinking();
    return frames;
  }

  function playFrames(frames, onDone) {
    if (!frames || !frames.length) {
      stopAnim();
      clearThinking();
      if (onDone) onDone();
      return;
    }
    var seq = ui.anim.seq;
    var i = 0;
    ui.anim.pending = onDone || paint;
    clearThinking();
    function step() {
      if (seq !== ui.anim.seq) return;
      if (ui.anim.skip || i >= frames.length) {
        var done = ui.anim.pending || onDone || paint;
        stopAnim();
        clearThinking();
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

  function animateThen(done) {
    var frames = takeFrames();
    if (!frames) {
      stopAnim();
      done();
      return;
    }
    playFrames(frames, done);
  }

  function afterAction() {
    ui.actionBusy = false;
    clearThinking();
    if (!ui.state) { paint(); return; }
    if (ui.state.status === 'finished') {
      clearActive();
      setView(VIEW.result);
      paint();
      return;
    }
    persistActive();
    setThinkingFromHand(ui.state._liveHand);
    paint();
  }

  /* ---------- HUD / session stats ---------- */

  function liveHudStripForPlayer(state, playerId) {
    var PH = global.PTTournamentPlayerHud;
    if (!PH || !PH.snapshot || !PH.renderStripHtml) return '';
    try {
      return PH.renderStripHtml(PH.snapshot(state, playerId));
    } catch (eHud) { return ''; }
  }

  function cardCodeOf(c) {
    if (!c) return '';
    if (typeof c === 'string') return c;
    return c.code || (c.r != null && c.s ? String(c.r) + c.s : '');
  }

  function cardCodesOf(cards) {
    return (cards || []).map(cardCodeOf).filter(Boolean);
  }

  /** % de ganar en all-in / showdown (misma lógica que Torneos). */
  function allInEquityBySeat(hand) {
    var Tourney = global.PTTournamentsUI;
    if (Tourney && typeof Tourney.allInEquityBySeat === 'function') {
      try { return Tourney.allInEquityBySeat(hand); } catch (eEq) { /* fallback local */ }
    }
    if (!hand || !hand.holesRevealed) return null;
    var contenders = (hand.seats || []).filter(function (s) {
      return s && !s.folded && s.cards && s.cards.length >= 2;
    });
    if (contenders.length < 2) return null;
    var board = cardCodesOf(hand.board);
    var key = board.join(',') + '|' + contenders.map(function (s) { return s.id; }).join(',');
    if (hand._eqCache && hand._eqCache.key === key) return hand._eqCache.map;
    var MW = global.GTOMultiway;
    var iters = board.length >= 5 ? 1 : (board.length >= 4 ? 100 : (board.length >= 3 ? 140 : 100));
    var map = {};
    contenders.forEach(function (seat) {
      var hole = cardCodesOf(seat.cards);
      var others = contenders.filter(function (o) { return o.id !== seat.id; })
        .map(function (o) { return cardCodesOf(o.cards); });
      var eq = 0.5;
      if (MW && typeof MW.equityVsFixedHands === 'function') {
        eq = MW.equityVsFixedHands(hole, board, others, iters);
      }
      map[seat.id] = Math.round((Number(eq) || 0) * 100);
    });
    hand._eqCache = { key: key, map: map };
    return map;
  }

  function equityBesideCardsHtml(pct) {
    var Tourney = global.PTTournamentsUI;
    if (Tourney && typeof Tourney.equityBesideCardsHtml === 'function') {
      try { return Tourney.equityBesideCardsHtml(pct); } catch (eB) { /* fallback */ }
    }
    if (pct == null || isNaN(pct)) return '';
    var cls = 'trn-equity-pct';
    if (pct >= 60) cls += ' is-high';
    else if (pct <= 35) cls += ' is-low';
    return '<div class="trn-seat-equity" aria-label="Probabilidad de ganar">' +
      '<span class="' + cls + '" title="Probabilidad de ganar">' + esc(String(pct)) + '%</span></div>';
  }

  function isShowdownReveal(hand) {
    return !!hand.holesRevealed ||
      !!(hand.result && hand.result.showdown) ||
      !!(ui.anim && ui.anim.frame &&
        (ui.anim.frame.kind === 'reveal' || ui.anim.frame.holesRevealed));
  }

  function liveHeroSessionStats(state) {
    if (!state) return null;
    var Stats = global.PTCashStats;
    var sum = Stats && Stats.summary ? Stats.summary(state) : null;
    var gto = state.gtoSession || {};
    var hands = (state.sessionHands && state.sessionHands.length) ? state.sessionHands : [];
    var Bridge = global.PTTournamentSessionBridge;
    var synth = null;
    if (Bridge && Bridge.synthesizeStatsFromHands) {
      try { synth = Bridge.synthesizeStatsFromHands(hands, sum); } catch (eSy) { synth = null; }
    }
    var PH = global.PTTournamentPlayerHud;
    var hud = PH && PH.snapshot ? PH.snapshot(state, 'hero') : null;
    return {
      nHands: (hud && hud.hands) || (sum && sum.hands) || hands.length || 0,
      vpipPct: (hud && hud.vpipPct != null) ? hud.vpipPct : (sum && sum.vpip),
      pfrPct: (hud && hud.pfrPct != null) ? hud.pfrPct : (sum && sum.pfr),
      threeBetPct: hud && hud.threeBetPct,
      accuracy: (synth && synth.accuracy != null) ? synth.accuracy : gto.accuracy,
      avgHandScore: synth && synth.avgHandScore != null ? synth.avgHandScore : null,
      evLossBB: (synth && synth.evLossBB != null)
        ? synth.evLossBB
        : (gto.totalEvLoss != null ? gto.totalEvLoss : null),
      wtsdPct: synth && synth.wtsdPct,
      wsdPct: synth && synth.wsdPct,
      netBB: (synth && synth.netBB != null) ? synth.netBB : (sum && sum.bbWon),
      bbPer100: (synth && synth.bbPer100 != null) ? synth.bbPer100 : (sum && sum.bbPer100),
      gameKind: 'cash',
      formatKey: 'cash'
    };
  }

  function renderSeats(hand, bb) {
    if (!hand || !hand.seats || !hand.seats.length) return '';
    var ring = ringByPhysicalSeat(hand.seats);
    var coords = seatCoordsFor(ring.length);
    var showdown = isShowdownReveal(hand) || hand.stage === 'complete';
    var revealedIds = (hand.result && hand.result.holeCards) || {};
    var equityMap = allInEquityBySeat(hand);
    var html = '';
    ring.forEach(function (s, i) {
      if (s.isHero) return;
      var c = coords[Math.min(i, coords.length - 1)] || coords[0];
      var cls = ['seat', 'villain'];
      if (s.pos === 'BTN') cls.push('dealer');
      if (s.folded) cls.push('folded');
      if (s._acting) cls.push('acting');
      if (s.allIn) cls.push('allin');
      var last = seatLastAct(hand, s);
      var actHtml = '';
      if (s._thinking && !s._acting) {
        actHtml = '<div class="seat-act-wrap"><span class="seat-act is-thinking" role="status">' +
          '<span class="trn-think-clock" aria-hidden="true"></span>Pensando…</span></div>';
      } else if (s.folded || (last && last.action === 'fold')) {
        actHtml = '<div class="seat-act-wrap"><span class="seat-act fold' +
          (s._acting ? ' is-acting' : '') + '">Fold</span></div>';
      } else if (last) {
        actHtml = '<div class="seat-act-wrap"><span class="seat-act ' + actBadgeClass(last.action) +
          (s._acting ? ' is-acting' : '') + '">' +
          esc(formatActLabel(last.action, last.amount, bb)) + '</span></div>';
      }
      var cardsHtml = '';
      if (!s.folded) {
        if ((showdown || revealedIds[s.id]) && s.cards && s.cards[0]) {
          cardsHtml = '<div class="seat-cards showdown">' + s.cards.map(faceCard).join('') + '</div>';
        } else {
          cardsHtml = '<div class="seat-cards">' + backCard() + backCard() + '</div>';
        }
      }
      var betHtml = renderSeatBetHtml(Number(s.streetInvested) || 0, bb, betPlacement(c));
      var eqPct = equityMap && equityMap[s.id] != null ? equityMap[s.id] : null;
      var eqHtml = (showdown && eqPct != null) ? equityBesideCardsHtml(eqPct) : '';
      var villainName = s.name || 'Villano';
      html += '<button type="button" class="' + cls.join(' ') + '" style="top:' + c.top +
        '%;left:' + c.left + '%" data-player="' + esc(s.id) + '"' +
        ' title="' + esc(villainName + ' · ' + (s.pos || '') +
          (eqPct != null ? (' · ' + eqPct + '%') : '')) + '">' +
        '<div class="seat-body">' +
        '<div class="seat-hole">' + actHtml + cardsHtml + eqHtml + '</div>' +
        '<div class="seat-name">' + (s.allIn ? '<span class="trn-allin-badge">ALL-IN</span> ' : '') +
        esc(villainName) + '</div>' +
        '<div class="seat-pos">' + esc(s.pos || '') + '</div>' +
        '<div class="seat-role">' + esc(villainName) + '</div>' +
        '<div class="seat-stack">' + esc(fmtBb(s.stack, bb)) + '</div>' +
        '</div>' + betHtml + '</button>';
    });
    return html;
  }

  function renderHeroArea(hand, bb) {
    if (!hand) {
      return '<button type="button" class="hero-area hero-area-btn" data-act="open-hero-detail" title="Ver mis estadísticas">' +
        '<div class="hero-label"><span class="hero-avatar" aria-hidden="true"></span>' +
        esc(heroDisplayName(ui.state)) + '</div>' +
        '<div class="hero-cards"></div></button>';
    }
    var hero = null;
    (hand.seats || []).forEach(function (s) { if (s.isHero) hero = s; });
    if (!hero) return '';
    var folded = !!hero.folded;
    var last = seatLastAct(hand, hero);
    var act = '';
    if (hero._thinking && !hero._acting) {
      act = '<div class="action-badge-wrap"><span class="seat-act is-thinking" role="status">' +
        '<span class="trn-think-clock" aria-hidden="true"></span>Pensando…</span></div>';
    } else if (folded || (last && last.action === 'fold')) {
      act = '<div class="action-badge-wrap"><span class="seat-act fold">Fold</span></div>';
    } else if (last) {
      act = '<div class="action-badge-wrap"><span class="seat-act ' + actBadgeClass(last.action) + '">' +
        esc(formatActLabel(last.action, last.amount, bb)) + '</span></div>';
    }
    var cards = folded
      ? ''
      : ((hero.cards && hero.cards[0])
        ? hero.cards.map(faceCard).join('')
        : (backCard() + backCard()));
    var dealerHidden = hero.pos === 'BTN' ? '' : ' hidden';
    var streetChips = renderHeroStreetChipsHtml(Number(hero.streetInvested) || 0, bb);
    var equityMap = allInEquityBySeat(hand);
    var heroShowdown = !folded && (hand.stage === 'complete' || isShowdownReveal(hand));
    var eqPct = equityMap && equityMap[hero.id] != null ? equityMap[hero.id] : null;
    var eqHtml = (heroShowdown && eqPct != null) ? equityBesideCardsHtml(eqPct) : '';
    return '<button type="button" class="hero-area hero-area-btn' + (folded ? ' is-folded' : '') +
      (hero._acting ? ' acting' : '') +
      '" data-act="open-hero-detail" title="Ver mis estadísticas">' +
      act +
      '<div class="hero-chips">' + streetChips +
      '<div class="seat-stack">' + esc(fmtBb(hero.stack, bb)) + '</div></div>' +
      '<div class="hero-label"><span class="hero-avatar" aria-hidden="true"></span>' +
      esc(heroDisplayName(ui.state)) +
      ' · <span>' + esc(hero.pos || '-') + '</span>' +
      (hero.allIn ? ' <span class="trn-allin-badge">ALL-IN</span>' : '') +
      '<span class="hero-dealer' + dealerHidden + '" title="Dealer">D</span></div>' +
      (cards
        ? ('<div class="hero-cards">' + cards + '</div>' + eqHtml)
        : '<div class="hero-cards hero-cards-folded"></div>') +
      '</button>';
  }

  /* ---------- Hand end modal / review ---------- */

  /**
   * Índice de la mano viva completa aún no aplicada a sessionHands.
   * Antes de applyResults, state.handIndex sigue siendo el de la anterior;
   * reutilizarlo colisiona el id (trn_…_hN) con sessionHands y Paso a paso
   * abre la mano vieja (p.ej. fold preflop) en vez de la actual (fold en turn).
   */
  function liveHandIndex(hand, state) {
    var idx = Number(state && state.handIndex) || 0;
    if (hand && hand.stage === 'complete' && hand.result && !hand.result.applied) {
      return idx + 1;
    }
    return idx;
  }

  function analyzedFromLiveHand(hand, state) {
    if (!hand || !state) return null;
    try {
      var Bridge = global.PTCashSessionBridge || global.PTTournamentSessionBridge;
      if (!Bridge || !Bridge.handFromTournament) return null;
      var handIndex = liveHandIndex(hand, state);
      var meta = Bridge.metaFromState
        ? Bridge.metaFromState(state, {
          handIndex: handIndex,
          heroName: heroDisplayName(state)
        })
        : {
          tournamentId: state.id,
          handIndex: handIndex,
          heroName: heroDisplayName(state),
          formatHub: 'cash'
        };
      meta.formatHub = 'cash';
      meta.gameType = 'cash6';
      meta.kind = 'cash';
      meta.handIndex = handIndex;
      return Bridge.handFromTournament(hand, meta);
    } catch (eA) {
      return null;
    }
  }

  function openCashHandReview(analyzed, mode) {
    mode = mode || 'review';
    if (!analyzed) return;
    ui.infoOpen = false;
    ui.handDetailOpen = false;
    try {
      if (typeof global.openTournamentHandReview === 'function') {
        global.openTournamentHandReview(analyzed, mode);
        return;
      }
    } catch (e2) { /* */ }
  }

  function openLiveHandReview(handId, mode) {
    mode = mode || 'review';
    var state = ui.state;
    if (!state) return;
    var analyzed = null;
    var Bridge = global.PTCashSessionBridge || global.PTTournamentSessionBridge;
    var live = state._liveHand;
    var wantIdx = handId != null && String(handId).match(/^\d+$/) ? Number(handId) : null;

    /* Mano viva completa: prioridad sobre sessionHands (evita id colisionado). */
    if (live && live.stage === 'complete' && live.result && !live.result.applied) {
      analyzed = analyzedFromLiveHand(live, state);
      if (analyzed) {
        openCashHandReview(analyzed, mode);
        return;
      }
    }

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
              heroName: heroDisplayName(state),
              formatHub: 'cash'
            });
        }
      } catch (eLog) { analyzed = null; }
    }
    if (!analyzed && live && live.stage === 'complete') {
      analyzed = analyzedFromLiveHand(live, state);
    }
    if (!analyzed && state.sessionHands && state.sessionHands.length) {
      analyzed = state.sessionHands.filter(function (h) {
        return h && (h.id === handId || String(h.handIndex) === String(handId));
      })[0] || state.sessionHands[state.sessionHands.length - 1];
    }
    if (!analyzed) return;
    openCashHandReview(analyzed, mode);
  }

  function renderHandEndModal(hand, state, bb) {
    var res = hand.result || {};
    var hero = null;
    (hand.seats || []).forEach(function (s) { if (s.isHero) hero = s; });
    var heroId = hero ? hero.id : null;
    var deltas = res.deltas || {};
    var heroDelta = heroId != null ? (Number(deltas[heroId]) || 0) : (Number(res.heroNet) || 0);
    var won = heroId && (res.winners || []).indexOf(heroId) >= 0;
    var tied = !!res.tied;
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
    else if (!won && winnerSeats.length === 1 && winnerLabel) title = winnerLabel + ' gana el bote';
    else if (!won && winnerSeats.length > 1 && winnerLabel) title = winnerLabel + ' ganan botes';
    else if (!won && winnerLabel) title = winnerLabel + ' gana el bote';
    else if (heroDelta < -0.02) title = res.showdown ? 'Pierdes en showdown' : 'Pierdes la mano';
    else if (won) title = res.showdown ? 'Showdown' : 'Mano terminada';
    else title = 'Mano terminada';

    var analyzed = analyzedFromLiveHand(hand, state);
    if (!analyzed && state.sessionHands && state.sessionHands.length) {
      analyzed = state.sessionHands[state.sessionHands.length - 1];
    }

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
      var boardHtml = (res.board || hand.board || []).map(faceCard).join('');
      var seatsHtml = (hand.seats || []).filter(function (s) {
        return !s.folded || (res.holeCards && res.holeCards[s.id]) ||
          (res.winners || []).indexOf(s.id) >= 0;
      }).map(function (s) {
        var cards = (res.holeCards && res.holeCards[s.id]) || (s.isHero ? s.cards : null);
        var cardsHtml = cards && cards[0]
          ? cards.map(faceCard).join('')
          : '<span class="muted">—</span>';
        var d = Number(deltas[s.id]) || 0;
        var dCls = d > 0 ? 'net-pos' : (d < 0 ? 'net-neg' : '');
        var isWin = (res.winners || []).indexOf(s.id) >= 0;
        return '<div class="trn-hand-end-seat' + (s.isHero ? ' is-hero' : '') +
          (isWin ? ' is-winner' : '') + '">' +
          '<div class="trn-hand-end-name">' + esc(s.isHero ? heroDisplayName(state) : (s.name || s.pos)) +
          ' · ' + esc(s.pos || '') + (isWin ? ' · Gana' : '') + '</div>' +
          '<div class="trn-hand-end-cards">' + cardsHtml + '</div>' +
          '<div class="trn-hand-end-delta ' + dCls + '">' + (d >= 0 ? '+' : '') +
          esc(fmtBb(d, bb)) + '</div></div>';
      }).join('');
      rich = '<div class="trn-hand-end-head ' + outcomeCls + '">' +
        '<p class="trn-hand-end-kicker">Resultado de la mano</p>' +
        '<h3>' + esc(title) + '</h3>' +
        '<p class="trn-hand-end-pot">Bote ' + esc(fmtBb(res.pot || hand.pot || 0, bb)) +
        (res.showdown ? ' · Showdown' : '') +
        (res.rake > 0 ? (' · Rake ' + esc(fmtBb(res.rake, bb))) : '') +
        '</p></div>' +
        (boardHtml ? ('<div class="trn-hand-end-board"><span class="muted">Board</span>' +
          '<div class="trn-hand-end-cards">' + boardHtml + '</div></div>') : '') +
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
        }
        rich += '</div>';
      }
    }

    var continueBusy = !!ui.actionBusy;
    var continueBtn = '<button type="button" class="btn btn-primary' +
      (continueBusy ? ' is-busy' : '') + '" data-act="continue-hand"' +
      (continueBusy ? ' disabled aria-busy="true"' : '') + '>' +
      (continueBusy ? '<span class="trn-think-clock" aria-hidden="true"></span>' : '') +
      'Continuar »</button>';

    return '<div class="trn-modal-backdrop trn-hand-end-backdrop" data-act="noop">' +
      '<div class="trn-modal trn-hand-end-modal trn-hand-end-modal-rich" role="dialog" aria-modal="true" data-act="noop">' +
      '<div class="trn-hand-end-scroll">' + rich + '</div>' +
      '<div class="trn-hand-end-actions">' +
      '<button type="button" class="btn" data-act="toggle-hand-detail"' +
      (continueBusy ? ' disabled' : '') + '>' +
      (ui.handDetailOpen ? 'Ocultar detalle GTO' : 'Ver detalle GTO') + '</button>' +
      '<button type="button" class="btn" data-act="hand-end-review"' +
      (analyzed && analyzed.id ? (' data-hand-id="' + esc(analyzed.id) + '"') : '') +
      (continueBusy ? ' disabled' : '') +
      '>Paso a paso</button>' +
      continueBtn +
      '</div></div></div>';
  }

  function renderVillainDetailModal(state, bb) {
    if (!ui.villainDetailId || !state) return '';
    var pid = ui.villainDetailId;
    var pl = (state.players || []).find(function (p) { return p && p.id === pid; });
    var villHud = liveHudStripForPlayer(state, pid);
    return '<div class="trn-modal-backdrop" data-act="close-villain-detail">' +
      '<div class="trn-modal trn-modal-player-detail" role="dialog" aria-modal="true" data-act="noop">' +
      '<h3>' + esc((pl && pl.name) || 'Rival') + '</h3>' +
      '<p class="trn-player-stack-detail">' +
      esc(fmtBb(Number(pl && pl.stack) || 0, bb)) +
      (pl && pl.alive === false ? ' · Fuera' : '') +
      '</p>' +
      (villHud
        ? ('<div class="trn-player-live-hud">' + villHud +
          '<p class="muted trn-live-hud-hint">Estadísticas en vivo de esta sesión.</p></div>')
        : '<p class="muted">Aún no hay manos con este rival.</p>') +
      '<button type="button" class="btn btn-primary" data-act="close-villain-detail">Cerrar</button>' +
      '</div></div>';
  }

  function renderHeroDetailModal(state, bb) {
    if (!ui.heroDetailOpen || !state) return '';
    var heroPl = global.PTCashState && global.PTCashState.hero
      ? global.PTCashState.hero(state)
      : (state.players || []).find(function (p) { return p && p.isHero; });
    var heroHud = liveHudStripForPlayer(state, 'hero');
    var liveStats = liveHeroSessionStats(state);
    var heroStatsBody = '';
    var HEV = global.PTHandEndView;
    if (HEV && HEV.renderSessionStatsHtml && liveStats && liveStats.nHands) {
      heroStatsBody = HEV.renderSessionStatsHtml(liveStats, { title: 'Resto de estadísticas' });
    } else {
      heroStatsBody = '<p class="muted">Aún no hay manos puntuadas en esta sesión.</p>';
    }
    return '<div class="trn-modal-backdrop" data-act="close-hero-detail">' +
      '<div class="trn-modal trn-modal-wide trn-modal-player-detail" role="dialog" aria-modal="true" data-act="noop">' +
      '<h3>' + esc((heroPl && heroPl.name) || heroDisplayName(state)) + '</h3>' +
      '<p class="trn-player-stack-detail">' +
      esc(fmtBb(Number(heroPl && heroPl.stack) || 0, bb)) +
      '</p>' +
      '<div class="trn-player-live-hud">' + heroHud +
      '<p class="muted trn-live-hud-hint">Estadísticas en vivo de esta sesión.</p></div>' +
      heroStatsBody +
      '<button type="button" class="btn btn-primary" data-act="close-hero-detail">Cerrar</button>' +
      '</div></div>';
  }

  function sessionHandsListHtml(state) {
    var hands = (state && state.sessionHands) || [];
    if (!hands.length && state && state.handLog && state.handLog.length) {
      hands = state.handLog;
    }
    if (!hands.length) return '<p class="muted">Aún no hay manos</p>';
    var list = hands.slice().reverse().slice(0, 40);
    return '<ul class="trn-info-handlog">' + list.map(function (h) {
      var idx = h.handIndex != null ? h.handIndex : '';
      var bb = Number(h.bb) || ((state.config && state.config.bb) || 20);
      var net = null;
      if (h.result && h.result.heroNet != null) {
        net = Math.round((Number(h.result.heroNet) / Math.max(1, bb)) * 10) / 10;
      } else if (h.netBB != null) {
        net = Number(h.netBB);
      }
      var netTxt = net == null ? '' : (' · ' + (net >= 0 ? '+' : '') + net + ' bb');
      var pos = '';
      if (h.heroPosition) pos = h.heroPosition;
      else {
        var heroSeat = (h.seats || []).find(function (s) { return s && s.isHero; });
        if (heroSeat && heroSeat.pos) pos = heroSeat.pos;
      }
      return '<li><button type="button" class="btn btn-sm trn-info-hand-btn" data-act="review-hand" data-hand="' +
        esc(String(idx)) + '" title="Ver paso a paso">' +
        '#' + esc(String(idx)) +
        (pos ? (' · ' + esc(pos)) : '') +
        netTxt +
        (h.showdown || (h.result && h.result.showdown) ? ' · SD' : '') +
        '</button></li>';
    }).join('') + '</ul>';
  }

  /* ---------- Table / result / hub ---------- */

  function renderTable() {
    var state = ui.state;
    if (!state) return '<p>Sin sesión activa.</p>';
    var hand = animHand(state._liveHand);
    var Runner = global.PTCashRunner;
    var Stats = global.PTCashStats;
    var blinds = Runner.blindsFor(state);
    var bb = hand ? hand.bb : (blinds.bb || 20);
    var cfg = state.config || {};
    var summ = Stats && Stats.summary ? Stats.summary(state) : {};
    var hero = global.PTCashState && global.PTCashState.hero(state);
    var stackBb = hero ? Math.round(((Number(hero.stack) || 0) / bb) * 10) / 10 : 0;

    var chips = [
      '<span class="trn-chip trn-chip-kind" title="Stake">' + esc(cfg.stakeLabel || 'Cash') + '</span>',
      '<span class="trn-chip trn-chip-stack" title="Stack">' + stackBb + ' bb</span>',
      '<span class="trn-chip" title="Manos">' + (summ.hands || 0) + ' manos</span>',
      '<span class="trn-chip" title="bb/100">' + (summ.bbPer100 || 0) + ' bb/100</span>',
      '<span class="trn-chip trn-chip-blinds" title="Ciegas">' +
        esc(String(blinds.sb) + '/' + String(blinds.bb)) + '</span>'
    ].join('');

    var potBb = hand ? fmtBb(hand.pot, bb) : '0 bb';
    var potChipsHtml = '';
    if (hand && Number(hand.pot) > 0) {
      potChipsHtml = '<span class="pot-chips">' + chipStackHTML(chipsToBb(hand.pot, bb)) + '</span>';
    }
    var boardHtml = (hand && hand.board && hand.board.length)
      ? hand.board.map(faceCard).join('')
      : '';
    var nSeats = hand && hand.seats ? hand.seats.length
      : (state.config && state.config.seatsPerTable) || 6;
    var tableClass = nSeats <= 3 ? 'table-3max' : 'table-6max';
    var seatsHtml = hand ? renderSeats(hand, bb) : '';
    if (!hand && state.status === 'running') {
      var Seat = global.PTTournamentSeating;
      var tableId = (state.tables.find(function (t) { return t.isHeroTable; }) || {}).id;
      var onTable = tableId && Seat ? Seat.playersOnTable(state, tableId) : (state.players || []);
      var fake = {
        seats: onTable.map(function (p) {
          return {
            id: p.id, name: p.name, isHero: !!p.isHero, pos: '',
            physicalSeat: p.seat != null ? p.seat : 0,
            seat: p.seat, stack: p.stack, streetInvested: 0, folded: false, cards: null
          };
        }),
        stage: 'waiting', street: 'preflop', log: []
      };
      seatsHtml = renderSeats(fake, bb);
    }

    var actions = '';
    if (ui.anim && ui.anim.playing) {
      actions = '<div class="actions actions-grid actions-grid-1 trn-anim-actions">' +
        '<button type="button" class="btn btn-skip-anim" data-act="skip-anim">Saltar acción</button>' +
        '</div>';
    } else if (ui.thinkingSeatId || ui.actionBusy) {
      actions = '<div class="actions actions-grid actions-grid-1 trn-anim-actions trn-thinking-actions" role="status">' +
        '<span class="trn-thinking-status">' +
        '<span class="trn-think-clock" aria-hidden="true"></span>El rival está pensando…</span></div>';
    } else if (hand && hand.stage === 'complete') {
      actions = '';
    } else if (hand && hand.awaitingHero && hand.heroOptions && hand.heroOptions.length) {
      var nBtn = hand.heroOptions.length;
      var grid = nBtn <= 2 ? 'actions-grid-2' : (nBtn === 3 ? 'actions-grid-3' : 'actions-grid');
      actions = '<div class="actions actions-grid ' + grid + '">' + hand.heroOptions.map(function (o) {
        var amt = o.suggested != null ? o.suggested : (o.amount != null ? o.amount : '');
        var label = o.label || o.id;
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
    } else if (!hand && state.status === 'running' && !state.pendingHeroRebuy) {
      actions = '<div class="actions actions-grid actions-grid-1">' +
        '<button type="button" class="btn btn-primary" data-act="next-hand">Repartir</button></div>';
    }

    var rebuyModal = '';
    if (ui.rebuyPrompt || state.pendingHeroRebuy) {
      var buyIn = Number(cfg.buyInEur) || 0;
      var can = true;
      try {
        var W = global.PTTournamentWallet;
        if (W && W.canAfford) can = W.canAfford(buyIn);
      } catch (e) { /* */ }
      rebuyModal = '<div class="trn-modal-backdrop cash-rebuy-backdrop" data-act="noop">' +
        '<div class="trn-modal" role="dialog" aria-modal="true" data-act="noop">' +
        '<h3>Stack a cero</h3>' +
        '<p class="muted">¿Quieres rebuy a ' + esc(cfg.stakeLabel || '') +
        ' por ' + esc(fmtKoins(buyIn)) + '?</p>' +
        (!can ? '<p class="cash-warn">Saldo insuficiente.</p>' : '') +
        '<div class="trn-setup-actions">' +
        '<button type="button" class="btn btn-primary" data-act="confirm-rebuy"' +
        (can ? '' : ' disabled') + '>Rebuy</button>' +
        '<button type="button" class="btn" data-act="finish-bust">Terminar sesión</button>' +
        '</div></div></div>';
    }

    var exitModal = '';
    if (ui.exitPrompt) {
      var econ = Runner.computeCashOut(state);
      exitModal = '<div class="trn-modal-backdrop" data-act="close-exit">' +
        '<div class="trn-modal" role="dialog" aria-modal="true" data-act="noop">' +
        '<h3>Salir de la mesa</h3>' +
        '<p class="muted">Cash-out estimado: <strong>' + esc(fmtKoins(econ.cashOut)) +
        '</strong> (PnL ' + (econ.profit >= 0 ? '+' : '') + esc(fmtKoins(econ.profit)) + ')</p>' +
        '<div class="trn-setup-actions">' +
        '<button type="button" class="btn btn-primary" data-act="confirm-exit">Cobrar y salir</button>' +
        '<button type="button" class="btn" data-act="close-exit">Seguir jugando</button>' +
        '</div></div></div>';
    }

    var infoModal = '';
    if (ui.infoOpen) {
      var live = liveHeroSessionStats(state);
      var HEV = global.PTHandEndView;
      var liveStatsHtml = '';
      if (HEV && HEV.renderSessionStatsHtml && live && live.nHands) {
        liveStatsHtml = HEV.renderSessionStatsHtml(live, { title: 'Hasta ahora' });
      }
      var Speed = global.PTTournamentTableSpeed;
      var curSpeed = Speed && Speed.normalize
        ? Speed.normalize(state.tableSpeed || (Speed.load && Speed.load()))
        : (state.tableSpeed || 'veryFast');
      function speedChip(id, label) {
        return '<button type="button" class="btn btn-sm' + (curSpeed === id ? ' is-selected' : '') +
          '" data-act="info-table-speed" data-speed="' + id + '">' + label + '</button>';
      }
      infoModal = '<div class="trn-modal-backdrop" data-act="close-info">' +
        '<div class="trn-modal trn-modal-wide trn-info-modal" role="dialog" aria-modal="true" data-act="noop">' +
        '<h3>Info de sesión</h3>' +
        '<div class="trn-info-dl">' +
        '<div class="trn-info-row"><span class="trn-info-lbl">Mesa</span><span class="trn-info-val">' +
        esc(cfg.name || '') + '</span></div>' +
        '<div class="trn-info-row"><span class="trn-info-lbl">Manos</span><span class="trn-info-val">' +
        (summ.hands || 0) + '</span></div>' +
        '<div class="trn-info-row"><span class="trn-info-lbl">bb/100</span><span class="trn-info-val">' +
        (summ.bbPer100 || 0) + '</span></div>' +
        '<div class="trn-info-row"><span class="trn-info-lbl">Buy-ins</span><span class="trn-info-val">' +
        (state.buyInsPaid || 1) + '</span></div>' +
        '<div class="trn-info-row"><span class="trn-info-lbl">Rake</span><span class="trn-info-val">' +
        esc(fmtBb(summ.rakePaid || 0, bb)) + '</span></div>' +
        '</div>' +
        '<div class="trn-assist-info card-box trn-table-speed-info">' +
        '<h4>Velocidad de mesa</h4>' +
        '<p class="muted trn-assist-info-blurb">Ritmo de las acciones de los rivales y del board.</p>' +
        '<div class="trn-assist-levels" role="group" aria-label="Velocidad de mesa">' +
        speedChip('veryFast', 'Muy rápida') +
        speedChip('fast', 'Rápida') +
        speedChip('normal', 'Normal') +
        '</div></div>' +
        '<div class="trn-info-live-hud">' +
        '<h4>Tus estadísticas en vivo</h4>' +
        liveHudStripForPlayer(state, 'hero') +
        liveStatsHtml +
        '</div>' +
        '<details class="trn-info-handlog-wrap"' + (ui.infoHandlogOpen ? ' open' : '') + '>' +
        '<summary data-act="toggle-handlog">Histórico de manos' +
        ((state.handLog && state.handLog.length)
          ? (' <span class="muted">(' + state.handLog.length + ')</span>') : '') +
        '</summary>' +
        '<p class="trn-info-handlog-hint muted">Pulsa una mano para ver el paso a paso</p>' +
        sessionHandsListHtml(state) +
        '</details>' +
        '<button type="button" class="btn btn-primary" data-act="close-info">Cerrar</button>' +
        '</div></div>';
    }

    var handEndModal = '';
    var rawHand = state._liveHand;
    /* No mostrar el modal mientras actionBusy (p.ej. tras fold del héroe el
       motor ya marcó complete pero aún quedan fotogramas de villanos): eso
       duplicaba el resumen (una vez al fold + otra al acabar la animación). */
    if (!ui.actionBusy && !(ui.anim && ui.anim.playing) &&
        rawHand && rawHand.stage === 'complete' && rawHand.result) {
      handEndModal = renderHandEndModal(rawHand, state, bb);
    }

    return '<div class="trn-table-view trn-play-like cash-table-view">' +
      '<div class="trn-play-stage">' +
      '<div class="trn-table-hud">' + chips +
      '<div class="trn-hud-actions">' +
      '<button type="button" class="btn btn-sm trn-info-btn" data-act="open-info">Info</button>' +
      '<button type="button" class="btn btn-sm" data-act="exit-table">Salir</button>' +
      '</div></div>' +
      '<div class="poker-table trn-poker-table">' +
      '<div class="table-felt ' + tableClass + '" data-theme="emerald" data-format="cash">' +
      '<div class="table-watermark" aria-hidden="true">' +
      '<span class="table-watermark-mark"></span>' +
      '<span class="table-watermark-text">PokerForgeAI</span>' +
      '<span class="table-watermark-sub">Cash</span>' +
      '</div>' +
      '<div class="seats">' + seatsHtml + '</div>' +
      '<div class="board-area">' +
      '<div class="pot">' + potChipsHtml + 'Bote: <strong class="pot-amt">' + esc(potBb) + '</strong></div>' +
      '<div class="board">' + boardHtml + '</div>' +
      '</div>' +
      renderHeroArea(hand, bb) +
      '</div></div>' +
      actions +
      '</div>' +
      rebuyModal + exitModal + infoModal +
      renderVillainDetailModal(state, bb) +
      renderHeroDetailModal(state, bb) +
      handEndModal +
      '</div>';
  }

  function renderResult() {
    var state = ui.state;
    var res = state && state.result;
    if (!res) {
      return '<div class="trn-result cash-result"><p>Sin resultado.</p>' +
        '<button type="button" class="btn" data-act="back-hub">Volver al lobby</button></div>';
    }
    var cfg = state.config || {};
    var profit = Number(res.profitKoins) || 0;
    var live = liveHeroSessionStats(state);
    var HEV = global.PTHandEndView;
    var statsHtml = '';
    if (HEV && HEV.renderSessionStatsHtml && live && live.nHands) {
      statsHtml = HEV.renderSessionStatsHtml(live, { title: 'Estadísticas de sesión' });
    }
    var handsBlock = '';
    if ((state.sessionHands && state.sessionHands.length) || (state.handLog && state.handLog.length)) {
      handsBlock = '<div class="cash-result-hands">' +
        '<h3>Manos de la sesión</h3>' +
        '<p class="muted">Pulsa una mano para ver el paso a paso</p>' +
        sessionHandsListHtml(state) +
        '</div>';
    }
    return '<div class="trn-result cash-result">' +
      '<p class="trn-result-eyebrow">Sesión cash</p>' +
      '<h2>' + esc(cfg.name || cfg.stakeLabel || 'Cash') + '</h2>' +
      '<div class="cash-result-grid">' +
      '<div><span class="muted">Cash-out</span><strong>' + esc(fmtKoins(res.cashOutKoins)) + '</strong></div>' +
      '<div><span class="muted">Invertido</span><strong>' + esc(fmtKoins(res.investedKoins)) + '</strong></div>' +
      '<div><span class="muted">PnL</span><strong class="' + (profit >= 0 ? 'is-win' : 'is-loss') + '">' +
      (profit >= 0 ? '+' : '') + esc(fmtKoins(profit)) + '</strong></div>' +
      '<div><span class="muted">Manos</span><strong>' + (res.hands || 0) + '</strong></div>' +
      '<div><span class="muted">bb/100</span><strong>' + (res.bbPer100 || 0) + '</strong></div>' +
      '<div><span class="muted">Buy-ins</span><strong>' + (res.buyInsPaid || 1) + '</strong></div>' +
      '</div>' +
      statsHtml +
      handsBlock +
      '<div class="trn-setup-actions">' +
      '<button type="button" class="btn btn-primary" data-act="replay-stake">Otra vez ' +
      esc(cfg.stakeLabel || '') + '</button>' +
      '<button type="button" class="btn" data-act="back-hub">Lobby</button>' +
      '</div></div>';
  }

  function renderHistory() {
    var Store = global.PTCashStore;
    var hist = (Store && Store.list()) || [];
    var rows = hist.length
      ? hist.map(function (h) {
        var profit = Number(h.profit) || 0;
        return '<li class="trn-recent-card">' +
          '<span class="trn-recent-name">' + esc(h.name || h.stakeLabel || 'Cash') + '</span>' +
          '<div class="trn-recent-vals">' +
          '<span class="trn-recent-chip"><strong>' + esc(h.stakeLabel || '') + '</strong><span>Stake</span></span>' +
          '<span class="trn-recent-chip"><strong>' + (h.hands || 0) + '</strong><span>Manos</span></span>' +
          '<span class="trn-recent-chip"><strong>' + (h.bbPer100 || 0) + '</strong><span>bb/100</span></span>' +
          (h.vpip != null
            ? ('<span class="trn-recent-chip"><strong>' + h.vpip + '%</strong><span>VPIP</span></span>')
            : '') +
          (h.gtoAccuracy != null
            ? ('<span class="trn-recent-chip"><strong>' + h.gtoAccuracy + '%</strong><span>GTO</span></span>')
            : '') +
          '<span class="trn-recent-chip"><strong class="' + (profit >= 0 ? 'is-win' : 'is-loss') + '">' +
          (profit >= 0 ? '+' : '') + esc(fmtKoins(profit)) + '</strong><span>PnL</span></span>' +
          '</div></li>';
      }).join('')
      : '<li class="muted">Sin sesiones guardadas</li>';
    return '<div class="trn-history cash-history">' +
      '<div class="trn-history-head">' +
      '<button type="button" class="btn btn-sm" data-act="back-hub">← Lobby</button>' +
      '<h2>Histórico Cash</h2></div>' +
      '<ul class="trn-recent-list">' + rows + '</ul></div>';
  }

  function renderLobbyRow(p) {
    var gate = gateForPreset(p.id);
    var locked = !gate.ok && !!gate.upgrade;
    var planMeta = planBadgeMeta(p.minPlan || (gate && gate.requiredPlan) || 'free');
    var activeSum = global.PTCashStore && global.PTCashStore.activeSummary && global.PTCashStore.activeSummary();
    var isActive = !!(activeSum && (activeSum.presetId === p.id || activeSum.id === p.id));
    var statusTxt = isActive ? 'En curso' : (locked ? planMeta.t : 'Abierto');
    var difficulty = p.aiLevel === 'exploit_pro' ? 'Pro'
      : (p.aiLevel === 'elite' ? 'Élite'
        : (p.aiLevel === 'strong' ? 'Fuerte' : 'Sólido'));

    return '<button type="button" class="trn-lobby-row cash-lobby-row' +
      (isActive ? ' is-active' : '') +
      (locked ? ' is-locked' : '') +
      '" data-preset="' + esc(p.id) + '"' +
      (locked ? ' data-locked="1"' : '') + '>' +
      '<div class="trn-lobby-thumb" aria-hidden="true">' +
      '<span class="trn-lobby-thumb-kind">CASH</span>' +
      '<span class="trn-lobby-thumb-deco">♦</span>' +
      '<span class="trn-lobby-status">' + esc(statusTxt) + '</span>' +
      '</div>' +
      '<div class="trn-lobby-main">' +
      '<div class="trn-lobby-title-row">' +
      '<span class="trn-lobby-title">' + esc(p.name) + '</span>' +
      '<span class="trn-lobby-badges">' +
      '<span class="trn-badge trn-badge-' + esc(planMeta.k) + '">' + esc(planMeta.t) + '</span>' +
      (locked ? ('<span class="trn-lobby-lock">Requiere ' + esc(planMeta.t) + '</span>') : '') +
      '</span></div>' +
      '<div class="trn-lobby-subline">NLHE 6-max · 100 bb · IA ' + esc(difficulty) +
      ' · Rake 5%/3bb</div>' +
      '<div class="trn-lobby-stats">' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Buy-in</span>' +
      '<span class="trn-stat-val">' + esc(fmtKoins(p.buyInEur)) + '</span></div>' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Jugadores</span>' +
      '<span class="trn-stat-val">6</span></div>' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Stack</span>' +
      '<span class="trn-stat-val">100 bb</span></div>' +
      '</div></div>' +
      '<div class="trn-lobby-desk" aria-hidden="true">' +
      '<span class="trn-desk-start"><strong>' + (locked ? 'Plan' : 'Ahora') +
      '</strong><small>' + (locked ? esc(planMeta.t) : 'al instante') + '</small></span>' +
      '<span class="trn-desk-name">' + esc(p.stakeLabel) + '</span>' +
      '<span class="trn-desk-game">NLHE</span>' +
      '<span class="trn-desk-players">6</span>' +
      '<span class="trn-desk-buyin">' + esc(fmtKoins(p.buyInEur)) + '</span>' +
      '<span class="trn-desk-prize">100 bb</span>' +
      '</div></button>';
  }

  function renderHub() {
    var presets = global.PTCashConfig.listPresets();
    var rows = presets.map(renderLobbyRow).join('');
    var hist = ((global.PTCashStore && global.PTCashStore.list()) || []).slice(0, 5);
    var histHtml = hist.length
      ? hist.map(function (h) {
        var profit = Number(h.profit) || 0;
        return '<li class="trn-recent-card">' +
          '<span class="trn-recent-name">' + esc(h.name || 'Cash') + '</span>' +
          '<div class="trn-recent-vals">' +
          '<span class="trn-recent-chip"><strong>' + (h.hands || 0) + '</strong><span>Manos</span></span>' +
          '<span class="trn-recent-chip"><strong>' +
          (profit >= 0 ? '+' : '') + esc(String(profit)) + '</strong><span>PnL</span></span>' +
          '</div></li>';
      }).join('')
      : '<li class="muted">Sin sesiones guardadas</li>';

    var active = global.PTCashStore && global.PTCashStore.activeSummary && global.PTCashStore.activeSummary();
    var activeBanner = '';
    if (active) {
      activeBanner = '<div class="trn-active-banner" role="status">' +
        '<div class="trn-active-copy">' +
        '<strong>Sesión en curso</strong>' +
        '<span>' + esc(active.name) + ' · mano ' + (active.handIndex || 0) + '</span>' +
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
        '<div class="trn-modal" role="dialog" data-act="noop">' +
        '<h3>Ya tienes una sesión en curso</h3>' +
        '<p class="muted">' + esc(rp.name) + ' · mano ' + (rp.handIndex || 0) + '</p>' +
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
        '<div class="trn-modal trn-upgrade-modal" role="dialog" data-act="noop">' +
        '<p class="trn-upgrade-kicker">Plan ' + esc(planName) + '</p>' +
        '<h3>Desbloquea esta mesa</h3>' +
        '<p class="trn-upgrade-msg">' + esc(up.message) + '</p>' +
        '<ul class="trn-upgrade-perks">' +
        '<li><strong>Gratis</strong> — NL2</li>' +
        '<li><strong>Study</strong> — NL5 a NL20</li>' +
        '<li><strong>Coach</strong> — NL50 y NL100</li>' +
        '</ul>' +
        '<div class="trn-setup-actions">' +
        '<button type="button" class="btn btn-primary" data-act="upgrade-plans">Ver planes</button>' +
        '<button type="button" class="btn" data-act="close-upgrade">Seguir mirando</button>' +
        '</div></div></div>';
    }

    return '<div class="trn-hub trn-lobby cash-hub cash-lobby">' +
      '<header class="trn-lobby-hero cash-lobby-hero">' +
      '<div class="trn-lobby-hero-copy">' +
      '<p class="trn-lobby-eyebrow">Lobby</p>' +
      '<h2>CASH</h2>' +
      '<p class="trn-lobby-tagline">Mesas 6-max vs IA. Usa tus Koins, sube de NL2 a NL100.</p>' +
      '</div>' +
      '<div class="trn-lobby-hero-side">' +
      '<div class="trn-wallet" title="Saldo de Koins">' +
      '<span class="trn-wallet-lbl">Koins</span>' +
      '<strong class="trn-wallet-bal">' + esc(fmtKoins(walletBalance())) + '</strong>' +
      '</div>' +
      '<div class="trn-lobby-hero-actions">' +
      '<button type="button" class="btn btn-sm" data-act="open-history">Histórico</button>' +
      '</div></div></header>' +
      activeBanner +
      '<div class="trn-lobby-toolbar">' +
      '<div class="trn-lobby-colhead" aria-hidden="true">' +
      '<span>Comienzo</span><span>Nombre</span><span>Juego</span><span>Jug.</span>' +
      '<span>Buy-in</span><span>Stack</span></div></div>' +
      '<div class="trn-lobby-list">' + rows + '</div>' +
      '<section class="trn-lobby-recents">' +
      '<h3>Recientes</h3><ul class="trn-recent-list">' + histHtml + '</ul></section>' +
      resumeModal + upgradeModal +
      '</div>';
  }

  function paint() {
    if (!ui.root) return;
    var html = '';
    if (ui.view === VIEW.table) html = renderTable();
    else if (ui.view === VIEW.result) html = renderResult();
    else if (ui.view === VIEW.history) html = renderHistory();
    else html = renderHub();
    ui.root.innerHTML = html;
    bind(ui.root);
  }

  function finishSession(reason) {
    var Runner = global.PTCashRunner;
    var Store = global.PTCashStore;
    if (!ui.state) return;
    stopAnim();
    clearThinking();
    Runner.finish(ui.state, { reason: reason || 'cashout' });
    if (Store && Store.saveFinished) Store.saveFinished(ui.state);
    clearActive();
    ui.rebuyPrompt = false;
    ui.exitPrompt = false;
    ui.handDetailOpen = false;
    ui.heroDetailOpen = false;
    ui.villainDetailId = null;
    setView(VIEW.result);
    paint();
  }

  function heroActImmediate(actionId, amount) {
    if (ui.actionBusy) return;
    if (ui.anim && ui.anim.playing) return;
    var Runner = global.PTCashRunner;
    if (!Runner || !ui.state) return;

    ui.actionBusy = true;
    if (typeof Runner.applyHeroAction === 'function') {
      Runner.applyHeroAction(ui.state, actionId, amount);
    } else {
      var actedLegacy = Runner.heroAct(ui.state, actionId, amount);
      whenReady(actedLegacy, function () {
        animateThen(afterAction);
      });
      return;
    }

    var hand = ui.state._liveHand;
    var frames = (hand && hand._frames) ? hand._frames.slice() : [];
    if (hand) hand._frames = [];

    if (ui.anim.timer && typeof clearTimeout === 'function') clearTimeout(ui.anim.timer);
    ui.anim.timer = null;
    ui.anim.skip = false;
    ui.anim.playing = false;
    ui.anim.pending = null;
    ui.anim.frame = frames.length ? frames[0] : null;

    setThinkingFromHand(hand);
    paint();

    function continueAfterPaint() {
      if (!ui.state) {
        ui.actionBusy = false;
        clearThinking();
        return;
      }
      setThinkingFromHand(ui.state._liveHand);
      paint();

      var cont = Runner.continueToHeroOrEnd
        ? Runner.continueToHeroOrEnd(ui.state)
        : Runner.heroAct(ui.state, actionId, amount);

      whenReady(cont, function () {
        var more = (ui.state && ui.state._liveHand && ui.state._liveHand._frames)
          ? ui.state._liveHand._frames.slice()
          : [];
        if (ui.state && ui.state._liveHand) ui.state._liveHand._frames = [];

        if (!ui.thinkingSeatId && more.length) {
          var f0 = more[0];
          if (f0 && f0.kind === 'act' && f0.actorId && !f0.isHero) {
            ui.thinkingSeatId = f0.actorId;
          }
        }

        function playRest() {
          if (!more.length) {
            stopAnim();
            clearThinking();
            ui.actionBusy = false;
            afterAction();
            return;
          }
          ui.anim.seq += 1;
          ui.anim.skip = false;
          ui.anim.playing = true;
          ui.anim.frame = more[0];
          clearThinking();
          playFrames(more, function () {
            ui.actionBusy = false;
            afterAction();
          });
        }

        var thinkMs = reducedMotion() ? 60 : Math.round(280 * tableSpeedMultiplier());
        var shouldDwell = !!(more.length && thinkMs > 0 && typeof setTimeout === 'function'
          && (ui.thinkingSeatId || ui.actionBusy));
        if (shouldDwell) {
          paint();
          setTimeout(playRest, thinkMs);
        } else {
          playRest();
        }
      });
    }

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () {
        setTimeout(continueAfterPaint, 0);
      });
    } else {
      setTimeout(continueAfterPaint, 0);
    }
  }

  function continueHand() {
    var Runner = global.PTCashRunner;
    if (!ui.state || !Runner) return;
    if (ui.actionBusy) return;
    ui.actionBusy = true;
    ui.handDetailOpen = false;
    paint();
    var next = Runner.continueAfterHand(ui.state);
    whenReady(next, function () {
      ui.actionBusy = false;
      if (ui.state && ui.state.pendingHeroRebuy) ui.rebuyPrompt = true;
      persistActive();
      animateThen(function () {
        setThinkingFromHand(ui.state && ui.state._liveHand);
        paint();
      });
    });
  }

  function bind(root) {
    root.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        startFromPreset(btn.getAttribute('data-preset'));
      });
    });

    root.querySelectorAll('[data-hero-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (ui.actionBusy) return;
        if (ui.anim && ui.anim.playing) return;
        var id = btn.getAttribute('data-hero-act');
        var amt = btn.getAttribute('data-amount');
        var amount = amt === '' || amt == null ? undefined : Number(amt);
        heroActImmediate(id, amount);
      });
    });

    root.querySelectorAll('.trn-play-like .seat.villain[data-player]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var pid = btn.getAttribute('data-player');
        if (!pid) return;
        ui.heroDetailOpen = false;
        ui.villainDetailId = pid;
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
        if ((act === 'close-info' || act === 'close-exit' || act === 'close-resume' ||
            act === 'close-upgrade' || act === 'close-hero-detail' ||
            act === 'close-villain-detail') &&
            btn.classList.contains('trn-modal-backdrop') && ev.target !== btn) {
          return;
        }
        if (act === 'open-history') {
          setView(VIEW.history);
          paint();
          return;
        }
        if (act === 'back-hub') {
          ui.state = null;
          setView(VIEW.hub);
          paint();
          return;
        }
        if (act === 'resume-active') {
          resumeActive();
          return;
        }
        if (act === 'discard-active') {
          discardActiveAndMaybeStart(null);
          return;
        }
        if (act === 'restart-preset') {
          discardActiveAndMaybeStart(btn.getAttribute('data-preset-id'));
          return;
        }
        if (act === 'close-resume') {
          ui.resumePrompt = false;
          paint();
          return;
        }
        if (act === 'close-upgrade') {
          ui.upgradePrompt = null;
          paint();
          return;
        }
        if (act === 'upgrade-plans') {
          var needPlan = (ui.upgradePrompt && ui.upgradePrompt.requiredPlan) || 'pro';
          ui.upgradePrompt = null;
          if (global.PTBilling && typeof global.PTBilling.showPaywall === 'function') {
            global.PTBilling.showPaywall('cash_plan', { requiredPlan: needPlan });
          } else if (typeof global.goToTab === 'function') {
            global.goToTab('pricing');
          } else {
            var tab = document.querySelector('.tab[data-tab="pricing"]');
            if (tab) tab.click();
          }
          paint();
          return;
        }
        if (act === 'exit-table') {
          ui.exitPrompt = true;
          paint();
          return;
        }
        if (act === 'close-exit') {
          ui.exitPrompt = false;
          paint();
          return;
        }
        if (act === 'confirm-exit') {
          finishSession('cashout');
          return;
        }
        if (act === 'confirm-rebuy') {
          var Runner = global.PTCashRunner;
          var out = Runner.heroRebuy(ui.state);
          if (!out.ok) {
            if (out.reason === 'insufficient') {
              window.alert('No tienes suficientes Koins para el rebuy.');
            }
            return;
          }
          ui.rebuyPrompt = false;
          var began = Runner.beginHand(ui.state);
          whenReady(began, function () {
            persistActive();
            animateThen(function () {
              setThinkingFromHand(ui.state && ui.state._liveHand);
              paint();
            });
          });
          return;
        }
        if (act === 'finish-bust') {
          finishSession('bust');
          return;
        }
        if (act === 'continue-hand') {
          continueHand();
          return;
        }
        if (act === 'skip-anim') {
          if (ui.anim) ui.anim.skip = true;
          return;
        }
        if (act === 'toggle-hand-detail') {
          ui.handDetailOpen = !ui.handDetailOpen;
          paint();
          return;
        }
        if (act === 'hand-end-review') {
          /* Siempre la mano viva del popup: no buscar por id en sessionHands
             (colisión handIndex con la mano anterior). */
          var liveReview = ui.state && ui.state._liveHand;
          var analyzedReview = null;
          if (liveReview && liveReview.stage === 'complete') {
            analyzedReview = analyzedFromLiveHand(liveReview, ui.state);
          }
          if (!analyzedReview && ui.state && ui.state.sessionHands && ui.state.sessionHands.length) {
            var hid = btn.getAttribute('data-hand-id');
            analyzedReview = (hid && ui.state.sessionHands.filter(function (h) {
              return h && h.id === hid;
            })[0]) || ui.state.sessionHands[ui.state.sessionHands.length - 1];
          }
          openCashHandReview(analyzedReview, 'review');
          return;
        }
        if (act === 'review-hand') {
          openLiveHandReview(btn.getAttribute('data-hand'), 'review');
          return;
        }
        if (act === 'toggle-handlog') {
          ui.infoHandlogOpen = !ui.infoHandlogOpen;
          return;
        }
        if (act === 'info-table-speed') {
          var speed = btn.getAttribute('data-speed') || 'veryFast';
          if (ui.state) {
            ui.state.tableSpeed = speed;
            var Speed = global.PTTournamentTableSpeed;
            if (Speed && Speed.save) Speed.save(speed);
            persistActive();
          }
          paint();
          return;
        }
        if (act === 'next-hand') {
          var R = global.PTCashRunner;
          var began2 = R.beginHand(ui.state);
          whenReady(began2, function () {
            persistActive();
            animateThen(function () {
              setThinkingFromHand(ui.state && ui.state._liveHand);
              paint();
            });
          });
          return;
        }
        if (act === 'open-info') {
          ui.infoOpen = true;
          ui.infoHandlogOpen = false;
          paint();
          return;
        }
        if (act === 'close-info') {
          ui.infoOpen = false;
          ui.infoHandlogOpen = false;
          paint();
          return;
        }
        if (act === 'open-hero-detail') {
          ui.heroDetailOpen = true;
          ui.villainDetailId = null;
          paint();
          return;
        }
        if (act === 'close-hero-detail') {
          ui.heroDetailOpen = false;
          paint();
          return;
        }
        if (act === 'close-villain-detail') {
          ui.villainDetailId = null;
          paint();
          return;
        }
        if (act === 'replay-stake') {
          var id = ui.state && (ui.state._presetId || (ui.state.config && ui.state.config.id));
          ui.state = null;
          if (id) reallyStart(id);
          else {
            setView(VIEW.hub);
            paint();
          }
        }
      });
    });
  }

  function render(el) {
    ui.root = el;
    if (ui.view === VIEW.table && ui.state) {
      paint();
      return;
    }
    var Store = global.PTCashStore;
    var active = Store && Store.loadActive && Store.loadActive();
    if (active && active.status === 'running' && !ui.state) {
      /* No auto-resume: mostrar hub con banner. */
    }
    setView(VIEW.hub);
    paint();
  }

  function refresh() {
    if (ui.root) paint();
  }

  global.PTCashUI = {
    render: render,
    refresh: refresh,
    VIEW: VIEW
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
