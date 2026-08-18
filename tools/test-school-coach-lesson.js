/* Consultas IA de Escuela: hilo persistente e aislado por lección. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const storageSrc = fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8');
const aiSrc = fs.readFileSync(path.join(root, 'js/ai-report.js'), 'utf8');
const schoolSrc = fs.readFileSync(path.join(root, 'js/school.js'), 'utf8');
const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');

assert.ok(/PT_BUILD\s*=\s*'2.5.66'/.test(version), 'versión 2.5.66');
assert.ok(/lessonId:\s*lesson\.id/.test(schoolSrc), 'mountCoach persiste lessonId');
assert.ok(/lessonId \? String\(lessonId\) : 'default'/.test(aiSrc), 'resolvePersistTarget learn+lessonId');
assert.ok(/learn_coach_lessons/.test(storageSrc), 'mapa learn_coach_lessons');

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
  CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; }
};
sandbox.global = sandbox;
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(storageSrc, sandbox, { filename: 'storage.js' });

const Store = sandbox.window.Store || sandbox.Store;
assert.ok(Store, 'Store');
Store.setUserId('u-coach');

const entryA = {
  mode: 'question',
  question: '¿Qué es RFI?',
  reportMarkdown: 'Respuesta lección A',
  createdAt: new Date().toISOString()
};
const entryB = {
  mode: 'question',
  question: '¿Qué es 3-bet?',
  reportMarkdown: 'Respuesta lección B',
  createdAt: new Date().toISOString()
};

async function main() {
  const r1 = await Store.appendCoachEntry({ kind: 'learn', lessonId: 'C-01' }, entryA);
  assert.ok(r1.ok, 'append C-01');
  const r2 = await Store.appendCoachEntry({ kind: 'learn', lessonId: 'C-02' }, entryB);
  assert.ok(r2.ok, 'append C-02');
  const t1 = Store.getCoachThread({ kind: 'learn', lessonId: 'C-01' });
  const t2 = Store.getCoachThread({ kind: 'learn', lessonId: 'C-02' });
  assert.strictEqual(t1.length, 1, 'C-01 un mensaje');
  assert.strictEqual(t2.length, 1, 'C-02 un mensaje');
  assert.ok(t1[0].reportMarkdown.indexOf('lección A') >= 0, 'C-01 guarda su hilo');
  assert.ok(t2[0].reportMarkdown.indexOf('lección B') >= 0, 'C-02 guarda su hilo');
  assert.ok(t1[0].reportMarkdown.indexOf('lección B') < 0, 'C-01 no ve C-02');
  console.log('*** test-school-coach-lesson OK ***');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
