/**
 * Unit tests for GTOScoring.scoreHand (nota 0–10 por mano).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON };
sandbox.global = sandbox;
vm.createContext(sandbox);

const root = path.join(__dirname, '..', 'js');
const scripts = [
  'engine/math/evMath.js',
  'engine/scoring/evLoss.js',
  'engine/scoring/scoring.js'
];
scripts.forEach((rel) => {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
});

const Scoring = sandbox.window.GTOScoring;
if (!Scoring || !Scoring.scoreHand) {
  console.error('FAIL: GTOScoring.scoreHand not available');
  process.exit(1);
}

const fails = [];
function assert(cond, msg) {
  if (!cond) fails.push(msg);
}

const perfect = Scoring.scoreHand([
  { class: 'optima', evLoss: 0 },
  { class: 'optima', evLoss: 0 },
  { class: 'optima', evLoss: 0 }
], 0);
assert(perfect.score === 10, 'perfect hand should be 10, got ' + perfect.score);
assert(perfect.allOptimal === true, 'perfect.allOptimal');
assert(/óptimas/i.test(perfect.verdict), 'perfect verdict mentions óptimas');

const empty = Scoring.scoreHand([], 0);
assert(empty.score === 10, 'empty decisions => 10');

// Misma estructura (3 óptimas + 1 error en river): más EV perdido => menos nota
const softErr = Scoring.scoreHand([
  { class: 'optima' }, { class: 'optima' }, { class: 'optima' },
  { class: 'error', evErroneous: true, evLoss: 0.5 }
], 0.5);
const hardErr = Scoring.scoreHand([
  { class: 'optima' }, { class: 'optima' }, { class: 'optima' },
  { class: 'error', evErroneous: true, evLoss: 3.5 }
], 3.5);
assert(softErr.score > hardErr.score,
  'soft EV loss should score higher than hard: ' + softErr.score + ' vs ' + hardErr.score);
assert(softErr.allOptimal === false && hardErr.allOptimal === false, 'errors => not allOptimal');
assert(softErr.score < 10 && hardErr.score < 10, 'errors must not score 10');

const allBad = Scoring.scoreHand([
  { class: 'error', evErroneous: true, evLoss: 4 },
  { class: 'error', evErroneous: true, evLoss: 5 },
  { class: 'error', evErroneous: true, evLoss: 6 }
], 15);
assert(allBad.score <= 2.5, 'all-error high EV should be near 0, got ' + allBad.score);

const aceptableOnly = Scoring.scoreHand([
  { class: 'aceptable' }, { class: 'aceptable' }
], 0);
assert(aceptableOnly.allOptimal === false, 'aceptable is not optima');
assert(aceptableOnly.allGood === true, 'aceptable is still good');
assert(aceptableOnly.score >= 8 && aceptableOnly.score < 10,
  'aceptable-only should be high but <10, got ' + aceptableOnly.score);

const hand = {
  decisions: [{ class: 'optima' }, { class: 'error', evErroneous: true, evLoss: 2 }],
  totalEvLoss: 2
};
const ensured = Scoring.ensureHandScore(hand);
assert(hand.handScore === ensured.score, 'ensureHandScore sets hand.handScore');
assert(hand.handScoreMeta && hand.handScoreMeta.letter, 'ensureHandScore sets meta');

if (fails.length) {
  console.error('FAIL:\n - ' + fails.join('\n - '));
  process.exit(1);
}
console.log('OK: hand score tests passed', {
  perfect: perfect.score,
  softErr: softErr.score,
  hardErr: hardErr.score,
  allBad: allBad.score,
  aceptableOnly: aceptableOnly.score
});
