/*
 * Prueba de conexión a Supabase (lectura + escritura + borrado de test).
 * Uso: node tools/test-supabase.js
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
  console.log('\n1) SELECT pt_user_state ->', read.status, read.ok ? 'OK' : 'FAIL');
  if (!read.ok) {
    console.log(read.data);
    console.log('\nSi la tabla no existe, ejecuta supabase/schema.sql en el SQL Editor.');
    process.exit(1);
  }
  console.log('   Filas actuales:', Array.isArray(read.data) ? read.data.length : read.data);

  const testId = 'pt_test_' + Date.now();
  const insert = await req('POST', '/pt_user_state', {
    user_id: testId,
    payload: {
      stats: { handsPlayed: 0, ping: true },
      syncedAt: new Date().toISOString()
    }
  });
  console.log('\n2) INSERT test row ->', insert.status, insert.ok ? 'OK' : 'FAIL');
  if (!insert.ok) {
    console.log(insert.data);
    process.exit(1);
  }

  const verify = await req('GET', '/pt_user_state?user_id=eq.' + encodeURIComponent(testId) + '&select=user_id,payload');
  console.log('\n3) SELECT inserted row ->', verify.status, verify.ok ? 'OK' : 'FAIL');
  console.log('   Data:', JSON.stringify(verify.data));

  const del = await req('DELETE', '/pt_user_state?user_id=eq.' + encodeURIComponent(testId));
  console.log('\n4) DELETE test row ->', del.status, del.ok ? 'OK' : 'FAIL');
  if (!del.ok) {
    console.log(del.data);
    process.exit(1);
  }

  console.log('\n*** SUPABASE OK: lectura, escritura y borrado funcionan ***');
})().catch((e) => {
  console.error('Error de red:', e.message);
  process.exit(1);
});
