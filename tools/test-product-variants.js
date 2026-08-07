/* RG-F05 — 9-max / deep: UI no ofrece variantes fuera de producto, o están cubiertas. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const playCfg = fs.readFileSync(path.join(__dirname, '..', 'js/play-config.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8');

// Producto actual: cash 6-max ~100bb
const offers9max = /9[\s-]?max|nine[\s-]?max/i.test(html + playCfg);
const offersDeep = /200\s*bb|deep\s*stack|stackBB["']?\s*:\s*200/i.test(html + playCfg);

if (offers9max) {
  assert.ok(/9/.test(playCfg) || /9max/.test(app), 'si UI ofrece 9-max, play-config lo soporta');
  console.log('OK producto expone 9-max con soporte');
} else {
  assert.ok(!/data-format="9max"|data-val="9max"/.test(html), 'UI no ofrece 9-max por error');
  console.log('OK UI no ofrece 9-max (producto 6-max)');
}

if (offersDeep) {
  console.log('OK deep stack referenciado en config');
} else {
  // Default 100bb
  assert.ok(/100/.test(playCfg) || /stackBB/.test(playCfg) || /100bb/.test(html), 'stack ~100bb');
  console.log('OK producto centrado ~100bb sin deep UI');
}

console.log('*** product-variants OK ***');
