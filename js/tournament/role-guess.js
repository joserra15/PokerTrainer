/*
 * tournament/role-guess.js — Guesses de rol de villanos + scoring / XP.
 */
(function (global) {
  'use strict';

  var XP_PER_CORRECT = 15;
  var XP_CAP = 150;

  var ROLE_LABELS = {
    fish: 'Fish',
    nit: 'Nit',
    tag: 'TAG',
    lag: 'LAG',
    maniac: 'Maníaco',
    pro: 'Pro'
  };

  function setGuess(state, playerId, roleId) {
    if (!state || !playerId) return;
    var ids = (global.PTTournamentConfig && global.PTTournamentConfig.ROLE_IDS) ||
      Object.keys(ROLE_LABELS);
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
    return {
      total: total,
      correct: correct,
      accuracy: accuracy,
      details: details,
      xp: xp
    };
  }

  global.PTTournamentRoleGuess = {
    ROLE_LABELS: ROLE_LABELS,
    XP_PER_CORRECT: XP_PER_CORRECT,
    XP_CAP: XP_CAP,
    setGuess: setGuess,
    clearGuess: clearGuess,
    score: score
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
