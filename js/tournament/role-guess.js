/*
 * tournament/role-guess.js — Guesses de rol de villanos + scoring / XP / colores.
 */
(function (global) {
  'use strict';

  var XP_PER_CORRECT = 15;
  var KOINS_PER_CORRECT = 2;
  var XP_CAP = 150;

  var ROLE_LABELS = {
    fish: 'Fish (loose-pasivo)',
    nit: 'Nit (tight-pasivo)',
    tag: 'TAG (tight-agresivo)',
    lag: 'LAG (loose-agresivo)',
    maniac: 'Maníaco (hiper-agresivo)',
    pro: 'Pro (GTO+)'
  };

  var ROLE_SHORT = {
    fish: 'Fish',
    nit: 'Nit',
    tag: 'TAG',
    lag: 'LAG',
    maniac: 'Maníaco',
    pro: 'Pro'
  };

  /* Colores distintos y legibles sobre mesa oscura (sin púrpura). */
  var ROLE_COLORS = {
    fish: '#5a9e6e',
    nit: '#5b7c99',
    tag: '#2d8f5f',
    lag: '#c47a22',
    maniac: '#c44545',
    pro: '#3d6f8c'
  };

  function roleIds() {
    return (global.PTTournamentConfig && global.PTTournamentConfig.ROLE_IDS) ||
      Object.keys(ROLE_LABELS);
  }

  function shortLabel(roleId) {
    return ROLE_SHORT[roleId] || String(roleId || '');
  }

  function color(roleId) {
    return ROLE_COLORS[roleId] || '#6b7280';
  }

  function setGuess(state, playerId, roleId) {
    if (!state || !playerId) return;
    var ids = roleIds();
    if (ids.indexOf(roleId) < 0) return;
    var p = (state.players || []).find(function (x) { return x.id === playerId; });
    if (!p || p.isHero) return;
    state.heroGuesses = state.heroGuesses || {};
    state.heroGuesses[playerId] = roleId;
  }

  function clearGuess(state, playerId) {
    if (!state || !state.heroGuesses) return;
    delete state.heroGuesses[playerId];
  }

  function score(state) {
    var guesses = (state && state.heroGuesses) || {};
    var details = [];
    var correct = 0;
    var total = 0;
    (state.players || []).forEach(function (p) {
      if (!p || p.isHero || !p.roleId) return;
      var guess = guesses[p.id] || null;
      if (!guess) return;
      total += 1;
      var ok = guess === p.roleId;
      if (ok) correct += 1;
      details.push({
        id: p.id,
        name: p.name,
        actual: p.roleId,
        guess: guess,
        ok: ok
      });
    });
    var accuracy = total ? Math.round((correct / total) * 1000) / 10 : 0;
    var xp = Math.min(XP_CAP, correct * XP_PER_CORRECT);
    var koins = correct * KOINS_PER_CORRECT;
    return {
      total: total,
      correct: correct,
      accuracy: accuracy,
      details: details,
      xp: xp,
      koins: koins
    };
  }

  global.PTTournamentRoleGuess = {
    ROLE_LABELS: ROLE_LABELS,
    ROLE_SHORT: ROLE_SHORT,
    ROLE_COLORS: ROLE_COLORS,
    XP_PER_CORRECT: XP_PER_CORRECT,
    KOINS_PER_CORRECT: KOINS_PER_CORRECT,
    XP_CAP: XP_CAP,
    shortLabel: shortLabel,
    color: color,
    setGuess: setGuess,
    clearGuess: clearGuess,
    score: score
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
