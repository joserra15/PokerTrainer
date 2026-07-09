/* Exporta tablas actuales a data/ranges/*.json (desarrollo). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const dataJs = fs.readFileSync(path.join(root, 'js', 'engine', 'ranges', 'data.js'), 'utf8');
const extJs = fs.readFileSync(path.join(root, 'js', 'engine', 'ranges', 'extended.js'), 'utf8');
const sandbox = { window: {}, console: console };
vm.runInNewContext(dataJs + '\n' + extJs, sandbox);
const D = sandbox.window.GTORangesData;

const outDir = path.join(root, 'data', 'ranges');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'vs-rfi-6max-100bb.json'), JSON.stringify({
  meta: { spot: 'vsRFI', format: 'cash6', stackBB: 100, updated: new Date().toISOString().slice(0, 10) },
  pairs: D.VS_RFI
}, null, 2), 'utf8');

fs.writeFileSync(path.join(outDir, 'vs-3bet-6max-100bb.json'), JSON.stringify({
  meta: { spot: 'face3bet', format: 'cash6', stackBB: 100, updated: new Date().toISOString().slice(0, 10) },
  pairs: D.VS_3BET_PAIRS
}, null, 2), 'utf8');

console.log('Exported vs-rfi and vs-3bet JSON to data/ranges/');
