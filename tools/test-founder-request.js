/* FOUNDER Study/Coach request UI + migration markers */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const mig037 = fs.readFileSync(path.join(root, 'supabase/migrations/037_founder_seats.sql'), 'utf8');
const mig038 = fs.readFileSync(path.join(root, 'supabase/migrations/038_founder_study_coach.sql'), 'utf8');
const founderSrc = fs.readFileSync(path.join(root, 'js/founder-request.js'), 'utf8');
const adminSrc = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
const accountSrc = fs.readFileSync(path.join(root, 'js/account-settings.js'), 'utf8');
const landingSrc = fs.readFileSync(path.join(root, 'js/landing.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const billingCfg = fs.readFileSync(path.join(root, 'js/billing-config.js'), 'utf8');

assert.ok(/is_founder/.test(mig037), '037 is_founder');
assert.ok(/is_founder_study/.test(mig038), '038 is_founder_study');
assert.ok(/is_founder_coach/.test(mig038), '038 is_founder_coach');
assert.ok(/Solicitud de Founder/.test(mig038) && /plan_label := 'Study'/.test(mig038), 'subject Study');
assert.ok(/plan_label := 'Coach'/.test(mig038), 'subject Coach');
assert.ok(/p_is_founder_study/.test(mig038), 'admin update study');
assert.ok(/p_is_founder_coach/.test(mig038), 'admin update coach');
assert.ok(/pt_request_founder_seat\(p_plan text/.test(mig038), 'RPC con p_plan');

assert.ok(/normalizePlan/.test(founderSrc), 'normalizePlan');
assert.ok(/data-founder-request/.test(founderSrc), 'data attr');
assert.ok(/p_plan/.test(founderSrc), 'RPC client p_plan');

assert.ok(/próximamente/.test(billingCfg), 'billing-config próximamente');
assert.ok(/Plazas limitadas por petición/.test(billingCfg), 'plazas por petición');
assert.ok(/próximamente/.test(html), 'HTML próximamente');
assert.ok(!/15 de noviembre/.test(html), 'HTML sin 15 de noviembre');

assert.ok(/data-founder-request="study"/.test(landingSrc) || /founderPlan.*study/.test(landingSrc), 'landing Study');
assert.ok(/founderPlan: paused \? 'coach'/.test(landingSrc), 'landing Coach founder CTA');
assert.ok(/requestButtonHtml\('study'/.test(appSrc), 'planes Study CTA');
assert.ok(/requestButtonHtml\('coach'/.test(appSrc), 'planes Coach CTA');

assert.ok(/is_founder_study/.test(adminSrc) && /is_founder_coach/.test(adminSrc), 'admin dual flags');
assert.ok(/req_study/.test(adminSrc) && /req_coach/.test(adminSrc), 'admin filters');
assert.ok(/FOUNDER Study/.test(accountSrc) && /FOUNDER Coach/.test(accountSrc), 'cuenta dual');

assert.ok(/admin-filter-founder/.test(html), 'filtro Founder');
assert.ok(/data-sort="founder_study"/.test(html), 'sort Study');
assert.ok(/data-sort="founder_coach"/.test(html), 'sort Coach');

const sandbox = {
  window: {},
  console,
  sessionStorage: {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; }
  },
  document: { getElementById() { return null; } },
  alert() {},
  setTimeout(fn) { return fn(); }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(founderSrc, sandbox, { filename: 'founder-request.js' });
const F = sandbox.PTFounderRequest;
assert.ok(F, 'export');
assert.strictEqual(F.normalizePlan('premium'), 'coach');
assert.strictEqual(F.subjectFor('study'), 'Solicitud de Founder Study');
assert.strictEqual(F.subjectFor('coach'), 'Solicitud de Founder Coach');
F.markPending('coach');
assert.strictEqual(F.readPending(), 'coach');
F.clearPending();
assert.ok(!F.hasPending());

console.log('*** founder-request OK (Study/Coach) ***');
