/*
 * ranges.js — Fachada de compatibilidad sobre engine/ranges.
 */
(function (global) {
  'use strict';

  const N = global.GTORangesNotation;
  const D = global.GTORangesData;

  global.Ranges = {
    POSITIONS: N.POSITIONS,
    expand: N.expand,
    expandToken: N.expandToken,
    handCode: N.handCode,
    toSet: N.toSet,
    OPEN_RAISE: D.OPEN_RAISE,
    VS_RFI: D.VS_RFI,
    VAL: N.VAL,
    ORDER: N.ORDER
  };
})(window);
