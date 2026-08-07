/* RG-E04 — Contrato share-hand Edge (TTL, GET público, POST auth). */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'supabase/functions/share-hand/index.ts'),
  'utf8'
);

assert.ok(/TTL_DAYS\s*=\s*14/.test(src), 'TTL 14 días');
assert.ok(/MAX_HTML_BYTES/.test(src), 'límite HTML');
assert.ok(/ALLOWED_SOURCES/.test(src) && /trainer/.test(src) && /leak/.test(src), 'sources');
assert.ok(/missing_auth/.test(src) && /invalid_auth/.test(src), 'POST auth');
assert.ok(/html_required|invalid_source|html_too_large/.test(src), 'POST validation');
assert.ok(/available:\s*false|not_found|expired/.test(src), 'GET unavailable');
assert.ok(/ttlDays:\s*14|TTL_DAYS/.test(src), 'respuesta ttlDays');
assert.ok(/expiresAt/.test(src), 'expiresAt');
assert.ok(/req\.method\s*===\s*'GET'|method === \"GET\"|GET/.test(src), 'GET público');

console.log('*** share-hand-edge-contract OK ***');
