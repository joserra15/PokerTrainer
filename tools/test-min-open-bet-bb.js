/**
 * Regresión: apuesta abierta postflop nunca < 1bb (NLHE / torneos).
 * Caso reportado: bote limped 2.00bb → lead 33% salía 0.66bb (ilegal).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);

const W = sandbox.window;
const PM = W.GTOPotMath;
const ST = W.GTOStrategyTables;
const VS = W.GTOVillainSizing;
const VP = W.GTOVillainProfiles;
const Ev = W.GTOEvMath;

assert.ok(PM && typeof PM.openBetSizeBB === 'function', 'GTOPotMath.openBetSizeBB');
assert.strictEqual(PM.openBetSizeBB(2, 0.33), 1, 'bote 2bb × 33% → 1bb (no 0.66)');
assert.strictEqual(PM.openBetSizeBB(2, 0.66), 1.32, 'bote 2bb × 66% → 1.32bb');
assert.strictEqual(PM.openBetSizeBB(20, 0.33), 6.6, 'bote grande conserva pot%');
assert.strictEqual(PM.floorOpenBetBB(0.66), 1, 'floorOpenBetBB(0.66)=1');
assert.strictEqual(PM.floorOpenBetBB(0), 0, 'floorOpenBetBB(0)=0');

assert.ok(ST && typeof ST.betSizingOptions === 'function', 'betSizingOptions');
const opts = ST.betSizingOptions(2, false);
assert.ok(opts.length >= 1, 'hay opciones de sizing');
opts.forEach((o) => {
  assert.ok(o.size >= 1 - 1e-9, o.id + ' size >= 1bb, got ' + o.size);
});
const bet33 = opts.find((o) => o.id === 'bet_33');
assert.ok(bet33, 'incluye bet_33');
assert.strictEqual(bet33.size, 1, 'bet_33 en pot 2bb = 1bb');

assert.ok(VS.amountFromKey(2, 'bet_33') >= 1, 'villainSizing bet_33 >= 1');
assert.ok(Math.abs(VS.amountFromKey(20, 'bet_33') - 6.6) < 0.01, 'villainSizing pot grande');

const pro = VP.applyDifficulty
  ? VP.applyDifficulty('pro', 'pro')
  : { id: 'pro', preflopStrict: 1, postflop: { betSizeMult: 1 } };
const small = VP.betSizeBB(2, pro, 0.5, { sizeKey: 'bet_33' });
assert.ok(small >= 1 - 1e-9, 'villainProfiles bet_33 pot2 >= 1, got ' + small);
const big = VP.betSizeBB(20, pro, 0.5, { sizeKey: 'bet_33' });
assert.ok(Math.abs(big - 6.6) < 0.2, 'villainProfiles bet_33 pot20 ≈ 6.6, got ' + big);

const committed = Ev.committedBB('bet_33', { potBB: 2, toCallBB: 0 });
assert.ok(committed >= 1 - 1e-9, 'EV committed bet_33 pot2 >= 1, got ' + committed);

// Muestreo lead en bote limped: amountBB nunca sub-mínimo.
const lead = VS.sampleLeadFromStrategy(
  { check: 0, bet_33: 1 },
  2,
  { preferSizeKey: 'bet_33', actionHint: 'bet' },
  0.99
);
assert.strictEqual(lead.action, 'bet', 'lead action bet');
assert.ok(lead.amountBB >= 1 - 1e-9, 'sampleLead pot2 >= 1bb, got ' + lead.amountBB);

// Torneo live: lead ya clampa a hand.bb (paridad conceptual con trainer).
const liveSrc = fs.readFileSync(path.join(__dirname, '..', 'js/tournament/live-hand.js'), 'utf8');
assert.ok(
  /Math\.max\(\s*bb\s*,\s*r2\(\s*pot\s*\*\s*frac\s*\)\s*\)/.test(liveSrc),
  'torneo live-hand mantiene Math.max(bb, pot*frac)'
);
const villainDecide = fs.readFileSync(path.join(__dirname, '..', 'js/tournament/villain-decide.js'), 'utf8');
assert.ok(
  villainDecide.includes('Math.max(hand.bb, r2(pot *'),
  'torneo villain-decide mantiene floor a hand.bb'
);

// Integración trainer MTT: BB vs SB limp → flop lead nunca < 1bb (caso del pantallazo).
const Engine = W.Engine;
const PC = W.PTPlayConfig;
assert.ok(Engine && PC, 'Engine + PTPlayConfig');
let facingHits = 0;
for (let seed = 1; seed <= 40; seed++) {
  const cfg = PC.normalize({
    formatHub: 'mtt',
    stackDepth: 'bb100',
    mttPhase: 'auto',
    scenario: 'bbvsb',
    practiceStreet: 'flop'
  });
  const hand = Engine.newHand({ type: 'bbVsSbLimp', seed: seed }, cfg);
  if (!hand.current) continue;
  if (hand.current.street === 'preflop') Engine.act(hand, 'call');
  if (!hand.current || hand.current.street !== 'flop') continue;
  const toCall = Number(hand.current.toCallBB) || 0;
  if (toCall > 0) {
    facingHits++;
    assert.ok(toCall >= 1 - 1e-9,
      'facing >= 1bb (seed ' + seed + '), got ' + toCall + ' · ' + hand.current.context);
    assert.ok(!/apuesta 0\.\d+bb/.test(hand.current.context || ''),
      'contexto no muestra apuesta sub-1bb: ' + hand.current.context);
  }
  const sizes = hand._betSizes || {};
  Object.keys(sizes).forEach(function (k) {
    const v = sizes[k];
    if (v > 0.01 && k !== 'allin') {
      assert.ok(v >= 1 - 1e-9, 'opción ' + k + ' >= 1bb (seed ' + seed + '), got ' + v);
    }
  });
}
assert.ok(facingHits >= 5, 'muestras facing suficientes, got ' + facingHits);

console.log('OK: mínimo apuesta abierta 1bb (trainer + paridad torneo)');
