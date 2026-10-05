/**
 * Benchmarks de población MTT por arquetipo (early / short).
 * No son solver exacto: bandas típicas field online / regs / pros +
 * bandas de regresión del motor (cbet/AF/XR observadas tras calibración).
 * Usado por audit-villain-tournament-sim.js y docs.
 */
'use strict';

/** Bandas early (~40–100bb MTT 6-max). Valores en % salvo af (ratio). */
const EARLY = {
  nit:    { vpip: [12, 22], pfr: [10, 16], threeBet: [2, 7],  foldTo3Bet: [55, 85], steal: [20, 35], bbDefend: [25, 42], cbet: [30, 55], af: [1.5, 3.5], xrRate: [0.3, 3.5] },
  fish:   { vpip: [35, 55], pfr: [8, 22],  threeBet: [2, 7],  foldTo3Bet: [40, 75], steal: [25, 55], bbDefend: [45, 85], cbet: [32, 60], af: [0.4, 1.6], xrRate: [0.5, 5] },
  tag:    { vpip: [18, 30], pfr: [15, 22], threeBet: [3, 9],  foldTo3Bet: [55, 95], steal: [35, 52], bbDefend: [32, 55], cbet: [55, 85], af: [1.4, 3.2], xrRate: [1.5, 8] },
  lag:    { vpip: [28, 50], pfr: [22, 35], threeBet: [9, 22], foldTo3Bet: [40, 70], steal: [45, 68], bbDefend: [48, 75], cbet: [28, 60], af: [1.0, 2.4], xrRate: [6, 22] },
  maniac: { vpip: [40, 62], pfr: [28, 45], threeBet: [12, 30], foldTo3Bet: [30, 60], steal: [50, 75], bbDefend: [55, 90], cbet: [38, 70], af: [0.8, 2.2], xrRate: [10, 30] },
  pro:    { vpip: [22, 32], pfr: [18, 26], threeBet: [6, 14], foldTo3Bet: [50, 72], steal: [40, 58], bbDefend: [36, 58], cbet: [54, 78], af: [1.6, 3.2], xrRate: [4, 14] }
};

/** Short (~15–25bb): más jam/steal, VPIP similar o ligeramente ↑ en late. */
const SHORT = {
  nit:    { vpip: [14, 24], pfr: [12, 20], threeBet: [2, 8],  foldTo3Bet: [55, 90], steal: [25, 45], bbDefend: [24, 42], cbet: [20, 55], af: [1.5, 4.0], xrRate: [0.2, 3.5] },
  fish:   { vpip: [32, 52], pfr: [10, 24], threeBet: [2, 8],  foldTo3Bet: [40, 75], steal: [28, 55], bbDefend: [40, 80], cbet: [30, 58], af: [0.4, 1.8], xrRate: [0.4, 5] },
  tag:    { vpip: [20, 30], pfr: [16, 24], threeBet: [3, 11], foldTo3Bet: [50, 95], steal: [38, 58], bbDefend: [28, 55], cbet: [50, 88], af: [1.4, 3.5], xrRate: [1.2, 8] },
  lag:    { vpip: [30, 50], pfr: [22, 36], threeBet: [9, 22], foldTo3Bet: [40, 70], steal: [48, 72], bbDefend: [45, 75], cbet: [28, 58], af: [1.0, 2.6], xrRate: [5, 22] },
  maniac: { vpip: [40, 62], pfr: [28, 48], threeBet: [12, 30], foldTo3Bet: [28, 60], steal: [50, 78], bbDefend: [50, 90], cbet: [35, 70], af: [0.8, 2.4], xrRate: [8, 30] },
  pro:    { vpip: [24, 34], pfr: [18, 28], threeBet: [6, 14], foldTo3Bet: [48, 72], steal: [42, 62], bbDefend: [34, 58], cbet: [50, 78], af: [1.6, 3.5], xrRate: [3.5, 14] }
};

/** Push (≤12bb): jam widen late; VPIP agregado mesa denso según rol. */
const PUSH = {
  nit:    { vpip: [18, 32], pfr: [14, 28], threeBet: [0, 8],  foldTo3Bet: [50, 85], steal: [35, 55], bbDefend: [12, 35], cbet: [null, null], af: [1.2, 4.0], xrRate: [0, 3] },
  fish:   { vpip: [22, 42], pfr: [14, 32], threeBet: [0, 8],  foldTo3Bet: [35, 70], steal: [40, 70], bbDefend: [12, 40], cbet: [null, null], af: [0.5, 3.0], xrRate: [0, 4] },
  tag:    { vpip: [20, 34], pfr: [14, 30], threeBet: [0, 10], foldTo3Bet: [45, 75], steal: [40, 65], bbDefend: [12, 35], cbet: [null, null], af: [1.2, 4.0], xrRate: [0, 4] },
  lag:    { vpip: [22, 42], pfr: [15, 34], threeBet: [0, 12], foldTo3Bet: [40, 70], steal: [50, 75], bbDefend: [12, 40], cbet: [null, null], af: [0.8, 3.5], xrRate: [0, 6] },
  maniac: { vpip: [24, 48], pfr: [16, 40], threeBet: [0, 16], foldTo3Bet: [30, 65], steal: [55, 80], bbDefend: [12, 45], cbet: [null, null], af: [0.7, 3.5], xrRate: [0, 8] },
  pro:    { vpip: [22, 38], pfr: [15, 32], threeBet: [0, 12], foldTo3Bet: [40, 75], steal: [48, 75], bbDefend: [12, 35], cbet: [null, null], af: [1.0, 3.5], xrRate: [0, 5] }
};

/** Métricas HUD de presión/apuesta postflop por tipo. */
const BET_FREQ_KEYS = ['cbet', 'af', 'xrRate'];

/** Claves HUD completas reportadas en gaps. */
const HUD_KEYS = ['vpip', 'pfr', 'threeBet', 'foldTo3Bet', 'steal', 'bbDefend', 'cbet', 'af', 'xrRate'];

function forPhase(phase) {
  const p = String(phase || 'early').toLowerCase();
  if (p === 'short' || p === 'mid') return SHORT;
  if (p === 'push' || p === 'bubble') return p === 'push' ? PUSH : SHORT;
  if (p === 'hu' || p === 'ft') return SHORT;
  return EARLY;
}

function bandFor(role, phase) {
  const table = forPhase(phase);
  return table[role] || table.tag;
}

/**
 * Clasifica un valor vs banda [lo, hi].
 * @returns {'ok'|'low'|'high'|'skip'}
 */
function classify(value, band) {
  if (!band || band[0] == null || band[1] == null) return 'skip';
  if (value == null || !isFinite(value)) return 'skip';
  if (value < band[0]) return 'low';
  if (value > band[1]) return 'high';
  return 'ok';
}

function gapReport(stats, role, phase) {
  const band = bandFor(role, phase);
  const map = {
    vpip: stats.vpip,
    pfr: stats.pfr,
    threeBet: stats.threeBet,
    foldTo3Bet: stats.foldTo3Bet,
    steal: stats.steal,
    bbDefend: stats.bbDefend,
    cbet: stats.cbet,
    af: stats.af,
    xrRate: stats.xrRate
  };
  const out = {};
  HUD_KEYS.forEach(function (k) {
    const b = band[k];
    const v = map[k];
    const status = classify(v, b);
    out[k] = {
      value: v,
      band: b,
      status: status,
      delta: (v != null && b && b[0] != null)
        ? (v < b[0] ? v - b[0] : (v > b[1] ? v - b[1] : 0))
        : null
    };
  });
  return out;
}

module.exports = {
  EARLY,
  SHORT,
  PUSH,
  BET_FREQ_KEYS,
  HUD_KEYS,
  forPhase,
  bandFor,
  classify,
  gapReport
};
