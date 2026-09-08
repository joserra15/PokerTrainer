/**
 * Regresión: siguiente mano instantánea (RPC no bloqueante + prefetch + replay).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const entSrc = fs.readFileSync(path.join(root, 'js/entitlements.js'), 'utf8');

// --- Contratos en app.js ---
assert.ok(/recordTrainerHandAsync/.test(appSrc), 'startNewHand usa recordTrainerHandAsync');
assert.ok(!/await Ent\.recordTrainerHand\s*\(/.test(appSrc),
  'startNewHand no await del RPC de cupo');
assert.ok(/prefetchedHand/.test(appSrc) && /schedulePrefetchNextHand/.test(appSrc),
  'prefetch de siguiente mano');
assert.ok(/takePrefetchedHand/.test(appSrc), 'consume prefetch al aceptar');
assert.ok(/invalidatePrefetch/.test(appSrc), 'invalidación de prefetch');
assert.ok(/lastFinishedReplayRec/.test(appSrc), 'snap de seguridad para Repetir');
assert.ok(/function replayCurrentHand[\s\S]*invalidatePrefetch/.test(appSrc),
  'Repetir invalida prefetch');
assert.ok(/function replayCurrentHand[\s\S]*lastFinishedReplayRec/.test(appSrc),
  'Repetir cae a lastFinishedReplayRec');
assert.ok(/function resetPlaySession[\s\S]*invalidatePrefetch/.test(appSrc),
  'nueva sesión invalida prefetch');
assert.ok(/schedulePrefetchNextHand\s*\(\s*\)/.test(appSrc) &&
  /lastFinishedReplayRec = buildReplayRecFromHand/.test(appSrc),
  'finishHand guarda snap y agenda prefetch');
assert.ok(/canUsePrefetch/.test(appSrc), 'camino rápido con prefetch');
assert.ok(/setTimeout\(function \(\) \{[\s\S]*setPlayTableLoading\(true\)/.test(appSrc) ||
  /loadingTimer = setTimeout/.test(appSrc),
  'spinner diferido / soft loading');

// Prefetch no debe sustituir hand mientras se ve el resultado
assert.ok(/prefetchedHand = next/.test(appSrc), 'prefetch escribe buffer, no hand global en schedule');
assert.ok(/function canPrefetchNextHand[\s\S]*leakReplayQueue/.test(appSrc),
  'no prefetch con cola leak');
assert.ok(/function canPrefetchNextHand[\s\S]*PTGuest/.test(appSrc),
  'no prefetch en guest');
assert.ok(/function canPrefetchNextHand[\s\S]*legendaryMode/.test(appSrc),
  'no prefetch legendary/school');

// --- Contratos entitlements ---
assert.ok(/function recordTrainerHandAsync/.test(entSrc), 'API recordTrainerHandAsync');
assert.ok(/trainerQuotaBlockedReason/.test(entSrc), 'bloqueo diferido tras fallo RPC');
assert.ok(/bumpLocalTrainerUsage\(1\)/.test(entSrc) && /bumpLocalTrainerUsage\(-1\)/.test(entSrc),
  'optimistic + revert');
assert.ok(/isLoaded:\s*function/.test(entSrc), 'isLoaded para soft spinner');

// --- Comportamiento recordTrainerHandAsync ---
const localStore = {};
let rpcImpl = async () => ({ data: { ok: true } });
let koinNotes = 0;
const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Set,
  Map,
  JSON,
  Number,
  String,
  Object,
  Array,
  Promise,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  CustomEvent: function () {},
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  }
};
sandbox.global = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
sandbox.window.PTAuth = {
  getUser: () => ({ plan: 'free', isAdmin: false })
};
sandbox.window.PTSupabase = {
  useAuth: () => true,
  getClient: () => ({
    rpc: (name) => rpcImpl(name)
  })
};
sandbox.window.PTTournamentWallet = {
  noteTrainerHand: () => { koinNotes += 1; return 1; }
};
sandbox.PTAuth = sandbox.window.PTAuth;
sandbox.PTSupabase = sandbox.window.PTSupabase;
sandbox.PTTournamentWallet = sandbox.window.PTTournamentWallet;

vm.createContext(sandbox);
vm.runInContext(entSrc, sandbox, { filename: 'entitlements.js' });
const Ent = sandbox.window.PTEntitlements;
assert.ok(Ent && Ent.recordTrainerHandAsync);

async function flush() {
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
}

(async () => {
  rpcImpl = async () => ({
    data: {
      plan: 'free',
      plan_label: 'Gratis',
      limits: { trainer_hands_per_day: 15 },
      usage: { trainer_hands_today: 10, import_sessions_month: 0, ai_reports_month: 0 },
      bonus: { balance: 0 }
    }
  });
  await Ent.refresh();
  assert.strictEqual(Ent.isLoaded(), true);
  assert.strictEqual(Ent.get().usage.trainer_hands_today, 10);

  koinNotes = 0;
  rpcImpl = async () => {
    await new Promise((r) => setTimeout(r, 30));
    return { data: { ok: true } };
  };
  const t0 = Date.now();
  const rec = Ent.recordTrainerHandAsync();
  const elapsed = Date.now() - t0;
  assert.strictEqual(rec.ok, true, 'async ok inmediato');
  assert.ok(elapsed < 20, 'no bloquea por RPC (' + elapsed + 'ms)');
  assert.strictEqual(Ent.get().usage.trainer_hands_today, 11, 'usage optimista');
  assert.strictEqual(koinNotes, 1, 'Koins al aceptar');
  await flush();
  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(Ent.get().usage.trainer_hands_today, 11, 'usage estable tras RPC ok');
  assert.strictEqual(Ent.trainerQuotaBlocked(), null);

  // Fallo RPC → revert + bloqueo
  rpcImpl = async () => ({ error: { message: 'trainer_limit' } });
  const recFail = Ent.recordTrainerHandAsync();
  assert.strictEqual(recFail.ok, true, 'optimista acepta al instante');
  assert.strictEqual(Ent.get().usage.trainer_hands_today, 12);
  await flush();
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(Ent.get().usage.trainer_hands_today, 11, 'revert tras fallo');
  assert.ok(Ent.trainerQuotaBlocked(), 'flag bloqueo');
  const blocked = Ent.canStartTrainerHand(Ent.get());
  assert.strictEqual(blocked.ok, false, 'siguiente mano bloqueada');

  Ent.clearTrainerQuotaBlock();
  assert.strictEqual(Ent.canStartTrainerHand(Ent.get()).ok, true, 'clear desbloquea');

  // Guest no llama RPC ni Koins
  sandbox.window.PTGuest = { isActive: () => true, remaining: () => 3 };
  sandbox.PTGuest = sandbox.window.PTGuest;
  koinNotes = 0;
  let rpcCalls = 0;
  rpcImpl = async () => { rpcCalls += 1; return { data: { ok: true } }; };
  const guestRec = Ent.recordTrainerHandAsync();
  assert.strictEqual(guestRec.ok, true);
  assert.strictEqual(rpcCalls, 0);
  assert.strictEqual(koinNotes, 0);
  delete sandbox.window.PTGuest;
  delete sandbox.PTGuest;

  console.log('*** instant-next-hand OK (contratos + RPC async + bloqueo) ***');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
