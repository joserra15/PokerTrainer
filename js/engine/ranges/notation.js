/*
 * notation.js — Expansor de notación de rangos y utilidades de mano.
 */
(function (global) {
  'use strict';

  const ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const VAL = {};
  ORDER.forEach((r, i) => { VAL[r] = i; });

  function expand(str) {
    const out = new Set();
    (str || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((tok) => {
      expandToken(tok).forEach((h) => out.add(h));
    });
    return Array.from(out);
  }

  function expandToken(tok) {
    let m = tok.match(/^([2-9TJQKA])\1\+$/);
    if (m) {
      const start = VAL[m[1]];
      const res = [];
      for (let v = start; v < ORDER.length; v++) res.push(ORDER[v] + ORDER[v]);
      return res;
    }
    m = tok.match(/^([2-9TJQKA])\1-([2-9TJQKA])\2$/);
    if (m) {
      let a = VAL[m[1]], b = VAL[m[2]];
      if (a > b) [a, b] = [b, a];
      const res = [];
      for (let v = a; v <= b; v++) res.push(ORDER[v] + ORDER[v]);
      return res;
    }
    m = tok.match(/^([2-9TJQKA])\1$/);
    if (m) return [tok];
    m = tok.match(/^([2-9TJQKA])([2-9TJQKA])([so])\+$/);
    if (m) {
      const hi = m[1], suit = m[3];
      const lo = VAL[m[2]], hiV = VAL[hi];
      const res = [];
      for (let v = lo; v < hiV; v++) res.push(hi + ORDER[v] + suit);
      return res;
    }
    m = tok.match(/^([2-9TJQKA])([2-9TJQKA])([so])-([2-9TJQKA])([2-9TJQKA])\3$/);
    if (m && m[1] === m[4]) {
      const hi = m[1], suit = m[3];
      let a = VAL[m[2]], b = VAL[m[5]];
      if (a > b) [a, b] = [b, a];
      const res = [];
      for (let v = a; v <= b; v++) res.push(hi + ORDER[v] + suit);
      return res;
    }
    m = tok.match(/^([2-9TJQKA])([2-9TJQKA])([so])$/);
    if (m) return [tok];
    return [];
  }

  function handCode(c1, c2) {
    let a = c1, b = c2;
    if (VAL[a[0]] < VAL[b[0]]) [a, b] = [b, a];
    if (a[0] === b[0]) return a[0] + b[0];
    return a[0] + b[0] + (a[1] === b[1] ? 's' : 'o');
  }

  function toSet(rangeStr) {
    return new Set(expand(rangeStr || ''));
  }

  global.GTORangesNotation = { ORDER, VAL, expand, expandToken, handCode, toSet, POSITIONS: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] };
})(window);
