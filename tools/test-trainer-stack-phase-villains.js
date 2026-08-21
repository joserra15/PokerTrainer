#!/usr/bin/env node
/**
 * Regresión: stack aleatorio spin/mtt, default borderline, villanos por fase.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sandbox = createSandbox();
loadTrainer(sandbox);
const w = sandbox.window;
const Tax = w.PTFormatTaxonomy;
const PC = w.PTPlayConfig;
const Reg = w.GTORangesRegistry;

assert.ok(Tax && PC && Reg, 'deps');

// --- UI: chip Aleatorio + default Borderline ---
assert.ok(/class="setup-chip active" data-val="borderline"/.test(html)
  || /data-val="borderline"[^>]*\bactive\b/.test(html),
  'Borderline activo por defecto en HTML');
assert.ok(/data-val="random" data-stack-spin data-stack-mtt/.test(html),
  'chip stack Aleatorio en setup');
assert.strictEqual(PC.DEFAULT.handRange, 'borderline', 'DEFAULT.handRange borderline');

// --- Random stack pool / resolve ---
const spinAllowed = Tax.allowedStackDepths('spin', 'auto', 'random');
assert.ok(spinAllowed.indexOf('random') >= 0, 'spin Auto incluye random');
assert.ok(spinAllowed.indexOf('bb25') >= 0 && spinAllowed.indexOf('bb10') >= 0, 'spin Auto tiene bb concretos');
assert.ok(Tax.allowedStackDepths('spin', 'early', 'random').indexOf('random') < 0,
  'fase fija no ofrece random');
assert.ok(Tax.allowedStackDepths('cash', 'auto', 'random').indexOf('random') < 0,
  'cash no ofrece random');

const pool = Tax.randomStackPool('spin', 'auto', 'random');
assert.ok(pool.length >= 3 && pool.indexOf('random') < 0, 'pool sin literal random');

const rndCfg = PC.normalize({ formatHub: 'spin', stackDepth: 'random', mttPhase: 'auto' });
assert.strictEqual(rndCfg.stackDepth, 'random');
assert.ok(rndCfg.stackDepthRandom, 'flag stackDepthRandom');
const resolved = PC.resolveHandConfig(rndCfg, function () { return 0.01; });
assert.ok(/^bb\d+$/.test(resolved.stackDepth), 'resolveHandConfig → bb concreto: ' + resolved.stackDepth);
assert.ok(pool.indexOf(resolved.stackDepth) >= 0, 'stack muestreado del pool');
assert.ok(resolved.resolvedPhase, 'fase resuelta tras sample');
assert.ok(resolved.stackDepthPreference === 'random', 'preferencia random preservada');

const lbl = PC.labelFor(rndCfg);
assert.ok(/Stack aleatorio/i.test(lbl), 'label sesión: Stack aleatorio');

// --- Borderline default normalize ---
const bare = PC.normalize({ gameType: 'cash6' });
assert.strictEqual(bare.handRange, 'borderline');

// --- Villanos: spin/mtt usan charts torneo + fase efectiva ---
const spinPush = PC.normalize({ formatHub: 'spin', stackDepth: 'bb10', mttPhase: 'auto' });
const spinEarly = PC.normalize({ formatHub: 'spin', stackDepth: 'bb25', mttPhase: 'early' });
const cash100 = PC.normalize({ gameType: 'cash6', stackDepth: 'bb100' });
const mttEarly = PC.normalize({ formatHub: 'mtt', stackDepth: 'bb100', mttPhase: 'early' });
const mttPush = PC.normalize({ formatHub: 'mtt', stackDepth: 'bb10', mttPhase: 'push' });

const ctxSpinPush = Reg.normalize(spinPush);
const ctxSpinEarly = Reg.normalize(spinEarly);
assert.ok(ctxSpinPush.isTournament && ctxSpinPush.isSpin, 'spin es torneo en registry');
assert.strictEqual(ctxSpinPush.effectivePhase, 'push', 'spin 10bb → effectivePhase push');
assert.ok(ctxSpinEarly.effectivePhase === 'early' || ctxSpinEarly.effectivePhase === 'mid',
  'spin 25bb early: ' + ctxSpinEarly.effectivePhase);

const openSpinPush = Reg.getOpenRaiseRow('BTN', spinPush);
const openSpinEarly = Reg.getOpenRaiseRow('BTN', spinEarly);
const openCash = Reg.getOpenRaiseRow('BTN', cash100);
assert.ok(openSpinPush && openSpinEarly && openCash, 'filas open existen');
assert.notStrictEqual(JSON.stringify(openSpinPush), JSON.stringify(openSpinEarly),
  'spin push ≠ spin early (villano adapta fase)');
assert.notStrictEqual(JSON.stringify(openSpinEarly), JSON.stringify(openCash),
  'spin early ≠ cash (no charts cash para spin)');

const openMttE = Reg.getOpenRaiseRow('LJ', mttEarly);
const openMttP = Reg.getOpenRaiseRow('LJ', mttPush);
assert.notStrictEqual(JSON.stringify(openMttE), JSON.stringify(openMttP),
  'mtt early ≠ push en LJ');

const vsSpinPush = Reg.getVsRfiRow('BB', 'BTN', Object.assign({}, spinPush, { villainLevel: 'pro' }));
const vsSpinEarly = Reg.getVsRfiRow('BB', 'BTN', Object.assign({}, spinEarly, { villainLevel: 'pro' }));
assert.ok(vsSpinPush && vsSpinEarly, 'vsRFI spin');
// En push/bubble el mix de 3bet debe ser más tight (o igual si ya era tight)
const N = w.GTORangesNotation;
function mixLen(row) {
  return row && row.threeBetMix ? N.expand(row.threeBetMix).length : 0;
}
assert.ok(mixLen(vsSpinPush) <= mixLen(vsSpinEarly) + 2,
  'push no ensancha 3bet vs early (' + mixLen(vsSpinPush) + ' vs ' + mixLen(vsSpinEarly) + ')');

console.log('OK test-trainer-stack-phase-villains');
