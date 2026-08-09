/*
 * stats-aggregate.js — Agregados persistentes deduplicados por ID (v2).
 */
(function (global) {
  'use strict';

  var LEAK_CLASSES = { imprecisa: true, error: true };
  var AGG_VERSION = 9;

  var STYLE_OPP_KEYS = [
    'threeBetOpps', 'threeBetHits',
    'foldToThreeBetOpps', 'foldToThreeBetHits',
    'fourBetOpps', 'fourBetHits',
    'foldToFourBetOpps', 'foldToFourBetHits',
    'limpOpps', 'limpHits',
    'overlimpOpps', 'overlimpHits',
    'isoLimpOpps', 'isoLimpHits',
    'stealOpps', 'stealHits',
    'foldToStealOpps', 'foldToStealHits',
    'squeezeOpps', 'squeezeHits',
    'cbetFlopOpps', 'cbetFlopHits',
    'foldToCbetFlopOpps', 'foldToCbetFlopHits',
    'cbetTurnOpps', 'cbetTurnHits',
    'cbetRiverOpps', 'cbetRiverHits',
    'delayedCbetOpps', 'delayedCbetHits',
    'afBets', 'afRaises', 'afCalls', 'afChecks',
    'sawFlopN', 'wtsdN', 'wonAtSdN', 'wonSawFlopN'
  ];

  function addStyleCounters(target, src) {
    STYLE_OPP_KEYS.forEach(function (k) {
      target[k] = (target[k] || 0) + (src && src[k] ? src[k] : 0);
    });
  }

  function stylePctsFromCounters(c) {
    function pct(hits, opps) {
      if (!opps) return null;
      return Math.round((hits / opps) * 1000) / 10;
    }
    var afAgg = (c.afBets || 0) + (c.afRaises || 0);
    var afCalls = c.afCalls || 0;
    var afActions = afAgg + afCalls + (c.afChecks || 0);
    var hands = c.hands || 0;
    return {
      threeBetPct: pct(c.threeBetHits, c.threeBetOpps),
      foldToThreeBetPct: pct(c.foldToThreeBetHits, c.foldToThreeBetOpps),
      fourBetPct: pct(c.fourBetHits, c.fourBetOpps),
      foldToFourBetPct: pct(c.foldToFourBetHits, c.foldToFourBetOpps),
      limpPct: pct(c.limpHits, c.limpOpps),
      overlimpPct: pct(c.overlimpHits, c.overlimpOpps),
      isoLimpPct: pct(c.isoLimpHits, c.isoLimpOpps),
      stealPct: pct(c.stealHits, c.stealOpps),
      foldToStealPct: pct(c.foldToStealHits, c.foldToStealOpps),
      squeezePct: pct(c.squeezeHits, c.squeezeOpps),
      cbetFlopPct: pct(c.cbetFlopHits, c.cbetFlopOpps),
      foldToCbetFlopPct: pct(c.foldToCbetFlopHits, c.foldToCbetFlopOpps),
      cbetTurnPct: pct(c.cbetTurnHits, c.cbetTurnOpps),
      cbetRiverPct: pct(c.cbetRiverHits, c.cbetRiverOpps),
      delayedCbetPct: pct(c.delayedCbetHits, c.delayedCbetOpps),
      af: afCalls > 0 ? Math.round((afAgg / afCalls) * 100) / 100 : (afAgg > 0 ? afAgg : null),
      afq: afActions > 0 ? Math.round((afAgg / afActions) * 1000) / 10 : null,
      wtsdPct: pct(c.wtsdN, c.sawFlopN),
      wsdPct: pct(c.wonAtSdN, c.wtsdN),
      wwsfPct: pct(c.wonSawFlopN, c.sawFlopN),
      bbPer100: hands ? Math.round(((c.netBB || 0) / hands) * 1000) / 10 : null
    };
  }

  function pickStyleCounters(stats) {
    var out = {};
    STYLE_OPP_KEYS.forEach(function (k) {
      out[k] = stats && stats[k] != null ? stats[k] : 0;
    });
    return out;
  }

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
    var hands = stats.nHands || 0;
    var vpipHands = stats.vpipHands != null
      ? stats.vpipHands
      : (stats.vpipPct != null && hands ? Math.round((stats.vpipPct / 100) * hands) : 0);
    var pfrHands = stats.pfrHands != null
      ? stats.pfrHands
      : (stats.pfrPct != null && hands ? Math.round((stats.pfrPct / 100) * hands) : 0);
    var formatKey = stats.formatKey
      || (stub.context && stub.context.formatKey)
      || (stats.format === '9max' ? 'cash9'
        : (stats.format === 'mtt' ? 'mtt6'
          : (stats.format === 'spin' ? 'spin3' : 'cash6')));
    var row = {
      week: weekKey(stub.createdAt || Date.now()),
      hands: hands,
      decisions: decN,
      good: good,
      evLoss: round2(Math.abs(stats.evLossBB || 0)),
      netBB: round2(stats.netBB || 0),
      vpipHands: vpipHands,
      pfrHands: pfrHands,
      formatKey: formatKey,
      gameKind: stats.gameKind || (stub.context && stub.context.gameKind) || null,
      tableMax: stats.tableMax != null ? stats.tableMax : (stub.context && stub.context.tableMax),
      stakesLabel: stats.stakesLabel || (stub.context && stub.context.stakesLabel) || null,
      stakeTier: stats.stakeTier || null,
      roiPct: stats.roiPct != null ? stats.roiPct : null,
      profitEuro: stats.profitEuro != null ? stats.profitEuro : null,
      byStakes: stats.byStakes || null,
      day: (stub.createdAt || '').slice(0, 10) || null
    };
    addStyleCounters(row, pickStyleCounters(stats));
    return row;
  }

  function rebuildSessionWeekly(agg) {
    var map = {};
    Object.keys(agg.sessionById).forEach(function (id) {
      var c = agg.sessionById[id];
      if (!map[c.week]) {
        map[c.week] = { hands: 0, sessions: 0, decisions: 0, good: 0, evLoss: 0, netBB: 0, vpipHands: 0, pfrHands: 0 };
        addStyleCounters(map[c.week], {});
      }
      var b = map[c.week];
      b.sessions += 1;
      b.hands += c.hands;
      b.decisions += c.decisions;
      b.good += c.good;
      b.evLoss = round2(b.evLoss + c.evLoss);
      b.netBB = round2(b.netBB + c.netBB);
      b.vpipHands += c.vpipHands || 0;
      b.pfrHands += c.pfrHands || 0;
      addStyleCounters(b, c);
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

  function formatFamily(formatKey) {
    var k = formatKey || 'cash6';
    if (k.indexOf('spin') === 0) return 'spin';
    if (k.indexOf('mtt') === 0) return 'mtt';
    if (k === 'cash9') return 'cash9';
    if (k === 'cash2' || k === 'cash3') return 'shorthand';
    return 'cash6';
  }

  function matchesFormatFilter(rowFormatKey, filter) {
    if (!filter || filter === 'all' || filter === 'Todo') return true;
    var fam = formatFamily(rowFormatKey);
    if (filter === fam || filter === rowFormatKey) return true;
    // aliases UI
    if (filter === '6max' && fam === 'cash6') return true;
    if (filter === '9max' && fam === 'cash9') return true;
    return false;
  }

  function rebuildSessionsTotal(agg, formatFilter) {
    var tot = {
      sessions: 0, hands: 0, decisions: 0, good: 0, evLoss: 0, netBB: 0,
      vpipHands: 0, pfrHands: 0, vpipPct: null, pfrPct: null,
      formatFilter: formatFilter || 'all', byFormat: {}
    };
    addStyleCounters(tot, {});
    Object.keys(agg.sessionById).forEach(function (id) {
      var c = agg.sessionById[id];
      var fk = c.formatKey || 'cash6';
      var fam = formatFamily(fk);
      if (!tot.byFormat[fam]) {
        tot.byFormat[fam] = { sessions: 0, hands: 0, decisions: 0, good: 0, evLoss: 0, netBB: 0, vpipHands: 0, pfrHands: 0 };
        addStyleCounters(tot.byFormat[fam], {});
      }
      var bf = tot.byFormat[fam];
      bf.sessions += 1;
      bf.hands += c.hands;
      bf.decisions += c.decisions;
      bf.good += c.good;
      bf.evLoss = round2(bf.evLoss + c.evLoss);
      bf.netBB = round2(bf.netBB + c.netBB);
      bf.vpipHands += c.vpipHands || 0;
      bf.pfrHands += c.pfrHands || 0;
      addStyleCounters(bf, c);

      if (!matchesFormatFilter(fk, formatFilter)) return;
      tot.sessions += 1;
      tot.hands += c.hands;
      tot.decisions += c.decisions;
      tot.good += c.good;
      tot.evLoss = round2(tot.evLoss + c.evLoss);
      tot.netBB = round2(tot.netBB + c.netBB);
      tot.vpipHands += c.vpipHands || 0;
      tot.pfrHands += c.pfrHands || 0;
      addStyleCounters(tot, c);
    });
    tot.vpipPct = tot.hands ? Math.round((tot.vpipHands / tot.hands) * 1000) / 10 : null;
    tot.pfrPct = tot.hands ? Math.round((tot.pfrHands / tot.hands) * 1000) / 10 : null;
    var stylePct = stylePctsFromCounters(tot);
    Object.keys(stylePct).forEach(function (k) { tot[k] = stylePct[k]; });
    Object.keys(tot.byFormat).forEach(function (fam) {
      var bf = tot.byFormat[fam];
      bf.vpipPct = bf.hands ? Math.round((bf.vpipHands / bf.hands) * 1000) / 10 : null;
      bf.pfrPct = bf.hands ? Math.round((bf.pfrHands / bf.hands) * 1000) / 10 : null;
      var sp = stylePctsFromCounters(bf);
      Object.keys(sp).forEach(function (k) { bf[k] = sp[k]; });
    });
    return tot;
  }

  function bumpLeak(map, key, label, evLoss, meta) {
    if (!map[key]) map[key] = { key: key, label: label || key, count: 0, evLoss: 0 };
    map[key].count += 1;
    map[key].evLoss = round2(map[key].evLoss + (Number(evLoss) || 0));
    if (label) map[key].label = label;
    if (meta && meta.sessionId && !map[key].sessionId) map[key].sessionId = meta.sessionId;
    if (meta && meta.handId && !map[key].handId) map[key].handId = meta.handId;
  }

  function trainerSpotKey(rec, d) {
    var sc = rec.scenarioRaw || rec.scenario || {};
    if (typeof sc !== 'object' || !sc) sc = {};
    var type = sc.type || 'spot';
    var pos = rec.displayHeroPos || rec.heroPos || (rec.hero && rec.hero.pos) || '?';
    return type + '|' + pos + '|' + (d.street || 'preflop');
  }

  function trainerSpotLabel(key) {
    if (global.PTLeaks && global.PTLeaks.labelForKey) return global.PTLeaks.labelForKey(key);
    return String(key).replace(/\|/g, ' · ');
  }

  function sessionSpotKey(h, d) {
    var fmt = h.formatKey || h.format || 'cash6';
    var fam = formatFamily(fmt);
    if (d.spotKind) return fam + '|' + d.spotKind + '|' + (h.heroPos || '?') + '|' + (d.street || 'preflop');
    return fam + '|postflop|' + (h.heroPos || '?') + '|' + (d.street || 'postflop');
  }

  function sessionSpotLabel(h, d, key) {
    var base = d.spot || (global.PTLeaks && global.PTLeaks.labelForKey ? global.PTLeaks.labelForKey(key) : key);
    var fam = formatFamily(h.formatKey || h.format || 'cash6');
    if (fam && fam !== 'cash6' && String(base).indexOf(fam) !== 0) return fam + ' · ' + base;
    return base;
  }

  function rebuildByStakes(agg) {
    var map = {};
    Object.keys(agg.sessionById || {}).forEach(function (id) {
      var c = agg.sessionById[id];
      var rows = c.byStakes;
      if (rows && rows.length) {
        rows.forEach(function (r) {
          var k = r.stakesLabel || 'unknown';
          if (!map[k]) map[k] = { stakesLabel: k, stakeTier: r.stakeTier || null, hands: 0, netBB: 0 };
          map[k].hands += r.hands || 0;
          map[k].netBB = round2(map[k].netBB + (r.netBB || 0));
        });
        return;
      }
      var k2 = c.stakesLabel || 'unknown';
      if (!map[k2]) map[k2] = { stakesLabel: k2, stakeTier: c.stakeTier || null, hands: 0, netBB: 0 };
      map[k2].hands += c.hands || 0;
      map[k2].netBB = round2(map[k2].netBB + (c.netBB || 0));
    });
    return Object.keys(map).map(function (k) {
      var b = map[k];
      b.bbPer100 = b.hands ? Math.round((b.netBB / b.hands) * 1000) / 10 : null;
      return b;
    }).sort(function (a, b) { return b.hands - a.hands; });
  }

  function rebuildByDay(agg, days) {
    days = days || 14;
    var buckets = {};
    var now = new Date();
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(now);
      d.setDate(d.getDate() - i);
      var k = d.toISOString().slice(0, 10);
      buckets[k] = { key: k, hands: 0, netBB: 0, sessions: 0 };
    }
    Object.keys(agg.sessionById || {}).forEach(function (id) {
      var c = agg.sessionById[id];
      var day = c.day || (c.week ? c.week : null);
      if (!day || !buckets[day]) return;
      buckets[day].hands += c.hands || 0;
      buckets[day].netBB = round2(buckets[day].netBB + (c.netBB || 0));
      buckets[day].sessions += 1;
    });
    return Object.keys(buckets).sort().map(function (k) {
      var b = buckets[k];
      b.bbPer100 = b.hands ? Math.round((b.netBB / b.hands) * 1000) / 10 : null;
      b.label = k.slice(5); // MM-DD
      return b;
    });
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
        bumpLeak(agg.sessionLeaks, k, sessionSpotLabel(h, d, k), d.evLoss || d.evLossBB, {
          sessionId: session.id,
          handId: h.id
        });
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
        bumpLeak(agg.sessionLeaks, k, sessionSpotLabel(h, d, k), d.evLoss || d.evLossBB, {
          sessionId: session.id,
          handId: h.id
        });
      });
    });
  }

  function removeSession(st, sessionId) {
    if (!sessionId) return;
    var agg = ensureAggregates(st);
    delete agg.sessionById[sessionId];
    purgeSessionLeaksForSession(agg, sessionId);
  }

  function bucketToSeries(map, weeks) {
    weeks = weeks || 8;
    var buckets = {};
    var now = new Date();
    for (var i = weeks - 1; i >= 0; i--) {
      var d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      var k = weekKey(d);
      buckets[k] = { key: k, hands: 0, sessions: 0, decisions: 0, good: 0, evLoss: 0, netBB: 0, vpipHands: 0, pfrHands: 0 };
      addStyleCounters(buckets[k], {});
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
      buckets[k].vpipHands += src.vpipHands || 0;
      buckets[k].pfrHands += src.pfrHands || 0;
      addStyleCounters(buckets[k], src);
    });
    return Object.keys(buckets).sort().map(function (k) {
      var b = buckets[k];
      b.accuracy = b.decisions ? Math.round((b.good / b.decisions) * 100) : null;
      b.evLoss = round2(b.evLoss);
      b.netBB = round2(b.netBB);
      b.vpipPct = b.hands ? Math.round((b.vpipHands / b.hands) * 1000) / 10 : null;
      b.pfrPct = b.hands ? Math.round((b.pfrHands / b.hands) * 1000) / 10 : null;
      var stylePct = stylePctsFromCounters(b);
      Object.keys(stylePct).forEach(function (key) { b[key] = stylePct[key]; });
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

  function mergeLeakMaps(target, primary, secondary) {
    mergeLeakMapsInto(target, primary);
    Object.keys(secondary || {}).forEach(function (k) {
      if (!target[k]) target[k] = JSON.parse(JSON.stringify(secondary[k]));
    });
  }

  function mergeLeakMapsInto(target, src) {
    Object.keys(src || {}).forEach(function (k) {
      var s = src[k];
      if (!s) return;
      if (!target[k]) {
        target[k] = JSON.parse(JSON.stringify(s));
        return;
      }
      var t = target[k];
      t.count = Math.max(t.count || 0, s.count || 0);
      t.evLoss = round2(Math.max(t.evLoss || 0, s.evLoss || 0));
      if (s.label) t.label = s.label;
      if (s.sessionId && !t.sessionId) t.sessionId = s.sessionId;
      if (s.handId && !t.handId) t.handId = s.handId;
    });
  }

  function purgeSessionLeaksForSession(agg, sessionId) {
    if (!sessionId || !agg) return;
    Object.keys(agg.sessionLeaks || {}).forEach(function (k) {
      if (agg.sessionLeaks[k] && agg.sessionLeaks[k].sessionId === sessionId) {
        delete agg.sessionLeaks[k];
      }
    });
    if (agg._sessionLeakKeys) {
      Object.keys(agg._sessionLeakKeys).forEach(function (k) {
        if (k.indexOf(sessionId + '|') === 0) delete agg._sessionLeakKeys[k];
      });
    }
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
    mergeLeakMaps(out.trainerLeaks, local && local.trainerLeaks, cloud && cloud.trainerLeaks);
    mergeLeakMaps(out.sessionLeaks, local && local.sessionLeaks, cloud && cloud.sessionLeaks);
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
    sessionsTotal: function (st, formatFilter) {
      return rebuildSessionsTotal(ensureAggregates(st), formatFilter);
    },
    sessionsTotalByFormat: function (st) {
      var tot = rebuildSessionsTotal(ensureAggregates(st), 'all');
      return tot.byFormat || {};
    },
    sessionsByStakes: function (st) {
      return rebuildByStakes(ensureAggregates(st));
    },
    sessionDailySeries: function (st, days) {
      return rebuildByDay(ensureAggregates(st), days);
    },
    formatFamily: formatFamily,
    refreshSessionLeaks: function (st, sessions) {
      var agg = ensureAggregates(st);
      if (!agg._sessionLeakKeys) agg._sessionLeakKeys = {};
      (sessions || []).forEach(function (s) {
        if (s && s.hands && s.hands.length) indexSessionLeaksForSession(agg, s);
      });
    },
    rebuildSessionLeaksFromCloud: function (st, sessions) {
      var agg = ensureAggregates(st);
      if (!agg._sessionLeakKeys) agg._sessionLeakKeys = {};
      rebuildSessionLeaks(agg, sessions);
    },
    rebuildTrainerLeaksFromHistory: rebuildTrainerLeaksFromHistory
  };
})(window);
