/* RG-D04 — Contratos RLS en SQL: usuario solo ve su fila (auth.uid). */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const mig034 = fs.readFileSync(
  path.join(root, 'supabase/migrations/034_rls_no_user_metadata.sql'),
  'utf8'
);
const schema = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');

function assertOwnPolicies(sql, table, names) {
  names.forEach((name) => {
    assert.ok(
      new RegExp('policy\\s+"' + name + '"', 'i').test(sql) ||
        new RegExp("policy\\s+'" + name + "'", 'i').test(sql) ||
        sql.includes('"' + name + '"'),
      'falta policy ' + name + ' en ' + table
    );
  });
  assert.ok(
    sql.includes('auth.uid()'),
    table + ': políticas deben usar auth.uid()'
  );
}

// Políticas activas no deben leer user_metadata (solo comentarios del fix 034)
const policyBodies = mig034
  .split(/create policy/i)
  .slice(1)
  .join('\n');
assert.ok(
  !/auth\.jwt\(\)[\s\S]{0,80}user_metadata|user_metadata[\s\S]{0,80}auth\.jwt\(\)/.test(policyBodies),
  'políticas RLS sin auth.jwt()->user_metadata'
);
assert.ok(
  !/using\s*\([^)]*user_metadata/i.test(policyBodies) &&
    !/with check\s*\([^)]*user_metadata/i.test(policyBodies),
  'using/with check sin user_metadata'
);

assert.ok(/enable row level security/i.test(schema) || /enable row level security/i.test(mig034),
  'RLS habilitado');

assertOwnPolicies(mig034, 'pt_user_state', [
  'select_own',
  'insert_own',
  'update_own',
  'delete_own'
]);
assertOwnPolicies(mig034, 'pt_import_sessions', [
  'import_sessions_select_own',
  'import_sessions_insert_own',
  'import_sessions_update_own',
  'import_sessions_delete_own'
]);

// using / with check amarran user_id al JWT
assert.ok(
  /user_id\s*=\s*auth\.uid\(\)::text/.test(mig034),
  'user_id = auth.uid()::text'
);

// schema de referencia también sin anon_read_write_dev activo
assert.ok(
  /drop policy if exists "anon_read_write_dev"/i.test(schema),
  'schema elimina política anon de desarrollo'
);

const mig040 = fs.readFileSync(
  path.join(root, 'supabase/migrations/040_guest_funnel.sql'),
  'utf8'
);
assert.ok(/enable row level security/i.test(mig040), 'embudo RLS');
assert.ok(/revoke all on table public.pt_guest_funnel_events from anon/i.test(mig040),
  'embudo sin privilegios anon');
assert.ok(/revoke all on table public.pt_guest_funnel_events from authenticated/i.test(mig040),
  'embudo sin privilegios authenticated');
assert.ok(/is_pt_admin\(\)/.test(mig040), 'lectura embudo solo admin');
assert.ok(!/create policy/i.test(mig040), 'embudo sin policies de INSERT/SELECT cliente');

const mig041 = fs.readFileSync(
  path.join(root, 'supabase/migrations/041_push_subscriptions.sql'),
  'utf8'
);
assert.ok(/enable row level security/i.test(mig041), 'push RLS');
assertOwnPolicies(mig041, 'pt_push_subscriptions', [
  'push_subscriptions_select_own',
  'push_subscriptions_insert_own',
  'push_subscriptions_update_own',
  'push_subscriptions_delete_own'
]);
assert.ok(/user_id\s*=\s*auth\.uid\(\)::text/.test(mig041), 'push user_id = auth.uid()');

console.log('*** rls-policies OK (pt_user_state + pt_import_sessions + guest funnel + push) ***');
