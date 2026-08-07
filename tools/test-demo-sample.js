/* RG-G03 — demo-mode / sample-session APIs coherentes. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const demoSrc = fs.readFileSync(path.join(root, 'js/demo-mode.js'), 'utf8');
const sampleSrc = fs.readFileSync(path.join(root, 'js/sample-session.js'), 'utf8');

assert.ok(/PTDemo/.test(demoSrc), 'PTDemo');
assert.ok(/isActive|DEMO_USER_ID|pt_demo_mode/.test(demoSrc), 'demo flags');
assert.ok(/start|stop|bindUi/.test(demoSrc), 'demo lifecycle');

assert.ok(/PTSampleSession/.test(sampleSrc), 'PTSampleSession');
assert.ok(/SAMPLE_ID|ensureForUser|isSampleId/.test(sampleSrc), 'sample APIs');
assert.ok(/demo-session\.json|pt_sample/.test(sampleSrc), 'sample data source');

const localStore = {};
const sandbox = {
  window: {},
  console,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  },
  addEventListener() {},
  dispatchEvent() { return true; },
  CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
  fetch: async () => ({
    ok: true,
    json: async () => ({ id: 'pt_sample_session_v1', hands: [{ id: '1' }], nTotal: 1 })
  })
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

// Cargar sample-session sin auto-bind de demo DOM
vm.runInContext(sampleSrc.replace(/\bbindUi\(\)\s*;?/, ''), sandbox, { filename: 'sample-session.js' });
const Sample = sandbox.window.PTSampleSession;
assert.ok(Sample, 'PTSampleSession export');
if (Sample.SAMPLE_ID) assert.ok(/sample/i.test(Sample.SAMPLE_ID));
if (Sample.isSampleId) {
  assert.strictEqual(Sample.isSampleId(Sample.SAMPLE_ID || 'pt_sample_session_v1'), true);
  assert.strictEqual(Sample.isSampleId('other'), false);
}

const demoJson = path.join(root, 'data/demo-session.json');
if (fs.existsSync(demoJson)) {
  const data = JSON.parse(fs.readFileSync(demoJson, 'utf8'));
  assert.ok(data.hands || data.nTotal != null || data.id, 'demo-session.json coherente');
}

console.log('*** demo-sample OK ***');
