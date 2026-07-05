/* Genera js/engine/ranges/rfi-solver-data.js desde data/ranges/rfi-6max-100bb.json */
const fs = require('fs');
const path = require('path');

const json = fs.readFileSync(path.join(__dirname, '..', 'data', 'ranges', 'rfi-6max-100bb.json'), 'utf8');
const out = '/* Auto-generado por tools/sync-rfi-solver-data.js — no editar a mano */\nwindow.PT_RFI_JSON = ' + json.trim() + ';\n';
const dest = path.join(__dirname, '..', 'js', 'engine', 'ranges', 'rfi-solver-data.js');
fs.writeFileSync(dest, out, 'utf8');
console.log('Written', dest);
