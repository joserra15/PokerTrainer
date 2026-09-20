#!/usr/bin/env node
/**
 * tools/eval-villain-assist-audits.js
 * Re-evalúa audits enriquecidos (mesa + motor vs IA) con spot EV offline.
 *
 * Uso:
 *   node tools/eval-villain-assist-audits.js
 *   node tools/eval-villain-assist-audits.js tools/fixtures/villain-assist-audits.json
 *
 * Sin GTO cargado, los spots salen unscored; el resumen sigue siendo útil
 * para correlacionar heurística vs tags ya persistidos en el payload.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DEFAULT_FIXTURE = path.join(__dirname, 'fixtures', 'villain-assist-audits.json');

function loadSpotEv() {
  const sandbox = {
    console: console,
    Math: Math,
    Date: Date,
    JSON: JSON,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Error: Error,
    isFinite: isFinite,
    parseFloat: parseFloat,
    parseInt: parseInt
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'js/tournament/villain-assist-spot-ev.js'), 'utf8'),
    sandbox,
    { filename: 'villain-assist-spot-ev.js' }
  );
  return sandbox.PTVillainAssistSpotEv;
}

function loadAssistHelpers() {
  const sandbox = {
    console: console,
    Math: Math,
    Date: Date,
    JSON: JSON,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Error: Error,
    isFinite: isFinite,
    Promise: Promise,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    parseFloat: parseFloat,
    parseInt: parseInt,
    fetch: function () { return Promise.reject(new Error('no_fetch')); }
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  [
    'js/tournament/villain-assist-complexity.js',
    'js/tournament/villain-assist-flags.js',
    'js/tournament/villain-assist-cache.js',
    'js/tournament/villain-assist-spot-ev.js',
    'js/tournament/villain-ai-assist.js'
  ].forEach(function (rel) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, {
      filename: path.basename(rel)
    });
  });
  return sandbox;
}

function summarize(rows, Spot) {
  const summary = {
    total: rows.length,
    heuristic: { agree: 0, differ_better: 0, differ_worse: 0, differ_neutral: 0, other: 0 },
    spotPayload: { agree: 0, differ_better: 0, differ_worse: 0, differ_neutral: 0, unscored: 0, missing: 0 },
    spotReeval: { agree: 0, differ_better: 0, differ_worse: 0, differ_neutral: 0, unscored: 0 },
    heuristicWorseButSpotBetter: 0,
    heuristicWorseButSpotAgree: 0,
    incompletePayload: 0,
    withReason: 0,
    byPhase: {}
  };

  rows.forEach(function (row) {
    const p = row.payload || row;
    const tagH = p.tagHeuristic || row.tag || p.tag || 'other';
    if (summary.heuristic[tagH] != null) summary.heuristic[tagH]++;
    else summary.heuristic.other++;

    const tagS = p.tagSpot;
    if (!tagS) summary.spotPayload.missing++;
    else if (summary.spotPayload[tagS] != null) summary.spotPayload[tagS]++;
    else summary.spotPayload.unscored++;

    if (p.reasonCode) summary.withReason++;
    if (!p.table || !(p.table.street || p.localActionFull || p.finalActionFull)) {
      summary.incompletePayload++;
    }

    const phase = (p.table && p.table.phase) || row.phase || p.phase || 'unknown';
    if (!summary.byPhase[phase]) {
      summary.byPhase[phase] = { n: 0, heurWorse: 0, spotBetter: 0 };
    }
    summary.byPhase[phase].n++;
    if (tagH === 'differ_worse') summary.byPhase[phase].heurWorse++;
    if (tagS === 'differ_better') summary.byPhase[phase].spotBetter++;

    if (tagH === 'differ_worse' && tagS === 'differ_better') {
      summary.heuristicWorseButSpotBetter++;
    }
    if (tagH === 'differ_worse' && tagS === 'agree') {
      summary.heuristicWorseButSpotAgree++;
    }

    if (Spot && p.table && (p.localActionFull || p.localAction) && (p.finalActionFull || p.finalAction)) {
      try {
        const re = Spot.compareFromSnapshot(p.table, p.localActionFull || p.localAction, p.finalActionFull || p.finalAction);
        const t = re.tagSpot || 'unscored';
        if (summary.spotReeval[t] != null) summary.spotReeval[t]++;
        else summary.spotReeval.unscored++;
      } catch (e) {
        summary.spotReeval.unscored++;
      }
    }
  });

  return summary;
}

function main() {
  const file = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_FIXTURE;
  if (!fs.existsSync(file)) {
    console.error('No existe', file);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = Array.isArray(raw) ? raw : (raw.rows || raw.audits || []);
  const Spot = loadSpotEv();
  const g = loadAssistHelpers();

  /* Demostración del sesgo heurístico: desacuerdo → differ_worse. */
  const Assist = g.PTVillainAiAssist;
  const local = { id: 'call' };
  const final = { id: 'fold' };
  const freqs = Assist.syntheticFreqsForAssist('call', 'bluffcatch', true);
  const delta = Assist.estimateEvDelta(local, final, { freqs: freqs });
  const tagH = Assist.auditTag(false, delta);

  const summary = summarize(rows, Spot);
  summary.demoHeuristicBias = {
    freqs: freqs,
    deltaEvVillain: delta,
    tagHeuristic: tagH,
    note: 'Desacuerdo con freqs sintéticas centradas en motor → casi siempre differ_worse'
  };

  console.log(JSON.stringify(summary, null, 2));
  if (tagH !== 'differ_worse') {
    console.error('Expected heuristic bias differ_worse, got', tagH);
    process.exit(1);
  }
}

main();
