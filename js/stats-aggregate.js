/*
 * stats-aggregate.js — Agregados persistentes (semanal + leaks) independientes del histórico.
 */
(function (global) {
  'use strict';

  var LEAK_CLASSES = { imprecisa: true, error: true };
  var MAX_COUNTED_SESSIONS = 500;

  function weekKey(date) {
    var d = new Date(date);
    if (isNaN(d.getTime())) d = new Date();
    var day = d.getDay();
    var diff = d.getDate() - day + (day === 0 ? -6 : 1);
    var monday = new Date(d.getFullYear(), d.getMonth(), diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
  }

  function fmtWeekLabel(iso) {
    var d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  function round2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  function defaultAggregates() {
    return {
      version: 1,
      trainerWeekly: {},
      sessionWeekly: {},
      trainerLeaks: {},
      sessionLeaks: {},
      sessionsTotal: { sessions: 0, hands: 0, decisions: 0, good: 0, evLoss: 0, netBB: 0 },
      countedSessions: {}
    };
  }

  function ensureAggregates(st) {
    if (!st || typeof st !== 'object') return defaultAggregates();
    if (!st.aggregates || typeof st.aggregates !== 'object') st.aggregates = defaultAggregates();
    var a = st.aggregates;
    if (!a.trainerWeekly) a.trainerWeekly = {};
    if (!a.sessionWeekly) a.sessionWeekly = {};
    if (!a.trainerLeaks) a.trainerLeaks = {};
    if (!a.sessionLeaks) a.sessionLeaks = {};
    if (!a.sessionsTotal) a.sessionsTotal = { sessions: 0, hands: 0, decisions: 0, good: 0, evLoss: 0, netBB: 0 };
    if (!a.countedSessions) a.countedSessions = {};
    return a;
  }

  function bumpWeekly(map, key, delta) {
    if (!map[key]) map[key] = { hands: 0, sessions: 0, decisions: 0, good: 0, evLoss: 0, netBB: 0 };
    var b = map[key];
    Object.keys(delta).forEach(function (k) {
      b[k] = (b[k] || 0) + (delta[k] || 0);
    });
    b.evLoss = round2(b.evLoss);
    b.netBB = round2(b.netBB);
  }

  function bumpLeak(map, key, label, evLoss) {
    if (!map[key]) map[key] = { key: key, label: label || key, count: 0, evLoss: 0 };
    map[key].count += 1;
    map[key].evLoss = round2(map[key].evLoss + (Number(evLoss) || 0));
    if (label) map[key].label = label;
  }

  function trainerSpotKey(rec, d) {
    var sc = rec.scenario || {};
    var type = sc.type || 'spot';
    var pos = rec.displayHeroPos || rec.heroPos || (rec.hero && rec.hero.pos) || '?';
    return type + '|' + pos + '|' + (d.street || 'preflop');
  }

  function trainerSpotLabel(key) {
    if (global.PTLeaks && global.PTLeaks.labelForKey) return global.PTLeaks.labelForKey(key);
    return String(key).replace(/\|/g, ' · ');
  }

  function sessionSpotKey(h, d) {
    if (d.spotKind) return d.spotKind + '|' + (h.heroPos || '?') + '|' + (d.street || 'preflop');
    return 'postflop|' + (h.heroPos || '?') + '|' + (d.street || 'postflop');
  }

  function sessionSpotLabel(h, d, key) {
    if (d.spot) return d.spot;
    if (global.PTLeaks && global.PTLeaks.labelForKey) return global.PTLeaks.labelForKey(key);
    return key;
  }

  function applyTrainerHand(st, rec) {
    if (!rec) return;
    var agg = ensureAggregates(st);
    var week = weekKey(rec.createdAt || Date.now());
    var decs = rec.decisions || [];
    var good = 0;
    var evLoss = 0;
    decs.forEach(function (d) {
      if (d.class === 'optima' || d.class === 'aceptable') good += 1;
      evLoss += Number(d.evLoss) || 0;
      if (LEAK_CLASSES[d.class]) {
        var k = trainerSpotKey(rec, d);
        bumpLeak(agg.trainerLeaks, k, trainerSpotLabel(k), d.evLoss);
      }
    });
    bumpWeekly(agg.trainerWeekly, week, {
      hands: 1,
      decisions: decs.length,
      good: good,
      evLoss: evLoss
    });
  }

  function applySessionStub(st, stub) {
    if (!stub || !stub.id || !stub.stats) return false;
    var agg = ensureAggregates(st);
    if (agg.countedSessions[stub.id]) return false;
    agg.countedSessions[stub.id] = true;
    trimCountedSessions(agg);

    var stats = stub.stats;
    var week = weekKey(stub.createdAt || Date.now());
    var dist = stats.dist || {};
    var decN = stats.nDecisions || (
      (dist.optima || 0) + (dist.aceptable || 0) + (dist.imprecisa || 0) + (dist.error || 0)
    );
    var good = Math.round((decN * (stats.accuracy || 0)) / 100);

    bumpWeekly(agg.sessionWeekly, week, {
      sessions: 1,
      hands: stats.nHands || 0,
      decisions: decN,
      good: good,
      evLoss: stats.evLossBB || 0,
      netBB: stats.netBB || 0
    });

    var tot = agg.sessionsTotal;
    tot.sessions += 1;
    tot.hands += stats.nHands || 0;
    tot.decisions += decN;
    tot.good += good;
    tot.evLoss = round2(tot.evLoss + (stats.evLossBB || 0));
    tot.netBB = round2(tot.netBB + (stats.netBB || 0));
    return true;
  }

  function applySessionHands(st, session) {
    if (!session || !session.id) return false;
    var agg = ensureAggregates(st);
    if (agg.countedSessions[session.id]) return false;
    applySessionStub(st, session);
    (session.hands || []).forEach(function (h) {
      (h.decisions || []).forEach(function (d) {
        if (!LEAK_CLASSES[d.class]) return;
        var k = sessionSpotKey(h, d);
        bumpLeak(agg.sessionLeaks, k, sessionSpotLabel(h, d, k), d.evLoss || d.evLossBB);
      });
    });
    return true;
  }

  function trimCountedSessions(agg) {
    var ids = Object.keys(agg.countedSessions);
    if (ids.length <= MAX_COUNTED_SESSIONS) return;
    ids.slice(0, ids.length - MAX_COUNTED_SESSIONS).forEach(function (id) {
      delete agg.countedSessions[id];
    });
  }

  function bucketToSeries(map, weeks, fields) {
    weeks = weeks || 8;
    fields = fields || ['hands'];
    var buckets = {};
    var now = new Date();
    for (var i = weeks - 1; i >= 0; i--) {
      var d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      var k = weekKey(d);
      buckets[k] = { key: k, hands: 0, sessions: 0, decisions: 0, good: 0, evLoss: 0, netBB: 0 };
    }
    Object.keys(map || {}).forEach(function (k) {
      if (!buckets[k]) return;
      var src = map[k];
      buckets[k].hands += src.hands || 0;
      buckets[k].sessions += src.sessions || 0;
      buckets[k].decisions += src.decisions || 0;
      buckets[k].good += src.good || 0;
      buckets[k].evLoss = round2(buckets[k].evLoss + (src.evLoss || 0));
      buckets[k].netBB = round2(buckets[k].netBB + (src.netBB || 0));
    });
    return Object.keys(buckets).sort().map(function (k) {
      var b = buckets[k];
      b.accuracy = b.decisions ? Math.round((b.good / b.decisions) * 100) : null;
      b.evLoss = round2(b.evLoss);
      b.netBB = round2(b.netBB);
      b.label = fmtWeekLabel(k);
      return b;
    });
  }

  function leaksToList(map, limit) {
    return Object.keys(map || {}).map(function (k) { return map[k]; })
      .sort(function (a, b) {
        if (b.evLoss !== a.evLoss) return b.evLoss - a.evLoss;
        return b.count - a.count;
      })
      .slice(0, limit || 5);
  }

  function mergeWeekly(a, b) {
    var map = {};
    (a || []).concat(b || []).forEach(function (row) {
      if (!map[row.key]) {
        map[row.key] = { key: row.key, label: row.label, hands: 0, sessions: 0, decisions: 0, good: 0, evLoss: 0 };
      }
      var t = map[row.key];
      t.hands += row.hands || 0;
      t.sessions += row.sessions || 0;
      t.decisions += row.decisions || 0;
      t.good += row.good || 0;
      t.evLoss = round2(t.evLoss + (row.evLoss || 0));
    });
    return Object.keys(map).sort().map(function (k) {
      var r = map[k];
      r.accuracy = r.decisions ? Math.round((r.good / r.decisions) * 100) : null;
      return r;
    });
  }

  function mergeLeaks(a, b, limit) {
    var map = {};
    (a || []).concat(b || []).forEach(function (l) {
      var src = l.source ? l.key + '|' + l.source : l.key;
      if (!map[src]) map[src] = { key: l.key, label: l.label, count: 0, evLoss: 0, source: l.source };
      map[src].count += l.count || 0;
      map[src].evLoss = round2(map[src].evLoss + (l.evLoss || 0));
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (x, y) {
        if (y.evLoss !== x.evLoss) return y.evLoss - x.evLoss;
        return y.count - x.count;
      })
      .slice(0, limit || 5);
  }

  function rebuildFromLegacy(st, history, sessions) {
    var agg = ensureAggregates(st);
    agg.trainerWeekly = {};
    agg.sessionWeekly = {};
    agg.trainerLeaks = {};
    agg.sessionLeaks = {};
    agg.sessionsTotal = { sessions: 0, hands: 0, decisions: 0, good: 0, evLoss: 0, netBB: 0 };
    agg.countedSessions = {};

    (history || []).forEach(function (h) { applyTrainerHand(st, h); });
    (sessions || []).forEach(function (s) {
      if (s.hands && s.hands.length) applySessionHands(st, s);
      else applySessionStub(st, s);
    });
  }

  function mergeAggregates(local, cloud) {
    var out = defaultAggregates();
    [local, cloud].forEach(function (src) {
      if (!src) return;
      Object.keys(src.trainerWeekly || {}).forEach(function (k) {
        bumpWeekly(out.trainerWeekly, k, src.trainerWeekly[k]);
      });
      Object.keys(src.sessionWeekly || {}).forEach(function (k) {
        bumpWeekly(out.sessionWeekly, k, src.sessionWeekly[k]);
      });
      Object.keys(src.trainerLeaks || {}).forEach(function (k) {
        var l = src.trainerLeaks[k];
        bumpLeak(out.trainerLeaks, k, l.label, 0);
        out.trainerLeaks[k].count += l.count || 0;
        out.trainerLeaks[k].evLoss = round2(out.trainerLeaks[k].evLoss + (l.evLoss || 0));
      });
      Object.keys(src.sessionLeaks || {}).forEach(function (k) {
        var l = src.sessionLeaks[k];
        bumpLeak(out.sessionLeaks, k, l.label, 0);
        out.sessionLeaks[k].count += l.count || 0;
        out.sessionLeaks[k].evLoss = round2(out.sessionLeaks[k].evLoss + (l.evLoss || 0));
      });
      var lt = src.sessionsTotal || {};
      out.sessionsTotal.sessions += lt.sessions || 0;
      out.sessionsTotal.hands += lt.hands || 0;
      out.sessionsTotal.decisions += lt.decisions || 0;
      out.sessionsTotal.good += lt.good || 0;
      out.sessionsTotal.evLoss = round2(out.sessionsTotal.evLoss + (lt.evLoss || 0));
      out.sessionsTotal.netBB = round2(out.sessionsTotal.netBB + (lt.netBB || 0));
      Object.keys(src.countedSessions || {}).forEach(function (id) {
        out.countedSessions[id] = true;
      });
    });
    return out;
  }

  global.PTStatsAggregate = {
    weekKey: weekKey,
    defaultAggregates: defaultAggregates,
    ensureAggregates: ensureAggregates,
    applyTrainerHand: applyTrainerHand,
    applySessionStub: applySessionStub,
    applySessionHands: applySessionHands,
    bucketToSeries: bucketToSeries,
    leaksToList: leaksToList,
    mergeWeekly: mergeWeekly,
    mergeLeaks: mergeLeaks,
    rebuildFromLegacy: rebuildFromLegacy,
    mergeAggregates: mergeAggregates,
    trainerWeeklySeries: function (st, weeks) {
      return bucketToSeries(ensureAggregates(st).trainerWeekly, weeks);
    },
    sessionWeeklySeries: function (st, weeks) {
      return bucketToSeries(ensureAggregates(st).sessionWeekly, weeks);
    },
    trainerTopLeaks: function (st, limit) {
      return leaksToList(ensureAggregates(st).trainerLeaks, limit);
    },
    sessionTopLeaks: function (st, limit) {
      return leaksToList(ensureAggregates(st).sessionLeaks, limit);
    },
    sessionsTotal: function (st) {
      return ensureAggregates(st).sessionsTotal;
    }
  };
})(window);
