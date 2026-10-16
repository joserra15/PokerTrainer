/*
 * cash/ui.js — Lobby / mesa / resultado / histórico de mesas Cash vs IA.
 */
(function (global) {
  'use strict';

  var VIEW = {
    hub: 'hub',
    table: 'table',
    result: 'result',
    history: 'history'
  };

  var ui = {
    view: VIEW.hub,
    root: null,
    state: null,
    upgradePrompt: null,
    resumePrompt: false,
    exitPrompt: false,
    rebuyPrompt: false,
    actionBusy: false,
    infoOpen: false
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
    setView(VIEW.table);
    var began = Runner.beginHand(ui.state);
    whenReady(began, function () {
      persistActive();
      paint();
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
      paint();
    });
  }

  function discardActiveAndMaybeStart(presetId) {
    var Store = global.PTCashStore;
    var active = Store && Store.loadActive && Store.loadActive();
    if (active && active.config) {
      /* Liberar buy-in en mesa: cash-out del stack actual sin jugar. */
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

  function seatCoordsFor(n) {
    if (n <= 2) return [{ top: 18, left: 50 }, { top: 78, left: 50 }];
    if (n <= 3) {
      return [
        { top: 16, left: 50 }, { top: 62, left: 18 }, { top: 62, left: 82 }
      ];
    }
    return [
      { top: 12, left: 50 },
      { top: 28, left: 14 },
      { top: 62, left: 10 },
      { top: 62, left: 90 },
      { top: 28, left: 86 },
      { top: 78, left: 50 }
    ];
  }

  function ringByPhysicalSeat(seats) {
    return (seats || []).slice().sort(function (a, b) {
      return (Number(a.physicalSeat != null ? a.physicalSeat : a.seat) || 0) -
        (Number(b.physicalSeat != null ? b.physicalSeat : b.seat) || 0);
    });
  }

  function seatLastAct(hand, seat) {
    if (!hand || !hand.log || !seat) return null;
    for (var i = hand.log.length - 1; i >= 0; i--) {
      var e = hand.log[i];
      if (e && e.actorId === seat.id && e.street === hand.street) return e;
    }
    return null;
  }

  function formatActLabel(action, amount, bb) {
    if (action === 'fold') return 'Fold';
    if (action === 'check') return 'Check';
    if (action === 'call') return 'Call ' + fmtBb(amount, bb);
    if (action === 'bet') return 'Bet ' + fmtBb(amount, bb);
    if (action === 'raise') return 'Raise ' + fmtBb(amount, bb);
    if (action === 'allin' || action === 'all-in') return 'All-in';
    return action || '';
  }

  function actBadgeClass(action) {
    if (action === 'fold') return 'fold';
    if (action === 'check' || action === 'call') return 'call';
    if (action === 'bet' || action === 'raise' || action === 'allin') return 'raise';
    return '';
  }

  function actionBtnClass(id) {
    if (id === 'fold') return 'btn btn-fold';
    if (id === 'check') return 'btn btn-check';
    if (id === 'call') return 'btn btn-call';
    if (id === 'bet' || id === 'raise') return 'btn btn-raise';
    if (id === 'allin' || id === 'all-in') return 'btn btn-allin';
    return 'btn';
  }

  function renderSeats(hand, bb) {
    if (!hand || !hand.seats) return '';
    var ring = ringByPhysicalSeat(hand.seats);
    var coords = seatCoordsFor(ring.length);
    var showdown = !!(hand.result && (hand.result.showdown || hand.holesRevealed));
    var html = '';
    var villainIdx = 0;
    ring.forEach(function (s) {
      if (s.isHero) return;
      var c = coords[Math.min(villainIdx, coords.length - 1)] || coords[0];
      villainIdx += 1;
      var cls = ['seat', 'villain'];
      if (s.pos === 'BTN') cls.push('dealer');
      if (s.folded) cls.push('folded');
      var last = seatLastAct(hand, s);
      var actHtml = '';
      if (s.folded || (last && last.action === 'fold')) {
        actHtml = '<div class="seat-act-wrap"><span class="seat-act fold">Fold</span></div>';
      } else if (last) {
        actHtml = '<div class="seat-act-wrap"><span class="seat-act ' + actBadgeClass(last.action) + '">' +
          esc(formatActLabel(last.action, last.amount, bb)) + '</span></div>';
      }
      var cardsHtml = '';
      if (!s.folded) {
        if ((showdown || (hand.result && hand.result.holeCards && hand.result.holeCards[s.id])) &&
            s.cards && s.cards[0]) {
          cardsHtml = '<div class="seat-cards showdown">' + s.cards.map(faceCard).join('') + '</div>';
        } else {
          cardsHtml = '<div class="seat-cards">' + backCard() + backCard() + '</div>';
        }
      }
      var bet = Number(s.streetInvested) || 0;
      var betHtml = bet > 0
        ? ('<div class="seat-bet"><span class="seat-bet-amt">' + esc(fmtBb(bet, bb)) + '</span></div>')
        : '';
      html += '<div class="' + cls.join(' ') + '" style="top:' + c.top + '%;left:' + c.left + '%">' +
        '<div class="seat-body">' +
        '<div class="seat-hole">' + actHtml + cardsHtml + '</div>' +
        '<div class="seat-name">' + esc(s.name || 'Riv') + '</div>' +
        '<div class="seat-pos">' + esc(s.pos || '') + '</div>' +
        '<div class="seat-stack">' + esc(fmtBb(s.stack, bb)) + '</div>' +
        '</div>' + betHtml + '</div>';
    });
    return html;
  }

  function renderHeroArea(hand, bb) {
    if (!hand) {
      return '<div class="hero-area"><div class="hero-label">Héroe</div></div>';
    }
    var hero = null;
    (hand.seats || []).forEach(function (s) { if (s.isHero) hero = s; });
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
    var street = Number(hero.streetInvested) || 0;
    return '<div class="hero-area' + (folded ? ' is-folded' : '') + '">' +
      act +
      '<div class="hero-chips">' +
      (street > 0 ? ('<div class="seat-bet-amt">' + esc(fmtBb(street, bb)) + '</div>') : '') +
      '<div class="seat-stack">' + esc(fmtBb(hero.stack, bb)) + '</div></div>' +
      '<div class="hero-label">' + esc(hero.name || 'Héroe') +
      ' · <span>' + esc(hero.pos || '-') + '</span></div>' +
      (cards ? ('<div class="hero-cards">' + cards + '</div>') : '') +
      '</div>';
  }

  function handEndBanner(hand, bb) {
    if (!hand || hand.stage !== 'complete' || !hand.result) return '';
    var net = Number(hand.result.heroNet) || 0;
    var netBb = Math.round((net / Math.max(1, bb)) * 10) / 10;
    var sign = netBb >= 0 ? '+' : '';
    var winners = (hand.result.winners || []).map(function (id) {
      var s = (hand.seats || []).find(function (x) { return x.id === id; });
      return s ? (s.isHero ? 'Tú' : (s.name || id)) : id;
    }).join(', ');
    var rake = Number(hand.result.rake) || 0;
    return '<div class="trn-hand-end cash-hand-end" role="status">' +
      '<div class="trn-hand-end-main">' +
      '<strong>' + (hand.result.tied ? 'Empate' : ('Gana: ' + esc(winners || '—'))) + '</strong>' +
      '<span class="' + (netBb >= 0 ? 'is-win' : 'is-loss') + '">' + sign + netBb + ' bb</span>' +
      '</div>' +
      (rake > 0 ? ('<span class="muted">Rake ' + esc(fmtBb(rake, bb)) + '</span>') : '') +
      '<button type="button" class="btn btn-primary" data-act="continue-hand">Continuar</button>' +
      '</div>';
  }

  function renderTable() {
    var state = ui.state;
    if (!state) return '<p>Sin sesión activa.</p>';
    var hand = state._liveHand;
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
      '<span class="trn-chip" title="Ciegas">' + esc(fmtBb(blinds.sb, bb).replace(' bb', '') + '/' +
        fmtBb(blinds.bb, bb)) + '</span>'
    ].join('');

    var potBb = hand ? fmtBb(hand.pot, bb) : '0 bb';
    var boardHtml = (hand && hand.board && hand.board.length)
      ? hand.board.map(faceCard).join('')
      : '';
    var seatsHtml = hand ? renderSeats(hand, bb) : '';
    if (!hand && state.status === 'running') {
      var Seat = global.PTTournamentSeating;
      var tableId = (state.tables.find(function (t) { return t.isHeroTable; }) || {}).id;
      var onTable = tableId && Seat ? Seat.playersOnTable(state, tableId) : (state.players || []);
      var fake = {
        seats: onTable.map(function (p) {
          return {
            id: p.id, name: p.name, isHero: !!p.isHero, pos: '', seat: p.seat,
            stack: p.stack, streetInvested: 0, folded: false, cards: null
          };
        }),
        stage: 'waiting', street: 'preflop', log: []
      };
      seatsHtml = renderSeats(fake, bb);
    }

    var actions = '';
    if (ui.actionBusy) {
      actions = '<div class="actions actions-grid actions-grid-1">' +
        '<span class="trn-thinking-status"><span class="trn-think-clock"></span> Pensando…</span></div>';
    } else if (hand && hand.stage === 'complete') {
      actions = '';
    } else if (hand && hand.awaitingHero && hand.heroOptions && hand.heroOptions.length) {
      var nBtn = hand.heroOptions.length;
      var grid = nBtn <= 2 ? 'actions-grid-2' : (nBtn === 3 ? 'actions-grid-3' : 'actions-grid');
      actions = '<div class="actions actions-grid ' + grid + '">' + hand.heroOptions.map(function (o) {
        var amt = o.suggested != null ? o.suggested : (o.amount != null ? o.amount : '');
        var label = o.label || o.id;
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
      infoModal = '<div class="trn-modal-backdrop" data-act="close-info">' +
        '<div class="trn-modal" role="dialog" data-act="noop">' +
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
        '<button type="button" class="btn btn-primary" data-act="close-info">Cerrar</button>' +
        '</div></div>';
    }

    return '<div class="trn-table-view cash-table-view">' +
      '<div class="trn-table-topbar">' +
      '<button type="button" class="btn btn-sm" data-act="exit-table">Salir</button>' +
      '<div class="trn-hud-chips">' + chips + '</div>' +
      '<button type="button" class="btn btn-sm" data-act="open-info">Info</button>' +
      '</div>' +
      '<div class="poker-table trn-poker-table">' +
      '<div class="table-felt table-6max" data-format="cash">' +
      seatsHtml +
      '<div class="board-area">' +
      '<div class="pot-label">Bote ' + esc(potBb) + '</div>' +
      '<div class="board">' + boardHtml + '</div>' +
      '</div>' +
      renderHeroArea(hand, bb) +
      '</div></div>' +
      handEndBanner(hand, bb) +
      actions +
      rebuyModal + exitModal + infoModal +
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
    Runner.finish(ui.state, { reason: reason || 'cashout' });
    if (Store && Store.saveFinished) Store.saveFinished(ui.state);
    clearActive();
    ui.rebuyPrompt = false;
    ui.exitPrompt = false;
    setView(VIEW.result);
    paint();
  }

  function heroActImmediate(actionId, amount) {
    if (ui.actionBusy) return;
    var Runner = global.PTCashRunner;
    if (!Runner || !ui.state) return;
    ui.actionBusy = true;
    paint();
    if (typeof Runner.applyHeroAction === 'function') {
      Runner.applyHeroAction(ui.state, actionId, amount);
      var cont = Runner.continueToHeroOrEnd(ui.state);
      whenReady(cont, function () {
        ui.actionBusy = false;
        persistActive();
        paint();
      });
    } else {
      var acted = Runner.heroAct(ui.state, actionId, amount);
      whenReady(acted, function () {
        ui.actionBusy = false;
        persistActive();
        paint();
      });
    }
  }

  function continueHand() {
    var Runner = global.PTCashRunner;
    if (!ui.state || !Runner) return;
    ui.actionBusy = true;
    var next = Runner.continueAfterHand(ui.state);
    whenReady(next, function () {
      ui.actionBusy = false;
      if (ui.state && ui.state.pendingHeroRebuy) ui.rebuyPrompt = true;
      persistActive();
      paint();
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
        var id = btn.getAttribute('data-hero-act');
        var amt = btn.getAttribute('data-amount');
        var amount = amt === '' || amt == null ? undefined : Number(amt);
        heroActImmediate(id, amount);
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
            act === 'close-upgrade') &&
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
            paint();
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
        if (act === 'next-hand') {
          var R = global.PTCashRunner;
          var began2 = R.beginHand(ui.state);
          whenReady(began2, function () {
            persistActive();
            paint();
          });
          return;
        }
        if (act === 'open-info') {
          ui.infoOpen = true;
          paint();
          return;
        }
        if (act === 'close-info') {
          ui.infoOpen = false;
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
