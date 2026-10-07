#!/usr/bin/env node
'use strict';
/**
 * Regresión: en HU el héroe puede etiquetarse BTN mientras el anillo es SB/BB.
 * Etiqueta BTN + asiento SB (cartas/ciegas); el pod SB no tapa #hero-cards.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
assert.ok(/function heroRingSeat\(/.test(app), 'heroRingSeat definido');
assert.ok(/function isHeroTableSeat\(/.test(app), 'isHeroTableSeat definido');
assert.ok(/hero === 'BTN' && pos === 'SB'/.test(app), 'alias HU BTN↔SB en UI');
assert.ok(/\$\('#hero-pos'\)\.textContent = heroLabel/.test(app),
  'etiqueta héroe conserva display (BTN)');

const sb = createSandbox();
loadTrainer(sb);
const { Engine, PTPlayConfig: PC } = sb.window;

assert.strictEqual(PC.huRingSeat('BTN'), 'SB');

const cfg = PC.normalize({
  formatHub: 'mtt',
  gameType: 'mtt',
  mttPhase: 'hu',
  stackDepth: 'bb25',
  scenario: 'rfi',
  heroPos: 'BTN',
  villainLevel: 'pro',
  handRange: 'random'
});
const sc = PC.pickScenario(cfg, null);
assert.strictEqual(sc.type, 'RFI');
assert.strictEqual(sc.heroPos, 'SB', 'motor en SB');
assert.strictEqual(sc.displayHeroPos, 'BTN', 'etiqueta BTN');
assert.strictEqual(PC.heroDealSeat(sc, cfg), 'SB', 'reparto en SB');

const hand = Engine.newHand({ seed: 7 }, cfg);
assert.strictEqual(hand.hero.pos, 'SB', 'hero.pos = SB');
assert.strictEqual(hand.displayHeroPos, 'BTN', 'display = BTN');
assert.ok(hand.hero.cards && hand.hero.cards.length === 2, 'cartas del héroe asignadas');
assert.ok(hand.table.holeCards.SB && hand.table.holeCards.SB.length === 2, 'holeCards en SB');
assert.ok(!hand.table.inHand.has('BTN'), 'BTN no está inHand');
assert.ok(/Eres BTN/.test((hand.current && hand.current.context) || ''), 'contexto conserva BTN');

console.log('OK: HU BTN seat alias');
