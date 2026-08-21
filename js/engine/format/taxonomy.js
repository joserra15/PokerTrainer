/*
 * taxonomy.js — Contrato de formatos del entrenador v2 (cash / spin / mtt).
 * Fuente única para hubs, fases, intents y claves de fuga.
 */
(function (global) {
  'use strict';

  const FORMAT_HUBS = ['cash', 'spin', 'mtt'];
  const GAME_TYPES = ['cash6', 'cash9', 'spin3', 'mtt'];
  const PRACTICE_INTENTS = ['mixed', 'bluff_make', 'bluff_catch'];
  const MTT_PHASES = ['auto', 'early', 'mid', 'short', 'push', 'bubble'];
  const SPIN_PAYOUT_PRESETS = {
    '2x': [0.65, 0.35, 0],
    '3x': [0.70, 0.30, 0],
    '5x': [0.80, 0.20, 0]
  };

  const HUB_LABELS = { cash: 'Cash', spin: 'Spins', mtt: 'Torneos' };
  const INTENT_LABELS = {
    mixed: 'Value y mixed',
    bluff_make: 'Hacer faroles',
    bluff_catch: 'Cazar faroles'
  };
  const PHASE_LABELS = {
    auto: 'Auto (por stack)',
    early: 'Early',
    mid: 'Mid',
    short: 'Short',
    push: 'Push/fold',
    bubble: 'Burbuja'
  };

  function hubFromGameType(gameType) {
    const g = String(gameType || 'cash6');
    if (g.indexOf('spin') === 0) return 'spin';
    if (g === 'mtt' || g.indexOf('mtt') === 0 || g === 'sng') return 'mtt';
    return 'cash';
  }

  function defaultGameTypeForHub(hub) {
    if (hub === 'spin') return 'spin3';
    if (hub === 'mtt') return 'mtt';
    return 'cash6';
  }

  function normalizeHub(hub) {
    return FORMAT_HUBS.indexOf(hub) >= 0 ? hub : 'cash';
  }

  function normalizeIntent(intent) {
    return PRACTICE_INTENTS.indexOf(intent) >= 0 ? intent : 'mixed';
  }

  function normalizePhase(phase) {
    return MTT_PHASES.indexOf(phase) >= 0 ? phase : 'auto';
  }

  function phaseFromStackBB(stackBB, hub) {
    const bb = Number(stackBB) || 100;
    if (hub === 'spin') {
      if (bb <= 12) return 'push';
      if (bb <= 20) return 'mid';
      return 'early';
    }
    if (bb <= 12) return 'push';
    if (bb <= 25) return 'short';
    if (bb <= 45) return 'mid';
    return 'early';
  }

  /** Stacks del chip UI por hub (orden de mayor a menor). */
  const UI_STACK_DEPTHS = {
    cash: ['bb200', 'bb100', 'bb50', 'bb25'],
    spin: ['bb25', 'bb20', 'bb15', 'bb10'],
    mtt: ['bb200', 'bb100', 'bb50', 'bb40', 'bb25', 'bb20', 'bb15', 'bb10']
  };

  /**
   * Stacks coherentes con una fase explícita (o null = Auto → todos los del hub).
   * Alineado con phaseFromStackBB + chips disponibles en el entrenador.
   */
  function stackDepthsForPhase(hub, phase) {
    const h = normalizeHub(hub);
    const p = normalizePhase(phase);
    if (h === 'cash' || p === 'auto') return null;
    if (h === 'spin') {
      if (p === 'early') return ['bb25'];
      if (p === 'mid') return ['bb20', 'bb15'];
      if (p === 'short') return ['bb15'];
      if (p === 'push') return ['bb10'];
      if (p === 'bubble') return ['bb20', 'bb15'];
    }
    if (h === 'mtt') {
      if (p === 'early') return ['bb200', 'bb100', 'bb50', 'bb40'];
      if (p === 'mid') return ['bb40', 'bb25'];
      if (p === 'short') return ['bb25', 'bb20', 'bb15'];
      if (p === 'push') return ['bb10'];
      if (p === 'bubble') return ['bb25', 'bb20', 'bb15'];
    }
    return null;
  }

  /** Steal ~14–25 bb (chips UI en esa banda). Preferido: 20 bb. */
  function stackDepthsForSteal(hub) {
    const h = normalizeHub(hub);
    if (h === 'spin') return ['bb20', 'bb25', 'bb15'];
    if (h === 'mtt') return ['bb20', 'bb25', 'bb15'];
    return null;
  }

  function stackDepthsForPush() {
    return ['bb10'];
  }

  function defaultStackDepthForPhase(hub, phase) {
    const list = stackDepthsForPhase(hub, phase);
    const h = normalizeHub(hub);
    const p = normalizePhase(phase);
    if (!list || !list.length) {
      if (h === 'spin') return 'bb25';
      if (h === 'mtt') return 'bb50';
      return 'bb100';
    }
    function prefer(key) {
      return list.indexOf(key) >= 0 ? key : list[0];
    }
    if (h === 'spin') {
      if (p === 'mid' || p === 'bubble') return prefer('bb20');
      if (p === 'short') return prefer('bb15');
      if (p === 'push') return prefer('bb10');
      return prefer('bb25');
    }
    if (h === 'mtt') {
      if (p === 'early') return prefer('bb50');
      if (p === 'mid') return prefer('bb25');
      if (p === 'short') return prefer('bb20');
      if (p === 'bubble') return prefer('bb25');
      if (p === 'push') return prefer('bb10');
      return list[0];
    }
    return list[0];
  }

  function stackBBFromDepthKey(stackDepth) {
    if (stackDepth == null || stackDepth === '') return null;
    const key = String(stackDepth);
    const m = /^bb(\d+(?:\.\d+)?)$/.exec(key);
    if (m) {
      const n = Number(m[1]);
      return n > 0 ? n : null;
    }
    return null;
  }

  function stackFitsPhase(hub, phase, stackDepthOrBB) {
    const allowed = stackDepthsForPhase(hub, phase);
    if (!allowed) return true;
    let key = stackDepthOrBB;
    if (typeof stackDepthOrBB === 'number' || (/^\d+(\.\d+)?$/.test(String(stackDepthOrBB)))) {
      key = 'bb' + Math.round(Number(stackDepthOrBB));
    }
    return allowed.indexOf(String(key)) >= 0;
  }

  /**
   * Stacks permitidos en el UI según hub + fase + escenario.
   * Con fase explícita: un solo stack representativo (no se configura a mano).
   * Push/steal con Auto: banda coherente del escenario.
   */
  function allowedStackDepths(hub, phase, scenario) {
    const h = normalizeHub(hub);
    if (h === 'cash') return (UI_STACK_DEPTHS.cash || []).slice();
    const base = (UI_STACK_DEPTHS[h] || UI_STACK_DEPTHS.cash).slice();
    const p = normalizePhase(phase);
    const sc = String(scenario || '');

    if (p !== 'auto') {
      let only = defaultStackDepthForPhase(h, p);
      if (sc === 'push') {
        only = stackDepthsForPush()[0] || 'bb10';
      } else if (sc === 'steal') {
        const steal = stackDepthsForSteal(h) || [];
        if (steal.indexOf(only) < 0) only = steal[0] || 'bb20';
      }
      return [only];
    }

    if (sc === 'push') return stackDepthsForPush().slice();
    if (sc === 'steal') return (stackDepthsForSteal(h) || base).slice();
    // Fase Auto: stacks del hub + opción Aleatorio (muestrea por mano).
    return base.concat(['random']);
  }

  function clampStackDepth(hub, phase, scenario, stackDepth) {
    const allowed = allowedStackDepths(hub, phase, scenario);
    const key = String(stackDepth || '');
    if (allowed.indexOf(key) >= 0) return key;
    const sc = String(scenario || '');
    if (sc === 'push') return (stackDepthsForPush()[0] || 'bb10');
    if (sc === 'steal') {
      const steal = stackDepthsForSteal(hub);
      return (steal && steal[0]) || 'bb20';
    }
    const p = normalizePhase(phase);
    if (p !== 'auto') return defaultStackDepthForPhase(hub, p);
    return allowed[0] || defaultStackDepthForPhase(hub, 'auto');
  }

  /** Pool de stacks concretos para muestrear cuando stackDepth=random. */
  function randomStackPool(hub, phase, scenario) {
    const h = normalizeHub(hub);
    const p = normalizePhase(phase);
    const sc = String(scenario || '');
    if (h === 'cash') return (UI_STACK_DEPTHS.cash || []).slice();
    if (sc === 'push') return stackDepthsForPush().slice();
    if (sc === 'steal') return (stackDepthsForSteal(h) || UI_STACK_DEPTHS[h] || []).slice();
    if (p !== 'auto') return [defaultStackDepthForPhase(h, p)];
    return (UI_STACK_DEPTHS[h] || UI_STACK_DEPTHS.cash).slice();
  }

  function pickRandomStackDepth(hub, phase, scenario, rnd) {
    const pool = randomStackPool(hub, phase, scenario);
    if (!pool.length) return defaultStackDepthForPhase(hub, 'auto');
    const r = typeof rnd === 'function' ? rnd() : Math.random();
    const idx = Math.min(pool.length - 1, Math.floor(r * pool.length));
    return pool[idx];
  }

  /** true si el stack del héroe no debe elegirse libremente (fase fija o push/steal). */
  function stackSelectionLocked(hub, phase, scenario) {
    const h = normalizeHub(hub);
    if (h === 'cash') return false;
    const p = normalizePhase(phase);
    const sc = String(scenario || '');
    if (sc === 'push' || sc === 'steal') return true;
    if (p !== 'auto') return true;
    return false;
  }

  function resolvePhase(config) {
    const hub = normalizeHub(config && config.formatHub || hubFromGameType(config && config.gameType));
    const phase = normalizePhase(config && config.mttPhase);
    if (phase !== 'auto') return phase;
    const stackBB = Number(config && config.stackBB) || 100;
    return phaseFromStackBB(stackBB, hub);
  }

  function defaultAnteBB(config) {
    const hub = normalizeHub(config && config.formatHub || hubFromGameType(config && config.gameType));
    if (hub === 'cash') return 0;
    if (hub === 'spin') return 0;
    const phase = resolvePhase(config);
    if (phase === 'early') return 0.1;
    if (phase === 'mid') return 0.125;
    if (phase === 'short' || phase === 'bubble') return 0.15;
    if (phase === 'push') return 0.2;
    return 0.125;
  }

  /**
   * Estructura de blinds simbólica para HUD (estudio).
   * bb del entrenador = 1 unidad; antePct = anteBB / bb.
   */
  function blindStructureFor(config) {
    const hub = normalizeHub(config && config.formatHub || hubFromGameType(config && config.gameType));
    if (hub === 'cash') return null;
    const phase = resolvePhase(config);
    const stackBB = Number(config && config.stackBB) || 25;
    const anteBB = config && config.anteBB != null ? Number(config.anteBB) : defaultAnteBB(config);
    let level = 1;
    let sb = 0.5;
    let bb = 1;
    if (hub === 'spin') {
      if (stackBB <= 12) { level = 8; sb = 150; bb = 300; }
      else if (stackBB <= 15) { level = 6; sb = 100; bb = 200; }
      else if (stackBB <= 20) { level = 4; sb = 50; bb = 100; }
      else { level = 2; sb = 25; bb = 50; }
    } else {
      if (phase === 'push' || stackBB <= 12) { level = 18; sb = 2000; bb = 4000; }
      else if (phase === 'bubble' || phase === 'short' || stackBB <= 25) { level = 14; sb = 1000; bb = 2000; }
      else if (phase === 'mid' || stackBB <= 45) { level = 10; sb = 400; bb = 800; }
      else { level = 5; sb = 100; bb = 200; }
    }
    const antePct = bb > 0 ? Math.round((anteBB / 1) * 1000) / 10 : 0; // ante en % de 1bb trainer
    return {
      level: level,
      sb: sb,
      bb: bb,
      anteBB: anteBB || 0,
      antePct: antePct,
      label: 'Nv.' + level + ' · ' + sb + '/' + bb,
      anteLabel: anteBB > 0 ? ('Ante ' + antePct + '%') : null
    };
  }

  function spinPayouts(preset) {
    const key = preset && SPIN_PAYOUT_PRESETS[preset] ? preset : '2x';
    return SPIN_PAYOUT_PRESETS[key].slice();
  }

  function isTournamentHub(hub) {
    return hub === 'spin' || hub === 'mtt';
  }

  function usesIcm(config) {
    const hub = normalizeHub(config && config.formatHub || hubFromGameType(config && config.gameType));
    if (!isTournamentHub(hub)) return false;
    const phase = resolvePhase(Object.assign({}, config || {}, { formatHub: hub }));
    if (hub === 'spin') return true;
    return phase === 'bubble' || phase === 'push' || phase === 'short';
  }

  function spotTags(meta) {
    const m = meta || {};
    const hub = normalizeHub(m.formatHub || hubFromGameType(m.gameType));
    const intent = normalizeIntent(m.practiceIntent || m.intent);
    const phase = m.mttPhase && m.mttPhase !== 'auto' ? m.mttPhase : (m.phase || null);
    return {
      formatHub: hub,
      gameType: m.gameType || defaultGameTypeForHub(hub),
      practiceIntent: intent,
      phase: phase,
      street: m.street || null
    };
  }

  function formatSpotKey(baseKey, tags) {
    const t = spotTags(tags);
    return [baseKey || 'spot', t.formatHub, t.practiceIntent, t.phase || '-', t.street || '-'].join('|');
  }

  global.PTFormatTaxonomy = {
    FORMAT_HUBS: FORMAT_HUBS,
    GAME_TYPES: GAME_TYPES,
    PRACTICE_INTENTS: PRACTICE_INTENTS,
    MTT_PHASES: MTT_PHASES,
    SPIN_PAYOUT_PRESETS: SPIN_PAYOUT_PRESETS,
    HUB_LABELS: HUB_LABELS,
    INTENT_LABELS: INTENT_LABELS,
    PHASE_LABELS: PHASE_LABELS,
    hubFromGameType: hubFromGameType,
    defaultGameTypeForHub: defaultGameTypeForHub,
    normalizeHub: normalizeHub,
    normalizeIntent: normalizeIntent,
    normalizePhase: normalizePhase,
    phaseFromStackBB: phaseFromStackBB,
    UI_STACK_DEPTHS: UI_STACK_DEPTHS,
    stackDepthsForPhase: stackDepthsForPhase,
    stackDepthsForSteal: stackDepthsForSteal,
    stackDepthsForPush: stackDepthsForPush,
    defaultStackDepthForPhase: defaultStackDepthForPhase,
    stackBBFromDepthKey: stackBBFromDepthKey,
    stackFitsPhase: stackFitsPhase,
    allowedStackDepths: allowedStackDepths,
    clampStackDepth: clampStackDepth,
    randomStackPool: randomStackPool,
    pickRandomStackDepth: pickRandomStackDepth,
    stackSelectionLocked: stackSelectionLocked,
    resolvePhase: resolvePhase,
    defaultAnteBB: defaultAnteBB,
    blindStructureFor: blindStructureFor,
    spinPayouts: spinPayouts,
    isTournamentHub: isTournamentHub,
    usesIcm: usesIcm,
    spotTags: spotTags,
    formatSpotKey: formatSpotKey
  };
})(typeof window !== 'undefined' ? window : globalThis);
