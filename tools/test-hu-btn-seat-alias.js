#!/usr/bin/env node
'use strict';
/**
 * Regresión: en HU el héroe puede etiquetarse BTN mientras el anillo es SB/BB.
 * El render debe tratar SB como asiento del héroe (oculto), sin cambiar la etiqueta.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

assert.ok(/function heroRingSeat\(/.test(app), 'heroRingSeat definido');
assert.ok(/function isHeroTableSeat\(/.test(app), 'isHeroTableSeat definido');
assert.ok(/isHeroTableSeat\(pos\)/.test(app), 'renderSeats usa isHeroTableSeat');
assert.ok(/heroRingSeat\(\)/.test(app), 'render usa heroRingSeat');
assert.ok(/hero === 'BTN' && pos === 'SB'/.test(app), 'alias HU BTN↔SB');
assert.ok(/\$\('#hero-pos'\)\.textContent = heroLabel/.test(app),
  'etiqueta héroe conserva display (BTN), no fuerza SB');

console.log('OK: HU BTN seat alias (source)');
