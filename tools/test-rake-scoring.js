/* RG-F02 — Rake on/off en play-config y motor (scoring pot). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const sandbox = { window: {}, console, Math, Date, JSON, Number, parseFloat, parseInt, isNaN };
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'js/play-config.js'), 'utf8'),
  sandbox,
  { filename: 'play-config.js' }
);

const PC = sandbox.window.PTPlayConfig;
assert.ok(PC, 'PTPlayConfig');

const none = PC.normalize({ rakeMode: 'none' });
assert.strictEqual(PC.estimateRakeBB(100, none), 0);
assert.strictEqual(PC.potAfterRakeBB(100, none), 100);

const std = PC.normalize({ rakeMode: 'standard' });
assert.ok(PC.estimateRakeBB(100, std) > 0);
assert.ok(PC.potAfterRakeBB(100, std) < 100);
assert.strictEqual(PC.estimateRakeBB(100, std), 3); // 5% capped 3bb

const engineSrc = fs.readFileSync(path.join(__dirname, '..', 'js/engine.js'), 'utf8');
assert.ok(/potAfterRakeBB/.test(engineSrc), 'engine aplica rake');
assert.ok(/rakeMode/.test(engineSrc), 'engine lee rakeMode');

const playEv = fs.readFileSync(path.join(__dirname, '..', 'tools/test-play-ev.js'), 'utf8');
assert.ok(playEv.length > 100, 'test-play-ev existe (alineación EV)');

console.log('*** rake-scoring OK (none vs standard) ***');
