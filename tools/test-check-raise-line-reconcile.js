/**
 * Check-raise line reconcile: el check nodal no debe quedar como imprecisa
 * cuando el follow-through (raise) es óptimo/aceptable.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON };
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

const root = path.join(__dirname, '..', 'js');
const scripts = [
  'engine/scoring/lineReconcile.js',
  'engine/scoring/scoring.js'
];
scripts.forEach((rel) => {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
});

const LR = sandbox.GTOLineReconcile || sandbox.window.GTOLineReconcile;
const Scoring = sandbox.GTOScoring || sandbox.window.GTOScoring;
if (!LR || !LR.reconcileCheckRaiseLines) {
  console.error('FAIL: GTOLineReconcile missing');
  process.exit(1);
}

const fails = [];
function assert(cond, msg) {
  if (!cond) fails.push(msg);
}

/* Caso usuario: AA flop check (imprecisa 5%) → raise óptimo → check sube a optima. */
const handLike = [
  { street: 'preflop', action: 'call', class: 'aceptable', classGto: 'aceptable' },
  {
    street: 'flop',
    action: 'check',
    class: 'imprecisa',
    classGto: 'imprecisa',
    frequency: 0.05,
    heroEquity: 81.38,
    toCallBB: 0,
    best: 'bet',
    evErroneous: true,
    evLoss: 6.43
  },
  {
    street: 'flop',
    action: 'raise',
    class: 'optima',
    classGto: 'optima',
    toCallBB: 7.6,
    villainLastAction: 'bet',
    frequency: 0.29
  },
  { street: 'turn', action: 'bet', class: 'optima', classGto: 'optima' }
];

const r1 = LR.reconcileCheckRaiseLines(handLike);
assert(r1.pairs === 1, 'should detect 1 XR pair, got ' + r1.pairs);
assert(r1.upgraded === 1, 'should upgrade 1 check, got ' + r1.upgraded);
assert(handLike[1].class === 'optima', 'check should become optima, got ' + handLike[1].class);
assert(handLike[1].classGto === 'optima', 'classGto should become optima');
assert(handLike[1].lineRole === 'checkRaiseSetup', 'setup role');
assert(handLike[2].lineRole === 'checkRaiseFollowThrough', 'follow-through role');
assert(handLike[1].evErroneous === false, 'EV erroneous softened');
assert(handLike[1].suppressBestHint === true, 'suppress mejor: Apostar');
assert(/check-raise/i.test(handLike[1].lineNote || ''), 'lineNote mentions check-raise');

/* Idempotente */
const r2 = LR.reconcileCheckRaiseLines(handLike);
assert(r2.upgraded === 0, 'second pass should not re-upgrade');
assert(handLike[1].class === 'optima', 'stays optima');

/* Check-call no es XR */
const checkCall = [
  { street: 'flop', action: 'check', class: 'imprecisa', frequency: 0.05, toCallBB: 0 },
  { street: 'flop', action: 'call', class: 'optima', toCallBB: 3, villainLastAction: 'bet' }
];
const r3 = LR.reconcileCheckRaiseLines(checkCall);
assert(r3.pairs === 0 && r3.upgraded === 0, 'check-call must not upgrade');
assert(checkCall[0].class === 'imprecisa', 'check-call check stays imprecisa');

/* Raise malo: no upgrade */
const badXr = [
  { street: 'flop', action: 'check', class: 'error', frequency: 0.02, toCallBB: 0, heroEquity: 40 },
  { street: 'flop', action: 'raise', class: 'error', toCallBB: 5, villainLastAction: 'bet' }
];
const r4 = LR.reconcileCheckRaiseLines(badXr);
assert(r4.upgraded === 0, 'bad raise must not upgrade check');
assert(badXr[0].class === 'error', 'check stays error');

/* Raise aceptable + check sin mezcla/fuerza → aceptable (no optima) */
const softXr = [
  {
    street: 'turn',
    action: 'check',
    class: 'imprecisa',
    frequency: 0.03,
    heroEquity: 45,
    toCallBB: 0
  },
  {
    street: 'turn',
    action: 'raise',
    class: 'aceptable',
    toCallBB: 10,
    villainLastAction: 'bet'
  }
];
const r5 = LR.reconcileCheckRaiseLines(softXr);
assert(r5.upgraded === 1, 'aceptable XR upgrades check');
assert(softXr[0].class === 'aceptable', 'soft XR → aceptable, got ' + softXr[0].class);

/* Raise óptimo pero check residual sin fuerza → aceptable (no optima) */
const residualXr = [
  {
    street: 'flop',
    action: 'check',
    class: 'imprecisa',
    frequency: 0.02,
    heroEquity: 42,
    toCallBB: 0
  },
  {
    street: 'flop',
    action: 'raise',
    class: 'optima',
    toCallBB: 6,
    villainLastAction: 'bet'
  }
];
const r5b = LR.reconcileCheckRaiseLines(residualXr);
assert(r5b.upgraded === 1, 'residual XR still upgrades');
assert(residualXr[0].class === 'aceptable', 'residual mix → aceptable not optima, got ' + residualXr[0].class);

/* Calles distintas: no emparejar */
const crossStreet = [
  { street: 'flop', action: 'check', class: 'imprecisa', toCallBB: 0, frequency: 0.1 },
  { street: 'turn', action: 'raise', class: 'optima', toCallBB: 4, villainLastAction: 'bet' }
];
const r6 = LR.reconcileCheckRaiseLines(crossStreet);
assert(r6.pairs === 0, 'cross-street must not pair');

/* scoreHand tras reconcile: allOptimal si todo óptimo */
if (Scoring && Scoring.scoreHand) {
  const perfectXr = [
    { street: 'flop', action: 'check', class: 'optima', lineRole: 'checkRaiseSetup' },
    { street: 'flop', action: 'raise', class: 'optima', lineRole: 'checkRaiseFollowThrough' },
    { street: 'turn', action: 'bet', class: 'optima' }
  ];
  const graded = Scoring.scoreHand(perfectXr, 0);
  assert(graded.allOptimal === true, 'reconciled XR line can be allOptimal');
  assert(graded.score === 10, 'perfect XR line score 10, got ' + graded.score);
  const withAcceptablePre = Scoring.scoreHand(handLike, 0);
  assert(withAcceptablePre.allGood === true, 'XR upgrade keeps allGood');
  assert(withAcceptablePre.score >= 9, 'high score after XR upgrade, got ' + withAcceptablePre.score);
}

if (fails.length) {
  console.error('FAIL:\n - ' + fails.join('\n - '));
  process.exit(1);
}
console.log('OK: check-raise line reconcile', {
  pairs: r1.pairs,
  upgradedClass: handLike[1].class,
  softClass: softXr[0].class
});
