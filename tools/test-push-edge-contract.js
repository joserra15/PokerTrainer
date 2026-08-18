/* Contratos Edge Web Push: auth, VAPID, tipos, cron, 410. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const http = read('supabase/functions/_shared/http.ts');
assert.ok(/missing_auth/.test(http) && /invalid_auth/.test(http), 'verifyAuth');
assert.ok(/PUSH_CRON_SECRET/.test(http) && /x-cron-secret/.test(http), 'cron secret');
assert.ok(/safeEqual|charCodeAt/.test(http), 'comparación de secreto');

const webPush = read('supabase/functions/_shared/web-push.ts');
assert.ok(/aes128gcm/.test(webPush), 'aes128gcm');
assert.ok(/VAPID_PUBLIC_KEY/.test(webPush) && /VAPID_PRIVATE_KEY/.test(webPush), 'vapid env');
assert.ok(/payload_too_large/.test(webPush), 'límite payload');
assert.ok(/status === 404 \|\| res\.status === 410/.test(webPush), 'gone 404/410');

const sub = read('supabase/functions/push-subscribe/index.ts');
assert.ok(/missing_auth|verifyAuth/.test(sub), 'subscribe auth');
assert.ok(/invalid_endpoint/.test(sub), 'subscribe valida endpoint');
assert.ok(/upsert/.test(sub) && /onConflict:\s*'endpoint'/.test(sub), 'upsert por endpoint');
assert.ok(/android|ios|desktop/.test(sub), 'plataformas');

const unsub = read('supabase/functions/push-unsubscribe/index.ts');
assert.ok(/verifyAuth/.test(unsub), 'unsubscribe auth');
assert.ok(/enabled:\s*false/.test(unsub), 'disable on unsubscribe');

const send = read('supabase/functions/push-send/index.ts');
assert.ok(/invalid_type/.test(send), 'tipos');
assert.ok(/forbidden_user/.test(send), 'no envía a user ajeno');
assert.ok(/user_ids/.test(send) && /all_users/.test(send), 'admin puede enviar a varios o a todos');
assert.ok(/slice\(0,\s*200\)/.test(send), 'cap 200 user_ids');
assert.ok(/type === 'test'/.test(send), 'self-test');
assert.ok(/endpoint/.test(send), 'filtro endpoint test');
assert.ok(/enabled:\s*false/.test(send) && /410/.test(send), 'desactiva 410');
assert.ok(/is_admin/.test(send), 'admin gate');
assert.ok(/MAX_JSON\s*=\s*3000/.test(send), 'límite JSON');

const dispatch = read('supabase/functions/push-dispatch-reengage/index.ts');
assert.ok(/cronAuthorized|PUSH_CRON_SECRET|missing_auth/.test(dispatch), 'cron auth');
assert.ok(/INACTIVE_DAYS\s*=\s*7/.test(dispatch), '7 días');
assert.ok(/inactive_7d/.test(dispatch), 'campaña');
assert.ok(/last_seen_at/.test(dispatch), 'usa last_seen_at');
assert.ok(/STALE_DAYS\s*=\s*30/.test(dispatch), 'limpia 30 días');
assert.ok(/BATCH\s*=\s*200/.test(dispatch), 'lote 200');
assert.ok(/1 day|24 \* 60/.test(dispatch), 'cap 1/día');

const toml = read('supabase/config.toml');
assert.ok(/push-subscribe/.test(toml) && /push-send/.test(toml), 'functions en config.toml');
assert.ok(/push-dispatch-reengage/.test(toml), 'cron function en config.toml');

const sql = read('supabase/migrations/041_push_subscriptions.sql');
assert.ok(/pt_push_subscriptions/.test(sql), 'tabla');
assert.ok(/auth\.uid\(\)::text/.test(sql), 'RLS uid');
assert.ok(/push_subscriptions_select_own/.test(sql), 'policy select');
assert.ok(/on delete cascade/.test(sql), 'cascade al borrar cuenta');

console.log('*** push-edge-contract OK ***');
