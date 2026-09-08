/* Contrato: estadísticas de uso Torneos en Admin / Manager. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const sqlPath = path.join(root, 'supabase/migrations/051_tournament_usage_stats.sql');
assert.ok(fs.existsSync(sqlPath), 'migración 051 existe');
const sql = read('supabase/migrations/051_tournament_usage_stats.sql');

[
  'pt_tournament_usage_from_payload',
  'tournamentWallet',
  'tournamentHistory',
  'tournamentActive',
  'tournamentsPlayed',
  'by_kind',
  'avg_role_accuracy',
  'has_active',
  'pt_admin_user_detail',
  'pt_manager_member_usage',
  'pt_community_tournament_koins',
  'leaderboard'
].forEach(function (needle) {
  assert.ok(sql.includes(needle), 'SQL 051 tiene ' + needle);
});

assert.ok(/tournamentWallet' \|\| suffix|tournamentWallet' \|\|/.test(sql) ||
  /'tournamentWallet' \|\| suffix/.test(sql),
  'helper usa sufijo de comunidad en wallet');
assert.ok(/p_community_id/.test(sql), 'helper recibe community id');
assert.ok(/tournaments', tournaments|tournaments", tournaments|'tournaments', tournaments/.test(sql),
  'RPCs incluyen tournaments');

const adminSrc = read('js/admin-panel.js');
assert.ok(/renderTournamentUsageSection/.test(adminSrc), 'admin render Torneos');
assert.ok(/<h4>Torneos<\/h4>/.test(adminSrc), 'admin sección Torneos');
assert.ok(/tournaments:\s*'Torneos'/.test(adminSrc), 'TAB_LABELS.tournaments');
assert.ok(/data\.tournaments/.test(adminSrc), 'admin lee data.tournaments');

const mgrSrc = read('js/manager-panel.js');
assert.ok(/renderTournamentUsageSection/.test(mgrSrc), 'manager render Torneos');
assert.ok(/<h4>Torneos<\/h4>/.test(mgrSrc), 'manager sección Torneos');
assert.ok(/leaderboard/.test(mgrSrc), 'manager muestra leaderboard');
assert.ok(/renderTournamentUsageSection:\s*renderTournamentUsageSection/.test(mgrSrc),
  'exporta renderTournamentUsageSection');

const storeSrc = read('js/tournament/store.js');
assert.ok(/kindRaw === 'spin' \? 'spin'/.test(storeSrc) ||
  /kindRaw === "spin" \? "spin"/.test(storeSrc) ||
  /=== 'spin' \? 'spin'/.test(storeSrc),
  'normalizeSummary preserva spin');

/* —— Agregación JS (espejo de summary) + aislamiento de keys —— */
const localStore = {};
const sandbox = {
  window: {},
  console,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  },
  document: {
    querySelector: () => null,
    querySelectorAll: () => []
  },
  addEventListener() {},
  dispatchEvent() { return true; },
  CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(read('js/tournament/stats.js'), sandbox, { filename: 'stats.js' });
vm.runInContext(read('js/tournament/store.js'), sandbox, { filename: 'store.js' });
vm.runInContext(mgrSrc, sandbox, { filename: 'manager-panel.js' });

const Stats = sandbox.PTTournamentStats;
const Store = sandbox.PTTournamentStore;
const Mgr = sandbox.PTManagerPanel;
assert.ok(Stats && Store && Mgr, 'módulos cargados');

const history = [
  { id: '1', kind: 'mtt', place: 1, prizeEur: 40, buyInEur: 10, profit: 30, roi: 300, roleAccuracy: 80, finishedAt: '2026-09-01T10:00:00.000Z' },
  { id: '2', kind: 'sng', place: 3, prizeEur: 0, buyInEur: 5, profit: -5, roi: -100, roleAccuracy: 50, finishedAt: '2026-09-02T10:00:00.000Z' },
  { id: '3', kind: 'spin', place: 2, prizeEur: 8, buyInEur: 5, profit: 3, roi: 60, roleAccuracy: 100, finishedAt: '2026-09-03T12:00:00.000Z' }
];
const agg = Stats.aggregateFromHistory(history);
assert.strictEqual(agg.n, 3, 'n=3');
assert.strictEqual(agg.wins, 1, '1 victoria');
assert.strictEqual(agg.itm, 2, '2 ITM');
assert.ok(Math.abs(agg.itmPct - 66.7) < 0.2, 'ITM% ~66.7 got ' + agg.itmPct);
assert.ok(Math.abs(agg.winPct - 33.3) < 0.2, 'win% ~33.3 got ' + agg.winPct);
assert.strictEqual(agg.byKind.mtt, 1, 'byKind mtt');
assert.strictEqual(agg.byKind.sng, 1, 'byKind sng');
assert.strictEqual(agg.byKind.spin, 1, 'byKind spin');
assert.ok(agg.totalProfit > 0, 'profit positivo');
assert.ok(agg.roiPct > 0, 'ROI positivo');
assert.ok(agg.avgRoleAccuracy > 70, 'role accuracy media');

const savedSpin = Store.save({
  id: 'spin_test',
  name: 'Spin test',
  kind: 'spin',
  entries: 3,
  place: 1,
  prizeEur: 10,
  buyInEur: 5,
  profit: 5,
  roi: 100,
  roleAccuracy: 100,
  finishedAt: '2026-09-04T00:00:00.000Z'
});
assert.ok(savedSpin.ok, 'save spin ok');
assert.strictEqual(savedSpin.entry.kind, 'spin', 'kind spin persistido');

/* Render con datos estilo RPC */
const html = Mgr.renderTournamentUsageSection({
  wallet: { balance: 120.5, tournamentsPlayed: 3, updatedAt: '2026-09-03T12:00:00.000Z' },
  summary: {
    n: 3,
    wins: 1,
    itm: 2,
    itm_pct: 66.7,
    win_pct: 33.3,
    avg_place: 2,
    total_profit: 28,
    total_buy_in: 20,
    roi_pct: 140,
    avg_role_accuracy: 76.7,
    by_kind: { mtt: 1, sng: 1, spin: 1 },
    last_finished_at: '2026-09-03T12:00:00.000Z'
  },
  has_active: true,
  active_updated_at: '2026-09-03T13:00:00.000Z'
}, { leaderboard: { koins: 120.5, tournaments_played: 3 } });
assert.ok(/Torneos jugados/.test(html), 'render jugados');
assert.ok(/Saldo Koins/.test(html), 'render saldo');
assert.ok(/Victorias/.test(html) && /ITM/.test(html), 'render resultado');
assert.ok(/MTT 1/.test(html) && /SNG 1/.test(html) && /Spin 1/.test(html), 'render byKind');
assert.ok(/Clasificación comunidad/.test(html), 'render leaderboard');
assert.ok(/Torneo en curso/.test(html), 'render active');

const emptyHtml = Mgr.renderTournamentUsageSection({
  wallet: { balance: 100, tournamentsPlayed: 0 },
  summary: { n: 0, wins: 0, itm: 0, by_kind: {} },
  has_active: false
});
assert.ok(/Sin torneos IA/.test(emptyHtml), 'empty state');

/* Aislamiento conceptual: helper SQL distingue keys con sufijo */
assert.ok(sql.includes("'_' || cid") || sql.includes("'_' || cid"), 'sufijo _communityId');
assert.ok(/tournamentWallet' \|\| suffix/.test(sql), 'wallet key + suffix');
assert.ok(/tournamentHistory' \|\| suffix/.test(sql), 'history key + suffix');
assert.ok(/pt_tournament_usage_from_payload\(payload, null\)/.test(sql),
  'admin usa PokerForge (null)');
assert.ok(/pt_tournament_usage_from_payload\(coalesce\(state::jsonb[\s\S]*?\), cid\)/.test(sql),
  'manager usa community id');

console.log('*** test-tournament-usage-stats OK ***');
