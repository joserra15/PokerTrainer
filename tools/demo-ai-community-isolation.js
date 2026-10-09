/* Demo visual: hilos ForgeCoach independientes PokerForge vs MTTLab. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.join(__dirname, '..');
const localStore = {};
let ACTIVE = 'pokerforge';
const sandbox = {
  window: {}, console, Math, Date, JSON, Number, String, Object, Array,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; },
    clear: () => { Object.keys(localStore).forEach((k) => delete localStore[k]); }
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
sandbox.PTCommunity = {
  id: function () { return ACTIVE; },
  progressKey: function () {
    return ACTIVE === 'pokerforge' ? 'school_progress' : ('school_progress_' + ACTIVE);
  }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8'), sandbox, { filename: 'storage.js' });
const Store = sandbox.Store;
Store.setUserId('demo_user');

function keysMatching(re) {
  return Object.keys(localStore).filter(function (k) { return re.test(k); }).sort();
}

(async function main() {
  console.log('=== ForgeCoach: aislamiento PokerForgeAI ↔ MTTLab ===\n');

  ACTIVE = 'pokerforge';
  await Store.appendCoachEntry(
    { kind: 'stats' },
    { mode: 'report', reportMarkdown: 'Informe PF: trabaja 3-bet CO', createdAt: new Date().toISOString() }
  );
  console.log('[PokerForge] hilo stats:', Store.getCoachThread({ kind: 'stats' }).map(function (t) {
    return t.reportMarkdown;
  }));
  console.log('[PokerForge] claves localStorage:', keysMatching(/stats_coach/));

  ACTIVE = 'mttlab';
  console.log('\n[MTTLab] al entrar (sin consultas propias):', Store.getCoachThread({ kind: 'stats' }));
  assert.strictEqual(Store.getCoachThread({ kind: 'stats' }).length, 0, 'no debe ver hilo PF');

  await Store.appendCoachEntry(
    { kind: 'stats' },
    { mode: 'report', reportMarkdown: 'Informe MTTLab: ICM burbuja mid-stack', createdAt: new Date().toISOString() }
  );
  console.log('[MTTLab] hilo stats:', Store.getCoachThread({ kind: 'stats' }).map(function (t) {
    return t.reportMarkdown;
  }));
  console.log('[MTTLab] campo sesión:', Store.coachThreadField());
  console.log('[MTTLab] claves localStorage:', keysMatching(/stats_coach/));

  ACTIVE = 'pokerforge';
  const pf = Store.getCoachThread({ kind: 'stats' });
  console.log('\n[PokerForge] tras consultar en MTTLab:', pf.map(function (t) { return t.reportMarkdown; }));
  assert.ok(pf.length === 1 && pf[0].reportMarkdown.indexOf('PF') >= 0);
  assert.ok(!pf.some(function (t) { return /MTTLab|ICM/.test(t.reportMarkdown); }));

  console.log('\nClaves finales (independientes):');
  keysMatching(/stats_coach/).forEach(function (k) {
    console.log(' -', k);
  });
  console.log('\nOK: consultas IA aisladas por comunidad.');
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
