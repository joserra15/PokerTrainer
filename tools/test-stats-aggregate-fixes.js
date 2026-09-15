/* Regresión: clear/sync, filtro de formato, leaks por sesión, weekKey local. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const aggJs = fs.readFileSync(path.join(root, 'js', 'stats-aggregate.js'), 'utf8');
const storageJs = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');

assert(/AGG_VERSION = 10/.test(aggJs), 'AGG_VERSION bump a 10');
assert(/function localDateKey/.test(aggJs), 'localDateKey presente');
assert(/return localDateKey\(monday\)/.test(aggJs), 'weekKey usa fecha local');
assert(/sessionLeaksBySession/.test(aggJs), 'leaks por sesión');
assert(/function recomputeSessionLeaks/.test(aggJs), 'recomputeSessionLeaks');
assert(/sessionWeeklySeries: function \(st, weeks, formatFilter\)/.test(aggJs),
  'sessionWeeklySeries acepta formatFilter');
assert(/sessionTopLeaks: function \(st, limit, formatFilter\)/.test(aggJs),
  'sessionTopLeaks acepta formatFilter');
assert(/sessionsByStakes: function \(st, formatFilter\)/.test(aggJs),
  'sessionsByStakes acepta formatFilter');
assert(/sessionDailySeries: function \(st, days, formatFilter\)/.test(aggJs),
  'sessionDailySeries acepta formatFilter');

assert(/function isStudyStatsEmpty/.test(storageJs), 'isStudyStatsEmpty');
assert(/function wipeStudyCounters/.test(storageJs), 'wipeStudyCounters');
assert(/_aggVersion = global\.PTStatsAggregate\.AGG_VERSION/.test(storageJs),
  'clearStats fija _aggVersion');
assert(/isStudyStatsEmpty\(localStats\)/.test(storageJs), 'mergeStatsWithClear usa estudio');
assert(/isStudyStatsEmpty\(local\.stats\) && localCleared/.test(storageJs),
  'sync cloud respeta clear de estudio');

assert(/sessionWeeklySeries\(st, 8, statsFormatFilter\)/.test(appJs), 'UI pasa filtro a semanal');
assert(/sessionTopLeaks\(st, 5, statsFormatFilter\)/.test(appJs), 'UI pasa filtro a leaks');
assert(/sessionsByStakes\(st, statsFormatFilter\)/.test(appJs), 'UI pasa filtro a stakes');
assert(/sessionDailySeries\(st, 14, statsFormatFilter\)/.test(appJs), 'UI pasa filtro a diario');
assert(/filteredSessions/.test(appJs), 'UI filtra sesiones derivadas');
assert(/const chartFormat = aggFormat/.test(appJs), 'sin fallback cash6 en all');
assert(/bbPer100/.test(appJs) && /netBB' \|\| field === 'bbPer100/.test(appJs),
  'bbPer100 firmado en barras');
assert(/data-stats-train-preset/.test(appJs), 'bind de presets de leak');
assert(/ptCoachMounted/.test(appJs), 'coach no se remonta cada render');
assert(/trainerEmpty \? trainerEmptyHtml/.test(appJs), 'empty state entrenador');
assert(/sessionsEmpty \? sessionsEmptyHtml/.test(appJs), 'empty state sesiones');
assert(/aria-controls="stats-panel-trainer"/.test(appJs), 'a11y tabs');
const clearSlice = appJs.slice(appJs.indexOf('clear-stats'), appJs.indexOf('clear-stats') + 900);
assert(/renderHome\(\)/.test(clearSlice), 'reset refresca home');
assert(/ptCoachMounted/.test(clearSlice) || /stats-coach/.test(clearSlice),
  'reset remonta coach');

const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Number,
  String,
  Object,
  Array,
  JSON,
  parseInt,
  isNaN
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(aggJs, sandbox, { filename: 'stats-aggregate.js' });
const Agg = sandbox.window.PTStatsAggregate;
assert.ok(Agg, 'PTStatsAggregate exportado');
assert.strictEqual(Agg.AGG_VERSION, 10);

/* weekKey estable en TZ con offset positivo (UTC+X no debe desplazar el lunes local). */
const prevTZ = process.env.TZ;
process.env.TZ = 'America/Mexico_City'; // UTC-6
{
  // lunes local 2024-03-11 00:30
  const localMonday = new Date(2024, 2, 11, 0, 30, 0);
  const key = Agg.weekKey(localMonday);
  assert.strictEqual(key, '2024-03-11', 'weekKey lunes local sin drift UTC');
  const lateSunday = new Date(2024, 2, 10, 23, 30, 0);
  assert.strictEqual(Agg.weekKey(lateSunday), '2024-03-04', 'domingo pertenece a semana anterior');
}
process.env.TZ = prevTZ || '';

/* Filtro de formato en totales / semanal / stakes / daily. */
const st = { aggregates: Agg.defaultAggregates() };
const recentIso = new Date().toISOString();
Agg.applySessionStub(st, {
  id: 's-cash',
  createdAt: recentIso,
  stats: {
    formatKey: 'cash6',
    nHands: 100,
    nDecisions: 40,
    nGood: 30,
    accuracy: 75,
    netBB: 10,
    vpipHands: 25,
    pfrHands: 20,
    stakesLabel: 'NL50'
  }
});
Agg.applySessionStub(st, {
  id: 's-spin',
  createdAt: recentIso,
  stats: {
    formatKey: 'spin3',
    nHands: 50,
    nDecisions: 20,
    nGood: 10,
    accuracy: 50,
    netBB: -5,
    vpipHands: 20,
    pfrHands: 15,
    stakesLabel: 'Spin $5'
  }
});

const allTot = Agg.sessionsTotal(st, 'all');
assert.strictEqual(allTot.hands, 150, 'total all hands');
const cashTot = Agg.sessionsTotal(st, 'cash6');
assert.strictEqual(cashTot.hands, 100, 'total cash6 hands');
assert.strictEqual(cashTot.sessions, 1, 'total cash6 sessions');
const spinTot = Agg.sessionsTotal(st, 'spin');
assert.strictEqual(spinTot.hands, 50, 'total spin hands');

const weeklyCash = Agg.sessionWeeklySeries(st, 8, 'cash6');
const weekWithCash = weeklyCash.find((w) => (w.hands || 0) > 0);
assert.ok(weekWithCash, 'hay semana con manos cash');
assert.strictEqual(weekWithCash.hands, 100, 'semanal filtrado solo cash');

const stakesCash = Agg.sessionsByStakes(st, 'cash6');
assert.ok(stakesCash.some((r) => r.stakesLabel === 'NL50'), 'stakes cash visible');
assert.ok(!stakesCash.some((r) => r.stakesLabel === 'Spin $5'), 'stakes spin oculto con filtro cash');

/* Leaks: contar todas las decisiones y purge por sesión sin corromper otras. */
const stL = { aggregates: Agg.defaultAggregates() };
const sessionA = {
  id: 'A',
  stats: { formatKey: 'cash6', nHands: 2, nDecisions: 2, accuracy: 0 },
  hands: [
    {
      id: 'h1',
      formatKey: 'cash6',
      heroPos: 'BTN',
      decisions: [
        { class: 'error', street: 'preflop', spotKind: 'RFI', evLoss: 1 },
        { class: 'error', street: 'preflop', spotKind: 'RFI', evLoss: 2 }
      ]
    }
  ]
};
const sessionB = {
  id: 'B',
  stats: { formatKey: 'cash6', nHands: 1, nDecisions: 1, accuracy: 0 },
  hands: [
    {
      id: 'h2',
      formatKey: 'cash6',
      heroPos: 'BTN',
      decisions: [
        { class: 'error', street: 'preflop', spotKind: 'RFI', evLoss: 4 }
      ]
    }
  ]
};
Agg.applySessionHands(stL, sessionA);
Agg.applySessionHands(stL, sessionB);
const topAll = Agg.sessionTopLeaks(stL, 5);
assert.ok(topAll.length >= 1, 'hay leaks agregados');
const rfi = topAll.find((l) => String(l.key).indexOf('RFI') >= 0 || String(l.label).indexOf('RFI') >= 0)
  || topAll[0];
assert.strictEqual(rfi.count, 3, 'cuenta las 3 decisiones leak (2 de A + 1 de B)');
assert.ok(Math.abs(rfi.evLoss - 7) < 0.01, 'evLoss suma 7');

Agg.removeSession(stL, 'A');
const topAfter = Agg.sessionTopLeaks(stL, 5);
assert.ok(topAfter.length >= 1, 'tras borrar A sigue el leak de B');
assert.strictEqual(topAfter[0].count, 1, 'solo queda la contribución de B');
assert.ok(Math.abs(topAfter[0].evLoss - 4) < 0.01, 'evLoss de B intacto');

console.log('test-stats-aggregate-fixes: OK');
