/*
 * tournament/koins-recompute.js — Recuento de Koins desde histórico de uso.
 * Partida en 0 + lecciones + entrenador + neto torneos (+ roles si están).
 * Espejo de la migración 052 (SQL).
 */
(function (global) {
  'use strict';

  var STARTING = 0;
  var TRAINER_HANDS_PER_KOIN = 25;
  var KOINS_PER_ROLE = 2;
  var MTTLAB_MANAGER_GRANT = 100;

  function asNum(v, fallback) {
    var n = Number(v);
    return isFinite(n) ? n : (fallback != null ? fallback : 0);
  }

  function communitySuffix(communityId) {
    var cid = String(communityId || 'pokerforge').toLowerCase();
    if (!cid || cid === 'pokerforge') return '';
    return '_' + cid;
  }

  function countLessonAwards(wallet) {
    var awards = wallet && wallet.lessonAwards;
    if (!awards || typeof awards !== 'object') return 0;
    return Object.keys(awards).filter(function (k) { return !!awards[k]; }).length;
  }

  function countPassedLessons(school) {
    var lessons = school && school.lessons;
    if (!lessons || typeof lessons !== 'object') return 0;
    var n = 0;
    Object.keys(lessons).forEach(function (id) {
      var row = lessons[id];
      if (row && (row.passed === true || row.passed === 'true')) n += 1;
    });
    return n;
  }

  function pickSchool(payload, communityId) {
    var cid = String(communityId || 'pokerforge').toLowerCase();
    var s = communitySuffix(cid);
    if (s) {
      return (payload && payload['school' + s]) ||
        (payload && payload['stats' + s] && payload['stats' + s].school) ||
        null;
    }
    return (payload && payload.stats && payload.stats.school) || null;
  }

  function pickStats(payload, communityId) {
    var s = communitySuffix(communityId);
    if (s) return (payload && payload['stats' + s]) || null;
    return (payload && payload.stats) || null;
  }

  function pickWallet(payload, communityId) {
    var s = communitySuffix(communityId);
    var w = payload && payload['tournamentWallet' + s];
    return (w && typeof w === 'object') ? w : null;
  }

  function pickHistory(payload, communityId) {
    var s = communitySuffix(communityId);
    var h = payload && payload['tournamentHistory' + s];
    return Array.isArray(h) ? h : [];
  }

  function pickActive(payload, communityId) {
    var s = communitySuffix(communityId);
    var a = payload && payload['tournamentActive' + s];
    return (a && typeof a === 'object' && a.id) ? a : null;
  }

  function roleKoinsFromEntry(entry) {
    if (!entry || typeof entry !== 'object') return 0;
    if (entry.roleKoins != null && isFinite(Number(entry.roleKoins))) {
      return Math.max(0, asNum(entry.roleKoins));
    }
    if (entry.roleCorrect != null && isFinite(Number(entry.roleCorrect))) {
      return Math.max(0, Math.floor(asNum(entry.roleCorrect)) * KOINS_PER_ROLE);
    }
    return 0;
  }

  function tournamentNetFromHistory(history) {
    var net = 0;
    var role = 0;
    var n = 0;
    (history || []).forEach(function (row) {
      if (!row || typeof row !== 'object') return;
      n += 1;
      var buyIn = asNum(row.buyInEur);
      var prize = asNum(row.prizeEur);
      var profit;
      if (row.profit != null && row.profit !== '' && isFinite(Number(row.profit))) {
        profit = asNum(row.profit);
      } else {
        profit = prize - buyIn;
      }
      net += profit;
      role += roleKoinsFromEntry(row);
    });
    return { net: net, roleKoins: role, played: n };
  }

  function activeBuyInHold(active) {
    if (!active) return 0;
    var cfg = active.config || active;
    return Math.max(0, asNum(cfg.buyInEur != null ? cfg.buyInEur : cfg.buyIn));
  }

  /**
   * Recalcula saldo desde histórico. Partida en 0 (sin endowment).
   * opts.forceBalance: fuerza un saldo (p.ej. manager MTTLab = 100).
   */
  function computeFromPayload(payload, communityId, opts) {
    opts = opts || {};
    if (opts.forceBalance != null) {
      var forced = Math.max(0, Math.round(asNum(opts.forceBalance) * 100) / 100);
      return {
        balance: forced,
        starting: STARTING,
        lessons: 0,
        trainerHands: 0,
        trainerKoins: 0,
        tournamentNet: 0,
        roleKoins: 0,
        activeHold: 0,
        tournamentsPlayed: 0,
        forced: true,
        communityId: String(communityId || 'pokerforge').toLowerCase()
      };
    }

    var wallet = pickWallet(payload, communityId) || {};
    var history = pickHistory(payload, communityId);
    var stats = pickStats(payload, communityId) || {};
    var school = pickSchool(payload, communityId);
    var active = pickActive(payload, communityId);

    var lessonsWallet = countLessonAwards(wallet);
    var lessonsSchool = countPassedLessons(school);
    var lessons = Math.max(lessonsWallet, lessonsSchool);

    var trainerHands = Math.max(
      asNum(wallet.trainerHands),
      asNum(stats.handsPlayed)
    );
    var trainerKoins = Math.floor(trainerHands / TRAINER_HANDS_PER_KOIN);

    var hist = tournamentNetFromHistory(history);
    var activeHold = activeBuyInHold(active);
    var played = Math.max(hist.played, asNum(wallet.tournamentsPlayed));

    var raw = STARTING + lessons + trainerKoins + hist.net + hist.roleKoins - activeHold;
    var balance = Math.max(0, Math.round(raw * 100) / 100);

    return {
      balance: balance,
      starting: STARTING,
      lessons: lessons,
      trainerHands: trainerHands,
      trainerKoins: trainerKoins,
      tournamentNet: Math.round(hist.net * 100) / 100,
      roleKoins: Math.round(hist.roleKoins * 100) / 100,
      activeHold: Math.round(activeHold * 100) / 100,
      tournamentsPlayed: played,
      forced: false,
      communityId: String(communityId || 'pokerforge').toLowerCase(),
      lessonAwards: wallet.lessonAwards || {}
    };
  }

  /** Construye el objeto wallet a persistir tras el recuento. */
  function buildWalletSnapshot(computed, previousWallet) {
    var prev = previousWallet && typeof previousWallet === 'object' ? previousWallet : {};
    return {
      balance: computed.balance,
      updatedAt: new Date().toISOString(),
      version: Math.max(1, asNum(prev.version, 1)),
      trainerHands: computed.trainerHands,
      tournamentsPlayed: computed.tournamentsPlayed,
      lessonAwards: computed.lessonAwards || prev.lessonAwards || {},
      last: {
        type: 'koins_recompute',
        starting: computed.starting,
        lessons: computed.lessons,
        trainerKoins: computed.trainerKoins,
        tournamentNet: computed.tournamentNet,
        roleKoins: computed.roleKoins,
        activeHold: computed.activeHold,
        forced: !!computed.forced
      }
    };
  }

  global.PTTournamentKoinsRecompute = {
    STARTING: STARTING,
    TRAINER_HANDS_PER_KOIN: TRAINER_HANDS_PER_KOIN,
    KOINS_PER_ROLE: KOINS_PER_ROLE,
    MTTLAB_MANAGER_GRANT: MTTLAB_MANAGER_GRANT,
    communitySuffix: communitySuffix,
    computeFromPayload: computeFromPayload,
    buildWalletSnapshot: buildWalletSnapshot,
    countLessonAwards: countLessonAwards,
    countPassedLessons: countPassedLessons
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
