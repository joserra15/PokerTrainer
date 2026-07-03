/*
 * hhUtils.js — Utilidades compartidas para parsers de historiales de manos.
 */
(function (global) {
  'use strict';

  function num(s) {
    if (s == null) return 0;
    s = String(s).trim().replace(/\s|[€$£]/g, '');
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.indexOf(',') >= 0) s = s.replace(',', '.');
    const v = parseFloat(s);
    return isNaN(v) ? 0 : v;
  }

  function cardsFrom(str) {
    const m = str.match(/[2-9TJQKA][shdc]/g) || str.match(/(?:10|[2-9TJQKA])[shdc]/g);
    if (!m) return [];
    return m.map((c) => c.replace('10', 'T'));
  }

  const LABELS_FROM_MID = ['CO', 'HJ', 'UTG', 'UTG1', 'UTG2'];

  function assignPositions(hand) {
    const sorted = hand.seats.slice().sort((a, b) => a.seat - b.seat);
    const n = sorted.length;
    const btnIdx = sorted.findIndex((s) => s.seat === hand.buttonSeat);
    if (btnIdx < 0) return;
    const order = [];
    for (let i = 0; i < n; i++) order.push(sorted[(btnIdx + i) % n]);
    const pos = hand.positions;
    if (n === 2) { pos[order[0].name] = 'SB'; pos[order[1].name] = 'BB'; return; }
    pos[order[0].name] = 'BTN';
    pos[order[1].name] = 'SB';
    pos[order[2].name] = 'BB';
    const middle = order.slice(3);
    for (let i = 0; i < middle.length; i++) {
      pos[middle[middle.length - 1 - i].name] = LABELS_FROM_MID[i] || ('EP' + i);
    }
    if (hand.blinds.sb) pos[hand.blinds.sb] = 'SB';
    if (hand.blinds.bb) pos[hand.blinds.bb] = 'BB';
  }

  global.PTHHUtils = { num, cardsFrom, assignPositions, LABELS_FROM_MID };
})(window);
