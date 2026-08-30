/* Progreso Escuela: merge nube/local y push inmediato entre dispositivos. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');
const cloudSrc = fs.readFileSync(path.join(root, 'js/cloud-store.js'), 'utf8');
const schoolSrc = fs.readFileSync(path.join(root, 'js/school.js'), 'utf8');
const storageSrc = fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const ciSrc = fs.readFileSync(path.join(root, 'tools/run-ci-tests.js'), 'utf8');

assert.ok(/PT_BUILD\s*=\s*'3.1.1'/.test(version), 'versión 3.1.1');
assert.ok(/mergeDailySpotProgress/.test(storageSrc), 'merge dailySpot en storage');
assert.ok(/hasSchoolProgress/.test(cloudSrc), 'cloud hasSchoolProgress');
assert.ok(/hasSchoolProgress\(val\)/.test(cloudSrc), 'hasLocalData cuenta Escuela');
assert.ok(/hasSchoolProgress\(st\)/.test(storageSrc), 'isStatsEmpty cuenta Escuela');
assert.ok(!/if \(localDirty > cloudTs\)/.test(cloudSrc), 'no descarta payload cloud por dirty');
assert.ok(/Siempre fusionar nube/.test(cloudSrc), 'cloudPayloadForMerge siempre fusiona');
assert.ok(/flushPush/.test(schoolSrc) && /Safari/.test(schoolSrc), 'writeSchool hace flushPush');
assert.ok(/function refreshFromCloud/.test(schoolSrc), 'refreshFromCloud');
assert.ok(/state\.view !== VIEW\.hub/.test(schoolSrc), 'refreshFromCloud solo hub');
assert.ok(/pt-cloud-synced/.test(schoolSrc), 'school escucha pt-cloud-synced');
assert.ok(/refreshFromCloud/.test(appSrc), 'app refresca Escuela tras sync');
assert.ok(/maybeSyncOnVisible/.test(cloudSrc), 'pull al volver a la pestaña');
assert.ok(/visibilityState === 'visible'/.test(cloudSrc), 'visibility visible → sync');
assert.ok(/test-school-progress-sync\.js/.test(ciSrc), 'registrado en test:ci');

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
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; },
    clear: () => { Object.keys(localStore).forEach((k) => delete localStore[k]); }
  }
};
sandbox.global = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
vm.createContext(sandbox);
vm.runInContext(storageSrc, sandbox, { filename: 'storage.js' });

const Store = sandbox.window.Store;
assert.ok(Store && Store.mergeFromCloud && Store.setUserId, 'Store.mergeFromCloud');
Store.setUserId('user-school-sync');

const statsKey = 'pt_stats_v1_user-school-sync';
sandbox.localStorage.setItem(statsKey, JSON.stringify({
  handsPlayed: 0,
  decisions: 0,
  optima: 0,
  aceptable: 0,
  imprecisa: 0,
  error: 0,
  totalEvLoss: 0,
  totalNet: 0,
  byStreet: {},
  updatedAt: 10,
  school: {
    xp: 50,
    lessons: {
      'C-01': {
        passed: true,
        attempts: 1,
        bestScore: 0.7,
        gold: false,
        perfect: false,
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    },
    updatedAt: 100,
    version: 2
  }
}));

Store.mergeFromCloud({
  history: [],
  errors: [],
  stats: {
    handsPlayed: 0,
    decisions: 0,
    optima: 0,
    aceptable: 0,
    imprecisa: 0,
    error: 0,
    totalEvLoss: 0,
    totalNet: 0,
    byStreet: {},
    updatedAt: 20,
    school: {
      xp: 220,
      lessons: {
        'C-03': {
          passed: true,
          attempts: 3,
          bestScore: 1,
          gold: true,
          perfect: true,
          updatedAt: '2026-08-16T00:00:00.000Z'
        }
      },
      updatedAt: 900,
      version: 2
    }
  }
});

const school = Store.getStats().school;
assert.ok(school, 'school tras merge');
assert.strictEqual(school.xp, 220, 'xp = max(local, cloud)');
assert.ok(school.lessons['C-01'] && school.lessons['C-01'].passed, 'conserva lección local');
assert.ok(school.lessons['C-03'] && school.lessons['C-03'].gold, 'une lección cloud');
assert.strictEqual(school.lessons['C-03'].attempts, 3);

sandbox.localStorage.setItem(statsKey, JSON.stringify({
  handsPlayed: 0,
  decisions: 0,
  optima: 0,
  aceptable: 0,
  imprecisa: 0,
  error: 0,
  totalEvLoss: 0,
  totalNet: 0,
  byStreet: {},
  updatedAt: 1,
  school: {
    xp: 80,
    lessons: { 'S-00': { passed: true, attempts: 1, bestScore: 1, updatedAt: '2026-02-01T00:00:00.000Z' } },
    updatedAt: 50,
    version: 2
  }
}));
Store.mergeFromCloud({
  history: [],
  errors: [],
  stats: { handsPlayed: 0, decisions: 0 }
});
const schoolOnly = Store.getStats().school;
assert.ok(schoolOnly && schoolOnly.lessons['S-00'], 'progreso solo-Escuela no se borra si cloud no trae school');
assert.ok(schoolOnly.lessons['C-01'] && schoolOnly.lessons['C-03'],
  'clave propia repone lecciones aunque se reescriba stats');
assert.strictEqual(schoolOnly.xp, 220, 'xp nunca retrocede (clave propia)');

/* Clave propia: el progreso sobrevive a que stats se pise o se quede sin espacio. */
(function assertDedicatedSchoolKey() {
  assert.ok(typeof Store.getSchoolProgress === 'function', 'Store.getSchoolProgress');
  assert.ok(typeof Store.saveSchoolProgress === 'function', 'Store.saveSchoolProgress');
  const saved = Store.saveSchoolProgress({
    xp: 300,
    lessons: {
      'R-08': { passed: true, attempts: 1, bestScore: 0.75, bestPct: 75, updatedAt: '2026-08-21T00:00:00.000Z' }
    },
    updatedAt: Date.now(),
    version: 2
  });
  assert.ok(saved, 'saveSchoolProgress OK');
  assert.ok(localStore['pt_school_progress_v1_user-school-sync'], 'escribe clave dedicada');

  /* Simula stats borrado por otra ruta (cuota, clear, snapshot antiguo). */
  sandbox.localStorage.setItem(statsKey, JSON.stringify({
    handsPlayed: 0, decisions: 0, byStreet: {}, updatedAt: 2
  }));
  const rehydrated = Store.getStats().school;
  assert.ok(rehydrated && rehydrated.lessons['R-08'] && rehydrated.lessons['R-08'].passed,
    'R-08 se repone desde clave dedicada tras perder stats');
  assert.strictEqual(rehydrated.lessons['R-08'].bestPct, 75, 'conserva 75%');

  /* Snapshot para la nube incluye Escuela → sincroniza con el PC. */
  const snap = Store.getCloudSnapshot();
  assert.ok(snap.stats && snap.stats.school && snap.stats.school.lessons['R-08'],
    'getCloudSnapshot sube Escuela');

  /* replaceFromCloud (nube gana) no puede borrar Escuela local. */
  Store.replaceFromCloud({
    stats: { handsPlayed: 5, decisions: 5, byStreet: {}, updatedAt: 999 },
    history: [],
    errors: []
  });
  const afterReplace = Store.getStats().school;
  assert.ok(afterReplace && afterReplace.lessons['R-08'],
    'replaceFromCloud conserva Escuela local');
})();

/* Cuota llena: stats no cabe pero Escuela sí (clave pequeña). */
(function assertSurvivesQuotaFull() {
  const realSet = sandbox.localStorage.setItem;
  sandbox.localStorage.setItem = function (k, v) {
    if (k === statsKey) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    return realSet.call(this, k, v);
  };
  let saved = false;
  try {
    saved = Store.saveSchoolProgress({
      xp: 400,
      lessons: {
        'R-09': { passed: true, attempts: 1, bestScore: 1, bestPct: 100, updatedAt: '2026-08-21T01:00:00.000Z' }
      },
      updatedAt: Date.now(),
      version: 2
    });
  } finally {
    sandbox.localStorage.setItem = realSet;
  }
  assert.ok(saved, 'saveSchoolProgress OK aunque stats no quepa');
  const prog = Store.getSchoolProgress();
  assert.ok(prog && prog.lessons['R-09'] && prog.lessons['R-09'].passed,
    'R-09 persiste con stats sin espacio');
  assert.ok(prog.lessons['R-08'], 'no pierde R-08 previa');
  assert.ok(Store.getStats().school.lessons['R-09'],
    'getStats repone R-09 desde clave dedicada');
})();

assert.ok(/saveSchoolProgress/.test(schoolSrc), 'writeSchool usa clave dedicada de Store');
assert.ok(/getSchoolProgress/.test(schoolSrc), 'readDurableSchool lee clave dedicada');
assert.ok(/writeResilient/.test(storageSrc), 'escrituras con reintento tras liberar espacio');

vm.runInContext(schoolSrc, sandbox, { filename: 'school.js' });
assert.ok(sandbox.window.PTSchool && typeof sandbox.window.PTSchool.refreshFromCloud === 'function',
  'PTSchool.refreshFromCloud');
sandbox.window.PTSchool._state.view = 'lesson';
sandbox.window.PTSchool.refreshFromCloud();

/* Racha spot del día: merge nube/local entre dispositivos. */
(function assertDailySpotMerge() {
  Store.saveSchoolProgress({
    xp: 10,
    lessons: {},
    dailySpot: {
      lastDay: '2026-08-27',
      completed: true,
      correct: true,
      streak: 3,
      best: 3,
      total: 3
    },
    updatedAt: 100,
    version: 2
  });
  Store.mergeFromCloud({
    history: [],
    errors: [],
    stats: {
      handsPlayed: 0,
      decisions: 0,
      optima: 0,
      aceptable: 0,
      imprecisa: 0,
      error: 0,
      totalEvLoss: 0,
      totalNet: 0,
      byStreet: {},
      updatedAt: 200,
      school: {
        xp: 10,
        lessons: {},
        dailySpot: {
          lastDay: '2026-08-28',
          completed: true,
          correct: true,
          streak: 1,
          best: 5,
          total: 4
        },
        updatedAt: 200,
        version: 2
      }
    }
  });
  const ds = Store.getStats().school && Store.getStats().school.dailySpot;
  assert.ok(ds, 'dailySpot tras merge cloud');
  assert.strictEqual(ds.lastDay, '2026-08-28', 'conserva día más reciente');
  assert.ok(ds.streak >= 4, 'racha consecutiva tras merge (3+1)');
  assert.strictEqual(ds.best, 5, 'best = max local/cloud');
  assert.strictEqual(ds.total, 4, 'total = max intentos');

  const snap = Store.getCloudSnapshot();
  assert.ok(snap.stats && snap.stats.school && snap.stats.school.dailySpot,
    'snapshot nube incluye dailySpot');
})();

console.log('*** school-progress-sync OK ***');
