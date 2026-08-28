/*
 * trainer-leak-presets.js — Presets de entrenador por tipo de leak (Fase 4).
 * Mapea fugas agregadas → escenario + calle + manos objetivo 25/50/100.
 */
(function (global) {
  'use strict';

  var HANDS_TARGETS = [25, 50, 100];

  var TYPE_PRESETS = {
    RFI: {
      formatHub: 'cash',
      gameType: 'cash6',
      scenario: 'rfi',
      practiceStreet: 'preflop',
      handRange: 'borderline',
      heroPos: 'random',
      villainLevel: 'pro',
      handsTarget: 50
    },
    vsRFI: {
      formatHub: 'cash',
      gameType: 'cash6',
      scenario: '3bet',
      practiceStreet: 'preflop',
      handRange: 'borderline',
      heroPos: 'random',
      villainLevel: 'pro',
      handsTarget: 50
    },
    face3bet: {
      formatHub: 'cash',
      gameType: 'cash6',
      scenario: 'face3bet',
      practiceStreet: 'preflop',
      handRange: 'borderline',
      heroPos: 'random',
      villainLevel: 'pro',
      handsTarget: 50
    },
    squeeze: {
      formatHub: 'cash',
      gameType: 'cash6',
      scenario: 'squeeze',
      practiceStreet: 'preflop',
      handRange: 'borderline',
      heroPos: 'random',
      villainLevel: 'pro',
      handsTarget: 50
    },
    face4bet: {
      formatHub: 'cash',
      gameType: 'cash6',
      scenario: '4bet',
      practiceStreet: 'preflop',
      handRange: 'borderline',
      heroPos: 'random',
      villainLevel: 'pro',
      handsTarget: 25
    },
    cold4bet: {
      formatHub: 'cash',
      gameType: 'cash6',
      scenario: '4bet',
      practiceStreet: 'preflop',
      handRange: 'borderline',
      heroPos: 'random',
      villainLevel: 'pro',
      handsTarget: 25
    },
    sbLimp: {
      formatHub: 'cash',
      gameType: 'cash6',
      scenario: 'iso',
      practiceStreet: 'preflop',
      handRange: 'borderline',
      heroPos: 'random',
      villainLevel: 'pro',
      handsTarget: 50
    },
    bbVsSbLimp: {
      formatHub: 'cash',
      gameType: 'cash6',
      scenario: 'bbvsb',
      practiceStreet: 'preflop',
      handRange: 'borderline',
      heroPos: 'BB',
      villainLevel: 'pro',
      handsTarget: 50
    },
    postflop: {
      formatHub: 'cash',
      gameType: 'cash6',
      scenario: 'random',
      practiceStreet: 'flop',
      handRange: 'all',
      heroPos: 'random',
      villainLevel: 'pro',
      handsTarget: 50
    }
  };

  var STREET_PRACTICE = {
    flop: 'flop',
    turn: 'turn',
    river: 'river',
    preflop: 'preflop'
  };

  function parseLeakKey(key) {
    if (global.PTLeaks && global.PTLeaks.parseLeakKey) {
      return global.PTLeaks.parseLeakKey(key);
    }
    var parts = String(key || '').split('|');
    return { type: parts[0] || '', street: parts[2] || 'preflop' };
  }

  function presetForLeak(leak, handsTarget) {
    leak = leak || {};
    var parsed = parseLeakKey(leak.key);
    var type = parsed.type || 'postflop';
    var street = parsed.street || 'preflop';
    var base = TYPE_PRESETS[type] || TYPE_PRESETS.postflop;
    var cfg = {};
    var k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) cfg[k] = base[k];
    if (STREET_PRACTICE[street]) cfg.practiceStreet = STREET_PRACTICE[street];
    if (handsTarget != null && HANDS_TARGETS.indexOf(Number(handsTarget)) >= 0) {
      cfg.handsTarget = Number(handsTarget);
    }
    if (global.PTAIReport && typeof global.PTAIReport.focusFromLeak === 'function') {
      var focus = global.PTAIReport.focusFromLeak(leak);
      if (focus && focus.scenario) cfg.scenario = focus.scenario;
      if (focus && focus.street && STREET_PRACTICE[focus.street]) {
        cfg.practiceStreet = STREET_PRACTICE[focus.street];
      }
    }
    return cfg;
  }

  function applyPreset(leak, handsTarget) {
    var cfg = presetForLeak(leak, handsTarget);
    if (global.applyPlaySetupConfig) {
      global.applyPlaySetupConfig(cfg);
    }
    if (typeof global.goToTab === 'function') {
      global.goToTab('play', { setup: true });
    }
    return cfg;
  }

  global.PTTrainerLeakPresets = {
    HANDS_TARGETS: HANDS_TARGETS,
    TYPE_PRESETS: TYPE_PRESETS,
    presetForLeak: presetForLeak,
    applyPreset: applyPreset
  };
})(typeof window !== 'undefined' ? window : globalThis);
