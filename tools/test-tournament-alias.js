/* Alias de torneo: unicidad + UI en settings y cabecera. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');

const profileSrc = fs.readFileSync(path.join(root, 'js/user-profile.js'), 'utf8');
const settingsSrc = fs.readFileSync(path.join(root, 'js/account-settings.js'), 'utf8');
const uiSrc = fs.readFileSync(path.join(root, 'js/tournament/ui.js'), 'utf8');
const lbSrc = fs.readFileSync(path.join(root, 'js/tournament/leaderboard.js'), 'utf8');
const migSrc = fs.readFileSync(path.join(root, 'supabase/migrations/053_tournament_alias.sql'), 'utf8');

assert.ok(/tournament_alias/.test(migSrc), 'migration column');
assert.ok(/pt_set_tournament_alias/.test(migSrc), 'migration setter RPC');
assert.ok(/pt_user_profiles_tournament_alias_uidx/.test(migSrc), 'unique index');
assert.ok(/alias_taken/.test(migSrc), 'taken error');
assert.ok(/tournament_alias/.test(migSrc) && /pt_get_account_settings/.test(migSrc),
  'settings returns alias');

const sandbox = {
  window: {},
  console,
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(profileSrc, sandbox, { filename: 'user-profile.js' });

const P = sandbox.window.PTProfile;
assert.ok(P, 'PTProfile');
assert.ok(P.normalizeAliasLocal, 'normalizeAliasLocal');
assert.ok(P.getTournamentDisplayName, 'getTournamentDisplayName');
assert.ok(P.setTournamentAlias, 'setTournamentAlias');

function assertNorm(raw, expected) {
  var got = P.normalizeAliasLocal(raw);
  assert.strictEqual(got.ok, expected.ok, 'ok for ' + JSON.stringify(raw));
  assert.strictEqual(got.alias, expected.alias, 'alias for ' + JSON.stringify(raw));
  if (expected.error) assert.strictEqual(got.error, expected.error, 'error for ' + JSON.stringify(raw));
}

assertNorm('', { ok: true, alias: null });
assertNorm('  RiverRat  ', { ok: true, alias: 'RiverRat' });
assertNorm('ab', { ok: false, alias: undefined, error: 'alias_length' });
assertNorm('a'.repeat(21), { ok: false, alias: undefined, error: 'alias_length' });
assertNorm('bad name', { ok: false, alias: undefined, error: 'alias_format' });
assertNorm('_oops', { ok: false, alias: undefined, error: 'alias_format' });
assertNorm('Hero', { ok: false, alias: undefined, error: 'alias_reserved' });

const user = { name: 'Juan Pérez', email: 'j@example.com' };
assert.strictEqual(P.getTournamentDisplayName({ user: user, firstTokenOnly: true }), 'Juan');
P.applyTournamentAlias(user, 'ChipChase');
assert.strictEqual(user.tournamentAlias, 'ChipChase');
assert.strictEqual(user.displayName, 'ChipChase');
assert.strictEqual(P.getTournamentAlias(user), 'ChipChase');
assert.strictEqual(P.getTournamentDisplayName({ user: user, firstTokenOnly: true }), 'ChipChase');
assert.strictEqual(P.getTournamentDisplayName({ user: user }), 'ChipChase');
P.applyTournamentAlias(user, null);
assert.strictEqual(P.getTournamentAlias(user), '');
assert.strictEqual(P.getTournamentDisplayName({ user: user, firstTokenOnly: true }), 'Juan');

assert.ok(/settings-tournament-alias/.test(settingsSrc), 'settings alias input');
assert.ok(/settings-save-alias/.test(settingsSrc), 'settings save button');
assert.ok(/setTournamentAlias/.test(settingsSrc), 'settings calls setTournamentAlias');
assert.ok(/edit-alias|trn-alias|aliasChipHtml|save-alias/.test(uiSrc), 'lobby alias UI');
assert.ok(/getTournamentDisplayName|getTournamentAlias/.test(uiSrc), 'ui uses alias');
assert.ok(/getTournamentDisplayName|getTournamentAlias/.test(lbSrc), 'leaderboard uses alias');

/* TOKEN_REFRESHED no debe borrar el alias hidratado del perfil. */
const bootSrc = fs.readFileSync(path.join(root, 'js/auth-bootstrap.js'), 'utf8');
const authSrc = fs.readFileSync(path.join(root, 'js/auth.js'), 'utf8');
assert.ok(/carryHydratedProfile|PT_carryHydratedProfile/.test(bootSrc), 'bootstrap carries profile');
assert.ok(/TOKEN_REFRESHED/.test(bootSrc) || /carryHydratedProfile/.test(bootSrc),
  'bootstrap documents token refresh carry');
assert.ok(/PT_carryHydratedProfile|tournamentAlias/.test(authSrc), 'enterApp soft path keeps alias');
assert.ok(/persistAuthUserSession|pt_auth_v1/.test(profileSrc), 'profile persists alias in session');
assert.ok(/emitTournamentAliasChanged|pt-tournament-alias-changed/.test(profileSrc),
  'profile notifies lobby after touchAndApply');

const carrySandbox = {
  window: {},
  console,
  atob: function (s) { return Buffer.from(s, 'base64').toString('binary'); },
  escape: encodeURIComponent,
  matchMedia: function () { return { matches: false, addListener: function () {}, addEventListener: function () {} }; },
  navigator: { maxTouchPoints: 0 },
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  },
  sessionStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  },
  document: {
    readyState: 'complete',
    body: { classList: { add() {}, remove() {}, contains() { return false; } } },
    getElementById() { return null; },
    querySelector() { return null; },
    addEventListener() {}
  },
  location: { origin: 'https://example.com', pathname: '/', href: 'https://example.com/' },
  setTimeout: function (fn) { return 0; },
  clearTimeout: function () {},
  Promise: Promise,
  CustomEvent: function CustomEvent(name, init) { this.type = name; this.detail = init && init.detail; },
  dispatchEvent() {},
  PT_E2E_MODE: true
};
carrySandbox.global = carrySandbox;
carrySandbox.window = carrySandbox;
vm.createContext(carrySandbox);
vm.runInContext(bootSrc, carrySandbox, { filename: 'auth-bootstrap.js' });
assert.ok(carrySandbox.PT_carryHydratedProfile, 'exported carryHydratedProfile');
const fresh = { sub: 'u1', email: 'a@b.c', name: 'José', authProvider: 'supabase' };
const hydrated = {
  sub: 'u1', email: 'a@b.c', name: 'José', tournamentAlias: 'KazeDj',
  displayName: 'KazeDj', plan: 'premium', isAdmin: true
};
carrySandbox.PT_carryHydratedProfile(hydrated, fresh);
assert.strictEqual(fresh.tournamentAlias, 'KazeDj', 'soft refresh keeps alias');
assert.strictEqual(fresh.displayName, 'KazeDj', 'soft refresh keeps displayName');
assert.strictEqual(fresh.plan, 'premium', 'soft refresh keeps plan');
assert.strictEqual(fresh.isAdmin, true, 'soft refresh keeps isAdmin');
const other = { sub: 'other', tournamentAlias: 'Nope' };
const target = { sub: 'u1', email: 'a@b.c' };
carrySandbox.PT_carryHydratedProfile(other, target);
assert.strictEqual(target.tournamentAlias, undefined, 'different sub does not carry');

console.log('*** tournament-alias OK ***');
