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
    resolvePhase: resolvePhase,
    defaultAnteBB: defaultAnteBB,
    spinPayouts: spinPayouts,
    isTournamentHub: isTournamentHub,
    usesIcm: usesIcm,
    spotTags: spotTags,
    formatSpotKey: formatSpotKey
  };
})(typeof window !== 'undefined' ? window : globalThis);
