/* Contrato + espejo JS del recuento de Koins (migración 052). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const sqlPath = 'supabase/migrations/052_recompute_tournament_koins_from_history.sql';
assert.ok(fs.existsSync(path.join(root, sqlPath)), 'migración 052 existe');
const sql = read(sqlPath);
[
  'pt_compute_tournament_koins_from_payload',
  'pt_admin_recompute_tournament_koins',
  'mttlab',
  'manager',
  'is_admin',
  'lessonAwards',
  'trainerHands',
  'tournamentHistory',
  'pt_community_tournament_koins'
].forEach(function (needle) {
  assert.ok(sql.includes(String(needle)), 'SQL 052 tiene ' + needle);
});
assert.ok(/'starting',\s*0/.test(sql), 'SQL parte de starting 0');
assert.ok(/alter column koins set default 0/i.test(sql), 'default koins = 0');
assert.ok(/is_admin/.test(sql) && /continue/.test(sql), 'salta administradores');
assert.ok(/role = 'manager'/.test(sql) && /bal := 100/.test(sql), 'manager MTTLab = 100');

const adminSrc = read('js/admin-panel.js');
assert.ok(/data-admin-recompute-koins/.test(adminSrc) &&
  /pt_admin_recompute_tournament_koins/.test(adminSrc),
  'admin puede lanzar recuento de Koins');

const walletSrc = read('js/tournament/wallet.js');
assert.ok(/var STARTING = 0/.test(walletSrc), 'wallet STARTING = 0');

const chunks = read('js/bundle-chunks.js');
assert.ok(/tournament\/koins-recompute\.js/.test(chunks), 'koins-recompute en bundles');
assert.ok(/core:\s*ENGINE\.concat\(\[[\s\S]*koins-recompute/.test(chunks),
  'koins-recompute en core');

const storeSrc = read('js/tournament/store.js');
assert.ok(/roleKoins/.test(storeSrc) && /roleCorrect/.test(storeSrc),
  'histórico guarda roleKoins/roleCorrect');

/* —— Runtime mirror —— */
const sandbox = {
  console,
  Date,
  Math,
  JSON,
  Array,
  Object,
  String,
  Number,
  Boolean,
  isFinite,
  parseFloat,
  parseInt
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(read('js/tournament/koins-recompute.js'), sandbox);
const R = sandbox.PTTournamentKoinsRecompute;
assert.ok(R, 'PTTournamentKoinsRecompute');
assert.strictEqual(R.STARTING, 0);
assert.strictEqual(R.MTTLAB_MANAGER_GRANT, 100);

{
  const empty = R.computeFromPayload({}, 'pokerforge');
  assert.strictEqual(empty.balance, 0, 'sin actividad → 0');
}

{
  const payload = {
    tournamentWallet: {
      balance: 999,
      trainerHands: 50,
      tournamentsPlayed: 2,
      lessonAwards: { 'C-01': '2026-01-01', 'C-02': '2026-01-02' }
    },
    tournamentHistory: [
      { id: 't1', buyInEur: 5, prizeEur: 20, profit: 15, roleCorrect: 3, roleKoins: 6 },
      { id: 't2', buyInEur: 10, prizeEur: 0, profit: -10 }
    ],
    stats: {
      handsPlayed: 40,
      school: { lessons: { 'C-01': { passed: true }, 'C-03': { passed: true } } }
    }
  };
  /* lessons: max(2 awards, 2 passed school C-01+C-03) = 2
     trainer: floor(max(50,40)/25)=2
     net: 15 + (-10) = 5
     roles: 6 + 0 = 6
     total: 0+2+2+5+6 = 15 */
  const c = R.computeFromPayload(payload, 'pokerforge');
  assert.strictEqual(c.lessons, 2, 'lessons');
  assert.strictEqual(c.trainerKoins, 2, 'trainer koins');
  assert.strictEqual(c.tournamentNet, 5, 'tournament net');
  assert.strictEqual(c.roleKoins, 6, 'role koins');
  assert.strictEqual(c.balance, 15, 'balance recalculado');
  assert.strictEqual(c.tournamentsPlayed, 2, 'played');
}

{
  const forced = R.computeFromPayload({}, 'mttlab', { forceBalance: R.MTTLAB_MANAGER_GRANT });
  assert.strictEqual(forced.balance, 100, 'manager MTTLab forzado a 100');
  assert.ok(forced.forced);
}

{
  const payload = {
    tournamentWallet_mttlab: { trainerHands: 25, lessonAwards: {} },
    tournamentHistory_mttlab: [{ buyInEur: 5, prizeEur: 0, profit: -5 }],
    stats_mttlab: { handsPlayed: 25 }
  };
  const c = R.computeFromPayload(payload, 'mttlab');
  /* 0 + 0 lessons + 1 trainer + (-5) = 0 clamped */
  assert.strictEqual(c.balance, 0, 'neto negativo → 0');
  assert.strictEqual(c.trainerKoins, 1);
}

{
  const snap = R.buildWalletSnapshot(
    R.computeFromPayload({
      tournamentWallet: { lessonAwards: { X: '1' }, trainerHands: 25 },
      tournamentHistory: []
    }, 'pokerforge')
  );
  assert.strictEqual(snap.balance, 2, '1 lesson + 1 trainer');
  assert.strictEqual(snap.last.type, 'koins_recompute');
}

console.log('*** test-koins-recompute OK ***');
