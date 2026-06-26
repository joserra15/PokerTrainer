/*
 * variants.js — Tablas de rangos por formato (9-max, MTT) y profundidad base.
 */
(function (global) {
  'use strict';

  const D = function () { return global.GTORangesData || {}; };

  /** MTT ~40-60bb efectivos: opens más tight. */
  const OPEN_RAISE_MTT = {
    UTG: { raise: '77+, ATs+, KQs, AJo+, KQo', mix: '66, A5s-A2s, KJs, QJs' },
    HJ: { raise: '66+, A9s+, A5s-A2s, KTs+, QTs+, JTs, ATo+, KJo+', mix: '55, K9s, Q9s, 98s' },
    CO: { raise: '55+, A5s+, K9s+, Q9s+, J9s+, T9s, 98s, A9o+, KTo+, QTo+', mix: '44, A4s-A2s, 87s, K9o' },
    BTN: { raise: '44+, A2s+, K7s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, A7o+, K9o+, Q9o+, J9o+', mix: '33, 65s, A5o-A2o' },
    SB: { raise: '55+, A5s+, K8s+, Q9s+, J9s+, T9s, 98s, A8o+, KTo+, QTo+', mix: '44, A4s-A2s, 87s, JTo' }
  };

  /** Cash 9-max: progresión más tight en EP. */
  const OPEN_RAISE_9MAX = {
    UTG: { raise: '88+, ATs+, KQs, AJo+, KQo', mix: '77, A5s-A4s, KJs, QJs' },
    UTG1: { raise: '77+, ATs+, KJs+, QJs, AJo+, KQo', mix: '66, A5s-A2s, KTs, JTs' },
    UTG2: { raise: '66+, A9s+, A5s-A2s, KTs+, QTs+, JTs, ATo+, KJo+', mix: '55, K9s, Q9s, 98s' },
    LJ: { raise: '55+, A8s+, A5s-A2s, K9s+, Q9s+, J9s+, T9s, A9o+, KTo+, QJo', mix: '44, 98s, 87s, A8o' },
    HJ: { raise: '22+, A9s+, A5s-A2s, KTs+, QTs+, JTs, T9s, 98s, 87s, 76s, 65s, ATo+, KJo+, QJo', mix: 'A8s, K9s, Q9s, J9s, 54s, KTo' },
    CO: { raise: '22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 97s+, 87s, 76s, 65s, 54s, A9o+, KTo+, QTo+, JTo', mix: 'K8s, Q8s, J8s, 86s, A8o, K9o' },
    BTN: { raise: '22+, A2s+, K5s+, Q7s+, J7s+, T7s+, 96s+, 86s+, 75s+, 64s+, 54s, 43s, A2o+, K8o+, Q9o+, J9o+, T9o', mix: 'K2s-K4s, Q5s, Q6s, 53s, K7o, Q8o' },
    SB: { raise: '22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, A7o+, K9o+, QTo+, JTo', mix: 'K2s-K5s, Q6s, Q7s, J7s, 64s, A2o-A6o' }
  };

  global.GTORangesVariants = {
    OPEN_RAISE_MTT,
    OPEN_RAISE_9MAX
  };
})(window);
