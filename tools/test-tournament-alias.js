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

console.log('*** tournament-alias OK ***');
