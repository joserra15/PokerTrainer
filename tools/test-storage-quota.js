/* QuotaExceeded: liberar cachés y no tumbar auth/Admin. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const storageSrc = fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8');
const supabaseSrc = fs.readFileSync(path.join(root, 'js/supabase-client.js'), 'utf8');
const adminSrc = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');

assert.ok(/function freeStorageSpace\(opts\)/.test(storageSrc), 'freeStorageSpace con opts');
assert.ok(/pt_ai_coach_v1_/.test(storageSrc) && /pt_session_txt/.test(storageSrc),
  'libera caché IA y HH de sesión');
assert.ok(/aggressive/.test(storageSrc), 'modo aggressive');
assert.ok(/freeStorageSpace,\s*writeResilient/.test(storageSrc), 'Store exporta freeStorageSpace');
assert.ok(/createAuthStorage/.test(supabaseSrc), 'adaptador auth storage');
assert.ok(/Store\.freeStorageSpace/.test(supabaseSrc), 'auth storage libera cuota');
assert.ok(/pt_admin_quota_probe/.test(adminSrc), 'admin sondea cuota antes de RPC');

const localStore = {};
const sandbox = {
  window: {},
  console,
  localStorage: {
    get length() { return Object.keys(localStore).length; },
    key(i) { return Object.keys(localStore)[i] || null; },
    getItem(k) { return Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null; },
    setItem(k, v) { localStore[k] = String(v); },
    removeItem(k) { delete localStore[k]; }
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(storageSrc, sandbox, { filename: 'storage.js' });

const Store = sandbox.window.Store || sandbox.Store;
assert.ok(Store && typeof Store.freeStorageSpace === 'function', 'Store.freeStorageSpace');

Store.setUserId('u-quota');
localStore['pt_ai_coach_v1_abc'] = JSON.stringify({ text: 'x'.repeat(5000) });
localStore['pt_session_txt_v1_u-quota_s1'] = 'HH'.repeat(8000);
localStore['pt_home_greeting_v2_u-quota'] = JSON.stringify({ text: 'hola', at: 1 });
localStore['pt_history_v1_u-quota'] = JSON.stringify(
  Array.from({ length: 80 }, function (_, i) {
    return { id: 'h' + i, finishedAt: '2026-09-0' + (i % 9 + 1) };
  })
);

const freed = Store.freeStorageSpace();
assert.ok(freed, 'freeStorageSpace liberó algo');
assert.strictEqual(localStore['pt_ai_coach_v1_abc'], undefined, 'borró caché IA');
assert.strictEqual(localStore['pt_session_txt_v1_u-quota_s1'], undefined, 'borró session_txt');
assert.strictEqual(localStore['pt_home_greeting_v2_u-quota'], undefined, 'borró saludo');
const hist = JSON.parse(localStore['pt_history_v1_u-quota'] || '[]');
assert.ok(hist.length <= 50, 'histórico recortado a ≤50');

/* Auth storage: setItem no propaga QuotaExceeded. */
let blocked = true;
sandbox.localStorage.setItem = function (k, v) {
  if (blocked && k === 'sb-auth') {
    const err = new Error('The quota has been exceeded.');
    err.name = 'QuotaExceededError';
    throw err;
  }
  localStore[k] = String(v);
};
sandbox.PT_SUPABASE = { enabled: true, url: 'https://example.supabase.co', anonKey: 'anon' };
sandbox.supabase = {
  createClient: function (_url, _key, opts) {
    return { __storage: opts && opts.auth && opts.auth.storage, auth: {} };
  }
};
vm.runInContext(supabaseSrc, sandbox, { filename: 'supabase-client.js' });
const client = sandbox.PTSupabase.getClient();
assert.ok(client && client.__storage, 'cliente con storage custom');
assert.doesNotThrow(function () {
  client.__storage.setItem('sb-auth', '{"access_token":"t"}');
}, 'setItem auth no lanza tras liberar');
/* Tras freeStorageSpace del adaptador, el 2º intento (blocked sigue true)…
   forzamos desbloqueo en el reintento agresivo: el adaptador llama free y reintenta.
   Simulamos que el 2º intento ya cabe. */
blocked = false;
assert.doesNotThrow(function () {
  client.__storage.setItem('sb-auth', '{"access_token":"t2"}');
}, 'setItem auth OK cuando hay espacio');
assert.strictEqual(localStore['sb-auth'], '{"access_token":"t2"}', 'sesión persistida');

console.log('*** storage-quota OK ***');
