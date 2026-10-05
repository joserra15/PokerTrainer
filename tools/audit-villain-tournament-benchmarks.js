/**
 * Benchmarks de población MTT por arquetipo (early / short).
 * No son solver exacto: bandas típicas field online / regs / pros.
 * Usado por audit-villain-tournament-sim.js y docs.
 */
'use strict';

/** Bandas early (~40–100bb MTT 6-max). Valores en %. */
const EARLY = {
  nit:    { vpip: [12, 18], pfr: [10, 14], threeBet: [3, 6],  foldTo3Bet: [70, 85], steal: [20, 30], bbDefend: [25, 35], cbet: [45, 60] },
  fish:   { vpip: [35, 55], pfr: [8, 18],  threeBet: [2, 6],  foldTo3Bet: [40, 60], steal: [25, 40], bbDefend: [45, 65], cbet: [40, 55] },
  tag:    { vpip: [18, 24], pfr: [15, 20], threeBet: [6, 9],  foldTo3Bet: [60, 72], steal: [35, 45], bbDefend: [40, 50], cbet: [60, 72] },
  lag:    { vpip: [28, 38], pfr: [22, 30], threeBet: [9, 14], foldTo3Bet: [50, 65], steal: [45, 60], bbDefend: [50, 62], cbet: [65, 80] },
  maniac: { vpip: [40, 60], pfr: [30, 45], threeBet: [12, 20], foldTo3Bet: [35, 55], steal: [55, 75], bbDefend: [55, 70], cbet: [70, 90] },
  pro:    { vpip: [22, 30], pfr: [18, 24], threeBet: [6, 12], foldTo3Bet: [55, 68], steal: [42, 55], bbDefend: [40, 58], cbet: [60, 75] }
};

/** Short (~15–25bb): más jam/steal, VPIP similar o ligeramente ↑ en late. */
const SHORT = {
  nit:    { vpip: [14, 22], pfr: [12, 18], threeBet: [4, 8],  foldTo3Bet: [65, 80], steal: [25, 40], bbDefend: [28, 40], cbet: [50, 65] },
  fish:   { vpip: [32, 50], pfr: [10, 22], threeBet: [3, 8],  foldTo3Bet: [40, 60], steal: [28, 45], bbDefend: [40, 60], cbet: [45, 60] },
  tag:    { vpip: [20, 28], pfr: [17, 24], threeBet: [7, 11], foldTo3Bet: [55, 70], steal: [40, 55], bbDefend: [42, 55], cbet: [60, 75] },
  lag:    { vpip: [30, 42], pfr: [24, 34], threeBet: [10, 16], foldTo3Bet: [45, 62], steal: [50, 68], bbDefend: [48, 62], cbet: [65, 82] },
  maniac: { vpip: [40, 62], pfr: [32, 48], threeBet: [12, 22], foldTo3Bet: [30, 50], steal: [55, 78], bbDefend: [50, 70], cbet: [70, 90] },
  pro:    { vpip: [24, 34], pfr: [18, 28], threeBet: [6, 14], foldTo3Bet: [50, 68], steal: [45, 62], bbDefend: [38, 58], cbet: [58, 75] }
};

/** Push (≤12bb): jam widen late; VPIP agregado mesa ~22–35 según rol. */
const PUSH = {
  nit:    { vpip: [18, 30], pfr: [14, 26], threeBet: [0, 8],  foldTo3Bet: [50, 85], steal: [35, 55], bbDefend: [12, 35], cbet: [null, null] },
  fish:   { vpip: [22, 40], pfr: [14, 30], threeBet: [0, 8],  foldTo3Bet: [35, 70], steal: [40, 70], bbDefend: [12, 40], cbet: [null, null] },
  tag:    { vpip: [20, 32], pfr: [14, 28], threeBet: [0, 10], foldTo3Bet: [45, 75], steal: [40, 65], bbDefend: [12, 35], cbet: [null, null] },
  lag:    { vpip: [22, 40], pfr: [15, 32], threeBet: [0, 12], foldTo3Bet: [40, 70], steal: [50, 75], bbDefend: [12, 40], cbet: [null, null] },
  maniac: { vpip: [24, 45], pfr: [16, 38], threeBet: [0, 14], foldTo3Bet: [30, 65], steal: [55, 80], bbDefend: [12, 45], cbet: [null, null] },
  pro:    { vpip: [22, 36], pfr: [15, 30], threeBet: [0, 10], foldTo3Bet: [40, 75], steal: [48, 75], bbDefend: [12, 35], cbet: [null, null] }
};

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
  const keys = ['vpip', 'pfr', 'threeBet', 'foldTo3Bet', 'steal', 'bbDefend', 'cbet'];
  const map = {
    vpip: stats.vpip,
    pfr: stats.pfr,
    threeBet: stats.threeBet,
    foldTo3Bet: stats.foldTo3Bet,
    steal: stats.steal,
    bbDefend: stats.bbDefend,
    cbet: stats.cbet
  };
  const out = {};
  keys.forEach(function (k) {
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
  forPhase,
  bandFor,
  classify,
  gapReport
};
