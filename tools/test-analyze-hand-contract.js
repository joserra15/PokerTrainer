/* RG-E02 — Contrato analyze-hand Edge: auth, body, modos, 429. Sin Gemini real. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'supabase/functions/analyze-hand/index.ts'),
  'utf8'
);

assert.ok(/missing_auth/.test(src), '401 missing_auth');
assert.ok(/invalid_auth/.test(src), '401 invalid_auth');
assert.ok(/invalid_json/.test(src), '400 invalid_json');
assert.ok(/missing_payload/.test(src), '400 missing_payload');
assert.ok(/missing_question/.test(src), '400 missing_question');
assert.ok(/429/.test(src), '429 cuota IA');
assert.ok(/pt_check_ai_access/.test(src), 'RPC check AI access');
assert.ok(/pt_record_ai_usage/.test(src), 'RPC record AI usage');
assert.ok(/communityId/.test(src), 'acepta communityId para cupo comunidad');
assert.ok(/p_community_id/.test(src), 'pasa p_community_id a RPCs');
assert.ok(/GEMINI_API_KEY/.test(src), 'requiere Gemini configurado');

const modes = [
  'report',
  'question',
  'session_report',
  'session_question',
  'stats_report',
  'stats_question',
  'parse_hand'
];
modes.forEach((m) => {
  assert.ok(src.includes("'" + m + "'") || src.includes('"' + m + '"') || src.includes(m),
    'modo ' + m);
});

assert.ok(/reportMarkdown/.test(src), 'respuesta incluye reportMarkdown');
assert.ok(/Access-Control-Allow-Origin/.test(src), 'CORS');
assert.ok(/method_not_allowed/.test(src), '405 method');

// Shape estable de respuesta exitosa (campos)
assert.ok(/mode,/.test(src) || /mode:/.test(src), 'eco mode en respuesta');
assert.ok(/createdAt/.test(src), 'createdAt en respuesta');

console.log('*** analyze-hand-contract OK (auth/body/modos/429) ***');
