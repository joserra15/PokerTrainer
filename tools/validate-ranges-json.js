/* Valida data/ranges/rfi-6max-100bb.json (Q-03). Ejecutar: node tools/validate-ranges-json.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsonPath = path.join(__dirname, '..', 'data', 'ranges', 'rfi-6max-100bb.json');
const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const required = ['UTG', 'HJ', 'CO', 'BTN'];
const missing = required.filter((p) => !raw.positions || !raw.positions[p]);
if (missing.length) {
  console.error('FAIL: faltan posiciones', missing.join(', '));
  process.exit(1);
}

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON };
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'engine', 'ranges', 'notation.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'engine', 'ranges', 'data.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'engine', 'ranges', 'jsonLoader.js'), 'utf8'), sandbox, { filename: 'jsonLoader.js' });

sandbox.window.PT_RFI_JSON = raw;
sandbox.window.PTRangesJsonLoader.init();

const D = sandbox.window.GTORangesData;
let combos = 0;
required.forEach((pos) => {
  const row = D.OPEN_RAISE[pos];
  const N = sandbox.window.GTORangesNotation;
  const raise = N.expand(row.raise || '');
  const mix = N.expand(row.mix || '');
  const n = new Set(raise.concat(mix)).size;
  combos += n;
  if (n < 20) {
    console.error('FAIL:', pos, 'solo', n, 'combos');
    process.exit(1);
  }
  console.log('OK', pos + ':', n, 'combos en JSON');
});

console.log('*** RANGOS JSON OK (' + combos + ' combos únicos UTG–BTN) ***');
