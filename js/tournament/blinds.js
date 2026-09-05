/*
 * tournament/blinds.js — Reloj de ciegas por número de manos (mesa Hero).
 */
(function (global) {
  'use strict';

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

  function levelIndexForHand(schedule, handIndex) {
    const sched = cloneSchedule(schedule);
    if (!sched.length) return 0;
    let remaining = Math.max(0, Number(handIndex) || 0);
    for (let i = 0; i < sched.length; i++) {
      const dur = sched[i].hands;
      if (remaining < dur) return i;
      remaining -= dur;
      if (i === sched.length - 1) return i;
    }
    return sched.length - 1;
  }

  function currentLevel(schedule, handIndex) {
    const sched = cloneSchedule(schedule);
    const idx = levelIndexForHand(sched, handIndex);
    return sched[idx] || { level: 1, sb: 10, bb: 20, ante: 0, hands: 8 };
  }

  function handsIntoLevel(schedule, handIndex) {
    const sched = cloneSchedule(schedule);
    let remaining = Math.max(0, Number(handIndex) || 0);
    for (let i = 0; i < sched.length; i++) {
      const dur = sched[i].hands;
      if (remaining < dur) return remaining;
      remaining -= dur;
      if (i === sched.length - 1) return dur;
    }
    return 0;
  }

  function handsUntilNext(schedule, handIndex) {
    const sched = cloneSchedule(schedule);
    const idx = levelIndexForHand(sched, handIndex);
    if (idx >= sched.length - 1) return null;
    const into = handsIntoLevel(sched, handIndex);
    return Math.max(0, sched[idx].hands - into);
  }

  function nextLevel(schedule, handIndex) {
    const sched = cloneSchedule(schedule);
    const idx = levelIndexForHand(sched, handIndex);
    if (idx >= sched.length - 1) return null;
    return sched[idx + 1];
  }

  function labelFor(level) {
    if (!level) return '';
    var s = 'Nv.' + level.level + ' · ' + level.sb + '/' + level.bb;
    if (level.ante > 0) s += ' ante ' + level.ante;
    return s;
  }

  global.PTTournamentBlinds = {
    cloneSchedule: cloneSchedule,
    levelIndexForHand: levelIndexForHand,
    currentLevel: currentLevel,
    handsIntoLevel: handsIntoLevel,
    handsUntilNext: handsUntilNext,
    nextLevel: nextLevel,
    labelFor: labelFor
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
