/*
 * Prueba de conexión a Supabase con RLS de producción (EPIC 2).
 * Uso: node tools/test-supabase.js
 *
 * Con RLS activo, anon sin JWT no puede escribir en pt_user_state.
 */
const fs = require('fs');
const path = require('path');

const cfgPath = path.join(__dirname, '..', 'js', 'supabase-config.js');
const raw = fs.readFileSync(cfgPath, 'utf8');
const urlMatch = raw.match(/url:\s*'([^']+)'/);
const keyMatch = raw.match(/anonKey:\s*'([^']+)'/);
const url = urlMatch ? urlMatch[1] : '';
const anonKey = keyMatch ? keyMatch[1] : '';

if (!url || !anonKey) {
  console.error('Falta url o anonKey en js/supabase-config.js');
  process.exit(1);
}

const base = url.replace(/\/$/, '') + '/rest/v1';
const headers = {
  apikey: anonKey,
  Authorization: 'Bearer ' + anonKey,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

async function req(method, pathSuffix, body) {
  const res = await fetch(base + pathSuffix, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  return { status: res.status, ok: res.ok, data };
}

(async () => {
  console.log('Supabase URL:', url);
  console.log('Key prefix:', anonKey.slice(0, 12) + '...');

  const read = await req('GET', '/pt_user_state?select=user_id&limit=1');
  console.log('\n1) SELECT anon ->', read.status, read.ok ? 'OK (RLS permite o tabla vacía)' : 'FAIL');
  if (!read.ok && read.status !== 401 && read.status !== 403) {
    console.log(read.data);
    console.log('\nSi la tabla no existe, ejecuta supabase/schema.sql en el SQL Editor.');
    process.exit(1);
  }

  const testId = 'pt_test_' + Date.now();
  const insert = await req('POST', '/pt_user_state', {
    user_id: testId,
    payload: { stats: { handsPlayed: 0, ping: true }, syncedAt: new Date().toISOString() }
  });
  const rlsBlocksAnon = insert.status === 401 || insert.status === 403;
  console.log('\n2) INSERT anon ->', insert.status, rlsBlocksAnon ? 'OK (RLS bloquea anon)' : (insert.ok ? 'WARN (RLS abierta?)' : 'FAIL'));
  if (!insert.ok && !rlsBlocksAnon) {
    console.log(insert.data);
    process.exit(1);
  }

  if (insert.ok) {
    const del = await req('DELETE', '/pt_user_state?user_id=eq.' + encodeURIComponent(testId));
    console.log('\n3) DELETE test row ->', del.status, del.ok ? 'OK' : 'FAIL');
    if (!del.ok) process.exit(1);
    console.log('\n*** SUPABASE OK (modo legacy anon abierto) ***');
    console.log('Aplica supabase/migrations/002_production_rls.sql para EPIC 2.');
    return;
  }

  console.log('\n*** SUPABASE OK: RLS de producción activa (anon no escribe) ***');
  console.log('Sync e IA requieren login con Supabase Auth.');
})().catch((e) => {
  console.error('Error de red:', e.message);
  process.exit(1);
});
