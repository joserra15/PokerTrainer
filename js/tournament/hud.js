/*
 * tournament/hud.js — Chips HUD + filas del modal Info de torneo.
 */
(function (global) {
  'use strict';

  function fmtNum(n) {
    n = Math.round(Number(n) || 0);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  }

  function fmtKoins(n) {
    n = Math.round((Number(n) || 0) * 100) / 100;
    var s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
    return s + ' Koins';
  }

  function currentBlinds(state) {
    var Blinds = global.PTTournamentBlinds;
    var sched = state.config && state.config.blindSchedule;
    if (!Blinds || !sched) return { level: 1, sb: 10, bb: 20, ante: 0, hands: 8 };
    return Blinds.currentLevel(sched, state.handIndex || 0);
  }

  function topStacks(state, limit) {
    limit = limit || 10;
    var Seat = global.PTTournamentSeating;
    var lv = currentBlinds(state);
    var bb = Math.max(1, Number(lv.bb) || 20);
    var alive = Seat && Seat.alivePlayers
      ? Seat.alivePlayers(state)
      : (state.players || []).filter(function (p) { return p.alive && p.stack > 0; });
    return alive.slice().sort(function (a, b) {
      if (b.stack !== a.stack) return b.stack - a.stack;
      return String(a.id).localeCompare(String(b.id));
    }).slice(0, limit).map(function (p, i) {
      var stack = Number(p.stack) || 0;
      return {
        rank: i + 1,
        id: p.id,
        name: p.isHero ? (p.name && p.name !== 'Héroe' ? p.name : 'Jugador') : (p.name || p.id),
        isHero: !!p.isHero,
        stack: stack,
        bb: Math.round((stack / bb) * 10) / 10,
        tableId: p.tableId || null
      };
    });
  }

  function fieldChip(state) {
    var Seat = global.PTTournamentSeating;
    var St = global.PTTournamentState;
    var rank = Seat.heroFieldRank(state);
    var left = St.playersLeft(state);
    var entries = (state.config && state.config.entries) || left;
    if (rank == null) return '—/' + left + ' (' + entries + ')';
    return rank + '/' + left + ' (' + entries + ')';
  }

  /** Una sola línea: avance + posición (visible en móvil). */
  function progressChipText(state) {
    var Blinds = global.PTTournamentBlinds;
    var Seat = global.PTTournamentSeating;
    var St = global.PTTournamentState;
    var cfg = state.config || {};
    var lv = currentBlinds(state);
    var into = Blinds && Blinds.handsIntoLevel
      ? Blinds.handsIntoLevel(cfg.blindSchedule, state.handIndex || 0)
      : 0;
    var until = Blinds && Blinds.handsUntilNext
      ? Blinds.handsUntilNext(cfg.blindSchedule, state.handIndex || 0)
      : null;
    var rank = Seat && Seat.heroFieldRank ? Seat.heroFieldRank(state) : null;
    var left = St && St.playersLeft ? St.playersLeft(state) : 0;
    var pos = rank != null ? (rank + 'º/' + left) : ('—/' + left);
    var prog = 'Nv.' + lv.level + ' ' + into + '/' + lv.hands;
    return prog + ' · ' + pos;
  }

  function compactChips(state) {
    var Blinds = global.PTTournamentBlinds;
    var St = global.PTTournamentState;
    var cfg = state.config || {};
    var hero = St.hero(state);
    var lv = currentBlinds(state);
    var bb = Math.max(1, Number(lv.bb) || 20);
    var stackBb = hero ? Math.round(((Number(hero.stack) || 0) / bb) * 10) / 10 : 0;
    var kind = (cfg.kind === 'sng' ? 'SNG'
      : (cfg.kind === 'spin' ? 'SPIN'
        : (cfg.kind === 'hu' ? 'HU' : 'MTT')));
    return [
      { text: kind, cls: 'trn-chip trn-chip-kind', title: cfg.name || kind },
      {
        text: progressChipText(state),
        cls: 'trn-chip trn-chip-progress',
        title: 'Avance del torneo y posición de Hero'
      },
      { text: stackBb + ' bb', cls: 'trn-chip trn-chip-stack', title: 'Stack Hero' },
      { text: fieldChip(state), cls: 'trn-chip trn-chip-field', title: 'Posición en el field' },
      {
        text: Blinds && Blinds.labelFor ? Blinds.labelFor(lv) : ('Nv.' + lv.level),
        cls: 'trn-chip trn-chip-blinds',
        title: 'Nivel de ciegas'
      }
    ];
  }

  function payoutLadderSummary(cfg) {
    var Cfg = global.PTTournamentConfig;
    if (!Cfg || !Cfg.payoutEuros || !Cfg.payoutFractions) return '—';
    var euros = Cfg.payoutEuros(cfg);
    var fracs = Cfg.payoutFractions(cfg);
    var parts = [];
    var n = Math.min(euros.length, 5);
    for (var i = 0; i < n; i++) {
      var pct = Math.round((fracs[i] || 0) * 1000) / 10;
      parts.push((i + 1) + 'º ' + pct + '% · ' + fmtKoins(euros[i]));
    }
    if (euros.length > n) parts.push('…');
    if (!parts.length) return '—';
    return { html: true, content: '<ul class="trn-payout-list">' + parts.map(function (p) {
      return '<li>' + p + '</li>';
    }).join('') + '</ul>' };
  }

  function infoRows(state) {
    var Blinds = global.PTTournamentBlinds;
    var Seat = global.PTTournamentSeating;
    var St = global.PTTournamentState;
    var Cfg = global.PTTournamentConfig;
    var cfg = state.config || {};
    var lv = currentBlinds(state);
    var bb = Math.max(1, Number(lv.bb) || 20);
    var hero = St.hero(state);
    var left = St.playersLeft(state);
    var rank = Seat.heroFieldRank(state);
    var avg = Seat.averageStack(state);
    var into = Blinds.handsIntoLevel(cfg.blindSchedule, state.handIndex || 0);
    var until = Blinds.handsUntilNext(cfg.blindSchedule, state.handIndex || 0);
    var next = Blinds.nextLevel(cfg.blindSchedule, state.handIndex || 0);
    var placesPaid = Number(cfg.placesPaid) || 0;
    var toItm = Math.max(0, left - placesPaid);
    var bubbleLabel = left > placesPaid
      ? (left + ' left · ' + placesPaid + ' paid (faltan ' + toItm + ' para ITM)')
      : ('ITM · ' + left + ' left · ' + placesPaid + ' paid');

    var heroStack = hero ? (Number(hero.stack) || 0) : 0;
    var heroBb = Math.round((heroStack / bb) * 10) / 10;
    var avgBb = Math.round((avg / bb) * 10) / 10;

    var heroTable = (state.tables || []).find(function (t) { return t.isHeroTable; });
    var tablesActive = (state.tables || []).length;
    var tableLabel = heroTable
      ? ('Hero en mesa ' + String(heroTable.id).replace(/^T/, '') + ' · ' + tablesActive + ' mesa' + (tablesActive === 1 ? '' : 's'))
      : (tablesActive + ' mesa' + (tablesActive === 1 ? '' : 's'));

    var pool = Cfg && Cfg.prizePool ? Cfg.prizePool(cfg) : ((cfg.buyInEur || 0) * (cfg.entries || 0));
    var progressHands = until == null
      ? ('Nivel ' + lv.level + ' · ' + into + '/' + lv.hands + ' manos')
      : ('Nivel ' + lv.level + ' · ' + into + '/' + lv.hands + ' manos hasta ciegas');

    var blindsNow = lv.sb + '/' + lv.bb + (lv.ante > 0 ? (' ante ' + lv.ante) : '');
    var nextLabel = '—';
    if (next) {
      nextLabel = next.sb + '/' + next.bb +
        (next.ante > 0 ? (' ante ' + next.ante) : '') +
        (until != null ? (' (en ' + until + ' manos)') : '');
    }

    var posLabel = rank != null
      ? (rank + 'º de ' + left + ' restantes (' + cfg.entries + ' iniciales)')
      : (left + ' restantes (' + cfg.entries + ' iniciales)');

    var top = topStacks(state, 10);
    var topLabel = top.length
      ? { html: true, content: '<ol class="trn-stack-list">' + top.map(function (t) {
        var heroTag = t.isHero ? ' <span class="trn-stack-hero-tag">(Hero)</span>' : '';
        return '<li class="' + (t.isHero ? 'is-hero' : '') + '">' +
          '<span class="trn-stack-rank">' + t.rank + '.</span> ' +
          '<span class="trn-stack-name">' + t.name + '</span>' + heroTag + ' ' +
          '<span class="trn-stack-amt">' + fmtNum(t.stack) + ' (' + t.bb + ' bb)</span></li>';
      }).join('') + '</ol>' }
      : '—';

    return [
      { label: 'Torneo', value: cfg.name || (cfg.kind === 'sng' ? 'SNG'
        : (cfg.kind === 'spin' ? 'SPIN'
          : (cfg.kind === 'hu' ? 'Heads-Up' : 'MTT'))) },
      { label: 'Avance', value: progressHands },
      { label: 'Posición', value: posLabel },
      { label: 'Stack Hero', value: fmtNum(heroStack) + ' (' + heroBb + ' bb)' },
      { label: 'Media de fichas', value: fmtNum(avg) + ' (' + avgBb + ' bb)' },
      { label: 'Burbuja / ITM', value: bubbleLabel },
      { label: 'Puestos premiados', value: payoutLadderSummary(cfg) },
      { label: 'Buy-in / prize pool', value: fmtKoins(cfg.buyInEur) + ' · pool ' + fmtKoins(pool) },
      { label: 'Mesas', value: tableLabel },
      { label: 'Ciegas actuales', value: blindsNow },
      { label: 'Próximo nivel', value: nextLabel },
      { label: 'Top 10 stacks', value: topLabel }
    ];
  }

  global.PTTournamentHud = {
    fieldChip: fieldChip,
    compactChips: compactChips,
    infoRows: infoRows,
    currentBlinds: currentBlinds,
    topStacks: topStacks,
    fmtKoins: fmtKoins,
    progressChipText: progressChipText
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
