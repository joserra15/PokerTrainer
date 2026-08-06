/* Regresión growth UX: blog, rebaja MTT, gamificación ligera y +18. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const i18n = fs.readFileSync(path.join(root, 'js', 'i18n.js'), 'utf8');
const gamificationJs = fs.readFileSync(path.join(root, 'js', 'gamification.js'), 'utf8');
const ageGateJs = fs.readFileSync(path.join(root, 'js', 'age-gate.js'), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');

assert(/blog\/index\.html/.test(indexHtml), 'landing enlaza al blog');
assert(/home-gamification/.test(indexHtml), 'home tiene host de gamificación');
assert(/stats-gamification/.test(indexHtml), 'stats tiene host de gamificación');
assert(/age-gate-modal/.test(indexHtml), 'modal de +18 presente');
assert(/MTT preflop parcial/.test(indexHtml), 'claim MTT rebajado en cabecera');
assert(/soporte de torneo es parcial/i.test(i18n), 'copy MTT rebajado en i18n');
assert(/blog\/fugas-nl25\.html/.test(sitemap), 'sitemap incluye blog fugas');
assert(/blog\/importar-winamax\.html/.test(sitemap), 'sitemap incluye blog Winamax');

['index.html', 'fugas-nl25.html', 'importar-winamax.html', 'review-ggpoker.html'].forEach((file) => {
  assert(fs.existsSync(path.join(root, 'blog', file)), 'existe blog/' + file);
});

const localStore = {};
const sandbox = {
  window: {},
  console,
  Date,
  JSON,
  Math,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  },
  document: {
    getElementById: () => null,
    body: { classList: { add() {}, remove() {} } }
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
sandbox.window.document = sandbox.document;
vm.createContext(sandbox);

vm.runInContext(gamificationJs, sandbox, { filename: 'gamification.js' });
vm.runInContext(ageGateJs, sandbox, { filename: 'age-gate.js' });

const G = sandbox.window.PTGamification;
const A = sandbox.window.PTAgeGate;
assert.ok(G && G.snapshot, 'PTGamification exportado');
assert.ok(A && A.isConfirmed && A.remember, 'PTAgeGate exportado');

const now = new Date();
const d0 = now.toISOString();
const d1 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
const d2 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
const snap = G.snapshot({
  getHistory() {
    return [
      { createdAt: d0, decisions: [{ class: 'optima' }, { class: 'aceptable' }] },
      { createdAt: d1, decisions: [{ class: 'error' }] },
      { createdAt: d2, decisions: [{ class: 'optima' }] }
    ];
  },
  getSessions() {
    return [{ createdAt: d1 }];
  },
  getErrors() {
    return [{ id: 'e1' }];
  }
});

assert.ok(snap.streak.current >= 2, 'racha calculada');
assert.ok(snap.rating >= 700, 'rating mínimo calculado');
assert.strictEqual(typeof snap.ratingTier, 'string');

const user = { sub: 'u1', email: 'u1@example.com' };
assert.ok(!A.isConfirmed(user), 'usuario sin confirmar inicialmente');
A.remember(user);
assert.ok(A.isConfirmed(user), 'usuario confirmado tras remember');

console.log('test-growth-ux: OK');
