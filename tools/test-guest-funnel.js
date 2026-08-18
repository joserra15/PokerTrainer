/* Embudo landing → invitado → registro (admin Uso). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');
assert.ok(/PT_BUILD\s*=\s*'2.5.65'/.test(version), 'versión 2.5.65');

const sql = fs.readFileSync(path.join(root, 'supabase/migrations/040_guest_funnel.sql'), 'utf8');
assert.ok(/pt_guest_funnel_events/.test(sql), 'tabla embudo');
assert.ok(/enable row level security/.test(sql), 'RLS');
assert.ok(/revoke all on table public.pt_guest_funnel_events from anon/.test(sql), 'sin SELECT/INSERT anon');
assert.ok(/pt_guest_funnel_ingest/.test(sql) && /grant execute[\s\S]*anon, authenticated/.test(sql), 'ingest anon');
assert.ok(/pt_admin_guest_funnel/.test(sql) && /is_pt_admin/.test(sql), 'RPC admin');
assert.ok(/drop_by_hand/.test(sql) && /no_login/.test(sql) && /converted/.test(sql), 'métricas admin');
assert.ok(/guest_hand/.test(sql) && /guest_convert/.test(sql) && /landing_view/.test(sql), 'eventos');
assert.ok(/unique_key/.test(sql) && /landing_view:/.test(sql), 'dedupe diario landing');

const funnelSrc = fs.readFileSync(path.join(root, 'js/guest-funnel.js'), 'utf8');
assert.ok(!/getClient\s*\(/.test(funnelSrc), 'embudo no usa getClient Auth');
assert.ok(/rest\/v1\/rpc\/pt_guest_funnel_ingest/.test(funnelSrc), 'ingest fetch anon');
assert.ok(/isOAuthReturn/.test(funnelSrc), 'omite callback OAuth');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(/js\/guest-funnel\.js/.test(html), 'guest-funnel en early scripts');
assert.ok(/Embudo de la landing/.test(html), 'copy panel Uso');

const adminSrc = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
assert.ok(/pt_admin_guest_funnel/.test(adminSrc), 'admin llama RPC embudo');
assert.ok(/renderGuestFunnelSection/.test(adminSrc), 'UI embudo');
assert.ok(/Se registraron tras jugar/.test(adminSrc), 'KPI registro');
assert.ok(/En qué mano se quedan/.test(adminSrc), 'drop-off por mano');
assert.ok(/data-admin-funnel-days/.test(adminSrc), 'filtro periodo');

const landing = fs.readFileSync(path.join(root, 'js/landing.js'), 'utf8');
assert.ok(/PTGuestFunnel/.test(landing) && /scheduleLandingView/.test(landing), 'landing → funnel');
assert.ok(/startLoginNow\(source\)/.test(landing), 'source login');
assert.ok(/guest_login/.test(landing), 'login desde gate ≠ Entrar');
assert.ok(/PT_startGoogleLogin\(\);\s*if \(source === 'guest'\) trackFunnel/.test(
  landing.replace(/\s+/g, ' ')
), 'OAuth se dispara antes de telemetría guest_login');

const guest = fs.readFileSync(path.join(root, 'js/guest-mode.js'), 'utf8');
assert.ok(/PTGuestFunnel/.test(guest), 'guest track funnel');
assert.ok(/startLoginNow\('guest'\)/.test(guest), 'gate marca guest_login');

const cookies = fs.readFileSync(path.join(root, 'legal/cookies.html'), 'utf8');
assert.ok(/pt_funnel_vid/.test(cookies) && /pt_guest_v1/.test(cookies), 'cookies documentan vid');

const privacy = fs.readFileSync(path.join(root, 'legal/privacidad.html'), 'utf8');
assert.ok(/embudo anónimo/.test(privacy), 'privacidad menciona embudo');

const localStore = {};
const sandbox = {
  window: {},
  console,
  setTimeout: function (fn) { if (typeof fn === 'function') fn(); return 1; },
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  },
  document: {
    getElementById: function () { return { classList: { contains: function () { return false; } } }; },
    body: { classList: { contains: function () { return false; } } }
  },
  addEventListener: function () {},
  location: { href: 'https://www.pokerforgeai.com/' },
  fetch: function () { return { catch: function () {} }; },
  PT_SUPABASE: { url: 'https://example.supabase.co', anonKey: 'anon' }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(root, 'js/guest-funnel.js'), 'utf8'),
  sandbox,
  { filename: 'guest-funnel.js' }
);

const F = sandbox.window.PTGuestFunnel;
assert.ok(F, 'PTGuestFunnel');
const vid = F.visitorId();
assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(vid), 'uuid visitante');
assert.strictEqual(F.visitorId(), vid, 'vid estable');
assert.strictEqual(localStore.pt_funnel_vid, vid, 'persiste en localStorage');

const payload = F.rpcPayload('guest_hand', { index: 3, trap: 'g1-ato-bb-vs-utg' });
assert.strictEqual(payload.p_visitor_id, vid);
assert.strictEqual(payload.p_event, 'guest_hand');
assert.strictEqual(payload.p_hand_index, 3);
assert.strictEqual(payload.p_trap_id, 'g1-ato-bb-vs-utg');

assert.strictEqual(F.track('not_an_event'), false, 'rechaza evento desconocido');
assert.strictEqual(F.track('cta_try'), true, 'primer cta_try');
assert.strictEqual(F.track('cta_try'), false, 'dedupe cta_try');
assert.strictEqual(F.track('guest_hand', { index: 1 }), true);
assert.strictEqual(F.track('guest_hand', { index: 2 }), true, 'manos distintas no dedupean');
assert.strictEqual(F.track('guest_hand', { index: 1 }), false, 'misma mano dedupe');

sandbox.location.href = 'https://www.pokerforgeai.com/?code=oauth-test';
assert.strictEqual(F.isOAuthReturn(), true, 'detecta retorno Google');
assert.strictEqual(F.track('guest_start'), false, 'no ingest durante ?code=');
sandbox.location.href = 'https://www.pokerforgeai.com/';

const rls = fs.readFileSync(path.join(root, 'tools/test-rls-policies.js'), 'utf8');
assert.ok(/040_guest_funnel/.test(rls), 'RLS test cubre 040');

console.log('*** test-guest-funnel OK ***');
