/* Spins 3-max: iso vs limp solo desde SB/BB (nunca héroe BTN vs limp SB). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');
assert.ok(/PT_BUILD\s*=\s*'2\.5\.19'/.test(version), 'versión 2.5.19');

const spinSrc = fs.readFileSync(path.join(root, 'js/school-data-spin.js'), 'utf8');
assert.ok(/Spins 3-max: BTN actúa primero/.test(spinSrc), 'comentario orden 3-max');
assert.ok(!/iso\('s04-01',\s*'BTN',\s*'SB'/.test(spinSrc), 's04-01 ya no es BTN vs SB');
assert.ok(/bb\('s04-01'/.test(spinSrc) || /bbVsSbLimpSpot/.test(spinSrc), 's04-01 usa BB vs SB limp');
assert.ok(/Orden en Spin 3-max/.test(spinSrc), 'teoría orden de acción');
assert.ok(!/SB limpea, tú BTN/.test(spinSrc), 'sin ejemplo imposible SB limp / héroe BTN');

['school-data-mtt.js', 'school-data-pro.js', 'school-data-ranges.js'].forEach(function (name) {
  const src = fs.readFileSync(path.join(root, 'js', name), 'utf8');
  assert.ok(!/iso\('s04-0[124]',\s*'BTN',\s*'SB'/.test(src), name + ' sin BTN vs SB inválido');
});

const sandbox = { window: {}, console };
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

const files = [
  'js/school-data.js',
  'js/school-data-m1.js',
  'js/school-data-m2.js',
  'js/school-data-spin.js'
];

files.forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
});

const Data = sandbox.window.PTSchoolData || sandbox.PTSchoolData;
assert.ok(Data, 'PTSchoolData');
const lesson = Data.getLesson && Data.getLesson('S-04');
assert.ok(lesson, 'lección S-04');
assert.ok(Array.isArray(lesson.spots) && lesson.spots.length >= 10, 'spots S-04');

lesson.spots.forEach(function (spot) {
  if (spot.type === 'isoLimp') {
    assert.notStrictEqual(spot.heroPos, 'BTN', 'isoLimp no usa héroe BTN en Spin: ' + spot.id);
    assert.ok(
      (spot.heroPos === 'SB' && spot.limperPos === 'BTN') ||
      (spot.heroPos === 'BB' && spot.limperPos === 'SB'),
      'isoLimp válido 3-max: ' + spot.id
    );
  } else if (spot.type === 'bbVsSbLimp') {
    assert.strictEqual(spot.heroPos, 'BB', 'bbVsSbLimp hero BB: ' + spot.id);
  } else {
    assert.fail('tipo inesperado en S-04: ' + spot.type + ' (' + spot.id + ')');
  }
});

console.log('*** test-spin-iso-limp-order OK ***');
