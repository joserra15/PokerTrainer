/*
 * stats-aggregate.js — Agregados persistentes deduplicados por ID (v2).
 */
(function (global) {
  'use strict';

  var LEAK_CLASSES = { imprecisa: true, error: true };
  var AGG_VERSION = 3;

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
      version: AGG_VERSION,
      sessionById: {},
      trainerByHandId: {},
      trainerLeaks: {},
      sessionLeaks: {}
    };
  }

  function ensureAggregates(st) {
    if (!st || typeof st !== 'object') return defaultAggregates();
    if (!st.aggregates || typeof st.aggregates !== 'object') st.aggregates = defaultAggregates();
    var a = st.aggregates;
    if (!a.sessionById) a.sessionById = {};
    if (!a.trainerByHandId) a.trainerByHandId = {};
    if (!a.trainerLeaks) a.trainerLeaks = {};
    if (!a.sessionLeaks) a.sessionLeaks = {};
    a.version = AGG_VERSION;
    return a;
  }

  function sessionStatsFromStub(stub) {
    var stats = stub.stats || {};
    var dist = stats.dist || {};
    var decN = stats.nDecisions || (
      (dist.optima || 0) + (dist.aceptable || 0) + (dist.imprecisa || 0) + (dist.error || 0)
    );
    var good = decN ? Math.round((decN * (stats.accuracy || 0)) / 100) : 0;
    return {
      week: weekKey(stub.createdAt || Date.now()),
      hands: stats.nHands || 0,
      decisions: decN,
      good: good,
      evLoss: round2(Math.abs(stats.evLossBB || 0)),
      netBB: round2(stats.netBB || 0)
    };
  }

  function rebuildSessionWeekly(agg) {
    var map = {};
    Object.keys(agg.sessionById).forEach(function (id) {
      var c = agg.sessionById[id];
      if (!map[c.week]) map[c.week] = { hands: 0, sessions: 0, decisions: 0, good: 0, evLoss: 0, netBB: 0 };
      var b = map[c.week];
      b.sessions += 1;
      b.hands += c.hands;
      b.decisions += c.decisions;
      b.good += c.good;
      b.evLoss = round2(b.evLoss + c.evLoss);
      b.netBB = round2(b.netBB + c.netBB);
    });
    return map;
  }

  function rebuildTrainerWeekly(agg) {
    var map = {};
    Object.keys(agg.trainerByHandId).forEach(function (id) {
      var c = agg.trainerByHandId[id];
      if (!map[c.week]) map[c.week] = { hands: 0, decisions: 0, good: 0, evLoss: 0 };
      var b = map[c.week];
      b.hands += 1;
      b.decisions += c.decisions;
      b.good += c.good;
      b.evLoss = round2(b.evLoss + c.evLoss);
    });
    return map;
  }

  function rebuildSessionsTotal(agg) {
    var tot = { sessions: 0, hands: 0, decisions: 0, good: 0, evLoss: 0, netBB: 0 };
    Object.keys(agg.sessionById).forEach(function (id) {
      var c = agg.sessionById[id];
      tot.sessions += 1;
      tot.hands += c.hands;
      tot.decisions += c.decisions;
      tot.good += c.good;
      tot.evLoss = round2(tot.evLoss + c.evLoss);
      tot.netBB = round2(tot.netBB + c.netBB);
    });
    return tot;
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

  function clearTrainerHandLeaks(agg, handId) {
    if (!agg._trainerLeakIndex) agg._trainerLeakIndex = {};
    var entries = agg._trainerLeakIndex[handId];
    if (!entries) return;
    entries.forEach(function (e) {
      var l = agg.trainerLeaks[e.k];
      if (!l) return;
      l.count -= 1;
      l.evLoss = round2(l.evLoss - e.ev);
      if (l.count <= 0) delete agg.trainerLeaks[e.k];
    });
    delete agg._trainerLeakIndex[handId];
  }

  function rebuildTrainerLeaksFromHistory(agg, history) {
    agg.trainerLeaks = {};
    agg._trainerLeakIndex = {};
    (history || []).forEach(function (rec) {
      if (!rec || !rec.id) return;
      var entries = [];
      (rec.decisions || []).forEach(function (d) {
        if (!LEAK_CLASSES[d.class]) return;
        var k = trainerSpotKey(rec, d);
        var ev = Number(d.evLoss) || 0;
        bumpLeak(agg.trainerLeaks, k, trainerSpotLabel(k), ev);
        entries.push({ k: k, ev: ev });
      });
      if (entries.length) agg._trainerLeakIndex[rec.id] = entries;
    });
  }

  function indexSessionLeaks(agg, session) {
    if (!session || !session.hands) return;
    (session.hands || []).forEach(function (h) {
      (h.decisions || []).forEach(function (d) {
        if (!LEAK_CLASSES[d.class]) return;
        var k = sessionSpotKey(h, d);
        bumpLeak(agg.sessionLeaks, k, sessionSpotLabel(h, d, k), d.evLoss || d.evLossBB);
      });
    });
  }

  function rebuildSessionLeaks(agg, sessions) {
    agg.sessionLeaks = {};
    (sessions || []).forEach(function (s) {
      if (s && s.hands && s.hands.length) indexSessionLeaks(agg, s);
    });
  }

  function applyTrainerHand(st, rec) {
    if (!rec || !rec.id) return;
    var agg = ensureAggregates(st);
    clearTrainerHandLeaks(agg, rec.id);
    var decs = rec.decisions || [];
    var good = 0;
    var evLoss = 0;
    var entries = [];
    decs.forEach(function (d) {
      if (d.class === 'optima' || d.class === 'aceptable') good += 1;
      evLoss += Number(d.evLoss) || 0;
      if (LEAK_CLASSES[d.class]) {
        var k = trainerSpotKey(rec, d);
        var ev = Number(d.evLoss) || 0;
        bumpLeak(agg.trainerLeaks, k, trainerSpotLabel(k), ev);
        entries.push({ k: k, ev: ev });
      }
    });
    if (entries.length) agg._trainerLeakIndex[rec.id] = entries;
    agg.trainerByHandId[rec.id] = {
      week: weekKey(rec.createdAt || Date.now()),
      decisions: decs.length,
      good: good,
      evLoss: round2(evLoss)
    };
  }

  function applySessionStub(st, stub) {
    if (!stub || !stub.id || !stub.stats) return false;
    var agg = ensureAggregates(st);
    agg.sessionById[stub.id] = sessionStatsFromStub(stub);
    return true;
  }

  function applySessionHands(st, session) {
    if (!session || !session.id || !session.stats) return false;
    applySessionStub(st, session);
    var agg = ensureAggregates(st);
    indexSessionLeaksForSession(agg, session);
    return true;
  }

  function indexSessionLeaksForSession(agg, session) {
    (session.hands || []).forEach(function (h) {
      (h.decisions || []).forEach(function (d) {
        if (!LEAK_CLASSES[d.class]) return;
        var k = sessionSpotKey(h, d);
        var leakKey = session.id + '|' + k;
        if (!agg._sessionLeakKeys) agg._sessionLeakKeys = {};
        if (agg._sessionLeakKeys[leakKey]) return;
        agg._sessionLeakKeys[leakKey] = true;
        bumpLeak(agg.sessionLeaks, k, sessionSpotLabel(h, d, k), d.evLoss || d.evLossBB);
      });
    });
  }

  function removeSession(st, sessionId) {
    if (!sessionId) return;
    var agg = ensureAggregates(st);
    delete agg.sessionById[sessionId];
    if (agg._sessionLeakKeys) {
      Object.keys(agg._sessionLeakKeys).forEach(function (k) {
        if (k.indexOf(sessionId + '|') === 0) delete agg._sessionLeakKeys[k];
      });
    }
  }

  function bucketToSeries(map, weeks) {
    weeks = weeks || 8;
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

  function rebuildFromLegacy(st, history, sessions) {
    var agg = defaultAggregates();
    st.aggregates = agg;
    (history || []).forEach(function (h) {
      if (!h || !h.id) return;
      var decs = h.decisions || [];
      var good = 0;
      var evLoss = 0;
      decs.forEach(function (d) {
        if (d.class === 'optima' || d.class === 'aceptable') good += 1;
        evLoss += Number(d.evLoss) || 0;
      });
      agg.trainerByHandId[h.id] = {
        week: weekKey(h.createdAt || Date.now()),
        decisions: decs.length,
        good: good,
        evLoss: round2(evLoss)
      };
    });
    rebuildTrainerLeaksFromHistory(agg, history);
    (sessions || []).forEach(function (s) {
      if (!s || !s.id || !s.stats) return;
      applySessionStub(st, s);
    });
    rebuildSessionLeaks(agg, sessions);
  }

  function mergeAggregates(local, cloud) {
    var out = defaultAggregates();
    [local, cloud].forEach(function (src) {
      if (!src) return;
      if (src.version >= 2 && src.sessionById) {
        Object.keys(src.sessionById).forEach(function (id) {
          out.sessionById[id] = src.sessionById[id];
        });
        Object.keys(src.trainerByHandId || {}).forEach(function (id) {
          out.trainerByHandId[id] = src.trainerByHandId[id];
        });
      }
    });
    return out;
  }

  global.PTStatsAggregate = {
    AGG_VERSION: AGG_VERSION,
    weekKey: weekKey,
    defaultAggregates: defaultAggregates,
    ensureAggregates: ensureAggregates,
    applyTrainerHand: applyTrainerHand,
    applySessionStub: applySessionStub,
    applySessionHands: applySessionHands,
    removeSession: removeSession,
    bucketToSeries: bucketToSeries,
    leaksToList: leaksToList,
    rebuildFromLegacy: rebuildFromLegacy,
    mergeAggregates: mergeAggregates,
    trainerWeeklySeries: function (st, weeks) {
      return bucketToSeries(rebuildTrainerWeekly(ensureAggregates(st)), weeks);
    },
    sessionWeeklySeries: function (st, weeks) {
      return bucketToSeries(rebuildSessionWeekly(ensureAggregates(st)), weeks);
    },
    trainerTopLeaks: function (st, limit) {
      return leaksToList(ensureAggregates(st).trainerLeaks, limit);
    },
    sessionTopLeaks: function (st, limit) {
      return leaksToList(ensureAggregates(st).sessionLeaks, limit);
    },
    sessionsTotal: function (st) {
      return rebuildSessionsTotal(ensureAggregates(st));
    },
    refreshSessionLeaks: function (st, sessions) {
      var agg = ensureAggregates(st);
      agg._sessionLeakKeys = {};
      rebuildSessionLeaks(agg, sessions);
    },
    rebuildTrainerLeaksFromHistory: rebuildTrainerLeaksFromHistory
  };
})(window);
