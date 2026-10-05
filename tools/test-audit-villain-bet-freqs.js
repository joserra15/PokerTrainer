#!/usr/bin/env node
/**
 * Regresión: frecuencias de apuesta (cbet / AF / XR) por tipo de villano.
 * Ejecuta sim early mono-rol × 6 arquetipos y aplica assertBands.
 *
 * Run: node tools/test-audit-villain-bet-freqs.js
 */
'use strict';

const assert = require('assert');
const Bench = require('./audit-villain-tournament-benchmarks');
const Sim = require('./audit-villain-tournament-sim');

assert.ok(Array.isArray(Bench.BET_FREQ_KEYS) && Bench.BET_FREQ_KEYS.indexOf('cbet') >= 0);
assert.ok(Bench.EARLY.pro.cbet[0] < Bench.EARLY.pro.cbet[1]);
assert.ok(Bench.EARLY.pro.af[0] < Bench.EARLY.pro.af[1]);
assert.ok(Bench.EARLY.maniac.xrRate[0] > Bench.EARLY.nit.xrRate[1]
  || Bench.EARLY.maniac.xrRate[0] >= 8, 'maniac XR band above nit');

const report = Sim.main([
  'node',
  'audit-villain-tournament-sim.js',
  '--hands', '350',
  '--roles', 'nit,fish,tag,lag,maniac,pro',
  '--phases', 'early',
  '--quiet',
  '--assert-bands',
  '--out', 'tools/audit-out/bet-freqs-regression.json'
]);

assert.ok(report && report.results && report.results.length === 6, '6 role cells');

const byRole = {};
report.results.forEach(function (r) {
  byRole[r.role] = r;
  assert.ok(r.stats.cbet != null || r.stats.samples.cbetOpp === 0, 'cbet metric ' + r.role);
  assert.ok(r.gaps.cbet, 'cbet gap ' + r.role);
  assert.ok(r.gaps.af, 'af gap ' + r.role);
  assert.ok(r.gaps.xrRate, 'xr gap ' + r.role);
});

const fails = Sim.assertBands(report.results);
assert.strictEqual(fails.length, 0, 'assertBands bet-freqs:\n' + fails.join('\n'));

/* Smoke de identidad de presión (además de assertBands). */
assert.ok(byRole.pro.stats.cbet >= byRole.nit.stats.cbet,
  'pro cbet >= nit');
assert.ok(byRole.fish.stats.af <= byRole.pro.stats.af,
  'fish AF <= pro AF');
assert.ok(byRole.maniac.stats.xrRate >= byRole.pro.stats.xrRate + 1.5,
  'maniac XR > pro XR');

console.log('OK test-audit-villain-bet-freqs');
console.log('  pro  cbet=%s af=%s xr=%s 3b=%s',
  byRole.pro.stats.cbet, byRole.pro.stats.af, byRole.pro.stats.xrRate, byRole.pro.stats.threeBet);
console.log('  nit  cbet=%s af=%s xr=%s',
  byRole.nit.stats.cbet, byRole.nit.stats.af, byRole.nit.stats.xrRate);
console.log('  maniac xr=%s 3b=%s | fish af=%s',
  byRole.maniac.stats.xrRate, byRole.maniac.stats.threeBet, byRole.fish.stats.af);
