/*
 * tournament/blinds.js — Reloj de ciegas por número de manos (mesa Hero).
 * Tras el schedule fijo, los niveles siguen subiendo (progresión geométrica).
 */
(function (global) {
  'use strict';

  var LEVEL_GROWTH = 1.5;
  var ANTE_FRAC = 0.125;

  function cloneSchedule(schedule) {
    return (schedule || []).map(function (lv) {
      return {
        level: Number(lv.level) || 1,
        sb: Number(lv.sb) || 10,
        bb: Number(lv.bb) || 20,
        ante: Number(lv.ante) || 0,
        hands: Math.max(1, Number(lv.hands) || 8)
      };
    });
  }

  function roundBlind(n) {
    n = Math.max(1, Math.round(Number(n) || 1));
    if (n < 20) return n;
    if (n < 100) return Math.round(n / 5) * 5;
    if (n < 500) return Math.round(n / 10) * 10;
    if (n < 2000) return Math.round(n / 25) * 25;
    if (n < 10000) return Math.round(n / 50) * 50;
    return Math.round(n / 100) * 100;
  }

  function nextBlindLevel(prev, handsPerLevel) {
    var sb = roundBlind(Math.max((prev.sb || 10) + 1, (prev.sb || 10) * LEVEL_GROWTH));
    var bb = roundBlind(Math.max(sb * 2, (prev.bb || 20) * LEVEL_GROWTH));
    if (bb < sb * 2) bb = sb * 2;
    var ante = 0;
    if ((prev.ante || 0) > 0 || bb >= 50) {
      ante = roundBlind(Math.max(1, bb * ANTE_FRAC));
    }
    return {
      level: (prev.level || 1) + 1,
      sb: sb,
      bb: bb,
      ante: ante,
      hands: Math.max(1, handsPerLevel || prev.hands || 8)
    };
  }

  function totalHands(sched) {
    var n = 0;
    for (var i = 0; i < sched.length; i++) n += sched[i].hands;
    return n;
  }

  /** Amplía el schedule hasta cubrir handIndex (niveles infinitos tras el fijo). */
  function extendSchedule(schedule, handIndex) {
    var sched = cloneSchedule(schedule);
    if (!sched.length) {
      sched = [{ level: 1, sb: 10, bb: 20, ante: 0, hands: 8 }];
    }
    var handsPer = sched[0].hands || 8;
    var target = Math.max(0, Number(handIndex) || 0);
    /* Evita que el “último” nivel fijo absorba todas las manos restantes. */
    while (totalHands(sched) <= target) {
      sched.push(nextBlindLevel(sched[sched.length - 1], handsPer));
    }
    return sched;
  }

  function levelIndexForHand(schedule, handIndex) {
    const sched = extendSchedule(schedule, handIndex);
    if (!sched.length) return 0;
    let remaining = Math.max(0, Number(handIndex) || 0);
    for (let i = 0; i < sched.length; i++) {
      const dur = sched[i].hands;
      if (remaining < dur) return i;
      remaining -= dur;
    }
    return sched.length - 1;
  }

  function currentLevel(schedule, handIndex) {
    const sched = extendSchedule(schedule, handIndex);
    const idx = levelIndexForHand(schedule, handIndex);
    return sched[idx] || { level: 1, sb: 10, bb: 20, ante: 0, hands: 8 };
  }

  function handsIntoLevel(schedule, handIndex) {
    const sched = extendSchedule(schedule, handIndex);
    let remaining = Math.max(0, Number(handIndex) || 0);
    for (let i = 0; i < sched.length; i++) {
      const dur = sched[i].hands;
      if (remaining < dur) return remaining;
      remaining -= dur;
    }
    return 0;
  }

  function handsUntilNext(schedule, handIndex) {
    const sched = extendSchedule(schedule, handIndex);
    const idx = levelIndexForHand(schedule, handIndex);
    const into = handsIntoLevel(schedule, handIndex);
    return Math.max(0, sched[idx].hands - into);
  }

  function nextLevel(schedule, handIndex) {
    const sched = extendSchedule(schedule, handIndex);
    const idx = levelIndexForHand(schedule, handIndex);
    if (idx + 1 < sched.length) return sched[idx + 1];
    return nextBlindLevel(sched[idx], sched[idx].hands);
  }

  function labelFor(level) {
    if (!level) return '';
    var s = 'Nv.' + level.level + ' · ' + level.sb + '/' + level.bb;
    if (level.ante > 0) s += ' ante ' + level.ante;
    return s;
  }

  global.PTTournamentBlinds = {
    LEVEL_GROWTH: LEVEL_GROWTH,
    cloneSchedule: cloneSchedule,
    extendSchedule: extendSchedule,
    nextBlindLevel: nextBlindLevel,
    levelIndexForHand: levelIndexForHand,
    currentLevel: currentLevel,
    handsIntoLevel: handsIntoLevel,
    handsUntilNext: handsUntilNext,
    nextLevel: nextLevel,
    labelFor: labelFor
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
