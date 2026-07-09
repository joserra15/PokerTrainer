/* Genera js/engine/ranges/*-solver-data.js desde data/ranges/*.json */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'js', 'engine', 'ranges');
const dataDir = path.join(root, 'data', 'ranges');

const files = [
  { json: 'rfi-6max-100bb.json', global: 'PT_RFI_JSON', out: 'rfi-solver-data.js' },
  { json: 'vs-rfi-6max-100bb.json', global: 'PT_VS_RFI_JSON', out: 'vs-rfi-solver-data.js' },
  { json: 'vs-3bet-6max-100bb.json', global: 'PT_VS_3BET_JSON', out: 'vs-3bet-solver-data.js' }
];

files.forEach(function (f) {
  const src = path.join(dataDir, f.json);
  if (!fs.existsSync(src)) {
    console.warn('Skip (missing):', f.json);
    return;
  }
  const json = fs.readFileSync(src, 'utf8').trim();
  const out = '/* Auto-generado por tools/sync-ranges-solver-data.js — no editar a mano */\nwindow.' +
    f.global + ' = ' + json + ';\n';
  const dest = path.join(outDir, f.out);
  fs.writeFileSync(dest, out, 'utf8');
  console.log('Written', dest);
});
