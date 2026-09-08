/*
 * tournament/stats.js — Stats de sesión de torneo (VPIP/PFR lite, ROI…).
 */
(function (global) {
  'use strict';

  function ensureStats(state) {
    if (!state.stats) {
      state.stats = {
        handsPlayed: 0,
        vpipHands: 0,
        pfrHands: 0,
        wonHands: 0,
        wentToShowdown: 0,
        wonShowdown: 0,
        decisions: 0,
        goodDecisions: 0,
        evLoss: 0
      };
    }
    return state.stats;
  }

  function heroSeat(hand, heroId) {
    if (!hand || !hand.seats) return null;
    return hand.seats.find(function (s) {
      return s.id === heroId || s.isHero;
    }) || null;
  }

  function heroPutChipsBeyondBlinds(hand, seat) {
    if (!seat || !hand) return false;
    var blindShare = 0;
    if (seat.pos === 'SB' || (hand.seats && hand.seats.length === 2 && seat.pos === 'BTN')) {
      blindShare = Number(hand.sb) || 0;
    } else if (seat.pos === 'BB') {
      blindShare = Number(hand.bb) || 0;
    }
    if (hand.ante > 0) blindShare += Number(hand.ante) || 0;
    return (Number(seat.invested) || 0) > blindShare + 0.001;
  }

  function heroRaisedPreflop(hand, heroId) {
    var log = (hand && hand.log) || [];
    for (var i = 0; i < log.length; i++) {
      var a = log[i];
      if (!a || a.street !== 'preflop') continue;
      if (a.id !== heroId) continue;
      if (a.action === 'raise' || a.action === 'bet') return true;
    }
    return false;
  }

  function onHandComplete(state, handResult, heroId) {
    var st = ensureStats(state);
    st.handsPlayed = (Number(st.handsPlayed) || 0) + 1;

    var hand = handResult;
    var result = hand && hand.result ? hand.result : handResult;
    var seat = heroSeat(hand, heroId);
    if (!seat && hand && hand.seats) {
      seat = hand.seats.find(function (s) { return s.id === heroId; }) || null;
    }

    if (seat && heroPutChipsBeyondBlinds(hand, seat)) {
      st.vpipHands = (Number(st.vpipHands) || 0) + 1;
    }
    if (hand && heroRaisedPreflop(hand, heroId || (seat && seat.id))) {
      st.pfrHands = (Number(st.pfrHands) || 0) + 1;
    }

    var deltas = (result && result.deltas) || {};
    var hid = heroId || (seat && seat.id) || 'hero';
    var delta = Number(deltas[hid]);
    if (isFinite(delta) && delta > 0) {
      st.wonHands = (Number(st.wonHands) || 0) + 1;
    }
    if (result && result.showdown) {
      st.wentToShowdown = (Number(st.wentToShowdown) || 0) + 1;
      var deltas = (result && result.deltas) || {};
      var hid = heroId || (seat && seat.id) || 'hero';
      if ((Number(deltas[hid]) || 0) > 0) {
        st.wonShowdown = (Number(st.wonShowdown) || 0) + 1;
      }
    }
    var decs = (hand && hand.decisions) || [];
    decs.forEach(function (d) {
      if (!d || d.unscored) return;
      st.decisions = (Number(st.decisions) || 0) + 1;
      if (d.class === 'green' || d.class === 'good' || d.ok) {
        st.goodDecisions = (Number(st.goodDecisions) || 0) + 1;
      }
      st.evLoss = Math.round(((Number(st.evLoss) || 0) + (Number(d.evLoss) || 0)) * 100) / 100;
    });
    return st;
  }

  function pct(num, den) {
    if (!den) return 0;
    return Math.round((num / den) * 1000) / 10;
  }

  function summary(state) {
    var Cfg = global.PTTournamentConfig;
    var Seat = global.PTTournamentSeating;
    var Guess = global.PTTournamentRoleGuess;
    var cfg = state.config || {};
    var buyIn = Number(cfg.buyInEur) || 0;
    var hero = (global.PTTournamentState && global.PTTournamentState.hero)
      ? global.PTTournamentState.hero(state)
      : (state.players || []).find(function (p) { return p.isHero; });

    var place = null;
    if (state.result && state.result.place != null) place = state.result.place;
    else if (hero && !hero.alive && hero.bustPlace != null) place = hero.bustPlace;
    else if (hero && hero.alive) {
      var left = Seat ? Seat.alivePlayers(state).length : 0;
      if (left <= 1) place = 1;
    }

    var prizeEur = 0;
    if (state.result && state.result.prizeEur != null) {
      prizeEur = Number(state.result.prizeEur) || 0;
    } else if (place != null && Cfg && Cfg.payoutEuros) {
      var ladder = Cfg.payoutEuros(cfg);
      if (place >= 1 && place <= ladder.length) prizeEur = ladder[place - 1] || 0;
    }

    var invested = buyIn;
    var profit = Math.round((prizeEur - invested) * 100) / 100;
    var roi = invested > 0 ? Math.round((profit / invested) * 1000) / 10 : 0;

    var st = ensureStats(state);
    var roleScore = Guess && Guess.score ? Guess.score(state) : { accuracy: 0, correct: 0, total: 0 };
    var roleAccuracy = roleScore.accuracy;

    return {
      place: place,
      prizeEur: prizeEur,
      invested: invested,
      profit: profit,
      roi: roi,
      handsPlayed: st.handsPlayed || 0,
      vpip: pct(st.vpipHands || 0, st.handsPlayed || 0),
      pfr: pct(st.pfrHands || 0, st.handsPlayed || 0),
      wonHands: st.wonHands || 0,
      wentToShowdown: st.wentToShowdown || 0,
      wonShowdown: st.wonShowdown || 0,
      wtsd: pct(st.wentToShowdown || 0, st.handsPlayed || 0),
      wsd: pct(st.wonShowdown || 0, st.wentToShowdown || 0),
      gtoAccuracy: pct(st.goodDecisions || 0, st.decisions || 0),
      gtoDecisions: st.decisions || 0,
      evLoss: st.evLoss || 0,
      roleAccuracy: roleAccuracy,
      roleCorrect: roleScore.correct || 0,
      roleTotal: roleScore.total || 0
    };
  }

  function round2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  function emptyHandStats() {
    return {
      sessions: 0,
      hands: 0,
      decisions: 0,
      good: 0,
      accuracy: null,
      evLoss: 0,
      netBB: 0,
      bbPer100: null,
      vpipHands: 0,
      pfrHands: 0,
      vpipPct: null,
      pfrPct: null,
      threeBetOpps: 0,
      threeBetHits: 0,
      threeBetPct: null,
      cbetFlopOpps: 0,
      cbetFlopHits: 0,
      cbetFlopPct: null,
      sawFlopN: 0,
      wtsdN: 0,
      wtsdPct: null
    };
  }

  function emptyDerived() {
    return {
      availableSessions: 0,
      byStreet: {
        preflop: { n: 0, good: 0 },
        flop: { n: 0, good: 0 },
        turn: { n: 0, good: 0 },
        river: { n: 0, good: 0 }
      },
      accByStreet: { preflop: null, flop: null, turn: null, river: null },
      dist: { optima: 0, aceptable: 0, imprecisa: 0, error: 0 }
    };
  }

  function isTournamentAiSession(session) {
    if (!session) return false;
    if (session.source === 'tournamentAi' || session.tournamentAi) return true;
    var st = session.stats || {};
    return st.source === 'tournamentAi';
  }

  /**
   * Resuelve sesiones GTO vinculadas al histórico IA.
   * Preferencia: sessionId del histórico; fallback: sesiones source=tournamentAi.
   */
  function resolveLinkedSessions(historyList, allSessions) {
    var hist = Array.isArray(historyList) ? historyList : [];
    var pool = Array.isArray(allSessions) ? allSessions : [];
    var byId = {};
    var linkedIds = {};

    hist.forEach(function (h) {
      if (h && h.sessionId) linkedIds[String(h.sessionId)] = true;
    });

    pool.forEach(function (s) {
      if (!s || !s.id) return;
      var sid = String(s.id);
      if (linkedIds[sid] || isTournamentAiSession(s)) {
        byId[sid] = s;
      }
    });

    /* Si el caller ya pasó sesiones filtradas (solo las del histórico), úsalas. */
    if (!pool.length && hist.length) {
      hist.forEach(function (h) {
        if (h && h._session && h._session.id) byId[String(h._session.id)] = h._session;
      });
    }

    return Object.keys(byId).map(function (k) { return byId[k]; });
  }

  /** Misma lógica que PTStatsAggregate.sessionStatsFromStub (criterios Sesiones). */
  function handRowFromSession(session) {
    var stats = (session && session.stats) || {};
    var dist = stats.dist || {};
    var decN = stats.nDecisions || (
      (dist.optima || 0) + (dist.aceptable || 0) + (dist.imprecisa || 0) + (dist.error || 0)
    );
    var good = decN ? Math.round((decN * (stats.accuracy || 0)) / 100) : 0;
    var hands = stats.nHands || ((session.hands && session.hands.length) || 0);
    var vpipHands = stats.vpipHands != null
      ? stats.vpipHands
      : (stats.vpipPct != null && hands ? Math.round((stats.vpipPct / 100) * hands) : 0);
    var pfrHands = stats.pfrHands != null
      ? stats.pfrHands
      : (stats.pfrPct != null && hands ? Math.round((stats.pfrPct / 100) * hands) : 0);
    return {
      hands: hands,
      decisions: decN,
      good: good,
      evLoss: round2(Math.abs(stats.evLossBB || 0)),
      netBB: round2(stats.netBB || 0),
      vpipHands: vpipHands,
      pfrHands: pfrHands,
      threeBetOpps: Number(stats.threeBetOpps) || 0,
      threeBetHits: Number(stats.threeBetHits) || 0,
      cbetFlopOpps: Number(stats.cbetFlopOpps) || 0,
      cbetFlopHits: Number(stats.cbetFlopHits) || 0,
      sawFlopN: Number(stats.sawFlopN) || 0,
      wtsdN: Number(stats.wtsdN) || 0
    };
  }

  function handTotalsFromSessions(sessions) {
    var tot = emptyHandStats();
    var rows = Array.isArray(sessions) ? sessions : [];
    rows.forEach(function (s) {
      if (!s) return;
      var row = handRowFromSession(s);
      if (!row.hands && !row.decisions) return;
      tot.sessions += 1;
      tot.hands += row.hands;
      tot.decisions += row.decisions;
      tot.good += row.good;
      tot.evLoss = round2(tot.evLoss + row.evLoss);
      tot.netBB = round2(tot.netBB + row.netBB);
      tot.vpipHands += row.vpipHands;
      tot.pfrHands += row.pfrHands;
      tot.threeBetOpps += row.threeBetOpps;
      tot.threeBetHits += row.threeBetHits;
      tot.cbetFlopOpps += row.cbetFlopOpps;
      tot.cbetFlopHits += row.cbetFlopHits;
      tot.sawFlopN += row.sawFlopN;
      tot.wtsdN += row.wtsdN;
    });
    tot.accuracy = tot.decisions ? Math.round((tot.good / tot.decisions) * 100) : null;
    tot.vpipPct = tot.hands ? Math.round((tot.vpipHands / tot.hands) * 1000) / 10 : null;
    tot.pfrPct = tot.hands ? Math.round((tot.pfrHands / tot.hands) * 1000) / 10 : null;
    tot.bbPer100 = tot.hands ? Math.round((tot.netBB / tot.hands) * 1000) / 10 : null;
    tot.threeBetPct = tot.threeBetOpps
      ? Math.round((tot.threeBetHits / tot.threeBetOpps) * 1000) / 10
      : null;
    tot.cbetFlopPct = tot.cbetFlopOpps
      ? Math.round((tot.cbetFlopHits / tot.cbetFlopOpps) * 1000) / 10
      : null;
    tot.wtsdPct = tot.sawFlopN
      ? Math.round((tot.wtsdN / tot.sawFlopN) * 1000) / 10
      : null;
    return tot;
  }

  /** Misma lógica que buildSessionDerivedStats en app.js. */
  function derivedFromSessions(sessions) {
    var out = emptyDerived();
    var streetTotals = {
      preflop: { weighted: 0, n: 0 },
      flop: { weighted: 0, n: 0 },
      turn: { weighted: 0, n: 0 },
      river: { weighted: 0, n: 0 }
    };
    (sessions || []).forEach(function (s) {
      if (!s) return;
      var stats = s.stats || {};
      if (s.hands && s.hands.length) {
        out.availableSessions += 1;
        s.hands.forEach(function (h) {
          (h.decisions || []).forEach(function (d) {
            if (!d) return;
            if (out.dist[d.class] != null) out.dist[d.class] += 1;
            var street = out.byStreet[d.street];
            if (street) {
              street.n += 1;
              if (d.class === 'optima' || d.class === 'aceptable') street.good += 1;
            }
          });
        });
        return;
      }
      if (stats && stats.nHands) {
        ['optima', 'aceptable', 'imprecisa', 'error'].forEach(function (key) {
          if (out.dist[key] != null) out.dist[key] += Number((stats.dist || {})[key]) || 0;
        });
        ['preflop', 'flop', 'turn', 'river'].forEach(function (streetKey) {
          var pctVal = stats.accByStreet && stats.accByStreet[streetKey];
          var decisions = Number((stats.street || {})[streetKey] && (stats.street || {})[streetKey].n) || 0;
          if (pctVal == null) return;
          if (decisions > 0) {
            out.byStreet[streetKey].n += decisions;
            out.byStreet[streetKey].good += Math.round((decisions * pctVal) / 100);
          } else {
            streetTotals[streetKey].weighted += Number(pctVal) * Math.max(1, Number(stats.nDecisions) || 1);
            streetTotals[streetKey].n += Math.max(1, Number(stats.nDecisions) || 1);
          }
        });
      }
    });
    ['preflop', 'flop', 'turn', 'river'].forEach(function (streetKey) {
      if (out.byStreet[streetKey].n > 0) {
        out.accByStreet[streetKey] = Math.round(
          (out.byStreet[streetKey].good / out.byStreet[streetKey].n) * 100
        );
      } else if (streetTotals[streetKey].n > 0) {
        out.accByStreet[streetKey] = Math.round(
          streetTotals[streetKey].weighted / streetTotals[streetKey].n
        );
      }
    });
    return out;
  }

  function sessionSpotKey(h, d) {
    var fmt = (h && (h.formatKey || h.format)) || 'mtt';
    var fam = String(fmt).indexOf('spin') === 0 ? 'spin'
      : (String(fmt).indexOf('mtt') === 0 || fmt === 'sng' ? 'mtt' : String(fmt));
    if (d && d.spotKind) {
      return fam + '|' + d.spotKind + '|' + ((h && h.heroPos) || '?') + '|' + (d.street || 'preflop');
    }
    return fam + '|postflop|' + ((h && h.heroPos) || '?') + '|' + ((d && d.street) || 'postflop');
  }

  function sessionSpotLabel(h, d, key) {
    var base = (d && d.spot) || String(key).replace(/\|/g, ' · ');
    return base;
  }

  function leaksFromSessions(sessions, limit) {
    var map = {};
    var LEAK = { imprecisa: true, error: true };
    (sessions || []).forEach(function (session) {
      if (!session || !session.hands) return;
      session.hands.forEach(function (h) {
        (h.decisions || []).forEach(function (d) {
          if (!d || !LEAK[d.class]) return;
          var k = sessionSpotKey(h, d);
          if (!map[k]) {
            map[k] = {
              key: k,
              label: sessionSpotLabel(h, d, k),
              count: 0,
              evLoss: 0,
              sessionId: session.id || null
            };
          }
          map[k].count += 1;
          map[k].evLoss = round2(map[k].evLoss + (Number(d.evLoss) || Number(d.evLossBB) || 0));
          if (!map[k].sessionId && session.id) map[k].sessionId = session.id;
        });
      });
    });
    var list = Object.keys(map).map(function (k) { return map[k]; });
    list.sort(function (a, b) {
      if (b.evLoss !== a.evLoss) return b.evLoss - a.evLoss;
      return b.count - a.count;
    });
    return list.slice(0, limit || 5);
  }

  /** Agrega histórico de torneos IA (PTTournamentStore.list). */
  function aggregateFromHistory(list) {
    var rows = Array.isArray(list) ? list : [];
    var n = rows.length;
    if (!n) {
      return {
        n: 0, wins: 0, itm: 0, itmPct: 0, winPct: 0,
        avgPlace: null, totalProfit: 0, totalBuyIn: 0, roiPct: 0,
        avgRoi: 0, avgRoleAccuracy: 0, byKind: {}
      };
    }
    var wins = 0;
    var itm = 0;
    var placeSum = 0;
    var placeN = 0;
    var totalProfit = 0;
    var totalBuyIn = 0;
    var roiSum = 0;
    var roleSum = 0;
    var roleN = 0;
    var byKind = {};
    rows.forEach(function (h) {
      if (!h) return;
      var place = Number(h.place);
      var buyIn = Number(h.buyInEur) || 0;
      var prize = Number(h.prizeEur) || 0;
      var profit = h.profit != null ? Number(h.profit) : (prize - buyIn);
      var kind = String(h.kind || 'mtt').toLowerCase();
      byKind[kind] = (byKind[kind] || 0) + 1;
      totalBuyIn += buyIn;
      totalProfit += profit;
      if (place === 1) wins += 1;
      if (prize > 0) itm += 1;
      if (place > 0) { placeSum += place; placeN += 1; }
      if (h.roi != null) roiSum += Number(h.roi) || 0;
      if (h.roleAccuracy != null) { roleSum += Number(h.roleAccuracy) || 0; roleN += 1; }
    });
    return {
      n: n,
      wins: wins,
      itm: itm,
      itmPct: Math.round((itm / n) * 1000) / 10,
      winPct: Math.round((wins / n) * 1000) / 10,
      avgPlace: placeN ? Math.round((placeSum / placeN) * 10) / 10 : null,
      totalProfit: Math.round(totalProfit * 100) / 100,
      totalBuyIn: Math.round(totalBuyIn * 100) / 100,
      roiPct: totalBuyIn > 0 ? Math.round((totalProfit / totalBuyIn) * 1000) / 10 : 0,
      avgRoi: Math.round((roiSum / n) * 10) / 10,
      avgRoleAccuracy: roleN ? Math.round((roleSum / roleN) * 10) / 10 : 0,
      byKind: byKind
    };
  }

  /**
   * Resultados de torneo + métricas GTO/HUD de sesiones enlazadas
   * (mismos criterios que Estadísticas → Sesiones).
   */
  function aggregateWithSessionStats(list, sessions) {
    var base = aggregateFromHistory(list);
    var linked = resolveLinkedSessions(list, sessions);
    var handStats = handTotalsFromSessions(linked);
    var derived = derivedFromSessions(linked);
    var leaks = leaksFromSessions(linked, 5);
    return Object.assign({}, base, {
      sessions: linked,
      handStats: handStats,
      derived: derived,
      leaks: leaks,
      hasHandStats: !!(handStats && (handStats.hands > 0 || handStats.decisions > 0))
    });
  }

  global.PTTournamentStats = {
    onHandComplete: onHandComplete,
    summary: summary,
    ensureStats: ensureStats,
    aggregateFromHistory: aggregateFromHistory,
    resolveLinkedSessions: resolveLinkedSessions,
    handTotalsFromSessions: handTotalsFromSessions,
    derivedFromSessions: derivedFromSessions,
    leaksFromSessions: leaksFromSessions,
    aggregateWithSessionStats: aggregateWithSessionStats
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
