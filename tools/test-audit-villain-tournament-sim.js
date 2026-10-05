#!/usr/bin/env node
/**
 * Smoke del harness de auditoría de villanos de torneo.
 * Run: node tools/test-audit-villain-tournament-sim.js
 */
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const Sim = require('./audit-villain-tournament-sim');
const Bench = require('./audit-villain-tournament-benchmarks');

assert.ok(Bench.EARLY.pro.vpip[0] < Bench.EARLY.pro.vpip[1], 'pro early band');
assert.ok(Bench.EARLY.pro.cbet && Bench.EARLY.pro.af && Bench.EARLY.pro.xrRate, 'pro bet-freq bands');
assert.ok(Bench.BET_FREQ_KEYS.indexOf('cbet') >= 0 && Bench.BET_FREQ_KEYS.indexOf('af') >= 0);
assert.strictEqual(Bench.classify(25, [22, 28]), 'ok');
assert.strictEqual(Bench.classify(10, [22, 28]), 'low');
assert.strictEqual(Bench.classify(40, [22, 28]), 'high');

const report = Sim.main([
  'node',
  'audit-villain-tournament-sim.js',
  '--hands', '80',
  '--roles', 'pro,nit',
  '--phases', 'early',
  '--quiet',
  '--out', 'tools/audit-out/smoke-villain-calib.json'
]);

assert.ok(report && report.results && report.results.length === 2, '2 cells');
report.results.forEach(function (r) {
  assert.ok(r.handsCompleted >= 40, 'enough hands ' + r.role + ' got ' + r.handsCompleted);
  assert.ok(r.stats.hands >= 80, 'seat-hands accumulated');
  assert.ok(r.stats.vpip != null && isFinite(r.stats.vpip), 'vpip finite');
  assert.ok(r.stats.pfr != null && isFinite(r.stats.pfr), 'pfr finite');
  assert.ok(r.gaps && r.gaps.cbet && r.gaps.af && r.gaps.xrRate, 'bet-freq gaps present');
  assert.ok(r.errors / Math.max(1, r.handsRequested) < 0.25, 'error rate low');
});

const outPath = path.join(__dirname, 'audit-out', 'smoke-villain-calib.json');
assert.ok(fs.existsSync(outPath), 'wrote json');
const parsed = JSON.parse(fs.readFileSync(outPath, 'utf8'));
assert.strictEqual(parsed.purpose, 'calibration-regression-not-solver');

console.log('OK test-audit-villain-tournament-sim');
