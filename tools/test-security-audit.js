/* Security audit regression: share XSS, freePromo, AI RPC grants, CORS, push URL, entitlements. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

// --- share.html: no document.write of shared HTML; sandboxed iframe + CSP ---
const shareHtml = read('share.html');
assert.ok(/Content-Security-Policy/i.test(shareHtml), 'share.html CSP');
assert.ok(/sandbox/i.test(shareHtml) && /share-frame/.test(shareHtml), 'share iframe sandbox');
assert.ok(!/document\.write\s*\(\s*html\s*\)/.test(shareHtml), 'share no document.write(html)');
assert.ok(/srcdoc/.test(shareHtml), 'share uses srcdoc');

// --- share-hand edge: sanitize + reject ---
const shareEdge = read('supabase/functions/share-hand/index.ts');
assert.ok(/sanitizeShareHtml/.test(shareEdge), 'sanitizeShareHtml');
assert.ok(/html_rejected/.test(shareEdge), 'rejects residual dangerous HTML');
assert.ok(/<\s*script/i.test(shareEdge) || /script\|iframe/.test(shareEdge), 'strips script/iframe');
assert.ok(/corsFor|jsonFor/.test(shareEdge), 'share CORS allowlist helpers');
assert.ok(!/Access-Control-Allow-Origin': '\*'/.test(shareEdge), 'share no CORS *');

// --- analyze-hand: freePromo gated + fail-closed ---
const analyze = read('supabase/functions/analyze-hand/index.ts');
assert.ok(/isHomeGreetingPayload\(enrichedPayload\)/.test(analyze), 'freePromo requires greeting payload');
assert.ok(/id\.length > 0/.test(analyze) && /label\.length > 0/.test(analyze), 'greeting id+label required');
assert.ok(/error:\s*'server_config'/.test(analyze) || /server_config/.test(analyze), 'AI fail-closed');
assert.ok(!/if \(!admin\) return \{ ok: true/.test(analyze), 'no fail-open when admin missing');
assert.ok(/corsFor|jsonFor/.test(analyze), 'analyze CORS allowlist');

// --- migration 068: AI RPC revoke authenticated ---
const mig068 = read('supabase/migrations/068_security_hardening.sql');
assert.ok(/revoke all on function public\.pt_record_ai_usage/i.test(mig068), 'revoke record_ai_usage');
assert.ok(/revoke all on function public\.pt_check_ai_access/i.test(mig068), 'revoke check_ai_access');
assert.ok(/from authenticated/i.test(mig068), 'revoke from authenticated');
assert.ok(/grant execute[\s\S]*service_role/i.test(mig068), 'grant service_role only');
assert.ok(/drop policy if exists pt_app_settings_read_auth/i.test(mig068), 'drop app_settings open read');
assert.ok(/villain_assist_enabled/.test(mig068) && /forbidden/.test(mig068), 'settings allowlist');
assert.ok(/plan.*pro.*premium|in \('pro', 'premium'\)/i.test(mig068), 'cache put paid gate');

// --- http.ts CORS + safePushUrl ---
const httpShared = read('supabase/functions/_shared/http.ts');
assert.ok(/isAllowedOrigin/.test(httpShared), 'isAllowedOrigin');
assert.ok(/pokerforgeai\.com/.test(httpShared), 'site origin allowlisted');
assert.ok(/safePushUrl/.test(httpShared), 'safePushUrl');
assert.ok(!/Access-Control-Allow-Origin': '\*'/.test(httpShared), 'http.ts no CORS *');

// --- push-send uses safePushUrl ---
const pushSend = read('supabase/functions/push-send/index.ts');
assert.ok(/safePushUrl/.test(pushSend), 'push-send safePushUrl');

// --- SW same-origin push ---
const sw = read('sw.js');
assert.ok(/scopeOrigin|registration\.scope/.test(sw), 'SW origin check');
assert.ok(/abs\.origin !== scopeOrigin/.test(sw), 'SW rejects cross-origin');

// --- entitlements: no client isAdmin OR; always trainer RPC ---
const entSrc = read('js/entitlements.js');
assert.ok(/freeClosedFallback/.test(entSrc), 'fail-closed fallback');
assert.ok(/_fromServer/.test(entSrc), 'server flag');
assert.ok(!/if \(!data\.is_admin && isAdmin\(\)\) data\.is_admin = true/.test(entSrc),
  'no merge client isAdmin onto server data');
assert.ok(/Trust server is_admin only|server-derived/i.test(entSrc), 'documents server trust');
assert.ok(/Always call|siempre RPC|siempre registrar|pt_record_trainer_hand/.test(entSrc),
  'trainer record path present');
// unlimited() must not OR client isAdmin() call
const unlimitedFn = entSrc.match(/function unlimited\(ent\) \{[\s\S]*?\n  \}/);
assert.ok(unlimitedFn, 'unlimited fn');
assert.ok(!/\|\|\s*isAdmin\s*\(/.test(unlimitedFn[0]) && !/isAdmin\s*\(\s*\)/.test(
  unlimitedFn[0].replace(/\/\*[\s\S]*?\*\//g, '')
), 'unlimited ignores client isAdmin');

// Runtime: forged isAdmin must not escalate when using server-shaped free ent
const localStore = {};
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
  CustomEvent: function () {},
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  }
};
sandbox.global = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
vm.createContext(sandbox);
vm.runInContext(entSrc, sandbox, { filename: 'entitlements.js' });
const Ent = sandbox.window.PTEntitlements;
assert.ok(Ent, 'PTEntitlements');

sandbox.window.PTAuth = {
  getUser: () => ({ isAdmin: true, plan: 'premium', id: 'attacker' })
};
sandbox.window.PT_SUPABASE = { useAuth: true };
// Simulate server free entitlements after normalize path via canUseAI with explicit free ent
const freeEnt = {
  plan: 'free',
  is_admin: false,
  unlimited: false,
  _fromServer: true,
  limits: {
    trainer_hands_per_day: 15,
    import_sessions_per_month: 1,
    max_hands_per_import: 200,
    ai_reports_per_month: 3,
    history_days: 30,
    analysis_hands_max: 5
  },
  usage: { trainer_hands_today: 0, import_sessions_month: 0, ai_reports_month: 0 },
  bonus: { balance: 0 }
};
assert.strictEqual(Ent.unlimited(freeEnt), false, 'forged client admin does not unlimited server free');
const ai = Ent.canUseAI(freeEnt);
assert.ok(ai.ok === true || ai.reason === 'ai_limit' || ai.limit === 3 || ai.ok,
  'canUseAI respects free ent');
assert.ok(!ai.unlimited, 'canUseAI not unlimited for free despite client isAdmin');

// session-export escape
const exp = read('js/session-export.js');
assert.ok(/function escapeHtml/.test(exp), 'session-export escapeHtml');
assert.ok(/escapeHtml\(h\.heroCode/.test(exp) || /escapeHtml\(h\.heroCode \|\|/.test(exp),
  'escapes heroCode');

console.log('*** security-audit OK ***');
