/*
 * tournament/leaks-bridge.js — Pipeline Torneos IA → Store.errors / leaks
 * + informe post-torneo accionable (peores manos, leak por fase, drills).
 */
(function (global) {
  'use strict';

  var LEAK_CLASSES = { imprecisa: true, error: true };
  var PHASE_BUCKET_LABELS = {
    early: 'Early / Mid',
    bubble: 'Burbuja',
    ft: 'Mesa final'
  };

  function r2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  function spotTypeFromDecision(d, hand) {
    if (d && d.spotKind) return d.spotKind;
    if (d && d.input && d.input.spotKind) return d.input.spotKind;
    if (d && d.street && d.street !== 'preflop') return 'postflop';
    if (hand && hand.mttPhase === 'push') return 'RFI';
    return 'RFI';
  }

  function resolvePhase(d, hand) {
    return (d && (d.mttPhase || (d.input && d.input.mttPhase)))
      || (hand && hand.mttPhase)
      || 'mid';
  }

  function phaseBucket(hand, decision, state) {
    var cfg = (state && state.config) || {};
    var seats = Number(cfg.seatsPerTable) || Number(hand && hand.tableMax) || 9;
    var left = hand && hand.playersLeft != null
      ? Number(hand.playersLeft)
      : (state && state.aliveCount != null ? Number(state.aliveCount) : null);
    var placesPaid = hand && hand.placesPaid != null
      ? Number(hand.placesPaid)
      : (cfg.placesPaid != null ? Number(cfg.placesPaid) : null);
    var situation = (hand && hand.mttStructureSituation)
      || (hand && hand.tournamentContext && hand.tournamentContext.mttStructureSituation)
      || null;
    var phase = resolvePhase(decision, hand);

    if (situation === 'ft9' || (left != null && left <= seats)) return 'ft';
    if (situation === 'bubble' || situation === 'mincash' || phase === 'bubble') return 'bubble';
    if (left != null && placesPaid != null && placesPaid > 0 && left <= placesPaid + 2) {
      return 'bubble';
    }
    if (phase === 'short' || phase === 'push') return 'bubble';
    return 'early';
  }

  function buildSpotKey(hand, d) {
    var type = spotTypeFromDecision(d, hand);
    var pos = (hand && (hand.heroPos || hand.displayHeroPos)) || (d && d.pos) || '?';
    var street = (d && d.street) || 'preflop';
    var baseKey = type + '|' + pos + '|' + street;
    var phase = resolvePhase(d, hand);
    var Tax = global.PTFormatTaxonomy;
    if (Tax && typeof Tax.formatSpotKey === 'function') {
      try {
        return Tax.formatSpotKey(baseKey, {
          formatHub: 'mtt',
          gameType: (hand && hand.gameKind === 'spin') ? 'spin3' : 'mtt',
          practiceIntent: 'mixed',
          phase: phase,
          street: street
        });
      } catch (e) { /* */ }
    }
    return 'tournament|' + baseKey + '|' + phase;
  }

  function scenarioLabel(type, pos, street) {
    var TYPE = {
      RFI: 'RFI',
      vsRFI: '3-Bet',
      face3bet: 'Vs 3-Bet',
      face4bet: '4-Bet',
      squeeze: 'Squeeze',
      postflop: 'Postflop'
    };
    return (TYPE[type] || type) + ' · ' + (pos || '?') + ' · ' + (street || 'preflop');
  }

  /**
   * Convierte decisiones imprecisa/error de una mano analizada de torneo
   * en registros compatibles con Store.errors / PTLeaks.
   */
  function errorsFromHand(hand, state) {
    if (!hand || !hand.id) return [];
    var out = [];
    var decisions = hand.decisions || [];
    decisions.forEach(function (d, idx) {
      if (!d || !LEAK_CLASSES[d.class]) return;
      if (d.unscored) return;
      var type = spotTypeFromDecision(d, hand);
      var pos = hand.heroPos || d.pos || '?';
      var street = d.street || 'preflop';
      var phase = resolvePhase(d, hand);
      var bucket = phaseBucket(hand, d, state);
      var spotKey = buildSpotKey(hand, d);
      var cfg = (state && state.config) || {};
      out.push({
        id: hand.id + '_trn_' + idx,
        handId: hand.id,
        createdAt: hand.datetime || new Date().toISOString(),
        scenarioRaw: { type: type, tournament: true },
        scenario: scenarioLabel(type, pos, street),
        playConfig: {
          formatHub: hand.gameKind === 'spin' ? 'spin' : 'mtt',
          gameType: hand.gameKind === 'spin' ? 'spin3' : 'mtt',
          mttPhase: phase,
          resolvedPhase: phase,
          practiceIntent: 'mixed',
          source: 'tournamentAi'
        },
        displayHeroPos: pos,
        heroPos: pos,
        heroCode: hand.heroCode || null,
        heroCards: (hand.heroCards || []).slice(),
        street: street,
        spotKey: spotKey,
        formatHub: hand.gameKind === 'spin' ? 'spin' : 'mtt',
        practiceIntent: 'mixed',
        mttPhase: phase,
        phaseBucket: bucket,
        source: 'tournamentAi',
        tournament: true,
        tournamentId: hand.tournamentId || (state && state.id) || null,
        handIndex: hand.handIndex != null ? hand.handIndex : null,
        chosen: d.label || d.chosen || d.action,
        chosenAction: d.chosen || d.action,
        best: d.best || null,
        class: d.class,
        evLoss: Number(d.evLoss) || 0,
        gto: d.gto || null,
        context: d.context || null,
        spot: type,
        kind: cfg.kind || hand.gameKind || 'mtt'
      });
    });
    return out;
  }

  function errorsFromTournament(state) {
    if (!state) return [];
    var hands = (state.sessionHands && state.sessionHands.length)
      ? state.sessionHands
      : [];
    var all = [];
    hands.forEach(function (h) {
      all = all.concat(errorsFromHand(h, state));
    });
    return all;
  }

  /** Persiste errores en Store (idempotente por id). */
  function recordHandErrors(hand, state) {
    var errs = errorsFromHand(hand, state);
    if (!errs.length) return { ok: true, added: 0, errors: [] };
    var Store = global.Store;
    if (Store && typeof Store.appendErrors === 'function') {
      var res = Store.appendErrors(errs, { source: 'tournamentAi' });
      return { ok: !!(res && res.ok !== false), added: (res && res.added) || 0, errors: errs };
    }
    return { ok: false, added: 0, errors: errs, reason: 'no_store' };
  }

  function recordTournamentErrors(state) {
    var errs = errorsFromTournament(state);
    if (!errs.length) return { ok: true, added: 0, errors: [] };
    var Store = global.Store;
    if (Store && typeof Store.appendErrors === 'function') {
      var res = Store.appendErrors(errs, { source: 'tournamentAi' });
      return { ok: !!(res && res.ok !== false), added: (res && res.added) || 0, errors: errs };
    }
    return { ok: false, added: 0, errors: errs, reason: 'no_store' };
  }

  function aggregateLeaks(errors) {
    var map = {};
    (errors || []).forEach(function (err) {
      var key = err.spotKey || (err.spot + '|' + err.heroPos + '|' + err.street);
      if (!map[key]) {
        var label = err.scenario || key;
        if (global.PTLeaks && global.PTLeaks.labelForKey) {
          try { label = global.PTLeaks.labelForKey(key) || label; } catch (e) { /* */ }
        }
        map[key] = {
          key: key,
          label: label,
          count: 0,
          evLoss: 0,
          sample: err,
          mttPhase: err.mttPhase || null,
          phaseBucket: err.phaseBucket || null,
          errors: []
        };
      }
      map[key].count += 1;
      map[key].evLoss = r2(map[key].evLoss + (Number(err.evLoss) || 0));
      map[key].errors.push(err);
      if ((Number(err.evLoss) || 0) >= (Number(map[key].sample.evLoss) || 0)) {
        map[key].sample = err;
      }
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) {
        if (b.evLoss !== a.evLoss) return b.evLoss - a.evLoss;
        return b.count - a.count;
      });
  }

  function topWorstHands(state, limit) {
    limit = limit || 3;
    var hands = (state && state.sessionHands) || [];
    return hands.slice()
      .filter(function (h) {
        return (Number(h.totalEvLoss) || 0) > 0
          || (h.decisions || []).some(function (d) { return LEAK_CLASSES[d && d.class]; });
      })
      .sort(function (a, b) {
        return (Number(b.totalEvLoss) || 0) - (Number(a.totalEvLoss) || 0);
      })
      .slice(0, limit)
      .map(function (h) {
        var worst = null;
        (h.decisions || []).forEach(function (d) {
          if (!d || !LEAK_CLASSES[d.class]) return;
          if (!worst || (Number(d.evLoss) || 0) > (Number(worst.evLoss) || 0)) worst = d;
        });
        return {
          handId: h.id,
          handIndex: h.handIndex,
          heroCode: h.heroCode || '',
          heroPos: h.heroPos || '',
          totalEvLoss: r2(h.totalEvLoss || 0),
          handScore: h.handScore != null ? h.handScore : null,
          worstClass: (worst && worst.class) || h.worstClass || null,
          worstStreet: (worst && worst.street) || null,
          worstLabel: (worst && (worst.label || worst.chosen)) || null,
          mttPhase: h.mttPhase || (worst && worst.mttPhase) || null,
          phaseBucket: phaseBucket(h, worst || {}, state)
        };
      });
  }

  function dominantLeakByPhase(errors, state) {
    var byBucket = { early: [], bubble: [], ft: [] };
    (errors || []).forEach(function (err) {
      var b = err.phaseBucket || phaseBucket(
        { playersLeft: null, placesPaid: null, mttPhase: err.mttPhase, tableMax: 9 },
        err,
        state
      );
      if (!byBucket[b]) byBucket[b] = [];
      byBucket[b].push(err);
    });
    var phases = ['early', 'bubble', 'ft'].map(function (bucket) {
      var list = byBucket[bucket] || [];
      var leaks = aggregateLeaks(list);
      var top = leaks[0] || null;
      var evLoss = list.reduce(function (s, e) { return s + (Number(e.evLoss) || 0); }, 0);
      return {
        bucket: bucket,
        label: PHASE_BUCKET_LABELS[bucket] || bucket,
        count: list.length,
        evLoss: r2(evLoss),
        topLeak: top ? {
          key: top.key,
          label: top.label,
          count: top.count,
          evLoss: top.evLoss,
          mttPhase: top.mttPhase
        } : null
      };
    }).filter(function (p) { return p.count > 0; })
      .sort(function (a, b) {
        if (b.evLoss !== a.evLoss) return b.evLoss - a.evLoss;
        return b.count - a.count;
      });

    return {
      dominant: phases[0] || null,
      byPhase: phases
    };
  }

  function recommendedDrills(leaks, phaseInfo) {
    var out = [];
    var seen = {};
    function pushFromLeak(leak, hands) {
      if (!leak || !leak.key || seen[leak.key]) return;
      seen[leak.key] = true;
      var drill = {
        leakKey: leak.key,
        label: leak.label || leak.key,
        hands: hands || 25,
        mttPhase: (leak.sample && leak.sample.mttPhase) || leak.mttPhase || null,
        phaseBucket: (leak.sample && leak.sample.phaseBucket) || leak.phaseBucket || null
      };
      if (global.PTTrainerLeakPresets && global.PTTrainerLeakPresets.presetForLeak) {
        try {
          var cfg = global.PTTrainerLeakPresets.presetForLeak(leak, hands || 25);
          if (cfg) {
            cfg.formatHub = 'mtt';
            cfg.gameType = 'mtt';
            if (drill.mttPhase && drill.mttPhase !== 'auto') cfg.mttPhase = drill.mttPhase;
            drill.preset = cfg;
          }
        } catch (e1) { /* */ }
      }
      if (global.PTAIReport) {
        try {
          if (typeof global.PTAIReport.lessonFromLeak === 'function') {
            drill.lessonId = global.PTAIReport.lessonFromLeak(leak) || null;
          }
        } catch (e2) { /* */ }
      }
      out.push(drill);
    }

    (leaks || []).slice(0, 2).forEach(function (l, i) {
      pushFromLeak(l, i === 0 ? 25 : 50);
    });
    if (out.length < 2 && phaseInfo && phaseInfo.dominant && phaseInfo.dominant.topLeak) {
      pushFromLeak(phaseInfo.dominant.topLeak, 25);
    }
    return out.slice(0, 2);
  }

  /**
   * Informe post-torneo: top peores manos, leak dominante por fase, drills.
   */
  function buildReport(state) {
    var errors = errorsFromTournament(state);
    var leaks = aggregateLeaks(errors);
    var phaseInfo = dominantLeakByPhase(errors, state);
    var worstHands = topWorstHands(state, 3);
    var drills = recommendedDrills(leaks, phaseInfo);
    return {
      tournamentId: state && state.id,
      errorCount: errors.length,
      leakCount: leaks.length,
      topLeaks: leaks.slice(0, 5).map(function (l) {
        return {
          key: l.key,
          label: l.label,
          count: l.count,
          evLoss: l.evLoss,
          mttPhase: l.mttPhase,
          phaseBucket: l.phaseBucket
        };
      }),
      worstHands: worstHands,
      phase: phaseInfo,
      drills: drills
    };
  }

  /** Aplica el drill recomendado (o el top leak del informe) en Entrenar MTT. */
  function trainLeak(leakOrDrill, opts) {
    opts = opts || {};
    var leak = leakOrDrill;
    var hands = opts.hands || (leakOrDrill && leakOrDrill.hands) || 25;
    var preset = (leakOrDrill && leakOrDrill.preset) || null;
    if (!preset && global.PTTrainerLeakPresets && global.PTTrainerLeakPresets.presetForLeak) {
      preset = global.PTTrainerLeakPresets.presetForLeak(leak, hands);
    }
    if (!preset) {
      preset = {
        formatHub: 'mtt',
        gameType: 'mtt',
        scenario: 'rfi',
        practiceStreet: 'preflop',
        handsTarget: hands
      };
    }
    preset.formatHub = 'mtt';
    preset.gameType = preset.gameType === 'spin3' ? 'spin3' : 'mtt';
    if (opts.mttPhase) preset.mttPhase = opts.mttPhase;
    else if (leakOrDrill && leakOrDrill.mttPhase) preset.mttPhase = leakOrDrill.mttPhase;
    else if (!preset.mttPhase || preset.mttPhase === 'auto') preset.mttPhase = 'mid';
    preset.handsTarget = hands;

    if (global.applyPlaySetupConfig) global.applyPlaySetupConfig(preset);
    if (typeof global.goToTab === 'function') global.goToTab('play', { setup: true });
    return preset;
  }

  function trainTournamentLeaks(report, opts) {
    opts = opts || {};
    var drill = (report && report.drills && report.drills[0]) || null;
    var leak = drill || (report && report.topLeaks && report.topLeaks[0]) || null;
    if (!leak) {
      if (global.applyPlaySetupConfig) {
        global.applyPlaySetupConfig({
          formatHub: 'mtt',
          gameType: 'mtt',
          scenario: 'rfi',
          practiceStreet: 'preflop',
          mttPhase: 'mid',
          handsTarget: 25
        });
      }
      if (typeof global.goToTab === 'function') global.goToTab('play', { setup: true });
      return null;
    }
    return trainLeak(leak, opts);
  }

  global.PTTournamentLeaksBridge = {
    LEAK_CLASSES: LEAK_CLASSES,
    PHASE_BUCKET_LABELS: PHASE_BUCKET_LABELS,
    phaseBucket: phaseBucket,
    buildSpotKey: buildSpotKey,
    errorsFromHand: errorsFromHand,
    errorsFromTournament: errorsFromTournament,
    recordHandErrors: recordHandErrors,
    recordTournamentErrors: recordTournamentErrors,
    aggregateLeaks: aggregateLeaks,
    topWorstHands: topWorstHands,
    dominantLeakByPhase: dominantLeakByPhase,
    recommendedDrills: recommendedDrills,
    buildReport: buildReport,
    trainLeak: trainLeak,
    trainTournamentLeaks: trainTournamentLeaks
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
