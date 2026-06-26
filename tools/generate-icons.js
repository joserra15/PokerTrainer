#!/usr/bin/env node
/**
 * Regenera iconos cuadrados desde icons/favicon.svg (requiere @resvg/resvg-js-cli).
 * Uso: node tools/generate-icons.js
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const svg = path.join(root, 'icons', 'favicon.svg');
const cli = require.resolve('@resvg/resvg-js-cli/bin');

const sizes = [
  ['icons/apple-touch-icon.png', 180, 180],
  ['icons/icon-192.png', 192, 192],
  ['icons/favicon-32x32.png', 32, 32]
];

function render(outRel, w, h) {
  const out = path.join(root, outRel);
  execFileSync(process.execPath, [cli, svg, out, '--fit-width', String(w), '--fit-height', String(h)], {
    stdio: 'inherit'
  });
  const buf = fs.readFileSync(out);
  const rw = buf.readUInt32BE(16);
  const rh = buf.readUInt32BE(20);
  if (rw !== w || rh !== h) {
    throw new Error(outRel + ': expected ' + w + 'x' + h + ', got ' + rw + 'x' + rh);
  }
  console.log('OK', outRel, rw + 'x' + rh);
}

sizes.forEach(function (s) { render(s[0], s[1], s[2]); });
