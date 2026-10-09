/* Contratos: códigos one-time MTT LAB (migración 066 + gate + manager). */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const sql = read('supabase/migrations/066_community_invite_codes.sql');
const comm = read('js/community.js');
const mgr = read('js/manager-panel.js');

assert.ok(/create table if not exists public\.pt_community_invite_codes/.test(sql), 'tabla invites');
assert.ok(/check \(status in \('unused', 'used', 'revoked'\)\)/.test(sql), 'estados invite');
assert.ok(/unique \(code\)|pt_community_invite_codes_code_unique/.test(sql), 'código único');

[
  'pt_manager_generate_invite_codes',
  'pt_manager_list_invite_codes',
  'pt_manager_invalidate_invite_code',
  'pt_redeem_community_invite',
  'pt_manager_revoke_member'
].forEach(function (fn) {
  assert.ok(sql.includes(fn), 'RPC ' + fn);
  assert.ok(new RegExp('grant execute on function public\\.' + fn).test(sql), 'grant ' + fn);
});

assert.ok(/greatest\(1, least\(coalesce\(p_count, 10\), 200\)\)/.test(sql), 'lote 1–200');
assert.ok(/where id = inv\.id\s+and status = 'unused'/.test(sql), 'canje atómico unused');
assert.ok(/already_member/.test(sql), 'miembro activo no gasta código');
assert.ok(/granted_by = 'invite_code'|granted_by', 'invite_code'/.test(sql) ||
  /'invite_code'/.test(sql), 'granted_by invite_code');
assert.ok(/plan = 'free'/.test(sql) && /subscription_status = 'none'/.test(sql),
  'revoke fuerza plan free');
assert.ok(/cannot_revoke_self/.test(sql), 'no auto-revocar');
assert.ok(/set join_code = null\s+where id = 'mttlab'/.test(sql), 'null join_code mttlab');
assert.ok(/return public\.pt_redeem_community_invite\(p_code\)/.test(sql),
  'pt_join_community → redeem');

assert.ok(/pt_redeem_community_invite/.test(comm), 'community usa redeem');
assert.ok(/already_used/.test(comm) && /Este código ya se ha utilizado/.test(comm),
  'mensaje already_used');
assert.ok(/revoked/.test(comm) && /ya no es válido/.test(comm), 'mensaje revoked');
assert.ok(/tras el pago/.test(comm), 'copy pago externo');

assert.ok(/pt_manager_generate_invite_codes/.test(mgr), 'UI generate');
assert.ok(/pt_manager_list_invite_codes/.test(mgr), 'UI list');
assert.ok(/pt_manager_invalidate_invite_code/.test(mgr), 'UI invalidate');
assert.ok(/pt_manager_revoke_member/.test(mgr), 'UI revoke RPC');
assert.ok(/Revocar acceso/.test(mgr), 'botón revocar');
assert.ok(/Copiar lista|manager-invite-copy/.test(mgr), 'export/copiar');
assert.ok(/plan Gratis|PokerForgeAI quedará en plan Gratis/.test(mgr), 'confirm revoke → free');

console.log('*** community-invite-codes OK ***');
