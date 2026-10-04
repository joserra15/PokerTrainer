/*
 * tournament/table-speed.js — Preferencia de velocidad de animación en torneos.
 * veryFast = timings históricos; fast / normal multiplican delays de UI.
 */
(function (global) {
  'use strict';

  var KEY = 'pt_table_speed_v1';
  var MULTIPLIERS = {
    veryFast: 1,
    fast: 1.75,
    normal: 2.75
  };

  function normalize(v) {
    var s = String(v || '').toLowerCase();
    if (s === 'fast' || s === 'rapida' || s === 'rápida') return 'fast';
    if (s === 'normal') return 'normal';
    if (s === 'veryfast' || s === 'very_fast' || s === 'muyrapida' || s === 'muy_rapida'
      || s === 'muy rápida' || s === 'muy rapida') {
      return 'veryFast';
    }
    return 'veryFast';
  }

  function label(v) {
    var s = normalize(v);
    if (s === 'fast') return 'Rápida';
    if (s === 'normal') return 'Normal';
    return 'Muy rápida';
  }

  function multiplier(v) {
    var s = normalize(v);
    return MULTIPLIERS[s] != null ? MULTIPLIERS[s] : 1;
  }

  function load() {
    try {
      return normalize(global.localStorage && global.localStorage.getItem(KEY));
    } catch (e) {
      return 'veryFast';
    }
  }

  function save(speed) {
    var v = normalize(speed);
    try {
      if (global.localStorage) global.localStorage.setItem(KEY, v);
    } catch (e) { /* ignore */ }
    return v;
  }

  global.PTTournamentTableSpeed = {
    KEY: KEY,
    MULTIPLIERS: MULTIPLIERS,
    normalize: normalize,
    label: label,
    multiplier: multiplier,
    load: load,
    save: save
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
